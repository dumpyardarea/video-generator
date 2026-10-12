# EP01 outline: What actually happens when you press Enter on a URL

- **Video id:** `ep01` (`?video=ep01`; plates in `app/src/ep01/`)
- **Length:** about 10 min with the draft voice (10:05; narration 9.8 min). With the creator's recording and the demo footage, about 11 min.
- **Audience:** beginner to intermediate developers and curious learners.
- **Status:** script approved for the draft on 11 Oct 2026 (the creator asked to finish the episode with a draft voice; their recording replaces it later with `analysis/swap_voice.py`).

## Hook (0:00–0:28)
A keypress: Enter. An on-screen millisecond clock starts. A page appears at 0.8 s ("I measured it"). Then the clock freezes, and the map behind the page lights up with the dozen systems that took part. No channel intro: it opens on the keypress.

## Chapters (draft-voice timings)
| # | Chapter | Time | Plates |
|---|---|---|---|
| — | Hook | 0:00–0:28 | `enter` |
| 1 | What did you type? | 0:28–1:13 | `parse` |
| 2 | Do we already have it? | 1:13–1:43 | `cache` |
| 3 | DNS: finding the address | 1:43–3:00 | `dns` |
| 4 | TCP: making a connection | 3:00–4:01 | `tcp` |
| 5 | TLS: a secret, in public | 4:01–5:49 | `tls-keys`, `tls-cert` |
| 6 | HTTP: asking for the page | 5:49–7:01 | `http` |
| 7 | Everything else on the page | 7:01–7:36 | `subresources` |
| 8 | The real waterfall | 7:36–9:06 | `waterfall` |
| 9 | And then, pixels | 9:06–9:18 | `pixels` |
| — | The whole trip | 9:18–10:05 | `trip` |

## Visual motif (recorded in `channel/style-registry.md`)
- **The journey map.** A dark map with faint topographic contour lines. The request is a glowing **phosphor-green packet** travelling between named stations: your laptop, the home router, the resolver, the root, ".com", Wikipedia's servers and the image server. Routes are drawn as the packet first travels them.
- **The millisecond clock** (top right). It starts at Enter and slows down during each handshake. Each stage adds its measured cost: +10 ms DNS, +75 TCP, +80 TLS, +90 waiting, 0.26 s first byte, 0.8 s loaded. This is the episode's signature device and spine.
- **Time slows on every handshake:** the packet leaves a long trail and the clock's digits stretch.
- **Transitions: follow the packet.** The camera rides the route to the next station, and that station becomes the next plate's subject.
- **Palette:** violet-black ink `#0D0B14`, lavender paper `#EFEAF7`, phosphor green `#7CFF6B` (the packet, what is being said); the one accent is warning pink `#FF5FA8`, saved for the certificate warning and the 6-second outlier.
- **Type:** Archivo at its normal width (no width animation: that's Motion as Code's), 500 and 800; Plex Mono for packets, headers and the clock. No Cormorant.

## Original value
- **A real, measured waterfall** of Wikipedia's DNS article, on the creator's machine: three cold loads and one immediate reload (`demo/`). Its numbers drive the clock, the DNS / TCP / TLS / HTTP chapters and the recap.
- **Corrected misconceptions:**
  - a lookup rarely visits the root;
  - the ~90 ms "wait" is mostly the network, not the server (~15 ms);
  - a certificate alone proves nothing, the server's signature does;
  - Chrome and Safari dropped the padlock;
  - a second server repeats every handshake.
- **[YOUR TAKE]:** chapter 8, option d (slow sites and round trips) and option h (seen the errors, now understands them). Chosen for the draft; the creator can swap them.

## Shorts (`shorts.md`)
1. **How DNS finds a website**: from chapter 3 (the tree, the cache, the measured 10 ms).
2. **The TLS handshake, visualised**: from chapter 5 (key halves, then the signature).
