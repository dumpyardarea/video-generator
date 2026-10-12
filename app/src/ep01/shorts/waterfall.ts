// SHORT 3 · Where 0.8 seconds actually goes (short-ep01-waterfall, from EP01 chapter 8). One vertical plate: the
// first request of the measured Wikipedia load (demo/, run 1) as ONE tall bar, time running down the screen, that
// grows phase by phase as each is said. Phases by line:
//  0 "~15 ms" against "800 ms", over the empty bar                1 the page and how it was measured
//  2 DNS, a thin slice                                             3 TCP and TLS, each a long slice
//  4 each marked as one trip there and back                        5 the wait, split: ~75 network · ~15 server
//  6 "slow server?" set large                                      7 ... struck out; the round trips light together
//  8 the image server's own column: lookup and both handshakes again
//  9 the axis widens to the whole 0.8 s: the HTML arriving, first paint, loaded
// 10 the full video; the opening returns, so the Short loops
// Everything is drawn in screen px (1080x1920) inside one setWorld(…, 1/Z); key content stays in x 60..900 and
// above y ~1400 (the Shorts overlay), with the captions at y ~1450.
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp, clamp } from '../../engine/util';
import type { Cam } from '../../scenes/_vo';
import { rgba, setWorld, font, F, SAY } from '../_ep';
import { RUN1, NAV1 } from '../waterfall-data';
import { ShortScene, Z } from './_short';

// on-screen text, kept together so a translated version can swap it
const TXT = {
  server: '~15 ms', serverSub: 'THE SERVER', page: '800 ms', pageSub: 'THE PAGE',
  url: 'en.wikipedia.org/wiki/Domain_Name_System', how: 'MEASURED · CHROME · MY CONNECTION · COLD',
  dns: 'DNS', tcp: 'TCP', tls: 'TLS', wait: 'WAITING', rt: '1 ROUND TRIP', network: '~75 network', srv: '~15 server',
  slow: 'slow server?', rts: 'ROUND TRIPS', rtsOf: (a: number, b: number) => `≈ ${a} of the first ${b} ms`,
  images: 'upload.wikimedia.org', imagesSub: 'THE IMAGES · ITS OWN SETUP',
  html: 'the HTML arriving', paint: 'first paint', loaded: 'loaded',
  cta: 'Every step,', cta2: 'slowed down', steps: ['DNS', 'TCP', 'TLS', 'HTTP', 'PIXELS'], link: 'THE FULL VIDEO · LINKED BELOW',
};
const R0 = RUN1[0]!, IMG = RUN1.find((r) => r.host.startsWith('upload') && !r.reused)!;
const TTFB = R0.dns + R0.tcp + R0.tls + R0.wait; // 264.4 ms in the row; the clock's first byte is 266
const RT = Math.round(R0.tcp + R0.tls + (R0.wait - 15)); // the round trips before the first byte (TCP, TLS, the wait's network part)
const COL = { dns: 'ember', tcp: 'bone', tls: 'ash', wait: 'signal', dl: 'graphite' } as const;
type K = keyof typeof COL;
// the bar: time runs down from Y0; X is its left edge
const BX = 250, BW = 150, Y0 = 400, H = 880, LX = BX + BW + 34;

export default class WaterfallShort extends ShortScene {
  q = 'Wikipedia\'s server answered';
  w: Record<string, Word> = {};

  setup() {
    const g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      ms15: g('Wikipedia\'s server answered', 'milliseconds'), why: g('Wikipedia\'s server answered', 'why'), t800: g('Wikipedia\'s server answered', '800'),
      measured: g('I measured it', 'measured'), chrome: g('I measured it', 'chrome'),
      address: g('Finding the server\'s address', 'address'), ms10: g('Finding the server\'s address', 'milliseconds'),
      connection: g('Opening a connection', 'connection'), private: g('Opening a connection', 'private'),
      trip: g('Each is one trip', 'trip'), back: g('Each is one trip', 'back'),
      waiting: g('Then 90 milliseconds of waiting', 'waiting'),
      believe: g('I used to believe', 'believe'), slowServer: g('I used to believe', 'server'),
      but: g('But before the first byte', 'but'), round: g('But before the first byte', 'round'), network: g('But before the first byte', 'network'),
      second: g('And the images came from a second server', 'second'), lookup: g('And the images came from a second server', 'lookup'), again: g('And the images came from a second server', 'again'),
      rest: g('The rest of the 0.8 seconds', 'rest'), arriving: g('The rest of the 0.8 seconds', 'arriving'), drawn: g('The rest of the 0.8 seconds', 'drawn'),
      steps: g('Every one of those steps', 'steps'), video: g('Every one of those steps', 'video'),
    };
    this.holdCamera(10);
    this.shortCaptions();
  }

  /** ms → y while the axis spans `span` ms. */
  y(ms: number, span: number) { return Y0 + (ms / span) * H; }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, end = this.ctx.end;
    const cta = prog(t, this.ln(10).start - 0.2, this.ln(10).start + 0.4);
    const loop = prog(t, end - 0.8, end - 0.25);
    const main = (1 - cta) * (1 - loop);
    // the axis: the first byte fills it, then (line 9) it widens to the whole load
    const widen = prog(t, w.rest.start - 0.1, w.rest.end + 0.9, ease.inOutCubic);
    const span = lerp(270, 800, widen);
    setWorld(ctx, c, 0, 0, 1 / Z);
    // ---- 0, and the loop: the server against the page
    const hook = Math.max(t < this.ln(0).start ? 1 : this.span(t, 0, 1, 0.5), loop);
    if (hook > 0.003) this.hook(t, ctx, hook, loop > 0);
    // ---- 1 what was measured (stays as a small header)
    const hdA = prog(t, w.measured.start - 0.2, w.measured.start + 0.3) * main;
    if (hdA > 0.003) {
      this.txt(ctx, TXT.url, 540, 250, 30, F.mono(500), rgba('bone', hdA));
      this.txt(ctx, TXT.how, 540, 300, 24, F.mono(500), rgba('ash', hdA * prog(t, w.chrome.start - 0.2, w.chrome.end + 0.3)));
    }
    // ---- the bar's frame and axis (from line 1)
    const fA = prog(t, this.ln(1).start, this.ln(1).start + 0.6) * main;
    if (fA > 0.003) this.axis(t, ctx, fA, span);
    // ---- the first request, phase by phase
    const dim8 = 1 - 0.75 * this.span(t, 8, 9);
    const segs: [K, number, number, number][] = []; // [kind, from ms, to ms, grown 0..1]
    let at = 0;
    const grow: Record<'dns' | 'tcp' | 'tls' | 'wait', number> = {
      dns: prog(t, w.address.start - 0.1, w.ms10.end + 0.2, ease.outCubic),
      tcp: prog(t, w.connection.start - 0.2, w.connection.end + 0.6, ease.outCubic),
      tls: prog(t, w.private.start - 0.2, w.private.end + 0.6, ease.outCubic),
      wait: prog(t, w.waiting.start - 0.4, w.waiting.end + 0.4, ease.outCubic),
    };
    for (const k of ['dns', 'tcp', 'tls', 'wait'] as const) { segs.push([k, at, at + R0[k], grow[k]]); at += R0[k]; }
    const dl = prog(t, w.rest.end, w.arriving.end, ease.outCubic);
    segs.push(['dl', at, R0.end, dl]);
    // which slices are lit: line 7 lights the round trips (TCP, TLS, the wait's network part), dims the rest
    const lit = prog(t, w.round.start - 0.2, w.round.end + 0.3) * (1 - prog(t, this.ln(8).start - 0.2, this.ln(8).start + 0.3));
    for (const [k, a, b, g] of segs) {
      if (g <= 0.003 || main <= 0.003) continue;
      const y0 = this.y(a, span), y1 = lerp(y0, this.y(b, span), g);
      const isRt = k === 'tcp' || k === 'tls' || k === 'wait';
      ctx.globalAlpha = main * dim8 * (isRt ? 1 : 1 - 0.6 * lit);
      ctx.fillStyle = rgba(COL[k], k === 'tcp' ? 0.8 : 1);
      ctx.fillRect(BX, y0, BW, Math.max(2, y1 - y0 - 2));
      if (isRt && lit > 0.003) { ctx.globalAlpha = main * lit; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 4; ctx.strokeRect(BX - 6, y0 - 1, BW + 12, y1 - y0); }
      ctx.globalAlpha = 1;
    }
    // the wait, split (line 5): the server's ~15 ms at its end
    const split = prog(t, w.waiting.end, w.waiting.end + 0.6) * main * dim8;
    if (split > 0.003) {
      const ys = this.y(TTFB - 15, span), ye = this.y(TTFB, span);
      ctx.globalAlpha = split; ctx.fillStyle = rgba('ink', 1); ctx.fillRect(BX, ys - 2, BW, 4);
      ctx.fillStyle = rgba('ember', 1); ctx.fillRect(BX + 12, ys + 4, BW - 24, Math.max(2, ye - ys - 8));
      ctx.globalAlpha = 1;
    }
    // ---- labels to the right of the bar (hidden while the image column needs the room)
    const labA = main * (1 - this.span(t, 6, 9, 0.3)) * (1 - widen);
    if (labA > 0.003) this.labels(t, ctx, labA, span, grow, split);
    // ---- 6 / 7: "slow server?", struck out
    const sA = this.span(t, 6, 8, 0.3) * main;
    if (sA > 0.003) {
      const k = prog(t, w.believe.start - 0.1, w.slowServer.end + 0.2);
      const strike = prog(t, w.but.start, w.but.end + 0.35, ease.outCubic);
      ctx.save(); ctx.translate(LX + 210, 560); ctx.rotate(-0.04);
      ctx.globalAlpha = sA * k * (1 - 0.5 * strike); ctx.font = font(SAY, 96); ctx.fillStyle = rgba('bone', 1); ctx.textAlign = 'center';
      const parts = TXT.slow.split(' ');
      parts.forEach((p, i) => ctx.fillText(p, 0, i * 100));
      if (strike > 0) {
        ctx.globalAlpha = sA * k; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 10; ctx.lineCap = 'round';
        parts.forEach((p, i) => { const tw = ctx.measureText(p).width, s = clamp(strike * 2 - i, 0, 1); ctx.beginPath(); ctx.moveTo(-tw / 2 - 10, i * 100 - 32); ctx.lineTo(-tw / 2 - 10 + (tw + 20) * s, i * 100 - 32); ctx.stroke(); });
      }
      ctx.restore(); ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    if (lit > 0.003) {
      this.txt(ctx, TXT.rts, LX, 880, 66, SAY, rgba('signal', lit * main), 'left');
      this.txt(ctx, TXT.rtsOf(Math.round(RT / 5) * 5, Math.round(NAV1.ttfb)), LX, 936, 28, F.mono(500), rgba('bone', lit * main * prog(t, w.round.end, w.network.end + 0.3)), 'left');
    }
    // ---- 8 the image server's own column
    const iA = this.span(t, 8, 9) * main;
    if (iA > 0.003) this.images(t, ctx, iA, span);
    // ---- 9 the rest of the load: the HTML arriving, first paint, loaded
    if (widen > 0.003 && main > 0.003) {
      const marks: [string, number, number][] = [[TXT.paint, NAV1.fcp, prog(t, w.arriving.start, w.arriving.end + 0.3)], [TXT.loaded, NAV1.load, prog(t, w.arriving.end, w.drawn.start + 0.3)]];
      ctx.globalAlpha = main * dl; this.txt(ctx, TXT.html, LX, (this.y(TTFB, span) + this.y(R0.end, span)) / 2 + 10, 30, F.mono(500), rgba('ash', 1), 'left');
      for (const [s, ms, k] of marks) {
        if (k <= 0.003) continue;
        const y = this.y(ms, span);
        ctx.globalAlpha = main * k; ctx.strokeStyle = rgba(s === TXT.loaded ? 'signal' : 'bone', 1); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(BX - 20, y); ctx.lineTo(BX + BW + 20, y); ctx.stroke();
        this.txt(ctx, `${s}  ${(ms / 1000).toFixed(2)} s`, LX, y + 11, 32, F.mono(600), rgba(s === TXT.loaded ? 'signal' : 'bone', 1), 'left');
      }
      ctx.globalAlpha = 1;
    }
    // ---- 10 the full video
    const fV = cta * (1 - prog(t, end - 1.2, end - 0.75));
    if (fV > 0.003) {
      this.txt(ctx, TXT.cta, 540, 560, 96, SAY, rgba('bone', fV));
      this.txt(ctx, TXT.cta2, 540, 670, 96, SAY, rgba('signal', fV * prog(t, w.steps.end, w.steps.end + 0.5)));
      TXT.steps.forEach((s, i) => {
        const a = fV * prog(t, this.ln(10).start + 0.3 + i * 0.15, this.ln(10).start + 0.6 + i * 0.15);
        this.pill(ctx, 150 + i * 195, 840, s, a, i < 4);
      });
      this.txt(ctx, TXT.link, 540, 1010, 26, F.mono(600), rgba('signal', fV * prog(t, w.video.start - 0.4, w.video.end)));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  hook(t: number, ctx: CanvasRenderingContext2D, a: number, looping: boolean) {
    const w = this.w;
    const sk = 1, pk = looping ? 1 : prog(t, w.t800.start - 0.2, w.t800.end + 0.3, ease.outCubic);
    const hot = looping ? 0 : prog(t, w.ms15.start - 0.2, w.ms15.end + 0.2) * (1 - prog(t, w.why.start - 0.2, w.why.start + 0.2));
    this.txt(ctx, TXT.server, 540, 500, 120, F.mono(600), rgba(hot > 0.5 ? 'bone' : 'ash', a * sk));
    this.txt(ctx, TXT.serverSub, 540, 560, 28, F.mono(500), rgba('ash', a * sk));
    ctx.save(); ctx.translate(540, 820); const s = 0.6 + 0.4 * pk; ctx.scale(s, s);
    this.txt(ctx, TXT.page, 0, 0, 230, SAY, rgba('bone', a * pk));
    ctx.restore();
    this.txt(ctx, TXT.pageSub, 540, 900, 26, F.mono(500), rgba('signal', a * pk));
    // the "why" beat: the gap between them, drawn as a bracket
    const q = looping ? 0 : prog(t, w.why.start - 0.1, w.why.end + 0.3);
    if (q > 0.003) { ctx.globalAlpha = a * q; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(210, 560); ctx.lineTo(180, 560); ctx.lineTo(180, 760); ctx.lineTo(210, 760); ctx.stroke(); ctx.globalAlpha = 1; }
  }

  axis(_t: number, ctx: CanvasRenderingContext2D, a: number, span: number) {
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2;
    ctx.strokeRect(BX, Y0, BW, H);
    const step = span > 500 ? 200 : 50;
    ctx.font = font(F.mono(500), 22); ctx.fillStyle = rgba('ash', 1); ctx.textAlign = 'right';
    for (let ms = 0; ms <= span + 1; ms += step) {
      const y = this.y(ms, span);
      ctx.fillRect(BX - 16, y - 1, 12, 2);
      ctx.fillText(`${ms}`, BX - 26, y + 8);
    }
    ctx.fillText('ms', BX - 26, Y0 - 24);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  labels(t: number, ctx: CanvasRenderingContext2D, a: number, span: number, grow: Record<string, number>, split: number) {
    const w = this.w;
    let at = 0;
    const rows: ['dns' | 'tcp' | 'tls' | 'wait', number, number, string][] = [];
    for (const k of ['dns', 'tcp', 'tls', 'wait'] as const) { rows.push([k, at, at + R0[k], COL[k]]); at += R0[k]; }
    const rt = prog(t, w.trip.start - 0.2, w.back.end + 0.2);
    for (const [k, a0, b0, col] of rows) {
      const g = grow[k]!;
      if (g <= 0.003) continue;
      const ymid = (this.y(a0, span) + this.y(b0, span)) / 2;
      const name = k === 'dns' ? TXT.dns : k === 'tcp' ? TXT.tcp : k === 'tls' ? TXT.tls : TXT.wait;
      const yy = k === 'dns' ? this.y(b0, span) - 2 : ymid;
      ctx.globalAlpha = a * g;
      this.txt(ctx, name, LX, yy - 4, 38, SAY, rgba(col === 'graphite' ? 'ash' : col, 1), 'left');
      this.txt(ctx, `${Math.round(R0[k])} ms`, LX, yy + 34, 30, F.mono(500), rgba('bone', 1), 'left');
      // 4: TCP and TLS each one round trip: a there-and-back hairpin and its name
      if ((k === 'tcp' || k === 'tls') && rt > 0.003) {
        ctx.globalAlpha = a * rt; const x0 = LX + 200, y = yy - 14, L = 150 * rt;
        ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y - 12); ctx.lineTo(x0 + L, y - 12); ctx.arc(x0 + L, y, 12, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x0, y + 12); ctx.stroke();
        this.txt(ctx, TXT.rt, x0, y + 52, 26, F.mono(600), rgba('signal', 1), 'left');
      }
      if (k === 'wait' && split > 0.003) {
        ctx.globalAlpha = a * split;
        this.txt(ctx, TXT.network, LX + 200, yy - 4, 28, F.mono(500), rgba('signal', 1), 'left');
        this.txt(ctx, TXT.srv, LX + 200, yy + 34, 28, F.mono(500), rgba('ember', 1), 'left');
      }
    }
    ctx.globalAlpha = 1;
  }

  images(t: number, ctx: CanvasRenderingContext2D, a: number, span: number) {
    const w = this.w, X = 620;
    this.txt(ctx, TXT.images, X + BW / 2, Y0 - 70, 26, F.mono(600), rgba('bone', a), 'center');
    this.txt(ctx, TXT.imagesSub, X + BW / 2, Y0 - 34, 22, F.mono(500), rgba('ash', a), 'center');
    let at = 0;
    const g = prog(t, w.second.start, w.again.end, ease.inOutCubic);
    ctx.globalAlpha = a; ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2; ctx.strokeRect(X, Y0, BW, H);
    for (const k of ['dns', 'tcp', 'tls', 'wait'] as const) {
      const d = IMG[k], gk = clamp((g * 4) - ['dns', 'tcp', 'tls', 'wait'].indexOf(k), 0, 1);
      if (gk > 0) {
        const y0 = this.y(at, span), y1 = lerp(y0, this.y(at + d, span), gk);
        ctx.globalAlpha = a; ctx.fillStyle = rgba(COL[k], k === 'tcp' ? 0.8 : 1); ctx.fillRect(X, y0, BW, Math.max(2, y1 - y0 - 2));
        if (k !== 'wait') { ctx.globalAlpha = a * gk; this.txt(ctx, k.toUpperCase(), X - 20, (y0 + y1) / 2 + 12, 30, SAY, rgba('bone', 1), 'right'); }
      }
      at += d;
    }
    ctx.globalAlpha = 1;
  }

  pill(ctx: CanvasRenderingContext2D, x: number, y: number, s: string, a: number, on: boolean) {
    if (a <= 0.003) return;
    ctx.globalAlpha = a; ctx.font = font(F.mono(600), 28);
    const tw = ctx.measureText(s).width + 36;
    ctx.beginPath(); ctx.roundRect(x - tw / 2, y - 28, tw, 56, 28);
    if (on) { ctx.fillStyle = rgba('signal', 1); ctx.fill(); } else { ctx.strokeStyle = rgba('ash', 1); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = rgba(on ? 'ink' : 'ash', 1); ctx.textAlign = 'center'; ctx.fillText(s, x, y + 10); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  txt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fam: string, col: string, align: CanvasTextAlign = 'center') {
    ctx.font = font(fam, size); ctx.fillStyle = col; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.textAlign = 'left';
  }
}
