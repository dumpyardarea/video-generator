"""Frontend explainer: join the TTS lines (tts_vo.ps1, one WAV per script line) into
audio/frontend/voiceover.mp3, with the synthesizer's padding trimmed and our own pauses between lines.
Word timings then come from the project's forced aligner (SAPI's own word events drift ~15%):

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File analysis/frontend/tts_vo.ps1
    python analysis/frontend/build_vo.py
    VO_VARIANT=frontend analysis/.venv/Scripts/python analysis/align_vo.py
    VO_VARIANT=frontend analysis/.venv/Scripts/python analysis/audio_vo.py
"""
import json, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(__file__).resolve().parent / "work"
SR = 44100
LEAD, GAP, TAIL = 0.45, 0.42, 1.2  # silence before the first line, between lines, after the last


def load(wav):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


tts = json.loads((WORK / "tts.json").read_text(encoding="utf-8-sig"))
if isinstance(tts, dict): tts = [tts]
chunks = [np.zeros(int(LEAD * SR), np.float32)]
hop = SR // 100
for L in tts:
    y = load(L["wav"])
    n = len(y) // hop
    e = np.sqrt((y[: n * hop].reshape(n, hop) ** 2).mean(1))
    voiced = np.nonzero(e > max(1e-4, np.percentile(e, 95) * 0.06))[0]
    if len(voiced): y = y[max(0, (voiced[0] - 3) * hop): min(len(y), (voiced[-1] + 9) * hop)]
    chunks += [y, np.zeros(int(GAP * SR), np.float32)]
chunks[-1] = np.zeros(int(TAIL * SR), np.float32)
y = np.concatenate(chunks)
(ROOT / "audio" / "frontend").mkdir(parents=True, exist_ok=True)
(ROOT / "data" / "frontend").mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1.5",
                "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "192k", str(ROOT / "audio" / "frontend" / "voiceover.mp3")], input=y.tobytes(), check=True)
print(f"voiceover {len(y) / SR:.2f}s, {len(tts)} lines")
