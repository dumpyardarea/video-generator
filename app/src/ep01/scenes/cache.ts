// CACHE (chapter 2, "Do we already have it?") — "First, a service worker, if the site has installed one … Then the
// browser's cache … If the answer is yes, the browser can skip almost everything that follows … For now, a first
// visit. Nothing is cached. The packet has to go out."
// The packet waits above the laptop between two checks: the service worker and the HTTP cache, each card typing in
// as it is described. On "if the answer is yes" the cache shows a hit and the stages it would skip are struck out;
// then the measured cost of a first visit against an immediate reload (demo/). On "a first visit" both checks
// fail, and the packet leaves for the home router; the camera follows it there, where DNS begins.
import type { Word } from '../../engine/lyrics';
import { ease, prog } from '../../engine/util';
import type { Cam } from '../../scenes/_vo';
import { EpScene, ST, arc, along, drawStation, drawRoute, drawPacket, pill, card, check, font, rgba, label, setWorld, w2s, F, LIN } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const PACKET = { x: 0, y: -120 };
const HOP = arc(PACKET, ST.router, 0.12);
const SW = { x: -860, y: -330, w: 680 }, HC = { x: 180, y: -330, w: 680 };
const SKIP = ['DNS', 'TCP', 'TLS', 'HTTP'];

export default class Cache extends EpScene {
  q = 'First, a service worker';
  w: Record<string, Word> = {};

  setup() {
    const g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      service: g('First, a service worker', 'service'), installed: g('First, a service worker', 'installed'),
      script: g('small script that can answer', 'script'), offline: g('small script that can answer', 'offline'),
      cache: g('Then the browser\'s cache', 'cache'), keep: g('Then the browser\'s cache', 'keep'),
      yes: g('If the answer is yes', 'yes'), everything: g('If the answer is yes', 'everything'),
      every: g('sites you visit every day', 'every'), faster: g('sites you visit every day', 'faster'),
      first: g('For now, a first visit', 'first'), nothing: g('For now, a first visit', 'nothing'), out: g('For now, a first visit', 'out'),
    };
    for (const l of this.lines) this.say(l.words, -880, 380, 46, `line:${l.i}`, { maxW: 1760 });
    const w = this.w, end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 0, -30, 1.0)
      .key(w.nothing.end, 0, -40, 1.02, 0, ease.linear)
      .key(end - 0.05, ST.router.x, ST.router.y, 0.92, 0, ease.inOutCubic);
  }
  /** The hit/skip demonstration, lines "If the answer is yes" and "sites you visit every day". */
  hit(t: number) { const w = this.w; return prog(t, w.yes.start - 0.1, w.yes.end + 0.2) * (1 - prog(t, w.first.start - 0.3, w.first.start + 0.1)); }
  miss(t: number) { const w = this.w; return prog(t, w.nothing.start - 0.1, w.nothing.end + 0.2); }
  leave(t: number) { const w = this.w; return prog(t, w.out.start - 0.6, this.ctx.end - 0.15, ease.inOutCubic); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, hit = this.hit(t), miss = this.miss(t), lv = this.leave(t);
    const cardsA = 1 - prog(t, w.out.start - 0.2, w.out.start + 0.6);
    drawStation(ctx, c, ST.laptop, 1, 1 - 0.7 * lv);
    drawStation(ctx, c, ST.router, prog(t, w.out.start - 0.6, w.out.start), prog(t, this.ctx.end - 0.5, this.ctx.end - 0.15));
    // ---- the two checks
    const swk = prog(t, w.service.start - 0.2, w.offline.end + 0.3) * 3;
    const sa = prog(t, w.service.start - 0.4, w.service.start) * cardsA;
    const swH = card(ctx, c, SW.x, SW.y, SW.w, '1 · Service worker', ['a small script the site installs', 'can answer requests itself', 'works even offline'], swk, { a: sa, hot: 0 });
    const hck = prog(t, w.cache.start - 0.2, w.keep.end + 0.3) * 3;
    const ha = prog(t, w.cache.start - 0.5, w.cache.start - 0.1) * cardsA;
    card(ctx, c, HC.x, HC.y, HC.w, '2 · HTTP cache', ['have I loaded this recently?', 'did the server say I could keep it?', 'Cache-Control: max-age=…'], hck, {
      a: ha, hot: hit, lineCol: (i) => (i === 2 ? rgba('ash', 0.9) : rgba('bone', 0.92)),
    });
    // results: pending dots, the cache's hypothetical hit, then both miss
    const ry = SW.y + swH + 56;
    if (sa > 0.003) {
      setWorld(ctx, c, 0, 0);
      if (miss <= 0.01) label(ctx, 'CHECKING …', SW.x + 24, ry, { size: 16, col: rgba('ash', sa * prog(t, w.installed.start, w.installed.end + 0.3)) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      check(ctx, c, SW.x + 24, ry, 'none installed for this site', false, miss, 28, cardsA);
    }
    if (ha > 0.003) {
      if (hit > 0.003) check(ctx, c, HC.x + 24, ry, 'hit: a fresh copy is here', true, hit, 28, cardsA);
      else if (miss <= 0.01) { setWorld(ctx, c, 0, 0); label(ctx, 'CHECKING …', HC.x + 24, ry, { size: 16, col: rgba('ash', ha) }); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      check(ctx, c, HC.x + 24, ry, 'miss: a first visit', false, miss, 28, cardsA);
    }
    // ---- what a hit skips
    const sk = hit * (1 - prog(t, w.every.start - 0.2, w.every.start + 0.2));
    if (sk > 0.003) {
      SKIP.forEach((s, i) => {
        const x = -330 + i * 220, k = prog(t, w.yes.end + i * 0.12, w.yes.end + i * 0.12 + 0.3);
        pill(ctx, c, x, 220, s, { a: sk * k, col: 'ash', outline: true, size: 28 });
        const st = prog(t, w.everything.start + i * 0.1, w.everything.start + i * 0.1 + 0.25, ease.outCubic);
        if (st > 0) { setWorld(ctx, c, x, 220); ctx.globalAlpha = sk; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 4 / c.z; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-70 + 140 * st, 0); ctx.stroke(); ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); }
      });
      setWorld(ctx, c, 0, 0);
      label(ctx, 'SKIPPED', 0, 290, { size: 16, col: rgba('signal', sk * prog(t, w.everything.end, w.everything.end + 0.3)), align: 'center' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // ---- measured: first visit against an immediate reload
    const ma = prog(t, w.every.start - 0.2, w.every.start + 0.3) * (1 - prog(t, w.first.start - 0.3, w.first.start + 0.1));
    if (ma > 0.003) this.bars(t, c, ctx, ma);
  }

  bars(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number) {
    const w = this.w, x0 = -620, full = 1240;
    const rows: [string, number, string][] = [['FIRST VISIT', 0.786, 'bone'], ['RELOAD, STRAIGHT AWAY', 0.3, 'signal']];
    setWorld(ctx, c, 0, 0);
    ctx.globalAlpha = a;
    rows.forEach(([name, s, col], i) => {
      const y = 196 + i * 62, k = prog(t, w.every.start + i * 0.35, w.faster.end + i * 0.2, ease.outCubic);
      label(ctx, name, x0, y - 14, { size: 15, col: rgba('ash', 1) });
      ctx.fillStyle = rgba('graphite', 0.5); ctx.fillRect(x0, y, full, 18);
      ctx.fillStyle = rgba(col, 0.95); ctx.fillRect(x0, y, full * (s / 0.8) * k, 18);
      ctx.font = font(F.mono(600), 26); ctx.fillStyle = rgba(col, k); ctx.textAlign = 'left';
      ctx.fillText(`${(s * k).toFixed(2)} s`, x0 + full * (s / 0.8) * k + 18, y + 18);
    });
    label(ctx, 'MEASURED · EN.WIKIPEDIA.ORG · PAGE LOADED', x0 + full, 300, { size: 13, col: rgba('ash', 0.8), align: 'right' });
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  packetU(t: number) { return this.leave(t); }
  override penScreen(t: number) {
    const u = this.packetU(t), q = u > 0 ? along(HOP, u) : PACKET;
    return w2s(this.cam.at(t), q.x, q.y);
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const u = this.packetU(t);
    if (u > 0.001) drawRoute(X, c, HOP, u, prog(t, this.w.out.start - 0.6, this.w.out.start));
    if (u > 0.001 && u < 0.999) { drawPacket(X, c, HOP, u, { trail: 0.12, size: 1.6 }); return; }
    const q = u >= 0.999 ? ST.router : PACKET;
    const s = w2s(c, q.x, q.y), br = 1 + 0.15 * Math.sin(t * 5);
    X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 18 * br, [LIN.ember[0] * 3, LIN.ember[1] * 3, LIN.ember[2] * 3], 1);
    X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 44, [LIN.signal[0] * 0.6, LIN.signal[1] * 0.6, LIN.signal[2] * 0.6], 0.6);
  }
}
