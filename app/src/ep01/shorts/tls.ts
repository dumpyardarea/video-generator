// SHORT 2 · The TLS handshake, visualised (short-ep01-tls, from EP01 chapter 5). The handshake ladder suits a tall
// frame: the browser's lane on the left, the server's on the right, messages sloping down between them.
//  0 two strangers, a watcher between them         1 the hello, one key half riding with it   2 the other half back
//  3 each side completes the same secret           4 the watcher holds both halves, and a "?"
//  5 the certificate                               6 a copy, anyone can send it               7 the signature only the real server can make
//  8 the browser's four checks                     9 one round trip, dimensioned             10 the full video; back to the start (loops)
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp, TAU } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { along, drawStation, drawPacket, card, check, pill, slab, stext, rgba, setWorld, w2s, font, F, SAY } from '../_ep';
import type { LineBatch } from '../../engine/lines';
import { keyHalf, eye } from '../scenes/tls-keys';
import { ShortScene, S, stS } from './_short';

const LX = 230, RX = 850, TOP = 300;
const YOU = stS(LX, TOP, 'your browser', 'never met', 56), SRV = stS(RX, TOP, 'example.com', 'never met', 56);
const R1: [number, number] = [470, 650], R2: [number, number] = [650, 830];
const r1 = [S(LX, R1[0]), S(RX, R1[1])], r2 = [S(RX, R2[0]), S(LX, R2[1])];
const CERT = ['Subject:  example.com', 'Key:      04:a1:9f:3c:7e:…', 'Signed:   a certificate authority'];

export default class TlsShort extends ShortScene {
  q = 'Two computers that have never met';
  w: Record<string, Word> = {};

  setup() {
    const g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      secret0: g('Two computers that have never met', 'secret'), watch: g('Two computers that have never met', 'watch'),
      hello: g('Your browser sends hello', 'hello'), half1: g('Your browser sends hello', 'half'),
      other: g('The server sends back', 'other'), half2: g('The server sends back', 'half'),
      same: g('From the two halves', 'same'), key: g('From the two halves', 'key'),
      never: g('The key never crosses', 'never'), halves: g('The key never crosses', 'halves'),
      cert: g('But is it the real server', 'certificate'), belongs: g('But is it the real server', 'belongs'), authority: g('But is it the real server', 'authority'),
      copy: g('A certificate is public', 'copy'), signs: g('So the server signs', 'signs'), priv: g('So the server signs', 'private'), only: g('So the server signs', 'only'),
      sig: g('Your browser checks that signature', 'signature'), chain: g('Your browser checks that signature', 'chain'), name: g('Your browser checks that signature', 'name'), date: g('Your browser checks that signature', 'date'),
      round: g('All of that takes a single round trip', 'round'), enter: g('How this fits into everything', 'enter'), video: g('How this fits into everything', 'video'),
    };
    this.holdCamera();
    this.shortCaptions();
  }
  m1() { return { t0: this.w.hello.start - 0.2, t1: this.w.hello.start + 1.8 }; }
  m2() { return { t0: this.w.other.start - 0.4, t1: this.w.other.start + 1.6 }; }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, end = this.ctx.end;
    const cta = prog(t, this.ln(10).start - 0.2, this.ln(10).start + 0.4), loop = prog(t, end - 1.0, end - 0.3);
    // the ladder dims while the certificate is discussed, and comes back for "one round trip"
    const certPhase = prog(t, this.ln(5).start - 0.3, this.ln(5).start + 0.2) * (1 - prog(t, this.ln(9).start - 0.3, this.ln(9).start + 0.1));
    const L = Math.max((1 - cta) * (1 - 0.8 * certPhase), loop);
    /** The handshake's own marks (labels, halves, keys) step aside completely for the certificate. */
    const Lh = Math.max((1 - cta) * (1 - certPhase), loop);
    drawStation(ctx, c, YOU, L, 0.4, { below: true });
    drawStation(ctx, c, SRV, L, 0.4 + 0.6 * prog(t, w.signs.start, w.priv.end) * (1 - prog(t, this.ln(8).start, this.ln(8).start + 0.4)));
    setWorld(ctx, c, 0, 0);
    ctx.globalAlpha = L; ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2.5 / c.z;
    for (const x of [LX, RX]) { ctx.beginPath(); ctx.moveTo(x / 1.5, (TOP + 130) / 1.5); ctx.lineTo(x / 1.5, 1150 / 1.5); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    // ---- 0 a watcher between them
    const e0 = L * this.span(t, 0, 5) * prog(t, w.watch.start - 0.2, w.watch.end + 0.2);
    eye(ctx, c, 540 / 1.5, 1010 / 1.5, 46 / 1.5, 'acid', e0 * (t < this.ln(4).start ? 1 : 0.0));
    slab(ctx, c, 'ANYONE CAN WATCH', 540 / 1.5, 1080 / 1.5, 20, rgba('acid', e0 * (t < this.ln(4).start ? 1 : 0)), 'center', 600);
    // ---- 1, 2 the hellos and the halves
    const M = [[this.m1(), r1, 'HELLO + ONE HALF', 'signal', -1], [this.m2(), r2, 'THE OTHER HALF', 'ember', 1]] as const;
    for (const [m, ps, name, col, side] of M) {
      const a = Lh * prog(t, m.t0, m.t0 + 0.3);
      if (a <= 0.003) continue;
      const u = prog(t, m.t0, m.t1, ease.inOutCubic), p = along(ps as P[], u);
      const mid = ((ps[0]!.y + ps[1]!.y) / 2) * 1.5;
      slab(ctx, c, name, 540 / 1.5, (mid - 40) / 1.5, 22, rgba(col, a), 'center', 600);
      keyHalf(ctx, c, p.x, p.y - 44 / 1.5, 30 / 1.5, side as -1 | 1, col, a);
    }
    // ---- 3 the same secret, on both sides
    const done = prog(t, w.same.start - 0.2, w.key.end + 0.2, ease.outCubic), dA = Lh * prog(t, this.ln(3).start - 0.3, this.ln(3).start);
    if (dA > 0.003) {
      for (const x of [LX, RX]) {
        const gap = lerp(70, 0, done) / 1.5, y = 960 / 1.5, r = 46 / 1.5;
        keyHalf(ctx, c, x / 1.5 - gap / 2, y, r, -1, 'signal', dA);
        keyHalf(ctx, c, x / 1.5 + gap / 2, y, r, 1, 'ember', dA);
        if (done > 0.95) { setWorld(ctx, c, x / 1.5, y); ctx.globalAlpha = dA; ctx.strokeStyle = rgba('bone', 1); ctx.lineWidth = 3 / c.z; ctx.beginPath(); ctx.arc(0, 0, r + 12 / 1.5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); }
        slab(ctx, c, 'SECRET KEY', x / 1.5, 1060 / 1.5, 18, rgba('bone', dA * prog(t, w.key.start, w.key.end + 0.3)), 'center', 600);
      }
    }
    // ---- 4 the watcher: both halves, no secret
    const wA = L * this.span(t, 4, 5);
    if (wA > 0.003) {
      eye(ctx, c, 540 / 1.5, 900 / 1.5, 40 / 1.5, 'acid', wA);
      const hk = prog(t, w.halves.start - 0.2, w.halves.end + 0.2);
      keyHalf(ctx, c, 480 / 1.5, 990 / 1.5, 26 / 1.5, -1, 'signal', wA * hk);
      keyHalf(ctx, c, 600 / 1.5, 990 / 1.5, 26 / 1.5, 1, 'ember', wA * hk);
      stext(ctx, c, '?', 540 / 1.5, 1012 / 1.5, 56, F.mono(600), rgba('acid', wA * hk));
      slab(ctx, c, 'SEES THE HALVES · NOT THE KEY', 540 / 1.5, 1090 / 1.5, 18, rgba('ash', wA * hk), 'center', 600);
    }
    // ---- 5 the certificate; 6 a copy
    const cA = this.span(t, 5, 8);
    if (cA > 0.003) {
      const k = prog(t, w.cert.start, w.belongs.end + 0.3) * 2 + prog(t, w.authority.start - 0.3, w.authority.end + 0.2);
      card(ctx, c, 110 / 1.5, 520 / 1.5, 860, 'Certificate', CERT, k, { a: cA, size: 30, scale: 1 / c.z, lineCol: (i) => (i === 0 ? rgba('signal', 1) : rgba('bone', 0.92)) });
      const cp = prog(t, w.copy.start - 0.6, w.copy.end + 0.3, ease.inOutCubic), ca = cA * prog(t, w.copy.start - 0.6, w.copy.start - 0.2) * (1 - prog(t, w.only.start, w.only.end + 0.3));
      if (ca > 0.003) {
        card(ctx, c, lerp(110, 240, cp) / 1.5, lerp(520, 860, cp) / 1.5, 600, 'A copy · anyone can send it', ['Subject:  example.com'], 1, { a: ca * 0.95, size: 28, scale: 1 / c.z });
      }
      // 7 the signature only the real server can make
      const sA = cA * prog(t, w.signs.start - 0.2, w.signs.end + 0.3);
      pill(ctx, c, 540 / 1.5, 1110 / 1.5, 'SIGNED WITH THE PRIVATE KEY', { a: sA, size: 30 / c.z });
      slab(ctx, c, 'ONLY THE REAL SITE HAS IT', 540 / 1.5, 1180 / 1.5, 20, rgba('bone', sA * prog(t, w.only.start, w.only.end + 0.3)), 'center', 600);
    }
    // ---- 8 the browser's checks
    const kA = this.span(t, 8, 9);
    if (kA > 0.003) {
      stext(ctx, c, 'The browser checks', 110 / 1.5, 600 / 1.5, 54, SAY, rgba('bone', kA), 'left');
      const rows: [string, Word][] = [['the signature', w.sig], ['the chain, to an authority', w.chain], ['the name', w.name], ['the expiry date', w.date]];
      rows.forEach(([s, at], i) => check(ctx, c, 110 / 1.5, (710 + i * 100) / 1.5, s, true, prog(t, at.start - 0.1, at.end + 0.4), 50 / 1.5, kA));
    }
    // ---- 9 one round trip
    const rA = this.span(t, 9, 10) * L;
    if (rA > 0.003) {
      const x = (LX - 90) / 1.5;
      setWorld(ctx, c, 0, 0); ctx.globalAlpha = rA; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 3 / c.z;
      ctx.beginPath(); ctx.moveTo(x - 14, R1[0] / 1.5); ctx.lineTo(x + 14, R1[0] / 1.5); ctx.moveTo(x, R1[0] / 1.5); ctx.lineTo(x, R2[1] / 1.5); ctx.moveTo(x - 14, R2[1] / 1.5); ctx.lineTo(x + 14, R2[1] / 1.5); ctx.stroke();
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      pill(ctx, c, 540 / 1.5, 1160 / 1.5, 'ONE ROUND TRIP · ≈ 80 ms, MEASURED', { a: rA * prog(t, w.round.start - 0.1, w.round.end + 0.3), size: 28 / c.z });
    }
    // ---- 10 the full video
    const fA = cta * (1 - loop);
    if (fA > 0.003) {
      stext(ctx, c, 'After you press', 540 / 1.5, 600 / 1.5, 76, SAY, rgba('bone', fA));
      setWorld(ctx, c, 540 / 1.5, 700 / 1.5, 1 / 1.5);
      ctx.globalAlpha = fA * prog(t, w.enter.start - 0.2, w.enter.end + 0.1);
      ctx.fillStyle = rgba('signal', 1); ctx.beginPath(); ctx.roundRect(-150, -10, 300, 130, 20); ctx.fill();
      ctx.font = font(SAY, 64); ctx.fillStyle = rgba('ink', 1); ctx.textAlign = 'center'; ctx.fillText('Enter', 0, 76); ctx.textAlign = 'left';
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      const steps = ['DNS', 'TCP', 'TLS', 'HTTP', 'PIXELS'];
      steps.forEach((s, i) => pill(ctx, c, (190 + i * 175) / 1.5, 960 / 1.5, s, { a: fA * prog(t, this.ln(10).start + 0.3 + i * 0.15, this.ln(10).start + 0.6 + i * 0.15), size: 28 / c.z, col: i === 2 ? 'signal' : 'ash', outline: i !== 2 }));
      slab(ctx, c, 'THE FULL VIDEO · LINKED BELOW', 540 / 1.5, 1090 / 1.5, 22, rgba('signal', fA * prog(t, w.video.start - 0.4, w.video.end)), 'center', 600);
    }
  }

  override penScreen(t: number) {
    const cm = this.cam.at(t);
    for (const [m, ps] of [[this.m1(), r1], [this.m2(), r2]] as const) if (t >= m.t0 && t < m.t1) { const q = along(ps as P[], prog(t, m.t0, m.t1, ease.inOutCubic)); return w2s(cm, q.x, q.y); }
    return null;
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const certPhase = prog(t, this.ln(5).start - 0.3, this.ln(5).start + 0.2) * (1 - prog(t, this.ln(9).start - 0.3, this.ln(9).start + 0.1));
    const L = (1 - prog(t, this.ln(10).start - 0.2, this.ln(10).start + 0.4)) * (1 - certPhase);
    for (const [m, ps] of [[this.m1(), r1], [this.m2(), r2]] as const) {
      const u = prog(t, m.t0, m.t1, ease.inOutCubic);
      if (u <= 0) continue;
      const a0 = w2s(c, ps[0]!.x, ps[0]!.y), h = along(ps as P[], u), b = w2s(c, h.x, h.y);
      X.seg2(a0[0], a0[1], b[0], b[1], 3, [0.5, 0.5, 0.6], 0.85 * L);
      if (u < 1) drawPacket(X, c, ps as P[], u, { trail: 0.3, size: 2.2, a: L });
    }
  }
}
