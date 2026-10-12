// Shared toolkit for the frontend-developer explainer (?video=frontend), on top of scenes/_vo.ts:
//  - Subs: the karaoke subtitle, in screen space at the bottom of the frame (one script line at a time).
//  - drawPage(): the mock web page every plate shows. Its PageState goes from raw HTML (white paper,
//    Times, blue links, stacked boxes) to the designed page (colour, Archivo, spacing, a two-column
//    layout), with behaviour on top (menu, button press, toast, loading cards, focus ring).
//  - drawBrowser(), drawCursor(), drawCode() (a syntax-coloured editor panel typed in on time).
import { W, H } from '../engine/gl';
import { rgba } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import type { Line, Word } from '../engine/lyrics';
import { clamp, ease, lerp, prog, TAU } from '../engine/util';
import { drawKaraoke, placeRow, rowWidth, wordOf, mixCss, type KWord, type Cam } from '../scenes/_vo';

/** Identity camera: world px = screen px. */
export const SCREEN: Cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };
export const ARCH = (wd: number, wt: number) => F.archivo(wd, wt);
export const expo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));

/** Words of a line by key: 'word' or [key, query, nth]. */
export function pick(l: Line, spec: (string | [string, string, number?])[]) {
  const out: Record<string, Word> = {};
  for (const s of spec) {
    const [k, q, n] = typeof s === 'string' ? [s, s, 0] : [s[0], s[1], s[2] ?? 0];
    out[k] = wordOf(l, q, n);
  }
  return out;
}

/** Point at fraction u of a rect's perimeter, clockwise from the top-left corner. */
export function perim(x: number, y: number, w: number, h: number, u: number): [number, number] {
  let d = clamp(u) * 2 * (w + h);
  if (d < w) return [x + d, y];
  d -= w;
  if (d < h) return [x + w, y + d];
  d -= h;
  if (d < w) return [x + w - d, y + h];
  return [x, y + h - (d - w)];
}

// ================================================================== subtitles
export class Subs {
  kw: KWord[] = [];
  constructor(public lines: Line[], o: { y?: number; size?: number; maxW?: number } = {}) {
    const size = o.size ?? 42, maxW = o.maxW ?? 1500, fam = ARCH(100, 700), lh = size * 1.24;
    for (const l of lines) {
      const rows: Word[][] = [[]];
      for (const w of l.words) {
        const row = rows[rows.length - 1]!;
        if (row.length && rowWidth([...row, w].map((x) => x.w), size, fam) > maxW) rows.push([w]);
        else row.push(w);
      }
      const y0 = (o.y ?? H - 72) - (rows.length - 1) * lh;
      rows.forEach((r, i) => {
        const wd = rowWidth(r.map((x) => x.w), size, fam);
        const ws = placeRow(r, W / 2 - wd / 2, y0 + i * lh, size, fam, String(l.i)).words;
        for (const k of ws) k.tAnt = l.start - 0.35; // the whole line in outline, each word lights when said
        this.kw.push(...ws);
      });
    }
  }
  alpha(g: string, t: number) {
    const i = this.lines.findIndex((l) => String(l.i) === g);
    const l = this.lines[i]!, nx = this.lines[i + 1];
    return Math.min(prog(t, l.start - 0.4, l.start - 0.15), nx ? 1 - prog(t, nx.start - 0.3, nx.start - 0.1) : 1);
  }
  draw(ctx: CanvasRenderingContext2D, t: number, a = 1) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // a soft band of ink keeps the words legible over whatever the plate draws
    const g = ctx.createLinearGradient(0, H - 250, 0, H);
    g.addColorStop(0, rgba('ink', 0));
    g.addColorStop(0.45, rgba('ink', 0.78 * a));
    g.addColorStop(1, rgba('ink', 0.92 * a));
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 250, W, 250);
    drawKaraoke(ctx, SCREEN, t, this.kw, { alpha: (gg, tt) => this.alpha(gg, tt) * a });
  }
}

// ================================================================== the mock page
export const EL = { nav: 0, h1: 1, p: 2, img: 3, btn: 4, cards: 5 } as const;
export const TAGS = ['<nav>', '<h1>', '<p>', '<img>', '<button>', '<ul>'];

export interface PageState {
  /** Per element [nav, h1, p, img, btn, cards] opacity (default 1). */
  on?: number[];
  /** Per element signal highlight. */
  hot?: number[];
  /** CSS, 0 = the browser's defaults: colour, typeface, spacing, two-column layout. */
  color?: number; font?: number; space?: number; layout?: number;
  /** Tag labels and dashed element boxes. */
  tags?: number;
  /** Behaviour: dropdown open, button press pulse, "thanks" toast, cards loading spinner and loaded data. */
  menu?: number; press?: number; toast?: number; loading?: number; data?: number;
  /** Keyboard focus ring: element index (fractional while moving) and its opacity. */
  focus?: number; focusA?: number;
  t?: number;
  alpha?: number;
}
export type R = { x: number; y: number; w: number; h: number };
const rr = (x: number, y: number, w: number, h: number): R => ({ x, y, w, h });
const lr = (a: R, b: R, k: number): R => rr(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.w, b.w, k), lerp(a.h, b.h, k));

/** Element rects (page px) for a w×h page: raw stacking → styled (stacked or two-column). */
export function pageRects(w: number, h: number, space = 1, layout = 1) {
  const raw = [rr(10, 10, w - 20, h * 0.05), rr(10, h * 0.08, w - 20, h * 0.08), rr(10, h * 0.18, w - 20, h * 0.1),
    rr(10, h * 0.3, Math.min(0.32 * w, 220), h * 0.2), rr(10, h * 0.52, Math.max(84, 0.14 * w), h * 0.055)];
  const rawCards = [0, 1, 2].map((i) => rr(10, h * 0.6 + i * h * 0.11, w - 20, h * 0.09));
  const pad = w * 0.06, narrow = w < 560;
  const stack = [rr(0, 0, w, h * 0.1), rr(pad, h * 0.14, w - 2 * pad, h * 0.08), rr(pad, h * 0.24, w - 2 * pad, h * 0.09),
    rr(pad, h * 0.36, w - 2 * pad, h * 0.17), rr(pad, h * 0.555, Math.max(120, 0.32 * w), h * 0.065)];
  const two = [rr(0, 0, w, h * 0.1), rr(pad, h * 0.17, 0.5 * w - pad, h * 0.1), rr(pad, h * 0.3, 0.42 * w, h * 0.12),
    rr(0.58 * w, h * 0.16, 0.42 * w - pad, h * 0.38), rr(pad, h * 0.46, 0.17 * w, h * 0.075)];
  const L = narrow ? 0 : ease.inOutCubic(clamp(layout));
  const styled = stack.map((s, i) => lr(s, two[i]!, L));
  const cy = h * 0.64, ch = h * 0.3, gap = w * 0.025;
  const styledCards = narrow
    ? [0, 1, 2].map((i) => rr(pad, cy + (i * ch) / 3, w - 2 * pad, ch / 3 - gap * 0.6))
    : [0, 1, 2].map((i) => rr(pad + (i * (w - 2 * pad + gap)) / 3, cy, (w - 2 * pad + gap) / 3 - gap, ch));
  const k = ease.inOutCubic(clamp(space));
  return { el: raw.map((a, i) => lr(a, styled[i]!, k)), cards: rawCards.map((a, i) => lr(a, styledCards[i]!, k)), narrow };
}
/** Bounding rect of the three cards. */
export const cardsBox = (cs: R[]) => {
  const x0 = Math.min(...cs.map((c) => c.x)), y0 = Math.min(...cs.map((c) => c.y));
  return rr(x0, y0, Math.max(...cs.map((c) => c.x + c.w)) - x0, Math.max(...cs.map((c) => c.y + c.h)) - y0);
};

/** The two typefaces of a text crossfading (raw serif → Archivo), fitted to maxW. */
function dualText(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, rawFam: string, styFam: string, fk: number, col: string, a: number, maxW = 1e9, align: CanvasTextAlign = 'left') {
  c.textAlign = align;
  // a quick swap, not a long double exposure (two typefaces of different widths read as a smear)
  const q = clamp((fk - 0.4) / 0.2);
  for (const [fam, k] of [[rawFam, 1 - q], [styFam, q]] as const) {
    if (k <= 0.01) continue;
    let sz = size;
    const m = measure(s, fam, sz);
    if (m > maxW) sz *= maxW / m;
    c.font = font(fam, sz);
    c.globalAlpha = a * k;
    c.fillStyle = col;
    c.fillText(s, x, y);
  }
  c.globalAlpha = 1;
  c.textAlign = 'left';
}

/** Draw the page with its top-left at the current transform's origin (1 unit = 1 page px; z = screen px per unit). */
export function drawPage(c: CanvasRenderingContext2D, z: number, w: number, h: number, s: PageState = {}) {
  const A = s.alpha ?? 1;
  if (A <= 0.003) return;
  const col = ease.inOutCubic(clamp(s.color ?? 1)), fk = ease.inOutCubic(clamp(s.font ?? 1)), sp = s.space ?? 1;
  const tags = s.tags ?? 0, t = s.t ?? 0, hair = 1 / z;
  const on = (i: number) => A * (s.on?.[i] ?? 1), hot = (i: number) => s.hot?.[i] ?? 0;
  const { el, cards, narrow } = pageRects(w, h, sp, s.layout ?? 1);
  const k = ease.inOutCubic(clamp(sp));
  const ink = mixCss('ink', 'bone', col), dim = mixCss('graphite', 'ash', col);
  const serif = F.serif(600), serifR = F.serif(400);
  c.save();
  c.globalAlpha = A;
  c.fillStyle = mixCss('bone', 'ink2', col);
  c.fillRect(0, 0, w, h);
  c.beginPath(); c.rect(0, 0, w, h); c.clip();
  c.textBaseline = 'alphabetic';

  // nav
  const n = el[0]!;
  let menuAnchor = { x: n.x + n.w - 40, y: n.y + n.h };
  if (on(0) > 0) {
    c.globalAlpha = on(0);
    c.fillStyle = rgba('ink', 0.85 * col * k);
    c.fillRect(n.x, n.y, n.w, n.h);
    c.fillStyle = rgba('graphite', 0.8 * col);
    c.fillRect(n.x, n.y + n.h - hair, n.w, hair);
    const pad = lerp(0, w * 0.06, k), ls = lerp(n.h * 0.7, n.h * 0.36, k);
    const lx = n.x + pad, by = n.y + n.h * lerp(0.75, 0.64, k);
    const sq = n.h * 0.38 * col;
    if (sq > 0.5) { c.fillStyle = rgba('signal', on(0) * col); c.fillRect(lx, n.y + (n.h - sq) / 2, sq, sq); }
    dualText(c, 'pixel', lx + sq * 1.5, by, ls * 1.1, serif, ARCH(100, 900), fk, ink, on(0));
    if (narrow && k > 0.5) {
      const hx = n.x + n.w - pad - 26, hy = n.y + n.h / 2;
      c.fillStyle = rgba('bone', on(0));
      for (let i = -1; i <= 1; i++) c.fillRect(hx, hy + i * 8 - 1.5, 26, 3);
      menuAnchor = { x: hx + 26, y: n.y + n.h };
    } else {
      const links = ['Home', 'Docs', 'Blog'];
      const gap = lerp(ls * 0.6, ls * 1.6, k);
      const fam = fk > 0.5 ? ARCH(100, 500) : serifR;
      const ws = links.map((l) => measure(l, fam, ls));
      const tot = ws.reduce((a, b) => a + b, 0) + gap * 2;
      let x = lerp(lx + measure('pixel', serif, ls * 1.1) + ls * 1.4, n.x + n.w - pad - tot, k);
      links.forEach((l, i) => {
        const lc = mixCss('#1F3FD1', 'ash', col);
        dualText(c, l, x, by, ls, serifR, ARCH(100, 500), fk, lc, on(0));
        if (col < 0.98) { c.fillStyle = mixCss('#1F3FD1', 'ash', col, on(0) * (1 - col)); c.fillRect(x, by + 3, ws[i]!, Math.max(hair, 1.2)); }
        if (i === 1) menuAnchor = { x: x + ws[i]!, y: n.y + n.h };
        x += ws[i]! + gap;
      });
    }
  }
  // h1
  const h1 = el[1]!;
  if (on(1) > 0) dualText(c, 'Build the web.', h1.x, h1.y + h1.h * 0.82, h1.h * lerp(0.8, 0.9, k), serif, ARCH(100, 900), fk, ink, on(1), h1.w);
  // p: three lines of body text
  const p = el[2]!;
  if (on(2) > 0) {
    c.globalAlpha = on(2);
    const bh = Math.max(2, p.h * lerp(0.12, 0.13, k));
    [1, 0.9, 0.58].forEach((f, i) => {
      c.fillStyle = mixCss('graphite', 'ash', col, lerp(0.75, 0.6, col));
      c.beginPath(); c.roundRect(p.x, p.y + p.h * (0.12 + 0.3 * i), p.w * f, bh, bh * 0.5 * k); c.fill();
    });
  }
  // img
  const im = el[3]!;
  if (on(3) > 0) {
    c.globalAlpha = on(3);
    c.save();
    c.beginPath(); c.roundRect(im.x, im.y, im.w, im.h, 14 * k); c.clip();
    c.fillStyle = '#26262A'; c.fillRect(im.x, im.y, im.w, im.h);
    c.fillStyle = rgba('signal', 1);
    c.beginPath(); c.arc(im.x + im.w * 0.72, im.y + im.h * 0.36, Math.min(im.w, im.h) * 0.14, 0, TAU); c.fill();
    c.fillStyle = rgba('graphite', 1);
    c.beginPath(); c.moveTo(im.x, im.y + im.h); c.lineTo(im.x + im.w * 0.34, im.y + im.h * 0.45); c.lineTo(im.x + im.w * 0.62, im.y + im.h); c.fill();
    c.fillStyle = rgba('ash', 1);
    c.beginPath(); c.moveTo(im.x + im.w * 0.38, im.y + im.h); c.lineTo(im.x + im.w * 0.7, im.y + im.h * 0.58); c.lineTo(im.x + im.w * 1.02, im.y + im.h); c.fill();
    c.restore();
  }
  // button
  const b = el[4]!;
  if (on(4) > 0) {
    const pr = clamp(s.press ?? 0), sc = 1 - 0.07 * pr;
    c.save();
    c.globalAlpha = on(4);
    c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(sc, sc); c.translate(-b.w / 2, -b.h / 2);
    c.fillStyle = mixCss('#DCDAD5', 'signal', col);
    c.beginPath(); c.roundRect(0, 0, b.w, b.h, lerp(2, b.h / 2, k)); c.fill();
    c.strokeStyle = rgba('ink', 0.6 * (1 - col)); c.lineWidth = hair; c.stroke();
    dualText(c, 'Sign up', b.w / 2, b.h * 0.66, b.h * lerp(0.55, 0.42, k), serifR, ARCH(100, 700), fk, rgba('ink', 1), on(4), b.w * 0.85, 'center');
    if (pr > 0) {
      c.globalAlpha = on(4) * pr * 0.8;
      c.strokeStyle = rgba('ember', 1); c.lineWidth = 3 * hair + 2;
      c.beginPath(); c.roundRect(-10 * (1 - pr) - 4, -10 * (1 - pr) - 4, b.w + 20 * (1 - pr) + 8, b.h + 20 * (1 - pr) + 8, b.h / 2 + 6); c.stroke();
    }
    c.restore();
  }
  // cards: skeletons → spinners → content
  if (on(5) > 0) {
    const data = clamp(s.data ?? 1), load = clamp(s.loading ?? 0);
    cards.forEach((cr, i) => {
      c.globalAlpha = on(5);
      c.fillStyle = rgba('ink', 0.6 * col);
      c.beginPath(); c.roundRect(cr.x, cr.y, cr.w, cr.h, 12 * k); c.fill();
      c.strokeStyle = mixCss('graphite', 'graphite', 0, lerp(0.5, 0.9, col)); c.lineWidth = hair; c.stroke();
      const row = cr.w > cr.h * 1.6;
      const pd = Math.min(cr.w, cr.h) * 0.12;
      const th: R = row ? rr(cr.x + pd, cr.y + pd, cr.h - 2 * pd, cr.h - 2 * pd) : rr(cr.x + pd, cr.y + pd, cr.w - 2 * pd, cr.h * 0.42);
      const tx = row ? th.x + th.w + pd : cr.x + pd, ty = row ? cr.y + pd : th.y + th.h + pd * 0.9, tw = cr.x + cr.w - pd - tx;
      const lh = Math.max(3, (row ? cr.h - 2 * pd : cr.y + cr.h - pd - ty) / 4.2);
      // skeleton
      if (data < 1) {
        c.globalAlpha = on(5) * (1 - data);
        const sh = 0.16 + 0.1 * Math.sin(t * 6 - i * 0.8);
        c.fillStyle = mixCss('graphite', 'ash', col, sh);
        c.fillRect(th.x, th.y, th.w, th.h);
        c.fillRect(tx, ty, tw * 0.8, lh); c.fillRect(tx, ty + lh * 1.6, tw * 0.6, lh * 0.7);
        if (load > 0) {
          const cx = th.x + th.w / 2, cy = th.y + th.h / 2, r = Math.min(th.w, th.h) * 0.22;
          c.globalAlpha = on(5) * (1 - data) * load;
          c.strokeStyle = rgba('signal', 1); c.lineWidth = Math.max(2, r * 0.22);
          c.beginPath(); c.arc(cx, cy, r, t * 7 + i, t * 7 + i + TAU * 0.7); c.stroke();
        }
      }
      // content
      if (data > 0) {
        c.globalAlpha = on(5) * data;
        const hue = ['signal', 'ember', 'bone'][i]!;
        c.fillStyle = rgba(hue, 0.9); c.fillRect(th.x, th.y, th.w, th.h);
        c.fillStyle = rgba('ink', 0.35);
        c.beginPath(); c.arc(th.x + th.w * 0.3, th.y + th.h * 0.65, Math.min(th.w, th.h) * 0.2, 0, TAU); c.fill();
        dualText(c, ['Hello, HTML', 'Style with CSS', 'Move with JS'][i]!, tx, ty + lh * 0.95, lh * 1.25, serif, ARCH(100, 700), fk, ink, on(5) * data, tw);
        c.fillStyle = dim;
        c.globalAlpha = on(5) * data * 0.7;
        c.fillRect(tx, ty + lh * 1.8, tw * 0.9, lh * 0.45); c.fillRect(tx, ty + lh * 2.6, tw * 0.55, lh * 0.45);
      }
    });
  }
  c.globalAlpha = 1;
  // tag boxes and labels (the HTML view)
  if (tags > 0.003) {
    const boxes = [...el, cardsBox(cards)];
    boxes.forEach((r, i) => {
      const a = tags * Math.max(0.25, on(i) / A) * A;
      c.setLineDash([6 / z, 4 / z]);
      c.strokeStyle = rgba('signal', 0.75 * a); c.lineWidth = 1.2 / z;
      c.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
      c.setLineDash([]);
      c.font = font(F.mono(600), 13);
      const tw = measure(TAGS[i]!, F.mono(600), 13) + 10;
      // a tab hanging inside the box's top-right corner (clear of the element's own content on the left)
      const lx = r.x + r.w + 3 - tw, ly = r.y - 3;
      c.fillStyle = rgba('signal', 0.95 * a); c.fillRect(lx, ly, tw, 18);
      c.fillStyle = rgba('ink', a); c.fillText(TAGS[i]!, lx + 5, ly + 13.5);
    });
  }
  // highlights
  [...el, cardsBox(cards)].forEach((r, i) => {
    const hk = hot(i);
    if (hk <= 0.003) return;
    c.strokeStyle = rgba('signal', hk); c.lineWidth = 3 / z;
    c.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
    c.fillStyle = rgba('signal', 0.08 * hk); c.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
  });
  // dropdown menu
  const mk = clamp(s.menu ?? 0);
  if (mk > 0.003) {
    const mw = Math.min(240, w * 0.4), ih = Math.max(34, h * 0.07), mh = ih * 3 * ease.outCubic(mk);
    const mx = Math.min(w - mw - 8, menuAnchor.x - mw + 20), my = menuAnchor.y + 6;
    c.save();
    c.beginPath(); c.rect(mx - 2, my - 2, mw + 4, mh + 4); c.clip();
    c.fillStyle = rgba('bone', A); c.beginPath(); c.roundRect(mx, my, mw, ih * 3, 10); c.fill();
    ['Guides', 'API', 'Examples'].forEach((it, i) => {
      if (i === 0) { c.fillStyle = rgba('signal', 0.18 * A); c.fillRect(mx, my, mw, ih); }
      c.font = font(ARCH(100, 500), ih * 0.42); c.fillStyle = rgba('ink', A);
      c.fillText(it, mx + 18, my + ih * (i + 0.64));
    });
    c.restore();
  }
  // toast
  const tk = clamp(s.toast ?? 0);
  if (tk > 0.003) {
    // under the button that raised it
    const tw = Math.min(310, w * 0.7), th = 42, x = b.x, y = b.y + b.h + 12 - 14 * (1 - ease.outCubic(tk));
    c.globalAlpha = A * tk;
    c.fillStyle = rgba('bone', 1); c.beginPath(); c.roundRect(x, y, tw, th, 21); c.fill();
    c.fillStyle = rgba('signal', 1); c.beginPath(); c.arc(x + 24, y + th / 2, 7, 0, TAU); c.fill();
    c.font = font(ARCH(100, 700), 18); c.fillStyle = rgba('ink', 1);
    c.fillText('Thanks for signing up!', x + 42, y + 27);
    c.globalAlpha = 1;
  }
  // keyboard focus ring
  const fa = s.focusA ?? 0;
  if (fa > 0.003 && s.focus !== undefined && s.focus >= 0) {
    const boxes = [...el, cardsBox(cards)];
    const i0 = Math.floor(s.focus), i1 = Math.min(boxes.length - 1, i0 + 1);
    const fr = lr(boxes[i0]!, boxes[i1]!, ease.inOutCubic(s.focus - i0));
    c.strokeStyle = rgba('ember', fa); c.lineWidth = 4 / z;
    c.beginPath(); c.roundRect(fr.x - 8, fr.y - 8, fr.w + 16, fr.h + 16, 10); c.stroke();
  }
  c.restore();
}

// ================================================================== browser, cursor, code
export const CHROME = 46;
/** Browser window around a page at (0,0)-(w,h) of the current transform: the bar sits above y = 0. */
export function drawBrowser(c: CanvasRenderingContext2D, z: number, w: number, h: number, o: { url?: string; typed?: number; alpha?: number; draw?: number } = {}) {
  const A = o.alpha ?? 1, d = clamp(o.draw ?? 1);
  if (A <= 0.003) return;
  c.save();
  c.globalAlpha = A;
  if (d >= 1) {
    c.fillStyle = rgba('ink', 1);
    c.beginPath(); c.roundRect(0, -CHROME, w, CHROME + 14, [14, 14, 0, 0]); c.fill();
    ['blood', 'graphite', 'graphite'].forEach((k, i) => { c.fillStyle = rgba(k, 1); c.beginPath(); c.arc(24 + i * 22, -CHROME / 2, 6, 0, TAU); c.fill(); });
    const ux = 100, uw = w - 130;
    c.fillStyle = rgba('ink2', 1); c.beginPath(); c.roundRect(ux, -CHROME + 9, uw, CHROME - 18, 14); c.fill();
    const url = o.url ?? 'https://pixel.dev';
    const n = Math.round(url.length * clamp(o.typed ?? 1));
    c.font = font(F.mono(400), 16); c.fillStyle = rgba('ash', 1);
    c.fillText(url.slice(0, n), ux + 16, -CHROME / 2 + 6);
    if (n < url.length) { c.fillStyle = rgba('signal', 1); c.fillRect(ux + 18 + measure(url.slice(0, n), F.mono(400), 16), -CHROME / 2 - 8, 9, 18); }
  }
  // the frame (drawn on by `draw`)
  const per = 2 * (w + h + CHROME);
  c.strokeStyle = rgba('bone', 0.55); c.lineWidth = 1.4 / z;
  c.setLineDash([per * d, per]);
  c.beginPath(); c.roundRect(0, -CHROME, w, h + CHROME, 14); c.stroke();
  c.setLineDash([]);
  c.restore();
}

/** Mouse pointer with its tip at the current transform's origin. */
export function drawCursor(c: CanvasRenderingContext2D, z: number, a = 1, press = 0) {
  if (a <= 0.003) return;
  c.save();
  const s = 1.15 * (1 - 0.12 * press);
  c.scale(s, s);
  c.globalAlpha = a;
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(0, 26); c.lineTo(6.5, 20); c.lineTo(11, 30); c.lineTo(15.5, 28); c.lineTo(11, 18.5); c.lineTo(19, 18.5); c.closePath();
  c.fillStyle = rgba('bone', 1); c.fill();
  c.strokeStyle = rgba('ink', 1); c.lineWidth = 1.6 / (z * s); c.stroke();
  c.restore();
}

export interface CodeLine { text: string; t0: number; t1?: number; indent?: number }
const TOKEN = /(\/\/.*$|<\/?[\w-]+|\/?>|"[^"]*"?|'[^']*'?|\b(?:const|let|await|async|function|return|fetch)\b|[\w-]+(?=\s*:)|[\w.]+(?=\()|[{}();=]|\s+|[^\s<>"'{}();=]+)/g;
function tokColor(tok: string) {
  if (tok.startsWith('//')) return rgba('graphite', 1);
  if (tok.startsWith('<') || tok.endsWith('>')) return rgba('signal', 1);
  if (tok.startsWith('"') || tok.startsWith("'")) return rgba('ember', 1);
  if (/^(const|let|await|async|function|return|fetch)$/.test(tok)) return rgba('signal', 1);
  if (/^[{}();=]$/.test(tok)) return rgba('ash', 1);
  return rgba('bone', 0.92);
}
/**
 * Editor panel, top-left at the current transform's origin: a title tab and lines typed in on time
 * (each line types over [t0, t1]). `hl(i)` highlights a line (0..1).
 */
export function drawCode(c: CanvasRenderingContext2D, z: number, w: number, h: number, title: string, lines: CodeLine[], t: number, o: { alpha?: number; size?: number; hl?: (i: number) => number; props?: boolean } = {}) {
  const A = o.alpha ?? 1;
  if (A <= 0.003) return;
  const size = o.size ?? 21, lh = size * 1.6, fam = F.mono(400);
  c.save();
  c.globalAlpha = A;
  c.fillStyle = rgba('ink2', 0.97); c.beginPath(); c.roundRect(0, 0, w, h, 14); c.fill();
  c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1 / z; c.stroke();
  c.fillStyle = rgba('ink', 1); c.beginPath(); c.roundRect(0, 0, w, 44, [14, 14, 0, 0]); c.fill();
  c.fillStyle = rgba('signal', 1); c.fillRect(22, 40, measure(title, F.mono(500), 15) + 4, 3);
  c.font = font(F.mono(500), 15); c.fillStyle = rgba('bone', 0.9); c.fillText(title, 24, 28);
  c.beginPath(); c.rect(0, 44, w, h - 44); c.clip();
  const adv = measure('M', fam, size);
  c.font = font(fam, size);
  lines.forEach((ln, i) => {
    if (t < ln.t0) return;
    const y = 44 + 26 + (i + 0.75) * lh;
    const hk = o.hl ? o.hl(i) : 0;
    if (hk > 0.003) { c.fillStyle = rgba('signal', 0.14 * hk); c.fillRect(0, y - lh * 0.72, w, lh); c.fillStyle = rgba('signal', hk); c.fillRect(0, y - lh * 0.72, 4, lh); }
    c.font = font(F.mono(400), size * 0.72); c.fillStyle = rgba('graphite', 1);
    c.textAlign = 'right'; c.fillText(String(i + 1), 44, y); c.textAlign = 'left';
    c.font = font(fam, size);
    const len = ln.text.length;
    const t1 = ln.t1 ?? ln.t0 + Math.max(0.2, len * 0.025);
    const shown = Math.ceil(len * prog(t, ln.t0, t1) - 1e-6);
    let x = 64 + (ln.indent ?? 0) * adv * 2, n = 0;
    for (const m of ln.text.matchAll(TOKEN)) {
      if (n >= shown) break;
      const tok = m[0].slice(0, shown - n);
      c.fillStyle = tokColor(m[0]);
      c.fillText(tok, x, y);
      x += tok.length * adv; n += m[0].length;
    }
    if (shown < len && shown > 0) { c.fillStyle = rgba('signal', 1); c.fillRect(x + 2, y - size * 0.8, adv * 0.6, size); }
  });
  c.restore();
}
