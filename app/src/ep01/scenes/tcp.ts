// TCP (chapter 4, "TCP: making a connection") — "To send data reliably, the browser opens a connection using TCP …
// every piece of data arrives, in order, with nothing lost … a three-step greeting: SYN … SYN-ACK … ACK … one round
// trip to Wikipedia's servers was about 75 milliseconds … HTTP/3 … QUIC … Wikipedia doesn't offer HTTP/3 yet."
// Wide on the map, laptop and server: six numbered pieces ride the route, one is lost and sent again, and the
// server's slots fill in order. Then the camera sinks below the two stations, which grow lanes: the handshake
// ladder. SYN, SYN-ACK and ACK cross it as slow packets with long trails; a dimension marks the round trip
// (75 ms, measured). HTTP/3 and QUIC get a card over the dimmed ladder, and the measured verdict: HTTP/2 over TCP.
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, LADDER, RUNG, along, drawStation, drawRoute, drawPacket, restPacket, card, check, slab, stext, rgba, setWorld, w2s, pt, LIN, MONO, SAY_LIGHT, F } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const QUIC = ['HTTP/3 runs over QUIC, on UDP', 'fewer round trips to set up', 'advertised in a first answer:', '  alt-svc: h3=":443"', '→ usually used from the 2nd visit'];

type Msg = { rung: number; dir: 1 | -1; name: string; quote: string; t0: number; t1: number };

export default class Tcp extends EpScene {
  q = 'To send data reliably';
  w: Record<string, Word> = {};
  msgs: Msg[] = [];
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      tcp: g('To send data reliably', 'tcp'), every: g('TCP makes sure every piece', 'every'), order: g('TCP makes sure every piece', 'order'), lost: g('TCP makes sure every piece', 'lost'),
      greeting: g('three-step greeting', 'greeting'), syn: g('Your computer sends a SYN', 'syn'), synack: g('The server replies with a SYN-ACK', 'synack'),
      ack: g('Your computer answers with an ACK', 'ack'), handshake: g('That\'s the three-way handshake', 'handshake'),
      round: g('It costs one full round trip', 'round'), data: g('It costs one full round trip', 'data'),
      ms: g('one round trip to Wikipedia', 'milliseconds'), http3: g('Some sites also offer HTTP/3', 'http3'), quic: g('Some sites also offer HTTP/3', 'quic'),
      learns: g('A browser usually learns', 'learns'), second: g('So HTTP/3 is usually used', 'second'),
      doesnt: g('Wikipedia doesn\'t offer HTTP/3', 'doesnt'), http2: g('Wikipedia doesn\'t offer HTTP/3', 'http2'), overTcp: g('Wikipedia doesn\'t offer HTTP/3', 'tcp'),
    };
    const L = (q: string) => ly.get(q);
    this.li = { l39: L('TCP makes sure every piece').i, l40: L('three-step greeting').i, l47: L('Some sites also offer HTTP/3').i, l50: L('Wikipedia doesn\'t offer HTTP/3').i };
    const w = this.w;
    this.msgs = [
      { rung: 0, dir: 1, name: 'SYN', quote: '“Can we talk?”', t0: w.syn.start - 0.2, t1: w.syn.start + 1.6 },
      { rung: 1, dir: -1, name: 'SYN-ACK', quote: '“Yes. Can we talk?”', t0: w.synack.start - 0.1, t1: w.synack.start + 1.9 },
      { rung: 2, dir: 1, name: 'ACK', quote: '“Yes.”', t0: w.ack.start - 0.1, t1: w.ack.start + 1.5 },
    ];
    const l40 = ly.lines[this.li.l40]!, end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 1750, 80, 0.42)
      .key(l40.start, 1750, 40, 0.42, 0, ease.linear)
      .key(l40.start + 1.4, 1750, 571, 0.42, 0, ease.inOutCubic)
      .key(end - 0.05, 1750, 620, 0.42, 0, ease.linear);
    this.captions();
  }

  ladder(t: number) { return prog(t, this.ctx.lyrics.lines[this.li.l40]!.start - 0.2, this.ctx.lyrics.lines[this.li.l40]!.start + 1.4, ease.inOutCubic); }
  /** The ladder dims while HTTP/3 is discussed. */
  dimL(t: number) { const ly = this.ctx.lyrics.lines; return 1 - 0.75 * prog(t, ly[this.li.l47]!.start - 0.2, ly[this.li.l47]!.start + 0.4) * (1 - prog(t, ly[this.li.l50]!.end, ly[this.li.l50]!.end + 0.5)); }
  path(m: Msg): P[] {
    const [y0, y1] = RUNG(m.rung);
    return m.dir > 0 ? [pt(LADDER.lx, y0), pt(LADDER.rx, y1)] : [pt(LADDER.rx, y0), pt(LADDER.lx, y1)];
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, ly = this.ctx.lyrics.lines, la = this.ladder(t), dl = this.dimL(t);
    drawStation(ctx, c, ST.laptop, 1, 0.4);
    drawStation(ctx, c, ST.server, 1, 0.4, { sub: '203.0.113.10 · the web server' });
    slab(ctx, c, 'TCP · TRANSMISSION CONTROL PROTOCOL', 1750, -330, 22, rgba('signal', prog(t, w.tcp.start, w.tcp.end + 0.3) * (1 - prog(t, ly[this.li.l40]!.start, ly[this.li.l40]!.start + 0.5))), 'center', 600);
    this.pieces(t, c, ctx);
    if (la <= 0.003) return;
    // ---- the lanes
    const bottom = lerp(LADDER.top, 3400, la);
    setWorld(ctx, c, 0, 0);
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2 / c.z; ctx.globalAlpha = dl;
    for (const [x, y0] of [[LADDER.lx, LADDER.ltop], [LADDER.rx, LADDER.rtop]] as const) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, Math.max(y0, bottom)); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    // ---- message labels
    for (const m of this.msgs) {
      const a = prog(t, m.t0, m.t0 + 0.3) * dl;
      if (a <= 0.003) continue;
      const [y0, y1] = RUNG(m.rung), my = (y0 + y1) / 2;
      stext(ctx, c, m.name, 1750, my - 95, 34, F.mono(600), rgba('signal', a));
      stext(ctx, c, m.quote, 1750, my - 40, 26, SAY_LIGHT, rgba('bone', a * prog(t, m.t0 + 0.3, m.t0 + 0.7)));
    }
    // ---- the handshake, bracketed
    const hb = prog(t, w.handshake.start - 0.1, w.handshake.end + 0.2) * dl;
    if (hb > 0.003) {
      const [a0] = RUNG(0), [, a2] = RUNG(2), x = LADDER.rx - 70;
      setWorld(ctx, c, 0, 0); ctx.globalAlpha = hb; ctx.strokeStyle = rgba('ash', 1); ctx.lineWidth = 2 / c.z;
      ctx.beginPath(); ctx.moveTo(x + 30, a0 + 40); ctx.lineTo(x, a0 + 40); ctx.lineTo(x, a2 - 20); ctx.lineTo(x + 30, a2 - 20); ctx.stroke();
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, 'THREE-WAY', x - 40, (a0 + a2) / 2 + 160, 20, rgba('bone', hb), 'right', 600);
      slab(ctx, c, 'HANDSHAKE', x - 40, (a0 + a2) / 2 + 210, 20, rgba('bone', hb), 'right', 600);
    }
    // ---- one round trip, and what it cost
    const rt = prog(t, w.round.start - 0.1, w.round.end + 0.3) * dl;
    if (rt > 0.003) {
      const [y0] = RUNG(0), [, y1] = RUNG(1), x = LADDER.lx + 90;
      setWorld(ctx, c, 0, 0); ctx.globalAlpha = rt; ctx.strokeStyle = rgba('signal', 0.9); ctx.lineWidth = 2.5 / c.z;
      const yk = lerp(y0, y1, prog(t, w.round.start, w.round.end + 0.4, ease.outCubic));
      ctx.beginPath(); ctx.moveTo(x - 30, y0); ctx.lineTo(x + 30, y0); ctx.moveTo(x, y0); ctx.lineTo(x, yk); ctx.stroke();
      if (yk >= y1 - 1) { ctx.beginPath(); ctx.moveTo(x - 30, y1); ctx.lineTo(x + 30, y1); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, '1 ROUND TRIP', x + 60, (y0 + y1) / 2 - 20, 20, rgba('bone', rt), 'left', 600);
      const ma = prog(t, w.ms.start - 0.1, w.ms.end + 0.3) * dl;
      stext(ctx, c, '≈ 75 ms', x + 60, (y0 + y1) / 2 + 70, 40, F.mono(600), rgba('signal', ma), 'left');
      slab(ctx, c, 'MEASURED, TO WIKIPEDIA', x + 60, (y0 + y1) / 2 + 115, 14, rgba('ash', ma), 'left');
      const da = prog(t, w.data.start - 0.1, w.data.end + 0.3) * dl;
      slab(ctx, c, 'REAL DATA CAN MOVE FROM HERE', LADDER.lx + 150, RUNG(2)[0] + 170, 16, rgba('ash', da), 'left');
    }
    // ---- open
    const ack = this.msgs[2]!, op = prog(t, ack.t1, ack.t1 + 0.4) * dl;
    slab(ctx, c, 'TCP CONNECTION OPEN', LADDER.rx - 110, (RUNG(0)[0] + RUNG(2)[1]) / 2 + 300, 20, rgba('signal', op), 'right', 600);
    // ---- HTTP/3 and QUIC; the measured verdict
    const ca = prog(t, ly[this.li.l47]!.start, ly[this.li.l47]!.start + 0.4) * (1 - prog(t, ly[this.li.l50]!.end, ly[this.li.l50]!.end + 0.5));
    if (ca > 0.003) {
      const sc = 1 / c.z, cw = 780;
      const k = prog(t, w.http3.start, w.quic.end + 0.6) * 2 + prog(t, w.learns.start, ly[this.li.l50]!.start - 0.5) * 3;
      const h = card(ctx, c, 1750 - (cw * sc) / 2, 380, cw, 'HTTP/3', QUIC, k, { a: ca, size: 26, scale: sc, lineCol: (i) => (i === 3 ? rgba('signal', 1) : rgba('bone', 0.92)) });
      const y = 380 + h + 70 * sc, x = 1750 - (cw * sc) / 2 + 20 * sc;
      check(ctx, c, x, y, 'Wikipedia: no HTTP/3 yet', false, prog(t, w.doesnt.start, w.doesnt.end + 0.4), 30 * sc, ca);
      check(ctx, c, x, y + 56 * sc, 'every visit I measured: HTTP/2, over TCP', true, prog(t, w.http2.start, w.overTcp.end + 0.4), 30 * sc, ca);
    }
  }

  /** "Every piece of data arrives, in order, with nothing lost": six pieces, one lost and sent again. */
  pieceT(i: number) {
    const l39 = this.ctx.lyrics.lines[this.li.l39]!;
    return i < 6 ? [l39.start + i * 0.3, l39.start + i * 0.3 + 1.5] : [this.w.lost.start - 0.4, this.w.lost.start + 0.9];
  }
  pieces(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const l39 = this.ctx.lyrics.lines[this.li.l39]!, l40 = this.ctx.lyrics.lines[this.li.l40]!;
    const a = prog(t, l39.start - 0.3, l39.start) * (1 - prog(t, l40.start + 0.3, l40.start + 0.9));
    if (a <= 0.003) return;
    const sx = (j: number) => ST.server.x - 450 + j * 180, sy = 700;
    const arrived = (i: number) => t >= this.pieceT(i)[1]!;
    const has4 = arrived(6);
    for (let j = 0; j < 6; j++) {
      const got = j === 3 ? has4 : arrived(j);
      const inOrder = got && Array.from({ length: j }, (_, q) => (q === 3 ? has4 : arrived(q))).every(Boolean);
      setWorld(ctx, c, sx(j), sy);
      ctx.globalAlpha = a;
      ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 2 / c.z; ctx.strokeRect(-70, -70, 140, 140);
      if (got) { ctx.fillStyle = rgba(inOrder ? 'signal' : 'ash', inOrder ? 0.9 : 0.5); ctx.fillRect(-60, -60, 120, 120); }
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      stext(ctx, c, String(j + 1), sx(j), sy + 14, 30, MONO, rgba(got ? 'ink' : 'graphite', a));
    }
    slab(ctx, c, has4 ? 'ALL HERE, IN ORDER' : 'WAITING FOR 4', ST.server.x, sy - 120, 20, rgba(has4 ? 'signal' : 'ash', a * prog(t, this.pieceT(4)[1]!, this.pieceT(4)[1]! + 0.3)), 'center', 600);
    // the lost one
    const [l0, l1] = this.pieceT(3), lu = prog(t, l0!, l1!);
    if (lu > 0.5) {
      const q = along(ROUTES.toServer, 0.5), la = a * (1 - prog(t, lerp(l0!, l1!, 0.5) + 0.6, lerp(l0!, l1!, 0.5) + 1.2));
      slab(ctx, c, '✕ LOST · SENT AGAIN', q.x, q.y - 90, 20, rgba('acid', la), 'center', 600);
    }
  }

  override penScreen(t: number) {
    const cm = this.cam.at(t);
    for (const m of this.msgs) if (t >= m.t0 && t < m.t1) { const q = along(this.path(m), prog(t, m.t0, m.t1, ease.inOutCubic)); return w2s(cm, q.x, q.y); }
    return null;
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const w = this.w, ly = this.ctx.lyrics.lines, dl = this.dimL(t);
    const pa = 1 - prog(t, ly[this.li.l40]!.start + 0.3, ly[this.li.l40]!.start + 0.9);
    drawRoute(X, c, ROUTES.toServer, 1, pa * 0.8, 0.3);
    // pieces in flight (the 4th is lost halfway)
    for (let i = 0; i < 7; i++) {
      const [t0, t1] = this.pieceT(i), u = prog(t, t0!, t1!);
      if (i === 3 && u > 0.5) continue;
      if (u > 0 && u < 1) drawPacket(X, c, ROUTES.toServer, u, { trail: 0.03, size: 0.9, col: i === 6 ? LIN.signal : LIN.ash });
    }
    if (t < this.msgs[0]!.t0 && t > w.greeting.start) restPacket(X, c, pt(ST.laptop.x, RUNG(0)[0]), t, this.ladder(t));
    // the handshake messages: each draws its rung as it travels, with the long trail of slowed time
    for (const m of this.msgs) {
      const u = prog(t, m.t0, m.t1, ease.inOutCubic);
      if (u <= 0) continue;
      const ps = this.path(m), a = w2s(c, ps[0]!.x, ps[0]!.y), h = along(ps, u), b = w2s(c, h.x, h.y);
      X.seg2(a[0], a[1], b[0], b[1], 2.2, LIN.ash, 0.85 * dl);
      if (u < 1) drawPacket(X, c, ps, u, { trail: 0.3, size: 1.6, a: dl });
      else { const e = w2s(c, ps[1]!.x, ps[1]!.y); const dx = m.dir * 14; X.seg2(e[0], e[1], e[0] - dx, e[1] - 8, 2.2, LIN.ash, 0.85 * dl); X.seg2(e[0], e[1], e[0] - dx, e[1] + 8, 2.2, LIN.ash, 0.85 * dl); }
    }
  }
}
