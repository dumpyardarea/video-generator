// The EP01 Shorts (9:16, 1080x1920): the series' look (journey map, phosphor packet, contour ground) re-laid out for
// a phone held upright, never cropped from 16:9. Layout is written in SCREEN px through S(): the camera holds at
// zoom Z, so every station label, card and pill comes out about 1.5x the long-form size.
// Safe area: YouTube's Shorts overlay covers the bottom ~22% (title, channel, sound) and a column down the right
// edge (like, comment, share) from about y 1050; plates keep their content in x 60..900 above it, and the
// captions sit low, at y ~1450 (two rows end ~1520), big, just above the overlay.
import type { Line } from '../../engine/lyrics';
import { prog } from '../../engine/util';
import { EpScene, type Station } from '../_ep';
import type { P } from '../../scenes/_vo';

export const Z = 1.5;
/** World point for a screen position (the camera holds at the frame's centre, zoom Z). */
export const S = (x: number, y: number): P => ({ x: x / Z, y: y / Z });
/** A station placed in screen px, radius in screen px. */
export const stS = (x: number, y: number, name: string, sub: string, r = 54): Station => ({ x: x / Z, y: y / Z, name, sub, r: r / Z });

export abstract class ShortScene extends EpScene {
  override showClock = false;
  /** Lines of the Short by index (a Short is one plate). */
  ln(i: number): Line { return this.ctx.lyrics.lines[i]!; }
  /** 0..1 from just before line i starts to just before line j (default i+1) starts. */
  span(t: number, i: number, j = i + 1, fadeIn = 0.35, fadeOut = 0.35) {
    const a = this.ln(i), b = this.ctx.lyrics.lines[j];
    const end = b ? b.start : this.ctx.end;
    return prog(t, a.start - fadeIn - 0.1, a.start - 0.1) * (1 - prog(t, end - fadeOut, end - 0.05));
  }
  /** The camera holds still (no per-word pulses); a slow drift keeps the frame alive. */
  holdCamera(drift = 12) {
    this.cam.key(this.ctx.start, 540 / Z, 960 / Z, Z).key(this.ctx.end, 540 / Z, 960 / Z - drift / Z, Z * 1.015);
  }
  /** Every line as a big caption above the Shorts overlay. */
  shortCaptions(y = 1450, size = 60) {
    for (const l of this.lines) this.captionLine(l.text, { x: 70, y, size, maxW: 860 });
  }
}
