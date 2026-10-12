"""Swap a video's voiceover in one step: your recording (or an ElevenLabs clone of your own voice) in, the
plates re-timed to it.

    python analysis/swap_voice.py --video frontend path/to/recording.mp3
    python analysis/swap_voice.py --video motion-as-code path/to/recording.wav

It:
  1. checks the file (length, that it has audio) and normalises it to -16 LUFS, 44.1 kHz MP3, into
     audio/<video>/voiceover.mp3 (the previous voice is kept as voiceover.prev.mp3);
  2. re-aligns the script to it word by word (align_vo.py, wav2vec2) into data/<video>/lyrics.json;
  3. rebuilds data/<video>/audio.json (audio_vo.py);
  4. checks the alignment: every word placed, none squeezed to nothing, no long silence inside a line.
The plates find their words by content, so once this passes they follow the new read. The recording must
read the same script (analysis/<video>/script.txt, or SCRIPT in align_vo.py for Motion as Code); a changed
script means changed plates.

Runs the alignment with analysis/.venv's Python (numpy + onnxruntime) when there is one.
"""
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# (Windows consoles default to cp1252: print UTF-8 whatever the console)
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
VENV_PY = ROOT / "analysis" / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def probe(f: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,sample_rate,channels", "-of", "json", str(f)], capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"can't read {f}: {out.stderr.strip()}")
    return json.loads(out.stdout)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("recording", type=Path)
    ap.add_argument("--video", required=True, help="the video's id: frontend, motion-as-code, …")
    ap.add_argument("--no-normalize", action="store_true", help="copy the audio as is (it must already be an MP3)")
    a = ap.parse_args()
    variant = "" if a.video in ("", "motion-as-code", "default") else a.video
    name = variant or "motion-as-code"
    if variant and not (ROOT / "analysis" / variant / "script.txt").exists():
        sys.exit(f"no script for '{variant}': expected analysis/{variant}/script.txt")
    rec = a.recording.resolve()
    if not rec.exists():
        sys.exit(f"no such file: {rec}")

    # 1. the file
    info = probe(rec)
    if not any(s.get("codec_type") == "audio" for s in info.get("streams", [])):
        sys.exit(f"{rec.name} has no audio stream")
    dur = float(info["format"].get("duration", 0))
    if dur < 5:
        sys.exit(f"{rec.name} is only {dur:.1f} s long")
    target_dir = ROOT / "audio" / variant
    target = target_dir / "voiceover.mp3"
    target_dir.mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / variant).mkdir(parents=True, exist_ok=True)
    if target.exists():
        shutil.copy2(target, target_dir / "voiceover.prev.mp3")
    if a.no_normalize:
        if rec.suffix.lower() != ".mp3":
            sys.exit("--no-normalize needs an MP3")
        shutil.copy2(rec, target)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(rec), "-vn", "-ac", "1", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                        "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(target)], check=True)
    print(f"voice: {rec.name} ({dur:.1f} s) → {target.relative_to(ROOT)} (previous kept as voiceover.prev.mp3)")

    # 2–3. alignment and audio analysis
    py = str(VENV_PY) if VENV_PY.exists() else sys.executable
    env = {**os.environ, "VO_VARIANT": variant}
    for script in ("align_vo.py", "audio_vo.py"):
        r = subprocess.run([py, str(ROOT / "analysis" / script)], env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            sys.exit(f"{script} failed:\n{r.stderr[-3000:]}")
    lyr = json.loads((ROOT / "data" / variant / "lyrics.json").read_text(encoding="utf-8"))

    # 4. the checks
    problems, warnings = [], []
    words = [(li, w) for li, l in enumerate(lyr["lines"]) for w in l["words"]]
    for li, w in words:
        if w["start"] is None or w["end"] is None:
            problems.append(f"line {li + 1}: \"{w['w']}\" was not found in the recording")
        elif w["end"] - w["start"] < 0.04 and any(ch.isalnum() for ch in w["w"]):
            warnings.append(f"line {li + 1}: \"{w['w']}\" is only {1000 * (w['end'] - w['start']):.0f} ms (misread, or skipped?)")
    for li, l in enumerate(lyr["lines"]):
        ws = l["words"]
        for x, y in zip(ws, ws[1:]):
            if x["end"] is not None and y["start"] is not None and y["start"] - x["end"] > 2.5:
                warnings.append(f"line {li + 1}: {y['start'] - x['end']:.1f} s of silence before \"{y['w']}\"")
    starts = [l["start"] for l in lyr["lines"]]
    if any(b < a for a, b in zip(starts, starts[1:])):
        problems.append("lines are out of order: the recording may not follow the script")
    print(f"aligned {len(words)} words in {len(lyr['lines'])} lines; voice ends at {lyr['lines'][-1]['end']:.1f} s")
    for w in warnings:
        print(f"  warning: {w}")
    for p in problems:
        print(f"  PROBLEM: {p}")
    if problems:
        print("Fix the recording (or the script) and run this again. The old voice is in voiceover.prev.mp3.")
        sys.exit(1)
    print(f"done. Preview: http://localhost:5173/player.html{'?video=' + variant if variant else ''}")


if __name__ == "__main__":
    main()
