/* ============================================================
   DRIVER TOOLBOX — app.js  (Driver Sesija 1)
   Vlasnik vozila. Nasleđuje core/ (models, store, pdf, license, reminders).
   Ekrani: MOJE VOZILO | ISTORIJA | DOKUMENTA | PODSETNICI | SETTINGS
   Ključno: retroaktivni unos "Početno stanje" (source=initial,
            retroactive=true, date_precision, km_precision).
   ============================================================ */
(function () {
  "use strict";

  var App = { config: null, i18n: {}, route: "vehicle", params: null, activeVehicleId: null,
              expensesVehicleId: null, expensesPeriod: "month" };

  /* ---------- Pomoćne ---------- */
  function t(key) { return App.i18n[key] || key; }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value.trim() : ""; }
  function checked(id) { var e = el(id); return !!(e && e.checked); }
  function toast(msg) {
    var d = document.createElement("div");
    d.className = "toast"; d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1800);
  }
  function field(id, labelKey, value, type, placeholder) {
    return '<label class="field"><span>' + t(labelKey) + '</span>' +
      '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value) + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '></label>';
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function filterByPeriod(events, period) {
    if (period === "all") return events;
    var now = new Date(), from, to = todayISO();
    if (period === "month") {
      from = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-01";
    } else if (period === "prev") {
      var pmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      var pmEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
      from = pmStart.toISOString().slice(0, 10);
      to   = pmEnd.toISOString().slice(0, 10);
    } else if (period === "3m") {
      var t3 = new Date(now); t3.setMonth(t3.getMonth() - 3);
      from = t3.toISOString().slice(0, 10);
    } else if (period === "year") {
      from = now.getFullYear() + "-01-01";
    } else { return events; }
    return events.filter(function (e) { return (e.date || "") >= from && (e.date || "") <= to; });
  }

  /* ---------- Boot ---------- */
  function boot() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
    fetch("config/driver_v1.json")
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        App.config = cfg;
        applyTheme(cfg.colors);
        el("brandName").textContent = cfg.name.toUpperCase();
        if (window.Photos && window.Photos.setApp) window.Photos.setApp(cfg.app);
        return Store.init(cfg.app);
      })
      .then(function () {
        var lang = Store.settings.get("lang", App.config.language_default || "en");
        return loadI18n(lang);
      })
      .then(function () {
        translate(document.body);
        bindNav();
        bindBackButton();
        // Magic-link import: Driver otvoren sa ?hub_import=TOKEN&hub=URL
        var urlP = new URL(location.href).searchParams;
        var importToken = urlP.get("hub_import");
        var importHub   = urlP.get("hub");
        var resetToken  = urlP.get("token");
        if (importToken && importHub) {
          history.replaceState({}, "", location.pathname); // očisti URL
          render("hub_import", { token: importToken, hub_url: importHub });
        } else if (resetToken) {
          history.replaceState({}, "", location.pathname);
          render("hub_reset", { token: resetToken });
        } else {
          render("vehicle");
        }
        registerSW();
        watchOnline();
        // Migracija localStorage ključeva autohub → aucore (jednokratno)
        (function () {
          var m = { 'autohub_session': 'aucore_session', 'autohub_url': 'aucore_url',
            'autohub_user': 'aucore_user', 'autohub_last_sync': 'aucore_last_sync',
            'autohub_vehicle_map': 'aucore_vehicle_map' };
          Object.keys(m).forEach(function (o) {
            var v = localStorage.getItem(o);
            if (v !== null) { localStorage.setItem(m[o], v); localStorage.removeItem(o); }
          });
        })();
        // Verifikuj sesiju pri startu — ako je istekla na serveru, očisti lokalno
        if (window.AUCore && AUCore.getSession()) {
          AUCore.apiCall("GET", "/auth/me").then(function () {
            pollNotifications();
          }).catch(function (e) {
            if (e.status === 401) {
              AUCore.setSession(null);
              localStorage.removeItem("aucore_user");
              var bellBtn = el("bellBtn"); if (bellBtn) bellBtn.hidden = true;
            }
          });
        }
        _notifPollTimer = setInterval(pollNotifications, 5 * 60 * 1000);
      })
      .catch(function (err) {
        console.error("Boot greška:", err);
        el("screen").innerHTML = '<div class="card"><h2>Greška pri pokretanju</h2>' +
          '<p class="empty">' + esc(err.message) + '</p></div>';
      });
  }

  function applyTheme(colors) {
    var root = document.documentElement;
    var map = { primary: "--c-primary", accent: "--c-accent", bg: "--c-bg",
                surface: "--c-surface", ok: "--c-ok", locked: "--c-locked" };
    Object.keys(colors || {}).forEach(function (k) {
      if (map[k]) root.style.setProperty(map[k], colors[k]);
    });
  }
  function loadI18n(lang) {
    return fetch("../core/i18n/" + lang + ".json")
      .then(function (r) { return r.json(); })
      .then(function (dict) { App.i18n = dict; });
  }
  function translate(rootEl) {
    rootEl.querySelectorAll("[data-i18n]").forEach(function (e) {
      e.textContent = t(e.getAttribute("data-i18n"));
    });
  }

  /* ---------- Rutiranje ---------- */
  function bindNav() {
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { render(btn.getAttribute("data-route")); });
    });
  }
  var _isPop = false;

  function render(route, params) {
    App.route = route; App.params = params || null;
    if (!_isPop) {
      try {
        var st = { route: route, params: params || null };
        if (route === "vehicle") history.replaceState(st, "", "#vehicle");
        else history.pushState(st, "", "#" + route);
      } catch (e) {}
    }
    _isPop = false;
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-route") === route.split("/")[0]);
    });
    var fn = SCREENS[route] || SCREENS.vehicle;
    Promise.resolve(fn(params)).then(function (html) {
      var s = el("screen");
      s.innerHTML = html; translate(s); s.scrollTop = 0; window.scrollTo(0, 0);
    });
  }

  function bindBackButton() {
    window.addEventListener("popstate", function (e) {
      if (e.state && e.state.route) {
        _isPop = true;
        render(e.state.route, e.state.params || null);
      } else {
        history.replaceState({ route: "vehicle", params: null }, "", "#vehicle");
        _isPop = true;
        render("vehicle");
      }
    });
  }

  /* ---------- Datum sa preciznošću (retroaktivni prikaz) ---------- */
  function fmtEventDate(e) {
    var d = e.date || "";
    if (!d) return "";
    if (e.date_precision === "month") { var p = d.split("-"); return p[1] + "." + p[0]; }
    if (e.date_precision === "approx") return "~ " + d;
    return d;
  }
  function trustIcon(e) {
    if (e.source === "receipt") return "🟣";
    if (e.source === "mechanic") return "🟢";
    if (e.source === "owner") return "🔵";
    return "⚪"; // initial / imported / nepoznato
  }

  /* ---------- Helperi vozila ---------- */
  function latestKmByVehicle(events) {
    var km = {};
    events.forEach(function (e) {
      if (e.mileage_km != null && e.vehicle_id) {
        if (km[e.vehicle_id] == null || e.mileage_km > km[e.vehicle_id]) km[e.vehicle_id] = e.mileage_km;
      }
    });
    return km;
  }
  function latestEventOfType(events, vehId, types) {
    var f = events.filter(function (e) {
      return e.vehicle_id === vehId && types.indexOf(e.type) !== -1;
    }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    return f[0] || null;
  }
  function pickActiveVehicle(vehicles) {
    if (App.activeVehicleId && vehicles.some(function (v) { return v.id === App.activeVehicleId; }))
      return App.activeVehicleId;
    App.activeVehicleId = vehicles.length ? vehicles[0].id : null;
    return App.activeVehicleId;
  }

  /* ---------- EKRANI ---------- */
  var SCREENS = {

    /* ===== MOJE VOZILO ===== */
    vehicle: function () {
      return Promise.all([Store.all("vehicles"), Store.all("events"), Store.all("reminders"), Store.all("documents")])
        .then(function (res) {
          var vehicles = res[0], events = res[1], reminders = res[2], documents = res[3] || [];

          if (!vehicles.length) {
            return '' +
              '<h1 data-i18n="d.nav_vehicle"></h1>' +
              '<div class="onboard"><b data-i18n="d.welcome_title"></b>' +
              '<p class="empty" data-i18n="d.welcome_sub"></p></div>' +
              '<button class="btn btn-primary" onclick="DR.go(\'vehicle_form\')" data-i18n="vehicles.add"></button>';
          }

          var vid = pickActiveVehicle(vehicles);
          var v = vehicles.filter(function (x) { return x.id === vid; })[0];
          var kmBy = latestKmByVehicle(events);
          var curKm = kmBy[vid];
          var lastService = latestEventOfType(events, vid, ["service", "repair"]);
          var sd = v.service_data || {}, tires = v.tires || {};
          var vehReminders = reminders.filter(function (r) { return r.vehicle_id === vid && !r.done; });

          function row(labelKey, value) {
            if (!value && value !== 0) return "";
            return '<div class="techrow"><span>' + t(labelKey) + '</span><b>' + esc(value) + '</b></div>';
          }

          // switcher ako ima više vozila
          var switcher = vehicles.length > 1
            ? '<div class="vehswitch">' + vehicles.map(function (x) {
                var sharedChip = x.read_only ? ' 🔑' : '';
                return '<button class="chip' + (x.id === vid ? ' active' : '') +
                  '" onclick="DR.setVehicle(\'' + esc(x.id) + '\')">' + esc(x.make + " " + x.model) + sharedChip + '</button>';
              }).join("") + '</div>'
            : '';

          // rokovi iz podsetnika
          var today = todayISO();
          var rokovi = vehReminders.filter(function (r) { return r.due_date; })
            .sort(function (a, b) { return (a.due_date || "").localeCompare(b.due_date || ""); })
            .map(function (r) {
              var st = Reminders.status(r, today, curKm);
              var cls = st.state === "due" ? "due-over" : st.state === "soon" ? "due-soon" : "due-ok";
              return '<div class="techrow"><span>' + esc(r.title) + '</span>' +
                '<b class="' + cls + '">' + esc(r.due_date) + '</b></div>';
            }).join("");

          // Trust Card — vidljiv samo ako ima bar 1 event (izbegava prazan bronze prikaz na novom vozilu)
          var vehEvents = events.filter(function (e) { return e.vehicle_id === vid; });
          var vehDocs = documents.filter(function (d) { return d.vehicle_id === vid; });
          var trustCardHtml = (vehEvents.length && window.TrustCard)
            ? window.TrustCard.style() + window.TrustCard.html(v, vehEvents, vehDocs, { showTips: true })
            : '';

          var hubBadge = hubConnected()
            ? '<span class="hub-badge">☁️ Sync</span>'
            : '';
          var _vmap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
          var hubServerId = hubConnected() ? (_vmap[vid] || 0) : 0;

          if (hubServerId) {
            setTimeout(function () {
              AUCore.apiCall("GET", "/vehicles/" + hubServerId + "/mileage").then(function (m) {
                if (!m || !m.mileage_km) return;
                var el = document.getElementById("hub_km_ext");
                if (!el || m.mileage_km <= (curKm || 0)) return;
                el.textContent = " • ☁ " + m.mileage_km.toLocaleString() + " km";
              }).catch(function () {});
            }, 0);
          }

          var isShared = !!v.read_only;

          return '' +
            switcher +
            '<h1>' + esc(v.make + " " + v.model) + (v.year ? ' <span class="muted">(' + v.year + ')</span>' : '') + '</h1>' +
            '<p class="sub">' + esc(v.plate || "—") +
              (curKm != null ? ' • ⏱ ' + curKm + ' km' : '') +
              (hubServerId ? '<span id="hub_km_ext" style="color:#34d399"></span>' : '') +
              (hubBadge ? ' ' + hubBadge : '') +
              (isShared ? ' <span style="background:#1e3a5f;color:#93c5fd;border-radius:4px;padding:1px 7px;font-size:.75rem;margin-left:4px">🔑 Deljeno vozilo</span>' : '') +
            '</p>' +

            // TRUST CARD (posle H1, pre onboarding-a — kupac ga prvi vidi)
            trustCardHtml +

            // onboarding: samo za sopstvena vozila
            (!isShared && vehEvents.length === 0
              ? '<div class="onboard"><b data-i18n="d.initial_title"></b>' +
                '<p class="empty" data-i18n="d.initial_sub"></p>' +
                '<button class="btn btn-primary mt8" onclick="DR.go(\'initial_state\',{vehicle_id:\'' + esc(vid) + '\'})" data-i18n="d.initial_cta"></button></div>'
              : '') +

            // IDENTITET
            '<div class="card"><h2 data-i18n="d.identity"></h2>' +
              row("vehicles.vin", v.vin) +
              row("d.category", v.type_label || v.category) +
              row("d.fuel", v.engine && v.engine.fuel) +
              row("d.power", v.engine && v.engine.power_kw ? (v.engine.power_kw + " kW") : "") +
            '</div>' +

            // ODRŽAVANJE
            '<div class="card"><h2 data-i18n="d.maintenance"></h2>' +
              (lastService
                ? '<div class="techrow"><span>' + t("d.last_service") + '</span><b>' +
                  esc(fmtEventDate(lastService)) + (lastService.mileage_km != null ? " • " + esc(lastService.mileage_km) + " km" : "") + '</b></div>'
                : '<p class="empty" data-i18n="d.no_service"></p>') +
              row("tech.oil_type", sd.oil_type) +
              row("tech.oil_filter", sd.oil_filter) +
              row("tech.air_filter", sd.air_filter) +
              row("tech.battery", sd.battery) +
            '</div>' +

            // GUME
            '<div class="card"><h2 data-i18n="tech.tires_set"></h2>' +
              row("tech.tires_front", tires.size_front) +
              row("tech.tires_rear", tires.size_rear) +
              row("tech.tires_set", tires.current_set) +
              (!tires.size_front && !tires.current_set ? '<p class="empty" data-i18n="d.no_tires"></p>' : '') +
            '</div>' +

            // ROKOVI
            '<div class="card"><h2 data-i18n="d.deadlines"></h2>' +
              (rokovi || '<p class="empty" data-i18n="d.no_deadlines"></p>') +
            '</div>' +

            // Akcije — write operacije skrivene za deljeno vozilo
            (!isShared ? '<button class="btn btn-primary" onclick="DR.addEvent(\'' + esc(vid) + '\',false)" data-i18n="d.add_event"></button>' : '') +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'kalkulatori\')" style="background:#1e3a5f">🧮 Kalkulatori</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'timeline\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1c2a3a">📅 Timeline događaja</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'mechanic_stats\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1c2030">🔩 Troškovi po servisu</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'tire_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1a1c20">🔄 Istorija guma</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'battery_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1a1a10">🔋 Istorija akumulatora</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'oil_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1a1500">🛢️ Istorija zamene ulja</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'brake_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1a0a0a">🛑 Istorija kočnica</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'belt_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#0a1a0a">⚙️ Istorija kaišа/lanca</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'coolant_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#0a1020">🌡️ Istorija rashladne tečnosti</button>' +
            (hubServerId ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_notes\',{sid:' + hubServerId + '})" style="background:#1a2640">📝 Beleške</button>' : '') +
            (!isShared ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'car_check\')" style="background:#1a3a2f">🔎 Šta proveriti pri kupovini</button>' : '') +
            (!isShared ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'initial_state\',{vehicle_id:\'' + esc(vid) + '\'})" data-i18n="d.initial_cta"></button>' : '') +
            (!isShared ? '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vid) + '\',true)" data-i18n="d.dig_drawer"></button>' : '') +
            (!isShared ? '<button class="btn btn-secondary mt8" onclick="DR.exportDossier(\'' + esc(vid) + '\')" data-i18n="d.dossier"></button>' : '') +
            (!isShared ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle_form\',{id:\'' + esc(vid) + '\'})" data-i18n="common.edit"></button>' : '') +
            (!isShared && v.status !== "sold" && v.status !== "totaled"
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'sell_vehicle\',{id:\'' + esc(vid) + '\'})" data-i18n="d.sell_vehicle"></button>'
              : '') +
            (!isShared && hubServerId && v.status !== "sold" && v.status !== "totaled"
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_sell\',{id:\'' + esc(vid) + '\',hub_id:' + hubServerId + '})" style="background:#1a2940">🏷️ Prodaj ovo vozilo</button>'
              : '') +
            (!isShared && v.trade_mode
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'publish_listing\',{id:\'' + esc(vid) + '\'})" data-i18n="d.publish_listing"></button>' +
                '<button class="btn btn-secondary mt8" onclick="DR.go(\'trade_summary\')" style="background:#1a2a1a">📊 Trade sažetak</button>'
              : '') +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'browse_autopijaca\')">🔍 Pretraži vozila na prodaju</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'browse_autodelovi\')">🔧 Pretraži auto delove</button>' +
            (!isShared && moduleUnlocked("multi_vehicle")
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle_form\')" data-i18n="vehicles.add"></button>'
              : '');
        });
    },

    /* ===== FORMA VOZILA ===== */
    vehicle_form: function (params) {
      var id = params && params.id;
      var pV = id ? Store.get("vehicles", id) : Promise.resolve(null);
      return pV.then(function (existing) {
        if (existing && existing.read_only) {
          return '<button class="linkback" onclick="DR.go(\'vehicle\')">← Nazad</button>' +
            '<div class="card"><p class="empty">Deljeno vozilo nije moguće uređivati.</p></div>';
        }
        var v = existing || Models.createVehicle({});
        App._editingVehicle = existing || null;
        var sd = v.service_data || {}, tires = v.tires || {}, eng = v.engine || {};
        var catOpts = Object.keys(Models.VEHICLE_CATEGORIES).map(function (k) {
          return '<option value="' + k + '"' + (v.category === k ? " selected" : "") + '>' +
                 k + " — " + esc(Models.VEHICLE_CATEGORIES[k]) + '</option>';
        }).join("");
        var statusOpts = Models.VEHICLE_STATUSES.map(function (s) {
          return '<option value="' + s + '"' + (v.status === s ? " selected" : "") + '>' + t("d.vehicle_status_" + s) + '</option>';
        }).join("");
        var tradeOn = !!v.trade_mode;
        var tr = v.trade || {};
        var tPur = tr.purchase || {};
        var srcOpts = Models.TRADE_SOURCES.map(function (s) {
          return '<option value="' + s + '"' + (tPur.source === s ? " selected" : "") + '>' + t("d.trade_src_" + s) + '</option>';
        }).join("");
        var trCurOpts = ["RSD","EUR"].map(function (c) {
          return '<option value="' + c + '"' + ((tPur.currency || "EUR") === c ? " selected" : "") + '>' + c + '</option>';
        }).join("");
        var makeName   = v.make || "";
        var makesList  = window.Catalog ? window.Catalog.makes() : [];
        var modelsList = window.Catalog ? window.Catalog.models(makeName) : [];
        var makesDL  = '<datalist id="cat_makes">'  + makesList.map(function (m) { return '<option value="' + esc(m) + '">'; }).join("") + '</datalist>';
        var modelsDL = '<datalist id="cat_models">' + modelsList.map(function (m) { return '<option value="' + esc(m) + '">'; }).join("") + '</datalist>';

        return '' +
          '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? t("common.edit") : t("vehicles.add").replace("+ ", "")) + '</h1>' +
          makesDL + modelsDL +
          '<div class="card">' +
            '<label class="field"><span>' + t("vehicles.make") + '</span><input id="f_make" list="cat_makes" value="' + esc(makeName) + '" oninput="DR.onMakeInput(this.value)" autocomplete="off"></label>' +
            '<label class="field"><span>' + t("vehicles.model") + '</span><input id="f_model" list="cat_models" value="' + esc(v.model) + '" autocomplete="off"></label>' +
            field("f_year", "vehicles.year", v.year || "", "number") +
            field("f_plate", "vehicles.plate", v.plate) +
            '<label class="field"><span>' + t("vehicles.category") + '</span><select id="f_category">' + catOpts + '</select></label>' +
            '<label class="field"><span>' + t("vehicles.vin") + '</span>' +
              '<div style="display:flex;gap:.4rem">' +
                '<input id="f_vin" type="text" value="' + esc(v.vin) + '" style="flex:1" placeholder="17 chars" maxlength="17">' +
                '<button type="button" class="btn btn-secondary sm" onclick="DR.decodeVin()" style="white-space:nowrap;padding:.4rem .7rem">Dekoduj</button>' +
              '</div>' +
            '</label>' +
            '<label class="field"><span>' + t("d.vehicle_status") + '</span><select id="f_status">' + statusOpts + '</select></label>' +
            field("f_regowner", "d.vehicle_registered_owner", v.registered_owner || "") +
            field("f_fuel", "d.fuel", eng.fuel) +
            field("f_power", "d.power", eng.power_kw || "", "number") +
          '</div>' +
          '<div class="card"><h2 data-i18n="d.trade_mode"></h2>' +
            '<label class="chk"><input type="checkbox" id="f_trade_mode"' + (tradeOn ? " checked" : "") + ' onchange="DR.toggleTradeMode()"> ' + t("d.trade_mode") + '</label>' +
            '<div id="tradePurchaseFields"' + (tradeOn ? "" : " hidden") + '>' +
              '<h3 style="margin:.8rem 0 .3rem">' + t("d.trade_purchase") + '</h3>' +
              field("f_trade_buy_date",  "d.trade_buy_date",  tPur.date  || "", "date") +
              field("f_trade_buy_price", "d.trade_buy_price", tPur.price != null ? tPur.price : "", "number") +
              '<label class="field"><span>' + t("d.trade_buy_currency") + '</span><select id="f_trade_buy_cur">' + trCurOpts + '</select></label>' +
              '<label class="field"><span>' + t("d.trade_buy_source") + '</span><select id="f_trade_buy_src">' + srcOpts + '</select></label>' +
            '</div>' +
          '</div>' +
          '<div class="card"><h2 data-i18n="tech.title"></h2>' +
            field("f_oil_type", "tech.oil_type", sd.oil_type, "text", "5W-30") +
            field("f_oil_filter", "tech.oil_filter", sd.oil_filter) +
            field("f_air_filter", "tech.air_filter", sd.air_filter) +
            field("f_battery", "tech.battery", sd.battery) +
            field("f_tires_front", "tech.tires_front", tires.size_front, "text", "205/55 R16") +
            field("f_tires_set", "tech.tires_set", tires.current_set, "text", "letnje / zimske") +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.saveVehicle()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="DR.deleteVehicle(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== DODAJ / IZMENI DOGAĐAJ (uklj. retroaktivni "Početno stanje") ===== */
    event_form: function (params) {
      var id = params && params.id;
      var vehId = params && params.vehicle_id;
      var retro = !!(params && params.retro);
      var p = id ? Store.get("events", id) : Promise.resolve(null);
      return Promise.all([p, Store.all("vehicles")]).then(function (res) {
        var e = res[0]; App._editingEvent = e || null;
        if (e) { retro = !!e.retroactive; vehId = e.vehicle_id; }
        // Guard: deljeno vozilo nema write pristup
        var targetVeh = res[1].filter(function (v) { return v.id === (vehId || (e && e.vehicle_id)); })[0];
        if (targetVeh && targetVeh.read_only) {
          return '<button class="linkback" onclick="DR.go(\'vehicle\')">← Nazad</button>' +
            '<div class="card"><p class="empty">Na deljenom vozilu nije moguće dodavati događaje.</p></div>';
        }
        e = e || Models.createEvent({ vehicle_id: vehId, type: "service", app: "driver",
                                      date: retro ? "" : todayISO() });
        var vehOpts = res[1].filter(function (v) { return !v.read_only; }).map(function (v) {
          return '<option value="' + esc(v.id) + '"' + (e.vehicle_id === v.id ? " selected" : "") + '>' +
                 esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</option>';
        }).join("");
        var typeOpts = (App.config.event_quick_types || Models.EVENT_TYPES).map(function (ty) {
          return '<option value="' + ty + '"' + (e.type === ty ? " selected" : "") + '>' + t("d.type_" + ty) + '</option>';
        }).join("");

        App._eventPhotos = (e.photos || []).slice();
        var retroBox = '' +
          '<label class="chk mt8"><input type="checkbox" id="e_retro"' + (retro ? " checked" : "") +
            ' onchange="DR.toggleRetro()"> ' + t("d.retro_toggle") + '</label>' +
          '<div id="retroFields"' + (retro ? "" : ' hidden') + '>' +
            '<label class="field"><span>' + t("d.date_precision") + '</span><select id="e_dprec">' +
              '<option value="exact"' + (e.date_precision === "exact" ? " selected" : "") + '>' + t("d.prec_exact") + '</option>' +
              '<option value="month"' + (e.date_precision === "month" ? " selected" : "") + '>' + t("d.prec_month") + '</option>' +
              '<option value="approx"' + (e.date_precision === "approx" ? " selected" : "") + '>' + t("d.prec_approx") + '</option>' +
            '</select></label>' +
            '<label class="chk"><input type="checkbox" id="e_kmapprox"' + (e.km_precision === "approx" ? " checked" : "") + '> ' + t("d.km_approx") + '</label>' +
          '</div>';

        return '' +
          '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>' + (retro ? t("d.initial_cta") : t("d.add_event")) + '</h1>' +
          '<div class="card">' +
            '<label class="field"><span>' + t("d.nav_vehicle") + '</span><select id="e_vehicle">' + vehOpts + '</select></label>' +
            '<label class="field"><span>' + t("d.event_type") + '</span><select id="e_type" onchange="DR.onEventTypeChange(this)">' + typeOpts + '</select></label>' +
            field("e_title", "d.event_title", e.title) +
            field("e_date", "common.date", (e.date || (retro ? "" : todayISO())), "date") +
            field("e_km", "common.mileage", e.mileage_km != null ? e.mileage_km : "", "number") +
            '<label class="field"><span>Servis / radionica (opciono)</span>' +
              '<input id="e_shop" type="text" placeholder="npr. Auto Servis Petar, Vulkanizer kod mosta…" value="' + esc(e.shop_name || "") + '"></label>' +
            '<label class="field"><span>' + t("d.event_desc") + '</span>' +
              '<textarea id="e_desc" rows="3">' + esc(e.description) + '</textarea></label>' +
            '<label class="btn btn-secondary mt8 filelabel"><span data-i18n="d.event_photo"></span>' +
              '<input type="file" accept="image/*" multiple onchange="DR.pickEventPhotos(this)" hidden></label>' +
            '<div id="evtPreview">' + eventPhotoPreviewHTML() + '</div>' +
            retroBox +
          '</div>' +
          '<div id="coolantFields"' + (e.type === "coolant_service" ? "" : ' hidden') + ' class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">🌡️ Detalji rashladne tečnosti (opciono)</div>' +
            '<div class="row2">' +
              '<label class="field"><span>Tip (G11/G12/G13…)</span>' +
                '<input id="e_clt_type" type="text" placeholder="G12+, G13…" value="' + esc((e.coolant_data && e.coolant_data.coolant_type) || "") + '"></label>' +
              '<label class="field"><span>Koncentracija (%)</span>' +
                '<input id="e_clt_conc" type="number" min="30" max="70" placeholder="npr. 50" value="' + esc((e.coolant_data && e.coolant_data.concentration_pct != null) ? e.coolant_data.concentration_pct : "") + '"></label>' +
            '</div>' +
            '<label class="field"><span>Sledeća zamena za (god.)</span>' +
              '<input id="e_clt_years" type="number" min="1" max="10" placeholder="npr. 3" value="' + esc((e.coolant_data && e.coolant_data.interval_years != null) ? e.coolant_data.interval_years : "") + '"></label>' +
            '<div style="margin-top:8px">' +
              '<label class="chk"><input type="checkbox" id="e_clt_therm"' + (e.coolant_data && e.coolant_data.thermostat_changed ? " checked" : "") + '> Zamenjen termostat</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_clt_hoses"' + (e.coolant_data && e.coolant_data.hoses_checked ? " checked" : "") + '> Pregledane cevi i spojevi</label>' +
            '</div>' +
          '</div>' +
          '<div id="beltFields"' + (e.type === "belt_service" ? "" : ' hidden') + ' class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">⚙️ Detalji kaišа / lanca (opciono)</div>' +
            '<label class="field"><span>Tip</span>' +
              '<select id="e_blt_type">' +
                ['', 'timing-belt', 'timing-chain', 'accessory-belt'].map(function (t_) {
                  var labels = { '': '— izaberi —', 'timing-belt': 'Zupčasti kaiš (razvodni)', 'timing-chain': 'Lanac razvoda', 'accessory-belt': 'Klinasti kaiš (alternator/klima)' };
                  return '<option value="' + t_ + '"' + (e.belt_data && e.belt_data.belt_type === t_ ? " selected" : "") + '>' + labels[t_] + '</option>';
                }).join("") +
              '</select></label>' +
            '<label class="field"><span>Interval zamene (km, npr. 90000)</span>' +
              '<input id="e_blt_interval" type="number" step="1000" placeholder="npr. 90000" value="' + esc((e.belt_data && e.belt_data.interval_km) ? e.belt_data.interval_km : "") + '"></label>' +
            '<div style="margin-top:8px">' +
              '<label class="chk"><input type="checkbox" id="e_blt_wp"' + (e.belt_data && e.belt_data.water_pump_changed ? " checked" : "") + '> Zamenjena vodena pumpa</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_blt_tens"' + (e.belt_data && e.belt_data.tensioner_changed ? " checked" : "") + '> Zamenjen zatezač</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_blt_roller"' + (e.belt_data && e.belt_data.roller_changed ? " checked" : "") + '> Zamenjena remenica</label>' +
            '</div>' +
          '</div>' +
          '<div id="brakeFields"' + (e.type === "brake_service" ? "" : ' hidden') + ' class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">🛑 Detalji kočnica (opciono)</div>' +
            '<div class="row2">' +
              '<label class="field"><span>Pločice napred (mm)</span>' +
                '<input id="e_brk_fp" type="number" step="0.5" placeholder="npr. 8" value="' + esc((e.brake_data && e.brake_data.front_pads_mm != null) ? e.brake_data.front_pads_mm : "") + '"></label>' +
              '<label class="field"><span>Pločice nazad (mm)</span>' +
                '<input id="e_brk_rp" type="number" step="0.5" placeholder="npr. 6" value="' + esc((e.brake_data && e.brake_data.rear_pads_mm != null) ? e.brake_data.rear_pads_mm : "") + '"></label>' +
            '</div>' +
            '<div style="margin-top:8px">' +
              '<label class="chk"><input type="checkbox" id="e_brk_fd"' + (e.brake_data && e.brake_data.front_discs_changed ? " checked" : "") + '> Zamenjeni diskovi napred</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_brk_rd"' + (e.brake_data && e.brake_data.rear_discs_changed ? " checked" : "") + '> Zamenjeni diskovi nazad</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_brk_fl"' + (e.brake_data && e.brake_data.fluid_changed ? " checked" : "") + '> Zamenjena kočiona tečnost</label>' +
            '</div>' +
          '</div>' +
          '<div id="oilFields"' + (e.type === "oil_change" ? "" : ' hidden') + ' class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">🛢️ Detalji zamene ulja (opciono)</div>' +
            '<div class="row2">' +
              '<label class="field"><span>Specifikacija</span>' +
                '<input id="e_oil_spec" type="text" placeholder="5W-30, 0W-40…" value="' + esc((e.oil_data && e.oil_data.spec) || "") + '"></label>' +
              '<label class="field"><span>Količina (L)</span>' +
                '<input id="e_oil_qty" type="number" step="0.1" placeholder="npr. 5.5" value="' + esc((e.oil_data && e.oil_data.qty_l != null) ? e.oil_data.qty_l : "") + '"></label>' +
            '</div>' +
            '<label class="field"><span>Brend ulja (opciono)</span>' +
              '<input id="e_oil_brand" type="text" placeholder="Castrol, Shell, Mobil…" value="' + esc((e.oil_data && e.oil_data.brand) || "") + '"></label>' +
            '<div style="margin-top:8px">' +
              '<label class="chk"><input type="checkbox" id="e_oil_filter"' + (e.oil_data && e.oil_data.filter_changed ? " checked" : "") + '> Zamenjen filter ulja</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_oil_air_filter"' + (e.oil_data && e.oil_data.air_filter_changed ? " checked" : "") + '> Zamenjen filter vazduha</label>' +
              '<label class="chk mt8"><input type="checkbox" id="e_oil_cabin_filter"' + (e.oil_data && e.oil_data.cabin_filter_changed ? " checked" : "") + '> Zamenjen filter kabine</label>' +
            '</div>' +
          '</div>' +
          '<div id="batteryFields"' + (e.type === "battery" ? "" : ' hidden') + ' class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">🔋 Detalji akumulatora (opciono)</div>' +
            '<label class="field"><span>Brend</span>' +
              '<input id="e_bat_brand" type="text" placeholder="Varta, Bosch, Yuasa…" value="' + esc((e.battery_data && e.battery_data.brand) || "") + '"></label>' +
            '<div class="row2">' +
              '<label class="field"><span>Kapacitet (Ah)</span>' +
                '<input id="e_bat_ah" type="number" placeholder="npr. 60" value="' + esc((e.battery_data && e.battery_data.ah != null) ? e.battery_data.ah : "") + '"></label>' +
              '<label class="field"><span>Struja (CCA/A)</span>' +
                '<input id="e_bat_cca" type="number" placeholder="npr. 540" value="' + esc((e.battery_data && e.battery_data.cca != null) ? e.battery_data.cca : "") + '"></label>' +
            '</div>' +
            '<label class="field"><span>Stanje</span>' +
              '<select id="e_bat_cond">' +
                ['', 'novo', 'polovan-ispravan', 'slab', 'mrtav'].map(function (c) {
                  return '<option value="' + c + '"' + (e.battery_data && e.battery_data.condition === c ? " selected" : "") + '>' +
                    (c ? c.charAt(0).toUpperCase() + c.slice(1) : '— izaberi —') + '</option>';
                }).join("") +
              '</select></label>' +
          '</div>' +
          '<div id="tireFields"' + (e.type === "tires" ? "" : ' hidden') + ' class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">🔄 Detalji guma (opciono)</div>' +
            '<label class="field"><span>Set</span>' +
              '<select id="e_tire_set">' +
                '<option value=""' + (!e.tire_data || !e.tire_data.set_name ? " selected" : "") + '>— izaberi —</option>' +
                ['letnje','zimske','cjelogodišnje','off-road'].map(function (s) {
                  return '<option value="' + s + '"' + (e.tire_data && e.tire_data.set_name === s ? " selected" : "") + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
                }).join("") +
              '</select></label>' +
            '<label class="field"><span>Dimenzija (npr. 205/55 R16)</span>' +
              '<input id="e_tire_size" type="text" placeholder="205/55 R16" value="' + esc((e.tire_data && e.tire_data.size) || "") + '"></label>' +
            '<label class="field"><span>Brend (opciono)</span>' +
              '<input id="e_tire_brand" type="text" placeholder="Michelin, Nokian…" value="' + esc((e.tire_data && e.tire_data.brand) || "") + '"></label>' +
            '<label class="field"><span>Dubina gaznog sloja (mm)</span>' +
              '<input id="e_tire_tread" type="number" step="0.5" placeholder="npr. 7.5" value="' + esc((e.tire_data && e.tire_data.tread_mm != null) ? e.tire_data.tread_mm : "") + '"></label>' +
          '</div>' +
          '<div class="card" style="margin-bottom:.6rem">' +
            '<div style="font-weight:600;font-size:.88rem;margin-bottom:10px">🔔 Sledeći servis (opciono)</div>' +
            '<label class="field"><span>Za km (npr. 185000)</span>' +
              '<input id="e_next_km" type="number" placeholder="kilometraža sledećeg servisa" value="' + esc((e.next_service && e.next_service.km) ? e.next_service.km : "") + '"></label>' +
            '<label class="field"><span>Datum (najkasnije do)</span>' +
              '<input id="e_next_date" type="date" value="' + esc((e.next_service && e.next_service.date) ? e.next_service.date : "") + '"></label>' +
            '<p style="color:#64748b;font-size:.78rem;margin:4px 0 0">Ako popuniš bar jedno polje, automatski se kreira podsetnik.</p>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.saveEvent()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="DR.deleteEvent(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== POČETNO STANJE — pun wizard (4 kartice, sve preskočivo) ===== */
    initial_state: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Store.get("vehicles", vehId).then(function (v) {
        if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';
        App._initVehId = vehId;
        var tires = v.tires || {};
        return '' +
          '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1 data-i18n="d.initial_title"></h1>' +
          '<p class="sub">' + esc(v.make + " " + v.model) + ' — ' + t("d.initial_sub_short") + '</p>' +

          // 4.1 Kilometraža
          '<div class="card"><h2 data-i18n="d.is_km"></h2>' +
            field("is_km", "common.mileage", "", "number") +
          '</div>' +

          // 4.2 Poslednji servis
          '<div class="card"><h2 data-i18n="d.is_service"></h2>' +
            field("is_svc_title", "d.event_title", t("d.type_service"), "text") +
            '<label class="field"><span>' + t("d.date_precision") + '</span><select id="is_svc_dprec">' +
              '<option value="approx">' + t("d.prec_approx") + '</option>' +
              '<option value="month">' + t("d.prec_month") + '</option>' +
              '<option value="exact">' + t("d.prec_exact") + '</option>' +
            '</select></label>' +
            field("is_svc_date", "common.date", "", "date") +
            field("is_svc_km", "common.mileage", "", "number") +
            '<label class="field"><span>' + t("d.event_desc") + '</span><textarea id="is_svc_desc" rows="2" placeholder="' + esc(t("d.is_svc_ph")) + '"></textarea></label>' +
          '</div>' +

          // 4.3 Rokovi → podsetnici
          '<div class="card"><h2 data-i18n="d.is_deadlines"></h2>' +
            field("is_reg", "d.is_registration", "", "date") +
            field("is_insp", "d.is_inspection", "", "date") +
            field("is_pol", "d.is_policy", "", "date") +
          '</div>' +

          // 4.4 Gume
          '<div class="card"><h2 data-i18n="tech.tires_set"></h2>' +
            field("is_tire_size", "tech.tires_front", tires.size_front, "text", "205/55 R16") +
            field("is_tire_set", "tech.tires_set", tires.current_set, "text", t("d.is_tire_set_ph")) +
            '<label class="chk mt8"><input type="checkbox" id="is_tire_rem"> ' + t("d.is_tire_reminder") + '</label>' +
          '</div>' +

          '<button class="btn btn-primary" onclick="DR.saveInitialState()" data-i18n="common.save"></button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="wo.skip"></button>';
      });
    },

    /* ===== DOKUMENTA ===== */
    documents: function () {
      return Promise.all([Store.all("documents"), Store.all("vehicles")]).then(function (res) {
        var docs = res[0], vehicles = res[1];
        var vById = {}; vehicles.forEach(function (v) { vById[v.id] = v; });
        docs.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
        var list = docs.length ? docs.map(function (d) {
          var v = vById[d.vehicle_id];
          return '<div class="card docrow">' +
            (d.file ? '<img class="docthumb" src="' + d.file + '" alt="">' : '') +
            '<button class="rowmain" onclick="DR.go(\'document_form\',{id:\'' + esc(d.id) + '\'})">' +
              '<b>' + t("d.doctype_" + (d.doc_type || "other")) + '</b>' +
              '<span class="muted">' + esc(d.date || "") + (v ? " • " + esc(v.make + " " + v.model) : "") + '</span>' +
            '</button></div>';
        }).join("") : '<div class="card"><p class="empty" data-i18n="d.documents_empty"></p></div>';
        return '<h1 data-i18n="d.nav_documents"></h1>' + list +
          (vehicles.length
            ? '<button class="btn btn-primary" onclick="DR.go(\'document_form\')" data-i18n="d.doc_add"></button>'
            : '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>');
      });
    },

    document_form: function (params) {
      var id = params && params.id;
      var p = id ? Store.get("documents", id) : Promise.resolve(null);
      return Promise.all([p, Store.all("vehicles")]).then(function (res) {
        var d = res[0]; App._editingDoc = d || null;
        d = d || Models.createDocument({ doc_type: "registration", vehicle_id: App.activeVehicleId });
        App._docFile = d.file || null;
        var types = ["registration", "policy", "receipt", "warranty", "other"];
        var typeOpts = types.map(function (ty) {
          return '<option value="' + ty + '"' + (d.doc_type === ty ? " selected" : "") + '>' + t("d.doctype_" + ty) + '</option>';
        }).join("");
        var vehOpts = res[1].map(function (v) {
          return '<option value="' + esc(v.id) + '"' + (d.vehicle_id === v.id ? " selected" : "") + '>' +
                 esc(v.make + " " + v.model) + '</option>';
        }).join("");
        return '<button class="linkback" onclick="DR.go(\'documents\')" data-i18n="common.back"></button>' +
          '<h1 data-i18n="d.doc_add"></h1>' +
          '<div class="card">' +
            '<label class="field"><span>' + t("d.doc_kind") + '</span><select id="doc_type">' + typeOpts + '</select></label>' +
            '<label class="field"><span>' + t("d.nav_vehicle") + '</span><select id="doc_vehicle">' + vehOpts + '</select></label>' +
            field("doc_date", "common.date", d.date || todayISO(), "date") +
            '<label class="btn btn-secondary mt8 filelabel"><span data-i18n="d.doc_photo"></span>' +
              '<input type="file" accept="image/*" onchange="DR.pickDocPhoto(this)" hidden></label>' +
            '<div id="docPreview">' + (d.file ? '<img class="docthumb big" src="' + d.file + '">' : '') + '</div>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.saveDocument()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="DR.deleteDocument(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== ISTORIJA (lista ili timeline — toggle) ===== */
    history: function () {
      return Promise.all([Store.all("events"), Store.all("vehicles")]).then(function (res) {
        var events = res[0], vehicles = res[1];
        var vById = {}; vehicles.forEach(function (v) { vById[v.id] = v; });
        events.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

        var mode = localStorage.getItem("dr_hist_mode") || "list";

        var toggle = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
          '<button class="chip' + (mode === "list" ? " active" : "") + '" onclick="DR.setHistMode(\'list\')">📋 Lista</button>' +
          '<button class="chip' + (mode === "timeline" ? " active" : "") + '" onclick="DR.setHistMode(\'timeline\')">📅 Timeline</button>' +
        '</div>';

        var content;
        if (!events.length) {
          content = '<div class="card"><p class="empty" data-i18n="d.history_empty"></p></div>';
        } else if (mode === "timeline") {
          // Grupiši po god-mes
          var byMonth = {};
          var monthOrder = [];
          events.forEach(function (e) {
            var ym = (e.date || "????-??").slice(0, 7);
            if (!byMonth[ym]) { byMonth[ym] = []; monthOrder.push(ym); }
            byMonth[ym].push(e);
          });
          content = '<div style="position:relative;padding-left:28px">' +
            '<div style="position:absolute;left:10px;top:0;bottom:0;width:2px;background:rgba(255,255,255,.1)"></div>' +
            monthOrder.map(function (ym) {
              var parts = ym.split("-");
              var MONTHS = ["","Jan","Feb","Mar","Apr","Maj","Jun","Jul","Avg","Sep","Okt","Nov","Dec"];
              var label = (MONTHS[parseInt(parts[1], 10)] || parts[1]) + " " + parts[0];
              return '<div style="margin-bottom:4px">' +
                '<div style="position:relative;margin-bottom:8px">' +
                  '<div style="position:absolute;left:-23px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:#5c6bc0;border:2px solid #1a1a2e"></div>' +
                  '<span style="font-size:.75rem;font-weight:700;letter-spacing:.06em;color:#5c6bc0;text-transform:uppercase">' + label + '</span>' +
                '</div>' +
                byMonth[ym].map(function (e) {
                  var v = vById[e.vehicle_id];
                  var totals = Models.formatTotals(Models.sumByCurrency(e.items));
                  return '<div class="card evt' + (e.retroactive ? " retro" : "") + '" style="margin-bottom:6px">' +
                    '<div class="evt-head"><b>' + esc(e.title || t("d.type_" + e.type)) + '</b>' +
                      '<span style="font-size:.78rem">' + esc(fmtEventDate(e)) + '</span></div>' +
                    '<div class="trust" style="font-size:.82rem">' + trustIcon(e) + " " +
                      (v ? esc(v.make + " " + v.model) : "") +
                      (e.mileage_km != null ? " • " + esc(e.mileage_km) + " km" : "") +
                    '</div>' +
                    (totals ? '<div class="evt-total" style="font-size:.82rem">' + totals + '</div>' : '') +
                    '<button class="linkback" style="margin-top:4px;font-size:.78rem" onclick="DR.go(\'event_form\',{id:\'' + esc(e.id) + '\'})">Izmeni</button>' +
                  '</div>';
                }).join("") +
              '</div>';
            }).join("") +
          '</div>';
        } else {
          content = events.map(function (e) {
            var v = vById[e.vehicle_id];
            var totals = Models.formatTotals(Models.sumByCurrency(e.items));
            return '<div class="card evt' + (e.retroactive ? " retro" : "") + '">' +
              '<div class="evt-head"><b>' + esc(e.title || t("d.type_" + e.type)) + '</b>' +
                '<span>' + esc(fmtEventDate(e)) + '</span></div>' +
              '<div class="trust">' + trustIcon(e) + " " +
                (v ? esc(v.make + " " + v.model) : "") +
                (e.mileage_km != null ? " • " + esc(e.mileage_km) + " km" + (e.km_precision === "approx" ? " (~)" : "") : "") +
                (e.retroactive ? '<span class="retro-tag">' + t("d.retro_tag") + '</span>' : '') +
              '</div>' +
              (e.description ? '<div class="evt-km">' + esc(e.description) + '</div>' : '') +
              (totals ? '<div class="evt-total">' + t("common.total") + ': ' + totals + '</div>' : '') +
              '<button class="linkback" onclick="DR.go(\'event_form\',{id:\'' + esc(e.id) + '\'})" data-i18n="common.edit"></button>' +
            '</div>';
          }).join("");
        }

        return '<h1 data-i18n="d.nav_history"></h1>' + toggle + content +
          (vehicles.length
            ? '<button class="btn btn-primary" style="margin-top:8px" onclick="DR.addEvent(null,false)" data-i18n="d.add_event"></button>'
            : '');
      });
    },

    /* ===== TROŠKOVI ===== */
    expenses: function () {
      return Promise.all([Store.all("events"), Store.all("vehicles")]).then(function (res) {
        var events = res[0], vehicles = res[1];
        if (!vehicles.length) {
          return '<h1 data-i18n="d.nav_expenses"></h1>' +
            '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';
        }
        var vid = App.expensesVehicleId || App.activeVehicleId || vehicles[0].id;
        if (!vehicles.some(function (v) { return v.id === vid; })) vid = vehicles[0].id;
        App.expensesVehicleId = vid;
        var period = App.expensesPeriod || "month";
        var EXP_TYPES = ["expense_fuel","expense_tires","expense_bodywork",
          "expense_registration","expense_insurance","expense_decorative","expense_other"];
        var all = events.filter(function (e) {
          return e.vehicle_id === vid && EXP_TYPES.indexOf(e.type) !== -1;
        });
        var filtered = filterByPeriod(all, period);
        filtered.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

        var switcher = vehicles.length > 1
          ? '<div class="vehswitch">' + vehicles.map(function (x) {
              return '<button class="chip' + (x.id === vid ? ' active' : '') +
                '" onclick="DR.setExpensesVehicle(\'' + esc(x.id) + '\')">' + esc(x.make + " " + x.model) + '</button>';
            }).join("") + '</div>'
          : '';
        var periodDefs = [
          ["month","Ovaj mesec"],["prev","Prošli mesec"],["3m","3 meseca"],["year","Ova godina"],["all","Sve"]
        ];
        var periodBar = '<div class="vehswitch">' + periodDefs.map(function (p) {
          return '<button class="chip' + (period === p[0] ? ' active' : '') +
            '" onclick="DR.setExpensesPeriod(\'' + p[0] + '\')">' + p[1] + '</button>';
        }).join("") + '</div>';

        var totalRSD = 0, totalEUR = 0;
        filtered.forEach(function (e) {
          if (e.cost) {
            if (e.cost.currency === "EUR") totalEUR += (e.cost.total || 0);
            else totalRSD += (e.cost.total || 0);
          }
        });
        var totalStr = "";
        if (totalRSD) totalStr += Models.formatAmount(totalRSD, "RSD");
        if (totalEUR) totalStr += (totalStr ? " + " : "") + Models.formatAmount(totalEUR, "EUR");

        var list = filtered.length ? filtered.map(function (e) {
          var amtStr = e.cost ? Models.formatAmount(e.cost.total, e.cost.currency) : "";
          return '<div class="card exprow">' +
            '<button class="rowmain" onclick="DR.go(\'expense_form\',{id:\'' + esc(e.id) + '\'})">' +
              '<b>' + esc(e.title || t("d.type_" + e.type)) + '</b>' +
              '<span class="muted">' + esc(e.date || "") +
                (e.cost && e.cost.informal ? ' • ⓘ' : '') +
                ((e.photos && e.photos.length) ? ' • 📎' : '') +
              '</span>' +
            '</button>' +
            (amtStr ? '<b class="expamt">' + esc(amtStr) + '</b>' : '') +
          '</div>';
        }).join("") : '<div class="card"><p class="empty" data-i18n="d.expenses_empty"></p></div>';

        return '<h1 data-i18n="d.nav_expenses"></h1>' +
          switcher + periodBar +
          (totalStr ? '<div class="card exptotal"><b>' + t("common.total") + ': ' + totalStr + '</b></div>' : '') +
          list +
          '<button class="btn btn-primary" onclick="DR.go(\'expense_form\',{vehicle_id:\'' + esc(vid) + '\'})" data-i18n="d.add_event"></button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'fuel_log\',{vehicle_id:\'' + esc(vid) + '\'})" style="background:#1a2020">⛽ Evidencija goriva</button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.exportExpensesCSV()">📥 Export troškovi (CSV)</button>';
      });
    },

    expense_form: function (params) {
      var id = params && params.id;
      var vehId = params && params.vehicle_id;
      var p = id ? Store.get("events", id) : Promise.resolve(null);
      return Promise.all([p, Store.all("vehicles")]).then(function (res) {
        var e = res[0]; App._editingExpense = e || null;
        if (e) vehId = e.vehicle_id;
        var EXP_TYPES = ["expense_fuel","expense_tires","expense_bodywork",
          "expense_registration","expense_insurance","expense_decorative","expense_other"];
        var defType = (e && e.type) || "expense_fuel";
        var cost = (e && e.cost) || { total: "", currency: Store.settings.get("currency", "RSD"), informal: false };
        var activeVid = vehId || App.expensesVehicleId || App.activeVehicleId;
        var vehOpts = res[1].map(function (v) {
          return '<option value="' + esc(v.id) + '"' + (v.id === activeVid ? " selected" : "") + '>' +
                 esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</option>';
        }).join("");
        var typeOpts = EXP_TYPES.map(function (ty) {
          return '<option value="' + ty + '"' + (ty === defType ? " selected" : "") + '>' + t("d.type_" + ty) + '</option>';
        }).join("");
        var curOpts = ["RSD","EUR"].map(function (c) {
          return '<option value="' + c + '"' + (cost.currency === c ? " selected" : "") + '>' + c + '</option>';
        }).join("");
        var isFuel = defType === "expense_fuel";
        return '<button class="linkback" onclick="DR.go(\'expenses\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? t("common.edit") : t("d.add_event")) + '</h1>' +
          '<div class="card">' +
            '<label class="field"><span>' + t("d.nav_vehicle") + '</span><select id="exp_vehicle">' + vehOpts + '</select></label>' +
            '<label class="field"><span>' + t("d.event_type") + '</span><select id="exp_type" onchange="DR.onExpTypeChange(this)">' + typeOpts + '</select></label>' +
            field("exp_title", "d.event_title", (e && e.title) || "") +
            field("exp_date", "common.date", (e && e.date) || todayISO(), "date") +
            field("exp_km", "common.mileage", (e && e.mileage_km != null ? e.mileage_km : ""), "number") +
            '<div id="fuelFields"' + (isFuel ? "" : ' hidden') + '>' +
              '<div class="row2">' +
                '<label class="field"><span>Litara</span><input id="exp_liters" type="number" step="0.01" placeholder="npr. 45.5" value="' + esc((e && e.fuel_liters) ? e.fuel_liters : "") + '" oninput="DR.calcFuelTotal()"></label>' +
                '<label class="field"><span>Cena/l</span><input id="exp_ppl" type="number" step="0.01" placeholder="RSD/l" value="' + esc((e && e.fuel_ppl) ? e.fuel_ppl : "") + '" oninput="DR.calcFuelTotal()"></label>' +
              '</div>' +
            '</div>' +
            '<div class="row2">' +
              field("exp_amount", "d.expense_amount", cost.total !== "" ? cost.total : "", "number") +
              '<label class="field"><span>&nbsp;</span><select id="exp_currency">' + curOpts + '</select></label>' +
            '</div>' +
            field("exp_desc", "d.event_desc", (e && e.description) || "") +
            '<label class="chk mt8"><input type="checkbox" id="exp_informal"' + (cost.informal ? " checked" : "") + '> ' + t("d.expense_informal") + '</label>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.saveExpense()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="DR.deleteExpense(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== PODSETNICI (za vlasnika basic) ===== */
    reminders: function () {
      return Promise.all([Store.all("reminders"), Store.all("vehicles"), Store.all("events")])
        .then(function (res) {
          var reminders = res[0], vehicles = res[1], events = res[2];
          App._vehById = {}; vehicles.forEach(function (v) { App._vehById[v.id] = v; });
          var kmBy = latestKmByVehicle(events);
          var today = todayISO();
          var sorted = Reminders.sortByUrgency(reminders, today, kmBy);
          var list = sorted.length
            ? sorted.map(function (r) { return reminderRowHTML(r, today, kmBy); }).join("")
            : '<div class="card"><p class="empty" data-i18n="reminders.empty"></p></div>';
          return '<h1 data-i18n="reminders.title"></h1>' + list +
            (vehicles.length
              ? '<button class="btn btn-primary" onclick="DR.go(\'reminder_form\')" data-i18n="reminders.add"></button>'
              : '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>');
        });
    },

    reminder_form: function (params) {
      var id = params && params.id;
      var p = id ? Store.get("reminders", id) : Promise.resolve(null);
      return Promise.all([p, Store.all("vehicles")]).then(function (res) {
        var r = res[0]; App._editingReminder = r || null;
        r = r || Models.createReminder({ vehicle_id: (params && params.vehicle_id) || App.activeVehicleId });
        var vehOpts = '<option value="">—</option>' + res[1].map(function (v) {
          return '<option value="' + esc(v.id) + '"' + (r.vehicle_id === v.id ? " selected" : "") + '>' +
                 esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</option>';
        }).join("");
        return '<button class="linkback" onclick="DR.go(\'reminders\')" data-i18n="common.back"></button>' +
          '<h1 data-i18n="reminders.add"></h1>' +
          '<div class="card">' +
            field("r_title", "reminders.rtitle", r.title) +
            '<label class="field"><span data-i18n="reminders.for_vehicle"></span><select id="r_vehicle">' + vehOpts + '</select></label>' +
            field("r_date", "reminders.due_date", r.due_date || "", "date") +
            field("r_km", "reminders.due_km", r.due_mileage_km || "", "number") +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.saveReminder()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="DR.deleteReminder(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== SETTINGS ===== */
    settings: function () {
      var profile = Store.settings.get("profile", { name: "", phone: "" });
      var currency = Store.settings.get("currency", App.config.currency_default);
      var lang = Store.settings.get("lang", App.config.language_default);
      var curOpts = App.config.currencies.map(function (c) {
        return '<option' + (c === currency ? " selected" : "") + '>' + c + '</option>';
      }).join("");
      var langOpts = App.config.languages.map(function (l) {
        return '<option value="' + l + '"' + (l === lang ? " selected" : "") + '>' + l.toUpperCase() + '</option>';
      }).join("");
      return '' +
        '<h1 data-i18n="nav.settings"></h1>' +
        '<div class="card"><h2 data-i18n="settings.profile"></h2>' +
          field("s_name", "d.owner_name", profile.name) +
          field("s_phone", "settings.phone", profile.phone, "tel") +
        '</div>' +
        '<div class="card">' +
          '<label class="field"><span>' + t("settings.currency") + '</span><select id="s_currency">' + curOpts + '</select></label>' +
          '<label class="field"><span>' + t("settings.language") + '</span><select id="s_lang">' + langOpts + '</select></label>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="DR.saveSettings()" data-i18n="common.save"></button>' +
        '<div class="card mt16"><h2 data-i18n="settings.backup"></h2>' +
          '<button class="btn btn-secondary" onclick="DR.exportBackup()" data-i18n="backup.export"></button>' +
          '<label class="btn btn-secondary mt8 filelabel"><span data-i18n="backup.import"></span>' +
            '<input type="file" accept=".json,application/json" onchange="DR.importBackup(this)" hidden></label>' +
        '</div>' +
        '<div class="card mt16" id="emailSignupCard">' + emailSignupCardHTML() + '</div>' +
        '<div class="card mt16" id="licenseCard">' + licenseCardHTML() + '</div>' +
        '<div class="card mt16" id="aucoreCard">' + aucoreCardHTML() + '</div>' +
        '<div style="text-align:center;padding:24px 0 8px;font-size:.75rem;color:#475569">' +
          '<a href="../legal/terms.html" style="color:#475569;margin:0 10px">Uslovi korišćenja</a>' +
          '<a href="../legal/privacy.html" style="color:#475569;margin:0 10px">Privatnost</a>' +
          '<a href="../about.html" style="color:#475569;margin:0 10px">O AutoUniverse</a>' +
        '</div>';
    },

    /* ===== PRODAJ VOZILO — status wizard ===== */
    sell_vehicle: function (params) {
      var vid = (params && params.id) || App.activeVehicleId;
      return Store.get("vehicles", vid).then(function (v) {
        if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';
        App._sellVehicleId = vid;
        var tr = (v.trade && v.trade.sale) || {};
        var curOpts = ["EUR","RSD"].map(function (c) {
          return '<option value="' + c + '"' + ((tr.currency || "EUR") === c ? " selected" : "") + '>' + c + '</option>';
        }).join("");
        var statusOpts = ["active","for_sale","sold","archived","totaled"].map(function (s) {
          return '<option value="' + s + '"' + (v.status === s ? " selected" : "") + '>' + t("d.vehicle_status_" + s) + '</option>';
        }).join("");
        return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>' + t("d.sell_vehicle") + '</h1>' +
          '<p class="sub">' + esc(v.make + " " + v.model) + ' • ' + t("d.vehicle_status_" + (v.status || "active")) + '</p>' +
          '<div class="card">' +
            '<label class="field"><span>' + t("d.sell_status_label") + '</span><select id="sv_status" onchange="DR.onSellStatusChange()">' + statusOpts + '</select></label>' +
          '</div>' +
          '<div class="card" id="saleFields"' + (v.status !== "sold" ? ' hidden' : '') + '>' +
            '<h2 data-i18n="d.trade_sale"></h2>' +
            field("sv_sell_date",  "d.sell_date",  tr.date  || todayISO(), "date") +
            field("sv_sell_price", "d.sell_price", tr.price != null ? tr.price : "", "number") +
            '<label class="field"><span>' + t("d.trade_buy_currency") + '</span><select id="sv_sell_cur">' + curOpts + '</select></label>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.saveSellVehicle()" data-i18n="d.sell_confirm"></button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.cancel"></button>';
      });
    },

    /* ===== PUBLISH LISTING — objava na Autopijaci (trade_mode vozila) ===== */
    publish_listing: function (params) {
      var vid = (params && params.id) || App.activeVehicleId;
      return Store.get("vehicles", vid).then(function (v) {
        if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';
        App._publishVehicleId = vid;

        if (!window.Autopijaca) {
          return '<div class="card"><p class="empty">' + t("d.autopijaca_unavailable") + '</p>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button></div>';
        }

        var existing = Autopijaca.getListingForVehicle(vid);
        var tradePrice = (v.trade && v.trade.sale && v.trade.sale.price) ? v.trade.sale.price : '';
        var tradeCur   = (v.trade && v.trade.sale && v.trade.sale.currency) ? v.trade.sale.currency : 'EUR';
        var curOpts = ["EUR","RSD"].map(function (c) {
          return '<option value="' + c + '"' + (tradeCur === c ? " selected" : "") + '>' + c + '</option>';
        }).join("");

        var existingSection = '';
        if (existing) {
          existingSection =
            '<div class="card" style="border:2px solid #10B981">' +
              '<h2>' + t("d.listing_active") + '</h2>' +
              '<p class="muted">ID #' + existing.listing_id + '</p>' +
              '<button class="btn btn-secondary mt8" onclick="DR.loadMyListingMessages(\'' + esc(vid) + '\')">' + t("d.listing_messages") + '</button>' +
              '<button class="btn btn-secondary mt8" onclick="DR.deleteMyListing(\'' + esc(vid) + '\')" style="color:#ef4444">' + t("d.listing_delete") + '</button>' +
            '</div>' +
            '<div id="listing_messages_box"></div>';
        }

        return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>' + t("d.publish_listing") + '</h1>' +
          '<p class="sub">' + esc(v.make + " " + v.model + (v.year ? " " + v.year : "")) + '</p>' +
          existingSection +
          '<div class="card">' +
            '<h2>' + t("d.publish_on_autopijaca") + '</h2>' +
            '<label class="field"><span>' + t("d.listing_price") + '</span>' +
              '<div style="display:flex;gap:8px">' +
                '<input type="number" id="pl_price" value="' + tradePrice + '" style="flex:1">' +
                '<select id="pl_cur" style="width:80px">' + curOpts + '</select>' +
              '</div>' +
            '</label>' +
            '<label class="field"><span>' + t("d.listing_city") + '</span>' +
              '<input type="text" id="pl_city" placeholder="Kruševac"></label>' +
            '<label class="field"><span>' + t("d.listing_desc") + '</span>' +
              '<textarea id="pl_desc" rows="3" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:.9rem"></textarea></label>' +
            '<label class="field"><span>Telefon *</span>' +
              '<input type="tel" id="pl_phone" value="' + esc((Store.settings.get("profile", {}) || {}).phone || "") + '" placeholder="+381...">' +
            '</label>' +
            '<label class="field"><span>' + t("d.listing_contact_method") + '</span>' +
              '<select id="pl_contact">' +
                '<option value="phone_call">' + t("d.contact_phone_call") + '</option>' +
                '<option value="message">' + t("d.contact_message") + '</option>' +
              '</select>' +
            '</label>' +
          '</div>' +
          '<div class="card">' +
            '<p style="font-weight:600;margin-bottom:.4rem">Fotografije (max 3)</p>' +
            '<input type="file" id="pl_photos" accept="image/*" multiple style="display:none" onchange="DR.plPickPhotos(this)">' +
            '<div id="pl_photo_strip" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:.5rem"></div>' +
            '<button class="btn btn-secondary" style="font-size:.85rem" onclick="document.getElementById(\'pl_photos\').click()">📷 Dodaj sliku</button>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.publishListing()">' + t("d.publish_on_autopijaca") + '</button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.saleSummaryPdf(\'' + esc(vid) + '\')">📄 Pripremi za prodaju (PDF)</button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.cancel"></button>';
      });
    },

    /* ===== FORGOT PASSWORD — zahtjev za reset ===== */
    hub_forgot: function () {
      return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>Resetuj lozinku</h1>' +
        '<div class="card">' +
          '<p class="muted" style="margin-bottom:.8rem;font-size:.88rem">Unesite email adresu — poslaćemo link za resetovanje lozinke.</p>' +
          '<label class="field"><span>Email</span>' +
            '<input id="fg_email" type="email" autocomplete="email" placeholder="tvoj@email.com">' +
          '</label>' +
          '<div id="fg_msg" style="font-size:.82rem;margin:.3rem 0"></div>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubForgot()">Pošalji link</button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '</div>';
    },

    /* ===== RESET PASSWORD — unos nove lozinke sa tokenom ===== */
    hub_reset: function (params) {
      var token = (params && params.token) || new URLSearchParams(location.search).get('token') || '';
      return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>Nova lozinka</h1>' +
        '<div class="card">' +
          (token
            ? '<input type="hidden" id="rs_token" value="' + token + '">' +
              '<label class="field"><span>Nova lozinka</span>' +
                '<input id="rs_pass1" type="password" autocomplete="new-password" placeholder="min 8 znakova">' +
              '</label>' +
              '<label class="field"><span>Potvrdi lozinku</span>' +
                '<input id="rs_pass2" type="password" autocomplete="new-password">' +
              '</label>' +
              '<div id="rs_msg" style="font-size:.82rem;margin:.3rem 0"></div>' +
              '<button class="btn btn-primary mt8" onclick="DR.hubReset()">Sačuvaj lozinku</button>'
            : '<p class="empty">Token nije pronađen u URL-u. Otvori link iz mejla.</p>') +
        '</div>';
    },

    /* ===== HUB SESSIONS — aktivne sesije ===== */
    hub_sessions: function () {
      var html = '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>Aktivne sesije</h1>' +
        '<div id="sessions_box"><p class="muted" style="text-align:center;padding:20px">Učitavam...</p></div>';
      setTimeout(function () {
        DR.loadSessions();
      }, 0);
      return html;
    },

    /* ===== HUB CHANGE PASSWORD ===== */
    hub_change_pass: function () {
      return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>🔑 Promeni lozinku</h1>' +
        '<div class="card">' +
          '<label class="field"><span>Trenutna lozinka</span>' +
            '<input id="cp_current" type="password" autocomplete="current-password"></label>' +
          '<label class="field"><span>Nova lozinka</span>' +
            '<input id="cp_new" type="password" autocomplete="new-password" placeholder="Min 8 znakova"></label>' +
          '<label class="field"><span>Ponovi novu lozinku</span>' +
            '<input id="cp_confirm" type="password" autocomplete="new-password"></label>' +
          '<div id="cp_err" style="color:#f87171;font-size:.82rem;margin:.4rem 0"></div>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubChangePass()">Sačuvaj novu lozinku</button>' +
        '</div>';
    },

    /* ===== HUB PROFILE EDIT ===== */
    hub_profile_edit: function () {
      var u = hubUser || {};
      return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>👤 Izmeni profil</h1>' +
        '<div class="card">' +
          '<label class="field"><span>Ime i prezime</span>' +
            '<input id="pe_name" type="text" autocomplete="name" value="' + esc(u.name || '') + '"></label>' +
          '<label class="field"><span>Telefon (opciono)</span>' +
            '<input id="pe_phone" type="tel" autocomplete="tel" value="' + esc(u.phone || '') + '" placeholder="+381 60 ..."></label>' +
          '<div id="pe_err" style="color:#f87171;font-size:.82rem;margin:.4rem 0"></div>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubSaveProfile()">Sačuvaj izmene</button>' +
        '</div>';
    },

    /* ===== HUB VEHICLE EDIT ===== */
    hub_vehicle_edit: function (params) {
      var vid = (params && params.id) ? Number(params.id) : 0;
      var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>🚗 Izmeni vozilo</h1>' +
        '<div id="hve_loading" class="card"><p class="muted" style="text-align:center;padding:20px">Učitavam...</p></div>' +
        '<div id="hve_form" class="card" style="display:none">' +
          '<input type="hidden" id="hve_vid" value="' + vid + '">' +
          '<label class="field"><span>Marka</span><input id="hve_make" type="text"></label>' +
          '<label class="field"><span>Model</span><input id="hve_model" type="text"></label>' +
          '<label class="field"><span>Godište</span><input id="hve_year" type="number" min="1970" max="2030"></label>' +
          '<label class="field"><span>Registarska oznaka</span><input id="hve_plate" type="text"></label>' +
          '<label class="field"><span>VIN (opciono)</span><input id="hve_vin" type="text" placeholder="17-znakovni VIN"></label>' +
          '<div id="hve_err" style="color:#f87171;font-size:.82rem;margin:.4rem 0"></div>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubSaveVehicle()">Sačuvaj izmene</button>' +
        '</div>';
      setTimeout(function () { DR.loadVehicleForEdit(vid); }, 0);
      return html;
    },

    /* ===== HUB SELL — prodaja vozila via AU Core (za hub-sync vozila) ===== */
    hub_sell: function (params) {
      var vid = (params && params.id) || App.activeVehicleId;
      var hubId = params && params.hub_id;
      return Store.get("vehicles", vid).then(function (v) {
        if (!v) return '<div class="card"><p class="empty">Vozilo nije pronađeno.</p></div>';
        App._hubSellVehicleId = vid;
        App._hubSellHubId = hubId;
        var vName = esc(v.make + " " + v.model + (v.year ? " " + v.year : ""));
        return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>🏷️ Prodaj vozilo</h1>' +
          '<p class="sub">' + vName + '</p>' +
          '<div class="card">' +
            '<div class="form-group">' +
              '<label class="label">Cijena (EUR) *</label>' +
              '<input type="number" id="hs_price" class="input" placeholder="npr. 6500" min="1" step="1">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="label">Ime kontakta *</label>' +
              '<input type="text" id="hs_contact_name" class="input" placeholder="Vaše ime">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="label">Telefon *</label>' +
              '<input type="tel" id="hs_contact_phone" class="input" placeholder="+38160...">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="label">Opis (opciono)</label>' +
              '<textarea id="hs_desc" class="input" rows="3" placeholder="Stanje vozila, oprema, historija..."></textarea>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="DR.publishViaHub()">Objavi oglas</button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.cancel"></button>' +
          '</div>';
      });
    },

    /* ===== BROWSE AUTOPIJACA — pretraga vozila na prodaju ===== */
    browse_autopijaca: function () {
      return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>🔍 Vozila na prodaju</h1>' +
        '<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px">' +
          '<div style="display:flex;gap:8px">' +
            '<input type="text" id="ap_make" placeholder="Marka (npr. Golf)" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
            '<input type="text" id="ap_model" placeholder="Model" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<input type="number" id="ap_min_year" placeholder="Od god." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
            '<input type="number" id="ap_max_year" placeholder="Do god." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
            '<input type="number" id="ap_max_price" placeholder="Max €" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.apSearch()">Pretraži</button>' +
        '</div>' +
        '<div id="ap_results" style="margin-top:8px"></div>';
    },

    /* ===== BROWSE AUTODELOVI — pretraga auto delova ===== */
    browse_autodelovi: function () {
      var catOpts = ['', 'motor', 'transmisija', 'kocnice', 'elektrika', 'karoserija', 'gume', 'auspuh', 'klima', 'svetla', 'ostalo'].map(function (c) {
        return '<option value="' + c + '">' + (c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Sve kategorije') + '</option>';
      }).join('');
      return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>🔧 Auto delovi</h1>' +
        '<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px">' +
          '<input type="text" id="ad_q" placeholder="Naziv dela (npr. disk kočnice)" style="padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
          '<div style="display:flex;gap:8px">' +
            '<select id="ad_cat" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' + catOpts + '</select>' +
            '<input type="text" id="ad_make" placeholder="Marka auta" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
          '</div>' +
          '<select id="ad_sort" style="padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit">' +
            '<option value="">Najnoviji</option>' +
            '<option value="price_asc">Cena ↑</option>' +
            '<option value="price_desc">Cena ↓</option>' +
          '</select>' +
          '<button class="btn btn-primary" onclick="DR.adSearch()">Pretraži</button>' +
        '</div>' +
        '<div id="ad_results" style="margin-top:8px"></div>';
    },

    /* ===== TRADE SUMMARY — godišnji sažetak preprodaje ===== */
    trade_summary: function () {
      return Promise.all([Store.all("vehicles"), Store.all("events")]).then(function (res) {
        var vehicles = res[0], allEvents = res[1];
        var tradeVehs = vehicles.filter(function (v) { return v.trade_mode; });
        if (!tradeVehs.length) {
          return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>📊 Trade Dashboard</h1>' +
            '<div class="card"><p class="empty">Nema vozila u trade modu. Uključi trade mod na vozilu da pratiš promet.</p></div>';
        }

        // costs by vehicle id — suma svih troškova (servis/popravka/rashod) u EUR ili RSD
        var costsByVeh = {};
        allEvents.forEach(function (e) {
          if (!e.vehicle_id || !e.cost || !e.cost.total) return;
          if (!costsByVeh[e.vehicle_id]) costsByVeh[e.vehicle_id] = { EUR: 0, RSD: 0 };
          var cur = (e.cost.currency || 'RSD').toUpperCase();
          if (cur === 'EUR') costsByVeh[e.vehicle_id].EUR += parseFloat(e.cost.total) || 0;
          else               costsByVeh[e.vehicle_id].RSD += parseFloat(e.cost.total) || 0;
        });

        var now = new Date();
        var years = [];
        tradeVehs.forEach(function (v) {
          if (v.trade && v.trade.sale && v.trade.sale.date) {
            var y = v.trade.sale.date.slice(0, 4);
            if (years.indexOf(y) === -1) years.push(y);
          }
        });
        if (!years.length) years.push(String(now.getFullYear()));
        years.sort().reverse();

        var activeYear = App._tradeSummaryYear || years[0];
        App._tradeSummaryYear = activeYear;

        var sold   = tradeVehs.filter(function (v) { return v.status === 'sold' && v.trade && v.trade.sale && v.trade.sale.date && v.trade.sale.date.startsWith(activeYear); });
        var active = tradeVehs.filter(function (v) { return v.status !== 'sold' && v.status !== 'archived' && v.status !== 'totaled'; });

        var totalProfit = 0, totalRevenue = 0;
        var profitData  = [];

        sold.forEach(function (v) {
          var buyPrice  = parseFloat((v.trade && v.trade.purchase && v.trade.purchase.price) || 0);
          var sellPrice = parseFloat((v.trade && v.trade.sale && v.trade.sale.price) || 0);
          var cur = ((v.trade && v.trade.sale && v.trade.sale.currency) || 'EUR').toUpperCase();
          var vCosts = costsByVeh[v.id] || { EUR: 0, RSD: 0 };
          // costs u istoj valuti kao prodaja
          var costsInCur = cur === 'EUR' ? vCosts.EUR : vCosts.RSD;
          var days = 0;
          if (v.trade && v.trade.purchase && v.trade.purchase.date && v.trade.sale.date) {
            days = Math.round((new Date(v.trade.sale.date) - new Date(v.trade.purchase.date)) / 86400000);
          }
          var profit = sellPrice - buyPrice - costsInCur;
          totalProfit  += profit;
          totalRevenue += sellPrice;
          profitData.push({ v: v, profit: profit, revenue: sellPrice, costs: costsInCur, cur: cur, days: days });
        });

        var sortedProfit = profitData.slice().sort(function (a, b) { return b.profit - a.profit; });
        var best  = sortedProfit[0] || null;
        var worst = sortedProfit.length > 1 ? sortedProfit[sortedProfit.length - 1] : null;
        var avgProfit = sold.length ? Math.round(totalProfit / sold.length) : 0;

        var yearTabs = years.map(function (y) {
          return '<button class="chip' + (y === activeYear ? ' active' : '') + '" onclick="App._tradeSummaryYear=\'' + y + '\';DR.go(\'trade_summary\')">' + y + '</button>';
        }).join('');

        function profitBadge(p, cur) {
          var sign = p >= 0 ? '+' : '';
          var col  = p >= 0 ? '#10b981' : '#ef4444';
          return '<b style="color:' + col + '">' + sign + Math.round(p).toLocaleString('sr-RS') + ' ' + cur + '</b>';
        }

        var soldRows = sortedProfit.map(function (d) {
          var costsLine = d.costs > 0 ? '<span class="muted"> • troškovi: ' + Math.round(d.costs).toLocaleString('sr-RS') + ' ' + d.cur + '</span>' : '';
          return '<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;gap:8px">' +
            '<div style="flex:1;min-width:0">' +
              '<b style="font-size:.92rem">' + esc(d.v.make + ' ' + d.v.model + (d.v.year ? ' ' + d.v.year : '')) + '</b>' +
              '<div class="muted" style="font-size:.78rem">' +
                (d.days ? d.days + ' dana' : '') + costsLine +
              '</div>' +
            '</div>' +
            profitBadge(d.profit, d.cur) +
          '</div>';
        }).join('') || '<div class="card"><p class="empty">Nema prodatih vozila u ' + activeYear + '.</p></div>';

        var activeCards = active.map(function (v) {
          var buyPrice = parseFloat((v.trade && v.trade.purchase && v.trade.purchase.price) || 0);
          var cur = ((v.trade && v.trade.purchase && v.trade.purchase.currency) || 'EUR').toUpperCase();
          var vCosts = costsByVeh[v.id] || { EUR: 0, RSD: 0 };
          var costsInCur = cur === 'EUR' ? vCosts.EUR : vCosts.RSD;
          var invested = buyPrice + costsInCur;
          return '<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px">' +
            '<div>' +
              '<b style="font-size:.92rem">' + esc(v.make + ' ' + v.model + (v.year ? ' ' + v.year : '')) + '</b>' +
              '<div class="muted" style="font-size:.78rem">' + (v.status || 'aktivno') +
                (costsInCur > 0 ? ' • troškovi: ' + Math.round(costsInCur).toLocaleString('sr-RS') + ' ' + cur : '') +
              '</div>' +
            '</div>' +
            (invested ? '<span class="muted">' + Math.round(invested).toLocaleString('sr-RS') + ' ' + cur + '</span>' : '') +
          '</div>';
        }).join('') || '<p class="muted" style="padding:8px 0">Nema aktivnih vozila u obrtu.</p>';

        var profColor = totalProfit >= 0 ? '#10b981' : '#ef4444';
        var profSign  = totalProfit >= 0 ? '+' : '';
        var avgColor  = avgProfit >= 0 ? '#10b981' : '#ef4444';
        var avgSign   = avgProfit >= 0 ? '+' : '';
        // currency label za summary — ako postoji samo jedna valuta koristi je
        var currencies = [...new Set(profitData.map(function(d){return d.cur;}))];
        var curLabel = currencies.length === 1 ? currencies[0] : 'mešano';

        return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>📊 Trade Dashboard</h1>' +
          '<div class="vehswitch">' + yearTabs + '</div>' +
          '<div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;padding:16px">' +
            '<div>' +
              '<div style="font-size:1.5rem;font-weight:700;color:' + profColor + '">' + profSign + Math.round(totalProfit).toLocaleString('sr-RS') + '</div>' +
              '<div class="muted" style="font-size:.72rem">Neto profit ' + activeYear + (curLabel !== 'mešano' ? ' (' + curLabel + ')' : '') + '</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:1.5rem;font-weight:700">' + sold.length + '</div>' +
              '<div class="muted" style="font-size:.72rem">Prodato vozila</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:1.5rem;font-weight:700">' + active.length + '</div>' +
              '<div class="muted" style="font-size:.72rem">U obrtu</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:1.5rem;font-weight:700;color:' + avgColor + '">' + (sold.length ? avgSign + Math.round(avgProfit).toLocaleString('sr-RS') : '—') + '</div>' +
              '<div class="muted" style="font-size:.72rem">Prosečan profit</div>' +
            '</div>' +
            (best ? '<div style="grid-column:1">' +
              '<div style="font-size:.9rem;font-weight:600;color:#10b981">' + esc(best.v.make + ' ' + best.v.model) + '</div>' +
              '<div class="muted" style="font-size:.72rem">Najuspešnije</div>' +
            '</div>' : '') +
            (worst ? '<div>' +
              '<div style="font-size:.9rem;font-weight:600;color:#ef4444">' + esc(worst.v.make + ' ' + worst.v.model) + '</div>' +
              '<div class="muted" style="font-size:.72rem">Najlošije</div>' +
            '</div>' : '') +
          '</div>' +
          '<h2 style="margin:.8rem 0 .5rem;font-size:.93rem">Prodato u ' + activeYear + '</h2>' + soldRows +
          (active.length ? '<h2 style="margin:.8rem 0 .5rem;font-size:.93rem">Aktivno u obrtu</h2>' + activeCards : '');
      });
    },

    /* ===== HUB IMPORT — vlasnik dobija link od mehaničara ===== */
    hub_import: function (params) {
      var token  = params && params.token;
      var hubUrl = params && params.hub_url;
      if (!token || !hubUrl || !window.AUCore) {
        return '<div class="card"><p class="empty">Nevažeći link.</p>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button></div>';
      }
      return AUCore.fetchShare(hubUrl, token).then(function (data) {
        var ev  = data.event  || {};
        var veh = data.vehicle || {};
        var mech = data.mechanic_name || 'Servis';
        var items = (ev.items || []).map(function (it) {
          return '<li>' + esc(it.qty) + ' × ' + esc(it.name) + '</li>';
        }).join('');
        var nextStr = ev.next_service
          ? (ev.next_service.km ? ev.next_service.km + ' km, ' : '') + (ev.next_service.date || '')
          : '';
        App._hubImportData = data;
        return '' +
          '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
          '<h1>📲 Uvoz od mehaničara</h1>' +
          '<p class="sub">Od: ' + esc(mech) + '</p>' +
          '<div class="card">' +
            '<b>' + esc(ev.title || t("d.type_" + (ev.type || "service"))) + '</b>' +
            '<p class="muted">' + esc(ev.date || '') + (ev.mileage_km != null ? ' • ' + esc(ev.mileage_km) + ' km' : '') + '</p>' +
            (ev.description ? '<p>' + esc(ev.description) + '</p>' : '') +
            (items ? '<ul>' + items + '</ul>' : '') +
            (nextStr ? '<p><b>' + t("d.last_service") + ':</b> ' + esc(nextStr) + '</p>' : '') +
          '</div>' +
          (veh.make ? '<div class="card"><b>' + esc(veh.make + ' ' + veh.model) + '</b>' +
            '<p class="muted">' + esc(veh.plate || '') + (veh.year ? ' • ' + veh.year : '') +
              (veh.vin ? ' • VIN: ' + esc(veh.vin) : '') + '</p></div>' : '') +
          '<div class="card"><p class="empty" style="font-size:.85rem">Cene nisu prikazane — mehaničar ih nije delio.</p></div>' +
          '<div class="card" style="display:flex;align-items:center;gap:12px;padding:14px 16px">' +
            '<input type="checkbox" id="pm_public" checked style="width:20px;height:20px;accent-color:var(--accent);flex-shrink:0">' +
            '<label for="pm_public" style="font-size:.9rem;line-height:1.3;cursor:pointer">' +
              '<b>Javno u dosijeu</b><br>' +
              '<span style="color:var(--muted);font-size:.8rem">Ovaj zapis se prikazuje kupcima na Autopijaci kad prodaješ vozilo</span>' +
            '</label>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="DR.importHubRecord()" data-i18n="backup.import"></button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.cancel"></button>';
      }).catch(function (err) {
        return '<div class="card"><p class="empty">Greška: ' + esc(err.message) + '</p>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button></div>';
      });
    },

    /* ===== JAVNI DOSIJE / QR ID CARD ===== */
    public_ids: function () {
      if (!hubConnected()) {
        return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
          '<h1>Javni dosije</h1>' +
          '<div class="card"><p class="empty">Poveži se sa AU Core-om u podešavanjima da bi generisao javni dosije.</p></div>';
      }
      var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
      var syncedLocalIds = Object.keys(vehicleMap);
      if (!syncedLocalIds.length) {
        return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
          '<h1>Javni dosije</h1>' +
          '<div class="card"><p class="empty">Nema sinhronizovanih vozila. Najpre uradi Sync u AU Core sekciji.</p>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubSync();DR.go(\'public_ids\')">Sync sada</button></div>';
      }
      return Store.all("vehicles").then(function (vehicles) {
        return AUCore.getPlatformUrl().then(function (hubUrl) {
          var cardPromises = syncedLocalIds.map(function (lid) {
            var serverId = vehicleMap[lid];
            var v = vehicles.find(function (x) { return x.id === lid; });
            if (!v) return Promise.resolve('');
            var publicUrl = hubUrl ? hubUrl.replace(/\/$/, '') + '/public/v/' + serverId : '';
            var qrPromise = (publicUrl && window.QRCode)
              ? window.QRCode.toDataURL(publicUrl, { width: 160, margin: 1 })
              : Promise.resolve(publicUrl ? publicUrl + '/qr' : '');
            return qrPromise.then(function (qrSrc) {
              var isDataUrl = qrSrc && qrSrc.startsWith('data:');
              return '<div class="card mt16">' +
                '<b>' + esc(v.make + ' ' + v.model) + (v.year ? ' ' + v.year : '') + '</b>' +
                (v.plate ? '<p class="muted" style="font-size:.82rem">' + esc(v.plate) + '</p>' : '') +
                (qrSrc ? '<div style="text-align:center;margin:12px 0">' +
                  '<img src="' + (isDataUrl ? qrSrc : esc(qrSrc)) + '" alt="QR" style="width:160px;height:160px;border-radius:8px;background:#fff;padding:8px">' +
                  '</div>' : '') +
                (publicUrl ? '<p style="font-size:.72rem;color:#64748b;word-break:break-all;margin-bottom:8px">' + esc(publicUrl) + '</p>' +
                  '<button class="btn btn-secondary" onclick="DR.copyPublicUrl(\'' + esc(publicUrl) + '\')">Kopiraj link</button>' : '') +
                '</div>';
            });
          });
          return Promise.all(cardPromises).then(function (cards) {
            return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
              '<h1>Javni dosije</h1>' +
              '<p style="color:#64748b;font-size:.83rem;padding:0 0 4px">QR kod i link za kupca — servisna istorija bez naloga.</p>' +
              cards.join('');
          });
        });
      });
    },

    /* ===== HUB NOTES — beleške za vozilo ===== */
    hub_notes: function (params) {
      var sid = (params && params.sid) ? Number(params.sid) : 0;
      var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>📝 Beleške</h1>' +
        '<div class="card" style="padding:12px">' +
          '<label class="field"><span>Nova beleška</span>' +
            '<textarea id="hub_note_input" rows="3" style="resize:none;width:100%;box-sizing:border-box" placeholder="Upiši napomenu za mehaničara..."></textarea>' +
          '</label>' +
          '<select id="hub_note_vis" style="margin:.4rem 0;padding:6px;background:#1a2a3a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;width:100%">' +
            '<option value="owner">Samo ja vidim</option>' +
            '<option value="shared">Vidljivo mehaničaru</option>' +
          '</select>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubAddNote(' + sid + ')">Dodaj</button>' +
        '</div>' +
        '<div id="notes_body"><p class="muted" style="text-align:center;padding:40px">Učitavam...</p></div>';
      setTimeout(function () { DR.loadNotes(sid); }, 0);
      return html;
    },

    /* ===== HUB FEED — mehaničarevi zapisi ===== */
    hub_feed: function () {
      var lastPull = localStorage.getItem("aucore_last_pull");
      var html = '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>📥 Mehaničarevi zapisi</h1>' +
        '<p class="muted" style="font-size:.82rem;margin:.2rem 0 .8rem">Događaji koje je mehaničar dodao u hub.' +
          (lastPull ? ' Poslednje preuzimanje: ' + esc(lastPull.slice(0, 16).replace('T', ' ')) + '.' : '') + '</p>' +
        '<div id="feed_body"><p class="muted" style="text-align:center;padding:40px">Učitavam...</p></div>' +
        '<button class="btn btn-secondary mt8" onclick="DR.loadHubFeed(true)">🔄 Prikaži sve</button>';
      setTimeout(function () { DR.loadHubFeed(false); }, 0);
      return html;
    },

    /* ===== TIMELINE — vizuelni pregled događaja ===== */
    timeline: function (params) {
      var vid = (params && params.vehicle_id) ? params.vehicle_id : App.vehicleId;
      var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>📅 Timeline</h1>' +
        '<div id="tl_body"><p class="muted" style="text-align:center;padding:40px">Učitavam...</p></div>';
      setTimeout(function () { DR.loadTimeline(vid); }, 0);
      return html;
    },

    /* ===== ŠTA PROVERITI PRI KUPOVINI ===== */
    car_check: function () {
      var sections = [
        { title: "📄 Dokumenta", items: [
          "Saobraćajna dozvola — ime vlasnika, VIN, godište",
          "Knjižica vozila (servisna historija)",
          "Polisa osiguranja — do kad važi",
          "Registracija — važi li, do kad",
          "Ukoliko kredit: banka mora odobriti prodaju",
          "Nema upisane zabrane otuđenja (proveri MUP evidenciju)",
        ]},
        { title: "🔍 Karoserija", items: [
          "Proverite sve boje pod različitim kutovima (razlike = farbanje)",
          "Fugen (razmaci između vrata/haube/gepeka) — jednaki sa svih strana",
          "Tragovi rđe ispod gumenih lajsni i ispod vrata",
          "Stakla — pukotine, mjehurovi, neoriginalni UR kôd",
          "Hvatajte magneteom duž pragova i krila (špahtla ne privlači magnet)",
        ]},
        { title: "🔧 Motor i pogon", items: [
          "Nivo ulja — boja (crno=staro, mlečno=voda u ulju!)",
          "Nivo rashladne tečnosti — boja i nivo",
          "Tragovi curenja ispod automobila posle 10 min stajanja",
          "Dim iz auspuha: beli (voda) / plavi (ulje) / crni (benzin) = problem",
          "Motor hladnom — startovati, slušati klopotanje i šumove",
          "Preveriti broj motora — mora odgovarati saobraćajnoj",
        ]},
        { title: "🚗 Probna vožnja", items: [
          "Kočnice — auto ne sme da vuče u stranu",
          "Volan — ne sme da vibrira ili vuče",
          "Menjač — sve brzine ulaze glatko",
          "Sva svetla, grijanje, klima, elektropodizači",
          "ABS lampica, check engine — ništa ne sme svetleti",
          "Test kočenja na 60 km/h — ravno kočenje",
        ]},
        { title: "💰 Cena i tržište", items: [
          "Uporedi sa Polovniautomobili.rs — ista godišnja/km/oprema",
          "Istorija cene — oglasi na KP/PA duže od 30 dana = pregovaraj",
          "Kalkuliraj: reg + servis odmah + prvih 6 meseci troškova",
          "Ne plaćaj avans bez overe kod notara",
          "Kupoprodajni ugovor — obavezno u 2 primerka, overiti potpise",
        ]},
      ];
      var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>🔎 Šta proveriti pri kupovini</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Checklist za pregled polovnog automobila. Štiklirati pre plaćanja.</p>';

      sections.forEach(function (sec) {
        html += '<div class="card" style="margin-bottom:.6rem">' +
          '<h2 style="margin:0 0 10px;font-size:1rem">' + sec.title + '</h2>';
        sec.items.forEach(function (item, i) {
          var id = 'chk_' + sec.title.slice(2, 5).replace(/\s/g, '') + i;
          html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04)">' +
            '<input type="checkbox" id="' + id + '" style="margin-top:3px;min-width:16px;accent-color:#5c6bc0">' +
            '<span style="font-size:.88rem;line-height:1.4">' + item + '</span>' +
          '</label>';
        });
        html += '</div>';
      });

      html += '<div class="card" style="margin-bottom:.6rem">' +
        '<div style="font-size:.83rem;color:#64748b;margin-bottom:8px">Opcionalno za PDF</div>' +
        '<input id="cc_vehicle" type="text" placeholder="Vozilo (npr. VW Golf 2012, 1.6 TDI)" style="width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.15);border-radius:6px;background:#1e293b;color:#e2e8f0;font-size:.85rem;box-sizing:border-box;margin-bottom:8px">' +
        '<input id="cc_note" type="text" placeholder="Napomena (npr. tablica, mesto pregleda)" style="width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.15);border-radius:6px;background:#1e293b;color:#e2e8f0;font-size:.85rem;box-sizing:border-box">' +
        '</div>' +
        '<button class="btn btn-secondary" onclick="DR.exportCarCheckPdf()" style="font-size:.85rem">📄 Izvezi PDF</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.resetCarCheck()" style="font-size:.85rem">↩ Resetuj sve</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'vin_check\')" style="font-size:.85rem">🔢 Provjeri VIN broj</button>';
      return html;
    },

    /* ===== FUEL LOG ===== */
    fuel_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var fills = events
            .filter(function (e) { return e.type === "expense_fuel" && e.fuel_liters; })
            .sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'expenses\')" data-i18n="common.back"></button>' +
            '<h1>⛽ Evidencija goriva</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          if (!fills.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih punjenja. Dodaj trošak goriva i unesi litare.</p></div>';
            html += '<button class="btn btn-secondary mt8" onclick="DR.go(\'expense_form\')" style="font-size:.85rem">+ Dodaj punjenje</button>';
            return html;
          }

          // Statistike
          var totalLiters = 0, totalCostRSD = 0, totalCostEUR = 0, totalKm = 0;
          fills.forEach(function (e) { totalLiters += (parseFloat(e.fuel_liters) || 0); });
          fills.forEach(function (e) {
            if (e.cost && e.cost.total) {
              if ((e.cost.currency || "RSD").toUpperCase() === "EUR") totalCostEUR += parseFloat(e.cost.total) || 0;
              else totalCostRSD += parseFloat(e.cost.total) || 0;
            }
          });
          // L/100km — od prve do poslednje stavke sa km podacima
          var withKm = fills.filter(function (e) { return e.mileage_km; });
          var avgCons = null;
          if (withKm.length >= 2) {
            var firstKm = withKm[0].mileage_km, lastKm = withKm[withKm.length - 1].mileage_km;
            var litersInRange = 0;
            for (var i = 1; i < withKm.length; i++) litersInRange += parseFloat(withKm[i].fuel_liters) || 0;
            var dist = lastKm - firstKm;
            if (dist > 0) avgCons = (litersInRange / dist * 100);
          }

          var costStr = [];
          if (totalCostRSD) costStr.push(Math.round(totalCostRSD).toLocaleString("sr") + " RSD");
          if (totalCostEUR) costStr.push(totalCostEUR.toFixed(2) + " EUR");

          html += '<div class="card" style="margin-bottom:.6rem;background:#1a2010">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
              '<div><div style="color:#64748b;font-size:.75rem">Ukupno litara</div>' +
                '<div style="font-weight:700;font-size:1.1rem;color:#4ade80">' + totalLiters.toFixed(1) + ' L</div></div>' +
              '<div><div style="color:#64748b;font-size:.75rem">Avg potrošnja</div>' +
                '<div style="font-weight:700;font-size:1.1rem;color:#fbbf24">' + (avgCons ? avgCons.toFixed(1) + ' L/100km' : '—') + '</div></div>' +
              '<div style="grid-column:span 2"><div style="color:#64748b;font-size:.75rem">Ukupno potrošeno</div>' +
                '<div style="font-weight:600;font-size:.95rem">' + (costStr.join(" + ") || "bez cene") + '</div></div>' +
            '</div>' +
          '</div>';

          // Lista punjenja (od najnovijeg)
          var fillsDesc = fills.slice().reverse();
          fillsDesc.forEach(function (e, idx) {
            var origIdx = fills.length - 1 - idx;
            var cons = null;
            if (e.mileage_km && origIdx > 0) {
              var prev = null;
              for (var i = origIdx - 1; i >= 0; i--) {
                if (fills[i].mileage_km) { prev = fills[i]; break; }
              }
              if (prev) {
                var dist = e.mileage_km - prev.mileage_km;
                if (dist > 0) cons = (parseFloat(e.fuel_liters) / dist * 100);
              }
            }
            var costLine = e.cost && e.cost.total
              ? Math.round(e.cost.total).toLocaleString("sr") + " " + (e.cost.currency || "RSD")
              : "";
            var consColor = cons ? (cons < 7 ? "#4ade80" : cons < 10 ? "#fbbf24" : "#f87171") : "#64748b";
            html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
              '<div style="display:flex;justify-content:space-between;align-items:center">' +
                '<div>' +
                  '<span style="font-weight:600">' + parseFloat(e.fuel_liters).toFixed(1) + ' L</span>' +
                  (e.mileage_km ? '<span style="color:#64748b;font-size:.8rem;margin-left:8px">@ ' + e.mileage_km.toLocaleString("sr") + ' km</span>' : '') +
                '</div>' +
                '<span style="font-weight:700;font-size:.95rem;color:' + consColor + '">' +
                  (cons ? cons.toFixed(1) + ' L/100km' : '') +
                '</span>' +
              '</div>' +
              '<div style="color:#64748b;font-size:.78rem;margin-top:4px;display:flex;gap:10px">' +
                '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                (costLine ? '<span>' + costLine + '</span>' : '') +
                (e.fuel_ppl ? '<span>' + parseFloat(e.fuel_ppl).toFixed(1) + ' RSD/l</span>' : '') +
              '</div>' +
            '</div>';
          });

          html += '<button class="btn btn-secondary mt8" onclick="DR.go(\'expense_form\')" style="font-size:.85rem">+ Dodaj punjenje</button>';
          return html;
        });
    },

    /* ===== COOLANT TRACKER ===== */
    coolant_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var coolantEvents = events
            .filter(function (e) { return e.type === "coolant_service"; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>🌡️ Istorija rashladne tečnosti</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          var latest = coolantEvents[0];
          if (latest) {
            var cd = latest.coolant_data || {};
            var installDate = (latest.date || "").slice(0, 10);
            var ageMs = installDate ? (new Date() - new Date(installDate)) : null;
            var ageMonths = ageMs ? Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.5)) : null;
            var interval = (cd.interval_years || 3) * 12; // meseci, default 3 god
            var pct = ageMonths != null ? ageMonths / interval : null;
            var ageColor = pct == null ? "#94a3b8" : pct < 0.7 ? "#4ade80" : pct < 0.9 ? "#fbbf24" : "#f87171";
            var ageStr = ageMonths != null
              ? (ageMonths >= 12 ? Math.floor(ageMonths / 12) + " god. " + (ageMonths % 12 ? ageMonths % 12 + " mes." : "") : ageMonths + " mes.")
              : "—";

            html += '<div class="card" style="margin-bottom:.6rem;background:#101520">' +
              '<div style="font-weight:600;font-size:.88rem;margin-bottom:8px">Poslednja zamena</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                '<div><div style="color:#64748b;font-size:.75rem">Starost</div>' +
                  '<div style="font-weight:700;font-size:1.1rem;color:' + ageColor + '">' + ageStr + '</div></div>' +
                '<div><div style="color:#64748b;font-size:.75rem">Interval</div>' +
                  '<div style="font-weight:600;font-size:.95rem">' + (cd.interval_years || 3) + ' god.</div></div>' +
                ((cd.coolant_type || cd.concentration_pct != null) ?
                  '<div style="grid-column:span 2"><div style="color:#64748b;font-size:.75rem">Tečnost</div>' +
                    '<div style="font-size:.9rem">' +
                      [cd.coolant_type, cd.concentration_pct != null ? cd.concentration_pct + '% konc.' : ''].filter(Boolean).join(' • ') +
                    '</div></div>' : '') +
                ((cd.thermostat_changed || cd.hoses_checked) ?
                  '<div style="grid-column:span 2;font-size:.78rem;color:#94a3b8">' +
                    [cd.thermostat_changed ? '✓ termostat' : '', cd.hoses_checked ? '✓ cevi pregledane' : ''].filter(Boolean).join(' • ') +
                  '</div>' : '') +
              '</div>' +
              (pct != null && pct >= 0.9
                ? '<div style="background:#172554;color:#93c5fd;padding:6px 8px;border-radius:6px;font-size:.8rem;margin-top:8px">⚠️ Blizu roka zamene rashladne tečnosti</div>' : '') +
              '<div style="color:#64748b;font-size:.78rem;margin-top:6px">' + installDate +
                (latest.mileage_km ? ' • ' + latest.mileage_km.toLocaleString("sr") + ' km' : '') + '</div>' +
            '</div>';
          }

          if (!coolantEvents.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih zamena rashladne tečnosti. Dodaj događaj tipa "Rashladna tečnost".</p></div>';
          } else {
            html += '<div style="font-weight:600;font-size:.85rem;margin:12px 0 6px">Istorija zamena</div>';
            coolantEvents.forEach(function (e) {
              var cd = e.coolant_data || {};
              html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
                  '<div>' +
                    (cd.coolant_type ? '<span style="font-weight:600">' + esc(cd.coolant_type) + '</span> ' : '<span style="color:#64748b">Rashladna tečnost</span> ') +
                    (cd.concentration_pct != null ? '<span style="color:#94a3b8;font-size:.82rem">' + cd.concentration_pct + '%</span>' : '') +
                    ((cd.thermostat_changed || cd.hoses_checked)
                      ? '<div style="color:#94a3b8;font-size:.76rem;margin-top:2px">' +
                          [cd.thermostat_changed ? '✓ termostat' : '', cd.hoses_checked ? '✓ cevi' : ''].filter(Boolean).join(' • ') +
                        '</div>' : '') +
                  '</div>' +
                  (e.mileage_km ? '<span style="color:#64748b;font-size:.8rem">' + e.mileage_km.toLocaleString("sr") + ' km</span>' : '') +
                '</div>' +
                '<div style="color:#64748b;font-size:.78rem;margin-top:3px;display:flex;gap:10px">' +
                  '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                  (e.shop_name ? '<span>' + esc(e.shop_name) + '</span>' : '') +
                  (e.cost && e.cost.total ? '<span>' + Math.round(e.cost.total).toLocaleString("sr") + ' ' + (e.cost.currency || "RSD") + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vehId) + '\',false)" style="font-size:.85rem">+ Dodaj zamenu rashladne tečnosti</button>';
          return html;
        });
    },

    /* ===== BELT / CHAIN TRACKER ===== */
    belt_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var beltEvents = events
            .filter(function (e) { return e.type === "belt_service"; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

          var typeLabel = { 'timing-belt': 'Zupčasti kaiš', 'timing-chain': 'Lanac razvoda', 'accessory-belt': 'Klinasti kaiš' };

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>⚙️ Istorija kaišа / lanca</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          var latest = beltEvents[0];
          if (latest) {
            var bd = latest.belt_data || {};
            // Km od zamene
            var installDate = (latest.date || "").slice(0, 10);
            var allKmEvents = events.filter(function (e) { return e.mileage_km && (e.date || "") >= installDate; });
            var maxKm = allKmEvents.reduce(function (m, e) { return Math.max(m, e.mileage_km); }, latest.mileage_km || 0);
            var kmSince = latest.mileage_km && maxKm > latest.mileage_km ? maxKm - latest.mileage_km : null;
            var interval = bd.interval_km || 90000; // default 90k za timing belt
            var pct = kmSince != null ? kmSince / interval : null;
            var kmColor = pct == null ? "#94a3b8" : pct < 0.7 ? "#4ade80" : pct < 0.9 ? "#fbbf24" : "#f87171";
            var warn = pct != null && pct >= 0.9;

            html += '<div class="card" style="margin-bottom:.6rem;background:#101a10">' +
              '<div style="font-weight:600;font-size:.88rem;margin-bottom:8px">' +
                (bd.belt_type ? esc(typeLabel[bd.belt_type] || bd.belt_type) : 'Poslednja zamena') +
              '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                (kmSince != null ? '<div><div style="color:#64748b;font-size:.75rem">Km od zamene</div>' +
                  '<div style="font-weight:700;font-size:1.1rem;color:' + kmColor + '">' + kmSince.toLocaleString("sr") + ' km</div></div>' : '<div></div>') +
                '<div><div style="color:#64748b;font-size:.75rem">Interval</div>' +
                  '<div style="font-weight:600;font-size:.95rem">' + interval.toLocaleString("sr") + ' km</div></div>' +
                ((bd.water_pump_changed || bd.tensioner_changed || bd.roller_changed) ?
                  '<div style="grid-column:span 2;font-size:.78rem;color:#94a3b8">' +
                    [bd.water_pump_changed ? '✓ vodena pumpa' : '',
                     bd.tensioner_changed  ? '✓ zatezač'      : '',
                     bd.roller_changed     ? '✓ remenica'     : ''].filter(Boolean).join(' • ') +
                  '</div>' : '') +
              '</div>' +
              (warn ? '<div style="background:#14532d;color:#86efac;padding:6px 8px;border-radius:6px;font-size:.8rem;margin-top:8px">⚠️ Blizu intervala zamene — planirati servis</div>' : '') +
              '<div style="color:#64748b;font-size:.78rem;margin-top:6px">' + installDate +
                (latest.mileage_km ? ' • ' + latest.mileage_km.toLocaleString("sr") + ' km' : '') + '</div>' +
            '</div>';
          }

          if (!beltEvents.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih zamena kaišа/lanca. Dodaj događaj tipa "Kaiš / lanac".</p></div>';
          } else {
            html += '<div style="font-weight:600;font-size:.85rem;margin:12px 0 6px">Istorija zamena</div>';
            beltEvents.forEach(function (e) {
              var bd = e.belt_data || {};
              html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
                  '<div>' +
                    '<span style="font-weight:600">' + esc(typeLabel[bd.belt_type] || bd.belt_type || 'Zamena') + '</span>' +
                    (bd.interval_km ? '<span style="color:#94a3b8;font-size:.8rem;margin-left:6px">interval: ' + bd.interval_km.toLocaleString("sr") + ' km</span>' : '') +
                    ((bd.water_pump_changed || bd.tensioner_changed || bd.roller_changed)
                      ? '<div style="color:#94a3b8;font-size:.76rem;margin-top:2px">' +
                          [bd.water_pump_changed ? '✓ vodena pumpa' : '',
                           bd.tensioner_changed  ? '✓ zatezač'      : '',
                           bd.roller_changed     ? '✓ remenica'     : ''].filter(Boolean).join(' • ') +
                        '</div>' : '') +
                  '</div>' +
                  (e.mileage_km ? '<span style="color:#64748b;font-size:.8rem">' + e.mileage_km.toLocaleString("sr") + ' km</span>' : '') +
                '</div>' +
                '<div style="color:#64748b;font-size:.78rem;margin-top:3px;display:flex;gap:10px">' +
                  '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                  (e.shop_name ? '<span>' + esc(e.shop_name) + '</span>' : '') +
                  (e.cost && e.cost.total ? '<span>' + Math.round(e.cost.total).toLocaleString("sr") + ' ' + (e.cost.currency || "RSD") + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vehId) + '\',false)" style="font-size:.85rem">+ Dodaj zamenu kaišа/lanca</button>';
          return html;
        });
    },

    /* ===== BRAKE TRACKER ===== */
    brake_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var brakeEvents = events
            .filter(function (e) { return e.type === "brake_service"; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>🛑 Istorija kočnica</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          // Pločice — color code: ≥5mm zeleno, ≥3mm žuto, <3mm crveno
          function padColor(mm) {
            return mm == null ? "#94a3b8" : mm >= 5 ? "#4ade80" : mm >= 3 ? "#fbbf24" : "#f87171";
          }
          function padWarn(mm) { return mm != null && mm < 3; }

          var latest = brakeEvents[0];
          if (latest) {
            var bd = latest.brake_data || {};
            var warnFront = padWarn(bd.front_pads_mm), warnRear = padWarn(bd.rear_pads_mm);
            html += '<div class="card" style="margin-bottom:.6rem;background:#1a1010">' +
              '<div style="font-weight:600;font-size:.88rem;margin-bottom:8px">Poslednji servis kočnica</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                (bd.front_pads_mm != null ? '<div><div style="color:#64748b;font-size:.75rem">Pločice napred</div>' +
                  '<div style="font-weight:700;font-size:1.1rem;color:' + padColor(bd.front_pads_mm) + '">' + bd.front_pads_mm + ' mm</div></div>' : '<div></div>') +
                (bd.rear_pads_mm != null ? '<div><div style="color:#64748b;font-size:.75rem">Pločice nazad</div>' +
                  '<div style="font-weight:700;font-size:1.1rem;color:' + padColor(bd.rear_pads_mm) + '">' + bd.rear_pads_mm + ' mm</div></div>' : '<div></div>') +
                ((bd.front_discs_changed || bd.rear_discs_changed || bd.fluid_changed) ?
                  '<div style="grid-column:span 2;font-size:.78rem;color:#94a3b8">' +
                    [bd.front_discs_changed ? '✓ diskovi napred' : '',
                     bd.rear_discs_changed  ? '✓ diskovi nazad'  : '',
                     bd.fluid_changed       ? '✓ kočiona tečnost' : ''].filter(Boolean).join(' • ') +
                  '</div>' : '') +
              '</div>' +
              (warnFront || warnRear
                ? '<div style="background:#7f1d1d;color:#fca5a5;padding:6px 8px;border-radius:6px;font-size:.8rem;margin-top:8px">⚠️ Pločice ispod 3mm — hitna zamena</div>' : '') +
              '<div style="color:#64748b;font-size:.78rem;margin-top:6px">' + (latest.date || "").slice(0, 10) +
                (latest.mileage_km ? ' • ' + latest.mileage_km.toLocaleString("sr") + ' km' : '') + '</div>' +
            '</div>';
          }

          if (!brakeEvents.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih servisa kočnica. Dodaj događaj tipa "Kočnice".</p></div>';
          } else {
            html += '<div style="font-weight:600;font-size:.85rem;margin:12px 0 6px">Istorija</div>';
            brakeEvents.forEach(function (e) {
              var bd = e.brake_data || {};
              html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
                '<div style="display:flex;justify-content:space-between;align-items:center">' +
                  '<div style="display:flex;gap:14px">' +
                    (bd.front_pads_mm != null
                      ? '<span style="font-size:.88rem">⬆ <b style="color:' + padColor(bd.front_pads_mm) + '">' + bd.front_pads_mm + 'mm</b></span>' : '') +
                    (bd.rear_pads_mm != null
                      ? '<span style="font-size:.88rem">⬇ <b style="color:' + padColor(bd.rear_pads_mm) + '">' + bd.rear_pads_mm + 'mm</b></span>' : '') +
                  '</div>' +
                  (e.mileage_km ? '<span style="color:#64748b;font-size:.8rem">' + e.mileage_km.toLocaleString("sr") + ' km</span>' : '') +
                '</div>' +
                ((bd.front_discs_changed || bd.rear_discs_changed || bd.fluid_changed)
                  ? '<div style="color:#94a3b8;font-size:.76rem;margin-top:3px">' +
                      [bd.front_discs_changed ? '✓ diskovi napred' : '',
                       bd.rear_discs_changed  ? '✓ diskovi nazad'  : '',
                       bd.fluid_changed       ? '✓ tečnost' : ''].filter(Boolean).join(' • ') +
                    '</div>' : '') +
                '<div style="color:#64748b;font-size:.78rem;margin-top:3px;display:flex;gap:10px">' +
                  '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                  (e.shop_name ? '<span>' + esc(e.shop_name) + '</span>' : '') +
                  (e.cost && e.cost.total ? '<span>' + Math.round(e.cost.total).toLocaleString("sr") + ' ' + (e.cost.currency || "RSD") + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vehId) + '\',false)" style="font-size:.85rem">+ Dodaj servis kočnica</button>';
          return html;
        });
    },

    /* ===== OIL CHANGE TRACKER ===== */
    oil_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var oilEvents = events
            .filter(function (e) { return e.type === "oil_change"; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>🛢️ Istorija zamene ulja</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          var latest = oilEvents[0];
          if (latest) {
            var od = latest.oil_data || {};
            var installDate = (latest.date || "").slice(0, 10);
            var ageMs = installDate ? (new Date() - new Date(installDate)) : null;
            var ageMonths = ageMs ? Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.5)) : null;

            // Km od poslednje zamene — max km u svim eventima posle tog datuma
            var allKmEvents = events.filter(function (e) { return e.mileage_km && (e.date || "") >= installDate; });
            var maxKm = allKmEvents.reduce(function (m, e) { return Math.max(m, e.mileage_km); }, latest.mileage_km || 0);
            var kmSince = latest.mileage_km && maxKm > latest.mileage_km ? maxKm - latest.mileage_km : null;

            // Tipičan interval: 10.000 km / 12 meseci
            var kmColor = kmSince == null ? "#94a3b8"
              : kmSince < 8000  ? "#4ade80"
              : kmSince < 11000 ? "#fbbf24"
              : "#f87171";
            var moColor = ageMonths == null ? "#94a3b8"
              : ageMonths < 9  ? "#4ade80"
              : ageMonths < 13 ? "#fbbf24"
              : "#f87171";

            html += '<div class="card" style="margin-bottom:.6rem;background:#1a1510">' +
              '<div style="font-weight:600;font-size:.88rem;margin-bottom:8px">Poslednja zamena</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                (kmSince != null ? '<div><div style="color:#64748b;font-size:.75rem">Km od zamene</div>' +
                  '<div style="font-weight:700;font-size:1.1rem;color:' + kmColor + '">' + kmSince.toLocaleString("sr") + ' km</div></div>' : '<div></div>') +
                (ageMonths != null ? '<div><div style="color:#64748b;font-size:.75rem">Meseci od zamene</div>' +
                  '<div style="font-weight:700;font-size:1.1rem;color:' + moColor + '">' + ageMonths + ' mes.</div></div>' : '<div></div>') +
                (od.spec || od.brand ? '<div style="grid-column:span 2"><div style="color:#64748b;font-size:.75rem">Ulje</div>' +
                  '<div style="font-size:.9rem">' + [od.brand, od.spec, od.qty_l ? od.qty_l + ' L' : ''].filter(Boolean).join(' • ') + '</div></div>' : '') +
                ((od.filter_changed || od.air_filter_changed || od.cabin_filter_changed) ?
                  '<div style="grid-column:span 2;font-size:.78rem;color:#94a3b8">' +
                    [od.filter_changed ? '✓ filter ulja' : '', od.air_filter_changed ? '✓ filter vazduha' : '', od.cabin_filter_changed ? '✓ filter kabine' : ''].filter(Boolean).join(' • ') +
                  '</div>' : '') +
              '</div>' +
              ((kmSince != null && kmSince >= 11000) || (ageMonths != null && ageMonths >= 13)
                ? '<div style="background:#7c2d12;color:#fdba74;padding:6px 8px;border-radius:6px;font-size:.8rem;margin-top:8px">⚠️ Preporučena zamena ulja (>10.000 km ili >12 mes.)</div>' : '') +
            '</div>';
          }

          if (!oilEvents.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih zamena ulja. Dodaj događaj tipa "Zamena ulja".</p></div>';
          } else {
            html += '<div style="font-weight:600;font-size:.85rem;margin:12px 0 6px">Istorija zamena</div>';
            oilEvents.forEach(function (e, idx) {
              var od = e.oil_data || {};
              // km interval između ove i sledećeg (starije) zamene
              var nextOlder = oilEvents[idx + 1];
              var interval = (e.mileage_km && nextOlder && nextOlder.mileage_km)
                ? e.mileage_km - nextOlder.mileage_km : null;

              html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
                  '<div>' +
                    (od.brand || od.spec
                      ? '<span style="font-weight:600">' + esc([od.brand, od.spec].filter(Boolean).join(' ')) + '</span>'
                      : '<span style="color:#64748b">Zamena ulja</span>') +
                    (od.qty_l ? '<span style="color:#94a3b8;font-size:.82rem;margin-left:6px">' + od.qty_l + ' L</span>' : '') +
                    ((od.filter_changed || od.air_filter_changed || od.cabin_filter_changed)
                      ? '<div style="color:#94a3b8;font-size:.76rem;margin-top:2px">' +
                          [od.filter_changed ? '✓ filter ulja' : '', od.air_filter_changed ? '✓ filter vazduha' : '', od.cabin_filter_changed ? '✓ filter kabine' : ''].filter(Boolean).join(' • ') +
                        '</div>' : '') +
                  '</div>' +
                  (interval ? '<span style="font-size:.82rem;color:#64748b">' + interval.toLocaleString("sr") + ' km</span>' : '') +
                '</div>' +
                '<div style="color:#64748b;font-size:.78rem;margin-top:4px;display:flex;gap:10px">' +
                  '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                  (e.mileage_km ? '<span>' + e.mileage_km.toLocaleString("sr") + ' km</span>' : '') +
                  (e.shop_name ? '<span>' + esc(e.shop_name) + '</span>' : '') +
                  (e.cost && e.cost.total ? '<span>' + Math.round(e.cost.total).toLocaleString("sr") + ' ' + (e.cost.currency || "RSD") + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vehId) + '\',false)" style="font-size:.85rem">+ Dodaj zamenu ulja</button>';
          return html;
        });
    },

    /* ===== BATTERY TRACKER ===== */
    battery_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var batEvents = events
            .filter(function (e) { return e.type === "battery"; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>🔋 Istorija akumulatora</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          // Aktuelni akumulator — poslednji event
          var latest = batEvents[0];
          if (latest) {
            var bd = latest.battery_data || {};
            var installDate = (latest.date || "").slice(0, 10);
            var ageMs = installDate ? (new Date() - new Date(installDate)) : null;
            var ageMonths = ageMs ? Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.5)) : null;
            var ageYears = ageMonths != null ? (ageMonths / 12) : null;
            // Tipičan vek 3–5 godina; upozorenje posle 3.5 god
            var ageColor = ageYears == null ? "#94a3b8"
              : ageYears < 2 ? "#4ade80"
              : ageYears < 3.5 ? "#fbbf24"
              : "#f87171";
            var ageStr = ageMonths != null
              ? (ageMonths >= 12
                  ? Math.floor(ageMonths / 12) + " god. " + (ageMonths % 12 ? (ageMonths % 12) + " mes." : "")
                  : ageMonths + " mes.")
              : "—";

            // km od ugradnje
            var kmEvents = events.filter(function (e) { return e.mileage_km && e.date >= installDate; });
            var maxKm = kmEvents.reduce(function (m, e) { return Math.max(m, e.mileage_km); }, 0);
            var kmSince = latest.mileage_km && maxKm > latest.mileage_km ? maxKm - latest.mileage_km : null;

            html += '<div class="card" style="margin-bottom:.6rem;background:#1a1a10">' +
              '<div style="font-weight:600;font-size:.88rem;margin-bottom:8px">Aktuelni akumulator</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                '<div><div style="color:#64748b;font-size:.75rem">Starost</div>' +
                  '<div style="font-weight:700;font-size:1.05rem;color:' + ageColor + '">' + ageStr + '</div></div>' +
                (kmSince ? '<div><div style="color:#64748b;font-size:.75rem">km od ugradnje</div>' +
                  '<div style="font-weight:700;font-size:1.05rem">' + kmSince.toLocaleString("sr") + ' km</div></div>' : '<div></div>') +
                (bd.brand || bd.ah ? '<div style="grid-column:span 2"><div style="color:#64748b;font-size:.75rem">Tip</div>' +
                  '<div style="font-size:.9rem">' +
                    [bd.brand, bd.ah ? bd.ah + ' Ah' : '', bd.cca ? bd.cca + ' A' : ''].filter(Boolean).join(' • ') +
                  '</div></div>' : '') +
              '</div>' +
              (ageYears >= 3.5 ? '<div style="background:#7f1d1d;color:#fca5a5;padding:6px 8px;border-radius:6px;font-size:.8rem;margin-top:8px">⚠️ Akumulator stariji od 3.5 god. — preporučena zamena</div>' : '') +
            '</div>';
          }

          if (!batEvents.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih zamena akumulatora. Dodaj događaj tipa "Akumulator".</p></div>';
          } else {
            html += '<div style="font-weight:600;font-size:.85rem;margin:12px 0 6px">Istorija zamena</div>';
            batEvents.forEach(function (e) {
              var bd = e.battery_data || {};
              var condColor = { 'novo': '#4ade80', 'polovan-ispravan': '#fbbf24', 'slab': '#fb923c', 'mrtav': '#f87171' };
              html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
                  '<div>' +
                    (bd.brand ? '<span style="font-weight:600">' + esc(bd.brand) + '</span> ' : '') +
                    ([bd.ah ? bd.ah + ' Ah' : '', bd.cca ? bd.cca + ' A' : ''].filter(Boolean).length
                      ? '<span style="color:#94a3b8;font-size:.82rem">' + [bd.ah ? bd.ah + ' Ah' : '', bd.cca ? bd.cca + ' A' : ''].filter(Boolean).join(' / ') + '</span>' : '') +
                    (e.title ? '<div style="color:#94a3b8;font-size:.8rem">' + esc(e.title) + '</div>' : '') +
                  '</div>' +
                  (bd.condition ? '<span style="font-size:.8rem;color:' + (condColor[bd.condition] || '#94a3b8') + '">' + esc(bd.condition) + '</span>' : '') +
                '</div>' +
                '<div style="color:#64748b;font-size:.78rem;margin-top:4px;display:flex;gap:10px">' +
                  '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                  (e.mileage_km ? '<span>' + e.mileage_km.toLocaleString("sr") + ' km</span>' : '') +
                  (e.shop_name ? '<span>' + esc(e.shop_name) + '</span>' : '') +
                  (e.cost && e.cost.total ? '<span>' + Math.round(e.cost.total).toLocaleString("sr") + ' ' + (e.cost.currency || "RSD") + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vehId) + '\',false)" style="font-size:.85rem">+ Dodaj zamenu akumulatora</button>';
          return html;
        });
    },

    /* ===== TIRE TRACKER ===== */
    tire_log: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          var tires = v.tires || {};
          var tireEvents = events
            .filter(function (e) { return e.type === "tires"; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>🔄 Istorija guma</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          // Aktuelni set iz vehicle.tires
          if (tires.size_front || tires.current_set) {
            html += '<div class="card" style="margin-bottom:.6rem;background:#1a2010">' +
              '<div style="font-weight:600;font-size:.88rem;margin-bottom:6px">Aktuelni set</div>' +
              (tires.current_set ? '<div><b>' + esc(tires.current_set) + '</b></div>' : '') +
              (tires.size_front ? '<div style="color:#64748b;font-size:.82rem">' + esc(tires.size_front) + '</div>' : '') +
            '</div>';
          }

          if (!tireEvents.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih zamena guma. Dodaj događaj tipa "Gume".</p></div>';
          } else {
            // Statistika: ukupno zamena, avg km po setu
            var withKm = tireEvents.filter(function (e) { return e.mileage_km; });
            html += '<div class="card" style="margin-bottom:.6rem;background:#181f2a">' +
              '<div style="display:flex;gap:20px">' +
                '<div><div style="color:#64748b;font-size:.75rem">Zamena ukupno</div>' +
                  '<div style="font-weight:700;font-size:1.1rem">' + tireEvents.length + '</div></div>' +
                (withKm.length >= 2 ? (function () {
                  var intervals = [];
                  for (var i = 0; i < withKm.length - 1; i++) {
                    var diff = withKm[i].mileage_km - withKm[i + 1].mileage_km;
                    if (diff > 0) intervals.push(diff);
                  }
                  if (!intervals.length) return "";
                  var avg = Math.round(intervals.reduce(function (s, x) { return s + x; }, 0) / intervals.length);
                  return '<div><div style="color:#64748b;font-size:.75rem">Avg km/set</div>' +
                    '<div style="font-weight:700;font-size:1.1rem">' + avg.toLocaleString("sr") + '</div></div>';
                })() : '') +
              '</div>' +
            '</div>';

            // Lista zamena
            tireEvents.forEach(function (e) {
              var td = e.tire_data || {};
              var setColor = td.set_name === "zimske" ? "#93c5fd" : td.set_name === "letnje" ? "#fbbf24" : "#94a3b8";
              var treadColor = td.tread_mm != null
                ? (td.tread_mm >= 4 ? "#4ade80" : td.tread_mm >= 2 ? "#fbbf24" : "#f87171")
                : null;

              html += '<div class="card" style="margin-bottom:.4rem;padding:10px 14px">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
                  '<div>' +
                    (td.set_name ? '<span style="font-weight:700;color:' + setColor + '">' + td.set_name.charAt(0).toUpperCase() + td.set_name.slice(1) + '</span> ' : '') +
                    (td.brand ? '<span style="font-size:.85rem">' + esc(td.brand) + '</span>' : '') +
                    (td.size ? '<div style="color:#94a3b8;font-size:.8rem">' + esc(td.size) + '</div>' : '') +
                    (e.title && e.title !== t("d.type_tires") ? '<div style="color:#94a3b8;font-size:.8rem">' + esc(e.title) + '</div>' : '') +
                  '</div>' +
                  '<div style="text-align:right">' +
                    (td.tread_mm != null ? '<div style="font-weight:700;color:' + treadColor + '">' + td.tread_mm + ' mm</div>' : '') +
                    (e.mileage_km ? '<div style="color:#64748b;font-size:.8rem">' + e.mileage_km.toLocaleString("sr") + ' km</div>' : '') +
                  '</div>' +
                '</div>' +
                '<div style="color:#64748b;font-size:.78rem;margin-top:4px;display:flex;gap:10px">' +
                  '<span>' + (e.date || "").slice(0, 10) + '</span>' +
                  (e.shop_name ? '<span>' + esc(e.shop_name) + '</span>' : '') +
                  (e.cost && e.cost.total ? '<span>' + Math.round(e.cost.total).toLocaleString("sr") + ' ' + (e.cost.currency || "RSD") + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vehId) + '\',false)" style="font-size:.85rem">+ Dodaj zamenu guma</button>';
          return html;
        });
    },

    /* ===== TROŠKOVI PO SERVISU ===== */
    mechanic_stats: function (params) {
      var vehId = (params && params.vehicle_id) || App.activeVehicleId;
      return Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          if (!v) return '<div class="card"><p class="empty" data-i18n="d.need_vehicle"></p></div>';

          // Agregacija po servisu/radionici
          var byShop = {};
          events.forEach(function (e) {
            var shop = (e.shop_name && e.shop_name.trim()) ||
                       (e.mechanic_name && e.mechanic_name.trim()) || null;
            if (!shop) return; // preskačemo bez radionce
            if (!byShop[shop]) byShop[shop] = { count: 0, rsd: 0, eur: 0, lastDate: "" };
            byShop[shop].count++;
            if (e.cost && e.cost.total) {
              var amt = parseFloat(e.cost.total) || 0;
              if ((e.cost.currency || "RSD").toUpperCase() === "EUR") byShop[shop].eur += amt;
              else byShop[shop].rsd += amt;
            }
            var d = (e.event_date || e.date || "").slice(0, 10);
            if (d && d > byShop[shop].lastDate) byShop[shop].lastDate = d;
          });

          var shops = Object.keys(byShop);
          // Sortiraj: prvo po ukupnom RSD trosku (EUR×120), pa po broju poseta
          shops.sort(function (a, b) {
            var totA = byShop[a].rsd + byShop[a].eur * 120;
            var totB = byShop[b].rsd + byShop[b].eur * 120;
            return totB - totA;
          });

          var vLabel = esc((v.make || "") + " " + (v.model || "") + (v.plate ? " • " + v.plate : ""));
          var html = '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
            '<h1>🔩 Troškovi po servisu</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 8px">' + vLabel + '</p>';

          if (!shops.length) {
            html += '<div class="card"><p class="empty">Nema evidentiranih servisa. Dodaj "Servis / radionice" pri unosu događaja.</p></div>';
          } else {
            // Ukupan sažetak
            var grandRSD = shops.reduce(function (s, k) { return s + byShop[k].rsd; }, 0);
            var grandEUR = shops.reduce(function (s, k) { return s + byShop[k].eur; }, 0);
            var totStr = [];
            if (grandRSD) totStr.push(grandRSD.toLocaleString("sr") + " RSD");
            if (grandEUR) totStr.push(grandEUR.toLocaleString("sr", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR");
            html += '<div class="card" style="margin-bottom:.6rem;background:#1a2a1a">' +
              '<div style="display:flex;justify-content:space-between;align-items:center">' +
                '<span style="font-weight:600;font-size:.9rem">Ukupno evidentirano</span>' +
                '<span style="font-weight:700;color:#4ade80">' + (totStr.join(" + ") || "0") + '</span>' +
              '</div>' +
              '<div style="color:#64748b;font-size:.8rem;margin-top:4px">' + shops.length + ' ' +
                (shops.length === 1 ? "servis" : shops.length < 5 ? "servisa" : "servisa") + ' • ' +
                events.filter(function (e) { return e.shop_name || e.mechanic_name; }).length + ' poseta' +
              '</div>' +
            '</div>';

            shops.forEach(function (shop) {
              var s = byShop[shop];
              var amtParts = [];
              if (s.rsd) amtParts.push('<b>' + Math.round(s.rsd).toLocaleString("sr") + ' RSD</b>');
              if (s.eur) amtParts.push('<b>' + s.eur.toLocaleString("sr", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR</b>');
              var amtStr = amtParts.join(" + ") || '<span style="color:#64748b">bez iznosa</span>';
              html += '<div class="card" style="margin-bottom:.5rem">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
                  '<span style="font-weight:600;font-size:.9rem;flex:1">' + esc(shop) + '</span>' +
                  '<span style="font-size:.88rem;text-align:right">' + amtStr + '</span>' +
                '</div>' +
                '<div style="color:#64748b;font-size:.78rem;margin-top:5px;display:flex;gap:12px">' +
                  '<span>' + s.count + ' ' + (s.count === 1 ? "poseta" : "poseta") + '</span>' +
                  (s.lastDate ? '<span>Poslednji: ' + s.lastDate + '</span>' : '') +
                '</div>' +
              '</div>';
            });
          }

          html += '<p style="color:#475569;font-size:.78rem;margin-top:12px">Prikazani su samo događaji sa upisanom radionicom. Dodaj radionice u prethodne zapise kroz Istoriju → Izmeni.</p>';
          return html;
        });
    },

    /* ===== VIN VALIDATOR ===== */
    vin_check: function () {
      // WMI baza: prva 3 znaka VIN-a → { make, country }
      var WMI = {
        // Germany
        'WVW':'Volkswagen','WV1':'Volkswagen','WV2':'Volkswagen','WAU':'Audi','WUA':'Audi',
        'WBA':'BMW','WBB':'BMW','WBD':'BMW','WBS':'BMW','WBY':'BMW',
        'WDB':'Mercedes-Benz','WDD':'Mercedes-Benz','WDC':'Mercedes-Benz',
        'W0L':'Opel','W0V':'Opel',
        'WF0':'Ford (Germany)','WFO':'Ford (Germany)',
        'WP0':'Porsche','WP1':'Porsche',
        'TRU':'Audi (Hungary)','TMB':'Škoda','TM9':'Škoda',
        // Czech / Slovakia / Hungary
        'VSS':'SEAT','VSX':'SEAT',
        // France
        'VF1':'Renault','VF2':'Renault','VF3':'Peugeot','VF7':'Citroën','VF6':'Opel (France)',
        'VNK':'Toyota (France)','VNE':'Renault (Romania)',
        // Italy
        'ZFA':'Fiat','ZFF':'Ferrari','ZHW':'Lamborghini','ZAR':'Alfa Romeo','ZCF':'Iveco',
        // Romania
        'UU1':'Dacia','UU6':'Dacia',
        // Japan
        'JHM':'Honda','JH4':'Honda','JH2':'Honda',
        'JT2':'Toyota','JT3':'Toyota','JT4':'Toyota','JTD':'Toyota','JTE':'Toyota','JTJ':'Toyota','JTM':'Toyota',
        'JAA':'Mitsubishi','JAB':'Mitsubishi','JA3':'Mitsubishi','JA4':'Mitsubishi',
        'JN1':'Nissan','JN6':'Nissan','JN8':'Nissan',
        'JM1':'Mazda','JM3':'Mazda','JMB':'Mitsubishi',
        'JS1':'Suzuki','JS2':'Suzuki','JS3':'Suzuki',
        'JYA':'Yamaha',
        // South Korea
        'KMH':'Hyundai','KMF':'Hyundai','KNA':'Kia','KNB':'Kia','KND':'Kia',
        'KL1':'Chevrolet (Korea)','KL8':'Chevrolet (Korea)',
        // Sweden
        'YV1':'Volvo','YV2':'Volvo','YV3':'Volvo','YV4':'Volvo',
        'YS3':'Saab',
        // UK
        'SAJ':'Jaguar','SAL':'Land Rover','SAR':'Land Rover','SCA':'Rolls-Royce',
        'SCF':'Aston Martin','SCE':'McLaren',
        // USA
        '1FA':'Ford','1FB':'Ford','1FC':'Ford','1FD':'Ford','1FT':'Ford',
        '1G1':'Chevrolet','1GC':'Chevrolet','1GT':'GMC','1GM':'Pontiac',
        '1HG':'Honda (USA)','2HG':'Honda (Canada)','5FN':'Honda',
        '1N4':'Nissan (USA)','1N6':'Nissan (USA)',
        '1VW':'Volkswagen (USA)','1YV':'Mazda',
        '2T1':'Toyota (Canada)','4T1':'Toyota (USA)','4T3':'Toyota (USA)',
        '3VW':'Volkswagen (Mexico)','3VY':'Volkswagen (Mexico)',
        // China
        'LVS':'Volvo (China)','LGB':'Buick (China)','LFV':'Volkswagen (China)',
        // Turkey
        'NM0':'Ford (Turkey)','NMT':'Toyota (Turkey)',
        // Poland
        'SUF':'Fiat (Poland)',
        // Spain
        'VS6':'Ford (Spain)','VS7':'Ford (Spain)',
      };

      // Zemlja/region po prvom znaku WMI
      var WMI_COUNTRY = {
        'A':'Južna Afrika','B':'Angola','C':'Kenija','D':'Madagaskar','E':'Tanzanija',
        'F':'Gana','G':'Nigerija','H':'Kenija','J':'Japan','K':'Južna Koreja',
        'L':'Kina','M':'Indija','N':'Indonezija','P':'Filipini','R':'Tajvan',
        'S':'UK/Nemačka (S=UK, W=Nema)','T':'Švajcarska/Češka','U':'Rumunija/Rusija',
        'V':'Francuska/Španija','W':'Nemačka','X':'Rusija','Y':'Švedska/Finska/Norveška',
        'Z':'Italija',
        '1':'SAD','2':'Kanada','3':'Meksiko','4':'SAD','5':'SAD',
        '6':'Australija','7':'Novi Zeland','8':'Argentina','9':'Brazil',
      };

      var YEAR_MAP = (function () {
        var chars = 'ABCDEFGHJKLMNPRSTUVWXY123456789';
        var m = {};
        chars.split('').forEach(function (c, i) {
          m[c] = 1980 + i;
          m[c + '0'] = 2010 + i; // second cycle (same char = +30)
        });
        // Position-10 year decode
        var yr = {};
        var cycle = 'ABCDEFGHJKLMNPRSTUVWXY123456789';
        cycle.split('').forEach(function (c, i) {
          var base = 1980 + i;
          yr[c] = base <= 2009 ? base : base; // 1980-2009
        });
        return yr;
      })();

      // Pravilna year mapa po VIN standardu — pozicija 10
      var MODEL_YEAR = {
        'A':1980,'B':1981,'C':1982,'D':1983,'E':1984,'F':1985,'G':1986,'H':1987,
        'J':1988,'K':1989,'L':1990,'M':1991,'N':1992,'P':1993,'R':1994,'S':1995,
        'T':1996,'V':1997,'W':1998,'X':1999,'Y':2000,
        '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,'6':2006,'7':2007,'8':2008,'9':2009,
        // drugi ciklus (isti znakovi +30 god)
      };
      // drugi ciklus
      ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','R','S','T','V','W','X','Y'].forEach(function(c,i){
        if (!MODEL_YEAR[c]) MODEL_YEAR[c] = 1980+i;
        else MODEL_YEAR[c + '_2'] = 2010+i; // interno za prikaz
      });
      function decodeYear(c) {
        var base = MODEL_YEAR[c];
        if (!base) return null;
        var now = new Date().getFullYear();
        if (base >= 2010) return base;
        // Provjeri: ako je base+30 ≤ now+1, ambiguity postoji
        var alt = base + 30;
        if (alt <= now + 1) return alt + ' ili ' + base;
        return base;
      }

      // Check digit validacija
      function vinCheckDigit(vin) {
        var T = {'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,
                 'J':1,'K':2,'L':3,'M':4,'N':5,'P':7,'R':9,
                 'S':2,'T':3,'U':4,'V':5,'W':6,'X':7,'Y':8,'Z':9};
        var W = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
        var sum = 0;
        for (var i = 0; i < 17; i++) {
          var c = vin[i];
          var val = /[0-9]/.test(c) ? parseInt(c) : (T[c] || 0);
          sum += val * W[i];
        }
        var rem = sum % 11;
        return rem === 10 ? 'X' : String(rem);
      }

      var vin = (App._vinCheckInput || '').toUpperCase();
      var result = '';

      if (vin.length === 17) {
        var formatOk  = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
        var checkOk   = formatOk && vinCheckDigit(vin) === vin[8];
        var wmi       = vin.slice(0, 3);
        var make      = WMI[wmi] || WMI[wmi.slice(0,2)] || null;
        var country   = WMI_COUNTRY[vin[0]] || '—';
        var yearChar  = vin[9];
        var year      = decodeYear(yearChar);
        var seqNum    = vin.slice(11);

        function row(label, val, ok) {
          var icon = ok === true ? '✅' : ok === false ? '❌' : '•';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">' +
            '<span style="color:#94a3b8;font-size:.85rem">' + label + '</span>' +
            '<span style="font-weight:600;font-size:.88rem">' + icon + ' ' + esc(String(val)) + '</span></div>';
        }

        result = '<div class="card" style="margin-top:12px">' +
          row('Format (17 znakova)', formatOk ? 'Ispravan' : 'Greška', formatOk) +
          row('Check digit (poz. 9)', checkOk ? 'Ispravan' : 'Neispravan — moguća greška', checkOk) +
          row('WMI', wmi + (make ? ' — ' + make : ' — Nepoznato'), make !== null) +
          row('Zemlja porekla', country, null) +
          row('Godište (poz. 10)', year !== null ? year : '— (nepoznat kod: ' + yearChar + ')', year !== null) +
          row('Redni broj (poz. 12–17)', seqNum, null) +
        '</div>' +
        (!checkOk && formatOk
          ? '<p style="font-size:.8rem;color:#f97316;padding:6px 4px">⚠️ Pogrešan check digit — VIN je možda preukucan ili krivotvorien.</p>'
          : '') +
        (make === null
          ? '<p style="font-size:.8rem;color:#64748b;padding:6px 4px">WMI nije u lokalnoj bazi. Probaj online NHTSA dekodiranje.</p>'
          : '') +
        '<a href="https://vpic.nhtsa.dot.gov/decoder/Decoder?VIN=' + vin + '" target="_blank" style="display:block;text-align:center;margin-top:8px;font-size:.82rem;color:#5c6bc0;text-decoration:none">🔗 NHTSA detaljna analiza (online)</a>';
      }

      return '<button class="linkback" onclick="DR.go(\'car_check\')" data-i18n="common.back"></button>' +
        '<h1>🔢 VIN Validator</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Provjeri VIN broj — format, marka i godište. Radi potpuno offline.</p>' +
        '<div class="card">' +
          '<label class="field"><span>VIN broj (17 znakova)</span>' +
            '<input id="f_vin_chk" type="text" placeholder="npr. WVWZZZ1KZBM000001" maxlength="17" ' +
              'style="text-transform:uppercase;letter-spacing:.08em;font-family:monospace;font-size:1rem" ' +
              'value="' + esc(vin) + '" oninput="App._vinCheckInput=this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,\'\');this.value=App._vinCheckInput">' +
          '</label>' +
          '<button class="btn btn-primary" style="margin-top:8px" onclick="App._vinCheckInput=document.getElementById(\'f_vin_chk\').value;DR.go(\'vin_check\')">Analiziraj</button>' +
        '</div>' +
        result;
    },

    /* ===== KALKULATORI HUB ===== */
    kalkulatori: function () {
      return '<button class="linkback" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button>' +
        '<h1>🧮 Kalkulatori</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 16px">Proceni troškove pre nego što platite.</p>' +
        '<div class="card" style="padding:0;overflow:hidden">' +
          [
            ['reg_calc',   '📋', 'Kalkulator registracije', 'Kubikaža, godište, gorivo → AO + tehnički + porez RSD'],
            ['fuel_calc',  '⛽', 'Potrošnja goriva',        'Koliko litara i dinara potrošiš mesečno/godišnje'],
            ['cost_calc',  '💰', 'Troškovi vlasništva',     'Ukupni godišnji troškovi posedovanja auta'],
            ['uvoz_calc',  '🚢', 'Kalkulator uvoza',        'Carina + PDV + homologacija → ukupan uvozni trošak'],
            ['kasko_calc', '🛡️', 'Procena kasko premije',   'Okvirna godišnja premija kasko osiguranja'],
            ['vin_check',  '🔢', 'VIN Validator',           'Provjeri VIN — marka, godište, check digit — offline'],
          ].map(function (row, i, arr) {
            return '<button onclick="DR.go(\'' + row[0] + '\')" style="display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;background:none;border:none;border-bottom:' + (i < arr.length-1 ? '1px solid rgba(255,255,255,.07)' : 'none') + ';cursor:pointer;text-align:left;color:inherit">' +
              '<span style="font-size:1.6rem;line-height:1">' + row[1] + '</span>' +
              '<div>' +
                '<div style="font-weight:600;font-size:.95rem">' + row[2] + '</div>' +
                '<div style="color:#64748b;font-size:.8rem;margin-top:2px">' + row[3] + '</div>' +
              '</div>' +
              '<span style="margin-left:auto;color:#64748b">›</span>' +
            '</button>';
          }).join("") +
        '</div>';
    },

    /* ===== KALKULATOR REGISTRACIJE ===== */
    reg_calc: function () {
      return '<button class="linkback" onclick="DR.go(\'kalkulatori\')" data-i18n="common.back"></button>' +
        '<h1>🧮 Kalkulator registracije</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Procena ukupnih troškova registracije prema srpskom zakonu — porez na upotrebu po zapremini motora + AO osiguranje + tehnički pregled + ekološka naknada + takse.</p>' +
        '<div class="card">' +
          '<label class="field"><span>Zapremina motora (ccm)</span>' +
            '<input type="number" id="rc_ccm" placeholder="npr. 1598" min="1" max="9999" onchange="DR.calcReg()" oninput="DR.calcReg()">' +
          '</label>' +
          '<label class="field"><span>Snaga motora (kW) — za AO osiguranje</span>' +
            '<input type="number" id="rc_kw" placeholder="npr. 77" min="1" max="999" onchange="DR.calcReg()" oninput="DR.calcReg()">' +
          '</label>' +
          '<label class="field"><span>Godina vozila</span>' +
            '<input type="number" id="rc_year" placeholder="npr. 2011" min="1970" max="2026" onchange="DR.calcReg()" oninput="DR.calcReg()">' +
          '</label>' +
          '<label class="field"><span>Gorivo</span>' +
            '<select id="rc_fuel" onchange="DR.calcReg()">' +
              '<option value="benzin">Benzin / Hibrid</option>' +
              '<option value="dizel">Dizel</option>' +
              '<option value="struja">Električno (oslobođeno poreza)</option>' +
              '<option value="gas">Gas (TNG/CNG)</option>' +
            '</select>' +
          '</label>' +
          '<label class="field"><span>Euro ekološka klasa</span>' +
            '<select id="rc_euro" onchange="DR.calcReg()">' +
              '<option value="euro5">Euro 5 (2009–2014)</option>' +
              '<option value="euro6">Euro 6 (2015+)</option>' +
              '<option value="euro4">Euro 4 (2005–2009)</option>' +
              '<option value="euro3">Euro 3 (2000–2005)</option>' +
              '<option value="euro2">Euro 2 i stariji</option>' +
              '<option value="electric">Električno / BEV</option>' +
            '</select>' +
          '</label>' +
          '<label class="field"><span>Kategorija</span>' +
            '<select id="rc_cat" onchange="DR.calcReg()">' +
              '<option value="M1">M1 — Putničko vozilo</option>' +
              '<option value="N1">N1 — Lako teretno (do 3.5t)</option>' +
            '</select>' +
          '</label>' +
        '</div>' +
        '<div id="rc_result" style="display:none;" class="card" style="margin-top:12px">' +
          '<h2 style="margin:0 0 8px">Procena troškova</h2>' +
          '<div id="rc_breakdown"></div>' +
          '<p style="font-size:.75rem;color:#64748b;margin-top:8px">* Porez na upotrebu: Zakon o porezima na upotrebu RS, tarife 2026. AO: minimum za M1, bonus-malus 0. Tehnički: JKP Putevi Srbije.<br>Proverite aktuelne cene na <b>cenaregistracije.rs</b> pre plaćanja.</p>' +
        '</div>';
    },

    /* ===== KALKULATOR POTROŠNJE GORIVA ===== */
    fuel_calc: function () {
      return '<button class="linkback" onclick="DR.go(\'kalkulatori\')" data-i18n="common.back"></button>' +
        '<h1>⛽ Potrošnja goriva</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Koliko litara i dinara potrošiš na mesečnom ili godišnjem nivou.</p>' +
        '<div class="card">' +
          '<label class="field"><span>Prosečna potrošnja (L/100km)</span>' +
            '<input type="number" id="fc_cons" placeholder="npr. 7.5" min="1" max="30" step="0.1" onchange="DR.calcFuel()" oninput="DR.calcFuel()">' +
          '</label>' +
          '<label class="field"><span>Mesečna kilometraža (km)</span>' +
            '<input type="number" id="fc_km" placeholder="npr. 1500" min="1" max="50000" onchange="DR.calcFuel()" oninput="DR.calcFuel()">' +
          '</label>' +
          '<label class="field"><span>Cena goriva (RSD/L)</span>' +
            '<input type="number" id="fc_price" placeholder="npr. 185" min="50" max="500" onchange="DR.calcFuel()" oninput="DR.calcFuel()">' +
          '</label>' +
        '</div>' +
        '<div id="fc_result" style="display:none" class="card">' +
          '<h2 style="margin:0 0 8px">Procena potrošnje</h2>' +
          '<div id="fc_breakdown"></div>' +
        '</div>';
    },

    /* ===== KALKULATOR TROŠKOVA VLASNIŠTVA ===== */
    cost_calc: function () {
      return '<button class="linkback" onclick="DR.go(\'kalkulatori\')" data-i18n="common.back"></button>' +
        '<h1>💰 Troškovi vlasništva</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Ukupni godišnji troškovi posedovanja — gorivo, osiguranje, registracija, servis, gume.</p>' +
        '<div class="card">' +
          '<label class="field"><span>Godišnja kilometraža (km)</span>' +
            '<input type="number" id="cc_km" placeholder="npr. 15000" min="1000" max="200000" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
          '<label class="field"><span>Potrošnja (L/100km)</span>' +
            '<input type="number" id="cc_cons" placeholder="npr. 7.5" min="1" max="30" step="0.1" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
          '<label class="field"><span>Cena goriva (RSD/L)</span>' +
            '<input type="number" id="cc_gprice" placeholder="npr. 185" min="50" max="500" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
        '</div>' +
        '<div class="card">' +
          '<p style="font-weight:600;margin-bottom:.6rem">Godišnji fiksni troškovi</p>' +
          '<label class="field"><span>Registracija (RSD) — iz kalkulatora registracije</span>' +
            '<input type="number" id="cc_reg" placeholder="npr. 35000" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
          '<label class="field"><span>Servis (RSD/god) — 1-2 servisa + ulje</span>' +
            '<input type="number" id="cc_serv" placeholder="npr. 20000" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
          '<label class="field"><span>Gume (RSD/god) — sezonska zamena</span>' +
            '<input type="number" id="cc_tires" placeholder="npr. 10000" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
          '<label class="field"><span>Parking/putarine (RSD/mes)</span>' +
            '<input type="number" id="cc_park" placeholder="npr. 0" onchange="DR.calcCost()" oninput="DR.calcCost()">' +
          '</label>' +
        '</div>' +
        '<div id="cc_result" style="display:none" class="card">' +
          '<h2 style="margin:0 0 8px">Godišnji troškovi</h2>' +
          '<div id="cc_breakdown"></div>' +
        '</div>';
    },

    /* ===== KALKULATOR UVOZA ===== */
    uvoz_calc: function () {
      return '<button class="linkback" onclick="DR.go(\'kalkulatori\')" data-i18n="common.back"></button>' +
        '<h1>🚢 Kalkulator uvoza</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Procena carine, PDV-a i troškova homologacije pri uvozu vozila u Srbiju.</p>' +
        '<div class="card">' +
          '<label class="field"><span>Cena vozila (EUR)</span>' +
            '<input type="number" id="uc_eur" placeholder="npr. 8000" min="100" max="500000" onchange="DR.calcUvoz()" oninput="DR.calcUvoz()">' +
          '</label>' +
          '<label class="field"><span>EUR/RSD kurs</span>' +
            '<input type="number" id="uc_kurs" placeholder="117" value="117" min="80" max="200" onchange="DR.calcUvoz()" oninput="DR.calcUvoz()">' +
          '</label>' +
          '<label class="field"><span>Zemlja porekla / carinska stopa</span>' +
            '<select id="uc_zemlja" onchange="DR.onUvozZemlja()">' +
              '<option value="6.5">EU (SAA sporazum) — 6.5%</option>' +
              '<option value="0">CEFTA (BIH, CG, MK, AL...) — 0%</option>' +
              '<option value="15">Van sporazuma (SAD, UK, Azija...) — 15%</option>' +
              '<option value="custom">Ručni unos</option>' +
            '</select>' +
          '</label>' +
          '<label class="field" id="uc_carina_row" style="display:none"><span>Carinska stopa (%)</span>' +
            '<input type="number" id="uc_carina_pct" placeholder="npr. 10" min="0" max="100" step="0.5" onchange="DR.calcUvoz()" oninput="DR.calcUvoz()">' +
          '</label>' +
          '<label class="field"><span>Transport (EUR, opciono)</span>' +
            '<input type="number" id="uc_transport" placeholder="npr. 500" min="0" max="10000" onchange="DR.calcUvoz()" oninput="DR.calcUvoz()">' +
          '</label>' +
          '<label class="field"><span>Homologacija (RSD)</span>' +
            '<input type="number" id="uc_homolog" placeholder="30000" value="30000" min="0" max="200000" onchange="DR.calcUvoz()" oninput="DR.calcUvoz()">' +
          '</label>' +
        '</div>' +
        '<div id="uc_result" style="display:none" class="card">' +
          '<h2 style="margin:0 0 8px">Procena uvoznih troškova</h2>' +
          '<div id="uc_breakdown"></div>' +
          '<p style="font-size:.75rem;color:#64748b;margin-top:10px">* Carinska vrednost = cena + transport. PDV (20%) se naplaćuje na carinsku vrednost + carinu.<br>Homologacija: individualna (tehnički pregled uvoza). Registracija nije uključena — koristite Kalkulator registracije.<br>Proverite aktuelne stope na <b>carina.rs</b> pre kupovine.</p>' +
        '</div>';
    },

    /* ===== KALKULATOR KASKO PREMIJE ===== */
    kasko_calc: function () {
      return '<button class="linkback" onclick="DR.go(\'kalkulatori\')" data-i18n="common.back"></button>' +
        '<h1>🛡️ Procena kasko premije</h1>' +
        '<p style="color:#64748b;font-size:.83rem;padding:0 0 12px">Okvirna godišnja premija kasko osiguranja. Stvarna cena zavisi od osiguravača, istorije šteta i bonus/malus klase.</p>' +
        '<div class="card">' +
          '<label class="field"><span>Vrednost vozila (EUR)</span>' +
            '<input type="number" id="kk_val" placeholder="npr. 12000" min="500" max="500000" onchange="DR.calcKasko()" oninput="DR.calcKasko()"></label>' +
          '<label class="field"><span>Godina vozila</span>' +
            '<input type="number" id="kk_year" placeholder="npr. 2018" min="1990" max="2026" onchange="DR.calcKasko()" oninput="DR.calcKasko()"></label>' +
          '<label class="field"><span>Istorija šteta</span>' +
            '<select id="kk_claims" onchange="DR.calcKasko()">' +
              '<option value="0">Bez šteta (bonus)</option>' +
              '<option value="1">1 šteta u zadnje 3 god.</option>' +
              '<option value="2">2+ šteta (malus)</option>' +
            '</select></label>' +
          '<label class="field"><span>Franšiza</span>' +
            '<select id="kk_franchise" onchange="DR.calcKasko()">' +
              '<option value="0">Bez franšize (skuplje)</option>' +
              '<option value="150">150 EUR franšiza</option>' +
              '<option value="300">300 EUR franšiza</option>' +
            '</select></label>' +
        '</div>' +
        '<div id="kk_result" style="display:none" class="card">' +
          '<h2 style="margin:0 0 8px">Procena kasko premije</h2>' +
          '<div id="kk_breakdown"></div>' +
          '<p style="font-size:.75rem;color:#64748b;margin-top:10px">Procena zasnovana na prosečnim stopama srpskog tržišta kasko osiguranja (2026). Zatražite ponude od Generali, Wiener, DDOR, Triglav i Uniqa za tačnu cenu.</p>' +
        '</div>';
    }
  };

  /* ---------- AUCore helperi ---------- */
  var HUB_MAP_KEY = "aucore_vehicle_map";

  function hubConnected() { return !!(window.AUCore && AUCore.getSession()); }

  function aucoreCardHTML(mode) {
    if (!window.AUCore) {
      return '<h2>AU Core</h2><p class="empty">AU Core modul nije učitan.</p>';
    }
    if (hubConnected()) {
      var lastSync = localStorage.getItem("aucore_last_sync");
      var hubUser  = JSON.parse(localStorage.getItem("aucore_user") || "null");
      var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
      var syncedEntries = Object.entries(vehicleMap);
      var vehiclesHtml = '';
      if (syncedEntries.length) {
        Store.all("vehicles").then(function (vs) {
          var vmap = {}; vs.forEach(function (v) { vmap[v.id] = v; });
          var rows = syncedEntries.map(function (e) {
            var localId = e[0], serverId = e[1];
            var v = vmap[localId];
            var label = v ? esc((v.make || '') + ' ' + (v.model || '') + (v.year ? ' ' + v.year : '')) : 'ID ' + localId;
            return '<div class="hub-row" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">' +
              '<span style="font-size:.9rem">🚗 ' + label + '</span>' +
              '<button class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem" onclick="DR.go(\'hub_vehicle_edit\',{id:' + serverId + '})">Izmeni</button>' +
              '</div>';
          }).join('');
          var box = el('hub_vehicles_list');
          if (box) box.innerHTML = rows;
        });
      }
      // Async: fetch shared vehicles from AU Core
      AUCore.apiCall("GET", "/vehicles").then(function (r) {
        var shared = (r && r.shared) || [];
        var box = el("hub_shared_list");
        if (!box) return;
        if (!shared.length) { box.style.display = "none"; return; }
        box.innerHTML = '<p style="font-size:.78rem;color:#94a3b8;margin:.4rem 0 .2rem">Vozila podeljena sa mnom:</p>' +
          shared.map(function (v) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">' +
              '<span style="font-size:.85rem">🔑 ' + esc((v.make || '') + ' ' + (v.model || '') + (v.year ? ' ' + v.year : '')) + ' <span class="muted">(' + esc(v.my_role || '') + ')</span></span>' +
              '<button class="btn btn-secondary" style="padding:3px 8px;font-size:.74rem" onclick="DR.go(\'hub_notes\',{sid:' + v.id + '})">Beleške</button>' +
            '</div>';
          }).join('');
      }).catch(function () {});

      return '<h2>AU Core</h2>' +
        '<div class="hub-dashboard">' +
          '<div class="hub-row"><span class="hub-dot"></span><b>Sync aktivan</b></div>' +
          (hubUser ? '<div class="hub-row muted" style="font-size:.82rem">' + esc(hubUser.name || "") + ' · ' + esc(hubUser.email || "") + '</div>' : '') +
          (lastSync ? '<div class="hub-row muted" style="font-size:.82rem">🕐 Poslednji sync: ' + esc(lastSync.slice(0, 16).replace("T", " ")) + '</div>' : '<div class="hub-row muted" style="font-size:.82rem">Još nisi sync-ovao/la podatke.</div>') +
        '</div>' +
        (syncedEntries.length ? '<div id="hub_vehicles_list" style="margin:.6rem 0;border:1px solid var(--border);border-radius:8px;padding:8px 12px"></div>' : '') +
        '<div id="hub_shared_list" style="margin:.4rem 0;border:1px solid var(--border);border-radius:8px;padding:6px 12px"></div>' +
        '<div id="hubSyncStatus" style="font-size:.82rem;color:#6b7280;margin:.4rem 0"></div>' +
        '<button class="btn btn-primary mt8" onclick="DR.hubSync()">☁️ Sync sada</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_feed\')">📥 Povuci zapise</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'public_ids\')">📋 Javni dosije / QR</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_profile_edit\')">👤 Izmeni profil</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_sessions\')">🔐 Aktivne sesije</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_change_pass\')">🔑 Promeni lozinku</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.hubLogout()">Odjavi se (' + esc((hubUser && hubUser.email) || '') + ')</button>';
    }
    if (mode === 'register') {
      return '<h2>AU Core</h2>' +
        '<p class="empty" style="margin-bottom:.8rem">Kreiraj nalog — nalog postaje aktivan odmah.</p>' +
        '<label class="field"><span>Ime</span>' +
          '<input id="hub_name" type="text" autocomplete="name" placeholder="Tvoje ime"></label>' +
        '<label class="field"><span>Email</span>' +
          '<input id="hub_email" type="email" autocomplete="email" placeholder="tvoj@email.com"></label>' +
        '<label class="field"><span>Lozinka</span>' +
          '<input id="hub_pass" type="password" autocomplete="new-password"></label>' +
        '<div id="hubRegErr" style="color:#f87171;font-size:.82rem;margin:.3rem 0"></div>' +
        '<button class="btn btn-primary mt8" onclick="DR.hubRegister()">Registruj se</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.showHubLogin()">Već imaš nalog? Prijavi se</button>';
    }
    return '<h2>AU Core</h2>' +
      '<p class="empty" style="margin-bottom:.8rem">Poveži Driver sa serverom za backup i deljenje.</p>' +
      '<label class="field"><span>Email</span>' +
        '<input id="hub_email" type="email" autocomplete="email" placeholder="tvoj@email.com"></label>' +
      '<label class="field"><span>Lozinka</span>' +
        '<input id="hub_pass" type="password" autocomplete="current-password"></label>' +
      '<div id="hubLoginErr" style="color:#f87171;font-size:.82rem;margin:.3rem 0"></div>' +
      '<button class="btn btn-primary mt8" onclick="DR.hubLogin()">Poveži</button>' +
      '<button class="btn btn-secondary mt8" onclick="DR.showHubRegister()">Nemaš nalog? Registruj se</button>' +
      '<button class="btn btn-secondary mt8" onclick="DR.go(\'hub_forgot\')" style="font-size:.82rem;color:#64748b">Zaboravio lozinku?</button>';
  }

  /* ---------- License helperi ---------- */
  function licensed() { return License.isLicensed(Store); }
  function moduleUnlocked(id) {
    var m = App.config && App.config.modules && App.config.modules[id];
    if (!m) return false;
    return License.isModuleUnlocked(m.tier, licensed(), false); // platform=false zasad
  }
  function eventPhotoPreviewHTML() {
    var ph = App._eventPhotos || [];
    if (!ph.length) return "";
    return '<div class="photostrip">' + ph.map(function (p, i) {
      return '<div class="photocell"><img src="' + p + '">' +
        '<button class="photodel" onclick="DR.removeEventPhoto(' + i + ')">✕</button></div>';
    }).join("") + '</div>';
  }
  function licenseCardHTML() {
    var st = License.getState(Store);
    if (st.licensed) {
      var msg = st.test ? t("license.test_active") : t("license.active");
      return '<h2 data-i18n="settings.license"></h2><p class="lic-ok">✓ ' + msg + '</p>' +
        '<button class="btn btn-secondary mt8" onclick="DR.removeLicense()" data-i18n="license.remove"></button>';
    }
    return '<h2 data-i18n="settings.license"></h2>' +
      '<p class="empty" data-i18n="license.free_note"></p>' +
      '<label class="field mt8"><span data-i18n="license.enter_key"></span>' +
        '<input id="lic_key" type="text" placeholder="XXXXXXXX-XXXXXXXX"></label>' +
      '<button class="btn btn-primary" onclick="DR.activateLicense()" data-i18n="license.activate"></button>';
  }

  /* ---------- Email signup card (AutoUniverse obaveštenja) ---------- */
  var EMAIL_SIGNUP_KEY = "au_email_signup";

  function emailSignupCardHTML() {
    var state = localStorage.getItem(EMAIL_SIGNUP_KEY);
    if (state === "done") {
      return '<h2>AutoUniverse obaveštenja</h2>' +
        '<p class="lic-ok" style="font-size:.9rem">✓ Prijavljeni ste — proverite email.</p>';
    }
    if (state === "error") {
      return '<h2>AutoUniverse obaveštenja</h2>' +
        '<p style="color:#f87171;font-size:.82rem;margin-bottom:.6rem">Greška pri slanju — pokušaj ponovo.</p>' +
        emailSignupFormHTML();
    }
    return '<h2>AutoUniverse obaveštenja</h2>' +
      '<p class="empty" style="margin-bottom:.8rem">Ostavi email i prvi saznaš nove funkcije.</p>' +
      emailSignupFormHTML();
  }

  function emailSignupFormHTML() {
    var profile = Store.settings.get("profile", {});
    return '<label class="field"><span>Email</span>' +
        '<input id="su_email" type="email" autocomplete="email" placeholder="tvoj@email.com"></label>' +
      '<label class="field"><span>Ime (opciono)</span>' +
        '<input id="su_name" type="text" autocomplete="name" placeholder="Ime" value="' + esc(profile.name || "") + '"></label>' +
      '<label class="field"><span>Telefon (opciono)</span>' +
        '<input id="su_phone" type="tel" autocomplete="tel" placeholder="+381..." value="' + esc(profile.phone || "") + '"></label>' +
      '<div id="suErr" style="color:#f87171;font-size:.82rem;margin:.3rem 0"></div>' +
      '<button class="btn btn-primary" onclick="DR.submitEmailSignup()">Prijavi me</button>';
  }

  /* ---------- Reminders red ---------- */
  function reminderRowHTML(r, today, kmBy) {
    var km = kmBy[r.vehicle_id];
    var s = Reminders.status(r, today, km);
    var v = App._vehById && App._vehById[r.vehicle_id];
    var badge = { due: "due", soon: "soon", upcoming: "upcoming", done: "done" }[s.state];
    var detail = "";
    if (s.state !== "done") {
      if (s.reason === "mileage" && s.kmLeft != null) {
        detail = (s.kmLeft <= 0 ? Math.abs(s.kmLeft) + " " + t("reminders.km_left") + " (" + t("reminders.overdue") + ")"
                                : s.kmLeft + " " + t("reminders.km_left"));
      } else if (s.daysLeft != null) {
        detail = (s.daysLeft <= 0 ? Math.abs(s.daysLeft) + " " + t("reminders.days_left") + " (" + t("reminders.overdue") + ")"
                                  : s.daysLeft + " " + t("reminders.days_left"));
      }
    }
    return '<div class="card remrow rem-' + badge + '">' +
      '<button class="rowmain" onclick="DR.go(\'reminder_form\',{id:\'' + esc(r.id) + '\'})">' +
        '<b>' + esc(r.title) + '</b>' +
        '<span class="muted">' + (v ? esc(v.make + " " + v.model) : "") + (detail ? " • " + detail : "") + '</span>' +
      '</button>' +
      (r.done ? '<span class="rembadge done">✓</span>'
              : '<button class="rembadge ' + badge + '" onclick="DR.markReminderDone(\'' + esc(r.id) + '\')">✓</button>') +
      '</div>';
  }

  /* ---------- Akcije ---------- */
  var Actions = {
    go: render,
    setVehicle: function (id) { App.activeVehicleId = id; render("vehicle"); },
    toggleTradeMode: function () {
      var box = el("tradePurchaseFields"); if (box) box.hidden = !checked("f_trade_mode");
    },
    onMakeInput: function (makeVal) {
      if (!window.Catalog) return;
      var mdls = window.Catalog.models(makeVal);
      var dl = el("cat_models");
      if (dl) dl.innerHTML = mdls.map(function (m) { return '<option value="' + esc(m) + '">'; }).join("");
    },

    decodeVin: function () {
      var vinEl = el("f_vin");
      if (!vinEl) return;
      var vin = vinEl.value.trim().toUpperCase();
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) { toast("VIN mora imati 17 znakova (bez I, O, Q)"); return; }
      toast("Dekodovanje...");
      fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/" + vin + "?format=json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var row = data.Results && data.Results[0];
          if (!row) { toast("NHTSA nije vratio podatke"); return; }
          var make  = (row.Make  || "").trim();
          var model = (row.Model || "").trim();
          var year  = parseInt(row.ModelYear || "0", 10) || null;
          if (!make) { toast("VIN prepoznat, marka nepoznata"); return; }
          var makeEl  = el("f_make");
          var modelEl = el("f_model");
          var yearEl  = el("f_year");
          if (makeEl)  { makeEl.value  = make;  DR.onMakeInput(make); }
          if (modelEl) { modelEl.value = model; }
          if (yearEl && year)  { yearEl.value = year; }
          toast("✓ " + make + " " + model + (year ? " (" + year + ")" : ""));
        })
        .catch(function () { toast("Greška — NHTSA nedostupan"); });
    },

    addEvent: function (vehId, retro) {
      render("event_form", { vehicle_id: vehId || App.activeVehicleId, retro: retro });
    },
    toggleRetro: function () {
      var box = el("retroFields"); if (box) box.hidden = !checked("e_retro");
    },

    /* ----- Slike na događaju ----- */
    pickEventPhotos: function (input) {
      var files = input.files; if (!files || !files.length) return;
      Photos.compressMany(files).then(function (arr) {
        App._eventPhotos = (App._eventPhotos || []).concat(arr).slice(0, 6);
        var box = el("evtPreview"); if (box) box.innerHTML = eventPhotoPreviewHTML();
      });
    },
    removeEventPhoto: function (i) {
      (App._eventPhotos || []).splice(i, 1);
      var box = el("evtPreview"); if (box) box.innerHTML = eventPhotoPreviewHTML();
    },

    /* ----- Početno stanje: jedan save → više zapisa ----- */
    saveInitialState: function () {
      var vehId = App._initVehId; if (!vehId) { toast(t("d.need_vehicle")); return; }
      var ops = [], created = 0;

      Store.get("vehicles", vehId).then(function (v) {
        // 4.1 Kilometraža → note događaj (trenutno stanje, source owner)
        var km0 = val("is_km");
        if (km0) {
          ops.push(Store.put("events", Models.createEvent({
            vehicle_id: vehId, type: "note", app: "driver", source: "owner",
            title: t("d.is_km"), date: todayISO(), mileage_km: parseInt(km0, 10)
          }))); created++;
        }
        // 4.2 Poslednji servis → retroaktivni event
        var svcDate = val("is_svc_date"), svcKm = val("is_svc_km"), svcDesc = val("is_svc_desc");
        if (svcDate || svcKm || svcDesc) {
          ops.push(Store.put("events", Models.createEvent({
            vehicle_id: vehId, type: "service", app: "driver", source: "initial", retroactive: true,
            title: val("is_svc_title") || t("d.type_service"),
            date: svcDate || todayISO(),
            date_precision: el("is_svc_dprec") ? el("is_svc_dprec").value : "approx",
            mileage_km: svcKm ? parseInt(svcKm, 10) : null,
            km_precision: "approx", description: svcDesc
          }))); created++;
        }
        // 4.3 Rokovi → podsetnici
        [["is_reg", "d.is_registration"], ["is_insp", "d.is_inspection"], ["is_pol", "d.is_policy"]]
          .forEach(function (r) {
            var dt = val(r[0]);
            if (dt) {
              ops.push(Store.put("reminders", Models.createReminder({
                vehicle_id: vehId, title: t(r[1]), due_date: dt
              }))); created++;
            }
          });
        // 4.4 Gume → tehnička kartica (+ opcioni sezonski podsetnik)
        var tSize = val("is_tire_size"), tSet = val("is_tire_set");
        if (tSize || tSet) {
          v.tires = Object.assign({}, v.tires, { size_front: tSize, current_set: tSet });
          ops.push(Store.put("vehicles", v)); created++;
        }
        if (checked("is_tire_rem")) {
          ops.push(Store.put("reminders", Models.createReminder({
            vehicle_id: vehId, title: t("d.is_tire_reminder"),
            due_date: null, due_mileage_km: null, notes: t("d.is_tire_seasonal")
          }))); // sezonski bez tvrdog roka — vlasnik ga kasnije podesi
        }

        if (!created) { toast(t("wo.skip")); render("vehicle"); return; }
        Promise.all(ops).then(function () {
          App.activeVehicleId = vehId;
          toast(t("d.initial_saved").replace("{n}", created));
          render("vehicle");
        });
      });
    },

    /* ----- Dokumenta ----- */
    pickDocPhoto: function (input) {
      var f = input.files && input.files[0]; if (!f) return;
      Photos.compress(f).then(function (dataUrl) {
        App._docFile = dataUrl;
        var box = el("docPreview");
        if (box) box.innerHTML = '<img class="docthumb big" src="' + dataUrl + '">';
      });
    },
    saveDocument: function () {
      var base = App._editingDoc || Models.createDocument({});
      base.doc_type = el("doc_type").value;
      base.vehicle_id = el("doc_vehicle").value || null;
      base.date = val("doc_date") || todayISO();
      base.file = App._docFile || base.file || null;
      Store.put("documents", base).then(function () { toast(t("common.saved")); render("documents"); });
    },
    deleteDocument: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("documents", id).then(function () { render("documents"); });
    },

    /* ----- Servisni pasoš (PDF) ----- */
    exportDossier: function (vehId) {
      Promise.all([Store.get("vehicles", vehId), Store.byIndex("events", "vehicle_id", vehId)])
        .then(function (res) {
          var v = res[0], events = res[1];
          var kmBy = latestKmByVehicle(events);
          var sd = v.service_data || {}, tires = v.tires || {};
          var lang = Store.settings.get("lang", App.config.language_default);
          var profile = Store.settings.get("profile", { name: "", phone: "" });
          var doc = PDFEngine.buildDossier({
            lang: lang, profile: profile,
            vehicle: { make: v.make, model: v.model, year: v.year, plate: v.plate, vin: v.vin,
                       type_label: v.type_label || v.category },
            currentKm: kmBy[vehId],
            techCard: { oil_type: sd.oil_type, oil_filter: sd.oil_filter, battery: sd.battery,
                        tires: [tires.size_front, tires.current_set].filter(Boolean).join(" ") },
            events: events,
            typeLabel: function (ty) { return t("d.type_" + ty); }
          });
          var fname = "servisni-pasos-" + (v.plate || v.make || "vozilo").replace(/\s+/g, "-") + ".pdf";
          // Web Share API na mobilnim — dijeli direktno umjesto download
          if (navigator.canShare && navigator.share) {
            var blob = doc.output("blob");
            var file = new File([blob], fname, { type: "application/pdf" });
            if (navigator.canShare({ files: [file] })) {
              navigator.share({ files: [file], title: fname }).catch(function () { doc.save(fname); });
              return;
            }
          }
          doc.save(fname);
        });
    },

    saveVehicle: function () {
      var base = App._editingVehicle || Models.createVehicle({});
      base.make = val("f_make"); base.model = val("f_model");
      base.year = val("f_year") ? parseInt(val("f_year"), 10) : null;
      base.plate = val("f_plate");
      base.category = el("f_category").value;
      base.type_label = Models.VEHICLE_CATEGORIES[base.category] || "";
      base.vin = val("f_vin");
      base.status = el("f_status") ? el("f_status").value : (base.status || "active");
      base.registered_owner = val("f_regowner");
      base.trade_mode = checked("f_trade_mode");
      if (base.trade_mode) {
        var buyPrice = val("f_trade_buy_price");
        base.trade = Object.assign({ sale: { date: null, price: null, currency: "EUR" } },
          base.trade || {},
          { purchase: {
              date:     val("f_trade_buy_date") || null,
              price:    buyPrice ? parseFloat(buyPrice) : null,
              currency: el("f_trade_buy_cur") ? el("f_trade_buy_cur").value : "EUR",
              source:   el("f_trade_buy_src") ? el("f_trade_buy_src").value : "individual",
              notes:    ""
            }
          }
        );
      } else {
        base.trade = null;
      }
      base.engine = Object.assign({}, base.engine, {
        fuel: val("f_fuel"),
        power_kw: val("f_power") ? parseInt(val("f_power"), 10) : null
      });
      base.service_data = Object.assign({}, base.service_data, {
        oil_type: val("f_oil_type"), oil_filter: val("f_oil_filter"),
        air_filter: val("f_air_filter"), battery: val("f_battery")
      });
      base.tires = Object.assign({}, base.tires, {
        size_front: val("f_tires_front"), current_set: val("f_tires_set")
      });
      if (!base.make && !base.model) { toast(t("d.need_make")); return; }
      var isNew = !App._editingVehicle;
      Store.put("vehicles", base).then(function (v) {
        App.activeVehicleId = v.id;
        toast(t("common.saved"));
        render("vehicle"); // vehicle ekran sam ponudi "Početno stanje" ako nema događaja
      });
    },
    deleteVehicle: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("vehicles", id).then(function () { App.activeVehicleId = null; render("vehicle"); });
    },

    saveEvent: function () {
      var base = App._editingEvent || Models.createEvent({ app: "driver" });
      base.vehicle_id = el("e_vehicle").value || null;
      base.type = el("e_type").value;
      base.title = val("e_title");
      base.description = val("e_desc");
      base.shop_name = val("e_shop") || null;
      if (base.type === "coolant_service") {
        var cType  = val("e_clt_type");
        var cConc  = val("e_clt_conc")  ? parseFloat(val("e_clt_conc"))  : null;
        var cYears = val("e_clt_years") ? parseInt(val("e_clt_years"), 10) : null;
        var cTherm = checked("e_clt_therm");
        var cHoses = checked("e_clt_hoses");
        base.coolant_data = (cType || cConc != null || cYears || cTherm || cHoses)
          ? { coolant_type: cType || null, concentration_pct: cConc,
              interval_years: cYears, thermostat_changed: cTherm, hoses_checked: cHoses }
          : null;
      } else {
        base.coolant_data = null;
      }
      if (base.type === "belt_service") {
        var blType  = el("e_blt_type")     ? el("e_blt_type").value              : "";
        var blIntvl = val("e_blt_interval") ? parseInt(val("e_blt_interval"), 10) : null;
        var blWP    = checked("e_blt_wp");
        var blTens  = checked("e_blt_tens");
        var blRoll  = checked("e_blt_roller");
        base.belt_data = (blType || blIntvl || blWP || blTens || blRoll)
          ? { belt_type: blType || null, interval_km: blIntvl,
              water_pump_changed: blWP, tensioner_changed: blTens, roller_changed: blRoll }
          : null;
      } else {
        base.belt_data = null;
      }
      if (base.type === "brake_service") {
        var bFP  = val("e_brk_fp") ? parseFloat(val("e_brk_fp")) : null;
        var bRP  = val("e_brk_rp") ? parseFloat(val("e_brk_rp")) : null;
        var bFD  = checked("e_brk_fd");
        var bRD  = checked("e_brk_rd");
        var bFL  = checked("e_brk_fl");
        base.brake_data = (bFP != null || bRP != null || bFD || bRD || bFL)
          ? { front_pads_mm: bFP, rear_pads_mm: bRP,
              front_discs_changed: bFD, rear_discs_changed: bRD, fluid_changed: bFL }
          : null;
      } else {
        base.brake_data = null;
      }
      if (base.type === "oil_change") {
        var oSpec  = val("e_oil_spec");
        var oQty   = val("e_oil_qty")   ? parseFloat(val("e_oil_qty"))   : null;
        var oBrand = val("e_oil_brand");
        var oFilt  = checked("e_oil_filter");
        var oAir   = checked("e_oil_air_filter");
        var oCabin = checked("e_oil_cabin_filter");
        base.oil_data = (oSpec || oQty || oBrand || oFilt || oAir || oCabin)
          ? { spec: oSpec || null, qty_l: oQty, brand: oBrand || null,
              filter_changed: oFilt, air_filter_changed: oAir, cabin_filter_changed: oCabin }
          : null;
      } else {
        base.oil_data = null;
      }
      if (base.type === "battery") {
        var bBrand = val("e_bat_brand");
        var bAh    = val("e_bat_ah")  ? parseFloat(val("e_bat_ah"))  : null;
        var bCca   = val("e_bat_cca") ? parseFloat(val("e_bat_cca")) : null;
        var bCond  = el("e_bat_cond") ? el("e_bat_cond").value : "";
        base.battery_data = (bBrand || bAh || bCca || bCond)
          ? { brand: bBrand || null, ah: bAh, cca: bCca, condition: bCond || null }
          : null;
      } else {
        base.battery_data = null;
      }
      if (base.type === "tires") {
        var tSet   = el("e_tire_set")   ? el("e_tire_set").value   : "";
        var tSize  = val("e_tire_size");
        var tBrand = val("e_tire_brand");
        var tTread = val("e_tire_tread") ? parseFloat(val("e_tire_tread")) : null;
        base.tire_data = (tSet || tSize || tBrand || tTread != null)
          ? { set_name: tSet || null, size: tSize || null, brand: tBrand || null, tread_mm: tTread }
          : null;
      } else {
        base.tire_data = null;
      }
      var nextKm   = val("e_next_km")   ? parseInt(val("e_next_km"), 10)  : null;
      var nextDate = val("e_next_date") || null;
      base.next_service = (nextKm || nextDate) ? { km: nextKm, date: nextDate } : null;
      base.mileage_km = val("e_km") ? parseInt(val("e_km"), 10) : null;
      base.photos = (App._eventPhotos || []).slice();
      var retro = checked("e_retro");
      base.retroactive = retro;
      if (retro) {
        base.date = val("e_date") || todayISO();
        base.date_precision = el("e_dprec") ? el("e_dprec").value : "exact";
        base.km_precision = checked("e_kmapprox") ? "approx" : "exact";
        // poreklo: slika računa → receipt (viši trust); bez dokaza → initial
        base.source = base.photos.length ? "receipt" : "initial";
      } else {
        base.date = val("e_date") || todayISO();
        base.date_precision = "exact"; base.km_precision = "exact";
        base.source = base.photos.length ? "receipt" : "owner";
      }
      if (!base.vehicle_id) { toast(t("d.need_vehicle")); return; }
      var reminderOps = [];
      if (base.next_service && (base.next_service.km || base.next_service.date)) {
        reminderOps.push(Store.put("reminders", Models.createReminder({
          vehicle_id:    base.vehicle_id,
          title:         "Sledeći servis" + (base.title ? " — " + base.title : ""),
          due_date:      base.next_service.date || null,
          due_mileage_km: base.next_service.km  || null
        })));
      }
      Store.put("events", base).then(function () {
        return Promise.all(reminderOps);
      }).then(function () {
        var msg = t("common.saved") + (reminderOps.length ? " + podsetnik kreiran 🔔" : "");
        toast(msg);
        if (hubConnected()) {
          var _vmap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
          var sid = _vmap[base.vehicle_id];
          if (sid) {
            AUCore.apiCall("POST", "/vehicles/" + sid + "/events", {
              type: base.type || "other",
              data: { title: base.title || null, description: base.description || null, mileage_km: base.mileage_km || null, source: base.source || null },
              event_date: base.date || new Date().toISOString().slice(0, 10),
              retroactive: !!base.retroactive,
              source: base.source || "app",
              app: "driver"
            }).then(function () {
              base.synced_at = new Date().toISOString();
              Store.put("events", base);
            }).catch(function () {}); // greška pri push-u ne blokira lokalni save
          }
        }
        render("vehicle");
      });
    },
    deleteEvent: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("events", id).then(function () { render("history"); });
    },

    saveSettings: function () {
      Store.settings.set("profile", { name: val("s_name"), phone: val("s_phone") });
      Store.settings.set("currency", el("s_currency").value);
      var newLang = el("s_lang").value;
      var oldLang = Store.settings.get("lang", App.config.language_default);
      Store.settings.set("lang", newLang);
      if (newLang !== oldLang) {
        loadI18n(newLang).then(function () { translate(document.body); toast(t("common.saved")); render("settings"); });
      } else { toast(t("common.saved")); }
    },

    exportBackup: function () {
      Store.exportAll().then(function (json) {
        var blob = new Blob([json], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "driver-backup-" + todayISO() + ".json";
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      });
    },
    importBackup: function (input) {
      var file = input.files && input.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        Store.importAll(reader.result).then(function (res) {
          toast(t("backup.done") + " (" + res.imported + ")"); render("vehicle");
        }).catch(function (e) { toast("Greška: " + e.message); });
      };
      reader.readAsText(file);
    },

    activateLicense: function () {
      var key = val("lic_key"); if (!key) { toast(t("license.invalid")); return; }
      var productId = (App.config.license && App.config.license.product_id) || "";
      License.activate(Store, productId, key).then(function (res) {
        if (res.ok) { toast(res.test ? t("license.test_active") : t("license.active")); render("settings"); }
        else {
          var msg = res.reason === "offline" ? t("license.offline")
                  : res.reason === "no_product_configured" ? t("license.no_product") : t("license.invalid");
          toast(msg);
        }
      });
    },
    removeLicense: function () {
      if (!confirm(t("common.confirm_delete"))) return;
      License.deactivate(Store); render("settings");
    },

    saveReminder: function () {
      var base = App._editingReminder || Models.createReminder({});
      base.title = val("r_title");
      base.vehicle_id = el("r_vehicle").value || null;
      base.due_date = val("r_date") || null;
      base.due_mileage_km = val("r_km") ? parseInt(val("r_km"), 10) : null;
      if (!base.title) { toast(t("reminders.rtitle")); return; }
      if (!base.due_date && !base.due_mileage_km) { toast(t("reminders.due_date") + " / " + t("reminders.due_km")); return; }
      Store.put("reminders", base).then(function () {
        toast(t("common.saved"));
        if (hubConnected() && base.vehicle_id) {
          var _vmap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
          var sid = _vmap[base.vehicle_id];
          if (sid) {
            AUCore.apiCall("POST", "/vehicles/" + sid + "/reminders", {
              title: base.title,
              due_date: base.due_date || null,
              due_mileage_km: base.due_mileage_km || null
            }).then(function (r) {
              if (r && r.id) { base.hub_rid = r.id; Store.put("reminders", base); }
            }).catch(function () {});
          }
        }
        render("reminders");
      });
    },
    markReminderDone: function (id) {
      Store.get("reminders", id).then(function (r) {
        r.done = true;
        return Store.put("reminders", r).then(function () {
          if (hubConnected() && r.hub_rid && r.vehicle_id) {
            var _vmap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
            var sid = _vmap[r.vehicle_id];
            if (sid) AUCore.apiCall("PUT", "/vehicles/" + sid + "/reminders/" + r.hub_rid, { done: true }).catch(function () {});
          }
        });
      }).then(function () { render("reminders"); });
    },
    deleteReminder: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.get("reminders", id).then(function (r) {
        return Store.remove("reminders", id).then(function () {
          if (hubConnected() && r && r.hub_rid && r.vehicle_id) {
            var _vmap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
            var sid = _vmap[r.vehicle_id];
            if (sid) AUCore.apiCall("DELETE", "/vehicles/" + sid + "/reminders/" + r.hub_rid).catch(function () {});
          }
        });
      }).then(function () { render("reminders"); });
    },

    /* ----- AUCore ----- */
    hubLogin: function () {
      if (!window.AUCore) return;
      var email = val("hub_email"), pass = val("hub_pass");
      var errEl = el("hubLoginErr");
      if (!email || !pass) { if (errEl) errEl.textContent = "Email i lozinka su obavezni."; return; }
      if (errEl) errEl.textContent = "";
      AUCore.apiCall("POST", "/auth/login", { email: email, password: pass })
        .then(function (data) {
          AUCore.setSession(data.session);
          if (data.user) localStorage.setItem("aucore_user", JSON.stringify(data.user));
          toast("Povezano sa AU Core-om!");
          render("settings");
          pollNotifications();
        })
        .catch(function (e) {
          if (errEl) errEl.textContent = e.message || "Greška pri povezivanju.";
        });
    },

    hubForgot: function () {
      if (!window.AUCore) { toast("AU Core nije dostupan."); return; }
      var emailVal = val("fg_email") || '';
      var msgEl = el("fg_msg");
      if (!emailVal) { if (msgEl) { msgEl.style.color = '#f87171'; msgEl.textContent = "Unesite email."; } return; }
      AUCore.apiCall('POST', '/auth/forgot', { email: emailVal }).then(function () {
        if (msgEl) { msgEl.style.color = '#22c55e'; msgEl.textContent = "Link poslan! Proverite mejl."; }
      }).catch(function () {
        if (msgEl) { msgEl.style.color = '#22c55e'; msgEl.textContent = "Link poslan! Proverite mejl."; } // anti-enumeration
      });
    },

    hubReset: function () {
      if (!window.AUCore) { toast("AU Core nije dostupan."); return; }
      var token = val("rs_token") || '';
      var pass1 = val("rs_pass1") || '';
      var pass2 = val("rs_pass2") || '';
      var msgEl = el("rs_msg");
      if (!pass1 || pass1.length < 8) { if (msgEl) { msgEl.style.color = '#f87171'; msgEl.textContent = "Min 8 znakova."; } return; }
      if (pass1 !== pass2)            { if (msgEl) { msgEl.style.color = '#f87171'; msgEl.textContent = "Lozinke se ne poklapaju."; } return; }
      AUCore.apiCall('POST', '/auth/reset', { token: token, password: pass1 }).then(function () {
        if (msgEl) { msgEl.style.color = '#22c55e'; msgEl.textContent = "Lozinka promenjena! Prijavi se."; }
        setTimeout(function () { DR.go('settings'); }, 1500);
      }).catch(function (e) {
        if (msgEl) { msgEl.style.color = '#f87171'; msgEl.textContent = e.message || "Greška. Token možda istekao."; }
      });
    },

    loadSessions: function () {
      if (!window.AUCore || !AUCore.getToken()) { el('sessions_box').innerHTML = '<p class="muted" style="text-align:center;padding:20px">Nisi prijavljen/a na AU Core.</p>'; return; }
      AUCore.apiCall('GET', '/auth/sessions').then(function (sessions) {
        if (!sessions.length) { el('sessions_box').innerHTML = '<p class="muted" style="text-align:center;padding:20px">Nema aktivnih sesija.</p>'; return; }
        el('sessions_box').innerHTML = sessions.map(function (s) {
          var ts = new Date(s.created_at).toLocaleString('sr-RS');
          var exp = new Date(s.expires_at).toLocaleString('sr-RS');
          return '<div class="card" style="margin-bottom:8px">' +
            '<p style="font-size:.82rem;color:#94a3b8;margin-bottom:4px">Prijavljen: ' + ts + '</p>' +
            '<p style="font-size:.82rem;color:#94a3b8;margin-bottom:8px">Ističe: ' + exp + '</p>' +
            (s.current
              ? '<span style="font-size:.78rem;color:#22c55e;font-weight:600">● Ova sesija</span>'
              : '<button class="btn btn-secondary" style="font-size:.8rem;color:#f87171" onclick="DR.revokeSession(\'' + s.id + '\')">Odjavi uređaj</button>') +
          '</div>';
        }).join('');
      }).catch(function () {
        el('sessions_box').innerHTML = '<p class="muted" style="text-align:center;padding:20px">Greška pri učitavanju sesija.</p>';
      });
    },

    revokeSession: function (sessionId) {
      if (!window.AUCore) return;
      AUCore.apiCall('DELETE', '/auth/sessions/' + sessionId).then(function () {
        toast("Sesija odjavljena.");
        DR.loadSessions();
      }).catch(function () { toast("Greška."); });
    },

    hubChangePass: function () {
      var current = val("cp_current");
      var newPass  = val("cp_new");
      var confirm  = val("cp_confirm");
      var errEl    = el("cp_err");
      if (!current || !newPass) { if (errEl) errEl.textContent = "Popuni sva polja."; return; }
      if (newPass.length < 8)   { if (errEl) errEl.textContent = "Nova lozinka mora imati min 8 znakova."; return; }
      if (newPass !== confirm)  { if (errEl) errEl.textContent = "Lozinke se ne poklapaju."; return; }
      if (!window.AUCore) return;
      AUCore.apiCall('POST', '/auth/change-password', { current_password: current, new_password: newPass })
        .then(function () {
          toast("Lozinka promenjena!");
          render("settings");
        })
        .catch(function (e) {
          if (errEl) errEl.textContent = (e && e.message) || "Greška — proveri trenutnu lozinku.";
        });
    },

    hubSaveProfile: function () {
      var name  = val("pe_name") ? val("pe_name").trim() : "";
      var phone = val("pe_phone") ? val("pe_phone").trim() : "";
      var errEl = el("pe_err");
      if (!name) { if (errEl) errEl.textContent = "Ime ne može biti prazno."; return; }
      if (!window.AUCore) return;
      AUCore.apiCall('PUT', '/auth/me', { name: name, phone: phone || null })
        .then(function () {
          if (hubUser) hubUser.name = name;
          toast("Profil sačuvan!");
          render("settings");
        })
        .catch(function (e) {
          if (errEl) errEl.textContent = (e && e.message) || "Greška pri čuvanju.";
        });
    },

    hubSaveVehicle: function () {
      var vid   = Number((el("hve_vid") || {}).value || 0);
      var make  = val("hve_make") ? val("hve_make").trim() : "";
      var model = val("hve_model") ? val("hve_model").trim() : "";
      var year  = val("hve_year")  ? Number(val("hve_year"))  : null;
      var plate = val("hve_plate") ? val("hve_plate").trim()  : "";
      var vin   = val("hve_vin")   ? val("hve_vin").trim()    : "";
      var errEl = el("hve_err");
      if (!make || !model) { if (errEl) errEl.textContent = "Marka i model su obavezni."; return; }
      if (!vid) { if (errEl) errEl.textContent = "Greška: ID vozila nije pronađen."; return; }
      if (!window.AUCore) return;
      var body = { make: make, model: model };
      if (year) body.year = year;
      if (plate) body.plate = plate;
      if (vin)   body.vin   = vin;
      AUCore.apiCall('PUT', '/vehicles/' + vid, body)
        .then(function () {
          toast("Vozilo ažurirano!");
          render("vehicle");
        })
        .catch(function (e) {
          if (errEl) errEl.textContent = (e && e.message) || "Greška pri čuvanju.";
        });
    },

    loadNotes: function (sid) {
      var body = document.getElementById("notes_body");
      if (!body) return;
      if (!hubConnected()) { body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Nisi povezan sa AU Core-om.</p>'; return; }
      AUCore.apiCall("GET", "/vehicles/" + sid + "/notes")
        .then(function (r) {
          if (!r.notes || !r.notes.length) {
            body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Nema beleški.</p>';
            return;
          }
          body.innerHTML = r.notes.map(function (n) {
            var visTag = n.visibility === 'shared' ? ' <span style="color:#38bdf8;font-size:.72rem">[vidljivo mehaničaru]</span>' : '';
            return '<div class="card" style="padding:10px 12px;margin:.5rem 0;display:flex;justify-content:space-between;align-items:flex-start">' +
              '<div><p style="margin:0 0 4px">' + esc(n.content) + '</p>' +
              '<span class="muted" style="font-size:.74rem">' + esc(n.created_at ? n.created_at.slice(0,10) : '') + visTag + '</span></div>' +
              '<button style="background:none;border:none;color:#f87171;cursor:pointer;font-size:1.1rem;padding:0 0 0 8px" onclick="DR.hubDeleteNote(' + sid + ',' + n.id + ')">✕</button>' +
            '</div>';
          }).join('');
        })
        .catch(function () { body.innerHTML = '<p style="color:#f87171;text-align:center;padding:20px">Greška pri učitavanju.</p>'; });
    },

    loadHubFeed: function (forceAll) {
      if (!window.AUCore || !hubConnected()) {
        var b = el("feed_body");
        if (b) b.innerHTML = '<p class="empty">Nisi povezan sa AU Core-om.</p>';
        return;
      }
      var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
      var sids = Object.values(vehicleMap).filter(Boolean);
      if (!sids.length) {
        var b = el("feed_body");
        if (b) b.innerHTML = '<p class="empty">Nema sync-ovanih vozila.</p>';
        return;
      }
      var lastPull = (!forceAll && localStorage.getItem("aucore_last_pull")) || null;
      var b = el("feed_body");
      if (b) b.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Učitavam...</p>';

      Promise.all(sids.map(function (sid) {
        var url = "/vehicles/" + sid + "/events?app=aucore&limit=50";
        if (lastPull) url += "&since=" + encodeURIComponent(lastPull);
        return AUCore.apiCall("GET", url)
          .then(function (r) {
            return (r && r.events || []).map(function (e) { e._sid = sid; return e; });
          }).catch(function () { return []; });
      })).then(function (results) {
        var all = [].concat.apply([], results);
        all.sort(function (a, b) { return (b.event_date || '').localeCompare(a.event_date || ''); });
        localStorage.setItem("aucore_last_pull", new Date().toISOString());
        var b = el("feed_body");
        if (!b) return;
        if (!all.length) {
          b.innerHTML = '<p class="empty">' +
            (lastPull ? 'Nema novih zapisa od poslednjeg preuzimanja.' : 'Nema mehaničarskih zapisa.') +
          '</p>';
          return;
        }
        var invMap = {};
        var vmd = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
        Object.keys(vmd).forEach(function (lid) { invMap[vmd[lid]] = lid; });
        Store.all("vehicles").then(function (vs) {
          var vmap = {};
          vs.forEach(function (v) { vmap[v.id] = v; });
          b.innerHTML = all.map(function (e) {
            var localId = invMap[e._sid];
            var v = localId && vmap[localId];
            var vLabel = v ? esc((v.make || '') + ' ' + (v.model || '')) : ('SID ' + e._sid);
            var data = {};
            try { data = typeof e.data === 'string' ? JSON.parse(e.data) : (e.data || {}); } catch (_) {}
            var desc = data.description || data.title || '';
            var km = data.mileage_km ? (' · ' + Number(data.mileage_km).toLocaleString() + ' km') : '';
            return '<div class="card" style="margin-bottom:8px;padding:10px 12px">' +
              '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
                '<div><span style="font-weight:600;font-size:.9rem">' + esc(e.type || '') + '</span>' +
                  '<span class="muted" style="font-size:.78rem;margin-left:6px">· ' + esc(vLabel) + '</span></div>' +
                '<span class="muted" style="font-size:.75rem">' + esc((e.event_date || '').slice(0, 10)) + '</span>' +
              '</div>' +
              (desc ? '<p style="margin:.3rem 0 0;font-size:.82rem;color:#cbd5e1">' + esc(desc) + '</p>' : '') +
              (km ? '<p style="margin:.2rem 0 0;font-size:.78rem;color:#34d399">' + km + '</p>' : '') +
            '</div>';
          }).join('');
        });
      }).catch(function (e) {
        var b = el("feed_body");
        if (b) b.innerHTML = '<p class="empty">Greška: ' + esc((e && e.message) || 'nepoznata greška') + '</p>';
      });
    },

    hubAddNote: function (sid) {
      if (!hubConnected()) { toast("Nisi povezan sa AU Core-om."); return; }
      var inp = document.getElementById("hub_note_input");
      var vis = document.getElementById("hub_note_vis");
      if (!inp || !inp.value.trim()) { toast("Unesi tekst beleške."); return; }
      AUCore.apiCall("POST", "/vehicles/" + sid + "/notes", { content: inp.value.trim(), visibility: vis ? vis.value : "owner" })
        .then(function (r) {
          if (r.id) { inp.value = ""; DR.loadNotes(sid); toast("Beleška sačuvana."); }
          else toast("Greška: " + (r.error || "nepoznato"));
        })
        .catch(function (e) { toast((e && e.message) || "Greška."); });
    },

    hubDeleteNote: function (sid, nid) {
      if (!hubConnected()) return;
      AUCore.apiCall("DELETE", "/vehicles/" + sid + "/notes/" + nid)
        .then(function (r) {
          if (r.ok) { DR.loadNotes(sid); toast("Beleška obrisana."); }
          else toast("Greška: " + (r.error || "nepoznato"));
        })
        .catch(function (e) { toast((e && e.message) || "Greška."); });
    },

    loadTimeline: function (vid) {
      var TL_ICONS = {
        service: '🔧', oil_change: '🛢️', tire_change: '🔄', tire_rotation: '🔁',
        inspection: '📋', registration: '📄', insurance: '🛡️', repair: '🔩',
        fuel: '⛽', mileage: '📍', note: '📝', initial: '🏁', work_order: '📃',
        estimate: '💼', other: '❓',
        expense_fuel: '⛽', expense_tires: '🔄', expense_bodywork: '🚗',
        expense_registration: '📄', expense_insurance: '🛡️',
        expense_decorative: '✨', expense_other: '💳'
      };
      var TL_LABELS = {
        service: 'Servis', oil_change: 'Zamena ulja', tire_change: 'Zamena guma',
        tire_rotation: 'Rotacija guma', inspection: 'Tehnički pregled',
        registration: 'Registracija', insurance: 'Osiguranje', repair: 'Popravka',
        fuel: 'Gorivo', mileage: 'Kilometraža', note: 'Beleška', initial: 'Početno stanje',
        work_order: 'Radni nalog', estimate: 'Predračun', other: 'Ostalo',
        expense_fuel: 'Gorivo', expense_tires: 'Gume', expense_bodywork: 'Limar/boja',
        expense_registration: 'Registracija', expense_insurance: 'Osiguranje',
        expense_decorative: 'Sitnice', expense_other: 'Trošak'
      };
      if (!vid) {
        var b = el('tl_body'); if (b) b.innerHTML = '<p class="muted" style="text-align:center;padding:40px">Odaberi vozilo.</p>';
        return;
      }
      Store.getAll("events").then(function (all) {
        var events = all.filter(function (e) { return String(e.vehicle_id) === String(vid); });
        events.sort(function (a, b) { return (b.date || b.created_at || '').localeCompare(a.date || a.created_at || ''); });
        var b = el('tl_body');
        if (!b) return;
        if (!events.length) {
          b.innerHTML = '<div class="empty" style="padding:60px 0"><div class="ei">📭</div><p>Još nema događaja.</p></div>';
          return;
        }
        // Grupišemo po godini
        var byYear = {};
        events.forEach(function (e) {
          var y = (e.date || e.created_at || '').slice(0, 4) || '—';
          if (!byYear[y]) byYear[y] = [];
          byYear[y].push(e);
        });
        var html = '<div style="position:relative;padding:0 0 16px">';
        Object.keys(byYear).sort(function (a, b) { return b.localeCompare(a); }).forEach(function (year) {
          html += '<div style="font-size:.78rem;font-weight:700;color:#64748b;letter-spacing:.08em;padding:20px 0 8px;text-transform:uppercase">' + year + '</div>';
          html += '<div style="border-left:2px solid rgba(255,255,255,.12);margin-left:18px;padding-left:0">';
          byYear[year].forEach(function (e) {
            var icon  = TL_ICONS[e.type] || '❓';
            var label = TL_LABELS[e.type] || e.type;
            var date  = (e.date || (e.created_at || '').slice(0, 10));
            var km    = e.mileage_km ? e.mileage_km.toLocaleString('sr-RS') + ' km' : '';
            var desc  = e.description || (e.subtype ? e.subtype.replace(/_/g, ' ') : '');
            var cost  = e.cost && e.cost.total ? (e.cost.total + ' ' + (e.cost.currency || 'RSD')) : '';
            var retroTag = e.retroactive ? '<span style="font-size:.7rem;color:#94a3b8;background:rgba(255,255,255,.06);border-radius:4px;padding:1px 5px;margin-left:6px">retro</span>' : '';
            html += '<div style="display:flex;gap:10px;margin-bottom:12px">' +
              '<div style="flex-shrink:0;width:36px;height:36px;background:rgba(255,255,255,.07);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin-left:-19px;border:2px solid var(--bg, #0c1117)">' + icon + '</div>' +
              '<div style="flex:1;background:var(--surface,#111520);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px">' +
                '<div style="font-weight:600;font-size:.9rem">' + esc(label) + retroTag + '</div>' +
                '<div style="font-size:.78rem;color:#64748b;margin-top:2px">' +
                  (date ? esc(date) : '') +
                  (km ? '<span style="margin-left:8px">• ' + km + '</span>' : '') +
                  (cost ? '<span style="margin-left:8px;color:#4ade80">• ' + esc(cost) + '</span>' : '') +
                '</div>' +
                (desc ? '<div style="font-size:.83rem;color:#94a3b8;margin-top:4px;white-space:pre-line">' + esc(desc) + '</div>' : '') +
              '</div>' +
            '</div>';
          });
          html += '</div>';
        });
        html += '</div>';
        b.innerHTML = html;
      }).catch(function () {
        var b = el('tl_body'); if (b) b.innerHTML = '<p class="muted" style="text-align:center;padding:40px">Greška pri učitavanju.</p>';
      });
    },

    loadVehicleForEdit: function (vid) {
      if (!vid || !window.AUCore) {
        var f = el('hve_form'); var l = el('hve_loading');
        if (l) l.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Nisi prijavljen/a na AU Core.</p>';
        return;
      }
      AUCore.apiCall('GET', '/vehicles/' + vid).then(function (data) {
        var v = data.vehicle || data;
        var setV = function (id, val) { var i = el(id); if (i) i.value = val || ''; };
        setV('hve_make',  v.make);
        setV('hve_model', v.model);
        setV('hve_year',  v.year);
        setV('hve_plate', v.plate);
        setV('hve_vin',   v.vin);
        var loading = el('hve_loading'); if (loading) loading.style.display = 'none';
        var form = el('hve_form'); if (form) form.style.display = '';
      }).catch(function () {
        var l = el('hve_loading');
        if (l) l.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Greška pri učitavanju vozila.</p>';
      });
    },

    exportExpensesCSV: function () {
      var EXP_TYPES = ["expense_fuel","expense_tires","expense_bodywork",
        "expense_registration","expense_insurance","expense_decorative","expense_other"];
      var EXP_LABELS = {
        expense_fuel: "Gorivo", expense_tires: "Gume", expense_bodywork: "Limar/boja",
        expense_registration: "Registracija", expense_insurance: "Osiguranje",
        expense_decorative: "Sitnice", expense_other: "Ostalo"
      };
      Store.getAll("vehicles").then(function (vehicles) {
        var vmap = {};
        vehicles.forEach(function (v) { vmap[v.id] = (v.make || "") + " " + (v.model || "") + (v.year ? " " + v.year : ""); });
        return Store.getAll("events").then(function (events) {
          var rows = events.filter(function (e) { return EXP_TYPES.indexOf(e.type) !== -1; });
          rows.sort(function (a, b) { return (b.date || b.created_at || "").localeCompare(a.date || a.created_at || ""); });
          var header = ["Datum", "Vozilo", "Kategorija", "Iznos", "Valuta", "Bez računa", "Napomena"];
          var lines = [header.join(";")].concat(rows.map(function (e) {
            var cost = e.cost || {};
            var q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; };
            return [
              q(e.date || (e.created_at || "").slice(0, 10)),
              q(vmap[e.vehicle_id] || e.vehicle_id || ""),
              q(EXP_LABELS[e.type] || e.type),
              q(cost.total != null ? cost.total : ""),
              q(cost.currency || ""),
              q(cost.informal ? "Da" : ""),
              q(e.description || "")
            ].join(";");
          }));
          var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "troskovi-" + new Date().toISOString().slice(0, 10) + ".csv";
          a.click();
          URL.revokeObjectURL(a.href);
        });
      });
    },

    showHubRegister: function () {
      var card = el("aucoreCard");
      if (card) card.innerHTML = aucoreCardHTML("register");
    },

    showHubLogin: function () {
      var card = el("aucoreCard");
      if (card) card.innerHTML = aucoreCardHTML("login");
    },

    hubRegister: function () {
      if (!window.AUCore) return;
      var name  = val("hub_name");
      var email = val("hub_email");
      var pass  = val("hub_pass");
      var errEl = el("hubRegErr");
      if (!name || !email || !pass) { if (errEl) errEl.textContent = "Sva polja su obavezna."; return; }
      if (pass.length < 6) { if (errEl) errEl.textContent = "Lozinka mora imati najmanje 6 karaktera."; return; }
      if (errEl) errEl.textContent = "";

      AUCore.apiCall("POST", "/auth/register", { name: name, email: email, password: pass })
        .then(function () {
          // svi nalozi su odmah aktivni — auto-login
          return AUCore.apiCall("POST", "/auth/login", { email: email, password: pass })
            .then(function (lr) {
              AUCore.setSession(lr.session);
              if (lr.user) localStorage.setItem("aucore_user", JSON.stringify(lr.user));
              toast("AU Core: prijavljen kao " + (lr.user ? lr.user.name : name));
              render("settings");
              pollNotifications();
            });
        })
        .catch(function (e) {
          var msg = e.status === 409 ? "Email već postoji." : (e.message || "Greška pri registraciji.");
          if (errEl) errEl.textContent = msg;
        });
    },

    hubLogout: function () {
      if (!window.AUCore) return;
      AUCore.setSession(null);
      localStorage.removeItem(HUB_MAP_KEY);
      localStorage.removeItem("aucore_last_sync");
      localStorage.removeItem("aucore_user");
      var bellBtn = el("bellBtn"); if (bellBtn) bellBtn.hidden = true;
      var bellCount = el("bellCount"); if (bellCount) bellCount.hidden = true;
      toast("Odjavljeno.");
      render("settings");
    },

    saleSummaryPdf: function (vid) {
      if (!window.PDFEngine) { toast("PDF engine nije učitan."); return; }
      var profile = Store.settings.get("profile", {});
      var lang = Store.settings.get("lang", "sr");
      Store.get("vehicles", vid).then(function (v) {
        if (!v) { toast("Vozilo nije pronađeno."); return; }
        Store.all("events").then(function (allEvents) {
          var events = allEvents.filter(function (e) { return e.vehicle_id === vid; });
          try {
            var doc = PDFEngine.buildSaleSummary({ vehicle: v, events: events, profile: profile, trade: v.trade, lang: lang });
            var fname = [v.make, v.model, v.year, "Sazetek"].filter(Boolean).join("_").replace(/\s+/g,"_") + ".pdf";
            doc.save(fname);
          } catch (e) { toast("Greška PDF: " + e.message); }
        });
      });
    },

    copyPublicUrl: function (url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast("Link kopiran."); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.top = "-999px";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast("Link kopiran.");
      }
    },

    submitEmailSignup: function () {
      var email = (el("su_email") && el("su_email").value || "").trim();
      var name  = (el("su_name")  && el("su_name").value  || "").trim();
      var phone = (el("su_phone") && el("su_phone").value || "").trim();
      var errEl = el("suErr");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errEl) errEl.textContent = "Unesi ispravan email."; return;
      }
      if (errEl) errEl.textContent = "";
      var btn = document.querySelector("#emailSignupCard .btn-primary");
      if (btn) { btn.disabled = true; btn.textContent = "Šalje se..."; }

      AUCore.getPlatformUrl().then(function (hubUrl) {
        if (!hubUrl) throw new Error("Server nije dostupan");
        return fetch(hubUrl + "/accounts/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, name: name, phone: phone })
        });
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
      }).then(function (res) {
        if (res.ok || res.status === 409) {
          localStorage.setItem(EMAIL_SIGNUP_KEY, "done");
          var card = el("emailSignupCard");
          if (card) card.innerHTML = '<h2>AutoUniverse obaveštenja</h2>' +
            '<p class="lic-ok" style="font-size:.9rem">✓ Proverite email za potvrdu.</p>';
        } else {
          throw new Error(res.d.error || "Greška");
        }
      }).catch(function (e) {
        console.warn("[signup]", e.message);
        localStorage.setItem(EMAIL_SIGNUP_KEY, "error");
        if (errEl) errEl.textContent = e.message || "Greška — pokušaj ponovo.";
        if (btn) { btn.disabled = false; btn.textContent = "Prijavi me"; }
      });
    },

    onSellStatusChange: function () {
      var box = el("saleFields"); if (box) box.hidden = el("sv_status").value !== "sold";
    },

    saveSellVehicle: function () {
      var vid = App._sellVehicleId; if (!vid) { toast(t("d.need_vehicle")); return; }
      Store.get("vehicles", vid).then(function (v) {
        if (!v) return;
        var newStatus = el("sv_status") ? el("sv_status").value : v.status;
        v.status = newStatus;
        if (newStatus === "sold") {
          var sellPrice = val("sv_sell_price");
          var sellCur   = el("sv_sell_cur") ? el("sv_sell_cur").value : "EUR";
          var sellDate  = val("sv_sell_date") || todayISO();
          v.trade = v.trade || { purchase: { date: null, price: null, currency: "EUR", source: "individual", notes: "" } };
          v.trade.sale = { date: sellDate, price: sellPrice ? parseFloat(sellPrice) : null, currency: sellCur };
          // log sale event
          var saleEv = Models.createEvent({
            vehicle_id: vid, type: "note", app: "driver", source: "owner",
            title: "Vozilo prodato" + (sellPrice ? " — " + Models.formatAmount(parseFloat(sellPrice), sellCur) : ""),
            date: sellDate
          });
          Store.put("events", saleEv);

          // FEEDBACK #17 — obavesti mehaničare na AU Core (tiho, fire-and-forget)
          if (hubConnected()) {
            var _vmap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
            var sid = _vmap[vid];
            if (sid) {
              AUCore.apiCall("POST", "/vehicles/" + sid + "/transfer", { sold_at: sellDate })
                .then(function (r) {
                  if (r && r.mechanics_notified > 0) {
                    toast("Mehaničari obavešteni (" + r.mechanics_notified + ")");
                  }
                }).catch(function () {});
            }
          }
        }
        Store.put("vehicles", v).then(function () {
          toast(t("common.saved")); App.activeVehicleId = vid; render("vehicle");
        });
      });
    },

    importHubRecord: function () {
      var data = App._hubImportData;
      if (!data || !data.event) { toast("Nema podataka za uvoz."); return; }
      var ev = data.event, veh = data.vehicle || {};
      Store.all("vehicles").then(function (vehicles) {
        // Pokušaj VIN matching, pa plate matching, pa first vehicle
        var matched = null;
        if (veh.vin) matched = vehicles.filter(function (v) { return v.vin && v.vin === veh.vin; })[0] || null;
        if (!matched && veh.plate) matched = vehicles.filter(function (v) { return v.plate && v.plate.toLowerCase() === veh.plate.toLowerCase(); })[0] || null;
        if (!matched) matched = vehicles[0] || null;
        var vid = matched ? matched.id : App.activeVehicleId;
        if (!vid) { toast(t("d.need_vehicle")); return; }
        var pmChk = document.getElementById("pm_public");
        var publicFlag = pmChk ? pmChk.checked : (ev.public_on_marketplace !== false);
        var newEv = Models.createEvent({
          vehicle_id:           vid,
          type:                 ev.type || "service",
          title:                ev.title || "",
          description:          ev.description || "",
          date:                 ev.date || todayISO(),
          mileage_km:           ev.mileage_km != null ? ev.mileage_km : null,
          items:                (ev.items || []).map(function (it) { return Models.createItem({ name: it.name, qty: it.qty }); }),
          source:               "mechanic",
          mechanic_name:        data.mechanic_name || null,
          public_on_marketplace: publicFlag,
          app:                  "driver",
          retroactive:          false
        });
        var ops = [Store.put("events", newEv)];
        // next_service → automatski podsetnik
        if (ev.next_service) {
          ops.push(Store.put("reminders", Models.createReminder({
            vehicle_id: vid,
            title: "Sledeći servis (" + (ev.title || ev.type) + ")",
            due_date:        ev.next_service.date || null,
            due_mileage_km:  ev.next_service.km  || null
          })));
        }
        Promise.all(ops).then(function () {
          App._hubImportData = null;
          App.activeVehicleId = vid;
          toast(t("common.saved") + " — uvezeno od mehaničara");
          render("vehicle");
        });
      });
    },

    /* ----- Autopijaca akcije ----- */

    plPickPhotos: function (input) {
      var files = Array.from(input.files || []);
      if (!files.length) return;
      var existing = App._plPhotos || [];
      var remaining = 3 - existing.length;
      if (remaining <= 0) { toast("Maksimalno 3 fotografije."); return; }
      files = files.slice(0, remaining);
      Photos.compressMany(files).then(function (arr) {
        App._plPhotos = (existing || []).concat(arr).slice(0, 3);
        var strip = el("pl_photo_strip");
        if (strip) {
          strip.innerHTML = App._plPhotos.map(function (src, i) {
            return '<div style="position:relative;display:inline-block">' +
              '<img src="' + src + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #334">' +
              '<button onclick="DR.plDelPhoto(' + i + ')" style="position:absolute;top:-4px;right:-4px;background:#c0392b;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:18px;text-align:center">✕</button>' +
            '</div>';
          }).join("");
        }
      });
    },

    plDelPhoto: function (idx) {
      App._plPhotos = (App._plPhotos || []).filter(function (_, i) { return i !== idx; });
      var strip = el("pl_photo_strip");
      if (strip) {
        strip.innerHTML = (App._plPhotos || []).map(function (src, i) {
          return '<div style="position:relative;display:inline-block">' +
            '<img src="' + src + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #334">' +
            '<button onclick="DR.plDelPhoto(' + i + ')" style="position:absolute;top:-4px;right:-4px;background:#c0392b;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:18px;text-align:center">✕</button>' +
          '</div>';
        }).join("");
      }
    },

    publishListing: function () {
      var vid = App._publishVehicleId;
      if (!vid || !window.Autopijaca) return;
      Store.get("vehicles", vid).then(function (v) {
        if (!v) return;
        var price = parseFloat(val("pl_price"));
        if (!price) { toast("Unesite cenu."); return; }
        var profile = Store.settings.get("profile", {}) || {};
        var phone = val("pl_phone") || profile.phone || "";
        var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
        var serverId = vehicleMap[vid];
        var payload = {
          make:           v.make,
          model:          v.model,
          year:           v.year || null,
          mileage_km:     v.mileage_km || null,
          fuel:           (v.engine && v.engine.fuel) || null,
          gearbox:        (v.engine && v.engine.gearbox) || null,
          vin:            v.vin || null,
          price:          price,
          currency:       val("pl_cur") || "EUR",
          description:    val("pl_desc") || null,
          city:           val("pl_city") || null,
          contact_name:   profile.name || v.make + " " + v.model,
          contact_phone:  phone,
          contact_method: val("pl_contact") || "phone_call",
          history_token:  null
        };
        if (!payload.contact_phone) { toast("Unesite telefon za kontakt."); return; }

        var photos = App._plPhotos || [];
        var btn = document.querySelector('.btn-primary[onclick="DR.publishListing()"]');
        if (btn) { btn.disabled = true; btn.textContent = "Objavljujem..."; }

        var uploadAll = photos.length
          ? Promise.all(photos.map(function (dataUrl) { return Autopijaca.uploadPhoto(dataUrl).then(function (r) { return r.url; }); }))
          : Promise.resolve([]);

        var doPublish = function (photoUrls) {
          payload.photos = photoUrls;
          // Ako je vozilo synkovano na AU Core → dodaj public dosije URL
          var publishAndSend = function () {
            Autopijaca.publish(vid, payload).then(function (data) {
              App._plPhotos = [];
              toast("Oglas objavljen! #" + data.id);
              render("publish_listing", { id: vid });
            }).catch(function (e) {
              if (btn) { btn.disabled = false; btn.textContent = t("d.publish_on_autopijaca"); }
              toast("Greška: " + e.message);
            });
          };

          if (serverId && hubConnected()) {
            AUCore.getPlatformUrl().then(function (hubUrl) {
              if (hubUrl) payload.history_token = hubUrl.replace(/\/$/, '') + '/public/v/' + serverId;
              publishAndSend();
            }).catch(publishAndSend);
          } else {
            publishAndSend();
          }
        };

        uploadAll.then(doPublish).catch(function (e) {
          if (btn) { btn.disabled = false; btn.textContent = t("d.publish_on_autopijaca"); }
          toast("Greška pri upload slike: " + e.message);
        });
      });
    },

    loadMyListingMessages: function (vid) {
      if (!window.Autopijaca) return;
      Autopijaca.getMyListing(vid).then(function (data) {
        var box = document.getElementById("listing_messages_box");
        if (!box) return;
        if (!data || !data.messages || !data.messages.length) {
          box.innerHTML = '<div class="card"><p class="empty">' + t("d.listing_no_messages") + '</p></div>';
          return;
        }
        box.innerHTML = '<div class="card"><h2>' + t("d.listing_messages") + '</h2>' +
          data.messages.map(function (m) {
            return '<div style="border-bottom:1px solid var(--border);padding:8px 0">' +
              '<b>' + esc(m.buyer_name) + '</b>' +
              (m.buyer_phone ? ' · <a href="tel:' + esc(m.buyer_phone) + '">' + esc(m.buyer_phone) + '</a>' : '') +
              '<p style="margin-top:4px;font-size:.88rem">' + esc(m.content) + '</p>' +
              '<p class="muted" style="font-size:.78rem">' + (m.created_at || "").slice(0, 16).replace("T", " ") + '</p>' +
            '</div>';
          }).join("") +
        '</div>';
      }).catch(function (e) { toast("Greška: " + e.message); });
    },

    deleteMyListing: function (vid) {
      if (!window.Autopijaca) return;
      if (!confirm("Obrisati oglas?")) return;
      Autopijaca.deleteListing(vid).then(function () {
        toast("Oglas obrisan.");
        render("publish_listing", { id: vid });
      }).catch(function (e) { toast("Greška: " + e.message); });
    },

    publishViaHub: function () {
      var vid    = App._hubSellVehicleId;
      var hubId  = App._hubSellHubId;
      if (!vid || !hubId || !window.AUCore || !AUCore.getSession()) {
        toast("Nisi prijavljen na AU Core. Poveži se u Podešavanjima.");
        return;
      }
      var price = parseFloat(document.getElementById("hs_price") && document.getElementById("hs_price").value) || 0;
      var contactName  = (document.getElementById("hs_contact_name") && document.getElementById("hs_contact_name").value) || "";
      var contactPhone = (document.getElementById("hs_contact_phone") && document.getElementById("hs_contact_phone").value) || "";
      var desc = (document.getElementById("hs_desc") && document.getElementById("hs_desc").value) || "";
      if (!price)       { toast("Unesite cijenu."); return; }
      if (!contactName) { toast("Unesite ime kontakta."); return; }
      if (!contactPhone){ toast("Unesite telefon."); return; }
      var btn = document.querySelector('.btn-primary[onclick="DR.publishViaHub()"]');
      if (btn) { btn.disabled = true; btn.textContent = "Objavljujem..."; }
      AUCore.apiCall("POST", "/vehicles/" + hubId + "/autopijaca", {
        price: price,
        currency: "EUR",
        description: desc || undefined,
        contact_name: contactName,
        contact_phone: contactPhone
      }).then(function (data) {
        toast("Oglas objavljen! ID: " + data.listing_id);
        DR.go("vehicle");
      }).catch(function (e) {
        if (btn) { btn.disabled = false; btn.textContent = "Objavi oglas"; }
        toast("Greška: " + e.message);
      });
    },

    setExpensesVehicle: function (id) { App.expensesVehicleId = id; render("expenses"); },
    setExpensesPeriod: function (p) { App.expensesPeriod = p; render("expenses"); },

    onEventTypeChange: function (sel) {
      var v = sel.value;
      var tf = document.getElementById("tireFields");
      if (tf) tf.hidden = v !== "tires";
      var bf = document.getElementById("batteryFields");
      if (bf) bf.hidden = v !== "battery";
      var of_ = document.getElementById("oilFields");
      if (of_) of_.hidden = v !== "oil_change";
      var bkf = document.getElementById("brakeFields");
      if (bkf) bkf.hidden = v !== "brake_service";
      var blf = document.getElementById("beltFields");
      if (blf) blf.hidden = v !== "belt_service";
      var clf = document.getElementById("coolantFields");
      if (clf) clf.hidden = v !== "coolant_service";
    },

    onExpTypeChange: function (sel) {
      var ff = document.getElementById("fuelFields");
      if (ff) ff.hidden = sel.value !== "expense_fuel";
    },

    calcFuelTotal: function () {
      var liters = parseFloat(document.getElementById("exp_liters") && document.getElementById("exp_liters").value) || 0;
      var ppl    = parseFloat(document.getElementById("exp_ppl")    && document.getElementById("exp_ppl").value)    || 0;
      if (liters && ppl) {
        var amtEl = document.getElementById("exp_amount");
        if (amtEl) amtEl.value = (liters * ppl).toFixed(0);
      }
    },

    saveExpense: function () {
      var base = App._editingExpense || Models.createEvent({ app: "driver", source: "owner" });
      base.vehicle_id = el("exp_vehicle") ? el("exp_vehicle").value : null;
      base.type = el("exp_type") ? el("exp_type").value : "expense_other";
      base.title = val("exp_title");
      base.date = val("exp_date") || todayISO();
      base.description = val("exp_desc") || "";
      base.mileage_km = val("exp_km") ? parseInt(val("exp_km"), 10) : null;
      var liters = parseFloat(val("exp_liters")) || null;
      var ppl    = parseFloat(val("exp_ppl"))    || null;
      base.fuel_liters = liters;
      base.fuel_ppl    = ppl;
      var amount = parseFloat(val("exp_amount")) || 0;
      var currency = el("exp_currency") ? el("exp_currency").value : "RSD";
      base.cost = Models.createCost({ total: amount, currency: currency, informal: checked("exp_informal") });
      if (!base.vehicle_id) { toast(t("d.need_vehicle")); return; }
      Store.put("events", base).then(function () { toast(t("common.saved")); render("expenses"); });
    },
    deleteExpense: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("events", id).then(function () { render("expenses"); });
    },

    hubSync: function () {
      if (!window.AUCore || !hubConnected()) { toast("Nisi povezan sa AU Core-om."); return; }
      var statusEl = el("hubSyncStatus");
      if (statusEl) statusEl.textContent = "Sinkronizujem...";

      var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
      var lastPull   = localStorage.getItem("aucore_driver_last_pull") || null;

      Store.all("vehicles").then(function (vehicles) {
        // Korak 1 — batch sync vozila (zamjena za one-by-one loop)
        var existingSharedIds = {};
        vehicles.forEach(function (v) { if (v.hub_vehicle_id) existingSharedIds[v.hub_vehicle_id] = v.id; });

        var payload = vehicles
          .filter(function (v) { return !v.read_only; })  // ne šalji tuđa (shared) vozila
          .map(function (v) {
            return {
              local_id:   String(v.id),
              server_id:  vehicleMap[v.id] || null,
              make:       v.make  || "?",
              model:      v.model || "?",
              year:       v.year  ? Number(v.year) : null,
              plate:      v.plate || null,
              vin:        v.vin   || null,
              status:     v.status || "active",
              updated_at: v.updated_at || v.created_at || new Date().toISOString(),
            };
          });

        return AUCore.apiCall("POST", "/vehicles/sync", { vehicles: payload, last_pull: lastPull })
          .then(function (syncRes) {
            (syncRes.merged || []).forEach(function (m) {
              if (m.local_id && m.server_id && m.action !== "rejected") {
                vehicleMap[m.local_id] = m.server_id;
              }
            });
            localStorage.setItem(HUB_MAP_KEY, JSON.stringify(vehicleMap));
            localStorage.setItem("aucore_driver_last_pull", syncRes.sync_at || new Date().toISOString());

            // Korak 1.5 — pull shared vozila (podeljena sa mnom via grant)
            return AUCore.apiCall("GET", "/vehicles").then(function (vRes) {
              var shared = (vRes && vRes.shared) || [];
              var now = new Date().toISOString();
              var importOps = shared.map(function (sv) {
                var localId = existingSharedIds[sv.id] || ("shared_" + sv.id);
                vehicleMap[localId] = sv.id;
                var record = {
                  id: localId,
                  make: sv.make || "", model: sv.model || "",
                  year: sv.year || null, plate: sv.plate || null, vin: sv.vin || "",
                  status: sv.status || "active",
                  hub_vehicle_id: sv.id,
                  hub_shared_role: sv.my_role || "read",
                  read_only: true,
                  category: "M1", type_label: "",
                  engine: { code: "", displacement_ccm: null, power_kw: null, fuel: "", gearbox: "" },
                  service_data: { oil_type: "", oil_qty_l: null, oil_filter: "", air_filter: "",
                    fuel_filter: "", cabin_filter: "", brake_notes: "", battery: "", custom_fields: [] },
                  tires: { size_front: "", size_rear: "", current_set: "" },
                  registered_owner: "", trade_mode: false, trade: null, photos: [], notes: "",
                  created_at: now, updated_at: sv.updated_at || now,
                };
                return Store.put("vehicles", record);
              });
              localStorage.setItem(HUB_MAP_KEY, JSON.stringify(vehicleMap));
              return Promise.all(importOps);
            }).catch(function () {}).then(function () { return Store.all("events"); });
          });
      })
      .then(function (events) {
        var unsynced = events.filter(function (e) { return !e.synced_at; });
        var hasSyncedVehicles = Object.values(vehicleMap).filter(Boolean).length > 0;
        if (!unsynced.length && !hasSyncedVehicles) {
          if (statusEl) statusEl.textContent = "";
          toast("Nema šta da se sinkronizuje.");
          return;
        }

        // Korak 2 — grupiši po server vehicle ID + invertiraj mapu za pull
        var byServer = {};
        var serverToLocal = {};
        Object.keys(vehicleMap).forEach(function (lid) {
          var sid = vehicleMap[lid];
          if (sid) serverToLocal[sid] = lid;
        });
        var eventsLastPull = localStorage.getItem("aucore_driver_events_last_pull") || null;

        unsynced.forEach(function (e) {
          var sid = vehicleMap[e.vehicle_id];
          if (!sid) return;
          if (!byServer[sid]) byServer[sid] = [];
          byServer[sid].push({
            type: e.type || "other",
            data: {
              title: e.title || null,
              description: e.description || null,
              mileage_km: e.mileage_km || null,
              source: e.source || null,
              mechanic_name: e.mechanic_name || null,
              public_on_marketplace: e.public_on_marketplace !== false,
              photos_count: (e.photos || []).length
            },
            event_date: e.date || new Date().toISOString(),
            retroactive: !!e.retroactive,
            source: e.source || "app",
            app: "driver",
            local_id: e.id
          });
        });

        // Svi server ID-evi koji imaju sync-ovano vozilo (za pull čak i bez push-a)
        var allServerIds = Object.values(vehicleMap).filter(Boolean);
        allServerIds.forEach(function (sid) {
          if (!byServer[sid]) byServer[sid] = [];
        });

        // Korak 3 — bidirectional: push lokalne evente + pull mehaničareve
        var existingHubIds = {};
        events.forEach(function (e) {
          if (e.hub_event_id) existingHubIds[e.hub_event_id] = true;
        });

        var syncOps = Object.keys(byServer).map(function (sid) {
          return AUCore.syncEvents(Number(sid), byServer[sid], eventsLastPull)
            .then(function (res) {
              var synced = res.synced || [];
              var syncedIds = {};
              synced.forEach(function (s) { if (s.local_id && !s.error) syncedIds[s.local_id] = true; });
              var markOps = unsynced
                .filter(function (e) { return syncedIds[e.id]; })
                .map(function (e) {
                  e.synced_at = new Date().toISOString();
                  return Store.put("events", e);
                });

              // Pull — importuj from_server evente koji nisu lokalni
              var localVehicleId = serverToLocal[sid];
              var importOps = (res.from_server || [])
                .filter(function (se) { return !existingHubIds[se.id] && se.app !== "driver"; })
                .map(function (se) {
                  var parsedData = {};
                  try { parsedData = typeof se.data === "string" ? JSON.parse(se.data) : (se.data || {}); } catch (_) {}
                  var importedEvent = {
                    id: "hub_" + se.id,
                    vehicle_id: localVehicleId ? Number(localVehicleId) : null,
                    type: se.type || "other",
                    date: se.event_date || new Date().toISOString().slice(0, 10),
                    description: parsedData.description || parsedData.title || "",
                    mileage_km: parsedData.mileage_km || null,
                    mechanic_name: se.author_name || null,
                    source: se.source || "mechanic",
                    retroactive: !!se.retroactive,
                    hub_event_id: se.id,
                    synced_at: new Date().toISOString(),
                    app: se.app || "garage",
                    public_on_marketplace: parsedData.public_on_marketplace !== false,
                  };
                  existingHubIds[se.id] = true;
                  return Store.put("events", importedEvent);
                });

              return Promise.all(markOps.concat(importOps))
                .then(function () { return { pushed: synced.length, pulled: importOps.length, syncAt: res.sync_at }; });
            }).catch(function () { return { pushed: 0, pulled: 0 }; });
        });

        return Promise.all(syncOps).then(function (results) {
          var evTotal  = results.reduce(function (s, r) { return s + (r.pushed || 0); }, 0);
          var pullTotal = results.reduce(function (s, r) { return s + (r.pulled || 0); }, 0);
          // Ažuriraj events last_pull timestamp
          var latestSync = results.map(function (r) { return r.syncAt || ""; }).sort().pop();
          if (latestSync) localStorage.setItem("aucore_driver_events_last_pull", latestSync);

          // Korak 4 — sync podsetnici bez hub_rid
          return Store.all("reminders").then(function (reminders) {
            var unsynced = reminders.filter(function (r) { return !r.hub_rid && r.vehicle_id; });
            if (!unsynced.length) {
              localStorage.setItem("aucore_last_sync", new Date().toISOString());
              if (statusEl) statusEl.textContent = "";
              var msg = "Sync završen";
              if (evTotal) msg += ": " + evTotal + " poslano";
              if (pullTotal) msg += (evTotal ? ", " : ": ") + pullTotal + " primljeno";
              toast(msg + ".");
              render("settings");
              return;
            }

            var byServerR = {};
            unsynced.forEach(function (r) {
              var sid = vehicleMap[r.vehicle_id];
              if (!sid) return;
              if (!byServerR[sid]) byServerR[sid] = [];
              byServerR[sid].push({
                title: r.title, due_date: r.due_date || null,
                due_mileage_km: r.due_mileage_km || null,
                done: !!r.done, local_id: r.id
              });
            });

            var remOps = Object.keys(byServerR).map(function (sid) {
              return AUCore.apiCall("POST", "/vehicles/" + sid + "/reminders/batch", { reminders: byServerR[sid] })
                .then(function (res) {
                  var synced = res.synced || [];
                  var ridMap = {};
                  synced.forEach(function (s) { if (s.local_id && !s.error) ridMap[s.local_id] = s.id; });
                  return Promise.all(unsynced
                    .filter(function (r) { return ridMap[r.id]; })
                    .map(function (r) { r.hub_rid = ridMap[r.id]; return Store.put("reminders", r); })
                  ).then(function () { return synced.length; });
                }).catch(function () { return 0; });
            });

            return Promise.all(remOps).then(function (remCounts) {
              var remTotal = remCounts.reduce(function (s, n) { return s + n; }, 0);
              localStorage.setItem("aucore_last_sync", new Date().toISOString());
              if (statusEl) statusEl.textContent = "";
              var parts = [];
              if (evTotal)   parts.push(evTotal   + " poslano");
              if (pullTotal) parts.push(pullTotal  + " primljeno");
              if (remTotal)  parts.push(remTotal   + " podsetnika");
              toast("Sync završen" + (parts.length ? ": " + parts.join(", ") : "") + ".");
              render("settings");
            });
          });
        });
      })
      .catch(function (e) {
        if (statusEl) statusEl.textContent = "";
        toast("Sync greška: " + (e.message || "nepoznata greška"));
      });
    },

    /* ----- Kalkulator registracije ----- */
    calcReg: function () {
      var ccm  = parseFloat(el("rc_ccm")  && el("rc_ccm").value)   || 0;
      var kw   = parseFloat(el("rc_kw")   && el("rc_kw").value)    || 0;
      var year = parseInt(el("rc_year")   && el("rc_year").value,   10) || 0;
      var fuel = el("rc_fuel")  ? el("rc_fuel").value  : "benzin";
      var euro = el("rc_euro")  ? el("rc_euro").value  : "euro5";
      var cat  = el("rc_cat")   ? el("rc_cat").value   : "M1";
      var res  = el("rc_result");
      var brkd = el("rc_breakdown");
      if (!res || !brkd) return;
      if (!ccm || !kw || !year) { res.style.display = "none"; return; }

      var age = 2026 - year;

      // Tehnički pregled (JKP Putevi Srbije, 2026)
      var teh = cat === "M1" ? 3700 : 4800;

      // Porez na upotrebu motornih vozila (Zakon o porezima na upotrebu RS)
      // Osnova po zapremini motora (ccm), tarife 2026
      var pBase = 0;
      if      (ccm <= 1150) pBase = 1910;
      else if (ccm <= 1300) pBase = 4200;
      else if (ccm <= 1600) pBase = 7500;
      else if (ccm <= 2000) pBase = 14500;
      else if (ccm <= 2500) pBase = 45000;
      else if (ccm <= 3000) pBase = 90000;
      else                  pBase = 180000;
      // Umanjenje po godinama starosti
      var ageFactor = 1.0;
      if      (age >= 21)            ageFactor = 0.15;
      else if (age >= 16)            ageFactor = 0.30;
      else if (age >= 11)            ageFactor = 0.50;
      else if (age >= 6)             ageFactor = 0.80;
      // Električna vozila oslobođena poreza na upotrebu
      var porez = fuel === "struja" ? 0 : Math.round(pBase * ageFactor);
      if (cat === "N1") porez = Math.round(porez * 1.20);

      // AO osiguranje (minimum za M1, bonus-malus stepen 4 — osnovni)
      var aoTiers = [
        { max: 40, p: 6500 }, { max: 55, p: 8500 }, { max: 66, p: 10500 },
        { max: 80, p: 12500 }, { max: 100, p: 15000 }, { max: 120, p: 18000 },
        { max: 150, p: 22000 }, { max: 200, p: 28000 }, { max: 9999, p: 35000 }
      ];
      var ao = (aoTiers.find(function(t) { return kw <= t.max; }) || { p: 35000 }).p;
      // Starost bonus na AO: >10 god -5%, >15 god -10%
      if (age > 15) ao = Math.round(ao * 0.90);
      else if (age > 10) ao = Math.round(ao * 0.95);

      // Ekološka naknada po Euro klasi
      var ekoMap = { electric: 0, euro6: 500, euro5: 700, euro4: 1000, euro3: 1500, euro2: 2500 };
      var eko = ekoMap[euro] !== undefined ? ekoMap[euro] : 700;

      // Fiksne takse: republička admin (MUP) + nalepnica
      var taksa = 1800 + 1490;

      var total = teh + porez + ao + eko + taksa;

      var porezNote = fuel === "struja" ? ' <span style="color:#059669;font-size:.8em">(oslobođeno)</span>' : '';
      brkd.innerHTML =
        '<table style="width:100%;font-size:.9rem;border-collapse:collapse">' +
          '<tr><td style="padding:6px 0">Tehnički pregled</td>' +
              '<td style="text-align:right;font-weight:600">' + teh.toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr><td style="padding:6px 0">Porez na upotrebu (ccm + starost)' + porezNote + '</td>' +
              '<td style="text-align:right;font-weight:600">' + porez.toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr><td style="padding:6px 0">AO osiguranje (procena, bonus 0)</td>' +
              '<td style="text-align:right;font-weight:600">' + ao.toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr><td style="padding:6px 0">Ekološka naknada (' + euro.toUpperCase() + ')</td>' +
              '<td style="text-align:right;font-weight:600">' + eko.toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr><td style="padding:6px 0">Admin. takse + nalepnica</td>' +
              '<td style="text-align:right;font-weight:600">' + taksa.toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr style="border-top:1px solid #e2e8f0"><td style="padding:8px 0"><b>UKUPNO (okvirno)</b></td>' +
              '<td style="text-align:right;font-weight:700;font-size:1.1rem">' + total.toLocaleString("sr") + ' RSD</td></tr>' +
        '</table>';
      res.style.display = "block";
    },

    resetCarCheck: function () {
      document.querySelectorAll('#app input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    },

    exportCarCheckPdf: function () {
      var sections = [
        { title: "Dokumenta", items: [
          "Saobraćajna dozvola — ime vlasnika, VIN, godište",
          "Knjižica vozila (servisna historija)",
          "Polisa osiguranja — do kad važi",
          "Registracija — važi li, do kad",
          "Ukoliko kredit: banka mora odobriti prodaju",
          "Nema upisane zabrane otuđenja (proveri MUP evidenciju)",
        ]},
        { title: "Karoserija", items: [
          "Proverite sve boje pod različitim kutovima (razlike = farbanje)",
          "Fugen (razmaci između vrata/haube/gepeka) — jednaki sa svih strana",
          "Tragovi rđe ispod gumenih lajsni i ispod vrata",
          "Stakla — pukotine, mjehurovi, neoriginalni UR kôd",
          "Hvatajte magneteom duž pragova i krila (špahtla ne privlači magnet)",
        ]},
        { title: "Motor i pogon", items: [
          "Nivo ulja — boja (crno=staro, mlečno=voda u ulju!)",
          "Nivo rashladne tečnosti — boja i nivo",
          "Tragovi curenja ispod automobila posle 10 min stajanja",
          "Dim iz auspuha: beli (voda) / plavi (ulje) / crni (benzin) = problem",
          "Motor hladnom — startovati, slušati klopotanje i šumove",
          "Preveriti broj motora — mora odgovarati saobraćajnoj",
        ]},
        { title: "Probna vožnja", items: [
          "Kočnice — auto ne sme da vuče u stranu",
          "Volan — ne sme da vibrira ili vuče",
          "Menjač — sve brzine ulaze glatko",
          "Sva svetla, grijanje, klima, elektropodizači",
          "ABS lampica, check engine — ništa ne sme svetleti",
          "Test kočenja na 60 km/h — ravno kočenje",
        ]},
        { title: "Cena i tržište", items: [
          "Uporedi sa Polovniautomobili.rs — ista godišnja/km/oprema",
          "Istorija cene — oglasi na KP/PA duže od 30 dana = pregovaraj",
          "Kalkuliši: reg + servis odmah + prvih 6 meseci troškova",
          "Ne plaćaj avans bez overe kod notara",
          "Kupoprodajni ugovor — obavezno u 2 primerka, overiti potpise",
        ]},
      ];

      var doc = new jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      var pw = doc.internal.pageSize.getWidth();
      var ph = doc.internal.pageSize.getHeight();
      var lm = 18, rm = 18, y = 20;
      var cw = pw - lm - rm;

      // Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.text("PREGLED VOZILA", lm, y);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      var now = new Date();
      var dateStr = now.getDate() + "." + (now.getMonth() + 1) + "." + now.getFullYear() + ".";
      doc.text("Datum: " + dateStr, pw - rm - doc.getTextWidth("Datum: " + dateStr), y);
      y += 6;
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.4);
      doc.line(lm, y, pw - rm, y);
      y += 8;

      // Vehicle info line (optional — from input fields if visible)
      var fVehicle = document.getElementById("cc_vehicle");
      var fNote = document.getElementById("cc_note");
      if (fVehicle && fVehicle.value.trim()) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Vozilo: " + fVehicle.value.trim(), lm, y);
        y += 5;
      }
      if (fNote && fNote.value.trim()) {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Napomena: " + fNote.value.trim(), lm, y);
        y += 5;
      }
      if ((fVehicle && fVehicle.value.trim()) || (fNote && fNote.value.trim())) y += 2;

      // Sections
      sections.forEach(function (sec, si) {
        var sectionEmojis = ["📄", "🔍", "🔧", "🚗", "💰"];
        if (y > ph - 50) { doc.addPage(); y = 20; }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setFillColor(241, 245, 246);
        doc.rect(lm, y - 4, cw, 7, "F");
        doc.text(sectionEmojis[si] + " " + sec.title, lm + 2, y + 0.5);
        y += 8;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);

        sec.items.forEach(function (item, i) {
          if (y > ph - 20) { doc.addPage(); y = 20; }
          var sectionKey = ["Dok", "Kar", "Mot", "Pro", "Cen"][si];
          var id = "chk_" + sectionKey + i;
          var checked = document.getElementById(id) && document.getElementById(id).checked;
          var mark = checked ? "✓" : "□";

          doc.setFont("Helvetica", checked ? "bold" : "normal");
          doc.setTextColor(checked ? 30 : 80, checked ? 100 : 80, checked ? 60 : 80);
          doc.text(mark + "  " + item, lm + 2, y);
          doc.setTextColor(0, 0, 0);
          y += 5.5;
        });
        y += 3;
      });

      // Signature block
      if (y > ph - 45) { doc.addPage(); y = 20; }
      y += 4;
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.4);
      doc.line(lm, y, pw - rm, y);
      y += 6;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Kupac:", lm, y);
      doc.text("Prodavac:", pw / 2 + 5, y);
      y += 14;
      doc.line(lm, y, lm + 65, y);
      doc.line(pw / 2 + 5, y, pw / 2 + 70, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("potpis / datum", lm, y);
      doc.text("potpis / datum", pw / 2 + 5, y);

      var fname = "pregled-vozila-" + dateStr.replace(/\./g, "") + ".pdf";
      if (navigator.canShare && navigator.share) {
        var blob = doc.output("blob");
        var file = new File([blob], fname, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "Pregled vozila" }).catch(function () { doc.save(fname); });
          return;
        }
      }
      doc.save(fname);
    },

    setHistMode: function (mode) {
      localStorage.setItem("dr_hist_mode", mode);
      render("history");
    },

    /* ----- Kalkulator potrošnje goriva ----- */
    calcFuel: function () {
      var cons  = parseFloat(el("fc_cons")  && el("fc_cons").value)  || 0;
      var km    = parseFloat(el("fc_km")    && el("fc_km").value)    || 0;
      var price = parseFloat(el("fc_price") && el("fc_price").value) || 0;
      var res   = el("fc_result");
      var brkd  = el("fc_breakdown");
      if (!res || !brkd) return;
      if (!cons || !km || !price) { res.style.display = "none"; return; }

      var litresMes  = (cons / 100) * km;
      var rsdMes     = litresMes * price;
      var litresGod  = litresMes * 12;
      var rsdGod     = rsdMes * 12;

      brkd.innerHTML =
        '<table style="width:100%;font-size:.9rem;border-collapse:collapse">' +
          '<tr><td style="padding:6px 0">Mesečno — litara</td>' +
              '<td style="text-align:right;font-weight:600">' + litresMes.toFixed(1) + ' L</td></tr>' +
          '<tr><td style="padding:6px 0">Mesečno — troškovi</td>' +
              '<td style="text-align:right;font-weight:600">' + Math.round(rsdMes).toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr style="border-top:1px solid #334"><td style="padding:8px 0">Godišnje — litara</td>' +
              '<td style="text-align:right;font-weight:600">' + Math.round(litresGod) + ' L</td></tr>' +
          '<tr><td style="padding:6px 0"><b>Godišnje — troškovi</b></td>' +
              '<td style="text-align:right;font-weight:700;font-size:1.05rem">' + Math.round(rsdGod).toLocaleString("sr") + ' RSD</td></tr>' +
        '</table>';
      res.style.display = "block";
    },

    /* ----- Kalkulator troškova vlasništva ----- */
    calcCost: function () {
      var km     = parseFloat(el("cc_km")     && el("cc_km").value)     || 0;
      var cons   = parseFloat(el("cc_cons")   && el("cc_cons").value)   || 0;
      var gprice = parseFloat(el("cc_gprice") && el("cc_gprice").value) || 0;
      var reg    = parseFloat(el("cc_reg")    && el("cc_reg").value)    || 0;
      var serv   = parseFloat(el("cc_serv")   && el("cc_serv").value)   || 0;
      var tires  = parseFloat(el("cc_tires")  && el("cc_tires").value)  || 0;
      var park   = parseFloat(el("cc_park")   && el("cc_park").value)   || 0;
      var res    = el("cc_result");
      var brkd   = el("cc_breakdown");
      if (!res || !brkd) return;
      if (!km && !reg && !serv) { res.style.display = "none"; return; }

      var gorivo    = km > 0 && cons > 0 && gprice > 0 ? Math.round((cons / 100) * km * gprice) : 0;
      var parking   = Math.round(park * 12);
      var total     = gorivo + reg + serv + tires + parking;
      var perMonth  = Math.round(total / 12);
      var perKm     = km > 0 ? (total / km).toFixed(1) : "—";

      var row = function (label, val) {
        return val ? '<tr><td style="padding:6px 0">' + label + '</td><td style="text-align:right;font-weight:600">' + Math.round(val).toLocaleString("sr") + ' RSD</td></tr>' : '';
      };

      brkd.innerHTML =
        '<table style="width:100%;font-size:.9rem;border-collapse:collapse">' +
          row("Gorivo", gorivo) +
          row("Registracija", reg) +
          row("Servis + održavanje", serv) +
          row("Gume", tires) +
          row("Parking / putarine", parking) +
          '<tr style="border-top:1px solid #334"><td style="padding:8px 0"><b>UKUPNO godišnje</b></td>' +
              '<td style="text-align:right;font-weight:700;font-size:1.1rem">' + total.toLocaleString("sr") + ' RSD</td></tr>' +
          '<tr><td style="padding:6px 0;color:#64748b">Mesečno</td>' +
              '<td style="text-align:right;color:#64748b">' + perMonth.toLocaleString("sr") + ' RSD/mes</td></tr>' +
          (km > 0 ? '<tr><td style="padding:6px 0;color:#64748b">Po kilometru</td>' +
              '<td style="text-align:right;color:#64748b">' + perKm + ' RSD/km</td></tr>' : '') +
        '</table>';
      res.style.display = "block";
    },

    onUvozZemlja: function () {
      var sel = el("uc_zemlja");
      var row = el("uc_carina_row");
      if (!sel || !row) return;
      row.style.display = sel.value === "custom" ? "" : "none";
      DR.calcUvoz();
    },

    calcUvoz: function () {
      var eur       = parseFloat(el("uc_eur")        && el("uc_eur").value)       || 0;
      var kurs      = parseFloat(el("uc_kurs")       && el("uc_kurs").value)      || 117;
      var tranEur   = parseFloat(el("uc_transport")  && el("uc_transport").value) || 0;
      var homolog   = parseFloat(el("uc_homolog")    && el("uc_homolog").value);
      if (isNaN(homolog)) homolog = 30000;
      var sel       = el("uc_zemlja");
      var carinaPct = sel && sel.value !== "custom"
        ? parseFloat(sel.value)
        : (parseFloat(el("uc_carina_pct") && el("uc_carina_pct").value) || 0);
      var res  = el("uc_result");
      var brkd = el("uc_breakdown");
      if (!res || !brkd) return;
      if (!eur) { res.style.display = "none"; return; }

      var carinVredEur = eur + tranEur;
      var carinRSD     = carinVredEur * kurs;
      var carinaEur    = carinVredEur * (carinaPct / 100);
      var carinaRSD    = Math.round(carinaEur * kurs);
      var pdvOsn       = carinVredEur + carinaEur;
      var pdvRSD       = Math.round(pdvOsn * 0.20 * kurs);
      var transportRSD = Math.round(tranEur * kurs);
      var ukupnoRSD    = Math.round(carinVredEur * kurs) + carinaRSD + pdvRSD + Math.round(homolog);
      var fmt          = function (n) { return Math.round(n).toLocaleString("sr"); };

      var row = function (label, rsd, sub) {
        return '<tr><td style="padding:5px 0;font-size:.88rem">' + label + (sub ? '<br><span style="color:#64748b;font-size:.77rem">' + sub + '</span>' : '') + '</td>' +
          '<td style="text-align:right;font-weight:600;white-space:nowrap">' + fmt(rsd) + ' RSD</td></tr>';
      };

      brkd.innerHTML =
        '<table style="width:100%;font-size:.9rem;border-collapse:collapse">' +
          row("Cena vozila", eur * kurs, eur.toLocaleString("sr") + " EUR × " + kurs) +
          (tranEur ? row("Transport", transportRSD, tranEur.toLocaleString("sr") + " EUR × " + kurs) : "") +
          row("Carina (" + carinaPct + "%)", carinaRSD, "od carinske vrednosti " + fmt(carinVredEur * kurs) + " RSD") +
          row("PDV (20%)", pdvRSD, "od " + fmt(pdvOsn) + " EUR × " + kurs) +
          row("Homologacija", homolog, "individualni tehnički pregled uvoza") +
          '<tr style="border-top:2px solid #334"><td style="padding:10px 0"><b>UKUPNO uvoz</b></td>' +
            '<td style="text-align:right;font-weight:700;font-size:1.1rem">' + fmt(ukupnoRSD) + ' RSD</td></tr>' +
          '<tr><td style="padding:5px 0;color:#64748b;font-size:.82rem" colspan="2">≈ ' + fmt(ukupnoRSD / kurs) + ' EUR (po kursu ' + kurs + ')</td></tr>' +
        '</table>';
      res.style.display = "block";
    },

    apSearch: function () {
      var make     = (el("ap_make")      && el("ap_make").value.trim())      || '';
      var model    = (el("ap_model")     && el("ap_model").value.trim())     || '';
      var minYear  = (el("ap_min_year")  && el("ap_min_year").value.trim())  || '';
      var maxYear  = (el("ap_max_year")  && el("ap_max_year").value.trim())  || '';
      var maxPrice = (el("ap_max_price") && el("ap_max_price").value.trim()) || '';
      var box = el("ap_results");
      if (!box) return;
      box.innerHTML = '<p style="color:#64748b;font-size:.85rem;padding:8px">Učitavam...</p>';

      var params = new URLSearchParams();
      if (make)     params.set("make",      make);
      if (model)    params.set("model",     model);
      if (minYear)  params.set("min_year",  minYear);
      if (maxYear)  params.set("max_year",  maxYear);
      if (maxPrice) params.set("max_price", maxPrice);

      window.AUCore.getPlatformUrl().then(function (base) {
        var apiBase = base ? base.replace(':3000', ':3001').replace(/\/$/, '') : 'http://localhost:3001';
        return fetch(apiBase + '/listings?' + params.toString());
      }).then(function (r) { return r.json(); }).then(function (data) {
        var items = data.data || data;
        if (!items || !items.length) {
          box.innerHTML = '<p style="color:#64748b;font-size:.85rem;padding:8px">Nema rezultata.</p>';
          return;
        }
        box.innerHTML = items.map(function (l) {
          var title = esc((l.make || '') + ' ' + (l.model || '') + (l.year ? ' ' + l.year : ''));
          var price = l.price ? (l.price + ' ' + (l.currency || 'EUR')) : 'Cena na upit';
          var km    = l.km    ? l.km.toLocaleString("sr") + ' km'  : '';
          return '<div class="card" style="margin-bottom:8px">' +
            '<div style="font-weight:700;font-size:1rem">' + title + '</div>' +
            '<div style="display:flex;justify-content:space-between;margin-top:4px">' +
              '<span style="color:#10B981;font-weight:600">' + esc(price) + '</span>' +
              (km ? '<span style="color:#64748b;font-size:.85rem">' + km + '</span>' : '') +
            '</div>' +
            (l.city ? '<div style="color:#64748b;font-size:.82rem;margin-top:2px">📍 ' + esc(l.city) + '</div>' : '') +
          '</div>';
        }).join('');
      }).catch(function () {
        box.innerHTML = '<p style="color:#f87171;font-size:.85rem;padding:8px">Greška pri učitavanju. Server nije dostupan?</p>';
      });
    },

    adSearch: function () {
      var q    = (el("ad_q")    && el("ad_q").value.trim())    || '';
      var cat  = (el("ad_cat")  && el("ad_cat").value)         || '';
      var make = (el("ad_make") && el("ad_make").value.trim()) || '';
      var sort = (el("ad_sort") && el("ad_sort").value)        || '';
      var box  = el("ad_results");
      if (!box) return;
      box.innerHTML = '<p style="color:#64748b;font-size:.85rem;padding:8px">Učitavam...</p>';

      var params = new URLSearchParams();
      if (q)    params.set("q",    q);
      if (cat)  params.set("cat",  cat);
      if (make) params.set("make", make);
      if (sort) params.set("sort", sort);

      window.AUCore.getPlatformUrl().then(function (base) {
        var apiBase = base ? base.replace(':3000', ':3002').replace(/\/$/, '') : 'http://localhost:3002';
        return fetch(apiBase + '/parts?' + params.toString());
      }).then(function (r) { return r.json(); }).then(function (data) {
        var items = data.data || data;
        if (!items || !items.length) {
          box.innerHTML = '<p style="color:#64748b;font-size:.85rem;padding:8px">Nema rezultata.</p>';
          return;
        }
        box.innerHTML = items.map(function (p) {
          var price = p.price ? (p.price + ' ' + (p.currency || 'EUR')) : 'Cena na upit';
          return '<div class="card" style="margin-bottom:8px">' +
            '<div style="font-weight:700;font-size:1rem">' + esc(p.name || p.title || '') + '</div>' +
            (p.category ? '<div style="font-size:.8rem;color:#0EA5E9;margin-top:2px">' + esc(p.category) + '</div>' : '') +
            '<div style="display:flex;justify-content:space-between;margin-top:4px">' +
              '<span style="color:#10B981;font-weight:600">' + esc(price) + '</span>' +
              (p.city ? '<span style="color:#64748b;font-size:.82rem">📍 ' + esc(p.city) + '</span>' : '') +
            '</div>' +
          '</div>';
        }).join('');
      }).catch(function () {
        box.innerHTML = '<p style="color:#f87171;font-size:.85rem;padding:8px">Greška pri učitavanju. Server nije dostupan?</p>';
      });
    },

    calcKasko: function () {
      var val       = parseFloat(el("kk_val")       && el("kk_val").value)       || 0;
      var year      = parseInt(el("kk_year")        && el("kk_year").value, 10)  || 0;
      var claims    = parseInt(el("kk_claims")      && el("kk_claims").value, 10);
      var franchise = parseInt(el("kk_franchise")   && el("kk_franchise").value, 10) || 0;
      var res  = el("kk_result");
      var brkd = el("kk_breakdown");
      if (!res || !brkd) return;
      if (!val || !year) { res.style.display = "none"; return; }

      // Osnovna stopa kasko: ~3.5% vrednosti vozila
      var baseRate = 0.035;
      // Korekcija po starosti (starija vozila = jeftinija premija, manja vrednost)
      var age = 2026 - year;
      if (age <= 2)       baseRate = 0.040;
      else if (age <= 5)  baseRate = 0.037;
      else if (age <= 10) baseRate = 0.033;
      else                baseRate = 0.028;
      // Istorija šteta
      if (claims === 1)   baseRate *= 1.15;
      else if (claims >= 2) baseRate *= 1.35;
      // Franšiza popust
      var franchiseDiscount = franchise === 150 ? 0.12 : franchise === 300 ? 0.22 : 0;
      var grossPremija = val * baseRate;
      var popust       = grossPremija * franchiseDiscount;
      var netPremija   = Math.round(grossPremija - popust);
      var kurs = 117;
      var fmt = function (n) { return Math.round(n).toLocaleString("sr"); };

      brkd.innerHTML =
        '<table style="width:100%;font-size:.9rem;border-collapse:collapse">' +
          '<tr><td style="padding:5px 0">Vrednost vozila</td>' +
              '<td style="text-align:right;font-weight:600">' + fmt(val) + ' EUR</td></tr>' +
          '<tr><td style="padding:5px 0">Osnovna stopa (' + (baseRate*100).toFixed(1) + '%)</td>' +
              '<td style="text-align:right;font-weight:600">' + fmt(grossPremija) + ' EUR</td></tr>' +
          (franchise ? '<tr><td style="padding:5px 0">Franšiza popust (' + Math.round(franchiseDiscount*100) + '%)</td>' +
              '<td style="text-align:right;font-weight:600;color:#22c55e">−' + fmt(popust) + ' EUR</td></tr>' : '') +
          '<tr style="border-top:1px solid #334"><td style="padding:8px 0"><b>Godišnja premija (okvirno)</b></td>' +
              '<td style="text-align:right;font-weight:700;font-size:1.1rem">' + fmt(netPremija) + ' EUR</td></tr>' +
          '<tr><td style="padding:5px 0;color:#64748b;font-size:.82rem" colspan="2">≈ ' + fmt(netPremija * kurs) + ' RSD (po kursu ' + kurs + ')</td></tr>' +
        '</table>';
      res.style.display = "block";
    }
  };

  /* ---------- Offline / SW ---------- */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    var refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      reg.addEventListener("updatefound", function () {
        var sw = reg.installing;
        sw.addEventListener("statechange", function () {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);
    }).catch(function (e) { console.warn("SW greška:", e); });
  }

  function showUpdateBanner(reg) {
    if (document.getElementById("updateBanner")) return;
    var b = document.createElement("div");
    b.id = "updateBanner";
    b.style.cssText = "position:fixed;bottom:72px;left:50%;transform:translateX(-50%);" +
      "background:#1E8A4C;color:#fff;padding:12px 18px;border-radius:10px;font-size:.88rem;" +
      "z-index:9999;display:flex;align-items:center;gap:12px;box-shadow:0 4px 16px rgba(0,0,0,.35);white-space:nowrap";
    b.innerHTML = "<span>Nova verzija dostupna</span>" +
      "<button style='background:#fff;color:#1E8A4C;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-size:.85rem'" +
      " onclick='if(navigator.serviceWorker.controller){navigator.serviceWorker.ready.then(function(r){if(r.waiting)r.waiting.postMessage({type:\"SKIP_WAITING\"})})}'>" +
      "Ažuriraj</button>";
    document.body.appendChild(b);
  }

  function watchOnline() {
    var badge = el("offlineBadge");
    function upd() { badge.hidden = navigator.onLine; }
    window.addEventListener("online", upd); window.addEventListener("offline", upd); upd();
  }

  // ─── Notification bell ────────────────────────────────────────────────────

  var _notifPollTimer = null;

  function updateBell(unread) {
    var btn   = el("bellBtn");
    var count = el("bellCount");
    if (!btn) return;
    btn.hidden = false;
    if (unread > 0) {
      count.hidden = false;
      count.textContent = unread > 99 ? "99+" : String(unread);
    } else {
      count.hidden = true;
    }
  }

  function pollNotifications() {
    if (!window.AUCore || !AUCore.getSession()) return;
    AUCore.apiCall("GET", "/notifications?limit=1&unread=0")
      .then(function (data) { updateBell(data.unread || 0); })
      .catch(function () {});
  }

  function _relTime(iso) {
    var d = new Date(iso); var diff = (Date.now() - d) / 1000;
    if (diff < 60) return "upravo";
    if (diff < 3600) return Math.round(diff / 60) + " min";
    if (diff < 86400) return Math.round(diff / 3600) + " h";
    return Math.round(diff / 86400) + " d";
  }

  Actions.showNotifications = function () {
    if (!window.AUCore || !AUCore.getSession()) { toast("Nisi prijavljen na AU Core"); return; }
    AUCore.apiCall("GET", "/notifications?limit=30")
      .then(function (data) {
        var items = data.notifications || [];
        var overlay = document.createElement("div");
        overlay.className = "notif-overlay";
        var sheet = document.createElement("div");
        sheet.className = "notif-sheet";

        var head = '<div class="notif-sheet-head">' +
          '<h3>Obaveštenja</h3>' +
          '<div style="display:flex;gap:.75rem;align-items:center">' +
          (data.unread > 0 ? '<button class="notif-sheet-readall" id="notifReadAll">Označi sve</button>' : '') +
          '<button style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:inherit" id="notifClose">✕</button>' +
          '</div></div>';

        var rows = items.length === 0
          ? '<div class="notif-empty">Nema obaveštenja</div>'
          : items.map(function (n) {
            var isUnread = !n.read_at;
            var hasUrl = n.action_url ? ' data-url="' + esc(n.action_url) + '"' : '';
            var cursor = n.action_url ? ' style="cursor:pointer"' : '';
            return '<div class="notif-row' + (isUnread ? ' unread' : '') + '" data-id="' + n.id + '"' + hasUrl + cursor + '>' +
              '<div class="notif-row-title">' + esc(n.title) + (n.action_url ? ' <span style="font-size:.7rem;opacity:.6">↗</span>' : '') + '</div>' +
              '<div class="notif-row-body">' + esc(n.body) + '</div>' +
              '<div class="notif-row-time">' + _relTime(n.created_at) + '</div>' +
              '</div>';
          }).join('');

        sheet.innerHTML = head + '<div class="notif-list">' + rows + '</div>';
        overlay.appendChild(sheet);
        document.body.appendChild(overlay);

        function close() { document.body.removeChild(overlay); pollNotifications(); }

        overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
        var closeBtn = document.getElementById("notifClose");
        if (closeBtn) closeBtn.addEventListener("click", close);

        var readAllBtn = document.getElementById("notifReadAll");
        if (readAllBtn) readAllBtn.addEventListener("click", function () {
          AUCore.apiCall("POST", "/notifications/read-all")
            .then(function () { close(); })
            .catch(function () { toast("Greška"); });
        });

        sheet.querySelectorAll(".notif-row").forEach(function (row) {
          row.addEventListener("click", function () {
            var id = row.getAttribute("data-id");
            var url = row.getAttribute("data-url");
            if (row.classList.contains("unread")) {
              AUCore.apiCall("POST", "/notifications/read/" + id).catch(function(){});
              row.classList.remove("unread");
              updateBell(Math.max(0, (data.unread || 1) - 1));
            }
            if (url) { close(); window.open(url, "_blank", "noopener"); }
          });
        });
      })
      .catch(function () { toast("AU Core nije dostupan"); });
  };

  window.DR = Actions;
  document.addEventListener("DOMContentLoaded", boot);
})();
