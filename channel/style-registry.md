# Style registry

Every series gets its own palette, type treatment and motion motif, so no two videos on the channel look alike. Check here before choosing a new look, and add the new entry. The palettes live in `app/src/engine/palette.ts` (picked by `?video=`); each is ink, raised ink, graphite, ash, bone (text), one **signal** colour and one rare **accent**.

| Series | Ink / bone | Signal | Accent | Type | Motif and motion |
|---|---|---|---|---|---|
| **Motion as Code** (`?video=` none) | warm black `#0A0A0B` / bone `#EEE9DF` | hazard orange `#FF4D12` | acid `#D8FF3C` | Archivo with **animated width**, Cormorant Garamond, IBM Plex Mono, single-stroke plotter fonts | graph-paper construction sheets, the plotter pen drawing, bone-paper forms, spark motif; bloom, halation, grain (the pdoom-video engine) |
| **Frontend developer** (`frontend`) | navy `#0A0E17` / `#E8ECF3` | cyan `#27C4FF` | yellow `#FFD84A` | Plex Mono for code; the mock page goes from Times to Archivo | one mock web page in a browser, raw HTML to designed page; cursor, code editor typed in, inspector boxes; karaoke subtitles at the bottom |
| **EP01, Press Enter** (`ep01`, Shorts `short-ep01-*`) | violet-black `#0D0B14` / lavender `#EFEAF7` | phosphor green `#7CFF6B` | warning pink `#FF5FA8` (the certificate warning, the 6-second outlier) | Archivo at normal width, 500/800; Plex Mono for packets, headers, the clock; no Cormorant | the journey map: dark topographic contours, named stations, a glowing packet; the millisecond clock top right; time slows on handshakes; transitions follow the packet |
| **EP02, Code to pixels** (`ep02`) · *proposed 12 Oct 2026* | green-black `#0C110F` / chalk `#E9EEE8` | periwinkle `#8C7CFF` | dropped-frame scarlet `#FF3355` (jank and slow moments only) | Archivo **condensed** (w620), fixed width, 500/800; Plex Mono for code, tokens and the meter | the light table: one backlit page, each pipeline stage a transparent sheet laid on it; layers lift apart in 3D and drop back; the 16.7 ms frame meter top of frame; transitions are sheets sliding away, the camera stays over the page |

## Rules
- A new series picks a signal colour no other series uses as signal or accent, and a ground that isn't a near-copy of another's.
- Shorts use their series' look, laid out for 9:16 (never cropped from 16:9).
- Signature devices (EP01's clock, EP02's frame meter) belong to their series; don't borrow them.
