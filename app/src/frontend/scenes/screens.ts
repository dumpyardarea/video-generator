// SCREENS — "They make sure the site works on every screen, from phone to tablet to desktop, and for
// every user, including people who use screen readers."
// In from FRAMEWORKS' page. One device changes shape on each word, phone → tablet → desktop, the page
// reflowing inside it (stacked with a hamburger when narrow, two columns when wide); under it the
// inspector's ruler counts the viewport width, and the words "phone", "tablet", "desktop" sit at its
// stops. "and for every user,": the camera slides right to an accessibility tree; a focus ring tabs
// through the page while each node lights; "screen readers." — a speech bubble reads the button aloud,
// its waveform driven by the voice. The device's box expands into API.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba } from '../../engine/palette';
import { F, font } from '../../engine/type';
import { clamp, ease, lerp, prog, pulse } from '../../engine/util';
import { setWorld, label, type Cam } from '../../scenes/_vo';
import { FeScene } from '../_base';
import { drawPage, drawBrowser, pick, CHROME } from '../_fe';
import { ruler, expandBox, screenRect, chip } from '../_inspect';

type Dev = { w: number; h: number; css: number };
const DESK: Dev = { w: 1040, h: 560, css: 1440 }, PHONE: Dev = { w: 300, h: 560, css: 375 }, TAB: Dev = { w: 540, h: 600, css: 768 };
const CY = -40, RULER_Y = 330;
const A11Y = { x: 600, y: -330, w: 380, h: 330 };
const NODES = ['banner', 'heading "Build the web."', 'paragraph', 'img "Hills"', 'button "Sign up"'];

export default class Screens extends FeScene {
  q = 'They make sure';
  w: Record<string, Word> = {};
  keys: [number, Dev][] = [];
  steps: number[] = [];

  setup() {
    const w = (this.w = pick(this.L, ['they', 'works', ['screen1', 'screen', 0], 'from', 'phone', 'tablet', 'desktop', 'and', ['every2', 'every', 1], 'user', 'including', 'people', ['screen2', 'screen', 1], 'readers']));
    this.keys = [[this.ctx.start, DESK], [w.phone.start - 0.1, DESK], [w.phone.start + 0.35, PHONE], [w.tablet.start - 0.05, PHONE], [w.tablet.start + 0.4, TAB], [w.desktop.start - 0.05, TAB], [w.desktop.start + 0.45, DESK]];
    const a = w.user.start, b = w.screen2.start;
    this.steps = [0, 1, 2, 3].map((i) => lerp(a, b, i / 3.6));
    this.say(this.span(w.they, w.screen1), -860, -430, 56, 'a', { maxW: 1100 });
    this.say([w.phone], PHONE.w / 2, RULER_Y + 70, 40, 'sizes', { align: 'center' });
    this.say([w.tablet], TAB.w / 2, RULER_Y + 70, 40, 'sizes', { align: 'center' });
    this.say([w.desktop], DESK.w / 2, RULER_Y + 70, 40, 'sizes', { align: 'center' });
    this.say(this.span(w.and, w.user), A11Y.x, A11Y.y - 60, 56, 'b');
    this.say(this.span(w.including, w.readers), A11Y.x, A11Y.y + A11Y.h + 250, 38, 'c', { maxW: 400 });
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 0, CY, 0.95)
      .key(w.phone.start + 0.3, 0, CY + 20, 1.08, 0, ease.inOutCubic)
      .key(w.tablet.start + 0.3, 0, CY + 20, 1.04, 0, ease.inOutCubic)
      .key(w.desktop.start + 0.4, 0, CY + 10, 0.94, 0, ease.inOutCubic)
      .key(w.user.start + 0.2, 230, CY, 0.96, 0, ease.inOutCubic)
      .key(w.readers.start, 260, CY + 30, 1.0, 0, ease.linear)
      .key(end - 0.45, 260, CY + 30, 1.0, 0, ease.linear)
      .key(end - 0.02, 0, CY, 1.5, 0, ease.inOutCubic);
  }
  dev(t: number): Dev {
    const ks = this.keys;
    let a = ks[0]!, b = ks[0]!;
    for (const k of ks) { if (k[0] <= t) a = k; else { b = k; break; } }
    if (b === a || t >= ks[ks.length - 1]![0]) return a[1];
    const u = ease.inOutCubic(clamp((t - a[0]) / (b[0] - a[0])));
    return { w: lerp(a[1].w, b[1].w, u), h: lerp(a[1].h, b[1].h, u), css: lerp(a[1].css, b[1].css, u) };
  }
  focus(t: number) { let f = 0; for (const s of this.steps) f += ease.inOutCubic(prog(t, s, s + 0.2)); return f; }
  override kAlpha(g: string, t: number) {
    const w = this.w, out = 1 - prog(t, this.ctx.end - 0.45, this.ctx.end - 0.15);
    if (g === 'a') return out * (1 - prog(t, w.and.start - 0.2, w.and.start + 0.2));
    if (g === 'sizes') return out * (1 - 0.6 * prog(t, w.and.start, w.and.start + 0.3));
    return out;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, d = this.dev(t);
    const desk = clamp((d.w - 600) / 440);
    const x = -d.w / 2, y = CY - d.h / 2 + (CHROME * desk) / 2;
    setWorld(ctx, c, x, y);
    const bz = lerp(14, 22, clamp((d.w - 300) / 240)) * (1 - desk);
    if (bz > 0.5) {
      ctx.fillStyle = rgba('ink', 1); ctx.strokeStyle = rgba('bone', 0.5); ctx.lineWidth = 1.4 / c.z;
      ctx.beginPath(); ctx.roundRect(-bz, -bz * 2.2, d.w + 2 * bz, d.h + bz * 4.4, 36); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba('graphite', 1); ctx.beginPath(); ctx.roundRect(d.w / 2 - 36, -bz * 1.4, 72, 7, 4); ctx.fill();
    }
    const fa = prog(t, this.steps[0]! - 0.1, this.steps[0]! + 0.1);
    drawPage(ctx, c.z, d.w, d.h, { t, focus: Math.min(4, this.focus(t)), focusA: fa });
    if (desk > 0) drawBrowser(ctx, c.z, d.w, d.h, { alpha: desk });
    // the viewport ruler
    setWorld(ctx, c);
    ruler(ctx, c.z, -d.w / 2, d.w / 2, RULER_Y, `viewport ${Math.round(d.css)} px`, 1, 1 - 0.6 * prog(t, w.and.start, w.and.start + 0.3));
    // the accessibility tree
    const pa = prog(t, w.and.start, w.and.start + 0.35);
    if (pa > 0) {
      setWorld(ctx, c, A11Y.x + 40 * (1 - pa), A11Y.y);
      ctx.globalAlpha = pa;
      ctx.fillStyle = rgba('ink2', 0.97); ctx.beginPath(); ctx.roundRect(0, 0, A11Y.w, A11Y.h, 12); ctx.fill();
      ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1 / c.z; ctx.stroke();
      label(ctx, 'ACCESSIBILITY TREE', 22, 34, { size: 13, col: rgba('ash', 1) });
      const f = this.focus(t);
      NODES.forEach((n, i) => {
        const on = fa > 0 && Math.round(Math.min(4, f)) === i;
        const ry = 66 + i * 50;
        if (on) { ctx.fillStyle = rgba('signal', 0.14); ctx.fillRect(10, ry - 4, A11Y.w - 20, 40); ctx.fillStyle = rgba('signal', 1); ctx.fillRect(10, ry - 4, 3, 40); }
        ctx.font = font(F.mono(on ? 600 : 400), 17); ctx.fillStyle = rgba(on ? 'bone' : 'ash', 1);
        ctx.fillText(`${'  '.repeat(i ? 1 : 0)}${n}`, 26, ry + 22);
      });
      ctx.globalAlpha = 1;
      // the Tab key
      const press = this.steps.reduce((m, s) => Math.max(m, pulse(t, s, 0.1)), 0);
      if (fa > 0) chip(ctx, 0, A11Y.h + 18 + 4 * press, 'Tab', `focus → ${NODES[Math.round(Math.min(4, f))]!.split(' ')[0]}`, fa);
    }
    // the screen reader
    const ra = prog(t, w.screen2.start, w.screen2.start + 0.2);
    if (ra > 0) {
      setWorld(ctx, c, A11Y.x, A11Y.y + A11Y.h + 80);
      ctx.globalAlpha = ra;
      ctx.fillStyle = rgba('bone', 1); ctx.beginPath(); ctx.roundRect(0, 0, A11Y.w, 120, 16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(20, -26); ctx.lineTo(70, 0); ctx.fill();
      for (let i = 0; i < 20; i++) {
        const v = this.ctx.audio.env('rms', t - i * 0.025), hh = 4 + 30 * v;
        ctx.fillStyle = rgba(i < 6 ? 'blood' : 'graphite', 1); ctx.fillRect(24 + i * 12, 40 - hh / 2, 7, hh);
      }
      const say = '"Sign up", button';
      ctx.font = font(F.mono(600), 22); ctx.fillStyle = rgba('ink', 1);
      ctx.fillText(say.slice(0, Math.ceil(say.length * prog(t, w.readers.start, w.readers.end + 0.2))), 24, 96);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const d = this.dev(t);
    const u = prog(t, this.ctx.start, this.ctx.start + 0.4);
    if (u < 1) expandBox(ctx, screenRect(c, -d.w / 2, CY - d.h / 2, d.w, d.h), 1 - u, 1 - u * 0.4);
    const e = prog(t, this.ctx.end - 0.45, this.ctx.end);
    if (e > 0) expandBox(ctx, screenRect(c, -d.w / 2, CY - d.h / 2, d.w, d.h + CHROME), e);
  }
  override drawFx(_t: number, _c: Cam, _X: LineBatch) {}
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.014 * (pulse(t, w.phone.start, 0.08) + pulse(t, w.tablet.start, 0.08) + pulse(t, w.desktop.start, 0.08)) };
  }
}
