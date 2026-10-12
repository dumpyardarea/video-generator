"""Sound effects for EP01, pressing Enter on a URL (?video=ep01), keyed to the same words the plates animate on.

Sparse on purpose: the packet's moves across the map, the handshakes (each message one soft hit, slowed time a low
bed), the clock's stage costs landing, and the few hard moments (Enter, the cache miss, the one warning). Mixed by
analysis/sfx.py.
"""


def cues(S):
    cue, bed, W, line = S.cue, S.bed, S.W, S.line
    LY = S.LY

    def cut(q):
        """A plate's cut, exactly as app/src/ep01/timeline.ts places it (up to 0.3 s before the line)."""
        l = line(q)
        i = LY.index(l)
        gap = l["start"] - LY[i - 1]["end"] if i else 1
        return 0.0 if i == 0 else l["start"] - min(0.3, max(0.05, gap * 0.45))

    def handoff(q, db=-21, rate=1.0):
        """The camera's move into the plate that starts at the line containing q."""
        cue(cut(q) - 0.02, "whoosh_soft", db, rate=rate)

    def stage(lq, wq="milliseconds", nth=0):
        """The clock lands a stage's measured cost (a slowed tick, then the pill)."""
        w = W(lq, wq, nth)
        cue(w["start"], "ui_tick", -23, rate=0.8)
        cue(w["end"] + 0.1, "stamp", -24, rate=1.15)

    # ENTER (the hook) ----------------------------------------------------------
    L = "You type a web address"
    w = lambda q, n=0: W(L, q, n)
    S.typing("key_click", w("type")["start"], w("address")["end"] + 0.3, -27, pan=-0.15)   # the address types itself
    cue(w("enter")["start"], "enter_key", -15)                                               # the keycap slams, the clock starts
    cue(W("A page appears", "appears")["start"] + 0.05, "confirm_chime", -24)               # the page arrives at 0.786 s
    a = W("In under a second", "dozen")["start"]
    cue(W("In under a second", "systems")["end"] + 0.3, "whoosh_soft", -21, rate=0.8)       # the pull-back to the whole map
    for i in range(10):                                                                     # the stations light one by one
        cue(a + i * 0.09 + 0.1, "ui_blip", -30 + (i % 3), rate=0.9 + 0.03 * i, pan=-0.5 + 0.1 * i)
    cue(W("Your computer found a server", "server")["start"], "spark_zip", -24, pan=0.3)     # the packet finds the server
    L = "It agreed on a secret"
    cue(W(L, "open")["start"], "impact_small", -22, rate=1.2)                               # the key halves meet
    L = "So freeze the clock"
    cue(W(L, "freeze")["start"], "tape_rewind", -24, length=0.5)                            # the clock snaps back to zero
    cue(W(L, "freeze")["start"] + 0.35, "impact_small", -21, rate=0.8)                      # ... and stops

    # PARSE (1. What did you type?) ---------------------------------------------
    handoff("First, the browser decides")
    L = "has no dot"
    S.type_words("key_click", [W(L, "cats")], -27, pan=-0.3)
    cue(W(L, "search")["start"] + 0.1, "ui_blip", -25, pan=-0.3)                            # off to the search engine
    L = "looks like a domain name"
    S.type_words("key_click", [W(L, "examplecom")], -27, pan=0.3)
    cue(W(L, "address")["start"] + 0.1, "ui_blip", -25, pan=0.3, rate=1.15)                 # an address
    L = "Then it splits the address"
    cue(W(L, "splits")["start"], "snip", -21)                                               # the URL comes apart
    for q, pan in [("The scheme says", -0.4), ("The host says", 0.0), ("The path says", 0.4)]:   # each part labelled
        cue(W(q, q.split()[1])["start"], "pen_tick", -24, pan=pan)
    cue(W("You probably didn't type", "secure")["start"], "ui_blip", -24, pan=-0.4, rate=1.2)   # https comes back green
    L = "some sites are on a list"
    t = W(L, "list")["start"]
    S.typing("typewriter", t, min(t + 1.4, W(L, "insecurely")["end"]), -30, step=0.11)    # the HSTS list types in
    cue(W("The packet is ready", "ready")["start"], "reverse_suck", -23)                   # the URL folds into the packet

    # CACHE (2. Do we already have it?) -----------------------------------------
    handoff("First, a service worker", db=-24)
    cue(W("First, a service worker", "service")["start"] - 0.3, "paper_slide", -26, pan=-0.4)   # card 1
    cue(W("Then the browser's cache", "cache")["start"] - 0.4, "paper_slide", -26, pan=0.4)      # card 2
    L = "If the answer is yes"
    cue(W(L, "yes")["start"], "confirm_chime", -23, pan=0.4)                                # a (hypothetical) hit
    e = W(L, "everything")["start"]
    for i in range(4):                                                                      # DNS, TCP, TLS, HTTP struck out
        cue(e + i * 0.1 + 0.15, "marker_strike", -25, rate=1.0 + 0.05 * i, pan=-0.3 + 0.2 * i)
    L = "For now, a first visit"
    cue(W(L, "nothing")["start"], "zap_slash", -22)                                         # both checks miss
    cue(W(L, "out")["start"] + 0.2, "whoosh_fast", -20)                                    # the packet leaves for the router

    # DNS (3. Finding the address) ----------------------------------------------
    L = "Computers don't find each other"
    cue(W(L, "numbers")["start"], "ui_blip", -24, rate=0.85)                                # the name becomes a number
    L = "checks its own memory"
    cue(W(L, "memory")["end"] + 0.2, "ui_tick", -24, pan=-0.3)                              # miss
    cue(W(L, "systems")["end"] + 0.2, "ui_tick", -24, pan=-0.1, rate=0.9)                   # miss
    cue(W("If neither knows", "goes")["start"] + 0.2, "whoosh_soft", -22, pan=0.2)          # on to the resolver
    cue(W("In the worst case", "worst")["start"], "whoosh_soft", -23, rate=0.75)            # the camera pulls wide
    for lq, wq in [("It asks a root server", "asks"), ("It asks those, which point", "asks"), ("the authoritative ones", "authoritative")]:
        cue(W(lq, wq)["start"] + 0.1, "spark_zip", -25, pan=0.3)                            # three trips down the tree
    cue(W("the authoritative ones", "address")["start"], "confirm_chime", -23)              # the real answer
    cue(W("But the resolver keeps", "keeps")["start"], "paper_slide", -25, pan=0.4)         # the cache card
    t = W("it serves thousands", "thousands")["start"]
    for i in range(8):                                                                      # the crowd's queries flash in
        cue(t + i * 0.09, "ui_tick", -32 + (i % 3), rate=1.2 + 0.03 * i, pan=-0.6 + 0.08 * i)
    cue(W("rarely visits the root", "root")["start"] + 0.1, "stamp", -22)                   # ROOT SERVERS CONTACTED: 0
    stage("In my measurement, the whole DNS step")                                          # DNS +10 ms

    # TCP (4. Making a connection) ----------------------------------------------
    handoff("To send data reliably", rate=0.9)
    L = "TCP makes sure every piece"
    cue(W(L, "lost")["start"], "snip", -24, pan=0.2)                                        # piece 4 lost, then resent
    cue(W(L, "order")["start"] + 0.2, "confirm_chime", -26, pan=0.4)                        # all here, in order
    cue(W("three-step greeting", "greeting")["start"] - 0.2, "whoosh_soft", -23, rate=0.7)  # the camera sinks to the ladder
    bed("projector_run", W("Your computer sends a SYN", "syn")["start"] - 0.3,
        W("Your computer answers with an ACK", "ack")["start"] + 1.5, -34)                  # slowed time
    for lq, wq, pan in [("Your computer sends a SYN", "syn", -0.4), ("The server replies with a SYN-ACK", "synack", 0.4),
                        ("Your computer answers with an ACK", "ack", -0.4)]:
        cue(W(lq, wq)["start"] - 0.1, "impact_small", -20, rate=0.75, pan=pan)              # each message leaves its side
    cue(W("That's the three-way handshake", "handshake")["start"], "pen_line", -24)        # the handshake bracketed
    stage("one round trip to Wikipedia")                                                    # TCP +75 ms
    cue(W("Some sites also offer HTTP/3", "http3")["start"] - 0.1, "paper_slide", -26)     # the QUIC card
    cue(W("Wikipedia doesn't offer HTTP/3", "http2")["start"], "ui_blip", -24, rate=0.85)  # the verdict

    # TLS: keys (5. A secret, in public) ----------------------------------------
    L = "The connection is open, but anything"
    for q, pan in [("wifi", -0.5), ("provider", 0.0), ("router", 0.5)]:                     # an eye opens at every hop
        cue(W(L, q)["start"], "ui_blip", -26, rate=0.8, pan=pan)
    cue(W("That's TLS", "s")["start"], "impact_small", -21, rate=1.1)                       # the S in HTTPS
    bed("projector_run", W("Your browser says hello", "hello")["start"] - 0.3,
        W("From the two halves", "same")["end"], -34)                                       # slowed time
    cue(W("Your browser says hello", "hello")["start"] - 0.1, "impact_small", -20, rate=0.75, pan=-0.4)
    cue(W("The server picks a method", "picks")["start"] - 0.1, "impact_small", -20, rate=0.75, pan=0.4)
    cue(W("From the two halves", "same")["start"], "spark_ignite", -21)                     # both sides complete the key
    cue(W("The key itself never crosses", "never")["start"], "ui_tick", -25, rate=0.7)      # the watcher: halves, no secret
    stage("That handshake took about 80")                                                   # TLS +80 ms

    # TLS: certificate ----------------------------------------------------------
    handoff("But how does your browser know", rate=0.85)
    cue(W("The server sends its certificate", "certificate")["start"] - 0.1, "paper_slide", -23)
    cue(W("The certificate says: this public key", "signed")["start"], "stamp", -21)       # signed by an authority
    cue(W("But a certificate is public", "copy")["start"], "paper_slide", -24, pan=-0.4)   # a copy slides to the impostor
    cue(W("So the server also signs", "signs")["start"], "pen_line", -23, pan=0.4)          # the signature
    for lq, wq in [("The browser checks that signature", "signature"), ("It checks the certificate's chain", "chain"),
                   ("And it checks the name matches", "name"), ("And it checks the name matches", "expired")]:
        cue(W(lq, wq)["end"] + 0.1, "pen_tick", -23)                                        # each check ticked
    cue(W("If anything is wrong", "wrong")["start"] - 0.05, "impact_slam", -19)             # the one warning
    cue(W("If everything checks out", "private")["start"], "spark_sizzle", -26, length=0.6, mode="raw")   # the line goes private
    cue(W("Chrome stopped showing it", "chrome")["start"] + 0.2, "snip", -25)              # the padlock retired
    handoff("Now the browser can finally ask", rate=0.9)

    # HTTP (6. Asking for the page) ---------------------------------------------
    cue(W("Now the browser can finally ask", "request")["start"], "whoosh_soft", -23, pan=0.3)   # the request crosses
    cue(W("The response starts with a status code", "status")["start"] - 0.3, "whoosh_soft", -23, pan=-0.3, rate=0.9)
    cue(W("200 means", "200")["start"], "confirm_chime", -24)
    cue(W("The browser then starts again", "again")["start"], "tape_rewind", -27, length=0.4)   # 301: start again
    cue(W("404 means", "404")["start"], "zap_slash", -25, rate=0.9)
    stage("Then about 90 milliseconds of waiting", "waiting")                               # waiting +90 ms
    cue(W("The first byte arrived", "byte")["start"], "ui_blip", -23)

    # SUBRESOURCES (7. Everything else on the page) -----------------------------
    handoff("The HTML is only the start", rate=0.85)
    L = "It points to other files"
    for i, q in enumerate(["stylesheets", "scripts", "images", "fonts"]):                  # each tag read, a file sent
        cue(W(L, q)["start"], "ui_tick", -26, rate=0.95 + 0.06 * i, pan=-0.3 + 0.2 * i)
    L = "But files from another server"
    for i, q in enumerate(["dns", "tcp", "tls"]):                                           # everything again
        cue(W(L, q)["start"], "impact_small", -24, rate=1.1 + 0.08 * i, pan=0.4)
    L = "most pages load from several servers"
    for i, q in enumerate(["images", "fonts", "analytics", "video"]):                       # more servers appear
        cue(W(L, q)["start"], "ui_blip", -27, rate=0.9 + 0.06 * i, pan=-0.4 + 0.25 * i)

    # WATERFALL (8. The real waterfall) -----------------------------------------
    handoff("The first request: DNS")
    L = "The first request: DNS"
    for q in ["dns", "connection", "tls", "waiting"]:                                      # the first bar grows, phase by phase
        cue(W(L, q)["start"], "pen_tick", -25)
    l99 = line("Every other file from")
    for i in range(6):                                                                      # the other rows wipe in
        cue(l99["start"] + 0.2 + i * 0.15, "ui_tick", -29, rate=1.0 + 0.04 * i)
    cue(line("The images come from a second server")["start"], "ui_blip", -25, pan=0.3)     # the image server's row lights
    cue(W("The page appeared at about 0.7", "loading")["start"], "confirm_chime", -25)     # loaded
    cue(W("But one of my three runs", "slow")["start"], "riser", -28)                       # the slow run, 5.9 s
    cue(W("But one of my three runs", "instant")["start"], "impact_small", -22, rate=0.8)
    cue(W("Reloaded straight away", "79")["start"], "spark_zip", -25)                       # 79 ms
    cue(W("Almost all the waiting was round trips", "round")["start"], "impact_small", -22, rate=0.9)   # the take

    # PIXELS (9. And then, pixels) ----------------------------------------------
    handoff("At this point the browser has the HTML")
    L = "At this point the browser has the HTML"
    for i, q in enumerate(["html", "styles", "scripts"]):                                  # the files dock in
        cue(W(L, q)["start"] + 0.2, "paper_slide", -26, rate=1.0 + 0.06 * i)
    cue(W(L, "draw")["start"], "scan_sweep", -30, length=1.2, mode="raw")                   # the pixels, row by row
    cue(W("How it turns code into pixels", "next")["start"], "riser", -28)                 # the next video

    # TRIP (the whole trip) -----------------------------------------------------
    handoff("Pressing Enter set off", rate=0.8)
    for q, pan in [("DNS turned a name into an address", -0.3), ("TCP opened a connection", 0.3),
                   ("TLS made it private", 0.3), ("HTTP asked for the page", 0.3), ("Then every other file came in", 0.5)]:
        cue(line(q)["start"], "ui_blip", -26, pan=pan)                                      # each pill
    cue(W("Most of the waiting was round trips", "servers")["start"], "impact_small", -21, rate=0.85)
    cue(line("all of that took about 0.8")["start"], "impact_slam", -19)                   # about 0.8 seconds
    cue(W("The next time a page loads", "went")["start"] + 0.2, "tape_rewind", -25, length=0.6)   # the clock back to zero
    cue(S.duration - 0.15, "reverse_suck", -24)                                             # back to the first frame
