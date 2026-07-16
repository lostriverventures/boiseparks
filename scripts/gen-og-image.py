#!/usr/bin/env python3
"""Generate the 1200x630 social share card -> og-image.png (committed, served at /og-image.png).
Brand-designed (no third-party photo, so no attribution/share-alike baggage). Re-run if the
wordmark, tagline, or stats change:  python3 scripts/gen-og-image.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
CREAM = (253, 251, 247)
MEADOW = (46, 125, 50)
MEADOW_DEEP = (20, 83, 45)
MEADOW_LIGHT = (234, 246, 236)
BARK = (87, 83, 78)
WHITE = (255, 255, 255)

FB = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FR = "/System/Library/Fonts/Supplemental/Arial.ttf"
def font(path, size): return ImageFont.truetype(path, size)

img = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(img)

# ---- right "map" panel: green with scattered white park pins ----
panel_x = 812
d.rounded_rectangle([panel_x, 0, W, H], radius=0, fill=MEADOW)
d.rounded_rectangle([panel_x, -40, panel_x + 80, H + 40], radius=40, fill=CREAM)  # carve a soft left edge
d.rounded_rectangle([panel_x + 40, 0, W, H], radius=0, fill=MEADOW)
# faint route lines
for (x1, y1, x2, y2) in [(880, 120, 1040, 250), (1040, 250, 980, 430), (980, 430, 1120, 520)]:
    d.line([x1, y1, x2, y2], fill=(255, 255, 255, 60), width=3)

def pin(cx, cy, r, dot=MEADOW):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
    d.polygon([(cx - r * 0.72, cy + r * 0.35), (cx + r * 0.72, cy + r * 0.35), (cx, cy + r * 1.95)], fill=WHITE)
    d.ellipse([cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4], fill=dot)

for (cx, cy, r) in [(900, 120, 26), (1050, 235, 34), (975, 415, 30), (1120, 300, 22), (925, 520, 24)]:
    pin(cx, cy, r)

# ---- wordmark (green tile + name) ----
tile = [64, 60, 128, 124]
d.rounded_rectangle(tile, radius=16, fill=MEADOW)
# simple white pine
cx = (tile[0] + tile[2]) // 2
d.polygon([(cx, 72), (cx - 18, 104), (cx + 18, 104)], fill=WHITE)
d.polygon([(cx, 84), (cx - 22, 112), (cx + 22, 112)], fill=WHITE)
d.rectangle([cx - 4, 108, cx + 4, 116], fill=WHITE)
wf = font(FB, 34)
d.text((144, 78), "boiseparks", font=wf, fill=MEADOW_DEEP)
bb = d.textbbox((144, 78), "boiseparks", font=wf)
d.text((bb[2], 78), ".com", font=font(FR, 34), fill=BARK)

# ---- headline ----
hf = font(FB, 78)
d.text((64, 176), "Every Boise park,", font=hf, fill=MEADOW_DEEP)
d.text((64, 268), "rated for parents.", font=hf, fill=MEADOW)

# ---- subhead ----
sf = font(FR, 27)
d.text((66, 384), "Find the playground, splash pad, shade, or open", font=sf, fill=BARK)
d.text((66, 420), "restroom you need — every park, made for families.", font=sf, fill=BARK)

# ---- stat pills ----
pf = font(FB, 23)
x = 64
for label in ["57 playgrounds", "8 splash pads", "24 year-round restrooms"]:
    tb = d.textbbox((0, 0), label, font=pf)
    w = tb[2] - tb[0]
    d.rounded_rectangle([x, 500, x + w + 44, 552], radius=26, fill=MEADOW_LIGHT)
    d.text((x + 22, 512), label, font=pf, fill=MEADOW_DEEP)
    x += w + 44 + 16

out = os.path.join(os.path.dirname(__file__), "..", "og-image.png")
img.save(out, "PNG")
print("wrote", os.path.abspath(out), img.size)
