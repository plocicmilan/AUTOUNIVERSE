"""
Annotate screenshots za Autodelovi vodic.
Cita screenshotove iz D:\\BELORA\\, snima annotovane u autodelovi/public/guide/
"""

import sys
import os
from PIL import Image, ImageDraw, ImageFont

SRC = r"D:\BELORA"
OUT = r"D:\BELORA\autouniverse\autodelovi\public\guide"
os.makedirs(OUT, exist_ok=True)

# ---- helpers ----------------------------------------------------------------

def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGBA")

def save(img, name):
    path = os.path.join(OUT, name)
    img.convert("RGB").save(path, "PNG", optimize=True)
    kb = os.path.getsize(path) // 1024
    print(f"  saved {name} ({kb} KB)")

def font(size):
    for fpath in [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
    ]:
        try:
            return ImageFont.truetype(fpath, size)
        except:
            pass
    return ImageFont.load_default()

ACCENT   = (14, 165, 233)        # plava
LABEL_BG = (14, 165, 233)
LABEL_FG = (255, 255, 255)
ARROW    = (255, 210, 0)         # zuta strelica
CIRCLE   = (255, 210, 0)
SHADOW   = (0, 0, 0, 180)


def text_size(draw, text, fnt):
    """Dimenzije multiline teksta."""
    lines = text.split("\n")
    w = max(int(draw.textlength(l, font=fnt)) for l in lines)
    h = fnt.size * len(lines) + 4 * (len(lines) - 1)
    return w, h


def draw_callout(draw, x, y, text, fnt, side="right"):
    """Pravougaoni callout balon sa pokaznom linijom."""
    pad = 10
    tw, th = text_size(draw, text, fnt)
    bw, bh = tw + pad*2, th + pad*2

    if side == "right":
        bx = x + 28
    else:
        bx = x - bw - 28
    by = y - bh // 2

    # senka
    draw.rounded_rectangle([bx+3, by+3, bx+bw+3, by+bh+3], radius=8, fill=(0,0,0,160))
    # pozadina
    draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=8, fill=LABEL_BG)
    # tekst
    draw.text((bx+pad, by+pad), text, font=fnt, fill=LABEL_FG)
    # linija od tacke do balona
    if side == "right":
        draw.line([(x, y), (bx, by + bh//2)], fill=ARROW, width=3)
    else:
        draw.line([(x, y), (bx+bw, by + bh//2)], fill=ARROW, width=3)
    # krug na tacki
    r = 7
    draw.ellipse([x-r, y-r, x+r, y+r], fill=ARROW, outline=(255,255,255), width=2)


def draw_number_badge(draw, x, y, num, fnt):
    """Zuti krug sa brojem."""
    r = 18
    draw.ellipse([x-r, y-r, x+r, y+r], fill=ARROW, outline=(0,0,0), width=2)
    txt = str(num)
    tw = draw.textlength(txt, font=fnt)
    draw.text((x - tw//2, y - fnt.size//2 - 2), txt, font=font(16), fill=(0,0,0))


def draw_arrow_right(draw, x1, y1, x2, y2):
    """Strelica od (x1,y1) ka (x2,y2)."""
    draw.line([(x1, y1), (x2, y2)], fill=ARROW, width=4)
    # vrh strelice
    import math
    angle = math.atan2(y2-y1, x2-x1)
    aw = 18
    for da in [0.5, -0.5]:
        ex = x2 - aw * math.cos(angle - da)
        ey = y2 - aw * math.sin(angle - da)
        draw.line([(x2, y2), (int(ex), int(ey))], fill=ARROW, width=4)


def highlight_box(draw, x1, y1, x2, y2, color=None, width=3):
    c = color or ARROW
    draw.rounded_rectangle([x1, y1, x2, y2], radius=6, outline=c, width=width)


# ---- 1. LISTA OGLASA --------------------------------------------------------

print("1. Lista oglasa...")
img = load("screen-01-lista.png")
ov  = Image.new("RGBA", img.size, (0,0,0,0))
draw = ImageDraw.Draw(ov)
f14 = font(14)
f13 = font(13)
W, H = img.size

# Search bar
draw_callout(draw, 290, 120, "Pretraga po nazivu,\nmarki, modelu, gradu", f13, side="left")
highlight_box(draw, 10, 94, W-20, 230)

# Kategorije
draw_callout(draw, W-25, 330, "Filtriraj\npo kategoriji", f13, side="left")
highlight_box(draw, 10, 290, W-20, 615)

# Oglas kartica
draw_callout(draw, 100, 710, "Klikni na oglas\nza detalje", f13, side="right")
highlight_box(draw, 10, 655, W-20, H-80)

# Nav bar - Prodaj tab
draw_callout(draw, 195, H-60, "Postavi\noglas", f13, side="right")
draw_arrow_right(draw, 195, H-48, 195, H-80)

result = Image.alpha_composite(img, ov)
save(result, "guide-01-lista.png")


# ---- 2. FORMA VRH -----------------------------------------------------------

print("2. Forma - vrh...")
img  = load("screen-06-forma-vrh.png")
ov   = Image.new("RGBA", img.size, (0,0,0,0))
draw = ImageDraw.Draw(ov)
f14  = font(14)
f13  = font(13)
W, H = img.size

# 1 Naziv
draw_number_badge(draw, W-30, 204, 1, f14)
highlight_box(draw, 10, 180, W-50, 230)
draw_callout(draw, W-45, 204, "Naziv dela — konkretan\nnpr. 'Disk kocnice zadnji BMW E46'", f13, side="left")

# 2 Kategorija
draw_number_badge(draw, W-30, 288, 2, f14)
highlight_box(draw, 10, 260, W-50, 320)
draw_callout(draw, W-45, 288, "Izaberi\nkategoriju", f13, side="left")

# 3 Stanje
draw_number_badge(draw, W-30, 382, 3, f14)
highlight_box(draw, 10, 355, W-50, 415)
draw_callout(draw, W-45, 382, "Stanje dela", f13, side="left")

# 4 Marka
draw_number_badge(draw, W-30, 465, 4, f14)
highlight_box(draw, 10, 440, W-50, 495)
draw_callout(draw, W-45, 465, "Marka vozila\nza koje je deo", f13, side="left")

# 5 Model
draw_number_badge(draw, W-30, 556, 5, f14)
highlight_box(draw, 10, 530, W-50, 590)
draw_callout(draw, W-45, 556, "Model vozila", f13, side="left")

# 6 Godiste
draw_number_badge(draw, W-30, 648, 6, f14)
highlight_box(draw, 10, 615, W-50, 760)
draw_callout(draw, W-45, 680, "Godiste\nod–do", f13, side="left")

result = Image.alpha_composite(img, ov)
save(result, "guide-02-forma-vrh.png")


# ---- 3. FORMA DNO -----------------------------------------------------------

print("3. Forma - dno...")
img  = load("screen-03-forma-gornji.png")
ov   = Image.new("RGBA", img.size, (0,0,0,0))
draw = ImageDraw.Draw(ov)
W, H = img.size

# Kataloški broj
draw_number_badge(draw, W-30, 56, 7, f14)
highlight_box(draw, 10, 32, W-50, 82)
draw_callout(draw, W-45, 56, "OE / kataloški broj\n(opciono, ali pomaze)", f13, side="left")

# Cena
draw_number_badge(draw, W-30, 140, 8, f14)
highlight_box(draw, 10, 108, W-50, 168)
draw_callout(draw, W-45, 140, "Cena u EUR\n(prazno = 'Cena na upit')", f13, side="left")

# Grad
draw_number_badge(draw, W-30, 224, 9, f14)
highlight_box(draw, 10, 194, W-50, 250)
draw_callout(draw, W-45, 224, "Tvoj grad", f13, side="left")

# Dostava checkbox
draw_number_badge(draw, 35, 285, 10, f14)
highlight_box(draw, 2, 270, 320, 342)
draw_callout(draw, 50, 310, "Dostava i/ili\nzamena", f13, side="right")

# Opis
draw_number_badge(draw, W-30, 385, 11, f14)
highlight_box(draw, 10, 355, W-50, 440)
draw_callout(draw, W-45, 400, "Opis stanja, istorija,\nza sta jos odgovara", f13, side="left")

# Fotografije
draw_number_badge(draw, W-30, 472, 12, f14)
highlight_box(draw, 10, 450, W-50, 520)
draw_callout(draw, W-45, 472, "Dodaj do 5 fotografija\n(min. 2 preporuceno)", f13, side="left")

# Ime
draw_number_badge(draw, W-30, 648, 13, f14)
highlight_box(draw, 10, 622, W-50, 672)
draw_callout(draw, W-45, 648, "Tvoje ime ili\nnaziv firme", f13, side="left")

# Telefon
draw_number_badge(draw, W-30, 730, 14, f14)
highlight_box(draw, 10, 705, W-50, 758)
draw_callout(draw, W-45, 730, "Telefon — prikazuje\nse tek na klik kupca", f13, side="left")

result = Image.alpha_composite(img, ov)
save(result, "guide-03-forma-dno.png")


# ---- 4. DETALJ OGLASA -------------------------------------------------------

print("4. Detalj oglasa...")
img  = load("screen-03-forma-vrh.png")
ov   = Image.new("RGBA", img.size, (0,0,0,0))
draw = ImageDraw.Draw(ov)
W, H = img.size

# Naziv i cena
highlight_box(draw, 10, 255, W-20, 316)
draw_callout(draw, W//2, 272, "Naziv i cena", f13, side="left")

# Bedževi
highlight_box(draw, 10, 323, 310, 360)
draw_callout(draw, 50, 340, "Stanje · Kategorija · Grad", f13, side="right")

# Opis
highlight_box(draw, 10, 368, W-20, 490)
draw_callout(draw, 50, 430, "Opis\nprodavca", f13, side="right")

# Prikaži broj button
highlight_box(draw, 10, 700, 270, 760, color=(14,165,233), width=4)
draw_callout(draw, 50, 730, "Klikni da vidis\nbroj telefona", f13, side="right")
draw_arrow_right(draw, 155, 762, 155, 796)
draw_callout(draw, 50, 800, "Broj se otkriva\nsamo tebi", f13, side="right")

result = Image.alpha_composite(img, ov)
save(result, "guide-04-detalj.png")

print("Gotovo!")
