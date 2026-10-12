// API — "And they connect the page to the backend, fetching data through APIs and showing it on the screen."
// In from SCREENS, close on the page. "And they connect the page to the backend,": the camera pulls back as
// the cursor lays a wire from the page to the server, an API node in the middle. "fetching data": a GET
// request rides out (the camera follows it), the cards turn to spinners and a row opens in the Network
// panel below; "through APIs": the node lights and the JSON rides back; "and showing it on the screen.":
// the camera returns to the page as the cards fill in, the row's waterfall completes (200, 84 ms). The
// page's box expands into the OUTRO.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba } from '../../engine/palette';
import { F, font, measure } from '../../engine/type';
import { hash, lerp, prog, pulse, TAU, ease } from '../../engine/util';
import { setWorld, label, w2s, type Cam } from '../../scenes/_vo';
import { FeScene } from '../_base';
import { drawPage, drawBrowser, pick, pageRects, cardsBox, CHROME } from '../_fe';
import { inspect, drawCrosshair, expandBox, screenRect } from '../_inspect';

const PG = { x: -900, y: -250, w: 640, h: 400 };
const SV = { x: 420, y: -300, w: 440, h: 420 };
const NET = { x: -900, y: 250, w: 1760, h: 150 };
const WY = -50, AX = 80, X0 = PG.x + PG.w + 10, X1 = SV.x - 10;

export default class Api extends FeScene {
  q = 'And they connect';
  w: Record<string, Word> = {};

  setup() {
    const w = (this.w = pick(this.L, ['and', 'connect', 'page', 'backend', 'fetching', 'data', 'through', 'apis', ['and2', 'and', 1], 'showing', 'screen']));
    this.say(this.span(w.and, w.backend), PG.x, -400, 54, 'a', { maxW: 1700 });
    this.say(this.span(w.fetching, w.data), AX, WY - 110, 40, 'f', { align: 'center' });
    this.say(this.span(w.through, w.apis), AX, WY + 150, 40, 't', { align: 'center' });
    this.say(this.span(w.and2, w.screen), PG.x, PG.y + PG.h + 64, 40, 's');
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, PG.x + PG.w / 2, PG.y + PG.h / 2, 1.5)
      .key(w.connect.start, PG.x + PG.w / 2, PG.y + PG.h / 2 - 20, 1.42, 0, ease.linear)
      .key(w.backend.end, -20, -40, 0.96, 0, ease.inOutCubic)
      .key(w.data.start, 40, -40, 1.02, 0, ease.inOutCubic)
      .key(w.apis.start + 0.2, 80, -30, 1.06, 0, ease.inOutCubic)
      .key(w.showing.start + 0.2, -340, 20, 1.02, 0, ease.inOutCubic)
      .key(end - 0.45, -330, 20, 1.04, 0, ease.linear)
      .key(end - 0.02, PG.x + PG.w / 2, PG.y + PG.h / 2, 1.9, 0, ease.inOutCubic);
  }
  wireK(t: number) { return prog(t, this.w.connect.start, this.w.backend.end, ease.inOutCubic); }
  req(t: number) { return prog(t, this.w.fetching.start, this.w.through.end, ease.inOutCubic); }
  res(t: number) { return prog(t, this.w.apis.start + 0.1, this.w.showing.start + 0.15, ease.inOutCubic); }
  override kAlpha(_g: string, t: number) { return 1 - prog(t, this.ctx.end - 0.45, this.ctx.end - 0.15); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w;
    const loading = prog(t, w.fetching.start, w.fetching.start + 0.15);
    const data = prog(t, w.showing.start + 0.1, w.showing.start + 0.5);
    // the page
    setWorld(ctx, c, PG.x, PG.y);
    drawPage(ctx, c.z, PG.w, PG.h, { t, data: loading > 0 ? data : 1, loading: loading * (1 - data) });
    drawBrowser(ctx, c.z, PG.w, PG.h, {});
    const { cards } = pageRects(PG.w, PG.h);
    const sh = prog(t, w.showing.start + 0.1, w.showing.start + 0.5) * (1 - prog(t, this.ctx.end - 0.6, this.ctx.end - 0.4));
    if (sh > 0) inspect(ctx, c.z, cardsBox(cards), prog(t, w.showing.start + 0.1, w.showing.start + 0.55), { tag: 'ul.posts', meta: 'rendered from JSON', content: true }, sh);
    // the server
    setWorld(ctx, c, SV.x, SV.y);
    ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(0, 0, SV.w, SV.h, 14); ctx.fill();
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1.2 / c.z; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const ry = 30 + i * 66;
      ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1 / c.z; ctx.strokeRect(30, ry, SV.w - 60, 48);
      const busy = this.req(t) > 0.85 && this.res(t) < 0.2;
      for (let k = 0; k < 3; k++) {
        const on = hash(i, k, Math.floor(t * (busy ? 18 : 6))) > 0.45;
        ctx.fillStyle = rgba(on ? 'signal' : 'blood', on ? 1 : 0.5); ctx.beginPath(); ctx.arc(SV.w - 110 + k * 22, ry + 24, 4.5, 0, TAU); ctx.fill();
      }
      for (let k = 0; k < 5; k++) { ctx.fillStyle = rgba('graphite', 0.7); ctx.fillRect(56 + k * 28, ry + 16, 14, 16); }
    }
    ctx.font = font(F.mono(400), 16); ctx.fillStyle = rgba('ash', 0.9);
    ctx.fillText('SELECT * FROM posts;', 34, SV.h - 40);
    label(ctx, 'BACKEND · api.pixel.dev', 0, -18, { size: 15, col: rgba('ash', 1) });
    // the API node
    const na = prog(t, w.connect.start + 0.4, w.connect.start + 0.6);
    if (na > 0) {
      const lit = prog(t, w.apis.start, w.apis.start + 0.1) * (1 - prog(t, w.apis.end + 0.4, w.apis.end + 0.8));
      setWorld(ctx, c, AX, WY);
      ctx.globalAlpha = na;
      ctx.fillStyle = lit > 0 ? rgba('signal', 0.2 + 0.8 * lit) : rgba('ink2', 1); ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 2.4 / c.z; ctx.stroke();
      ctx.font = font(F.mono(700), 24); ctx.fillStyle = rgba(lit > 0.5 ? 'ink' : 'bone', 1); ctx.textAlign = 'center'; ctx.fillText('API', 0, 8); ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      label(ctx, '/api/posts', 0, 84, { size: 14, col: rgba('ash', na), align: 'center' });
    }
    // the request and the response
    const rq = this.req(t), rs = this.res(t);
    if (rq > 0 && rq < 1) this.pill(ctx, c, lerp(X0 + 100, X1 - 100, rq), WY - 56, 'GET /api/posts', 'bone', 'ink');
    if (rs > 0 && rs < 1) this.pill(ctx, c, lerp(X1 - 120, X0 + 120, rs), WY + 56, '{ "posts": [ … ] }', 'signal', 'ink');
    this.network(ctx, c, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** The DevTools Network panel: the request's row and its waterfall. */
  network(ctx: CanvasRenderingContext2D, c: Cam, t: number) {
    const w = this.w, a = prog(t, w.fetching.start - 0.1, w.fetching.start + 0.25);
    if (a <= 0) return;
    setWorld(ctx, c, NET.x, NET.y);
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba('ink2', 0.95); ctx.beginPath(); ctx.roundRect(0, 0, NET.w, NET.h, 10); ctx.fill();
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1 / c.z; ctx.stroke();
    const cols = [['NAME', 24], ['STATUS', 420], ['TYPE', 560], ['SIZE', 700], ['TIME', 840], ['WATERFALL', 1000]] as const;
    for (const [h, x] of cols) label(ctx, h, x, 34, { size: 12, col: rgba('graphite', 1) });
    ctx.fillStyle = rgba('graphite', 0.6); ctx.fillRect(0, 48, NET.w, 1 / c.z);
    const done = this.res(t) >= 1 || t > w.showing.start + 0.2;
    const rows: [string, string, string, string, string, number, number, boolean][] = [
      ['index.html', '200', 'document', '4.1 kB', '22 ms', 0, 0.12, true],
      ['posts', done ? '200' : '(pending)', 'fetch', done ? '1.2 kB' : '—', done ? '84 ms' : '…', 0.18, this.req(t) * 0.5 + this.res(t) * 0.5, false],
    ];
    rows.forEach(([n, st, ty, sz, tm, x0, k, old], i) => {
      const y = 82 + i * 38;
      ctx.font = font(F.mono(old ? 400 : 600), 17);
      ctx.fillStyle = rgba(old ? 'ash' : 'bone', 1); ctx.fillText(n, 24, y);
      ctx.fillStyle = rgba(st === '200' ? (old ? 'ash' : 'signal') : 'ash', 1); ctx.fillText(st, 420, y);
      ctx.fillStyle = rgba('ash', 1); ctx.fillText(ty, 560, y); ctx.fillText(sz, 700, y); ctx.fillText(tm, 840, y);
      const wx = 1000, ww = NET.w - wx - 30;
      ctx.fillStyle = rgba(old ? 'graphite' : 'signal', old ? 0.8 : 0.9);
      ctx.fillRect(wx + ww * x0, y - 12, Math.max(2, ww * 0.7 * k), 12);
    });
    ctx.globalAlpha = 1;
    void measure;
  }

  pill(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, s: string, bg: string, fg: string) {
    const tw = measure(s, F.mono(600), 20) + 36;
    setWorld(ctx, c, x - tw / 2, y - 22);
    ctx.fillStyle = rgba(bg, 1); ctx.beginPath(); ctx.roundRect(0, 0, tw, 44, 22); ctx.fill();
    ctx.font = font(F.mono(600), 20); ctx.fillStyle = rgba(fg, 1); ctx.fillText(s, 18, 29);
  }
  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const u = prog(t, this.ctx.start, this.ctx.start + 0.4);
    if (u < 1) expandBox(ctx, screenRect(c, PG.x, PG.y - CHROME, PG.w, PG.h + CHROME), 1 - u, 1 - u * 0.4);
    const d = prog(t, this.ctx.end - 0.45, this.ctx.end);
    if (d > 0) expandBox(ctx, screenRect(c, PG.x, PG.y - CHROME, PG.w, PG.h + CHROME), d);
  }
  override penScreen(t: number) {
    const k = this.wireK(t);
    return k > 0 && k < 1 ? w2s(this.cam.at(t), lerp(X0, X1, k), WY) : null;
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const wk = this.wireK(t);
    if (wk > 0 && t < this.ctx.end - 0.45) {
      const xe = lerp(X0, X1, wk), n = Math.floor((xe - X0) / 18);
      for (let i = 0; i < n; i++) {
        const xa = X0 + i * 18, xb = xa + 10;
        if (Math.abs((xa + xb) / 2 - AX) < 56) continue; // not across the API node
        const [ax, ay] = w2s(c, xa, WY), [bx, by] = w2s(c, xb, WY);
        X.seg2(ax, ay, bx, by, 2.2, [0.5, 0.55, 0.62], 0.85);
      }
      const rq = this.req(t), rs = this.res(t);
      for (const [k, on] of [[rq, rq > 0 && rq < 1], [1 - rs, rs > 0 && rs < 1]] as const) {
        if (!on) continue;
        const [px, py] = w2s(c, lerp(X0, X1, k), WY);
        X.seg2(px - 30, py, px + 30, py, 5, [0.4, 1.6, 2.4], 1);
      }
    }
    drawCrosshair(X, t, (tt) => this.penScreen(tt), { scale: 0.85 });
  }
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.01 * pulse(t, w.backend.start, 0.08) + 0.014 * pulse(t, w.apis.start, 0.1) + 0.01 * pulse(t, w.showing.start + 0.1, 0.1) };
  }
}
