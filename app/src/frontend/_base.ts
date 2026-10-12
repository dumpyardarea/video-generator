// Base plate for the frontend series: the dot-grid canvas under a Cam2D, one Canvas2D layer for the world,
// the narration set as karaoke type in the world (say()), and an additive LineBatch for the cursor and
// glows. The bottom subtitle band (Subs) is only a fallback for a plate that has nowhere to set its words.
// See channel/craft-notes.md for what a plate is expected to do.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import type { Line, Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import { prog } from '../engine/util';
import { Cam2D, setGrid, lineOf, label, setWorld, placeRow, rowWidth, drawKaraoke, type Cam, type KWord } from '../scenes/_vo';
import { Subs, ARCH, CHROME } from './_fe';
import { dotGridPass } from './_inspect';

/** The page's slot in the HTML / CSS / JS plates (world px; the cut between them is seamless). */
export const PAGE = { x: -880, y: -250, w: 900, h: 540 };
/** Baseline of the heading above the page's browser bar. */
export const HEAD_Y = PAGE.y - CHROME - 34;
/** The code / DevTools panel next to it. */
export const CODE = { x: 70, y: -296, w: 780, h: 586 };

/** The series' type (style registry): narrow Archivo for words, narrower and heavier for slams. */
export const SAY = ARCH(75, 700);
export const SLAM = ARCH(62, 900);

/** Section heading above the page: "01  HTML" (types in at t0). */
export function heading(ctx: CanvasRenderingContext2D, c: Cam, t: number, num: string, name: string, _what: string, t0: number, _t1: number, alpha = 1) {
  const a = prog(t, t0, t0 + 0.2) * alpha;
  if (a <= 0) return;
  setWorld(ctx, c, PAGE.x, HEAD_Y - 84);
  label(ctx, `${num} / ${name.slice(0, Math.ceil(name.length * prog(t, t0, t0 + 0.25)))}`, 0, 0, { size: 15, col: rgba('ash', a) });
}

export abstract class FeScene extends Scene {
  cam = new Cam2D();
  grid = dotGridPass();
  ui = new Layer2D();
  fx = new LineBatch(20000);
  subs: Subs | null = null;
  L!: Line;
  /** Karaoke words in the world. */
  kw: KWord[] = [];
  /** A phrase of this plate's script line. */
  abstract q: string;
  gridInk = 1;
  /** 0 = dark canvas, 1 = paper. */
  paper = 0;
  /** Fall back to the subtitle band. */
  useSubs = false;

  override init() {
    this.L = lineOf(this.ctx.lyrics, this.q);
    if (this.useSubs) this.subs = new Subs([this.L]);
    this.setup();
  }
  abstract setup(): void;
  /** Draw the world into the 2D layer (camera c). */
  abstract draw(t: number, c: Cam, ctx: CanvasRenderingContext2D, f: Frame): void;
  /** Additive cursor / glow lines (screen px). */
  drawFx(_t: number, _c: Cam, _X: LineBatch): void {}
  /** Drawn over the karaoke (screen-space overlays, hand-offs). */
  drawTop(_t: number, _c: Cam, _ctx: CanvasRenderingContext2D): void {}
  post(_t: number): PostOverrides { return {}; }
  subsAlpha(_t: number) { return 1; }
  /** Opacity of a karaoke group over time (plates override to fade rows out). */
  kAlpha(_g: string, _t: number) { return 1; }
  /** Screen position of the cursor (for the canvas's glow), or null. */
  penScreen(_t: number): [number, number] | null { return null; }

  /**
   * Set words in the world, left-aligned from (x, baseline y), wrapping at maxW. Each row appears just
   * before its first word is said. Returns the block's height.
   */
  say(words: Word[], x: number, y: number, size: number, group: string, o: { maxW?: number; fam?: string; lead?: number; hot?: string; done?: string; tracking?: number; align?: 'left' | 'center' | 'right' } = {}) {
    const fam = o.fam ?? SAY, maxW = o.maxW ?? 1e9, lh = size * (o.lead ?? 1.08);
    const rows: Word[][] = [[]];
    for (const w of words) {
      const row = rows[rows.length - 1]!;
      if (row.length && rowWidth([...row, w].map((v) => v.w), size, fam, o.tracking ?? 0) > maxW) rows.push([w]);
      else row.push(w);
    }
    rows.forEach((r, i) => {
      const wd = rowWidth(r.map((v) => v.w), size, fam, o.tracking ?? 0);
      const x0 = o.align === 'center' ? x - wd / 2 : o.align === 'right' ? x - wd : x;
      const ws = placeRow(r, x0, y + i * lh, size, fam, group, { ant: 0.3, tracking: o.tracking, hot: o.hot, done: o.done }).words;
      this.kw.push(...ws);
    });
    return rows.length * lh;
  }
  /** The words of this plate's line from the one matching `from` to the one matching `to` (inclusive). */
  span(from: Word, to: Word) { return this.L.words.slice(from.index, to.index + 1); }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, c = this.cam.at(t);
    const pen = this.penScreen(t);
    setGrid(this.grid, c, { ink: this.gridInk, paper: this.paper, pen: pen ? [pen[0], pen[1], 1] : [0, 0, 0] });
    this.grid.render(renderer, out);
    const U = this.ui;
    U.clear();
    this.draw(t, c, U.ctx, f);
    U.ctx.setTransform(1, 0, 0, 1, 0, 0);
    U.ctx.globalAlpha = 1;
    drawKaraoke(U.ctx, c, t, this.kw, { alpha: (g, tt) => this.kAlpha(g, tt), paper: this.paper > 0.5 });
    if (this.subs) this.subs.draw(U.ctx, t, this.subsAlpha(t));
    this.drawTop(t, c, U.ctx);
    U.ctx.setTransform(1, 0, 0, 1, 0, 0);
    comp.draw(renderer, U.upload(), out);
    this.fx.clear();
    this.drawFx(t, c, this.fx);
    this.fx.render(renderer, out);
    return { bloom: 0.5, bloomThreshold: 0.86, vignette: 0.34, grain: 0.04, ...this.post(t) };
  }
}
export { F, font, measure };
