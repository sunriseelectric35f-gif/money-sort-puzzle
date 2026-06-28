#!/usr/bin/env python3
"""Generate real app assets for Money Sort Puzzle (no external API).
Renders icon (1024), splash, adaptive foreground, favicon with PIL —
deep navy bg + three glass tubes of stacked colored cash notes."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)

BG_TOP = (14, 20, 40)
BG_BOT = (22, 30, 61)
TUBE = (10, 15, 34)
TUBE_BORDER = (42, 55, 102)
NOTE_COLORS = [(122, 199, 79), (91, 141, 239), (176, 111, 232),
               (228, 181, 88), (232, 111, 158), (72, 214, 210)]

def vgrad(w, h, top, bot):
    img = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return img

def rounded(draw, box, r, **kw):
    draw.rounded_rectangle(box, radius=r, **kw)

def draw_scene(size, tube_layout=True):
    img = vgrad(size, size, BG_TOP, BG_BOT)
    d = ImageDraw.Draw(img, "RGBA")
    if not tube_layout:
        return img
    # three tubes, centered
    n_tubes = 3
    tube_w = int(size * 0.16)
    gap = int(size * 0.07)
    total_w = n_tubes * tube_w + (n_tubes - 1) * gap
    x0 = (size - total_w) // 2
    tube_h = int(size * 0.52)
    y_bottom = int(size * 0.76)
    y_top = y_bottom - tube_h
    note_h = int(tube_h / 4) - 6
    # each tube sorted with one dominant color
    fills = [
        [0, 0, 0, 0],   # green tube
        [3, 3, 3, 3],   # gold tube
        [5, 5, 5, 5],   # teal tube
    ]
    for ti in range(n_tubes):
        tx = x0 + ti * (tube_w + gap)
        # tube body
        rounded(d, [tx, y_top, tx + tube_w, y_bottom], r=tube_w // 3,
                fill=TUBE, outline=TUBE_BORDER, width=max(2, size // 220))
        # stacked notes from bottom
        stack = fills[ti]
        for si, cidx in enumerate(stack):
            ny1 = y_bottom - 8 - (si + 1) * (note_h + 4)
            ny2 = ny1 + note_h
            col = NOTE_COLORS[cidx]
            rounded(d, [tx + 7, ny1, tx + tube_w - 7, ny2], r=note_h // 3,
                    fill=col, outline=(0, 0, 0, 60), width=2)
    return img

# icon 1024
icon = draw_scene(1024)
icon.save(os.path.join(OUT, "icon.png"))

# adaptive foreground (transparent bg, just tubes) — reuse scene on transparent
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
scene = draw_scene(1024).convert("RGBA")
# keep only central tube region by pasting full scene (simplest, looks fine on navy)
fg = scene
fg.save(os.path.join(OUT, "android-icon-foreground.png"))

# splash — wider scene with title space
splash = vgrad(1284, 1284, BG_TOP, BG_BOT)
sc = draw_scene(1284)
splash.paste(sc, (0, 0))
ds = ImageDraw.Draw(splash)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
except Exception:
    font = ImageFont.load_default()
txt = "MONEY SORT"
tb = ds.textbbox((0, 0), txt, font=font)
tw = tb[2] - tb[0]
ds.text(((1284 - tw) // 2, int(1284 * 0.12)), txt, fill=(74, 222, 128), font=font)
splash.save(os.path.join(OUT, "splash-icon.png"))

# favicon 196
fav = draw_scene(196)
fav.save(os.path.join(OUT, "favicon.png"))

for f in ["icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png"]:
    p = os.path.join(OUT, f)
    print(f"  {f}: {os.path.getsize(p)//1024}KB  {Image.open(p).size}")
print("DONE assets ->", OUT)
