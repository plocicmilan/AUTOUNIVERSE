/* AutoUniverse — Event tag konstante
   Task 2 iz BRIEFING_2026_07_21_schema_agregacija.md

   Kategorijalni tagovi pored slobodnog teksta na Event/RadniNalog-u.
   Marko/Nikola unesu tag jednim klikom → ulazi u buduci agregat bez NLP-a.

   API:
     Tags.SYMPTOM_TAGS   -> [{ id, label, hint }]
     Tags.WORK_TAGS      -> [{ id, label, hint }]
     Tags.isValidSymptom(id) -> boolean
     Tags.isValidWork(id)    -> boolean

   Pravilo: tagovi su OPCIONI (0..N). Slobodan tekst opisa ostaje nezamenjiv.
*/
(function () {
  "use strict";

  var SYMPTOM_TAGS = [
    { id: "buka",             label: "Buka",              hint: "lupanje, škripa, zvižduk" },
    { id: "vibracija",        label: "Vibracija",         hint: "pri kočenju, u leru, na brzini" },
    { id: "dim",              label: "Dim",               hint: "beli, plavi, crni" },
    { id: "gubitak_snage",    label: "Gubitak snage",     hint: "" },
    { id: "greska_na_tabli",  label: "Greška na tabli",   hint: "check engine, ABS, airbag" },
    { id: "tecnost_curi",     label: "Curi tečnost",      hint: "ulje, rashladna, kočiono" },
    { id: "ne_pali",          label: "Ne pali",           hint: "" },
    { id: "temperatura",      label: "Temperatura",       hint: "pregrevanje, ne greje" },
    { id: "elektrika",        label: "Elektrika",         hint: "" },
    { id: "ostalo",           label: "Ostalo",            hint: "" }
  ];

  var WORK_TAGS = [
    { id: "zamena_dela",      label: "Zamena dela",       hint: "" },
    { id: "popravka",         label: "Popravka",          hint: "varjenje, doterivanje, adaptacija" },
    { id: "ciscenje",         label: "Čišćenje",          hint: "DPF, EGR, dizne" },
    { id: "podesavanje",      label: "Podešavanje",       hint: "geometrija, ventili" },
    { id: "dijagnostika",     label: "Dijagnostika",      hint: "" },
    { id: "redovan_servis",   label: "Redovan servis",    hint: "ulje, filteri, tečnosti" },
    { id: "karoserija",       label: "Karoserija",        hint: "" },
    { id: "elektro",          label: "Elektro",           hint: "" },
    { id: "ostalo",           label: "Ostalo",            hint: "" }
  ];

  function ids(list) { return list.map(function (t) { return t.id; }); }
  var SYMPTOM_IDS = ids(SYMPTOM_TAGS);
  var WORK_IDS = ids(WORK_TAGS);

  function isValidSymptom(id) { return SYMPTOM_IDS.indexOf(id) !== -1; }
  function isValidWork(id)    { return WORK_IDS.indexOf(id) !== -1; }

  // Sanitize input array — dropovani su neprepoznati tagovi (defenzivno)
  function sanitize(list, validator) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (validator(list[i]) && out.indexOf(list[i]) === -1) out.push(list[i]);
    }
    return out;
  }

  function sanitizeSymptoms(list) { return sanitize(list, isValidSymptom); }
  function sanitizeWork(list)     { return sanitize(list, isValidWork); }

  var api = {
    SYMPTOM_TAGS: SYMPTOM_TAGS,
    WORK_TAGS: WORK_TAGS,
    SYMPTOM_IDS: SYMPTOM_IDS,
    WORK_IDS: WORK_IDS,
    isValidSymptom: isValidSymptom,
    isValidWork: isValidWork,
    sanitizeSymptoms: sanitizeSymptoms,
    sanitizeWork: sanitizeWork
  };

  if (typeof window !== "undefined") window.Tags = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
