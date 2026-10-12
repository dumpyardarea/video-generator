// DNS (chapter 3, "DNS: finding the address") — "Computers don't find each other by name … what's the IP address of
// example.com? … the browser checks its own memory … then a DNS resolver … In the worst case, the resolver walks down
// a tree … But the resolver keeps every answer for a while … So a real lookup rarely visits the root at all.
// In my measurement, the whole DNS step took about 10 milliseconds … Now we know where the server is."
// From the router: the name and the number. Two local checks miss; the packet rides on to the resolver. The camera
// pulls wide for the worst case: three round trips down the tree (root, .com, example.com's own servers), each
// reply a pill. Then the resolver's cache with live TTL countdowns, the crowd it serves, the root greyed out
// ("ROOT SERVERS CONTACTED: 0"), the measured 10 ms round trip, and the camera pulls back to show the far server.
import type { Word } from '../../engine/lyrics';
import { ease, prog, TAU } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, along, drawStation, drawRoute, drawPacket, pill, card, check, font, rgba, label, setWorld, w2s, F, LIN, type StationKey } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const IP = '203.0.113.10';
const rev = (ps: P[]) => [...ps].reverse();
const FROM_ROUTER = ROUTES.toResolver.slice(40);
const BACK = rev(ROUTES.toResolver);
/** The resolver's other customers: a ring of small dots on its far side from the tree. */
const CROWD: P[] = Array.from({ length: 64 }, (_, i) => {
  const r1 = Math.sin(i * 12.9898) * 43758.5453, r2 = Math.sin(i * 78.233) * 12543.123;
  const f1 = r1 - Math.floor(r1), f2 = r2 - Math.floor(r2);
  const ang = (140 + 140 * f1) * (Math.PI / 180), rad = 320 + 480 * f2;
  return { x: ST.resolver.x + Math.cos(ang) * rad, y: ST.resolver.y + Math.sin(ang) * rad * 0.8 };
});
const CACHE_CARD = { x: 1690, y: -500, w: 600, sc: 1.75 };

type Seg = { ps: P[]; t0: number; t1: number; trail?: number };

export default class Dns extends EpScene {
  q = 'Computers don\'t find each other';
  w: Record<string, Word> = {};
  segs: Seg[] = [];
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    const L = (q: string) => ly.get(q);
    this.w = {
      name: g('Computers don\'t find each other', 'name'), numbers: g('Computers don\'t find each other', 'numbers'),
      question: g('So the first question is', 'question'), ofEx: g('So the first question is', 'examplecom'),
      dns: g('Finding it is the job of DNS', 'dns'), system: g('Finding it is the job of DNS', 'system'),
      memory: g('checks its own memory', 'memory'), os: g('checks its own memory', 'operating'), osEnd: g('checks its own memory', 'systems'),
      goes: g('If neither knows', 'goes'), resolver: g('If neither knows', 'resolver'), public: g('If neither knows', 'public'),
      worst: g('In the worst case', 'worst'), tree: g('In the worst case', 'tree'),
      asks1: g('It asks a root server', 'asks'), root1: g('It asks a root server', 'server'), points: g('It asks a root server', 'points'), com: g('It asks a root server', 'com'),
      asks2: g('It asks those, which point', 'asks'), those: g('It asks those, which point', 'those'), point: g('It asks those, which point', 'point'), ex2: g('It asks those, which point', 'examplecom'),
      auth: g('the authoritative ones', 'authoritative'), answer: g('the authoritative ones', 'answer'), address: g('the authoritative ones', 'address'),
      keeps: g('But the resolver keeps', 'keeps'), timer: g('Each answer has a timer', 'timer'), ttl: g('Each answer has a timer', 'ttl'),
      thousands: g('it serves thousands', 'thousands'), cached: g('it serves thousands', 'cached'),
      rarely: g('rarely visits the root', 'rarely'), rootLast: g('rarely visits the root', 'root'),
      whole: g('In my measurement, the whole DNS step', 'whole'), ms: g('In my measurement, the whole DNS step', 'milliseconds'), close: g('In my measurement, the whole DNS step', 'close'),
      where: g('Now we know where the server is', 'where'), reach: g('Now we know where the server is', 'reach'),
    };
    const w = this.w;
    this.li = { l23: L('Computers don\'t find each other').i, l26: L('checks its own memory').i, l27: L('If neither knows').i, l31: L('the authoritative ones').i, l32: L('But the resolver keeps').i, l36: L('In my measurement, the whole DNS step').i, l37: L('Now we know where the server is').i };
    const l31 = ly.lines[this.li.l31]!, l36 = ly.lines[this.li.l36]!, l37 = ly.lines[this.li.l37]!, l23 = ly.lines[this.li.l23]!;
    const half = (w.ms.end - w.whole.start) / 2;
    this.segs = [
      { ps: FROM_ROUTER, t0: w.goes.start, t1: w.resolver.end + 0.2 },
      { ps: ROUTES.toRoot, t0: w.asks1.start, t1: w.root1.end + 0.1 },
      { ps: rev(ROUTES.toRoot), t0: w.points.start, t1: w.com.end },
      { ps: ROUTES.toTld, t0: w.asks2.start, t1: w.those.end + 0.1 },
      { ps: rev(ROUTES.toTld), t0: w.point.start, t1: w.ex2.end },
      { ps: ROUTES.toAuth, t0: l31.start - 0.1, t1: w.auth.end + 0.1 },
      { ps: rev(ROUTES.toAuth), t0: w.answer.start, t1: w.address.end + 0.1 },
      { ps: BACK, t0: w.keeps.start - 0.6, t1: w.keeps.start - 0.05 },
      { ps: ROUTES.toResolver, t0: w.whole.start, t1: w.whole.start + half, trail: 0.22 },
      { ps: BACK, t0: w.whole.start + half, t1: w.ms.end + 0.1, trail: 0.22 },
    ];


    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, ST.router.x, ST.router.y, 0.92)
      .key(l23.start + 0.8, 400, -280, 0.85, 0, ease.inOutCubic)
      .key(w.goes.start - 0.1, 380, -260, 0.86, 0, ease.linear)
      .key(w.resolver.end + 0.4, 900, -380, 0.78, 0, ease.inOutCubic)
      .key(w.worst.start, 920, -390, 0.78, 0, ease.linear)
      .key(w.tree.end + 0.3, 2350, -760, 0.5, 0, ease.inOutCubic)
      .key(l31.end, 2300, -760, 0.5, 0, ease.linear)
      .key(w.timer.start, 1950, -700, 0.56, 0, ease.inOutCubic)
      .key(w.rootLast.end, 1980, -720, 0.56, 0, ease.linear)
      .key(l36.start + 0.9, 800, -320, 0.78, 0, ease.inOutCubic)
      .key(l37.start, 820, -320, 0.8, 0, ease.linear)
      .key(end - 0.05, 1750, 80, 0.42, 0, ease.inOutCubic);
    // captions beside what each line is about (still fixed on screen, so the zooms never cut them)
    const top = { x: 80, y: 150, maxW: 1050 }, mid = { align: 'center' as const, y: 480, maxW: 1400 }, right = { align: 'right' as const, maxW: 1300 };
    for (const q of ["Computers don't find each other", 'So the first question is', 'Finding it is the job of DNS']) this.captionLine(q, mid);
    for (const q of ['checks its own memory', 'If neither knows']) this.captionLine(q, right);
    for (const q of ['In the worst case', 'It asks a root server', 'It asks those, which point', 'the authoritative ones', 'But the resolver keeps', 'Each answer has a timer']) this.captionLine(q, top);
    for (const q of ['it serves thousands', 'rarely visits the root']) this.captionLine(q, top);
    this.captionLine('In my measurement, the whole DNS step', { align: 'center', maxW: 1500 });
    this.captions();
  }

  /** A label at a constant size on screen. */
  lab(ctx: CanvasRenderingContext2D, c: Cam, text: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center') {
    setWorld(ctx, c, 0, 0);
    label(ctx, text, x, y, { size: size / c.z, col, align, spacing: 3 / c.z });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  packet(t: number): { ps: P[]; u: number; trail: number } | { at: P } {
    let last: Seg | null = null;
    for (const s of this.segs) {
      if (t < s.t0) break;
      if (t < s.t1) return { ps: s.ps, u: prog(t, s.t0, s.t1, ease.inOutCubic), trail: s.trail ?? 0.1 };
      last = s;
    }
    return { at: last ? last.ps[last.ps.length - 1]! : ST.router };
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, ly = this.ctx.lyrics.lines;
    const l26 = ly[this.li.l26]!, l32 = ly[this.li.l32]!, l37 = ly[this.li.l37]!;
    const tree = (i: number) => prog(t, w.tree.start + i * 0.15, w.tree.start + i * 0.15 + 0.35) * (1 - prog(t, l37.start, l37.start + 0.6));
    const dim = 1 - 0.65 * prog(t, w.rarely.start, w.rootLast.end + 0.2) * (1 - prog(t, l37.start, l37.start + 0.5));
    const vis: [StationKey, number, number][] = [
      ['laptop', 1, prog(t, w.whole.start, w.whole.start + 0.2) * (1 - prog(t, w.ms.end, w.ms.end + 0.6))],
      ['router', 1, 0],
      ['resolver', prog(t, w.goes.start - 0.3, w.goes.start + 0.3), prog(t, w.resolver.end - 0.1, w.resolver.end + 0.2) * (1 - prog(t, w.whole.start, w.whole.start + 0.4))],
      ['root', tree(0) * dim, prog(t, w.root1.start, w.root1.end) * (1 - prog(t, w.com.end, w.com.end + 0.4))],
      ['tld', tree(1) * dim, prog(t, w.those.start, w.those.end) * (1 - prog(t, w.ex2.end, w.ex2.end + 0.4))],
      ['auth', tree(2), prog(t, w.auth.start, w.auth.end) * (1 - prog(t, w.address.end, w.address.end + 0.4))],
      ['server', prog(t, w.where.start, w.where.end + 0.4), prog(t, w.reach.start, w.reach.end + 0.3)],
    ];
    for (const [k, a, hot] of vis) drawStation(ctx, c, ST[k], a, hot, k === 'server' ? { sub: `${IP} · the web server` } : {});

    // ---- a name and a number
    const nA = prog(t, this.ctx.start + 0.3, this.ctx.start + 0.9) * (1 - prog(t, l26.start - 0.3, l26.start + 0.2));
    if (nA > 0.003) {
      const y = -560, sz = 84;
      setWorld(ctx, c, 0, 0);
      ctx.globalAlpha = nA;
      ctx.font = font(F.mono(500), sz); ctx.textAlign = 'right'; ctx.fillStyle = rgba('bone', 1);
      ctx.fillText('example.com', 300, y);
      const nk = prog(t, w.numbers.start - 0.1, w.numbers.end + 0.2, ease.outCubic);
      const qk = prog(t, w.question.start, w.question.end);
      ctx.strokeStyle = rgba('ash', 0.9); ctx.lineWidth = 3 / c.z; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(340, y - 28); ctx.lineTo(340 + 120 * nk, y - 28); ctx.stroke();
      if (nk > 0.9) { ctx.beginPath(); ctx.moveTo(445, y - 40); ctx.lineTo(460, y - 28); ctx.lineTo(445, y - 16); ctx.stroke(); }
      ctx.textAlign = 'left';
      if (qk < 0.5) { ctx.fillStyle = rgba('signal', nk * (1 - qk * 2)); ctx.fillText(IP.slice(0, Math.ceil(IP.length * nk)), 500, y); }
      else { ctx.fillStyle = rgba('signal', Math.floor(t * 2.2) % 2 ? 1 : 0.55); ctx.fillText('?', 500, y); }
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.lab(ctx, c, 'NAME', 300 - 280, y + 56, 15, rgba('ash', nA));
      this.lab(ctx, c, qk < 0.5 ? 'IP ADDRESS (AN EXAMPLE)' : 'IP ADDRESS', 500 + 300, y + 56, 15, rgba('ash', nA * nk));
      const dk = prog(t, w.dns.start - 0.1, w.system.end + 0.2);
      this.lab(ctx, c, 'DNS · THE DOMAIN NAME SYSTEM', 400, y - 140, 26, rgba('signal', nA * dk));
    }
    // ---- the two local caches
    const cA = prog(t, l26.start - 0.2, l26.start + 0.3) * (1 - prog(t, w.goes.start - 0.2, w.goes.start + 0.3));
    if (cA > 0.003) {
      check(ctx, c, -560, -420, 'the browser\'s memory of recent lookups', false, prog(t, w.memory.start, w.memory.end + 0.3), 34, cA);
      check(ctx, c, -560, -340, 'the operating system\'s', false, prog(t, w.os.start, w.osEnd.end + 0.3), 34, cA);
    }
    // ---- the resolver: whose it is
    const pa = prog(t, w.public.start - 0.1, w.public.end + 0.3) * (1 - prog(t, w.worst.start, w.worst.start + 0.4));
    pill(ctx, c, ST.resolver.x, ST.resolver.y - 150, 'OR A PUBLIC ONE: 1.1.1.1 · 8.8.8.8', { a: pa, col: 'ash', outline: true, size: 22 / c.z });
    // ---- the worst case: the tree
    const wa = prog(t, w.worst.start, w.tree.end + 0.4) * (1 - prog(t, l32.start - 0.3, l32.start + 0.2));
    if (wa > 0.003) {
      this.lab(ctx, c, 'THE WORST CASE: NOTHING CACHED ANYWHERE', ST.resolver.x, ST.resolver.y - 260, 22, rgba('ash', wa));
      const reps: [StationKey, string, Word, number][] = [
        ['root', 'ASK THE .COM SERVERS', w.points, -190], ['tld', 'ASK EXAMPLE.COM\'S SERVERS', w.point, -190], ['auth', `EXAMPLE.COM = ${IP}`, w.answer, -190],
      ];
      for (const [k, s, at, dy] of reps) {
        const ra = prog(t, at.start - 0.1, at.start + 0.3) * wa;
        pill(ctx, c, ST[k].x, ST[k].y + dy, s, { a: ra, size: 20 / c.z, col: k === 'auth' ? 'signal' : 'bone' });
      }
    }
    // ---- the resolver's cache, with live TTLs
    const ka = prog(t, w.keeps.start - 0.2, w.keeps.end + 0.3) * (1 - prog(t, this.ctx.lyrics.lines[this.li.l36]!.start - 0.3, this.ctx.lyrics.lines[this.li.l36]!.start + 0.3));
    if (ka > 0.003) {
      const el = Math.max(0, Math.floor(t - w.ttl.start));
      const ttl = (n: number) => (t > w.ttl.start ? `TTL ${String(n - el).padStart(6)} s` : '');
      const rows = [`.com servers    ${ttl(172800)}`, `example.com DNS ${ttl(86400)}`, `example.com     ${ttl(300)}`, `  → ${IP}`];
      card(ctx, c, CACHE_CARD.x, CACHE_CARD.y, CACHE_CARD.w, 'Resolver cache', rows, prog(t, w.keeps.start, w.keeps.end + 0.8) * rows.length, {
        a: ka, size: 24, scale: CACHE_CARD.sc, lineCol: (i) => (i === 3 ? rgba('signal', 1) : rgba('bone', 0.92)), hot: prog(t, w.ttl.start, w.ttl.end) * (1 - prog(t, w.ttl.end + 0.5, w.ttl.end + 1)),
      });
    }
    // ---- the crowd it serves
    const cr = prog(t, w.thousands.start - 0.2, w.thousands.end + 0.5) * (1 - prog(t, this.ctx.lyrics.lines[this.li.l36]!.start - 0.3, this.ctx.lyrics.lines[this.li.l36]!.start + 0.3));
    if (cr > 0.003) {
      setWorld(ctx, c, 0, 0);
      CROWD.forEach((p, i) => {
        const k = prog(t, w.thousands.start + i * 0.012, w.thousands.start + i * 0.012 + 0.3);
        ctx.globalAlpha = cr * k; ctx.fillStyle = rgba('ash', 0.85);
        ctx.beginPath(); ctx.arc(p.x, p.y, 7 / c.z, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.lab(ctx, c, 'THOUSANDS OF OTHER PEOPLE, SAME RESOLVER', ST.resolver.x - 560, ST.resolver.y - 420, 18, rgba('ash', cr));
    }
    // ---- deadpan: the root, untouched
    const ra = prog(t, w.rootLast.start, w.rootLast.end + 0.3) * (1 - prog(t, this.ctx.lyrics.lines[this.li.l36]!.start, this.ctx.lyrics.lines[this.li.l36]!.start + 0.4));
    this.lab(ctx, c, 'ROOT SERVERS CONTACTED: 0', ST.root.x, ST.root.y - 130, 22, rgba('signal', ra));
    // ---- measured
    const ma = prog(t, w.ms.start, w.ms.end + 0.3) * (1 - prog(t, l37.start, l37.start + 0.4));
    pill(ctx, c, (ST.router.x + ST.resolver.x) / 2, (ST.router.y + ST.resolver.y) / 2 - 190, 'DNS ≈ 10 ms · MEASURED', { a: ma, size: 22 / c.z });
    this.lab(ctx, c, 'SOMETHING CLOSE BY ALREADY KNEW', (ST.router.x + ST.resolver.x) / 2, (ST.router.y + ST.resolver.y) / 2 - 110, 14, rgba('ash', ma * prog(t, w.close.start, w.close.end + 0.3)));

  }

  override penScreen(t: number) {
    const p = this.packet(t), q = 'at' in p ? p.at : along(p.ps, p.u);
    return w2s(this.cam.at(t), q.x, q.y);
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const w = this.w;
    // routes, drawn as they are first travelled
    const tr = (s: number) => { const g = this.segs[s]!; return prog(t, g.t0, g.t1, ease.inOutCubic); };
    const l37 = this.ctx.lyrics.lines[this.li.l37]!, gone = 1 - prog(t, l37.start, l37.start + 0.6);
    drawRoute(X, c, ROUTES.toResolver, 0.5 + 0.5 * tr(0), prog(t, w.goes.start - 0.3, w.goes.start + 0.2));
    drawRoute(X, c, ROUTES.toRoot, tr(1), prog(t, w.tree.start, w.tree.end) * gone * (1 - 0.6 * prog(t, w.rarely.start, w.rootLast.end)));
    drawRoute(X, c, ROUTES.toTld, tr(3), prog(t, w.tree.start + 0.15, w.tree.end) * gone * (1 - 0.6 * prog(t, w.rarely.start, w.rootLast.end)));
    drawRoute(X, c, ROUTES.toAuth, tr(5), prog(t, w.tree.start + 0.3, w.tree.end) * gone);
    drawRoute(X, c, ROUTES.toServer, 0, prog(t, w.where.start, w.where.end + 0.5), 0.3);
    // the crowd's queries: brief flashes towards the resolver
    const cr = prog(t, w.thousands.start, w.thousands.end + 0.5) * (1 - prog(t, w.whole.start - 1, w.whole.start - 0.4));
    if (cr > 0.003) {
      const r = w2s(c, ST.resolver.x, ST.resolver.y);
      CROWD.forEach((p, i) => {
        const ph = (t * 0.7 + i * 0.37) % 1;
        if (ph > 0.25) return;
        const s = w2s(c, p.x, p.y), k = ph / 0.25;
        X.seg2(s[0] + (r[0] - s[0]) * Math.max(0, k - 0.3), s[1] + (r[1] - s[1]) * Math.max(0, k - 0.3), s[0] + (r[0] - s[0]) * k, s[1] + (r[1] - s[1]) * k, 2, LIN.ash, cr * 0.5);
      });
    }
    const p = this.packet(t);
    if ('at' in p) {
      const s = w2s(c, p.at.x, p.at.y), br = 1 + 0.15 * Math.sin(t * 5);
      X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 18 * br, [LIN.ember[0] * 3, LIN.ember[1] * 3, LIN.ember[2] * 3], 1);
      X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 44, [LIN.signal[0] * 0.6, LIN.signal[1] * 0.6, LIN.signal[2] * 0.6], 0.6);
    } else drawPacket(X, c, p.ps, p.u, { trail: p.trail, size: 1.8 });
  }
}
