/* AutoUniverse — vozila katalog (marke + modeli, Balkan tržište)
   Koristi se offline — nema fetcha, sve embeddovano.
   API: window.Catalog.makes()  → string[]
        window.Catalog.models(make) → string[]    */
(function () {
  "use strict";

  var DATA = {
    "Alfa Romeo":  ["147","156","159","Giulia","Giulietta","Mito","Stelvio","Tonale"],
    "Audi":        ["80","100","A1","A2","A3","A4","A5","A6","A7","A8","Q2","Q3","Q5","Q7","Q8","TT","e-tron"],
    "BMW":         ["115","116","118","120","316","318","320","325","330","335","520","525","530","535","740","X1","X2","X3","X4","X5","X6","i3","i5"],
    "Chevrolet":   ["Aveo","Captiva","Cruze","Epica","Lacetti","Malibu","Matiz","Spark","Trax"],
    "Chrysler":    ["300C","PT Cruiser","Voyager"],
    "Citroen":     ["Berlingo","C1","C2","C3","C3 Aircross","C4","C4 Cactus","C5","C5 Aircross","Jumper","Jumpy","Picasso","Saxo","Xsara","DS3","DS4","DS5"],
    "Dacia":       ["Dokker","Duster","Jogger","Lodgy","Logan","Sandero","Spring","Bigster"],
    "Daewoo":      ["Espero","Kalos","Lanos","Leganza","Matiz","Nexia","Nubira","Tacuma"],
    "Fiat":        ["500","500X","500L","Bravo","Brava","Doblo","Ducato","Freemont","Grande Punto","Linea","Panda","Punto","Scudo","Stilo","Tipo","Ulysse"],
    "Ford":        ["B-Max","C-Max","EcoSport","Edge","Explorer","Fiesta","Focus","Galaxy","Ka","Kuga","Mondeo","Mustang","Puma","Ranger","S-Max","Transit","Tourneo"],
    "Honda":       ["Accord","City","Civic","CR-V","CR-Z","FR-V","HR-V","Jazz","Legend","Stream"],
    "Hyundai":     ["Accent","Atos","Bayon","Coupé","Elantra","Getz","i10","i20","i30","i40","i45","ix20","ix35","Kona","Santa Fe","Sonata","Tucson","Veloster"],
    "Jaguar":      ["E-Pace","F-Pace","S-Type","X-Type","XE","XF","XJ"],
    "Jeep":        ["Cherokee","Compass","Grand Cherokee","Renegade","Wrangler"],
    "Kia":         ["Carens","Ceed","EV6","Niro","Picanto","ProCeed","Rio","Sorento","Soul","Sportage","Stinger","Stonic","XCeed"],
    "Lada":        ["2107","2110","Granta","Kalina","Largus","Niva","Vesta","XRAY"],
    "Land Rover":  ["Discovery","Discovery Sport","Freelander","Range Rover","Range Rover Evoque","Range Rover Sport","Range Rover Velar"],
    "Lexus":       ["CT","ES","IS","NX","RX","UX"],
    "Maserati":    ["Ghibli","Grecale","Levante","Quattroporte"],
    "Mazda":       ["2","3","5","6","CX-3","CX-30","CX-5","CX-60","MX-5","MX-30"],
    "Mercedes":    ["A 160","A 180","A 200","B 180","B 200","C 180","C 200","C 220","C 250","E 200","E 220","E 250","E 300","S 350","S 500","GLA","GLB","GLC","GLE","GLK","ML","Sprinter","Vito","Viano","190","200","230","250","260","300"],
    "Mini":        ["Clubman","Cooper","Countryman","Paceman"],
    "Mitsubishi":  ["ASX","Colt","Eclipse","Eclipse Cross","Galant","L200","Lancer","Outlander","Pajero","Space Star"],
    "Nissan":      ["Juke","Leaf","Micra","Murano","Navara","Note","NV200","Pathfinder","Primera","Pulsar","Qashqai","Tiida","X-Trail","370Z"],
    "Opel":        ["Adam","Agila","Antara","Astra","Cascada","Corsa","Crossland","Grandland","Insignia","Kadett","Meriva","Mokka","Omega","Signum","Vectra","Vivaro","Zafira"],
    "Peugeot":     ["106","107","108","206","207","208","2008","301","306","307","308","3008","405","406","407","408","508","5008","Boxer","Expert","Partner","RCZ"],
    "Porsche":     ["Cayenne","Macan","Panamera","911"],
    "Renault":     ["Captur","Clio","Duster","Espace","Express","Fluence","Kadjar","Kangoo","Laguna","Latitude","Logan","Master","Megane","Modus","Sandero","Scenic","Symbol","Trafic","Twingo","Zoe","Arkana"],
    "Seat":        ["Altea","Arona","Ateca","Cordoba","Exeo","Ibiza","Leon","Tarraco","Toledo"],
    "Skoda":       ["Enyaq","Fabia","Kamiq","Karoq","Kodiaq","Octavia","Rapid","Roomster","Scala","Superb","Yeti"],
    "Smart":       ["EQ Forfour","EQ Fortwo","Forfour","Fortwo"],
    "Subaru":      ["Forester","Impreza","Legacy","Outback","XV"],
    "Suzuki":      ["Alto","Baleno","Grand Vitara","Ignis","Jimny","S-Cross","Splash","Swift","SX4","Vitara"],
    "Tesla":       ["Model 3","Model S","Model X","Model Y","Cybertruck"],
    "Toyota":      ["Auris","Avensis","Aygo","bZ4X","C-HR","Camry","Corolla","GR86","Hilux","Land Cruiser","Prius","Proace","RAV4","Yaris","Yaris Cross","Verso"],
    "Volkswagen":  ["Amarok","Arteon","Caddy","Crafter","Golf","ID.3","ID.4","ID.5","Jetta","Passat","Phaeton","Polo","Scirocco","Sharan","T-Cross","T-Roc","Tiguan","Tiguan Allspace","Touareg","Touran","Transporter","Up"],
    "Volvo":       ["C30","S40","S60","S80","S90","V40","V50","V60","V70","V90","XC40","XC60","XC70","XC90"]
  };

  function makes() {
    return Object.keys(DATA).sort();
  }

  function models(make) {
    return DATA[make] ? DATA[make].slice() : [];
  }

  window.Catalog = { makes: makes, models: models };
})();
