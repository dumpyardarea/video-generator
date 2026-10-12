// HTML — "It starts with HTML. HTML is the structure: headings, text, images and buttons."
// The page from ROLE, in its slot. "It starts with HTML." sets itself above it; on the second "HTML" its
// CSS falls away (white paper, Times, blue links, everything stacked, every element showing its tag)
// and index.html opens beside it. Each named element is typed as a line of markup, its spoken name set
// beside that line, while the inspector selects the element on the page and the camera leans toward it.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { ease, lerp, prog, pulse } from '../../engine/util';
import { setWorld, w2s, type Cam } from '../../scenes/_vo';
import { FeScene, PAGE, CODE, HEAD_Y, heading } from '../_base';
import { drawPage, drawBrowser, drawCode, pick, pageRects, cardsBox, TAGS, type CodeLine } from '../_fe';
import { inspect, drawCrosshair } from '../_inspect';

/** Baseline of line i of a code panel at the given type size. */
export const codeLineY = (i: number, size = 19) => CODE.y + 44 + 26 + (i + 0.75) * size * 1.6;

export default class Html extends FeScene {
  q = 'It starts with HTML';
  w: Record<string, Word> = {};
  code: CodeLine[] = [];
  /** The word that names each element [nav, h1, p, img, btn, cards]. */
  named: Word[] = [];

  setup() {
    const w = (this.w = pick(this.L, ['it', ['html1', 'HTML', 0], ['html2', 'HTML', 1], 'structure', 'headings', 'text', 'images', 'and', 'buttons']));
    this.named = [w.structure, w.headings, w.text, w.images, w.buttons, w.buttons];
    const tl = (wd: Word, d = 0) => ({ t0: wd.start + d, t1: wd.start + d + 0.45 });
    this.code = [
      { text: '<nav>pixel · Home · Docs · Blog</nav>', ...tl(w.structure) },
      { text: '<h1>Build the web.</h1>', ...tl(w.headings) },
      { text: '<p>Every page starts here.</p>', ...tl(w.text) },
      { text: '<img src="hills.png">', ...tl(w.images) },
      { text: '<button>Sign up</button>', ...tl(w.buttons) },
      { text: '<ul> <li>…</li> <li>…</li> </ul>', ...tl(w.buttons, 0.35) },
    ];
    this.say(this.span(w.it, w.html1), PAGE.x, HEAD_Y - 6, 58, 'a');
    this.say(this.span(w.html2, w.structure), PAGE.x, HEAD_Y - 6, 58, 'b');
    // the spoken names, beside the markup they produce
    const right = CODE.x + CODE.w - 26;
    this.say([w.headings], right, codeLineY(1) + 2, 30, 'n', { align: 'right' });
    this.say([w.text], right, codeLineY(2) + 2, 30, 'n', { align: 'right' });
    this.say([w.images], right, codeLineY(3) + 2, 30, 'n', { align: 'right' });
    this.say([w.and, w.buttons], right, codeLineY(4) + 2, 30, 'n', { align: 'right' });
    // the camera leans toward each named element
    const { el } = pageRects(PAGE.w, PAGE.h, 0, 0);
    // (page and panel span ~1700 px: above ~1.03 there's no room to lean without losing one of them)
    const K = this.cam.key(this.ctx.start, 0, 0, 1.0).key(w.html2.start, -10, -10, 1.02, 0, ease.inOutCubic);
    this.named.slice(0, 5).forEach((wd, i) => {
      const r = el[i]!;
      K.key(wd.start + 0.35, -14 + (i % 2) * 8, lerp(-20, PAGE.y + r.y + r.h / 2, 0.08), 1.03, 0, ease.inOutCubic);
    });
    K.key(this.ctx.end, -10, -10, 1.02, 0, ease.inOutCubic);
  }
  strip(t: number) { return prog(t, this.w.html2.start - 0.1, this.w.html2.start + 0.8, ease.inOutCubic); }
  hotOf(i: number, t: number) {
    const wd = this.named[i]!, d = i === 5 ? 0.35 : 0;
    return prog(t, wd.start + d, wd.start + d + 0.1) * (1 - prog(t, wd.end + 0.25, wd.end + 0.6));
  }
  override kAlpha(g: string, t: number) {
    if (g === 'a') return 1 - prog(t, this.w.html2.start - 0.25, this.w.html2.start - 0.05);
    if (g === 'n') return prog(t, this.w.html2.start, this.w.html2.start + 0.3) * (1 - prog(t, this.ctx.end - 0.3, this.ctx.end - 0.05));
    return 1;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, k = this.strip(t);
    const named = this.named.map((wd, i) => prog(t, wd.start + (i === 5 ? 0.35 : 0), wd.start + (i === 5 ? 0.5 : 0.15)));
    const on = named.map((n) => lerp(1, 0.22 + 0.78 * n, k));
    setWorld(ctx, c, PAGE.x, PAGE.y);
    drawPage(ctx, c.z, PAGE.w, PAGE.h, { color: 1 - k, font: 1 - k, space: 1 - k, layout: 1 - k, tags: k * 0.6, on, t });
    drawBrowser(ctx, c.z, PAGE.w, PAGE.h, {});
    // the inspector on the element being named
    const { el, cards } = pageRects(PAGE.w, PAGE.h, 1 - k, 1 - k);
    const boxes = [...el, cardsBox(cards)];
    boxes.forEach((r, i) => {
      const hk = this.hotOf(i, t);
      if (hk <= 0) return;
      const t0 = this.named[i]!.start + (i === 5 ? 0.35 : 0);
      inspect(ctx, c.z, r, prog(t, t0, t0 + 0.4), { tag: TAGS[i]!.replace(/[<>]/g, ''), meta: `${Math.round(r.w)} × ${Math.round(r.h)}`, content: true, below: i === 0 }, hk);
    });
    const ca = prog(t, w.html2.start, w.html2.start + 0.4, ease.outCubic);
    setWorld(ctx, c, CODE.x + 60 * (1 - ca), CODE.y);
    drawCode(ctx, c.z, CODE.w, CODE.h, 'index.html', this.code, t, { alpha: ca, size: 19, hl: (i) => this.hotOf(i, t) });
    heading(ctx, c, t, '01', 'HTML', '', w.html2.start + 0.1, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  cursorAt(t: number): [number, number] | null {
    if (t > this.ctx.end - 0.3) return null;
    const k = this.strip(t);
    const { el, cards } = pageRects(PAGE.w, PAGE.h, 1 - k, 1 - k);
    const boxes = [...el, cardsBox(cards)];
    let pi = -1;
    this.named.forEach((wd, i) => { if (i < 5 && t >= wd.start - 0.15) pi = i; });
    if (pi < 0) return null;
    // glide from the last element's corner to this one's
    const u = prog(t, this.named[pi]!.start - 0.15, this.named[pi]!.start + 0.15, ease.inOutCubic);
    const a = boxes[Math.max(0, pi - 1)]!, b = boxes[pi]!;
    return [PAGE.x + lerp(a.x + a.w, b.x + b.w, u), PAGE.y + lerp(a.y, b.y, u)];
  }
  override penScreen(t: number) { const p = this.cursorAt(t); return p ? w2s(this.cam.at(t), p[0], p[1]) : null; }
  override drawFx(t: number, _c: Cam, X: LineBatch) { drawCrosshair(X, t, (tt) => this.penScreen(tt), { scale: 0.8 }); }
  override post(t: number) {
    // the raw page is white paper: keep it from blooming into a halo
    const k = this.strip(t);
    return { zoom: 1 + 0.012 * pulse(t, this.w.html2.start, 0.1), bloom: lerp(0.5, 0.2, k), bloomThreshold: lerp(0.86, 0.97, k), halation: lerp(0.25, 0.04, k) };
  }
}
