/* ============================================================
   AUTO UNIVERSE — CORE / PDF ENGINE  (Nivo 0)
   Jedan generator za sva dokumenta: work_order | invoice | estimate.
   Standard iz Mape sveta (Deo III) + Toolbox PDF standard.
   Zbir PO VALUTI, bez kursa. jsPDF bundlovan lokalno.
   ============================================================ */
(function (global) {
  "use strict";

  var DOC_LABELS = {
    work_order: { en: "WORK ORDER", sr: "RADNI NALOG" },
    invoice:    { en: "INVOICE",    sr: "FAKTURA" },
    estimate:   { en: "ESTIMATE",   sr: "PONUDA" }
  };

  function label(docType, lang) {
    var d = DOC_LABELS[docType] || DOC_LABELS.work_order;
    return d[lang] || d.en;
  }

  /* ---------- Glavna funkcija ----------
     opts = {
       docType, number, date, lang, currencyFallback,
       profile: {name, phone, logoDataUrl},
       vehicle: {make, model, plate, mileage_km, category},
       client:  {name, phone},
       description, items:[], photos:[dataUrl...],
       signature: {customer:dataUrl, technician:dataUrl} | null,
       watermark: bool
     }
     Vraća jsPDF doc (pozivalac radi .save()/.output()).            */

  function build(opts) {
    var jsPDFctor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFctor) throw new Error("jsPDF nije učitan.");

    var lang = opts.lang || "en";
    var M = global.Models;
    var doc = new jsPDFctor({ unit: "mm", format: "a4" });

    // Font sa našim slovima (š/ć/č/ž/đ). Fallback na helvetica ako nema.
    var FONT = "helvetica";
    if (global.AUFont && global.AUFont.register(doc)) {
      FONT = global.AUFont.name;
    }
    function setFont(style) { return doc.setFont(FONT, style || "normal"); }

    var PW = 210, ML = 16, MR = 210 - 16, y = 16;

    var C = readColors();
    function rgb(hex) {
      hex = (hex || "#000000").replace("#", "");
      return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    }
    var cPrimary = rgb(C.primary), cAccent = rgb(C.accent);

    /* --- Zaglavlje: logo/ime + broj/tip --- */
    var prof = opts.profile || {};
    if (prof.logoDataUrl) {
      try { doc.addImage(prof.logoDataUrl, "PNG", ML, y, 22, 22); } catch (e) {}
    }
    setFont("bold").setFontSize(16).setTextColor.apply(doc, cAccent);
    doc.text(String(prof.name || "Garage Toolbox"), prof.logoDataUrl ? ML + 26 : ML, y + 8);

    doc.setFontSize(13).setTextColor.apply(doc, cPrimary);
    doc.text(label(opts.docType, lang), MR, y + 5, { align: "right" });
    setFont("normal").setFontSize(10).setTextColor.apply(doc, cAccent);
    doc.text(String(opts.number || ""), MR, y + 11, { align: "right" });
    if (prof.phone) doc.text(String(prof.phone), MR, y + 16, { align: "right" });

    y += 26;
    doc.setDrawColor.apply(doc, cPrimary).setLineWidth(0.6).line(ML, y, MR, y);
    y += 8;

    /* --- Meta: datum, klijent, vozilo --- */
    doc.setFontSize(10).setTextColor.apply(doc, cAccent);
    var v = opts.vehicle || {}, cl = opts.client || {};
    var metaL = [
      (lang === "sr" ? "Datum: " : "Date: ") + (opts.date || ""),
      (lang === "sr" ? "Klijent: " : "Client: ") + (cl.name || "—") + (cl.phone ? " (" + cl.phone + ")" : "")
    ];
    var vehLine = [v.make, v.model].filter(Boolean).join(" ");
    if (v.plate) vehLine += " • " + v.plate;
    if (v.mileage_km != null && v.mileage_km !== "") vehLine += " • " + v.mileage_km + " km";
    var metaR = [(lang === "sr" ? "Vozilo: " : "Vehicle: ") + (vehLine || "—")];

    metaL.forEach(function (line, i) { doc.text(line, ML, y + i * 5.5); });
    metaR.forEach(function (line, i) { doc.text(line, ML, y + (metaL.length + i) * 5.5); });
    y += (metaL.length + metaR.length) * 5.5 + 4;

    /* --- Opis rada --- */
    if (opts.description) {
      setFont("bold").setFontSize(10);
      doc.text(lang === "sr" ? "IZVRŠENI RADOVI / OPIS" : "WORK PERFORMED", ML, y);
      y += 5;
      setFont("normal");
      var wrapped = doc.splitTextToSize(String(opts.description), MR - ML);
      doc.text(wrapped, ML, y);
      y += wrapped.length * 5 + 3;
    }

    /* --- Tabela stavki --- */
    var items = opts.items || [];
    if (items.length) {
      y = drawItemsTable(doc, items, y, ML, MR, cPrimary, cAccent, lang, FONT);
    }

    /* --- UKUPNO po valutama (bez kursa) --- */
    if (items.length) {
      var totals = M.sumByCurrency(items);
      var totalStr = M.formatTotals(totals);
      if (totalStr) {
        y += 2;
        doc.setDrawColor(200).setLineWidth(0.3).line(MR - 70, y, MR, y);
        y += 6;
        setFont("bold").setFontSize(12).setTextColor.apply(doc, cAccent);
        doc.text((lang === "sr" ? "UKUPNO:" : "TOTAL:") + " " + totalStr, MR, y, { align: "right" });
        y += 8;
      }
    }

    /* --- Slike (do 4, u dva reda) --- */
    var photos = (opts.photos || []).slice(0, 4);
    if (photos.length) {
      if (y > 220) { doc.addPage(); y = 20; }
      setFont("bold").setFontSize(10).setTextColor.apply(doc, cAccent);
      doc.text(lang === "sr" ? "SLIKE" : "PHOTOS", ML, y); y += 4;
      var pw = 42, gap = 4, px = ML, startY = y;
      photos.forEach(function (p, i) {
        var col = i % 4;
        try { doc.addImage(p, "JPEG", px + col * (pw + gap), startY, pw, pw * 0.75); } catch (e) {}
      });
      y = startY + pw * 0.75 + 8;
    }

    /* --- Potpisi --- */
    if (opts.signature && (opts.signature.customer || opts.signature.technician)) {
      if (y > 250) { doc.addPage(); y = 20; }
      var sigW = 55, sigY = y;
      if (opts.signature.customer) {
        try { doc.addImage(opts.signature.customer, "PNG", ML, sigY, sigW, 18); } catch (e) {}
      }
      if (opts.signature.technician) {
        try { doc.addImage(opts.signature.technician, "PNG", MR - sigW, sigY, sigW, 18); } catch (e) {}
      }
      doc.setDrawColor(120).setLineWidth(0.3);
      doc.line(ML, sigY + 20, ML + sigW, sigY + 20);
      doc.line(MR - sigW, sigY + 20, MR, sigY + 20);
      doc.setFontSize(8).setTextColor(90);
      doc.text(lang === "sr" ? "Mušterija" : "Customer", ML, sigY + 24);
      doc.text(lang === "sr" ? "Majstor" : "Technician", MR - sigW, sigY + 24);
      y = sigY + 30;
    }

    /* --- Footer --- */
    var ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(8).setTextColor(140);
    var footer1 = (prof.name || "") + (prof.phone ? "  •  " + prof.phone : "");
    var footer2 = [prof.address, prof.email, prof.website].filter(Boolean).join("  •  ");
    doc.text(footer1 || "Garage Toolbox", PW / 2, footer2 ? ph - 14 : ph - 10, { align: "center" });
    if (footer2) doc.text(footer2, PW / 2, ph - 9, { align: "center" });

    /* --- Watermark (free tier) --- */
    if (opts.watermark) {
      var wmText = opts.watermarkText || "GARAGE TOOLBOX";
      var pages = doc.internal.getNumberOfPages();
      for (var pg = 1; pg <= pages; pg++) {
        doc.setPage(pg);
        doc.setFontSize(50).setTextColor(230, 230, 230);
        if (doc.saveGraphicsState) doc.saveGraphicsState();
        try {
          if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.35 }));
          doc.text(wmText, PW / 2, ph / 2, { align: "center", angle: 35 });
        } catch (e) {
          doc.text(wmText, PW / 2, ph / 2, { align: "center", angle: 35 });
        }
        if (doc.restoreGraphicsState) doc.restoreGraphicsState();
      }
    }

    return doc;
  }

  /* ---------- Tabela stavki ---------- */
  function drawItemsTable(doc, items, y, ML, MR, cPrimary, cAccent, lang, FONT) {
    function setFont(style) { return doc.setFont(FONT, style || "normal"); }
    var M = global.Models;
    var colName = ML, colQty = MR - 62, colPrice = MR - 34, colSum = MR;
    doc.setFillColor.apply(doc, cPrimary);
    doc.rect(ML, y - 4, MR - ML, 7, "F");
    setFont("bold").setFontSize(9).setTextColor(255, 255, 255);
    doc.text(lang === "sr" ? "Stavka" : "Item", colName + 1, y);
    doc.text(lang === "sr" ? "Kol." : "Qty", colQty, y, { align: "right" });
    doc.text(lang === "sr" ? "Cena" : "Price", colPrice, y, { align: "right" });
    doc.text(lang === "sr" ? "Iznos" : "Amount", colSum, y, { align: "right" });
    y += 6;

    setFont("normal").setTextColor.apply(doc, cAccent);
    items.forEach(function (it, i) {
      if (y > 265) { doc.addPage(); y = 20; }
      if (i % 2 === 1) { doc.setFillColor(246, 245, 241); doc.rect(ML, y - 4, MR - ML, 6.5, "F"); }
      var qty = it.qty != null ? it.qty : 1;
      var line = (Number(it.price) || 0) * qty;
      var kindMark = it.kind === "labor" ? (lang === "sr" ? "[rad] " : "[labor] ") : "";
      doc.setFontSize(9);
      doc.text(String(kindMark + (it.name || "")).slice(0, 46), colName + 1, y);
      doc.text(String(qty) + (it.unit ? " " + it.unit : ""), colQty, y, { align: "right" });
      doc.text(M.formatAmount(Number(it.price) || 0, it.currency), colPrice, y, { align: "right" });
      doc.text(M.formatAmount(line, it.currency), colSum, y, { align: "right" });
      y += 6.5;
    });
    return y + 2;
  }

  /* ---------- Boje iz CSS varijabli ---------- */
  function readColors() {
    if (typeof getComputedStyle === "undefined") return { primary: "#D5281B", accent: "#1C1F24" };
    var s = getComputedStyle(document.documentElement);
    return {
      primary: (s.getPropertyValue("--c-primary") || "#D5281B").trim(),
      accent: (s.getPropertyValue("--c-accent") || "#1C1F24").trim()
    };
  }

  /* ============================================================
     DOSIJE VOZILA — kompletan istorijat u jednom PDF-u.
     Koristi Driver (izvoz istorije), kasnije i Garage.
     opts: { lang, profile:{name,phone}, vehicle:{...}, currentKm,
             events:[...], techCard:{...} }
     ============================================================ */
  function buildDossier(opts) {
    opts = opts || {};
    var jsPDFctor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFctor) throw new Error("jsPDF nije učitan.");
    var M = global.Models;
    var lang = opts.lang || "sr";
    var sr = lang === "sr";
    var doc = new jsPDFctor({ unit: "mm", format: "a4" });

    var FONT = "helvetica";
    if (global.AUFont && global.AUFont.register(doc)) FONT = global.AUFont.name;
    function setFont(style) { return doc.setFont(FONT, style || "normal"); }

    function rgb(hex) {
      hex = (hex || "#000000").replace("#", "");
      return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    }
    var C = readColors(), cPrimary = rgb(C.primary), cAccent = rgb(C.accent);
    var PW = 210, ML = 16, MR = 210 - 16, y = 18;
    var v = opts.vehicle || {}, prof = opts.profile || {};

    /* Zaglavlje */
    setFont("bold").setFontSize(16).setTextColor.apply(doc, cAccent);
    doc.text(sr ? "DOSIJE VOZILA" : "VEHICLE DOSSIER", ML, y);
    doc.setFontSize(13).setTextColor.apply(doc, cPrimary);
    var vehTitle = [v.make, v.model].filter(Boolean).join(" ") + (v.year ? " (" + v.year + ")" : "");
    doc.text(vehTitle, MR, y, { align: "right" });
    y += 6;
    setFont("normal").setFontSize(10).setTextColor.apply(doc, cAccent);
    var idLine = [v.plate, v.vin ? "VIN " + v.vin : "", v.type_label || v.category].filter(Boolean).join(" • ");
    doc.text(idLine, ML, y);
    if (opts.currentKm != null) doc.text((sr ? "Stanje: " : "Odometer: ") + opts.currentKm + " km", MR, y, { align: "right" });
    y += 4;
    doc.setDrawColor.apply(doc, cPrimary).setLineWidth(0.6).line(ML, y, MR, y);
    y += 8;

    /* Tehnička kartica (kratko) */
    var tc = opts.techCard || {};
    var tcRows = [
      [sr ? "Ulje" : "Oil", tc.oil_type],
      [sr ? "Filter ulja" : "Oil filter", tc.oil_filter],
      [sr ? "Akumulator" : "Battery", tc.battery],
      [sr ? "Gume" : "Tires", tc.tires]
    ].filter(function (r) { return r[1]; });
    if (tcRows.length) {
      setFont("bold").setFontSize(10);
      doc.text(sr ? "TEHNIČKA KARTICA" : "TECH CARD", ML, y); y += 5;
      setFont("normal").setFontSize(9);
      tcRows.forEach(function (r) {
        doc.text(r[0] + ": " + r[1], ML, y); y += 5;
      });
      y += 3;
    }

    /* Istorija događaja */
    setFont("bold").setFontSize(10).setTextColor.apply(doc, cAccent);
    doc.text(sr ? "ISTORIJA" : "HISTORY", ML, y); y += 6;

    var events = (opts.events || []).slice().sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });
    var typeLabel = opts.typeLabel || function (ty) { return ty; };
    var srcMark = { mechanic: "🟢", owner: "🔵", receipt: "🟣", initial: "⚪", imported: "⚪" };

    if (!events.length) {
      setFont("normal").setFontSize(9).setTextColor(140);
      doc.text(sr ? "Nema unetih događaja." : "No events.", ML, y); y += 6;
    }
    events.forEach(function (e) {
      if (y > 272) { doc.addPage(); y = 20; }
      var dateStr = e.date_precision === "month" && e.date
        ? (function () { var p = e.date.split("-"); return p[1] + "." + p[0]; })()
        : (e.date_precision === "approx" ? "~" + (e.date || "") : (e.date || ""));
      setFont("bold").setFontSize(9.5).setTextColor.apply(doc, cAccent);
      var head = dateStr + "   " + (e.title || typeLabel(e.type));
      doc.text(head, ML, y);
      var meta = (e.mileage_km != null ? e.mileage_km + " km" : "") +
                 (e.km_precision === "approx" && e.mileage_km != null ? " (~)" : "");
      if (meta) doc.text(meta, MR, y, { align: "right" });
      y += 4.5;
      setFont("normal").setFontSize(8.5).setTextColor(90);
      var srcTxt = (srcMark[e.source] || "") + " " +
        (e.retroactive ? (sr ? "unet naknadno" : "added later") : "") ;
      if (e.description) {
        var wrapped = doc.splitTextToSize(String(e.description), MR - ML - 2);
        doc.text(wrapped, ML, y); y += wrapped.length * 4.2;
      }
      var totals = M.formatTotals(M.sumByCurrency(e.items));
      var tail = [srcTxt.trim(), totals ? (sr ? "Ukupno: " : "Total: ") + totals : ""].filter(Boolean).join("   ");
      if (tail) { doc.text(tail, ML, y); y += 4.5; }
      doc.setDrawColor(225).setLineWidth(0.2).line(ML, y, MR, y);
      y += 4;
    });

    /* Footer sa vlasnikom + napomena o poreklu */
    var ph = doc.internal.pageSize.getHeight();
    var pages = doc.internal.getNumberOfPages();
    for (var pg = 1; pg <= pages; pg++) {
      doc.setPage(pg);
      doc.setFontSize(8).setTextColor(140);
      doc.text((prof.name || "") + (prof.phone ? "  •  " + prof.phone : ""), ML, ph - 10);
      doc.text((sr ? "Strana " : "Page ") + pg + "/" + pages, MR, ph - 10, { align: "right" });
      doc.setFontSize(7).setTextColor(160);
      doc.text(sr ? "🟢 servis  🔵 vlasnik  🟣 račun  ⚪ početno/naknadno"
                  : "🟢 shop  🔵 owner  🟣 receipt  ⚪ initial", ML, ph - 6);
    }
    return doc;
  }

  var PDF = { build: build, buildDossier: buildDossier, label: label, DOC_LABELS: DOC_LABELS };

  if (typeof module !== "undefined" && module.exports) module.exports = PDF;
  global.PDFEngine = PDF;
})(typeof window !== "undefined" ? window : globalThis);
