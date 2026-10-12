# EP02 outline: How a browser turns code into pixels

- **Video id:** `ep02` (`?video=ep02`; plates in `app/src/ep02/`)
- **Working title:** "Your browser had the page. Why was it still blank?"
- **Length:** about 10 min (narration ~9.5 min at 150 wpm, plus slow-motion pauses on the frame).
- **Audience:** beginner to intermediate developers and curious learners; EP01 viewers first.
- **Status:** outline drafted 12 Oct 2026. Waiting on the creator: direction, the demo trace, and `channel/style-registry.md` (not in the repo yet).

## Hook (0:00–0:30)
EP01's millisecond clock comes back, frozen at **0.266 s: first byte**. The HTML has arrived, but the screen is still blank. The clock runs on and nothing appears until **0.716 s**. "Everything had arrived. So what did the browser spend 450 milliseconds on?" Opens on the blank page, with no channel intro. (Numbers from EP01's demo, run 1; the new trace below replaces them if they differ.)

## Chapters (targets)
| # | Chapter | Target | What it covers |
|---|---|---|---|
| — | Hook | 0:30 | the blank page between first byte and first paint |
| 1 | From bytes to a tree | 1:15 | bytes → characters → tokens → the DOM; browsers repair broken HTML; the parser streams |
| 2 | CSS blocks the paint | 0:50 | the CSSOM; why the page waits for stylesheets (no flash of unstyled content) |
| 3 | JavaScript stops the parser | 1:00 | a plain `<script>` halts parsing; `async` vs `defer`; the preload scanner reads ahead (ties to EP01 ch. 7) |
| 4 | Style | 0:45 | matching every rule to every element: computed styles; `display: none` leaves the render tree |
| 5 | Layout | 1:00 | geometry: every box gets a position and size; one change can move everything after it |
| 6 | Paint | 0:45 | not pixels yet: a list of drawing instructions, in order |
| 7 | Layers and the compositor | 1:15 | layers rastered to tiles on the GPU and stacked; why `transform` and `opacity` animate smoothly and `top`/`left` don't |
| 8 | 16.7 milliseconds | 1:00 | at 60 Hz each frame has a budget; JS + style + layout + paint over budget = a dropped frame (jank); layout thrashing |
| 9 | The real trace | 1:15 | Wikipedia's page in DevTools' Performance panel: where its 450 ms actually went; `[YOUR TAKE]` |
| — | The whole pipeline | 0:35 | recap, one frame start to finish |
| | **Total** | **≈ 10:05** | |

## Visual motif (to record in `channel/style-registry.md`)
Chosen to differ from Motion as Code (graph paper, plotter pen, signal orange, Archivo width animation), the Frontend video (mock page and inspector) and EP01 (contour map, green packet, pink warning). **Check against the registry before plates.**
- **The light table.** The screen is a backlit glass plate; each stage of the pipeline is a transparent sheet laid on it: the DOM as a tree etched in thin lines, boxes as cut rectangles, paint as an instruction tape, layers as sheets that **lift apart in 3D** (three.js) and drop back to composite. Nothing travels across a map: the camera stays over one page and the sheets stack up.
- **The frame meter** (signature device, top of frame): a 16.7 ms bar that fills each frame, segment by segment (script / style / layout / paint / composite). Over budget, the frame shows a hard yellow stripe, the episode's one accent.
- **Transitions: sheets.** Each plate's sheet slides off or lifts away to reveal the next one beneath; no whooshing camera rides (those are EP01's).
- **Palette (proposed):** cool slate ink `#0E1417`, chalk `#E8EEF0`, electric blue `#4DA3FF` (what's being said, the active stage); accent: dropped-frame yellow `#F4D35E`, saved for jank and the slow moments.
- **Type (proposed):** Archivo condensed (`w620`, 500 and 800), fixed width; Plex Mono for code, tokens and the meter. No Cormorant.

## Original value
- **Continuity with a measurement:** it picks up EP01's measured page exactly where EP01 stopped (first byte) and accounts for the time to first paint, on the creator's own machine.
- **Corrected misconceptions:**
  - the DOM isn't the HTML (the parser repairs it, scripts change it);
  - CSS blocks rendering, not just looks;
  - "paint" doesn't make pixels: raster does, often on the GPU;
  - `will-change` on everything costs memory;
  - a smooth animation is about which stage it triggers, not how simple it looks.
- **[YOUR TAKE: suggestion: a site or app you've used that felt janky, and which stage you now think was to blame]** in chapter 9. Not written for you.

## Demo needed (creator)
The same page as EP01 (https://en.wikipedia.org/wiki/Domain_Name_System), cold, in a fresh Chrome profile: DevTools → **Performance** → record a reload. Export the trace (JSON) into `demo/`. From it: when parsing started and stopped, style/layout/paint durations, which scripts and stylesheets blocked, and first paint. I can write a script that records this trace headlessly, like EP01's waterfall, for you to run on your laptop so the numbers are your own.

## Shorts ideas
1. **Why `transform` animations are smooth and `top` isn't**: from chapter 7 (the layers lift, one moves for free).
2. **`async` vs `defer` in under a minute**: from chapter 3 (the parser stopping, then not).
