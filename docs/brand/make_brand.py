"""The MuW brand files (TASK-260 B, ADR-0224): the heart of the launch on its
yellow, and the word «MuW» in the stroke of the old logo (round, constant
width). Every PNG is drawn supersampled with Pillow and scaled down.

Run by hand, from the repository root, with the route engine's environment
(Pillow is one of its dependencies); the files then go to
`apps/mobile/assets/` and here:

    python docs/brand/make_brand.py . /tmp/brand

The heart's points come from `apps/mobile/src/intro/heartLine.ts` and the
colours from `apps/mobile/src/theme/tokens.ts`, so the files follow the app.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(sys.argv[1])  # the repo checkout: tokens and the heart's points
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
SS = 4  # supersampling

tokens = (ROOT / "apps/mobile/src/theme/tokens.ts").read_text()


def token(name: str) -> str:
    m = re.search(rf"^\s*{name}: \"(#[0-9A-Fa-f]{{6}})\"", tokens, re.M)
    assert m, name
    return m.group(1)


ACCENT = token("accent")
ON_ACCENT = token("onAccent")
TEXT = token("text")
WHITE = "#FFFFFF"

heart_src = (ROOT / "apps/mobile/src/intro/heartLine.ts").read_text()
m = re.search(r"HEART_POINTS[^=]*= \[(.*?)\];", heart_src, re.S)
assert m
HEART = [(float(a), float(b)) for a, b in re.findall(r"\[(\d+), (\d+)\]", m.group(1))]
HEART_BOX = (1000.0, 887.0)

# The badge's shares (HeartBadge.tsx).
HEART_SHARE = 0.68
LINE_SHARE = 1 / 16
DOT_SHARE = 1 / 6
DOT_RING_SHARE = 1 / 24


def rgba(hex6: str, a: int = 255) -> tuple[int, int, int, int]:
    return (int(hex6[1:3], 16), int(hex6[3:5], 16), int(hex6[5:7], 16), a)


def polyline(draw: ImageDraw.ImageDraw, pts, width: float, fill) -> None:
    """A line of constant width with round joints and ends."""
    r = width / 2
    for (ax, ay), (bx, by) in zip(pts, pts[1:], strict=False):
        draw.line([(ax, ay), (bx, by)], fill=fill, width=max(1, round(width)))
    for x, y in pts:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def heart_points(width: float, ox: float, oy: float):
    s = width / HEART_BOX[0]
    return [(ox + x * s, oy + y * s) for x, y in HEART]


def draw_heart(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    width: float,
    line: float,
    fill,
    dot: float | None = None,
    ring: float = 0,
    dot_fill=None,
) -> None:
    """The heart `width` wide centred on (cx, cy), and its start dot."""
    h = width * HEART_BOX[1] / HEART_BOX[0]
    ox, oy = cx - width / 2, cy - h / 2
    pts = heart_points(width, ox, oy)
    polyline(draw, pts, line, fill)
    if dot:
        x, y = pts[0]
        r = dot / 2
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)
        r2 = r - ring
        if r2 > 0:
            draw.ellipse([x - r2, y - r2, x + r2, y + r2], fill=dot_fill or fill)


# The word, in the old logo's units: letters 72 tall (y 24..96), stroke 14,
# corners of radius 12. M and W as capitals, u at the x-height (y 48).
STROKE = 14.0


def bezier_q(p0, p1, p2, n=12):
    return [
        (
            (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0],
            (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1],
        )
        for t in (i / n for i in range(n + 1))
    ]


def word_paths():
    m_ = [(0, 96), (0, 24), (30, 72), (60, 24), (60, 96)]
    u_ = (
        [(84, 48), (84, 84)]
        + bezier_q((84, 84), (84, 96), (96, 96))
        + [(132, 96)]
        + bezier_q((132, 96), (144, 96), (144, 84))
        + [(144, 48)]
    )
    w_ = [(168, 24), (198, 96), (228, 24), (258, 96), (288, 24)]
    return [m_, u_, w_]


WORD_BOX = (-7.0, 17.0, 295.0, 103.0)  # x0, y0, x1, y1 with the stroke


def word_svg_d(path) -> str:
    return "M" + "L".join(f"{x:g} {y:g}" for x, y in path)


def draw_word(draw: ImageDraw.ImageDraw, cx: float, cy: float, height: float, fill):
    """The word `height` tall (stroke included) centred on (cx, cy)."""
    s = height / (WORD_BOX[3] - WORD_BOX[1])
    w = (WORD_BOX[2] - WORD_BOX[0]) * s
    ox = cx - w / 2 - WORD_BOX[0] * s
    oy = cy - height / 2 - WORD_BOX[1] * s
    for path in word_paths():
        polyline(draw, [(ox + x * s, oy + y * s) for x, y in path], STROKE * s, fill)


def canvas(size: int, background) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGBA", (size * SS, size * SS), background)
    return im, ImageDraw.Draw(im)


def save(im: Image.Image, name: str, size: int, opaque: bool = False) -> None:
    out = im.resize((size, size), Image.LANCZOS)
    if opaque:
        out = out.convert("RGB")
    out.save(OUT / name, optimize=True)


# The icon's line: thinner than the badge's (which is drawn 32 points wide),
# so the route's detail stays readable at an icon's size.
ICON_LINE = 1 / 30
ICON_DOT = 1 / 9
ICON_RING = 1 / 48


def badge(size: int, corner_share: float = 0.0, small: bool = False) -> Image.Image:
    """The yellow square with the heart, as HeartBadge draws it (`small`:
    the badge's own thick line, for the favicon)."""
    im, d = canvas(size, (0, 0, 0, 0))
    S = size * SS
    if corner_share:
        d.rounded_rectangle([0, 0, S, S], radius=S * corner_share, fill=rgba(ACCENT))
    else:
        d.rectangle([0, 0, S, S], fill=rgba(ACCENT))
    line, dot, ring = (
        (LINE_SHARE, DOT_SHARE, DOT_RING_SHARE)
        if small
        else (ICON_LINE, ICON_DOT, ICON_RING)
    )
    draw_heart(
        d,
        S / 2,
        S / 2,
        S * HEART_SHARE,
        S * line,
        rgba(ON_ACCENT),
        dot=S * dot,
        ring=S * ring,
        dot_fill=rgba(TEXT),
    )
    return im


# icon.png: 1024, yellow, the heart; no transparency, no rounded corners.
save(badge(1024), "icon.png", 1024, opaque=True)
# favicon.png: 48, the badge with its corners.
save(badge(48, 0.22, small=True), "favicon.png", 48)

# splash-logo-dark.png: 1040 square, the word black in the middle band
# (LOGO_WINDOW = 0.26 of the width is shown).
im, d = canvas(1040, (0, 0, 0, 0))
draw_word(d, 1040 * SS / 2, 1040 * SS / 2, 236 * SS, rgba(ON_ACCENT))
save(im, "splash-logo-dark.png", 1040)

# splash-icon-dark.png: 1024, Android's splash, the heart alone, black on
# nothing, inside the circle the system cuts.
im, d = canvas(1024, (0, 0, 0, 0))
S = 1024 * SS
draw_heart(
    d,
    S / 2,
    S / 2,
    S * 0.46,
    S * ICON_LINE * 0.7,
    rgba(ON_ACCENT),
    dot=S * ICON_DOT * 0.7,
    ring=S * ICON_RING * 0.7,
    dot_fill=rgba(TEXT),
)
save(im, "splash-icon-dark.png", 1024)

# Android adaptive icon: yellow background, the black heart in the safe
# circle (the inner 66 %), the monochrome a white heart.
im, d = canvas(512, rgba(ACCENT))
save(im, "android-icon-background.png", 512, opaque=True)
im, d = canvas(512, (0, 0, 0, 0))
S = 512 * SS
draw_heart(
    d,
    S / 2,
    S / 2,
    S * 0.5,
    S * ICON_LINE * 0.75,
    rgba(ON_ACCENT),
    dot=S * ICON_DOT * 0.75,
    ring=S * ICON_RING * 0.75,
    dot_fill=rgba(TEXT),
)
save(im, "android-icon-foreground.png", 512)
im, d = canvas(432, (0, 0, 0, 0))
S = 432 * SS
draw_heart(
    d, S / 2, S / 2, S * 0.5, S * ICON_LINE * 0.75, rgba(WHITE), dot=S * ICON_DOT * 0.75
)
save(im, "android-icon-monochrome.png", 432)

# The vectors, for docs/brand.
ROUND = 'stroke-linecap="round" stroke-linejoin="round"'
d_word = "".join(
    f'  <path d="{word_svg_d(p)}" fill="none" stroke="{ON_ACCENT}"'
    f' stroke-width="{STROKE:g}" {ROUND}/>\n'
    for p in word_paths()
)
(OUT / "muw-logo.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" '
    f'viewBox="{WORD_BOX[0]:g} {WORD_BOX[1]:g} '
    f'{WORD_BOX[2] - WORD_BOX[0]:g} {WORD_BOX[3] - WORD_BOX[1]:g}" '
    'role="img" aria-label="MuW">\n'
    "  <title>MuW logo</title>\n" + d_word + "</svg>\n"
)
# The mark: the badge, 1000 wide, heart 680 wide centred.
side = 1000.0
hw = side * HEART_SHARE
hh = hw * HEART_BOX[1] / HEART_BOX[0]
pts = heart_points(hw, (side - hw) / 2, (side - hh) / 2)
sx, sy = pts[0]
(OUT / "muw-mark.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" '
    f'viewBox="0 0 {side:g} {side:g}" role="img" aria-label="MuW">\n'
    "  <title>MuW mark</title>\n"
    f'  <rect width="{side:g}" height="{side:g}" rx="{side * 0.22:g}" '
    f'fill="{ACCENT}"/>\n'
    f'  <path d="{word_svg_d(pts)}" fill="none" stroke="{ON_ACCENT}" '
    f'stroke-width="{side * LINE_SHARE:g}" {ROUND}/>\n'
    f'  <circle cx="{sx:.1f}" cy="{sy:.1f}" r="{side * DOT_SHARE / 2:g}" fill="{TEXT}" '
    f'stroke="{ON_ACCENT}" stroke-width="{side * DOT_RING_SHARE:g}"/>\n'
    "</svg>\n"
)

# A preview: the launch (heart over the word on yellow), the icon, the
# Android icon, the favicon enlarged.
pv = Image.new("RGB", (1400, 700), rgba(ACCENT)[:3])
d = ImageDraw.Draw(pv)
launch = Image.new("RGBA", (700 * SS, 700 * SS), rgba(ACCENT))
dl = ImageDraw.Draw(launch)
hw = 300 * SS
draw_heart(
    dl,
    350 * SS,
    290 * SS,
    hw,
    5 * SS,
    rgba(ON_ACCENT),
    dot=15 * SS,
    ring=3 * SS,
    dot_fill=rgba(TEXT),
)
logo = Image.open(OUT / "splash-logo-dark.png").convert("RGBA")
lw = int(300 * 0.7 * SS)
logo = logo.resize((lw, lw), Image.LANCZOS)
launch.alpha_composite(
    logo, (350 * SS - lw // 2, int(290 * SS + hw * 0.887 / 2 + 36 * SS) - lw // 2)
)
pv.paste(launch.resize((700, 700), Image.LANCZOS).convert("RGB"), (0, 0))
d.rectangle([700, 0, 1400, 700], fill=(255, 255, 255))
icon = Image.open(OUT / "icon.png").convert("RGBA").resize((240, 240), Image.LANCZOS)
mask = Image.new("L", (240, 240), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 240, 240], radius=53, fill=255)
pv.paste(icon, (760, 60), mask)
bg = Image.open(OUT / "android-icon-background.png").convert("RGBA").resize((240, 240))
fg = Image.open(OUT / "android-icon-foreground.png").convert("RGBA").resize((240, 240))
bg.alpha_composite(fg)
mask = Image.new("L", (240, 240), 0)
ImageDraw.Draw(mask).ellipse([0, 0, 240, 240], fill=255)
pv.paste(bg, (1100, 60), mask)
fav = Image.open(OUT / "favicon.png").convert("RGBA").resize((96, 96), Image.LANCZOS)
pv.paste(fav, (760, 400), fav)
pv.save(OUT / "preview.png")
print("done", sorted(p.name for p in OUT.iterdir()))
