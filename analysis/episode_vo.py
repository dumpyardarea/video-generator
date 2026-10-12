"""An episode's script → its voiceover, word timings and audio analysis, in one step.

    python analysis/episode_vo.py --episode 01-press-enter --video ep01            # draft voice (Windows SAPI)
    python analysis/episode_vo.py --episode 01-press-enter --video ep01 --no-tts   # only re-read the script
    python analysis/episode_vo.py --episode 01-press-enter --video short-ep01-dns --short 1   # a Short (shorts.md)

From channel/episodes/<episode>/script.md it takes the narration: every plain line, the [DEMO RESULT: …] lines
and the [YOUR TAKE: …] lines (their text), skipping headings, notes and [DEMO: …] footage directions. It writes
  analysis/<video>/script.txt     the display lines (what the plates show; align_vo.py reads it)
  analysis/<video>/chapters.json  each line's chapter (the timeline groups plates by it)
then, unless --no-tts: the draft voice reads the SPOKEN form of each line (analysis/spoken.py: "0.8" → "zero point
eight"), so the alignment matches it exactly; the lines are stitched with pauses (longer between chapters) into
audio/<video>/voiceover.mp3; align_vo.py and audio_vo.py write data/<video>/. The draft voice is for timing only:
replace it with your recording via analysis/swap_voice.py (same script, so the plates follow).
"""
import argparse, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spoken import spoken  # noqa: E402
VENV_PY = ROOT / "analysis" / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
SR = 44100
LEAD, GAP, CHAPTER_GAP, TAIL = 0.5, 0.38, 0.95, 1.5  # silences: before, between lines, between chapters, after


def read_script(md: Path):
    """[(chapter, display line)] from an episode's script.md."""
    out, chapter = [], "Intro"
    for raw in md.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("#"):
            if s.startswith("## "):
                chapter = re.sub(r"^\d+\.\s*", "", s[3:]).strip()
            continue
        if s.startswith(("- ", "(", ">")) or s.startswith("[DEMO:") or s.startswith("[YOUR TAKE, DRAFT") or s.startswith("[YOUR TAKE, OPTIONAL"):
            continue
        m = re.match(r"^\[(DEMO RESULT|YOUR TAKE)(?:\s*\([^)]*\))?:\s*(.*)\]$", s)
        if m:
            s = m.group(2).strip()
        elif s.startswith("["):
            continue
        if s and not s.startswith("  "):
            out.append((chapter, s))
    return out


def read_short(md: Path, n: int):
    """[(the Short's title, line)] from section "## Short <n>: <title>" of an episode's shorts.md."""
    out, title, on = [], "", False
    for raw in md.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        m = re.match(r"^##\s*Short\s+(\d+):\s*(.*)$", s)
        if m:
            on, title = int(m.group(1)) == n, m.group(2).strip()
            continue
        if on and s.startswith("#"):
            break
        if on and s.startswith("|"):  # a table row: | n | line | on screen |
            cells = [c.strip() for c in s.strip("|").split("|")]
            if len(cells) >= 2 and cells[0].isdigit():
                out.append((title, cells[1]))
            continue
        if on and s and not s.startswith(("- ", "(", ">", "[")):
            out.append((title, s))
    if not out:
        sys.exit(f"no Short {n} in {md}")
    return out


def spoken_line(line: str) -> str:
    """The words a voice says for a display line, keeping its punctuation for the phrasing."""
    words = []
    for tok in line.split(" "):
        sp = spoken(tok)
        if not sp:
            continue
        tail = re.search(r"[,.:;?!]+[\"”']?$", tok)
        sp = [w.lower() for w in sp]
        if tail:
            sp[-1] += tail.group(0).strip("\"”'")
        words += sp
    return " ".join(words)


def load(wav):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--episode", required=True, help="the folder in channel/episodes/, e.g. 01-press-enter")
    ap.add_argument("--video", required=True, help="the video id the app uses (?video=…), e.g. ep01")
    ap.add_argument("--no-tts", action="store_true")
    ap.add_argument("--rate", type=int, default=0, help="draft voice speed, -10..10")
    ap.add_argument("--short", type=int, default=0, help="voice Short <n> of the episode's shorts.md instead of its script")
    ap.add_argument("--engine", choices=("sapi", "espeak"), default="sapi" if os.name == "nt" else "espeak",
                    help="the draft voice: Windows SAPI (aligned afterwards), or espeak-ng (exact word timings, no alignment model)")
    a = ap.parse_args()
    ep = ROOT / "channel" / "episodes" / a.episode
    lines = read_short(ep / "shorts.md", a.short) if a.short else read_script(ep / "script.md")
    vdir = ROOT / "analysis" / a.video
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "script.txt").write_text("\n".join(l for _, l in lines) + "\n", encoding="utf-8")
    (vdir / "chapters.json").write_text(json.dumps([c for c, _ in lines], ensure_ascii=False, indent=0), encoding="utf-8")
    words = sum(len(l.split()) for _, l in lines)
    print(f"{len(lines)} lines, {words} words (~{words / 150:.1f} min at 150 wpm), {len(dict.fromkeys(c for c, _ in lines))} chapters → {vdir.relative_to(ROOT)}/script.txt")
    if a.no_tts:
        return
    work = vdir / "work"
    work.mkdir(exist_ok=True)
    (work / "spoken.txt").write_text("\n".join(spoken_line(l) for _, l in lines) + "\n", encoding="utf-8")
    if a.engine == "espeak":
        return espeak_draft(lines, a.video)
    subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ROOT / "analysis" / "tts_vo.ps1"),
                    "-Script", str(work / "spoken.txt"), "-Work", str(work), "-Rate", str(a.rate)], check=True)
    tts = json.loads((work / "tts.json").read_text(encoding="utf-8-sig"))
    if isinstance(tts, dict):
        tts = [tts]
    # stitch: trim the synthesizer's padding, our own pauses between lines (longer between chapters)
    hop = SR // 100
    chunks = [np.zeros(int(LEAD * SR), np.float32)]
    for i, t in enumerate(tts):
        y = load(t["wav"])
        n = len(y) // hop
        e = np.sqrt((y[: n * hop].reshape(n, hop) ** 2).mean(1))
        v = np.nonzero(e > max(1e-4, np.percentile(e, 95) * 0.06))[0]
        if len(v):
            y = y[max(0, (v[0] - 3) * hop): min(len(y), (v[-1] + 9) * hop)]
        last = i == len(tts) - 1
        gap = TAIL if last else (CHAPTER_GAP if lines[i + 1][0] != lines[i][0] else GAP)
        chunks += [y, np.zeros(int(gap * SR), np.float32)]
    y = np.concatenate(chunks)
    adir = ROOT / "audio" / a.video
    adir.mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / a.video).mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1.5",
                    "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "192k", str(adir / "voiceover.mp3")], input=y.tobytes(), check=True)
    print(f"draft voice: {len(y) / SR:.1f} s → audio/{a.video}/voiceover.mp3")
    py = str(VENV_PY) if VENV_PY.exists() else sys.executable
    env = {**os.environ, "VO_VARIANT": a.video}
    for script in ("align_vo.py", "audio_vo.py"):
        r = subprocess.run([py, str(ROOT / "analysis" / script)], env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            sys.exit(f"{script} failed:\n{r.stderr[-3000:]}")
    lyr = json.loads((ROOT / "data" / a.video / "lyrics.json").read_text(encoding="utf-8"))
    bad = [w["w"] for l in lyr["lines"] for w in l["words"] if w["start"] is None or (w["end"] - w["start"] < 0.04 and any(c.isalnum() for c in w["w"]))]
    print(f"aligned {sum(len(l['words']) for l in lyr['lines'])} words; voice ends at {lyr['lines'][-1]['end']:.1f} s"
          + (f"; {len(bad)} doubtful: {', '.join(bad[:12])}" if bad else ""))


def trim(y, sr):
    """(first, last) sample of the sound in y, keeping a little air, as the SAPI path trims."""
    hop = sr // 100
    n = len(y) // hop
    if not n:
        return 0, len(y)
    e = np.sqrt((y[: n * hop].reshape(n, hop) ** 2).mean(1))
    v = np.nonzero(e > max(1e-4, np.percentile(e, 95) * 0.06))[0]
    return (max(0, (v[0] - 3) * hop), min(len(y), (v[-1] + 9) * hop)) if len(v) else (0, len(y))


def espeak_draft(lines, video):
    """The espeak-ng draft: speak each line, stitch with the same pauses, and write lyrics.json from the voice's own
    word events (so no alignment step), then the audio analysis."""
    from espeak_vo import Espeak, speak_line
    tts = Espeak()
    sr = tts.sr

    def say(tok):
        sp = [w.lower() for w in spoken(tok)]
        tail = re.search(r"[,.:;?!]+[\"”']?$", tok)
        if sp and tail:
            sp[-1] += tail.group(0).strip("\"”'")
        return sp

    chunks, out, t = [np.zeros(int(LEAD * sr), np.float32)], [], LEAD
    for i, (chapter, text) in enumerate(lines):
        toks = text.split(" ")
        y, starts = speak_line(tts, toks, say)
        a, b = trim(y, sr)
        y = y[a:b]
        dur = len(y)
        # a word the voice gave no event (it ran two words together, or the token is silent) shares the time between
        # the timed words either side; each word ends where the next starts
        st = [None if s is None else max(0, s - a) for s in starts]
        st[0] = st[0] if st[0] is not None else 0
        k = 0
        while k < len(st):
            if st[k] is None:
                j = k
                while j < len(st) and st[j] is None:
                    j += 1
                lo, hi = st[k - 1], (st[j] if j < len(st) else dur)
                for m in range(k, j):  # the word before keeps its share too
                    st[m] = lo + (hi - lo) * (m - k + 1) // (j - k + 1)
                k = j
            k += 1
        words = []
        for k, tok in enumerate(toks):
            end = st[k + 1] if k + 1 < len(st) else dur - int(0.06 * sr)
            words.append({"w": tok, "start": round(t + st[k] / sr, 3), "end": round(t + max(st[k], end) / sr, 3)})
        out.append({"text": text, "start": words[0]["start"], "end": words[-1]["end"], "words": words})
        last = i == len(lines) - 1
        gap = TAIL if last else (CHAPTER_GAP if lines[i + 1][0] != chapter else GAP)
        chunks += [y, np.zeros(int(gap * sr), np.float32)]
        t += (dur + int(gap * sr)) / sr
    y = np.concatenate(chunks)
    adir, ddir = ROOT / "audio" / video, ROOT / "data" / video
    adir.mkdir(parents=True, exist_ok=True)
    ddir.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1.5",
                    "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "192k", str(adir / "voiceover.mp3")], input=y.tobytes(), check=True)
    (ddir / "lyrics.json").write_text(json.dumps({"source": "episode_vo.py (espeak-ng draft, the voice's own word timings)", "lines": out},
                                                 indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"draft voice (espeak-ng): {len(y) / sr:.1f} s → audio/{video}/voiceover.mp3; {sum(len(l['words']) for l in out)} words timed")
    r = subprocess.run([sys.executable, str(ROOT / "analysis" / "audio_vo.py")], env={**os.environ, "VO_VARIANT": video},
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        sys.exit(f"audio_vo.py failed:\n{r.stderr[-3000:]}")


if __name__ == "__main__":
    main()
