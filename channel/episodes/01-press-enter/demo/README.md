# EP01 demo: a real waterfall

**Page:** https://en.wikipedia.org/wiki/Domain_Name_System (the Wikipedia article on DNS)
**Measured:** 11 Oct 2026, on the creator's laptop and home connection, in headless Chrome. Each "cold" load used a
fresh profile (an empty cache, a first visit); the "warm" load is the same page again in the same browser. Timings
come from Chrome's Network domain, the same data the DevTools waterfall draws. Raw data: `waterfall_wikipedia-dns.json`.

To film it for the video, use a **fresh Chrome profile or a guest window** ("Disable cache" alone doesn't clear Chrome's DNS
cache or close open connections, so the phases can vanish; otherwise clear `chrome://net-internals/#dns` and flush
`#sockets` first). DevTools → Network, tick **Disable cache**, load the page, and hover the first request's waterfall bar.
DevTools' **Initial connection** includes the SSL time, so expect about 160 ms there next to about 80 ms for SSL. The
images' connection phases are on the `upload.wikimedia.org` row that has them (not always the first one). The numbers
will differ a little; narrate the ones you get.

## The first request (the HTML), cold — 3 runs

| Phase | Run 1 | Run 2 | Run 3 | Typical |
|---|---|---|---|---|
| DNS lookup | 13.6 ms | 7.1 ms | 7.4 ms | **~10 ms** |
| TCP connect (connect − TLS) | 76.8 ms | 76.7 ms | 69.5 ms | **~75 ms ≈ 1 round trip** |
| TLS handshake | 82.6 ms | 80.4 ms | 77.0 ms | **~80 ms ≈ 1 round trip (TLS 1.3)** |
| Waiting for the server | 91.4 ms | 87.6 ms | 406.7 ms | **~90 ms** (run 3: slow) |
| Time to first byte | 266 ms | 254 ms | 562 ms | **~260 ms** |
| First paint (FCP) | 716 ms | 688 ms | 5,736 ms | **~0.7 s** |
| Page loaded | 786 ms | 773 ms | 5,901 ms | **~0.8 s** |

## What it shows
1. **DNS was the cheapest step: about 10 ms.** Something close by (the OS, the router or the ISP's resolver; the
   measurement can't tell which) already had the answer. A full walk from the root is the rare case.
2. **TCP and TLS each cost one round trip: about 75–80 ms each.** Together, about 160 ms before a single byte of
   the page could be asked for, more than half of the time to first byte.
3. **The page came over HTTP/2, every time:** Wikipedia doesn't offer HTTP/3 yet (Wikimedia task T238034).
4. **Everything else on en.wikipedia.org reused that first connection** (stylesheets, scripts, icons: DNS 0,
   connect 0). That's why the first request is the slowest.
5. **The images come from a second server, upload.wikimedia.org, which paid for everything again:** its own DNS
   (15–18 ms) and its own TCP + TLS (143–165 ms).
6. **Run 3 shows it's not always fast:** the same page took 5.9 s once. The wait rose to 407 ms, but most of the
   time went on the HTML itself arriving slowly (3.4 s), with the rest of the page behind it.
7. **Reloaded straight away, in the same browser:** no DNS and no new connection (the old one was still open),
   first byte in 79 ms, loaded in 0.3 s, against ~0.8 s cold. A return visit later, once connections have closed,
   would pay for the handshakes again.
8. **The ~90 ms "waiting" is mostly the network:** one round trip is ~75 ms, so Wikipedia's server itself took only
   ~15 ms.
