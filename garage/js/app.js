/* ============================================================
   GARAGE TOOLBOX — app.js  (Sesija 2: Store + Vozila + Kontakti)
   Ekrani: HOME | VOZILA (lista→karton→forma) | NOVI POSAO (S3) |
           KONTAKTI (lista→forma) | SETTINGS (profil, backup)
   ============================================================ */
(function () {
  "use strict";

  var App = { config: null, i18n: {}, route: "home", params: null };

  var CHECKLIST_TEMPLATES = [
    { id: "prijem", name: "Prijem vozila", extras: true, items: [
      "Saobraćajna dozvola", "Polisa osiguranja", "Vidljiva oštećenja karoserije",
      "Stanje stakala", "Gume (vizuelno)", "Rezervna guma",
      "Ključevi / daljinski", "Vredne stvari u vozilu"
    ]},
    { id: "put", name: "Priprema za put", extras: false, items: [
      "Gume — pritisak", "Ulje motora", "Rashladna tečnost",
      "Tečnost za brisače", "Kočiona tečnost", "Svetla i migavci",
      "Brisači", "Rezerva i alat", "Putna apoteka i trougao"
    ]},
    { id: "zima", name: "Zimska priprema", extras: false, items: [
      "Zimske gume postavljene", "Antifriz (do -30°C min.)",
      "Akumulator (kapacitet i punjenje)", "Zimski brisači",
      "Zimski sprej za šoferku", "Zimska putna apoteka",
      "Lanac za sneg (po potrebi)", "Lopata za sneg"
    ]}
  ];

  var INSP_TEMPLATE = [
    { s: "Motor",      ii: ["Ulje motora", "Rashladna tečnost", "Akumulator", "Kaiš / lanac"] },
    { s: "Kočnice",    ii: ["Prednje kočnice", "Zadnje kočnice", "Ručna kočnica", "Kočiona tečnost"] },
    { s: "Gume",       ii: ["Guma PP", "Guma PD", "Guma ZL", "Guma ZD", "Rezervna"] },
    { s: "Svetla",     ii: ["Farovi", "Stop svetla", "Migavci", "Unutrašnje svetlo"] },
    { s: "Podvozje",   ii: ["Amortizeri", "Poluvratila / kardani", "Upravljač"] },
    { s: "Karoserija", ii: ["Karoserija (vizuelno)", "Stakla", "Brisači"] }
  ];

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
    d.className = "toast";
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1800);
  }

  function field(id, labelKey, value, type, placeholder) {
    return '<label class="field"><span>' + t(labelKey) + '</span>' +
      '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value) + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '></label>';
  }

  /* ---------- Boot ---------- */

  function boot() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
    fetch("config/garage_v1.json")
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
        render("home");
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
    Object.keys(colors || {}).forEach(function (k) {
      var map = { primary: "--c-primary", accent: "--c-accent", bg: "--c-bg",
                  surface: "--c-surface", ok: "--c-ok", locked: "--c-locked" };
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
      btn.addEventListener("click", function () {
        render(btn.getAttribute("data-route"));
      });
    });
  }

  function render(route, params) {
    App.route = route;
    App.params = params || null;
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-route") === route.split("/")[0]);
    });
    var fn = SCREENS[route];
    if (!fn) fn = SCREENS.home;
    Promise.resolve(fn(params)).then(function (html) {
      var s = el("screen");
      s.innerHTML = html;
      translate(s);
      s.scrollTop = 0;
      window.scrollTo(0, 0);
    });
  }

  /* ---------- EKRANI ---------- */

  var SCREENS = {

    /* ===== HOME ===== */
    home: function () {
      return Promise.all([
        Store.all("vehicles"), Store.all("contacts"),
        Store.all("events"), Store.all("reminders"),
        Store.all("documents"), Store.all("appointments")
      ]).then(function (res) {
        var nV = res[0].length, nC = res[1].length, nE = res[2].length;
        App._vehById = {}; res[0].forEach(function (v) { App._vehById[v.id] = v; });
        var todayStr = new Date().toISOString().slice(0, 10);
        var nToday = res[5].filter(function (a) {
          return a.status === "scheduled" && (a.scheduled_at || "").slice(0, 10) === todayStr;
        }).length;

        var remCard;
        if (!licensed()) {
          remCard = '<div class="card"><h2 data-i18n="home.reminders"></h2>' +
            '<p class="empty" data-i18n="reminders.locked"></p></div>';
        } else {
          var kmBy = latestKmByVehicle(res[2]);
          var today = new Date().toISOString().slice(0, 10);
          var inc = Reminders.incoming(res[3], today, kmBy);
          var body = inc.length
            ? inc.slice(0, 5).map(function (r) { return reminderRowHTML(r, today, kmBy); }).join("")
            : '<p class="empty" data-i18n="home.reminders_none"></p>';
          remCard = '<div class="card"><h2 data-i18n="home.reminders"></h2>' + body + '</div>' +
            '<button class="btn btn-secondary" onclick="GT.go(\'reminders\')" data-i18n="reminders.title"></button>';
        }

        var nEst = res[4] ? res[4].filter(function (d) { return d.doc_type === "estimate" && d.est_status !== "rejected"; }).length : 0;

        return '' +
          '<h1 data-i18n="nav.home"></h1>' +
          '<p class="sub">Garage Toolbox v1</p>' +
          '<div class="statrow">' +
            '<button class="stat" onclick="GT.go(\'vehicles\')"><b>' + nV + '</b><span data-i18n="nav.vehicles"></span></button>' +
            '<button class="stat" onclick="GT.go(\'contacts\')"><b>' + nC + '</b><span data-i18n="nav.contacts"></span></button>' +
            '<button class="stat" onclick="GT.go(\'dnevnik\')"><b>' + nToday + '</b><span>Danas</span></button>' +
            '<button class="stat" onclick="GT.go(\'estimates\')"><b>' + nEst + '</b><span>Predračuni</span></button>' +
          '</div>' +
          remCard +
          (function () {
            var todayApts = res[5].filter(function (a) {
              return (a.status === "scheduled" || a.status === "active") && (a.scheduled_at || "").slice(0, 10) === todayStr;
            }).sort(function (a, b) { return (a.scheduled_at || "").localeCompare(b.scheduled_at || ""); });
            if (!todayApts.length) return '';
            return '<div class="card"><h2>Danas (' + todayApts.length + ')</h2>' +
              todayApts.map(function (a) {
                var time = a.scheduled_at ? a.scheduled_at.slice(11, 16) : "";
                return '<div class="evt-head" style="padding:.3rem 0">' +
                  '<b>' + esc(a.customer_name || "—") + (a.service_type ? ' — ' + esc(a.service_type) : '') + '</b>' +
                  '<span>' + time + '</span>' +
                '</div>';
              }).join("") +
              '<button class="btn btn-secondary mt8" onclick="GT.go(\'dnevnik\')">Otvori Dnevnik</button>' +
            '</div>';
          })() +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'new_job\')" data-i18n="home.new_job"></button>' +
          (licensed()
            ? '<div style="display:flex;gap:.5rem;margin-top:.5rem">' +
                '<button class="btn btn-secondary" style="flex:1" onclick="GT.go(\'stats\')">📊 Statistike</button>' +
                '<button class="btn btn-secondary" style="flex:1" onclick="GT.go(\'calculators\')">🧮 Kalkulatori</button>' +
              '</div>' +
              '<div style="display:flex;gap:.5rem;margin-top:.5rem">' +
                '<button class="btn btn-secondary" style="flex:1" onclick="GT.go(\'sell_part\')">📦 Prodaj deo</button>' +
                '<button class="btn btn-secondary" style="flex:1" onclick="GT.go(\'my_parts\')">📋 Moji oglasi</button>' +
              '</div>'
            : '') +
          (function () {
            var vehById2 = {}; res[0].forEach(function (v) { vehById2[v.id] = v; });
            var recent = res[2].filter(function (e) { return e.type !== "reminder_done"; })
              .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
              .slice(0, 4);
            if (!recent.length) return '';
            return '<div class="card mt16"><h2>Poslednji poslovi</h2>' +
              recent.map(function (e) {
                var vv = vehById2[e.vehicle_id];
                var totals = Models.formatTotals(Models.sumByCurrency(e.items));
                return '<div class="evt-head" style="padding:.3rem 0;border-bottom:1px solid var(--c-border,#e5e7eb)">' +
                  '<b>' + esc(e.title || e.type) + '</b>' +
                  '<span>' + esc(e.date || "") + '</span>' +
                '</div>' +
                '<div class="muted" style="font-size:.77rem;padding-bottom:.2rem">' +
                  (vv ? esc(vv.make + " " + vv.model + (vv.plate ? " • " + vv.plate : "")) : "") +
                  (totals ? ' • ' + totals : '') +
                '</div>';
              }).join("") +
            '</div>';
          })();
      });
    },

    /* ===== VOZILA — lista + pretraga ===== */
    vehicles: function () {
      return Promise.all([Store.all("vehicles"), Store.all("contacts"), Store.all("events")]).then(function (res) {
        App._contactsById = {};
        res[1].forEach(function (c) { App._contactsById[c.id] = c; });
        var lastEvtDate = {};
        res[2].forEach(function (e) {
          if (!e.vehicle_id) return;
          if (!lastEvtDate[e.vehicle_id] || (e.date || "") > lastEvtDate[e.vehicle_id]) {
            lastEvtDate[e.vehicle_id] = e.date || "";
          }
        });
        App._vehicles = res[0].slice().sort(function (a, b) {
          var da = lastEvtDate[a.id] || a.created_at || "";
          var db = lastEvtDate[b.id] || b.created_at || "";
          return db.localeCompare(da);
        });
        return '' +
          '<h1 data-i18n="nav.vehicles"></h1>' +
          '<input id="vehSearch" class="search" placeholder="' + t("vehicles.search") + '" oninput="GT.vehSearch()">' +
          '<div id="vehList">' + vehicleListHTML(App._vehicles) + '</div>' +
          '<button class="btn btn-primary" onclick="GT.go(\'vehicle_form\')" data-i18n="vehicles.add"></button>';
      });
    },

    /* ===== KARTON VOZILA ===== */
    vehicle_card: function (params) {
      var id = params && params.id;
      return Promise.all([Store.get("vehicles", id), Store.byIndex("events", "vehicle_id", id)])
        .then(function (res) {
          var v = res[0];
          if (!v) return '<div class="card"><p class="empty">Vozilo nije nađeno.</p></div>';
          var events = res[1].sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
          var owner = App._contactsById && App._contactsById[v.owner_contact_id];
          var sd = v.service_data || {};
          var tires = v.tires || {};

          function row(labelKey, value) {
            if (!value && value !== 0) return "";
            return '<div class="techrow"><span>' + t(labelKey) + '</span><b>' + esc(value) + '</b></div>';
          }

          var evHtml = events.length
            ? events.map(function (e) {
                var totals = Models.formatTotals(Models.sumByCurrency(e.items));
                var inspHtml = "";
                if (e.type === "inspection" && e._inspection && e._inspection.length) {
                  var ic = { ok: 0, prati: 0, hitno: 0 };
                  e._inspection.forEach(function (it) { ic[it.status] = (ic[it.status] || 0) + 1; });
                  inspHtml = '<div class="insp-sum" style="margin-top:.3rem">' +
                    (ic.hitno ? '<span class="insp-badge hitno">✕ ' + ic.hitno + ' hitno</span>' : '') +
                    (ic.prati ? '<span class="insp-badge prati">! ' + ic.prati + ' prati</span>' : '') +
                    '<span class="insp-badge ok">✓ ' + ic.ok + ' OK</span>' +
                  '</div>';
                }
                if (e.type === "checklist" && e._checklist && e._checklist.length) {
                  var total = e._checklist.length;
                  var okCnt = e._checklist.filter(function (it) { return it.checked; }).length;
                  var notOk = total - okCnt;
                  inspHtml = '<div class="insp-sum" style="margin-top:.3rem">' +
                    '<span class="insp-badge ok">✓ ' + okCnt + '/' + total + '</span>' +
                    (notOk ? '<span class="insp-badge hitno">✕ ' + notOk + ' nije</span>' : '') +
                    (e._intake && e._intake.complaint
                      ? '<span class="muted" style="font-size:.75rem;margin-left:.3rem">' + esc(e._intake.complaint.slice(0, 35)) + '</span>'
                      : '') +
                  '</div>';
                }
                return '<button class="card evt' + (e.retroactive ? " retro" : "") + '" onclick="GT.go(\'event_detail\',{id:\'' + esc(e.id) + '\'})" style="width:100%;text-align:left;cursor:pointer">' +
                  '<div class="evt-head"><b>' + esc(e.title || e.type) + '</b><span>' + esc(e.date) + '</span></div>' +
                  (e.mileage_km != null ? '<div class="evt-km">' + esc(e.mileage_km) + ' km' + (e.km_precision === "approx" ? " (~)" : "") + '</div>' : '') +
                  (e.retroactive ? '<div class="trust">' + t("d.retro_tag") + '</div>' : '') +
                  (totals ? '<div class="evt-total">' + t("common.total") + ': ' + totals + '</div>' : '') +
                  inspHtml +
                  '</button>';
              }).join("")
            : '<div class="card"><p class="empty" data-i18n="history.empty"></p></div>';

          var coverPhoto = v.photos && v.photos[0];
          return '' +
            '<button class="linkback" onclick="GT.go(\'vehicles\')" data-i18n="common.back"></button>' +
            (coverPhoto ? '<div class="veh-cover"><img src="' + coverPhoto + '" alt=""></div>' : '') +
            '<h1>' + esc(v.make + " " + v.model) + (v.year ? ' <span class="muted">(' + v.year + ')</span>' : '') + '</h1>' +
            '<p class="sub">' + esc(v.plate || "—") + ' • ' + esc(v.type_label || v.category) + '</p>' +
            (owner
              ? '<a class="card ownerrow" href="tel:' + esc(owner.phone) + '"><span>' + t("vehicles.owner") + ': <b>' + esc(owner.name) + '</b></span><span class="callpill">☎ ' + t("contacts.call") + '</span></a>'
              : '<div class="card"><p class="empty" data-i18n="vehicles.no_owner"></p></div>') +
            '<div class="card"><h2 data-i18n="tech.title"></h2>' +
              row("tech.oil_type", sd.oil_type) +
              row("tech.oil_qty", sd.oil_qty_l) +
              row("tech.oil_filter", sd.oil_filter) +
              row("tech.air_filter", sd.air_filter) +
              row("tech.fuel_filter", sd.fuel_filter) +
              row("tech.cabin_filter", sd.cabin_filter) +
              row("tech.battery", sd.battery) +
              row("tech.brake_notes", sd.brake_notes) +
              row("tech.tires_front", tires.size_front) +
              row("tech.tires_rear", tires.size_rear) +
              (tires.current_season ? row("Na autu", { summer: "Letnje", winter: "Zimske", allseason: "All-season" }[tires.current_season] || tires.current_season) : "") +
              (tires.current_brand ? row("Marka", tires.current_brand) : "") +
              (tires.other_set_location && tires.other_set_location !== "—" ? row("Drugi set", tires.other_set_location) : "") +
              (!tires.current_season && tires.current_set ? row("tech.tires_set", tires.current_set) : "") +
            '</div>' +
            (v.notes ? '<div class="card"><h2>Beleška</h2><p style="font-size:.9rem;line-height:1.5">' + esc(v.notes) + '</p></div>' : '') +
            '<h2 class="secttitle" data-i18n="history.title"></h2>' +
            evHtml +
            '<button class="btn btn-primary" onclick="GT.go(\'new_job\',{vehicleId:\'' + esc(v.id) + '\'})" data-i18n="wo.new_for"></button>' +
            '<button class="btn btn-secondary mt8" onclick="GT.go(\'history_add\',{vehicle_id:\'' + esc(v.id) + '\'})" data-i18n="gh.add"></button>' +
            (licensed() ? '<button class="btn btn-secondary mt8" onclick="GT.go(\'inspection_form\',{vehicle_id:\'' + esc(v.id) + '\'})">🔍 Nova inspekcija</button>' : '') +
            (licensed() ? '<button class="btn btn-secondary mt8" onclick="GT.go(\'checklist_form\',{vehicle_id:\'' + esc(v.id) + '\'})">📋 Nova provera</button>' : '') +
            (licensed() ? '<button class="btn btn-secondary mt8" onclick="GT.go(\'tires_form\',{vehicle_id:\'' + esc(v.id) + '\'})">🔧 Gume</button>' : '') +
            (licensed() ? '<button class="btn btn-secondary mt8" onclick="GT.exportDossier(\'' + esc(v.id) + '\')">📄 Dosije vozila PDF</button>' : '') +
            (licensed() ? '<button class="btn btn-secondary mt8" onclick="GT.go(\'reminder_form\',{vehicle_id:\'' + esc(v.id) + '\'})" data-i18n="reminders.add"></button>' : '') +
            '<button class="btn btn-secondary mt8" onclick="GT.go(\'vehicle_form\',{id:\'' + esc(v.id) + '\'})" data-i18n="common.edit"></button>';
        });
    },

    /* ===== FORMA VOZILA (novo/izmena) ===== */
    vehicle_form: function (params) {
      var id = params && params.id;
      var pV = id ? Store.get("vehicles", id) : Promise.resolve(null);
      return Promise.all([pV, Store.all("contacts")]).then(function (res) {
        var v = res[0] || Models.createVehicle({});
        App._editingVehicle = res[0] || null;
        var contacts = res[1];
        var sd = v.service_data || {}, tires = v.tires || {};
        var makeName   = v.make || "";
        var makesList  = window.Catalog ? window.Catalog.makes() : [];
        var modelsList = window.Catalog ? window.Catalog.models(makeName) : [];
        var makesDL  = '<datalist id="cat_makes">'  + makesList.map(function (m) { return '<option value="' + esc(m) + '">'; }).join("") + '</datalist>';
        var modelsDL = '<datalist id="cat_models">' + modelsList.map(function (m) { return '<option value="' + esc(m) + '">'; }).join("") + '</datalist>';

        var catOpts = Object.keys(Models.VEHICLE_CATEGORIES).map(function (k) {
          return '<option value="' + k + '"' + (v.category === k ? " selected" : "") + '>' +
                 k + " — " + esc(Models.VEHICLE_CATEGORIES[k]) + '</option>';
        }).join("");

        var ownerOpts = '<option value="">—</option>' + contacts.map(function (c) {
          return '<option value="' + esc(c.id) + '"' + (v.owner_contact_id === c.id ? " selected" : "") + '>' +
                 esc(c.name) + '</option>';
        }).join("");

        return '' +
          '<button class="linkback" onclick="GT.go(\'vehicles\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? t("common.edit") : t("vehicles.add").replace("+ ", "")) + '</h1>' +
          makesDL + modelsDL +
          '<div class="card">' +
            '<label class="field"><span>' + t("vehicles.make") + '</span><input id="f_make" list="cat_makes" value="' + esc(makeName) + '" oninput="GT.onMakeInput(this.value)" autocomplete="off"></label>' +
            '<label class="field"><span>' + t("vehicles.model") + '</span><input id="f_model" list="cat_models" value="' + esc(v.model || "") + '" autocomplete="off"></label>' +
            field("f_year", "vehicles.year", v.year || "", "number") +
            field("f_plate", "vehicles.plate", v.plate) +
            '<label class="field"><span>' + t("vehicles.category") + '</span><select id="f_category">' + catOpts + '</select></label>' +
            '<label class="field"><span>' + t("vehicles.owner") + '</span><select id="f_owner">' + ownerOpts + '</select></label>' +
            field("f_vin", "vehicles.vin", v.vin) +
            '<div class="field"><span>Foto vozila</span>' +
              '<label class="btn btn-secondary filelabel" style="display:inline-block;margin:.3rem 0">' +
                '<span>📷 Odaberi sliku</span>' +
                '<input type="file" accept="image/*" onchange="GT.vehPhotoUpload(this)" hidden>' +
              '</label>' +
              (v.photos && v.photos[0] ? '<div id="vehPhotoPreview"><img src="' + v.photos[0] + '" style="max-height:100px;border-radius:.4rem;margin-top:.3rem"><button class="photodel" onclick="GT.vehPhotoClear()" style="margin-left:.4rem">Ukloni</button></div>' : '<div id="vehPhotoPreview"></div>') +
            '</div>' +
          '</div>' +
          '<div class="card"><h2 data-i18n="tech.title"></h2>' +
            field("f_oil_type", "tech.oil_type", sd.oil_type, "text", "5W-30 507.00") +
            field("f_oil_qty", "tech.oil_qty", sd.oil_qty_l || "", "number") +
            field("f_oil_filter", "tech.oil_filter", sd.oil_filter) +
            field("f_air_filter", "tech.air_filter", sd.air_filter) +
            field("f_fuel_filter", "tech.fuel_filter", sd.fuel_filter) +
            field("f_cabin_filter", "tech.cabin_filter", sd.cabin_filter) +
            field("f_battery", "tech.battery", sd.battery) +
            field("f_brake_notes", "tech.brake_notes", sd.brake_notes) +
            field("f_tires_front", "tech.tires_front", tires.size_front, "text", "205/55 R16") +
            field("f_tires_rear", "tech.tires_rear", tires.size_rear) +
            field("f_tires_set", "tech.tires_set", tires.current_set) +
          '</div>' +
          '<div class="card"><h2>Beleške</h2>' +
            '<label class="field"><textarea id="f_notes" rows="3" placeholder="Interne beleške (alarm kod, posebni zahtevi...)">' + esc(v.notes || "") + '</textarea></label>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GT.saveVehicle()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="GT.deleteVehicle(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== NOVI POSAO — izbor tipa dokumenta, pa WO Snap tok ===== */
    new_job: function () {
      var params = App.params || {};
      if (!params.docType) {
        var vid = params.vehicleId ? esc(params.vehicleId) : '';
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1 data-i18n="nav.new_job"></h1>' +
          '<div class="card">' +
            '<button class="btn btn-primary" onclick="GT.startWO(\'' + vid + '\',\'work_order\')">📋 Radni nalog</button>' +
            '<button class="btn btn-secondary mt8" onclick="GT.startWO(\'' + vid + '\',\'estimate\')">📄 Predračun</button>' +
          '</div>';
      }
      setTimeout(function () { window.WorkOrder.start(params.vehicleId, params.docType); }, 0);
      return '<div class="card"><p class="empty">…</p></div>';
    },

    /* ===== PREDRAČUNI — lista i status ===== */
    estimates: function () {
      return Promise.all([
        Store.all("documents"), Store.all("events"),
        Store.all("vehicles"), Store.all("contacts")
      ]).then(function (res) {
        var docs = res[0], evs = res[1], vehs = res[2], cons = res[3];
        var evById = {}; evs.forEach(function (e) { evById[e.id] = e; });
        var vehById = {}; vehs.forEach(function (v) { vehById[v.id] = v; });
        var conById = {}; cons.forEach(function (c) { conById[c.id] = c; });

        var estimates = docs
          .filter(function (d) { return d.doc_type === "estimate"; })
          .sort(function (a, b) { return (b.date || b.created_at || "").localeCompare(a.date || a.created_at || ""); });

        var SL = { draft: "Nacrt", sent: "Poslato", accepted: "Prihvaćeno", rejected: "Odbijeno" };
        var SC = { draft: "var(--c-muted,#888)", sent: "#3b82f6", accepted: "var(--c-ok,#22c55e)", rejected: "#ef4444" };

        var list = estimates.length ? estimates.map(function (d) {
          var ev = evById[d.event_id];
          var v = ev && vehById[ev.vehicle_id];
          var c = ev && conById[ev.contact_id];
          var totals = ev ? Models.formatTotals(Models.sumByCurrency(ev.items)) : "";
          var st = d.est_status || "draft";
          return '<div class="card">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
              '<div>' +
                '<b>' + esc(d.number || "—") + '</b>' +
                (v ? ' <span class="muted">• ' + esc(v.make + ' ' + v.model) + '</span>' : '') +
                '<br><span class="muted" style="font-size:.78rem">' + esc(d.date || "—") + (c ? ' • ' + esc(c.name) : '') + '</span>' +
              '</div>' +
              '<span style="font-size:.75rem;color:' + SC[st] + ';font-weight:600">' + (SL[st] || st) + '</span>' +
            '</div>' +
            (totals ? '<div style="font-size:.85rem;margin-top:.3rem">' + t("common.total") + ': <b>' + totals + '</b></div>' : '') +
            '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem">' +
              (st === "draft" ? '<button class="aptbtn start" onclick="GT.estStatus(\'' + esc(d.id) + '\',\'sent\')">Pošalji</button>' : '') +
              (st === "sent"
                ? '<button class="aptbtn done" onclick="GT.estStatus(\'' + esc(d.id) + '\',\'accepted\')">✓ Prihvaćeno</button>' +
                  '<button class="aptbtn" style="background:#ef4444;color:#fff" onclick="GT.estStatus(\'' + esc(d.id) + '\',\'rejected\')">✕ Odbijeno</button>'
                : '') +
              (st === "accepted"
                ? '<button class="aptbtn done" onclick="GT.convertToWO(\'' + esc(d.id) + '\')">→ Radni nalog</button>'
                : '') +
            '</div>' +
          '</div>';
        }).join("") : '<div class="card"><p class="empty">Nema predračuna</p></div>';

        return '<h1>Predračuni</h1>' + list +
          '<button class="btn btn-primary mt8" onclick="GT.startWO(\'\',\'estimate\')">+ Novi predračun</button>';
      });
    },

    /* ===== KONTAKTI ===== */
    contacts: function () {
      return Store.all("contacts").then(function (contacts) {
        contacts.sort(function (a, b) { return a.name.localeCompare(b.name); });
        App._contacts = contacts;
        return '<h1 data-i18n="nav.contacts"></h1>' +
          '<input id="conSearch" class="search" placeholder="Pretraži po imenu ili telefonu..." oninput="GT.conSearch()">' +
          '<div id="conList">' + contactListHTML(contacts) + '</div>' +
          '<button class="btn btn-primary" onclick="GT.go(\'contact_form\')" data-i18n="contacts.add"></button>';
      });
    },

    contact_form: function (params) {
      var id = params && params.id;
      var p = id ? Store.get("contacts", id) : Promise.resolve(null);
      return Promise.all([p, id ? Store.all("vehicles") : Promise.resolve([]), id ? Store.all("events") : Promise.resolve([])]).then(function (res) {
        var c = res[0]; App._editingContact = c || null;
        c = c || Models.createContact({});
        var vehicles = res[1], events = res[2];

        var roles = Models.CONTACT_ROLES.map(function (r) {
          var on = c.roles.indexOf(r) !== -1;
          return '<label class="chk"><input type="checkbox" id="role_' + r + '"' + (on ? " checked" : "") + '> ' +
                 t("contacts.role_" + r) + '</label>';
        }).join("");

        var historyHtml = "";
        if (id) {
          var ownedVehs = vehicles.filter(function (v) { return v.owner_contact_id === id; });
          var relEvs = events.filter(function (e) { return e.contact_id === id; })
            .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
            .slice(0, 5);
          var vehById = {}; vehicles.forEach(function (v) { vehById[v.id] = v; });

          if (ownedVehs.length) {
            historyHtml += '<div class="card"><h2>Vozila</h2>' +
              ownedVehs.map(function (v) {
                return '<button class="card vehrow" onclick="GT.go(\'vehicle_card\',{id:\'' + esc(v.id) + '\'})">' +
                  '<b>' + esc(v.make + " " + v.model) + (v.year ? " (" + v.year + ")" : "") + '</b>' +
                  '<span class="muted">' + esc(v.plate || "—") + '</span>' +
                '</button>';
              }).join("") +
            '</div>';
          }

          // Ukupan prihod od ovog kontakta
          var allRelEvs = events.filter(function (e) { return e.contact_id === id; });
          var totalByCur = {};
          allRelEvs.forEach(function (e) {
            (e.items || []).forEach(function (it) {
              var cur = it.currency || "RSD";
              totalByCur[cur] = (totalByCur[cur] || 0) + (Number(it.price) || 0) * (Number(it.qty) || 1);
            });
          });
          var totalStr = Models.formatTotals(totalByCur);

          if (relEvs.length) {
            historyHtml += '<div class="card"><h2>Poslovi' + (totalStr ? ' — ukupno: <b>' + totalStr + '</b>' : '') + '</h2>' +
              relEvs.map(function (e) {
                var vv = vehById[e.vehicle_id];
                var totals = Models.formatTotals(Models.sumByCurrency(e.items));
                return '<div class="evt-head" style="padding:.35rem 0;border-bottom:1px solid var(--c-border,#e5e7eb)">' +
                  '<b>' + esc(e.title || e.type) + '</b>' +
                  '<span>' + esc(e.date || "") + '</span>' +
                  '</div>' +
                  (vv ? '<div class="muted" style="font-size:.78rem">' + esc(vv.make + " " + vv.model) + (totals ? ' • ' + totals : '') + '</div>' : '');
              }).join("") +
            '</div>';
          }
        }

        return '' +
          '<button class="linkback" onclick="GT.go(\'contacts\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? t("common.edit") : t("contacts.add").replace("+ ", "")) + '</h1>' +
          '<div class="card">' +
            field("f_name", "contacts.name", c.name) +
            field("f_phone", "contacts.phone", c.phone, "tel") +
            '<div class="field"><span data-i18n="contacts.roles"></span>' + roles + '</div>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GT.saveContact()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="GT.deleteContact(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '') +
          historyHtml;
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
      var logoHtml = profile.logoDataUrl
        ? '<div style="margin:.3rem 0"><img src="' + profile.logoDataUrl + '" style="max-height:60px;border-radius:.3rem">' +
          '<button class="photodel" onclick="GT.logoClear()" style="margin-left:.5rem">Ukloni</button></div>'
        : '';
      return '' +
        '<h1 data-i18n="nav.settings"></h1>' +
        '<div class="card"><h2 data-i18n="settings.profile"></h2>' +
          field("s_name", "settings.name", profile.name) +
          field("s_phone", "settings.phone", profile.phone, "tel") +
          field("s_address", "Adresa", profile.address || "", "text", "Ul. Vojvode Stepe 1, Kruševac") +
          field("s_email", "Email", profile.email || "", "email") +
          field("s_website", "Website", profile.website || "", "url", "https://...") +
          '<div class="field"><span>Logo (za PDF)</span>' +
            logoHtml +
            '<label class="btn btn-secondary filelabel" style="display:inline-block">' +
              '<span>📷 ' + (profile.logoDataUrl ? 'Promeni logo' : 'Dodaj logo') + '</span>' +
              '<input type="file" accept="image/*" onchange="GT.logoUpload(this)" hidden>' +
            '</label>' +
          '</div>' +
          '<button class="btn btn-secondary mt8" onclick="GT.go(\'biz_card\')">👤 Vizit karta</button>' +
        '</div>' +
        '<div class="card">' +
          '<label class="field"><span>' + t("settings.currency") + '</span><select id="s_currency">' + curOpts + '</select></label>' +
          '<label class="field"><span>' + t("settings.language") + '</span><select id="s_lang">' + langOpts + '</select></label>' +
          '<label class="chk mt8"><input type="checkbox" id="s_signature"' + (Store.settings.get("signature", App.config.signature_default) ? " checked" : "") + '> ' + t("settings.signature") + '</label>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="GT.saveSettings()" data-i18n="common.save"></button>' +
        '<div class="card mt16"><h2 data-i18n="settings.backup"></h2>' +
          '<button class="btn btn-secondary" onclick="GT.exportBackup()" data-i18n="backup.export"></button>' +
          '<label class="btn btn-secondary mt8 filelabel"><span data-i18n="backup.import"></span>' +
            '<input type="file" accept=".json,application/json" onchange="GT.importBackup(this)" hidden></label>' +
        '</div>' +
        '<div class="card mt16" id="licenseCard">' + licenseCardHTML() + '</div>' +
        '<div class="card mt16"><h2>AutoHub ☁</h2>' + autohubCardHTML() + '</div>';
    },

    /* ===== VIZIT KARTA (🔑) ===== */
    biz_card: function () {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'settings\')" data-i18n="common.back"></button>' +
          '<h1>Vizit karta</h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      var prof = Store.settings.get("profile", { name: "", phone: "" });
      var lines = [
        (prof.name ? '<div class="biz-name">' + esc(prof.name) + '</div>' : ''),
        (prof.phone ? '<div class="biz-line">📞 <a href="tel:' + esc(prof.phone) + '">' + esc(prof.phone) + '</a></div>' : ''),
        (prof.email ? '<div class="biz-line">✉ <a href="mailto:' + esc(prof.email) + '">' + esc(prof.email) + '</a></div>' : ''),
        (prof.website ? '<div class="biz-line">🌐 <a href="' + esc(prof.website) + '" target="_blank">' + esc(prof.website.replace(/^https?:\/\//, "")) + '</a></div>' : ''),
        (prof.address ? '<div class="biz-line">📍 ' + esc(prof.address) + '</div>' : '')
      ].filter(Boolean).join("");
      var cardText = [prof.name, prof.phone, prof.email, prof.website, prof.address].filter(Boolean).join("\n");
      return '<button class="linkback" onclick="GT.go(\'settings\')" data-i18n="common.back"></button>' +
        '<h1>Vizit karta</h1>' +
        '<div class="card biz-card">' +
          (prof.logoDataUrl ? '<img class="biz-logo" src="' + prof.logoDataUrl + '" alt="Logo">' : '') +
          (lines || '<p class="empty">Popuni profil u Podešavanjima da biste videli vizit kartu.</p>') +
        '</div>' +
        (cardText
          ? '<button class="btn btn-secondary" onclick="GT.bizCopy()">📋 Kopiraj podatke</button>' +
            (navigator.share ? '<button class="btn btn-secondary mt8" onclick="GT.bizShare()">↑ Podeli</button>' : '')
          : '');
    },

    /* ===== PODSETNICI (🔑) ===== */
    reminders: function () {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1 data-i18n="reminders.title"></h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      return Promise.all([Store.all("reminders"), Store.all("vehicles"), Store.all("events")])
        .then(function (res) {
          var reminders = res[0], vehicles = res[1], events = res[2];
          App._vehById = {}; vehicles.forEach(function (v) { App._vehById[v.id] = v; });
          var kmBy = latestKmByVehicle(events);
          var today = new Date().toISOString().slice(0, 10);
          var sorted = Reminders.sortByUrgency(reminders, today, kmBy);

          var list = sorted.length
            ? sorted.map(function (r) { return reminderRowHTML(r, today, kmBy); }).join("")
            : '<div class="card"><p class="empty" data-i18n="reminders.empty"></p></div>';

          return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
            '<h1 data-i18n="reminders.title"></h1>' + list +
            '<button class="btn btn-primary" onclick="GT.go(\'reminder_form\')" data-i18n="reminders.add"></button>';
        });
    },

    reminder_form: function (params) {
      var id = params && params.id;
      var p = id ? Store.get("reminders", id) : Promise.resolve(null);
      return Promise.all([p, Store.all("vehicles")]).then(function (res) {
        var r = res[0]; App._editingReminder = r || null;
        r = r || Models.createReminder({ vehicle_id: params && params.vehicle_id });
        var vehOpts = '<option value="">—</option>' + res[1].map(function (v) {
          return '<option value="' + esc(v.id) + '"' + (r.vehicle_id === v.id ? " selected" : "") + '>' +
                 esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</option>';
        }).join("");
        return '<button class="linkback" onclick="GT.go(\'reminders\')" data-i18n="common.back"></button>' +
          '<h1 data-i18n="reminders.add"></h1>' +
          '<div class="card">' +
            field("r_title", "reminders.rtitle", r.title) +
            '<label class="field"><span data-i18n="reminders.for_vehicle"></span><select id="r_vehicle">' + vehOpts + '</select></label>' +
            field("r_date", "reminders.due_date", r.due_date || "", "date") +
            field("r_km", "reminders.due_km", r.due_mileage_km || "", "number") +
          '</div>' +
          '<button class="btn btn-primary" onclick="GT.saveReminder()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="GT.deleteReminder(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== INSPEKCIJA DVI (🔑) ===== */
    inspection_form: function (params) {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1>Inspekcija vozila</h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      var vehId = params && params.vehicle_id;
      App._inspVehId = vehId || null;
      App._inspData = [];
      INSP_TEMPLATE.forEach(function (grp, si) {
        grp.ii.forEach(function (item, ii) {
          App._inspData.push({ si: si, ii: ii, status: "ok" });
        });
      });

      var pV = vehId ? Store.get("vehicles", vehId) : Promise.resolve(null);
      return Promise.all([pV, Store.all("vehicles")]).then(function (res) {
        var v = res[0], vehs = res[1];
        var vehOpts = '<option value="">— Bez vozila</option>' + vehs.map(function (vv) {
          return '<option value="' + esc(vv.id) + '"' + (v && vv.id === v.id ? " selected" : "") + '>' +
                 esc(vv.make + " " + vv.model + (vv.plate ? " • " + vv.plate : "")) + '</option>';
        }).join("");

        var sections = INSP_TEMPLATE.map(function (grp, si) {
          var rows = grp.ii.map(function (item, ii) {
            return '<div class="insp-row" id="insp_' + si + '_' + ii + '">' +
              '<span class="insp-label">' + esc(item) + '</span>' +
              '<div class="insp-btns">' +
                '<button class="insp-btn ok sel" data-st="ok"   onclick="GT.inspSet(' + si + ',' + ii + ',\'ok\')">✓</button>' +
                '<button class="insp-btn prati"    data-st="prati" onclick="GT.inspSet(' + si + ',' + ii + ',\'prati\')">!</button>' +
                '<button class="insp-btn hitno"    data-st="hitno" onclick="GT.inspSet(' + si + ',' + ii + ',\'hitno\')">✕</button>' +
              '</div>' +
            '</div>';
          }).join("");
          return '<div class="card"><h2>' + esc(grp.s) + '</h2>' + rows + '</div>';
        }).join("");

        return '<button class="linkback" onclick="GT.go(' + (vehId ? '\'vehicle_card\',{id:\'' + esc(vehId) + '\'}' : '\'home\'') + ')" data-i18n="common.back"></button>' +
          '<h1>Inspekcija vozila</h1>' +
          '<div class="card">' +
            '<label class="field"><span data-i18n="wo.pick_vehicle"></span><select id="insp_vehicle" onchange="App._inspVehId=this.value">' + vehOpts + '</select></label>' +
            '<label class="field"><span>Kilometraža</span><input id="insp_km" type="number" inputmode="numeric" placeholder="km"></label>' +
          '</div>' +
          sections +
          '<div class="card">' +
            '<label class="field"><span>Napomene</span><textarea id="insp_notes" rows="3" placeholder="Opšte napomene..."></textarea></label>' +
          '</div>' +
          '<div id="insp_summary" class="insp-summary"></div>' +
          '<button class="btn btn-primary" onclick="GT.saveInspection()">Sačuvaj inspekciju</button>';
      });
    },

    /* ===== GUME (🔑) ===== */
    tires_form: function (params) {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1>Gume</h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      var vehId = params && params.vehicle_id;
      return Store.get("vehicles", vehId).then(function (v) {
        if (!v) return '<div class="card"><p class="empty">Vozilo nije nađeno.</p></div>';
        var tires = v.tires || {};
        var seasonOpts = [
          { v: "summer", l: "Letnje" },
          { v: "winter", l: "Zimske" },
          { v: "allseason", l: "All-season" }
        ].map(function (o) {
          return '<option value="' + o.v + '"' + (tires.current_season === o.v ? " selected" : "") + '>' + o.l + '</option>';
        }).join("");
        var storageOpts = ["—", "Kod vlasnika", "Kod majstora", "Servis", "Vulkanizer"].map(function (s) {
          return '<option' + (tires.other_set_location === s ? " selected" : "") + '>' + esc(s) + '</option>';
        }).join("");

        return '<button class="linkback" onclick="GT.go(\'vehicle_card\',{id:\'' + esc(vehId) + '\'})" data-i18n="common.back"></button>' +
          '<h1>Gume — ' + esc(v.make + " " + v.model) + '</h1>' +
          '<div class="card"><h2>Trenutne gume</h2>' +
            '<label class="field"><span>Sezona na autu</span><select id="t_season">' + seasonOpts + '</select></label>' +
            field("t_front", "Dimenzija (prednje)", tires.size_front || "", "text", "205/55 R16") +
            field("t_rear", "Dimenzija (zadnje)", tires.size_rear || "", "text", "205/55 R16") +
            field("t_brand", "Marka guma", tires.current_brand || "", "text", "Michelin, Nokian...") +
            field("t_purchased", "Kupljene (mesec/god)", tires.current_purchased || "", "text", "05/2025") +
          '</div>' +
          '<div class="card"><h2>Drugi set</h2>' +
            '<label class="field"><span>Gde se čuva</span><select id="t_storage">' + storageOpts + '</select></label>' +
            field("t_other_brand", "Marka drugog seta", tires.other_brand || "") +
            field("t_other_size", "Dimenzija drugog seta", tires.other_size || "", "text", "205/55 R16") +
          '</div>' +
          '<div class="card"><h2>Zamena guma</h2>' +
            field("t_km", "Km pri zameni", "", "number") +
            '<p class="muted" style="font-size:.8rem;margin:.3rem 0">Snima zamenu kao događaj i ažurira koji set je na autu.</p>' +
            '<button class="btn btn-secondary" onclick="GT.saveTireSwap(\'' + esc(vehId) + '\')">Sačuvaj zamenu</button>' +
          '</div>' +
          '<button class="btn btn-primary mt8" onclick="GT.saveTires(\'' + esc(vehId) + '\')">Sačuvaj podatke o gumama</button>';
      });
    },

    /* ===== CHECK LISTA (🔑) ===== */
    checklist_form: function (params) {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1>Provera vozila</h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      var vehId  = (params && params.vehicle_id) || null;
      var tmplId = (params && params.tmpl) || "prijem";
      App._chkVehId  = vehId;
      App._chkTmplId = tmplId;

      var pV = vehId ? Store.get("vehicles", vehId) : Promise.resolve(null);
      return Promise.all([pV, Store.all("vehicles")]).then(function (res) {
        var v = res[0], vehs = res[1];
        var tmpl = CHECKLIST_TEMPLATES.filter(function (t) { return t.id === tmplId; })[0] || CHECKLIST_TEMPLATES[0];

        var tmplOpts = CHECKLIST_TEMPLATES.map(function (t) {
          return '<option value="' + esc(t.id) + '"' + (t.id === tmplId ? " selected" : "") + '>' + esc(t.name) + '</option>';
        }).join("");

        var vehOpts = '<option value="">— Bez vozila</option>' + vehs.map(function (vv) {
          return '<option value="' + esc(vv.id) + '"' + (v && vv.id === v.id ? " selected" : "") + '>' +
                 esc(vv.make + " " + vv.model + (vv.plate ? " • " + vv.plate : "")) + '</option>';
        }).join("");

        var items = tmpl.items.map(function (item, i) {
          return '<div class="chk-row">' +
            '<input type="checkbox" id="chk_' + i + '" checked>' +
            '<label for="chk_' + i + '">' + esc(item) + '</label>' +
            '<button class="chk-note-btn" onclick="GT.chkNoteToggle(' + i + ')">📝</button>' +
          '</div>' +
          '<textarea id="chnote_' + i + '" class="chk-note" hidden placeholder="Beleška..."></textarea>';
        }).join("");

        var extras = tmpl.extras
          ? '<div class="card"><h2>Prijem</h2>' +
              '<label class="field"><span>Gorivo pri preuzimanju</span>' +
                '<select id="chk_fuel"><option value="">—</option>' +
                ['Prazan', '1/4', '1/2', '3/4', 'Pun'].map(function (f) {
                  return '<option value="' + f + '">' + f + '</option>';
                }).join("") +
              '</select></label>' +
              field("chk_km", "common.mileage", "", "number") +
              '<label class="field"><span>Prigovor mušterije</span>' +
                '<textarea id="chk_complaint" rows="2" placeholder="Šta kaže mušterija..."></textarea></label>' +
              field("chk_pickup", "Rok preuzimanja", "", "date") +
            '</div>'
          : '';

        var back = vehId
          ? 'GT.go(\'vehicle_card\',{id:\'' + esc(vehId) + '\'})'
          : 'GT.go(\'home\')';

        return '<button class="linkback" onclick="' + back + '" data-i18n="common.back"></button>' +
          '<h1>Provera vozila</h1>' +
          '<div class="card">' +
            '<label class="field"><span>Tip provere</span>' +
              '<select id="chk_tmpl" onchange="GT.chkTemplate(this.value,\'' + esc(vehId || '') + '\')">' + tmplOpts + '</select></label>' +
            '<label class="field"><span data-i18n="wo.pick_vehicle"></span>' +
              '<select id="chk_vehicle" onchange="App._chkVehId=this.value">' + vehOpts + '</select></label>' +
          '</div>' +
          '<div class="card">' + items + '</div>' +
          extras +
          '<button class="btn btn-primary" onclick="GT.saveChecklist()">Sačuvaj proveru</button>';
      });
    },

    /* ===== KALKULATORI (🔑) ===== */
    calculators: function () {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1>Kalkulatori</h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      var currency = Store.settings.get("currency", "RSD");
      return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
        '<h1>Kalkulatori</h1>' +

        // 1. Marža
        '<div class="card">' +
          '<h2>Marža</h2>' +
          '<div class="calc-row">' +
            '<label class="field"><span>Nabavna cena (' + currency + ')</span><input id="c_cost" type="number" inputmode="decimal" placeholder="0" oninput="GT.calcMarza()"></label>' +
            '<label class="field"><span>Marža (%)</span><input id="c_pct" type="number" inputmode="decimal" placeholder="30" oninput="GT.calcMarza()"></label>' +
          '</div>' +
          '<div class="calc-result" id="c_marza_out"></div>' +
        '</div>' +

        // 2. Sledeći servis
        '<div class="card">' +
          '<h2>Sledeći servis</h2>' +
          '<div class="calc-row">' +
            '<label class="field"><span>Poslednji servis (km)</span><input id="c_last_km" type="number" inputmode="numeric" placeholder="120000" oninput="GT.calcServis()"></label>' +
            '<label class="field"><span>Interval (km)</span><input id="c_interval" type="number" inputmode="numeric" placeholder="10000" oninput="GT.calcServis()"></label>' +
          '</div>' +
          '<label class="field"><span>Datum poslednjeg servisa</span><input id="c_last_date" type="date" oninput="GT.calcServis()"></label>' +
          '<label class="field"><span>Interval po vremenu (meseci)</span><input id="c_months" type="number" inputmode="numeric" placeholder="12" oninput="GT.calcServis()"></label>' +
          '<div class="calc-result" id="c_servis_out"></div>' +
        '</div>' +

        // 3. Cena rada
        '<div class="card">' +
          '<h2>Cena rada</h2>' +
          '<div class="calc-row">' +
            '<label class="field"><span>Sati rada</span><input id="c_hours" type="number" inputmode="decimal" placeholder="2" oninput="GT.calcRad()"></label>' +
            '<label class="field"><span>Cena sat (' + currency + ')</span><input id="c_rate" type="number" inputmode="decimal" placeholder="1500" oninput="GT.calcRad()"></label>' +
          '</div>' +
          '<div class="calc-result" id="c_rad_out"></div>' +
        '</div>' +

        // 4. PDV
        '<div class="card">' +
          '<h2>PDV (20%)</h2>' +
          '<label class="field"><span>PDV stopa (%)</span><input id="c_vat" type="number" inputmode="decimal" value="20" oninput="GT.calcPDV();GT.calcPDVrev()"></label>' +
          '<div class="calc-row" style="margin-top:.5rem">' +
            '<div>' +
              '<label class="field"><span>Cena BEZ PDV →</span><input id="c_base" type="number" inputmode="decimal" placeholder="10000" oninput="GT.calcPDV()"></label>' +
              '<div class="calc-result" id="c_pdv_out"></div>' +
            '</div>' +
            '<div>' +
              '<label class="field"><span>Cena SA PDV →</span><input id="c_gross" type="number" inputmode="decimal" placeholder="12000" oninput="GT.calcPDVrev()"></label>' +
              '<div class="calc-result" id="c_pdv_rev_out"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
    },

    /* ===== STATS (🔑) ===== */
    stats: function () {
      if (!licensed()) {
        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1>Statistike</h1>' +
          '<div class="card locked-card"><p class="empty" data-i18n="reminders.locked"></p>' +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'settings\')" data-i18n="license.title"></button></div>';
      }
      return Promise.all([
        Store.all("documents"), Store.all("events"), Store.all("vehicles"), Store.all("contacts")
      ]).then(function (res) {
        var docs = res[0], evs = res[1], vehs = res[2];
        var evById = {}; evs.forEach(function (e) { evById[e.id] = e; });
        var vehById = {}; vehs.forEach(function (v) { vehById[v.id] = v; });

        // Samo završeni nalozi (work_order + invoice), ne predračuni
        var woDocs = docs.filter(function (d) {
          return d.doc_type === "work_order" || d.doc_type === "invoice";
        });

        var today = new Date();
        var thisMonth = today.toISOString().slice(0, 7); // "YYYY-MM"

        // Prihod po valuti — sve stavke svih RN događaja
        var totalByCur = {}, monthByCur = {};
        var woCount = 0, monthCount = 0;
        var vehiclesSeen = {};
        var titleFreq = {};

        woDocs.forEach(function (d) {
          var ev = evById[d.event_id];
          if (!ev) return;
          woCount++;
          var docMonth = (d.date || d.created_at || "").slice(0, 7);
          var isThisMonth = docMonth === thisMonth;
          if (isThisMonth) monthCount++;
          if (ev.vehicle_id) vehiclesSeen[ev.vehicle_id] = true;

          // Frekvencija naslova
          var key = ev.title || ev.type || "Ostalo";
          titleFreq[key] = (titleFreq[key] || 0) + 1;

          // Prihod
          (ev.items || []).forEach(function (it) {
            var cur = it.currency || "RSD";
            var line = (Number(it.price) || 0) * (Number(it.qty) || 1);
            totalByCur[cur] = (totalByCur[cur] || 0) + line;
            if (isThisMonth) monthByCur[cur] = (monthByCur[cur] || 0) + line;
          });
        });

        var totalStr = Models.formatTotals(totalByCur) || "0 RSD";
        var monthStr = Models.formatTotals(monthByCur) || "0 RSD";
        var vehCount = Object.keys(vehiclesSeen).length;

        // Top 5 servisa
        var topServices = Object.keys(titleFreq)
          .sort(function (a, b) { return titleFreq[b] - titleFreq[a]; })
          .slice(0, 5);

        var topHtml = topServices.length
          ? topServices.map(function (k) {
              var pct = Math.round(titleFreq[k] / woCount * 100);
              return '<div class="stat-bar-row">' +
                '<span class="stat-bar-label">' + esc(k) + '</span>' +
                '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + pct + '%"></div></div>' +
                '<span class="stat-bar-val">' + titleFreq[k] + '</span>' +
              '</div>';
            }).join("")
          : '<p class="empty">Nema podataka</p>';

        // Mesečni prihod — poslednjih 6 meseci (RSD)
        var months = [];
        for (var m = 5; m >= 0; m--) {
          var d = new Date(today.getFullYear(), today.getMonth() - m, 1);
          months.push(d.toISOString().slice(0, 7));
        }
        var monthlyRSD = {};
        months.forEach(function (mo) { monthlyRSD[mo] = 0; });
        woDocs.forEach(function (d) {
          var ev = evById[d.event_id]; if (!ev) return;
          var mo = (d.date || d.created_at || "").slice(0, 7);
          if (!(mo in monthlyRSD)) return;
          (ev.items || []).forEach(function (it) {
            if ((it.currency || "RSD") === "RSD") {
              monthlyRSD[mo] += (Number(it.price) || 0) * (Number(it.qty) || 1);
            }
          });
        });
        var maxRSD = Math.max.apply(null, months.map(function (mo) { return monthlyRSD[mo]; })) || 1;
        var chartHtml = months.map(function (mo) {
          var pct = Math.round(monthlyRSD[mo] / maxRSD * 100);
          var label = mo.slice(5); // "MM"
          var isActive = mo === thisMonth;
          return '<div class="month-col' + (isActive ? " active" : "") + '">' +
            '<div class="month-bar-wrap"><div class="month-bar" style="height:' + pct + '%"></div></div>' +
            '<span class="month-label">' + label + '</span>' +
          '</div>';
        }).join("");

        return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
          '<h1>Statistike</h1>' +
          '<div class="statrow">' +
            '<div class="stat"><b>' + woCount + '</b><span>Radnih naloga</span></div>' +
            '<div class="stat"><b>' + monthCount + '</b><span>Ovaj mesec</span></div>' +
            '<div class="stat"><b>' + vehCount + '</b><span>Vozila</span></div>' +
          '</div>' +
          '<div class="card">' +
            '<h2>Ukupan prihod</h2>' +
            '<div class="stat-big">' + esc(totalStr) + '</div>' +
            '<div class="stat-sub">Ovaj mesec: <b>' + esc(monthStr) + '</b></div>' +
          '</div>' +
          '<div class="card">' +
            '<h2>Prihod po mesecima (RSD, zadnjih 6)</h2>' +
            '<div class="month-chart">' + chartHtml + '</div>' +
          '</div>' +
          '<div class="card">' +
            '<h2>Najčešći servisi</h2>' +
            topHtml +
          '</div>';
      });
    },

    /* ===== DNEVNIK — zakazivanje i aktivni radovi ===== */
    dnevnik: function () {
      return Promise.all([
        Store.all("appointments"),
        Store.all("vehicles"),
        Store.all("contacts")
      ]).then(function (res) {
        var apts = res[0];
        App._vehById = {}; res[1].forEach(function (v) { App._vehById[v.id] = v; });
        App._contactsById = {}; res[2].forEach(function (c) { App._contactsById[c.id] = c; });

        var now = new Date();
        var todayStr = now.toISOString().slice(0, 10);
        var weekEnd = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        var active = apts.filter(function (a) { return a.status === "active"; })
          .sort(function (a, b) { return (a.scheduled_at || "").localeCompare(b.scheduled_at || ""); });

        var upcoming = apts.filter(function (a) {
          if (a.status !== "scheduled") return false;
          var d = (a.scheduled_at || "").slice(0, 10);
          return d >= todayStr && d <= weekEnd;
        }).sort(function (a, b) { return (a.scheduled_at || "").localeCompare(b.scheduled_at || ""); });

        function aptRowHTML(a, showStart) {
          var v = a.vehicle_id && App._vehById[a.vehicle_id];
          var vLabel = v ? esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) : "";
          var name = esc(a.customer_name || (App._contactsById[a.contact_id] && App._contactsById[a.contact_id].name) || "—");
          var phone = a.customer_phone || (App._contactsById[a.contact_id] && App._contactsById[a.contact_id].phone) || "";
          var time = a.scheduled_at ? a.scheduled_at.slice(0, 16).replace("T", " ") : "";
          var dur = a.duration_min ? a.duration_min + " min" : "";
          return '<div class="card apt-row apt-' + esc(a.status) + '">' +
            '<button class="rowmain" onclick="GT.go(\'appointment_form\',{id:\'' + esc(a.id) + '\'})">' +
              '<b>' + name + (a.service_type ? ' — ' + esc(a.service_type) : '') + '</b>' +
              '<span class="muted">' + time + (dur ? ' • ' + dur : '') + '</span>' +
              (vLabel ? '<span class="muted">' + vLabel + '</span>' : '') +
            '</button>' +
            '<div style="display:flex;gap:.4rem;align-items:center">' +
              (phone ? '<a class="callpill" href="tel:' + esc(phone) + '">☎</a>' : '') +
              (showStart
                ? '<button class="aptbtn start" onclick="GT.aptStatus(\'' + esc(a.id) + '\',\'active\')">▶ Start</button>'
                : '<button class="aptbtn done" onclick="GT.aptStatus(\'' + esc(a.id) + '\',\'done\')">✓ Done</button>') +
            '</div>' +
          '</div>';
        }

        var activeHtml = active.length
          ? active.map(function (a) { return aptRowHTML(a, false); }).join("")
          : '<div class="card"><p class="empty">Nema aktivnih radova</p></div>';

        var upcomingHtml = upcoming.length
          ? upcoming.map(function (a) { return aptRowHTML(a, true); }).join("")
          : '<div class="card"><p class="empty">Nema zakazanih za ovu nedelju</p></div>';

        return '<h1>Dnevnik</h1>' +
          '<h2 class="secttitle">🔧 Aktivni radovi</h2>' +
          activeHtml +
          '<h2 class="secttitle">📅 Zakazano (danas + 7 dana)</h2>' +
          upcomingHtml +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'appointment_form\')">+ Zakaži termin</button>';
      });
    },

    appointment_form: function (params) {
      var id = params && params.id;
      var p = id ? Store.get("appointments", id) : Promise.resolve(null);
      return Promise.all([p, Store.all("vehicles"), Store.all("contacts")]).then(function (res) {
        var a = res[0]; App._editingAppointment = a || null;
        a = a || Models.createAppointment({});
        var vehicles = res[1], contacts = res[2];

        var vehOpts = '<option value="">— (bez vozila)</option>' + vehicles.map(function (v) {
          return '<option value="' + esc(v.id) + '"' + (a.vehicle_id === v.id ? " selected" : "") + '>' +
                 esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</option>';
        }).join("");

        var conOpts = '<option value="">— (brzi unos)</option>' + contacts.map(function (c) {
          return '<option value="' + esc(c.id) + '"' + (a.contact_id === c.id ? " selected" : "") + '>' +
                 esc(c.name) + (c.phone ? " • " + c.phone : "") + '</option>';
        }).join("");

        var durOpts = [30, 60, 90, 120, 180, 240, 480].map(function (m) {
          var label = m < 60 ? m + " min" : (m % 60 === 0 ? (m / 60) + " h" : Math.floor(m/60) + "h " + (m%60) + "min");
          return '<option value="' + m + '"' + (a.duration_min === m ? " selected" : "") + '>' + label + '</option>';
        }).join("");

        var statusOpts = Models.APPOINTMENT_STATUSES.map(function (s) {
          var labels = { scheduled: "Zakazano", active: "U radu", done: "Završeno", cancelled: "Otkazano" };
          return '<option value="' + s + '"' + (a.status === s ? " selected" : "") + '>' + (labels[s] || s) + '</option>';
        }).join("");

        return '<button class="linkback" onclick="GT.go(\'dnevnik\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? "Izmena termina" : "Novi termin") + '</h1>' +
          '<div class="card">' +
            '<label class="field"><span>Mušterija (kontakt)</span><select id="ap_contact" onchange="GT.aptContactFill()">' + conOpts + '</select></label>' +
            field("ap_name", "contacts.name", a.customer_name, "text", "Ime i prezime") +
            field("ap_phone", "contacts.phone", a.customer_phone, "tel", "+381...") +
            field("ap_service", "Vrsta posla", a.service_type, "text", "servis, registracija, dijagnostika...") +
            '<label class="field"><span>Vozilo</span><select id="ap_vehicle">' + vehOpts + '</select></label>' +
            field("ap_time", "Datum i vreme", a.scheduled_at.slice(0, 16), "datetime-local") +
            '<label class="field"><span>Trajanje</span><select id="ap_dur">' + durOpts + '</select></label>' +
            (id ? '<label class="field"><span>Status</span><select id="ap_status">' + statusOpts + '</select></label>' : '') +
            '<label class="field"><span>Napomena</span><textarea id="ap_notes" rows="2">' + esc(a.notes) + '</textarea></label>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GT.saveAppointment()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="GT.deleteAppointment(\'' + esc(id) + '\')">Obriši termin</button>' : '');
      });
    },

    /* ===== DETALJI DOGAĐAJA ===== */
    event_detail: function (params) {
      var id = params && params.id;
      return Promise.all([
        Store.get("events", id),
        Store.all("vehicles"),
        Store.all("contacts")
      ]).then(function (res) {
        var ev = res[0];
        if (!ev) return '<div class="card"><p class="empty">Događaj nije nađen.</p></div>';
        var vehById = {}; res[1].forEach(function (v) { vehById[v.id] = v; });
        var conById = {}; res[2].forEach(function (c) { conById[c.id] = c; });
        var v = vehById[ev.vehicle_id];
        var c = conById[ev.contact_id];

        var back = v
          ? 'GT.go(\'vehicle_card\',{id:\'' + esc(ev.vehicle_id) + '\'})'
          : 'GT.go(\'home\')';

        var itemsHtml = (ev.items && ev.items.length)
          ? '<div class="card"><h2>Stavke</h2>' +
              ev.items.map(function (it) {
                var qty = it.qty != null ? it.qty : 1;
                var line = (Number(it.price) || 0) * qty;
                var kindLabel = it.kind === "labor" ? '<span class="muted" style="font-size:.75rem">[rad]</span> ' : '';
                var bmLabel = (it.brand || it.model) ? '<span class="muted" style="font-size:.75rem;display:block">' + esc([it.brand, it.model].filter(Boolean).join(' · ')) + '</span>' : '';
                return '<div class="evt-item-row">' +
                  '<span class="evt-item-name">' + kindLabel + esc(it.name || "—") + bmLabel + '</span>' +
                  '<span class="evt-item-detail">' + qty + (it.unit ? " " + it.unit : "") + ' × ' + Models.formatAmount(Number(it.price) || 0, it.currency) + '</span>' +
                  '<span class="evt-item-sum">' + Models.formatAmount(line, it.currency) + '</span>' +
                '</div>';
              }).join("") +
              '<div class="evt-item-row total"><b>Ukupno</b><span></span><b>' + Models.formatTotals(Models.sumByCurrency(ev.items)) + '</b></div>' +
            '</div>'
          : '';

        var photosHtml = (ev.photos && ev.photos.length)
          ? '<div class="card"><h2>Slike</h2><div class="photostrip">' +
              ev.photos.map(function (p) { return '<div class="photocell"><img src="' + p + '"></div>'; }).join("") +
            '</div></div>'
          : '';

        var chkHtml = "";
        if (ev.type === "checklist" && ev._checklist && ev._checklist.length) {
          var rows = ev._checklist.map(function (it) {
            return '<div class="chk-row" style="pointer-events:none">' +
              '<input type="checkbox"' + (it.checked ? " checked" : "") + ' disabled>' +
              '<label>' + esc(it.item) + (it.note ? ' — <em>' + esc(it.note) + '</em>' : '') + '</label>' +
            '</div>';
          }).join("");
          var intakeHtml = ev._intake
            ? (ev._intake.fuel ? '<div class="techrow"><span>Gorivo</span><b>' + esc(ev._intake.fuel) + '</b></div>' : '') +
              (ev._intake.complaint ? '<div class="techrow"><span>Prigovor</span><b>' + esc(ev._intake.complaint) + '</b></div>' : '') +
              (ev._intake.pickup_date ? '<div class="techrow"><span>Rok preuzimanja</span><b>' + esc(ev._intake.pickup_date) + '</b></div>' : '')
            : '';
          chkHtml = '<div class="card"><h2>Stavke provere</h2>' + rows + (intakeHtml ? '<div style="margin-top:.5rem">' + intakeHtml + '</div>' : '') + '</div>';
        }

        var inspHtml2 = "";
        if (ev.type === "inspection" && ev._inspection && ev._inspection.length) {
          var sGroups = {};
          ev._inspection.forEach(function (it) {
            if (!sGroups[it.system]) sGroups[it.system] = [];
            sGroups[it.system].push(it);
          });
          var ST = { ok: "✓ OK", prati: "! Prati", hitno: "✕ Hitno" };
          var SC = { ok: "#166534", prati: "#92400e", hitno: "#991b1b" };
          inspHtml2 = '<div class="card"><h2>Inspekcija</h2>' +
            Object.keys(sGroups).map(function (sys) {
              return '<b style="font-size:.82rem;display:block;margin:.4rem 0 .2rem">' + esc(sys) + '</b>' +
                sGroups[sys].map(function (it) {
                  return '<div style="display:flex;justify-content:space-between;padding:.2rem 0;font-size:.84rem">' +
                    '<span>' + esc(it.item) + '</span>' +
                    '<span style="font-weight:600;color:' + (SC[it.status] || "#333") + '">' + (ST[it.status] || it.status) + '</span>' +
                  '</div>';
                }).join("");
            }).join("") +
          '</div>';
        }

        return '<button class="linkback" onclick="' + back + '" data-i18n="common.back"></button>' +
          '<h1>' + esc(ev.title || ev.type) + '</h1>' +
          '<p class="sub">' + esc(ev.date || "—") + (ev.mileage_km != null ? ' • ' + esc(ev.mileage_km) + ' km' : '') + '</p>' +
          (v ? '<p class="sub">Vozilo: <b>' + esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</b></p>' : '') +
          (c ? '<a class="card ownerrow" href="tel:' + esc(c.phone) + '"><span>Klijent: <b>' + esc(c.name) + '</b></span><span class="callpill">☎</span></a>' : '') +
          (ev.description ? '<div class="card"><h2>Opis</h2><p style="font-size:.9rem;line-height:1.5">' + esc(ev.description) + '</p></div>' : '') +
          itemsHtml + chkHtml + inspHtml2 + photosHtml;
      });
    },

    /* ===== RANIJI UNOS — retroaktivni istorijski događaj (Marko feedback #1) ===== */
    history_add: function (params) {
      var vehId = params && params.vehicle_id;
      GT._histPhotos = [];
      return Store.get("vehicles", vehId).then(function (v) {
        if (!v) return '<div class="card"><p class="empty">Vozilo nije nađeno.</p></div>';
        GT._histVehId = vehId;
        var quick = (App.config.quick_services || []).map(function (s) {
          return '<option value="' + esc(s) + '">' + esc(s) + '</option>';
        }).join("");
        return '' +
          '<button class="linkback" onclick="GT.go(\'vehicle_card\',{id:\'' + esc(vehId) + '\'})" data-i18n="common.back"></button>' +
          '<h1 data-i18n="gh.title"></h1>' +
          '<p class="sub">' + esc(v.make + " " + v.model) + ' — ' + t("gh.sub") + '</p>' +
          '<div class="card">' +
            '<label class="field"><span>' + t("gh.what") + '</span><select id="h_quick" onchange="GT.histQuick()">' +
              '<option value="">—</option>' + quick + '</select></label>' +
            field("h_title", "d.event_title", "") +
            '<label class="field"><span>' + t("d.date_precision") + '</span><select id="h_dprec">' +
              '<option value="approx">' + t("d.prec_approx") + '</option>' +
              '<option value="month">' + t("d.prec_month") + '</option>' +
              '<option value="exact">' + t("d.prec_exact") + '</option>' +
            '</select></label>' +
            field("h_date", "common.date", "", "date") +
            field("h_km", "common.mileage", "", "number") +
            '<label class="chk"><input type="checkbox" id="h_kmapprox"> ' + t("d.km_approx") + '</label>' +
            '<label class="field"><span>' + t("d.event_desc") + '</span><textarea id="h_desc" rows="2"></textarea></label>' +
            '<label class="btn btn-secondary mt8 filelabel"><span data-i18n="d.event_photo"></span>' +
              '<input type="file" accept="image/*" multiple onchange="GT.histPhotos(this)" hidden></label>' +
            '<div id="hPreview"></div>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GT.saveHistory()" data-i18n="common.save"></button>';
      });
    },

    /* ===== GRANT MANAGER — pristup vozilima (FEEDBACK #3) ===== */
    grant_manager: function () {
      var sess = ahSession();
      if (!sess) {
        return '<button class="linkback" onclick="GT.go(\'settings\')" data-i18n="common.back"></button>' +
          '<h1>Pristup vozilima</h1>' +
          '<div class="card"><p class="empty">Prijaviš se na AutoHub da bih upravljao pristupom.</p></div>';
      }
      var vmap = JSON.parse(localStorage.getItem(AH_VMAP_KEY) || "{}");
      var localIds = Object.keys(vmap);
      if (!localIds.length) {
        return '<button class="linkback" onclick="GT.go(\'settings\')" data-i18n="common.back"></button>' +
          '<h1>Pristup vozilima</h1>' +
          '<div class="card"><p class="empty">Nema sinhronizovanih vozila. Uradi sync u Podešavanjima.</p></div>';
      }
      return Store.all("vehicles").then(function (vehicles) {
        var vById = {};
        vehicles.forEach(function (v) { vById[v.id] = v; });

        return Promise.all(localIds.map(function (lid) {
          var servId = vmap[lid];
          return autohubFetch("GET", "/vehicles/" + servId + "/grants").then(function (gs) {
            return { lid: lid, servId: servId, grants: gs };
          }).catch(function () {
            return { lid: lid, servId: servId, grants: [] };
          });
        })).then(function (results) {
          var ROLE_LABELS = { read: "Čitanje", write: "Pisanje", "write-tires-only": "Samo gume" };
          var cards = results.map(function (r) {
            var v = vById[r.lid];
            var vName = v ? esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) : "Nepoznato vozilo";
            var grantRows = r.grants.length
              ? r.grants.map(function (g) {
                  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;border-bottom:1px solid #f1f5f9">' +
                    '<span style="font-size:.85rem"><b>' + esc(g.grantee_name || g.grantee_email) + '</b>' +
                    '<span class="muted"> — ' + (ROLE_LABELS[g.role] || g.role) + '</span>' +
                    (g.expires_at ? '<span class="muted"> do ' + esc(g.expires_at.slice(0,10)) + '</span>' : '') +
                    '</span>' +
                    '<button class="btn btn-danger" style="padding:.2rem .6rem;font-size:.75rem" ' +
                      'onclick="GT.autohubGrantRevoke(\'' + esc(r.lid) + '\',\'' + esc(g.grantee_email) + '\')">Opozovi</button>' +
                  '</div>';
                }).join("")
              : '<p class="muted" style="font-size:.82rem;margin:.4rem 0">Nema aktivnih pristupa.</p>';

            return '<div class="card" style="margin-bottom:.8rem">' +
              '<b>' + vName + '</b>' +
              '<div style="margin:.5rem 0">' + grantRows + '</div>' +
              '<details style="margin-top:.6rem">' +
                '<summary style="font-size:.82rem;cursor:pointer;color:#0F766E">+ Dodaj pristup</summary>' +
                '<div style="margin-top:.5rem">' +
                  '<label class="field"><span>Email korisnika</span><input type="email" id="gr_email_' + esc(r.lid) + '" placeholder="nikola@email.com"></label>' +
                  '<label class="field"><span>Uloga</span><select id="gr_role_' + esc(r.lid) + '">' +
                    '<option value="read">Čitanje — vidi istoriju</option>' +
                    '<option value="write">Pisanje — dodaje zapise</option>' +
                    '<option value="write-tires-only">Samo gume</option>' +
                  '</select></label>' +
                  '<label class="field"><span>Ističe za (dana, prazno = trajno)</span><input type="number" id="gr_days_' + esc(r.lid) + '" placeholder="30" min="1"></label>' +
                  '<button class="btn btn-primary" style="margin-top:.4rem" ' +
                    'onclick="GT.autohubGrantAdd(\'' + esc(r.lid) + '\')">Dodaj pristup</button>' +
                  '<div id="gr_err_' + esc(r.lid) + '" style="color:#f87171;font-size:.8rem;margin-top:.3rem"></div>' +
                '</div>' +
              '</details>' +
            '</div>';
          }).join("");

          return '<button class="linkback" onclick="GT.go(\'settings\')" data-i18n="common.back"></button>' +
            '<h1>Pristup vozilima ☁</h1>' +
            '<p class="sub" style="margin-bottom:.8rem">Ko može da vidi ili upisuje istoriju tvojih vozila.</p>' +
            cards;
        });
      });
    },

    /* ===== SELL PART — forma za objavljivanje dela ===== */
    sell_part: function () {
      var profile = Store.settings.get("profile") || {};
      var currency = Store.settings.get("currency") || "RSD";
      var cats = [
        ["motor","Motor"], ["menjac","Menjač"], ["kocnice","Kočnice"], ["trap","Trap/vešanje"],
        ["karoserija","Karoserija"], ["elektrika","Elektrika"], ["klima","Klima/grejanje"],
        ["filteri","Filteri"], ["gume","Gume"], ["stakla","Stakla"], ["ostalo","Ostalo"]
      ];
      var catOpts = cats.map(function (c) {
        return '<option value="' + c[0] + '">' + c[1] + '</option>';
      }).join("");
      var curOpts = ["RSD","EUR"].map(function (c) {
        return '<option value="' + c + '"' + (c === currency ? " selected" : "") + '>' + c + '</option>';
      }).join("");

      return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
        '<h1>📦 Prodaj deo</h1>' +
        '<div class="card">' +
          '<label>Naziv dela *<br>' +
            '<input id="sp_title" class="field" type="text" placeholder="npr. Filter ulja Mann W7018"></label>' +
          '<label style="margin-top:.6rem">Kategorija<br>' +
            '<select id="sp_cat" class="field">' + catOpts + '</select></label>' +
          '<label style="margin-top:.6rem">Stanje<br>' +
            '<select id="sp_cond" class="field">' +
              '<option value="polovan">Polovan</option>' +
              '<option value="nov">Nov</option>' +
              '<option value="renoviran">Renoviran</option>' +
            '</select></label>' +
          '<label style="margin-top:.6rem">Kataloški broj (opciono)<br>' +
            '<input id="sp_partno" class="field" type="text" placeholder="npr. W7018"></label>' +
        '</div>' +
        '<div class="card">' +
          '<p style="font-weight:600;margin-bottom:.4rem">Kompatibilnost (opciono)</p>' +
          '<div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
            '<input id="sp_make" class="field" type="text" placeholder="Marka" style="flex:1;min-width:100px">' +
            '<input id="sp_model" class="field" type="text" placeholder="Model" style="flex:1;min-width:100px">' +
            '<input id="sp_yf" class="field" type="number" placeholder="Od god." style="flex:1;min-width:70px">' +
            '<input id="sp_yt" class="field" type="number" placeholder="Do god." style="flex:1;min-width:70px">' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div style="display:flex;gap:.4rem">' +
            '<label style="flex:2">Cena *<br><input id="sp_price" class="field" type="number" min="0" placeholder="0"></label>' +
            '<label style="flex:1">Valuta<br><select id="sp_cur" class="field">' + curOpts + '</select></label>' +
          '</div>' +
          '<label style="margin-top:.6rem">Grad<br>' +
            '<input id="sp_city" class="field" type="text" value="' + esc(profile.address || "") + '" placeholder="npr. Kruševac"></label>' +
          '<label style="margin-top:.6rem">Opis (stanje, original, km...)<br>' +
            '<textarea id="sp_desc" class="field" rows="3" placeholder="Napomene o delu..."></textarea></label>' +
        '</div>' +
        '<div class="card">' +
          '<p style="font-weight:600;margin-bottom:.4rem">Kontakt *</p>' +
          '<label>Ime / naziv<br>' +
            '<input id="sp_cname" class="field" type="text" value="' + esc(profile.name || "") + '"></label>' +
          '<label style="margin-top:.6rem">Telefon<br>' +
            '<input id="sp_cphone" class="field" type="tel" value="' + esc(profile.phone || "") + '" placeholder="+381..."></label>' +
          '<label style="margin-top:.6rem">Kontakt metod<br>' +
            '<select id="sp_cmethod" class="field">' +
              '<option value="phone_call">📞 Poziv</option>' +
              '<option value="message">✉️ Poruka</option>' +
            '</select></label>' +
        '</div>' +
        '<p id="sp_err" style="color:var(--c-danger,#c0392b);font-size:.85rem;display:none"></p>' +
        '<button class="btn btn-primary" onclick="GT.savePartListing()">Objavi oglas</button>';
    },

    /* ===== MY PARTS — lista mojih oglasa delova ===== */
    my_parts: function () {
      var parts = (typeof Autodelovi !== "undefined") ? Autodelovi.getMyParts() : [];
      var rows = parts.length
        ? parts.map(function (p) {
            var dateStr = p.created_at ? p.created_at.slice(0, 10) : "";
            return '<div class="card" style="margin-bottom:.5rem">' +
              '<div class="evt-head">' +
                '<b>' + esc(p.title) + '</b>' +
                '<span>' + dateStr + '</span>' +
              '</div>' +
              '<div style="margin-top:.4rem;display:flex;gap:.5rem;flex-wrap:wrap">' +
                '<a href="' + esc(p.url || "") + '" target="_blank" class="btn btn-secondary" style="font-size:.8rem;padding:.3rem .7rem">🔗 Oglas</a>' +
                '<button class="btn" style="background:var(--c-danger,#c0392b);color:#fff;font-size:.8rem;padding:.3rem .7rem" ' +
                  'onclick="GT.deletePartListing(' + p.part_id + ',\'' + esc(p.seller_token) + '\')">🗑 Ukloni</button>' +
              '</div>' +
            '</div>';
          }).join("")
        : '<p class="empty">Nemaš aktivnih oglasa delova.</p>';

      return '<button class="linkback" onclick="GT.go(\'home\')" data-i18n="common.back"></button>' +
        '<h1>📋 Moji oglasi delova</h1>' +
        '<button class="btn btn-primary" onclick="GT.go(\'sell_part\')" style="margin-bottom:.8rem">+ Novi oglas</button>' +
        rows;
    }
  };

  /* ---------- License helperi ---------- */

  function licensed() { return License.isLicensed(Store); }

  function licenseCardHTML() {
    var st = License.getState(Store);
    if (st.licensed) {
      var msg = st.test ? t("license.test_active") : t("license.active");
      return '<h2 data-i18n="settings.license"></h2>' +
        '<p class="lic-ok">✓ ' + msg + '</p>' +
        '<button class="btn btn-secondary mt8" onclick="GT.removeLicense()" data-i18n="license.remove"></button>';
    }
    return '<h2 data-i18n="settings.license"></h2>' +
      '<p class="empty" data-i18n="license.free_note"></p>' +
      '<label class="field mt8"><span data-i18n="license.enter_key"></span>' +
        '<input id="lic_key" type="text" placeholder="XXXXXXXX-XXXXXXXX"></label>' +
      '<button class="btn btn-primary" onclick="GT.activateLicense()" data-i18n="license.activate"></button>';
  }

  /* ---------- AutoHub helperi ---------- */

  var AH_SESSION_KEY = "autohub_garage_session";
  var AH_VMAP_KEY    = "autohub_garage_vmap";
  var AH_SYNCED_KEY  = "autohub_garage_synced";

  function ahSession() {
    try { return JSON.parse(localStorage.getItem(AH_SESSION_KEY)); } catch (e) { return null; }
  }

  function autohubCardHTML() {
    var sess = ahSession();
    if (sess) {
      return '<p style="font-size:.85rem;color:#94a3b8;margin-bottom:.6rem">Prijavljen: <b>' + esc(sess.name) + '</b> (' + esc(sess.email) + ')</p>' +
        '<button class="btn btn-secondary" onclick="GT.autohubSync()">🔄 Sinhronizuj sve</button>' +
        '<button class="btn btn-secondary mt8" onclick="GT.go(\'grant_manager\')">🔑 Pristup vozilima</button>' +
        '<div id="ahSyncStatus" style="font-size:.8rem;color:#94a3b8;margin-top:.4rem"></div>' +
        '<button class="btn btn-danger mt8" style="background:none;border:1px solid #475569;color:#94a3b8" onclick="GT.autohubLogout()">Odjavi se sa AutoHub-a</button>';
    }
    return '<p style="font-size:.82rem;color:#94a3b8;margin-bottom:.6rem">Sinhronizuj podatke sa serverom. Prvi nalog postaje admin.</p>' +
      '<label class="field"><span>Ime</span><input id="ah_name" type="text" placeholder="Marko Petrović"></label>' +
      '<label class="field"><span>Email</span><input id="ah_email" type="email" placeholder="marko@servis.rs"></label>' +
      '<label class="field"><span>Lozinka</span><input id="ah_pass" type="password"></label>' +
      '<button class="btn btn-primary" onclick="GT.autohubRegister()">Registruj se</button>' +
      '<button class="btn btn-secondary mt8" onclick="GT.autohubLogin()">Prijavi se (postojeći nalog)</button>' +
      '<p id="ahErr" style="color:#f87171;font-size:.8rem;margin-top:.4rem"></p>';
  }

  function autohubFetch(method, path, body, noAuth) {
    var sess = ahSession();
    return window.AutoHub.getPlatformUrl().then(function (hubUrl) {
      if (!hubUrl) throw new Error("AutoHub nedostupan — pokreni server.");
      var hdrs = { "Content-Type": "application/json" };
      if (!noAuth && sess) hdrs["Authorization"] = "Bearer " + sess.token;
      return fetch(hubUrl + path, {
        method: method,
        headers: hdrs,
        body: body ? JSON.stringify(body) : undefined
      }).then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || r.statusText);
          return d;
        });
      });
    });
  }

  function ahMapEventType(type) {
    var m = {
      work_order: "service", estimate: "note", service: "service",
      oil_change: "oil_change", tire_change: "tire_change", tire_rotation: "tire_rotation",
      inspection: "inspection", registration: "registration", insurance: "insurance",
      repair: "repair", fuel: "fuel", mileage: "mileage", note: "note", initial: "initial",
      expense_fuel: "fuel", expense_tires: "repair", expense_bodywork: "repair",
      expense_registration: "registration", expense_insurance: "insurance",
      expense_decorative: "other", expense_other: "other"
    };
    return m[type] || "other";
  }

  /* ---------- Reminders helperi ---------- */

  function latestKmByVehicle(events) {
    var km = {};
    events.forEach(function (e) {
      if (e.mileage_km != null && e.vehicle_id) {
        if (km[e.vehicle_id] == null || e.mileage_km > km[e.vehicle_id]) {
          km[e.vehicle_id] = e.mileage_km;
        }
      }
    });
    return km;
  }

  function reminderRowHTML(r, today, kmBy) {
    var km = kmBy[r.vehicle_id];
    var s = Reminders.status(r, today, km);
    var v = App._vehById && App._vehById[r.vehicle_id];
    var badge = { due: "due", soon: "soon", upcoming: "upcoming", done: "done" }[s.state];
    var badgeLabel = t("reminders.state_" + s.state) || "";
    if (s.state === "done") badgeLabel = t("reminders.done");

    var detail = "";
    if (s.state !== "done") {
      if (s.reason === "date" || (s.daysLeft != null && s.reason !== "mileage")) {
        if (s.daysLeft != null) {
          detail = s.daysLeft <= 0
            ? Math.abs(s.daysLeft) + " " + t("reminders.days_left") + " (" + t("reminders.overdue") + ")"
            : s.daysLeft + " " + t("reminders.days_left");
        }
      }
      if (s.reason === "mileage" && s.kmLeft != null) {
        detail = s.kmLeft <= 0
          ? Math.abs(s.kmLeft) + " " + t("reminders.km_left") + " (" + t("reminders.overdue") + ")"
          : s.kmLeft + " " + t("reminders.km_left");
      }
    }

    return '<div class="card remrow rem-' + badge + '">' +
      '<button class="rowmain" onclick="GT.go(\'reminder_form\',{id:\'' + esc(r.id) + '\'})">' +
        '<b>' + esc(r.title) + '</b>' +
        '<span class="muted">' + (v ? esc(v.make + " " + v.model) : "") +
          (detail ? ' • ' + detail : '') + '</span>' +
      '</button>' +
      (r.done
        ? '<span class="rembadge done">✓</span>'
        : '<button class="rembadge ' + badge + '" onclick="GT.markReminderDone(\'' + esc(r.id) + '\')" title="' + t("reminders.mark_done") + '">✓</button>') +
      '</div>';
  }

  /* ---------- Akcije ---------- */

  function contactListHTML(contacts) {
    if (!contacts.length) return '<div class="card"><p class="empty" data-i18n="contacts.empty"></p></div>';
    return contacts.map(function (c) {
      return '<div class="card contactrow">' +
        '<button class="rowmain" onclick="GT.go(\'contact_form\',{id:\'' + esc(c.id) + '\'})">' +
          '<b>' + esc(c.name) + '</b>' +
          '<span class="muted">' + esc(c.phone || "") + (c.roles.length ? ' • ' + c.roles.map(function (r) { return t("contacts.role_" + r); }).join(", ") : '') + '</span>' +
        '</button>' +
        (c.phone ? '<a class="callpill" href="tel:' + esc(c.phone) + '">☎</a>' : '') +
      '</div>';
    }).join("");
  }

  function vehicleListHTML(vehicles) {
    if (!vehicles.length) {
      return '<div class="card"><p class="empty">' + t("vehicles.empty") + '</p></div>';
    }
    return vehicles.map(function (v) {
      var owner = App._contactsById[v.owner_contact_id];
      return '<button class="card vehrow" onclick="GT.go(\'vehicle_card\',{id:\'' + esc(v.id) + '\'})">' +
        '<b>' + esc(v.make + " " + v.model) + (v.year ? " (" + v.year + ")" : "") + '</b>' +
        '<span class="muted">' + esc(v.plate || "—") + (owner ? " • " + esc(owner.name) : "") + '</span>' +
        '</button>';
    }).join("");
  }

  var Actions = {
    go: render,

    /* ----- Katalog marki/modela ----- */
    onMakeInput: function (makeVal) {
      if (!window.Catalog) return;
      var mdls = window.Catalog.models(makeVal);
      var dl = el("cat_models");
      if (dl) dl.innerHTML = mdls.map(function (m) { return '<option value="' + esc(m) + '">'; }).join("");
    },

    /* ----- Raniji unos (retroaktivna istorija) ----- */
    histQuick: function () {
      var sel = el("h_quick"); var ti = el("h_title");
      if (sel && sel.value && ti && !ti.value) ti.value = sel.value;
    },
    histPhotos: function (input) {
      var files = input.files; if (!files || !files.length) return;
      Photos.compressMany(files).then(function (arr) {
        GT._histPhotos = (GT._histPhotos || []).concat(arr).slice(0, 6);
        var box = el("hPreview");
        if (box) box.innerHTML = '<div class="photostrip">' + GT._histPhotos.map(function (p, i) {
          return '<div class="photocell"><img src="' + p + '"><button class="photodel" onclick="GT.histPhotoDel(' + i + ')">✕</button></div>';
        }).join("") + '</div>';
      });
    },
    histPhotoDel: function (i) {
      (GT._histPhotos || []).splice(i, 1);
      var box = el("hPreview");
      box.innerHTML = '<div class="photostrip">' + (GT._histPhotos || []).map(function (p, j) {
        return '<div class="photocell"><img src="' + p + '"><button class="photodel" onclick="GT.histPhotoDel(' + j + ')">✕</button></div>';
      }).join("") + '</div>';
    },
    saveHistory: function () {
      var vehId = GT._histVehId; if (!vehId) { toast(t("wo.no_vehicle")); return; }
      var title = val("h_title") || (el("h_quick") && el("h_quick").value) || t("history.title");
      var photos = (GT._histPhotos || []).slice();
      var ev = Models.createEvent({
        vehicle_id: vehId, type: "service", app: "garage",
        retroactive: true,
        source: photos.length ? "receipt" : "initial",
        title: title,
        date: val("h_date") || Models.nowISO().slice(0, 10),
        date_precision: el("h_dprec") ? el("h_dprec").value : "approx",
        mileage_km: val("h_km") ? parseInt(val("h_km"), 10) : null,
        km_precision: checked("h_kmapprox") ? "approx" : "exact",
        description: val("h_desc"),
        photos: photos
      });
      Store.put("events", ev).then(function () {
        toast(t("common.saved"));
        render("vehicle_card", { id: vehId });
      });
    },

    conSearch: function () {
      var q = (val("conSearch") || "").toLowerCase();
      var filtered = (App._contacts || []).filter(function (c) {
        return !q || (c.name || "").toLowerCase().indexOf(q) !== -1 || (c.phone || "").indexOf(q) !== -1;
      });
      var box = el("conList");
      if (box) box.innerHTML = contactListHTML(filtered);
    },

    vehSearch: function () {
      var q = val("vehSearch");
      el("vehList").innerHTML =
        vehicleListHTML(Store.filterVehicles(App._vehicles, q, App._contactsById));
    },

    saveVehicle: function () {
      var base = App._editingVehicle || Models.createVehicle({});
      base.make = val("f_make");
      base.model = val("f_model");
      base.year = val("f_year") ? parseInt(val("f_year"), 10) : null;
      base.plate = val("f_plate");
      base.category = el("f_category").value;
      base.type_label = Models.VEHICLE_CATEGORIES[base.category] || "";
      base.owner_contact_id = el("f_owner").value || null;
      base.vin = val("f_vin");
      base.service_data = Object.assign({}, base.service_data, {
        oil_type: val("f_oil_type"),
        oil_qty_l: val("f_oil_qty") ? parseFloat(val("f_oil_qty")) : null,
        oil_filter: val("f_oil_filter"),
        air_filter: val("f_air_filter"),
        fuel_filter: val("f_fuel_filter"),
        cabin_filter: val("f_cabin_filter"),
        battery: val("f_battery"),
        brake_notes: val("f_brake_notes")
      });
      base.tires = Object.assign({}, base.tires, {
        size_front: val("f_tires_front"),
        size_rear: val("f_tires_rear"),
        current_set: val("f_tires_set")
      });
      base.notes = el("f_notes") ? el("f_notes").value.trim() : (base.notes || "");
      if (App._vehPhotoNew !== undefined) {
        base.photos = App._vehPhotoNew ? [App._vehPhotoNew] : [];
        delete App._vehPhotoNew;
      }
      if (!base.make && !base.model) { toast("Marka ili model je obavezan"); return; }
      Store.put("vehicles", base).then(function (v) {
        toast(t("common.saved"));
        render("vehicle_card", { id: v.id });
      });
    },

    deleteVehicle: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("vehicles", id).then(function () { render("vehicles"); });
    },

    saveContact: function () {
      var base = App._editingContact || Models.createContact({});
      base.name = val("f_name");
      base.phone = val("f_phone");
      base.roles = Models.CONTACT_ROLES.filter(function (r) {
        return el("role_" + r) && el("role_" + r).checked;
      });
      if (!base.roles.length) base.roles = ["client"];
      if (!base.name) { toast("Ime je obavezno"); return; }
      Store.put("contacts", base).then(function () {
        toast(t("common.saved"));
        render("contacts");
      });
    },

    deleteContact: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("contacts", id).then(function () { render("contacts"); });
    },

    saveSettings: function () {
      Store.settings.set("profile", {
        name: val("s_name"), phone: val("s_phone"),
        address: val("s_address"), email: val("s_email"), website: val("s_website")
      });
      Store.settings.set("currency", el("s_currency").value);
      Store.settings.set("signature", el("s_signature").checked);
      var newLang = el("s_lang").value;
      var oldLang = Store.settings.get("lang", App.config.language_default);
      Store.settings.set("lang", newLang);
      if (newLang !== oldLang) {
        loadI18n(newLang).then(function () { toast(t("common.saved")); render("settings"); });
      } else {
        toast(t("common.saved"));
      }
    },

    exportBackup: function () {
      Store.exportAll().then(function (json) {
        var blob = new Blob([json], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "garage-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      });
    },

    importBackup: function (input) {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        Store.importAll(reader.result).then(function (res) {
          toast(t("backup.done") + " (" + res.imported + ")");
          render("home");
        }).catch(function (e) { toast("Greška: " + e.message); });
      };
      reader.readAsText(file);
    },

    /* ----- Licenca ----- */
    activateLicense: function () {
      var key = val("lic_key");
      if (!key) { toast(t("license.invalid")); return; }
      var productId = (App.config.license && App.config.license.product_id) || "";
      License.activate(Store, productId, key).then(function (res) {
        if (res.ok) {
          toast(res.test ? t("license.test_active") : t("license.active"));
          render("settings");
        } else {
          var msg = res.reason === "offline" ? t("license.offline")
                  : res.reason === "no_product_configured" ? t("license.no_product")
                  : t("license.invalid");
          toast(msg);
        }
      });
    },
    removeLicense: function () {
      if (!confirm(t("common.confirm_delete"))) return;
      License.deactivate(Store);
      render("settings");
    },

    /* ----- Inspekcija DVI ----- */
    inspSet: function (si, ii, status) {
      App._inspData.forEach(function (d) {
        if (d.si === si && d.ii === ii) d.status = status;
      });
      var row = document.getElementById("insp_" + si + "_" + ii);
      if (row) row.querySelectorAll(".insp-btn").forEach(function (btn) {
        btn.classList.toggle("sel", btn.getAttribute("data-st") === status);
      });
      // live summary
      var counts = { ok: 0, prati: 0, hitno: 0 };
      App._inspData.forEach(function (d) { counts[d.status]++; });
      var sum = document.getElementById("insp_summary");
      if (sum) sum.innerHTML = counts.hitno || counts.prati
        ? '<div class="insp-sum">' +
            (counts.hitno ? '<span class="insp-badge hitno">✕ Hitno: ' + counts.hitno + '</span>' : '') +
            (counts.prati ? '<span class="insp-badge prati">! Prati: ' + counts.prati + '</span>' : '') +
            '<span class="insp-badge ok">✓ OK: ' + counts.ok + '</span>' +
          '</div>'
        : '';
    },

    saveInspection: function () {
      var vehId = (document.getElementById("insp_vehicle") && document.getElementById("insp_vehicle").value) || App._inspVehId;
      if (!vehId) { toast("Odaberi vozilo"); return; }
      var km    = document.getElementById("insp_km");
      var notes = document.getElementById("insp_notes");
      var counts = { ok: 0, prati: 0, hitno: 0 };
      App._inspData.forEach(function (d) { counts[d.status]++; });
      var title = "Inspekcija" +
        (counts.hitno ? " — " + counts.hitno + "✕ hitno" : "") +
        (counts.prati ? " — " + counts.prati + "! prati" : "") +
        (!counts.hitno && !counts.prati ? " — sve OK ✓" : "");
      var ev = Models.createEvent({
        vehicle_id: vehId,
        type: "inspection",
        title: title,
        description: notes ? notes.value.trim() : "",
        mileage_km: km && km.value ? parseInt(km.value, 10) : null,
        source: "mechanic",
        app: "garage"
      });
      ev._inspection = App._inspData.map(function (d) {
        return { system: INSP_TEMPLATE[d.si].s, item: INSP_TEMPLATE[d.si].ii[d.ii], status: d.status };
      });
      Store.put("events", ev).then(function () {
        toast("Inspekcija sačuvana");
        render("vehicle_card", { id: vehId });
      });
    },

    /* ----- Kalkulatori ----- */
    calcMarza: function () {
      var cost = parseFloat(document.getElementById("c_cost").value) || 0;
      var pct  = parseFloat(document.getElementById("c_pct").value);
      if (isNaN(pct)) pct = 30;
      var out = document.getElementById("c_marza_out");
      if (!cost) { out.innerHTML = ""; return; }
      var sell   = cost * (1 + pct / 100);
      var profit = sell - cost;
      var cur    = Store.settings.get("currency", "RSD");
      out.innerHTML =
        '<div class="calc-line">Prodajna cena: <b>' + Models.formatAmount(sell, cur) + '</b></div>' +
        '<div class="calc-line">Zarada: <b>' + Models.formatAmount(profit, cur) + '</b></div>';
    },

    calcServis: function () {
      var lastKm   = parseInt(document.getElementById("c_last_km").value) || 0;
      var interval = parseInt(document.getElementById("c_interval").value) || 0;
      var lastDate = document.getElementById("c_last_date").value;
      var months   = parseInt(document.getElementById("c_months").value) || 0;
      var out = document.getElementById("c_servis_out");
      if (!lastKm && !lastDate) { out.innerHTML = ""; return; }
      var lines = [];
      if (lastKm && interval) lines.push('Sledeći servis: <b>' + (lastKm + interval).toLocaleString("sr-RS") + ' km</b>');
      if (lastDate && months) {
        var d = new Date(lastDate);
        d.setMonth(d.getMonth() + months);
        lines.push('Rok po datumu: <b>' + d.toISOString().slice(0, 10) + '</b>');
      }
      out.innerHTML = lines.map(function (l) { return '<div class="calc-line">' + l + '</div>'; }).join("");
    },

    calcRad: function () {
      var hours = parseFloat(document.getElementById("c_hours").value) || 0;
      var rate  = parseFloat(document.getElementById("c_rate").value) || 0;
      var out   = document.getElementById("c_rad_out");
      if (!hours || !rate) { out.innerHTML = ""; return; }
      var cur   = Store.settings.get("currency", "RSD");
      out.innerHTML = '<div class="calc-line">Ukupno za rad: <b>' + Models.formatAmount(hours * rate, cur) + '</b></div>';
    },

    calcPDV: function () {
      var base = parseFloat(document.getElementById("c_base").value) || 0;
      var vat  = parseFloat(document.getElementById("c_vat").value);
      if (isNaN(vat)) vat = 20;
      var out  = document.getElementById("c_pdv_out");
      if (!base) { out.innerHTML = ""; return; }
      var vatAmt = base * vat / 100;
      var cur    = Store.settings.get("currency", "RSD");
      out.innerHTML =
        '<div class="calc-line">PDV: <b>' + Models.formatAmount(vatAmt, cur) + '</b></div>' +
        '<div class="calc-line">Sa PDV: <b>' + Models.formatAmount(base + vatAmt, cur) + '</b></div>';
    },

    calcPDVrev: function () {
      var gross = parseFloat(document.getElementById("c_gross").value) || 0;
      var vat   = parseFloat(document.getElementById("c_vat").value);
      if (isNaN(vat)) vat = 20;
      var out   = document.getElementById("c_pdv_rev_out");
      if (!gross) { out.innerHTML = ""; return; }
      var base   = gross / (1 + vat / 100);
      var vatAmt = gross - base;
      var cur    = Store.settings.get("currency", "RSD");
      out.innerHTML =
        '<div class="calc-line">Bez PDV: <b>' + Models.formatAmount(base, cur) + '</b></div>' +
        '<div class="calc-line">PDV: <b>' + Models.formatAmount(vatAmt, cur) + '</b></div>';
    },

    /* ----- Predračuni ----- */
    startWO: function (vehicleId, docType) {
      render("new_job", { vehicleId: vehicleId || null, docType: docType });
    },

    estStatus: function (docId, status) {
      Store.get("documents", docId).then(function (d) {
        if (!d) return;
        d.est_status = status;
        return Store.put("documents", d);
      }).then(function () { render("estimates"); });
    },

    convertToWO: function (docId) {
      Store.get("documents", docId).then(function (d) {
        if (!d || !d.event_id) { toast("Nema vezanog događaja"); return; }
        return Store.get("events", d.event_id);
      }).then(function (ev) {
        if (!ev) { toast("Dogadjaj nije nađen"); return; }
        App.route = "new_job";
        App.params = { docType: "work_order" };
        document.querySelectorAll(".nav-btn").forEach(function (btn) {
          btn.classList.toggle("active", btn.getAttribute("data-route") === "new_job");
        });
        window.WorkOrder.startFromEstimate(ev);
      });
    },

    /* ----- Dnevnik / Termini ----- */
    aptContactFill: function () {
      var sel = el("ap_contact");
      if (!sel || !sel.value) return;
      var c = App._contactsById && App._contactsById[sel.value];
      if (!c) return;
      var n = el("ap_name"); if (n && !n.value) n.value = c.name;
      var p = el("ap_phone"); if (p && !p.value) p.value = c.phone || "";
    },

    saveAppointment: function () {
      var base = App._editingAppointment || Models.createAppointment({});
      base.contact_id = el("ap_contact") ? (el("ap_contact").value || null) : null;
      base.customer_name = val("ap_name");
      base.customer_phone = val("ap_phone");
      base.service_type = val("ap_service");
      base.vehicle_id = el("ap_vehicle") ? (el("ap_vehicle").value || null) : null;
      base.scheduled_at = val("ap_time") || Models.nowISO().slice(0, 16);
      base.duration_min = el("ap_dur") ? parseInt(el("ap_dur").value, 10) : 60;
      if (el("ap_status")) base.status = el("ap_status").value;
      base.notes = el("ap_notes") ? el("ap_notes").value.trim() : "";
      if (!base.customer_name && !base.contact_id) { toast("Unesite ime mušterije ili odaberite kontakt"); return; }
      Store.put("appointments", base).then(function () {
        toast(t("common.saved"));
        render("dnevnik");
      });
    },

    deleteAppointment: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("appointments", id).then(function () { render("dnevnik"); });
    },

    aptStatus: function (id, newStatus) {
      Store.get("appointments", id).then(function (a) {
        if (!a) return;
        a.status = newStatus;
        return Store.put("appointments", a);
      }).then(function () { render("dnevnik"); });
    },

    /* ----- Podsetnici ----- */
    saveReminder: function () {
      var base = App._editingReminder || Models.createReminder({});
      base.title = val("r_title");
      base.vehicle_id = el("r_vehicle").value || null;
      base.due_date = val("r_date") || null;
      base.due_mileage_km = val("r_km") ? parseInt(val("r_km"), 10) : null;
      if (!base.title) { toast(t("reminders.rtitle")); return; }
      if (!base.due_date && !base.due_mileage_km) {
        toast(t("reminders.due_date") + " / " + t("reminders.due_km")); return;
      }
      Store.put("reminders", base).then(function () {
        toast(t("common.saved"));
        render("reminders");
      });
    },
    markReminderDone: function (id) {
      Store.get("reminders", id).then(function (r) {
        r.done = true;
        return Store.put("reminders", r);
      }).then(function () {
        render(App.route === "home" ? "home" : "reminders");
      });
    },
    deleteReminder: function (id) {
      if (!confirm(t("common.confirm_delete"))) return;
      Store.remove("reminders", id).then(function () { render("reminders"); });
    },

    /* ----- Logo + Vizit karta ----- */
    logoUpload: function (input) {
      var file = input.files && input.files[0]; if (!file) return;
      Photos.compress(file, 300, 0.9).then(function (dataUrl) {
        var prof = Store.settings.get("profile", {});
        prof.logoDataUrl = dataUrl;
        Store.settings.set("profile", prof);
        toast("Logo sačuvan");
        render("settings");
      });
    },
    logoClear: function () {
      var prof = Store.settings.get("profile", {});
      delete prof.logoDataUrl;
      Store.settings.set("profile", prof);
      render("settings");
    },
    bizCopy: function () {
      var prof = Store.settings.get("profile", {});
      var text = [prof.name, prof.phone, prof.email, prof.website, prof.address].filter(Boolean).join("\n");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { toast("Kopirano"); });
      } else { toast("Kopiranje nije podržano"); }
    },
    bizShare: function () {
      var prof = Store.settings.get("profile", {});
      var text = [prof.name, prof.phone, prof.email, prof.website, prof.address].filter(Boolean).join("\n");
      if (navigator.share) navigator.share({ title: prof.name || "Garage Toolbox", text: text }).catch(function(){});
    },

    /* ----- Foto vozila ----- */
    vehPhotoUpload: function (input) {
      var file = input.files && input.files[0]; if (!file) return;
      Photos.compress(file).then(function (dataUrl) {
        App._vehPhotoNew = dataUrl;
        var box = el("vehPhotoPreview");
        if (box) box.innerHTML = '<img src="' + dataUrl + '" style="max-height:100px;border-radius:.4rem;margin-top:.3rem">' +
          '<button class="photodel" onclick="GT.vehPhotoClear()" style="margin-left:.4rem">Ukloni</button>';
      });
    },
    vehPhotoClear: function () {
      App._vehPhotoNew = null;
      var box = el("vehPhotoPreview"); if (box) box.innerHTML = '';
    },

    /* ----- Dosije vozila ----- */
    exportDossier: function (vehId) {
      Promise.all([
        Store.get("vehicles", vehId),
        Store.byIndex("events", "vehicle_id", vehId)
      ]).then(function (res) {
        var v = res[0], events = res[1];
        if (!v) { toast("Vozilo nije nađeno"); return; }
        var profile = window.Store.settings.get("profile", { name: "", phone: "" });
        var lang = window.Store.settings.get("lang", "sr");
        var sd = v.service_data || {}, tires = v.tires || {};
        var doc = window.PDFEngine.buildDossier({
          lang: lang,
          profile: profile,
          vehicle: {
            make: v.make, model: v.model, year: v.year,
            plate: v.plate, vin: v.vin, type_label: v.type_label, category: v.category
          },
          techCard: {
            oil_type: sd.oil_type ? (sd.oil_type + (sd.oil_qty_l ? ", " + sd.oil_qty_l + "L" : "")) : "",
            oil_filter: sd.oil_filter,
            battery: sd.battery,
            tires: [tires.size_front, tires.current_brand, tires.current_season && ({ summer: "letnje", winter: "zimske", allseason: "all-season" }[tires.current_season])].filter(Boolean).join(", ")
          },
          events: events,
          currentKm: (function () {
            var max = null;
            events.forEach(function (e) { if (e.mileage_km != null && (max == null || e.mileage_km > max)) max = e.mileage_km; });
            return max;
          })()
        });
        var fname = [v.make, v.model, v.plate, "dosije"].filter(Boolean).join("_").replace(/\s+/g, "_") + ".pdf";
        doc.save(fname);
      });
    },

    /* ----- Gume ----- */
    saveTires: function (vehId) {
      Store.get("vehicles", vehId).then(function (v) {
        if (!v) return;
        v.tires = Object.assign({}, v.tires, {
          size_front:       val("t_front"),
          size_rear:        val("t_rear"),
          current_brand:    val("t_brand"),
          current_purchased: val("t_purchased"),
          current_season:   el("t_season") ? el("t_season").value : (v.tires && v.tires.current_season),
          other_brand:      val("t_other_brand"),
          other_size:       val("t_other_size"),
          other_set_location: el("t_storage") ? el("t_storage").value : "",
          current_set: [el("t_season") ? {summer:"Letnje",winter:"Zimske",allseason:"All-season"}[el("t_season").value] : "", val("t_brand"), val("t_purchased")].filter(Boolean).join(", ")
        });
        return Store.put("vehicles", v);
      }).then(function () {
        toast("Podaci o gumama sačuvani");
        render("vehicle_card", { id: vehId });
      });
    },
    saveTireSwap: function (vehId) {
      Store.get("vehicles", vehId).then(function (v) {
        if (!v) return;
        var season = el("t_season") ? el("t_season").value : "summer";
        var seasonLabel = { summer: "letnje", winter: "zimske", allseason: "all-season" }[season] || season;
        var km = el("t_km") && el("t_km").value ? parseInt(el("t_km").value, 10) : null;
        var brand = val("t_brand");
        var title = "Zamena guma — postavljene " + seasonLabel + (brand ? " (" + brand + ")" : "");
        var ev = Models.createEvent({
          vehicle_id: vehId, type: "tires", title: title,
          mileage_km: km, source: "mechanic", app: "garage"
        });
        v.tires = Object.assign({}, v.tires, {
          size_front:       val("t_front") || (v.tires && v.tires.size_front),
          size_rear:        val("t_rear")  || (v.tires && v.tires.size_rear),
          current_brand:    val("t_brand"),
          current_purchased: val("t_purchased"),
          current_season:   season,
          other_brand:      val("t_other_brand"),
          other_size:       val("t_other_size"),
          other_set_location: el("t_storage") ? el("t_storage").value : "",
          current_set: [seasonLabel, val("t_brand"), val("t_purchased")].filter(Boolean).join(", ")
        });
        return Promise.all([Store.put("events", ev), Store.put("vehicles", v)]);
      }).then(function () {
        toast("Zamena guma sačuvana");
        render("vehicle_card", { id: vehId });
      });
    },

    /* ----- Check liste ----- */
    chkNoteToggle: function (i) {
      var ta = el("chnote_" + i);
      if (ta) { ta.hidden = !ta.hidden; if (!ta.hidden) ta.focus(); }
    },
    chkTemplate: function (tmplId, vehId) {
      render("checklist_form", { vehicle_id: vehId || App._chkVehId, tmpl: tmplId });
    },
    saveChecklist: function () {
      var vehId = (el("chk_vehicle") && el("chk_vehicle").value) || App._chkVehId;
      if (!vehId) { toast("Odaberi vozilo"); return; }
      var tmpl = CHECKLIST_TEMPLATES.filter(function (t) { return t.id === App._chkTmplId; })[0] || CHECKLIST_TEMPLATES[0];
      var items = tmpl.items.map(function (item, i) {
        return {
          item: item,
          checked: !!(el("chk_" + i) && el("chk_" + i).checked),
          note: el("chnote_" + i) ? el("chnote_" + i).value.trim() : ""
        };
      });
      var okCount = items.filter(function (it) { return it.checked; }).length;
      var title = tmpl.name + " — " + okCount + "/" + tmpl.items.length + " ✓";
      var intake = null;
      if (tmpl.extras) {
        intake = {
          fuel: el("chk_fuel") ? el("chk_fuel").value : "",
          complaint: el("chk_complaint") ? el("chk_complaint").value.trim() : "",
          pickup_date: el("chk_pickup") ? el("chk_pickup").value : ""
        };
        var complaint = intake.complaint;
        if (complaint) title += " • " + complaint.slice(0, 30);
      }
      var ev = Models.createEvent({
        vehicle_id: vehId, type: "checklist", title: title, source: "mechanic", app: "garage",
        mileage_km: el("chk_km") && el("chk_km").value ? parseInt(el("chk_km").value, 10) : null
      });
      ev._checklist = items;
      if (intake) ev._intake = intake;
      Store.put("events", ev).then(function () {
        toast("Provera sačuvana");
        render("vehicle_card", { id: vehId });
      });
    },

    /* ---------- AutoHub ---------- */

    autohubRegister: function () {
      var name  = val("ah_name");
      var email = val("ah_email");
      var pass  = val("ah_pass");
      var errEl = el("ahErr");
      if (!name || !email || !pass) { if (errEl) errEl.textContent = "Sva polja su obavezna."; return; }
      autohubFetch("POST", "/auth/register", { name: name, email: email, password: pass }, true)
        .then(function (r) {
          if (r.status === "pending") {
            toast("Registracija primljena. Čeka se odobrenje admina.");
          } else {
            return autohubFetch("POST", "/auth/login", { email: email, password: pass }, true)
              .then(function (lr) {
                localStorage.setItem(AH_SESSION_KEY, JSON.stringify({ token: lr.session, name: lr.user.name, email: lr.user.email }));
                toast("AutoHub: prijavljen kao " + lr.user.name);
                render("settings");
              });
          }
          render("settings");
        })
        .catch(function (e) { if (errEl) errEl.textContent = e.message; });
    },

    autohubLogin: function () {
      var email = val("ah_email");
      var pass  = val("ah_pass");
      var errEl = el("ahErr");
      if (!email || !pass) { if (errEl) errEl.textContent = "Email i lozinka su obavezni."; return; }
      autohubFetch("POST", "/auth/login", { email: email, password: pass }, true)
        .then(function (r) {
          localStorage.setItem(AH_SESSION_KEY, JSON.stringify({ token: r.session, name: r.user.name, email: r.user.email }));
          toast("AutoHub: prijavljen kao " + r.user.name);
          render("settings");
        })
        .catch(function (e) { if (errEl) errEl.textContent = e.message; });
    },

    autohubLogout: function () {
      autohubFetch("POST", "/auth/logout", {}).catch(function () {});
      localStorage.removeItem(AH_SESSION_KEY);
      toast("Odjavljen sa AutoHub-a.");
      render("settings");
    },

    autohubSync: function () {
      var statusEl = el("ahSyncStatus");
      if (statusEl) statusEl.textContent = "Sinhronizujem…";
      var vmap   = JSON.parse(localStorage.getItem(AH_VMAP_KEY)   || "{}");
      var synced = JSON.parse(localStorage.getItem(AH_SYNCED_KEY) || "{}");

      Promise.all([Store.all("vehicles"), Store.all("events")]).then(function (res) {
        var vehicles = res[0];
        var events   = res[1];

        // Faza 1: registruj vozila na AutoHub-u ako nisu mapirana
        return vehicles.reduce(function (p, v) {
          return p.then(function () {
            if (vmap[v.id]) return;
            return autohubFetch("POST", "/vehicles", {
              make: v.make || "?", model: v.model || "?",
              year: v.year ? Number(v.year) : null,
              plate: v.plate || null, vin: v.vin || null
            }).then(function (r) {
              vmap[v.id] = r.id;
              localStorage.setItem(AH_VMAP_KEY, JSON.stringify(vmap));
            });
          });
        }, Promise.resolve()).then(function () {
          // Faza 2: sinhronizuj evente po vozilu
          var byVehicle = {};
          events.forEach(function (e) {
            if (synced[e.id]) return;
            var servId = vmap[e.vehicle_id];
            if (!servId) return;
            if (!byVehicle[servId]) byVehicle[servId] = [];
            byVehicle[servId].push(e);
          });

          return Object.keys(byVehicle).reduce(function (p, servId) {
            return p.then(function () {
              var batch = byVehicle[servId].map(function (e) {
                return { local_id: e.id, type: ahMapEventType(e.type), data: e,
                         event_date: (e.date || e.created_at || new Date().toISOString()),
                         retroactive: !!e.retroactive, source: e.source || "app", app: "garage" };
              });
              if (!batch.length) return;
              return autohubFetch("POST", "/vehicles/" + servId + "/events/batch", batch)
                .then(function (r) {
                  (r.synced || []).forEach(function (s) {
                    if (s.local_id && !s.error) synced[s.local_id] = true;
                  });
                  localStorage.setItem(AH_SYNCED_KEY, JSON.stringify(synced));
                });
            });
          }, Promise.resolve());
        });
      }).then(function () {
        var cnt = Object.keys(JSON.parse(localStorage.getItem(AH_SYNCED_KEY) || "{}")).length;
        if (statusEl) statusEl.textContent = "✓ Sinhronizirano " + cnt + " zapisa ukupno.";
        toast("AutoHub sync završen.");
      }).catch(function (e) {
        if (statusEl) statusEl.textContent = "Greška: " + e.message;
        toast("Sync greška: " + e.message);
      });
    },

    /* ---------- AutoHub Grant akcije ---------- */
    autohubGrantAdd: function (localVehicleId) {
      var vmap   = JSON.parse(localStorage.getItem(AH_VMAP_KEY) || "{}");
      var servId = vmap[localVehicleId];
      if (!servId) { toast("Vozilo nije sinhronizirano."); return; }
      var emailEl = el("gr_email_" + localVehicleId);
      var roleEl  = el("gr_role_"  + localVehicleId);
      var daysEl  = el("gr_days_"  + localVehicleId);
      var errEl   = el("gr_err_"   + localVehicleId);
      var email   = emailEl ? emailEl.value.trim() : "";
      var role    = roleEl  ? roleEl.value : "read";
      var days    = daysEl  ? parseInt(daysEl.value, 10) : NaN;
      if (!email) { if (errEl) errEl.textContent = "Unesi email."; return; }
      var body = { grantee_email: email, vehicle_id: servId, role: role };
      if (!isNaN(days) && days > 0) body.expires_in_days = days;
      autohubFetch("POST", "/grants", body).then(function () {
        toast("Pristup dodat za " + email);
        render("grant_manager");
      }).catch(function (e) {
        if (errEl) errEl.textContent = e.message || "Greška.";
      });
    },

    savePartListing: function () {
      var title  = val("sp_title");
      var price  = parseFloat(val("sp_price"));
      var cname  = val("sp_cname");
      var cphone = val("sp_cphone");
      var errEl  = el("sp_err");

      if (!title || !price || !cname || !cphone) {
        errEl.textContent = "Naziv, cena, ime i telefon su obavezni.";
        errEl.style.display = "block";
        return;
      }
      errEl.style.display = "none";

      var make = val("sp_make"), model = val("sp_model");
      var yf = parseInt(val("sp_yf")), yt = parseInt(val("sp_yt"));
      var compatible = [];
      if (make || model) {
        compatible.push({ make: make || "", model: model || "",
          year_from: yf || null, year_to: yt || null });
      }

      var payload = {
        title:          title,
        category:       el("sp_cat").value,
        condition:      el("sp_cond").value,
        part_number:    val("sp_partno") || null,
        compatible:     compatible,
        price:          price,
        currency:       el("sp_cur").value,
        description:    val("sp_desc") || null,
        city:           val("sp_city") || null,
        contact_name:   cname,
        contact_phone:  cphone,
        contact_method: el("sp_cmethod").value,
      };

      if (typeof Autodelovi === "undefined") {
        toast("Autodelovi modul nije učitan.");
        return;
      }
      Autodelovi.publishPart(payload).then(function (data) {
        toast("Oglas objavljen! 📦");
        render("my_parts");
      }).catch(function (e) {
        errEl.textContent = e.message || "Greška pri objavljivanju.";
        errEl.style.display = "block";
      });
    },

    deletePartListing: function (partId, sellerToken) {
      if (!confirm("Ukloniti oglas?")) return;
      if (typeof Autodelovi === "undefined") { toast("Autodelovi modul nije učitan."); return; }
      Autodelovi.deletePart(partId, sellerToken).then(function () {
        toast("Oglas uklonjen.");
        render("my_parts");
      }).catch(function (e) {
        toast("Greška: " + (e.message || "nepoznata"));
      });
    },

    autohubGrantRevoke: function (localVehicleId, granteeEmail) {
      var vmap   = JSON.parse(localStorage.getItem(AH_VMAP_KEY) || "{}");
      var servId = vmap[localVehicleId];
      if (!servId) { toast("Vozilo nije sinhronizirano."); return; }
      autohubFetch("DELETE", "/grants", { grantee_email: granteeEmail, vehicle_id: servId }).then(function () {
        toast("Pristup opozvan.");
        render("grant_manager");
      }).catch(function (e) {
        toast("Greška: " + (e.message || "nepoznata"));
      });
    }

  };

  /* ---------- Offline / SW ---------- */

  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function (e) {
        console.warn("SW registracija nije uspela:", e);
      });
    }
  }

  function watchOnline() {
    var badge = el("offlineBadge");
    function upd() { badge.hidden = navigator.onLine; }
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    upd();
  }

  // helperi koje koristi workorder.js
  Actions.t = t;
  Actions.esc = esc;
  Actions.toast = toast;
  Actions.config = function () { return App.config; };
  Actions.translateNode = translate;

  window.GT = Actions;
  document.addEventListener("DOMContentLoaded", boot);
})();
