// SHORT 1 · How DNS finds a website (short-ep01-dns, from EP01 chapter 3). One vertical plate, phases by line:
//  0 the question: an address bar, "example.com", and a blinking "?"     1 a name against a number (the IP)
//  2 DNS, named                                                           3 the browser's and the OS's memory: no
//  4 the packet climbs to the resolver                                    5 the tree: root, .com, the site's servers
//  6 the resolver's cache, TTLs counting down, the crowd it serves        7 the tree greys out: "ROOT SERVERS CONTACTED: 0"
//  8 measured: ≈ 10 ms, a fast round trip                                 9 the full video; the bar returns, so it loops
import type { Word } from '../../engine/lyrics';
import { ease, prog, lerp, TAU } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { arc, along, drawStation, drawRoute, drawPacket, restPacket, card, check, pill, slab, stext, rgba, setWorld, font, w2s, F, SAY, LIN } from '../_ep';
import type { LineBatch } from '../../engine/lines';
import { ShortScene, S, stS } from './_short';

const IP = '203.0.113.10';
const LAP = stS(540, 1060, 'your laptop', 'the browser', 60), RTR = stS(320, 905, 'home router', '192.168.1.1', 40), RES = stS(720, 760, 'DNS resolver', 'your provider', 54);
const ROOT = stS(230, 330, 'root', 'the top', 46), TLD = stS(540, 250, '.com', 'top-level', 46), AUTH = stS(850, 345, 'example.com', 'its own DNS', 46);
const UP: P[] = [...arc(LAP, RTR, 0.12), ...arc(RTR, RES, -0.12).slice(1)];
const DOWN = [...UP].reverse();
const TREE = { root: arc(RES, ROOT, 0.1), tld: arc(RES, TLD, -0.06), auth: arc(RES, AUTH, 0.08) };
const CROWD: P[] = Array.from({ length: 40 }, (_, i) => {
  const r1 = Math.sin(i * 12.9898) * 43758.5453, r2 = Math.sin(i * 78.233) * 12543.123;
  const f1 = r1 - Math.floor(r1), f2 = r2 - Math.floor(r2), ang = (-75 + 110 * f1) * (Math.PI / 180), rad = (190 + 110 * f2) / 1.5;
  return { x: RES.x + Math.cos(ang) * rad, y: RES.y + Math.sin(ang) * rad };
});
const BAR = { x: 110, y: 230, w: 860, h: 104 };
type Seg = { ps: P[]; t0: number; t1: number; trail?: number };

export default class DnsShort extends ShortScene {
  q = 'How does your computer find a website';
  w: Record<string, Word> = {};
  segs: Seg[] = [];

  setup() {
    const g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      website: g('How does your computer', 'website'), name: g('It can\'t use the name', 'name'), number: g('It can\'t use the name', 'number'),
      dns: g('Finding it is the job of DNS', 'dns'), browser: g('First, your browser', 'browser'), os: g('First, your browser', 'operating'), know: g('First, your browser', 'know'),
      resolver: g('If not, the question goes', 'resolver'), tree: g('The resolver can walk', 'tree'), root: g('The resolver can walk', 'root'), com: g('The resolver can walk', 'com'),
      own: g('The resolver can walk', 'own'), servers: g('The resolver can walk', 'servers'),
      keeps: g('But it keeps every answer', 'keeps'), timer: g('But it keeps every answer', 'timer'), thousands: g('But it keeps every answer', 'thousands'),
      usually: g('So it usually knows', 'usually'), already: g('So it usually knows', 'already'),
      measured: g('For Wikipedia, I measured', 'measured'), ms: g('For Wikipedia, I measured', 'milliseconds'), cache: g('For Wikipedia, I measured', 'cache'),
      full: g('The full trip', 'full'), video: g('The full trip', 'video'),
    };
    const w = this.w, l4 = this.ln(4), l8 = this.ln(8);
    const trip = (ps: P[], a: number, b: number): Seg[] => [{ ps, t0: a, t1: (a + b) / 2 }, { ps: [...ps].reverse(), t0: (a + b) / 2, t1: b }];
    this.segs = [
      { ps: UP, t0: l4.start + 0.4, t1: w.resolver.end + 0.2 },
      ...trip(TREE.root, w.root.start - 0.2, w.root.end + 0.6), ...trip(TREE.tld, w.com.start - 0.2, w.com.end + 0.6), ...trip(TREE.auth, w.own.start - 0.1, w.servers.end + 0.5),
      { ps: DOWN, t0: this.ln(7).start, t1: this.ln(7).start + 0.8 },
      { ps: UP, t0: w.measured.start, t1: w.measured.start + 0.7, trail: 0.25 }, { ps: DOWN, t0: w.measured.start + 0.7, t1: w.measured.start + 1.4, trail: 0.25 },
    ];
    void l8;
    this.holdCamera();
    this.shortCaptions();
  }

  packet(t: number): { ps: P[]; u: number; trail: number } | { at: P } {
    let last: Seg | null = null;
    for (const s of this.segs) {
      if (t < s.t0) break;
      if (t < s.t1) return { ps: s.ps, u: prog(t, s.t0, s.t1, ease.inOutCubic), trail: s.trail ?? 0.1 };
      last = s;
    }
    return { at: last ? last.ps[last.ps.length - 1]! : LAP };
  }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, end = this.ctx.end;
    const cta = prog(t, this.ln(9).start - 0.2, this.ln(9).start + 0.4);
    const loop = prog(t, end - 1.0, end - 0.3);
    const mapA = 1 - cta;
    // ---- 0 and the loop: the address bar, asking
    const barA = Math.max(this.span(t, 0, 3, 0.6), loop);
    if (barA > 0.003) this.bar(t, c, ctx, barA, t > w.number.end && t < end - 1.5);
    // ---- the stations
    const dim = (1 - 0.7 * prog(t, w.usually.start, w.already.end)) * (1 - 0.97 * prog(t, this.ln(8).start - 0.2, this.ln(8).start + 0.3));
    drawStation(ctx, c, LAP, mapA, prog(t, w.measured.start, w.measured.start + 0.2) * 0.8 + 0.2);
    drawStation(ctx, c, RTR, mapA * prog(t, this.ln(4).start, this.ln(4).start + 0.4), 0);
    drawStation(ctx, c, RES, mapA * prog(t, this.ln(4).start + 0.3, this.ln(4).start + 0.8), prog(t, w.resolver.end, w.resolver.end + 0.3) * 0.8);
    const tr = (i: number) => mapA * prog(t, w.tree.start + i * 0.15, w.tree.start + i * 0.15 + 0.4);
    drawStation(ctx, c, ROOT, tr(0) * dim, prog(t, w.root.start, w.root.end + 0.3) * (1 - prog(t, w.com.start, w.com.end)));
    drawStation(ctx, c, TLD, tr(1) * dim, prog(t, w.com.start, w.com.end + 0.3) * (1 - prog(t, w.own.start, w.own.end)));
    drawStation(ctx, c, AUTH, tr(2) * (1 - 0.97 * prog(t, this.ln(8).start - 0.2, this.ln(8).start + 0.3)), prog(t, w.own.start, w.servers.end) * (1 - prog(t, w.keeps.start, w.keeps.end)));
    // ---- 1 a name, a number
    const nA = this.span(t, 1, 3);
    if (nA > 0.003) {
      stext(ctx, c, 'example.com', 540 / 1.5, 520 / 1.5, 78, F.mono(500), rgba('bone', nA));
      slab(ctx, c, 'A NAME', 540 / 1.5, 570 / 1.5, 20, rgba('ash', nA));
      const nk = prog(t, w.number.start - 0.1, w.number.end + 0.3);
      setWorld(ctx, c, 540 / 1.5, 600 / 1.5); ctx.globalAlpha = nA * nk; ctx.strokeStyle = rgba('ash', 1); ctx.lineWidth = 3 / c.z; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 60 / 1.5); ctx.moveTo(-10 / 1.5, 45 / 1.5); ctx.lineTo(0, 60 / 1.5); ctx.lineTo(10 / 1.5, 45 / 1.5); ctx.stroke();
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      stext(ctx, c, IP, 540 / 1.5, 750 / 1.5, 78, F.mono(600), rgba('signal', nA * nk));
      slab(ctx, c, 'A NUMBER: THE IP ADDRESS (AN EXAMPLE)', 540 / 1.5, 800 / 1.5, 20, rgba('ash', nA * nk));
    }
    // ---- 2 DNS
    const dA = this.span(t, 2, 3);
    stext(ctx, c, 'DNS', 540 / 1.5, 950 / 1.5 - 0, 120, SAY, rgba('signal', dA * prog(t, w.dns.start - 0.1, w.dns.end + 0.1)));
    slab(ctx, c, 'THE DOMAIN NAME SYSTEM', 540 / 1.5, 1000 / 1.5, 22, rgba('ash', dA));
    // ---- 3 the local memory
    const kA = this.span(t, 3, 4);
    if (kA > 0.003) {
      check(ctx, c, 110 / 1.5, 640 / 1.5, 'the browser: don\'t know', false, prog(t, w.browser.start, w.browser.end + 0.4), 44 / 1.5, kA);
      check(ctx, c, 110 / 1.5, 740 / 1.5, 'the operating system: no', false, prog(t, w.os.start, w.know.end + 0.2), 44 / 1.5, kA);
    }
    // ---- 5 the reply from the site's own servers
    const rA = prog(t, w.servers.end - 0.2, w.servers.end + 0.2) * (1 - prog(t, w.keeps.start, w.keeps.start + 0.3)) * mapA;
    pill(ctx, c, 600 / 1.5, 470 / 1.5, `example.com = ${IP}`, { a: rA, size: 30 / c.z });
    // ---- 6 the cache, with TTLs; the crowd
    const cA = this.span(t, 6, 8) * mapA;
    if (cA > 0.003) {
      const el = Math.max(0, Math.floor(t - w.timer.start));
      const ttl = (n: number) => (t > w.timer.start ? `TTL ${String(n - el).padStart(6)} s` : '');
      const rows = [`.com     ${ttl(172800)}`, `example  ${ttl(300)}`, `  → ${IP}`];
      card(ctx, c, 40 / 1.5, 470 / 1.5, 600, 'The resolver\'s memory', rows, prog(t, w.keeps.start, w.keeps.end + 0.6) * 3, { a: cA, size: 25, scale: 1 / c.z, lineCol: (i) => (i === 2 ? rgba('signal', 1) : rgba('bone', 0.92)) });
      const cr = prog(t, w.thousands.start - 0.1, w.thousands.end + 0.4) * cA;
      setWorld(ctx, c, 0, 0);
      CROWD.forEach((p, i) => { ctx.globalAlpha = cr * prog(t, w.thousands.start + i * 0.02, w.thousands.start + i * 0.02 + 0.3); ctx.fillStyle = rgba('ash', 0.9); ctx.beginPath(); ctx.arc(p.x, p.y, 9 / 1.5, 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      slab(ctx, c, 'THOUSANDS OF PEOPLE, ONE RESOLVER', 780 / 1.5, 1000 / 1.5, 18, rgba('ash', cr));
    }
    // ---- 7 the root, untouched
    const zA = this.span(t, 7, 8) * mapA;
    slab(ctx, c, 'ROOT SERVERS CONTACTED: 0', 540 / 1.5, 175 / 1.5, 24, rgba('signal', zA * prog(t, w.usually.start, w.already.end)), 'center', 600);
    // ---- 8 measured
    const mA = this.span(t, 8, 9) * mapA;
    if (mA > 0.003) {
      stext(ctx, c, '≈ 10 ms', 540 / 1.5, 560 / 1.5, 150, F.mono(600), rgba('signal', mA * prog(t, w.ms.start - 0.2, w.ms.end)));
      slab(ctx, c, 'MEASURED · WIKIPEDIA · FROM A CACHE', 540 / 1.5, 640 / 1.5, 22, rgba('bone', mA * prog(t, w.cache.start - 0.3, w.cache.end + 0.2)), 'center', 600);
    }
    // ---- 9 the full video
    const fA = cta * (1 - loop);
    if (fA > 0.003) {
      stext(ctx, c, 'The full trip', 540 / 1.5, 600 / 1.5, 92, SAY, rgba('bone', fA));
      stext(ctx, c, 'from Enter to page', 540 / 1.5, 700 / 1.5, 58, F.archivo(100, 500), rgba('ash', fA));
      const steps = ['DNS', 'TCP', 'TLS', 'HTTP', 'PIXELS'];
      steps.forEach((s, i) => pill(ctx, c, (190 + i * 175) / 1.5, 860 / 1.5, s, { a: fA * prog(t, this.ln(9).start + 0.3 + i * 0.15, this.ln(9).start + 0.6 + i * 0.15), size: 28 / c.z, col: i === 0 ? 'signal' : 'ash', outline: i !== 0 }));
      slab(ctx, c, 'THE LONG VIDEO · LINKED BELOW', 540 / 1.5, 1000 / 1.5, 22, rgba('signal', fA * prog(t, w.video.start - 0.4, w.video.end)), 'center', 600);
    }
  }

  /** The address bar of the first frame (and the last, so the Short loops). */
  bar(t: number, c: Cam, ctx: CanvasRenderingContext2D, a: number, q: boolean) {
    setWorld(ctx, c, BAR.x / 1.5, BAR.y / 1.5, 1 / 1.5);
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba('ink2', 1); ctx.beginPath(); ctx.roundRect(0, 0, BAR.w, BAR.h, BAR.h / 2); ctx.fill();
    ctx.strokeStyle = rgba('ash', 0.6); ctx.lineWidth = 2; ctx.stroke();
    ctx.font = font(F.mono(500), 52); ctx.fillStyle = rgba('bone', 1); ctx.fillText('example.com', 54, 70);
    const x = 60 + ctx.measureText('example.com').width;
    ctx.fillStyle = rgba('signal', 1); ctx.fillRect(x, 24, 5, 58);
    if (q) { ctx.font = font(F.mono(600), 58); ctx.fillStyle = rgba('signal', Math.floor(t * 2.2) % 2 ? 1 : 0.5); ctx.fillText('?', BAR.w - 80, 72); }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    void lerp;
  }

  override penScreen(t: number) {
    const p = this.packet(t), q = 'at' in p ? p.at : along(p.ps, p.u);
    return w2s(this.cam.at(t), q.x, q.y);
  }
  override drawFx(t: number, c: Cam, X: LineBatch) {
    const w = this.w, mapA = 1 - prog(t, this.ln(9).start - 0.2, this.ln(9).start + 0.4);
    if (mapA <= 0.003) return;
    const s0 = this.segs[0]!;
    drawRoute(X, c, UP, prog(t, s0.t0, s0.t1, ease.inOutCubic), mapA * prog(t, this.ln(4).start, this.ln(4).start + 0.4));
    const out8 = 1 - 0.9 * prog(t, this.ln(8).start - 0.2, this.ln(8).start + 0.3), gone = (1 - 0.6 * prog(t, w.usually.start, w.already.end)) * out8;
    drawRoute(X, c, TREE.root, prog(t, w.root.start - 0.2, w.root.end), mapA * gone * prog(t, w.tree.start, w.tree.end + 0.3));
    drawRoute(X, c, TREE.tld, prog(t, w.com.start - 0.2, w.com.end), mapA * gone * prog(t, w.tree.start, w.tree.end + 0.3));
    drawRoute(X, c, TREE.auth, prog(t, w.own.start - 0.1, w.servers.end), mapA * out8 * prog(t, w.tree.start, w.tree.end + 0.3));
    // the crowd's own questions
    const cr = prog(t, w.thousands.start, w.thousands.end + 0.4) * (1 - prog(t, this.ln(8).start - 0.3, this.ln(8).start)) * mapA;
    if (cr > 0.003) {
      const r = w2s(c, RES.x, RES.y);
      CROWD.forEach((p, i) => {
        const ph = (t * 0.8 + i * 0.37) % 1;
        if (ph > 0.3) return;
        const s = w2s(c, p.x, p.y), k = ph / 0.3;
        X.seg2(s[0] + (r[0] - s[0]) * Math.max(0, k - 0.35), s[1] + (r[1] - s[1]) * Math.max(0, k - 0.35), s[0] + (r[0] - s[0]) * k, s[1] + (r[1] - s[1]) * k, 2.5, LIN.ash, cr * 0.5);
      });
    }
    const p = this.packet(t);
    if (t < this.ln(4).start) return;
    if ('at' in p) restPacket(X, c, p.at, t, mapA);
    else drawPacket(X, c, p.ps, p.u, { trail: p.trail, size: 2.2, a: mapA });
  }
}
