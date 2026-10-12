// PARSE (chapter 1, "What did you type?") — "First, the browser decides what you typed: an address, or a search …
// Then it splits the address into parts … The packet is ready. Before it leaves, one more check."
// Two address bars: "cats" goes to the search engine, "example.com" is an address. Then the URL alone, set large,
// splits into scheme / host / path, each labelled as it is said. The scheme goes ghostly ("you probably didn't
// type it") and comes back green (tried first); the built-in HSTS list types itself in below. On "the packet is
// ready" the URL folds down into the glowing packet above the laptop, where the cache plate picks it up.
import type { Word } from '../../engine/lyrics';
import { ease, lerp, prog, clamp } from '../../engine/util';
import type { Cam } from '../../scenes/_vo';
import { EpScene, ST, drawStation, pill, card, font, rgba, label, setWorld, w2s, measure, F, LIN } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const PARTS = [
  { s: 'https://', name: 'SCHEME', sub: 'how to talk' },
  { s: 'example.com', name: 'HOST', sub: 'who to talk to' },
  { s: '/', name: 'PATH', sub: 'what you want' },
];
const URL_Y = -230, URL_SZ = 92, MONO_F = F.mono(500), GAP = 70;
const HSTS = ['*.dev          always https', '*.app          always https', 'github.com     always https', 'paypal.com     always https', '… and thousands more'];
const PACKET = { x: 0, y: -120 };

export default class Parse extends EpScene {
  q = 'First, the browser decides';
  w: Record<string, Word> = {};
  /** Line indices by plate order (7 = "First, the browser decides"). */
  n: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    const li = (q: string) => ly.get(q).i;
    this.n = { decide: li('First, the browser decides'), cats: li('has no dot'), dom: li('looks like a domain name'), split: li('Then it splits the address'),
      scheme: li('The scheme says'), host: li('The host says'), path: li('The path says'), https: li('You probably didn\'t type'),
      list: li('some sites are on a list'), ready: li('The packet is ready') };
    this.w = {
      cats: g('has no dot', 'cats'), search: g('has no dot', 'search'), example: g('looks like a domain name', 'examplecom'),
      address: g('looks like a domain name', 'address'), splits: g('Then it splits the address', 'splits'), parts: g('Then it splits the address', 'parts'),
      scheme: g('The scheme says', 'scheme'), host: g('The host says', 'host'), path: g('The path says', 'path'),
      type: g('You probably didn\'t type', 'type'), secure: g('You probably didn\'t type', 'secure'),
      list: g('some sites are on a list', 'list'), insecurely: g('some sites are on a list', 'insecurely'),
      ready: g('The packet is ready', 'ready'), check: g('The packet is ready', 'check'),
    };
    // the narration, set low in the frame, one line at a time
    for (const l of this.lines) this.say(l.words, -880, 360, 46, `line:${l.i}`, { maxW: 1760 });
    const w = this.w, end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 0, -30, 1.0)
      .key(w.splits.start - 0.4, 0, -40, 1.02, 0, ease.linear)
      .key(w.splits.end + 0.6, 0, -60, 1.0, 0, ease.inOutCubic)
      .key(w.ready.start, 0, -70, 1.03, 0, ease.linear)
      .key(end - 0.05, 0, -30, 1.0, 0, ease.inOutCubic);
  }

  /** 0..1 while line i is (about to be) said, through the start of the next line. */
  on(t: number, i: number) {
    const l = this.ctx.lyrics.lines[i]!, nx = this.ctx.lyrics.lines[i + 1];
    return prog(t, l.start - 0.25, l.start + 0.1) * (1 - prog(t, (nx?.start ?? this.ctx.end) - 0.2, (nx?.start ?? this.ctx.end) + 0.1));
  }
  collapse(t: number) { return prog(t, this.w.ready.start - 0.1, this.w.ready.end + 0.5, ease.inOutCubic); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const L = this.ctx.lyrics.lines, w = this.w, n = this.n;
    // ---- an address, or a search? (two bars)
    const aA = prog(t, L[n.decide]!.start - 0.3, L[n.decide]!.start + 0.3) * (1 - prog(t, L[n.split]!.start - 0.3, L[n.split]!.start + 0.2));
    if (aA > 0.003) {
      this.bar(ctx, c, -640, -330, 'cats', prog(t, w.cats.start - 0.25, w.cats.end), aA, t < w.example.start - 0.3);
      this.bar(ctx, c, -640, -170, 'example.com', prog(t, w.example.start - 0.25, w.example.end), aA * prog(t, L[n.dom]!.start - 0.4, L[n.dom]!.start), t >= w.example.start - 0.3);
      const s1 = prog(t, w.search.start - 0.1, w.search.end, ease.outCubic), s2 = prog(t, w.address.start - 0.1, w.address.end, ease.outCubic);
      this.arrow(ctx, c, 120, -288, s1, aA);
      pill(ctx, c, 430, -288, 'SEARCH ENGINE', { a: aA * s1, col: 'ash', outline: true, size: 26 });
      this.arrow(ctx, c, 120, -128, s2, aA);
      pill(ctx, c, 380, -128, 'ADDRESS', { a: aA * s2, size: 26 });
      label(ctx, 'NO DOT', -640 + 44, -330 + 120, { size: 16, col: rgba('ash', aA * s1) });
      label(ctx, 'LOOKS LIKE A DOMAIN', -640 + 44, -170 + 120, { size: 16, col: rgba('ash', aA * s2) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // ---- the URL, split into parts
    const uA = prog(t, L[n.split]!.start - 0.2, L[n.split]!.start + 0.3);
    const col = this.collapse(t);
    if (uA > 0.003 && col < 1) this.drawUrl(t, c, ctx, uA, col);
    // ---- the built-in list
    const kA = prog(t, L[n.list]!.start - 0.2, L[n.list]!.start + 0.3) * (1 - prog(t, w.ready.start - 0.2, w.ready.start + 0.2));
    if (kA > 0.003) {
      card(ctx, c, -430, -20, 860, 'Built into the browser · HSTS preload list', HSTS, prog(t, w.list.start, w.insecurely.end + 0.4) * HSTS.length, {
        a: kA, size: 25, lineCol: (i) => (i === HSTS.length - 1 ? rgba('ash', 0.8) : rgba('bone', 0.92)),
      });
    }
    // ---- the packet, ready, above the laptop
    if (col > 0.003) {
      drawStation(ctx, c, ST.laptop, col, prog(t, w.ready.end, w.ready.end + 0.4));
      const pa = prog(t, w.ready.end + 0.1, w.ready.end + 0.5);
      setWorld(ctx, c, 0, 0);
      label(ctx, 'GET  https://example.com/', PACKET.x, PACKET.y - 62, { size: 22, col: rgba('signal', pa), align: 'center' });
      label(ctx, 'ONE MORE CHECK BEFORE IT LEAVES', PACKET.x, PACKET.y - 34, { size: 15, col: rgba('ash', pa * prog(t, w.check.start, w.check.end + 0.2)), align: 'center' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  /** An address bar with typed text; `focus` shows the caret. */
  bar(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, text: string, k: number, a: number, focus: boolean) {
    if (a <= 0.003) return;
    setWorld(ctx, c, x, y);
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(0, 0, 720, 84, 42); ctx.fill();
    ctx.strokeStyle = rgba(focus ? 'signal' : 'ash', focus ? 0.7 : 0.45); ctx.lineWidth = 1.5 / c.z; ctx.stroke();
    ctx.font = font(MONO_F, 40); ctx.fillStyle = rgba('bone', 1);
    const s = text.slice(0, Math.ceil(text.length * k));
    ctx.fillText(s, 44, 56);
    if (focus) { ctx.fillStyle = rgba('signal', 1); ctx.fillRect(48 + ctx.measureText(s).width, 20, 4, 46); }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  arrow(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, k: number, a: number) {
    if (k <= 0.003) return;
    setWorld(ctx, c, x, y);
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba('ash', 0.9); ctx.lineWidth = 2.5 / c.z; ctx.lineCap = 'round';
    const L = 120 * k;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    if (k > 0.9) { ctx.beginPath(); ctx.moveTo(L - 14, -10); ctx.lineTo(L, 0); ctx.lineTo(L - 14, 10); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawUrl(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number, col: number) {
    const w = this.w, n = this.n;
    const split = prog(t, w.splits.start - 0.1, w.parts.end + 0.2, ease.outCubic);
    const widths = PARTS.map((p) => measure(p.s, MONO_F, URL_SZ));
    const gap = GAP * split;
    const total = widths.reduce((s, v) => s + v, 0) + gap * 2;
    // folding into the packet: shrink towards it
    const sc = lerp(1, 0.04, col), cx = lerp(0, PACKET.x, col), cy = lerp(URL_Y, PACKET.y, col);
    const said = [w.scheme, w.host, w.path];
    const lines = [n.scheme, n.host, n.path];
    // the scheme: ghostly while "you probably didn't type it", then green ("tried first")
    const ghost = prog(t, w.type.start - 0.1, w.type.end + 0.2) * (1 - prog(t, w.secure.start, w.secure.end + 0.2));
    const upgraded = prog(t, w.secure.start, w.secure.end + 0.2);
    let x = -total / 2;
    PARTS.forEach((p, i) => {
      setWorld(ctx, c, cx + x * sc, cy, sc);
      ctx.globalAlpha = a * (1 - prog(col, 0.7, 1));
      const hot = this.on(t, lines[i]!);
      const isScheme = i === 0;
      const base = isScheme && upgraded > 0 ? rgba('signal', 0.6 + 0.4 * upgraded) : rgba(hot > 0.5 ? 'signal' : 'bone', 1);
      ctx.font = font(MONO_F, URL_SZ);
      ctx.fillStyle = base;
      if (isScheme) ctx.globalAlpha *= 1 - 0.75 * ghost;
      ctx.fillText(p.s, 0, 0);
      if (isScheme && ghost > 0.01) {
        ctx.globalAlpha = a * ghost;
        ctx.setLineDash([10, 8]); ctx.strokeStyle = rgba('ash', 0.8); ctx.lineWidth = 2 / c.z;
        ctx.beginPath(); ctx.roundRect(-14, -URL_SZ * 0.82, widths[0]! + 28, URL_SZ * 1.08, 12); ctx.stroke(); ctx.setLineDash([]);
      }
      // the part's label, below, from when it is named
      const la = prog(t, said[i]!.start - 0.05, said[i]!.end + 0.15) * (1 - col);
      if (la > 0.003) {
        ctx.globalAlpha = a * la;
        ctx.fillStyle = rgba(hot > 0.5 ? 'signal' : 'graphite', 1); ctx.fillRect(0, 26, widths[i]!, 3);
        label(ctx, p.name, widths[i]! / 2, 80, { size: 26, col: rgba(hot > 0.5 ? 'signal' : 'ash', 1), align: 'center', weight: 600 });
        label(ctx, p.sub.toUpperCase(), widths[i]! / 2, 114, { size: 16, col: rgba('ash', 0.85), align: 'center' });
      }
      ctx.globalAlpha = 1;
      x += widths[i]! + gap;
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // "you typed" and "tried first"
    const yt = prog(t, w.type.start - 0.2, w.type.end) * (1 - col);
    if (yt > 0.003) {
      setWorld(ctx, c, -total / 2 + widths[0]! + gap, URL_Y - 120);
      label(ctx, 'YOU TYPED:', 0, 0, { size: 16, col: rgba('ash', a * yt) });
      ctx.font = font(MONO_F, 30); ctx.fillStyle = rgba('bone', a * yt); ctx.fillText('example.com', 170, 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    pill(ctx, c, -total / 2 + widths[0]! / 2, URL_Y - 130, 'TRIED FIRST', { a: a * upgraded * (1 - col), size: 20 });
  }

  override penScreen(t: number) {
    const k = prog(t, this.w.ready.end, this.w.ready.end + 0.4);
    return k > 0 ? w2s(this.cam.at(t), PACKET.x, PACKET.y) : null;
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const k = prog(t, this.w.ready.end - 0.1, this.w.ready.end + 0.4);
    if (k <= 0) return;
    const s = w2s(c, PACKET.x, PACKET.y), br = 1 + 0.15 * Math.sin(t * 5);
    X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 18 * k * br, [LIN.ember[0] * 3, LIN.ember[1] * 3, LIN.ember[2] * 3], clamp(k));
    X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 44 * k, [LIN.signal[0] * 0.6, LIN.signal[1] * 0.6, LIN.signal[2] * 0.6], clamp(k) * 0.6);
  }
}
