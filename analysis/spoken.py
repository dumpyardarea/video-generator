"""The spoken form of a script token: what a voice actually says for "0.8", "HTTP/3", "SYN-ACK", "301",
"en.wikipedia.org" or "2023". Used both to feed the draft voice (so the audio says exactly these words) and by
align_vo.py to align a recording against them (wav2vec2 is a character model: it needs the sounds, not the
symbols). Letters are spelled the way they sound (H → AITCH), so a draft voice pronounces them as letters too.

    spoken("HTTP/3,")  -> ['AITCH', 'TEE', 'TEE', 'PEE', 'THREE']
    spoken('"cats"')   -> ['CATS']
"""
import re

LETTER = {"A": "AY", "B": "BEE", "C": "SEE", "D": "DEE", "E": "EE", "F": "EF", "G": "JEE", "H": "AITCH", "I": "EYE", "J": "JAY",
          "K": "KAY", "L": "EL", "M": "EM", "N": "EN", "O": "OH", "P": "PEE", "Q": "CUE", "R": "AR", "S": "ESS", "T": "TEE",
          "U": "YOU", "V": "VEE", "W": "DOUBLE YOU", "X": "EX", "Y": "WHY", "Z": "ZEE"}
# acronyms read as words, and words that look like acronyms
AS_WORD = {"QUIC": ["QUICK"], "SYN": ["SIN"], "ACK": ["ACK"], "GET": ["GET"], "OK": ["OH", "KAY"], "DOM": ["DOM"],
           "NASA": ["NASA"], "JSON": ["JAY", "SON"], "GIF": ["GIF"], "SVG": ["ESS", "VEE", "JEE"],
           "NXDOMAIN": ["EN", "EX", "DOMAIN"]}
ONES = "ZERO ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN TWELVE THIRTEEN FOURTEEN FIFTEEN SIXTEEN SEVENTEEN EIGHTEEN NINETEEN".split()
TENS = "_ _ TWENTY THIRTY FORTY FIFTY SIXTY SEVENTY EIGHTY NINETY".split()


def number(n: int) -> list[str]:
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000:
        return [ONES[n // 100], "HUNDRED"] + (number(n % 100) if n % 100 else [])
    for div, name in ((10 ** 9, "BILLION"), (10 ** 6, "MILLION"), (1000, "THOUSAND")):
        if n >= div:
            return number(n // div) + [name] + (number(n % div) if n % div else [])
    return []


def year(n: int) -> list[str]:
    """2023 -> TWENTY TWENTY THREE; 2005 -> TWO THOUSAND FIVE."""
    hi, lo = divmod(n, 100)
    if lo == 0:
        return number(n)
    if hi == 20 and lo < 10:
        return ["TWO", "THOUSAND"] + number(lo)
    return number(hi) + (["OH"] + number(lo) if lo < 10 else number(lo))


def digits_word(s: str) -> list[str]:
    """A bare number as said in this kind of narration."""
    if re.fullmatch(r"\d+\.\d+", s):  # 0.8, 1.3
        a, b = s.split(".")
        return number(int(a)) + ["POINT"] + [ONES[int(d)] for d in b]
    n = int(s)
    if 1900 <= n <= 2099 and len(s) == 4:
        return year(n)
    if len(s) == 3 and s[1] == "0" and s[0] in "2345":  # HTTP status codes: 301, 404 (200 stays "two hundred")
        return number(n) if s[1:] == "00" else [ONES[int(s[0])], "OH", ONES[int(s[2])]]
    return number(n)


def spell(s: str) -> list[str]:
    return [w for ch in s for w in LETTER[ch].split()]


def part(s: str) -> list[str]:
    """One piece of a token (no separators)."""
    if not s:
        return []
    if s.isdigit() or re.fullmatch(r"\d+\.\d+", s):
        return digits_word(s)
    m = re.fullmatch(r"(\d+)([A-Za-z]+)", s)  # 3D, 4K
    if m:
        return digits_word(m.group(1)) + part(m.group(2))
    up = s.upper()
    if up in AS_WORD and s == up:
        return AS_WORD[up]
    # capitals are spelled when short (DNS, HTTP) or vowel-less (HTTPS); longer ones are words (PROBE, FINISHED)
    if re.fullmatch(r"[A-Z]{2,6}s?", s) and (len(s.rstrip("s")) <= 4 or not re.search(r"[AEIOU]", s)):
        plural = s.endswith("s") and s[:-1].isupper()
        core = s[:-1] if plural else s
        if core in AS_WORD:
            return AS_WORD[core] + (["S"] if plural else [])
        out = spell(core)
        if plural:
            out[-1] = out[-1] + "S" if out[-1] not in ("EYE",) else "EYES"
        return out
    if s.lower() in ("http", "https", "www", "url", "dns"):  # lowercase protocol names, as written in a URL
        return spell(s.upper())
    w = re.sub(r"[^A-Za-z']", "", s.replace("’", "'")).upper().strip("'")
    return [w] if w else []


def spoken(token: str) -> list[str]:
    # a lone capital letter is a word ("I", "A") unless it's quoted: the "S" in HTTPS
    bare = token.strip("\"'“”‘’()[],.:;!?")
    if re.fullmatch(r"[A-Z]", bare):
        return spell(bare) if re.search(r"[\"'“”‘’]", token) else [bare]
    t = token.replace("’", "'").replace("“", '"').replace("”", '"').replace("…", "")
    chars = "\"'()[]{}*_—–-:;,!?"
    t = t.strip(chars).rstrip(".").strip(chars).rstrip(".")  # twice: "https". and ".com",
    if not t:
        return []
    if re.fullmatch(r"\d+(\.\d+)?", t):  # a number before anything else (0.8 is not a web address)
        return digits_word(t)
    out = []
    # web addresses: en.wikipedia.org -> EN DOT WIKIPEDIA DOT ORG; ".com" -> DOT COM
    if re.fullmatch(r"\.?[a-z0-9-]+(\.[a-z0-9-]+)+", t) or re.fullmatch(r"\.[a-z]{2,}", t):
        for i, seg in enumerate(t.split(".")):
            if i:
                out.append("DOT")
            if seg:
                out += [seg.upper()] if seg.isalpha() and seg != seg.upper() else part(seg)
        return [w for w in out if w]
    # separators inside a token: HTTP/3, SYN-ACK, DNS_PROBE_FINISHED_NXDOMAIN, three-way
    for piece in re.split(r"[/_\-–]", t):
        out += part(piece)
    return out


if __name__ == "__main__":
    import sys
    for tok in sys.argv[1:] or ["0.8", "HTTP/3,", "SYN-ACK:", "301", "404", "200", "2023,", "en.wikipedia.org,", '".com"', "TLS", "APIs", "DNS_PROBE_FINISHED_NXDOMAIN", "1.3,", "QUIC", "\"S\"", "three-way", "IP", "TTL.", "75"]:
        print(f"{tok!r:32} {' '.join(spoken(tok))}")
