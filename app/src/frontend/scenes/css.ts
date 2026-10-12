// CSS — "Then CSS. CSS is the style: colors, fonts, spacing and layout."
// The raw page from HTML. "Then CSS." sets itself above it; on the second "CSS" the tags go and style.css
// replaces index.html. Each rule types on its word, the word set beside its line, and the page follows
// while the inspector shows what changed: "colors" the body's swatches, "fonts" the h1's typeface,
// "spacing" the hero's padding and the cards' gap as box-model bands with rulers, "layout" the grid's
// two column guides.
import type { LineBatch } from '../../engine/lines';
import type { Word } from '../../engine/lyrics';
import { rgba, HEX } from '../../engine/palette';
import { ease, lerp, prog, pulse } from '../../engine/util';
import { setWorld, w2s, type Cam } from '../../scenes/_vo';
import { FeScene, PAGE, CODE, HEAD_Y, heading } from '../_base';
import { drawPage, drawBrowser, drawCode, pick, pageRects, type CodeLine } from '../_fe';
import { inspect, ruler, drawCrosshair, chip } from '../_inspect';
import { codeLineY } from './html';

export default class Css extends FeScene {
  q = 'Then CSS';
  w: Record<string, Word> = {};
  html: CodeLine[] = [];
  code: CodeLine[] = [];
  rules: Word[] = [];

  setup() {
    const w = (this.w = pick(this.L, ['then', ['css1', 'CSS', 0], ['css2', 'CSS', 1], 'style', 'colors', 'fonts', 'spacing', 'and', 'layout']));
    this.html = ['<nav>pixel · Home · Docs · Blog</nav>', '<h1>Build the web.</h1>', '<p>Every page starts here.</p>', '<img src="hills.png">', '<button>Sign up</button>', '<ul> <li>…</li> <li>…</li> </ul>']
      .map((text) => ({ text, t0: -1, t1: -1 }));
    const tl = (wd: Word, d = 0) => ({ t0: wd.start + d, t1: wd.start + d + 0.5 });
    this.code = [
      { text: `body   { background: ${HEX.ink2}; }`, ...tl(w.colors) },
      { text: `button { background: ${HEX.signal}; }`, ...tl(w.colors, 0.3) },
      { text: 'h1     { font-family: "Archivo"; }', ...tl(w.fonts) },
      { text: 'main   { padding: 48px; gap: 24px; }', ...tl(w.spacing) },
      { text: '.hero  { display: grid;', ...tl(w.layout) },
      { text: '         grid: auto / 1fr 1fr; }', ...tl(w.layout, 0.25) },
    ];
    this.rules = [w.colors, w.colors, w.fonts, w.spacing, w.layout, w.layout];
    this.say(this.span(w.then, w.css1), PAGE.x, HEAD_Y - 6, 58, 'a');
    this.say(this.span(w.css2, w.style), PAGE.x, HEAD_Y - 6, 58, 'b');
    const right = CODE.x + CODE.w - 26;
    this.say([w.colors], right, codeLineY(0) + 2, 30, 'n', { align: 'right' });
    this.say([w.fonts], right, codeLineY(2) + 2, 30, 'n', { align: 'right' });
    this.say([w.spacing], right, codeLineY(3) + 2, 30, 'n', { align: 'right' });
    this.say([w.and, w.layout], right, codeLineY(5) + 2, 30, 'n', { align: 'right' });
    this.cam.key(this.ctx.start, -10, -10, 1.02)
      .key(w.colors.start + 0.3, -10, 0, 1.03, 0, ease.inOutCubic)
      .key(w.fonts.start + 0.3, -16, -30, 1.03, 0, ease.inOutCubic)
      .key(w.spacing.start + 0.35, -12, 20, 1.03, -0.003, ease.inOutCubic)
      .key(w.layout.start + 0.4, -6, 0, 1.0, 0, ease.inOutCubic)
      .key(this.ctx.end, -10, -10, 1.02, 0, ease.linear);
  }
  swap(t: number) { return prog(t, this.w.css2.start - 0.1, this.w.css2.start + 0.4, ease.inOutCubic); }
  hl(i: number, t: number) {
    const wd = this.rules[i]!, d = i === 1 ? 0.3 : i === 5 ? 0.25 : 0;
    return prog(t, wd.start + d, wd.start + d + 0.1) * (1 - prog(t, wd.end + 0.3, wd.end + 0.7));
  }
  /** How far each rule has applied (0..1). */
  k(t: number) {
    const w = this.w;
    return {
      color: prog(t, w.colors.start, w.colors.end + 0.35), font: prog(t, w.fonts.start, w.fonts.end + 0.3),
      space: prog(t, w.spacing.start, w.spacing.end + 0.4), layout: prog(t, w.layout.start, w.layout.end + 0.4),
    };
  }
  override kAlpha(g: string, t: number) {
    if (g === 'a') return 1 - prog(t, this.w.css2.start - 0.25, this.w.css2.start - 0.05);
    if (g === 'n') return prog(t, this.w.css2.start, this.w.css2.start + 0.3);
    return 1;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, s = this.swap(t), k = this.k(t);
    setWorld(ctx, c, PAGE.x, PAGE.y);
    drawPage(ctx, c.z, PAGE.w, PAGE.h, { tags: 0.6 * (1 - s), t, ...k });
    drawBrowser(ctx, c.z, PAGE.w, PAGE.h, {});
    const { el, cards } = pageRects(PAGE.w, PAGE.h, k.space, k.layout);
    const fade = (wd: Word) => prog(t, wd.start, wd.start + 0.1) * (1 - prog(t, wd.end + 0.5, wd.end + 0.9));
    // colors: the body, with its swatches
    const fc = fade(w.colors);
    if (fc > 0) {
      inspect(ctx, c.z, { x: 4, y: 4, w: PAGE.w - 8, h: PAGE.h - 8 }, prog(t, w.colors.start, w.colors.start + 0.45), { tag: 'body', meta: 'background · color' }, fc);
      ['ink2', 'bone', 'signal'].forEach((sw, i) => {
        ctx.globalAlpha = fc * prog(t, w.colors.start + 0.2 + i * 0.08, w.colors.start + 0.35 + i * 0.08);
        ctx.fillStyle = rgba(sw, 1); ctx.fillRect(PAGE.w - 150 + i * 46, PAGE.h - 56, 36, 36);
        ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1 / c.z; ctx.strokeRect(PAGE.w - 150 + i * 46, PAGE.h - 56, 36, 36);
      });
      ctx.globalAlpha = 1;
    }
    // fonts: the heading's face
    const ff = fade(w.fonts);
    if (ff > 0) inspect(ctx, c.z, el[1]!, prog(t, w.fonts.start, w.fonts.start + 0.45), { tag: 'h1', meta: k.font < 0.5 ? 'Times New Roman' : 'Archivo 900', content: true }, ff);
    // spacing: the hero's padding and margin, the cards' gap
    const fs = fade(w.spacing);
    if (fs > 0) {
      const hero = { x: el[1]!.x - 18, y: el[1]!.y - 18, w: el[2]!.x + el[2]!.w - el[1]!.x + 36, h: el[4]!.y + el[4]!.h - el[1]!.y + 36 };
      inspect(ctx, c.z, hero, prog(t, w.spacing.start, w.spacing.start + 0.45), { tag: 'main', meta: `padding ${Math.round(lerp(0, 48, k.space))}px`, padding: 18, margin: 14 }, fs);
      const g = cards[1]!.x - (cards[0]!.x + cards[0]!.w);
      if (g > 4) ruler(ctx, c.z, cards[0]!.x + cards[0]!.w, cards[1]!.x, cards[0]!.y + cards[0]!.h + 16, `${Math.round(lerp(0, 24, k.space))}px`, prog(t, w.spacing.start + 0.2, w.spacing.start + 0.5), fs);
    }
    // layout: two column guides
    const fl = fade(w.layout);
    if (fl > 0) {
      const pad = PAGE.w * 0.06, gl = prog(t, w.layout.start, w.layout.start + 0.4);
      ctx.save();
      ctx.globalAlpha = fl;
      ctx.setLineDash([6 / c.z, 6 / c.z]); ctx.strokeStyle = rgba('signal', 0.8); ctx.lineWidth = 1.2 / c.z;
      for (const x of [pad, PAGE.w * 0.5 - pad * 0.5, PAGE.w * 0.58, PAGE.w - pad]) {
        ctx.beginPath(); ctx.moveTo(x, PAGE.h * 0.12); ctx.lineTo(x, PAGE.h * 0.12 + (PAGE.h * 0.48) * gl); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = rgba('signal', 0.06 * gl);
      ctx.fillRect(pad, PAGE.h * 0.12, PAGE.w * 0.5 - pad * 1.5, PAGE.h * 0.48);
      ctx.fillRect(PAGE.w * 0.58, PAGE.h * 0.12, PAGE.w * 0.42 - pad, PAGE.h * 0.48);
      ctx.restore();
      chip(ctx, pad, PAGE.h * 0.12 - 34, '.hero', 'grid · 1fr 1fr', fl * prog(t, w.layout.start + 0.2, w.layout.start + 0.4));
    }
    if (s < 1) { setWorld(ctx, c, CODE.x - 40 * s, CODE.y); drawCode(ctx, c.z, CODE.w, CODE.h, 'index.html', this.html, t, { alpha: 1 - s, size: 19 }); }
    if (s > 0) { setWorld(ctx, c, CODE.x + 40 * (1 - s), CODE.y); drawCode(ctx, c.z, CODE.w, CODE.h, 'style.css', this.code, t, { alpha: s, size: 19, hl: (i) => this.hl(i, t) }); }
    heading(ctx, c, t, '01', 'HTML', '', -1, 0, 1 - prog(t, w.css2.start - 0.1, w.css2.start + 0.15));
    heading(ctx, c, t, '02', 'CSS', '', w.css2.start + 0.15, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

  }
  cursorAt(t: number): [number, number] | null {
    const w = this.w, k = this.k(t);
    const { el, cards } = pageRects(PAGE.w, PAGE.h, k.space, k.layout);
    const pts: [number, Word | null, number, number][] = [
      [w.colors.start, w.colors, PAGE.w - 100, PAGE.h - 38], [w.fonts.start, w.fonts, el[1]!.x + el[1]!.w, el[1]!.y],
      [w.spacing.start, w.spacing, cards[1]!.x - 12, cards[0]!.y + cards[0]!.h + 16], [w.layout.start, w.layout, PAGE.w * 0.58, PAGE.h * 0.12],
    ];
    if (t < w.colors.start - 0.2 || t > this.ctx.end - 0.2) return null;
    let i = 0;
    while (i + 1 < pts.length && t >= pts[i + 1]![0] - 0.2) i++;
    const a = pts[Math.max(0, i - 1)]!, b = pts[i]!, u = prog(t, b[0] - 0.2, b[0] + 0.15, ease.inOutCubic);
    return [PAGE.x + lerp(a[2], b[2], i === 0 ? 1 : u), PAGE.y + lerp(a[3], b[3], i === 0 ? 1 : u)];
  }
  override penScreen(t: number) { const p = this.cursorAt(t); return p ? w2s(this.cam.at(t), p[0], p[1]) : null; }
  override drawFx(t: number, _c: Cam, X: LineBatch) { drawCrosshair(X, t, (tt) => this.penScreen(tt), { scale: 0.8 }); }
  override post(t: number) {
    const w = this.w;
    const k = 1 - prog(t, w.colors.start, w.colors.end + 0.35);
    return { zoom: 1 + 0.012 * pulse(t, w.css2.start, 0.1) + 0.008 * [w.colors, w.fonts, w.spacing, w.layout].reduce((a, wd) => a + pulse(t, wd.start, 0.08), 0), bloom: lerp(0.5, 0.2, k), bloomThreshold: lerp(0.86, 0.97, k), halation: lerp(0.25, 0.04, k) };
  }
}
