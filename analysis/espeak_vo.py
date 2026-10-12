"""The draft voice on Linux and macOS (espeak-ng), with exact word timings: no alignment model needed.

episode_vo.py uses it when Windows SAPI isn't available (or with --engine espeak). For each display line it speaks the
SPOKEN form of every token (analysis/spoken.py) and takes each word's start from espeak-ng's own word events, so
data/<video>/lyrics.json is exact for this voice. Like the SAPI draft, it is for timing only: a real recording
replaces it via swap_voice.py, which aligns the new voice properly.

Needs the espeak-ng library (Ubuntu/Debian: apt install espeak-ng; macOS: brew install espeak-ng).
"""
import ctypes, ctypes.util
import numpy as np

AUDIO_OUTPUT_SYNCHRONOUS, POS_CHARACTER, CHARS_UTF8 = 2, 1, 1
EV_WORD, EV_END, RATE = 1, 5, 1


class _Event(ctypes.Structure):
    _fields_ = [("type", ctypes.c_int), ("unique_identifier", ctypes.c_uint), ("text_position", ctypes.c_int),
                ("length", ctypes.c_int), ("audio_position", ctypes.c_int), ("sample", ctypes.c_int),
                ("user_data", ctypes.c_void_p), ("id", ctypes.c_char * 8)]


_CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.POINTER(_Event))


class Espeak:
    def __init__(self, voice="en-us", wpm=165):
        name = ctypes.util.find_library("espeak-ng") or "libespeak-ng.so.1"
        self.lib = ctypes.CDLL(name)
        self.sr = self.lib.espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 500, None, 0)
        if self.sr <= 0:
            raise RuntimeError("espeak-ng failed to initialise")
        self.lib.espeak_SetVoiceByName(voice.encode())
        self.lib.espeak_SetParameter(RATE, wpm, 0)
        self._buf, self._words = [], []

        def cb(wav, n, events):
            if wav and n > 0:
                self._buf.append(np.ctypeslib.as_array(wav, shape=(n,)).astype(np.float32) / 32768.0)
            i = 0
            while events[i].type != 0:
                e = events[i]
                if e.type == EV_WORD:
                    self._words.append((e.text_position, e.sample))
                i += 1
            return 0

        self._cb = _CB(cb)  # keep a reference: the library calls it
        self.lib.espeak_SetSynthCallback(self._cb)

    def say(self, text):
        """(samples float32 at self.sr, [(1-based character position, sample index) of each word])."""
        self._buf, self._words = [], []
        b = text.encode("utf-8") + b"\0"
        self.lib.espeak_Synth(b, len(b), 0, POS_CHARACTER, 0, CHARS_UTF8, None, None)
        self.lib.espeak_Synchronize()
        y = np.concatenate(self._buf) if self._buf else np.zeros(0, np.float32)
        return y, list(self._words)


def speak_line(tts, tokens, spoken_of):
    """Speak one display line. tokens: its display words; spoken_of(token) -> the words to say for it.
    Returns (samples, [start sample of each display token or None])."""
    parts, owner, pos = [], [], 1
    for ti, tok in enumerate(tokens):
        for w in spoken_of(tok):
            parts.append(w)
            owner.append((pos, pos + len(w), ti))   # each spoken word's 1-based character span
            pos += len(w) + 1
    y, events = tts.say(" ".join(parts))
    starts = [None] * len(tokens)
    for cpos, sample in events:
        # the spoken word this event points into; after a sentence break espeak points at the space before it
        k = next((i for i, (a, b, _) in enumerate(owner) if cpos < b), None)
        if k is not None:
            ti = owner[k][2]
            if starts[ti] is None:
                starts[ti] = sample
    return y, starts
