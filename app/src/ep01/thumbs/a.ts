// THUMBNAIL A (EP01): the keypress and what it set off. A huge green Enter key on the left; on the right the journey
// map, every route lit, and the measured total in big mono: "0.8 s". Words: "0.8 s", "12 systems" (3).
import type { Cam } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, drawStation, drawRoute, rgba, font, label, SAY, F, W, H, type StationKey } from '../_ep';
import { returnArrow } from '../../scenes/_vo';
import type { LineBatch } from '../../engine/lines';

const ALL: StationKey[] = ['laptop', 'router', 'hop1', 'resolver', 'root', 'tld', 'auth', 'hop2', 'server', 'images'];

export default class ThumbA extends EpScene {
  q = 'You type a web address';
  override showClock = false;
  setup() { this.cam.key(0, 321, -357, 0.28); } // the laptop sits at the key's right edge, so every route leaves the key
  draw(_t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    for (const k of ALL) drawStation(ctx, c, ST[k], 0.75, k === 'laptop' || k === 'server' ? 1 : 0.35, { name: '', sub: '' });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // a dark wash on the left for the key
    const g = ctx.createLinearGradient(0, 0, 1100, 0);
    g.addColorStop(0, rgba('ink', 0.92)); g.addColorStop(0.7, rgba('ink', 0.6)); g.addColorStop(1, rgba('ink', 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1100, H);
    // the Enter key
    ctx.save();
    ctx.translate(110, 300);
    ctx.shadowColor = rgba('signal', 0.6); ctx.shadowBlur = 80;
    ctx.fillStyle = rgba('signal', 1); ctx.beginPath(); ctx.roundRect(0, 0, 760, 400, 56); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = rgba('blood', 0.35); ctx.beginPath(); ctx.roundRect(0, 330, 760, 70, [0, 0, 56, 56]); ctx.fill();
    ctx.font = font(SAY, 190); ctx.fillStyle = rgba('ink', 1); ctx.fillText('Enter', 70, 240);
    ctx.strokeStyle = rgba('ink', 1); ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; returnArrow(ctx, 640, 170, 70);
    ctx.restore();
    // the total
    ctx.font = font(F.mono(700), 250); ctx.textAlign = 'right'; ctx.fillStyle = rgba('bone', 1);
    ctx.shadowColor = rgba('ink', 0.9); ctx.shadowBlur = 40;
    ctx.fillText('0.8 s', W - 90, 300);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    label(ctx, '12 SYSTEMS', W - 96, 400, { size: 64, col: rgba('signal', 1), align: 'right', weight: 700, spacing: 8 });
  }
  override drawFx(_t: number, c: Cam, X: LineBatch) {
    for (const r of Object.values(ROUTES)) drawRoute(X, c, r, 1, 1);
  }
}
