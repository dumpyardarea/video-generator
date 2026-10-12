// JS — "And JavaScript is the behavior. Click a button, open a menu, load new data. That's JavaScript."
// The styled page from CSS; app.js replaces style.css. "And JavaScript is the behavior." sets itself above
// the page. A mouse pointer acts out each phrase while its handler types, the phrase set beside it:
// "Click a button" presses Sign up (a toast drops in, the event inspected), "open a menu" opens Docs,
// "load new data." turns the cards into spinners and fills them (a fetch, 200). "That's JavaScript."
// lands big in the panel. Then the camera dives into the page and its box expands into HOUSE.
import type { Word } from '../../engine/lyrics';
import { clamp, ease, lerp, prog, pulse } from '../../engine/util';
import { setWorld, type Cam } from '../../scenes/_vo';
import { FeScene, PAGE, CODE, HEAD_Y, heading, SLAM } from '../_base';
import { drawPage, drawBrowser, drawCode, drawCursor, pick, pageRects, cardsBox, CHROME, type CodeLine } from '../_fe';
import { inspect, expandBox, screenRect } from '../_inspect';
import { codeLineY } from './html';

export default class Js extends FeScene {
  q = 'And JavaScript is the behavior';
  w: Record<string, Word> = {};
  css: CodeLine[] = [];
  code: CodeLine[] = [];
  path: [number, number, number][] = [];

  setup() {
    const w = (this.w = pick(this.L, ['and', ['js1', 'JavaScript', 0], 'behavior', 'click', 'button', 'open', 'menu', 'load', 'data', 'thats', ['js2', 'JavaScript', 1]]));
    this.css = ['body   { background: #121a28; }', 'button { background: #27C4FF; }', 'h1     { font-family: "Archivo"; }', 'main   { padding: 48px; gap: 24px; }', '.hero  { display: grid;', '         grid: auto / 1fr 1fr; }']
      .map((text) => ({ text, t0: -1, t1: -1 }));
    const tl = (wd: Word, d = 0, n = 0.55) => ({ t0: wd.start + d, t1: wd.start + d + n });
    this.code = [
      { text: 'signup.onclick = () => toast("Thanks!");', ...tl(w.click) },
      { text: 'docs.onclick = () => menu.toggle();', ...tl(w.open) },
      { text: 'const posts = await fetch("/api/posts");', ...tl(w.load) },
      { text: 'render(posts);', ...tl(w.data, 0, 0.3) },
    ];
    this.say(this.span(w.and, w.behavior), PAGE.x, HEAD_Y - 6, 58, 'head');
    const right = CODE.x + CODE.w - 26, Lw = this.L.words;
    this.say(Lw.slice(w.click.index, w.button.index + 1), right, codeLineY(0) + 2, 30, 'n', { align: 'right' });
    this.say(Lw.slice(w.open.index, w.menu.index + 1), right, codeLineY(1) + 2, 30, 'n', { align: 'right' });
    this.say(Lw.slice(w.load.index, w.data.index + 1), right, codeLineY(2) + 2, 30, 'n', { align: 'right' });
    this.say([w.thats, w.js2], CODE.x + 40, CODE.y + CODE.h - 70, 92, 'slam', { fam: SLAM });
    // the pointer, in page px: rest, the button, the Docs link, the cards, away
    this.path = [
      [w.behavior.start, 640, 470], [w.click.start + 0.35, 130, 270], [w.open.start, 130, 270], [w.open.start + 0.35, 752, 40],
      [w.load.start, 752, 40], [w.load.start + 0.4, 450, 430], [w.thats.start, 470, 440], [w.thats.start + 0.5, 700, 520],
    ];
    const end = this.ctx.end;
    this.cam.key(this.ctx.start, -10, -10, 1.02)
      .key(w.click.start + 0.3, -16, 20, 1.03, 0, ease.inOutCubic)
      .key(w.open.start + 0.3, -8, -30, 1.03, 0, ease.inOutCubic)
      .key(w.load.start + 0.4, -16, 30, 1.03, 0, ease.inOutCubic)
      .key(w.thats.start + 0.2, 0, 0, 1.0, 0, ease.inOutCubic)
      .key(end - 0.55, 0, 0, 1.0, 0, ease.linear)
      .key(end - 0.02, PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2, 1.8, 0, ease.inOutCubic);
  }
  swap(t: number) { return prog(t, this.w.js1.start, this.w.js1.start + 0.5, ease.inOutCubic); }
  cursor(t: number): [number, number] {
    const p = this.path;
    if (t <= p[0]![0]) return [p[0]![1], p[0]![2]];
    for (let i = 1; i < p.length; i++) {
      const b = p[i]!;
      if (t > b[0]) continue;
      const a = p[i - 1]!, k = ease.inOutCubic(clamp((t - a[0]) / Math.max(1e-3, b[0] - a[0])));
      return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    }
    const e = p[p.length - 1]!;
    return [e[1], e[2]];
  }
  hl(i: number, t: number) {
    const w = this.w;
    const all = prog(t, w.thats.start, w.thats.start + 0.15);
    const wd = [w.click, w.open, w.load, w.data][i]!;
    return Math.max(all, prog(t, wd.start, wd.start + 0.1) * (1 - prog(t, wd.end + 0.4, wd.end + 0.8)));
  }
  override kAlpha(g: string, t: number) {
    const out = 1 - prog(t, this.ctx.end - 0.5, this.ctx.end - 0.2);
    if (g === 'n') return prog(t, this.w.js1.start + 0.3, this.w.js1.start + 0.6) * out;
    return out;
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, s = this.swap(t);
    const tPress = w.button.start + 0.05;
    const press = t >= tPress ? Math.pow(0.5, (t - tPress) / 0.12) : 0;
    const reload = prog(t, w.load.start, w.load.start + 0.15) * (1 - prog(t, w.data.end + 0.15, w.data.end + 0.55));
    const menu = prog(t, w.menu.start, w.menu.start + 0.25) * (1 - prog(t, w.load.start + 0.1, w.load.start + 0.3));
    setWorld(ctx, c, PAGE.x, PAGE.y);
    drawPage(ctx, c.z, PAGE.w, PAGE.h, {
      t, press, menu, data: 1 - reload, loading: reload,
      toast: prog(t, tPress + 0.05, tPress + 0.3) * (1 - prog(t, w.open.start + 0.6, w.open.start + 0.9)),
    });
    drawBrowser(ctx, c.z, PAGE.w, PAGE.h, {});
    // each event, inspected where it happens
    const { el, cards } = pageRects(PAGE.w, PAGE.h);
    const ev = (wd: Word, d: number) => prog(t, wd.start + d, wd.start + d + 0.1) * (1 - prog(t, wd.end + 0.6, wd.end + 0.9));
    const fb = ev(w.button, 0.05);
    if (fb > 0) inspect(ctx, c.z, el[4]!, prog(t, tPress, tPress + 0.4), { tag: 'click', meta: 'button#signup', padding: 8 }, fb);
    if (menu > 0) inspect(ctx, c.z, { x: 752 - 220, y: 54 + 6, w: 240, h: 114 }, prog(t, w.menu.start + 0.1, w.menu.start + 0.5), { tag: 'toggle', meta: 'menu.open = true', below: true }, menu);
    const fd = ev(w.data, 0.3);
    if (fd > 0) inspect(ctx, c.z, cardsBox(cards), prog(t, w.data.start + 0.3, w.data.start + 0.7), { tag: 'fetch', meta: '/api/posts · 200 · 84 ms' }, fd);
    const [cx, cy] = this.cursor(t);
    setWorld(ctx, c, PAGE.x + cx, PAGE.y + cy);
    drawCursor(ctx, c.z, prog(t, w.behavior.start - 0.2, w.behavior.start + 0.1) * (1 - prog(t, this.ctx.end - 0.6, this.ctx.end - 0.4)), press);
    if (s < 1) { setWorld(ctx, c, CODE.x - 40 * s, CODE.y); drawCode(ctx, c.z, CODE.w, CODE.h, 'style.css', this.css, t, { alpha: 1 - s, size: 19 }); }
    if (s > 0) { setWorld(ctx, c, CODE.x + 40 * (1 - s), CODE.y); drawCode(ctx, c.z, CODE.w, CODE.h, 'app.js', this.code, t, { alpha: s * (1 - prog(t, this.ctx.end - 0.5, this.ctx.end - 0.2)), size: 19, hl: (i) => this.hl(i, t) }); }
    heading(ctx, c, t, '02', 'CSS', '', -1, 0, 1 - prog(t, w.js1.start - 0.1, w.js1.start + 0.15));
    heading(ctx, c, t, '03', 'JAVASCRIPT', '', w.js1.start + 0.15, 0, 1 - prog(t, this.ctx.end - 0.5, this.ctx.end - 0.2));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  override drawTop(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const d = prog(t, this.ctx.end - 0.45, this.ctx.end);
    if (d > 0) expandBox(ctx, screenRect(c, PAGE.x, PAGE.y - CHROME, PAGE.w, PAGE.h + CHROME), d);
  }
  override post(t: number) {
    const w = this.w;
    return {
      zoom: 1 + 0.012 * pulse(t, w.js1.start, 0.1) + 0.01 * pulse(t, w.button.start, 0.08) + 0.008 * pulse(t, w.menu.start, 0.08) + 0.02 * pulse(t, w.js2.start, 0.12),
      bloom: 0.5 + 0.25 * pulse(t, w.js2.start, 0.2),
    };
  }
}
