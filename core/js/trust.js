/* AutoUniverse — Trust Score algoritam
   Racuna nivo poverenja u istoriju vozila iz postojecih Event/Document zapisa.
   Bez novih tabela — koristi trust markere koji vec postoje u models.js.

   Spec: autouniverse/ideas/accepted/2026-07-20_autopijaca_autodelovi/SPEC.md DEO 1
   Adaptirano na EVENT_SOURCES = ["mechanic","owner","receipt","imported","initial"]
   i EVENT_TYPES iz core/js/models.js.

   API:
     Trust.compute(vehicle, events, documents) -> { score, level, color, breakdown }
     Trust.LEVELS  -> [{name, min, color}, ...]
*/
(function () {
  "use strict";

  var LEVELS = [
    { name: "gold",   label: "Zlatni",   min: 80, color: "#1D9E75" },
    { name: "silver", label: "Srebrni",  min: 40, color: "#EF9F27" },
    { name: "bronze", label: "Bronzani", min:  0, color: "#B4B2A9" }
  ];

  // Tipovi Event-a koji broje kao "servisni rad" (mapiranje na nas EVENT_TYPES)
  var SERVICE_TYPES = ["service", "repair", "work_order"];

  function levelFor(score) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (score >= LEVELS[i].min) return LEVELS[i];
    }
    return LEVELS[LEVELS.length - 1];
  }

  // Racuna broj periodima >= gapMonths meseci izmedju uzastopnih event-a
  function countGaps(events, gapMonths) {
    var withDates = events
      .map(function (e) { return e.event_date || e.date || e.created_at; })
      .filter(Boolean)
      .map(function (d) { return new Date(d).getTime(); })
      .filter(function (t) { return !isNaN(t); })
      .sort(function (a, b) { return a - b; });
    if (withDates.length < 2) return 0;
    var gapMs = gapMonths * 30 * 24 * 3600 * 1000;
    var n = 0;
    for (var i = 1; i < withDates.length; i++) {
      if (withDates[i] - withDates[i - 1] > gapMs) n++;
    }
    return n;
  }

  function compute(vehicle, events, documents) {
    events = events || [];
    documents = documents || [];
    var vehId = vehicle && vehicle.id;

    // Filtriranje po vozilu ako je ID prosledjen (funkcija radi i ako je prosledjena vec filtrirana lista)
    var vEvents = vehId
      ? events.filter(function (e) { return !e.vehicle_id || e.vehicle_id === vehId; })
      : events.slice();
    var vDocs = vehId
      ? documents.filter(function (d) { return !d.vehicle_id || d.vehicle_id === vehId; })
      : documents.slice();

    // 1) Verifikovani servisi (max 40): source='mechanic' + service-type
    var verified = vEvents.filter(function (e) {
      return e.source === "mechanic" && SERVICE_TYPES.indexOf(e.type) !== -1;
    });
    var verifiedPts = Math.min(verified.length * 8, 40);

    // 2) Priloženi računi (max 24): documents sa doc_type='invoice' ili events sa attached invoice
    var invoiceDocs = vDocs.filter(function (d) {
      return d.doc_type === "invoice" || d.type === "invoice";
    });
    // Fallback: broji i receipt-ove koji nisu vezani za dokument (source='receipt' na event-u)
    var receiptEvents = vEvents.filter(function (e) { return e.source === "receipt"; });
    var invoicesTotal = invoiceDocs.length + receiptEvents.length;
    var invoicePts = Math.min(invoicesTotal * 6, 24);

    // 3) Vlasnikovi zapisi (max 10): source='owner'
    var owned = vEvents.filter(function (e) { return e.source === "owner"; });
    var ownedPts = Math.min(owned.length * 1, 10);

    // 4) Fotografije (max 10): vehicle.photos + event.photos + document type='photo'
    var vehPhotos = (vehicle && vehicle.photos) ? vehicle.photos.length : 0;
    var eventPhotos = vEvents.reduce(function (n, e) {
      return n + (Array.isArray(e.photos) ? e.photos.length : 0);
    }, 0);
    var docPhotos = vDocs.filter(function (d) {
      return d.doc_type === "photo" || d.type === "photo";
    }).length;
    var totalPhotos = vehPhotos + eventPhotos + docPhotos;
    var photoPts = Math.min(totalPhotos * 0.2, 10);

    // 5) Kilometraža konzistentnost (max 10): monotono raste + >=3 zapisa
    var kmEvents = vEvents
      .filter(function (e) { return typeof e.km === "number" && !isNaN(e.km); })
      .sort(function (a, b) {
        var da = new Date(a.event_date || a.date || a.created_at || 0).getTime();
        var db = new Date(b.event_date || b.date || b.created_at || 0).getTime();
        return da - db;
      });
    var kmMonotonic = kmEvents.every(function (e, i) {
      return i === 0 || e.km >= kmEvents[i - 1].km;
    });
    var kmPts = (kmMonotonic && kmEvents.length >= 3) ? 10 : 0;

    // 6) Penalizacije — gap-ovi >18 meseci, -5 svaki
    var gaps = countGaps(vEvents, 18);
    var gapPenalty = gaps * 5;

    // 7) Retroactive-only cap: ako je SVE retroactive/initial → cap na 15
    var allRetroactive = vEvents.length > 0 && vEvents.every(function (e) {
      return e.retroactive === true || e.source === "initial";
    });

    var raw = verifiedPts + invoicePts + ownedPts + photoPts + kmPts - gapPenalty;
    var score = Math.max(0, Math.min(100, Math.round(raw)));
    if (allRetroactive) score = Math.min(score, 15);

    var level = levelFor(score);
    return {
      score: score,
      level: level.name,
      level_label: level.label,
      color: level.color,
      breakdown: {
        verified_services: verified.length,
        verified_pts: verifiedPts,
        invoices: invoicesTotal,
        invoice_pts: invoicePts,
        owner_records: owned.length,
        owner_pts: ownedPts,
        photos: totalPhotos,
        photo_pts: Math.round(photoPts * 10) / 10,
        km_consistent: kmMonotonic && kmEvents.length >= 3,
        km_pts: kmPts,
        gaps_over_18mo: gaps,
        gap_penalty: gapPenalty,
        all_retroactive: allRetroactive
      }
    };
  }

  var api = { compute: compute, LEVELS: LEVELS, SERVICE_TYPES: SERVICE_TYPES };

  // Universal export: browser (window.Trust) + Node (module.exports)
  if (typeof window !== "undefined") window.Trust = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
