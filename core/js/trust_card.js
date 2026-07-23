/* Trust Card UI komponenta — reusable za Driver + Autopijaca.
   Todo #127. Renderuje Trust Score iz core/js/trust.js kao vizuelnu karticu.

   API:
     TrustCard.html(vehicle, events, documents, opts) -> string HTML
     TrustCard.style()                                -> string <style> (jednom po stranici)

   opts:
     compact:   boolean   // manji format za listu oglasa (bez breakdown-a)
     showTips:  boolean   // "Kako povecati score?" tekst
     onclick:   string    // JS koji se pokrece na klik (npr. otvori modal)
*/
(function () {
  "use strict";

  var HAS_TRUST = (typeof window !== "undefined" && window.Trust) ||
                  (typeof require !== "undefined" && (function () {
                    try { return require('./trust.js'); } catch (e) { return null; }
                  })());

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function html(vehicle, events, documents, opts) {
    opts = opts || {};
    var Trust = HAS_TRUST || window.Trust;
    if (!Trust) return '<!-- TrustCard: trust.js nije ucitan -->';

    var result = Trust.compute(vehicle, events || [], documents || []);
    var pct = result.score;   // 0-100 = width procent
    var b = result.breakdown;

    var levelIcons = { gold: "🏆", silver: "🥈", bronze: "🥉" };
    var icon = levelIcons[result.level] || "•";

    var breakdownHtml = opts.compact ? "" :
      '<div class="tc-breakdown">' +
        '<div class="tc-row"><span>Verifikovani servisi</span><b>' + b.verified_services + ' (' + b.verified_pts + '/40)</b></div>' +
        '<div class="tc-row"><span>Priloženi računi</span><b>' + b.invoices + ' (' + b.invoice_pts + '/24)</b></div>' +
        '<div class="tc-row"><span>Vlasnikovi zapisi</span><b>' + b.owner_records + ' (' + b.owner_pts + '/10)</b></div>' +
        '<div class="tc-row"><span>Fotografije</span><b>' + b.photos + ' (' + b.photo_pts + '/10)</b></div>' +
        '<div class="tc-row"><span>Kilometraža konzistentna</span><b>' + (b.km_consistent ? '✓' : '✗') + ' (' + b.km_pts + '/10)</b></div>' +
        (b.gaps_over_18mo > 0
          ? '<div class="tc-row tc-neg"><span>Praznine > 18 meseci</span><b>-' + b.gap_penalty + '</b></div>'
          : '') +
        (b.all_retroactive
          ? '<div class="tc-row tc-neg"><span>Sve retroaktivno (cap 15)</span><b>-</b></div>'
          : '') +
      '</div>';

    var tipsHtml = "";
    if (opts.showTips && result.score < 80) {
      var tips = [];
      if (b.verified_services < 5) tips.push('Zamoli mehaničara da potvrdi svaki servis kroz Garage Toolbox (+8 poena/zapisu, do 40).');
      if (b.invoices < 4) tips.push('Priloži skenirane račune kao dokumente (+6/računu, do 24).');
      if (!b.km_consistent) tips.push('Redovan unos kilometraže povećava konzistentnost (+10).');
      if (b.gaps_over_18mo > 0) tips.push('Popuni praznine u istoriji iz starih računa (Iskopaj fioku).');
      if (tips.length) {
        tipsHtml =
          '<div class="tc-tips"><b>Kako povećati Trust Score:</b><ul>' +
          tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
          '</ul></div>';
      }
    }

    var clickAttr = opts.onclick ? ' onclick="' + esc(opts.onclick) + '" style="cursor:pointer"' : '';
    var cls = 'tc tc-' + result.level + (opts.compact ? ' tc-compact' : '');

    return '' +
      '<div class="' + cls + '"' + clickAttr + '>' +
        '<div class="tc-header">' +
          '<div class="tc-label">' + icon + ' <b>' + esc(result.level_label) + '</b> Trust Score</div>' +
          '<div class="tc-score">' + result.score + '<span class="tc-max">/100</span></div>' +
        '</div>' +
        '<div class="tc-bar"><div class="tc-fill" style="width:' + pct + '%"></div></div>' +
        breakdownHtml +
        tipsHtml +
      '</div>';
  }

  // CSS — poziva se JEDNOM po stranici (npr. u onload)
  function style() {
    return '' +
      '<style>' +
      '.tc{border-radius:12px;padding:16px;margin:12px 0;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
      '.tc-gold{background:linear-gradient(135deg,#1D9E75 0%,#158060 100%);color:#fff}' +
      '.tc-silver{background:linear-gradient(135deg,#EF9F27 0%,#c07d15 100%);color:#fff}' +
      '.tc-bronze{background:linear-gradient(135deg,#B4B2A9 0%,#8a8880 100%);color:#fff}' +
      '.tc-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}' +
      '.tc-label{font-size:14px;letter-spacing:.3px;opacity:.95}' +
      '.tc-score{font-size:28px;font-weight:700;line-height:1}' +
      '.tc-max{font-size:14px;font-weight:400;opacity:.7;margin-left:2px}' +
      '.tc-bar{height:6px;background:rgba(255,255,255,.25);border-radius:3px;overflow:hidden;margin-bottom:14px}' +
      '.tc-fill{height:100%;background:rgba(255,255,255,.85);transition:width .5s ease}' +
      '.tc-breakdown{background:rgba(255,255,255,.12);border-radius:8px;padding:10px 12px;margin-top:8px}' +
      '.tc-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,.1)}' +
      '.tc-row:last-child{border-bottom:none}' +
      '.tc-row.tc-neg{color:rgba(255,255,255,.85)}' +
      '.tc-tips{margin-top:10px;padding:10px 12px;background:rgba(0,0,0,.15);border-radius:8px;font-size:13px;line-height:1.5}' +
      '.tc-tips b{display:block;margin-bottom:6px}' +
      '.tc-tips ul{margin:0;padding-left:18px}' +
      '.tc-tips li{margin:3px 0}' +
      '.tc-compact{padding:10px 14px;margin:6px 0}' +
      '.tc-compact .tc-score{font-size:22px}' +
      '.tc-compact .tc-breakdown{display:none}' +
      '</style>';
  }

  var api = { html: html, style: style };
  if (typeof window !== "undefined") window.TrustCard = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
