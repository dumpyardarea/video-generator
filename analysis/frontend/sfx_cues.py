"""Sound effects for the Frontend explainer (?video=frontend), keyed to the same words the plates animate on.

Sparse on purpose: a sound for a real event (a hand-off, a slam, a click, code typed, the house drawn and lit),
not for every word. Mixed by analysis/sfx.py.
"""


def cues(S):
    cue, bed, W, cut = S.cue, S.bed, S.W, S.cut
    ends = {  # plate ends = the next plate's cut
        "sides": cut("A frontend developer"), "role": cut("It starts with HTML"), "html": cut("Then CSS"),
        "css": cut("And JavaScript is the behavior"), "js": cut("Think of a house"), "house": cut("On top of that"),
        "frameworks": cut("They make sure"), "screens": cut("And they connect"), "api": cut("So: HTML for structure"),
    }

    def handoff(plate):
        """The inspector's box expanding into the next plate."""
        cue(ends[plate] - 0.05, "whoosh_soft", -21, rate=1.05)

    # SIDES ------------------------------------------------------------------
    L = "Every website"
    w = lambda q, n=0: W(L, q, n)
    cue(w("every")["start"] - 0.02, "ui_blip", -24, rate=0.9)                 # the crosshair wakes
    bed("scan_sweep", w("website")["start"], w("used")["end"], -32)            # the marquee being dragged
    cue(w("used")["end"], "impact_small", -20, rate=1.1)                      # the window lands
    cue(w("sides")["start"] + 0.1, "whoosh_soft", -20, pan=0.2)               # the backend slides out
    cue(w("part", 0)["start"], "ui_tick", -22, pan=-0.4)                      # "the part you see": inspected
    cue(w("dont")["start"], "paper_slide", -26, pan=0.4)                      # the backend frosts over
    handoff("sides")

    # ROLE --------------------------------------------------------------------
    L = "A frontend developer"
    w = lambda q, n=0: W(L, q, n)
    cue(w("frontend")["start"] - 0.005, "impact_slam", -16)
    cue(w("developer")["start"] - 0.005, "impact_small", -16, rate=0.85)
    cue(w("builds")["start"] + 0.35, "whoosh_fast", -19)                      # the whip down to the page
    t0, t1 = w("builds")["start"] + 0.45, w("see")["end"] + 0.2
    for i in range(6):                                                       # each element laid down
        cue(t0 + (t1 - t0) * i / 6, "ui_tick", -24, rate=0.95 + 0.04 * i, pan=-0.5 + 0.15 * i)
    cue(w("inside")["start"] - 0.1, "pen_line", -24)                         # the browser frame drawn
    S.type_words("key_click", [w("your"), w("browser")], -27, pan=-0.2)       # the address typed

    # HTML -------------------------------------------------------------------
    L = "It starts with HTML"
    w = lambda q, n=0: W(L, q, n)
    cue(w("html", 1)["start"] + 0.1, "reverse_suck", -24)                     # the styles fall away (lands at the strip)
    for q in ["structure", "headings", "text", "images", "buttons"]:          # each line of markup typed
        S.typing("key_click", w(q)["start"], w(q)["start"] + 0.45, -27, pan=0.35)
        cue(w(q)["start"] + 0.15, "ui_tick", -25, pan=-0.35)                  # its element inspected

    # CSS --------------------------------------------------------------------
    L = "Then CSS"
    w = lambda q, n=0: W(L, q, n)
    cue(w("css", 1)["start"] - 0.05, "paper_slide", -25, pan=0.4)             # style.css replaces index.html
    for q in ["colors", "fonts", "spacing", "layout"]:
        S.typing("key_click", w(q)["start"], w(q)["start"] + 0.5, -27, pan=0.35)
        cue(w(q)["start"] + 0.2, "ui_blip", -25, pan=-0.35, rate=1.0)         # the page changes

    # JS ---------------------------------------------------------------------
    L = "And JavaScript is the behavior"
    w = lambda q, n=0: W(L, q, n)
    cue(w("javascript", 0)["start"] - 0.05, "paper_slide", -25, pan=0.4)      # app.js replaces style.css
    cue(w("button")["start"] + 0.05, "mouse_click", -17, pan=-0.35)           # Sign up pressed
    cue(w("button")["start"] + 0.2, "ui_blip", -24, pan=-0.3, rate=1.15)      # the toast
    cue(w("open")["start"] + 0.4, "mouse_click", -18, pan=-0.1)               # Docs clicked
    cue(w("menu")["start"], "whoosh_soft", -26, rate=1.6)                     # the menu drops
    cue(w("load")["start"] + 0.1, "ui_tick", -24)                             # spinners
    cue(w("data")["end"] + 0.2, "confirm_chime", -22, pan=-0.2)               # the cards fill (200)
    cue(w("javascript", 1)["start"], "impact_small", -17)                     # "That's JavaScript."
    handoff("js")

    # HOUSE ------------------------------------------------------------------
    L = "Think of a house"
    w = lambda q, n=0: W(L, q, n)
    t0, t1 = w("house")["start"] - 0.3, w("html")["start"] - 0.1
    for i in range(6):                                                       # walls, roof, door, windows drawn
        cue(t0 + (t1 - t0) * i / 6, "pen_line", -22, rate=S.jitter(i), pan=-0.4 + 0.12 * i)
    for i in range(5):                                                       # the frame goes in
        cue(w("frame")["start"] + i * 0.11, "pen_tick", -24, rate=1.0 + 0.05 * i)
    cue(w("paint")["start"], "whoosh_soft", -22, rate=0.8)                    # the paint wipes across
    bed("spark_sizzle", w("javascript")["start"] + 0.1, w("electricity")["start"] + 0.35, -27)   # the wire laid
    cue(w("electricity")["start"] + 0.3, "spark_ignite", -18)                 # the windows light
    handoff("house")

    # FRAMEWORKS -------------------------------------------------------------
    L = "On top of that"
    w = lambda q, n=0: W(L, q, n)
    for i in range(3):                                                       # HTML / CSS / JS blocks
        cue(w("top")["start"] + i * 0.12, "impact_small", -24, rate=1.2 + 0.05 * i, pan=-0.3 + 0.2 * i)
    cue(w("frameworks")["start"], "impact_small", -19, rate=0.9)              # the slab
    for i, q in enumerate(["react", "vue", "svelte"]):                        # the chips drop
        cue(w(q)["start"] + 0.15, "impact_small", -20, rate=1.1 + 0.08 * i, pan=-0.3 + 0.3 * i)
    cue(w("build")["start"] + 0.3, "whoosh_fast", -20)                        # the whip to the page
    cue(w("reusable")["start"], "ui_blip", -24)                               # <Card /> written
    for i in range(5):                                                       # its copies snap in
        cue(w("components")["start"] - 0.05 + i * 0.07 + 0.2, "ui_tick", -24, rate=1.0 + 0.05 * i, pan=-0.4 + 0.2 * i)
    handoff("frameworks")

    # SCREENS ----------------------------------------------------------------
    L = "They make sure"
    w = lambda q, n=0: W(L, q, n)
    for q in ["phone", "tablet", "desktop"]:                                  # the device changes shape
        cue(w(q)["start"] + 0.2, "whoosh_soft", -24, rate=1.3)
    a, b = w("user")["start"], w("screen", 1)["start"]
    for i in range(4):                                                        # Tab, Tab, Tab, Tab
        cue(a + (b - a) * i / 3.6, "key_click", -20, pan=0.4, rate=0.9)
    cue(w("readers")["start"] - 0.05, "ui_blip", -23, pan=0.4, rate=0.85)     # the screen reader speaks
    handoff("screens")

    # API --------------------------------------------------------------------
    L = "And they connect"
    w = lambda q, n=0: W(L, q, n)
    cue(w("connect")["start"], "pen_line", -22)                               # the wire laid
    cue(w("fetching")["start"] + 0.5, "whoosh_soft", -22, pan=0.3)            # the request goes out
    cue(w("apis")["start"], "ui_blip", -22)                                   # the API node lights
    cue(w("apis")["start"] + 0.6, "whoosh_soft", -22, pan=-0.3, rate=0.9)     # the JSON comes back
    cue(w("showing")["start"] + 0.15, "confirm_chime", -22, pan=-0.4)         # the cards fill
    handoff("api")

    # OUTRO ------------------------------------------------------------------
    L = "So: HTML for structure"
    w = lambda q, n=0: W(L, q, n)
    for i, q in enumerate(["html", "css", "javascript"]):                     # each layer lifts in
        cue(w(q)["start"] - 0.05, "paper_slide", -22, rate=1.0 + 0.06 * i)
    cue(w("thats")["start"] + 0.1, "impact_small", -20, rate=0.9)             # the layers press together
    cue(w("frontend")["start"] - 0.005, "impact_slam", -16)                   # the title
    cue(S.duration - 0.15, "reverse_suck", -24)                               # back to the first frame
