// ROLE — "A frontend developer builds the part you see: everything that happens inside your browser."
// In from SIDES' expanding box, which shrinks onto the title: "A" / FRONTEND / DEVELOPER slam in narrow
// Archivo, high above the page's slot. On "builds" the camera whips down to the slot and the cursor
// builds the page, inspecting each element as it lays it down (nav, h1, p, img, button, list).
// "everything that happens inside your browser." sets itself on the right; on "inside your browser"
// the cursor draws the browser round the page and its address types. The page ends in its slot, where
// the HTML / CSS / JS plates pick it up.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba } from '../../engine/palette';
import { clamp, ease, lerp, prog, pulse } from '../../engine/util';
import { setWorld, w2s, type Cam } from '../../scenes/_vo';
import { FeScene, PAGE, CODE, HEAD_Y, SLAM } from '../_base';
import { drawPage, drawBrowser, pick, pageRects, perim, cardsBox, CHROME, TAGS } from '../_fe';
import { inspect, drawCrosshair, expandBox, screenRect } from '../_inspect';

const TY = -1180; // the title's height in the world, above the page

export default class Role extends FeScene {
  q = 'A frontend developer';
  w: Record<string, Word> = {};
  /** When each element is built. */
  tb: number[] = [];

  setup() {
    const w = (this.w = pick(this.L, ['a', 'frontend', 'developer', 'builds', 'see', 'everything', 'happens', 'inside', 'your', 'browser']));
    this.say([w.a], -840, TY - 250, 64, 'title');
    this.say([w.frontend], -850, TY - 30, 250, 'title', { fam: SLAM, done: 'signal' });
    this.say([w.developer], -850, TY + 220, 250, 'title', { fam: SLAM });
    this.say(this.span(w.builds, w.see), PAGE.x, HEAD_Y - 6, 44, 'builds');
    this.say(this.span(w.everything, w.browser), CODE.x + 30, -150, 74, 'every', { maxW: 720, lead: 1.02 });
    const t0 = w.builds.start + 0.45, t1 = w.see.end + 0.2;
    this.tb = [0, 1, 2, 3, 4, 5].map((i) => lerp(t0, t1, i / 6));
    this.cam
      .key(this.ctx.start, -200, TY, 0.9)
      .key(w.developer.start, -170, TY + 30, 0.94, 0, ease.linear)
      .key(w.builds.start - 0.05, -150, TY + 60, 0.97, 0, ease.linear)
      .key(w.builds.start + 0.55, -20, 20, 1.0, 0.0, ease.inOutExpo)
      .key(w.see.end, -10, 10, 1.03, 0, ease.linear)
      .key(w.everything.start + 0.3, 40, 0, 0.98, 0, ease.inOutCubic)
      .key(this.ctx.end, 0, 0, 1.0, 0, ease.inOutCubic);
  }
  override kAlpha(g: string, t: number) {
    const w = this.w;
    if (g === 'every') return 1 - prog(t, this.ctx.end - 0.45, this.ctx.end - 0.1);
    if (g === 'builds') return 1 - prog(t, this.ctx.end - 0.45, this.ctx.end - 0.1);
    void w;
    return 1;
  }
  frameK(t: number) { return prog(t, this.w.inside.start - 0.1, this.w.browser.end, ease.inOutCubic); }
  /** Which element the cursor is building / inspecting, as a fractional index. */
  buildAt(t: number) {
    for (let i = this.tb.length - 1; i >= 0; i--) if (t >= this.tb[i]!) return i + clamp((t - this.tb[i]!) / 0.3);
    return -1;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w;
    const on = this.tb.map((tb) => ease.outCubic(prog(t, tb, tb + 0.3)));
    if (on[0]! > 0) {
      setWorld(ctx, c, PAGE.x, PAGE.y);
      drawPage(ctx, c.z, PAGE.w, PAGE.h, { on, t });
      const { el, cards } = pageRects(PAGE.w, PAGE.h);
      const boxes = [...el, cardsBox(cards)];
      // each element is inspected as it is laid down, then the box lets go
      boxes.forEach((r, i) => {
        const tb = this.tb[i]!, nx = this.tb[i + 1] ?? tb + 0.45;
        const k = prog(t, tb, tb + 0.28), out = 1 - prog(t, nx + 0.05, nx + 0.3);
        if (out <= 0) return;
        inspect(ctx, c.z, r, k, { tag: TAGS[i]!.replace(/[<>]/g, ''), meta: `${Math.round(r.w)} × ${Math.round(r.h)}`, padding: i === 4 ? 10 : 0, content: true }, out);
      });
      if (this.frameK(t) > 0) drawBrowser(ctx, c.z, PAGE.w, PAGE.h, { draw: this.frameK(t), typed: prog(t, w.your.start, w.browser.end + 0.2) });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    // SIDES' expanding box comes down onto the title
    const u = prog(t, this.ctx.start, this.ctx.start + 0.45);
    if (u < 1) expandBox(ctx, screenRect(c, -870, TY - 330, 1500, 700), 1 - u, 1 - u * 0.4);
  }
  cursorAt(t: number): [number, number] | null {
    const w = this.w;
    const b = this.buildAt(t);
    if (b >= 0 && t < w.inside.start - 0.1) {
      const { el, cards } = pageRects(PAGE.w, PAGE.h);
      const boxes = [...el, cardsBox(cards)];
      const i = Math.min(5, Math.floor(b)), k = b - Math.floor(b);
      const r = boxes[i]!, p = boxes[Math.max(0, i - 1)]!;
      // along the new element's top edge, from where the last one ended
      return [PAGE.x + lerp(p.x + p.w, r.x, ease.inOutCubic(Math.min(1, k * 2))) + r.w * clamp(k * 2 - 1) , PAGE.y + lerp(p.y, r.y, ease.inOutCubic(Math.min(1, k * 2)))];
    }
    const fk = this.frameK(t);
    if (fk > 0 && fk < 1) return perim(PAGE.x, PAGE.y - CHROME, PAGE.w, PAGE.h + CHROME, fk);
    return null;
  }
  override penScreen(t: number) { const p = this.cursorAt(t); return p ? w2s(this.cam.at(t), p[0], p[1]) : null; }
  override drawFx(t: number, _c: Cam, X: LineBatch) {
    drawCrosshair(X, t, (tt) => this.penScreen(tt), { scale: 0.85 });
  }
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.025 * pulse(t, w.frontend.start, 0.09) + 0.025 * pulse(t, w.developer.start, 0.09), ca: 1.2 + 4 * pulse(t, w.builds.start + 0.25, 0.12) };
  }
}
