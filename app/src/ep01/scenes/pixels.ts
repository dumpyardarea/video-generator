// PIXELS (chapter 9, "And then, pixels") — "At this point the browser has the HTML, the styles and the scripts. It
// still has to draw. How it turns code into pixels is a story of its own: the next video."
// At the laptop: three file tiles (HTML, CSS, JS) dock into it as they are named; above, an empty browser viewport
// starts to fill with pixels, row by row, on "draw", and stops half-way: that's the next video (a pill says so).
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp } from '../../engine/util';
import type { Cam } from '../../scenes/_vo';
import { EpScene, ST, drawStation, pill, slab, rgba, setWorld, font, F, LIN, w2s } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const VIEW = { x: -420, y: -390, w: 840, h: 288, px: 24 };
const FILES: [string, string][] = [['HTML', 'bone'], ['CSS', 'signal'], ['JS', 'ember']];

export default class Pixels extends EpScene {
  q = 'At this point the browser has the HTML';
  w: Record<string, Word> = {};

  setup() {
    const g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      html: g('At this point the browser has the HTML', 'html'), styles: g('At this point the browser has the HTML', 'styles'), scripts: g('At this point the browser has the HTML', 'scripts'),
      draw: g('At this point the browser has the HTML', 'draw'), pixels: g('How it turns code into pixels', 'pixels'), next: g('How it turns code into pixels', 'next'),
    };
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 0, -30, 1.0)
      .key(end - 1.2, 0, -120, 0.96, 0, ease.linear)
      .key(end - 0.05, 1800, -60, 0.37, 0, ease.inOutCubic);
    this.captions();
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, end = this.ctx.end;
    const out = prog(t, end - 1.2, end - 0.3);
    drawStation(ctx, c, ST.laptop, 1, 0.5);
    // the files docking in
    const said = [w.html, w.styles, w.scripts];
    FILES.forEach(([name, col], i) => {
      const k = prog(t, said[i]!.start - 0.2, said[i]!.end + 0.5, ease.inOutCubic), a = prog(t, said[i]!.start - 0.3, said[i]!.start) * (1 - out);
      if (a <= 0.003) return;
      const x0 = -700 + i * 160, x = lerp(x0, -150 + i * 150, k), y = lerp(300, 205, k);
      setWorld(ctx, c, x, y);
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(-50, -62, 100, 124, 10); ctx.fill();
      ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 2; ctx.stroke();
      ctx.font = font(F.mono(600), 26); ctx.fillStyle = rgba(col, 1); ctx.textAlign = 'center'; ctx.fillText(name, 0, 10); ctx.textAlign = 'left';
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
    // the viewport: pixels, row by row, stopping half-way
    const va = prog(t, w.draw.start - 0.6, w.draw.start) * (1 - out);
    if (va > 0.003) {
      setWorld(ctx, c, VIEW.x, VIEW.y);
      ctx.globalAlpha = va;
      ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(-16, -48, VIEW.w + 32, VIEW.h + 64, 14); ctx.fill();
      ctx.strokeStyle = rgba('ash', 0.6); ctx.lineWidth = 1.5; ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = rgba('graphite', 1); ctx.beginPath(); ctx.arc(10 + i * 24, -24, 7, 0, Math.PI * 2); ctx.fill(); }
      const cols = VIEW.w / VIEW.px, rows = VIEW.h / VIEW.px, n = cols * rows;
      const k = prog(t, w.draw.start, w.next.start, ease.inOutQuad) * 0.55;
      const shown = Math.floor(n * k);
      for (let j = 0; j < shown; j++) {
        const cx = j % cols, cy = Math.floor(j / cols);
        const h = Math.sin(cx * 12.99 + cy * 78.23) * 43758.55, f = h - Math.floor(h);
        const col = cy < 2 ? 'bone' : cy < 3 ? 'graphite' : f > 0.82 ? 'signal' : f > 0.5 ? 'ash' : 'bone';
        ctx.fillStyle = rgba(col, cy < 2 ? 0.95 : 0.5 + 0.4 * f);
        ctx.fillRect(cx * VIEW.px + 1, cy * VIEW.px + 1, VIEW.px - 2, VIEW.px - 2);
      }
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, 'STILL TO DO: TURN CODE INTO PIXELS', 0, VIEW.y - 80, 15, rgba('ash', va), 'center', 600);
    }
    pill(ctx, c, 0, VIEW.y + VIEW.h / 2 + 30, 'THE NEXT VIDEO', { a: prog(t, w.next.start - 0.1, w.next.end + 0.3) * (1 - out), size: 26 });
  }

  override drawFx(t: number, c: Cam, X: LineBatch) {
    const s = w2s(c, ST.laptop.x, ST.laptop.y), a = 1 - prog(t, this.ctx.end - 1.2, this.ctx.end - 0.5);
    X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 40 * c.z, [LIN.signal[0] * 0.5, LIN.signal[1] * 0.5, LIN.signal[2] * 0.5], 0.5 * a);
  }
}
