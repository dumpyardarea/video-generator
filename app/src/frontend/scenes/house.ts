// HOUSE — "Think of a house. HTML is the frame, CSS is the paint, and JavaScript is the electricity."
// The paper plate: an architect's sheet on cool paper (SHEET A-1), in from JS's expanding box. "Think of a
// house." is set big; the cursor draws the house in ink (ground, walls, roof, door, windows). Each analogy
// sets itself on the right and a leader line runs from it to its part: "the frame" (studs, king posts,
// headers go in), "the paint" (cyan wash, roof, door wipe across), "the electricity" (the wire is laid
// from the pole and the windows light up in highlighter yellow, the video's one accent). The camera reads
// the sheet part by part and ends close on the lit window, which expands into FRAMEWORKS.
import type * as THREE from 'three';
import { LineBatch } from '../../engine/lines';
import type { Frame, PostOverrides } from '../../engine/scene';
import type { Word } from '../../engine/lyrics';
import { LIN, rgba } from '../../engine/palette';
import { font } from '../../engine/type';
import { ease, lerp, prog, pulse, TAU } from '../../engine/util';
import { Plot, setWorld, w2s, pt, rectPts, label, lengths, at, type Cam, type P } from '../../scenes/_vo';
import { FeScene, SLAM } from '../_base';
import { pick } from '../_fe';
import { drawCrosshair, expandBox, screenRect } from '../_inspect';

const WX0 = -700, WX1 = -60, WY0 = -90, WY1 = 270, APEX = pt(-380, -350);
const DOOR = { x: -440, y: 100, w: 120, h: 170 };
const WINS = [{ x: -640, y: -20, w: 130, h: 110 }, { x: -250, y: -20, w: 130, h: 110 }];
const POLE = 150;
const WIRE: P[] = [pt(POLE, -250), pt(40, -150), pt(WX1, -55), pt(-185, -55), pt(-185, -20)];
const WIRE2: P[] = [pt(-185, -55), pt(-575, -55), pt(-575, -20)];
const SHEET = { x: -900, y: -470, w: 1800, h: 900 };

export default class House extends FeScene {
  q = 'Think of a house';
  override paper = 1;
  w: Record<string, Word> = {};
  plot = new Plot();
  ink = new LineBatch(30000, { blend: 'normal' });
  wireL = lengths(WIRE);
  wire2L = lengths(WIRE2);

  setup() {
    const w = (this.w = pick(this.L, ['think', 'house', 'html', 'frame', 'css', 'paint', 'and', 'javascript', 'electricity']));
    this.say(this.span(w.think, w.house), -860, -360, 96, 'title', { fam: SLAM, hot: 'blood', done: 'ink' });
    this.say(this.span(w.html, w.frame), 290, -190, 54, 'h', { hot: 'blood', done: 'ink' });
    this.say(this.span(w.css, w.paint), 290, -40, 54, 'c', { hot: 'blood', done: 'ink' });
    this.say(this.span(w.and, w.electricity), 290, 110, 54, 'j', { hot: 'blood', done: 'ink', maxW: 560 });
    const P = this.plot;
    P.paper = true;
    const t0 = w.house.start - 0.3, t1 = w.html.start - 0.1, d = (t1 - t0) / 6;
    P.add([pt(-860, WY1), pt(260, WY1)], t0 - 0.2, t0 + 0.25, 'axis', { width: 1.4 });
    P.add([pt(WX0, WY1), pt(WX0, WY0), pt(WX1, WY0), pt(WX1, WY1)], t0, t0 + d * 1.6, 'plot', { pen: true, width: 2.4 });
    P.add([pt(WX0 - 50, WY0), APEX, pt(WX1 + 50, WY0), pt(WX0 - 50, WY0)], t0 + d * 1.6, t0 + d * 3.2, 'plot', { pen: true, width: 2.4 });
    // the door: up the left jamb, across the head, down the right jamb (its bottom is the ground line)
    P.add([pt(DOOR.x, DOOR.y + DOOR.h), pt(DOOR.x, DOOR.y), pt(DOOR.x + DOOR.w, DOOR.y), pt(DOOR.x + DOOR.w, DOOR.y + DOOR.h)], t0 + d * 3.2, t0 + d * 4, 'plot', { pen: true, width: 2.2 });
    WINS.forEach((r, i) => P.add(rectPts(r.x, r.y, r.w, r.h), t0 + d * (4 + i), t0 + d * (5 + i), 'plot', { pen: true, width: 2.2 }));
    // the frame: studs, king posts, headers
    const f0 = w.frame.start - 0.05, f1 = w.frame.end + 0.35;
    const studs: P[][] = [];
    for (let x = WX0 + 64; x < WX1; x += 64) studs.push([pt(x, WY1), pt(x, WY0)]);
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      for (const ex of [WX0 - 50, WX1 + 50]) { const x = lerp(ex, APEX.x, u); studs.push([pt(x, WY0), pt(x, lerp(WY0, APEX.y, u))]); }
    }
    studs.push([pt(WX0, 30), pt(WX1, 30)], [pt(WX0, -50), pt(WX1, -50)]);
    studs.forEach((s, i) => P.add(s, f0 + (i / studs.length) * (f1 - f0 - 0.15), f0 + (i / studs.length) * (f1 - f0 - 0.15) + 0.15, 'cons', { width: 1.3, alpha: 0.9 }));
    // leader lines from each analogy to its part
    P.add([pt(280, -205), pt(120, -205), pt(-340, 0)], w.frame.start, w.frame.start + 0.35, 'dim', { width: 1.2 });
    P.add([pt(280, -55), pt(140, -55), pt(-110, 170)], w.paint.start, w.paint.start + 0.35, 'dim', { width: 1.2 });
    P.add([pt(280, 95), pt(150, 95), pt(-120, 40)], w.electricity.start, w.electricity.start + 0.35, 'dim', { width: 1.2 });
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, -380, 120, 1.25)
      .key(w.house.start, -380, 80, 1.2, 0, ease.linear)
      .key(w.html.start - 0.1, -150, -40, 0.96, 0, ease.inOutCubic)
      .key(w.frame.start + 0.3, -260, 0, 1.06, 0, ease.inOutCubic)
      .key(w.paint.start + 0.3, -120, 10, 1.0, -0.004, ease.inOutCubic)
      .key(w.electricity.start + 0.2, -60, -30, 1.0, 0, ease.inOutCubic)
      .key(end - 0.5, -80, -30, 1.03, 0, ease.linear)
      .key(end - 0.02, WINS[1]!.x + WINS[1]!.w / 2, WINS[1]!.y + WINS[1]!.h / 2, 2.6, 0, ease.inOutCubic);
  }
  paintK(t: number) { return prog(t, this.w.paint.start - 0.05, this.w.paint.end + 0.3, ease.inOutCubic); }
  sparkK(t: number) { return prog(t, this.w.javascript.start + 0.1, this.w.electricity.start + 0.35, ease.inOutQuad); }
  lightK(t: number) { return prog(t, this.w.electricity.start + 0.3, this.w.electricity.start + 0.55); }
  dive(t: number) { return prog(t, this.ctx.end - 0.4, this.ctx.end); }
  override kAlpha(_g: string, t: number) { return 1 - prog(t, this.ctx.end - 0.5, this.ctx.end - 0.2); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, pk = this.paintK(t), lk = this.lightK(t);
    // the sheet: border and title block
    setWorld(ctx, c);
    ctx.strokeStyle = rgba('ink', 0.75); ctx.lineWidth = 1.6 / c.z;
    ctx.strokeRect(SHEET.x, SHEET.y, SHEET.w, SHEET.h);
    ctx.lineWidth = 0.8 / c.z; ctx.strokeRect(SHEET.x + 10, SHEET.y + 10, SHEET.w - 20, SHEET.h - 20);
    const tb = { x: SHEET.x + SHEET.w - 470, y: SHEET.y + SHEET.h - 110 };
    ctx.strokeRect(tb.x, tb.y, 460, 100);
    ctx.beginPath(); ctx.moveTo(tb.x, tb.y + 46); ctx.lineTo(tb.x + 460, tb.y + 46); ctx.moveTo(tb.x + 300, tb.y); ctx.lineTo(tb.x + 300, tb.y + 100); ctx.stroke();
    ctx.font = font(SLAM, 30); ctx.fillStyle = rgba('ink', 0.9); ctx.fillText('A-1', tb.x + 320, tb.y + 36);
    label(ctx, 'A HOUSE / A WEBSITE', tb.x + 14, tb.y + 30, { size: 14, col: rgba('ink', 0.85), weight: 600 });
    label(ctx, 'SCALE 1:1 · DRAWN BY THE CURSOR', tb.x + 14, tb.y + 78, { size: 11, col: rgba('graphite', 1) });
    label(ctx, 'SHEET', tb.x + 314, tb.y + 78, { size: 11, col: rgba('graphite', 1) });
    // paint, wiping left to right
    if (pk > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(WX0 - 60, APEX.y - 10, (WX1 - WX0 + 120) * pk, WY1 - APEX.y + 10); ctx.clip();
      ctx.fillStyle = rgba('signal', 0.28); ctx.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
      ctx.fillStyle = rgba('blood', 0.9);
      ctx.beginPath(); ctx.moveTo(WX0 - 50, WY0); ctx.lineTo(APEX.x, APEX.y); ctx.lineTo(WX1 + 50, WY0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba('ink', 0.85); ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
      ctx.fillStyle = rgba('bone', 1);
      for (const r of WINS) ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    // the windows light up: highlighter yellow, the one accent
    if (lk > 0) {
      for (const r of WINS) {
        const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 4, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.9);
        g.addColorStop(0, rgba('acid', lk)); g.addColorStop(1, rgba('acid', 0.55 * lk));
        ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = rgba('ink', 0.8 * lk); ctx.lineWidth = 2 / c.z;
        ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + 30, 10, 0, TAU); ctx.stroke();
      }
    }
    // the pole
    const pa = prog(t, w.javascript.start - 0.2, w.javascript.start + 0.1);
    if (pa > 0) {
      ctx.strokeStyle = rgba('ink', 0.8 * pa); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(POLE, WY1); ctx.lineTo(POLE, -275); ctx.moveTo(POLE - 34, -255); ctx.lineTo(POLE + 34, -255); ctx.stroke();
    }
    label(ctx, 'FIG. 6 — ELEVATION, FRONT', WX0 - 40, WY1 + 40, { size: 13, col: rgba('graphite', prog(t, w.house.start, w.house.start + 0.3)) });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  wireAt(k: number): P { const L = this.wireL[this.wireL.length - 1]!; const q = at(WIRE, this.wireL, k * L); return pt(q.x, q.y); }
  cursorAt(t: number): P | null {
    const k = this.sparkK(t);
    if (k > 0 && k < 1) return this.wireAt(k);
    if (t > this.w.html.start + 0.1 || t < this.w.house.start - 0.35) return null;
    return this.plot.penAt(t);
  }
  override penScreen(t: number): [number, number] | null { const p = this.cursorAt(t); return p ? w2s(this.cam.at(t), p.x, p.y) : null; }

  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const u = prog(t, this.ctx.start, this.ctx.start + 0.45);
    if (u < 1) expandBox(ctx, screenRect(c, SHEET.x, SHEET.y, SHEET.w, SHEET.h), 1 - u, 1 - u * 0.5);
  }
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = super.render(f, out);
    const t = f.t, c = this.cam.at(t);
    const X = this.ink;
    X.clear();
    // the plotted ink: normal blend, over the paint, out of the way once the dive takes over
    if (this.dive(t) < 0.5) {
      this.plot.draw(t, c, X, undefined, 1 - this.dive(t) * 2);
      const sk = this.sparkK(t), live = this.lightK(t);
      if (sk > 0) {
        const L = this.wireL[this.wireL.length - 1]!, n = 40;
        let prev = w2s(c, WIRE[0]!.x, WIRE[0]!.y);
        for (let i = 1; i <= n; i++) {
          const q = at(WIRE, this.wireL, (i / n) * sk * L), s = w2s(c, q.x, q.y);
          X.seg2(prev[0], prev[1], s[0], s[1], 2.4, live > 0 ? LIN.blood : LIN.graphite, 0.95);
          prev = s;
        }
        if (live > 0) {
          const L2 = this.wire2L[this.wire2L.length - 1]!;
          let p2 = w2s(c, WIRE2[0]!.x, WIRE2[0]!.y);
          for (let i = 1; i <= 20; i++) { const q = at(WIRE2, this.wire2L, (i / 20) * L2 * live), s = w2s(c, q.x, q.y); X.seg2(p2[0], p2[1], s[0], s[1], 2.4, LIN.blood, 0.95); p2 = s; }
        }
      }
      drawCrosshair(X, t, (tt) => this.penScreen(tt), { paper: true, scale: 0.9 });
    }
    X.render(this.ctx.renderer, out);
    // the lit window's box expands into FRAMEWORKS, over everything
    const d = this.dive(t);
    if (d > 0) {
      const U = this.ui; U.clear();
      const rw = WINS[1]!;
      expandBox(U.ctx, screenRect(c, rw.x, rw.y, rw.w, rw.h), d);
      this.ctx.comp.draw(this.ctx.renderer, U.upload(), out);
    }
    return r;
  }
  override post(t: number) {
    const w = this.w;
    return {
      zoom: 1 + 0.01 * (pulse(t, w.html.start, 0.08) + pulse(t, w.css.start, 0.08) + pulse(t, w.javascript.start, 0.08)) + 0.02 * pulse(t, w.electricity.start + 0.3, 0.12),
      bloom: 0.25 + 0.35 * pulse(t, w.electricity.start + 0.3, 0.3), bloomThreshold: 0.95, halation: 0.05, vignette: 0.25,
    };
  }
}
