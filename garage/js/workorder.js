/* ============================================================
   GARAGE TOOLBOX — workorder.js  (Sesija 3: WO Snap tok)
   7 koraka (svaki preskočiv):
   1 vozilo → 2 klijent → 3 opis (+voice) → 4 slike →
   5 stavke → 6 potpis (ako ON) → 7 PDF (share/save)
   Završen posao = EVENT u kartonu + opciono DOCUMENT.
   Zavisi od: Models, Store, PDFEngine, Photos, GT (app.js helperi)
   ============================================================ */
(function () {
  "use strict";

  var WO = {
    step: 0,
    steps: [],       // popuni se iz config-a
    draft: null,     // radni objekat
    vehicles: [],
    contacts: [],
    sigPads: {}      // canvas potpisi
  };

  function t(k) { return window.GT.t(k); }
  function esc(s) { return window.GT.esc(s); }
  function toast(m) { window.GT.toast(m); }

  /* ---------- Start ---------- */

  function start(prefillVehicleId, prefillDocType) {
    var cfg = window.GT.config();
    WO.steps = cfg.wo_steps.slice();
    var sigOn = window.Store.settings.get("signature", cfg.signature_default);
    // predračun nikad nema potpis
    if (!sigOn || prefillDocType === "estimate") {
      WO.steps = WO.steps.filter(function (s) { return s !== "signature"; });
    }

    WO.step = 0;
    WO.sigPads = {};
    WO.draft = {
      vehicle_id: prefillVehicleId || null,
      contact_id: null,
      docType: prefillDocType || "work_order",
      description: "",
      mileage_km: "",
      photos: [],
      items: [],
      signature: { customer: null, technician: null }
    };
    return Promise.all([window.Store.all("vehicles"), window.Store.all("contacts")])
      .then(function (r) {
        WO.vehicles = r[0]; WO.contacts = r[1];
        renderStep();
      });
  }

  function startFromEstimate(ev) {
    var cfg = window.GT.config();
    WO.steps = cfg.wo_steps.slice();
    var sigOn = window.Store.settings.get("signature", cfg.signature_default);
    if (!sigOn) WO.steps = WO.steps.filter(function (s) { return s !== "signature"; });
    WO.step = 0;
    WO.sigPads = {};
    WO.draft = {
      vehicle_id: ev.vehicle_id || null,
      contact_id: ev.contact_id || null,
      docType: "work_order",
      description: ev.description || "",
      mileage_km: ev.mileage_km || "",
      photos: [],
      items: (ev.items || []).map(function (it) { return Object.assign({}, it); }),
      signature: { customer: null, technician: null }
    };
    return Promise.all([window.Store.all("vehicles"), window.Store.all("contacts")])
      .then(function (r) {
        WO.vehicles = r[0]; WO.contacts = r[1];
        renderStep();
      });
  }

  /* ---------- Render trenutnog koraka ---------- */

  function renderStep() {
    var name = WO.steps[WO.step];
    var total = WO.steps.length;
    var progress = '';
    for (var i = 0; i < total; i++) {
      progress += '<span class="dot' + (i === WO.step ? ' on' : (i < WO.step ? ' done' : '')) + '"></span>';
    }
    var body = STEP[name] ? STEP[name]() : '';
    var isLast = WO.step === total - 1;

    var nav =
      '<div class="wo-nav">' +
        (WO.step > 0 ? '<button class="btn btn-secondary wo-half" onclick="WOgo.prev()" data-i18n="wo.prev"></button>' : '<span class="wo-half"></span>') +
        (isLast
          ? '<button class="btn btn-primary wo-half" onclick="WOgo.finish()" data-i18n="wo.save_pdf"></button>'
          : '<button class="btn btn-primary wo-half" onclick="WOgo.next()" data-i18n="wo.next"></button>') +
      '</div>';

    var html =
      '<button class="linkback" onclick="WOgo.exit()" data-i18n="common.back"></button>' +
      '<h1 data-i18n="wo.title"></h1>' +
      '<div class="wo-progress">' + progress + '</div>' +
      '<h2 class="wo-steptitle">' + (WO.step + 1) + '. ' + t("wo.step_" + name) + '</h2>' +
      '<div class="wo-body">' + body + '</div>' +
      nav;

    var s = document.getElementById("screen");
    s.innerHTML = html;
    window.GT.translateNode(s);
    if (STEP_AFTER[name]) STEP_AFTER[name]();
  }

  /* ---------- Koraci ---------- */

  var STEP = {

    vehicle: function () {
      var opts = WO.vehicles.map(function (v) {
        var sel = WO.draft.vehicle_id === v.id ? ' selected' : '';
        return '<option value="' + esc(v.id) + '"' + sel + '>' +
               esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) + '</option>';
      }).join("");
      return '<div class="card">' +
        '<label class="field"><span data-i18n="wo.pick_vehicle"></span>' +
          '<select id="wo_vehicle"><option value="">—</option>' + opts + '</select></label>' +
        '<button class="btn btn-secondary" onclick="WOgo.quickVehicle()" data-i18n="wo.new_vehicle"></button>' +
        '<label class="field mt16"><span data-i18n="common.mileage"></span>' +
          '<input id="wo_mileage" type="number" inputmode="numeric" value="' + esc(WO.draft.mileage_km) + '"></label>' +
      '</div>';
    },

    client: function () {
      var opts = WO.contacts.map(function (c) {
        var sel = WO.draft.contact_id === c.id ? ' selected' : '';
        return '<option value="' + esc(c.id) + '"' + sel + '>' + esc(c.name) + '</option>';
      }).join("");
      return '<div class="card">' +
        '<label class="field"><span data-i18n="wo.pick_client"></span>' +
          '<select id="wo_client"><option value="">—</option>' + opts + '</select></label>' +
        '<button class="btn btn-secondary" onclick="WOgo.quickClient()" data-i18n="wo.new_client"></button>' +
      '</div>';
    },

    description: function () {
      var dtOpts = ["work_order", "invoice", "estimate"].map(function (d) {
        var sel = WO.draft.docType === d ? ' selected' : '';
        return '<option value="' + d + '"' + sel + '>' + t("doc." + d) + '</option>';
      }).join("");
      return '<div class="card">' +
        '<label class="field"><span data-i18n="wo.doc_type"></span>' +
          '<select id="wo_doctype">' + dtOpts + '</select></label>' +
        '<label class="field"><span data-i18n="wo.step_description"></span>' +
          '<textarea id="wo_desc" rows="5" placeholder="' + t("wo.desc_placeholder") + '">' + esc(WO.draft.description) + '</textarea></label>' +
        '<button class="btn btn-secondary" id="wo_voicebtn" onclick="WOgo.voice()" data-i18n="wo.voice"></button>' +
      '</div>';
    },

    photos: function () {
      return '<div class="card">' +
        '<label class="btn btn-secondary filelabel"><span data-i18n="wo.add_photo"></span>' +
          '<input type="file" accept="image/*" capture="environment" multiple hidden onchange="WOgo.addPhotos(this)"></label>' +
        '<div class="photogrid" id="wo_photos">' + photosHTML() + '</div>' +
      '</div>';
    },

    items: function () {
      return '<div class="card">' +
        '<div id="wo_items">' + itemsHTML() + '</div>' +
        '<button class="btn btn-secondary" onclick="WOgo.addItem()" data-i18n="wo.add_item"></button>' +
        '<div class="wo-runningtotal" id="wo_total">' + totalHTML() + '</div>' +
      '</div>';
    },

    signature: function () {
      return '<div class="card">' +
        '<p class="field"><span data-i18n="wo.sig_customer"></span></p>' +
        '<canvas class="sigpad" id="sig_customer" width="500" height="150"></canvas>' +
        '<button class="btn btn-secondary sm" onclick="WOgo.clearSig(\'customer\')" data-i18n="wo.sig_clear"></button>' +
        '<p class="field mt16"><span data-i18n="wo.sig_tech"></span></p>' +
        '<canvas class="sigpad" id="sig_technician" width="500" height="150"></canvas>' +
        '<button class="btn btn-secondary sm" onclick="WOgo.clearSig(\'technician\')" data-i18n="wo.sig_clear"></button>' +
      '</div>';
    },

    pdf: function () {
      var v = byId(WO.vehicles, WO.draft.vehicle_id);
      var c = byId(WO.contacts, WO.draft.contact_id);
      var totals = window.Models.formatTotals(window.Models.sumByCurrency(WO.draft.items));
      return '<div class="card">' +
        '<h2>' + t("doc." + WO.draft.docType) + '</h2>' +
        '<div class="techrow"><span data-i18n="wo.step_vehicle"></span><b>' +
          (v ? esc(v.make + " " + v.model + (v.plate ? " • " + v.plate : "")) : "—") + '</b></div>' +
        '<div class="techrow"><span data-i18n="wo.step_client"></span><b>' + (c ? esc(c.name) : "—") + '</b></div>' +
        (WO.draft.mileage_km ? '<div class="techrow"><span data-i18n="common.mileage"></span><b>' + esc(WO.draft.mileage_km) + ' km</b></div>' : '') +
        '<div class="techrow"><span data-i18n="wo.step_items"></span><b>' + WO.draft.items.length + '</b></div>' +
        '<div class="techrow"><span data-i18n="wo.step_photos"></span><b>' + WO.draft.photos.length + '</b></div>' +
        (totals ? '<div class="techrow"><span data-i18n="common.total"></span><b>' + totals + '</b></div>' : '') +
      '</div>' +
      '<button class="btn btn-secondary" onclick="WOgo.preview()" data-i18n="wo.review"></button>' +
      '<button class="btn btn-primary mt8" onclick="WOgo.share()" data-i18n="wo.share"></button>';
    }
  };

  /* ---------- After-render (event bindovi, canvas) ---------- */

  var STEP_AFTER = {
    signature: function () {
      bindSigPad("customer");
      bindSigPad("technician");
    }
  };

  /* ---------- Helperi za prikaz ---------- */

  function photosHTML() {
    if (!WO.draft.photos.length) return '<p class="empty" style="grid-column:1/-1">—</p>';
    return WO.draft.photos.map(function (p, i) {
      return '<div class="photothumb"><img src="' + p + '">' +
             '<button onclick="WOgo.removePhoto(' + i + ')">✕</button></div>';
    }).join("");
  }

  function itemsHTML() {
    if (!WO.draft.items.length) return '<p class="empty">—</p>';
    var cfg = window.GT.config();
    return WO.draft.items.map(function (it, i) {
      var curOpts = cfg.currencies.map(function (cu) {
        return '<option' + (it.currency === cu ? ' selected' : '') + '>' + cu + '</option>';
      }).join("");
      var kindOpts =
        '<option value="part"' + (it.kind === "part" ? " selected" : "") + '>' + t("wo.item_kind_part") + '</option>' +
        '<option value="labor"' + (it.kind === "labor" ? " selected" : "") + '>' + t("wo.item_kind_labor") + '</option>';
      return '<div class="itemrow" data-idx="' + i + '">' +
        '<input class="it-name" placeholder="' + t("wo.item_name") + '" value="' + esc(it.name) + '" oninput="WOgo.editItem(' + i + ',\'name\',this.value)">' +
        '<div class="itemrow-line">' +
          '<select class="it-kind" onchange="WOgo.editItem(' + i + ',\'kind\',this.value)">' + kindOpts + '</select>' +
          '<input class="it-qty" type="number" inputmode="decimal" placeholder="' + t("wo.item_qty") + '" value="' + esc(it.qty) + '" oninput="WOgo.editItem(' + i + ',\'qty\',this.value)">' +
          '<input class="it-price" type="number" inputmode="decimal" placeholder="' + t("wo.item_price") + '" value="' + esc(it.price) + '" oninput="WOgo.editItem(' + i + ',\'price\',this.value)">' +
          '<select class="it-cur" onchange="WOgo.editItem(' + i + ',\'currency\',this.value)">' + curOpts + '</select>' +
          '<button class="it-del" onclick="WOgo.removeItem(' + i + ')">✕</button>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function totalHTML() {
    var totals = window.Models.formatTotals(window.Models.sumByCurrency(WO.draft.items));
    return totals ? '<b>' + t("common.total") + ': ' + totals + '</b>' : '';
  }

  function byId(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  /* ---------- Snimanje stanja koraka pre prelaska ---------- */

  function captureStep() {
    var name = WO.steps[WO.step];
    if (name === "vehicle") {
      var sel = document.getElementById("wo_vehicle");
      if (sel) WO.draft.vehicle_id = sel.value || null;
      var mk = document.getElementById("wo_mileage");
      if (mk) WO.draft.mileage_km = mk.value.trim();
    } else if (name === "client") {
      var cs = document.getElementById("wo_client");
      if (cs) WO.draft.contact_id = cs.value || null;
    } else if (name === "description") {
      var d = document.getElementById("wo_desc");
      if (d) WO.draft.description = d.value;
      var dt = document.getElementById("wo_doctype");
      if (dt) WO.draft.docType = dt.value;
    } else if (name === "signature") {
      captureSig("customer");
      captureSig("technician");
    }
  }

  /* ---------- Potpis (canvas) ---------- */

  function bindSigPad(which) {
    var canvas = document.getElementById("sig_" + which);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    var drawing = false, last = null;
    WO.sigPads[which] = { canvas: canvas, dirty: false };

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      return { x: (p.clientX - r.left) * canvas.width / r.width,
               y: (p.clientY - r.top) * canvas.height / r.height };
    }
    function down(e) { e.preventDefault(); drawing = true; last = pos(e); }
    function move(e) {
      if (!drawing) return; e.preventDefault();
      var p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; WO.sigPads[which].dirty = true;
    }
    function up() { drawing = false; }

    canvas.addEventListener("mousedown", down); canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", up);
  }

  function captureSig(which) {
    var pad = WO.sigPads[which];
    if (pad && pad.dirty) WO.draft.signature[which] = pad.canvas.toDataURL("image/png");
  }

  /* ---------- Akcije (izložene kao WOgo) ---------- */

  var Actions = {
    next: function () { captureStep(); if (WO.step < WO.steps.length - 1) { WO.step++; renderStep(); } },
    prev: function () { captureStep(); if (WO.step > 0) { WO.step--; renderStep(); } },
    exit: function () { window.GT.go("home"); },

    quickVehicle: function () {
      var make = prompt(t("vehicles.make")); if (make === null) return;
      var model = prompt(t("vehicles.model")) || "";
      var plate = prompt(t("vehicles.plate")) || "";
      if (!make && !model) { toast(t("wo.no_vehicle")); return; }
      var v = window.Models.createVehicle({ make: make, model: model, plate: plate });
      window.Store.put("vehicles", v).then(function () {
        WO.vehicles.push(v); WO.draft.vehicle_id = v.id; renderStep();
      });
    },

    quickClient: function () {
      var name = prompt(t("contacts.name")); if (!name) return;
      var phone = prompt(t("contacts.phone")) || "";
      var c = window.Models.createContact({ name: name, phone: phone, roles: ["client"] });
      window.Store.put("contacts", c).then(function () {
        WO.contacts.push(c); WO.draft.contact_id = c.id; renderStep();
      });
    },

    voice: function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { toast(t("wo.voice_unsupported")); return; }
      var rec = new SR();
      rec.lang = window.Store.settings.get("lang", "sr") === "sr" ? "sr-RS" : "en-US";
      rec.interimResults = false;
      var btn = document.getElementById("wo_voicebtn");
      if (btn) btn.textContent = "● …";
      rec.onresult = function (e) {
        var txt = e.results[0][0].transcript;
        var ta = document.getElementById("wo_desc");
        ta.value = (ta.value ? ta.value + " " : "") + txt;
      };
      rec.onerror = function () { toast(t("wo.voice_unsupported")); };
      rec.onend = function () { if (btn) btn.textContent = t("wo.voice"); };
      rec.start();
    },

    addPhotos: function (input) {
      if (!input.files || !input.files.length) return;
      window.Photos.compressMany(input.files).then(function (arr) {
        WO.draft.photos = WO.draft.photos.concat(arr).slice(0, 8);
        document.getElementById("wo_photos").innerHTML = photosHTML();
      });
    },
    removePhoto: function (i) {
      WO.draft.photos.splice(i, 1);
      document.getElementById("wo_photos").innerHTML = photosHTML();
    },

    addItem: function () {
      WO.draft.items.push(window.Models.createItem({
        kind: "part", name: "", qty: 1,
        currency: window.Store.settings.get("currency", window.GT.config().currency_default)
      }));
      document.getElementById("wo_items").innerHTML = itemsHTML();
      document.getElementById("wo_total").innerHTML = totalHTML();
    },
    editItem: function (i, field, value) {
      if (field === "qty" || field === "price") value = value === "" ? 0 : Number(value);
      WO.draft.items[i][field] = value;
      document.getElementById("wo_total").innerHTML = totalHTML();
    },
    removeItem: function (i) {
      WO.draft.items.splice(i, 1);
      document.getElementById("wo_items").innerHTML = itemsHTML();
      document.getElementById("wo_total").innerHTML = totalHTML();
    },

    clearSig: function (which) {
      var c = document.getElementById("sig_" + which);
      if (c) { c.getContext("2d").clearRect(0, 0, c.width, c.height); }
      if (WO.sigPads[which]) WO.sigPads[which].dirty = false;
      WO.draft.signature[which] = null;
    },

    finish: function () { captureStep(); Actions.share(); },

    preview: function () {
      var doc = buildPDF();
      if (doc) window.open(doc.output("bloburl"), "_blank");
    },

    share: function () {
      captureStep();
      if (!WO.draft.vehicle_id) { toast(t("wo.no_vehicle")); WO.step = 0; renderStep(); return; }
      persistEvent().then(function (number) {
        var doc = buildPDF(number);
        if (!doc) return;
        var fileName = number + "-" + WO.draft.docType.toUpperCase() + ".pdf";
        var blob = doc.output("blob");
        var file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: fileName }).catch(function () {});
        } else {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = fileName;
          document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        }
        toast(t("wo.saved_event"));
        setTimeout(function () { window.GT.go("vehicle_card", { id: WO.draft.vehicle_id }); }, 600);
      });
    }
  };

  /* ---------- Perzistencija: EVENT + DOCUMENT ---------- */

  function persistEvent() {
    return window.Store.all("documents").then(function (docs) {
      var prefix = window.GT.config().doc_prefix;
      var lastNum = docs.map(function (d) { return d.number; }).filter(Boolean).sort().pop() || null;
      var number = window.Models.nextDocNumber(prefix, lastNum);

      var typeMap = { work_order: "work_order", invoice: "work_order", estimate: "note" };
      var ev = window.Models.createEvent({
        vehicle_id: WO.draft.vehicle_id,
        contact_id: WO.draft.contact_id,
        type: WO.draft.docType === "estimate" ? "note" : "work_order",
        title: window.GT.t("doc." + WO.draft.docType),
        description: WO.draft.description,
        mileage_km: WO.draft.mileage_km ? parseInt(WO.draft.mileage_km, 10) : null,
        items: WO.draft.items,
        photos: WO.draft.photos,
        source: "mechanic",
        app: "garage",
        documents: []
      });

      var docRec = window.Models.createDocument({
        doc_type: WO.draft.docType,
        number: number,
        vehicle_id: WO.draft.vehicle_id,
        event_id: ev.id
      });
      ev.documents = [docRec.id];

      return Promise.all([
        window.Store.put("events", ev),
        window.Store.put("documents", docRec)
      ]).then(function () { return number; });
    });
  }

  /* ---------- PDF ---------- */

  function buildPDF(number) {
    var v = byId(WO.vehicles, WO.draft.vehicle_id);
    var c = byId(WO.contacts, WO.draft.contact_id);
    var profile = window.Store.settings.get("profile", { name: "", phone: "" });
    var lang = window.Store.settings.get("lang", "sr");
    var licensed = window.License.isLicensed(window.Store);

    try {
      return window.PDFEngine.build({
        docType: WO.draft.docType,
        number: number || "",
        date: new Date().toISOString().slice(0, 10),
        lang: lang,
        profile: profile,
        vehicle: v ? { make: v.make, model: v.model, plate: v.plate,
                       mileage_km: WO.draft.mileage_km, category: v.category } : {},
        client: c ? { name: c.name, phone: c.phone } : {},
        description: WO.draft.description,
        items: WO.draft.items,
        photos: WO.draft.photos,
        signature: WO.draft.signature,
        watermark: !licensed   // free tier → watermark
      });
    } catch (e) {
      toast("PDF: " + e.message);
      return null;
    }
  }

  window.WorkOrder = { start: start, startFromEstimate: startFromEstimate };
  window.WOgo = Actions;
})();
