// ENTER (the hook) — "You type a web address and press Enter. A page appears. I measured it: … about 0.8 seconds.
// In under a second, about a dozen systems took part before a single pixel appeared. Your computer found a server
// it had never met. It agreed on a secret with that server, out in the open. So freeze the clock …"
// An address bar fills the frame; the address types itself, an Enter keycap slams and the clock starts. The page
// appears as the clock reaches 0.786 s. On "about a dozen systems" the camera pulls far back: the whole map, its
// stations lighting one by one. The packet finds the server; two key halves meet between them, "out in the open".
// On "freeze" the clock snaps back to 0.000 and the camera dives back to the laptop, where the next plate starts.
import type { Word } from '../../engine/lyrics';
import { ease, lerp, prog, pulse, TAU, clamp } from '../../engine/util';
import { returnArrow, type Cam } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, drawStation, drawRoute, drawPacket, SAY, MONO, font, rgba, label, setWorld, w2s, F, type StationKey } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const URL = 'en.wikipedia.org/wiki/Domain_Name_System';
const BAR = { x: -775, y: -300, w: 1300, h: 92 }; // bar + gap + key = 1550, centred
const ORDER: StationKey[] = ['laptop', 'router', 'hop1', 'resolver', 'root', 'tld', 'auth', 'hop2', 'server', 'images'];

export default class Enter extends EpScene {
  q = 'You type a web address';
  w: Record<string, Word> = {};

  setup() {
    const g = (l: string, w: string, n = 0) => this.word(l, w, n);
    this.w = {
      type: g('You type a web address', 'type'), address: g('You type a web address', 'address'), enter: g('You type a web address', 'enter'),
      appears: g('A page appears', 'appears'), dozen: g('In under a second', 'dozen'), systems: g('In under a second', 'systems'),
      found: g('Your computer found a server', 'found'), server: g('Your computer found a server', 'server'), never: g('Your computer found a server', 'never'),
      secret: g('It agreed on a secret', 'secret'), open: g('It agreed on a secret', 'open'), freeze: g('So freeze the clock', 'freeze'),
      follow: g('So freeze the clock', 'follow'),
    };
    const w = this.w;
    this.sayLine('You type a web address', BAR.x, BAR.y - 70, 64);
    this.sayLine('A page appears', BAR.x, BAR.y + BAR.h + 640, 64);
    this.sayLine('I measured it', BAR.x, BAR.y + BAR.h + 640, 48, { maxW: 1500 });
    // while the camera pulls back and dives in again, the words stay put on screen: only the picture moves
    this.captionLine('In under a second');
    this.captionLine('Your computer found a server');
    this.captionLine('It agreed on a secret');
    this.captionLine('So freeze the clock');
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 0, -40, 1.12)
      .key(w.enter.start, 0, -30, 1.06, 0, ease.linear)
      .key(w.enter.start + 0.25, 0, -30, 1.0, 0, ease.outExpo)
      .key(w.dozen.start - 0.3, 0, 40, 0.98, 0, ease.linear)
      .key(w.systems.end + 0.3, 1800, -60, 0.37, 0, ease.inOutCubic)
      .key(w.never.end, 2050, -60, 0.4, 0, ease.linear)
      .key(w.open.end, 1750, -60, 0.42, 0, ease.linear)
      .key(w.freeze.start + 0.1, 1700, -60, 0.4, 0, ease.linear)
      .key(end - 0.05, 0, -30, 1.0, 0, ease.inOutCubic);
  }
  /** The bar and page are on screen until the pull-back, and again at the very end. */
  near(t: number) { const w = this.w; return 1 - prog(t, w.dozen.start - 0.2, w.dozen.start + 0.5) + prog(t, this.ctx.end - 0.8, this.ctx.end - 0.2); }
  mapA(t: number) { const w = this.w; return prog(t, w.dozen.start - 0.1, w.dozen.start + 0.5) * (1 - 0.6 * prog(t, w.freeze.start, w.freeze.start + 0.4)); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, near = clamp(this.near(t)), ma = this.mapA(t);
    // the map: each station lights as the camera reveals it ("about a dozen systems")
    if (ma > 0) {
      ORDER.forEach((k, i) => {
        const a = ma * prog(t, w.dozen.start + i * 0.09, w.dozen.start + i * 0.09 + 0.25);
        const hot = k === 'server' ? prog(t, w.server.start, w.server.start + 0.2) : k === 'laptop' ? prog(t, w.found.start, w.found.start + 0.2) : 0;
        drawStation(ctx, c, ST[k], a, hot);
      });
    }
    // the key halves meeting between laptop and server ("out in the open")
    const kk = prog(t, w.secret.start - 0.1, w.open.end, ease.inOutCubic);
    if (kk > 0 && ma > 0) {
      const m = { x: (ST.laptop.x + ST.server.x) / 2, y: (ST.laptop.y + ST.server.y) / 2 - 260 };
      const gap = lerp(900, 0, kk);
      setWorld(ctx, c, m.x, m.y);
      ctx.globalAlpha = ma;
      for (const [s, col] of [[-1, 'signal'], [1, 'ember']] as const) {
        ctx.fillStyle = rgba(col, 0.9);
        ctx.beginPath(); ctx.arc(s * gap / 2, 0, 60, s < 0 ? Math.PI / 2 : -Math.PI / 2, s < 0 ? -Math.PI / 2 : Math.PI / 2, s < 0); ctx.fill();
      }
      if (kk >= 1) { ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 6 / c.z; ctx.beginPath(); ctx.arc(0, 0, 76, 0, TAU); ctx.stroke(); }
      label(ctx, 'A SHARED SECRET', 0, 130, { size: 40, col: rgba('ash', prog(t, w.open.start, w.open.end)), align: 'center' });
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (near > 0.003) this.drawBrowser(t, c, ctx, near);
  }

  /** The address bar, the Enter key and the page. */
  drawBrowser(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number) {
    const w = this.w;
    setWorld(ctx, c, BAR.x, BAR.y);
    ctx.globalAlpha = a;
    // the bar
    ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(0, 0, BAR.w, BAR.h, 46); ctx.fill();
    ctx.strokeStyle = rgba('ash', 0.6); ctx.lineWidth = 1.5 / c.z; ctx.stroke();
    const typed = Math.ceil(URL.length * prog(t, w.type.start, w.address.end + 0.3));
    ctx.font = font(F.mono(500), 40); ctx.fillStyle = rgba('bone', 1);
    ctx.fillText(URL.slice(0, typed), 50, 60);
    if (typed < URL.length || t < w.enter.start) {
      const x = 52 + ctx.measureText(URL.slice(0, typed)).width;
      if (Math.floor(t * 2.5) % 2 === 0 || typed < URL.length) { ctx.fillStyle = rgba('signal', 1); ctx.fillRect(x, 22, 4, 50); }
    }
    // the Enter key
    const press = pulse(t, w.enter.start, 0.12), land = prog(t, w.enter.start - 0.25, w.enter.start, ease.outCubic);
    if (land > 0) {
      ctx.save();
      ctx.translate(BAR.w + 40, -6 + 10 * press);
      ctx.globalAlpha = a * land;
      ctx.fillStyle = rgba(press > 0.1 ? 'signal' : 'ink2', 1); ctx.beginPath(); ctx.roundRect(0, 0, 210, 104, 18); ctx.fill();
      ctx.strokeStyle = rgba('bone', 0.8); ctx.lineWidth = 2 / c.z; ctx.stroke();
      ctx.font = font(SAY, 34); ctx.fillStyle = rgba(press > 0.1 ? 'ink' : 'bone', 1); ctx.fillText('Enter', 26, 64);
      ctx.strokeStyle = rgba(press > 0.1 ? 'ink' : 'bone', 1); ctx.lineWidth = 4 / c.z; returnArrow(ctx, 168, 50, 16);
      ctx.restore();
    }
    // the page, drawn as it arrives (by the clock)
    const ms = this.clock.at(t).ms;
    const pk = t > w.freeze.start ? 1 - prog(t, w.freeze.start, w.freeze.start + 0.3) : prog(ms, 260, 786);
    if (pk > 0) {
      const py = BAR.h + 40, pw = BAR.w, ph = 520;
      ctx.save();
      ctx.globalAlpha = a * Math.min(1, pk * 1.5);
      ctx.fillStyle = rgba('bone', 0.96); ctx.beginPath(); ctx.roundRect(0, py, pw, ph, 18); ctx.fill();
      ctx.beginPath(); ctx.rect(0, py, pw, ph * pk); ctx.clip();
      ctx.font = font(F.serif(600), 64); ctx.fillStyle = rgba('ink', 1); ctx.fillText('Domain Name System', 60, py + 100);
      ctx.fillStyle = rgba('graphite', 0.8); ctx.fillRect(60, py + 124, pw - 120, 2);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = rgba('ash', 0.55); ctx.fillRect(60, py + 170 + i * 40, (pw - 520) * (i % 3 === 2 ? 0.7 : 1), 14); }
      ctx.fillStyle = rgba('ash', 0.35); ctx.fillRect(pw - 400, py + 160, 340, 300);
      ctx.restore();
      label(ctx, 'MEASURED 11 OCT 2026 · COLD LOAD · 3 RUNS', pw, py - 12, { size: 16, col: rgba('ash', a * prog(t, w.appears.end, w.appears.end + 0.4)), align: 'right' });
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  packetAt(t: number): { route: 'toServer'; u: number } | null {
    const w = this.w;
    const u = prog(t, w.found.start, w.server.end + 0.2, ease.inOutCubic);
    if (u > 0 && u < 1) return { route: 'toServer', u };
    // to and fro while the secret is agreed
    const v = prog(t, w.secret.start - 0.1, w.open.end);
    if (v > 0 && v < 1) { const k = (v * 2) % 1; return { route: 'toServer', u: Math.floor(v * 2) % 2 ? 1 - k : k }; }
    return null;
  }
  override penScreen(t: number) {
    const p = this.packetAt(t);
    if (!p) return null;
    const c = this.cam.at(t), r = ROUTES[p.route];
    const q = r[Math.min(r.length - 1, Math.round(p.u * (r.length - 1)))]!;
    return w2s(c, q.x, q.y);
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const ma = this.mapA(t);
    if (ma > 0) {
      const w = this.w;
      for (const [r, k] of [[ROUTES.toResolver, 0.2], [ROUTES.toRoot, 0.35], [ROUTES.toTld, 0.4], [ROUTES.toAuth, 0.45], [ROUTES.toServer, 0.3], [ROUTES.toImages, 0.5]] as const) {
        drawRoute(X, c, r, prog(t, w.dozen.start + k, w.dozen.start + k + 0.6), ma * 0.8);
      }
    }
    const p = this.packetAt(t);
    if (p) drawPacket(X, c, ROUTES[p.route], p.u, { trail: 0.08, size: 2.4 });
  }
  override post(t: number) {
    const w = this.w;
    return { zoom: 1 + 0.03 * pulse(t, w.enter.start, 0.1) + 0.015 * pulse(t, w.freeze.start, 0.12), ca: 1.2 + 3 * pulse(t, w.enter.start, 0.15) };
  }
}
void MONO;
