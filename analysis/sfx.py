"""Sound effects for any video: its cue sheet, mixed under its voice.

    python analysis/sfx.py --video frontend [--out out/frontend.mix.wav]

A video's cue sheet is analysis/<video>/sfx_cues.py, defining cues(S). S has the video's word timings and
the placement helpers, so every effect is keyed to the same words the plates animate on (a new voiceover
re-times the sound too):

    S.line(q) / S.W(line_query, word, nth) / S.parts(w)   the script: lines and words by content
    S.cut(q)                                             a plate's cut time (before the line containing q)
    S.cue(t, name, db, pan, rate, take, length, mode)    one sound at t ('onset' / 'peak' / 'end' / 'raw')
    S.bed(name, t0, t1, db)                              a looped bed from t0 to t1
    S.typing(name, t0, t1, db) / S.type_words(...)       key strikes
    S.jitter(i), S.duration

The sounds are audio/sfx/<name>_<take>.mp3 (the ElevenLabs library). Effects are ducked up to 7 dB under the
voice, the mix is loudness-normalised to -14 LUFS (true peak -1.5 dB), and written as 48 kHz stereo WAV,
with <out>.cues.json listing every placed sound. render-node.mjs runs this at the end of a render when the
video has a cue sheet. (Motion as Code's own, older sheet is analysis/sfx_mix.py.)
"""
import argparse, importlib.util, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / "audio" / "sfx"
SR = 48000
MODE = {  # how a sound is placed relative to its cue time
    "whoosh_fast": "peak", "whoosh_soft": "peak", "reverse_suck": "end", "riser": "end",
    "spark_sizzle": "raw", "projector_run": "raw", "tape_rewind": "raw", "scan_sweep": "raw", "spark_zip": "raw",
    "falling_pieces": "onset", "paper_slide": "onset",
}
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass


def decode(path, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


_cache = {}
def takes(name):
    if name not in _cache:
        fs = sorted(SFX.glob(f"{name}_*.mp3"))
        if not fs:
            raise FileNotFoundError(f"no takes for '{name}' in audio/sfx/")
        out = []
        for f in fs:
            x = decode(f)
            x = x - x.mean()
            out.append(x / (np.abs(x).max() + 1e-9) * 10 ** (-1 / 20))  # peak -1 dBFS
        _cache[name] = out
    return _cache[name]


def onset(x):
    """The main transient: the first sample above half the peak, less 8 ms of attack."""
    a = np.abs(x)
    idx = np.where(a > 0.5 * a.max())[0]
    return max(0, int(idx[0]) - int(0.008 * SR)) if len(idx) else 0


def peak_at(x):
    env = np.convolve(np.abs(x), np.ones(int(0.02 * SR)) / (0.02 * SR), mode="same")
    return int(np.argmax(env))


def resample(x, rate):
    if abs(rate - 1) < 1e-4:
        return x
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)


class Sheet:
    """What a cue sheet gets: the script's timings and the placement helpers."""
    def __init__(self, lyrics, duration):
        self.LY = lyrics["lines"]
        self.duration = duration
        self.cues, self._n = [], {}
        self.fold = lambda s: s.lower().replace("’", "'").replace("“", '"').replace("”", '"')
        self.norm = lambda s: re.sub(r"[^a-z0-9()]", "", self.fold(s))

    def line(self, q, nth=0):
        ls = [l for l in self.LY if self.fold(q) in self.fold(l["text"])]
        if len(ls) <= nth:
            raise KeyError(f"no line contains '{q}'")
        return ls[nth]

    def W(self, lq, wq, nth=0):
        ws = [w for w in self.line(lq)["words"] if self.norm(w["w"]) == self.norm(wq)]
        if len(ws) <= nth:
            raise KeyError(f"no word '{wq}' in the line containing '{lq}'")
        return ws[nth]

    def parts(self, w):
        return w.get("syl") or [[w["start"], w["end"]]]

    def cut(self, q):
        """The plate cut before the line containing q (as the timelines place it)."""
        l = self.line(q)
        i = self.LY.index(l)
        gap = l["start"] - self.LY[i - 1]["end"] if i else 1
        return 0.0 if i == 0 else l["start"] - min(0.18, max(0.04, gap * 0.45))

    def cue(self, t, name, db, pan=0.0, rate=1.0, take=None, length=None, fade=0.03, mode=None):
        k = self._n.get(name, 0)
        self._n[name] = k + 1
        self.cues.append(dict(t=float(t), name=name, db=float(db), pan=float(pan), rate=float(rate), take=take, k=k, length=length, fade=fade, mode=mode or MODE.get(name, "onset")))

    def bed(self, name, t0, t1, db, pan=0.0, rate=1.0, fin=0.06, fout=0.12):
        self.cues.append(dict(t=float(t0), name=name, db=float(db), pan=float(pan), rate=float(rate), take=1, k=0, length=float(t1 - t0), fade=fout, fin=fin, mode="bed"))

    @staticmethod
    def jitter(i, a=0.05):
        return 1.0 + a * (((i * 7919) % 101) / 50.0 - 1.0)

    def typing(self, name, t0, t1, db, pan=0.0, step=0.075, start=0):
        t, i = t0, start
        while t < t1 - 0.01:
            self.cue(t, name, db + (((i * 37) % 7) - 3) * 0.6, pan=pan, rate=self.jitter(i))
            t += step * (0.8 + 0.4 * (((i * 53) % 11) / 10.0))
            i += 1
        return i

    def type_words(self, name, words, db, pan=0.0, frac=0.75, per=2.6):
        i = 0
        for w in words:
            n = max(1, round(len(w["w"]) / per))
            d = max(0.08, (w["end"] - w["start"]) * frac)
            for j in range(n):
                self.cue(w["start"] + d * j / n, name, db + (((i * 37) % 7) - 3) * 0.5, pan=pan, rate=self.jitter(i))
                i += 1


def mix(sheet, voice_path, out):
    n = int(sheet.duration * SR)
    bus = np.zeros((2, n), np.float32)
    report = []
    for c in sheet.cues:
        tk = takes(c["name"])
        x = tk[(c["take"] - 1) % len(tk)] if c["take"] else tk[c["k"] % len(tk)]
        x = resample(x, c["rate"])
        mode = c["mode"]
        start = c["t"]
        if mode == "onset":
            x = x[onset(x):]
        elif mode == "peak":
            start = c["t"] - peak_at(x) / SR
        elif mode == "end":
            start = c["t"] - len(x) / SR
        if mode == "bed":
            L = int(c["length"] * SR)
            x = np.tile(x, int(np.ceil(L / len(x))) + 1)[:L].copy()
            fi = int(c.get("fin", 0.06) * SR)
            if fi:
                x[:fi] *= np.linspace(0, 1, fi)
        if c.get("length") and mode != "bed":
            x = x[: int(c["length"] * SR)].copy()
        fo = min(len(x), int(c["fade"] * SR))
        if fo > 1:
            x[-fo:] *= np.linspace(1, 0, fo)
        g, a = 10 ** (c["db"] / 20), (c["pan"] + 1) * np.pi / 4
        i0 = int(round(start * SR)); j0 = max(0, -i0); i0 = max(0, i0)
        seg = x[j0:]; m = min(len(seg), n - i0)
        if m <= 0:
            continue
        bus[0, i0:i0 + m] += seg[:m] * g * np.cos(a)
        bus[1, i0:i0 + m] += seg[:m] * g * np.sin(a)
        report.append({k: c[k] for k in ("t", "name", "db", "pan", "rate", "mode")} | {"start": round(start, 3)})
    vo = decode(voice_path)[:n]
    vo = np.pad(vo, (0, n - len(vo)))
    # ducking: effects dip up to 7 dB while the voice speaks (10 ms attack, 180 ms release)
    hop = int(0.005 * SR)
    env = np.sqrt(np.convolve(vo ** 2, np.ones(hop * 4) / (hop * 4), mode="same"))
    env = env / (np.percentile(env, 99) + 1e-9)
    sm = np.zeros_like(env)
    a_att, a_rel = np.exp(-1 / (0.010 * SR)) ** hop, np.exp(-1 / (0.180 * SR)) ** hop
    prev = 0.0
    for i in range(0, n, hop):
        e = float(env[i])
        coef = a_att if e > prev else a_rel
        prev = coef * prev + (1 - coef) * e
        sm[i:i + hop] = prev
    m = bus * (10 ** (-7 * np.clip(sm, 0, 1) / 20))[None, :] + vo[None, :]
    peak = np.abs(m).max()
    if peak > 0.99:
        m *= 0.99 / peak
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    raw = out.with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes())
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"): meas.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", af, "-ar", str(SR), str(out)], check=True)
    raw.unlink(missing_ok=True)
    out.with_suffix(".cues.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    sfx_rms, vo_rms = float(np.sqrt((bus ** 2).mean())), float(np.sqrt((vo ** 2).mean()))
    print(f"{len(report)} cues; effects {20 * np.log10(sfx_rms + 1e-9):.1f} dB RMS under the voice's {20 * np.log10(vo_rms + 1e-9):.1f}; "
          f"{j['input_i']} LUFS -> -14 LUFS; wrote {out}")


def main():
    ap = argparse.ArgumentParser(description="Mix a video's sound effects under its voice.")
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--mux", type=Path, help="a rendered MP4: write <name>.sfx.mp4 with this mix as its audio (the picture is copied, not re-encoded)")
    a = ap.parse_args()
    variant = "" if a.video in ("", "motion-as-code", "default") else a.video
    sheet_file = ROOT / "analysis" / (variant or ".") / "sfx_cues.py"
    if not variant or not sheet_file.exists():
        sys.exit(f"no cue sheet: expected analysis/{variant or '<video>'}/sfx_cues.py (Motion as Code uses analysis/sfx_mix.py)")
    lyr = json.loads((ROOT / "data" / variant / "lyrics.json").read_text(encoding="utf-8"))
    dur = json.loads((ROOT / "data" / variant / "audio.json").read_text(encoding="utf-8"))["duration"]
    spec = importlib.util.spec_from_file_location(f"sfx_cues_{variant}", sheet_file)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    sheet = Sheet(lyr, dur)
    mod.cues(sheet)
    out = a.out or ROOT / "out" / f"{variant}.mix.wav"
    mix(sheet, ROOT / "audio" / variant / "voiceover.mp3", out)
    if a.mux:
        dst = a.mux.with_name(a.mux.stem + ".sfx.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a.mux), "-i", str(out), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", str(dst)], check=True)
        print(f"wrote {dst}")


if __name__ == "__main__":
    main()
