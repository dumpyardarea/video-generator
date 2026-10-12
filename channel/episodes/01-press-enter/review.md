# EP01 script review (script-reviewer, 11 Oct 2026)

Reviewed: `script.md`, `shorts.md`, against `PROMPT.md` (EP01 brief), `style-registry.md`, the other episodes' scripts.

**Verdict: Needs rework.** The rework is narrow: the facts are mostly right and the structure follows the brief. But the only original value is one placeholder chapter, ch. 7 repeats EP02, and the TLS section misrepresents how the server's identity is proven.

## The 3 most important fixes

1. **TLS identity and the padlock** (L84–90; Short 2 L21, L27).
   - The certificate is public, so the chain, name and expiry checks alone prove nothing. The proof is the server signing the handshake with the private key that matches the certificate (CertificateVerify, RFC 8446 §4.4.3).
   - The certificate's long-term key is not one of the key-exchange "halves".
   - Chrome 117 and later no longer shows the padlock: it shows a "tune" icon, and secure is the default. That could become a "misconception corrected" moment.
2. **Make the DevTools waterfall the backbone.**
   - Turn ch. 8 into `[DEMO: …]` and `[DEMO RESULT: …]` lines (the convention EP02 uses), so the real measured numbers are narrated.
   - Put the measured numbers in the hook and recap.
   - Add the corrections the waterfall will show: a lookup rarely visits the root or ".com" servers, because the resolver has cached those referrals (L54, L57), and files from other servers pay for DNS, TCP and TLS all over again (L116–117).
3. **Cut the overlap with EP02 and the shared template.**
   - Ch. 7's parsing and script-blocking lines (L111, L119–120) are nearly word for word EP02 L33, L50 and L53–56. Keep ch. 7 to fetching the other files, and hand parsing to EP02.
   - All four scripts end their hooks on "Let's…", have a numbered "your take" chapter just before the recap, and open the recap with "So, X:". Vary them.

## Other accuracy points
- "Everyone along the way remembers it for a while" (L54; Short 1 L14): the root and TLD servers don't cache your answer. The resolver, the OS and the browser do. "next time, it's instant" is too strong; "until the timer runs out" is accurate.
- HTTP/3 on a first visit (L71–73): usually only from the second visit, once the server has advertised it in its `Alt-Svc` header (unless a DNS HTTPS record advertises it first).
- "Less than a second later" (L10, L142): often not true on a cold mobile load (Google counts LCP under 2.5 s as good). Use the measured number instead.
- First visit vs cookies: L39 says nothing is cached, but L98 sends cookies from an earlier visit.
- A service worker, if there is one, answers before the HTTP cache is checked.
- `async` scripts still pause the parser while they run (EP02 already says this).

## Pacing
- About 1,245 narrated words, which is about 8.3 min at 150 wpm. The header says ~11 min and the brief ~12 min, so plan the creator's waterfall segment (about 2 min) and the handshake pauses to make up the gap.
- The packet doesn't leave the machine until about 2:05; tighten ch. 1 and 2. Ch. 9, the "pixels" the hook promises, is 18 s: trim the promise or make it a deliberate teaser for EP02.
- Lines carrying more than one idea, so too much for one plate: L12, L54, L71, L78, L88, L98, L103, L130.
- The hook should state the brief's "~a dozen systems before a single pixel".
- Short 1 is about 49 s against "45 seconds" in its title: cut about 12 words. Its first line is a statement, so try a question. The two Shorts' closing calls to action are nearly identical.

## Localization (Hindi tracks later)
- Idioms that may not translate: "In that blink", "does the legwork", "a noticeable slice of a second", "Opening a line", "a quieter trick", "built on the spot", "look over there", "Is it even a URL?".
- Keep SYN, ACK, GET, status codes, TTL, DNS and domain names in Latin script.
- A time in a title ("in 45 seconds") will break for the Hindi track, which runs longer.

## Sources
- RFC 8446 CertificateVerify: https://siotls.readthedocs.io/en/latest/references/contents/handshakes/certificate_verify.html
- Chrome 117 removes the padlock: https://www.bleepingcomputer.com/news/google/google-will-remove-secure-website-indicators-in-chrome-117 · https://www.darkreading.com/application-security/google-chrome-loses-the-lock-icon
- How browsers decide to use HTTP/3: https://www.peakhour.io/blog/how-browsers-decide-to-use-http3/
- Firefox HTTPS-First: https://support.mozilla.org/kb/https-first · Chrome 90 HTTPS by default: https://www.xda-developers.com/google-chrome-default-https-version-90/

---

# Re-review of the revised script (script-reviewer, 11 Oct 2026)

**Verdict: Ready after small fixes**, up from "Needs rework". Most of the first review's points are fixed: the TLS identity proof, the certificate key vs key exchange, the waterfall as the backbone with measured numbers in the hook and recap, DNS caching, other servers repeating the handshakes, the ch. 7 overlap with EP02, the shared template (for EP01), first visit vs cookies, the service worker order, and the idioms.

Remaining points, all applied to `script.md`, `shorts.md` and `demo/README.md` the same day:
1. **Facts.** Safari also dropped the padlock (18.4, March 2025). Wikipedia doesn't offer HTTP/3 at all (Wikimedia task T238034), so it isn't "HTTP/2 on the first visit, HTTP/3 next".
2. **Claim only what the data shows.**
   - The ~90 ms wait is mostly one round trip; the server itself took ~15 ms.
   - The 5.9 s run was mostly the HTML arriving slowly (3.4 s), not a slow start.
   - DNS: "something close by" answered, not necessarily the resolver.
   - The second server: its own DNS, plus ~160 ms of TCP and TLS.
   - "Reload straight away", not "second visit": the old connection was still open.
3. **Make the filmed demo reproducible.**
   - Use a fresh profile or guest window, since Disable cache doesn't clear DNS or sockets.
   - DevTools' "Initial connection" (~160 ms) includes SSL.
   - Point at the upload.wikimedia.org row that has the connection phases.
   - Short 2 cut to ~50 s (the padlock line removed).
4. **Smaller points.**
   - The hook no longer promises the pixels (that's EP02).
   - "In under a second" (the first paint was at 0.7 s).
   - Lines carrying two ideas split.
   - "agreed on", "moved permanently", "repeat" instead of "pay for".
   - Length now planned explicitly (~8.8 min narration plus ~2 min of demo footage, take and pauses).

Sources: WebKit, Safari 18.4 (https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) · Wikimedia T238034 (https://phabricator.wikimedia.org/T238034) · Chrome DevTools Network reference (https://developer.chrome.com/docs/devtools/network/reference) · web.dev, service worker and HTTP caching (https://web.dev/articles/service-worker-caching-and-http-caching).
