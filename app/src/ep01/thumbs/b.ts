// THUMBNAIL B (EP01): the myth, measured. The whole 0.79 s as one wide bar, almost all grey (round trips,
// handshakes, the network); the server's 15 ms a thin green sliver, circled. Words: "Not the server?" (3) and the number "15 ms".
import type { Cam } from '../../scenes/_vo';
import { EpScene, rgba, font, SAY, F, W, H } from '../_ep';
import { RUN1, NAV1 } from '../waterfall-data';

export default class ThumbB extends EpScene {
  q = 'You type a web address';
  override showClock = false;
  setup() { this.cam.key(0, 900, 300, 0.8); }
  draw(_t: number, _c: Cam, ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = rgba('ink', 0.55); ctx.fillRect(0, 0, W, H);
    const r0 = RUN1[0]!;
    const parts: [number, string][] = [[r0.dns, 'graphite'], [r0.tcp, 'ash'], [r0.tls, 'graphite'], [r0.wait - 15, 'ash'], [15, 'signal'], [r0.end - NAV1.ttfb, 'graphite'], [NAV1.load - r0.end, 'ash']];
    const total = parts.reduce((s, p) => s + p[0], 0), x0 = 90, wd = W - 180, y = 640, h = 190;
    let x = x0, sx = 0;
    parts.forEach(([ms, col], i) => {
      const pw = (ms / total) * wd;
      ctx.fillStyle = rgba(col, i === 4 ? 1 : 0.75); ctx.fillRect(x + 2, y, pw - 4, h);
      if (i === 4) sx = x + pw / 2;
      x += pw;
    });
    // the sliver, circled
    ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(sx, y + h / 2, 150, 0, Math.PI * 2); ctx.stroke();
    ctx.font = font(F.mono(700), 92); ctx.fillStyle = rgba('signal', 1); ctx.textAlign = 'center';
    ctx.fillText('15 ms', sx, y + h + 150);
    ctx.textAlign = 'left';
    // the claim
    ctx.font = font(SAY, 200); ctx.fillStyle = rgba('bone', 1);
    ctx.fillText('Not the', x0, 260);
    ctx.fillText('server?', x0, 470);
  }
}
