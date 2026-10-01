# Builds the PayPerRead pitch deck (PowerPoint) in the website's Apple-style design.
# Every slide fades in, and its elements build in one after another automatically.
import sys
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = Path(__file__).parent
IMG = HERE / "img"
VIDEO = HERE / "payperread-showcase.mp4"  # not in git: copy the video here first
LOGO_WHITE = HERE.parent / "public" / "logo-white.png"
LOGO_DARK = HERE.parent / "public" / "logo.png"
OUT = Path(sys.argv[1])

# Design tokens from src/app/globals.css
BLACK = RGBColor(0x00, 0x00, 0x00)
INK = RGBColor(0x1D, 0x1D, 0x1F)
GRAY = RGBColor(0xF5, 0xF5, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BLUE = RGBColor(0x00, 0x71, 0xE3)
LINK_DARK = RGBColor(0x29, 0x97, 0xFF)
DARK_CARD = RGBColor(0x27, 0x27, 0x29)
MUTED = RGBColor(0x6E, 0x6E, 0x73)
MUTED_DARK = RGBColor(0xA1, 0xA1, 0xA6)
FONT = "Helvetica Neue"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
W, H = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]
P = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
NS = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'


# ---------- helpers ----------

def track(slide, shape, build):
    """build=True: starts a new animation step; False: joins the previous step; None: static."""
    if build is True:
        slide.builds.append([shape])
    elif build is False and slide.builds:
        slide.builds[-1].append(shape)

def new_slide(bg, notes):
    slide = prs.slides.add_slide(BLANK)
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = bg
    slide.notes_slide.notes_text_frame.text = notes
    slide.builds = []  # groups of shapes that animate in together, in order
    slide.wipes = set()  # indexes of groups that wipe in from the left (lines)
    return slide


def text(slide, x, y, w, h, runs, size=20, color=INK, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, spacing=None, line=None, build=True):
    """runs: a string, or a list of paragraphs; each paragraph is a string or a list of (text, overrides)."""
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    paragraphs = runs if isinstance(runs, list) else [runs]
    for i, para in enumerate(paragraphs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line:
            p.line_spacing = line
        if spacing and i > 0:
            p.space_before = Pt(spacing)
        for chunk in para if isinstance(para, list) else [(para, {})]:
            t, o = chunk if isinstance(chunk, tuple) else (chunk, {})
            r = p.add_run()
            r.text = t
            f = r.font
            f.name = FONT
            f.size = Pt(o.get("size", size))
            f.bold = o.get("bold", bold)
            f.color.rgb = o.get("color", color)
    track(slide, box, build)
    return box


def card(slide, x, y, w, h, fill=WHITE, radius=0.06, build=True):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shape.adjustments[0] = radius
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    shape.shadow.inherit = False
    track(slide, shape, build)
    return shape


def picture(slide, path, x, y, w=None, h=None, rounded=0.0, border=None, build=True):
    pic = slide.shapes.add_picture(str(path), x, y, w, h)
    if rounded:
        geom = pic._element.spPr.find("{http://schemas.openxmlformats.org/drawingml/2006/main}prstGeom")
        geom.set("prst", "roundRect")
        av = geom.find("{http://schemas.openxmlformats.org/drawingml/2006/main}avLst")
        gd = etree.SubElement(av, "{http://schemas.openxmlformats.org/drawingml/2006/main}gd")
        gd.set("name", "adj")
        gd.set("fmla", f"val {int(rounded * 100000)}")
    if border:
        pic.line.color.rgb = border
        pic.line.width = Pt(0.75)
    track(slide, pic, build)
    return pic


def eyebrow(slide, label, dark=False, y=Inches(0.7)):
    text(slide, Inches(0.9), y, Inches(8), Inches(0.4), label, size=16, bold=True,
         color=LINK_DARK if dark else BLUE)


def headline(slide, t, dark=False, y=Inches(1.1), size=44, w=Inches(11.5)):
    return text(slide, Inches(0.9), y, w, Inches(1.6), t, size=size, bold=True,
                color=WHITE if dark else INK, line=0.95)


def logo_corner(slide, dark):
    picture(slide, LOGO_WHITE if dark else LOGO_DARK, W - Inches(2.35), H - Inches(0.7), h=Inches(0.28), build=None)


# ---------- animation XML ----------
def add_transition(slide):
    xml = f'<p:transition {NS} spd="slow"><p:fade/></p:transition>'
    el = etree.fromstring(xml)
    sld = slide._element
    anchor = sld.find(f"{P}clrMapOvr")
    anchor.addnext(el)


def add_builds(slide, start=250, stagger=220, dur=600):
    """Auto-play entrance: each shape fades in and rises slightly, one after another."""
    if not slide.builds:
        return
    stagger = getattr(slide, "stagger", stagger)
    ids = iter(range(5, 10000))
    effects = []
    steps = [(i, shape) for i, group in enumerate(slide.builds) for shape in group]
    for n, (i, shape) in enumerate(steps):
        spid = shape.shape_id
        a, b, c, d = next(ids), next(ids), next(ids), next(ids)
        node = "afterEffect" if n == 0 else "withEffect"
        if i in slide.wipes:
            effects.append(f"""
<p:par><p:cTn id="{a}" presetID="22" presetClass="entr" presetSubtype="8" fill="hold" nodeType="{node}">
 <p:stCondLst><p:cond delay="{start + i * stagger}"/></p:stCondLst><p:childTnLst>
  <p:set><p:cBhvr><p:cTn id="{b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>
   <p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>
   <p:to><p:strVal val="visible"/></p:to></p:set>
  <p:animEffect transition="in" filter="wipe(left)"><p:cBhvr><p:cTn id="{c}" dur="{stagger}"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>
 </p:childTnLst></p:cTn></p:par>""")
            continue
        effects.append(f"""
<p:par><p:cTn id="{a}" presetID="42" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="{node}">
 <p:stCondLst><p:cond delay="{start + i * stagger}"/></p:stCondLst><p:childTnLst>
  <p:set><p:cBhvr><p:cTn id="{b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>
   <p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>
   <p:to><p:strVal val="visible"/></p:to></p:set>
  <p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{c}" dur="{dur}"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>
  <p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{d}" dur="{dur}" decel="100000" fill="hold"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>
   <p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>
   <p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y+.03"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav></p:tavLst></p:anim>
 </p:childTnLst></p:cTn></p:par>""")
    blds = "".join(
        f'<p:bldP spid="{sh.shape_id}" grpId="0" animBg="1"/>'
        for group in slide.builds for sh in group
        if sh._element.tag.endswith("}sp")  # shapes and text boxes (not pictures or lines)
    )
    xml = f"""<p:timing {NS}><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>
<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>
<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>
<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{"".join(effects)}
</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>
</p:childTnLst></p:cTn>
<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>
<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>
</p:childTnLst></p:cTn></p:par></p:tnLst>{f"<p:bldLst>{blds}</p:bldLst>" if blds else ""}</p:timing>"""
    slide._element.find(f"{P}transition").addnext(etree.fromstring(xml))


# =====================================================================
# 1. Title
s = new_slide(BLACK, "Hi, I'm Marcel, and this is PayPerRead. The idea in one sentence: read what matters, and pay for just that. "
              "Five cents per story, paid directly to the person who wrote it.")
picture(s, LOGO_WHITE, (W - Inches(4.6)) // 2, Inches(2.05), h=Inches(0.88))
text(s, Inches(0.6), Inches(3.3), W - Inches(1.2), Inches(1.0), "Read what matters. Pay for just that.",
     size=48, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
text(s, Inches(1), Inches(4.5), W - Inches(2), Inches(0.5),
     "Pay-per-read journalism and podcasts, paid straight to the creator on Solana.",
     size=22, color=MUTED_DARK, align=PP_ALIGN.CENTER)
text(s, Inches(1), Inches(6.55), W - Inches(2), Inches(0.4), "Solana Case · BMT 2026",
     size=14, color=MUTED, align=PP_ALIGN.CENTER)

# 2. Problem
s = new_slide(GRAY, "Most readers never subscribe. They want one article, not a monthly contract. "
              "And the obvious alternative, charging a few cents, is impossible with card payments: "
              "the fixed fee alone is bigger than the price.")
eyebrow(s, "The problem")
headline(s, "Great journalism is locked behind subscriptions nobody wants.", w=Inches(11))
cards = [
    ("83%", "of people don’t pay for online news.", "Reuters Institute, Digital News Report 2024: only 17% pay (20-country average)."),
    ("1 story", "is what most readers want, not a monthly contract.", "Subscription fatigue: each paywall asks a one-time visitor for a long-term commitment."),
    ("€0.25", "fixed card fee makes a €0.05 payment impossible.", "e.g. Stripe standard EEA pricing: 1.5% + €0.25 per card payment."),
]
cw, gap = Inches(3.62), Inches(0.28)
for i, (big, line1, small) in enumerate(cards):
    x = Inches(0.9) + i * (cw + gap)
    c = card(s, x, Inches(3.05), cw, Inches(3.3))
    text(s, x + Inches(0.4), Inches(3.4), cw - Inches(0.8), Inches(0.9), big, size=48, bold=True, color=BLUE, build=False)
    text(s, x + Inches(0.4), Inches(4.3), cw - Inches(0.8), Inches(0.9), line1, size=18, bold=True, build=False)
    text(s, x + Inches(0.4), Inches(5.45), cw - Inches(0.8), Inches(0.8), small, size=12, color=MUTED, build=False)
    # animate the card and its text together: group them after creation
logo_corner(s, False)

# 3. Solution
s = new_slide(BLACK, "PayPerRead turns every story into a product of its own. Stories cost five cents, podcast episodes twenty. "
              "No subscription, no account at a bank or card company. The money goes straight to the creator's wallet.")
eyebrow(s, "Our solution", dark=True)
headline(s, "Pay per story. Straight to the creator.", dark=True)
stats = [("€0.05", "per story"), ("€0.20", "per podcast episode"), ("€0", "subscription"), ("100%", "to the creator’s wallet")]
sw = Inches(2.7)
for i, (big, label) in enumerate(stats):
    x = Inches(0.9) + i * (sw + Inches(0.2))
    card(s, x, Inches(3.0), sw, Inches(2.4), fill=DARK_CARD)
    text(s, x + Inches(0.35), Inches(3.35), sw - Inches(0.7), Inches(1), big, size=50, bold=True, color=WHITE, build=False)
    text(s, x + Inches(0.35), Inches(4.45), sw - Inches(0.7), Inches(0.7), label, size=18, color=MUTED_DARK, build=False)
text(s, Inches(0.9), Inches(5.95), Inches(11.5), Inches(0.6),
     "Every teaser is free. Readers unlock only what they really want to read or hear.", size=20, color=MUTED_DARK)
logo_corner(s, True)

# 4. How it works
s = new_slide(GRAY, "Here is what happens in the three seconds after you click Unlock. "
              "The key point: our server trusts nothing it cannot check on the blockchain.")
eyebrow(s, "How it works")
headline(s, "One click. Three seconds. Verified on-chain.")
steps = [
    ("1", "Connect a wallet", "Phantom, or the built-in Demo Wallet. No card, no bank account."),
    ("2", "Pay €0.05", "A Solana transfer from reader to writer, with a memo: “payperread:<story>”."),
    ("3", "Server verifies", "Our server checks the transaction on the blockchain before it unlocks anything."),
    ("4", "Yours to keep", "Saved in the library, readable offline, restorable from the wallet any time."),
]
stw = Inches(2.72)
for i, (n, title, body) in enumerate(steps):
    x = Inches(0.9) + i * (stw + Inches(0.2))
    card(s, x, Inches(2.85), stw, Inches(3.5))
    oval = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.35), Inches(3.2), Inches(0.62), Inches(0.62))
    oval.fill.solid(); oval.fill.fore_color.rgb = BLUE; oval.line.fill.background(); oval.shadow.inherit = False
    oval.text_frame.text = n
    r = oval.text_frame.paragraphs[0].runs[0]; r.font.size = Pt(20); r.font.bold = True; r.font.name = FONT; r.font.color.rgb = WHITE
    oval.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    track(s, oval, False)
    text(s, x + Inches(0.35), Inches(4.1), stw - Inches(0.5), Inches(0.5), title, size=19, bold=True, build=False)
    text(s, x + Inches(0.35), Inches(4.65), stw - Inches(0.7), Inches(1.5), body, size=14, color=MUTED, build=False)
logo_corner(s, False)

# 5. Demo video
s = new_slide(BLACK, "Let's see it in action. Three minutes: a reader pays five cents on Solana Devnet, "
              "an admin approves a new author, and the writer sees the sale live on the dashboard. (Click the video to play.)")
text(s, Inches(0.9), Inches(0.45), Inches(8), Inches(0.4), "Live demo", size=16, bold=True, color=LINK_DARK, build=False)
text(s, Inches(0.9), Inches(0.8), Inches(11), Inches(0.8), "See it in action.", size=40, bold=True, color=WHITE, build=False)
vw = Inches(9.6)
vh = Emu(int(vw * 9 / 16))
s.shapes.add_movie(str(VIDEO), (W - vw) // 2, Inches(1.75), vw, vh,
                   poster_frame_image=str(IMG / "poster.jpg"), mime_type="video/mp4")

# 6. Product for readers
s = new_slide(GRAY, "For readers: a personal home page with picks based on what they bought, "
              "and a library where everything they paid for stays, even offline. "
              "Every purchase is on the blockchain, so they can restore it with their wallet.")
eyebrow(s, "For readers")
headline(s, "Discover. Pay once. Keep it forever.", w=Inches(5.2), size=40)
bullets = [
    [("Personal picks", {"bold": True}), ("  based on the topics you bought", {})],
    [("Stories and podcasts", {"bold": True}), ("  in one place, filter in one tap", {})],
    [("Library with offline mode", {"bold": True}), ("  read and listen without internet", {})],
    [("Proof of ownership", {"bold": True}), ("  restore purchases from your wallet", {})],
]
text(s, Inches(0.9), Inches(3.0), Inches(4.9), Inches(3), bullets, size=18, spacing=16)
picture(s, IMG / "home-picks.png", Inches(6.55), Inches(0.9), w=Inches(5.95), rounded=0.03, border=RGBColor(0xD2, 0xD2, 0xD7))
picture(s, IMG / "library.png", Inches(7.6), Inches(3.75), w=Inches(4.9), rounded=0.03, border=RGBColor(0xD2, 0xD2, 0xD7))
logo_corner(s, False)

# 7. Product for creators
s = new_slide(GRAY, "For creators: a dashboard that shows revenue, sales, views and conversion, "
              "tells them what's working and what needs attention, and shows every sale live, seconds after it happens. "
              "To keep quality high, every new author is reviewed by an editor first.")
eyebrow(s, "For creators")
headline(s, "Know what works. See every sale live.", w=Inches(5.2), size=40)
bullets = [
    [("Revenue, sales, views, conversion", {"bold": True}), ("  per 7, 30, 90 days", {})],
    [("What’s working / needs attention", {"bold": True}), ("  with concrete tips", {})],
    [("Live sales", {"bold": True}), ("  the money is already in the wallet", {})],
    [("Curated authors", {"bold": True}), ("  every writer applies and is reviewed", {})],
]
text(s, Inches(0.9), Inches(3.0), Inches(4.9), Inches(3), bullets, size=18, spacing=16)
picture(s, IMG / "dashboard-insights.png", Inches(6.55), Inches(0.9), w=Inches(5.95), rounded=0.03, border=RGBColor(0xD2, 0xD2, 0xD7))
picture(s, IMG / "live-sale.jpg", Inches(6.9), Inches(4.55), w=Inches(5.6), rounded=0.03, border=RGBColor(0xD2, 0xD2, 0xD7))
logo_corner(s, False)

# 8. Why Solana
s = new_slide(BLACK, "Why Solana, why now: for the first time a payment of five cents costs almost nothing to send "
              "and arrives in seconds. The memo on each payment is a public receipt, so ownership does not depend on our database.")
eyebrow(s, "Why Solana, why now", dark=True)
headline(s, "Micropayments finally work.", dark=True)
facts = [
    ("< €0.001", "network fee per payment", "5,000 lamports base fee. The €0.05 reaches the writer almost in full."),
    ("Seconds", "from click to unlocked", "Fast confirmation: reading continues right away."),
    ("On-chain", "receipt for every purchase", "A memo “payperread:<id>” proves ownership, even if our database is lost."),
]
fw = Inches(3.62)
for i, (big, label, body) in enumerate(facts):
    x = Inches(0.9) + i * (fw + Inches(0.28))
    card(s, x, Inches(2.95), fw, Inches(3.3), fill=DARK_CARD)
    text(s, x + Inches(0.4), Inches(3.3), fw - Inches(0.8), Inches(0.9), big, size=44, bold=True, color=LINK_DARK, build=False)
    text(s, x + Inches(0.4), Inches(4.25), fw - Inches(0.8), Inches(0.5), label, size=18, bold=True, color=WHITE, build=False)
    text(s, x + Inches(0.4), Inches(5.15), fw - Inches(0.8), Inches(1.0), body, size=13, color=MUTED_DARK, build=False)
logo_corner(s, True)

# 9. Business model
s = new_slide(GRAY, "Business model. Today 100% of every payment goes to the creator. For launch we propose a 10% platform fee, "
              "split inside the same transaction, so the creator is still paid instantly. "
              "On top: a white-label paywall for newsrooms that want pay-per-read on their own site.")
eyebrow(s, "Business model (proposed)")
headline(s, "We earn when creators earn.")
card(s, Inches(0.9), Inches(2.9), Inches(6.1), Inches(3.5))
text(s, Inches(1.3), Inches(3.2), Inches(5.3), Inches(0.5), "Every €0.05 story", size=18, bold=True, color=MUTED, build=False)
text(s, Inches(1.3), Inches(3.75), Inches(5.3), Inches(1.0),
     [[("€0.045", {"color": INK}), ("  to the creator", {"size": 22, "bold": False, "color": MUTED})]], size=48, bold=True, build=False)
text(s, Inches(1.3), Inches(4.75), Inches(5.3), Inches(1.0),
     [[("€0.005", {"color": BLUE}), ("  platform fee (10%)", {"size": 22, "bold": False, "color": MUTED})]], size=48, bold=True, build=False)
text(s, Inches(1.3), Inches(5.8), Inches(5.3), Inches(0.5), "Split on-chain in the same transaction: no payout delays.",
     size=14, color=MUTED, build=False)
card(s, Inches(7.3), Inches(2.9), Inches(5.13), Inches(3.5), fill=INK)
text(s, Inches(7.7), Inches(3.2), Inches(4.4), Inches(3),
     [[("Newsroom plan", {"bold": True, "size": 22, "color": WHITE})],
      [("White-label paywall widget for existing news sites", {"color": MUTED_DARK})],
      [("Analytics and live sales for editors", {"color": MUTED_DARK})],
      [("Monthly SaaS fee + reduced platform fee", {"color": MUTED_DARK})]],
     size=17, spacing=14, build=False)
logo_corner(s, False)

# 10. Target groups
s = new_slide(GRAY, "Who we serve. On the supply side: independent journalists, local newsrooms and podcasters who can't build "
              "a subscription business. On the demand side: the large majority of readers who never subscribe but would pay for one story.")
eyebrow(s, "Who it’s for")
headline(s, "Two sides, one missing link.")
cols = [
    ("Creators", ["Independent journalists and newsletter writers", "Local and regional newsrooms", "Podcasters with premium episodes"]),
    ("Readers", ["The 83% who don’t subscribe to news", "Occasional readers arriving from social and search", "Crypto-native users who already hold a wallet"]),
]
for i, (title, items) in enumerate(cols):
    x = Inches(0.9) + i * Inches(5.95)
    card(s, x, Inches(2.85), Inches(5.6), Inches(3.5))
    text(s, x + Inches(0.45), Inches(3.2), Inches(4.8), Inches(0.6), title, size=26, bold=True, color=BLUE, build=False)
    text(s, x + Inches(0.45), Inches(3.95), Inches(4.8), Inches(2.3), [f"•  {t}" for t in items], size=18, spacing=12, build=False)
logo_corner(s, False)

# 11. Competition
s = new_slide(GRAY, "Where we stand. Classic paywalls and creator platforms sell subscriptions. Earlier pay-per-article attempts ran on card payments "
              "and kept the money on the platform. PayPerRead is the only corner that is both pay-per-item and direct to the creator.")
eyebrow(s, "Competition")
headline(s, "The only one per story and direct to the creator.", w=Inches(11.5), size=40)
ox, oy, ow, oh = Inches(2.4), Inches(2.6), Inches(8.5), Inches(4.0)
axis = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, ox, oy, ow, oh)
axis.fill.solid(); axis.fill.fore_color.rgb = WHITE; axis.line.color.rgb = RGBColor(0xD2, 0xD2, 0xD7); axis.shadow.inherit = False
track(s, axis, True)
for vertical in (True, False):
    ln = s.shapes.add_connector(1, ox + ow // 2 if vertical else ox, oy if vertical else oy + oh // 2,
                                ox + ow // 2 if vertical else ox + ow, oy + oh if vertical else oy + oh // 2)
    ln.line.color.rgb = RGBColor(0xD2, 0xD2, 0xD7)
    track(s, ln, False)
text(s, ox, oy + oh + Inches(0.1), ow // 2, Inches(0.4), "Subscription", size=13, color=MUTED, build=False)
text(s, ox + ow // 2, oy + oh + Inches(0.1), ow // 2, Inches(0.4), "Pay per story", size=13, color=MUTED, align=PP_ALIGN.RIGHT, build=False)
text(s, Inches(0.9), oy, Inches(1.4), Inches(0.8), "Direct to creator", size=13, color=MUTED, build=False)
text(s, Inches(0.9), oy + oh - Inches(0.8), Inches(1.4), Inches(0.8), "Platform holds the money", size=13, color=MUTED, anchor=MSO_ANCHOR.BOTTOM, build=False)
dots = [
    (0.22, 0.78, "News paywalls", INK), (0.3, 0.35, "Newsletter platforms", INK),
    (0.72, 0.8, "Card-based pay-per-article", INK), (0.78, 0.2, "PayPerRead", BLUE),
]
for fx, fy, label, color in dots:
    cx, cy = ox + int(ow * fx), oy + int(oh * fy)
    d = s.shapes.add_shape(MSO_SHAPE.OVAL, cx - Inches(0.12), cy - Inches(0.12), Inches(0.24), Inches(0.24))
    d.fill.solid(); d.fill.fore_color.rgb = color; d.line.fill.background(); d.shadow.inherit = False
    track(s, d, True)
    text(s, cx + Inches(0.2), cy - Inches(0.2), Inches(3), Inches(0.4), label, size=17 if color == BLUE else 15,
         bold=color == BLUE, color=color, build=False)
logo_corner(s, False)

# 12. Status
s = new_slide(BLACK, "Where we are: a complete, working prototype on Solana Devnet, not a mock-up. Everything in the demo video is real code "
              "and real blockchain transactions.")
eyebrow(s, "Status", dark=True)
headline(s, "A working product, not a mock-up.", dark=True)
done = [
    ("Real on-chain payments", "verified by our server before unlocking"),
    ("12 stories, 3 podcasts", "with free teasers and paid full content"),
    ("Readers, authors, admins", "author applications with editorial review"),
    ("Creator analytics", "KPIs, insights, live sales"),
    ("Offline library", "installable web app (PWA)"),
    ("Restore from wallet", "ownership lives on the blockchain"),
]
for i, (title, body) in enumerate(done):
    col, row = i % 3, i // 3
    x, y = Inches(0.9) + col * Inches(3.9), Inches(2.95) + row * Inches(1.75)
    card(s, x, y, Inches(3.65), Inches(1.5), fill=DARK_CARD)
    text(s, x + Inches(0.3), y + Inches(0.3), Inches(3.2), Inches(0.5), [[("✓  ", {"color": LINK_DARK}), (title, {})]],
         size=16, bold=True, color=WHITE, build=False)
    text(s, x + Inches(0.3), y + Inches(0.85), Inches(3.2), Inches(0.5), body, size=13, color=MUTED_DARK, build=False)
logo_corner(s, True)

# 13. Roadmap
s = new_slide(GRAY, "Next steps: move to Mainnet with stablecoin prices, so five cents is always five cents. "
              "Then pilots with a few local newsrooms and an embeddable paywall, and later card and Apple Pay top-ups for readers without crypto.")
eyebrow(s, "Roadmap")
headline(s, "From prototype to paying readers.")
phases = [
    ("Now", "Devnet prototype", ["Payments, library, dashboard", "Author review"]),
    ("3 months", "Mainnet launch", ["USDC prices: €0.05 stays €0.05", "10% fee split on-chain"]),
    ("6 months", "Newsroom pilots", ["3 local newsrooms", "Embeddable paywall widget"]),
    ("12 months", "Mass market", ["Card and Apple Pay top-ups", "Bundles and gifting"]),
]
s.stagger = 450  # slower, so the timeline draws itself step by step
pw = Inches(2.72)
dot_x = [Inches(0.9) + i * (pw + Inches(0.2)) for i in range(len(phases))]
for i, (when, title, items) in enumerate(phases):
    x = Inches(0.9) + i * (pw + Inches(0.2))
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, x, Inches(3.1), Inches(0.3), Inches(0.3))
    dot.fill.solid(); dot.fill.fore_color.rgb = BLUE if i == 0 else INK; dot.line.fill.background(); dot.shadow.inherit = False
    track(s, dot, True)
    text(s, x, Inches(3.65), pw, Inches(0.4), when, size=15, bold=True, color=BLUE if i == 0 else MUTED, build=False)
    text(s, x, Inches(4.05), pw, Inches(0.5), title, size=22, bold=True, build=False)
    text(s, x, Inches(4.7), pw - Inches(0.2), Inches(1.5), [f"•  {t}" for t in items], size=15, color=MUTED, spacing=8, build=False)
    # the line from this dot to the next one (the last one runs to the edge): wipes in from the left
    x_end = dot_x[i + 1] if i + 1 < len(phases) else W - Inches(0.9)
    seg = s.shapes.add_connector(1, x + Inches(0.3), Inches(3.25), x_end, Inches(3.25))
    seg.line.color.rgb = RGBColor(0xD2, 0xD2, 0xD7); seg.line.width = Pt(2)
    track(s, seg, True)
    s.wipes.add(len(s.builds) - 1)
logo_corner(s, False)

# 14. Team: solo founder
s = new_slide(GRAY, "PayPerRead is a one-person project: I built everything end to end, from the idea and the business model "
              "to the design, the web app and the Solana payments you just saw in the demo.")
eyebrow(s, "Team")
headline(s, "One founder, end to end.")
card(s, Inches(0.9), Inches(2.85), Inches(4.6), Inches(3.5))
initials = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(1.35), Inches(3.25), Inches(1.3), Inches(1.3))
initials.fill.solid(); initials.fill.fore_color.rgb = BLUE; initials.line.fill.background(); initials.shadow.inherit = False
initials.text_frame.text = "MP"
r = initials.text_frame.paragraphs[0].runs[0]; r.font.size = Pt(30); r.font.bold = True; r.font.name = FONT; r.font.color.rgb = WHITE
initials.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
track(s, initials, False)
text(s, Inches(1.35), Inches(4.85), Inches(3.8), Inches(0.5), "Marcel Pfitzer", size=26, bold=True, build=False)
text(s, Inches(1.35), Inches(5.45), Inches(3.8), Inches(0.7), "Founder · product, design and engineering", size=16, color=MUTED, build=False)
card(s, Inches(5.8), Inches(2.85), Inches(6.63), Inches(3.5), fill=INK)
text(s, Inches(6.25), Inches(3.2), Inches(5.8), Inches(3),
     [[("Built solo", {"bold": True, "size": 22, "color": WHITE})],
      [("✓  ", {"color": LINK_DARK}), ("Product idea and business model", {})],
      [("✓  ", {"color": LINK_DARK}), ("UX and visual design", {})],
      [("✓  ", {"color": LINK_DARK}), ("Full-stack web app (Next.js, SQLite)", {})],
      [("✓  ", {"color": LINK_DARK}), ("Solana payments and on-chain verification", {})],
      [("✓  ", {"color": LINK_DARK}), ("Creator analytics, live sales, demo and pitch", {})]],
     size=17, color=MUTED_DARK, spacing=11, build=False)
logo_corner(s, False)

# 15. Closing / ask
s = new_slide(BLACK, "What we're looking for: newsrooms and creators for a pilot, mentoring on go-to-market, and a partner for the Mainnet launch. "
              "Thank you. Read what matters, pay for just that.")
picture(s, LOGO_WHITE, Inches(0.9), Inches(0.8), h=Inches(0.55))
text(s, Inches(0.9), Inches(1.9), Inches(8), Inches(1.6), "Read what matters.\nPay for just that.", size=56, bold=True, color=WHITE, line=0.95)
text(s, Inches(0.9), Inches(4.05), Inches(7.6), Inches(2.2),
     [[("We’re looking for", {"bold": True, "color": WHITE, "size": 22})],
      [("•  Newsrooms and creators for a pilot", {})],
      [("•  Mentoring on go-to-market", {})],
      [("•  A partner for the Mainnet launch", {})]],
     size=19, color=MUTED_DARK, spacing=10)
card(s, Inches(9.35), Inches(2.0), Inches(3.1), Inches(3.75), fill=WHITE)
picture(s, IMG / "qr.png", Inches(9.7), Inches(2.3), w=Inches(2.4), build=False)
text(s, Inches(9.45), Inches(4.85), Inches(2.9), Inches(0.8),
     [[("Try it / code", {"bold": True})], [("github.com/marcelpfitzer/\nSolanaCaseBMT2026", {"size": 11, "color": MUTED})]],
     size=15, align=PP_ALIGN.CENTER, build=False)

# ---------- animations ----------
for slide in prs.slides:
    add_transition(slide)
    if slide.builds:
        if slide._element.find(f"{P}timing") is not None:  # the video slide already has media timing
            continue
        add_builds(slide)

prs.save(OUT)
print("saved", OUT, f"{OUT.stat().st_size / 1e6:.1f} MB")
