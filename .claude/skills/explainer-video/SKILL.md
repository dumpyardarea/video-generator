---
name: explainer-video
description: Produce one explainer video (long-form 16:9 or a 9:16 Short) end to end in the Motion as Code repo, from outline and script through voiceover alignment, plates, stills review and final render. Use whenever creating or revising an episode or a Short.
---

# Explainer video production

Follow these stages in order. Each episode lives in `channel/episodes/<NN-slug>/`, and its plates live in `app/src/<slug>/`, registered via `app/src/engine/video.ts` the same way the frontend video is (`?video=<slug>`).

## 1. Outline (`outline.md`)
- Working title, target length, audience level.
- Hook: what the viewer sees and hears in the first 30 seconds. Open on a question, a surprising visual or a wrong guess, never on "Hi, welcome to the channel".
- Chapters with target durations (they must add up to the target length).
- Visual motif for this episode. Check `channel/style-registry.md` and pick a palette, type and motion motif that no other series uses. Add the new entry to the registry.
- Original value: what this video offers that the top 5 YouTube results on the topic don't. Mark spots for the creator as `[YOUR TAKE: suggestion]`.
- Two Shorts ideas, each mapped to a chapter.

## 2. Script (`script.md`)
- One line of narration per plate, grouped under chapter headings. Write for the ear: short sentences, one idea per line, about 150 words per minute.
- Beside each line, a one-sentence note of what's on screen.
- Keep every `[YOUR TAKE]` placeholder. Never write the creator's personal experience for them.
- Run the `script-reviewer` agent on the script. Fix what it flags.
- **CHECKPOINT 1:** show the creator the script and the reviewer's notes. Wait for approval.

## 3. Voiceover
- The final voice is the creator's own recording, or an ElevenLabs clone of the creator's own voice. A voice imitating any other real person is never allowed. Windows Zira is for timing drafts only.
- Put the MP3 where the README says, set `VO_VARIANT` for this episode, and run the alignment script in `analysis/`. Check the word-timings file is complete (no long gaps, no missing words).

## 4. Plates
- One plate per script line or small group of lines. Plates find their words by content, as in the existing scenes, so the animation follows the voice.
- Reuse engine utilities, but don't copy another episode's layouts or transitions. Vary composition from plate to plate within the video too (not every plate a centred title plus bullets).
- On-screen text: few words, large, easy to translate later. Keep text in data or constants, not baked into geometry, so a Hindi version can swap it.
- Add SFX cues sparingly (transitions, reveals), mixed well under the voice.
- Typecheck after each chapter.

## 5. Stills review
- Render a still from the middle of every plate. Check: text legible at phone size, nothing clipped at the edges, enough contrast, no overlapping elements, motif consistent.
- For Shorts, also keep the bottom ~20% and the right edge free of key content, since YouTube's buttons and captions cover them.
- **CHECKPOINT 2:** show the creator a contact sheet of the stills. Wait for approval.

## 6. Render
- Long-form: 1920×1080 at 60 fps with the repo's renderer, resuming by chapter if interrupted. Emit the chapter timestamps file.
- Shorts: 1080×1920, 30–60 seconds, laid out for vertical, never cropped from 16:9. End with a line pointing to the full video.
- Check the output: plays end to end, audio in sync at start, middle and end, no black frames (ffmpeg `blackdetect`), loudness around −14 LUFS.
- **CHECKPOINT 3:** tell the creator where the file is and wait for approval before packaging.

## 7. Hand off
- Run the `yt-packaging` skill for the title, thumbnail, description, chapters and tags.
- Commit the episode folder and plates with a clear message. Don't commit large audio or render files.
