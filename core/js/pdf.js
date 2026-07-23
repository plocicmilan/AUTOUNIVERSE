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
    doc.text(sr ? "SERVISNI PASOŠ" : "SERVICE PASSPORT", ML, y);
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

  /* ============================================================
     buildSaleSummary — jednostranski "Sažetak za kupca"
     Pokazuje: vozilo, ključne stats, istorija, trade info
     opts: { vehicle, events, profile, trade, lang }
     ============================================================ */
  function buildSaleSummary(opts) {
    opts = opts || {};
    var jsPDFctor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFctor) throw new Error("jsPDF nije učitan.");
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

    var C = readColors();
    var cPrimary = rgb(C.primary), cAccent = rgb(C.accent);
    var PW = 210, ML = 16, MR = 210 - 16, y = 18;
    var v = opts.vehicle || {};
    var events = (opts.events || []).filter(function (e) { return e.vehicle_id === v.id; });
    var trade = opts.trade || (v.trade) || {};

    /* ── Zaglavlje ── */
    setFont("bold").setFontSize(20).setTextColor.apply(doc, cAccent);
    doc.text(sr ? "SAŽETAK ZA KUPCA" : "VEHICLE SALE SUMMARY", ML, y);
    y += 8;
    setFont("normal").setFontSize(12).setTextColor.apply(doc, cPrimary);
    var vTitle = [v.make, v.model].filter(Boolean).join(" ") + (v.year ? " (" + v.year + ")" : "");
    doc.text(vTitle, ML, y);
    y += 5;
    setFont("normal").setFontSize(9).setTextColor(90);
    var idLine = [v.plate, v.vin ? "VIN: " + v.vin : ""].filter(Boolean).join("   ");
    if (idLine) { doc.text(idLine, ML, y); y += 4; }
    doc.setDrawColor.apply(doc, cPrimary).setLineWidth(0.5).line(ML, y, MR, y);
    y += 6;

    /* ── Stats blok ── */
    var totalEvts = events.length;
    var mechEvts  = events.filter(function (e) { return e.source === "mechanic" || e.source === "receipt"; }).length;
    var serviceEvts = events.filter(function (e) {
      return ["service","oil_change","repair","inspection"].indexOf(e.type) >= 0;
    }).length;
    var currentKm = 0;
    events.forEach(function (e) { if (e.mileage_km > currentKm) currentKm = e.mileage_km; });

    var stats = [
      [sr ? "Ukupno unosa" : "Total entries", totalEvts],
      [sr ? "Potvrđeno od servisera" : "Mechanic-confirmed", mechEvts],
      [sr ? "Servisnih intervencija" : "Service events", serviceEvts],
      [sr ? "Poslednje stanje km" : "Last odometer", currentKm ? currentKm.toLocaleString("sr") + " km" : "—"],
    ];
    var colW = (MR - ML) / stats.length;
    stats.forEach(function (s, i) {
      var cx = ML + colW * i + colW / 2;
      setFont("bold").setFontSize(16).setTextColor.apply(doc, cAccent);
      doc.text(String(s[1]), cx, y, { align: "center" });
      setFont("normal").setFontSize(8).setTextColor(110);
      doc.text(s[0], cx, y + 5, { align: "center" });
    });
    y += 14;
    doc.setDrawColor(220).setLineWidth(0.2).line(ML, y, MR, y);
    y += 6;

    /* ── Ključni servisi (max 8) ── */
    var keyTypes = ["oil_change","service","repair","inspection","tire_change","registration","insurance"];
    var keyEvts = events
      .filter(function (e) { return keyTypes.indexOf(e.type) >= 0 || e.source === "mechanic"; })
      .sort(function (a, b) { return (b.event_date || "").localeCompare(a.event_date || ""); })
      .slice(0, 8);

    var typeLabels = {
      oil_change: sr ? "Zamena ulja" : "Oil change",
      service: sr ? "Servis" : "Service",
      repair: sr ? "Popravka" : "Repair",
      inspection: sr ? "Tehnički" : "Inspection",
      tire_change: sr ? "Gume" : "Tires",
      registration: sr ? "Registracija" : "Registration",
      insurance: sr ? "Osiguranje" : "Insurance",
      work_order: sr ? "Radni nalog" : "Work order",
    };

    if (keyEvts.length) {
      setFont("bold").setFontSize(10).setTextColor.apply(doc, cPrimary);
      doc.text(sr ? "ISTORIJA SERVISA" : "SERVICE HISTORY", ML, y); y += 5;

      keyEvts.forEach(function (e) {
        if (y > 260) return;
        var dateStr = (e.event_date || e.date || "").slice(0, 7).replace("-", ".");
        var label   = typeLabels[e.type] || e.type;
        var km      = e.mileage_km != null ? " · " + Number(e.mileage_km).toLocaleString("sr") + " km" : "";
        var src     = e.source === "mechanic" ? " ✓" : "";

        setFont("bold").setFontSize(8.5).setTextColor(40);
        doc.text(dateStr + "  " + label + km + src, ML + 2, y);
        if (e.description) {
          setFont("normal").setFontSize(8).setTextColor(110);
          var desc = e.description.length > 90 ? e.description.slice(0, 87) + "..." : e.description;
          doc.text(desc, ML + 2, y + 3.5);
          y += 3.5;
        }
        y += 5;
      });
      y += 2;
      doc.setDrawColor(220).setLineWidth(0.2).line(ML, y, MR, y);
      y += 6;
    }

    /* ── Trade info (ako postoji) ── */
    if (trade.sale && (trade.sale.price || trade.purchase)) {
      setFont("bold").setFontSize(10).setTextColor.apply(doc, cPrimary);
      doc.text(sr ? "FINANSIJE" : "FINANCIALS", ML, y); y += 5;

      var finRows = [];
      if (trade.purchase && trade.purchase.price) {
        finRows.push([sr ? "Nabavna cena" : "Purchase price",
          trade.purchase.price + " " + (trade.purchase.currency || "EUR")]);
      }
      var totalInvested = 0;
      events.forEach(function (e) {
        if (e.cost && e.cost.total) totalInvested += Number(e.cost.total) || 0;
      });
      if (totalInvested > 0) {
        var invCur = (events.find(function (e) { return e.cost && e.cost.currency; }) || {cost:{}}).cost.currency || "RSD";
        finRows.push([sr ? "Ukupno uloženo" : "Total invested", totalInvested.toLocaleString("sr") + " " + invCur]);
      }
      if (trade.sale && trade.sale.price) {
        finRows.push([sr ? "Tražena cena" : "Asking price",
          trade.sale.price + " " + (trade.sale.currency || "EUR")]);
      }

      finRows.forEach(function (r) {
        setFont("normal").setFontSize(9).setTextColor(60);
        doc.text(r[0] + ":", ML + 2, y);
        setFont("bold").setFontSize(9).setTextColor.apply(doc, cAccent);
        doc.text(r[1], MR, y, { align: "right" });
        y += 5;
      });
    }

    /* ── Footer / watermark ── */
    var ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(8).setTextColor(170);
    doc.text("AutoUniverse · autouniverse.rs", ML, ph - 12);
    doc.text(sr ? "Generisano: " + new Date().toLocaleDateString("sr-RS") : "Generated: " + new Date().toLocaleDateString(), MR, ph - 12, { align: "right" });
    doc.setFontSize(7).setTextColor(190);
    doc.text(sr ? "Podaci uneti od strane vlasnika. AutoUniverse ne garantuje tačnost." : "Data entered by owner. AutoUniverse does not guarantee accuracy.", ML, ph - 8);

    return doc;
  }

  var PDF = { build: build, buildDossier: buildDossier, buildSaleSummary: buildSaleSummary, label: label, DOC_LABELS: DOC_LABELS };

  if (typeof module !== "undefined" && module.exports) module.exports = PDF;
  global.PDFEngine = PDF;
})(typeof window !== "undefined" ? window : globalThis);
