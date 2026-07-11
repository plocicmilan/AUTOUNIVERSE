/* ============================================================
   AUTO UNIVERSE — CORE / REMINDERS  (Nivo 0)
   Podsetnik se okida po datumu I/ILI kilometraži — šta pre stigne.
   Čiste funkcije: status računanja i sortiranje. Bez IO.
   ============================================================ */
(function (global) {
  "use strict";

  /* status jednog podsetnika u odnosu na "danas" i trenutnu km
     reminder: { due_date, due_mileage_km, done }
     todayISO: "YYYY-MM-DD"
     currentKm: number|null
     Vraća: { state: "done"|"due"|"soon"|"upcoming", reason: "date"|"mileage"|null, daysLeft, kmLeft } */

  function status(reminder, todayISO, currentKm) {
    if (reminder.done) return { state: "done", reason: null, daysLeft: null, kmLeft: null };

    var daysLeft = null, kmLeft = null;
    var dueByDate = false, soonByDate = false;
    var dueByKm = false, soonByKm = false;

    if (reminder.due_date) {
      daysLeft = daysBetween(todayISO, reminder.due_date);
      if (daysLeft <= 0) dueByDate = true;
      else if (daysLeft <= 14) soonByDate = true;
    }

    if (reminder.due_mileage_km != null && currentKm != null) {
      kmLeft = reminder.due_mileage_km - currentKm;
      if (kmLeft <= 0) dueByKm = true;
      else if (kmLeft <= 1000) soonByKm = true;
    }

    if (dueByDate || dueByKm) {
      return { state: "due", reason: dueByDate ? "date" : "mileage", daysLeft: daysLeft, kmLeft: kmLeft };
    }
    if (soonByDate || soonByKm) {
      return { state: "soon", reason: soonByDate ? "date" : "mileage", daysLeft: daysLeft, kmLeft: kmLeft };
    }
    return { state: "upcoming", reason: null, daysLeft: daysLeft, kmLeft: kmLeft };
  }

  function daysBetween(fromISO, toISO) {
    var a = new Date(fromISO + "T00:00:00");
    var b = new Date(toISO + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  /* sortiraj podsetnike po hitnosti: due → soon → upcoming → done,
     unutar iste grupe po najmanje preostalih dana                  */
  function sortByUrgency(reminders, todayISO, currentKmByVehicle) {
    var order = { due: 0, soon: 1, upcoming: 2, done: 3 };
    return reminders.slice().sort(function (a, b) {
      var ka = currentKmByVehicle ? currentKmByVehicle[a.vehicle_id] : null;
      var kb = currentKmByVehicle ? currentKmByVehicle[b.vehicle_id] : null;
      var sa = status(a, todayISO, ka), sb = status(b, todayISO, kb);
      if (order[sa.state] !== order[sb.state]) return order[sa.state] - order[sb.state];
      var da = sa.daysLeft == null ? 99999 : sa.daysLeft;
      var db = sb.daysLeft == null ? 99999 : sb.daysLeft;
      return da - db;
    });
  }

  // podsetnici koji "stižu" (due ili soon) — za HOME
  function incoming(reminders, todayISO, currentKmByVehicle) {
    return sortByUrgency(reminders, todayISO, currentKmByVehicle).filter(function (r) {
      var km = currentKmByVehicle ? currentKmByVehicle[r.vehicle_id] : null;
      var s = status(r, todayISO, km).state;
      return s === "due" || s === "soon";
    });
  }

  var Reminders = {
    status: status,
    daysBetween: daysBetween,
    sortByUrgency: sortByUrgency,
    incoming: incoming
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Reminders;
  global.Reminders = Reminders;
})(typeof window !== "undefined" ? window : globalThis);
