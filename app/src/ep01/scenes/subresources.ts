// SUBRESOURCES (chapter 7, "Everything else on the page") — "The HTML is only the start. It points to other files:
// stylesheets, scripts, images, fonts. The browser starts fetching them while it's still reading … Files from the same
// server reuse the connection … But files from another server repeat everything: DNS, TCP, TLS. And most pages load
// from several servers: images, fonts, analytics, video."
// The camera rises from the ladder back to the map. The HTML arrives as a card at the laptop; a scan line reads it
// and each file it names launches as it is read. Same-server files stream down the one open connection (no new
// lookups, no new handshakes); the image server's route pays again, its three steps ticking off as pills. Then the
// map fills with more servers: fonts, analytics, video, each with its own route.
import type { Word } from '../../engine/lyrics';
import { ease, prog } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, arc, drawStation, drawRoute, drawPacket, card, pill, slab, rgba, pt, LIN, type Station } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const HTML = ['<!DOCTYPE html> …', '<link rel="stylesheet" href="…css">', '<script src="…js">', '<img src="//upload.wikimedia.org/…">', '<link rel="preload" as="font" …>'];
const st = (x: number, y: number, name: string, sub: string): Station => ({ x, y, name, sub, r: 40 });
const MORE: [Station, string][] = [[st(1700, 980, 'a font server', 'fonts'), 'fonts'], [st(500, 760, 'analytics', 'a third party'), 'analytics'], [st(2500, -380, 'a video server', 'video'), 'video']];
const MORE_R: P[][] = MORE.map(([s]) => [...arc(ST.laptop, ST.router, 0.1), ...arc(ST.router, s, -0.1).slice(1)]);
const CY = 640;

export default class Subresources extends EpScene {
  q = 'The HTML is only the start';
  w: Record<string, Word> = {};
  li: Record<string, number> = {};
  /** [route, launch time, colour] for each file fetched. */
  sends: [P[], number, [number, number, number]][] = [];

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    this.w = {
      start: g('The HTML is only the start', 'start'),
      styles: g('It points to other files', 'stylesheets'), scripts: g('It points to other files', 'scripts'), images: g('It points to other files', 'images'), fonts: g('It points to other files', 'fonts'),
      reading: g('The browser starts fetching them', 'reading'), moment: g('The browser starts fetching them', 'moment'),
      same: g('Files from the same server reuse', 'same'), reuse: g('Files from the same server reuse', 'reuse'), handshakes: g('Files from the same server reuse', 'handshakes'),
      another: g('But files from another server', 'another'), dns: g('But files from another server', 'dns'), tcp: g('But files from another server', 'tcp'), tls: g('But files from another server', 'tls'),
      several: g('most pages load from several servers', 'several'), mImages: g('most pages load from several servers', 'images'),
      mFonts: g('most pages load from several servers', 'fonts'), mAnalytics: g('most pages load from several servers', 'analytics'), mVideo: g('most pages load from several servers', 'video'),
    };
    this.li = { l91: ly.get('The HTML is only the start').i, l94: ly.get('Files from the same server reuse').i, l95: ly.get('But files from another server').i, l96: ly.get('most pages load from several servers').i };
    const w = this.w;
    const SIG = LIN.signal, ASH: [number, number, number] = [LIN.ash[0], LIN.ash[1], LIN.ash[2]];
    // the files, launched as the scan line reads their tags
    this.sends = [
      [ROUTES.toServer, w.styles.start, SIG], [ROUTES.toServer, w.scripts.start, SIG], [ROUTES.toServer, w.fonts.start, SIG],
      [ROUTES.toServer, w.reading.start, SIG], [ROUTES.toServer, w.moment.start, SIG],
    ];
    // the same connection, busy
    for (let i = 0; i < 14; i++) this.sends.push([ROUTES.toServer, w.same.start + i * 0.42, i % 3 ? SIG : ASH]);
    // the images, once their own handshakes are done
    for (let i = 0; i < 6; i++) this.sends.push([ROUTES.toImages, w.tls.end + 0.3 + i * 0.35, SIG]);
    const end = this.ctx.end;
    this.cam
      .key(this.ctx.start, 1750, 2792, 0.42)
      .key(this.ctx.start + 1.6, 1750, CY, 0.42, 0, ease.inOutCubic)
      .key(w.several.start, 1750, CY + 20, 0.42, 0, ease.linear)
      .key(end - 0.05, 1650, CY + 60, 0.4, 0, ease.inOutCubic);
    this.captions();
  }

  /** World point for a screen position. */
  S(c: Cam, x: number, y: number): P { return pt(c.cx + (x - 960) / c.z, c.cy + (y - 540) / c.z); }
  /** Each other server's own lookup and handshakes: 0..3 pills done. */
  repeat(t: number) { const w = this.w; return [w.dns, w.tcp, w.tls].map((x) => prog(t, x.start - 0.05, x.end + 0.2)); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, ly = this.ctx.lyrics.lines, l94 = ly[this.li.l94]!, l95 = ly[this.li.l95]!;
    const mapA = prog(t, this.ctx.start + 0.6, this.ctx.start + 1.6);
    for (const k of ['laptop', 'router', 'hop1', 'hop2', 'server'] as const) drawStation(ctx, c, ST[k], mapA, k === 'server' ? 0.3 + 0.7 * prog(t, w.same.start, w.reuse.end) * (1 - prog(t, l95.start, l95.start + 0.4)) : k === 'laptop' ? 0.4 : 0);
    const imA = prog(t, w.images.start - 0.1, w.images.end + 0.3);
    drawStation(ctx, c, ST.images, imA, prog(t, w.another.start, w.another.end + 0.3));
    // ---- the HTML, read top to bottom
    const ha = prog(t, w.start.start - 0.4, w.start.end) * (1 - prog(t, l94.start - 0.3, l94.start + 0.2));
    if (ha > 0.003) {
      const p = this.S(c, 380, 520), sc = 1 / c.z;
      const said = [w.start, w.styles, w.scripts, w.images, w.fonts];
      const row = said.reduce((n, x, i) => (t >= x.start - 0.05 ? i : n), 0);
      card(ctx, c, p.x, p.y, 640, 'The HTML (first bytes)', HTML, 5, {
        a: ha, size: 22, scale: sc, hot: prog(t, w.reading.start, w.moment.end) * 0.6,
        lineCol: (i) => (i === row && t >= w.styles.start - 0.05 ? rgba('signal', 1) : i < row || i === 0 ? rgba('bone', 0.9) : rgba('ash', 0.6)),
      });
      slab(ctx, c, 'READ AS IT ARRIVES; EACH FILE FETCHED THE MOMENT IT IS SEEN', p.x, p.y + 290 / c.z, 13, rgba('ash', ha * prog(t, w.reading.start, w.moment.end)), 'left');
    }
    // ---- same server: the one connection, reused
    const ra = prog(t, w.same.start - 0.1, w.reuse.end + 0.2) * (1 - prog(t, l95.start - 0.2, l95.start + 0.3));
    pill(ctx, c, (ST.hop1.x + ST.hop2.x) / 2, (ST.hop1.y + ST.hop2.y) / 2 - 170, 'SAME SERVER · SAME CONNECTION', { a: ra, size: 22 / c.z });
    slab(ctx, c, 'NO NEW DNS · NO NEW HANDSHAKES', (ST.hop1.x + ST.hop2.x) / 2, (ST.hop1.y + ST.hop2.y) / 2 - 90, 16, rgba('bone', ra * prog(t, w.reuse.end, w.handshakes.end + 0.3)), 'center', 600);
    // ---- another server: everything again
    const steps = this.repeat(t), sa = prog(t, w.another.start - 0.1, w.another.end + 0.3) * (1 - prog(t, ly[this.li.l96]!.start + 1.5, ly[this.li.l96]!.start + 2.2));
    ['DNS', 'TCP', 'TLS'].forEach((s, i) => pill(ctx, c, ST.images.x + 300, ST.images.y - 330 + i * 85, `${s}, AGAIN`, { a: sa * steps[i]!, size: 20 / c.z, col: 'ash', outline: true }));
    slab(ctx, c, 'A SECOND SERVER PAYS FOR EVERYTHING', ST.images.x + 300, ST.images.y - 420, 15, rgba('signal', sa), 'center', 600);
    // ---- and more servers
    const said = [w.mFonts, w.mAnalytics, w.mVideo];
    MORE.forEach(([s], i) => drawStation(ctx, c, s, prog(t, said[i]!.start - 0.1, said[i]!.end + 0.3), 0.3));
  }

  override drawFx(t: number, c: Cam, X: LineBatch) {
    const w = this.w, mapA = prog(t, this.ctx.start + 0.6, this.ctx.start + 1.6);
    const ly = this.ctx.lyrics.lines, l94 = ly[this.li.l94]!, l95 = ly[this.li.l95]!;
    const busy = prog(t, l94.start, l94.start + 0.4) * (1 - prog(t, l95.start, l95.start + 0.5));
    drawRoute(X, c, ROUTES.toServer, 1, mapA * (0.8 + 0.4 * busy), 0.3);
    drawRoute(X, c, ROUTES.toImages, prog(t, w.another.start, w.tls.end + 0.3), prog(t, w.images.start - 0.1, w.images.end + 0.3) * 0.9);
    const said = [w.mFonts, w.mAnalytics, w.mVideo];
    MORE_R.forEach((r, i) => drawRoute(X, c, r, prog(t, said[i]!.start, said[i]!.end + 0.6), prog(t, said[i]!.start - 0.1, said[i]!.end + 0.3) * 0.8));
    for (const [r, t0, col] of this.sends) {
      const u = prog(t, t0, t0 + 1.6, ease.inOutQuad);
      if (u > 0 && u < 1) drawPacket(X, c, r, u, { trail: 0.04, size: 1.1, col });
    }
    // the second server's own handshake: a packet shuttling while the pills tick
    const hs = prog(t, w.dns.start - 0.1, w.tls.end + 0.2);
    if (hs > 0 && hs < 1) { const k = (hs * 3) % 1; drawPacket(X, c, ROUTES.toImages, Math.floor(hs * 6) % 2 ? 1 - k : k, { trail: 0.15, size: 1.4 }); }
    // the other servers, busy too
    MORE_R.forEach((r, i) => { for (let j = 0; j < 3; j++) { const t0 = said[i]!.end + 0.3 + j * 0.5, u = prog(t, t0, t0 + 1.4, ease.inOutQuad); if (u > 0 && u < 1) drawPacket(X, c, r, u, { trail: 0.04, size: 1, col: LIN.ash }); } });
  }
}
