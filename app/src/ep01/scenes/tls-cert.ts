// TLS-CERT (chapter 5, part 2) — "But how does your browser know it's talking to the real example.com, and not an
// impostor? The server sends its certificate … But a certificate is public … So the server also signs the handshake
// itself, with the private key … The browser checks … If anything is wrong, you get a full-page warning … You might
// be looking for a padlock. Chrome stopped showing it in 2023, and Safari in 2025."
// The camera dives from the ladder into the server's answer, which opens on two servers both called example.com.
// The certificate types itself in the middle; a copy slides across to the impostor (identical). Only the real one
// signs the handshake with its private key; the impostor can't, and fades. The browser's four checks tick down;
// on "anything wrong" the frame flashes the one pink warning of the video. Then an address bar: the padlock, which
// turns into a plain settings icon (Chrome 2023, Safari 2025), and the only warning left: "Not secure". The camera
// pulls back out to the ladder, where the request is about to go.
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp, TAU } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, LADDER, RUNG, drawStation, card, check, pill, slab, stext, rgba, setWorld, font, label, pt, SAY, F, W, type Station } from '../_ep';

const O = { x: 2650 - 960, y: 1700 - 540 };
const S = (x: number, y: number): P => pt(O.x + x, O.y + y);
const st = (p: P, name: string, sub: string): Station => ({ x: p.x, y: p.y, name, sub, r: 56 });
const REAL = st(S(1560, 560), 'example.com', 'the real server');
const FAKE = st(S(360, 560), 'example.com?', 'an impostor');
const LAPTOP = st(S(360, 560), 'your laptop', 'the browser');
const CERT = ['Subject:    example.com', 'Public key: 04:a1:9f:3c:7e:…', 'Issuer:     a certificate authority', 'Signature:  that authority\'s', 'Valid:      until 15 Jan 2027'];
const CERT_AT = S(650, 150), CERT_W = 620;

export default class TlsCert extends EpScene {
  q = 'But how does your browser know';
  w: Record<string, Word> = {};
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      real: g('But how does your browser know', 'real'), impostor: g('But how does your browser know', 'impostor'),
      cert: g('The server sends its certificate', 'certificate'),
      pub: g('The certificate says: this public key', 'public'), belongs: g('The certificate says: this public key', 'belongs'),
      authority: g('The certificate says: this public key', 'authority'), signed: g('The certificate says: this public key', 'signed'),
      anyone: g('But a certificate is public', 'anyone'), copy: g('But a certificate is public', 'copy'),
      signs: g('So the server also signs', 'signs'), priv: g('So the server also signs', 'private'), matches: g('So the server also signs', 'matches'),
      only: g('Only the real example.com', 'only'), onlyKey: g('Only the real example.com', 'key'),
      checks: g('The browser checks that signature', 'checks'), sig: g('The browser checks that signature', 'signature'),
      chain: g('It checks the certificate\'s chain', 'chain'), trusts: g('It checks the certificate\'s chain', 'trusts'),
      name: g('And it checks the name matches', 'name'), expired: g('And it checks the name matches', 'expired'),
      wrong: g('If anything is wrong', 'wrong'), warning: g('If anything is wrong', 'warning'),
      everything: g('If everything checks out', 'everything'), privateNow: g('If everything checks out', 'private'),
      padlock: g('You might be looking for a padlock', 'padlock'),
      chrome: g('Chrome stopped showing it', 'chrome'), safari: g('Chrome stopped showing it', 'safari'), y2025: g('Chrome stopped showing it', '2025'),
      normal: g('A secure connection is now the normal case', 'normal'), warn: g('A secure connection is now the normal case', 'warn'), isnt: g('A secure connection is now the normal case', 'isnt'),
    };
    this.li = { l61: ly.get('But how does your browser know').i, l70: ly.get('If anything is wrong').i, l71: ly.get('If everything checks out').i, l72: ly.get('You might be looking for a padlock').i, l74: ly.get('A secure connection is now the normal case').i };
    const end = this.ctx.end, l61 = ly.lines[this.li.l61]!, l74 = ly.lines[this.li.l74]!;
    this.cam
      .key(this.ctx.start, 1750, 1274 + 40, 0.42)
      .key(l61.start + 1.6, O.x + 960, O.y + 540, 1.0, 0, ease.inOutCubic)
      .key(l74.end, O.x + 960, O.y + 545, 1.01, 0, ease.linear)
      .key(end - 0.05, 1750, RUNG(5)[0] + 90 / 0.42, 0.42, 0, ease.inOutCubic);
    this.captions();
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, ly = this.ctx.lyrics.lines, end = this.ctx.end;
    const l61 = ly[this.li.l61]!, l70 = ly[this.li.l70]!, l71 = ly[this.li.l71]!, l72 = ly[this.li.l72]!;
    // the ladder we dive out of, and back to
    const lad = 1 - prog(t, l61.start, l61.start + 1.2) + prog(t, end - 1.4, end - 0.4);
    if (lad > 0.003) {
      setWorld(ctx, c, 0, 0); ctx.globalAlpha = Math.min(1, lad); ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2 / c.z;
      for (const x of [LADDER.lx, LADDER.rx]) { ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x, 3400); ctx.stroke(); }
      ctx.strokeStyle = rgba('ash', 0.5);
      for (const i of [3, 4]) { const [y0, y1] = RUNG(i); const [a, b] = i === 3 ? [LADDER.lx, LADDER.rx] : [LADDER.rx, LADDER.lx]; ctx.beginPath(); ctx.moveTo(a, y0); ctx.lineTo(b, y1); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const stage = prog(t, l61.start + 0.6, l61.start + 1.4) * (1 - prog(t, end - 1.6, end - 0.8));
    if (stage <= 0.003) return;
    // ---- the two servers (the impostor fades once it can't sign; the laptop takes its place)
    const fakeA = stage * prog(t, w.real.start, w.impostor.end) * (1 - 0.75 * prog(t, w.only.start, w.onlyKey.end + 0.3)) * (1 - prog(t, l71.start - 0.4, l71.start));
    const lapA = stage * prog(t, l71.start - 0.2, l71.start + 0.4);
    const top = 1 - prog(t, l72.start - 0.3, l72.start + 0.2);
    drawStation(ctx, c, REAL, stage * top, prog(t, w.signs.start, w.priv.end) * 0.8 + 0.2 * prog(t, l71.start, l71.start + 0.4));
    drawStation(ctx, c, FAKE, fakeA * top, 0);
    drawStation(ctx, c, LAPTOP, lapA * top, 0.4);
    // ---- the certificate
    const ca = stage * prog(t, w.cert.start - 0.2, w.cert.end + 0.2) * (1 - prog(t, w.checks.start - 0.4, w.checks.start));
    const ck = prog(t, w.pub.start, w.belongs.end + 0.6) * 2 + prog(t, w.authority.start, w.signed.end + 0.5) * 3;
    if (ca > 0.003) card(ctx, c, CERT_AT.x, CERT_AT.y, CERT_W, 'Certificate', CERT, ck, { a: ca, size: 24, lineCol: (i) => (i === 0 ? rgba('signal', 1) : rgba('bone', 0.92)) });
    // a copy, sliding to the impostor
    const cp = prog(t, w.anyone.start, w.copy.end + 0.3, ease.inOutCubic);
    const cpa = stage * prog(t, w.anyone.start, w.anyone.start + 0.6) * (1 - prog(t, w.only.start, w.only.start + 0.5));
    if (cpa > 0.003) {
      const x = lerp(CERT_AT.x - 160, S(150, 0).x, cp), y = lerp(CERT_AT.y + 120, S(0, 690).y, cp);
      card(ctx, c, x, y, 420, 'Certificate (a copy)', ['Subject: example.com', '… identical'], 2, { a: cpa * 0.9, size: 22 });
    }
    // the signature only the real one can make
    const sa = stage * prog(t, w.signs.start - 0.1, w.signs.end + 0.3) * (1 - prog(t, w.checks.start - 0.4, w.checks.start));
    pill(ctx, c, REAL.x, REAL.y - 130, 'SIGNS THE HANDSHAKE · PRIVATE KEY', { a: sa, size: 20 });
    slab(ctx, c, 'NEVER LEAVES THE SERVER', REAL.x, REAL.y - 80, 13, rgba('ash', sa * prog(t, w.priv.start, w.matches.end)));
    const na = stage * prog(t, w.only.start, w.onlyKey.end + 0.2) * (1 - prog(t, w.checks.start - 0.4, w.checks.start));
    pill(ctx, c, FAKE.x, FAKE.y - 130, '✕ NO PRIVATE KEY, NO SIGNATURE', { a: na, size: 20, col: 'acid', outline: true });
    // ---- the browser's checks
    const kA = stage * prog(t, w.checks.start - 0.3, w.checks.start + 0.1) * (1 - prog(t, l71.start - 0.3, l71.start + 0.1));
    if (kA > 0.003) {
      stext(ctx, c, 'The browser checks', S(560, 180).x, S(0, 180).y, 40, SAY, rgba('bone', kA), 'left');
      const rows: [string, Word, Word][] = [
        ['the handshake signature', w.checks, w.sig],
        ['the chain: example.com ← an intermediate ← a root it trusts', w.chain, w.trusts],
        ['the name matches: example.com', w.name, w.name],
        ['not expired', w.expired, w.expired],
      ];
      rows.forEach(([s, a, b], i) => check(ctx, c, S(560, 260 + i * 62).x, S(0, 260 + i * 62).y, s, true, prog(t, a.start, b.end + 0.4), 30, kA));
    }
    // ---- the one warning
    const wa = prog(t, w.wrong.start - 0.1, w.wrong.end + 0.1) * (1 - prog(t, l71.start - 0.4, l71.start));
    if (wa > 0.003) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = wa;
      ctx.fillStyle = rgba('acid', 0.16); ctx.fillRect(0, 0, W, 1080);
      ctx.fillStyle = rgba('ink2', 0.96); ctx.beginPath(); ctx.roundRect(W / 2 - 520, 230, 1040, 420, 22); ctx.fill();
      ctx.strokeStyle = rgba('acid', 1); ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = rgba('acid', 1); ctx.lineWidth = 6; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(W / 2, 290); ctx.lineTo(W / 2 + 46, 370); ctx.lineTo(W / 2 - 46, 370); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = rgba('acid', 1); ctx.fillRect(W / 2 - 3, 315, 6, 30); ctx.fillRect(W / 2 - 3, 352, 6, 7);
      ctx.font = font(SAY, 46); ctx.fillStyle = rgba('bone', 1); ctx.textAlign = 'center';
      ctx.fillText('This connection is not private', W / 2, 460);
      label(ctx, 'THE CERTIFICATE DIDN\'T CHECK OUT. THE BROWSER STOPS HERE.', W / 2, 530, { size: 16, col: rgba('acid', 1), align: 'center' });
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    // ---- private from here on
    const pa = stage * prog(t, w.privateNow.start - 0.1, w.privateNow.end + 0.3) * top;
    if (pa > 0.003) {
      setWorld(ctx, c, 0, 0); ctx.globalAlpha = pa; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(LAPTOP.x + 70, LAPTOP.y); ctx.lineTo(lerp(LAPTOP.x + 70, REAL.x - 70, prog(t, w.privateNow.start, w.privateNow.end + 0.4, ease.outCubic)), REAL.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, 'ENCRYPTED · PRIVATE FROM HERE ON', (LAPTOP.x + REAL.x) / 2, REAL.y - 30, 18, rgba('signal', pa), 'center', 600);
    }
    // ---- the padlock, retired
    const ba = stage * prog(t, l72.start - 0.2, l72.start + 0.3);
    if (ba > 0.003) this.addressBars(t, c, ctx, ba);
  }

  addressBars(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number) {
    const w = this.w;
    const morph = prog(t, w.chrome.start, w.chrome.end + 0.5, ease.inOutCubic);
    const bar = (y: number, text: string, icon: (x: number, y: number) => void, al: number, col = 'bone') => {
      if (al <= 0.003) return;
      const p = S(410, y);
      setWorld(ctx, c, p.x, p.y);
      ctx.globalAlpha = al;
      ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(0, 0, 1100, 92, 46); ctx.fill();
      ctx.strokeStyle = rgba('ash', 0.5); ctx.lineWidth = 1.5; ctx.stroke();
      icon(62, 46);
      ctx.font = font(F.mono(500), 38); ctx.fillStyle = rgba(col, 1); ctx.fillText(text, 120, 60);
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    const lock = (x: number, y: number) => {
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha *= 1 - morph;
      ctx.strokeStyle = rgba('bone', 1); ctx.lineWidth = 4; ctx.fillStyle = rgba('bone', 1);
      ctx.beginPath(); ctx.arc(0, -6, 11, Math.PI, 0); ctx.stroke(); ctx.fillRect(-15, -6, 30, 24);
      ctx.restore();
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha *= morph;
      ctx.strokeStyle = rgba('bone', 1); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      for (const [yy, kx] of [[-8, 6], [8, -6]] as const) { ctx.beginPath(); ctx.moveTo(-16, yy); ctx.lineTo(16, yy); ctx.stroke(); ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.arc(kx, yy, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    };
    bar(250, 'example.com', lock, a);
    slab(ctx, c, morph < 0.5 ? 'THE PADLOCK' : 'NOW: A PLAIN SETTINGS ICON', S(410 + 62, 380).x, S(0, 380).y, 16, rgba(morph < 0.5 ? 'bone' : 'ash', a * prog(t, w.padlock.start, w.padlock.end + 0.3)), 'left', 600);
    slab(ctx, c, 'CHROME, 2023  ·  SAFARI, 2025', S(410 + 1100, 380).x, S(0, 380).y, 16, rgba('ash', a * prog(t, w.chrome.start, w.y2025.end + 0.3)), 'right', 600);
    const nA = a * prog(t, w.warn.start - 0.1, w.isnt.end + 0.3);
    const warnIcon = (x: number, y: number) => { ctx.strokeStyle = rgba('acid', 1); ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 18, y + 14); ctx.lineTo(x - 18, y + 14); ctx.closePath(); ctx.stroke(); };
    bar(470, 'Not secure   http://…', warnIcon, nA, 'acid');
    slab(ctx, c, 'THE ONLY WARNING LEFT: WHEN IT ISN\'T SECURE', S(410 + 62, 600).x, S(0, 600).y, 16, rgba('acid', nA), 'left', 600);
  }
}
