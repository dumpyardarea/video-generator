// WATERFALL (chapter 8, "The real waterfall") — the measured load of Wikipedia's DNS article (demo/, run 1, cold),
// drawn as a DevTools-style waterfall from the real numbers (../waterfall-data.ts, generated from the demo JSON).
// The first request alone, large: its DNS, TCP, TLS and waiting segments grow as each is named; the handshakes are
// bracketed against the first byte. It drops into the table and the other rows wipe in (reused connection), the
// image server's row lit with its own handshakes; first paint and load are ruled in. Then the three cold runs and
// the reload as bars on a 6-second axis (the slow run in the accent pink). For the creator's take: where the
// 0.79 s went, with the server's 15 ms a sliver; then the two errors they have seen, decoded.
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp } from '../../engine/util';
import type { Cam } from '../../scenes/_vo';
import { EpScene, ST, drawStation, font, rgba, label, SAY, SAY_LIGHT, F, W } from '../_ep';
import { RUN1, NAV1, RUNS, type Row } from '../waterfall-data';

const P = { x: 70, y: 300, w: 1780, h: 548 };
const X0 = 640, X1 = 1820, MS = 800;
/** The axis span (ms): the first request alone fills it, then it widens to the whole load. */
let span = MS;
const xOf = (ms: number) => X0 + (ms / span) * (X1 - X0);
const ROW_Y = (i: number) => P.y + 64 + i * 24;
const SEG = { dns: 'ember', tcp: 'bone', tls: 'ash', wait: 'signal', dl: 'graphite' } as const;
type SegK = keyof typeof SEG;
const MONO = F.mono(500);

function segs(r: Row): [SegK, number, number][] {
  let t = r.start;
  const out: [SegK, number, number][] = [];
  for (const k of ['dns', 'tcp', 'tls', 'wait'] as const) { const d = r[k]; if (d > 0) { out.push([k, t, t + d]); t += d; } }
  out.push(['dl', t, r.end]);
  return out;
}
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fam: string, col: string, align: CanvasTextAlign = 'left') {
  c.font = font(fam, size); c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left';
}

export default class Waterfall extends EpScene {
  q = 'The first request: DNS';
  w: Record<string, Word> = {};
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    const L = (q: string) => ly.get(q).i;
    this.li = {
      l97: L('The first request: DNS'), l98: L('That\'s about 160 milliseconds of handshakes'), l99: L('Every other file from'), l100: L('The images come from a second server'),
      l101: L('The page appeared at about 0.7'), l102: L('But one of my three runs'), l103: L('Reloaded straight away'), l104: L('I used to believe'), l105: L('But when I measured it'),
      l106: L('Almost all the waiting was round trips'), l107: L('I haven\'t had a serious DNS'),
    };
    this.w = {
      dns: g('The first request: DNS', 'dns'), conn: g('The first request: DNS', 'connection'), tls: g('The first request: DNS', 'tls'), waiting: g('The first request: DNS', 'waiting'),
      handshakes: g('That\'s about 160 milliseconds of handshakes', 'handshakes'), half: g('That\'s about 160 milliseconds of handshakes', 'half'), byte: g('That\'s about 160 milliseconds of handshakes', 'byte'),
      reused: g('Every other file from', 'reused'),
      own: g('The images come from a second server', 'own'), tcp2: g('The images come from a second server', 'tcp'),
      appeared: g('The page appeared at about 0.7', 'appeared'), loading: g('The page appeared at about 0.7', 'loading'),
      six: g('But one of my three runs', '6'), slow: g('But one of my three runs', 'slow'), instant: g('But one of my three runs', 'instant'),
      reloaded: g('Reloaded straight away', 'reloaded'), r79: g('Reloaded straight away', '79'),
      believe: g('I used to believe', 'believe'), server: g('I used to believe', 'server'), s15: g('But when I measured it', '15'),
      round: g('Almost all the waiting was round trips', 'round'), network: g('Almost all the waiting was round trips', 'network'),
      cert: g('I haven\'t had a serious DNS', 'certificate', 1), behind: g('I haven\'t had a serious DNS', 'behind'),
    };
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 1650, 700, 0.4)
      .key(end - 1.6, 1650, 700, 0.4, 0, ease.linear)
      .key(end - 0.05, 0, -30, 1.0, 0, ease.inOutCubic);
    this.captions();
  }
  line(i: string) { return this.ctx.lyrics.lines[this.li[i]!]!; }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const end = this.ctx.end;
    const pa = prog(t, this.ctx.start, this.ctx.start + 0.6) * (1 - prog(t, end - 1.8, end - 1.1));
    // the laptop, for the dive into the next plate
    drawStation(ctx, c, ST.laptop, prog(t, end - 1.5, end - 0.6), 0.5);
    if (pa <= 0.003) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = pa;
    ctx.fillStyle = rgba('ink', 0.94); ctx.fillRect(0, 0, W, 1080);
    ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(P.x, P.y - 70, P.w, P.h + 70, 14); ctx.fill();
    ctx.strokeStyle = rgba('graphite', 1); ctx.lineWidth = 1.2; ctx.stroke();
    label(ctx, 'NETWORK · EN.WIKIPEDIA.ORG/WIKI/DOMAIN_NAME_SYSTEM · COLD LOAD, RUN 1 OF 3 · MEASURED 11 OCT 2026', P.x + 24, P.y - 34, { size: 13, col: rgba('ash', 1) });
    const tA = prog(t, this.line('l102').start - 0.4, this.line('l102').start + 0.1);
    const bA = 1 - tA;
    if (bA > 0.003) { ctx.globalAlpha = pa * bA; this.table(t, ctx); }
    const cA = tA * (1 - prog(t, this.line('l104').start - 0.4, this.line('l104').start + 0.1));
    if (cA > 0.003) { ctx.globalAlpha = pa * cA; this.runs(t, ctx); }
    const sA = prog(t, this.line('l104').start - 0.2, this.line('l104').start + 0.3) * (1 - prog(t, this.line('l107').start - 0.3, this.line('l107').start + 0.2));
    if (sA > 0.003) { ctx.globalAlpha = pa * sA; this.where(t, ctx); }
    const eA = prog(t, this.line('l107').start - 0.1, this.line('l107').start + 0.4);
    if (eA > 0.003) { ctx.globalAlpha = pa * eA; this.errors(t, ctx); }
    ctx.globalAlpha = 1;
  }

  /** The waterfall: the first request large, then the table. */
  table(t: number, ctx: CanvasRenderingContext2D) {
    const w = this.w, l99 = this.line('l99'), l100 = this.line('l100'), l101 = this.line('l101'), ga = ctx.globalAlpha;
    const drop = prog(t, l99.start - 0.3, l99.start + 0.5, ease.inOutCubic);
    span = lerp(480, MS, drop);
    // axis
    for (let ms = 0; ms <= span + 1; ms += 100) {
      const x = xOf(ms);
      ctx.fillStyle = rgba('graphite', ms % 200 ? 0.25 : 0.55); ctx.fillRect(x, P.y + 46, 1, P.h - 60);
      if (ms % 200 === 0) label(ctx, `${ms} ms`, x, P.y + 30, { size: 12, col: rgba('ash', 0.9), align: 'center' });
    }
    label(ctx, 'NAME', P.x + 24, P.y + 30, { size: 12, col: rgba('ash', 0.9) });
    label(ctx, 'TYPE', 552, P.y + 30, { size: 12, col: rgba('ash', 0.9) });
    // the other rows, wiping in
    RUN1.forEach((r, i) => {
      if (i === 0) return;
      const k = prog(t, l99.start + 0.2 + i * 0.05, l99.start + 0.6 + i * 0.05);
      if (k <= 0.003) return;
      const up = r.host.startsWith('upload');
      const hot = up ? prog(t, l100.start, l100.start + 0.4) * (1 - prog(t, l101.start, l101.start + 0.4)) : 0;
      ctx.globalAlpha = ga * k * (up || hot ? 1 : 1 - 0.5 * prog(t, l100.start, l100.start + 0.4) * (1 - prog(t, l101.start, l101.start + 0.4)));
      this.row(ctx, r, i, ROW_Y(i), 14, k, hot);
    });
    ctx.globalAlpha = ga;
    // the first request: large, then dropped into its row
    const r0 = RUN1[0]!, y = lerp(P.y + 210, ROW_Y(0), drop), h = lerp(56, 14, drop);
    const sw = (k: SegK) => (k === 'dns' ? w.dns : k === 'tcp' ? w.conn : k === 'tls' ? w.tls : k === 'wait' ? w.waiting : w.waiting);
    segs(r0).forEach(([k, a, b]) => {
      const at = sw(k), g = prog(t, at.start - 0.1 + (k === 'dl' ? 0.9 : 0), at.end + 0.3 + (k === 'dl' ? 0.9 : 0), ease.outCubic);
      if (g <= 0) return;
      ctx.fillStyle = rgba(SEG[k], k === 'tcp' ? 0.75 : 1); ctx.fillRect(xOf(a), y - h / 2, (xOf(b) - xOf(a)) * g, h);
    });
    this.name(ctx, r0, ROW_Y(0), drop);
    // callouts while large
    const ca = 1 - drop;
    if (ca > 0.003) {
      ctx.globalAlpha = ga * ca;
      const call: [SegK, string, Word, number][] = [['dns', `DNS ${r0.dns} ms`, w.dns, 0], ['tcp', `TCP ${r0.tcp.toFixed(1)} ms`, w.conn, 1], ['tls', `TLS ${r0.tls} ms`, w.tls, 0], ['wait', `WAITING ${r0.wait} ms`, w.waiting, 1]];
      const sg = segs(r0);
      call.forEach(([k, s, at, row]) => {
        const seg = sg.find((x) => x[0] === k)!, mx = (xOf(seg[1]) + xOf(seg[2])) / 2, a = prog(t, at.start, at.end + 0.3);
        ctx.fillStyle = rgba('ash', a * 0.8); ctx.fillRect(mx, y + 32, 1, 18 + row * 34);
        label(ctx, s, mx, y + 70 + row * 34, { size: 15, col: rgba(SEG[k] === 'graphite' ? 'ash' : SEG[k], a), align: 'center', weight: 600 });
      });
      const dl = prog(t, w.waiting.end + 0.9, w.waiting.end + 1.4);
      label(ctx, 'THE HTML ARRIVING', (xOf(NAV1.ttfb) + xOf(r0.end)) / 2, y - 44, { size: 14, col: rgba('ash', dl), align: 'center' });
      // the handshakes, against the first byte
      const hk = prog(t, w.handshakes.start - 0.1, w.handshakes.end + 0.3), x0 = xOf(r0.dns), x1 = xOf(r0.dns + r0.tcp + r0.tls);
      ctx.strokeStyle = rgba('bone', hk); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y - 44); ctx.lineTo(x0, y - 54); ctx.lineTo(x1, y - 54); ctx.lineTo(x1, y - 44); ctx.stroke();
      label(ctx, `${(r0.tcp + r0.tls).toFixed(0)} MS OF HANDSHAKES`, (x0 + x1) / 2, y - 66, { size: 15, col: rgba('bone', hk), align: 'center', weight: 600 });
      const fb = prog(t, w.byte.start - 0.6, w.byte.end + 0.2);
      ctx.fillStyle = rgba('signal', fb); ctx.fillRect(xOf(NAV1.ttfb) - 1, y - 110, 2, 200);
      label(ctx, `FIRST BYTE ${NAV1.ttfb.toFixed(0)} MS`, xOf(NAV1.ttfb) + 10, y - 96, { size: 15, col: rgba('signal', fb), weight: 600 });
      label(ctx, 'MORE THAN HALF OF IT: HANDSHAKES', xOf(NAV1.ttfb) + 10, y - 76, { size: 12, col: rgba('ash', fb * prog(t, w.half.start, w.half.end + 0.3)) });
      ctx.globalAlpha = ga;
    }
    // the image server's row: its own lookup and handshakes
    const im = prog(t, w.own.start - 0.1, w.tcp2.end + 0.4) * (1 - prog(t, l101.start, l101.start + 0.4));
    if (im > 0.003) {
      const r = RUN1[14]!, y14 = ROW_Y(14);
      ctx.strokeStyle = rgba('signal', im); ctx.lineWidth = 2; ctx.strokeRect(P.x + 10, y14 - 12, P.w - 20, 24);
      label(ctx, `ITS OWN DNS ${r.dns} MS + TCP AND TLS ${(r.tcp + r.tls).toFixed(0)} MS`, xOf(r.end) + 14, y14 + 5, { size: 13, col: rgba('signal', im), weight: 600 });
    }
    // first paint, loaded
    for (const [ms, s, at] of [[NAV1.fcp, 'FIRST PAINT', w.appeared], [NAV1.load, 'LOADED', w.loading]] as const) {
      const a = prog(t, at.start - 0.1, at.end + 0.3);
      if (a <= 0.003) continue;
      ctx.fillStyle = rgba(s === 'LOADED' ? 'signal' : 'bone', a); ctx.fillRect(xOf(ms) - 1, P.y + 46, 2, P.h - 60);
      label(ctx, `${s} ${(ms / 1000).toFixed(2)} S`, xOf(ms) - 8, P.y + P.h - 22 - (s === 'LOADED' ? 0 : 22), { size: 13, col: rgba(s === 'LOADED' ? 'signal' : 'bone', a), align: 'right', weight: 600 });
    }
    // legend
    const lg = prog(t, w.dns.start, w.waiting.end);
    (['dns', 'tcp', 'tls', 'wait', 'dl'] as SegK[]).forEach((k, i) => {
      const x = P.x + 24 + i * 150, yy = P.y + P.h - 16;
      ctx.fillStyle = rgba(SEG[k], lg); ctx.fillRect(x, yy - 10, 18, 10);
      label(ctx, ['DNS', 'TCP', 'TLS', 'WAITING', 'DOWNLOAD'][i]!, x + 26, yy, { size: 11, col: rgba('ash', lg) });
    });
  }
  name(ctx: CanvasRenderingContext2D, r: Row, y: number, a: number) {
    if (a <= 0.003) return;
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * a;
    text(ctx, r.host, P.x + 24, y + 5, 13, MONO, rgba('ash', 1));
    text(ctx, r.path, P.x + 24 + 180, y + 5, 12, MONO, rgba('bone', 0.9));
    text(ctx, r.type, 552, y + 5, 11, MONO, rgba('ash', 0.9));
    ctx.globalAlpha = ga;
  }
  row(ctx: CanvasRenderingContext2D, r: Row, i: number, y: number, h: number, k: number, hot: number) {
    this.name(ctx, r, y, 1);
    for (const [s, a, b] of segs(r)) { ctx.fillStyle = rgba(SEG[s], s === 'dl' ? 1 : hot > 0.1 || !r.reused ? 1 : 0.9); ctx.fillRect(xOf(a), y - h / 2, Math.max(1, (xOf(b) - xOf(a)) * k), h); }
  }

  /** Three cold runs and the reload, on a 6-second axis. */
  runs(t: number, ctx: CanvasRenderingContext2D) {
    const w = this.w;
    const ax = (ms: number) => 520 + (ms / 6000) * 1260;
    for (let s = 0; s <= 6; s++) { ctx.fillStyle = rgba('graphite', 0.5); ctx.fillRect(ax(s * 1000), P.y + 20, 1, P.h - 40); label(ctx, `${s} s`, ax(s * 1000), P.y + 12, { size: 12, col: rgba('ash', 0.9), align: 'center' }); }
    const rows: [string, number, string, number][] = [
      ['COLD, RUN 1', RUNS.cold[0]!, 'bone', 0], ['COLD, RUN 2', RUNS.cold[1]!, 'bone', 0.2], ['COLD, RUN 3', RUNS.cold[2]!, 'acid', 0.4], ['RELOAD, STRAIGHT AWAY', RUNS.warm, 'signal', -1],
    ];
    const l102 = this.line('l102');
    rows.forEach(([name, ms, col, d], i) => {
      const y = P.y + 110 + i * 100;
      const k = d < 0 ? prog(t, w.reloaded.start, w.reloaded.end + 0.8, ease.outCubic) : prog(t, l102.start + d, l102.start + d + (i === 2 ? 2.0 : 0.7), ease.outCubic);
      if (k <= 0.003) return;
      label(ctx, name, 500, y + 8, { size: 15, col: rgba('ash', k), align: 'right', weight: 600 });
      ctx.fillStyle = rgba(col, 0.9); ctx.fillRect(ax(0), y - 14, (ax(ms) - ax(0)) * k, 28);
      text(ctx, `${(ms / 1000 * k).toFixed(2)} s`, ax(ms * k) + 16, y + 10, 26, F.mono(600), rgba(col, k));
    });
    // the slow one: the HTML itself took 3.4 s to arrive
    const sa = prog(t, w.slow.start - 0.1, w.slow.end + 0.3);
    const y3 = P.y + 110 + 2 * 100;
    ctx.strokeStyle = rgba('ink', sa); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax(RUNS.slowHtmlEnd), y3 - 14); ctx.lineTo(ax(RUNS.slowHtmlEnd), y3 + 14); ctx.stroke();
    label(ctx, `THE HTML ITSELF: ${(RUNS.slowHtmlEnd / 1000).toFixed(1)} S TO ARRIVE`, ax(RUNS.slowHtmlEnd) - 10, y3 + 46, { size: 13, col: rgba('acid', sa), align: 'right', weight: 600 });
    text(ctx, '"Instant" isn\'t guaranteed.', ax(0), P.y + P.h - 20, 30, SAY_LIGHT, rgba('acid', prog(t, w.instant.start, w.instant.end + 0.4)));
    const ra = prog(t, w.r79.start - 0.2, w.r79.end + 0.3);
    label(ctx, `NO DNS · NO NEW CONNECTION · FIRST BYTE ${RUNS.warmTtfb.toFixed(0)} MS`, ax(RUNS.warm) + 160, P.y + 110 + 300 + 8, { size: 13, col: rgba('signal', ra), weight: 600 });
  }

  /** Where the 0.79 s went (the first run's critical path); the server's part is a sliver. */
  where(t: number, ctx: CanvasRenderingContext2D) {
    const w = this.w, r0 = RUN1[0]!;
    const parts: [string, number, string, boolean][] = [
      ['DNS', r0.dns, 'ember', true], ['TCP', r0.tcp, 'bone', true], ['TLS', r0.tls, 'ash', true], ['THE REQUEST CROSSING', r0.wait - 15, 'bone', true],
      ['SERVER', 15, 'signal', false], ['THE HTML ARRIVING', r0.end - NAV1.ttfb, 'graphite', true], ['THE REST OF THE PAGE', NAV1.load - r0.end, 'graphite', true],
    ];
    const total = parts.reduce((s, p) => s + p[1], 0), x0 = 140, wd = 1640, y = P.y + 220;
    text(ctx, `Where the ${(NAV1.load / 1000).toFixed(2)} seconds went`, x0, P.y + 70, 44, SAY, rgba('bone', 1));
    const net = prog(t, w.round.start, w.network.end + 0.3), sv = prog(t, w.s15.start - 0.1, w.s15.end + 0.3);
    let x = x0;
    parts.forEach(([name, ms, col, isNet], i) => {
      const pw = (ms / total) * wd, k = prog(t, this.line('l104').start + i * 0.12, this.line('l104').start + i * 0.12 + 0.4);
      const dim = isNet ? 0.55 + 0.45 * net : 1;
      ctx.fillStyle = rgba(col, k * dim); ctx.fillRect(x + 1, y, pw - 2, 70);
      if (!isNet) {
        ctx.fillStyle = rgba('signal', sv); ctx.fillRect(x + pw / 2 - 1, y + 70, 2, 70);
        label(ctx, 'THE SERVER ITSELF: ≈ 15 MS', x + pw / 2, y + 166, { size: 17, col: rgba('signal', sv), align: 'center', weight: 600 });
      } else if (pw > 120) label(ctx, name, x + pw / 2, y - 16, { size: 12, col: rgba('ash', k), align: 'center' });
      x += pw;
    });
    label(ctx, 'EVERYTHING ELSE: ROUND TRIPS, HANDSHAKES, THE NETWORK', x0, y + 250, { size: 17, col: rgba('bone', net), weight: 600 });
    const bl = prog(t, w.believe.start, w.server.end + 0.3) * (1 - sv);
    text(ctx, 'slow site = slow server?', x0, y + 160, 34, SAY_LIGHT, rgba('ash', bl));
  }

  /** The two errors the creator has seen, decoded. */
  errors(t: number, ctx: CanvasRenderingContext2D) {
    const w = this.w, l107 = this.line('l107');
    const a1 = prog(t, l107.start + 1.5, l107.start + 2.2), a2 = prog(t, w.cert.start - 0.1, w.cert.end + 0.3), a3 = prog(t, w.behind.start - 1.2, w.behind.end);
    text(ctx, 'Seen while browsing', 140, P.y + 70, 44, SAY, rgba('bone', 1));
    const box = (y: number, head: string, gloss: string, a: number, col: string) => {
      ctx.fillStyle = rgba('ink', 0.6 * a); ctx.beginPath(); ctx.roundRect(140, y, 1640, 120, 12); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.8 * a); ctx.lineWidth = 1.5; ctx.stroke();
      text(ctx, head, 180, y + 56, 34, F.mono(600), rgba(col, a));
      label(ctx, gloss, 180, y + 94, { size: 15, col: rgba('bone', a * a3), weight: 600 });
    };
    box(P.y + 130, 'DNS_PROBE_FINISHED_NXDOMAIN', '= THE DNS ANSWER CAME BACK: NO SUCH NAME (NXDOMAIN, "NON-EXISTENT DOMAIN")', a1, 'bone');
    box(P.y + 290, 'This connection is not private', '= ONE OF THE CERTIFICATE CHECKS FAILED: THE SIGNATURE, THE CHAIN, THE NAME OR THE DATE', a2, 'bone');
  }
}
