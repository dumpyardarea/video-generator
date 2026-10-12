# Motion as Code — voiceover video

A 92.6-second, 1920×1080 / 60 fps explainer: *"What if I told you… you can create motion graphics like this without even opening After Effects?"*. Every frame is a deterministic function of time, rendered from code. The live preview in the browser and the exported MP4 are identical.

The visual language is the engine and style of **[pdoom-video](https://github.com/mexicat/pdoom-video)** by mexicat (Giacomo Magnanini, MIT licence, see `LICENSE.pdoom-engine`). That covers:
- the palette: ink, bone, signal orange;
- Archivo, IBM Plex Mono and Cormorant Garamond, plus the single-stroke plotter fonts;
- the spark motif, the graph-paper construction sheets and the bone-paper forms;
- the post-processing (bloom, halation, grain).

The nine plates themselves are new and written for this voiceover.

## Layout

- `audio/voiceover.mp3`: the voiceover (ElevenLabs).
- `data/lyrics.json`: word-level timings of the script, made by `analysis/align_vo.py`. It runs CTC forced alignment with wav2vec2-base-960h (quantized ONNX), then refines word edges against the audio's silences.
- `data/audio.json`: voice loudness envelopes and word onsets, plus a nominal beat grid, made by `analysis/audio_vo.py`.
- `app/`: the renderer (TypeScript + three.js, bun + Vite).
  - `src/engine/`: the pdoom-video engine (unchanged except the audio path).
  - `src/scenes/_vo.ts`: shared toolkit (2D camera, the plotter/pen, world-space karaoke, graph paper).
  - `src/scenes/*.ts`: the plates, listed below.
  - `src/timeline.ts`: when each plate plays (cuts sit in the pause before each line).
  - `scripts/render.ts`: offline renderer (headless Chrome → raw frames → ffmpeg).
- `out/`: renders.

| Plate | Time | Script |
|---|---|---|
| `hook` | 0.0–9.9 | What if I told you… / And no — not an After Effects MCP |
| `model` | 9.9–19.2 | This is Claude Opus 5.5 / Instead of controlling After Effects… |
| `prompt` | 19.2–29.7 | For example: "Create a 15-second cinematic…" |
| `crazy` | 29.7–35.4 | And this is where it gets crazy / not an MP4 directly |
| `code` | 35.4–48.0 | It writes the animation itself as code… defined mathematically over time |
| `frames` | 48.0–52.1 | rendered frame by frame and turned into a video |
| `pipeline` | 52.1–62.6 | After Effects → layers → … vs Prompt → code → render → video |
| `edits` | 62.6–80.6 | procedural / the four commands / hundreds of keyframes |
| `verdict` | 80.6–92.6 | Does this replace After Effects? Not really… pretty insane (loops to frame 0) |

## Requirements

You need [bun](https://bun.sh), Google Chrome and ffmpeg with libx264. To re-align a new voiceover you also need Python with uv; run it as `python -m uv`.

## Preview

```sh
cd app
bunx vite
```

Open http://localhost:5173/player.html (the home page, http://localhost:5173, is the render library: every video in `out/` as a folder tree, with links to the live players). Controls:

| Key | Action |
|---|---|
| space | play / pause |
| ← / → | seek ±1 s (±5 s with shift) |
| `,` / `.` | step one frame |
| `[` / `]` | previous / next plate |
| `l` | loop the current plate |
| `h` | hide the UI |

Add `?t=35` to the URL to start at 35 s.

## Render

The easiest way: preview a video live (`/player.html`), fix what you want in the code, then press **Render** next to it in the library's "Live players" (or "Render…" in the player's bar). Pick 1K (1080p), 2K (1440p) or 4K (2160p); the dialog shows how long it will take and how big the file will be. It runs on your machine (no cost), one render at a time, on a private dev server with live reload off, so you can keep editing while it renders. Its progress shows in the sidebar, and you can **Watch** it while it renders: the file in `out/renders/` is a fragmented MP4 that plays as it grows, and is turned into an ordinary MP4 when it's done. (2K renders at 4K internally and scales down, so it takes as long as 4K.) Under the hood that's `app/scripts/render-node.mjs --res <1080|1440|2160> --private-server`; `app/scripts/render-jobs.ts` runs the jobs for the dev server.

**Chapters and resuming.** Each plate in a timeline names its `chapter` (`app/src/timeline.ts`, `app/src/frontend/timeline.ts`), and consecutive plates with the same name make one chapter. `render-node.mjs` renders chapter by chapter into `<name>.parts/`. If a render stops (a crash, a reboot, a killed process), run the same command again, or press **Resume** in the library, and it starts at the first unfinished chapter. (Cancel is different: it deletes the render.) When all chapters are done they're joined frame-exactly and the voice is laid over the whole. Next to `<name>.mp4` it writes `<name>.chapters.txt`, the chapter list to paste into the YouTube description, and `<name>.chapters.json` with any YouTube rule the list breaks (at least 3 chapters, each at least 10 s, the first at 0:00).

From the command line:

```sh
cd app
bun scripts/render.ts video --samples auto --min-samples 4 --max-samples 12 --shutter 0.5 --crf 17 --out ../out/motion-as-code.mp4
```

- `--samples auto` adds motion blur adaptively, using more sub-frames where motion is fast.
- `--samples 4` is about 4× faster but shows stepped copies on fast moves.
- `--scale 2` renders 4K (3840×2160).

Stills and contact sheets are useful while editing:

```sh
bun scripts/render.ts stills --t 12.5,40.2 --only code --out ../out/wip
```

## Sound effects

Any video can have a cue sheet, `analysis/<video>/sfx_cues.py`, which places sounds from `audio/sfx/` by the same words the plates animate on. `python analysis/sfx.py --video <id>` mixes them under the voice (ducked up to 7 dB, −14 LUFS overall), and every render made with `render-node.mjs` does this automatically at the end (`--no-sfx` to skip). To add the sound to a render you already have, without re-rendering: `python analysis/sfx.py --video frontend --mux out/renders/<name>.mp4` writes `<name>.sfx.mp4`. The Frontend video has a sheet (`analysis/frontend/sfx_cues.py`, deliberately sparse); Motion as Code's older one is below.

### Motion as Code's cue sheet

There are 28 effects, generated with ElevenLabs Sound Effects v2 and stored in `audio/sfx/` as `name_1.mp3`, `name_2.mp3`… (alternate takes). The ElevenLabs flow is "Motion as Code — SFX library".

`analysis/sfx_mix.py` holds the cue sheet, about 500 cues derived from the same word timings the plates animate on. Each sound is placed on its transient, on its peak (whooshes) or on its end (risers and reverse sucks). The effects are ducked by up to 7 dB under the voice and the mix is loudness-normalised to −14 LUFS. No re-render is needed: rebuild the mix, then copy the picture and add the new audio.

```sh
python -m uv run --no-project --with numpy python analysis/sfx_mix.py
cd out
ffmpeg -i motion-as-code.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest motion-as-code_sfx.mp4
ffmpeg -i motion-as-code_web.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest motion-as-code_sfx_web.mp4
```

To make an effect louder or quieter, change its `db` value in the cue sheet. To move one, change its time expression.

## Second video: frontend developer explainer

A 74-second explainer, *"Every website you have ever used has two sides…"*, built from the same engine and toolkit. It lives next to the first video and does not change it:

- `analysis/frontend/script.txt`: the script, one line per plate.
- `audio/frontend/voiceover.mp3`, `data/frontend/`: its voiceover and analysis.
- `app/src/frontend/`: its plates. `_fe.ts` holds the mock web page (raw HTML → CSS → behaviour), the browser, cursor, code editor and subtitles; `_base.ts` holds the plate base class; `timeline.ts` sets one plate per script line.

| Plate | Script |
|---|---|
| `sides` | Every website … has two sides |
| `role` | A frontend developer builds the part you see |
| `html` | HTML is the structure |
| `css` | CSS is the style |
| `js` | JavaScript is the behavior |
| `house` | HTML is the frame, CSS is the paint, JavaScript is the electricity |
| `frameworks` | React, Vue and Svelte; reusable components |
| `screens` | every screen, every user, screen readers |
| `api` | connect the page to the backend through APIs |
| `outro` | That's frontend development |

Preview it at http://localhost:5173/player.html?video=frontend. Render it with `bun scripts/render.ts video --video frontend …`, or without bun:

```sh
cd app
node scripts/render-node.mjs --video frontend --samples auto --min-samples 4 --max-samples 12 --crf 17
```

The voiceover is a placeholder made with Windows' built-in speech (no API key). To replace it with a better read, such as ElevenLabs, save it as `audio/frontend/voiceover.mp3` and re-run the last two steps below. To regenerate the placeholder after editing the script, run all four:

```sh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File analysis/frontend/tts_vo.ps1
python analysis/frontend/build_vo.py
VO_VARIANT=frontend analysis/.venv/Scripts/python analysis/align_vo.py
VO_VARIANT=frontend analysis/.venv/Scripts/python analysis/audio_vo.py
```

(`analysis/.venv` is a plain venv with `numpy` and `onnxruntime`. `VO_VARIANT` makes both scripts read and write `audio/<variant>/` and `data/<variant>/`.)

## Swapping the voiceover

One command, for any video (your recording, or an ElevenLabs clone of your own voice):

```sh
python analysis/swap_voice.py --video frontend path/to/recording.mp3
```

It normalises the file to −16 LUFS into `audio/<video>/voiceover.mp3` (keeping the old one as `voiceover.prev.mp3`), re-aligns the script word by word, rebuilds the audio analysis, and checks the result: every word found, none squeezed to nothing, no long silence inside a line. The recording must read the video's script (`analysis/<video>/script.txt`; for Motion as Code, `SCRIPT` in `align_vo.py`). The plates find their words by content, so they follow the new read with no other change. Use `--video motion-as-code` for the first video.

The manual steps it runs, for reference:

1. Replace `audio/voiceover.mp3`.
2. Edit `SCRIPT` (and `SPOKEN` for numbers and acronyms) in `analysis/align_vo.py`.
3. Re-run the alignment and the audio analysis:

```sh
python -m uv run --no-project --with onnxruntime --with numpy python analysis/align_vo.py
python -m uv run --no-project --with numpy python analysis/audio_vo.py
```

The plates find their words by content (`lineOf` and `wordOf`). If you keep the same script, every animation re-times itself to the new read.
