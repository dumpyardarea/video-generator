// SIDES — "Every website you have ever used has two sides: the part you see, and the part you don't."
// The first frame: the inspector's crosshair alone on the dot grid (the last frame is the same, so the
// video loops). "Every website you have ever used": the camera pulls back while the cursor drags out a
// marquee that becomes a browser window, a finished page fading into it; the sentence sets itself above.
// "has two sides:" lands big. On "sides" the page slides left and the backend slides out from behind it.
// "the part you see," — the page is inspected (selection box, chip); "and the part you don't." — the
// backend frosts over. Then the camera dives into the page and its box expands into the next plate.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba } from '../../engine/palette';
import { F, font } from '../../engine/type';
import { clamp, ease, hash, lerp, prog, pulse, TAU } from '../../engine/util';
import { setWorld, label, w2s, type Cam } from '../../scenes/_vo';
import { FeScene, SLAM } from '../_base';
import { drawPage, drawBrowser, pick, CHROME } from '../_fe';
import { inspect, drawCrosshair, expandBox, screenRect } from '../_inspect';

const PW = 860, PH = 470, TOP = -230;

export default class Sides extends FeScene {
  q = 'Every website';
  w: Record<string, Word> = {};

  setup() {
    const w = (this.w = pick(this.L, ['every', 'website', 'used', 'has', 'two', 'sides', ['part1', 'part', 0], 'see', 'and', ['part2', 'part', 1], 'dont']));
    this.say(this.span(w.every, w.used), -PW / 2, TOP - CHROME - 150, 46, 'r1');
    this.say(this.span(w.has, w.sides), -PW / 2, TOP - CHROME - 40, 104, 'r2', { fam: SLAM, done: 'bone' });
    this.say(this.span(this.L.words[w.part1.index - 1]!, w.see), -PW - 30, TOP + PH + 90, 50, 'r3');
    this.say(this.span(w.and, w.dont), 30, TOP + PH + 90, 50, 'r4', { done: 'ash' });
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 0, 0, 1.7)
      .key(w.every.start, 0, 0, 1.7)
      // pull back fast enough that the sentence above the window is in frame as it is said
      .key(w.website.start + 0.1, -60, -250, 1.3, 0, ease.inOutCubic)
      .key(w.used.end + 0.1, 0, -150, 1.0, 0, ease.inOutCubic)
      .key(w.sides.start, 0, -150, 0.98, 0, ease.linear)
      .key(w.sides.end + 0.45, 0, -110, 0.92, 0, ease.inOutCubic)
      .key(w.dont.end, 0, -100, 0.93, 0, ease.linear)
      // the dive into the page
      .key(end - 0.05, -PW / 2 - 30, TOP + PH / 2, 1.9, 0, ease.inOutCubic);
  }
  /** The marquee: 0 → 1 as the cursor drags the window out. */
  drag(t: number) { return prog(t, this.w.website.start - 0.1, this.w.used.end, ease.inOutCubic); }
  split(t: number) { return ease.inOutCubic(prog(t, this.w.sides.start - 0.1, this.w.sides.end + 0.35)); }
  dive(t: number) { return prog(t, this.ctx.end - 0.5, this.ctx.end); }

  override kAlpha(g: string, t: number) {
    const d = 1 - prog(t, this.ctx.end - 0.6, this.ctx.end - 0.3);
    return g === 'r1' ? d * (1 - 0.5 * prog(t, this.w.has.start, this.w.has.start + 0.3)) : d;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, s = this.split(t), dg = this.drag(t);
    const fx = lerp(-PW / 2, -PW - 30, s), bx = lerp(-PW / 2, 30, s);
    // the backend, behind the page
    if (s > 0.001) { setWorld(ctx, c, bx, TOP); this.backend(ctx, c, t, s); }
    // the marquee becoming the window
    if (dg > 0 && dg < 1) {
      setWorld(ctx, c);
      ctx.strokeStyle = rgba('signal', 0.9); ctx.lineWidth = 1.4 / c.z; ctx.setLineDash([8 / c.z, 6 / c.z]);
      ctx.strokeRect(-PW / 2, TOP - CHROME, PW * dg, (PH + CHROME) * dg);
      ctx.setLineDash([]);
      ctx.fillStyle = rgba('signal', 0.05); ctx.fillRect(-PW / 2, TOP - CHROME, PW * dg, (PH + CHROME) * dg);
      label(ctx, `${Math.round(1280 * dg)} × ${Math.round(800 * dg)}`, -PW / 2 + PW * dg + 10, TOP - CHROME + (PH + CHROME) * dg + 20, { size: 13, col: rgba('signal', 0.9) });
    }
    if (dg >= 1) {
      setWorld(ctx, c, fx, TOP);
      drawPage(ctx, c.z, PW, PH, { alpha: prog(t, w.used.end, w.used.end + 0.35), t });
      drawBrowser(ctx, c.z, PW, PH, { typed: prog(t, w.used.end, w.has.end) });
      // "the part you see"
      const k1 = prog(t, w.part1.start - 0.1, w.see.end + 0.2);
      inspect(ctx, c.z, { x: -6, y: -CHROME - 6, w: PW + 12, h: PH + CHROME + 12 }, k1, { tag: 'frontend', meta: 'what you see', margin: 0 }, 1 - 0.55 * prog(t, w.part2.start, w.part2.start + 0.3));
    }
    if (s > 0.5) {
      const k2 = prog(t, w.part2.start - 0.1, w.dont.end + 0.2);
      setWorld(ctx, c, bx, TOP);
      inspect(ctx, c.z, { x: -6, y: -CHROME - 6, w: PW + 12, h: PH + CHROME + 12 }, k2, { tag: 'backend', meta: 'on a server, out of sight' });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** The server side: racks with blinking LEDs, a database, server code. Frosted on "don't". */
  backend(c: CanvasRenderingContext2D, cam: Cam, t: number, s: number) {
    const w = this.w;
    const hide = prog(t, w.dont.start, w.dont.end + 0.25, ease.inOutCubic);
    c.save();
    c.globalAlpha = s;
    c.fillStyle = rgba('ink2', 1);
    c.beginPath(); c.roundRect(0, -CHROME, PW, PH + CHROME, 14); c.fill();
    c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1.2 / cam.z; c.stroke();
    c.font = font(F.mono(500), 15); c.fillStyle = rgba('ash', 0.9);
    c.fillText('api.pixel.dev', 24, -CHROME / 2 + 5);
    for (let i = 0; i < 4; i++) {
      const ry = 40 + i * 70;
      c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1 / cam.z; c.strokeRect(40, ry, 330, 50);
      for (let k = 0; k < 6; k++) { c.fillStyle = rgba('graphite', 0.7); c.fillRect(66 + k * 28, ry + 17, 14, 16); }
      for (let k = 0; k < 3; k++) {
        const on = hash(i, k, Math.floor(t * 7)) > 0.45;
        c.fillStyle = rgba(on ? 'signal' : 'blood', on ? 1 : 0.6);
        c.beginPath(); c.arc(300 + k * 20, ry + 25, 4.5, 0, TAU); c.fill();
      }
    }
    const dx = 520, dy = 50, dw = 230, eh = 26;
    c.strokeStyle = rgba('bone', 0.7); c.lineWidth = 1.6 / cam.z;
    for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(dx + dw / 2, dy + eh + k * 64, dw / 2, eh, 0, 0, Math.PI); c.stroke(); }
    c.beginPath(); c.ellipse(dx + dw / 2, dy + eh, dw / 2, eh, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(dx, dy + eh); c.lineTo(dx, dy + eh + 128); c.moveTo(dx + dw, dy + eh); c.lineTo(dx + dw, dy + eh + 128); c.stroke();
    label(c, 'DATABASE', dx + dw / 2, dy + 200, { size: 12, col: rgba('ash', 0.9), align: 'center' });
    c.font = font(F.mono(400), 16);
    ['GET /api/posts  200', 'SELECT * FROM posts;', 'auth.verify(token)', 'queue.push(email)'].forEach((l, i) => {
      c.fillStyle = rgba(i === 0 ? 'signal' : 'ash', 0.9); c.fillText(l, 470, 320 + i * 28);
    });
    if (hide > 0) {
      c.save(); c.beginPath(); c.roundRect(0, -CHROME, PW, PH + CHROME, 14); c.clip();
      c.fillStyle = rgba('ink', 0.7 * hide); c.fillRect(0, -CHROME, PW, PH + CHROME);
      c.strokeStyle = rgba('ash', 0.18 * hide); c.lineWidth = 1 / cam.z;
      c.beginPath();
      for (let x = -PH - CHROME; x < PW; x += 14) { c.moveTo(x, PH); c.lineTo(x + PH + CHROME, -CHROME); }
      c.stroke(); c.restore();
    }
    c.restore();
  }

  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    // the page's box expands to fill the frame: the hand-off into ROLE
    const d = this.dive(t);
    if (d > 0) expandBox(ctx, screenRect(c, -PW - 30, TOP - CHROME, PW, PH + CHROME), d);
  }
  /** The cursor: at rest in the centre, then dragging the marquee's corner, then off to the panels. */
  cursorAt(t: number): [number, number] | null {
    const w = this.w, dg = this.drag(t);
    if (t < w.every.start) return [0, 0];
    if (dg < 1) {
      const a = prog(t, w.every.start, w.website.start - 0.1, ease.inOutCubic);
      return [lerp(0, -PW / 2, a) + PW * dg, lerp(0, TOP - CHROME, a) + (PH + CHROME) * dg];
    }
    const u = prog(t, w.part1.start - 0.3, w.part1.start, ease.inOutCubic), v = prog(t, w.part2.start - 0.3, w.part2.start, ease.inOutCubic);
    const a: [number, number] = [PW / 2, TOP + PH], b: [number, number] = [-PW - 30, TOP - CHROME], d: [number, number] = [30, TOP - CHROME];
    return v > 0 ? [lerp(b[0], d[0], v), lerp(b[1], d[1], v)] : [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  }
  override penScreen(t: number) { const p = this.cursorAt(t); return p ? w2s(this.cam.at(t), p[0], p[1]) : null; }
  override drawFx(t: number, _c: Cam, X: LineBatch) {
    if (t > this.ctx.end - 0.5) return;
    const flare = 1 + 1.5 * pulse(t, this.w.every.start, 0.25);
    drawCrosshair(X, t, (tt) => this.penScreen(tt), { intensity: clamp(flare, 0, 2.5), trail: t > this.w.every.start });
  }
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.02 * pulse(t, w.sides.start, 0.1) + 0.01 * pulse(t, w.part2.start, 0.1) };
  }
}
