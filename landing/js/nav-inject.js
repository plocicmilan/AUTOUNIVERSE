// AutoUniverse — shared nav + footer injection
// Add data-page="<key>" to <body> to highlight active nav link.
// Keys: home | ekosistem | driver | garage | vozila | autopijaca | autodelovi | kalkulatori | blog | o-nama | kontakt
(function () {
  const c = typeof AU_CONFIG !== 'undefined' ? AU_CONFIG : {};
  const VOZILA     = c.vozila     || 'https://vozila.autouniverse.rs';
  const AUTOPIJACA = c.autopijaca || 'https://autopijaca.autouniverse.rs';
  const AUTODELOVI = c.autodelovi || 'https://autodelovi.autouniverse.rs';

  const NAV_LINKS = [
    { key: 'ekosistem',  href: '/ekosistem',  label: 'Ekosistem' },
    { key: 'driver',     href: '/driver',     label: 'Driver' },
    { key: 'garage',     href: '/garage',     label: 'Garage' },
    { key: 'vozila',     href: VOZILA,        label: 'Vozila' },
    { key: 'autopijaca', href: AUTOPIJACA,    label: 'Autopijaca' },
    { key: 'autodelovi', href: AUTODELOVI,    label: 'Autodelovi' },
    { key: 'kalkulatori',href: '/kalkulatori',label: 'Kalkulatori' },
    { key: 'blog',       href: '/blog',       label: 'Blog' },
    { key: 'o-nama',     href: '/o-nama',     label: 'O nama' },
    { key: 'kontakt',    href: '/kontakt',    label: 'Kontakt' },
  ];

  const activePage = document.body.dataset.page || '';

  // ── Header ──────────────────────────────────────────────────────────────
  const navLinks = NAV_LINKS.map(({ key, href, label }) => {
    const active = key === activePage ? ' nav__link--active' : '';
    return `<a href="${href}" class="nav__link${active}">${label}</a>`;
  }).join('\n        ');

  const HEADER_HTML = `<div class="container header__inner">
      <a href="/" class="logo">
        <span class="logo__au">AU</span>
        <span class="logo__text">AutoUniverse</span>
      </a>
      <nav class="nav" id="nav">
        ${navLinks}
      </nav>
      <button class="hamburger" id="hamburger" aria-label="Meni">
        <span></span><span></span><span></span>
      </button>
    </div>`;

  const headerEl = document.getElementById('header');
  if (headerEl) headerEl.innerHTML = HEADER_HTML;

  // ── Footer ──────────────────────────────────────────────────────────────
  const FOOTER_HTML = `<div class="container footer__inner">
      <div class="footer__brand">
        <a href="/" class="logo">
          <span class="logo__au">AU</span>
          <span class="logo__text">AutoUniverse</span>
        </a>
        <p class="footer__tagline">Ekosistem za va&#353;e vozilo.<br>Napravljeno u Srbiji.</p>
      </div>
      <div class="footer__links">
        <div class="footer__col">
          <h4>Aplikacije</h4>
          <a href="/driver">Driver Toolbox</a>
          <a href="/garage">Garage Toolbox</a>
          <a href="/ekosistem">Ekosistem</a>
          <a href="${VOZILA}">Baza vozila</a>
        </div>
        <div class="footer__col">
          <h4>Resursi</h4>
          <a href="/kalkulatori">Svi kalkulatori</a>
          <a href="/kalkulatori/registracije">Kalkulator registracije</a>
          <a href="/kalkulatori/uvoza">Kalkulator uvoza</a>
          <a href="/blog">Blog</a>
          <a href="/kontakt">Kontakt</a>
        </div>
        <div class="footer__col">
          <h4>Kompanija</h4>
          <a href="/o-nama">O nama</a>
          <a href="/privatnost">Politika privatnosti</a>
          <a href="/uslovi">Uslovi kori&#353;&#263;enja</a>
        </div>
      </div>
    </div>
    <div class="footer__bottom">
      <div class="container">
        <span>&copy; 2026 AutoUniverse &middot; Rasinski okrug, Srbija</span>
        <span>Napravljeno sa &hearts; bez VC novca</span>
      </div>
    </div>`;

  const footerEl = document.querySelector('footer.footer');
  if (footerEl) footerEl.innerHTML = FOOTER_HTML;

  // Re-wire hamburger (main.js runs before this, so re-attach listener)
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('.nav__link').forEach(l => l.addEventListener('click', () => nav.classList.remove('open')));
  }
})();
