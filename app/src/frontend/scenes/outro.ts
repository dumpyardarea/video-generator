// OUTRO — "So: HTML for structure, CSS for style, JavaScript for behavior. That's frontend development."
// In from API's page. The page comes apart into an exploded view, one layer per language, each lifting in on
// its name with its job set beside it: HTML (the raw structure, tags showing) at the bottom, CSS (the
// styled page) above it, JavaScript (the menu open, the toast, the pointer) on top. On "That's" the layers
// press together into one flat page and "frontend development." lands under it. Then everything clears to
// the first frame of the video — the crosshair alone on the dot grid — so the end loops into the start.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba } from '../../engine/palette';
import { ease, lerp, prog, pulse } from '../../engine/util';
import { setWorld, label, w2s, type Cam } from '../../scenes/_vo';
import { FeScene, SLAM } from '../_base';
import { drawPage, drawCursor, pick } from '../_fe';
import { drawCrosshair, expandBox, screenRect } from '../_inspect';

const PW = 900, PH = 540;
// the tilted plane of the exploded view (x right, y back), and the gap between layers
const TILT = [0.92, -0.18, 0.42, 0.62] as const;
const GAP = 175;
const BASE = { x: -330, y: 170 };
const FLAT = { x: -PW / 2, y: -330 };

export default class Outro extends FeScene {
  q = 'So: HTML for structure';
  w: Record<string, Word> = {};

  setup() {
    const w = (this.w = pick(this.L, ['so', 'html', 'structure', 'css', 'style', 'javascript', 'behavior', 'thats', 'frontend', 'development']));
    const ly = (i: number) => BASE.y - i * GAP + 86;
    this.say(this.span(w.html, w.structure), -900, ly(0) + 16, 50, 'l');
    this.say(this.span(w.css, w.style), -900, ly(1) + 16, 50, 'l');
    this.say(this.span(w.javascript, w.behavior), -900, ly(2) + 16, 50, 'l');
    this.say([w.thats], FLAT.x, FLAT.y + PH + 90, 46, 't');
    this.say([w.frontend, w.development], FLAT.x, FLAT.y + PH + 200, 124, 't', { fam: SLAM, done: 'bone' });
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, BASE.x + 500, BASE.y + 90, 1.3)
      .key(w.html.start + 0.3, -160, 120, 1.05, 0, ease.inOutCubic)
      .key(w.css.start + 0.3, -170, 20, 1.0, 0, ease.inOutCubic)
      .key(w.javascript.start + 0.3, -180, -60, 0.96, 0, ease.inOutCubic)
      .key(w.thats.start, -190, -60, 0.95, 0, ease.linear)
      .key(w.development.end, 0, 30, 0.86, 0, ease.inOutCubic)
      .key(end - 1.0, 0, 30, 0.88, 0, ease.linear)
      // back to the first frame of the video
      .key(end - 0.05, 0, 0, 1.7, 0, ease.inOutCubic);
  }
  /** Each layer's rise (0..1) on its name. */
  rise(i: number, t: number) { const wd = [this.w.html, this.w.css, this.w.javascript][i]!; return ease.outCubic(prog(t, wd.start - 0.1, wd.start + 0.45)); }
  flat(t: number) { return ease.inOutCubic(prog(t, this.w.thats.start - 0.05, this.w.frontend.start + 0.25)); }
  clear(t: number) { return prog(t, this.ctx.end - 1.0, this.ctx.end - 0.4); }
  override kAlpha(g: string, t: number) {
    const c = 1 - this.clear(t);
    if (g === 'l') return c * (1 - this.flat(t));
    return c;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const fl = this.flat(t), cl = 1 - this.clear(t);
    if (cl <= 0) return;
    for (let i = 0; i < 3; i++) {
      const r = this.rise(i, t);
      if (r <= 0) continue;
      // tilted and spread apart → flat and stacked into one page
      const ex = BASE.x, ey = BASE.y - i * GAP * r;
      const x = lerp(ex, FLAT.x, fl), y = lerp(ey, FLAT.y, fl);
      setWorld(ctx, c, x, y);
      const [a, b, cc, d] = TILT.map((v, k) => lerp(v, k === 0 || k === 3 ? 1 : 0, fl)) as [number, number, number, number];
      ctx.transform(a, b, cc, d, 0, 0);
      const alpha = r * cl * (fl > 0 && i < 2 ? 1 - fl : 1);
      if (i === 0) drawPage(ctx, c.z, PW, PH, { color: 0, font: 0, space: 0, layout: 0, tags: 0.7, alpha, t });
      if (i === 1) drawPage(ctx, c.z, PW, PH, { alpha: alpha * 0.96, t });
      if (i === 2) {
        drawPage(ctx, c.z, PW, PH, { alpha, t, menu: 1 - fl, toast: 1 - fl });
        ctx.save(); ctx.translate(752, 40); drawCursor(ctx, c.z, alpha * (1 - fl)); ctx.restore();
      }
      // the layer's edge, so the stack reads as sheets
      ctx.strokeStyle = rgba(i === 2 ? 'signal' : 'graphite', 0.9 * alpha); ctx.lineWidth = 1.6 / c.z;
      ctx.strokeRect(0, 0, PW, PH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (fl < 0.5 && r > 0.5) {
        setWorld(ctx, c, -900, BASE.y - i * GAP + 86 + 52);
        label(ctx, ['<html> · the markup', 'style.css · the look', 'app.js · the behaviour'][i]!, 0, 0, { size: 14, col: rgba('ash', (1 - fl * 2) * cl) });
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const u = prog(t, this.ctx.start, this.ctx.start + 0.4);
    if (u < 1) expandBox(ctx, screenRect(c, BASE.x, BASE.y, PW, PH * 0.7), 1 - u, 1 - u * 0.4);
  }
  /** The crosshair returns to the centre for the last frame (= the first frame). */
  override penScreen(t: number) {
    const k = prog(t, this.ctx.end - 0.9, this.ctx.end - 0.1, ease.inOutCubic);
    if (k <= 0) return null;
    const c = this.cam.at(t);
    return w2s(c, lerp(380, 0, k), lerp(240, 0, k));
  }
  override drawFx(t: number, _c: Cam, X: LineBatch) { drawCrosshair(X, t, (tt) => this.penScreen(tt), { trail: false }); }
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.012 * (pulse(t, w.html.start, 0.08) + pulse(t, w.css.start, 0.08) + pulse(t, w.javascript.start, 0.08)) + 0.02 * (pulse(t, w.frontend.start, 0.1) + pulse(t, w.development.start, 0.1)) };
  }
}
