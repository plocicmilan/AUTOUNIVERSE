"""
Fix double-UTF8 mojibake — byte-level replacement.

Ovo hvata "svaki byte originalnog UTF-8 kodiran ponovo kao UTF-8" pattern:
- č (c4 8d) → c3 84 c2 8d
- ć (c4 87) → c3 84 c2 87
- š (c5 a1) → c5 c2 a1 or c3 85 c2 a1
- ž (c5 be) → c3 85 c2 be
- đ (c4 91) → c3 84 e2 80 98  (jer 0x91 u cp1252 → U+2018)
- Č (c4 8c) → c3 84 c5 92 or similar
- itd.

Radi na bajtovima direktno, tako da ne remeti već ispravan UTF-8.
"""
import sys
from pathlib import Path

# byte-level: mojibake bytes → correct UTF-8 bytes
FIXES_BYTES = [
    # 4-byte mojibake sequences (za slova gde original byte 2 = 0x8x-0x9x, cp1252 remapped)
    (b'\xc3\x84\xe2\x80\x98', b'\xc4\x91'),  # 'Ä‘' → đ (U+0111)
    (b'\xc3\x84\xe2\x80\x99', b'\xc4\x92'),  # placeholder
    (b'\xc3\x85\xe2\x80\x9d', b'\xc5\x93'),  # placeholder
    # 4-byte for Croatian-specific (Ä + control byte)
    (b'\xc3\x84\xc2\x8d', b'\xc4\x8d'),  # 'Ä\x8d' → č
    (b'\xc3\x84\xc2\x87', b'\xc4\x87'),  # 'Ä\x87' → ć
    (b'\xc3\x84\xc2\x8c', b'\xc4\x8c'),  # 'Ä\x8c' → Č
    (b'\xc3\x84\xc2\x86', b'\xc4\x86'),  # 'Ä\x86' → Ć
    (b'\xc3\x84\xc2\x90', b'\xc4\x90'),  # 'Ä\x90' → Đ
    (b'\xc3\x85\xc2\xa1', b'\xc5\xa1'),  # 'Å\xa1' → š
    (b'\xc3\x85\xc2\xbe', b'\xc5\xbe'),  # 'Å\xbe' → ž
    (b'\xc3\x85\xc2\xa0', b'\xc5\xa0'),  # 'Å\xa0' → Š
    (b'\xc3\x85\xc2\xbd', b'\xc5\xbd'),  # 'Å\xbd' → Ž
    (b'\xc3\x85\xc2\x92', b'\xc5\x92'),  # 'Å\x92' → Œ
    # 3-byte sequences (za em-dash i sl)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d', b'\xe2\x80\x94'),  # â€" → — (em)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c', b'\xe2\x80\x93'),  # â€" → – (en)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x84\xa2', b'\xe2\x80\x99'),  # â€™ → ’
    (b'\xc3\xa2\xe2\x82\xac\xcb\x9c', b'\xe2\x80\x98'),      # â€˜ → ‘
    (b'\xc3\xa2\xe2\x82\xac\xc2\xa6', b'\xe2\x80\xa6'),      # â€¦ → …
    (b'\xc3\xa2\xe2\x86\x92', b'\xe2\x86\x92'),              # â†’ → →
]

# BOM handling
BOM = b'\xef\xbb\xbf'

def fix_file(p: Path):
    raw = p.read_bytes()
    had_bom = raw.startswith(BOM)
    if had_bom:
        raw = raw[3:]
    total = 0
    for src, dst in FIXES_BYTES:
        if src in raw:
            n = raw.count(src)
            raw = raw.replace(src, dst)
            total += n
    p.write_bytes(raw)
    return total, had_bom


if __name__ == '__main__':
    targets = sys.argv[1:] or ['D:/BELORA/autouniverse/landing/index.html']
    for arg in targets:
        p = Path(arg)
        n, bom = fix_file(p)
        print(f'{p.name}: {n} byte-level fixes, BOM removed: {bom}')
