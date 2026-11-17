# -*- coding: utf-8 -*-
"""NMED dissertatsiya taqdimotini quradi (python-pptx + qo'lda OOXML animatsiya).

Ishga tushirish:  python build_deck.py   →  NMED_dissertatsiya.pptx

* Slaydlar orasida Morph o'tishi (PowerPoint 2019 / 365; eski versiyada fade).
  Bir xil nomli ("!!...") obyektlar slayddan slaydga silliq ko'chadi.
* Har slayddagi yangi elementlar avtomatik, ketma-ket paydo bo'ladi —
  taqdimotchi bosishi shart emas.
* [Kvadrat qavsdagi] sariq matnlar — to'ldirilishi kerak bo'lgan joylar.
"""
import itertools
import os

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "rasmlar")
LOGO = os.path.join(HERE, "..", "frontend", "src", "images", "logo.png")
OUT = os.path.join(HERE, "NMED_dissertatsiya.pptx")

# ── Dizayn tokenlari (platformaning o'z ranglari: frontend/src/theme.js) ──
NAVY, TEAL, TEAL_D = "0F172A", "00B39A", "007A6A"
MINT, MINT2, BORDER = "E6F7F4", "F3FBF9", "E2E8F0"
BODY, MUTED = "334155", "64748B"
AMBER, AMBER_D, RED, ORANGE, GREEN, GREY = "F59E0B", "B45309", "DC2626", "EA580C", "16A34A", "94A3B8"
WHITE = "FFFFFF"
HEAD, TEXT, MONO = "Segoe UI Semibold", "Segoe UI", "Consolas"
W, H = 13.333, 7.5
ML = 0.6  # chap chegara

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"


def rgb(h):
    return RGBColor.from_string(h)


# ═══════════════════════════ yordamchilar ═══════════════════════════
def set_name(shape, name):
    shape._element.xpath("./*[1]/p:cNvPr")[0].set("name", name)


def shadow(shape, alpha=9000, blur=228600, dist=50800):
    spPr = shape._element.spPr
    eff = etree.SubElement(spPr, f"{{{A_NS}}}effectLst")
    sh = etree.SubElement(eff, f"{{{A_NS}}}outerShdw", blurRad=str(blur), dist=str(dist),
                          dir="5400000", algn="t", rotWithShape="0")
    clr = etree.SubElement(sh, f"{{{A_NS}}}srgbClr", val=NAVY)
    etree.SubElement(clr, f"{{{A_NS}}}alpha", val=str(alpha))


SKY, CYAN = "0EA5E9", "06B6D4"
GRAD = (TEAL, SKY)             # asosiy gradient: firuza → osmon ko'k
GRAD_TXT = ("00947F", "0284C7")  # matn uchun to'qroq (oq fonda o'qiladi)
GRAD_FILL = ("00A88F", "0891B2")  # ustida oq matn turadigan yuzalar uchun
GRAD_NAVY = (NAVY, "115E59")
ICON_DIR = os.path.join(IMG, "ikon")


def paint(shape, fill, angle=35):
    """fill: None | "RRGGBB" | (c1, c2) gradient."""
    if fill is None:
        shape.fill.background()
    elif isinstance(fill, tuple):
        shape.fill.gradient()
        shape.fill.gradient_angle = angle
        st = shape.fill.gradient_stops
        st[0].color.rgb, st[0].position = rgb(fill[0]), 0.0
        st[1].color.rgb, st[1].position = rgb(fill[1]), 1.0
    else:
        shape.fill.solid()
        shape.fill.fore_color.rgb = rgb(fill)


def grad_text(tb, colors=GRAD_TXT, angle=0):
    """Matnni gradient rang bilan bo'yaydi (katta raqam va urg'u so'zlar uchun)."""
    for rpr in tb._element.iter(f"{{{A_NS}}}rPr"):
        old = rpr.find(f"{{{A_NS}}}solidFill")
        g = etree.fromstring(
            f'<a:gradFill xmlns:a="{A_NS}"><a:gsLst><a:gs pos="0"><a:srgbClr val="{colors[0]}"/></a:gs>'
            f'<a:gs pos="100000"><a:srgbClr val="{colors[1]}"/></a:gs></a:gsLst>'
            f'<a:lin ang="{angle * 60000}" scaled="0"/></a:gradFill>')
        if old is not None:
            rpr.replace(old, g)
        else:
            rpr.insert(0, g)
    return tb


def blob(slide, x, y, d, color, alpha, name):
    """Fon uchun yumshoq rangli dog' — Morph bilan slayddan slaydga suzib o'tadi."""
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    s.line.fill.background()
    sp = s._element.spPr
    for tag in ("solidFill", "gradFill", "noFill"):
        for el in sp.findall(f"{{{A_NS}}}{tag}"):
            sp.remove(el)
    g = etree.fromstring(
        f'<a:gradFill xmlns:a="{A_NS}" rotWithShape="1"><a:gsLst>'
        f'<a:gs pos="0"><a:srgbClr val="{color}"><a:alpha val="{alpha}"/></a:srgbClr></a:gs>'
        f'<a:gs pos="35000"><a:srgbClr val="{color}"><a:alpha val="{alpha // 2}"/></a:srgbClr></a:gs>'
        f'<a:gs pos="66000"><a:srgbClr val="{color}"><a:alpha val="0"/></a:srgbClr></a:gs>'
        f'<a:gs pos="100000"><a:srgbClr val="{color}"><a:alpha val="0"/></a:srgbClr></a:gs></a:gsLst>'
        f'<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill>')
    sp.find(f"{{{A_NS}}}prstGeom").addnext(g)
    set_name(s, name)
    tree = slide.shapes._spTree
    tree.remove(s._element)
    tree.insert(2, s._element)  # eng orqaga
    return s


def icon(shapes, x, y, size, name, style="grad"):
    """Yumaloq kvadrat ichidagi ikonka. style: grad | soft | navy | white."""
    fill, suf = {"grad": (GRAD, "w"), "soft": (MINT, "t"), "navy": (GRAD_NAVY, "w"),
                 "white": (WHITE, "t")}[style]
    t = shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(size), Inches(size))
    t.adjustments[0] = 0.28
    paint(t, fill)
    t.line.fill.background()
    k = 0.56
    shapes.add_picture(os.path.join(ICON_DIR, f"{name}_{suf}.png"), Inches(x + size * (1 - k) / 2),
                       Inches(y + size * (1 - k) / 2), Inches(size * k), Inches(size * k))
    return t


def box(shapes, x, y, w, h, fill=WHITE, line=None, radius=0.12, shape=MSO_SHAPE.ROUNDED_RECTANGLE,
        dash=False, line_w=1.0, shade=False):
    s = shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    if fill == TEAL:
        fill = GRAD_FILL
    if fill is None or isinstance(fill, tuple):
        paint(s, fill)
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = rgb(fill)
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(line_w)
        if dash:
            s.line.dash_style = MSO_LINE.DASH
    else:
        s.line.fill.background()
    if shade:
        shadow(s)
    s.text_frame.text = ""
    return s


def text(shapes, x, y, w, h, paras, size=14, color=BODY, font=TEXT, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, space_after=0, line_spacing=None):
    """paras: str | list[str | list[(text, {opts})]]."""
    tb = shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, side, 0)
    tf.vertical_anchor = anchor
    if isinstance(paras, str):
        paras = [paras]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if space_after:
            p.space_after = Pt(space_after)
        if line_spacing:
            p.line_spacing = line_spacing
        runs = [(para, {})] if isinstance(para, str) else para
        for t, o in runs:
            r = p.add_run()
            r.text = t
            f = r.font
            f.size = Pt(o.get("size", size))
            f.name = o.get("font", font)
            f.bold = o.get("bold", False)
            f.italic = o.get("italic", False)
            f.color.rgb = rgb(o.get("color", color))
    return tb


def badge(shapes, x, y, d, label, fill=TEAL, color=WHITE, size=14):
    c = shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    paint(c, GRAD_FILL if fill == TEAL else GRAD_NAVY if fill == NAVY else fill)
    c.line.fill.background()
    tf = c.text_frame
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, side, 0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = label
    r.font.size = Pt(size)
    r.font.name = HEAD
    r.font.color.rgb = rgb(color)
    return c


def picture(shapes, name, x, y, w=None, h=None, soft=0.3):
    """Rasm; chetlari yumshatiladi — oq foni slayd foniga sezilmay qo'shiladi."""
    path = os.path.join(IMG, name)
    kw = {}
    if w:
        kw["width"] = Inches(w)
    if h:
        kw["height"] = Inches(h)
    pic = shapes.add_picture(path, Inches(x), Inches(y), **kw)
    if soft:
        eff = etree.SubElement(pic._element.spPr, f"{{{A_NS}}}effectLst")
        etree.SubElement(eff, f"{{{A_NS}}}softEdge", rad=str(int(Inches(soft))))
    return pic


# ═══════════════════════════ animatsiya (OOXML) ═══════════════════════════
TRANSITION = (
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'xmlns:p="' + P_NS + '">'
    '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
    '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="{dur}">'
    '<p159:morph option="byObject"/></p:transition></mc:Choice>'
    '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>'
    '</mc:AlternateContent>'
)

PRESET = {"fade": (10, 0), "float": (42, 0), "wipe": (22, 8), "zoom": (53, 16)}


def _tgt(spid):
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def _behaviors(kind, spid, dur, ids):
    out = [
        f'<p:set><p:cBhvr><p:cTn id="{next(ids)}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/>'
        f'</p:stCondLst></p:cTn>{_tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName>'
        f'</p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>'
    ]

    def anim(attr, frm, to):
        return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{next(ids)}" '
                f'dur="{dur}" fill="hold"/>{_tgt(spid)}<p:attrNameLst><p:attrName>{attr}</p:attrName>'
                f'</p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="{frm}"/></p:val>'
                f'</p:tav><p:tav tm="100000"><p:val><p:strVal val="{to}"/></p:val></p:tav></p:tavLst></p:anim>')

    def effect(flt):
        return (f'<p:animEffect transition="in" filter="{flt}"><p:cBhvr><p:cTn id="{next(ids)}" dur="{dur}"/>'
                f'{_tgt(spid)}</p:cBhvr></p:animEffect>')

    if kind == "fade":
        out.append(effect("fade"))
    elif kind == "float":
        out.append(effect("fade"))
        out.append(anim("ppt_x", "#ppt_x", "#ppt_x"))
        out.append(anim("ppt_y", "#ppt_y+.06", "#ppt_y"))
    elif kind == "wipe":
        out.append(effect("wipe(left)"))
    elif kind == "zoom":
        out.append(anim("ppt_w", "0", "#ppt_w"))
        out.append(anim("ppt_h", "0", "#ppt_h"))
        out.append(effect("fade"))
    return "".join(out)


def apply_motion(slide, effects, morph_ms=1000):
    """effects: [(shape, kind, start_ms, dur_ms)] — hammasi slayd ochilgach o'zi boshlanadi."""
    sld = slide._element
    clr = sld.find(f"{{{P_NS}}}clrMapOvr")
    clr.addnext(etree.fromstring(TRANSITION.format(dur=morph_ms)))
    if not effects:
        return
    ids = itertools.count(5)
    pars, bld = [], []
    for i, (shp, kind, start, dur) in enumerate(effects):
        spid = shp.shape_id
        node = "afterEffect" if i == 0 else "withEffect"
        if kind == "bob":  # to'xtovsiz yengil tebranish (asosiy rasmlar uchun)
            ctn, inner = next(ids), next(ids)
            pars.append(
                f'<p:par><p:cTn id="{ctn}" presetID="0" presetClass="path" presetSubtype="0" '
                f'repeatCount="indefinite" accel="50000" decel="50000" autoRev="1" fill="hold" '
                f'nodeType="{node}"><p:stCondLst><p:cond delay="{start}"/></p:stCondLst><p:childTnLst>'
                f'<p:animMotion origin="layout" path="M 0 0 L 0 -0.014" pathEditMode="relative" rAng="0" '
                f'ptsTypes="AA"><p:cBhvr><p:cTn id="{inner}" dur="{dur}" fill="hold"/>{_tgt(spid)}'
                f'<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst>'
                f'</p:cBhvr></p:animMotion></p:childTnLst></p:cTn></p:par>')
            continue
        pid, sub = PRESET[kind]
        ctn = next(ids)
        beh = _behaviors(kind, spid, dur, ids)
        pars.append(
            f'<p:par><p:cTn id="{ctn}" presetID="{pid}" presetClass="entr" presetSubtype="{sub}" '
            f'fill="hold" grpId="0" nodeType="{node}"><p:stCondLst><p:cond delay="{start}"/></p:stCondLst>'
            f'<p:childTnLst>{beh}</p:childTnLst></p:cTn></p:par>')
        if shp._element.tag == f"{{{P_NS}}}sp":
            bld.append(f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>')
    timing = (
        f'<p:timing xmlns:p="{P_NS}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" '
        f'nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" '
        f'nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst>'
        f'<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
        f'<p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>'
        f'<p:childTnLst>{"".join(pars)}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>'
        f'</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/>'
        f'</p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl>'
        f'<p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
        + (f'<p:bldLst>{"".join(bld)}</p:bldLst>' if bld else "") + '</p:timing>')
    sld.find(f"{{{P_NS}}}clrMapOvr").getnext().addnext(etree.fromstring(timing))


class Seq:
    """Slayddagi elementlarning paydo bo'lish tartibi."""

    def __init__(self, start=250, step=170):
        self.t, self.step, self.items = start, step, []

    def add(self, shp, kind="float", dur=600, gap=None, at=None):
        t = self.t if at is None else at
        self.items.append((shp, kind, t, dur))
        self.t = t + (self.step if gap is None else gap)
        return shp

    def hero(self, shp, kind="fade", at=150, dur=900):
        """Asosiy rasm: paydo bo'ladi, so'ng to'xtovsiz yengil tebranadi."""
        self.items.append((shp, kind, at, dur))
        self.items.append((shp, "bob", at + dur + 200, 2600))
        return shp


# ═══════════════════════════ slayd karkaslari ═══════════════════════════
prs = Presentation()
prs.slide_width, prs.slide_height = Inches(W), Inches(H)
BLANK = prs.slide_layouts[6]
SLIDES = []  # (slide, seq, morph_ms)
page = itertools.count(1)


def new_slide(notes, morph=1000):
    s = prs.slides.add_slide(BLANK)
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = rgb("FEFEFE")  # rasmlarning oq foni bilan aynan bir xil
    s.notes_slide.notes_text_frame.text = notes
    seq = Seq()
    SLIDES.append((s, seq, morph))
    n = next(page)
    return s, seq, n


N_SECTIONS = 8


def rich_title(shapes, x, y, w, h, title, size, **kw):
    """Sarlavha; *yulduzcha ichidagi* so'zlar gradient bilan ajratiladi."""
    parts = title.split("*")
    runs = [(p, {"hl": i % 2 == 1}) for i, p in enumerate(parts) if p]
    tb = text(shapes, x, y, w, h, [[(t, {}) for t, _ in runs]], size=size, color=NAVY, font=HEAD, **kw)
    for r_el, (_, o) in zip(tb._element.iter(f"{{{A_NS}}}r"), runs):
        if o["hl"]:
            rpr = r_el.find(f"{{{A_NS}}}rPr")
            old = rpr.find(f"{{{A_NS}}}solidFill")
            g = etree.fromstring(
                f'<a:gradFill xmlns:a="{A_NS}"><a:gsLst><a:gs pos="0"><a:srgbClr val="{GRAD_TXT[0]}"/></a:gs>'
                f'<a:gs pos="100000"><a:srgbClr val="{GRAD_TXT[1]}"/></a:gs></a:gsLst>'
                f'<a:lin ang="0" scaled="0"/></a:gradFill>')
            rpr.replace(old, g)
    return tb


def section_dots(sh, current):
    """O'ng yuqorida: 8 bo'limdan qaysi birida ekanimiz (Morph bilan siljiydi)."""
    x = W - ML
    for i in range(N_SECTIONS, 0, -1):
        cur = i == current
        w = 0.42 if cur else 0.12
        x -= w
        d = box(sh, x, 0.5, w, 0.12, fill=GRAD if cur else ("9FE3D8" if i < current else "DDE5EC"), radius=0.5)
        set_name(d, f"!!dot{i}")
        x -= 0.09


def frame(s, n, secnum, section, title):
    """Kontent slayd: bo'lim belgisi, sarlavha, pastki qism."""
    sh = s.shapes
    if secnum:
        set_name(grad_text(text(sh, ML, 0.42, 0.45, 0.3, secnum, size=13, color=TEAL_D, font=HEAD)), "!!secnum")
        section_dots(sh, int(secnum))
    set_name(text(sh, ML + (0.45 if secnum else 0), 0.42, 6, 0.3, section, size=13, color=MUTED, font=HEAD),
             "!!eyebrow")
    set_name(rich_title(sh, ML, 0.78, W - 2 * ML, 0.75, title, 30), "!!title")
    logo = sh.add_picture(LOGO, Inches(ML), Inches(6.93), height=Inches(0.28))
    set_name(logo, "!!flogo")
    set_name(text(sh, ML + 0.4, 6.96, 6, 0.25, "NMED · diagnostika tahlillari uchun AI platforma",
                  size=10, color=MUTED), "!!ftext")
    set_name(text(sh, W - ML - 1, 6.96, 1, 0.25, str(n), size=10, color=MUTED, align=PP_ALIGN.RIGHT), "!!page")


def divider(num, title, sub, notes, topics=()):
    s, seq, n = new_slide(notes)
    sh = s.shapes
    set_name(sh.add_picture(os.path.join(IMG, "13_bolim_fon.jpg"), 0, 0, Inches(W), Inches(H)), "!!bg")
    set_name(grad_text(text(sh, 0.9, 1.05, 3.5, 1.6, num, size=100, color=TEAL, font="Segoe UI Black")),
             "!!secnum")
    set_name(text(sh, 0.9, 2.95, 10, 0.9, title, size=44, color=NAVY, font=HEAD), "!!eyebrow")
    seq.add(text(sh, 0.9, 3.95, 9, 0.6, sub, size=20, color=MUTED), "float", at=250)
    x = 0.9
    for i, tp in enumerate(topics):  # bo'limda nima borligi — kapsulalar
        wch = 0.42 + len(tp) * 0.105
        g = sh.add_group_shape()
        gs = g.shapes
        box(gs, x, 4.75, wch, 0.46, fill=WHITE, line="BFEDE5", radius=0.5, shade=True)
        text(gs, x, 4.75, wch, 0.46, tp, size=14, color=TEAL_D, font=HEAD, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE)
        seq.add(g, "float", at=550 + i * 130, dur=500)
        x += wch + 0.16
    # bo'limlar ko'rsatkichi
    dx = 0.9
    for i in range(1, N_SECTIONS + 1):
        cur = i == int(num)
        w = 0.6 if cur else 0.16
        set_name(box(sh, dx, 0.62, w, 0.14, fill=GRAD if cur else ("9FE3D8" if i < int(num) else "DDE5EC"),
                     radius=0.5), f"!!dot{i}")
        dx += w + 0.1
    return s


def card(shapes, x, y, w, h, num, head, body, fill=WHITE, line=BORDER, body_size=14, shade=True,
         num_fill=TEAL, head_size=16, ico=None):
    g = shapes.add_group_shape()
    gs = g.shapes
    box(gs, x, y, w, h, fill=fill, line=line, shade=shade, radius=0.08)
    pad = 0.25
    tx = x + pad
    if ico:
        icon(gs, x + pad, y + pad - 0.02, 0.56, ico)
        tx = x + pad + 0.74
    elif num is not None:
        badge(gs, x + pad, y + pad, 0.48, str(num), fill=num_fill, size=14)
        tx = x + pad + 0.65
    tw = x + w - pad - tx
    text(gs, tx, y + pad + 0.06, tw, 0.4, head, size=head_size, color=NAVY, font=HEAD)
    if body:
        text(gs, tx, y + pad + 0.48, tw, h - pad * 2 - 0.48, body, size=body_size, color=BODY)
    return g


def row(shapes, x, y, w, num, head, body, num_fill=TEAL, body_h=0.62):
    """Ramkasiz qator: raqamli doira + sarlavha + matn."""
    g = shapes.add_group_shape()
    gs = g.shapes
    badge(gs, x, y, 0.44, str(num), fill=num_fill, size=13)
    text(gs, x + 0.62, y + 0.02, w - 0.62, 0.36, head, size=16, color=NAVY, font=HEAD)
    text(gs, x + 0.62, y + 0.4, w - 0.62, body_h, body, size=14, color=BODY)
    return g


def stat(shapes, x, y, w, h, value, label, color=TEAL_D, fill=MINT2, line=None, value_size=40, dash=False,
         label_color=BODY):
    g = shapes.add_group_shape()
    gs = g.shapes
    box(gs, x, y, w, h, fill=fill, line=line, dash=dash, radius=0.1, line_w=1.25, shade=fill != WHITE or not dash)
    v = text(gs, x + 0.25, y + 0.18, w - 0.5, 0.75, value, size=value_size, color=color, font="Segoe UI Black")
    if color == TEAL_D:
        grad_text(v)
    text(gs, x + 0.25, y + 0.18 + value_size / 72 * 1.25, w - 0.5, h - 0.4 - value_size / 72 * 1.25,
         label, size=14, color=label_color)
    return g


def flow(sh, seq, items, y, h, start=300, step=350, numbered=True, body_size=14, last_hl=True, icons=()):
    """Gorizontal bosqichlar: kartochka → strelka → kartochka."""
    gap = 0.42
    k = len(items)
    cw = (W - 2 * ML - (k - 1) * gap) / k
    for i, (head, body) in enumerate(items):
        x = ML + i * (cw + gap)
        hl = last_hl and i == k - 1
        g = sh.add_group_shape()
        gs = g.shapes
        box(gs, x, y, cw, h, fill=MINT if hl else WHITE, line=None if hl else BORDER, shade=True, radius=0.07)
        if numbered:
            badge(gs, x + 0.22, y + 0.22, 0.5, str(i + 1), fill=NAVY if hl else TEAL, size=15)
        if icons:
            icon(gs, x + cw - 0.72, y + 0.2, 0.52, icons[i], style="white" if hl else "soft")
        text(gs, x + 0.22, y + 0.88, cw - 0.44, 0.7, head, size=16, color=NAVY, font=HEAD)
        text(gs, x + 0.22, y + 1.55, cw - 0.44, h - 1.7, body, size=body_size, color=BODY)
        seq.add(g, "float", at=start + i * step, dur=600)
        if i < k - 1:
            a = sh.add_shape(MSO_SHAPE.CHEVRON, Inches(x + cw + 0.11), Inches(y + 0.33), Inches(0.2), Inches(0.28))
            paint(a, GRAD)
            a.line.fill.background()
            seq.add(a, "fade", at=start + i * step + 250, dur=300)
    return cw


def add_blobs():
    """Har slayd foniga ikkita yumshoq rangli dog' qo'yadi. Joylashuvi slayd tuzilishiga qarab:
    o'ngda katta rasm bo'lsa — chap tomonda (rasmning oq foni ko'rinib qolmasin);
    to'liq ekranli rasm bo'lsa — qo'yilmaydi."""
    drift = [(0, 0), (0.7, 0.25), (-0.35, 0.5), (0.4, -0.3)]
    for i, (slide, _, _) in enumerate(SLIDES):
        widths = [sp.width / 914400 for sp in slide.shapes
                  if sp.shape_type == 13 and sp.height > Inches(1)]
        if any(w_ > 9.5 for w_ in widths):
            continue
        dx, dy = drift[i % len(drift)]
        if any(w_ > 3 for w_ in widths):
            blob(slide, -3.2 + dx, -3.6 + dy, 8.5, "5EEAD4", 62000, "!!blobA")
            blob(slide, -3.0 - dx, 3.3 + dy, 7.6, "7DD3FC", 55000, "!!blobB")
        else:
            blob(slide, -3.0 + dx, -3.4 + dy, 9.0, "5EEAD4", 62000, "!!blobA")
            blob(slide, 7.6 - dx, 2.6 - dy, 9.0, "7DD3FC", 55000, "!!blobB")


def tiles(sh, seq, items, cols, x0, y0, w, th, gap=0.22, start=300, step=130, head_color=TEAL_D):
    """Sarlavha + qisqa matnli plitkalar to'ri."""
    tw = (w - (cols - 1) * gap) / cols
    for i, item in enumerate(items):
        head, body = item[0], item[1]
        ico = item[2] if len(item) > 2 else None
        x = x0 + (i % cols) * (tw + gap)
        y = y0 + (i // cols) * (th + gap)
        g = sh.add_group_shape()
        gs = g.shapes
        box(gs, x, y, tw, th, fill=WHITE, line=BORDER, shade=True, radius=0.08)
        ty = y + 0.18
        if ico:
            icon(gs, x + 0.25, y + 0.22, 0.56, ico, style="grad" if i % 2 == 0 else "navy")
            ty = y + 0.9
        text(gs, x + 0.25, ty, tw - 0.5, 0.4, head, size=16, color=NAVY if ico else head_color, font=HEAD)
        text(gs, x + 0.25, ty + 0.4, tw - 0.5, th - (ty - y) - 0.5, body, size=14, color=BODY)
        seq.add(g, "float", at=start + i * step)


def skel(gs, x, y, w, h=0.14, color="E2E8F0"):
    """Sxematik ko'rinishdagi kulrang "matn" chizig'i."""
    return box(gs, x, y, w, h, fill=color, radius=0.5)


PH = {"color": AMBER_D}  # to'ldiriladigan joy

# ═══════════════════════════ 1. TITUL ═══════════════════════════
s, seq, n = new_slide(
    "Assalomu alaykum, hurmatli kengash raisi va a’zolari! "
    "Men [F.I.Sh.] o‘zimning «[dissertatsiya mavzusi]» mavzusidagi dissertatsiya ishimni taqdim etaman. "
    "Tadqiqot doirasida NMED platformasi ishlab chiqildi: u EKG, Holter, SMAD va laboratoriya "
    "tahlillarini sun’iy intellekt yordamida talqin qiladi va bemor bo‘yicha birlashtiradi. "
    "Taqdimotda platformaning tuzilishi, ishlash usuli, ilmiy yangiligi va amaliy natijalarini ko‘rsataman.")
sh = s.shapes
hero = picture(sh, "01_titul.jpg", 3.33, 0.875, w=10.0)
set_name(hero, "!!heart")
seq.items.append((hero, "bob", 1200, 3000))
seq.add(sh.add_picture(LOGO, Inches(0.8), Inches(0.7), height=Inches(0.62)), "fade", at=150)
seq.add(text(sh, 1.55, 0.78, 3, 0.5, "NMED", size=26, color=NAVY, font=HEAD), "fade", at=150)
g = sh.add_group_shape()
box(g.shapes, 0.8, 1.72, 2.85, 0.42, fill=GRAD_FILL, radius=0.5, shade=True)
text(g.shapes, 0.8, 1.72, 2.85, 0.42, "DISSERTATSIYA HIMOYASI", size=12, color=WHITE, font=HEAD,
     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
seq.add(g, at=350)
seq.add(text(sh, 0.8, 2.25, 5.6, 0.4, [[("[Dissertatsiya mavzusi]", PH)]], size=16), at=450)
seq.add(rich_title(sh, 0.8, 2.75, 5.6, 2.2,
                   "Diagnostika tahlillarini *sun’iy intellekt* yordamida talqin qiluvchi platforma",
                   32, line_spacing=0.95), at=600, dur=800)
seq.add(text(sh, 0.8, 5.1, 5.6, 1.4, [
    [("Izlanuvchi:  ", {"color": MUTED}), ("[F.I.Sh.]", PH)],
    [("Ilmiy rahbar:  ", {"color": MUTED}), ("[F.I.Sh., ilmiy darajasi]", PH)],
    [("Ixtisoslik:  ", {"color": MUTED}), ("[shifr — nomi]", PH)],
    [("[Shahar] — 2026", PH)],
], size=14, space_after=3), at=900)

# ═══════════════════════════ 2. REJA ═══════════════════════════
s, seq, n = new_slide(
    "Taqdimot oltita qismdan iborat. Avval tadqiqotning dolzarbligi va maqsadini aytaman, so‘ng "
    "platforma arxitekturasini va AI tahlil usulini tushuntiraman. Keyin to‘rtta tahlil modulini, "
    "kompleks tahlil va ilmiy yangilikni ko‘rsataman. Oxirida amaliy joriy etish natijalari va "
    "xulosalarni keltiraman.")
sh = s.shapes
set_name(rich_title(sh, ML, 0.78, 8, 0.75, "Taqdimot *rejasi*", 30), "!!title")
set_name(picture(sh, "01_titul.jpg", 7.4, 2.3, w=5.9), "!!heart")
agenda = [("01", "Tadqiqot dolzarbligi", "muammo, davlat dasturlari, maqsad"),
          ("02", "Platforma", "imkoniyatlar, arxitektura, rollar, ulanish, qulaylik"),
          ("03", "AI tahlil metodologiyasi", "tahlil oqimi, ishonchlilik, javob, modellar"),
          ("04", "Tahlil modullari", "EKG, Holter, SMAD, laboratoriya, natija"),
          ("05", "Kompleks tahlil va ilmiy yangilik", "kompleks xulosa, xavf signallari, erta aniqlash"),
          ("06", "Klinik ish jarayoni", "bemor kartasi, vipiska, konsultatsiya, PDF"),
          ("07", "Boshqaruv va xavfsizlik", "panel, statistika, SuperAdmin, himoya"),
          ("08", "Joriy etish va natijalar", "natijalar, joriy etish, xulosa")]
for i, (num, head, sub) in enumerate(agenda):
    y = 1.65 + i * 0.64
    g = sh.add_group_shape()
    gs = g.shapes
    grad_text(text(gs, ML, y, 0.8, 0.55, num, size=22, color=TEAL, font="Segoe UI Black"))
    text(gs, ML + 0.85, y + 0.0, 6.0, 0.35, head, size=17, color=NAVY, font=HEAD)
    text(gs, ML + 0.85, y + 0.33, 6.0, 0.28, sub, size=12, color=MUTED)
    seq.add(g, "float", at=500 + i * 120)
logo = sh.add_picture(LOGO, Inches(ML), Inches(6.93), height=Inches(0.28))
set_name(logo, "!!flogo")
set_name(text(sh, ML + 0.4, 6.96, 6, 0.25, "NMED · diagnostika tahlillari uchun AI platforma", size=10,
              color=MUTED), "!!ftext")
set_name(text(sh, W - ML - 1, 6.96, 1, 0.25, str(n), size=10, color=MUTED, align=PP_ALIGN.RIGHT), "!!page")

# ═══════════════════════════ 01 · DOLZARBLIK ═══════════════════════════
SEC1 = "Tadqiqot dolzarbligi"
divider("01", SEC1, "Nima uchun diagnostika tahlillarini avtomatik talqin qilish zarur?",
        "Birinchi qism — tadqiqotning dolzarbligi. Bu yerda muammoni, davlat dasturlari bilan bog‘liqligini "
        "va tadqiqot maqsadini ko‘rib chiqamiz.",
        topics=['muammo', 'davlat dasturlari', 'maqsad va vazifalar'])

s, seq, n = new_slide(
    "Amaliyotdagi asosiy muammo — shifokorga tushadigan katta yuklama. Bitta shifokor kun davomida "
    "o‘nlab EKG, Holter, SMAD va laboratoriya natijalarini qo‘lda o‘qiydi. Bemorning tahlillari "
    "turli klinikalarda, qog‘ozda va har xil formatdagi fayllarda saqlanadi, shuning uchun ularni bir "
    "joyda ko‘rish qiyin. Natijada turli tahlillardagi bir-biriga bog‘liq belgilar alohida o‘qilganda "
    "e’tibordan chetda qolishi mumkin.")
sh = s.shapes
frame(s, n, "01", SEC1, "Muammo: tahlillar ko‘p, *shifokorning vaqti kam*")
seq.hero(picture(sh, "02_muammo.jpg", 5.85, 1.75, w=7.48), "fade")
for i, (head, body) in enumerate([
    ("Katta yuklama", "Shifokor kun davomida o‘nlab EKG, Holter, SMAD va laboratoriya natijalarini qo‘lda o‘qiydi."),
    ("Tarqoq ma’lumot", "Bemor tahlillari turli klinikalarda, qog‘ozda va har xil formatdagi fayllarda saqlanadi."),
    ("Yo‘qolgan bog‘liqlik", "Turli tahlillardagi o‘zaro bog‘liq belgilar alohida o‘qilganda e’tibordan chetda qoladi."),
]):
    seq.add(card(sh, ML, 1.85 + i * 1.62, 5.35, 1.42, None, head, body, ico=["clock", "folder", "link"][i]),
            at=450 + i * 220)

s, seq, n = new_slide(
    "Tadqiqot mavzusi davlat siyosatining ustuvor yo‘nalishlariga to‘liq mos keladi. "
    "PQ-358 qarori bilan 2030-yilgacha sun’iy intellektni rivojlantirish strategiyasi tasdiqlangan va "
    "sog‘liqni saqlash, xususan diagnostika, ustuvor soha deb belgilangan. PF-189 farmoni 2026-yil "
    "oxirigacha 100 dan ortiq AI loyihasini joriy etishni nazarda tutadi. PF-141 farmoni esa sun’iy "
    "intellektni «Raqamli O‘zbekiston — 2030» strategiyasining ustuvor yo‘nalishi etib belgilaydi. "
    "[Hujjatlar nomi va sanasini rasmiy matn bilan solishtiring.]")
sh = s.shapes
frame(s, n, "01", SEC1, "Tadqiqot *davlat dasturlariga* mos keladi")
for i, (code, date, body) in enumerate([
    ("PQ-358", "14.10.2024", "Sun’iy intellektni rivojlantirish strategiyasi (2030): sog‘liqni saqlash va diagnostika ustuvor yo‘nalish."),
    ("PF-189", "22.10.2025", "2026-yil oxirigacha 100 dan ortiq AI loyihasi joriy etiladi; tashkilotlar AI joriy etgani bo‘yicha baholanadi."),
    ("PF-141", "24.07.2026", "Sun’iy intellekt «Raqamli O‘zbekiston — 2030» strategiyasining ustuvor yo‘nalishi etib belgilangan."),
]):
    x = ML + i * 4.13
    g = sh.add_group_shape()
    gs = g.shapes
    box(gs, x, 2.0, 3.87, 4.3, fill=WHITE, line=BORDER, shade=True, radius=0.06)
    box(gs, x + 0.3, 2.3, 3.27, 1.35, fill=MINT, radius=0.1)
    grad_text(text(gs, x + 0.55, 2.42, 3, 0.75, code, size=36, color=TEAL_D, font="Segoe UI Black"))
    text(gs, x + 0.55, 3.15, 3, 0.35, date, size=14, color=MUTED)
    text(gs, x + 0.3, 3.95, 3.27, 2.2, body, size=16, color=BODY, line_spacing=1.05)
    seq.add(g, "float", at=350 + i * 250, dur=700)

s, seq, n = new_slide(
    "Tadqiqotning maqsadi — diagnostika tahlillarini sun’iy intellekt yordamida avtomatik talqin "
    "qiluvchi va ularni bemor bo‘yicha birlashtiruvchi platformani ishlab chiqish va amaliyotga joriy "
    "etish. Bu maqsadga erishish uchun beshta vazifa qo‘yildi: tahlillarni AI yordamida o‘qish usuli, "
    "laboratoriya ko‘rsatkichlarini yagona katalogga keltirish algoritmi, kompleks xulosa modeli, xavf "
    "signallari tizimi va platformani klinikalarda sinab ko‘rish. "
    "[Maqsad va vazifalarni avtoreferatdagi matn bilan bir xil qiling.]")
sh = s.shapes
frame(s, n, "01", SEC1, "Tadqiqot *maqsadi* va vazifalari")
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 1.85, 4.6, 4.65, fill=TEAL, radius=0.06)
text(gs, ML + 0.35, 2.15, 3.9, 0.4, "MAQSAD", size=14, color="D1FAF3", font=HEAD)
text(gs, ML + 0.35, 2.6, 3.9, 3.7,
     "Diagnostika tahlillarini sun’iy intellekt yordamida avtomatik talqin qiluvchi va ularni bemor "
     "bo‘yicha birlashtiruvchi platformani ishlab chiqish va amaliyotga joriy etish.",
     size=20, color=WHITE, font=HEAD, line_spacing=1.05)
seq.add(g, "float", at=300, dur=700)
tasks = ["EKG, Holter, SMAD va laboratoriya natijalarini AI yordamida o‘qish usulini ishlab chiqish.",
         "Laboratoriya ko‘rsatkichlarini yagona katalog va o‘lchov birliklariga keltirish algoritmini yaratish.",
         "Bir nechta tahlilni birgalikda talqin qiluvchi kompleks xulosa modelini qurish.",
         "Laboratoriya natijalari asosida klinik xavf signallari tizimini ishlab chiqish.",
         "Platformani klinikalarda sinab ko‘rish va natijalarini baholash."]
text_x = ML + 4.95
seq.add(text(sh, text_x, 1.85, 6, 0.35, "VAZIFALAR", size=14, color=TEAL_D, font=HEAD), "fade", at=550)
for i, t in enumerate(tasks):
    g = sh.add_group_shape()
    gs = g.shapes
    badge(gs, text_x, 2.3 + i * 0.86, 0.44, str(i + 1), fill=MINT, color=TEAL_D, size=13)
    text(gs, text_x + 0.62, 2.33 + i * 0.86, W - ML - text_x - 0.62, 0.8, t, size=15, color=BODY)
    seq.add(g, "float", at=700 + i * 170)

# ═══════════════════════════ 02 · ARXITEKTURA ═══════════════════════════
SEC2 = "Platforma"
divider("02", SEC2, "Imkoniyatlar, tuzilish va foydalanuvchilar",
        "Ikkinchi qism — platformaning o‘zi: qanday imkoniyatlari bor, qanday qurilgan, kim ishlatadi va "
        "klinika unga qanday ulanadi.",
        topics=['imkoniyatlar', 'arxitektura', 'rollar', 'ulanish', 'qulaylik'])

s, seq, n = new_slide(
    "Taklif etilgan yechim — NMED platformasi. U to‘rt turdagi diagnostika tahlilini bitta tizimda "
    "jamlaydi: EKG, Holter monitoring, sutkalik qon bosimi monitoringi — SMAD, va laboratoriya "
    "tahlillari. Har bir tahlil sun’iy intellekt yordamida talqin qilinadi, natijalar esa bemor kartasida "
    "bir joyda saqlanadi. Shu tufayli shifokor bemorning barcha tahlillarini bir ekranda ko‘radi.")
sh = s.shapes
frame(s, n, "02", SEC2, "Yechim: to‘rt turdagi tahlil *bitta platformada*")
seq.hero(picture(sh, "03_yechim.jpg", 5.75, 1.65, w=7.2), "zoom")
seq.add(text(sh, ML, 1.9, 5.0, 1.3,
             "NMED tahlillarni sun’iy intellekt yordamida talqin qiladi va bemor kartasida bir joyga jamlaydi.",
             size=18, color=NAVY, font=HEAD, line_spacing=1.05), at=500)
for i, (head, body) in enumerate([
    ("EKG", "yurakning elektr faolligi yozuvi"),
    ("Holter", "sutkalik EKG monitoringi"),
    ("SMAD", "sutkalik qon bosimi monitoringi"),
    ("Laboratoriya", "qon, siydik va boshqa tahlillar"),
]):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 3.35 + i * 0.78
    box(gs, ML, y, 0.14, 0.14, fill=TEAL, shape=MSO_SHAPE.OVAL)
    text(gs, ML + 0.35, y - 0.12, 4.8, 0.4, [[(head, {"font": HEAD, "color": NAVY}), (" — " + body, {})]],
         size=16, color=BODY)
    seq.add(g, "float", at=750 + i * 160)

s, seq, n = new_slide(
    "Bu slaydda platformaning barcha imkoniyatlari bitta xaritada ko‘rsatilgan. Ular to‘rt guruhga "
    "bo‘linadi. Birinchi guruh — tahlil modullari: EKG, Holter, SMAD va laboratoriya. Ikkinchi guruh — AI "
    "asosidagi tahlil: kompleks xulosa, xavf signallari, kasallik dinamikasi va natijani uch tilga tarjima "
    "qilish. Uchinchi guruh — shifokorning kundalik ishi: bemor kartasi, shifokor xulosasi, vipiska va "
    "onlayn konsultatsiya. To‘rtinchi guruh — boshqaruv: klinika paneli, statistika, SuperAdmin kabineti, "
    "audit va AI xarajati nazorati. Keyingi slaydlarda har birini alohida ko‘rib chiqamiz.")
sh = s.shapes
frame(s, n, "02", SEC2, "Platforma *imkoniyatlari* xaritasi")
cap_groups = [
    ("Tahlil", [("EKG", "rasm yoki PDF, 12 tarmoq", "health"), ("Holter", "sutkalik EKG, epizodlar", "datetime"),
                ("SMAD", "sutkalik qon bosimi", "heart"), ("Laboratoriya", "1–10 fayl, 137 ko‘rsatkich", "checklist")]),
    ("AI tahlil", [("Kompleks xulosa", "2–10 tahlil birga", "puzzle"), ("Xavf signallari", "25 ta klinik qoida", "warning"),
                   ("Dinamika", "ko‘rsatkichlar grafigi", "chart"), ("Tarjima", "o‘zbek, rus, ingliz", "translate")]),
    ("Klinik ish", [("Bemor kartasi", "barcha tahlillar bir joyda", "idcard"), ("Shifokor xulosasi", "har bir tahlilga", "edit"),
                    ("Vipiska", "epikriz, QR bilan tasdiq", "doc"), ("Konsultatsiya", "tashqi mutaxassis, video", "video")]),
    ("Boshqaruv", [("Klinika paneli", "tahlillar, xodimlar, eksport", "grid"), ("Statistika", "filtrlar, PDF hisobot", "pie"),
                   ("SuperAdmin", "butun platforma nazorati", "admin"), ("Audit va xarajat", "har bir amal va AI chaqiruvi", "history")]),
]
lw, gap_ = 1.7, 0.16
tw_ = (W - 2 * ML - lw - 4 * gap_) / 4
for r, (gname, items) in enumerate(cap_groups):
    y = 1.8 + r * 1.17
    g = sh.add_group_shape()
    gs = g.shapes
    box(gs, ML, y, lw, 1.0, fill=[GRAD_FILL, GRAD_NAVY, GRAD_FILL, GRAD_NAVY][r], radius=0.12, shade=True)
    text(gs, ML + 0.22, y, lw - 0.4, 1.0, gname, size=16, color=WHITE, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    for c, (head, body, ic) in enumerate(items):
        x = ML + lw + gap_ + c * (tw_ + gap_)
        box(gs, x, y, tw_, 1.0, fill=WHITE, line=BORDER, radius=0.12, shade=True)
        icon(gs, x + 0.13, y + 0.27, 0.46, ic, style="soft")
        text(gs, x + 0.7, y + 0.14, tw_ - 0.76, 0.36, head, size=14, color=NAVY, font=HEAD)
        text(gs, x + 0.7, y + 0.46, tw_ - 0.76, 0.5, body, size=12, color=MUTED)
    seq.add(g, "float", at=300 + r * 280, dur=650)

s, seq, n = new_slide(
    "Platforma uch qatlamdan iborat. Foydalanuvchi interfeysi React kutubxonasida yozilgan. Barcha "
    "so‘rovlar .NET 8 da yozilgan API orqali o‘tadi: u foydalanuvchini tekshiradi, ruxsatlarni "
    "boshqaradi va ma’lumotlarni saqlaydi. Sun’iy intellekt bilan ishlash alohida Python xizmatida "
    "joylashgan. Interfeys AI xizmatiga hech qachon to‘g‘ridan-to‘g‘ri murojaat qilmaydi — bu xavfsizlik "
    "qoidasi. Ikkala backend bitta PostgreSQL bazasidan foydalanadi, natija tayyor bo‘lganda esa "
    "foydalanuvchiga SignalR orqali real vaqtda xabar boradi.")
sh = s.shapes
frame(s, n, "02", SEC2, "*Uch qatlamli* arxitektura")
cols = [("Interfeys", "React 18 · Ant Design", "Shifokor va xodimlar ishlaydigan veb-ilova"),
        ("API qatlami", ".NET 8 · ASP.NET Core", "Kirish, ruxsatlar, ma’lumotlar, PDF hujjatlar"),
        ("AI xizmati", "Python · FastAPI", "Faylni tekshirish va AI talqinini boshqarish"),
        ("AI modellari", "OpenAI", "Tibbiy hujjatni o‘qish va xulosa yozish")]
cw, gap, cy, ch = 2.62, 0.55, 1.95, 2.15
xs = [ML + i * (cw + gap) for i in range(4)]
t0 = 300
for i, (head, tech, role) in enumerate(cols):
    g = sh.add_group_shape()
    gs = g.shapes
    hl = i == 2
    box(gs, xs[i], cy, cw, ch, fill=TEAL if hl else WHITE, line=None if hl else BORDER, shade=True, radius=0.08)
    icon(gs, xs[i] + cw - 0.66, cy + 0.16, 0.46, ["laptop", "sliders", "robot", "chip"][i],
         style="white" if hl else "soft")
    text(gs, xs[i] + 0.25, cy + 0.25, cw - 1.1, 0.4, head, size=18, color=WHITE if hl else NAVY, font=HEAD)
    text(gs, xs[i] + 0.25, cy + 0.68, cw - 0.5, 0.35, tech, size=14, color="D1FAF3" if hl else TEAL_D, font=HEAD)
    text(gs, xs[i] + 0.25, cy + 1.1, cw - 0.5, 0.9, role, size=14, color=WHITE if hl else BODY)
    seq.add(g, "float", at=t0 + i * 450, dur=600)
    if i < 3:
        a = sh.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(xs[i] + cw + 0.1), Inches(cy + ch / 2 - 0.15),
                         Inches(gap - 0.2), Inches(0.3))
        a.fill.solid()
        a.fill.fore_color.rgb = rgb(TEAL)
        a.line.fill.background()
        seq.add(a, "wipe", at=t0 + i * 450 + 300, dur=350)
# ma'lumotlar bazasi
g = sh.add_group_shape()
gs = g.shapes
for xi in (1, 2):
    ln = box(gs, xs[xi] + cw / 2 - 0.02, cy + ch, 0.04, 0.55, fill=TEAL, shape=MSO_SHAPE.RECTANGLE)
box(gs, xs[1], 4.65, xs[2] + cw - xs[1], 0.85, fill=MINT, radius=0.15)
text(gs, xs[1] + 0.3, 4.65, xs[2] + cw - xs[1] - 0.6, 0.85,
     [[("PostgreSQL", {"font": HEAD, "color": NAVY}), ("  —  bitta umumiy ma’lumotlar bazasi", {})]],
     size=16, color=BODY, anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER)
seq.add(g, "float", at=t0 + 4 * 450, dur=600)
g = sh.add_group_shape()
gs = g.shapes
text(gs, ML, 5.85, W - 2 * ML, 0.4, [[("Xavfsizlik qoidasi: ", {"font": HEAD, "color": TEAL_D}),
     ("interfeys AI xizmatiga to‘g‘ridan-to‘g‘ri murojaat qilmaydi — har bir so‘rov API qatlamida tekshiriladi.", {})]],
     size=15, color=BODY)
text(gs, ML, 6.3, W - 2 * ML, 0.4, [[("Real vaqt: ", {"font": HEAD, "color": TEAL_D}),
     ("tahlil tayyor bo‘lishi bilan yuklagan xodimga SignalR orqali xabar boradi.", {})]], size=15, color=BODY)
seq.add(g, "fade", at=t0 + 5 * 450, dur=600)

s, seq, n = new_slide(
    "Platformada beshta rol bor va har bir rol faqat o‘z vazifasiga kerakli ma’lumotni ko‘radi. "
    "SuperAdmin butun platformani kuzatadi. Klinika admini va direktori o‘z klinikasining barcha "
    "tahlillari va xodimlarini boshqaradi. Shifokor o‘ziga yo‘naltirilgan tahlillarni ko‘radi, xulosa va "
    "vipiska yozadi. Hamshira tahlilni yuklaydi va faqat o‘zi yuklaganlarini ko‘radi.")
sh = s.shapes
frame(s, n, "02", SEC2, "*Beshta rol* — har kim o‘z vazifasini ko‘radi")
roles = [("SuperAdmin", "Butun platformani kuzatadi: klinikalar, xodimlar, AI xarajati va audit."),
         ("Admin", "Klinikaning barcha tahlillari, xodimlari va statistikasini boshqaradi."),
         ("Direktor", "Admin bilan bir xil huquqqa ega va klinika ko‘rsatkichlarini kuzatadi."),
         ("Shifokor", "O‘ziga yo‘naltirilgan tahlillarni ko‘radi, xulosa va vipiska yozadi."),
         ("Hamshira", "Tahlilni yuklaydi va faqat o‘zi yuklagan tahlillarni ko‘radi.")]
rw = (W - 2 * ML - 4 * 0.25) / 5
for i, (head, body) in enumerate(roles):
    x = ML + i * (rw + 0.25)
    g = sh.add_group_shape()
    gs = g.shapes
    hl = i == 3
    box(gs, x, 2.0, rw, 4.3, fill=MINT if hl else WHITE, line=None if hl else BORDER, shade=True, radius=0.08)
    icon(gs, x + 0.25, 2.3, 0.7, ["admin", "settings", "chart", "health", "contact"][i],
         style="grad" if hl else "soft")
    text(gs, x + 0.25, 3.15, rw - 0.5, 0.45, head, size=18, color=NAVY, font=HEAD)
    text(gs, x + 0.25, 3.7, rw - 0.5, 2.4, body, size=15, color=BODY, line_spacing=1.05)
    seq.add(g, "float", at=300 + i * 180, dur=650)

s, seq, n = new_slide(
    "Klinika platformaga to‘rt qadamda ulanadi. Avval ro‘yxatdan o‘tiladi: telefon raqami SMS kod bilan "
    "tasdiqlanadi, klinika STIR raqami bo‘yicha tekshiriladi, botlardan himoya uchun reCAPTCHA ishlaydi. "
    "So‘ng klinika ma’lumotlari — nomi, viloyat va tumani, telefonlari, logotipi va litsenziyasi kiritiladi; "
    "logotip keyinchalik har bir PDF hujjat shapkasida chiqadi. Uchinchi qadamda SuperAdmin klinikani "
    "faollashtiradi — ungacha tahlil sahifalari yopiq turadi. Oxirida admin shifokor va hamshiralarni "
    "lavozimi bilan qo‘shadi. Parol unutilsa, u SMS kod orqali tiklanadi.")
sh = s.shapes
frame(s, n, "02", SEC2, "Klinikani ulash: *to‘rt qadam*")
flow(sh, seq, [
    ("Ro‘yxatdan o‘tish", "Telefon SMS kod bilan tasdiqlanadi, klinika STIR bo‘yicha tekshiriladi, reCAPTCHA himoyasi."),
    ("Klinika ma’lumotlari", "Nomi, viloyat va tumani, telefonlari, logotipi va litsenziyasi kiritiladi."),
    ("Faollashtirish", "SuperAdmin klinikani faollashtiradi; ungacha tahlil sahifalari yopiq turadi."),
    ("Xodimlar", "Admin shifokor va hamshiralarni lavozimi bilan tizimga qo‘shadi."),
], y=1.95, h=3.55, icons=["phone", "home", "check", "people"])
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 5.8, W - 2 * ML, 0.75, fill=MINT2, radius=0.3)
text(gs, ML + 0.35, 5.8, W - 2 * ML - 0.7, 0.75, [[("Parolni tiklash: ", {"font": HEAD, "color": TEAL_D}),
     ("parol unutilsa, telefon raqamiga yuborilgan SMS kod orqali yangilanadi.", {})]], size=15, color=BODY,
     anchor=MSO_ANCHOR.MIDDLE)
seq.add(g, "fade", at=1700)

s, seq, n = new_slide(
    "Platforma shifokor va hamshiralar uchun qulay qilib ishlangan. Interfeys uch tilda ishlaydi va til bir "
    "bosishda almashtiriladi. U planshet va telefon ekraniga ham moslashadi. Har bir asosiy sahifada "
    "qadamma-qadam interaktiv yo‘riqnoma bor, alohida yordam sahifasi va Telegram orqali qo‘llab-quvvatlash "
    "mavjud. EKG rasmini yuklashdan oldin rasm sifati tekshiriladi va to‘g‘ri suratga olish bo‘yicha ko‘rsatma "
    "beriladi. Shifokorga kelgan yangi tahlillar esa menyuda son bilan belgilanadi.")
sh = s.shapes
frame(s, n, "02", SEC2, "Foydalanish *qulayligi*")
tiles(sh, seq, [
    ("Uch tilli interfeys", "O‘zbek, rus va ingliz tillari; til bir bosishda almashtiriladi.", "translate"),
    ("Mobil qurilmalar", "Interfeys planshet va telefon ekraniga moslashadi.", "phone"),
    ("Interaktiv yo‘riqnoma", "Har bir asosiy sahifada qadamma-qadam ko‘rsatma bor.", "bulb"),
    ("Yordam", "Foydalanish qo‘llanmasi va Telegram orqali qo‘llab-quvvatlash.", "help"),
    ("Rasm sifati nazorati", "EKG rasmi xira yoki qorong‘i bo‘lsa, yuklashdan oldin ogohlantiriladi.", "camera"),
    ("Yangi tahlil belgisi", "Shifokorga kelgan ko‘rilmagan tahlillar menyuda son bilan ko‘rinadi.", "bell"),
], cols=3, x0=ML, y0=1.9, w=W - 2 * ML, th=2.2, gap=0.26, start=300, step=170)

# ═══════════════════════════ 03 · METODOLOGIYA ═══════════════════════════
SEC3 = "AI tahlil metodologiyasi"
divider("03", SEC3, "Fayl yuklangandan to shifokor qaroriga qadar",
        "Uchinchi qism — tahlil metodologiyasi: fayl qanday tekshiriladi, AI qanday javob beradi va "
        "natija qanday nazorat qilinadi.",
        topics=['tahlil oqimi', 'ishonchlilik', 'javob tuzilmasi', 'modellar'])

s, seq, n = new_slide(
    "Har bir tahlil oltita bosqichdan o‘tadi. Avval fayl bemorga biriktirib yuklanadi; klinika va "
    "xodim shakl orqali emas, tizimga kirgan foydalanuvchi tokenidan aniqlanadi. So‘ng fayl turi, hajmi, "
    "rasm aniqligi va yorug‘ligi tekshiriladi. Xuddi shu fayl shu bemorga 30 kun ichida qayta yuklansa, "
    "tizim ogohlantiradi. Keyin AI modeli fayldan ko‘rsatkichlarni o‘qib, qat’iy sxemada javob beradi. "
    "Javob sxemaga moslanadi va tekshiriladi. Oxirgi qarorni esa shifokor qabul qiladi. Jarayon fonda "
    "ishlaydi va natija tayyor bo‘lganda xodimga xabar keladi.")
sh = s.shapes
frame(s, n, "03", SEC3, "Tahlil oqimi: *oltita bosqich*")
steps = [("Yuklash", "Fayl bemorga biriktiriladi; klinika va xodim tokendan olinadi."),
         ("Sifat nazorati", "Fayl turi, hajmi, aniqligi va yorug‘ligi tekshiriladi."),
         ("Takror nazorati", "Shu fayl 30 kun ichida qayta yuklansa, ogohlantiriladi."),
         ("AI talqini", "Model ko‘rsatkichlarni o‘qiydi va qat’iy sxemada javob beradi."),
         ("Natija tekshiruvi", "Javob sxemaga moslanadi; noaniq natija «normal» deyilmaydi."),
         ("Shifokor qarori", "Shifokor natijani ko‘radi va o‘z xulosasini yozadi.")]
sw = (W - 2 * ML - 5 * 0.2) / 6
line_y = 2.35
bar = box(sh, ML + 0.4, line_y - 0.03, (sw + 0.2) * 5, 0.06, fill=MINT, shape=MSO_SHAPE.RECTANGLE)
seq.add(bar, "wipe", at=250, dur=1800)
for i, (head, body) in enumerate(steps):
    x = ML + i * (sw + 0.2)
    g = sh.add_group_shape()
    gs = g.shapes
    last = i == 5
    badge(gs, x, line_y - 0.4, 0.8, str(i + 1), fill=NAVY if last else TEAL, size=20)
    box(gs, x, 3.0, sw, 2.85, fill=MINT2 if not last else MINT, radius=0.08)
    text(gs, x + 0.18, 3.2, sw - 0.36, 0.7, head, size=16, color=NAVY, font=HEAD)
    text(gs, x + 0.18, 3.95, sw - 0.36, 1.8, body, size=14, color=BODY)
    seq.add(g, "float", at=300 + i * 300, dur=600)
seq.add(text(sh, ML, 6.15, W - 2 * ML, 0.4, [[("Fon rejimi: ", {"font": HEAD, "color": TEAL_D}),
        ("tahlil fonda bajariladi, natija tayyor bo‘lganda xodimga xabar keladi va u boshqa ishini davom ettiradi.", {})]],
        size=15, color=BODY), "fade", at=2300)

s, seq, n = new_slide(
    "Tibbiy tizimda ishonchlilik muhim, shuning uchun nosoz holatlar oldindan o‘ylangan. Tahlil fonda "
    "bajariladi: xodim boshqa ishini davom ettiradi, natija tayyor bo‘lganda esa xabar va «Ko‘rish» "
    "tugmasi chiqadi. AI xatosi bo‘lsa, tahlilni bir bosishda qayta tekshirish mumkin. Noto‘g‘ri fayl "
    "yuklansa, tahlilni o‘chirmasdan faylni almashtirish mumkin. Shu fayl avval yuklangan bo‘lsa, tizim "
    "ogohlantiradi va qarorni foydalanuvchiga qoldiradi. 30 daqiqada tugamagan tahlil avtomatik ravishda "
    "xatolik holatiga o‘tadi, uni qayta tahlil qilish mumkin. EKG o‘rniga boshqa hujjat yuklansa, AI buni "
    "aniqlab ogohlantiradi.")
sh = s.shapes
frame(s, n, "03", SEC3, "*Ishonchlilik:* nosoz holatlar oldindan o‘ylangan")
tiles(sh, seq, [
    ("Fon rejimi", "Tahlil fonda bajariladi; tayyor bo‘lganda xabar va «Ko‘rish» tugmasi chiqadi.", "sync"),
    ("Qayta tahlil", "AI xatosi bo‘lsa, tahlilni bir bosishda qayta AI orqali tekshirish mumkin.", "refresh"),
    ("Faylni almashtirish", "Noto‘g‘ri fayl yuklansa, tahlil o‘chirilmasdan fayli almashtiriladi.", "switch"),
    ("Takroriy fayl", "Shu fayl avval yuklangan bo‘lsa, ogohlantirish chiqadi va foydalanuvchi o‘zi hal qiladi.", "copy"),
    ("Osilib qolgan tahlil", "30 daqiqada tugamagan tahlil xatolik holatiga o‘tadi — uni qayta tahlil qilish mumkin.", "stopwatch"),
    ("Hujjat turi nazorati", "EKG o‘rniga boshqa hujjat yuklansa, AI buni aniqlab ogohlantiradi.", "scan"),
], cols=3, x0=ML, y0=1.9, w=W - 2 * ML, th=2.2, gap=0.26, start=300, step=170)

s, seq, n = new_slide(
    "AI erkin matn emas, qat’iy JSON tuzilmasida javob beradi. Har bir maydonning o‘z vazifasi bor: "
    "raqamli ko‘rsatkichlar, patologik topilmalar, Holter va SMAD uchun vaqtli epizodlar, yakuniy xulosa, "
    "tavsiyalar va jiddiylik darajasi. Jiddiylik uch darajada beriladi: normal, o‘rtacha va xavfli. "
    "Muhim tamoyil — «xato tomonga xavfsiz»: agar AI javobi noaniq bo‘lsa, tizim uni hech qachon normal "
    "deb ko‘rsatmaydi, balki «baholanmadi» deydi. AI tasvirni o‘qiy olmasa, natija «tahlil imkonsiz» "
    "deb belgilanadi.")
sh = s.shapes
frame(s, n, "03", SEC3, "AI javobi *qat’iy tuzilmaga* ega")
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 1.85, 7.3, 4.75, fill=NAVY, radius=0.05)
fields = [("digital_measurements", "Raqamli ko‘rsatkichlar"),
          ("automatic_analysis", "Patologik topilmalar"),
          ("pathology_episodes", "Vaqtli epizodlar (Holter, SMAD)"),
          ("final_summary", "Yakuniy xulosa"),
          ("AI_recommendations", "Tavsiyalar"),
          ("automatic_analysis_bool", "Jiddiylik darajasi: 1 · 2 · 3")]
text(gs, ML + 0.4, 2.1, 6.5, 0.35, "{", size=16, color="5EEAD4", font=MONO)
seq.add(g, "fade", at=250, dur=600)
for i, (k, v) in enumerate(fields):
    gg = sh.add_group_shape()
    ggs = gg.shapes
    y = 2.5 + i * 0.62
    text(ggs, ML + 0.7, y, 3.4, 0.4, f'"{k}"', size=14, color="5EEAD4", font=MONO)
    text(ggs, ML + 4.05, y, 3.1, 0.4, v, size=14, color="E2E8F0")
    seq.add(gg, "wipe", at=500 + i * 220, dur=500)
seq.add(text(sh, ML + 0.4, 6.18, 2, 0.35, "}", size=16, color="5EEAD4", font=MONO), "fade", at=1850)
rx = ML + 7.75
seq.add(text(sh, rx, 1.85, 4.4, 0.35, "JIDDIYLIK DARAJASI", size=14, color=TEAL_D, font=HEAD), "fade", at=900)
for i, (lab, col) in enumerate([("1 — Normal", GREEN), ("2 — O‘rtacha", AMBER), ("3 — Xavfli", RED),
                                ("Baholanmadi", GREY)]):
    gg = sh.add_group_shape()
    ggs = gg.shapes
    y = 2.3 + i * 0.62
    box(ggs, rx, y, 4.38, 0.5, fill=WHITE, line=BORDER, radius=0.5)
    box(ggs, rx + 0.18, y + 0.15, 0.2, 0.2, fill=col, shape=MSO_SHAPE.OVAL)
    text(ggs, rx + 0.55, y, 3.7, 0.5, lab, size=15, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(gg, "float", at=1050 + i * 150)
gg = sh.add_group_shape()
ggs = gg.shapes
box(ggs, rx, 4.95, 4.38, 1.65, fill=MINT, radius=0.08)
text(ggs, rx + 0.25, 5.1, 3.9, 1.4, [[("«Xato tomonga xavfsiz»: ", {"font": HEAD, "color": TEAL_D}),
     ("noaniq javob hech qachon «normal» deb ko‘rsatilmaydi.", {})]], size=15, color=BODY)
seq.add(gg, "float", at=1750, dur=650)

s, seq, n = new_slide(
    "Har bir vazifa uchun murakkablik va narx muvozanatiga qarab alohida model tanlangan. EKG tasvirini "
    "o‘qish eng murakkab vazifa, shuning uchun eng kuchli model chuqur fikrlash rejimida ishlatiladi. "
    "Holter, SMAD va laboratoriya hujjatlari tuzilgan bo‘lgani uchun tezroq va arzonroq model yetarli. "
    "Tarjima va hujjat turini aniqlash mexanik vazifa, unga eng arzon model ishlatiladi. "
    "Laboratoriya tahlilida promptni keshlash va so‘rovni qayta tuzish orqali AI xarajati taxminan 40 "
    "foizga kamaydi; bu to‘rtta klinika faylida o‘lchandi va qiymatlar o‘zgarmadi. Har bir AI chaqiruvining "
    "tokeni va narxi bazada alohida qayd etiladi.")
sh = s.shapes
frame(s, n, "03", SEC3, "Har bir vazifaga *mos model* tanlangan")
models = [("EKG tasvirini talqin qilish", "gpt-5.6-sol", "Eng murakkab vazifa — chuqur fikrlash rejimi"),
          ("Holter, SMAD, laboratoriya", "gpt-5.6-terra", "Tuzilgan hujjatlar — tezlik va narx muvozanati"),
          ("Kompleks xulosa", "gpt-5.6-sol", "Bir nechta tahlilni birga talqin qilish"),
          ("Tarjima, hujjat turini aniqlash", "gpt-5-mini", "Mexanik vazifa — arzon va tez model")]
tw = 8.4
for i, (task, model, why) in enumerate(models):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 1.9 + i * 1.18
    box(gs, ML, y, tw, 1.0, fill=WHITE, line=BORDER, shade=True, radius=0.1)
    text(gs, ML + 0.3, y + 0.14, 4.6, 0.4, task, size=16, color=NAVY, font=HEAD)
    text(gs, ML + 0.3, y + 0.52, 4.9, 0.4, why, size=14, color=MUTED)
    box(gs, ML + tw - 2.75, y + 0.27, 2.45, 0.46, fill=MINT, radius=0.5)
    text(gs, ML + tw - 2.75, y + 0.27, 2.45, 0.46, model, size=14, color=TEAL_D, font=MONO,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(g, "float", at=300 + i * 200)
sx = ML + tw + 0.35
seq.add(stat(sh, sx, 1.9, W - ML - sx, 2.55, "≈ 40%",
             "laboratoriya tahlilida AI xarajati kamaydi (keshlash va so‘rovni qayta tuzish)",
             fill=TEAL, color=WHITE, value_size=44, label_color=WHITE), "zoom", at=1150, dur=700)
gg = sh.add_group_shape()
ggs = gg.shapes
box(ggs, sx, 4.65, W - ML - sx, 1.6, fill=MINT2, radius=0.1)
text(ggs, sx + 0.25, 4.82, W - ML - sx - 0.5, 1.3,
     "Har bir AI chaqiruvining tokeni va narxi bazada alohida qayd etiladi.", size=15, color=BODY)
seq.add(gg, "float", at=1500)

# ═══════════════════════════ 04 · MODULLAR ═══════════════════════════
SEC4 = "Tahlil modullari"
divider("04", SEC4, "EKG, Holter, SMAD va laboratoriya",
        "To‘rtinchi qism — platformaning to‘rtta tahlil moduli.",
        topics=['EKG', 'Holter', 'SMAD', 'laboratoriya', 'natija'])


def module_slide(title, image, rows, notes, img_kind="fade"):
    s, seq, n = new_slide(notes)
    sh = s.shapes
    frame(s, n, "04", SEC4, title)
    mod = picture(sh, image, 6.75, 1.75, w=6.2)
    set_name(mod, "!!module")
    seq.items.append((mod, "bob", 900, 2600))
    for i, (head, body) in enumerate(rows):
        seq.add(row(sh, ML, 1.95 + i * 1.18, 5.85, i + 1, head, body), at=350 + i * 200)
    return s, seq, n


s, seq, n = module_slide(
    "*EKG:* tasvirdan raqamli xulosagacha", "04_ekg.jpg",
    [("Rasm yoki PDF", "EKG yozuvi rasm yoki PDF ko‘rinishida yuklanadi."),
     ("Signalni raqamlashtirish", "PDF dan 12 ta tarmoq ajratilib, QRS o‘qi, ST segmenti kabi o‘lchovlar hisoblanadi."),
     ("AI talqini", "Ritm, P-QRS-T morfologiyasi, ST-T o‘zgarishlari va aritmiyalar baholanadi."),
     ("Klinik kontekst", "Bemorning yoshi, jinsi va shikoyatlari AI ga kontekst sifatida beriladi.")],
    "EKG moduli rasm yoki PDF ko‘rinishidagi EKG yozuvini qabul qiladi. PDF yuklansa, tizim undan signalni "
    "raqamlashtiradi, 12 ta tarmoqni ajratadi va NeuroKit2 kutubxonasi yordamida QRS o‘qi, ST segmenti "
    "kabi raqamli o‘lchovlarni hisoblaydi. So‘ng AI kardiolog sifatida ritmni, P-QRS-T morfologiyasini, "
    "ST-T o‘zgarishlarini va aritmiyalarni baholaydi. Bemorning yoshi, jinsi va kardiologik shikoyatlari "
    "klinik kontekst sifatida beriladi. AI ishlamay qolsa ham algoritm hisoblagan o‘lchovlar saqlanadi.")

s, seq, n = module_slide(
    "*Holter:* sutkalik monitoringdan epizodlar", "05_holter.jpg",
    [("Hisobotni yuklash", "Holter monitor hisoboti PDF yoki rasm ko‘rinishida yuklanadi."),
     ("Sutkalik ko‘rsatkichlar", "Yurak urish tezligi va boshqa sutkalik qiymatlar raqam sifatida olinadi."),
     ("Epizodlar", "Har bir patologik epizod vaqti bilan alohida qatorga ajratiladi."),
     ("Hisobotda", "Epizodlar natija sahifasida va PDF hujjatda alohida ro‘yxat bo‘ladi.")],
    "Holter moduli sutkalik EKG monitoringi hisobotini qabul qiladi. AI sutkalik yurak urish tezligi kabi "
    "raqamli ko‘rsatkichlarni oladi. Muhim jihat — har bir patologik epizod vaqti bilan alohida element "
    "sifatida qaytariladi; ilgari ular bitta matnga vergul bilan tizilardi va o‘qish qiyin edi. Endi epizodlar "
    "natija sahifasida va PDF hisobotda alohida qatorlarda ko‘rinadi.")

s, seq, n = module_slide(
    "*SMAD:* sutkalik qon bosimi tahlili", "06_smad.jpg",
    [("Hisobotni yuklash", "Sutkalik qon bosimi monitoringi hisoboti yuklanadi."),
     ("Kunduz va tun", "Sutkalik, kunduzgi va tungi o‘rtacha sistolik va diastolik bosim olinadi."),
     ("Tungi profil", "Tungi pasayish darajasi va profil turi (dipper, non-dipper…) aniqlanadi."),
     ("Epizodlar", "Bosim ko‘tarilgan epizodlar vaqti bilan alohida ko‘rsatiladi.")],
    "SMAD moduli sutkalik qon bosimi monitoringi natijasini tahlil qiladi. AI sutkalik, kunduzgi va tungi "
    "o‘rtacha sistolik va diastolik bosimni oladi, tungi pasayish darajasini va profil turini — dipper, "
    "non-dipper, over-dipper yoki night-peaker — aniqlaydi. Bosim ko‘tarilgan epizodlar ham Holterdagi kabi "
    "vaqti bilan alohida ko‘rsatiladi.")

s, seq, n = new_slide(
    "Laboratoriya moduli eng murakkab modul. Klinikalar bitta topshiriq natijasini ko‘pincha bir necha "
    "varaqda beradi, shuning uchun bitta tahlilga 1 dan 10 tagacha fayl biriktiriladi va ular bitta "
    "so‘rovda AI ga yuboriladi. Excel, PDF va rasm qabul qilinadi. Excel jadvali AI ga yuborishdan oldin "
    "lokal ravishda matnga aylantiriladi, bemorning F.I.Sh. va imzo esa yuborilmaydi. AI natijalarni "
    "137 ta ko‘rsatkichdan iborat katalog bo‘yicha o‘qiydi. Tahlil sanasi ham fayldan aniqlanadi — "
    "yuklangan kun emas. Har bir ko‘rsatkich bazada alohida qator bo‘lib saqlanadi, statistika va "
    "kasallik dinamikasi shunga tayanadi.")
sh = s.shapes
frame(s, n, "04", SEC4, "*Laboratoriya:* bir necha varaqdan yagona ro‘yxatga")
mod = picture(sh, "07_lab.jpg", 6.75, 1.75, w=6.2)
set_name(mod, "!!module")
seq.items.append((mod, "bob", 900, 2600))
for i, (v, lab) in enumerate([("1–10", "fayl bitta tahlilga"), ("137", "ko‘rsatkichli katalog"),
                              ("3", "format: Excel, PDF, rasm")]):
    x = ML + i * 2.0
    seq.add(stat(sh, x, 1.85, 1.85, 1.45, v, lab, value_size=30), "zoom", at=300 + i * 200, dur=600)
for i, (head, body) in enumerate([
    ("Shaxsiy ma’lumot himoyasi", "Excel lokal matnga aylantiriladi; F.I.Sh. va imzo AI ga yuborilmaydi."),
    ("Tahlilning o‘z sanasi", "Sana fayldan olinadi — yuklangan kun emas, tahlil o‘tkazilgan kun."),
    ("Har bir ko‘rsatkich alohida", "Qiymatlar alohida jadvalga yoziladi: statistika va dinamika shunga tayanadi."),
]):
    seq.add(row(sh, ML, 3.6 + i * 1.08, 5.85, i + 1, head, body, body_h=0.6), at=1000 + i * 200)

s, seq, n = new_slide(
    "Laboratoriya modulining asosiy ilmiy yechimi — o‘lchov birliklarini keltirish. AI qiymat va birlikni "
    "fayldagidek o‘qiydi, ularni katalog birligiga aylantirishni esa kod deterministik bajaradi: prefiks va "
    "molyar massa bo‘yicha. Shu tufayli natija har safar bir xil bo‘ladi. Masalan, glyukoza 99 mg/dL "
    "5,5 mmol/L ga aylantiriladi. Natija fiziologik mumkinlik bo‘yicha tekshiriladi: gemoglobin «14,5 g/L» "
    "deb yozilsa, bu birlik xato yozilgani bilinadi va shubhali deb belgilanadi. Kortizolning juda past "
    "qiymatida haqiqiy past natijani blanka xatosidan ajratib bo‘lmaydi — shuning uchun u aylantirilmaydi va "
    "«birlik tekshirilsin» deb ko‘rsatiladi. Baho avval laboratoriyaning o‘z me’yori bilan beriladi, chunki "
    "me’yor laboratoriya usuliga bog‘liq. Ruscha «мЕ/л» va «МЕ/л» ming marta farq qiladi va katta-kichik "
    "harf bo‘yicha ajratiladi.")
sh = s.shapes
frame(s, n, "04", SEC4, "O‘lchov birliklari *algoritm bilan* keltiriladi")
seq.add(text(sh, ML, 1.75, W - 2 * ML, 0.45,
             "AI qiymatni fayldagidek o‘qiydi, aylantirishni esa kod bajaradi — natija har safar bir xil bo‘ladi.",
             size=17, color=NAVY, font=HEAD), "fade", at=200)
cws = [3.5, 4.75, 3.88]
cxs = [ML, ML + cws[0] + 0.0, ML + cws[0] + cws[1]]
hdr_y = 2.45
g = sh.add_group_shape()
gs = g.shapes
for j, h_ in enumerate(["Fayldagi yozuv", "Tizim nima qiladi", "Natija"]):
    text(gs, cxs[j] + 0.25, hdr_y, cws[j] - 0.4, 0.35, h_, size=14, color=MUTED, font=HEAD)
seq.add(g, "fade", at=350)
examples = [("Glyukoza 99 mg/dL", "Molyar massa bo‘yicha katalog birligiga aylantiradi", "5,5 mmol/L", GREEN),
            ("Gemoglobin 14,5 g/L", "Fiziologik mumkinlikni tekshiradi", "Shubhali: birlik xato yozilgan", AMBER),
            ("Kortizol 25 nmol/L", "Past qiymat va blanka xatosini ajratib bo‘lmaydi", "Baholanmaydi: birlik tekshirilsin", GREY),
            ("Erkin T3, me’yor 1,2–4,2", "Laboratoriyaning o‘z me’yorini ustun qo‘yadi", "Baho shu me’yor bo‘yicha", TEAL)]
for i, (a, b, c, col) in enumerate(examples):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 2.9 + i * 0.86
    box(gs, ML, y, sum(cws), 0.74, fill=MINT2 if i % 2 == 0 else WHITE, line=BORDER, radius=0.15)
    text(gs, cxs[0] + 0.25, y, cws[0] - 0.4, 0.74, a, size=15, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    text(gs, cxs[1] + 0.1, y, cws[1] - 0.3, 0.74, "→  " + b, size=14, color=BODY, anchor=MSO_ANCHOR.MIDDLE)
    box(gs, cxs[2] + 0.1, y + 0.27, 0.2, 0.2, fill=col, shape=MSO_SHAPE.OVAL)
    text(gs, cxs[2] + 0.45, y, cws[2] - 0.6, 0.74, c, size=14, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(g, "float", at=550 + i * 260)
seq.add(text(sh, ML, 6.4, W - 2 * ML, 0.4, [[("Nozik holat: ", {"font": HEAD, "color": TEAL_D}),
        ("ruscha «мЕ/л» va «МЕ/л» ming marta farq qiladi — ular katta-kichik harf bo‘yicha ajratiladi.", {})]],
        size=15, color=BODY), "fade", at=1700)

s, seq, n = new_slide(
    "Natija sahifasida bo‘limlar shifokor o‘qiydigan tartibda joylashgan: eng avval yakuniy xulosa, keyin "
    "patologik topilmalar, epizodlar, raqamli ko‘rsatkichlar, tavsiyalar va yuklangan fayllar. Yakuniy "
    "xulosa jiddiylik rangi bilan ajratiladi. Natijani bir bosishda o‘zbek, rus yoki ingliz tiliga tarjima "
    "qilish mumkin, tarjima keshlanadi. Har bir natijani QR-kodli PDF hujjat sifatida yuklab olish mumkin.")
sh = s.shapes
frame(s, n, "04", SEC4, "Natija *shifokor o‘qiydigan tartibda* ko‘rsatiladi")
sections = ["Yakuniy xulosa", "Patologik topilmalar", "Vaqtli epizodlar", "Raqamli ko‘rsatkichlar",
            "Tavsiyalar", "Yuklangan fayllar"]
for i, t in enumerate(sections):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 1.9 + i * 0.75
    first = i == 0
    box(gs, ML, y, 6.1, 0.62, fill=TEAL if first else MINT2, line=None if first else BORDER, radius=0.2,
        shade=first)
    text(gs, ML + 0.25, y, 0.6, 0.62, str(i + 1), size=16, color=WHITE if first else TEAL_D, font=HEAD,
         anchor=MSO_ANCHOR.MIDDLE)
    text(gs, ML + 0.8, y, 5, 0.62, t, size=16, color=WHITE if first else NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(g, "float", at=300 + i * 160)
for i, (head, body) in enumerate([
    ("Jiddiylik rangi", "Yakuniy xulosa normal, o‘rtacha yoki xavfli rang bilan ajratiladi."),
    ("Uch tilda", "Natija o‘zbek, rus yoki ingliz tiliga bir bosishda tarjima qilinadi."),
    ("PDF hujjat", "Natija QR-kodli PDF hujjat sifatida yuklab olinadi."),
]):
    seq.add(card(sh, 7.3, 1.9 + i * 1.5, W - ML - 7.3, 1.32, None, head, body,
                 ico=["tag", "translate", "report"][i]), at=1300 + i * 220)

# ═══════════════════════════ 05 · KOMPLEKS ═══════════════════════════
SEC5 = "Kompleks tahlil va ilmiy yangilik"
divider("05", SEC5, "Bir nechta tahlilni birga o‘qish",
        "Beshinchi qism — tadqiqotning asosiy ilmiy natijalari: kompleks AI xulosa va xavf signallari.",
        topics=['kompleks xulosa', 'xavf signallari', 'erta aniqlash', 'ilmiy yangilik'])

s, seq, n = new_slide(
    "Kompleks AI xulosa bemorning 2 tadan 10 tagacha tahlilini birga tahlil qiladi. AI ga tayyor xulosalar "
    "bilan birga 3 tagacha EKG tasviri ham yuboriladi. Ehtimoliy tashxislar ikki manbadan izlanadi: bitta "
    "tahlildagi patologiyadan va tahlillar jamlanmasidan — alohida ma’nosiz ko‘ringan topilmalar birgalikda "
    "bitta sindromga ishora qilishi mumkin. Alohida tahlillarga yozilgan shifokor xulosalari ham beriladi, "
    "lekin «tasdiqlangan tashxis emas, klinik kontekst» deb belgilanadi — bu AI shifokor fikriga ergashib "
    "ketishi xavfini kamaytiradi. Zidlik bo‘lsa, AI buni ochiq aytadi. Aynan shu tahlillar to‘plami uchun "
    "xulosa avval yaratilgan bo‘lsa, u qayta yaratilmaydi.")
sh = s.shapes
frame(s, n, "05", SEC5, "*Kompleks AI xulosa:* 2 dan 10 tagacha tahlil birga")
seq.hero(picture(sh, "08_kompleks.jpg", 6.2, 1.6, w=6.9), "fade")
for i, (head, body) in enumerate([
    ("Bitta so‘rovda", "Tahlillar xulosalari va 3 tagacha EKG tasviri birga beriladi."),
    ("Ikki manbali tashxis", "Bitta tahlildagi patologiya va tahlillar jamlanmasidan izlanadi."),
    ("Shifokor fikri — kontekst", "Shifokor xulosasi tasdiqlangan tashxis sifatida emas, kontekst sifatida beriladi."),
    ("Takrorsiz", "Aynan shu tahlillar to‘plami uchun xulosa qayta yaratilmaydi."),
]):
    seq.add(row(sh, ML, 1.95 + i * 1.18, 5.5, i + 1, head, body), at=500 + i * 220)

s, seq, n = new_slide(
    "Laboratoriya natijalari asosida 25 ta klinik qoida ishlaydi: buyrak funksiyasi CKD-EPI 2021 formulasi "
    "bo‘yicha, jigar fibrozi FIB-4 indeksi bo‘yicha, glyukoza, qalqonsimon bez, gematologiya, elektrolitlar "
    "va boshqalar. Bemorning shu klinikadagi tahlillari vaqt bo‘yicha solishtiriladi. Natija foizli ehtimol "
    "emas, aniq holat sifatida beriladi: kritik, mezon bajarildi, shubha, kuzatish yoki ma’lumot yetarli emas. "
    "Har bir signal bilan dalil va keyingi qadam ko‘rsatiladi. Signal tashxis emas — uni shifokor tasdiqlaydi "
    "yoki rad etadi.")
sh = s.shapes
frame(s, n, "05", SEC5, "*25 ta klinik qoida* asosida xavf signallari")
seq.hero(picture(sh, "09_xavf_signali.jpg", 7.2, 1.75, w=5.6), "zoom")
seq.add(text(sh, ML, 1.85, 6.2, 0.9,
             "Tahlillar vaqt bo‘yicha solishtiriladi: buyrak (CKD-EPI 2021), jigar (FIB-4), glyukoza, "
             "qon va boshqalar.", size=16, color=BODY), "fade", at=400)
statuses = [("Kritik", "CRITICAL", RED), ("Mezon bajarildi", "CRITERIA_MET", ORANGE),
            ("Shubha", "SUSPECTED", AMBER), ("Kuzatish", "MONITOR", TEAL),
            ("Ma’lumot yetarli emas", "INSUFFICIENT_DATA", GREY)]
for i, (lab, code, col) in enumerate(statuses):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 2.95 + i * 0.6
    box(gs, ML, y, 6.2, 0.5, fill=WHITE, line=BORDER, radius=0.5)
    box(gs, ML + 0.2, y + 0.15, 0.2, 0.2, fill=col, shape=MSO_SHAPE.OVAL)
    text(gs, ML + 0.6, y, 3.2, 0.5, lab, size=15, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    text(gs, ML + 3.6, y, 2.45, 0.5, code, size=13, color=MUTED, font=MONO, anchor=MSO_ANCHOR.MIDDLE,
         align=PP_ALIGN.RIGHT)
    seq.add(g, "float", at=650 + i * 170)
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 6.05, 6.2, 0.6, fill=MINT, radius=0.3)
text(gs, ML + 0.3, 6.05, 5.7, 0.6, [[("Foizli ehtimol yo‘q: ", {"font": HEAD, "color": TEAL_D}),
     ("holat, dalil va keyingi qadam beriladi.", {})]], size=15, color=BODY, anchor=MSO_ANCHOR.MIDDLE)
seq.add(g, "float", at=1600)

s, seq, n = new_slide(
    "Kasallik xavfini erta aniqlash platformada uch mexanizm orqali amalga oshadi. Birinchisi — dinamika: "
    "har bir laboratoriya ko‘rsatkichining vaqt bo‘yicha o‘zgarishi grafikda ko‘rinadi, shifokor yomonlashuvni "
    "ko‘z bilan ko‘radi. Ikkinchisi — xavf signallari: 25 ta klinik qoida bemorning tahlillarini solishtirib, "
    "masalan buyrak funksiyasining pasayishini aniqlaydi va keyingi qadamni aytadi. Uchinchisi — kompleks "
    "xulosa: AI barcha tahlillarni birga ko‘rib, ehtimoliy tashxislar va xavf belgilarini beradi. Avtomatik "
    "rejimda yangi tahlil tayyor bo‘lgach, tizim bemorning barcha tahlillaridan kompleks xulosani o‘zi tuzadi "
    "va xodimga xabar beradi; bu funksiya tayyor va sozlamada yoqiladi. [Hozir u o‘chiq — arxiv yuklanib "
    "bo‘lgach yoqiladi.]")
sh = s.shapes
frame(s, n, "05", SEC5, "Kasallik xavfini *erta aniqlash*")
flow(sh, seq, [
    ("Dinamika", "Har bir laboratoriya ko‘rsatkichining vaqt bo‘yicha o‘zgarishi grafikda ko‘rinadi."),
    ("Xavf signali", "25 ta qoida tahlillarni solishtirib, xavfli o‘zgarishni aniqlaydi va keyingi qadamni aytadi."),
    ("Kompleks xulosa", "AI barcha tahlillarni birga ko‘rib, ehtimoliy tashxislar va xavf belgilarini beradi."),
], y=1.95, h=3.2, step=450, icons=["chart", "warning", "puzzle"])
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 5.45, W - 2 * ML, 1.1, fill=TEAL, radius=0.15, shade=True)
text(gs, ML + 0.4, 5.45, W - 2 * ML - 0.8, 1.1, [[("Avtomatik rejim: ", {"font": HEAD}),
     ("yangi tahlil tayyor bo‘lgach, tizim bemorning barcha tahlillaridan kompleks xulosani o‘zi tuzadi va "
      "xodimga xabar beradi.", {})]], size=16, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
seq.add(g, "float", at=1700, dur=650)

s, seq, n = new_slide(
    "Platformaning asosiy tamoyili: AI taklif beradi, qarorni shifokor qabul qiladi. Shifokor har bir "
    "tahlilga o‘z xulosasini yozadi, u alohida saqlanadi va PDF hujjatga kiradi. Xavf signalini ham shifokor "
    "tasdiqlaydi yoki rad etadi; agar keyinroq dalil o‘zgarsa, signal qayta ko‘rib chiqishga qaytadi. AI "
    "tahlil qila olmasa, natija «normal» deb emas, «tahlil imkonsiz» deb ko‘rsatiladi. Shunday qilib tizim "
    "shifokorni almashtirmaydi, uning ishini tezlashtiradi va xavfsizroq qiladi.")
sh = s.shapes
frame(s, n, "05", SEC5, "AI taklif beradi, *qarorni shifokor qabul qiladi*")
seq.hero(picture(sh, "10_shifokor_va_ai.jpg", 5.7, 1.55, w=7.4), "fade")
for i, (head, body) in enumerate([
    ("Shifokor xulosasi", "Har bir tahlilga shifokor o‘z xulosasini yozadi; u PDF hujjatga kiradi."),
    ("Signalni tasdiqlash", "Xavf signalini shifokor tasdiqlaydi yoki rad etadi; dalil o‘zgarsa, qayta ko‘riladi."),
    ("Halol «bilmayman»", "AI tahlil qila olmasa, natija «normal» emas, «tahlil imkonsiz» deb ko‘rsatiladi."),
]):
    seq.add(card(sh, ML, 1.9 + i * 1.55, 5.6, 1.38, None, head, body, ico=["edit", "check", "help"][i]),
            at=550 + i * 240)

s, seq, n = new_slide(
    "Tadqiqotning ilmiy yangiligi to‘rtta natijadan iborat. Birinchidan, turli diagnostika tahlillarini "
    "birgalikda talqin qiluvchi kompleks AI xulosa modeli ishlab chiqildi. Ikkinchidan, laboratoriya "
    "natijalarini yagona katalog va o‘lchov birliklariga deterministik keltirish hamda fiziologik mumkinlik "
    "bo‘yicha tekshirish algoritmi yaratildi. Uchinchidan, bemor tahlillarini vaqt bo‘yicha solishtiruvchi "
    "25 ta klinik qoidaga asoslangan xavf signallari tizimi taklif etildi. To‘rtinchidan, AI javobini qat’iy "
    "sxema, natija nazorati va shifokor tasdig‘i bilan cheklovchi xavfsiz talqin usuli ishlab chiqildi. "
    "[Ilmiy yangilik bandlarini avtoreferatdagi matn bilan bir xil qiling.]")
sh = s.shapes
frame(s, n, "05", SEC5, "Tadqiqotning *ilmiy yangiligi*")
novelty = [("Kompleks talqin", "Turli diagnostika tahlillarini birgalikda talqin qiluvchi kompleks AI xulosa modeli ishlab chiqildi."),
           ("Birliklar algoritmi", "Laboratoriya natijalarini yagona katalog va birliklarga deterministik keltirish va fiziologik tekshirish algoritmi yaratildi."),
           ("Xavf signallari", "Bemor tahlillarini vaqt bo‘yicha solishtiruvchi 25 ta klinik qoidaga asoslangan xavf signallari tizimi taklif etildi."),
           ("Xavfsiz talqin", "AI javobini qat’iy sxema, natija nazorati va shifokor tasdig‘i bilan cheklovchi talqin usuli ishlab chiqildi.")]
cw2 = (W - 2 * ML - 0.3) / 2
for i, (head, body) in enumerate(novelty):
    x = ML + (i % 2) * (cw2 + 0.3)
    y = 1.9 + (i // 2) * 2.4
    seq.add(card(sh, x, y, cw2, 2.15, i + 1, head, body, body_size=15, head_size=18), at=300 + i * 260, dur=650)

# ═══════════════════════════ 06 · KLINIK ISH ═══════════════════════════
SEC6 = "Klinik ish jarayoni"
divider("06", SEC6, "Bemor kartasidan tayyor hujjatgacha",
        "Oltinchi qism — shifokorning kundalik ishi: bemor kartasi, ish joyi, vipiska, konsultatsiya va hujjatlar.",
        topics=['bemor kartasi', 'ish joyi', 'vipiska', 'konsultatsiya', 'PDF va QR'])

s, seq, n = new_slide(
    "Bemor bilan ishlash bemor kartasidan boshlanadi. Bemor familiya, ism yoki otasining ismi bo‘yicha bitta "
    "maydonda qidiriladi; yozuv lotin alifbosiga keltiriladi, tutuq belgilari farqi hisobga olinmaydi. Yangi "
    "bemor uchun faqat familiya va ism majburiy; yoshi yoki jinsi noma’lum bo‘lsa, ular AI ga yuborilmaydi "
    "va taxmin qilinmaydi. Kartada bemorning barcha tahlillari, kompleks xulosalari, laboratoriya xavf "
    "signallari, ko‘rsatkichlar dinamikasi va vipiskalari bir joyda turadi. Ro‘yxatlarda esa har bir rol "
    "faqat o‘ziga tegishli bemorlarni ko‘radi.")
sh = s.shapes
frame(s, n, "06", SEC6, "*Bemor kartasi:* hammasi bir joyda")
for i, (head, body) in enumerate([
    ("Ism bo‘yicha qidirish", "Familiya, ism yoki otasining ismi bitta maydonda; yozuv lotinga keltiriladi."),
    ("Minimal ma’lumot", "Faqat familiya va ism majburiy; noma’lum yosh va jins AI ga yuborilmaydi."),
    ("Hammasi bir joyda", "Tahlillar, kompleks xulosalar, xavf signallari, dinamika va vipiskalar."),
    ("Ko‘rinish chegarasi", "Ro‘yxatlarda shifokor faqat o‘ziga yo‘naltirilgan bemorlarni ko‘radi."),
]):
    seq.add(row(sh, ML, 1.95 + i * 1.18, 5.9, i + 1, head, body), at=300 + i * 200)
cx, cy, cwid, chh = 7.05, 1.85, 5.7, 4.75
g = sh.add_group_shape()
gs = g.shapes
box(gs, cx, cy, cwid, chh, fill=WHITE, line=BORDER, shade=True, radius=0.05)
badge(gs, cx + 0.35, cy + 0.32, 0.75, "B", fill=MINT, color=TEAL_D, size=20)
text(gs, cx + 1.3, cy + 0.32, 3.5, 0.4, "Bemor kartasi", size=18, color=NAVY, font=HEAD)
skel(gs, cx + 1.3, cy + 0.8, 2.6)
text(gs, cx + 0.35, cy + 1.35, 3, 0.3, "Sxematik ko‘rinish", size=11, color=MUTED)
seq.add(g, "fade", at=900, dur=600)
chips = ["EKG", "Holter", "SMAD", "Laboratoriya", "Kompleks xulosa", "Xavf signallari", "Dinamika", "Vipiska"]
chw = (cwid - 0.7 - 0.25) / 2
for i, c in enumerate(chips):
    x = cx + 0.35 + (i % 2) * (chw + 0.25)
    y = cy + 1.75 + (i // 2) * 0.72
    gg = sh.add_group_shape()
    ggs = gg.shapes
    box(ggs, x, y, chw, 0.56, fill=MINT2 if i < 4 else MINT, line=BORDER if i < 4 else None, radius=0.25)
    box(ggs, x + 0.2, y + 0.2, 0.16, 0.16, fill=TEAL, shape=MSO_SHAPE.OVAL)
    text(ggs, x + 0.5, y, chw - 0.6, 0.56, c, size=15, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(gg, "zoom", at=1100 + i * 110, dur=450)

s, seq, n = new_slide(
    "Shifokorning shaxsiy ish joyi uning kundalik ishini tartibga soladi. Shaxsiy panelda unga yuborilgan, "
    "xulosa kutayotgan va xulosa yozilgan tahlillar soni hamda oxirgi tahlillar ko‘rinadi. Ko‘rilmagan yangi "
    "tahlillar menyuda son bilan belgilanadi va ochilgach belgi o‘chadi. Ro‘yxatlarni sana, bemor va AI "
    "jiddiylik darajasi bo‘yicha saralash mumkin. Shifokor har bir tahlilga xulosa yozadi va bemor kartasidan "
    "vipiska chiqaradi.")
sh = s.shapes
frame(s, n, "06", SEC6, "Shifokorning *ish joyi*")
for i, (head, body) in enumerate([
    ("Shaxsiy panel", "Yuborilgan, xulosa kutayotgan va xulosa yozilgan tahlillar soni."),
    ("Yangi tahlil belgisi", "Ko‘rilmagan tahlillar menyuda son bilan ko‘rinadi, ochilgach belgi o‘chadi."),
    ("Filtrlar", "Ro‘yxatlar sana, bemor va AI jiddiylik darajasi bo‘yicha saralanadi."),
    ("Xulosa va vipiska", "Har bir tahlilga xulosa yozadi va bemor kartasidan vipiska chiqaradi."),
]):
    seq.add(row(sh, ML, 1.95 + i * 1.18, 5.9, i + 1, head, body), at=300 + i * 200)
px, py, pw = 7.05, 1.85, 5.7
g = sh.add_group_shape()
gs = g.shapes
box(gs, px, py, pw, 4.75, fill=WHITE, line=BORDER, shade=True, radius=0.05)
text(gs, px + 0.35, py + 0.25, 4, 0.35, "Shaxsiy panel", size=16, color=NAVY, font=HEAD)
text(gs, px + pw - 2.35, py + 0.28, 2, 0.3, "Sxematik ko‘rinish", size=11, color=MUTED, align=PP_ALIGN.RIGHT)
ctw = (pw - 0.7 - 0.4) / 3
for j, (lab, col) in enumerate([("Yuborilgan", TEAL), ("Kutmoqda", AMBER), ("Yozilgan", GREEN)]):
    x = px + 0.35 + j * (ctw + 0.2)
    box(gs, x, py + 0.8, ctw, 1.05, fill=MINT2, radius=0.12)
    box(gs, x + 0.15, py + 1.02, 0.16, 0.16, fill=col, shape=MSO_SHAPE.OVAL)
    text(gs, x + 0.38, py + 0.93, ctw - 0.43, 0.35, lab, size=13, color=NAVY, font=HEAD)
    skel(gs, x + 0.2, py + 1.45, ctw * 0.45, h=0.2, color="CBD5E1")
seq.add(g, "fade", at=900, dur=600)
for j, (typ, sev) in enumerate([("EKG", RED), ("Laboratoriya", AMBER), ("Holter", GREEN), ("SMAD", GREEN)]):
    gg = sh.add_group_shape()
    ggs = gg.shapes
    y = py + 2.15 + j * 0.62
    box(ggs, px + 0.35, y, pw - 0.7, 0.5, fill=WHITE, line=BORDER, radius=0.25)
    box(ggs, px + 0.55, y + 0.1, 1.45, 0.3, fill=MINT, radius=0.5)
    text(ggs, px + 0.55, y + 0.1, 1.45, 0.3, typ, size=12, color=TEAL_D, font=HEAD, align=PP_ALIGN.CENTER,
         anchor=MSO_ANCHOR.MIDDLE)
    skel(ggs, px + 2.2, y + 0.18, 2.2)
    box(ggs, px + pw - 0.75, y + 0.16, 0.18, 0.18, fill=sev, shape=MSO_SHAPE.OVAL)
    seq.add(gg, "float", at=1150 + j * 140)

s, seq, n = new_slide(
    "Vipiska — statsionardan chiqarish epikrizi. Uni faqat shifokor va faqat o‘ziga yo‘naltirilgan bemorga "
    "tuzadi; admin va direktor uni ko‘radi va PDF ni yuklab oladi. Hujjatda kasallik tarixi raqami, "
    "yotqizilish va chiqarilish sanalari, shikoyatlar, anamnez, obyektiv holat, tahlillar, diagnoz, "
    "konsultatsiya xulosalari, davolash, dori tayinlovlari va tavsiyalar bor. Diagnoz uch qismdan iborat — "
    "asosiy, yo‘ldosh va asorat — va tanlangan tahlillardagi shifokor xulosalaridan nusxa olinadi yoki qo‘lda "
    "yoziladi. Dori nomi, dozasi va qabul tartibi jadvalda kiritiladi. Imzo o‘rniga QR-kod bor, bemor uchun "
    "tavsiyalar alohida sahifada chiqariladi.")
sh = s.shapes
frame(s, n, "06", SEC6, "*Vipiska:* statsionardan chiqarish epikrizi")
for i, (head, body) in enumerate([
    ("Kim tuzadi", "Faqat shifokor, o‘ziga yo‘naltirilgan bemorga; rahbariyat ko‘radi va yuklab oladi."),
    ("Tahlillardan nusxa", "Diagnoz tahlillardagi shifokor xulosalaridan nusxalanadi yoki qo‘lda yoziladi."),
    ("Dori tayinlovlari", "Dori nomi, dozasi va qabul tartibi jadval ko‘rinishida kiritiladi."),
    ("QR bilan tasdiq", "Imzo o‘rniga QR-kod; bemor uchun tavsiyalar alohida sahifada chiqadi."),
]):
    seq.add(row(sh, ML, 1.95 + i * 1.18, 6.2, i + 1, head, body), at=300 + i * 200)
dx, dy, dw, dh = 7.5, 1.7, 4.9, 4.95
g = sh.add_group_shape()
gs = g.shapes
box(gs, dx, dy, dw, dh, fill=WHITE, line=BORDER, shade=True, radius=0.02)
text(gs, dx + 0.35, dy + 0.25, dw - 0.7, 0.35, "Kasallik tarixidan ko‘chirma", size=15, color=NAVY, font=HEAD)
text(gs, dx + 0.35, dy + 0.6, dw - 0.7, 0.3, "Kasallik tarixi № · sanalar", size=12, color=MUTED)
seq.add(g, "fade", at=900, dur=600)
parts = ["Shikoyatlar", "Anamnez va obyektiv holat", "Tahlillar", "Diagnoz: asosiy · yo‘ldosh · asorat",
         "Konsultatsiya xulosalari", "Davolash va dori tayinlovlari", "Chiqarilish holati va tavsiyalar"]
for i, ptxt in enumerate(parts):
    gg = sh.add_group_shape()
    ggs = gg.shapes
    y = dy + 1.05 + i * 0.47
    box(ggs, dx + 0.35, y + 0.12, 0.1, 0.1, fill=TEAL, shape=MSO_SHAPE.OVAL)
    text(ggs, dx + 0.6, y, dw - 1.0, 0.35, ptxt, size=13, color=BODY)
    seq.add(gg, "fade", at=1100 + i * 110, dur=400)
q = sh.add_group_shape()
qs = q.shapes
qx, qy, qd = dx + dw - 1.15, dy + dh - 1.15, 0.8
box(qs, qx, qy, qd, qd, fill=WHITE, line=NAVY, radius=0.05, line_w=1.5)
for (ax, ay) in [(0.08, 0.08), (0.48, 0.08), (0.08, 0.48)]:
    box(qs, qx + ax, qy + ay, 0.24, 0.24, fill=NAVY, shape=MSO_SHAPE.RECTANGLE)
for (ax, ay) in [(0.5, 0.5), (0.62, 0.62), (0.5, 0.66), (0.38, 0.4)]:
    box(qs, qx + ax, qy + ay, 0.1, 0.1, fill=NAVY, shape=MSO_SHAPE.RECTANGLE)
seq.add(q, "zoom", at=2000, dur=500)

s, seq, n = new_slide(
    "Onlayn konsultatsiya klinikaga tashqi mutaxassis fikrini olish imkonini beradi. Klinika mutaxassisni "
    "konsultant sifatida taklif qiladi va konsultatsiya narxini belgilaydi; narx o‘zgarishlari tarixi "
    "saqlanadi. So‘ng bemor tahlillari biriktirilgan konsultatsiya so‘rovi yuboriladi. Konsultant uni qabul "
    "qiladi yoki rad etadi; 48 soat ichida javob bo‘lmasa, so‘rov muddati o‘tgan hisoblanadi. Shifokorlar "
    "LiveKit asosidagi videoaloqa orqali bog‘lanadi, kiruvchi qo‘ng‘iroq real vaqtda ko‘rinadi. Oxirida "
    "konsultant xulosa yozadi va u QR-kod bilan tasdiqlanadi. Klinika ichida ko‘p ishtirokchili "
    "videokonferensiyalar ham o‘tkazish mumkin.")
sh = s.shapes
frame(s, n, "06", SEC6, "Onlayn *konsultatsiya* va videoaloqa")
flow(sh, seq, [
    ("Taklif", "Klinika tashqi mutaxassisni taklif qiladi va narxini belgilaydi."),
    ("So‘rov", "Bemor tahlillari biriktirilgan konsultatsiya so‘rovi yuboriladi."),
    ("Qabul", "Konsultant qabul yoki rad etadi; 48 soatda javob bo‘lmasa, muddati o‘tadi."),
    ("Videoaloqa", "Shifokorlar LiveKit asosidagi videoaloqa orqali bog‘lanadi."),
    ("Xulosa", "Konsultant xulosa yozadi; hujjat QR-kod bilan tasdiqlanadi."),
], y=1.95, h=3.55, step=300, icons=["people", "doc", "check", "video", "edit"])
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 5.8, W - 2 * ML, 0.75, fill=MINT2, radius=0.3)
text(gs, ML + 0.35, 5.8, W - 2 * ML - 0.7, 0.75, [[("Qo‘shimcha: ", {"font": HEAD, "color": TEAL_D}),
     ("narxlar tarixi saqlanadi, real vaqt xabarnomalari, klinika ichida ko‘p ishtirokchili videokonferensiya.", {})]],
     size=15, color=BODY, anchor=MSO_ANCHOR.MIDDLE)
seq.add(g, "fade", at=1900)

s, seq, n = new_slide(
    "Platforma oltita turdagi PDF hujjat tayyorlaydi: har bir tahlil hisoboti, kompleks AI xulosa, bemorning "
    "barcha tahlillari bo‘yicha jamlanma, vipiska, konsultatsiya xulosasi va laboratoriya statistikasi "
    "hisoboti. Barcha hujjatlar yagona uslubda: har sahifada chapda NMED, o‘ngda hujjatni chiqargan klinika "
    "logotipi va ma’lumotlari bor; hujjat uch tilda chiqariladi. Hujjatdagi QR-kodni skaner qilgan har kim "
    "tizimga kirmasdan uning haqiqiyligini va oxirgi tahrir vaqtini tekshira oladi.")
sh = s.shapes
frame(s, n, "06", SEC6, "PDF hujjatlar va *QR orqali tasdiqlash*")
seq.add(text(sh, ML, 1.85, 6.5, 0.35, "HUJJAT TURLARI", size=14, color=TEAL_D, font=HEAD), "fade", at=200)
doc_types = ["EKG, Holter, SMAD va laboratoriya hisobotlari", "Kompleks AI xulosa",
             "Bemorning barcha tahlillari bo‘yicha jamlanma", "Vipiska (epikriz)", "Konsultatsiya xulosasi",
             "Laboratoriya statistikasi hisoboti"]
for i, dt in enumerate(doc_types):
    gg = sh.add_group_shape()
    ggs = gg.shapes
    y = 2.3 + i * 0.68
    box(ggs, ML, y, 6.3, 0.56, fill=MINT2 if i % 2 == 0 else WHITE, line=BORDER, radius=0.25)
    text(ggs, ML + 0.25, y, 0.5, 0.56, str(i + 1), size=15, color=TEAL_D, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    text(ggs, ML + 0.7, y, 5.4, 0.56, dt, size=15, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(gg, "float", at=350 + i * 140)
vx = 7.35
seq.add(text(sh, vx, 1.85, 5.4, 0.35, "QR ORQALI TASDIQLASH", size=14, color=TEAL_D, font=HEAD), "fade", at=1100)
for i, (head, body) in enumerate([
    ("QR-kodni skaner qilish", "Hujjatdagi QR-kod telefon kamerasi bilan o‘qiladi."),
    ("Tasdiqlash sahifasi", "Login talab qilinmaydi: hujjat haqiqiy yoki yo‘qligi ko‘rinadi."),
    ("Oxirgi tahrir vaqti", "Sahifadagi vaqt PDF dagi «Tasdiqlangan» vaqti bilan mos bo‘lishi kerak."),
]):
    seq.add(card(sh, vx, 2.3 + i * 1.44, W - ML - vx, 1.32, None, head, body, ico=["qr", "eye", "datetime"][i]),
            at=1250 + i * 220)

# ═══════════════════════════ 07 · BOSHQARUV ═══════════════════════════
SEC7 = "Boshqaruv va xavfsizlik"
divider("07", SEC7, "Klinika rahbariyati va platforma ma’muriyati uchun",
        "Yettinchi qism — boshqaruv: klinika paneli, laboratoriya statistikasi, SuperAdmin kabineti va "
        "ma’lumotlar himoyasi.",
        topics=['klinika paneli', 'statistika', 'SuperAdmin', 'himoya'])

s, seq, n = new_slide(
    "Klinika admini va direktori uchun boshqaruv vositalari bor. Boshqaruv panelida bugungi va jami tahlillar "
    "soni har bir tur bo‘yicha ko‘rinadi. Admin xodimlarni qo‘shadi va tahrirlaydi, klinikaning barcha "
    "tahlillarini filtrlar bilan ko‘radi va ro‘yxatni Excel’da ochiladigan CSV faylga yuklab oladi. O‘chirilgan "
    "tahlil butunlay yo‘qolmaydi — u alohida ro‘yxatda turadi va SuperAdmin uni tiklay oladi. Klinika "
    "sozlamalarida nomi, logotipi, telefonlari va litsenziyasi saqlanadi.")
sh = s.shapes
frame(s, n, "07", SEC7, "Klinika rahbariyati uchun *boshqaruv*")
tiles(sh, seq, [
    ("Boshqaruv paneli", "Bugungi va jami tahlillar soni har bir tur bo‘yicha.", "grid"),
    ("Xodimlar", "Shifokor va hamshiralarni qo‘shish, lavozim va ma’lumotlarini tahrirlash.", "people"),
    ("Barcha tahlillar", "Klinikaning barcha tahlillari ro‘yxati, filtrlar va qidiruv.", "list"),
    ("CSV eksport", "Tahlillar ro‘yxatini Excel’da ochiladigan CSV faylga yuklab olish.", "download"),
    ("Yumshoq o‘chirish", "O‘chirilgan tahlil yo‘qolmaydi; uni SuperAdmin tiklay oladi.", "undo"),
    ("Klinika sozlamalari", "Nomi, logotipi, telefonlari va litsenziyasi; logotip PDF shapkasida chiqadi.", "settings"),
], cols=3, x0=ML, y0=1.9, w=W - 2 * ML, th=2.2, gap=0.26, start=300, step=170)

s, seq, n = new_slide(
    "Laboratoriya statistikasi sahifasi admin va direktor uchun. U faqat o‘z klinikasi ma’lumotlarini "
    "ko‘rsatadi, birligi tekshirilmagan qiymatlar statistikaga kirmaydi. Filtrlar: davr, shifokor, jins, "
    "yosh, ko‘rsatkichlar guruhi, aniq ko‘rsatkich va faqat me’yordan tashqari qiymatlar. Umumiy bo‘limda "
    "asosiy ko‘rsatkichlar, vaqt grafigi, AI jiddiyligi, jins va yosh tarkibi, guruhlar va xodimlar kesimi "
    "bor. Ko‘rsatkichlar bo‘limida eng ko‘p chetlanishlar, taqsimot gistogrammasi, oylik mediana va oxirgi "
    "natijasi me’yordan tashqari bemorlar ko‘rinadi. Xavf signallari bo‘limida signallar bemor bo‘yicha "
    "guruhlanadi. Hammasini tanlangan filtrlar bilan PDF hisobot sifatida yuklab olish mumkin.")
sh = s.shapes
frame(s, n, "07", SEC7, "Laboratoriya *statistikasi* va hisobot")
seq.add(text(sh, ML, 1.85, 3.6, 0.35, "FILTRLAR", size=14, color=TEAL_D, font=HEAD), "fade", at=200)
filters = ["Davr", "Shifokor", "Jins", "Yosh", "Ko‘rsatkichlar guruhi", "Ko‘rsatkich", "Faqat me’yordan tashqari"]
for i, f in enumerate(filters):
    gg = sh.add_group_shape()
    ggs = gg.shapes
    y = 2.3 + i * 0.6
    box(ggs, ML, y, 3.5, 0.48, fill=WHITE, line=BORDER, radius=0.25)
    box(ggs, ML + 0.2, y + 0.16, 0.16, 0.16, fill=TEAL, shape=MSO_SHAPE.OVAL)
    text(ggs, ML + 0.5, y, 2.9, 0.48, f, size=14, color=NAVY, font=HEAD, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(gg, "float", at=300 + i * 100)
sx2 = ML + 3.85
sw2 = (W - ML - sx2 - 0.3) / 2
for i, (head, body) in enumerate([
    ("Umumiy ko‘rinish", "Asosiy ko‘rsatkichlar, vaqt grafigi, AI jiddiyligi, jins va yosh, guruhlar, xodimlar."),
    ("Ko‘rsatkichlar", "Eng ko‘p chetlanishlar, gistogramma, oylik mediana, me’yordan tashqari bemorlar."),
    ("Xavf signallari", "Signallar bemor bo‘yicha guruhlanadi; shifokor yoki rahbar baholaydi."),
    ("PDF hisobot", "Tanlangan filtrlar bilan yotiq A4 formatdagi hisobot yuklab olinadi."),
]):
    x = sx2 + (i % 2) * (sw2 + 0.3)
    y = 1.85 + (i // 2) * 2.4
    seq.add(card(sh, x, y, sw2, 2.15, None, head, body, body_size=15, head_size=17,
                 ico=["chart", "pie", "warning", "report"][i]), at=1000 + i * 220)

s, seq, n = new_slide(
    "SuperAdmin kabineti butun platformani bitta joydan kuzatish va boshqarish uchun. SuperAdmin klinikalarni "
    "yaratadi, tahrirlaydi va faollashtiradi; xodimlarning parolini almashtiradi va ularni bloklaydi. "
    "Muammoni tekshirish uchun xodim sifatida tizimga kirishi mumkin — bu amal audit jurnaliga yoziladi. "
    "U butun platforma bo‘yicha bemorlar va barcha tahlillarni ko‘radi, o‘chirilgan tahlillarni tiklaydi. "
    "Spravochniklar va laboratoriya katalogini boshqaradi: yangi ko‘rsatkich katalogga bitta qator qo‘shish "
    "bilan qo‘shiladi, kodni o‘zgartirish shart emas. AI xarajati — har bir chaqiruvning modeli, tokenlari "
    "va narxi, audit jurnali va tizim holati ham shu yerda. Tahlili bor klinika, xodim yoki bemorni o‘chirib "
    "bo‘lmaydi — faqat faolsizlantiriladi.")
sh = s.shapes
frame(s, n, "07", SEC7, "*SuperAdmin:* butun platforma nazorati")
tiles(sh, seq, [
    ("Klinikalar", "Yaratish, tahrirlash va faollashtirish.", "home"),
    ("Xodimlar", "Parolni almashtirish va bloklash.", "people"),
    ("Xodim sifatida kirish", "Xodim ko‘zi bilan ko‘rish; auditga yoziladi.", "eye"),
    ("Bemorlar", "Butun platforma bo‘yicha qidiruv va tahrirlash.", "idcard"),
    ("Barcha tahlillar", "Barcha turdagi tahlillarni ko‘rish va tiklash.", "diag"),
    ("Spravochniklar", "Shikoyatlar, lavozimlar va laboratoriya katalogi.", "library"),
    ("AI xarajati", "Har bir chaqiruv: model, tokenlar va narx.", "card"),
    ("Audit va tizim holati", "Amallar jurnali, baza va AI xizmati holati.", "history"),
], cols=4, x0=ML, y0=1.8, w=W - 2 * ML, th=1.95, gap=0.2, start=300, step=120)
g = sh.add_group_shape()
gs = g.shapes
box(gs, ML, 6.12, W - 2 * ML, 0.6, fill=MINT2, radius=0.3)
text(gs, ML + 0.35, 6.12, W - 2 * ML - 0.7, 0.6, [[("Himoya qoidasi: ", {"font": HEAD, "color": TEAL_D}),
     ("tahlili bor klinika, xodim yoki bemor o‘chirilmaydi — faqat faolsizlantiriladi.", {})]], size=15,
     color=BODY, anchor=MSO_ANCHOR.MIDDLE)
seq.add(g, "fade", at=1400)

s, seq, n = new_slide(
    "Tibbiy ma’lumotlar himoyasiga alohida e’tibor berilgan. Kirish huquqi rollarga asoslangan, tizimga "
    "kirish tokeni 3 soat amal qiladi. Ma’lumotni o‘zgartiruvchi barcha amallar audit jurnaliga yoziladi. "
    "So‘rovlar soni cheklanadi, ulanish HTTPS orqali shifrlanadi, maxfiy maydonlar uchun AES-256 shifrlash "
    "qo‘llaniladi. Platforma O‘z DSt 2814:2014 standartining 3-daraja talablari asosida loyihalangan. "
    "[Eslatma: AES shifrlash hozircha barcha maydonlarga to‘liq joriy etilmagan — savol bo‘lsa, "
    "bosqichma-bosqich joriy etilayotganini ayting.]")
sh = s.shapes
frame(s, n, "07", SEC7, "Tibbiy ma’lumotlar *himoyasi*")
seq.hero(picture(sh, "11_xavfsizlik.jpg", 7.35, 1.75, w=5.6), "zoom")
sec_items = [("Rollar", "Har bir rol faqat o‘ziga kerakli ma’lumotni ko‘radi", "people"),
             ("Token", "Tizimga kirish tokeni 3 soat amal qiladi", "key"),
             ("Audit", "O‘zgartiruvchi barcha amallar jurnalga yoziladi", "history"),
             ("Cheklov", "So‘rovlar soni cheklanadi (rate limiting)", "filter"),
             ("Shifrlash", "HTTPS ulanish va AES-256 maxfiy maydonlar uchun", "lock"),
             ("Fayllar", "Fayl nomlari taxmin qilib bo‘lmaydigan UUID", "folder")]
iw = 3.2
for i, (head, body, ic) in enumerate(sec_items):
    x = ML + (i % 2) * (iw + 0.25)
    y = 1.9 + (i // 2) * 1.38
    g = sh.add_group_shape()
    gs = g.shapes
    box(gs, x, y, iw, 1.2, fill=WHITE, line=BORDER, shade=True, radius=0.1)
    icon(gs, x + 0.2, y + 0.32, 0.56, ic, style="grad" if i % 3 == 0 else "soft")
    text(gs, x + 0.95, y + 0.14, iw - 1.1, 0.35, head, size=16, color=NAVY, font=HEAD)
    text(gs, x + 0.95, y + 0.5, iw - 1.1, 0.68, body, size=13, color=BODY)
    seq.add(g, "float", at=450 + i * 150)
seq.add(text(sh, ML, 6.15, 6.6, 0.45, [[("Standart: ", {"font": HEAD, "color": TEAL_D}),
        ("O‘z DSt 2814:2014, 3-daraja talablari asosida loyihalangan.", {})]], size=15, color=BODY),
        "fade", at=1500)

# ═══════════════════════════ 08 · NATIJALAR ═══════════════════════════
SEC8 = "Joriy etish va natijalar"
divider("08", SEC8, "Platforma amaliyotda",
        "Sakkizinchi qism — tadqiqot natijalari, platformaning joriy etilishi va xulosalar.",
        topics=['natijalar', 'joriy etish', 'xulosa'])

s, seq, n = new_slide(
    "Natijalar ikki guruhga bo‘linadi. Yuqorida platformaning o‘zi: to‘rtta tahlil moduli, 137 ta "
    "laboratoriya ko‘rsatkichi katalogi, 25 ta klinik qoida va uch tilli interfeys. Pastda amaliy sinov "
    "natijalari: [tahlil qilingan tahlillar soni], [ulangan klinikalar soni], [foydalanuvchilar soni] va "
    "[AI va shifokor xulosalarining mos kelish foizi]. Qo‘shimcha o‘lchov: 1000 ta klinika faylida "
    "laboratoriya tahlili sanasi 88% hollarda papka sanasi bilan ±3 kun aniqlikda mos keldi, farqning "
    "asosiy sababi papka nomidagi xato edi.")
sh = s.shapes
frame(s, n, "08", SEC8, "Natijalar")
seq.add(text(sh, ML, 1.75, 8, 0.35, "PLATFORMA", size=14, color=TEAL_D, font=HEAD), "fade", at=200)
sw4 = (W - 2 * ML - 3 * 0.3) / 4
for i, (v, lab) in enumerate([("4", "diagnostika tahlili moduli"), ("137", "laboratoriya ko‘rsatkichi katalogda"),
                              ("25", "klinik qoida xavf signallari uchun"), ("3", "til: o‘zbek, rus, ingliz")]):
    seq.add(stat(sh, ML + i * (sw4 + 0.3), 2.15, sw4, 1.75, v, lab, value_size=40), "zoom", at=350 + i * 180,
            dur=600)
seq.add(text(sh, ML, 4.2, 8, 0.35, "AMALIY SINOV", size=14, color=TEAL_D, font=HEAD), "fade", at=1150)
for i, (v, lab) in enumerate([("[son]", "tahlil AI orqali talqin qilindi"), ("[son]", "klinika platformaga ulangan"),
                              ("[son]", "ro‘yxatdan o‘tgan foydalanuvchi"), ("[%]", "AI va shifokor xulosasining mosligi")]):
    seq.add(stat(sh, ML + i * (sw4 + 0.3), 4.6, sw4, 1.75, v, lab, color=AMBER_D, fill=WHITE, line=AMBER,
                 dash=True, value_size=34), "float", at=1300 + i * 180)

s, seq, n = new_slide(
    "Platforma klinikalarda joriy etilmoqda. [Joriy etilgan klinikalar nomi va dalolatnoma sanalarini "
    "ayting.] Bundan tashqari, klinikalar arxividagi taxminan 26 700 ta laboratoriya fayli tizimga import "
    "qilish uchun tayyorlangan: bu bemorlarning yillar davomidagi dinamikasini ko‘rish va statistik tahlil "
    "uchun asos bo‘ladi.")
sh = s.shapes
frame(s, n, "08", SEC8, "Platforma klinikalarda *joriy etilmoqda*")
seq.hero(picture(sh, "12_joriy_etish.jpg", 5.95, 1.6, w=7.1), "zoom")
for i in range(3):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 1.9 + i * 1.02
    box(gs, ML, y, 5.4, 0.85, fill=WHITE, line=AMBER, dash=True, radius=0.12, line_w=1.25)
    badge(gs, ML + 0.2, y + 0.19, 0.46, str(i + 1), fill=MINT, color=TEAL_D, size=13)
    text(gs, ML + 0.85, y, 4.4, 0.85, [[("[Klinika nomi] — dalolatnoma [sana]", PH)]], size=15,
         anchor=MSO_ANCHOR.MIDDLE)
    seq.add(g, "float", at=500 + i * 200)
seq.add(stat(sh, ML, 5.05, 5.4, 1.55, "≈ 26 700",
             "klinikalar arxividagi laboratoriya fayli import uchun tayyorlangan", value_size=32), "zoom",
        at=1200, dur=600)

s, seq, n = new_slide(
    "Xulosa qilib aytganda: birinchidan, to‘rt turdagi diagnostika tahlilini AI yordamida talqin qiluvchi "
    "yagona platforma ishlab chiqildi va amaliyotga joriy etildi. Ikkinchidan, laboratoriya natijalarini "
    "birliklar va me’yorlar bo‘yicha avtomatik keltirish ularni statistik tahlilga yaroqli qildi. "
    "Uchinchidan, kompleks AI xulosa turli tahlillardagi bog‘liq belgilarni birga baholash imkonini beradi. "
    "To‘rtinchidan, klinik qoidalar asosidagi xavf signallari xavfli holatlarni erta ko‘rishga yordam beradi. "
    "Va nihoyat, yakuniy qaror shifokorda qoladi: tizim shifokorni almashtirmaydi, uning ishini "
    "tezlashtiradi.")
sh = s.shapes
frame(s, n, "", "Yakun", "Xulosa")
concl = ["To‘rt turdagi diagnostika tahlilini AI yordamida talqin qiluvchi yagona platforma ishlab chiqildi va joriy etildi.",
         "Laboratoriya natijalarini birlik va me’yorlar bo‘yicha avtomatik keltirish ularni statistik tahlilga yaroqli qildi.",
         "Kompleks AI xulosa turli tahlillardagi bog‘liq belgilarni birga baholash imkonini beradi.",
         "Klinik qoidalar asosidagi xavf signallari xavfli holatlarni erta ko‘rishga yordam beradi.",
         "Yakuniy qaror shifokorda qoladi: tizim shifokorni almashtirmaydi, uning ishini tezlashtiradi."]
for i, t in enumerate(concl):
    g = sh.add_group_shape()
    gs = g.shapes
    y = 1.85 + i * 0.95
    hl = i == 4
    box(gs, ML, y, W - 2 * ML, 0.8, fill=TEAL if hl else MINT2, radius=0.2, shade=hl)
    text(gs, ML + 0.3, y, 0.6, 0.8, f"{i + 1:02d}", size=20, color=WHITE if hl else TEAL, font=HEAD,
         anchor=MSO_ANCHOR.MIDDLE)
    text(gs, ML + 1.05, y, W - 2 * ML - 1.3, 0.8, t, size=16, color=WHITE if hl else NAVY,
         font=HEAD if hl else TEXT, anchor=MSO_ANCHOR.MIDDLE)
    seq.add(g, "float", at=300 + i * 260, dur=650)

# ═══════════════════════════ RAHMAT ═══════════════════════════
s, seq, n = new_slide(
    "E’tiboringiz uchun rahmat! Savollaringizga javob berishga tayyorman.", morph=1400)
sh = s.shapes
set_name(picture(sh, "01_titul.jpg", 3.33, 0.875, w=10.0), "!!heart")
seq.add(sh.add_picture(LOGO, Inches(0.8), Inches(0.7), height=Inches(0.62)), "fade", at=400)
seq.add(text(sh, 1.55, 0.78, 3, 0.5, "NMED", size=26, color=NAVY, font=HEAD), "fade", at=400)
seq.add(rich_title(sh, 0.8, 2.6, 5.6, 1.9, "E’tiboringiz uchun *rahmat!*", 44, line_spacing=0.95),
        "float", at=600, dur=800)
seq.add(text(sh, 0.8, 4.35, 5.6, 0.5, "Savollaringizga javob berishga tayyorman.", size=20, color=MUTED),
        "float", at=900)
seq.add(text(sh, 0.8, 5.3, 5.6, 0.9, [[("[F.I.Sh.]", PH)], [("nmed.uz  ·  [e-pochta]", PH)]], size=15,
             space_after=4), "fade", at=1200)

# ═══════════════════════════ yakunlash ═══════════════════════════
add_blobs()
for slide, seq, morph in SLIDES:
    apply_motion(slide, seq.items, morph_ms=morph)

prs.core_properties.title = "NMED — dissertatsiya taqdimoti"
prs.core_properties.author = "NMED"
prs.save(OUT)
print("saved", OUT, "slides:", len(prs.slides))
