"""Sound effects for EP01 Short 3, where 0.8 seconds actually goes (?video=short-ep01-waterfall). Sparse: the two
numbers of the hook, each slice of the bar landing, the strike-through, the second server, the loop."""


def cues(S):
    cue, W, line = S.cue, S.W, S.line
    L = "Wikipedia's server answered"
    cue(W(L, "15")["start"], "ui_tick", -24)                                   # ~15 ms
    cue(W(L, "800")["start"] - 0.02, "impact_slam", -18)                       # 800 ms slams in
    cue(line("I measured it")["start"] + 0.2, "pen_line", -26)                 # the empty bar drawn
    cue(W("Finding the server's address", "address")["start"], "pen_tick", -24)            # DNS
    L = "Opening a connection"
    cue(W(L, "connection")["start"], "impact_small", -22, rate=0.9)            # TCP
    cue(W(L, "private")["start"], "impact_small", -22, rate=0.8)               # TLS
    L = "Each is one trip"
    cue(W(L, "trip")["start"], "whoosh_soft", -26, rate=1.3, pan=0.3)          # the hairpins: there
    cue(W(L, "back")["start"], "whoosh_soft", -26, rate=1.2, pan=-0.3)         # ... and back
    cue(W("Then 90 milliseconds of waiting", "waiting")["start"], "impact_small", -22, rate=1.1)
    cue(W("But before the first byte", "but")["start"] + 0.1, "marker_strike", -21)       # "slow server?" struck out
    cue(W("But before the first byte", "round")["start"], "spark_ignite", -24)             # the round trips light
    L = "And the images came from a second server"
    for i, q in enumerate(["own", "lookup", "both", "handshakes"]):           # the second column fills
        cue(W(L, q)["start"], "ui_tick", -26, rate=1.0 + 0.06 * i, pan=0.4)
    cue(W("The rest of the 0.8 seconds", "rest")["start"], "whoosh_soft", -24, rate=0.8)   # the axis widens
    cue(W("The rest of the 0.8 seconds", "drawn")["start"], "confirm_chime", -25)          # first paint, loaded
    cue(line("Every one of those steps")["start"], "riser", -28)
    cue(S.duration - 0.15, "reverse_suck", -24)                                # back to the opening
