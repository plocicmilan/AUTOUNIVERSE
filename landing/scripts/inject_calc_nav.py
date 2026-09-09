"""
D.3: Injektuje sekundarnu calc-nav traku na svih 7 kalkulator stranica.
Idempotentan — ako je nav već tu, preskače.
"""
from pathlib import Path

DIR = Path(__file__).parent.parent / "kalkulatori"

# Marker za detekciju (idempotent)
MARKER = "au-calc-nav"

# Redosled kalkulatora + labeli
CALCS = [
    ("registracije", "🚙", "Registracija"),
    ("uvoza", "🛃", "Uvoz"),
    ("kredit", "💰", "Kredit"),
    ("osiguranje", "🛡️", "Osiguranje"),
    ("tco", "📊", "TCO ukupno"),
    ("potrosnja", "⛽", "Potrošnja"),
    ("vin", "🔍", "VIN skener"),
]


def calc_nav_html(active_slug: str) -> str:
    items = "\n      ".join(
        f'<a href="/kalkulatori/{slug}.html" class="au-calc-nav-item{" active" if slug == active_slug else ""}">'
        f'<span class="au-calc-nav-icon">{icon}</span>{label}</a>'
        for slug, icon, label in CALCS
    )
    return f"""
<!-- D.3: AU calc-nav (sekundarna traka kalkulatora) -->
<style>
.au-calc-nav{{background:#0d1218;border-bottom:1px solid rgba(255,255,255,.08);padding:8px 20px;overflow-x:auto;scrollbar-width:none}}
.au-calc-nav::-webkit-scrollbar{{display:none}}
.au-calc-nav-inner{{display:flex;gap:4px;max-width:1200px;margin:0 auto}}
.au-calc-nav-item{{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;font-size:.82rem;font-weight:500;color:#8B92A5;text-decoration:none;border-radius:6px;white-space:nowrap;transition:color .15s,background .15s}}
.au-calc-nav-item:hover{{color:#DDE1EC;background:rgba(255,255,255,.04)}}
.au-calc-nav-item.active{{color:#0EA5E9;background:rgba(14,165,233,.1)}}
.au-calc-nav-icon{{font-size:1rem}}
</style>
<div class="au-calc-nav">
  <div class="au-calc-nav-inner">
      {items}
  </div>
</div>
"""


def process(path: Path):
    slug = path.stem
    html = path.read_text(encoding="utf-8")
    if MARKER in html:
        print(f"  {path.name}: već ima calc-nav, skip")
        return False
    # Injektuj pre <nav class="nav">
    marker = '<nav class="nav">'
    if marker not in html:
        print(f"  {path.name}: nema <nav class='nav'> marker, skip")
        return False
    new_html = html.replace(marker, calc_nav_html(slug) + "\n" + marker, 1)
    path.write_text(new_html, encoding="utf-8")
    print(f"  {path.name}: injected")
    return True


def main():
    print(f"D.3 calc-nav injection: {DIR}")
    modified = 0
    for slug, _, _ in CALCS:
        p = DIR / f"{slug}.html"
        if not p.exists():
            print(f"  {p.name}: NE POSTOJI")
            continue
        if process(p):
            modified += 1
    print(f"\nInjected na {modified} stranica")


if __name__ == "__main__":
    main()
