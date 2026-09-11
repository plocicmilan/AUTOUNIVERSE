#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator za 50 blog postova — AutoUniverse"""
import os, sys, textwrap
sys.stdout.reconfigure(encoding='utf-8')

OUT = r"D:\BELORA\autouniverse\landing\blog"

CSS = """\
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;scroll-behavior:smooth}
body{font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#F8F7F3;color:#1C1F24;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:#ff6b35;text-decoration:none}a:hover{text-decoration:underline}
:root{--ac:#ff6b35;--dark:#0f1d35;--mid:#4A4E58;--muted:#6B7280;--line:#E5E7EB;--radius:12px}
.nav{background:#fff;border-bottom:1px solid var(--line);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.nav-logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:.95rem;color:var(--dark);letter-spacing:-.02em;text-decoration:none}
.nav-logo .dot{width:8px;height:8px;background:var(--ac);border-radius:50%;flex-shrink:0}
.nav-back{font-size:.85rem;color:var(--muted);text-decoration:none}.nav-back:hover{color:var(--ac)}
.article-wrap{max-width:720px;margin:0 auto;padding:48px 20px 80px}
.article-meta{display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.tag{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ac);background:rgba(255,107,53,.08);padding:.2rem .7rem;border-radius:20px}
.meta-text{font-size:.82rem;color:var(--muted)}
h1{font-size:clamp(1.8rem,4vw,2.5rem);font-weight:800;line-height:1.2;letter-spacing:-.02em;color:var(--dark);margin-bottom:16px}
.lead{font-size:1.1rem;color:var(--mid);line-height:1.7;margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid var(--line)}
h2{font-size:1.3rem;font-weight:700;color:var(--dark);margin:36px 0 14px}
h3{font-size:1.05rem;font-weight:700;color:var(--dark);margin:24px 0 10px}
p{color:var(--mid);margin-bottom:14px}
ul,ol{padding-left:1.5rem;color:var(--mid);margin-bottom:16px}li{margin-bottom:8px}
strong{color:var(--dark)}
.callout{background:#fff;border:1px solid var(--line);border-left:3px solid var(--ac);border-radius:0 var(--radius) var(--radius) 0;padding:16px 20px;margin:20px 0;font-size:.92rem;color:var(--mid)}
.callout strong{display:block;margin-bottom:4px;color:var(--dark)}
.callout.danger{border-left-color:#ef4444}
.checklist{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:20px 24px;margin:20px 0}
.checklist h3{font-size:.9rem;font-weight:700;color:var(--dark);margin:0 0 12px;text-transform:uppercase;letter-spacing:.05em}
.checklist ul{padding-left:0;list-style:none}
.checklist li{padding:6px 0 6px 28px;border-bottom:1px solid var(--line);position:relative;font-size:.9rem}
.checklist li:last-child{border-bottom:none}
.checklist li::before{content:"\\2610";position:absolute;left:0;color:var(--ac);font-size:1rem}
.cta-box{background:var(--dark);color:#fff;border-radius:var(--radius);padding:28px;text-align:center;margin:36px 0}
.cta-box p{color:#9ca3af;font-size:.95rem;margin-bottom:16px}
.cta-btn{display:inline-block;background:var(--ac);color:#fff;font-weight:700;font-size:.95rem;padding:12px 28px;border-radius:8px;text-decoration:none}
.cta-btn:hover{background:#e85520;text-decoration:none}
.related{margin-top:48px;padding-top:32px;border-top:1px solid var(--line)}
.related h3{font-size:1rem;color:var(--muted);margin-bottom:16px;font-weight:600}
.related-links{display:flex;gap:12px;flex-wrap:wrap}
.related-link{background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px 16px;font-size:.88rem;color:var(--dark);font-weight:500;transition:border-color .15s}
.related-link:hover{border-color:var(--ac);text-decoration:none;color:var(--ac)}
footer{text-align:center;padding:24px 20px;font-size:.8rem;color:var(--muted);border-top:1px solid var(--line);margin-top:40px}
footer a{color:var(--ac)}"""


def render(slug, title, desc, tag, date_sr, mins, lead, sections,
           callout=None, callout_danger=False, checks=None, checks_title="Checklist pri kupovini",
           cta=None, cta_url=None, cta_sub=None, related=None):
    sec_html = ""
    for s in sections:
        sec_html += f"\n  <h2>{s['h2']}</h2>\n"
        for p in s.get('paras', []):
            sec_html += f"  <p>{p}</p>\n"
        if s.get('ul'):
            sec_html += "  <ul>\n"
            for li in s['ul']:
                sec_html += f"    <li>{li}</li>\n"
            sec_html += "  </ul>\n"

    callout_html = ""
    if callout:
        cls = "callout danger" if callout_danger else "callout"
        callout_html = f'  <div class="{cls}"><strong>{callout["title"]}</strong> {callout["text"]}</div>\n'

    checks_html = ""
    if checks:
        items = "".join(f"    <li>{c}</li>\n" for c in checks)
        checks_html = f'  <div class="checklist"><h3>{checks_title}</h3><ul>\n{items}  </ul></div>\n'

    cta_html = ""
    if cta and cta_url:
        sub = cta_sub or "AutoUniverse ekosistem"
        cta_html = f'''  <div class="cta-box">
    <p>{sub}</p>
    <a href="{cta_url}" class="cta-btn">{cta}</a>
  </div>\n'''

    rel_html = ""
    if related:
        links = "".join(f'      <a href="{r["url"]}" class="related-link">{r["title"]}</a>\n' for r in related)
        rel_html = f'''  <div class="related">
    <h3>Povezani vodiči</h3>
    <div class="related-links">
{links}    </div>
  </div>\n'''

    return f"""<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | AutoUniverse</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://autouniverse.rs/blog/{slug}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://autouniverse.rs/blog/{slug}">
<meta property="og:image" content="https://autouniverse.rs/assets/og-image.png">
<meta property="og:locale" content="sr_RS">
<meta property="article:published_time" content="2026-09-10">
<style>
{CSS}
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="nav-logo"><span class="dot"></span>AutoUniverse</a>
  <a href="/blog" class="nav-back">&#8592; Blog</a>
</nav>
<div class="article-wrap">
  <div class="article-meta">
    <span class="tag">{tag}</span>
    <span class="meta-text">{date_sr}</span>
    <span class="meta-text">&#183; {mins} min &#269;itanja</span>
  </div>
  <h1>{title}</h1>
  <p class="lead">{lead}</p>
{sec_html}{callout_html}{checks_html}{cta_html}{rel_html}</div>
<footer>
  &copy; 2026 AutoUniverse &mdash; <a href="/privatnost">Politika privatnosti</a> &middot; <a href="/uslovi">Uslovi</a>
</footer>
</body>
</html>"""


# ─── POSTS DATA ──────────────────────────────────────────────────────────────

POSTS = [

# ═══════════════════════════════════════════════════════════════════════════════
# TIER 1 — MODEL ISTORIJATI (1–20)
# ═══════════════════════════════════════════════════════════════════════════════

{
 'slug': 'volkswagen-golf-6-2008-2013-istorijat',
 'title': 'VW Golf 6 (2008–2013) — istorijat, motori i kvarovi',
 'desc': 'Kompletan vodič za VW Golf 6: motori, poznati kvarovi, šta gledati pri kupovini i prosečne cene u Srbiji.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 8,
 'lead': 'Volkswagen Golf 6 je najprodavaniji polovni auto u Srbiji. Prodavan od 2008. do 2013, nasledio je Golf 5 uz poboljšanu karoseriju, bogatiju opremu i iste motore. Ako razmišljate o kupovini, evo svega što treba da znate.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Golf 6 je šesta generacija legendarnog kompaktnog automobila koji se proizvodi u Wolfsburgu od 1974. Tehnički, Golf 6 deli platformu PQ35 sa Golf 5 — razlike su pre svega u karoseriji, enterijeru i elektronici. Debijant je bio na Pariškom salonu automobila u oktobru 2008.',
    'U Srbiji se najviše traži <strong>hečbek sa 5 vrata</strong>. Variant (karavan) čini oko 10% tržišta, dok je troratanica retka. Najčešći motori su 1.6 TDI i 1.4 TSI, a od benzinaša i stari 1.6 MPI.',
   ]},
  {'h2': 'Motori i potrošnja',
   'paras': [
    '<strong>Benzinci:</strong> 1.2 TSI (86 ks, od 2010), 1.4 TSI (122/160 ks), 1.6 MPI (102 ks — stara formula, pouzdana), 2.0 TSI GTI (210 ks). Potrošnja 1.4 TSI: 7–8 l/100 km mešovito.',
    '<strong>Dizeli:</strong> 1.6 TDI (90/105 ks) i 2.0 TDI (110/140 ks). 1.6 TDI je ubjedljivo najpopularniji na srpskom tržištu: 4.5–5.5 l/100 km u mješovitoj vožnji, servis je jeftiniji od 2.0 TDI. Bitno: 1.6 TDI ima DPF filter od 2009 — treba redovno čistiti.',
   ]},
  {'h2': 'Pouzdanost i poznati kvarovi',
   'paras': [
    '<strong>DSG 7-stepeni menjač (DQ200)</strong> — najčešći problem Golf 6. Mehatronička jedinica zna da otkaže, simptomi su treskanje pri ubrzavanju i zatezanje u prvoj brzini. Popravka 500–1200 EUR. Ako kupujete DSG, insistirajte na provjeri menjačnog ulja.',
    '<strong>1.4 TSI motor:</strong> CONA/CAVB varijante imaju problem sa pucanjem klipnih prstenova na visokim kilometražama. <strong>Turbina:</strong> na 1.6 TDI i 1.4 TSI turbina popusti oko 150–200k km. <strong>Rđa</strong> na pragovima i donjim ivicama vrata nije rijetka na primjercima iz hladnih regija.',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Prioritet pri pregledu: provjera DSG (ako je u pitanju automatik), tragovi rđe na pragovima i ispod vrata, historija servisnih knjiga. Insistirajte na OBD pregledu — elektronske greške se lako skrivaju. Cijena dobrog primjerka 1.6 TDI/DSG kreće se od 9.000 do 13.500 EUR (2026).',
   ]},
 ],
 'callout': {'title': 'Pažnja na DSG:', 'text': 'Ako auto ima 7-stepeni DSG (DQ200), zatražite servisnu historiju menjača. Mehatronika može koštati više od 1.000 EUR zamjene.'},
 'callout_danger': False,
 'checks': [
  'Provjeri VIN — da li auto ima euro ncap saobraćajne nesreće',
  'OBD skener — motor, menjač, ABS/ESP greške',
  'DSG mehatronika — probna vožnja u hladnom startu',
  'Rđa na pragovima, ispod vrata, u motornom prostoru',
  'Turbina — dim iz auspuha pri gašenju',
  'Servisna knjiga — redovne promjene ulja (maks 15.000 km)',
  'Stanje DPF filtera (1.6 TDI) — regen historija',
  'Gume i amortizeri — vizuelni pregled i test kočenja',
 ],
 'cta': 'Pretraži Golf 6 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi provjereni primjerak na AutoUniverse Autopijaci',
 'related': [
  {'title': 'VW Golf 7 istorijat', 'url': '/blog/volkswagen-golf-7-2012-2020-istorijat'},
  {'title': 'DSG menjač — prednosti i mane', 'url': '/blog/dsg-menjac-prednosti-mane'},
  {'title': 'DPF filter — održavanje', 'url': '/blog/dpf-filter-odrzavanje'},
  {'title': 'Kako prepoznati točen km', 'url': '/blog/kako-prepoznati-tocen-km'},
 ],
},

{
 'slug': 'volkswagen-golf-7-2012-2020-istorijat',
 'title': 'VW Golf 7 (2012–2020) — istorijat, motori i kvarovi',
 'desc': 'VW Golf 7 — sve o motorima, poznatim kvarovima i šta gledati pri kupovini u Srbiji. Kompletni vodič.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 8,
 'lead': 'Golf 7 je predstavio potpuno novu MQB platformu i postao mjerilo klase za čitavo desetljeće. Lakši od prethodnika, ekonomičniji i kvalitetniji u enterijeru — ali i sa novim tehničkim izazovima koje treba poznavati.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Sedma generacija Golf-a debitovala je u novembru 2012. na Stuttgart Motor Showu. Ključna promjena: platforma MQB (Modularer Querbaukasten) zamijenila je stari PQ35. Rezultat je 100 kg manja masa, kraći prepust i više mjesta u kabini.',
    'Golf 7 facelift (Mk7.5) stigao je 2017. sa ažuriranom prednjom maskom, novim MIB2 infotainment sistemom i blago izmenjenim motorima. U Srbiji su najpopularniji <strong>1.6 TDI i 1.0/1.4 TSI</strong>.',
   ]},
  {'h2': 'Motori i potrošnja',
   'paras': [
    '<strong>Benzinci:</strong> 1.0 TSI (85/115 ks) — trocilindraš sa izuzetnom ekonomičnošću (5.5–6.5 l/100 km). 1.4 TSI (125 ks, ACT deaktivacija cilindra na Mk7). 1.5 TSI (na Mk7.5, 130/150 ks) — evo motora koji kombinuje snagu i potrošnju.',
    '<strong>Dizeli:</strong> 1.6 TDI (90/105/115 ks) i 2.0 TDI (110/150/184 ks). 1.6 TDI troši 4–5 l/100 km — i dalje najpopularnija opcija za srpsko tržište. Golf 7 TDI je primio novi EA288 motor koji je pouzdaniji od starog EA189.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>1.4 TSI ACT</strong> (deaktivacija cilindra): kod nekih primjeraka u prvim godinama je bilo problema sa sistemom deaktivacije — treskanje pri prelasku. Uglavnom riješeno softverskim updateom.',
    '<strong>DSG 7 (DQ200)</strong> i dalje prisutan na manjim motorima — isti izazovi kao na Golf 6. DSG 6 (DQ250) na jačim motorima je pouzdaniji. <strong>Vodena pumpa</strong> na 1.4 TSI zna zakazati oko 100k km. <strong>AdBlue sistem</strong> na TDI od 2015 — treba redovno dolivati (oko 1.5 l/1000 km).',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Golf 7 na srpskom tržištu 2026. ima dobar odnos cijene i kvaliteta. Primjerci iz 2013–2016. sa 1.6 TDI DSG dostupni su od 12.000 EUR naviše. Obavezno: provjera AdBlue sistema (TDI), OBD sken, historija ulja. Klonirajte se od primjeraka s nepoznatom servisnom historijom.',
   ]},
 ],
 'callout': {'title': 'AdBlue na TDI od 2015:', 'text': 'Golf 7 TDI (EA288) ima AdBlue sistem. Provjeri ima li upozorenja na instrumentnoj tabli — neispravan NOx senzor je čest i košta 300–600 EUR.'},
 'checks': [
  'OBD sken — DPF status, AdBlue sistem (TDI)',
  'DSG DQ200 — hladni start, treskanje u prvoj',
  'Servisna knjiga — intervali ulja, DSG servis',
  'Vizuelni pregled karoserije — Golf 7 ima tanje limove',
  'Funkcionisanje ACT sistema (1.4 TSI) — osluškuj cilindre',
  'Vodena pumpa — tragovi curenja ispod poklopca motora',
  'Provjera VIN registracije — uvozni primjerci',
  'Karoserija — rđa ispod pragova i na pragu gepeka',
 ],
 'cta': 'Pretraži Golf 7 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Golf 7 na AutoUniverse Autopijaci',
 'related': [
  {'title': 'VW Golf 6 istorijat', 'url': '/blog/volkswagen-golf-6-2008-2013-istorijat'},
  {'title': 'VW Passat B7 istorijat', 'url': '/blog/volkswagen-passat-b7-2010-2014-istorijat'},
  {'title': 'DSG menjač — prednosti i mane', 'url': '/blog/dsg-menjac-prednosti-mane'},
 ],
},

{
 'slug': 'volkswagen-passat-b7-2010-2014-istorijat',
 'title': 'VW Passat B7 (2010–2014) — istorijat, motori i kvarovi',
 'desc': 'VW Passat B7 — kompletan vodič: motori 1.6 TDI i 2.0 TDI, kvarovi DSG, šta gledati pri kupovini.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 7,
 'lead': 'Passat B7 je bio najprodavaniji automobil u D-segmentu u Srbiji tokom 2010-ih. Facelift B6 generacije donosi isti pouzdani paket uz modernizirani izgled. Za porodice koje trebaju prostran sedan ili karavan po razumnoj cijeni — i dalje je teško naći bolju ponudu.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Passat B7 nije nova generacija već duboki facelift B6. Platforma PQ46 ostala je ista, ali prednji dio, instrumentna tabla i lista opreme su potpuno osvježeni. Prodavan od 2010. do 2014. kada je zamijenjen Passatom B8 na MQB platformi.',
    'U Srbiji dominira <strong>karavan (Variant)</strong> koji čini oko 60% svih Passata B7 na tržištu — cijenjen zbog ogromnog prtljažnika od 603 litre i praktičnosti za porodice i biznismene.',
   ]},
  {'h2': 'Motori i potrošnja',
   'paras': [
    'Najčešći motori: <strong>1.6 TDI</strong> (105 ks) — ekonomičan, potrošnja 5–6 l/100 km. <strong>2.0 TDI</strong> (140/170 ks) — snažniji, ali i skuplji servis. Benzinac <strong>1.4 TSI</strong> (122/160 ks) — dobar izbor ako auto pretežno ide po gradu.',
    'DSG 6 (DQ250) na 2.0 TDI je znatno pouzdaniji od DSG 7 (DQ200) koji se nalazio na 1.6 TDI. Manuelni mjenjač 6M je uvijek sigurna opcija.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>EGR ventil</strong> na TDI motorima začepljuje se oko 150–200k km — čišćenje ili zamjena. <strong>Zamajac sa dvostrukom masom (DMF)</strong> na 2.0 TDI zna zakazati pri visokim kilometražama — pregled obavezan. <strong>Kontrolna tabla</strong>: neki primjerci imaju problem sa display-om koji tamni.',
    '<strong>DSG DQ200</strong> na 1.6 TDI — isti problemi kao na Golfu. <strong>Turbina</strong> na oba TDI motora — provjeri pritisak punjenja. Suspenzija je generalno pouzdana, ali prednji stabilizator i ram oslanjanja vole servise na visokim kilometražama.',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Passat B7 sa 1.6 TDI i manuelom, do 200k km, sa urednom servisnom knjigom — idealan porodični auto. Cijene: sedan od 8.500 EUR, Variant od 9.500 EUR naviše (2026). Obavezno: OBD sken, DMF provjera (zvuk iz menjača pri ubrzavanju), EGR status.',
   ]},
 ],
 'callout': {'title': 'DMF zamajac:', 'text': 'Na 2.0 TDI obavezno provjerite zamajac sa dvostrukom masom. Čuje se kao sitan šum iz menjača pri ubrzavanju. Zamjena 600–1000 EUR.'},
 'checks': [
  'OBD sken — EGR, DPF, menjač greške',
  'DMF zamajac — šum pri ubrzavanju iz mjesta',
  'DSG DQ200 na 1.6 TDI — hladni start test',
  'Servisna knjiga — naročito intervali ulja i servis menjača',
  'Gepek Variant — vodootpornost, stanje spoja trapa i podnice',
  'Klima kompressor — funkcionisanje',
  'Prednji lonci/silentblokovi — test na neravnim podlogama',
  'VIN provjera — uvoz, nesreće',
 ],
 'cta': 'Pretraži Passat B7 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Passat B7 na AutoUniverse Autopijaci',
 'related': [
  {'title': 'VW Golf 6 istorijat', 'url': '/blog/volkswagen-golf-6-2008-2013-istorijat'},
  {'title': 'EGR ventil — simptomi', 'url': '/blog/egr-ventil-problemi'},
  {'title': 'DSG menjač — prednosti i mane', 'url': '/blog/dsg-menjac-prednosti-mane'},
 ],
},

{
 'slug': 'volkswagen-polo-5-2009-2017-istorijat',
 'title': 'VW Polo 5 (2009–2017) — istorijat, motori i kvarovi',
 'desc': 'VW Polo 5 — pregled motora, kvarova i savjeta za kupovinu. Idealan gradski auto za Srbiju.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 6,
 'lead': 'Polo 5 je gradski auto koji je sazreo u veliku klasu — tih, prostran za segment i sa izuzetnom opcijom 1.2 TDI koji troši manje od 4 litre. Ako tražite ekonomičnog gradskog pratioca sa VW kvalitetom, ovo je kandidat.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Peta generacija Polo-a debijovala je na Ženevskom salonu 2009. Na platformi PQ25, Polo 5 je znatno porastao u svim dimenzijama u odnosu na prethodnika. Dobio je 5 zvezdica Euro NCAP — rijedak rezultat za supermini.',
    'Facelift je stigao 2014. sa novim motorima (1.0 TSI trocilindraš zamijenio stari 1.4) i ažuriranom opremom. Na srpskom tržištu dominiraju <strong>1.2 TDI i 1.4 TDI</strong> dizelske verzije.',
   ]},
  {'h2': 'Motori i potrošnja',
   'paras': [
    '<strong>1.2 TDI</strong> (75 ks) — legendarno ekonomičan, 3.5–4.5 l/100 km. Idealan za grad i kratke iznajmljivače. Jedini minus: slabiji na autoputu pri punom opterećenju. <strong>1.4 TDI</strong> (80 ks) — bolja opcija za mješovitu vožnju.',
    '<strong>Benzinci:</strong> 1.2 MPI (60 ks, slab ali besproblemann), 1.4 MPI (85 ks), 1.2 TSI (90/105 ks, od facelift). <strong>GTI</strong> verzija sa 1.4 TSI 180 ks — collector\'s item u Srbiji.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>1.2 TDI — kvačilo</strong>: rani primjerci imali probleme sa kompaktnim kvačilom koje je zna zatajiti oko 80–100k km. <strong>Električna kočna ručica</strong> (na opremljenim varijantama): elektronika zna zakazati. <strong>Filteri klime</strong> se često zaboravljaju, rezultira lošim mirisom.',
    'Generalno Polo 5 je <strong>jedan od pouzdanijih VW-ova</strong> u ovoj veličini. Karoserija je otpornija na rđu od Golf 6. Kupujete li za grad i kratke puteve — teško da će razočarati.',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Polo 5 sa 1.2 TDI ili 1.4 TDI, do 150k km i urednom servisnom knjigom dostupan je od 6.500 EUR naviše. Na probi obavezno provjerite kvačilo (meki hod, bez škripanja), funkcionisanje start/stop sistema i stanje felgi (česti ogrebanci).',
   ]},
 ],
 'checks': [
  'Kvačilo — hod, ne smije biti suviše kratko ni škripatljivo',
  'OBD — greške motora, DPF (TDI)',
  'Start/stop sistem — funkcioniše li uredno',
  'Električna kočna ručica (ako postoji)',
  'Karoserija — provjeri napukline u boji oko vrata',
  'Servisna knjiga — redovnost intervalnih servisa',
 ],
 'cta': 'Pretraži Polo 5 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Polo 5 na AutoUniverse Autopijaci',
 'related': [
  {'title': 'VW Golf 6 istorijat', 'url': '/blog/volkswagen-golf-6-2008-2013-istorijat'},
  {'title': 'Škoda Fabia 2 istorijat', 'url': '/blog/skoda-fabia-2-2007-2014-istorijat'},
  {'title': 'Kako čitati oznake na gumama', 'url': '/blog/kako-citati-oznake-na-gumama'},
 ],
},

{
 'slug': 'volkswagen-tiguan-1-2007-2016-istorijat',
 'title': 'VW Tiguan 1 (2007–2016) — istorijat, motori i kvarovi',
 'desc': 'VW Tiguan prve generacije — motori, kvarovi, 4Motion sistem i savjeti za kupovinu u Srbiji.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 7,
 'lead': 'Tiguan prve generacije uveo je Volkswagen u kompaktni SUV segment i odmah postao bestseler. Sa opcionalnim 4Motion pogonom i solidnom terenom sposobnošću — i danas drži vrijednost bolje od mnogih konkurenata.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Tiguan 1 debitovao je u Frankfurt 2007. na PQ46 platformi (ista kao Passat B6). Facelift stigao 2011. sa novim prednjim dijelom i ažuriranim motorima. Dugogodišnja produkcija (2007–2016) znači da na tržištu ima veliki raspon starosti i stanja.',
    'Karoserija je samo SUV — nema kupéa ili karavana. 4Motion pogon dostupan na 2.0 TDI i jačim benzincima — vrijedan dodatak za Srbiju zbog loših cesta.',
   ]},
  {'h2': 'Motori',
   'paras': [
    '<strong>Dizeli:</strong> 2.0 TDI (110/140/170 ks) — udaleko najpopularniji u Srbiji. Potrošnja oko 6–7 l/100 km mješovito. <strong>Benzinci:</strong> 1.4 TSI (122/150 ks), 2.0 TSI (200 ks — GTI motor). 1.4 TSI ima podizače ventila koji se isteže, posebno kod hladnih startova.',
    'Na Tiguan I s 4Motion treba računati i na servis zadnjeg diferencijala i Haldex kvačila — jednom godišnje ili na 30k km. Ignorisanje ulja u Haldexu je skup propust.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>Haldex 4Motion</strong>: najčešći problem — Haldex pumpa zakaže ako se ulje ne mijenja. Simptomi: trzanje pri ulasku u zavoj. Zamjena pumpe 400–700 EUR. <strong>DSG mehatronika</strong> (DQ200 na 1.4 TSI): isti problemi kao kod Golf 6.',
    '<strong>DPF filter</strong> na 2.0 TDI: ako auto ide samo po gradu, regeneracija je nepotpuna i filter se začepljuje. <strong>Karoserija</strong>: Tiguan 1 ima tendenciju da hrđa na pregibima oko vrata i prednjeg gepeka — vizuelni pregled obavezan.',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Tiguan 1 sa 2.0 TDI 4Motion iz 2011–2013. je najpopularniji izbor. Cijene počinju od 10.500 EUR za uredne primjerke. Obavezno: provjera Haldex sistema (proba na mokrom parkingu — pusti auto da se malo lati), OBD sken, vizuelni pregled karoserije za rđu.',
   ]},
 ],
 'callout': {'title': 'Haldex servis:', 'text': 'Ulje u Haldex kvačilu se mijenja na 30.000 km ili svake godine. Provjeri je li urađeno — zapostavljeni Haldex sistem je skupo oštećenje.'},
 'checks': [
  'Haldex 4Motion — provjera ulja i pumpe',
  'DPF status na TDI — OBD sken',
  'Rđa — prednji gepek, pragovi, okviri vrata',
  'DSG DQ200 na 1.4 TSI — hladni start',
  'Servisna knjiga — Haldex, DSG, DPF historija',
  'Podvozje — provjera amortizera i lonaca',
  'Funkcionisanje 4WD — probaj na neravnom terenu',
 ],
 'cta': 'Pretraži Tiguan oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Tiguan na AutoUniverse Autopijaci',
 'related': [
  {'title': 'VW Passat B7 istorijat', 'url': '/blog/volkswagen-passat-b7-2010-2014-istorijat'},
  {'title': 'DPF filter — održavanje', 'url': '/blog/dpf-filter-odrzavanje'},
 ],
},

{
 'slug': 'skoda-octavia-2-2004-2013-istorijat',
 'title': 'Škoda Octavia 2 (2004–2013) — istorijat, motori i kvarovi',
 'desc': 'Škoda Octavia 2 — sve o motorima, kvarovima i kupovini. Najpraktičniji auto za srpsko tržište.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 8,
 'lead': 'Škoda Octavia 2 je možda najracionalniji izbor na srpskom tržištu polovnih automobila — VW mehanika, prostor kao E-klasa, cijena Golfa. Bogata je i verzijama: ima liftbek i karavan, TDI i TSI, manuelni i DSG.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Octavia 2 debitovala je 2004. na platformi A5 (PQ35) — ista kao Golf 5/6. To znači direktnu zamjenu dijelova sa Golfom što čini servis jeftinijim. Facelift 2008. donio je novi prednji dio i LED dnevna svjetla na višim opremama.',
    'Dostupna kao <strong>liftbek</strong> (562 l gepek) i <strong>Combi karavan</strong> (580 l gepek) — oba rekorderi klase. Scout varijanta sa povišenim klirensom popularna je u ruralnim sredinama.',
   ]},
  {'h2': 'Motori i potrošnja',
   'paras': [
    '<strong>Benzinci:</strong> 1.4 MPI (75/80 ks) — jednostavan i pouzdan, ali slab za autoput. 1.6 MPI (102 ks) — zlatni standard pouzdanosti. 1.4 TSI (122 ks) i 1.8 TSI (160 ks). <strong>Dizeli:</strong> 1.9 TDI (105 ks) — legendarni motor, gotovo neuništiv uz redovno održavanje. 2.0 TDI (140/170 ks) — snažniji, ali skuplji servis.',
    '1.9 TDI PDI troši 5–6 l/100 km i može preći 400k km bez generalnog remonta uz redovnu promjenu ulja. <strong>Zlatna kombinacija za Srbiju: 1.9 TDI manuelni, facelift 2008–2013.</strong>',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>1.9 TDI</strong>: EGR ventil (čišćenje na 150–200k km), ubrizgivači (na 200k+ km), zamajac dvostruke mase (2.0 TDI). Benzinci su generalno pouzdaniji ali skuplje gorivo.',
    '<strong>DSG 6 i 7</strong>: isti izazovi kao kod VW Golfa. <strong>Ventilatora motora</strong> kvari se na starijim primjercima. <strong>Električni prozori</strong> i električne brave — čest problem na starijim Octavijama 2.',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Octavia 2 Combi sa 1.9 TDI i manuelom, facelift, do 200k km — dostupna od 7.000 EUR. Odlična kupovina za porodicu. Pažnja: provjeri servisnu historiju, EGR status, i vizuelno pogledaj podvozje za rđu (naročito kod primjeraka sa sjevera Evrope).',
   ]},
 ],
 'checks': [
  '1.9 TDI — OBD sken, EGR greška, ubrizgivači',
  'DSG servisna historija (ako je automatik)',
  'Rđa na podvozju — naročito uvozni primjerci',
  'Električni prozori i brave — funkcionisanje',
  'Servisna knjiga — interval ulja maks 15.000 km',
  'Zamajac dvostruke mase (na 2.0 TDI) — zvuk iz menjača',
  'Stanje gepek brave i strane vrata Combi varijante',
 ],
 'cta': 'Pretraži Octavia 2 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Octavia 2 na AutoUniverse Autopijaci',
 'related': [
  {'title': 'Škoda Octavia 3 istorijat', 'url': '/blog/skoda-octavia-3-2013-2020-istorijat'},
  {'title': 'EGR ventil — simptomi', 'url': '/blog/egr-ventil-problemi'},
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'skoda-octavia-3-2013-2020-istorijat',
 'title': 'Škoda Octavia 3 (2013–2020) — istorijat, motori i kvarovi',
 'desc': 'Škoda Octavia 3 — sve o motorima 1.6 TDI i 1.4 TSI, DSG, poznati kvarovi i savjeti za kupovinu.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 7,
 'lead': 'Octavia 3 nasljeđuje legendarni status prethodnice i nadograđuje je MQB platformom, modernim turbo motorima i bogatim listom opreme. Pouzdaniji od Golfa 7 u nekim segmentima — i prostor i dalje rekorderi klase.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Treća Octavia debitovala je početkom 2013. na MQB platformi (isti kao Golf 7). Facelift 2016. donio je Matrix LED farove, ažurirani infotainment i blago izmijenjene motore. RS varijanta sa 220 ks je najbrža Octavia ikada.',
    'U Srbiji dominira <strong>1.6 TDI Combi manuelni</strong> — recept koji se prodaje sam. Liftbek je rjeđi ali i dalje tražen. Scout verzija sa AWD dostupna je za planinsku upotrebu.',
   ]},
  {'h2': 'Motori i potrošnja',
   'paras': [
    '<strong>Benzinci:</strong> 1.0 TSI (115 ks, od facelift), 1.4 TSI (125/150 ks), 1.8 TSI (180 ks), 2.0 TSI RS (220/230 ks). <strong>Dizeli:</strong> 1.6 TDI (90/105/110/115 ks) — udaleko najtraženiji. 2.0 TDI (140/150/184 ks).',
    '1.6 TDI na Octaviji 3 troši 4.5–5.5 l/100 km — odličan izbor za mješovitu vožnju. DSG 7 na manjim motorima je i dalje izvor problema; na 2.0 TDI preporučujem manuelni ili DSG 6.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>AdBlue (od 2015. TDI)</strong>: NOx senzor kvari se na 60–100k km. <strong>DSG DQ200</strong> na 1.0 i 1.4 TSI — isti mehatronički problemi. <strong>Grijanje zadnje staklo</strong> na karavanu — žice se kidaju oko okvira.',
    '<strong>Električni kablovi pod motornom haubom</strong>: na nekim serijama puknuće kabla dovelo do požara. Provjeri je li servis urađen (recall campanija). <strong>Mjenjač hrapavost</strong> na 6M manuelnom manuelnom — uobičajen „Škoda osjećaj" koji ne ukazuje na kvar.',
   ]},
  {'h2': 'Šta gledati pri kupovini',
   'paras': [
    'Octavia 3 sa 1.6 TDI, facelift, Combi, 2016–2018, do 150k km — od 13.500 EUR. Provjeri je li urađen recall za kablove ispod haube (servis će ti reći po VIN broju). Obavezno: OBD sken, AdBlue status, servisna knjiga.',
   ]},
 ],
 'callout': {'title': 'Recall kabla:', 'text': 'Provjeri recall status po VIN broju — Octavia 3 iz 2013–2016 ima potencijalnu kampanju za kablove u motornom prostoru. Škoda servis obavlja besplatno.'},
 'checks': [
  'VIN provjera — recall status (kablovi)',
  'AdBlue sistem — OBD sken, NOx senzor',
  'DSG DQ200 — hladni start na manjim motorima',
  'Grijanje zadnjeg stakla — Combi verzija',
  'Servisna knjiga — AdBlue dopunjavanje, DSG servis',
  'Električni sistem — upozorenja na tabli',
 ],
 'cta': 'Pretraži Octavia 3 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Octavia 3 na AutoUniverse Autopijaci',
 'related': [
  {'title': 'Škoda Octavia 2 istorijat', 'url': '/blog/skoda-octavia-2-2004-2013-istorijat'},
  {'title': 'VW Golf 7 istorijat', 'url': '/blog/volkswagen-golf-7-2012-2020-istorijat'},
  {'title': 'DSG menjač — prednosti i mane', 'url': '/blog/dsg-menjac-prednosti-mane'},
 ],
},

{
 'slug': 'skoda-fabia-2-2007-2014-istorijat',
 'title': 'Škoda Fabia 2 (2007–2014) — istorijat, motori i kvarovi',
 'desc': 'Škoda Fabia 2 — pregled motora, kvarova i kupovnih savjeta. Ekonomičan mali auto za Srbiju.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 6,
 'lead': 'Fabia 2 je mali auto koji odlično podnosi gradske uslove. Jednostavna mehanika, jeftino održavanje i mala potrošnja čine ga idealnim prvim automobilom ili gradskim vozilom za usko mjesto za parkiranje.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Fabia 2 debitovala je u Frankfurtu 2007. na PQ24 platformi. Dostupna kao <strong>hečbek</strong> i <strong>Combi karavan</strong>, plus rijetki Scout. Facelift stigao 2010. sa osvježenim prednjim dijelom i novim motorima.',
    'Za razliku od prve Fabije, Fabia 2 ima znatno moderniji enterijer i bolje materijale. Gepek hečbeka 315 l, Combi 480 l — odlično za klasu.',
   ]},
  {'h2': 'Motori',
   'paras': [
    '<strong>Benzinci:</strong> 1.2 HTP (60/70 ks) — star ali pouzdan. 1.4 MPI (85 ks). 1.4 TSI (180 ks, RS) — rijetka u Srbiji. <strong>Dizeli:</strong> 1.4 TDI (70/80 ks) — odličan gradski motor, potrošnja 4–5 l. 1.6 TDI (90/105 ks, od facelift) — bolji na autoputu.',
    '1.2 HTP je jednocilindarski petljač koji u gradu troši 5.5–6.5 l, ali traži buking ulja na svakih 15.000 km. Klasični trocilindarš — neizbježan lagani šum je normalan.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>1.2 HTP</strong>: lančanik razvoda poznato se isteže na 150k+ km — zvuk cvelenja iz motora pri startu. Zamjena lanca i napinjača oko 400–600 EUR. <strong>1.4 TDI</strong>: turbina se isteže, EGR začepljuje — rutinska stvar za dizelski servis.',
    '<strong>Elektrika</strong>: komandna ploča gubi piksele (klasičan VW Group problem tog doba). <strong>Zamjena menajča</strong> na 1.2 suviše krutom. Generalno — Fabia 2 je pouzdanija od erste klase.',
   ]},
  {'h2': 'Savjeti',
   'paras': [
    'Dobra Fabia 2 (1.4 TDI ili 1.6 TDI, do 150k km) dostupna je od 4.500 EUR. Idealan auto za studente i penzione dobi. Provjeri lančanik na 1.2 HTP i EGR na TDI.',
   ]},
 ],
 'checks': [
  '1.2 HTP — cvelenje lančanika pri hladnom startu',
  'EGR ventil na TDI — OBD provjera',
  'Ekran instrument table — piksel ispadi',
  'Servisna knjiga — interval ulja',
  'Karoserija — ogrebotine i lockcilindri vrata',
 ],
 'cta': 'Pretraži Fabia 2 oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Fabiju 2 na AutoUniverse Autopijaci',
 'related': [
  {'title': 'VW Polo 5 istorijat', 'url': '/blog/volkswagen-polo-5-2009-2017-istorijat'},
  {'title': 'Škoda Octavia 2 istorijat', 'url': '/blog/skoda-octavia-2-2004-2013-istorijat'},
 ],
},

{
 'slug': 'opel-astra-j-2009-2015-istorijat',
 'title': 'Opel Astra J (2009–2015) — istorijat, motori i kvarovi',
 'desc': 'Opel Astra J — motori 1.6 CDTI i 1.4 Turbo, poznati kvarovi i savjeti za kupovinu u Srbiji.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 7,
 'lead': 'Astra J je bila direktan izazov Golfu 6 i u mnogome ga je premašila po dizajnu enterijera i dinamici vožnje. Odlična opcija ako hoćete nešto drugačije od sveprisutnog VW-a, ali sa sličnim nivoom pouzdanosti.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Astra J debitovala je na Frankfurt Motor Showu 2009. na novoj GM Delta II platformi. Dostupna kao <strong>hečbek 5-vrata, GTC 3-vrata, Sports Tourer karavan</strong> i kabriolet (rijedak). Facelift 2012. sa novim motorima i BladeSharpening dizajnom prednjeg dijela.',
    'U Srbiji su najprodavanije <strong>Sports Tourer karavan</strong> verzije (592 l gepek). OPC varijanta sa 280 ks — legend za entuzijaste.',
   ]},
  {'h2': 'Motori',
   'paras': [
    '<strong>Benzinci:</strong> 1.4 Turbo (100/120/140 ks) — odličan motor, jeftin servis. 1.6 Turbo (170/180 ks). 2.0 OPC (280 ks). <strong>Dizeli:</strong> 1.3 CDTI (75/95 ks) — ekonomičan gradski dizel. 1.6 CDTI (110/136 ks, od facelift) — novi motor, odličan za kombinovanu vožnju. 2.0 CDTI (110/160 ks).',
    '1.4 Turbo na Astri J je pouzdaniji od 1.4 TSI na VW-u — nema problema s klipnim prstenovima. Troši 7–8 l/100 km. 1.6 CDTI troši 5–6 l mješovito.',
   ]},
  {'h2': 'Poznati kvarovi',
   'paras': [
    '<strong>AFL adaptivni farovi</strong>: kvar motora farova čest na pre-facelift modelima, popravka 200–500 EUR. <strong>Ergonomski upravljač</strong> (FlexRide sistem) — elektronika kvar. <strong>1.3 CDTI turbina</strong> — slab pritisak na visokim km. <strong>2.0 CDTI pierburg vodena pumpa</strong> — propušta na 80–120k km.',
    '<strong>Rust/korozija</strong>: Astra J ima tendenciju hrđanja na prednjem gepeku i oko prozorskih okvira. Vizualni pregled obavezan. <strong>Električna prozori stražnji</strong> — motor zna zakazati.',
   ]},
  {'h2': 'Savjeti',
   'paras': [
    'Astra J sa 1.4 Turbo Sports Tourer, facelift, 100–150k km dostupna je od 8.500 EUR. Dobar izbor za vozača koji cijeni dinamiku. Provjeri AFL farove i karoseriju za rđu.',
   ]},
 ],
 'checks': [
  'AFL farovi — provjera rotacije (noćna proba)',
  'Karoserija — prednji gepek, okviri prozora za rđu',
  'OBD sken — turbo, AFL, FlexRide greške',
  'Vodena pumpa (2.0 CDTI) — tragovi curenja',
  'Električni stražnji prozori — funkcionisanje',
  'Servisna knjiga — redovnost servisa',
 ],
 'cta': 'Pretraži Astra J oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Astra J na AutoUniverse Autopijaci',
 'related': [
  {'title': 'Opel Astra H istorijat', 'url': '/blog/opel-astra-h-2004-2009-istorijat'},
  {'title': 'Opel Corsa D istorijat', 'url': '/blog/opel-corsa-d-2006-2014-istorijat'},
  {'title': 'Kad menjati amortizere', 'url': '/blog/kad-menjati-amortizere'},
 ],
},

{
 'slug': 'opel-astra-h-2004-2009-istorijat',
 'title': 'Opel Astra H (2004–2009) — istorijat, motori i kvarovi',
 'desc': 'Opel Astra H — pregled motora, kvarova i savjeta za kupovinu. Jeftino i pouzdano vozilo za Srbiju.',
 'tag': 'Istorijat',
 'date_sr': '10. septembra 2026.',
 'mins': 6,
 'lead': 'Astra H je auto koji je bio svuda 2005–2015. Jeftina za kupovinu, jeftina za servis, i relativno pouzdana — idealna za kupce s ograničenim budžetom koji žele europski auto.',
 'sections': [
  {'h2': 'O modelu',
   'paras': [
    'Astra H debitovala je u Ženevi 2004. na Delta platformi. Hečbek 3 i 5 vrata, Caravan karavan, GTC, kabriolet i OPC — bogata paleta. Facelift 2007. donio je malo ažuriranja, ali suštinski isti auto.',
    'Najtraženija kombinacija u Srbiji: <strong>hečbek 5V ili Caravan sa 1.7 CDTI</strong>. OPC sa 240 ks je kultni sportski model — rijedak i cijenjen.',
   ]},
  {'h2': 'Motori',
   'paras': [
    '<strong>Benzinci:</strong> 1.4 twinport (90 ks), 1.6 (105/115 ks), 1.8 (125/140 ks), 2.0 Turbo OPC (240 ks). <strong>Dizeli:</strong> 1.3 CDTI (70/90 ks), 1.7 CDTI (100/110/125 ks), 2.0 CDTI (100/120/150 ks).',
    '1.7 CDTI je odličan motor — troši 5.5–6.5 l/100 km, redovnim servisom prolazi 300k km bez problema. 1.6 benzinac je besproblemaničan ali skuplji za gorivo.',
   ]},
  {'h2': 'Kvarovi',
   'paras': [
    '<strong>1.7 CDTI turbina</strong>: isteže se na 150k+ km. <strong>EGR ventil</strong>: začepljuje se — servisni ritual. <strong>Električki podizači prozora</strong>: čest kvar. <strong>Klima</strong>: gubi freon, tipičan problem na starijim primjercima.',
    '<strong>Korozija</strong>: Astra H hrđa ispod poklopca rezervoara za gorivo i na stražnjem branikU. Provjeri te tačke. Generalno, Astra H je <strong>manje podložna rđu</strong> od prethodne Astre G.',
   ]},
  {'h2': 'Savjeti',
   'paras': [
    'Astra H sa 1.7 CDTI, manuelni, do 180k km, dostupna od 3.500 EUR — solidna investicija za budžet kupca. Servis je gotovo svuda u Srbiji.',
   ]},
 ],
 'checks': [
  'EGR ventil — OBD provjera',
  'Turbina 1.7 CDTI — pritisak punjenja',
  'Električki podizači prozora',
  'Korozija ispod gepeka i oko zadnjih točkova',
  'Klima — punjenje i provjera kompresora',
  'Servisna knjiga',
 ],
 'cta': 'Pretraži Astra H oglase',
 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Astra H na AutoUniverse Autopijaci',
 'related': [
  {'title': 'Opel Astra J istorijat', 'url': '/blog/opel-astra-j-2009-2015-istorijat'},
  {'title': 'Opel Corsa D istorijat', 'url': '/blog/opel-corsa-d-2006-2014-istorijat'},
 ],
},



# ─── TIER 1 nastavak (11–20) ─────────────────────────────────────────────────

{
 'slug': 'opel-corsa-d-2006-2014-istorijat',
 'title': 'Opel Corsa D (2006–2014) — istorijat, motori i kvarovi',
 'desc': 'Opel Corsa D — pregled motora, kvarova i savjeta za kupovinu. Popularan gradski auto u Srbiji.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Corsa D je gradski auto koji se decenijama prodaje u ogromnim količinama širom Evrope. Kompaktna, jeftina za servis i odlična za grad — uz prave motore i urednu historiju, odlična kupovina.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Corsa D debitovala je 2006. na Gamma platformi. Dostupna kao 3 i 5-vrata hečbek. Facelift 2010. (Corsa D2) donio je moderniji prednji dio i nova enterijer detalja. OPC verzija sa 192 ks — kultna u auto-krugovima.',
   'U Srbiji su najtraženiji <strong>1.3 CDTI</strong> i <strong>1.2 twinport benzinac</strong>. Kompaktna dimenzija idealna za gradska mjesta za parkiranje.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.0 twinport (60 ks), 1.2 twinport (80 ks), 1.4 twinport (90 ks), 1.6 Turbo OPC (192 ks). <strong>Dizeli:</strong> 1.3 CDTI (75/90 ks) — gradski specijalac, 4–5 l/100 km. 1.7 CDTI (100/110/125 ks) — jači, ali rjeđi na Corsi.',
   '1.2 twinport je pouzdan ali bučan u gradskoj vožnji. 1.3 CDTI je idealan za gradsku vožnju — mali servisni troškovi.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   '<strong>1.3 CDTI turbina</strong>: isteže se na visokim km. <strong>Start/stop sistem</strong>: zna biti nestabilan. <strong>Električni servo upravljač</strong>: kvar na 100k+ km, upozorenje na tabli. <strong>Korozija</strong>: pragovi i ispod vrata — provjeri vizuelno.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'Corsa D sa 1.3 CDTI ili 1.2 benzincem, do 150k km dostupna od 3.000 EUR. Idealna za grad. Servisna historija obavezna — ne kupuj bez nje.',
  ]},
 ],
 'checks': ['1.3 CDTI turbina — pritisak', 'Servo upravljač — upozorenja', 'Korozija na pragovima', 'Start/stop sistem', 'OBD sken'],
 'cta': 'Pretraži Corsa D oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Corsa D na AutoUniverse Autopijaci',
 'related': [{'title': 'Opel Astra J istorijat', 'url': '/blog/opel-astra-j-2009-2015-istorijat'}, {'title': 'VW Polo 5 istorijat', 'url': '/blog/volkswagen-polo-5-2009-2017-istorijat'}],
},

{
 'slug': 'renault-clio-3-2005-2012-istorijat',
 'title': 'Renault Clio 3 (2005–2012) — istorijat, motori i kvarovi',
 'desc': 'Renault Clio 3 — motori 1.5 dCi i 1.2 TCe, poznati kvarovi i savjeti za kupovinu u Srbiji.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Clio 3 je dokazani gradski auto sa izvanrednim dizelskim motorom 1.5 dCi koji se pokreće i na vjetar. U Srbiji je jedan od najzastupljenijih malih automobila — dijelovi dostupni svuda, servis jeftin.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Clio 3 debitovao je 2005. Dostupan kao 3 i 5-vrata hečbek, Grand Tour karavan (2007) i 2-vrata kabriolet. Facelift 2009. sa novim prednjim dijelom i ažuriranim enterijerom.',
   'Motor <strong>1.5 dCi 85/86 ks</strong> je bio toliko dobar da ga je Renault zadržao u Cliou kroz sve generacije. Benzinac 1.2 TCe (100 ks, turbinski) je moderna i ekonomična alternativa.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.2 16V (75 ks), 1.2 TCe (100 ks, turbo), 1.4 (98 ks), 1.6 (111 ks), 2.0 RS (197/200 ks). <strong>Dizeli:</strong> 1.5 dCi (68/85/86/106 ks) — legendarni motor, 4–5 l/100 km, servisni interval 30.000 km.',
   '1.5 dCi 85 ks je zlatni standard ekonomičnog gradskog auta. Jedini problem: <strong>DPF filter od 2008</strong> koji zahtijeva periodično čišćenje ako auto ide samo gradom.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   '<strong>EGR ventil</strong> na 1.5 dCi: začepljuje se na 100–150k km — standardni servisni zahvat. <strong>DPF filter</strong> (2008+): problem ako auto nikad ne ide na autoput. <strong>Električni prozori i centralna brava</strong>: česti kvarovi. <strong>Spoj karoserije</strong>: Clio 3 relativno dobro drži rđu ali provjeri praske i ubode.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'Clio 3 sa 1.5 dCi, do 150k km, bez DPF-a (pre-2008) dostupan od 3.500 EUR. Odličan izbor za grad. Insistiraj na vizuelnom pregledu korozije i OBD skenu.',
  ]},
 ],
 'checks': ['EGR ventil — OBD', 'DPF status (2008+)', 'Električni prozori i brave', 'Korozija karoserije', 'Servisna knjiga — interval ulja'],
 'cta': 'Pretraži Clio 3 oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Clio 3 na AutoUniverse Autopijaci',
 'related': [{'title': 'Renault Megane 3 istorijat', 'url': '/blog/renault-megane-3-2008-2015-istorijat'}, {'title': 'DPF filter — održavanje', 'url': '/blog/dpf-filter-odrzavanje'}],
},

{
 'slug': 'renault-megane-3-2008-2015-istorijat',
 'title': 'Renault Megane 3 (2008–2015) — istorijat, motori i kvarovi',
 'desc': 'Renault Megane 3 — vodič za kupovinu: motori 1.5 dCi, 1.6 dCi, kvarovi i šta gledati.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 7,
 'lead': 'Megane 3 je kompakt koji se ističe dizajnom i vozačkim karakterom. Sa bogatim izborom karoserisja i motorima koji rade savjesno uz redovni servis — i danas vrijedi razmatranje na tržištu polovnih.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Megane 3 debitovao je u Parizu 2008. Dostupan kao 5-vrata hečbek, 3-vrata coupe, Grandtour karavan, Coupe-Cabriolet i sedan. Facelift 2012. sa novim prednjim dijelom i motorom 1.6 dCi.',
   'U Srbiji su najpopularniji <strong>hečbek sa 1.5 dCi</strong> i <strong>Grandtour karavan</strong>. RS varijanta sa 250 ks — za entuzijaste.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.6 (110 ks), 2.0 Turbo RS (250/265 ks). <strong>Dizeli:</strong> 1.5 dCi (85/105/110 ks) — najpopularniji, 4.5–5.5 l/100 km. 1.6 dCi (130 ks, od facelift) — tiši i čistiji ali skuplji servis. 2.0 dCi (150/175 ks).',
   '1.5 dCi na Megane 3 je srodan motoru u Cliu ali napravljeniji za veće opterećenje. Servisni interval 30.000 km — drži se toga.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   '<strong>Ručica mjenjača</strong>: pada u slobodan hod — ergonomski kvar bez uticaja na pouzdanost. <strong>Kontrolna tabla</strong>: osvjetljenje gasi — poznat estetski kvar. <strong>Akumulatorska ladica ispod suvozačevog sjedišta</strong>: može propuštati ako se ne servisi. <strong>1.5 dCi injektori</strong>: na 200k+ km.',
   '<strong>Elektronika vozačke ruke</strong>: robotizirana kočnica (EPB) kvar na nekim serijama. <strong>Korozija</strong>: Megane 3 je relativno dobro zaštićen, ali provjeri donje ivice vrata.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'Megane 3 sa 1.5 dCi 105 ks, hečbek ili karavan, facelift, do 180k km dostupan od 6.500 EUR. OBD sken obavezan.',
  ]},
 ],
 'checks': ['1.5 dCi — OBD, EGR, injektori', 'Kontrolna tabla — osvjetljenje', 'EPB elektronska kočnica — test', 'Akumulatorska ladica — curenje', 'Servisna knjiga'],
 'cta': 'Pretraži Megane 3 oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Megane 3 na AutoUniverse Autopijaci',
 'related': [{'title': 'Renault Clio 3 istorijat', 'url': '/blog/renault-clio-3-2005-2012-istorijat'}, {'title': 'Peugeot 308 istorijat', 'url': '/blog/peugeot-308-1-2007-2013-istorijat'}],
},

{
 'slug': 'peugeot-308-1-2007-2013-istorijat',
 'title': 'Peugeot 308 1 (2007–2013) — istorijat, motori i kvarovi',
 'desc': 'Peugeot 308 prve generacije — motori 1.6 HDi i 1.6 THP, kvarovi i savjeti za kupovinu.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Peugeot 308 prve generacije je kompaktan auto sa odličnim dizelskim motorom 1.6 HDi i problematičnim automatskim menjačem koji treba dobro pregledati. Dobar izbor za iskusnog kupca koji zna šta gleda.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Peugeot 308 prve generacije debitovao je 2007. na PF2 platformi (PSA/Fiat). Dostupan kao 5-vrata hečbek, SW karavan i kabriolet (CC). Facelift 2011.',
   'Dijeli motore i neke platformske elemente sa Citroën C4 i Fiat Bravo. U Srbiji najpopularniji kao <strong>hečbek sa 1.6 HDi</strong>.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.4 VTi (95 ks), 1.6 VTi (120 ks), 1.6 THP (140/175 ks). <strong>Dizeli:</strong> 1.6 HDi (90/110/112 ks) — najpopularniji, 5–6 l/100 km. 2.0 HDi (136/150 ks).',
   '1.6 THP benzinac je problematičan — poznat po pucanju lanca razvoda. Ako kupujete THP, budite svjesni troška zamjene lanca (500–900 EUR).',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   '<strong>1.6 THP — lanac razvoda</strong>: puca na 80–120k km ako ulje nije mijenjano redovno. <strong>Automatski menjač AL4/DP2</strong>: posebno loš — trzanje, kašnjenje, čest kvar. Preporučujem manuelni ili barem trošak pregleda automatika. <strong>1.6 HDi EGR i turbo</strong>: standardni servis.',
   '<strong>Električna rula</strong>: kvar i pogrešan osjećaj upravljanja na nekim primjercima. <strong>Korozija</strong>: rđa ispod prednjeg gepeka česta.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   '308 sa 1.6 HDi 110 ks manuelnim, do 150k km dostupan od 5.000 EUR. Izbjegavaj automatik (AL4). Provjeri lanac na THP motorima.',
  ]},
 ],
 'callout': {'title': 'Izbjegni AL4 automatik:', 'text': 'Peugeot 308 sa automatskim menjačem AL4/DP2 ima čest i skup kvar — trzanje i kašnjenje. Ako uzimate automatik, budžetirajte popravku od 600–1200 EUR.'},
 'callout_danger': True,
 'checks': ['1.6 THP — zvuk lanca pri hladnom startu', 'AL4 automatik — test hladnog starta, trzanje', '1.6 HDi EGR — OBD sken', 'Korozija prednjeg gepeka', 'Servisna knjiga'],
 'cta': 'Pretraži 308 oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Peugeot 308 na AutoUniverse Autopijaci',
 'related': [{'title': 'Peugeot 207 istorijat', 'url': '/blog/peugeot-207-2006-2012-istorijat'}, {'title': 'Renault Megane 3 istorijat', 'url': '/blog/renault-megane-3-2008-2015-istorijat'}],
},

{
 'slug': 'peugeot-207-2006-2012-istorijat',
 'title': 'Peugeot 207 (2006–2012) — istorijat, motori i kvarovi',
 'desc': 'Peugeot 207 — pregled motora, kvarova i savjeta za kupovinu. Gradski auto s karakterom.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Peugeot 207 je nasljednik legendarne 206-ice i donosi nešto više prostora uz isti karakteristični Peugeot dizajn. Za gradsku vožnju sa 1.4 HDi ili 1.6 HDi — ekonomičan i pouzdan kompanjon.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Peugeot 207 debitovao je 2006. kao nasljednik 206-ice. 3 i 5-vrata hečbek, CC kabriolet i SW karavan. Nije imao facelift — samo ažuriranja opreme kroz godine.',
   'U Srbiji su popularne <strong>1.4 HDi i 1.6 HDi</strong> verzije — ekonomične i jednostavne za servis.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.4 VTi (75/95 ks), 1.6 VTi (120 ks), 1.6 THP (150/175 ks). <strong>Dizeli:</strong> 1.4 HDi (70 ks) — ultra ekonomičan, 3.5–4.5 l/100 km. 1.6 HDi (90/110 ks) — bolji za autoput.',
  ]},
  {'h2': 'Kvarovi i savjeti', 'paras': [
   '<strong>1.6 THP</strong>: isti problem sa lancem kao na 308 — provjeri servisnu historiju. <strong>Električni podizači prozora</strong>: česti kvarovi. <strong>Korozija</strong>: 207 relativno dobro drži, ali provjeri ispod vrata. Generalno, 207 je <strong>pouzdaniji od 308</strong> zbog jednostavnije mehanike.',
   'Sa 1.4 HDi ili 1.6 HDi manuelnim, do 150k km, dostupan od 3.500 EUR. Odlično za grad.',
  ]},
 ],
 'checks': ['1.6 THP — lanac razvoda', 'Električni podizači prozora', 'OBD sken — EGR na HDi', 'Korozija oko vrata', 'Servisna knjiga'],
 'cta': 'Pretraži Peugeot 207 oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi 207 na AutoUniverse Autopijaci',
 'related': [{'title': 'Peugeot 308 istorijat', 'url': '/blog/peugeot-308-1-2007-2013-istorijat'}, {'title': 'Renault Clio 3 istorijat', 'url': '/blog/renault-clio-3-2005-2012-istorijat'}],
},

{
 'slug': 'toyota-corolla-e150-2006-2013-istorijat',
 'title': 'Toyota Corolla E150 (2006–2013) — istorijat, motori i pouzdanost',
 'desc': 'Toyota Corolla E150 — najpouzdaniji kompaktni auto na tržištu. Motori, kvarovi i savjeti.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Toyota Corolla E150 je sinonim za pouzdanost. Auto koji ne kvari — ako redovno ide na servis, može prelaziti 400–500k km bez generalnog remonta. Za kupce koji žele mir na dugi rok, ovo je odgovor.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Corolla E150 (deseta generacija) je prodavana od 2006. do 2013. u Srbiji. Dostupna kao sedan i hečbek (za evropsko tržište). Potpuno novo vozilo na MC platformi — nije facelift prethodnika.',
   'U Srbiji se prodavala uglavnom kao <strong>sedan</strong>. Dizel opcija (1.4 D-4D i 2.0 D-4D) bila je rjeđa nego benzinci.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.4 VVT-i (97 ks), 1.6 VVT-i (124 ks) — zlatni standard pouzdanosti, 7–8 l/100 km. 1.8 VVT-i (129/136 ks). <strong>Dizeli:</strong> 1.4 D-4D (90 ks), 2.0 D-4D (126 ks).',
   '1.6 VVT-i je motor koji se s pravom smatra jednim od najpouzdanijih ikad. Redovnom promjenom ulja (ne rjeđe od 10.000 km) može se lako dostići 300k+ km.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   'Corolla E150 gotovo nema karakterističnih kvarova specifičnih za model. <strong>Jedine napomene</strong>: 1.4 D-4D dizel traži redovnu zamjenu filtera za gorivo. Električni prozori na starijim primjercima. Katalizator na benzincima sa visokom kilometražom.',
   'Toyota je ovde uradila domaći zadatak — Corolla E150 u anketi pozdanosti redovnih korisnika godinama zauzima vrh. Ako postoji nedostatak — <strong>enterijer je pomalo sterilan i plastičan</strong>.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'Corolla E150 sa 1.6 VVT-i, do 200k km, servisna knjiga — dostupna od 6.000 EUR. Vrednost za novac je izvanredna. Jedina provjera: regularnost servisa ulja.',
  ]},
 ],
 'checks': ['Servisna knjiga — intervali ulja (ne rjeđe od 10k km)', 'OBD sken — motor i emisioni sistem', '1.4 D-4D filter goriva (diesel)', 'Električki prozori', 'Karoserija — korozija na starijim primjercima'],
 'cta': 'Pretraži Corolla oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Corolla E150 na AutoUniverse Autopijaci',
 'related': [{'title': 'Hyundai i30 istorijat', 'url': '/blog/hyundai-i30-fd-2007-2012-istorijat'}, {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'}],
},

{
 'slug': 'hyundai-i30-fd-2007-2012-istorijat',
 'title': 'Hyundai i30 FD (2007–2012) — istorijat, motori i kvarovi',
 'desc': 'Hyundai i30 prve generacije — pregled motora, kvarova i kupovnih savjeta za Srbiju.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Hyundai i30 prve generacije označio je preokret za korejski brend na evropskom tržištu — auto projektovan za Evropu, sa europskim motorima. Pouzdan i jeftin za servis, odlična alternativa europskim kompaktima.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'i30 FD (prva generacija) debitovao je na Frankfurtu 2007. Dizajniran i razvijen u Rüsselsheimu (bivši GM Design Center Europe koji je Hyundai zakupio). Dostupan kao 5-vrata hečbek i karavan (CW). Zamijenjen drugom generacijom 2012.',
   'Facelift 2010. sa malim kozmetičkim izmjenama. Motori djelimično preuzeti iz Kia-e (3-motor platforma).',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.4 CVVT (109 ks), 1.6 CVVT (122 ks), 2.0 CVVT (143 ks). <strong>Dizeli:</strong> 1.6 CRDi (90/115 ks) — najpopularniji, 5.5–6.5 l/100 km. 2.0 CRDi (140 ks).',
   '1.6 CRDi je pouzdan motor koji traži redovnu promjenu ulja (15.000 km) i filtera. DPF filter od 2011 na nekim tržištima.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   'i30 FD ima <strong>relativno malo karakterističnih kvarova</strong>. Klima kompresor na starijim primjercima zna zakazati. Grijanje stražnjeg stakla može isteći. EGR na dizelima. Neke serije imaju problem s poluosovinskim zglobovima.',
   '<strong>Prednost</strong>: dijelovi su jeftini — i originalni Hyundai dijelovi dostupni po razumnim cijenama.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'i30 FD sa 1.6 CRDi, do 180k km, od 4.500 EUR — solidna kupovina. Karavan je posebno praktičan. Provjeri servisnu historiju i klima sistem.',
  ]},
 ],
 'checks': ['1.6 CRDi OBD sken — EGR, DPF', 'Klima — punjenje i kompresor', 'Poluosovinski zglobovi — zvuk pri ulasku u krivine', 'Servisna knjiga', 'Karoserija za rđu'],
 'cta': 'Pretraži i30 oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi i30 FD na AutoUniverse Autopijaci',
 'related': [{'title': 'Hyundai Tucson 2 istorijat', 'url': '/blog/hyundai-tucson-2-2015-2020-istorijat'}, {'title': 'Kia Ceed istorijat', 'url': '/blog/kia-ceed-ed-2006-2012-istorijat'}],
},

{
 'slug': 'hyundai-tucson-2-2015-2020-istorijat',
 'title': 'Hyundai Tucson 2 (2015–2020) — istorijat, motori i kvarovi',
 'desc': 'Hyundai Tucson druge generacije (TL) — vodič za kupovinu: motori, AWD sistem, kvarovi.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Tucson druge generacije (TL) je kompaktni SUV koji je donijeo moderan dizajn i bogatu opremu po razumnoj cijeni. Na srpskom tržištu sve popularniji, naročito u 4WD verzijama za teži teren.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'Tucson TL debitovao je 2015. na novoj platformi. Facelift 2018. sa novim prednjim dijelom i ažuriranim motorima. Dostupan u FWD i 4WD konfiguraciji. Kompetitor VW Tiguan, Renault Kadjar.',
   'U Srbiji su tražene <strong>4WD verzije sa 1.6 T-GDi benzincem</strong> ili <strong>2.0 CRDi dizelom</strong>.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> 1.6 GDi (132 ks, FWD), 1.6 T-GDi (177 ks, AWD). <strong>Dizeli:</strong> 1.7 CRDi (115/141 ks), 2.0 CRDi (136/185 ks).',
   '1.6 T-GDi je odličan motor za gradsku i putnu upotrebu. 2.0 CRDi je snažan ali traži redovne DPF regeneracije.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   '<strong>1.6 T-GDi — GDI direktno ubrizgavanje</strong>: može nakupljati naslage na usisnim ventilima. Preporuči dočišćavanje na svakih 50k km. <strong>4WD kvačilo</strong>: servis svake 2 godine. <strong>DPF na 2.0 CRDi</strong>: problem ako se ne vozi autoputom.',
   'Generalno, Tucson TL je <strong>pouzdaniji od proseka</strong> za kompaktni SUV segment.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'Tucson TL sa 2.0 CRDi 4WD, facelift 2018, do 100k km — od 16.000 EUR. Vrijedna investicija. OBD sken obavezan, provjeri 4WD sistem.',
  ]},
 ],
 'checks': ['OBD sken — motor, 4WD, DPF', '4WD sistem — test na mokrom', '1.6 T-GDi usisni ventili — provjera servisu', 'DPF regeneracije — historija', 'Servisna knjiga'],
 'cta': 'Pretraži Tucson oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Tucson 2 na AutoUniverse Autopijaci',
 'related': [{'title': 'Hyundai i30 istorijat', 'url': '/blog/hyundai-i30-fd-2007-2012-istorijat'}, {'title': 'Kia Ceed istorijat', 'url': '/blog/kia-ceed-ed-2006-2012-istorijat'}],
},

{
 'slug': 'kia-ceed-ed-2006-2012-istorijat',
 'title': 'Kia Ceed ED (2006–2012) — istorijat, motori i kvarovi',
 'desc': 'Kia Ceed prve generacije — pregled motora 1.6 CRDi, kvarova i savjeta za kupovinu u Srbiji.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': "Kia Ceed prve generacije je brat blizanac Hyundai i30 FD — isti motori, slična platforma, drugačiji stil. Odlična vrijednost za novac i servisni troškovi koji ne bole. Za kupce koji gledaju na jeftinoću vlasništva, teško naći bolji kompakt.",
 'sections': [
  {'h2': 'O modelu', 'paras': [
   "Ceed ED (prva generacija, European Design) bio je Kia-in odgovor na tražnje europskog tržišta. Prodavan od 2006. Dostupan kao 5-vrata hečbek (Ceed), 3-vrata (pro_ceed) i karavan (Ceed SW). Zamijenjen drugom generacijom 2012.",
  ]},
  {'h2': 'Motori i kvarovi', 'paras': [
   "<strong>Benzinci:</strong> 1.4 CVVT (109 ks), 1.6 CVVT (122 ks). <strong>Dizeli:</strong> 1.6 CRDi (90/115 ks) — najpopularniji. 2.0 CRDi (140 ks).",
   "Kvarovi: isti obrazac kao i30 FD — EGR na CRDi, klima kompresor, poluosovinski zglobovi. Enterijer je malo jeftinije plastike od i30, ali mehanika identična. <strong>Dijelovi su znatno jeftiniji</strong> od europskih kompaktica.",
  ]},
  {'h2': 'Savjeti', 'paras': [
   "Ceed ED sa 1.6 CRDi, karavan, do 180k km — od 4.000 EUR. Odlična vrijednost. Servisna historija presudna.",
  ]},
 ],
 'checks': ['EGR — OBD sken', 'Klima kompresor', 'Poluosovine — zvuk u zavojima', 'Servisna knjiga', 'Karoserija rđa'],
 'cta': 'Pretraži Ceed oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Kia Ceed na AutoUniverse Autopijaci',
 'related': [{'title': 'Hyundai i30 istorijat', 'url': '/blog/hyundai-i30-fd-2007-2012-istorijat'}, {'title': 'Šta proveriti na test vožnji', 'url': '/blog/auto-pre-kupovine-test-voznja'}],
},

{
 'slug': 'mercedes-c-klasa-w203-2000-2007-istorijat',
 'title': 'Mercedes C-Klasa W203 (2000–2007) — istorijat, motori i kvarovi',
 'desc': 'Mercedes C-Klasa W203 — najpristupačniji Mercedes na tržištu. Motori, kvarovi i savjeti.',
 'tag': 'Istorijat', 'date_sr': '10. septembra 2026.', 'mins': 7,
 'lead': 'Mercedes C-Klasa W203 je najpristupačniji ulaz u premium segment. Privlači kupce koji žele Mercedes logo bez premium cijene — ali donosi i specifične izazove u održavanju koje treba poznavati.',
 'sections': [
  {'h2': 'O modelu', 'paras': [
   'W203 je treća generacija C-Klase, prodavana od 2000. do 2007. Dostupna kao sedan, karavan (T-Model) i sportski coupe. Facelift 2004. sa novim prednjim dijelom i ažuriranim motorima.',
   'Na srpskom tržištu popularan kao <strong>C 200 CDI ili C 220 CDI</strong> — ekonomičan dizelski automobil sa prestiž faktorom.',
  ]},
  {'h2': 'Motori', 'paras': [
   '<strong>Benzinci:</strong> C 180 (143 ks), C 200 Kompressor (163 ks), C 230 Kompressor (192 ks), C 320 V6 (218 ks), AMG C 32/C 55. <strong>Dizeli:</strong> C 200 CDI (116 ks), C 220 CDI (143 ks), C 270 CDI (170 ks).',
   'C 220 CDI sa OM611/OM646 motorom je <strong>zlatna kombinacija</strong> — pouzdan uz redovne servise. Potrošnja 6–7 l/100 km u kombinovanoj vožnji.',
  ]},
  {'h2': 'Kvarovi', 'paras': [
   '<strong>SBC (Sensotronic Brake Control)</strong>: elektronska kočnica na pre-facelift modelima (2000–2003) poznata po skupim kvarovima. Zamjena skupa — budžetirajte 1.000–2.000 EUR ili traže model post-facelift. <strong>Kompressor benzinci</strong>: kompressor se troši, cijena zamjene 500–1000 EUR.',
   '<strong>Elektronika generalno</strong>: W203 ima stariju arhitekturu koja može davati intermitentne greške. <strong>Kardansko kućište</strong> (na 4MATIC) troši se na visokim km. <strong>Korozija karoserije</strong>: kod primjeraka iz vlažnih regija.',
  ]},
  {'h2': 'Savjeti', 'paras': [
   'W203 C 220 CDI, post-facelift (2004–2007), do 220k km — od 4.500 EUR. Izbjegavajte SBC modele (pre-2004). Obavezni OBD sken i provjera servisne knjige. Servis samo u specijalizovanim Mercedes radionicama.',
  ]},
 ],
 'callout': {'title': 'SBC kočnice:', 'text': 'Modeli 2000–2003. imaju Sensotronic Brake Control koji je skup za popravak. Tražite facelift 2004+ koji ima konvencionalne kočnice.'},
 'callout_danger': True,
 'checks': ['VIN — facelift provjera (2004+ bez SBC)', 'OBD sken — motor, kočioni sistem', 'Servisna knjiga — servis isključivo u ovlaštenim ili spec. radionicama', 'Karoserija — rđa oko prozorskih okvira', 'Kompressor (benzinci) — zvuk pri akceleraciji', 'Klima — punjenje'],
 'cta': 'Pretraži Mercedes C-Klasa oglase', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'Pronađi Mercedes C-Klasu na AutoUniverse Autopijaci',
 'related': [{'title': 'Auto na firmu ili lično', 'url': '/blog/auto-na-firmu-ili-licno'}, {'title': 'Servis — sam ili ovlašćeni', 'url': '/blog/servis-sam-ili-ovlasceni'}],
},


# ═══════════════════════════════════════════════════════════════════════════════
# TIER 2 — PRAKTIČNI VODIČI (21–40)
# ═══════════════════════════════════════════════════════════════════════════════

{
 'slug': 'sta-znace-lampice-na-tabli',
 'title': 'Šta znače lampice na tabli — kompletan vodič',
 'desc': 'Koje lampice na instrument tabli su hitne, koje možete ignorisati i šta napraviti kada se upale.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 7,
 'lead': 'Lampica se upalila na tabli — šta sad? Ne panikujte. Neke lampice zahtijevaju trenutno zaustavljanje, neke mogu sačekati do sljedećeg servisa. Evo kako čitati signale vašeg auta.',
 'sections': [
  {'h2': 'Crvene lampice — STOP odmah', 'paras': [
   '<strong>Pritisak ulja (crvena kanta sa kapljom)</strong>: ugasi motor odmah. Vožnja bez ulja = uništen motor za minuts. Zaustavi se na sigurno, provjeri nivo ulja, pozovi servis.',
   '<strong>Temperatura motora (termometar)</strong>: motor se pregrijava. Ugasi motor, ne otvaraj poklopac hladnjaka dok se ne ohladi. <strong>Baterija / punjenje</strong>: alternator ne puni — imaš 10–30 minuta do gašenja. Isključi sve potrošače i dođi do servisa.',
  ]},
  {'h2': 'Žute lampice — provjeri uskoro', 'paras': [
   '<strong>Check engine / servisni ključ</strong>: greška u motoru ili mjenjaču. Može biti sitnica (senzor) ili ozbiljna (katalizator, lambda). OBD sken = odgovor. <strong>TPMS (guma)</strong>: pritisak guma ispod optimuma. Provjeri na pumpi.',
   '<strong>ABS</strong>: ABS sistem nije aktivan — koče normalne kočnice, ali bez elektronske pomoći. Servis uskoro. <strong>ESP/traction control</strong>: ako stalno gori (ne samo pri klizanju) — senzor ili kvar.',
  ]},
  {'h2': 'Narandžaste / informatívne', 'paras': [
   '<strong>Servisni interval</strong>: podsjetnik za servis. Može se resetovati. <strong>AdBlue nivo</strong>: dolij AdBlue, imaš oko 2.000 km do zabrane pokretanja. <strong>DPF regeneracija</strong>: regen u toku — normalno, ne gasiti motor.',
  ]},
 ],
 'callout': {'title': 'Pravilo:', 'text': 'Crvena = stani odmah. Žuta = provjeri unutar 100 km. Zelena/plava = informacija.'},
 'cta': 'Skeniraj greške auta besplatno', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Driver Toolbox — prati stanje auta, servise i troškove',
 'related': [
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
  {'title': 'Interval promene ulja', 'url': '/blog/interval-promene-ulja'},
  {'title': 'Baterija automobila', 'url': '/blog/baterija-automobila'},
 ],
},

{
 'slug': 'kako-citati-oznake-na-gumama',
 'title': 'Kako čitati oznake na gumama — vodič za vozače',
 'desc': 'Šta znači 205/55 R16 91V na gumi — kompletan vodič za čitanje oznaka guma i kako odabrati pravu gumu.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Svaka guma ima seriju oznaka na boku koje govore sve o njoj — od dimenzija do brzinskog indeksa. Razumijevanje ovih oznaka pomaže vam da kupite pravu gumu i izbjegnete greške.',
 'sections': [
  {'h2': 'Dekodiranje oznake: 205/55 R16 91V', 'paras': [
   '<strong>205</strong> — širina gume u milimetrima. <strong>55</strong> — profil (visina bočnice kao % od širine). <strong>R16</strong> — radijalna konstrukcija, 16-inčni naplatak. <strong>91</strong> — indeks nosivosti (91 = 615 kg po gumi). <strong>V</strong> — indeks brzine (V = do 240 km/h).',
  ]},
  {'h2': 'Indeksi brzine — najvažniji', 'ul': [
   'Q = 160 km/h (zimske gume)',
   'T = 190 km/h',
   'H = 210 km/h',
   'V = 240 km/h',
   'W = 270 km/h',
   'Y = 300 km/h',
  ], 'paras': ['<strong>Nikad ne montirati gumu sa nižim indeksom brzine</strong> od propisanog za vaše vozilo.']},
  {'h2': 'DOT oznaka — starost gume', 'paras': [
   'Na boku gume imate DOT kod koji završava sa 4 cifre — npr. <strong>1523</strong> znači 15. sedmica 2023. godine. <strong>Guma starija od 6 godina treba zamjenu</strong> bez obzira na profilnu dubinu — guma stari i puca.',
  ]},
  {'h2': 'Sezonske oznake', 'paras': [
   '<strong>M+S</strong>: mud and snow — minimalni zimski standard. <strong>3PMSF (planinska pahuljica sa 3 vrha)</strong>: pravi zimski standrd, obavezan za pravo zimsko, alpine uvjete. Preporuča se za Srbiju.',
  ]},
 ],
 'cta': 'Kalkulator registracije — troškovi guma i registracije',
 'cta_url': 'https://autouniverse.rs/kalkulatori/registracije',
 'cta_sub': 'AutoUniverse kalkulatori — sve o troškovima vozila',
 'related': [
  {'title': 'Zimske gume — obaveza u Srbiji', 'url': '/blog/zimske-gume-obaveza-srbija'},
  {'title': 'Kad menjati amortizere', 'url': '/blog/kad-menjati-amortizere'},
 ],
},

{
 'slug': 'dsg-menjac-prednosti-mane',
 'title': 'DSG menjač — prednosti, mane i šta treba znati',
 'desc': 'DSG automatski menjač — kako radi, prednosti i mane, DQ200 vs DQ250 i kada je isplativ.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'DSG menjač je jedan od najčešćih razloga za dugotrajno raspravljanje pri kupovini VW Group vozila. Brz, ekonomičan, ali i skup za servis — evo svega što treba znati.',
 'sections': [
  {'h2': 'Kako radi DSG', 'paras': [
   'DSG (Direct Shift Gearbox) je automatizovani manualni menjač sa dva kvačila — jedno za neparni stepen (1,3,5), drugo za parni (2,4,6). Dok ste u prvoj, drugi stepen je već upregnut. Izmjena je gotova za milisekunde — brže od svakog manuelnog vozača.',
  ]},
  {'h2': 'DQ200 vs DQ250 — koja je razlika', 'paras': [
   '<strong>DQ200 (DSG 7, suho dvostuko kvačilo)</strong>: na motorima do ~250 Nm (1.0 TSI, 1.4 TSI, 1.6 TDI). Jeftin, ali problematičan — mehatronika kvari se na starijim verzijama. Simptomi: treskanje u niskim brzinama, oklijevanje pri ubrzavanju iz mjesta.',
   '<strong>DQ250 (DSG 6, mokro dvostuko kvačilo)</strong>: na jačim motorima (2.0 TSI, 2.0 TDI). Pouzdaniji jer radi u kupci ulja. Manji broj kvarova. Preporuča se ako birate između ove dvije.',
  ]},
  {'h2': 'Servis DSG — šta i kada', 'paras': [
   'Ulje DSG menjača mijenja se na <strong>svakih 60.000 km ili 6 godina</strong> — ne duže. Ignorisanje dovodi do habanja mehatronike i kvačila. Cijena servisnog ulja: 150–300 EUR.',
   'DQ200 mehatronika — servisna zamjena 600–1.200 EUR. Na novijim verzijama firmware update rješava mnogo softverskih tegoba.',
  ]},
  {'h2': 'Da li uzeti DSG ili manual', 'paras': [
   'Za gradsku vožnju — DSG je odlično rješenje (nema mukte kvačila). Za terene i trailer — manual je pouzdaniji. Ako kupujete rabljeni auto sa DSG: provjerite servisnu historiju menjača, uradite hladni start test.',
  ]},
 ],
 'callout': {'title': 'Pre kupovine DSG:', 'text': 'Insistiraj na servisnoj historiji menjačnog ulja. Nezamijenjeno ulje je najčešći uzrok skupih DSG kvarova.'},
 'cta': 'Vodi evidenciju servisa u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Prati servise, troškove i podsjetnik za zamjenu ulja',
 'related': [
  {'title': 'VW Golf 6 istorijat', 'url': '/blog/volkswagen-golf-6-2008-2013-istorijat'},
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'turbo-motor-odrzavanje',
 'title': 'Turbo motor — pravilno održavanje i savjeti',
 'desc': 'Kako pravilno održavati turbo motor: ulje, zagrijavanje, hlađenje i što nikad ne smete raditi.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Turbopunjač je genijalan inžinjerski izum koji povećava snagu bez povećanja zapremine. Ali zahtijeva pažljivo rukovanje — pogotovo s uljem. Greška u održavanju može koštati 800–2.000 EUR.',
 'sections': [
  {'h2': 'Kako radi turbo', 'paras': [
   'Turbopunjač koristi energiju izduvnih gasova da zavrti kompresorsku kolu koja gurati više vazduha u motor. Više vazduha = više goriva = više snage. Osa turbine se vrti do <strong>300.000 okretaja/min</strong> — podmazivanje uljem je kritično.',
  ]},
  {'h2': 'Ulje — broj jedan za turbo', 'paras': [
   'Turbo se podmazuje motornim uljem. Ako ulje nije čisto, turbo lopatice se habe. <strong>Pravila</strong>: ulje mjenjaj na propisanom intervalu (max 15.000 km), nikad ne koristi mineralnog ulja (samo sintetika LongLife ili VW 504/507). Nivo ulja provjeri jednom godišnje.',
  ]},
  {'h2': 'Zagrijavanje i hlađenje', 'paras': [
   '<strong>Ne gazi gas odmah pri hladnom startu</strong> — daj motoru 30–60 sekundi da ulje dođe do turbine. <strong>Ne gasiti motor odmah nakon jake vožnje</strong> — turbo je vruć, ulje se karamelizuje ako zastaviš. Vozi par minuta normalnom brzinom da se ohladi.',
  ]},
  {'h2': 'Simptomi kvara turbine', 'ul': [
   'Sivi/plavi dim iz auspuha pri ubrzavanju',
   'Gubitak snage, auto se puni sporo',
   'Zvuk zviždanja ili piskanja iz motora',
   'Porast potrošnje ulja',
   'Check engine lampica',
  ], 'paras': []},
 ],
 'cta': 'Prati servisne intervale u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Nikad ne propusti zamjenu ulja — podsjetnike prati u Driver Toolboxu',
 'related': [
  {'title': 'Kako birati motorno ulje', 'url': '/blog/ulje-motor-kako-birati'},
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'dpf-filter-odrzavanje',
 'title': 'DPF filter — čišćenje, zamjena i kako ga sačuvati',
 'desc': 'DPF filter — šta je, kako radi, kako se regeneriše i šta raditi kad se začepi. Cijena zamjene u Srbiji.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'DPF (Diesel Particulate Filter) filter za čestice je obavezan na dizelima od 2009. Skupo ga zamijeniti, a lako ga uništiti — naročito ako auto ide samo gradom. Evo kako ga sačuvati.',
 'sections': [
  {'h2': 'Šta je DPF i kako radi', 'paras': [
   'DPF je keramički filter u ispuhu koji hvata čestice čađe iz dizelskog sagijevanja. Kad se napuni, auto pokreće <strong>regeneraciju</strong> — sagorijeva čađu na 600°C. Za to treba vožnja autoputem (min. 20 min na 80+ km/h).',
  ]},
  {'h2': 'Grad ubija DPF', 'paras': [
   'Ako auto stalno ide po gradu, regeneracija se ne završava — filter se puni, motor prelazi u "emergency" način, potrošnja raste, snaga pada. <strong>Rješenje</strong>: jednom u 2 sedmice vozi 30 min autoputem da dozvoliš regeneraciju.',
   'Simptom začepljenog DPF: check engine + DPF lampica, povećana potrošnja, "auto nema snage". OBD sken pokazuje DPF pritisak.',
  ]},
  {'h2': 'Čišćenje vs zamjena', 'paras': [
   '<strong>Kemijsko čišćenje additivom</strong>: za filter koji je 60–80% začepljen. Dodaš aditivni preparat u gorivo, voziš autoputem. Rezultat varijabilan — 50–100 EUR. <strong>Ultrazvučno čišćenje u radionici</strong>: skidaju filter, čiste sonikatorom. 150–300 EUR, rezultat dobar. <strong>Zamjena DPF</strong>: 800–2.500 EUR zavisno od modela i da li je original ili aftermarket.',
  ]},
 ],
 'callout': {'title': 'Ne uklanjaj DPF:', 'text': 'DPF se u Srbiji smije ukloniti samo za oldtimer homologaciju. Automobil bez DPF pada tehnički pregled od 2025 — i kazna do 100.000 RSD.'},
 'callout_danger': True,
 'cta': 'Pokreni servisni podsjetnik u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Prati DPF status i servisnu historiju u jednom mestu',
 'related': [
  {'title': 'EGR ventil — simptomi', 'url': '/blog/egr-ventil-problemi'},
  {'title': 'Zimovanje dizelnog motora', 'url': '/blog/kako-zimovati-dizel'},
 ],
},

{
 'slug': 'egr-ventil-problemi',
 'title': 'EGR ventil — simptomi kvara i šta raditi',
 'desc': 'EGR ventil — šta je, simptomi začepljenja, čišćenje ili zamjena i koliko košta servis.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'EGR ventil je jedan od najčešćih uzroka check engine lampice na dizelskim autima. Srećom, u ranoj fazi je jeftino rješenje — čišćenje. U kasnoj fazi zamjena košta 300–600 EUR.',
 'sections': [
  {'h2': 'Šta je EGR', 'paras': [
   'EGR (Exhaust Gas Recirculation) vraća dio izduvnih gasova nazad u usisni kolektor da smanji NOx emisije. Problem: zajedno s gasovima dolaze masne čađe koje se lijepe na ventil i usisne kanale.',
  ]},
  {'h2': 'Simptomi začepljenog EGR-a', 'ul': [
   'Check engine lampica (kod greške P0400–P0409)',
   'Auto škaklja / trzanje pri niskim okretajima',
   'Povećana potrošnja i gubitak snage',
   'Teže paljenje motora na hladnom',
   'Crni dim pri ubrzavanju',
  ], 'paras': []},
  {'h2': 'Čišćenje ili zamjena', 'paras': [
   'U 70% slučajeva dovoljna je <strong>dezintegracijska kupka ili ručno čišćenje EGR ventila</strong> — košta 80–200 EUR i rješava problem. Ako ventil mehhanički zakaže (ostane zatvoren ili otvoren) — zamjena: 200–500 EUR dijelova + rad.',
   'Čišćenje preporuči na svakih 100–150k km preventivno, naročito na autima koji pretežno voze po gradu.',
  ]},
 ],
 'cta': 'Prati servisnu historiju u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Evidentira servisna zbivanja i podsjeća na rokove',
 'related': [
  {'title': 'DPF filter — održavanje', 'url': '/blog/dpf-filter-odrzavanje'},
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'sta-je-100000-km-servis',
 'title': 'Šta se menja na 100.000 km — kompletan servisni pregled',
 'desc': 'Na 100.000 km obavezan je veliki servis. Lista šta treba mijenjati, koliko košta i zašto.',
 'tag': 'Servis', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Na 100.000 km mnogi dijelovi su na granici vijeka. Servis koji preskočite sad koštaće vas duplo za godinu-dvije. Evo kompletne liste šta treba pregledati i mijenjati.',
 'sections': [
  {'h2': 'Obavezan zamjeniti', 'ul': [
   'Zupčasti remen / lanac razvoda (ako remen, obavezno!)',
   'Vodena pumpa (najčešće se mjenja zajedno sa remenom)',
   'Termostát',
   'Svjećice (benzinci)',
   'Filter zraka, filter goriva, filter ulja',
   'Kočne pločice (provjeri, vjerovatno i diskove)',
   'Tečnost hladnjaka (5 godina ili 100k km)',
  ], 'paras': []},
  {'h2': 'Preporuča se provjeriti', 'ul': [
   'Amortizeri — ima li propuštanja, test kočenja',
   'Poluosovinski zglobovi i manšetne',
   'Klinasti remen (servo, alternatór, klimu)',
   'Baterija — kapacitet test',
   'Usisni ventili (direktno ubrizgavanje GDI/TFSI)',
  ], 'paras': ['Ukupna cijena velikog servisa varira od <strong>400 do 1.200 EUR</strong> zavisno od modela i marke.']},
  {'h2': 'Zašto je zupčasti remen kritičan', 'paras': [
   'Ako remen pukne u toku vožnje, motor se uništava u sekundi — klipovi udaraju u ventile. Cijena remonta motora: 2.000–5.000 EUR. Cijena zamjene remena: 200–600 EUR. <strong>Nikad ne odgađajte zamjenu remena.</strong>',
  ]},
 ],
 'cta': 'Prati servisne intervale u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Driver Toolbox bilježi historiju servisa i šalje podsjetnik za naredni',
 'related': [
  {'title': 'Timing remen vs lanac', 'url': '/blog/timing-remen-vs-lanac'},
  {'title': 'Kako birati motorno ulje', 'url': '/blog/ulje-motor-kako-birati'},
  {'title': 'Šta znače lampice na tabli', 'url': '/blog/sta-znace-lampice-na-tabli'},
 ],
},

{
 'slug': 'zimske-gume-obaveza-srbija',
 'title': 'Zimske gume — obaveza u Srbiji i kako ih odabrati',
 'desc': 'Kada su zimske gume obavezne u Srbiji, kazne, preporuke za marke i kako čuvati gume vansezone.',
 'tag': 'Saveti', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Zimske gume u Srbiji nisu zakonski obavezne — ali su praktično neophodne od novembra do marta. Znači li to da možete voziti ljetnim gumama? Možete — ali rizikujete novčanu kaznu i živote.',
 'sections': [
  {'h2': 'Zakonska obaveza', 'paras': [
   'Zakon o bezbjednosti saobraćaja ne propisuje obavezne zimske gume u Srbiji kao opštu mjeru, ali propisuje <strong>obavezno korišćenje zimske opreme za vozila u zimskim uslovima</strong>. Policija može kazniti vozača čija vozila nisu opremljena za uslove — kazna 5.000–10.000 RSD.',
   'U praksi: planinska područja (E-75, E-761, planinski putevi) znaju biti blokirani za vozila bez zimskih guma. Preporuča se montirati od <strong>15. novembra do 1. aprila</strong>.',
  ]},
  {'h2': 'Zimska vs all-season guma', 'paras': [
   'Zimska guma (3PMSF oznaka) je projektovana za temperaturu ispod 7°C — guma ostaje meka i prijanja. Ljetna guma postaje tvrda i skliska. <strong>All-season</strong> je kompromis — za blaže zime prihvatljiv, za planinu ili snijeg nedovoljan.',
  ]},
  {'h2': 'Čuvanje guma vansezone', 'ul': [
   'Čišćenje i sušenje prije skladištenja',
   'Skladišti stojeći (na stopu) ili obješen (bez naplatka)',
   'Tamno, suho, hladno mjesto — bez UV i ozona',
   'Torba za gume produljuje vijeka — sprječava isušivanje',
  ], 'paras': []},
 ],
 'cta': 'Provjeri troškove registracije za sezonu', 'cta_url': 'https://autouniverse.rs/kalkulatori/registracije',
 'cta_sub': 'AutoUniverse kalkulator troškova registracije',
 'related': [
  {'title': 'Kako čitati oznake na gumama', 'url': '/blog/kako-citati-oznake-na-gumama'},
  {'title': 'Kako zimovati dizel', 'url': '/blog/kako-zimovati-dizel'},
 ],
},

{
 'slug': 'kako-prepoznati-tocen-km',
 'title': 'Kako prepoznati točen kilometraž — 9 znakova',
 'desc': 'Točen kilometraž je čest pri prodaji polovnih auta. Naučite prepoznati lažnu kilometražu prije nego potrošite novac.',
 'tag': 'Kupovina', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Svaki treći polovni auto u Srbiji ima točenu kilometražu — statistika je poražavajuća. Ali postoji niz fizičkih i digitalnih znakova koji otkrivaju prevaru, i možete ih sami provjeriti.',
 'sections': [
  {'h2': 'Fizički znakovi', 'paras': [
   '<strong>Habanje unutrašnjosti</strong>: ako su sjedišta izlizana, pedala istrošena, upravljač bez boje na 11 i 1 — a auto navodno ima 80k km — nešto ne štima. Ove stvari ne mogu se lako zamijeniti.',
   '<strong>Servisna naljepnica pod haubicom</strong>: stara naljepnica sa "Sljedeći servis: 185.000 km" je direktni dokaz. Provjeri sve naljepnice u motornom prostoru.',
  ]},
  {'h2': 'Mehanički znakovi', 'ul': [
   'Istrošeni kočni diskovi i pločice (ne odgovaraju niskim km)',
   'Stare gume sa dubinom profila ispod 3mm (zamjenjuju se na 40–50k)',
   'Istrošeni amortizeri (popuštaju na 80–120k km)',
   'Zamjena remena dokumentovana na 180k km — a tvrde da ima 90k km',
  ], 'paras': []},
  {'h2': 'Digitalna provjera', 'paras': [
   '<strong>Servisna knjiga</strong>: kilo metrice po datumima — treba biti konzistentno. <strong>CarVertical ili AutoDNA</strong>: plaćene provjere VIN broja daju historiju km iz različitih servisnih zapisa. <strong>Tehnički pregled arhiva</strong>: uz VIN možete tražiti historiju tehničkih pregleda — svaki zapis ima km.',
   '<strong>OBD adapter</strong>: ECU memorija čuva rekordnu kilometražu. Specijalizovani alati je mogu očitati.',
  ]},
 ],
 'callout': {'title': 'Savjet:', 'text': 'Za auto od 8.000 EUR naviše, CarVertical ili AutoDNA provjera (20–30 EUR) je obavezna. Jeftinija od servisnog pregleda.'},
 'cta': 'Provjeri historiju servisa u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Driver Toolbox — evidentiraj historiju i prati real kilometražu',
 'related': [
  {'title': 'Kupovina polovnog auta u Srbiji', 'url': '/blog/kupovina-polovnog-auta-srbija'},
  {'title': 'Šta proveriti na test vožnji', 'url': '/blog/auto-pre-kupovine-test-voznja'},
 ],
},

{
 'slug': 'kad-menjati-amortizere',
 'title': 'Kad menjati amortizere — simptomi i cene',
 'desc': 'Istrošeni amortizeri su bezbedonosni rizik. Naučite prepoznati simptome i kad je vreme za zamenu.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Amortizeri rade tiho — do trenutka kad ih zaboravite. Istrošen amortizer produžava kočni put za 20% i čini auto nestabilnim u zavojima. Evo kako ih prepoznati i kada je pravo vreme za zamenu.',
 'sections': [
  {'h2': 'Simptomi istrošenih amortizera', 'ul': [
   'Auto "poskakuje" posle udarca u rupu (ne amortizuje)',
   'Preterano njihanje karoserije u zavojima',
   'Produžen kočni put — auto se ne zaustavlja brzo',
   'Neravnomerno habanje guma (talasasto)',
   'Zvuk kloparanja iz podvozja',
   'Vidljivo curenje ulja iz amortizera',
  ], 'paras': []},
  {'h2': 'Kada menjati', 'paras': [
   'Amortizeri se obično menjaju između <strong>80.000 i 150.000 km</strong>, zavisno od uslova vožnje. Planinska i loša putna infrastruktura ih troši brže. Test: pritisnite i otpustite prednji branik — auto treba da se vrati jednom bez dalnjeg poskakivanja.',
  ]},
  {'h2': 'Cene zamene', 'paras': [
   'Amortizeri se menjaju u paru (oba prednja ili oba zadnja). Prosečna cena za Srbiju: <strong>100–200 EUR po amortizeru + montaža</strong>. KYB ili Monroe aftermarket su prihvatljiv odnos cene i kvaliteta.',
  ]},
 ],
 'cta': 'Evidentiraj zamenu amortizera u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Prati servisnu istoriju i troškove vozila u jednom mestu',
 'related': [
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
  {'title': 'Zamena kočnih diskova', 'url': '/blog/zamena-kocnih-diskova'},
 ],
},

{
 'slug': 'zamena-kocnih-diskova',
 'title': 'Zamena kočnih diskova — kada i koliko košta',
 'desc': 'Kočni diskovi i pločice — kada ih menjati, kako proveriti habanje i cene za Srbiju 2026.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Kočni sistem je najvažniji bezbednosni sistem na autu. Istrošene pločice i diskovi direktno utiču na kočni put. Evo kako da znate kad je vreme za zamenu i koliko to košta.',
 'sections': [
  {'h2': 'Kočne pločice — kada menjati', 'paras': [
   'Pločice treba menjati kada profilna dubina padne ispod <strong>3 mm</strong> (limit je 2mm ali na 3mm je bezbednost već kompromisovana). Moderni auti imaju senzor koji pali lampicu na tabli.',
   'Prosečan vek: <strong>30.000–60.000 km</strong> zavisno od stila vožnje. Agresivno kočenje ih troši duplo brže.',
  ]},
  {'h2': 'Kočni diskovi', 'paras': [
   'Diskovi traju duže od pločica — obično 2 kompleta pločica na 1 komplet diskova. Menjajte kada debljina padne ispod minimalne (oznaka na samom disku). Znaci habanja: žlebovi, pukotine, neravnomerna površina.',
  ]},
  {'h2': 'Cene za Srbiju 2026', 'ul': [
   'Prednje pločice (aftermarket): 20–50 EUR',
   'Zadnje pločice: 15–40 EUR',
   'Prednji diskovi (par, aftermarket): 50–120 EUR',
   'Zadnji diskovi (par): 40–90 EUR',
   'Montaža (oba prednja tocka): 30–60 EUR',
  ], 'paras': []},
 ],
 'cta': 'Prati servise i troškove u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Evidentiraj zamenu kočnica i dobijaj podsetnike na vreme',
 'related': [
  {'title': 'Kad menjati amortizere', 'url': '/blog/kad-menjati-amortizere'},
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'praznjenje-klime-znakovi',
 'title': 'Znaci da klima gubi freon — i šta raditi',
 'desc': 'Kako prepoznati da auto klima gubi freon, cena punjenja klime i kada je kvar ozbiljan.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 4,
 'lead': 'Klima u autu po definiciji gubi mali procenat freona godišnje — to je normalno. Kad gubitak postane velik, hlađenje slabi. Evo simptoma i šta da radite.',
 'sections': [
  {'h2': 'Simptomi prazne klime', 'ul': [
   'Vazduh iz klime nije hladан kao ranije',
   'Auto se hladi jedva na najjačoj brzini ventilatora',
   'Kompressor klime počinje i odmah se gasi',
   'Led na cevima klime u motornom prostoru',
  ], 'paras': []},
  {'h2': 'Šta raditi', 'paras': [
   'Servis klime uključuje: provjeru curenja UV bojom + UV lampom, punjenje freona (R134a ili novi R1234yf) i dodavanje lubrikanta za kompresor. Cijena: <strong>60–150 EUR</strong> zavisno od tipa freona i količine.',
   'Ako kompressor škripi ili klima uopšte ne radi — moguć kvar kompresora (300–800 EUR) ili magnetne spojke (100–250 EUR). Provjeri prije nego daš auto na servis.',
  ]},
 ],
 'cta': 'Prati servisnu historiju klime u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Servisni podsjetnik — klima, ulje, gume sve na jednom mestu',
 'related': [
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'sta-je-timing-belt-interval',
 'title': 'Interval zamene zupčastog remena — po motorima',
 'desc': 'Zupčasti remen — kada menjati po tipu motora, cena zamene i posledice ignorisanja.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Zupčasti remen razvoda je jedan od rijetkih dijelova auta čije pucanje momentalno uništava motor. Zamjena košta 200–600 EUR. Remonт motora 2.000–6.000 EUR. Matematika je jasna.',
 'sections': [
  {'h2': 'Remen ili lanac — kako znate', 'paras': [
   'Lanac je metalan — bučniji ali obično dugovječniji (mijenja se rjeđe ili nikad). Remen je gumenа traka — tiši ali ima rok. Provjeri u tehničkim specifikacijama ili u servisnoj knjizi.',
  ]},
  {'h2': 'Intervali zamene po motorima', 'ul': [
   'VW 1.9 TDI: 120.000 km ili 5 godina',
   'VW 1.6 TDI / 2.0 TDI EA189: 180.000 km / 5 god',
   'Peugeot/Citroën 1.6 HDi: 120.000 km / 5 god',
   'Ford 1.6 TDCi: 100.000 km / 5 god (kritičan motor!)',
   'Renault 1.5 dCi K9K: 120.000 km / 5 god',
   'Toyota 1.6 VVT-i: lanac (nikad ne menjati rutinski)',
   'BMW 2.0d N47: lanac ali poznat po pucanju na 150k km',
  ], 'paras': []},
  {'h2': 'Šta se menja zajedno sa remenom', 'paras': [
   'Uvek: <strong>tensioner (napinjač), vodilice, vodena pumpa</strong> (ako ju je remen pokretao). Posebno vodena pumpa — ako pusti na 50k km posle zamjene remena, remen tone u vodu i puca. Radite sve odjednom.',
  ]},
  {'h2': 'Cijena u Srbiji 2026', 'paras': [
   'Remen + napinjač + vodena pumpa na prosječnom autu: <strong>250–550 EUR</strong> zavisno od modela. Golf 6 TDI npr. oko 350 EUR sve. Ford 1.6 TDCi nešto skuplje zbog kompleksnosti.',
  ]},
 ],
 'callout': {'title': 'Bez potvrde — ne kupuj:', 'text': 'Pri kupovini polovnog auta zahtevaj dokaz o zameni remena. Ako ga nema — uračunaj zamenu u pregovaranje o ceni.'},
 'cta': 'Prati rok zamene remena u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Driver Toolbox — unesi zamenu remena, dobijaj podsjetnik na vreme',
 'related': [
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
  {'title': 'Timing remen vs lanac', 'url': '/blog/timing-remen-vs-lanac'},
 ],
},

{
 'slug': 'kako-zimovati-dizel',
 'title': 'Zimovanje dizelnog motora — saveti i priprema',
 'desc': 'Kako pripremiti dizel auto za zimu: gorivo, baterija, ulje, grijači i šta nikako ne smete raditi.',
 'tag': 'Saveti', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Dizel motor na hladnoći može biti problematičan — ali samo ako niste pripremljeni. Sa pravim gorivom, baterijom i uljem, dizel se pali i na -20°C bez problema.',
 'sections': [
  {'h2': 'Zimsko dizel gorivo', 'paras': [
   'Srbija propisuje zimsku formulaciju dizela od 1. novembra do 31. marta. Standardni D2 dizel na jakim mrazevima može <strong>parafinisat</strong> (stvoriti voskaste naslage) i začepiti filter. Zimski dizel je formulisan da izdrži do -20°C.',
   'Ako napunite ljetni dizel pred zimu i nastupe mrazevi — dodajte anti-gel aditivni preparat.',
  ]},
  {'h2': 'Baterija — najčešći krivac', 'paras': [
   'Dizel treba više struje za paljenje nego benzinac. Baterija na 4 ili više godina gubi kapacitet — na hladnoći se to dramatično manifestuje. Provjeri bateriju na servisu krajem oktobra.',
  ]},
  {'h2': 'Ulje za zimu', 'paras': [
   'Moderni sintetički motorna ulja (5W-30, 5W-40) su odlična za zimske uslove — "5W" znači da ulje ostaje tečno do -25°C. Ako koristite staro mineralno ulje — promijenite na sintetiku prije zime.',
  ]},
  {'h2': 'Grijač motora i sjeckice', 'paras': [
   'Sjeckice (glow plugs) zagrijavaju komoru sagorijevanja pred paljenje. Pokvarena sjeckica znači teško paljenje i bijeli dim. Zamjena sjeckice: 15–40 EUR komad + rad.',
  ]},
 ],
 'cta': 'Kalkuliraj troškove zimske registracije', 'cta_url': 'https://autouniverse.rs/kalkulatori/registracije',
 'cta_sub': 'AutoUniverse kalkulator — troškovi registracije i osiguranja',
 'related': [
  {'title': 'DPF filter — održavanje', 'url': '/blog/dpf-filter-odrzavanje'},
  {'title': 'Zimske gume — obaveza u Srbiji', 'url': '/blog/zimske-gume-obaveza-srbija'},
 ],
},

{
 'slug': 'pad-vrednosti-automobila',
 'title': 'Kako automobili gube vrednost — i kako to koristiti',
 'desc': 'Amortizacija automobila — koji auti najbrže gube vrednost i kako kupiti auto koji ne deprecijuje.',
 'tag': 'Finansije', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Automobil gubi na vrijednosti od trenutka kad ga odnesete od prodavca. Ali postoje marke i modeli koji deprecijuju sporije — i kupci koji to znaju štede hiljade eura.',
 'sections': [
  {'h2': 'Prosječna deprecijacija po segmentima', 'paras': [
   'Novi auto u prvoj godini gubi oko <strong>20–25% vrijednosti</strong>. Do pet godina, prosječno gubi 50–60% startne cijene. Luksuzni i električni auti gube brže.',
  ]},
  {'h2': 'Koji auti zadržavaju vrednost', 'ul': [
   'Toyota i Lexus — najsporija deprecijacija konzistentno',
   'Porsche — SUVs (Cayenne, Macan) drže se odlično',
   'VW GTI / Golf R — sport i limited edicije sporo padaju',
   'Honda Civic — pouzdanost znači tražnja',
  ], 'paras': []},
  {'h2': 'Koji auti brzo gube vrednost', 'ul': [
   'Britanski luksuzni brendovi (Jaguar, Land Rover stariji)',
   'Električni auti prve generacije (Nissan Leaf, BMW i3)',
   'Auti sa skupim kvarovima (Mercedes W203 SBC, Audi DSG stariji)',
  ], 'paras': []},
  {'h2': 'Kako to koristiti pri kupovini', 'paras': [
   'Kupujte auto koji je imao svog "najveći pad" — tj. nakon 2–3 godine od novog. U tom trenutku prethodni vlasnik je apsorbovao najveći gubitak. Dobri primjeri: Toyota Corolla 2–3 godine stara, VW Passat 3 godine star.',
  ]},
 ],
 'cta': 'Izračunaj ukupan trošak vlasništva (TCO)', 'cta_url': 'https://autouniverse.rs/kalkulatori/tco',
 'cta_sub': 'AutoUniverse TCO kalkulator — koliko vas stvarno košta auto',
 'related': [
  {'title': 'Godišnji troškovi automobila', 'url': '/blog/godisnji-troskovi-automobila'},
  {'title': 'Kako prodati auto brže', 'url': '/blog/kako-prodati-auto-brze'},
 ],
},

{
 'slug': 'auto-pre-kupovine-test-voznja',
 'title': 'Šta proveriti na test vožnji — 12 tačaka',
 'desc': 'Test vožnja pri kupovini polovnog auta — šta obavezno proveriti, na šta obratiti pažnju i crvene zastavice.',
 'tag': 'Kupovina', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Test vožnja je vaša poslednja linija odbrane pre nego potpišete ugovor. Mnogi kupci provedu 10 minuta u autu i ne primete ništa. Evo 12 konkretnih tačaka koje trebate proveriti.',
 'sections': [
  {'h2': 'Pre nego krenete', 'paras': [
   'Tražite da auto bude HLADAN — ne da ga prodavac zagrije pre vašeg dolaska. Hladan start otkriva: paljenje, zvukove motora, turbo ponašanje. Topao motor maskira simptome.',
  ]},
  {'h2': '12 tačaka na test vožnji', 'ul': [
   '1. Hladni start — kakav zvuk, pali li se brzo',
   '2. Upozorenja na tabli — ima li lampica pre vožnje',
   '3. Kočenje na 50 km/h — auto ide ravno ili vuče na stranu',
   '4. Ubrzanje 0–80 km/h — turbo radi, nema trzanja',
   '5. Automatik (DSG): prelaz 1→2 bez oklijevanja i trzanja',
   '6. Servovolán — lakši kad se vozi, nema mrtvog hoda',
   '7. Zvuci iz podvozja na neravninama',
   '8. Klima — hladi li na niskoj i visokoj postavci',
   '9. Kočni put — test kočenja bez ABS-a (prazna ulica)',
   '10. Motor na ralentiju — ravnomjeran ritam, bez vibracija',
   '11. Miris iz kupea — gorivo, ulje, plastika (svježe ofarbano?)',
   '12. Završetak vožnje — dim iz auspuha pri gašenju motora',
  ], 'paras': []},
 ],
 'cta': 'Provjeri historiju vozila na AutoUniverse', 'cta_url': 'https://autouniverse.rs/kalkulatori/vin',
 'cta_sub': 'VIN dekoder — provjeri porijeklo i podatke vozila',
 'related': [
  {'title': 'Kupovina polovnog auta u Srbiji', 'url': '/blog/kupovina-polovnog-auta-srbija'},
  {'title': 'Kako prepoznati točen km', 'url': '/blog/kako-prepoznati-tocen-km'},
 ],
},

{
 'slug': 'ulje-motor-kako-birati',
 'title': 'Kako birati motorno ulje — viskozitet i specifikacija',
 'desc': 'Motorno ulje — šta znači 5W-30, razlika mineral/sintetik, kako odabrati pravo ulje za vaš auto.',
 'tag': 'Tehnika', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Pogrešno motorno ulje može koštati motor. Nije sve ulje isto — razlika između 5W-30 i 10W-40 može biti razlika između zdravog i uništenog turbopunjača. Evo kratkog vodiča.',
 'sections': [
  {'h2': 'Šta znači 5W-30', 'paras': [
   '<strong>5W</strong> — viskozitet na hladnom (W = Winter). Niži broj = bolje podmazivanje pri hladnom startu. <strong>30</strong> — viskozitet na radnoj temperaturi. Viši broj = gušće ulje na vrućini. Za turbo motore sa tesnim zazorima — tanje ulje (5W-30 ili 0W-20) je bolje.',
  ]},
  {'h2': 'Mineral, polusintetik ili sintetik', 'paras': [
   '<strong>Mineralno ulje</strong>: za stare motore bez turbo. Mijenjaj na 7.500–10.000 km. <strong>Polusintetik</strong>: srednji razred. <strong>Puno sintetičko</strong>: obavezno za turbo, direktno ubrizgavanje i moderne motore s LongLife intervalom. Mijenjaj 15.000–30.000 km (zavisno od specifikacije).',
  ]},
  {'h2': 'VW specifikacije — primer', 'ul': [
   'VW 504.00 / 507.00: LongLife ulje za TDI sa DPF',
   'VW 502.00 / 505.00: standardni benzinci i dizeli bez DPF',
   'BMW Longlife-04: za BMW TwinPower motore',
  ], 'paras': ['Uvijek koristi ulje koje ima odobrenje proizvođača vašeg automobila — ne samo viskozitet.']},
 ],
 'cta': 'Prati intervale promene ulja u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Bilježi zamjenu ulja — Driver Toolbox pamti umjesto tebe',
 'related': [
  {'title': 'Turbo motor — pravilno održavanje', 'url': '/blog/turbo-motor-odrzavanje'},
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
 ],
},

{
 'slug': 'redovna-vs-agresivna-voznja',
 'title': 'Uticaj stila vožnje na trošenje auta — šta razlika pravi',
 'desc': 'Agresivna vožnja vs. mirna vožnja — kako stil vožnje utiče na troškove, habanje i pouzdanost.',
 'tag': 'Saveti', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Dva ista auta, isti broj kilometara, ali jedan ima uništene kočnice, turbinu i menjač — drugi jedva da je zahtevao servis. Razlika? Vozač. Evo šta agresivna vožnja konkretno košta.',
 'sections': [
  {'h2': 'Kočnice i gume', 'paras': [
   'Nagli zanosi i kasno kočenje skraćuju vek kočnih pločica za <strong>50–70%</strong>. Agresivno kretanje troši gume 3× brže. Samo normalnom vožnjom štefedite 100–200 EUR godišnje na gumama i kočnicama.',
  ]},
  {'h2': 'Motor i turbo', 'paras': [
   'Turbo se ne smije "sekirati" odmah pri hladnom startu. Agresivna vožnja bez zagrijavanja direktno skraćuje vek turbine. Treba: 30–60 sekundi mirnog ralentija. Esto košta 1.000 EUR.',
  ]},
  {'h2': 'Menjač i kvačilo', 'paras': [
   'Premjestanje mjenjača bez potpunog puštanja kvačila, "skidanje" kvačila u krivinama — sve to habanje kvačila. Na manuelnom DSG autu ovo znači 500–1.200 EUR ranije nego što bi trebalo.',
  ]},
  {'h2': 'Ekokološka i ekonomska računica', 'paras': [
   'Mirnija vožnja sa anticipiranjem saobraćaja smanjuje potrošnju za <strong>10–20%</strong>. Na 15.000 km godišnje sa dizelom — 200–400 EUR uštedni godišnje samo na gorivu.',
  ]},
 ],
 'cta': 'Prati troškove goriva i servisa u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Koliko te zaista košta auto — Driver Toolbox ti pokazuje sve',
 'related': [
  {'title': 'Turbo motor — pravilno održavanje', 'url': '/blog/turbo-motor-odrzavanje'},
  {'title': 'Kako smanjiti potrošnju goriva', 'url': '/blog/kako-smanjiti-potrosnju-goriva'},
 ],
},

{
 'slug': 'servis-sam-ili-ovlasceni',
 'title': 'Sam ili ovlašćeni servis — šta valja kada',
 'desc': 'Ovlašćeni vs. nezavisni servis — kada ići kod dilera, kada uštedjeti kod nezavisnog i šta nikad ne smete preskočiti.',
 'tag': 'Servis', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Ovlašćeni servis nije uvijek bolji — ali ponekad jeste jedina opcija. Znanje kada ići kod dilera i kada kod pouzdanog nezavisnog servisa može vam uštedjeti 30–50% troškova.',
 'sections': [
  {'h2': 'Kada ići u ovlašćeni servis', 'ul': [
   'Auto je na garanciji — obavezno kod dilera',
   'Recall kampanja (poziv na besplatnu popravku)',
   'Kvarovi vezani za elektroniku i softver (ECU reprogramiranje)',
   'Kvarovi pod jamstvo (lemon law)',
  ], 'paras': []},
  {'h2': 'Kada je nezavisni servis dovoljan', 'paras': [
   'Rutinski servisi (ulje, filteri, gume, kočnice) — svaki dobar nezavisni servis to radi jednako dobro za 30–50% manje. Ključno: tražite <strong>originalne ili OEM dijelove</strong> i račun (zapis za servisnu historiju).',
  ]},
  {'h2': 'Šta nikad ne smete preskočiti', 'paras': [
   'OBD sken posle bilo kog rada na motoru. Servisna knjiga — svaki servis mora biti upisan. Dokaz o zamijenjenim dijelovima (račun, stare dijelove za složenije radove).',
  ]},
 ],
 'cta': 'Bilježi servise u Driver Toolbox', 'cta_url': 'https://driver.autouniverse.rs',
 'cta_sub': 'Servisna historija na jednom mestu — ne zavisi od papirne knjige',
 'related': [
  {'title': 'Šta se menja na 100.000 km', 'url': '/blog/sta-je-100000-km-servis'},
  {'title': 'Servisna knjižica — značaj', 'url': '/blog/servisna-knjizica'},
 ],
},

{
 'slug': 'kako-prodati-auto-brze',
 'title': 'Kako brže prodati auto — 7 konkretnih saveta',
 'desc': 'Brza prodaja polovnog auta — priprema vozila, fotografije, tekst oglasa i pravna dokumentacija.',
 'tag': 'Prodaja', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Prosječno, auto stoji u oglasu 30–90 dana u Srbiji. Prodavci koji prate ovih 7 saveta prodaju za 7–14 dana. Razlika nije sreća — to je priprema.',
 'sections': [
  {'h2': '7 saveta koji rade', 'ul': [
   '1. Temeljito čišćenje — enterijer i eksterijer. Zaprljan auto signalizira nemar.',
   '2. Sitni popravci — žarulja, brisači, ogrebotina na felgi. Jefitno, ali kupac cijeni.',
   '3. Fotografije na danjem svjetlu, neutralna pozadina, sve 4 strane + enterijer + motor.',
   '4. Realna cijena — provjeri 5 sličnih oglasa i budi 5–10% ispod proseka za brzu prodaju.',
   '5. Naslov koji informiše: "VW Golf 6 1.6 TDI 2011, 165.000 km, servisna knjiga, DSG".',
   '6. Servisna knjiga pri ruci — kupci koji pitaju za nju su ozbiljni.',
   '7. Brze povratne informacije na poruke — svaki sat odlaganja gubi kupca.',
  ], 'paras': []},
  {'h2': 'Fotografije su presudne', 'paras': [
   'Oglasi s 10+ kvalitetnih fotografija dobijaju 3× više upita. Fotografirajte na osunčanom danu, auto operan i osušen. Uključite: prednja i zadnja strana, oba profila, enterijer prednji, zadnji, motor, gepek, i svi vidljivi defekti (transparentnost gradi povjerenje).',
  ]},
 ],
 'cta': 'Postavi auto na Autopijaca', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'AutoUniverse Autopijaca — postavi oglas za 2 minuta',
 'related': [
  {'title': 'Prodaja automobila — kako odrediti cenu', 'url': '/blog/prodaja-automobila-cena'},
  {'title': 'Promena vlasnika automobila', 'url': '/blog/promena-vlasnika-automobila'},
 ],
},

# ═══════════════════════════════════════════════════════════════════════════════
# TIER 3 — FINANSIJE, PRAVO, SPECIJALNI SCENARIJI (41–46)
# ═══════════════════════════════════════════════════════════════════════════════

{
 'slug': 'pdv-pri-kupovini-automobila',
 'title': 'PDV pri kupovini automobila — kada plaćate, kada ne',
 'desc': 'PDV na automobil u Srbiji — koji prenosi su oporezivi, kada je PDV uključen i kako to utiče na vaš džep.',
 'tag': 'Finansije', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Kupujete auto od fizičkog lica ili od firme? Uvozite iz EU? Svaki od ovih scenarija ima drugačiji PDV tretman. Greška može koštati hiljade dinara — ili propuštenu povrat.',
 'sections': [
  {'h2': 'Kupovina od fizičkog lica', 'paras': [
   'Prenos motornog vozila između dva fizička lica u Srbiji nije predmet PDV-a. Plaća se <strong>porez na prenos apsolutnih prava (PARP)</strong> — obično 2,5% od ugovorene vrijednosti ili tržišne procjene (što je veće).',
  ]},
  {'h2': 'Kupovina od firme (PDV obveznik)', 'paras': [
   'Ako firma prodaje auto i PDV obveznik je, cijena najčešće <strong>sadrži PDV 20%</strong>. Ako kupujete kao fizičko lice — cijeli PDV ostaje vaš trošak. Ako ste i vi firma i PDV obveznik i auto je za poslovne svrhe — možete povratiti PDV (uz uvjete).',
  ]},
  {'h2': 'Uvoz iz EU', 'paras': [
   'Pri uvozu privatnog vozila iz EU u Srbiju plaćate: <strong>carinu 1%</strong> (za EU porijeklo, CEFTA/EFTA ugovor), <strong>PDV 20%</strong> na carinsku vrijednost, i <strong>akcizu</strong> zavisno od ccm i starosti. Detaljan kalkulator: autouniverse.rs/kalkulatori/uvoza.',
  ]},
 ],
 'cta': 'Izračunaj troškove uvoza', 'cta_url': 'https://autouniverse.rs/kalkulatori/uvoza',
 'cta_sub': 'AutoUniverse kalkulator uvoza — carina, PDV, akciza sve na jednom mestu',
 'related': [
  {'title': 'Auto na firmu ili lično', 'url': '/blog/auto-na-firmu-ili-licno'},
  {'title': 'Uvoz automobila iz EU', 'url': '/blog/uvoz-automobila-iz-eu'},
 ],
},

{
 'slug': 'refinansiranje-auto-kredita',
 'title': 'Refinansiranje auto kredita — kada se isplati i kako',
 'desc': 'Refinansiranje auto kredita u Srbiji — kad je isplativo, koji uslovi trebaju biti ispunjeni i kako aplicirati.',
 'tag': 'Finansije', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Kamatne stope za auto kredite u Srbiji varirale su između 4% i 10% u posledrjih 5 godina. Ako ste uzeli kredit u periodu visokih kamatnih stopa — refinansiranje može uštediti stotine eura.',
 'sections': [
  {'h2': 'Kada refinansiranje ima smisla', 'ul': [
   'Kamatna stopa u vašem kreditu je 2+ % viša od trenutnih ponuda',
   'Ostalo je više od godinu dana otplate',
   'Nema (ili su male) naknade za prijevremenu otplatu',
   'Vaš kreditni rejting se poboljšao od prvog kredita',
  ], 'paras': []},
  {'h2': 'Kako funkcioniše', 'paras': [
   'Banka 2 isplati ostatak duga Banci 1 — vi nastavite plaćati Banci 2 po novim uslovima. Troškovi: naknada za prijevremenu otplatu (tipično 1–3%), procjena vozila, administrativni troškovi.',
  ]},
  {'h2': 'Matematički primjer', 'paras': [
   'Kredit 10.000 EUR, ostatak 7.000 EUR, 3 godine, stara kamatna stopa 9% → nova 5.5%. Ušteda na kamatama: oko 650 EUR. Minus troškovi refinansiranja oko 200 EUR. <strong>Neto ušteda: ~450 EUR</strong> — vrijedi.',
  ]},
 ],
 'cta': 'Izračunaj auto kredit', 'cta_url': 'https://autouniverse.rs/kalkulatori/kredit',
 'cta_sub': 'AutoUniverse kalkulator kredita — rate, kamate, ukupni troškovi',
 'related': [
  {'title': 'Auto kredit u Srbiji', 'url': '/blog/auto-kredit-srbija'},
  {'title': 'Leasing vs kredit', 'url': '/blog/leasing-vs-kredit'},
 ],
},

{
 'slug': 'prodaja-auta-u-inostranstvo',
 'title': 'Prodaja auta u inostranstvo — procedura i saveti',
 'desc': 'Kako prodati auto kupcu iz inostranstva — dokumenti, izvozne tablice, PDV i carinska procedura.',
 'tag': 'Pravno', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Sve više kupaca dolazi iz BiH, Crne Gore i North Makedonije da kupe aute u Srbiji. Prodaja kupcu iz inostranstva je legalna i finansijski zanimljiva — ali zahtijeva ispravnu dokumentaciju.',
 'sections': [
  {'h2': 'Ko može kupiti auto iz Srbije', 'paras': [
   'Fizičko ili pravno lice iz bilo koje zemlje može kupiti auto u Srbiji. Kupac mora sam organizovati uvoznu carinu u svojoj zemlji. Vi kao prodavac ne odgovarate za carinu kupca.',
  ]},
  {'h2': 'Dokumenti i procedura', 'ul': [
   'Kupoprodajni ugovor (na ćirilici ili latinici, bez prevoda)',
   'Odjava vozila kod MUP-a — dobijate potvrdu o odjavi',
   'Predaja tablica kod MUP-a ili na odjavnom šalteru',
   'Kupac sam organizuje uvoz i registraciju u svojoj zemlji',
  ], 'paras': []},
  {'h2': 'Uklanjanje PDV-a (za firme)', 'paras': [
   'Ako ste firma i prodajete auto kupcu izvan Srbije, prodaja može biti oslobođena PDV-a kao izvoz — potrebni dokazi o izvoznoj carinskoj deklaraciji. Konsultujte računovođu.',
  ]},
 ],
 'cta': 'Postavi oglas na Autopijaca', 'cta_url': 'https://autopijaca.autouniverse.rs',
 'cta_sub': 'AutoUniverse Autopijaca — tvoj oglas vidi čitav region',
 'related': [
  {'title': 'Promena vlasnika automobila', 'url': '/blog/promena-vlasnika-automobila'},
  {'title': 'Kako prodati auto brže', 'url': '/blog/kako-prodati-auto-brze'},
 ],
},

{
 'slug': 'nasledjivanje-automobila',
 'title': 'Nasleđivanje automobila — procedura korak po korak',
 'desc': 'Kako prepisati automobil nasleđem — dokumenti, troškovi, rokovi i šta ako auto ima kredit.',
 'tag': 'Pravno', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Nasleđivanje automobila u Srbiji je standardna pravna procedura, ali zahtijeva tačnu dokumentaciju i poštovanje rokova. Evo šta tačno trebate i koliko to košta.',
 'sections': [
  {'h2': 'Procedura korak po korak', 'ul': [
   '1. Prijaviti smrt i pokrenuti ostavinsku raspravu kod suda/javnog beležnika',
   '2. U ostavinskom postupku navesti vozilo kao imovinu (saobraćajna dozvola, procena vrednosti)',
   '3. Ostavinski rešenje/ugovor o nasledjivanju — sudski ili kod javnog beležnika',
   '4. Registracija na novo ime u MUP (dokument o nasledjivanju + saobraćajna dozvola)',
   '5. Osiguranje i tehnički pregled (ako isteklo)',
  ], 'paras': []},
  {'h2': 'Troškovi', 'paras': [
   'Taksa na nasleđivanje za prvu naslednu grupu (bračni drug, djeca): <strong>0% poreza na nasleđivanje</strong>. Druga nasledna grupа (roditelji, braća, sestre): 1,5%. Treća i dalja: 2,5%. Plus sudske takse i javnobilježničke naknade: 5.000–20.000 RSD.',
  ]},
  {'h2': 'Šta ako auto ima leasing ili kredit', 'paras': [
   'Ako auto ima aktivni kredit ili leasing, nasljednik mora kontaktirati finansijsku instituciju — preuzimanje obaveze ili prijevremena otplata. Leasing se ne može automatski prenijeti.',
  ]},
 ],
 'cta': 'Provjeri troškove registracije', 'cta_url': 'https://autouniverse.rs/kalkulatori/registracije',
 'cta_sub': 'AutoUniverse kalkulator registracije — sve takse na jednom mestu',
 'related': [
  {'title': 'Promena vlasnika automobila', 'url': '/blog/promena-vlasnika-automobila'},
  {'title': 'Odjava vozila', 'url': '/blog/odjava-vozila'},
 ],
},

{
 'slug': 'procena-stete-nakon-nesrece',
 'title': 'Procena štete nakon saobraćajne nesreće — vodič',
 'desc': 'Šta raditi posle saobraćajne nesreće u Srbiji — procena štete, osiguranje, sudski veštak i prava.',
 'tag': 'Pravno', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Nesreća se desila — šok je prošao, sad treba da zaštitite svoja prava. Svaki korak koji preskočite sada može biti skupo propuštena šansa. Evo preciznog vodiča.',
 'sections': [
  {'h2': 'Na licu mesta', 'ul': [
   'Fotografirajte sve — poziciju vozila, oštećenja, saobraćajne znakove',
   'Europsko izveštaj o nesreći (plavi obrazac) — popuniti precizno',
   'Ne premeštati vozila dok se ne fotografišu (osim ako blokiraju saobraćaj)',
   'Podaci svedoka — ime, telefon',
   'Prijavite policiji ako ima povređenih ili ozbiljnih oštećenja',
  ], 'paras': []},
  {'h2': 'Procena štete i osiguranje', 'paras': [
   'Kontaktirajte svoju osiguravajuću kompaniju u roku <strong>3 dana od nesreće</strong> (ili po ugovoru). Osiguravajuće kompanije šalju svog procjenitelja koji procjenjuje štetu. Vi imate pravo angažovati nezavisnog procjenitelja ako se ne slažete.',
  ]},
  {'h2': 'Nezadovoljni procjenom', 'paras': [
   'Ako osiguravajuća kuća nudi manje od realne štete — angažujte sudskog vještaka za motorna vozila. Cijena: 10.000–30.000 RSD, ali često se višestruko isplati. Sudski postupak može trajati 6–18 meseci ali presude su u pravilu u korist oštećenog.',
  ]},
 ],
 'callout': {'title': 'Rok prijave:', 'text': 'Prijavite nesreću osiguravaču u roku propisanom policom — najčešće 3–8 dana. Kasna prijava može biti razlog odbijanja štete.'},
 'cta': 'Provjeri AO osiguranje i kalkuliraj cijenu', 'cta_url': 'https://autouniverse.rs/kalkulatori/osiguranje',
 'cta_sub': 'AutoUniverse kalkulator osiguranja — orijentacione cijene AO',
 'related': [
  {'title': 'Šta uraditi posle nesreće', 'url': '/blog/sta-uraditi-posle-nesrece'},
  {'title': 'Kasko osiguranje', 'url': '/blog/kasko-osiguranje'},
 ],
},

{
 'slug': 'auto-na-firmu-ili-licno',
 'title': 'Auto na firmu ili lično — šta se više isplati',
 'desc': 'Da li je bolje kupiti auto na firmu ili na fizičko lice? Porezne implikacije, PDV, amortizacija i troškovi.',
 'tag': 'Finansije', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Preduzetnici i direktori firmi često pitaju: auto na firmu ili na moje ime? Odgovor zavisi od nekoliko faktora — i nije uvijek isti za sve.',
 'sections': [
  {'h2': 'Auto na firmu — prednosti', 'ul': [
   'Troškovi goriva, servisa i registracije su poreski trošak firme',
   'Amortizacija vozila smanjuje poresku osnovicu',
   'PDV na kupovinu se može odbiti (ako je firma PDV obveznik)',
   'Lizing je dostupan i bez ličnog zaduživanja',
  ], 'paras': []},
  {'h2': 'Auto na firmu — ograničenja', 'paras': [
   'Ako vozilo koristite i privatno — Poreska uprava može smatrati to prihodom u naturi (tzv. <strong>fringe benefit</strong>) i oporezivati vam ga. Da bi izbjegli, auto treba biti u upotrebi isključivo za poslovne svrhe ili treba voditi preciznu evidenciju.',
  ]},
  {'h2': 'Auto na fizičko lice', 'paras': [
   'Nema poreskog odbitka. Ali: nema ni rizika od fringe benefit poreza, auto ostaje vaše bez obzira na sudbinu firme. Otplata iz privatnog računa, vlasništvo lično.',
  ]},
  {'h2': 'Zaključak', 'paras': [
   'Ako je auto pretežno poslovni i firma je PDV obveznik — firmin auto se finansijski isplati. Ako kombinirate privatno i poslovno — konsultujte poreskog savjetnika.',
  ]},
 ],
 'cta': 'Izračunaj TCO vozila', 'cta_url': 'https://autouniverse.rs/kalkulatori/tco',
 'cta_sub': 'AutoUniverse TCO kalkulator — ukupni troškovi vlasništva',
 'related': [
  {'title': 'Auto kredit u Srbiji', 'url': '/blog/auto-kredit-srbija'},
  {'title': 'Godišnji troškovi automobila', 'url': '/blog/godisnji-troskovi-automobila'},
 ],
},

# ═══════════════════════════════════════════════════════════════════════════════
# TIER 4 — EV EKOSISTEM DOPUNA (47–50)
# ═══════════════════════════════════════════════════════════════════════════════

{
 'slug': 'ev-punjenje-na-autoputu-srbija',
 'title': 'EV punjenje na autoputu u Srbiji — 2026. vodič',
 'desc': 'Gde se pune električna vozila na srpskim autoputevima 2026 — mreža punjača, cene i saveti.',
 'tag': 'Električni', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Putovanje elektricnim autom po Srbiji 2026. je moguće — ali zahtijeva planiranje. Mreža DC brzih punjača raste, ali još uvijek ima slijepih tačaka. Evo gdje ste sigurni i gdje ne.',
 'sections': [
  {'h2': 'Stanje mreže 2026.', 'paras': [
   'Srbija ima <strong>300+ javnih punjača</strong> (kraj 2025), od kojih je oko 80 DC brzih punjača (CCS, CHAdeMO, Tesla). Koridori E-75 (Beograd–Niš) i E-763 (Beograd–Požega) relativno dobro pokriven. Koridor prema Makedoniji i Bugarskoj ima praznine.',
  ]},
  {'h2': 'Mreže punjača u Srbiji', 'ul': [
   'E.ON Drive — 50–150 kW DC, plaća se po kWh kartom ili app',
   'Tesla Supercharger — u Beogradu, Nišu, Novom Sadu (samo Tesla vozila)',
   'NIS punjači (petrol stanice) — AC punjači 22 kW, sporiji ali dostupniji',
   'EkoPoint — razne lokacije, 50–100 kW DC',
   'WattDrive — Šumadija i Vojvodina',
  ], 'paras': []},
  {'h2': 'Praktični saveti za putovanje', 'paras': [
   'Pravilo 80/20: napuni na 80%, ne čekaj 20%. Brzina punjenja pada od 80% brzo. Za dug put planicirajte punjenje na 200–250 km. App-ovi: ChargeMap, A Better Route Planner (ABRP) — prikaz dostupnih punjača u realnom vremenu.',
  ]},
 ],
 'cta': 'Kalkulator potrošnje i troškova', 'cta_url': 'https://autouniverse.rs/kalkulatori/potrosnja',
 'cta_sub': 'AutoUniverse kalkulator — uporedi troškove benzinca, dizela i EV',
 'related': [
  {'title': 'Električni auto zimi — pad autonomije', 'url': '/blog/elektricni-auto-zima-autonomija'},
  {'title': 'Javne punjačice u Srbiji', 'url': '/blog/javne-punjacice-srbija'},
  {'title': 'Električni auto u Srbiji 2026', 'url': '/blog/elektricni-auto-srbija-2026'},
 ],
},

{
 'slug': 'elektricni-auto-zima-autonomija',
 'title': 'Električni auto zimi — koliko pada autonomija i šta raditi',
 'desc': 'Zima i električni auto — zašto baterija gubi autonomiju na hladnoći i kako to minimizovati.',
 'tag': 'Električni', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Zimska anksioznost je realna — električni auto na -10°C može izgubiti 30–40% autonomije. Ali uz prave navike, to nije dramtičan problem. Evo šta se stvarno dešava i kako reagovati.',
 'sections': [
  {'h2': 'Zašto baterija gubi kapacitet na hladnoći', 'paras': [
   'Litij-ionske ćelije imaju optimalni radni raspon 15–35°C. Na hladnoći, hemijska reakcija je sporija — baterija ne može da isporuči ni pohrani puni kapacitet. Efekt je privremen — kad se baterija zagrije, kapacitet se vraća.',
   '<strong>Tipičan gubitak</strong>: 20–30% na 0°C, do 35–40% na -10°C i ispod. Dakle auto sa deklarisanih 400 km može dati 280–300 km zimi.',
  ]},
  {'h2': 'Kako minimizovati gubitak', 'ul': [
   'Predkondicioniranje — zagrij kabinu dok je auto priključen na punjač (troši struju iz mreže, ne baterije)',
   'Grijano sjedište umjesto grijanja zraka — puno efikasnije',
   'Smanjiti brzinu na autoputu — aerodinimički otpor raste eksponencijalno',
   'Tople gume prije polaska',
   'Regenerativno kočenje postaviti na maximum',
  ], 'paras': []},
  {'h2': 'Punjenje zimi', 'paras': [
   'DC brzi punjači zimi rade sporije dok se baterija ne zagrije do radne temperature. Moderni EV (Tesla, Hyundai Ioniq 5, Kia EV6) imaju <strong>baterijski management sistem</strong> koji zagrijava bateriju pred brzo punjenje — automatski.',
  ]},
 ],
 'cta': 'Kalkulator troškova EV vs benzinac', 'cta_url': 'https://autouniverse.rs/kalkulatori/tco',
 'cta_sub': 'AutoUniverse TCO — ukupni troškovi benzinca, hibrida i EV',
 'related': [
  {'title': 'EV punjenje na autoputu', 'url': '/blog/ev-punjenje-na-autoputu-srbija'},
  {'title': 'EV baterija — zamena i cena', 'url': '/blog/ev-baterija-zamena-cena'},
 ],
},

{
 'slug': 'ev-baterija-zamena-cena',
 'title': 'EV baterija — zamena i cena 2026',
 'desc': 'Koliko košta zamena baterije u električnom autu, kada je potrebna i kako sačuvati bateriju duže.',
 'tag': 'Električni', 'date_sr': '10. septembra 2026.', 'mins': 6,
 'lead': 'Zamjena baterije je strašilo EV kupaca — ali koliko zaista košta i da li je to realan scenario? Statistike pokazuju da mnogi vlasnici nikad ne zamjene bateriju. Evo šta zaista trebate znati.',
 'sections': [
  {'h2': 'Koliko traje EV baterija', 'paras': [
   'Moderna EV baterija projektovana je za <strong>1.500–2.000 punjenjaksa ciklusa</strong> sa zadržavanjem 80% kapaciteta. Pri 15.000 km godišnje i 250 km punjenja, to je <strong>12–15 godina</strong> normalne upotrebe.',
   'Statistike iz prakse: Tesla Model 3 sa 300.000 km ima prosječno 88–92% originalnog kapaciteta. Hyundai/Kia garantuju 70% kapaciteta 10 godina/200.000 km.',
  ]},
  {'h2': 'Cena zamene baterije 2026', 'paras': [
   'Cene su pale dramatično u posljednjih 5 godina. Orijentacione cijene u Srbiji (2026): <strong>Nissan Leaf (40 kWh): 6.000–8.000 EUR. Renault Zoe: 7.000–10.000 EUR. Tesla Model 3: 12.000–18.000 EUR. Hyundai Ioniq 5: 14.000–20.000 EUR.</strong>',
   'Alternativa: regenerisane (refurbished) baterije koštaju 40–60% manje od originalnih.',
  ]},
  {'h2': 'Kako produžiti vek baterije', 'ul': [
   'Ne punjati iznad 80% svakodnevno (80% je dovoljno za gradsku vožnju)',
   'Izbjegavati pražnjenje ispod 10%',
   'Ne koristiti DC brzo punjenje svaki dan',
   'Čuvati auto na temperaturama 15–25°C kad je moguće',
  ], 'paras': []},
 ],
 'cta': 'Izračunaj TCO EV vs benzinac', 'cta_url': 'https://autouniverse.rs/kalkulatori/tco',
 'cta_sub': 'AutoUniverse TCO kalkulator — uključuje troškove baterije',
 'related': [
  {'title': 'Električni auto zimi', 'url': '/blog/elektricni-auto-zima-autonomija'},
  {'title': 'EV punjenje na autoputu', 'url': '/blog/ev-punjenje-na-autoputu-srbija'},
 ],
},

{
 'slug': 'javne-punjacice-srbija',
 'title': 'Javne punjačice u Srbiji — mapa i statusi 2026',
 'desc': 'Pregled javnih EV punjačica u Srbiji 2026: mreže, lokacije, tipovi konektora i aplikacije.',
 'tag': 'Električni', 'date_sr': '10. septembra 2026.', 'mins': 5,
 'lead': 'Srbija 2026. ima solidnu osnovu EV infrastrukture u gradovima, ali ruralna područja i manji putevi još uvijek imaju praznine. Ovaj vodič vam pomaže da pronađete punjač i znate čemu se nadati.',
 'sections': [
  {'h2': 'Tipovi punjača', 'paras': [
   '<strong>AC spori (Mode 2, 3.7–22 kW)</strong>: kućni i javni zidni punjači. Punjenje od 0 do 100% traje 4–12h. Idealan za noćno punjenje. <strong>DC brzi (50–150+ kW)</strong>: puni 100–200 km za 20–40 minuta. Na autoputevima i shopping centrima.',
  ]},
  {'h2': 'Konektori — koji su u Srbiji', 'ul': [
   'Type 2 (Mennekes) — EU standard za AC punjenje',
   'CCS Combo 2 — EU standard za DC brzo punjenje',
   'CHAdeMO — Japanski standard (stariji Nissan, Mitsubishi)',
   'Tesla proprietary — samo na Tesla Superchargerima (ali novi Tesla ima CCS adapter)',
  ], 'paras': []},
  {'h2': 'Aplikacije za pronalaženje punjača', 'ul': [
   'ChargeMap — najveća europska mapa punjača, ima Srbiju',
   'PlugShare — community-based, dobre recenzije',
   'ABRP (A Better Route Planner) — za planiranje putovanja',
   'Aplikacije samih mreža: E.ON Drive, EkoPoint',
  ], 'paras': []},
  {'h2': 'Cijene punjenja u Srbiji', 'paras': [
   'Cijena varira od 0.25 do 0.40 EUR/kWh za DC punjenje (2026). Neke lokacije (tržni centri) nude besplatno AC punjenje uz kupovinu. Kod kuće: 0.08–0.12 EUR/kWh (domaća tarifa).',
  ]},
 ],
 'cta': 'Kalkulator troškova punjenja vs goriva', 'cta_url': 'https://autouniverse.rs/kalkulatori/potrosnja',
 'cta_sub': 'AutoUniverse kalkulator potrošnje — EV vs benzin vs dizel',
 'related': [
  {'title': 'EV punjenje na autoputu', 'url': '/blog/ev-punjenje-na-autoputu-srbija'},
  {'title': 'Električni auto u Srbiji 2026', 'url': '/blog/elektricni-auto-srbija-2026'},
 ],
},

]  # END ALL 50 POSTS


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    count = 0
    for p in POSTS:
        content = render(**p)
        path = os.path.join(OUT, p['slug'] + '.html')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  OK  {p['slug']}.html")
        count += 1
    print(f"\nGenerisano: {count} postova")
