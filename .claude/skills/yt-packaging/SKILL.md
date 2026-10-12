---
name: yt-packaging
description: Write the YouTube packaging for a finished video in the Motion as Code repo - title options, thumbnail concept and export, description with chapters, tags, pinned comment and the Shorts' captions. Use after a video's final render is approved, or when reworking an underperforming video's title or thumbnail.
---

# YouTube packaging

Write everything to `channel/episodes/<NN-slug>/metadata.md`. Nothing here is uploaded automatically: the creator publishes by hand.

## Title (give 3 options, recommend 1)
- Under 60 characters so it isn't cut off on mobile.
- Promise a specific payoff or curiosity gap that the video actually delivers. No clickbait the video doesn't pay off: misleading metadata is a common reason channels get rejected for monetization.
- Front-load the searchable phrase (for example, "DNS explained", "event loop").
- No ALL CAPS, at most one emoji (usually none).

## Thumbnail
- Concept in one line, then build it as a dedicated thumbnail plate in the episode's own motif, exported at 1280×720 PNG with the repo's thumbnail command.
- At most 3–4 words of text, readable at the size of a phone search result (check a 320×180 downscale).
- One focal element, strong contrast, doesn't repeat the title's words.
- Make 2 variants so the creator can use YouTube's "Test & compare".

## Description
- First 2 lines: what the viewer will understand by the end (these show before "more").
- Chapters, taken from the render's chapter timestamps file. The first must be `0:00`, there must be at least 3, each at least 10 seconds long.
- Short list of sources or references for the technical claims.
- Credit line: "Animated in code with Motion as Code, built on pdoom-video by mexicat (MIT)."
- Links to related episodes from the channel (leave placeholders if not yet published).

## Tags and settings
- 5–10 tags: the core phrase, close variants, and the series name.
- Note for the creator: "Altered or synthetic content" = **No** (code-made motion graphics and the creator's own or self-cloned voice don't need a label). If any shot ever shows realistic AI-generated people, places or events, set it to **Yes**.
- Audience: not made for kids. Category: Education.

## Pinned comment
- One question that invites real answers (for example, "Which step surprised you?"), not "like and subscribe".

## Shorts (for each of the 2 Shorts)
- Title under 40 characters, plus a caption line pointing to the full video.
- Set the full video as the Short's related video in YouTube Studio.

## Reworking an underperforming video
- Never private or delete it (that removes its watch hours). Change the thumbnail first, then the title, one at a time, and note the date of each change in `metadata.md` so its effect can be judged.
