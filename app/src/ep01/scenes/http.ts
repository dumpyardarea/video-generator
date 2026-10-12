// HTTP (chapter 6, "HTTP: asking for the page") — "Now the browser can finally ask for what it wants … The method:
// GET … Then headers … On the server, a program reads the request … The response starts with a status code. 200 …
// 301 … 404 … Then the body … Then about 90 milliseconds of waiting. Most of that is one more round trip. The server
// itself took only about 15. The first byte arrived about a quarter of a second after I pressed Enter."
// On the ladder, under the TLS handshake: the request types itself on the browser's side and crosses; the server
// card answers "a ready file, or a page made now". The camera sinks as the response comes back; the response card
// (status, headers, a compressed body) sits beside the three status codes, each lit as it is said (301 loops back
// to a new address). Then the wait, measured: a bar of 90 ms, 75 of it the network and 15 the server.
import type { Word } from '../../engine/lyrics';
import { ease, prog } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, LADDER, RUNG, along, drawPacket, card, slab, stext, rgba, setWorld, w2s, pt, SAY, SAY_LIGHT, F } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const REQ = ['GET / HTTP/2', 'host: example.com', 'accept-language: en', 'accept: text/html, …', 'cookie: (none: a first visit)'];
const SRV = ['a program reads the request', 'a file that\'s ready?', 'or a page made just now,', '  from a database'];
const RES = ['HTTP/2 200', 'content-type: text/html', 'cache-control: private, max-age=0', 'content-encoding: gzip', '', '<!DOCTYPE html><html> … (compressed)'];
const CODES: [string, string, string][] = [['200', 'OK', 'here it is'], ['301', 'MOVED PERMANENTLY', 'start again at the new address'], ['404', 'NOT FOUND', 'there\'s nothing here']];
const CY_A = 1934, CY_B = 2772, Z = 0.42;

export default class Http extends EpScene {
  q = 'Now the browser can finally ask';
  w: Record<string, Word> = {};
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      request: g('Now the browser can finally ask', 'request'), get: g('The method: GET', 'get'), path: g('The path: slash, the home page', 'path'),
      headers: g('Then headers: which site', 'headers'), formats: g('Then headers: which site', 'formats'), cookies: g('if you\'ve been here before', 'cookies'),
      program: g('On the server, a program', 'program'), file: g('It might be a file that\'s ready', 'file'), database: g('It might be a file that\'s ready', 'database'),
      status: g('The response starts with a status code', 'status'), c200: g('200 means', '200'), c301: g('301 means', '301'),
      again: g('The browser then starts again', 'again'), address: g('The browser then starts again', 'address'), c404: g('404 means', '404'),
      h2: g('After the status come headers', 'headers'), kept: g('After the status come headers', 'kept'),
      body: g('Then the body', 'body'), compressed: g('Then the body', 'compressed'),
      waiting: g('Then about 90 milliseconds of waiting', 'waiting'), trip: g('Then about 90 milliseconds of waiting', 'trip'), s15: g('Then about 90 milliseconds of waiting', '15'),
      byte: g('The first byte arrived', 'byte'), enter: g('The first byte arrived', 'enter'),
    };
    this.li = { l82: ly.get('The response starts with a status code').i, l89: ly.get('Then about 90 milliseconds of waiting').i, l90: ly.get('The first byte arrived').i };
    const l82 = ly.lines[this.li.l82]!, end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 1750, CY_A, Z)
      .key(l82.start - 0.2, 1750, CY_A + 20, Z, 0, ease.linear)
      .key(l82.start + 1.2, 1750, CY_B, Z, 0, ease.inOutCubic)
      .key(end - 0.05, 1750, CY_B + 20, Z, 0, ease.linear);
    this.captions();
  }

  /** World point for a screen position (the HUD-like panels, placed once the camera has settled). */
  S(c: Cam, x: number, y: number): P { return pt(c.cx + (x - 960) / c.z, c.cy + (y - 540) / c.z); }
  req() { const w = this.w; return { t0: w.request.start - 0.1, t1: w.request.start + 2.2 }; }
  res() { const w = this.w; return { t0: w.status.start - 0.3, t1: w.status.start + 2.0 }; }
  path(i: 5 | 6): P[] { const [y0, y1] = RUNG(i); return i === 5 ? [pt(LADDER.lx, y0), pt(LADDER.rx, y1)] : [pt(LADDER.rx, y0), pt(LADDER.lx, y1)]; }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, ly = this.ctx.lyrics.lines, l82 = ly[this.li.l82]!, l89 = ly[this.li.l89]!, l90 = ly[this.li.l90]!;
    const sc = 1 / c.z;
    // lanes, and their names while we are up here
    setWorld(ctx, c, 0, 0);
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2 / c.z;
    for (const x of [LADDER.lx, LADDER.rx]) { ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x, 4400); ctx.stroke(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pinA = 1 - prog(t, l82.start - 0.3, l82.start + 0.2);
    const ct = c.cy - 540 / c.z;
    stext(ctx, c, 'your laptop', LADDER.lx, ct + 400 / c.z, 24, SAY, rgba('bone', pinA));
    stext(ctx, c, 'example.com', LADDER.rx, ct + 400 / c.z, 24, SAY, rgba('bone', pinA));
    // ---- the request
    const qa = prog(t, w.request.start - 0.3, w.request.start + 0.1);
    stext(ctx, c, 'HTTP REQUEST', 1750, (RUNG(5)[0] + RUNG(5)[1]) / 2 - 60, 30, F.mono(600), rgba('signal', qa));
    const rk = prog(t, w.get.start - 0.1, w.path.end + 0.2) + prog(t, w.headers.start, w.formats.end + 0.3) * 3 + prog(t, w.cookies.start - 0.1, w.cookies.end + 0.3);
    const cardA = qa * (1 - prog(t, l82.start - 0.3, l82.start + 0.2));
    if (cardA > 0.003) {
      const p = this.S(c, 330, 120);
      card(ctx, c, p.x, p.y, 560, 'The request', REQ, rk, { a: cardA, size: 24, scale: sc, lineCol: (i) => (i === 0 ? rgba('signal', 1) : i === 4 ? rgba('ash', 0.85) : rgba('bone', 0.92)) });
      const sa = prog(t, w.program.start - 0.3, w.program.start + 0.1) * cardA;
      const q = this.S(c, 1080, 120);
      card(ctx, c, q.x, q.y, 560, 'On the server', SRV, prog(t, w.program.start, w.program.end + 0.6) + prog(t, w.file.start, w.database.end + 0.4) * 3, { a: sa, size: 24, scale: sc });
    }
    // ---- the response: status codes, headers, body
    const ra = prog(t, l82.start + 0.6, l82.start + 1.2) * (1 - prog(t, l89.start - 0.3, l89.start + 0.2));
    stext(ctx, c, 'HTTP RESPONSE', 1750, (RUNG(6)[0] + RUNG(6)[1]) / 2 - 60, 30, F.mono(600), rgba('ember', prog(t, w.status.start - 0.3, w.status.start + 0.1)));
    if (ra > 0.003) {
      const p = this.S(c, 110, 400);
      const k = prog(t, w.status.start, w.status.end + 0.3) + prog(t, w.h2.start, w.kept.end + 0.3) * 3 + prog(t, w.body.start, w.compressed.end + 0.4) * 2;
      card(ctx, c, p.x, p.y, 760, 'The response', RES, k, { a: ra, size: 24, scale: sc, lineCol: (i) => (i === 0 ? rgba('signal', 1) : i === 5 ? rgba('ash', 0.9) : rgba('bone', 0.92)) });
      const said = [w.c200, w.c301, w.c404];
      CODES.forEach(([code, name, gloss], i) => {
        const at = said[i]!, nx = said[i + 1];
        const on = prog(t, at.start - 0.1, at.start + 0.2), hot = on * (nx ? 1 - prog(t, nx.start - 0.2, nx.start) : 1);
        const q = this.S(c, 1000, 450 + i * 120);
        stext(ctx, c, code, q.x, q.y, 64, F.mono(600), rgba(hot > 0.5 ? (i === 0 ? 'signal' : 'bone') : 'graphite', ra * (0.4 + 0.6 * on)), 'left');
        slab(ctx, c, name, q.x + 150 / c.z, q.y - 26 / c.z, 17, rgba(hot > 0.5 ? 'bone' : 'ash', ra * on), 'left', 600);
        slab(ctx, c, gloss.toUpperCase(), q.x + 150 / c.z, q.y + 2 / c.z, 13, rgba('ash', ra * on), 'left');
      });
      // 301: the browser starts again
      const lp = prog(t, w.again.start, w.address.end + 0.3, ease.inOutCubic) * ra;
      if (lp > 0.003) {
        const q = this.S(c, 935, 578);
        setWorld(ctx, c, q.x, q.y, sc);
        ctx.globalAlpha = lp; ctx.strokeStyle = rgba('signal', 1); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-20, -20, 26, Math.PI * 0.5, Math.PI * 0.5 + Math.PI * 1.6 * lp); ctx.stroke();
        ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // ---- the wait, measured
    const wa = prog(t, w.waiting.start - 0.2, w.waiting.end + 0.3);
    if (wa > 0.003) {
      const p = this.S(c, 360, 520), full = 1200 / c.z;
      const k1 = prog(t, w.waiting.start, w.waiting.end + 0.6, ease.outCubic), k2 = prog(t, w.trip.start, w.trip.end + 0.4), k3 = prog(t, w.s15.start, w.s15.end + 0.4);
      stext(ctx, c, 'Waiting for the first byte: about 90 ms', p.x, p.y - 70 / c.z, 40, SAY, rgba('bone', wa), 'left');
      setWorld(ctx, c, 0, 0);
      ctx.globalAlpha = wa;
      ctx.fillStyle = rgba('graphite', 0.5); ctx.fillRect(p.x, p.y, full, 34 / c.z);
      ctx.fillStyle = rgba('bone', 0.85); ctx.fillRect(p.x, p.y, full * (75 / 90) * k1, 34 / c.z);
      ctx.fillStyle = rgba('signal', 1); ctx.fillRect(p.x + full * (75 / 90), p.y, full * (15 / 90) * k1, 34 / c.z);
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, 'THE NETWORK: ONE MORE ROUND TRIP · ≈ 75 MS', p.x, p.y + 80 / c.z, 17, rgba('bone', wa * k2), 'left', 600);
      slab(ctx, c, 'THE SERVER · ≈ 15 MS', p.x + full, p.y + 80 / c.z, 17, rgba('signal', wa * k3), 'right', 600);
      const fa = prog(t, w.byte.start, w.byte.end + 0.3) * (1 - prog(t, this.ctx.end - 0.6, this.ctx.end - 0.1));
      stext(ctx, c, 'First byte: 0.26 s after Enter', p.x, p.y + 200 / c.z, 34, SAY_LIGHT, rgba('signal', fa * prog(t, w.byte.start, l90.end)), 'left');
      slab(ctx, c, 'ABOUT A QUARTER OF A SECOND · MEASURED', p.x, p.y + 240 / c.z, 14, rgba('ash', fa), 'left');
    }
  }

  override penScreen(t: number) {
    const cm = this.cam.at(t);
    for (const [i, m] of [[5, this.req()], [6, this.res()]] as const) if (t >= m.t0 && t < m.t1) { const q = along(this.path(i), prog(t, m.t0, m.t1, ease.inOutCubic)); return w2s(cm, q.x, q.y); }
    return null;
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    for (const [i, m] of [[5, this.req()], [6, this.res()]] as const) {
      const u = prog(t, m.t0, m.t1, ease.inOutCubic);
      if (u <= 0) continue;
      const ps = this.path(i), a0 = w2s(c, ps[0]!.x, ps[0]!.y), h = along(ps, u), b = w2s(c, h.x, h.y);
      X.seg2(a0[0], a0[1], b[0], b[1], 2.2, [0.5, 0.5, 0.6], 0.85);
      if (u < 1) drawPacket(X, c, ps, u, { trail: 0.12, size: 1.6 });
    }
  }
}
