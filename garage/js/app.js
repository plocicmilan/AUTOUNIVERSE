/* ============================================================
   GARAGE TOOLBOX — app.js  (Sesija 2: Store + Vozila + Kontakti)
   Ekrani: HOME | VOZILA (lista→karton→forma) | NOVI POSAO (S3) |
           KONTAKTI (lista→forma) | SETTINGS (profil, backup)
   ============================================================ */
(function () {
  "use strict";

  var App = { config: null, i18n: {}, route: "home", params: null };

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
    fetch("config/garage_v1.json")
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        App.config = cfg;
        applyTheme(cfg.colors);
        el("brandName").textContent = cfg.name.toUpperCase();
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
        Store.all("events"), Store.all("reminders")
      ]).then(function (res) {
        var nV = res[0].length, nC = res[1].length, nE = res[2].length;
        App._vehById = {}; res[0].forEach(function (v) { App._vehById[v.id] = v; });

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

        return '' +
          '<h1 data-i18n="nav.home"></h1>' +
          '<p class="sub">Garage Toolbox v1</p>' +
          '<div class="statrow">' +
            '<button class="stat" onclick="GT.go(\'vehicles\')"><b>' + nV + '</b><span data-i18n="nav.vehicles"></span></button>' +
            '<button class="stat" onclick="GT.go(\'contacts\')"><b>' + nC + '</b><span data-i18n="nav.contacts"></span></button>' +
            '<div class="stat"><b>' + nE + '</b><span data-i18n="history.title"></span></div>' +
          '</div>' +
          remCard +
          '<button class="btn btn-primary mt8" onclick="GT.go(\'new_job\')" data-i18n="home.new_job"></button>';
      });
    },

    /* ===== VOZILA — lista + pretraga ===== */
    vehicles: function () {
      return Promise.all([Store.all("vehicles"), Store.all("contacts")]).then(function (res) {
        App._vehicles = res[0];
        App._contactsById = {};
        res[1].forEach(function (c) { App._contactsById[c.id] = c; });
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
                return '<div class="card evt' + (e.retroactive ? " retro" : "") + '">' +
                  '<div class="evt-head"><b>' + esc(e.title || e.type) + '</b><span>' + esc(e.date) + '</span></div>' +
                  (e.mileage_km != null ? '<div class="evt-km">' + esc(e.mileage_km) + ' km' + (e.km_precision === "approx" ? " (~)" : "") + '</div>' : '') +
                  (e.retroactive ? '<div class="trust">' + t("d.retro_tag") + '</div>' : '') +
                  (totals ? '<div class="evt-total">' + t("common.total") + ': ' + totals + '</div>' : '') +
                  '</div>';
              }).join("")
            : '<div class="card"><p class="empty" data-i18n="history.empty"></p></div>';

          return '' +
            '<button class="linkback" onclick="GT.go(\'vehicles\')" data-i18n="common.back"></button>' +
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
              row("tech.tires_set", tires.current_set) +
            '</div>' +
            '<h2 class="secttitle" data-i18n="history.title"></h2>' +
            evHtml +
            '<button class="btn btn-primary" onclick="GT.go(\'new_job\',{vehicleId:\'' + esc(v.id) + '\'})" data-i18n="wo.new_for"></button>' +
            '<button class="btn btn-secondary mt8" onclick="GT.go(\'history_add\',{vehicle_id:\'' + esc(v.id) + '\'})" data-i18n="gh.add"></button>' +
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
          '<div class="card">' +
            field("f_make", "vehicles.make", v.make) +
            field("f_model", "vehicles.model", v.model) +
            field("f_year", "vehicles.year", v.year || "", "number") +
            field("f_plate", "vehicles.plate", v.plate) +
            '<label class="field"><span>' + t("vehicles.category") + '</span><select id="f_category">' + catOpts + '</select></label>' +
            '<label class="field"><span>' + t("vehicles.owner") + '</span><select id="f_owner">' + ownerOpts + '</select></label>' +
            field("f_vin", "vehicles.vin", v.vin) +
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
          '<button class="btn btn-primary" onclick="GT.saveVehicle()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="GT.deleteVehicle(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
      });
    },

    /* ===== NOVI POSAO — WO Snap tok (workorder.js) ===== */
    new_job: function () {
      // WO modul sam renderuje u #screen; vrati prazno da render() ne pregazi
      setTimeout(function () { window.WorkOrder.start(App.params && App.params.vehicleId); }, 0);
      return '<div class="card"><p class="empty">…</p></div>';
    },

    /* ===== KONTAKTI ===== */
    contacts: function () {
      return Store.all("contacts").then(function (contacts) {
        contacts.sort(function (a, b) { return a.name.localeCompare(b.name); });
        var list = contacts.length
          ? contacts.map(function (c) {
              return '<div class="card contactrow">' +
                '<button class="rowmain" onclick="GT.go(\'contact_form\',{id:\'' + esc(c.id) + '\'})">' +
                  '<b>' + esc(c.name) + '</b>' +
                  '<span class="muted">' + esc(c.phone || "") + ' • ' + c.roles.map(function (r) { return t("contacts.role_" + r); }).join(", ") + '</span>' +
                '</button>' +
                (c.phone ? '<a class="callpill" href="tel:' + esc(c.phone) + '">☎</a>' : '') +
                '</div>';
            }).join("")
          : '<div class="card"><p class="empty" data-i18n="contacts.empty"></p></div>';
        return '<h1 data-i18n="nav.contacts"></h1>' + list +
          '<button class="btn btn-primary" onclick="GT.go(\'contact_form\')" data-i18n="contacts.add"></button>';
      });
    },

    contact_form: function (params) {
      var id = params && params.id;
      var p = id ? Store.get("contacts", id) : Promise.resolve(null);
      return p.then(function (c) {
        App._editingContact = c || null;
        c = c || Models.createContact({});
        var roles = Models.CONTACT_ROLES.map(function (r) {
          var on = c.roles.indexOf(r) !== -1;
          return '<label class="chk"><input type="checkbox" id="role_' + r + '"' + (on ? " checked" : "") + '> ' +
                 t("contacts.role_" + r) + '</label>';
        }).join("");
        return '' +
          '<button class="linkback" onclick="GT.go(\'contacts\')" data-i18n="common.back"></button>' +
          '<h1>' + (id ? t("common.edit") : t("contacts.add").replace("+ ", "")) + '</h1>' +
          '<div class="card">' +
            field("f_name", "contacts.name", c.name) +
            field("f_phone", "contacts.phone", c.phone, "tel") +
            '<div class="field"><span data-i18n="contacts.roles"></span>' + roles + '</div>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="GT.saveContact()" data-i18n="common.save"></button>' +
          (id ? '<button class="btn btn-danger mt8" onclick="GT.deleteContact(\'' + esc(id) + '\')" data-i18n="common.delete"></button>' : '');
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
          field("s_name", "settings.name", profile.name) +
          field("s_phone", "settings.phone", profile.phone, "tel") +
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
        '<div class="card mt16" id="licenseCard">' + licenseCardHTML() + '</div>';
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
      Store.settings.set("profile", { name: val("s_name"), phone: val("s_phone") });
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
