# OpenLibrus logo: "OL" cut out of a white tile, like the app's grade tiles,
# on a deep blue. Drawn at 4x and downsampled.
#   python scripts/make-logo.py assets assets tile   writes every icon the app uses (needs Pillow)
#   python scripts/make-logo.py preview OUTDIR       compares the styles (needs Windows fonts)
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFont

# A deep cobalt, darker and more saturated than the light sky blue Librus uses.
BLUE_TOP = (52, 102, 240, 255)
BLUE_BOTTOM = (30, 64, 196, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def canvas(S):
    return Image.new('RGBA', (S, S), CLEAR)


def blue(S):
    im = Image.new('RGBA', (S, S))
    top = Image.new('RGBA', (1, S))
    for y in range(S):
        t = y / (S - 1)
        top.putpixel((0, y), tuple(int(BLUE_TOP[i] + (BLUE_BOTTOM[i] - BLUE_TOP[i]) * t) for i in range(4)))
    return top.resize((S, S))


def glyph_geometric(S, width=0.56):
    """A perfect ring and an L of the same stroke, set as one word."""
    im = canvas(S); d = ImageDraw.Draw(im)
    unit = S * width
    D = unit * 0.60          # the O's outer diameter
    w = unit * 0.155         # stroke
    gap = unit * 0.06
    Lw = unit - D - gap      # the L's width
    x0 = (S - unit) / 2; y0 = (S - D) / 2
    d.ellipse([x0, y0, x0 + D, y0 + D], fill=WHITE)
    d.ellipse([x0 + w, y0 + w, x0 + D - w, y0 + D - w], fill=CLEAR)
    lx = x0 + D + gap
    d.rectangle([lx, y0, lx + w, y0 + D], fill=WHITE)
    d.rectangle([lx, y0 + D - w, lx + Lw, y0 + D], fill=WHITE)
    return im


def glyph_font(path, size=0.40, tracking=-0.02):
    def draw(S):
        im = canvas(S); d = ImageDraw.Draw(im)
        font = ImageFont.truetype(path, int(S * size))
        # Draw letter by letter so the pair can be set tighter than the font's default.
        bo = d.textbbox((0, 0), 'O', font=font, anchor='ls')
        bl = d.textbbox((0, 0), 'L', font=font, anchor='ls')
        track = S * tracking
        total = (bo[2] - bo[0]) + track + (bl[2] - bl[0])
        x = (S - total) / 2
        top = min(bo[1], bl[1]); h = -top
        base = (S + h) / 2
        d.text((x - bo[0], base), 'O', font=font, anchor='ls', fill=WHITE)
        d.text((x + (bo[2] - bo[0]) + track - bl[0], base), 'L', font=font, anchor='ls', fill=WHITE)
        return im
    return draw


def glyph_tile(S):
    """The geometric OL cut out of a white rounded tile."""
    im = canvas(S); d = ImageDraw.Draw(im)
    t = S * 0.56; x0 = (S - t) / 2
    d.rounded_rectangle([x0, x0, x0 + t, x0 + t], radius=t * 0.24, fill=WHITE)
    im.putalpha(ImageChops.subtract(im.split()[3], glyph_geometric(S, 0.40).split()[3]))
    return im


STYLES = {
    'tile': glyph_tile,
    'geometric': glyph_geometric,
    'black': glyph_font('C:/Windows/Fonts/seguibl.ttf', 0.40, -0.015),
    'bahnschrift': glyph_font('C:/Windows/Fonts/bahnschrift.ttf', 0.44, 0.0),
}


def icon(S, glyph, shape='circle', scale=1.0):
    big = S * 4
    base = blue(big)
    g = glyph(big)
    if scale != 1.0:
        g = g.resize((int(big * scale), int(big * scale)), Image.LANCZOS)
        layer = canvas(big); off = (big - g.size[0]) // 2; layer.alpha_composite(g, (off, off)); g = layer
    base.alpha_composite(g)
    mask = Image.new('L', (big, big), 0); md = ImageDraw.Draw(mask)
    if shape == 'circle':
        md.ellipse([0, 0, big - 1, big - 1], fill=255)
    elif shape == 'square':
        md.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.23, fill=255)
    else:
        md.rectangle([0, 0, big - 1, big - 1], fill=255)
    out = canvas(big); out.paste(base, (0, 0), mask)
    return out.resize((S, S), Image.LANCZOS)


def glyph_only(S, glyph, scale=1.0):
    big = S * 4
    g = glyph(big)
    if scale != 1.0:
        g = g.resize((int(big * scale), int(big * scale)), Image.LANCZOS)
        layer = canvas(big); off = (big - g.size[0]) // 2; layer.alpha_composite(g, (off, off)); g = layer
    return g.resize((S, S), Image.LANCZOS)


def preview(out):
    small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
    label = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 28)
    sheet = Image.new('RGBA', (1180, 60 + 300 * len(STYLES)), (246, 247, 249, 255))
    d = ImageDraw.Draw(sheet)
    for col, title in enumerate(['okrągła', 'kwadratowa', 'na ekranie (mała)', 'motyw Androida']):
        d.text((270 + col * 230, 18), title, font=small, fill=(96, 99, 106))
    for i, (name, glyph) in enumerate(STYLES.items()):
        y = 60 + i * 300
        d.text((24, y + 100), name, font=label, fill=(25, 27, 31))
        sheet.alpha_composite(icon(200, glyph, 'circle'), (270, y + 20))
        sheet.alpha_composite(icon(200, glyph, 'square'), (500, y + 20))
        wall = Image.new('RGBA', (200, 200), (18, 20, 28, 255))
        wall.alpha_composite(icon(64, glyph, 'circle'), (68, 52))
        ImageDraw.Draw(wall).text((100, 140), 'OpenLibrus', font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 16), fill=WHITE, anchor='mt')
        sheet.alpha_composite(wall, (730, y + 20))
        mono = Image.new('RGBA', (800, 800), (40, 44, 52, 255))
        tint = Image.new('RGBA', (800, 800), (205, 214, 255, 255))
        mono.paste(tint, (0, 0), glyph(800).split()[3])
        m = Image.new('L', (800, 800), 0); ImageDraw.Draw(m).ellipse([0, 0, 799, 799], fill=255)
        mo = canvas(800); mo.paste(mono, (0, 0), m)
        sheet.alpha_composite(mo.resize((200, 200), Image.LANCZOS), (960, y + 20))
    sheet.convert('RGB').save(f'{out}/ol-sheet.png')


def assets(out, style):
    glyph = STYLES[style]
    # Adaptive icon: 108dp canvas, launchers show the centre 72dp, safe zone the centre 66dp.
    # The glyph is drawn for a full-bleed icon, so it shrinks by 72/108 on the adaptive canvas.
    a = 72 / 108
    glyph_only(512, glyph, a).save(f'{out}/android-icon-foreground.png')
    blue(512).save(f'{out}/android-icon-background.png')
    glyph_only(432, glyph, a).save(f'{out}/android-icon-monochrome.png')
    icon(1024, glyph, 'full').convert('RGB').save(f'{out}/icon.png')
    glyph_only(1024, glyph, 0.8).save(f'{out}/splash-icon.png')
    icon(48, glyph, 'square').save(f'{out}/favicon.png')
    # Notification icon: the bare letters, larger, since Android shows it tiny and
    # tinted, and the tile's cut-outs would close up at that size.
    glyph_only(96, glyph_geometric, 1.35).save(f'{out}/notification-icon.png')


if __name__ == '__main__':
    if sys.argv[1] == 'preview':
        preview(sys.argv[2])
    else:
        assets(sys.argv[2], sys.argv[3])
    print('ok')
