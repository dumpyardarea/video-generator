// TRIP (the recap) — "Pressing Enter set off about a dozen systems. The browser read what you typed … DNS … TCP …
// TLS … HTTP … Then every other file came in … Most of the waiting was round trips, not servers. On my connection,
// all of that took about 0.8 seconds. The next time a page loads, you'll know where those 0.8 seconds went."
// The whole map from above, as in the hook. Each stage is retold by its route lighting and a pill with its measured
// cost; the image server's route fills with packets. On "round trips, not servers" every network pill brightens and
// the server's 15 ms stays small. Then the clock returns to zero and the camera dives back to the empty address bar
// of frame 0, so the video loops.
import type { Word } from '../../engine/lyrics';
import { ease, prog } from '../../engine/util';
import type { Cam, P } from '../../scenes/_vo';
import { EpScene, ST, ROUTES, drawStation, drawRoute, drawPacket, pill, slab, stext, emptyBar, rgba, F, LIN, type StationKey } from '../_ep';
import type { LineBatch } from '../../engine/lines';

const ALL: StationKey[] = ['laptop', 'router', 'hop1', 'resolver', 'root', 'tld', 'auth', 'hop2', 'server', 'images'];

export default class Trip extends EpScene {
  q = 'Pressing Enter set off';
  w: Record<string, Word> = {};
  li: Record<string, number> = {};

  setup() {
    const ly = this.ctx.lyrics, g = (l: string, w: string, k = 0) => this.word(l, w, k);
    const L = (q: string) => ly.get(q).i;
    this.li = { read: L('The browser read what you typed'), dns: L('DNS turned a name into an address'), tcp: L('TCP opened a connection'), tls: L('TLS made it private'),
      http: L('HTTP asked for the page'), files: L('Then every other file came in'), most: L('Most of the waiting was round trips'), all: L('all of that took about 0.8'), next: L('The next time a page loads') };
    this.w = { dozen: g('Pressing Enter set off', 'dozen'), servers: g('Most of the waiting was round trips', 'servers'), went: g('The next time a page loads', 'went') };
    const end = this.ctx.end, w = this.w;
    this.cam
      .key(this.ctx.start, 1800, -60, 0.37)
      .key(this.ctx.start + 2.5, 1800, 40, 0.37, 0, ease.inOutCubic)
      .key(w.went.start, 1820, 40, 0.38, 0, ease.linear)
      .key(end - 0.04, 0, -40, 1.12, 0, ease.inOutCubic);
    this.captions();
  }
  at(i: string) { return this.ctx.lyrics.lines[this.li[i]!]!; }
  on(t: number, i: string, d = 0.3) { const l = this.at(i); return prog(t, l.start - 0.1, l.start + d); }

  draw(t: number, c: Cam, ctx: CanvasRenderingContext2D) {
    const w = this.w, end = this.ctx.end;
    const fade = 1 - prog(t, w.went.end - 0.2, end - 0.6);
    ALL.forEach((k, i) => {
      const hot = k === 'laptop' ? this.on(t, 'read') : k === 'resolver' ? this.on(t, 'dns') * (1 - this.on(t, 'tcp')) : k === 'server' ? this.on(t, 'tcp') * (1 - this.on(t, 'files')) : k === 'images' ? this.on(t, 'files') : 0;
      drawStation(ctx, c, ST[k], prog(t, this.ctx.start + i * 0.07, this.ctx.start + i * 0.07 + 0.3) * fade, hot);
    });
    const big = this.on(t, 'most', 0.5);
    const pills: [string, string, P, number][] = [
      ['read', 'READ WHAT YOU TYPED · CHECKED THE CACHE', { x: 300, y: -330 }, 0],
      ['dns', 'DNS ≈ 10 ms', { x: (ST.router.x + ST.resolver.x) / 2, y: -620 }, 1],
      ['tcp', 'TCP ≈ 75 ms · 1 ROUND TRIP', { x: 2300, y: -350 }, 1],
      ['tls', 'TLS ≈ 80 ms · 1 ROUND TRIP', { x: 2300, y: -230 }, 1],
      ['http', 'HTTP · WAITING ≈ 90 ms', { x: 2300, y: -110 }, 1],
      ['files', 'A SECOND SERVER: EVERYTHING AGAIN', { x: ST.images.x, y: ST.images.y - 330 }, 1],
    ];
    for (const [i, s, p, net] of pills) {
      const a = this.on(t, i) * fade;
      pill(ctx, c, p.x, p.y, s, { a, size: 22 / c.z, col: net && big > 0.5 ? 'signal' : 'bone', outline: !(net && big > 0.5) });
    }
    slab(ctx, c, '✓ PROVED IT WAS REALLY ITSELF', ST.server.x, ST.server.y - 170, 17, rgba('signal', this.on(t, 'tls') * (1 - this.on(t, 'http')) * fade), 'center', 600);
    slab(ctx, c, 'THE SERVER ITSELF: ≈ 15 ms', ST.server.x, ST.server.y - 170, 17, rgba('ash', prog(t, w.servers.start - 0.1, w.servers.end + 0.3) * (1 - this.on(t, 'all')) * fade), 'center', 600);
    stext(ctx, c, 'about 0.8 seconds', 900, -1100, 64, F.archivo(100, 800), rgba('bone', this.on(t, 'all', 0.5) * fade));
    // back to frame 0
    emptyBar(ctx, c, prog(t, end - 1.0, end - 0.25));
  }

  override drawFx(t: number, c: Cam, X: LineBatch) {
    const fade = 1 - prog(t, this.w.went.end - 0.2, this.ctx.end - 0.6), big = this.on(t, 'most', 0.5);
    const r = (ps: P[], k: number) => drawRoute(X, c, ps, k, fade * (0.6 + 0.4 * big));
    r(ROUTES.toResolver, prog(t, this.at('dns').start, this.at('dns').start + 1.2));
    r(ROUTES.toRoot, 0); r(ROUTES.toTld, 0); r(ROUTES.toAuth, 0);
    r(ROUTES.toServer, prog(t, this.at('tcp').start, this.at('tcp').start + 1.2));
    r(ROUTES.toImages, prog(t, this.at('files').start, this.at('files').start + 1.2));
    // one packet retelling the trip, then the file traffic
    const legs: [P[], string, number][] = [[ROUTES.toResolver, 'dns', 1.4], [ROUTES.toServer, 'tcp', 1.6], [ROUTES.toServer, 'tls', 1.6], [ROUTES.toServer, 'http', 1.6]];
    for (const [ps, i, d] of legs) { const u = prog(t, this.at(i).start, this.at(i).start + d, ease.inOutCubic); if (u > 0 && u < 1) drawPacket(X, c, ps, u, { trail: 0.1, size: 2.2, a: fade }); }
    for (let j = 0; j < 10; j++) {
      const t0 = this.at('files').start + j * 0.4, u = prog(t, t0, t0 + 1.8, ease.inOutQuad);
      if (u > 0 && u < 1) drawPacket(X, c, j % 3 === 2 ? ROUTES.toImages : ROUTES.toServer, u, { trail: 0.04, size: 1.6, a: fade, col: j % 2 ? LIN.signal : LIN.ash });
    }
  }
}
