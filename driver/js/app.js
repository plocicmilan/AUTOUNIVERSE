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
        // Magic-link import: Driver otvoren sa ?hub_import=TOKEN&hub=URL
        var urlP = new URL(location.href).searchParams;
        var importToken = urlP.get("hub_import");
        var importHub   = urlP.get("hub");
        if (importToken && importHub) {
          history.replaceState({}, "", location.pathname); // očisti URL
          render("hub_import", { token: importToken, hub_url: importHub });
        } else {
          render("vehicle");
        }
        registerSW();
        watchOnline();
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
  function render(route, params) {
    App.route = route; App.params = params || null;
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-route") === route.split("/")[0]);
    });
    var fn = SCREENS[route] || SCREENS.vehicle;
    Promise.resolve(fn(params)).then(function (html) {
      var s = el("screen");
      s.innerHTML = html; translate(s); s.scrollTop = 0; window.scrollTo(0, 0);
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
      return Promise.all([Store.all("vehicles"), Store.all("events"), Store.all("reminders")])
        .then(function (res) {
          var vehicles = res[0], events = res[1], reminders = res[2];

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
                return '<button class="chip' + (x.id === vid ? ' active' : '') +
                  '" onclick="DR.setVehicle(\'' + esc(x.id) + '\')">' + esc(x.make + " " + x.model) + '</button>';
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

          return '' +
            switcher +
            '<h1>' + esc(v.make + " " + v.model) + (v.year ? ' <span class="muted">(' + v.year + ')</span>' : '') + '</h1>' +
            '<p class="sub">' + esc(v.plate || "—") +
              (curKm != null ? ' • ⏱ ' + esc(curKm) + ' km' : '') + '</p>' +

            // onboarding: ako nema nijednog događaja, ponudi početno stanje
            (events.filter(function (e) { return e.vehicle_id === vid; }).length === 0
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

            '<button class="btn btn-primary" onclick="DR.addEvent(\'' + esc(vid) + '\',false)" data-i18n="d.add_event"></button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'initial_state\',{vehicle_id:\'' + esc(vid) + '\'})" data-i18n="d.initial_cta"></button>' +
            '<button class="btn btn-secondary mt8" onclick="DR.addEvent(\'' + esc(vid) + '\',true)" data-i18n="d.dig_drawer"></button>' +
            (moduleUnlocked("pdf_dossier")
              ? '<button class="btn btn-secondary mt8" onclick="DR.exportDossier(\'' + esc(vid) + '\')" data-i18n="d.dossier"></button>'
              : '') +
            '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle_form\',{id:\'' + esc(vid) + '\'})" data-i18n="common.edit"></button>' +
            (v.status !== "sold" && v.status !== "totaled"
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'sell_vehicle\',{id:\'' + esc(vid) + '\'})" data-i18n="d.sell_vehicle"></button>'
              : '') +
            (v.trade_mode
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'publish_listing\',{id:\'' + esc(vid) + '\'})" data-i18n="d.publish_listing"></button>'
              : '') +
            (moduleUnlocked("multi_vehicle")
              ? '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle_form\')" data-i18n="vehicles.add"></button>'
              : '');
        });
    },

    /* ===== FORMA VOZILA ===== */
    vehicle_form: function (params) {
      var id = params && params.id;
      var pV = id ? Store.get("vehicles", id) : Promise.resolve(null);
      return pV.then(function (existing) {
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
            field("f_vin", "vehicles.vin", v.vin) +
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
        e = e || Models.createEvent({ vehicle_id: vehId, type: "service", app: "driver",
                                      date: retro ? "" : todayISO() });
        var vehOpts = res[1].map(function (v) {
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
            '<label class="field"><span>' + t("d.event_type") + '</span><select id="e_type">' + typeOpts + '</select></label>' +
            field("e_title", "d.event_title", e.title) +
            field("e_date", "common.date", (e.date || (retro ? "" : todayISO())), "date") +
            field("e_km", "common.mileage", e.mileage_km != null ? e.mileage_km : "", "number") +
            '<label class="field"><span>' + t("d.event_desc") + '</span>' +
              '<textarea id="e_desc" rows="3">' + esc(e.description) + '</textarea></label>' +
            '<label class="btn btn-secondary mt8 filelabel"><span data-i18n="d.event_photo"></span>' +
              '<input type="file" accept="image/*" multiple onchange="DR.pickEventPhotos(this)" hidden></label>' +
            '<div id="evtPreview">' + eventPhotoPreviewHTML() + '</div>' +
            retroBox +
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

    /* ===== ISTORIJA (timeline, sa trust prikazom) ===== */
    history: function () {
      return Promise.all([Store.all("events"), Store.all("vehicles")]).then(function (res) {
        var events = res[0], vehicles = res[1];
        var vById = {}; vehicles.forEach(function (v) { vById[v.id] = v; });
        events.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

        var list = events.length ? events.map(function (e) {
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
        }).join("") : '<div class="card"><p class="empty" data-i18n="d.history_empty"></p></div>';

        return '<h1 data-i18n="d.nav_history"></h1>' + list +
          (vehicles.length
            ? '<button class="btn btn-primary" onclick="DR.addEvent(null,false)" data-i18n="d.add_event"></button>'
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
          '<button class="btn btn-primary" onclick="DR.go(\'expense_form\',{vehicle_id:\'' + esc(vid) + '\'})" data-i18n="d.add_event"></button>';
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
        return '<button class="linkback" onclick="DR.go(\'expenses\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? t("common.edit") : t("d.add_event")) + '</h1>' +
          '<div class="card">' +
            '<label class="field"><span>' + t("d.nav_vehicle") + '</span><select id="exp_vehicle">' + vehOpts + '</select></label>' +
            '<label class="field"><span>' + t("d.event_type") + '</span><select id="exp_type">' + typeOpts + '</select></label>' +
            field("exp_title", "d.event_title", (e && e.title) || "") +
            field("exp_date", "common.date", (e && e.date) || todayISO(), "date") +
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
        '<div class="card mt16" id="autohubCard">' + autohubCardHTML() + '</div>' +
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
          '<button class="btn btn-primary" onclick="DR.publishListing()">' + t("d.publish_on_autopijaca") + '</button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.saleSummaryPdf(\'' + esc(vid) + '\')">📄 Pripremi za prodaju (PDF)</button>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.cancel"></button>';
      });
    },

    /* ===== HUB IMPORT — vlasnik dobija link od mehaničara ===== */
    hub_import: function (params) {
      var token  = params && params.token;
      var hubUrl = params && params.hub_url;
      if (!token || !hubUrl || !window.AutoHub) {
        return '<div class="card"><p class="empty">Nevažeći link.</p>' +
          '<button class="btn btn-secondary mt8" onclick="DR.go(\'vehicle\')" data-i18n="common.back"></button></div>';
      }
      return AutoHub.fetchShare(hubUrl, token).then(function (data) {
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
          '<div class="card"><p class="empty">Poveži se sa AutoHub-om u podešavanjima da bi generisao javni dosije.</p></div>';
      }
      var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");
      var syncedLocalIds = Object.keys(vehicleMap);
      if (!syncedLocalIds.length) {
        return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
          '<h1>Javni dosije</h1>' +
          '<div class="card"><p class="empty">Nema sinhronizovanih vozila. Najpre uradi Sync u AutoHub sekciji.</p>' +
          '<button class="btn btn-primary mt8" onclick="DR.hubSync();DR.go(\'public_ids\')">Sync sada</button></div>';
      }
      return Store.all("vehicles").then(function (vehicles) {
        return AutoHub.getPlatformUrl().then(function (hubUrl) {
          var cards = syncedLocalIds.map(function (lid) {
            var serverId = vehicleMap[lid];
            var v = vehicles.find(function (x) { return x.id === lid; });
            if (!v) return '';
            var publicUrl = hubUrl ? hubUrl.replace(/\/$/, '') + '/public/v/' + serverId : '';
            var qrSrc = publicUrl ? publicUrl + '/qr' : '';
            return '<div class="card mt16">' +
              '<b>' + esc(v.make + ' ' + v.model) + (v.year ? ' ' + v.year : '') + '</b>' +
              (v.plate ? '<p class="muted" style="font-size:.82rem">' + esc(v.plate) + '</p>' : '') +
              (qrSrc ? '<div style="text-align:center;margin:12px 0">' +
                '<img src="' + esc(qrSrc) + '" alt="QR" style="width:160px;height:160px;border-radius:8px;background:#fff;padding:8px">' +
                '</div>' : '') +
              (publicUrl ? '<p style="font-size:.72rem;color:#64748b;word-break:break-all;margin-bottom:8px">' + esc(publicUrl) + '</p>' +
                '<button class="btn btn-secondary" onclick="DR.copyPublicUrl(\'' + esc(publicUrl) + '\')">Kopiraj link</button>' : '') +
              '</div>';
          }).join('');
          return '<button class="linkback" onclick="DR.go(\'settings\')" data-i18n="common.back"></button>' +
            '<h1>Javni dosije</h1>' +
            '<p style="color:#64748b;font-size:.83rem;padding:0 0 4px">QR kod i link za kupca — servisna istorija bez naloga.</p>' +
            cards;
        });
      });
    }
  };

  /* ---------- AutoHub helperi ---------- */
  var HUB_MAP_KEY = "autohub_vehicle_map";

  function hubConnected() { return !!(window.AutoHub && AutoHub.getSession()); }

  function autohubCardHTML(mode) {
    if (!window.AutoHub) {
      return '<h2>AutoHub</h2><p class="empty">AutoHub modul nije učitan.</p>';
    }
    if (hubConnected()) {
      var lastSync = localStorage.getItem("autohub_last_sync");
      return '<h2>AutoHub</h2>' +
        '<p class="lic-ok">✓ Povezan</p>' +
        (lastSync ? '<p class="muted" style="font-size:.8rem;margin:.4rem 0">Poslednji sync: ' + esc(lastSync.slice(0, 16).replace("T", " ")) + '</p>' : '') +
        '<div id="hubSyncStatus"></div>' +
        '<button class="btn btn-primary mt8" onclick="DR.hubSync()">Sync sada</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.go(\'public_ids\')">📋 Javni dosije / QR</button>' +
        '<button class="btn btn-secondary mt8" onclick="DR.hubLogout()">Odjavi se</button>';
    }
    if (mode === 'register') {
      return '<h2>AutoHub</h2>' +
        '<p class="empty" style="margin-bottom:.8rem">Kreiraj nalog — admin mora da te odobri.</p>' +
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
    return '<h2>AutoHub</h2>' +
      '<p class="empty" style="margin-bottom:.8rem">Poveži Driver sa serverom za backup i deljenje.</p>' +
      '<label class="field"><span>Email</span>' +
        '<input id="hub_email" type="email" autocomplete="email" placeholder="tvoj@email.com"></label>' +
      '<label class="field"><span>Lozinka</span>' +
        '<input id="hub_pass" type="password" autocomplete="current-password"></label>' +
      '<div id="hubLoginErr" style="color:#f87171;font-size:.82rem;margin:.3rem 0"></div>' +
      '<button class="btn btn-primary mt8" onclick="DR.hubLogin()">Poveži</button>' +
      '<button class="btn btn-secondary mt8" onclick="DR.showHubRegister()">Nemaš nalog? Registruj se</button>';
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

    /* ----- Dosije vozila (PDF, 🔑) ----- */
    exportDossier: function (vehId) {
      if (!moduleUnlocked("pdf_dossier")) { toast(t("license.locked")); return; }
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
          doc.save("dosije-" + (v.plate || v.make || "vozilo").replace(/\s+/g, "-") + ".pdf");
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
      Store.put("events", base).then(function () {
        toast(t("common.saved")); render("vehicle");
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
      Store.put("reminders", base).then(function () { toast(t("common.saved")); render("reminders"); });
    },
    markReminderDone: function (id) {
      Store.get("reminders", id).then(function (r) { r.done = true; return Store.put("reminders", r); })
        .then(function () { render("reminders"); });
    },
    deleteReminder: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("reminders", id).then(function () { render("reminders"); });
    },

    /* ----- AutoHub ----- */
    hubLogin: function () {
      if (!window.AutoHub) return;
      var email = val("hub_email"), pass = val("hub_pass");
      var errEl = el("hubLoginErr");
      if (!email || !pass) { if (errEl) errEl.textContent = "Email i lozinka su obavezni."; return; }
      if (errEl) errEl.textContent = "";
      AutoHub.apiCall("POST", "/auth/login", { email: email, password: pass })
        .then(function (data) {
          AutoHub.setSession(data.session);
          toast("Povezano sa AutoHub-om!");
          render("settings");
        })
        .catch(function (e) {
          if (errEl) errEl.textContent = e.message || "Greška pri povezivanju.";
        });
    },

    showHubRegister: function () {
      var card = el("autohubCard");
      if (card) card.innerHTML = autohubCardHTML("register");
    },

    showHubLogin: function () {
      var card = el("autohubCard");
      if (card) card.innerHTML = autohubCardHTML("login");
    },

    hubRegister: function () {
      if (!window.AutoHub) return;
      var name  = val("hub_name");
      var email = val("hub_email");
      var pass  = val("hub_pass");
      var errEl = el("hubRegErr");
      if (!name || !email || !pass) { if (errEl) errEl.textContent = "Sva polja su obavezna."; return; }
      if (pass.length < 6) { if (errEl) errEl.textContent = "Lozinka mora imati najmanje 6 karaktera."; return; }
      if (errEl) errEl.textContent = "";

      AutoHub.apiCall("POST", "/auth/register", { name: name, email: email, password: pass })
        .then(function () {
          var card = el("autohubCard");
          if (card) card.innerHTML =
            '<h2>AutoHub</h2>' +
            '<p class="lic-ok">✓ Nalog kreiran</p>' +
            '<p class="empty" style="margin:.6rem 0">Admin mora da te odobri pre prvog logina.</p>' +
            '<button class="btn btn-secondary mt8" onclick="DR.showHubLogin()">Prijavi se</button>';
        })
        .catch(function (e) {
          var msg = e.status === 409 ? "Email već postoji." : (e.message || "Greška pri registraciji.");
          if (errEl) errEl.textContent = msg;
        });
    },

    hubLogout: function () {
      if (!window.AutoHub) return;
      AutoHub.setSession(null);
      localStorage.removeItem(HUB_MAP_KEY);
      localStorage.removeItem("autohub_last_sync");
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

      AutoHub.getPlatformUrl().then(function (hubUrl) {
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

        // Ako je vozilo synkovano na AutoHub → dodaj public dosije URL
        var publishAndSend = function () {
          Autopijaca.publish(vid, payload).then(function (data) {
            toast("Oglas objavljen! #" + data.id);
            render("publish_listing", { id: vid });
          }).catch(function (e) { toast("Greška: " + e.message); });
        };

        if (serverId && hubConnected()) {
          AutoHub.getPlatformUrl().then(function (hubUrl) {
            if (hubUrl) payload.history_token = hubUrl.replace(/\/$/, '') + '/public/v/' + serverId;
            publishAndSend();
          }).catch(publishAndSend);
        } else {
          publishAndSend();
        }
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

    setExpensesVehicle: function (id) { App.expensesVehicleId = id; render("expenses"); },
    setExpensesPeriod: function (p) { App.expensesPeriod = p; render("expenses"); },

    saveExpense: function () {
      var base = App._editingExpense || Models.createEvent({ app: "driver", source: "owner" });
      base.vehicle_id = el("exp_vehicle") ? el("exp_vehicle").value : null;
      base.type = el("exp_type") ? el("exp_type").value : "expense_other";
      base.title = val("exp_title");
      base.date = val("exp_date") || todayISO();
      base.description = val("exp_desc") || "";
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
      if (!window.AutoHub || !hubConnected()) { toast("Nisi povezan sa AutoHub-om."); return; }
      var statusEl = el("hubSyncStatus");
      if (statusEl) statusEl.textContent = "Sinkronizujem...";

      var vehicleMap = JSON.parse(localStorage.getItem(HUB_MAP_KEY) || "{}");

      Store.all("vehicles").then(function (vehicles) {
        // Korak 1 — resolve server vehicle IDs (kreiraj ako ne postoji)
        var mapOps = vehicles.map(function (v) {
          if (vehicleMap[v.id]) return Promise.resolve();
          return AutoHub.apiCall("POST", "/vehicles", {
            make: v.make, model: v.model, year: v.year || null,
            plate: v.plate || null, vin: v.vin || null
          }).then(function (r) { vehicleMap[v.id] = r.id; });
        });

        return Promise.all(mapOps).then(function () {
          localStorage.setItem(HUB_MAP_KEY, JSON.stringify(vehicleMap));
          return Store.all("events");
        });
      })
      .then(function (events) {
        var unsynced = events.filter(function (e) { return !e.synced_at; });
        if (!unsynced.length) {
          if (statusEl) statusEl.textContent = "";
          toast("Sve je već synkovano.");
          return;
        }

        // Korak 2 — grupiši po server vehicle ID
        var byServer = {};
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

        // Korak 3 — batch upload po vozilu
        var syncOps = Object.keys(byServer).map(function (sid) {
          return AutoHub.syncEvents(Number(sid), byServer[sid])
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
              return Promise.all(markOps).then(function () { return synced.length; });
            });
        });

        return Promise.all(syncOps).then(function (counts) {
          var total = counts.reduce(function (s, n) { return s + n; }, 0);
          localStorage.setItem("autohub_last_sync", new Date().toISOString());
          if (statusEl) statusEl.textContent = "";
          toast("Sync završen: " + total + " događaja poslano.");
          render("settings");
        });
      })
      .catch(function (e) {
        if (statusEl) statusEl.textContent = "";
        toast("Sync greška: " + (e.message || "nepoznata greška"));
      });
    }
  };

  /* ---------- Offline / SW ---------- */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function (e) { console.warn("SW:", e); });
    }
  }
  function watchOnline() {
    var badge = el("offlineBadge");
    function upd() { badge.hidden = navigator.onLine; }
    window.addEventListener("online", upd); window.addEventListener("offline", upd); upd();
  }

  window.DR = Actions;
  document.addEventListener("DOMContentLoaded", boot);
})();
