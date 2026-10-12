// FRAMEWORKS — "On top of that, developers use frameworks like React, Vue and Svelte, to build pages
// out of reusable components."
// In from HOUSE's lit window. The camera starts low on the foundation (HTML / CSS / JS blocks laid on
// "On top of that,") and tilts up as "developers use frameworks" lays the FRAMEWORK slab on them; the
// three names are the spoken words themselves, each dropping onto the slab as a chip. On "build pages"
// the camera whips right to a page; on "reusable" one <Card /> is written and inspected, and on
// "components" its copies snap into the page's grid. The page's box expands into SCREENS.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba } from '../../engine/palette';
import { ease, lerp, prog, pulse, TAU } from '../../engine/util';
import { setWorld, label, w2s, type Cam } from '../../scenes/_vo';
import { FeScene, SLAM } from '../_base';
import { pick, perim, ARCH } from '../_fe';
import { inspect, drawCrosshair, expandBox, screenRect } from '../_inspect';

const BASE = { x: -860, y: 160, w: 720 };
const BW = (BASE.w - 40) / 3;
const PG = { x: 60, y: -300, w: 820, h: 560 };
const CW = (PG.w - 64 - 2 * 24) / 3, CH = 190;

export default class Frameworks extends FeScene {
  q = 'On top of that';
  w: Record<string, Word> = {};

  setup() {
    const w = (this.w = pick(this.L, ['on', 'top', 'that', 'developers', 'frameworks', 'like', 'react', 'vue', 'and', 'svelte', 'to', 'build', 'pages', 'reusable', 'components']));
    this.say(this.span(w.on, w.that), BASE.x, BASE.y + 190, 50, 'a');
    this.say(this.span(w.developers, w.frameworks), BASE.x, -470, 74, 'b', { fam: SLAM });
    // the names are the chips
    [w.react, w.vue, w.svelte].forEach((wd, i) => this.say([wd], BASE.x + i * (BW + 20) + BW / 2, -116, 46, 'chips', { fam: ARCH(75, 900), align: 'center', hot: 'signal', done: 'ink' }));
    this.say(this.span(w.to, w.components), PG.x, PG.y - 50, 46, 'c', { maxW: PG.w });
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, -500, 230, 1.35)
      .key(w.that.end, -500, 200, 1.3, 0, ease.linear)
      .key(w.frameworks.start + 0.3, -500, -130, 1.0, 0, ease.inOutCubic)
      .key(w.svelte.end, -470, -140, 1.04, 0, ease.linear)
      .key(w.build.start + 0.35, 380, -40, 1.05, 0.0, ease.inOutExpo)
      .key(w.reusable.start + 0.2, 300, -110, 1.25, 0, ease.inOutCubic)
      .key(w.components.start + 0.35, 420, -20, 1.0, 0, ease.inOutCubic)
      .key(end - 0.45, 430, -20, 1.02, 0, ease.linear)
      .key(end - 0.02, PG.x + PG.w / 2, PG.y + PG.h / 2, 1.6, 0, ease.inOutCubic);
  }
  pageK(t: number) { return prog(t, this.w.build.start, this.w.pages.end + 0.15, ease.inOutCubic); }
  /** The stack on the left clears once the camera leaves it for the page. */
  leftA(t: number) { return 1 - prog(t, this.w.build.start + 0.1, this.w.build.start + 0.45); }
  override kAlpha(g: string, t: number) {
    const out = 1 - prog(t, this.ctx.end - 0.45, this.ctx.end - 0.15);
    if (g === 'b' || g === 'chips') return out * this.leftA(t);
    if (g === 'a') return out * this.leftA(t) * (1 - 0.6 * prog(t, this.w.frameworks.start, this.w.frameworks.start + 0.4));
    return out;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, la = this.leftA(t);
    ctx.globalAlpha = 1;
    if (la > 0.003) this.drawStack(t, c, ctx, la);
    this.drawPageSide(t, c, ctx);
  }
  drawStack(t: number, c: Cam, ctx: CanvasRenderingContext2D, la: number) {
    const w = this.w;
    // foundation: HTML CSS JS
    ['HTML', 'CSS', 'JS'].forEach((s, i) => {
      const k = ease.outCubic(prog(t, w.top.start + i * 0.12, w.top.start + i * 0.12 + 0.3));
      if (k <= 0) return;
      setWorld(ctx, c, BASE.x + i * (BW + 20), BASE.y + 30 * (1 - k));
      ctx.globalAlpha = k * la;
      ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1.4 / c.z; ctx.strokeRect(0, 0, BW, 92);
      label(ctx, s, BW / 2, 56, { size: 26, col: rgba('bone', 0.9), weight: 600, align: 'center', spacing: 6 });
      ctx.globalAlpha = 1;
    });
    // the framework slab
    const sk = ease.outCubic(prog(t, w.frameworks.start, w.frameworks.start + 0.35));
    if (sk > 0) {
      setWorld(ctx, c, BASE.x, BASE.y - 124 - 40 * (1 - sk));
      ctx.globalAlpha = sk * la;
      ctx.fillStyle = rgba('signal', 0.1); ctx.fillRect(0, 0, BASE.w, 104);
      ctx.strokeStyle = rgba('signal', 0.9); ctx.lineWidth = 2 / c.z; ctx.strokeRect(0, 0, BASE.w, 104);
      label(ctx, 'FRAMEWORK', BASE.w / 2, 63, { size: 24, col: rgba('signal', 1), weight: 600, align: 'center', spacing: 9 });
      ctx.globalAlpha = 1;
      setWorld(ctx, c, BASE.x, BASE.y + 120);
      label(ctx, 'THE WEB PLATFORM, UNDERNEATH', 0, 0, { size: 13, col: rgba('ash', sk * la) });
    }
    // the chips the names drop into
    [w.react, w.vue, w.svelte].forEach((wd, i) => {
      const u = prog(t, wd.start - 0.08, wd.start + 0.3);
      if (u <= 0) return;
      const y = lerp(-420, -180, ease.outBack(u, 1.3));
      setWorld(ctx, c, BASE.x + i * (BW + 20), y);
      ctx.globalAlpha = Math.min(1, u * 3) * la;
      ctx.fillStyle = rgba('bone', 1); ctx.beginPath(); ctx.roundRect(0, 0, BW, 100, 16); ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  drawPageSide(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w;
    // the page
    const pk = this.pageK(t);
    if (pk > 0) {
      setWorld(ctx, c, PG.x, PG.y);
      ctx.fillStyle = rgba('ink2', 0.9 * pk); ctx.fillRect(0, 0, PG.w, PG.h);
      ctx.fillStyle = rgba('ink', pk); ctx.fillRect(0, 0, PG.w, 60);
      ctx.fillStyle = rgba('signal', pk); ctx.fillRect(32, 20, 20, 20);
      label(ctx, 'pixel', 64, 37, { size: 18, col: rgba('bone', pk), weight: 600, spacing: 1 });
      label(ctx, 'PAGE · /blog', PG.w, -16 - 50 + 50, { size: 13, col: rgba('ash', pk), align: 'right' });
    }
    // the component and its copies
    const tCard = w.reusable.start, tCopy = w.components.start - 0.05;
    for (let i = 0; i < 6; i++) {
      const app = i === 0 ? prog(t, tCard - 0.05, tCard + 0.25) : ease.outCubic(prog(t, tCopy + (i - 1) * 0.07, tCopy + (i - 1) * 0.07 + 0.28));
      if (app <= 0) continue;
      const gx = PG.x + 32 + (i % 3) * (CW + 24), gy = PG.y + 92 + Math.floor(i / 3) * (CH + 24);
      const x = lerp(PG.x + 32, gx, i === 0 ? 1 : app), y = lerp(PG.y + 92, gy, i === 0 ? 1 : app);
      this.card(ctx, c, x, y, i, Math.min(1, app * 2));
    }
    // the inspector on the first card
    const ik = prog(t, tCard + 0.1, tCard + 0.5), iout = 1 - prog(t, w.components.end + 0.4, w.components.end + 0.8);
    if (ik > 0) { setWorld(ctx, c); inspect(ctx, c.z, { x: PG.x + 32, y: PG.y + 92, w: CW, h: CH }, ik, { tag: '<Card />', meta: t > tCopy ? 'used 6×' : 'a component', padding: 14, content: true, below: true }, iout); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  card(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, i: number, a: number) {
    setWorld(ctx, c, x, y);
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba('ink', 1); ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, 12); ctx.fill();
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1.2 / c.z; ctx.stroke();
    ctx.strokeStyle = rgba(i % 3 === 0 ? 'signal' : 'ash', 0.8); ctx.lineWidth = 1.4 / c.z; ctx.strokeRect(16, 16, CW - 32, CH * 0.42);
    ctx.beginPath(); ctx.arc(16 + (CW - 32) * 0.3, 16 + CH * 0.26, CH * 0.07, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba('bone', 0.85); ctx.fillRect(16, CH * 0.62, (CW - 32) * 0.7, 10);
    ctx.fillStyle = rgba('ash', 0.6); ctx.fillRect(16, CH * 0.62 + 22, (CW - 32) * 0.45, 8);
    ctx.globalAlpha = 1;
  }
  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const u = prog(t, this.ctx.start, this.ctx.start + 0.4);
    if (u < 1) expandBox(ctx, screenRect(c, BASE.x - 20, BASE.y - 20, BASE.w + 40, 132), 1 - u, 1 - u * 0.4);
    const d = prog(t, this.ctx.end - 0.45, this.ctx.end);
    if (d > 0) expandBox(ctx, screenRect(c, PG.x, PG.y, PG.w, PG.h), d);
  }
  cursorAt(t: number): [number, number] | null {
    const k = this.pageK(t);
    if (k > 0 && k < 1) return perim(PG.x, PG.y, PG.w, PG.h, k);
    const w = this.w;
    if (t >= w.reusable.start - 0.2 && t < w.components.end + 0.3) {
      const u = prog(t, w.reusable.start - 0.2, w.reusable.start + 0.45, ease.inOutCubic);
      return [PG.x + 32 + CW * u, PG.y + 92];
    }
    return null;
  }
  override penScreen(t: number) { const p = this.cursorAt(t); return p ? w2s(this.cam.at(t), p[0], p[1]) : null; }
  override drawFx(t: number, _c: Cam, X: LineBatch) { drawCrosshair(X, t, (tt) => this.penScreen(tt), { scale: 0.85 }); }
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.014 * (pulse(t, w.react.start + 0.2, 0.08) + pulse(t, w.vue.start + 0.2, 0.08) + pulse(t, w.svelte.start + 0.2, 0.08)) + 0.012 * pulse(t, w.components.start, 0.1), ca: 1.2 + 4 * pulse(t, w.build.start + 0.2, 0.12) };
  }
}
