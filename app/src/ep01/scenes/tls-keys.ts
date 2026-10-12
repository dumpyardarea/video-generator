// TLS-KEYS (chapter 5, "TLS: a secret, in public", part 1) — "The connection is open, but anything in between could
// read it … So before a single private byte is sent, the two sides set up encryption. That's TLS … one round trip.
// Your browser says hello … one half of a key exchange. The server picks a method and sends the other half …
// both sides calculate the same secret key. The key itself never crosses the network … about 80 milliseconds."
// Back up on the map: the open connection, with an eye at every hop (your Wi-Fi, your provider, every router) and
// what they could read in plain text; it scrambles once encryption is set up; "HTTPS", the S lit. Then down the
// ladder below the TCP handshake: the client hello (its cipher list, one key half riding with it), the server
// hello (its pick, the other half). Each side completes its own disc: the same secret, never sent. A watcher in
// the middle holds both halves and a question mark. The round trip is dimensioned: 80 ms, measured.
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp, TAU } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, LADDER, RUNG, along, drawStation, drawRoute, drawPacket, card, slab, stext, rgba, setWorld, w2s, pt, font, SAY, F, type StationKey } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const SEEN = ['GET /account HTTP/1.1', 'Host: example.com', 'Cookie: session=7f3a9c…', 'password=hunter2'];
const SUITES = ['TLS_AES_128_GCM_SHA256', 'TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256', 'key share: ◐ one half'];
const PICK = ['picked: TLS_AES_128_GCM_SHA256', 'key share: ◑ the other half', 'certificate, signature (next)'];
const EYES: [StationKey, string][] = [['router', 'YOUR WI-FI'], ['hop1', 'YOUR PROVIDER'], ['hop2', 'EVERY ROUTER ON THE PATH']];
const LADDER_CY = 1274;

/** A half disc: side -1 the left half (the browser's), +1 the right (the server's). */
export function keyHalf(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, r: number, side: -1 | 1, col: string, a = 1) {
  if (a <= 0.003) return;
  setWorld(ctx, c, x, y);
  ctx.globalAlpha = a; ctx.fillStyle = rgba(col, 0.95);
  ctx.beginPath();
  if (side < 0) ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); else ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
}
/** An eye: someone who can read what passes. */
export function eye(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, s: number, col: string, a = 1) {
  if (a <= 0.003) return;
  setWorld(ctx, c, x, y);
  ctx.globalAlpha = a; ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 2.5 / c.z;
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.9, s, 0); ctx.quadraticCurveTo(0, s * 0.9, -s, 0); ctx.stroke();
  ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export default class TlsKeys extends EpScene {
  q = 'The connection is open, but anything';
  w: Record<string, Word> = {};
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      read: g('The connection is open, but anything', 'read'), wifi: g('The connection is open, but anything', 'wifi'),
      provider: g('The connection is open, but anything', 'provider'), router: g('The connection is open, but anything', 'router'),
      priv: g('before a single private byte', 'private'), encryption: g('before a single private byte', 'encryption'),
      tls: g('That\'s TLS', 'tls'), s: g('That\'s TLS', 's'), https: g('That\'s TLS', 'https'),
      v13: g('With TLS 1.3', '13'), trip: g('With TLS 1.3', 'trip'),
      hello: g('Your browser says hello', 'hello'), methods: g('Your browser says hello', 'methods'),
      half1: g('It also sends one half', 'half'), exchange: g('It also sends one half', 'exchange'),
      picks: g('The server picks a method', 'picks'), half2: g('The server picks a method', 'half'),
      both: g('From the two halves', 'both'), same: g('From the two halves', 'same'), key: g('From the two halves', 'key'),
      never: g('The key itself never crosses', 'never'), halves: g('The key itself never crosses', 'halves'), secret: g('The key itself never crosses', 'secret'),
      ms: g('That handshake took about 80', 'milliseconds'),
    };
    this.li = { l51: ly.get('The connection is open, but anything').i, l54: ly.get('With TLS 1.3').i, l60: ly.get('That handshake took about 80').i };
    const w = this.w, end = this.ctx.end, l51 = ly.lines[this.li.l51]!, l54 = ly.lines[this.li.l54]!;
    this.cam
      .key(this.ctx.start, 1750, 620, 0.42)
      .key(l51.start + 1.4, 1750, -150, 0.5, 0, ease.inOutCubic)
      .key(l54.start, 1750, -140, 0.5, 0, ease.linear)
      .key(w.trip.end + 0.3, 1750, LADDER_CY, 0.42, 0, ease.inOutCubic)
      .key(end - 0.05, 1750, LADDER_CY + 40, 0.42, 0, ease.linear);
    this.captions();
  }

  /** The map part (lines 51–53) and the ladder part (54–60). */
  mapA(t: number) { const ly = this.ctx.lyrics.lines; return 1 - prog(t, ly[this.li.l54]!.start + 0.2, this.w.trip.end); }
  msg(i: 3 | 4) {
    const w = this.w;
    return i === 3 ? { t0: w.hello.start - 0.2, t1: w.hello.start + 2.4, dir: 1 } : { t0: w.picks.start - 0.2, t1: w.picks.start + 2.4, dir: -1 };
  }
  path(i: 3 | 4): P[] { const [y0, y1] = RUNG(i); return i === 3 ? [pt(LADDER.lx, y0), pt(LADDER.rx, y1)] : [pt(LADDER.rx, y0), pt(LADDER.lx, y1)]; }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const ma = this.mapA(t);
    if (ma > 0.003) this.drawMap(t, c, ctx, ma);
    if (ma < 0.997) this.drawLadder(t, c, ctx, 1 - ma);
  }

  drawMap(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number) {
    const w = this.w;
    for (const k of ['laptop', 'router', 'hop1', 'hop2', 'server'] as StationKey[]) drawStation(ctx, c, ST[k], a, k === 'laptop' || k === 'server' ? 0.4 : 0, k === 'server' ? { sub: '203.0.113.10 · the web server' } : {});
    // eyes at every hop
    const said = [w.wifi, w.provider, w.router];
    EYES.forEach(([k, name], i) => {
      const e = prog(t, said[i]!.start - 0.1, said[i]!.end + 0.2) * a * (1 - 0.7 * prog(t, w.encryption.start, w.encryption.end + 0.4));
      eye(ctx, c, ST[k].x, ST[k].y - 150, 34 / c.z, 'acid', e);
      slab(ctx, c, name, ST[k].x, ST[k].y - 230, 16, rgba('acid', e), 'center', 600);
    });
    // what they could read, then don't
    const sa = prog(t, w.read.start - 0.1, w.read.end + 0.3) * (1 - prog(t, w.tls.start - 0.4, w.tls.start)) * a;
    if (sa > 0.003) {
      const scr = prog(t, w.encryption.start, w.encryption.end + 0.5);
      const rows = SEEN.map((s, i) => (scr > (i + 1) / (SEEN.length + 1) ? this.scramble(s, i) : s));
      const sc = 1 / c.z;
      card(ctx, c, 1750 - 340 * sc, -1060, 680, scr > 0.5 ? 'What they see: noise' : 'What they could read: plain text', rows, 4, {
        a: sa, scale: sc, titleCol: rgba(scr > 0.5 ? 'signal' : 'acid', 1), lineCol: () => rgba(scr > 0.5 ? 'ash' : 'bone', 0.92),
      });
    }
    // HTTPS: the S
    const ha = prog(t, w.tls.start - 0.2, w.tls.end + 0.2) * a;
    if (ha > 0.003) {
      const sk = prog(t, w.s.start - 0.1, w.s.end + 0.2);
      setWorld(ctx, c, 0, 0);
      ctx.globalAlpha = ha; ctx.font = font(SAY, 130 / c.z); ctx.textAlign = 'left';
      const full = 'HTTPS', wd = ctx.measureText(full).width, x0 = 1750 - wd / 2, y = -720;
      ctx.fillStyle = rgba('bone', 1); ctx.fillText('HTTP', x0, y);
      ctx.fillStyle = rgba(sk > 0.5 ? 'signal' : 'bone', 1); ctx.fillText('S', x0 + ctx.measureText('HTTP').width, y);
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, 'S = SECURE = TLS, TRANSPORT LAYER SECURITY', 1750, y + 110, 18, rgba('signal', ha * sk), 'center', 600);
    }
  }
  scramble(s: string, i: number) {
    const ch = '0123456789abcdef';
    return s.split('').map((x, j) => (x === ' ' ? ' ' : ch[(j * 7 + i * 13 + s.length) % 16])).join('');
  }

  drawLadder(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number) {
    const w = this.w, ly = this.ctx.lyrics.lines;
    const top = LADDER_CY - 540 / 0.42 + 20;
    // lanes, and their names pinned at the top of the frame
    setWorld(ctx, c, 0, 0);
    ctx.globalAlpha = a; ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2 / c.z;
    for (const x of [LADDER.lx, LADDER.rx]) { ctx.beginPath(); ctx.moveTo(x, top - 400); ctx.lineTo(x, 3400); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    const ct = c.cy - 540 / c.z;
    stext(ctx, c, 'your laptop', LADDER.lx, ct + 400 / c.z, 24, SAY, rgba('bone', a));
    stext(ctx, c, 'example.com', LADDER.rx, ct + 400 / c.z, 24, SAY, rgba('bone', a));
    slab(ctx, c, '↑ THE TCP HANDSHAKE, DONE', 1750 + 700, ct + 200 / c.z, 14, rgba('ash', a * 0.9));
    slab(ctx, c, 'TLS 1.3 · ONE ROUND TRIP', 1750 + 300, RUNG(3)[0] - 120, 20, rgba('signal', a * prog(t, w.v13.start, w.trip.end + 0.3)), 'center', 600);
    // the hellos
    const sc = 1 / c.z;
    const m3 = this.msg(3), m4 = this.msg(4);
    const c3 = prog(t, w.hello.start - 0.3, w.hello.start + 0.1) * a;
    if (c3 > 0.003) {
      stext(ctx, c, 'CLIENT HELLO', 1750, (RUNG(3)[0] + RUNG(3)[1]) / 2 - 60, 30, F.mono(600), rgba('signal', c3));
      const k = prog(t, w.hello.start, w.methods.end + 0.4) * 3 + prog(t, w.half1.start, w.exchange.end);
      card(ctx, c, 250, RUNG(3)[0] - 70 - 279 * sc, 560, 'Encryption methods it supports', SUITES, k, { a: c3, scale: sc, size: 24, lineCol: (i) => (i === 3 ? rgba('signal', 1) : rgba('bone', 0.92)) });
    }
    const c4 = prog(t, w.picks.start - 0.3, w.picks.start + 0.1) * a;
    if (c4 > 0.003) {
      stext(ctx, c, 'SERVER HELLO', 1750, (RUNG(4)[0] + RUNG(4)[1]) / 2 - 60, 30, F.mono(600), rgba('ember', c4));
      card(ctx, c, LADDER.rx - 130 - 600 * sc, RUNG(4)[0] + 180, 600, 'The server answers', PICK, prog(t, w.picks.start, w.half2.end + 0.5) * 2 + prog(t, w.half2.end + 0.5, w.half2.end + 1.2), {
        a: c4, scale: sc, size: 24, lineCol: (i) => (i === 1 ? rgba('ember', 1) : i === 2 ? rgba('ash', 0.8) : rgba('bone', 0.92)),
      });
    }
    // the key halves riding with their hellos
    const r = 30 / c.z;
    const ride = (i: 3 | 4, side: -1 | 1, col: string, from: number) => {
      const m = i === 3 ? m3 : m4, u = prog(t, m.t0, m.t1, ease.inOutCubic), on = prog(t, from - 0.1, from + 0.3) * a;
      if (on <= 0.003) return;
      const p = along(this.path(i), u);
      keyHalf(ctx, c, p.x, p.y - 70, r, side, col, on);
    };
    ride(3, -1, 'signal', w.half1.start);
    ride(4, 1, 'ember', w.half2.start);
    // both sides complete the same secret
    const done = prog(t, w.both.start, w.same.end + 0.2, ease.outCubic);
    if (done > 0.003) {
      const y = RUNG(4)[1];
      for (const [x, mine] of [[LADDER.lx - 260, -1], [LADDER.rx + 260, 1]] as const) {
        const gap = lerp(60 / c.z, 0, done);
        keyHalf(ctx, c, x - gap / 2, y, r * 1.6, -1, 'signal', a);
        keyHalf(ctx, c, x + gap / 2, y, r * 1.6, 1, 'ember', a);
        if (done > 0.95) { setWorld(ctx, c, x, y); ctx.globalAlpha = a; ctx.strokeStyle = rgba('bone', 1); ctx.lineWidth = 3 / c.z; ctx.beginPath(); ctx.arc(0, 0, r * 1.6 + 12 / c.z, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); }
        slab(ctx, c, 'SECRET KEY', x, y + 80 / c.z, 15, rgba('bone', a * prog(t, w.key.start, w.key.end + 0.3)), 'center', 600);
        slab(ctx, c, mine < 0 ? 'WORKED OUT HERE' : 'AND HERE', x, y + 102 / c.z, 12, rgba('ash', a * prog(t, w.key.start, w.key.end + 0.3)));
      }
    }
    // a watcher in the middle: both halves, no secret
    const wa = prog(t, w.never.start - 0.1, w.never.end + 0.3) * a;
    if (wa > 0.003) {
      const x = 1750 - 700, y = RUNG(4)[1] + 40;
      eye(ctx, c, x, y - 60 / c.z, 30 / c.z, 'acid', wa);
      const hk = prog(t, w.halves.start, w.halves.end + 0.2);
      keyHalf(ctx, c, x - 90, y, r, -1, 'signal', wa * hk);
      keyHalf(ctx, c, x + 90, y, r, 1, 'ember', wa * hk);
      stext(ctx, c, '?', x, y + 22 / c.z, 48, F.mono(600), rgba('acid', wa * prog(t, w.secret.start, w.secret.end + 0.2)));
      slab(ctx, c, 'A WATCHER SEES BOTH HALVES. NOT THE SECRET.', x, y + 72 / c.z, 15, rgba('ash', wa * hk));
    }
    // the round trip it cost
    const ra = prog(t, ly[this.li.l60]!.start - 0.1, ly[this.li.l60]!.start + 0.4) * a;
    if (ra > 0.003) {
      const [y0] = RUNG(3), [, y1] = RUNG(4), x = LADDER.lx + 90;
      setWorld(ctx, c, 0, 0); ctx.globalAlpha = ra; ctx.strokeStyle = rgba('signal', 0.9); ctx.lineWidth = 2.5 / c.z;
      ctx.beginPath(); ctx.moveTo(x - 30, y0); ctx.lineTo(x + 30, y0); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.moveTo(x - 30, y1); ctx.lineTo(x + 30, y1); ctx.stroke();
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, '1 ROUND TRIP', x + 60, (y0 + y1) / 2 - 20, 20, rgba('bone', ra), 'left', 600);
      stext(ctx, c, '≈ 80 ms', x + 60, (y0 + y1) / 2 + 70, 40, F.mono(600), rgba('signal', ra * prog(t, w.ms.start - 0.1, w.ms.end + 0.2)), 'left');
      slab(ctx, c, 'MEASURED', x + 60, (y0 + y1) / 2 + 115, 14, rgba('ash', ra), 'left');
    }
  }

  override penScreen(t: number) {
    const cm = this.cam.at(t);
    for (const i of [3, 4] as const) { const m = this.msg(i); if (t >= m.t0 && t < m.t1) { const q = along(this.path(i), prog(t, m.t0, m.t1, ease.inOutCubic)); return w2s(cm, q.x, q.y); } }
    return null;
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const ma = this.mapA(t), w = this.w;
    if (ma > 0.003) {
      drawRoute(X, c, ROUTES.toServer, 1, ma * 0.9, 0.3);
      // plain-text traffic, back and forth while the eyes watch
      const run = prog(t, w.read.start - 0.5, w.read.start) * (1 - prog(t, w.tls.start - 0.4, w.tls.start));
      if (run > 0) for (let i = 0; i < 3; i++) { const u = ((t - w.read.start) * 0.32 + i / 3) % 1; drawPacket(X, c, ROUTES.toServer, u, { trail: 0.05, size: 1.1, a: run * ma }); }
    }
    if (ma >= 0.997) return;
    for (const i of [3, 4] as const) {
      const m = this.msg(i), u = prog(t, m.t0, m.t1, ease.inOutCubic);
      if (u <= 0) continue;
      const ps = this.path(i), a0 = w2s(c, ps[0]!.x, ps[0]!.y), h = along(ps, u), b = w2s(c, h.x, h.y);
      X.seg2(a0[0], a0[1], b[0], b[1], 2.2, [0.5, 0.5, 0.6], 0.85 * (1 - ma));
      if (u < 1) drawPacket(X, c, ps, u, { trail: 0.3, size: 1.6, a: 1 - ma });
    }
  }
}
