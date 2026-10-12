// EP01 toolkit: the journey map (channel/episodes/01-press-enter/outline.md, style-registry.md).
//  - contourPass(): the ground, a dark map with faint topographic contour lines, in world px under a Cam2D.
//  - ST / ROUTES: one world map shared by every plate (stations at fixed places), so "follow the packet"
//    hand-offs are real camera moves across the same map.
//  - drawStation(), drawRoute(), drawPacket(): the stations, the routes drawn as first travelled, the glowing packet.
//  - Clock: the millisecond clock, keyed to the narration (each stage adds its measured cost as it is said).
//  - EpScene: the plate base (map ground, world karaoke via say()/sayLine(), the clock, a LineBatch for glows).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import type { Line, Lyrics, Word } from '../engine/lyrics';
import { LIN, rgba } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import { clamp, ease, lerp, prog, TAU } from '../engine/util';
import { Cam2D, setGrid, setWorld, placeRow, rowWidth, drawKaraoke, wordOf, w2s, label, type Cam, type KWord, type P } from '../scenes/_vo';

export const SAY = F.archivo(100, 800);
export const SAY_LIGHT = F.archivo(100, 500);
export const MONO = F.mono(500);

// ================================================================== the ground
export function contourPass() {
  return new FSPass(/* glsl */ `
    uniform vec4 uCam; uniform vec2 uRes; uniform vec3 uReveal;
    uniform float uFade, uMinor, uMajor, uInk, uPaper; uniform vec3 uPen;
    void main() {
      vec2 sp = vec2(vUv.x, 1.0 - vUv.y) * uRes;
      vec2 d = sp - 0.5 * uRes;
      float c = cos(-uCam.w), s = sin(-uCam.w);
      d = vec2(c * d.x - s * d.y, s * d.x + c * d.y) / uCam.z;
      vec2 p = uCam.xy + d;
      // terrain height from two octaves of noise; contour lines every 1/9 of a unit
      float h = snoise(p * 0.00055) * 0.7 + snoise(p * 0.0014 + 3.1) * 0.3;
      float k = h * 9.0;
      // distance to the nearest contour, in units of k; a line ~1.2 screen px wide
      float fw = fwidth(k);
      float dist = abs(fract(k + 0.5) - 0.5);
      float line = 1.0 - smoothstep(0.0, fw * 1.2, dist);
      float idx = floor(k);
      float major = 1.0 - step(0.5, abs(mod(idx, 4.0))); // every 4th line a little stronger
      vec3 base = mix(C_INK, C_BONE * 0.95, uPaper);
      vec3 ink = mix(C_ASH, C_INK, uPaper);
      vec3 col = base + (ink - base) * line * (0.16 + 0.12 * major) * uInk;
      // a faint glow of the packet over the terrain
      float pd = length(sp - uPen.xy);
      col += C_SIGNAL * 0.025 * uPen.z * exp(-pd * pd / (2.0 * 180.0 * 180.0)) * (1.0 - uPaper);
      col *= 1.0 - uFade;
      fragColor = vec4(col, 1.0);
    }`, {
    uCam: { value: new THREE.Vector4(W / 2, H / 2, 1, 0) }, uRes: { value: new THREE.Vector2(W, H) },
    uReveal: { value: new THREE.Vector3(0, 0, 1e5) }, uFade: { value: 0 }, uMinor: { value: 24 }, uMajor: { value: 96 },
    uInk: { value: 1 }, uPaper: { value: 0 }, uPen: { value: new THREE.Vector3(0, 0, 0) },
  });
}

// ================================================================== the map
export interface Station { x: number; y: number; name: string; sub: string; r: number }
const st = (x: number, y: number, name: string, sub: string, r = 46): Station => ({ x, y, name, sub, r });
/** Every place the request goes, on one world map. */
export const ST = {
  laptop: st(0, 0, 'your laptop', 'the browser', 58),
  router: st(620, -190, 'home router', '192.168.1.1', 38),
  resolver: st(1450, -560, 'DNS resolver', 'your provider', 46),
  root: st(2350, -1250, 'root server', '13 named, 1,000+ machines', 42),
  tld: st(3050, -760, '.com servers', 'top-level domain', 42),
  auth: st(3650, -1180, 'authoritative', "example.com's DNS", 42),
  hop1: st(1350, 260, '', 'router', 16),
  hop2: st(2300, 420, '', 'router', 16),
  server: st(3500, 260, 'example.com', 'the web server', 60),
  images: st(3000, 1050, 'upload.wikimedia.org', 'a second server: the images', 50),
};
export type StationKey = keyof typeof ST;
const pt = (x: number, y: number): P => ({ x, y });
/** A gentle curve between two stations (a quadratic through a bowed midpoint), as points. */
export function arc(a: P, b: P, bow = 0.12, n = 40): P[] {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  const cx = mx - dy * bow, cy = my + dx * bow;
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    out.push(pt(v * v * a.x + 2 * v * u * cx + u * u * b.x, v * v * a.y + 2 * v * u * cy + u * u * b.y));
  }
  return out;
}
/** A route through several stations. */
export function route(keys: StationKey[], bow = 0.1): P[] {
  const out: P[] = [];
  for (let i = 1; i < keys.length; i++) {
    const seg = arc(ST[keys[i - 1]!], ST[keys[i]!], i % 2 ? bow : -bow);
    out.push(...(i > 1 ? seg.slice(1) : seg));
  }
  return out;
}
export const ROUTES = {
  toResolver: route(['laptop', 'router', 'resolver']),
  toRoot: route(['resolver', 'root'], 0.08),
  toTld: route(['resolver', 'tld'], -0.08),
  toAuth: route(['resolver', 'auth'], 0.1),
  toServer: route(['laptop', 'router', 'hop1', 'hop2', 'server'], 0.06),
  toImages: route(['laptop', 'router', 'hop1', 'images'], 0.08),
};

function lengthsOf(ps: P[]) { const L = [0]; for (let i = 1; i < ps.length; i++) L.push(L[i - 1]! + Math.hypot(ps[i]!.x - ps[i - 1]!.x, ps[i]!.y - ps[i - 1]!.y)); return L; }
/** Point at fraction u (0..1) along a route. */
export function along(ps: P[], u: number): P {
  const L = lengthsOf(ps), s = clamp(u) * L[L.length - 1]!;
  let i = 1;
  while (i < ps.length - 1 && L[i]! < s) i++;
  const a = ps[i - 1]!, b = ps[i]!, k = (s - L[i - 1]!) / Math.max(1e-6, L[i]! - L[i - 1]!);
  return pt(lerp(a.x, b.x, k), lerp(a.y, b.y, k));
}

/** A station: ring, core, name and a mono sub-label. hot 0..1 lights it in the packet's green. */
export function drawStation(c: CanvasRenderingContext2D, cam: Cam, s: Station, a = 1, hot = 0, o: { name?: string; sub?: string; below?: boolean } = {}) {
  if (a <= 0.003) return;
  setWorld(c, cam, s.x, s.y);
  c.save();
  c.globalAlpha = a;
  c.fillStyle = rgba('ink2', 1); c.beginPath(); c.arc(0, 0, s.r, 0, TAU); c.fill();
  c.strokeStyle = hot > 0 ? rgba('signal', 0.4 + 0.6 * hot) : rgba('ash', 0.7); c.lineWidth = (1.6 + 2 * hot) / cam.z;
  c.stroke();
  c.fillStyle = hot > 0 ? rgba('signal', 0.3 + 0.7 * hot) : rgba('graphite', 1);
  c.beginPath(); c.arc(0, 0, s.r * 0.28, 0, TAU); c.fill();
  const name = o.name ?? s.name, sub = o.sub ?? s.sub;
  // labels keep a readable size on screen at any zoom (≈ 26 px names, 13 px sub-labels)
  const k = Math.max(1, 1 / cam.z), ny = o.below === false ? -s.r - 40 * k : s.r + 40 * k;
  if (name) { c.font = font(SAY, 26 * k); c.fillStyle = rgba('bone', 0.95); c.textAlign = 'center'; c.fillText(name, 0, ny); }
  if (sub) label(c, sub.toUpperCase(), 0, ny + (name ? 26 * k : 0), { size: 13 * k, col: rgba('ash', 0.9), align: 'center' });
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
}

/** A route: faint where untravelled, drawn solid up to fraction `k`. Into the additive batch (screen px). */
export function drawRoute(X: LineBatch, cam: Cam, ps: P[], k = 1, a = 1, faint = 0.18) {
  if (a <= 0.003) return;
  let prev = w2s(cam, ps[0]!.x, ps[0]!.y);
  const L = lengthsOf(ps), tot = L[L.length - 1]!;
  for (let i = 1; i < ps.length; i++) {
    const p = w2s(cam, ps[i]!.x, ps[i]!.y);
    const on = L[i]! / tot <= k;
    X.seg2(prev[0], prev[1], p[0], p[1], on ? 2.2 : 1.4, on ? [LIN.ash[0] * 0.9, LIN.ash[1] * 0.9, LIN.ash[2] * 0.9] : LIN.graphite, (on ? 0.85 : faint) * a);
    prev = p;
  }
}

/** The packet at fraction u along a route: a hot core and a trail (longer when time slows). */
export function drawPacket(X: LineBatch, cam: Cam, ps: P[], u: number, o: { trail?: number; size?: number; col?: [number, number, number]; a?: number } = {}) {
  const a = o.a ?? 1;
  if (u <= 0 || u >= 1 || a <= 0.003) return;
  const trail = o.trail ?? 0.06, col = o.col ?? LIN.signal, sz = o.size ?? 1;
  const n = 14;
  let prev: [number, number] | null = null;
  for (let i = n; i >= 0; i--) {
    const q = along(ps, u - (trail * i) / n);
    const s = w2s(cam, q.x, q.y);
    if (prev) { const k = 1 - i / n; X.seg2(prev[0], prev[1], s[0], s[1], (2 + 7 * k) * sz, [col[0] * 2.5 * k, col[1] * 2.5 * k, col[2] * 2.5 * k], k * a); }
    prev = s;
  }
  const h = along(ps, u), hs = w2s(cam, h.x, h.y);
  X.seg2(hs[0] - 0.5, hs[1], hs[0] + 0.5, hs[1], 18 * sz, [LIN.ember[0] * 3, LIN.ember[1] * 3, LIN.ember[2] * 3], a);
}

// ================================================================== cards and pills
/**
 * A card at world (x, y): a title bar and mono lines, revealed line by line (`k` lines shown, fractional = typing).
 * Used for packets, headers, certificates, caches. Returns its height.
 */
export function card(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, w: number, title: string, lines: string[], k: number, o: { a?: number; hot?: number; size?: number; titleCol?: string; lineCol?: (i: number) => string; scale?: number } = {}) {
  const a = o.a ?? 1, sz = o.size ?? 26, lh = sz * 1.5, h = 64 + Math.max(1, lines.length) * lh + 20;
  if (a <= 0.003) return h * (o.scale ?? 1);
  setWorld(c, cam, x, y, o.scale ?? 1);
  c.save();
  c.globalAlpha = a;
  c.fillStyle = rgba('ink2', 0.97); c.beginPath(); c.roundRect(0, 0, w, h, 16); c.fill();
  c.strokeStyle = o.hot ? rgba('signal', 0.4 + 0.6 * o.hot) : rgba('graphite', 1); c.lineWidth = (1.4 + 2 * (o.hot ?? 0)) / cam.z; c.stroke();
  label(c, title.toUpperCase(), 24, 40, { size: 17, col: o.titleCol ?? rgba('ash', 1), weight: 600 });
  c.fillStyle = rgba('graphite', 0.7); c.fillRect(0, 56, w, 1.2 / cam.z);
  c.font = font(F.mono(500), sz);
  lines.forEach((ln, i) => {
    const vis = clamp(k - i);
    if (vis <= 0) return;
    const n = Math.ceil(ln.length * vis);
    c.fillStyle = o.lineCol ? o.lineCol(i) : rgba('bone', 0.92);
    c.fillText(ln.slice(0, n), 24, 64 + (i + 0.8) * lh);
  });
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
  return h * (o.scale ?? 1);
}
/** A pill label centred at world (x, y). */
export function pill(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, text: string, o: { a?: number; col?: string; fg?: string; size?: number; outline?: boolean } = {}) {
  const a = o.a ?? 1;
  if (a <= 0.003) return;
  const sz = o.size ?? 24, fam = F.mono(600), tw = measure(text, fam, sz) + sz * 1.4, h = sz * 1.7;
  setWorld(c, cam, x - tw / 2, y - h / 2);
  c.save();
  c.globalAlpha = a;
  c.beginPath(); c.roundRect(0, 0, tw, h, h / 2);
  if (o.outline) { c.strokeStyle = rgba(o.col ?? 'signal', 1); c.lineWidth = 2 / cam.z; c.stroke(); }
  else { c.fillStyle = rgba(o.col ?? 'signal', 1); c.fill(); }
  c.font = font(fam, sz); c.fillStyle = rgba(o.fg ?? (o.outline ? (o.col ?? 'signal') : 'ink'), 1); c.textBaseline = 'middle';
  c.fillText(text, sz * 0.7, h / 2 + 1);
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
}
/** A check row: "✓ name" (or ✗), revealed by k. */
export function check(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, text: string, ok: boolean, k: number, size = 30, a = 1) {
  if (k <= 0.003) return;
  setWorld(c, cam, x, y);
  c.save();
  c.globalAlpha = clamp(k * 2) * a;
  const col = ok ? 'signal' : 'acid';
  c.strokeStyle = rgba(col, 1); c.lineWidth = 4 / cam.z; c.lineCap = 'round';
  c.beginPath(); c.arc(size * 0.5, -size * 0.35, size * 0.55, 0, TAU); c.stroke();
  c.beginPath();
  if (ok) { c.moveTo(size * 0.25, -size * 0.35); c.lineTo(size * 0.45, -size * 0.15); c.lineTo(size * 0.78, -size * 0.6); }
  else { c.moveTo(size * 0.3, -size * 0.55); c.lineTo(size * 0.7, -size * 0.15); c.moveTo(size * 0.7, -size * 0.55); c.lineTo(size * 0.3, -size * 0.15); }
  c.stroke();
  c.font = font(SAY_LIGHT, size); c.fillStyle = rgba('bone', 0.95);
  c.fillText(text.slice(0, Math.ceil(text.length * clamp(k * 1.5 - 0.3))), size * 1.4, 0);
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
}

/** A mono label at world (x, y) that keeps a constant size on screen. */
export function slab(c: CanvasRenderingContext2D, cam: Cam, text: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center', weight = 500) {
  setWorld(c, cam, 0, 0);
  label(c, text, x, y, { size: size / cam.z, col, align, spacing: 3 / cam.z, weight });
  c.setTransform(1, 0, 0, 1, 0, 0);
}
/** Text in any family at world (x, y), constant size on screen. */
export function stext(c: CanvasRenderingContext2D, cam: Cam, text: string, x: number, y: number, size: number, fam: string, col: string, align: CanvasTextAlign = 'center') {
  setWorld(c, cam, 0, 0);
  c.font = font(fam, size / cam.z); c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.fillText(text, x, y);
  c.textAlign = 'left';
  c.setTransform(1, 0, 0, 1, 0, 0);
}
/** A glowing resting packet at world p. */
export function restPacket(X: LineBatch, cam: Cam, p: P, t: number, a = 1) {
  const s = w2s(cam, p.x, p.y), br = 1 + 0.15 * Math.sin(t * 5);
  X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 18 * br, [LIN.ember[0] * 3, LIN.ember[1] * 3, LIN.ember[2] * 3], a);
  X.seg2(s[0] - 0.5, s[1], s[0] + 0.5, s[1], 44, [LIN.signal[0] * 0.6, LIN.signal[1] * 0.6, LIN.signal[2] * 0.6], 0.6 * a);
}

// ================================================================== the handshake ladder
/** Two lanes hanging below the laptop and the server (TCP and TLS draw their handshakes on it). */
/** The address bar of the first frame (enter.ts draws it; trip.ts returns to it so the video loops). */
export const BAR = { x: -775, y: -300, w: 1300, h: 92 };
/** The empty address bar with its blinking caret, as at frame 0. */
export function emptyBar(c: CanvasRenderingContext2D, cam: Cam, a = 1) {
  if (a <= 0.003) return;
  setWorld(c, cam, BAR.x, BAR.y);
  c.globalAlpha = a;
  c.fillStyle = rgba('ink2', 1); c.beginPath(); c.roundRect(0, 0, BAR.w, BAR.h, 46); c.fill();
  c.strokeStyle = rgba('ash', 0.6); c.lineWidth = 1.5 / cam.z; c.stroke();
  // the caret is solid until typing starts (as in enter.ts)
  c.fillStyle = rgba('signal', 1); c.fillRect(52, 22, 4, 50);
  c.globalAlpha = 1;
  c.setTransform(1, 0, 0, 1, 0, 0);
}

export const LADDER = { lx: 0, rx: 3500, top: 300, ltop: 250, rtop: 500 };
/**
 * Y of each message on the ladder: [depart, arrive]. TCP: SYN, SYN-ACK, ACK (0..2). TLS 1.3: the client's hello
 * leaves right behind the ACK (3), the server's hello comes back (4); then the request (5) and the response (6).
 */
const RUNGS: [number, number][] = [[420, 720], [720, 1020], [1020, 1320], [1060, 1360], [1360, 1660], [1720, 2020], [2020, 2320]];
export const RUNG = (i: number): [number, number] => RUNGS[i]!;

// ================================================================== the clock
/**
 * The millisecond clock: since Enter was pressed. Each key is a word of the script at which the clock moves
 * to a value (the stage's measured cost, from demo/README.md), with `slow` meaning time is slowed (a handshake).
 */
export interface ClockKey { line: string; word: string; nth?: number; ms: number; slow?: boolean; label?: string; over?: number }
export const CLOCK: ClockKey[] = [
  { line: 'You type a web address', word: 'enter', ms: 0, label: 'Enter' },
  { line: 'A page appears', word: 'appears', ms: 786, over: 0.9 },
  { line: 'So freeze the clock', word: 'freeze', ms: 0, over: 0.35, label: 'frozen at Enter' },
  { line: 'In my measurement, the whole DNS step', word: 'milliseconds', ms: 10, slow: true, label: 'DNS +10 ms' },
  { line: 'one round trip to Wikipedia', word: 'milliseconds', ms: 85, slow: true, label: 'TCP +75 ms' },
  { line: 'That handshake took about 80', word: 'milliseconds', ms: 165, slow: true, label: 'TLS +80 ms' },
  { line: 'Then about 90 milliseconds of waiting', word: 'waiting', ms: 255, slow: true, label: 'waiting +90 ms' },
  { line: 'The first byte arrived', word: 'second', ms: 266, label: 'first byte' },
  { line: 'The page appeared at about 0.7', word: 'appeared', ms: 716, label: 'first paint' },
  { line: 'The page appeared at about 0.7', word: 'loading', ms: 786, label: 'loaded' },
  // the end loops to the first frame, where the clock reads zero
  { line: 'The next time a page loads', word: 'went', ms: 0, over: 0.6 },
];
export class Clock {
  keys: { t: number; ms: number; slow: boolean; label: string; over: number }[] = [];
  constructor(ly: Lyrics) {
    for (const k of CLOCK) {
      const l = ly.find(k.line)[0];
      if (!l) continue;
      const w = l.words.find((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, '') === k.word.toLowerCase());
      if (w) this.keys.push({ t: w.start, ms: k.ms, slow: !!k.slow, label: k.label ?? '', over: k.over ?? (k.slow ? 1.2 : 0.6) });
    }
    this.keys.sort((a, b) => a.t - b.t);
  }
  /** ms since Enter at video time t, whether time is slowed, and the stages passed so far. */
  at(t: number) {
    let ms = 0, slow = 0;
    const log: string[] = [];
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[i]!;
      if (t < k.t) break;
      const prev = ms;
      const u = prog(t, k.t, k.t + k.over, ease.inOutCubic);
      ms = lerp(prev, k.ms, u);
      if (k.slow) slow = Math.max(slow, 1 - prog(t, k.t + k.over, k.t + k.over + 0.4));
      if (k.label && k.ms > 0 && k.label !== 'Enter') log.push(k.label);
      if (k.ms === 0) log.length = 0;
    }
    return { ms, slow, log };
  }
}
/** The clock, top right in screen space. */
export function drawClock(c: CanvasRenderingContext2D, clock: Clock, t: number, a = 1) {
  if (a <= 0.003) return;
  const { ms, slow, log } = clock.at(t);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = a;
  const x = W - 64, y = 92;
  label(c, 'SINCE ENTER', x, y - 46, { size: 13, col: rgba('ash', 0.9), align: 'right' });
  const s = `${(ms / 1000).toFixed(3)} s`;
  c.font = font(F.mono(600), 52); c.textAlign = 'right';
  c.fillStyle = slow > 0.05 ? rgba('signal', 1) : rgba('bone', 0.95);
  c.fillText(s, x, y);
  if (slow > 0.05) label(c, 'TIME SLOWED', x, y + 30, { size: 12, col: rgba('signal', slow) , align: 'right' });
  log.slice(-5).forEach((l, i) => label(c, l.toUpperCase(), x, y + 62 + i * 22, { size: 13, col: rgba('ash', 0.85), align: 'right' }));
  c.restore();
}

// ================================================================== the plate base
const SCREEN: Cam = { cx: W / 2, cy: H / 2, z: 1, roll: 0 };
export abstract class EpScene extends Scene {
  cam = new Cam2D();
  grid = contourPass();
  ui = new Layer2D();
  fx = new LineBatch(30000);
  kw: KWord[] = [];
  /** Caption words, set in screen space (they stay put while the camera travels). */
  cw: KWord[] = [];
  /** Each screen caption's vertical extent (for its scrim). */
  cwBand = new Map<string, [number, number]>();
  clock!: Clock;
  /** A phrase of this plate's first line. */
  abstract q: string;
  L!: Line;
  /** The plate's lines (from the first, up to the line before the next plate's). */
  lines: Line[] = [];
  showClock = true;

  override init() {
    const ly = this.ctx.lyrics;
    this.L = ly.get(this.q);
    this.lines = ly.lines.filter((l) => l.start >= this.ctx.start - 0.5 && l.start < this.ctx.end - 0.05);
    this.clock = new Clock(ly);
    this.setup();
  }
  abstract setup(): void;
  abstract draw(t: number, c: Cam, ctx: CanvasRenderingContext2D, f: Frame): void;
  drawFx(_t: number, _c: Cam, _X: LineBatch): void {}
  drawTop(_t: number, _c: Cam, _ctx: CanvasRenderingContext2D): void {}
  post(_t: number): PostOverrides { return {}; }
  /** Screen position of the packet (for the ground's glow), or null. */
  penScreen(_t: number): [number, number] | null { return null; }
  /** Opacity of a karaoke group. Groups named "line:<i>" (sayLine) show from just before their line until the next one starts. */
  kAlpha(g: string, t: number) {
    if (g.startsWith('line:')) {
      const i = +g.slice(5), l = this.ctx.lyrics.lines[i]!, nx = this.ctx.lyrics.lines[i + 1];
      const hold = (this as any).hold?.[i] ?? 0;
      const end = nx ? nx.start + hold : this.ctx.end;
      return prog(t, l.start - 0.35, l.start - 0.1) * (1 - prog(t, end - 0.25, end - 0.05));
    }
    return 1;
  }
  /** A word of a line of this plate by content. */
  word(lineQuery: string, w: string, nth = 0): Word { return wordOf(this.ctx.lyrics.get(lineQuery), w, nth); }
  /** Words of the script set in the world, left-aligned (or centred) from baseline y, wrapping at maxW. */
  say(words: Word[], x: number, y: number, size: number, group: string, o: { maxW?: number; fam?: string; lead?: number; align?: 'left' | 'center' | 'right'; done?: string; hot?: string; into?: KWord[] } = {}) {
    const fam = o.fam ?? SAY, maxW = o.maxW ?? 1e9, lh = size * (o.lead ?? 1.12);
    const rows: Word[][] = [[]];
    for (const w of words) {
      const row = rows[rows.length - 1]!;
      if (row.length && rowWidth([...row, w].map((v) => v.w), size, fam) > maxW) rows.push([w]);
      else row.push(w);
    }
    if (o.into === this.cw) this.cwBand.set(group, [y - size * 1.05, y + (rows.length - 1) * lh + size * 0.35]);
    rows.forEach((r, i) => {
      const wd = rowWidth(r.map((v) => v.w), size, fam);
      const x0 = o.align === 'center' ? x - wd / 2 : o.align === 'right' ? x - wd : x;
      (o.into ?? this.kw).push(...placeRow(r, x0, y + i * lh, size, fam, group, { ant: 0.3, hot: o.hot, done: o.done }).words);
    });
    return rows.length * lh;
  }
  /** Every line of the plate (except `skip`) as a screen-space caption, low in the frame. */
  captions(skip: number[] = [], y = 930, size = 46) {
    for (const l of this.lines) if (!skip.includes(l.i) && !this.cwBand.has(`line:${l.i}`)) this.say(l.words, 80, y, size, `line:${l.i}`, { maxW: 1760, into: this.cw });
  }
  /**
   * One line as a screen-space caption (it stays put while the camera moves). By default low on the left;
   * a plate can set it beside what the line is about (x is the left, centre or right edge per `align`).
   */
  captionLine(q: string, o: { x?: number; y?: number; size?: number; align?: 'left' | 'center' | 'right'; maxW?: number } = {}) {
    const l = this.ctx.lyrics.get(q), align = o.align ?? 'left';
    const x = o.x ?? (align === 'right' ? W - 80 : align === 'center' ? W / 2 : 80);
    this.say(l.words, x, o.y ?? 930, o.size ?? 46, `line:${l.i}`, { maxW: o.maxW ?? 1760, into: this.cw, align });
    return l.i;
  }
  /** A whole line set in the world, shown while it is the line being said (group "line:<i>"). */
  sayLine(q: string, x: number, y: number, size = 52, o: { maxW?: number; fam?: string; align?: 'left' | 'center' | 'right'; nth?: number } = {}) {
    const l = this.ctx.lyrics.get(q, o.nth ?? 0);
    return this.say(l.words, x, y, size, `line:${l.i}`, { maxW: o.maxW ?? 1100, fam: o.fam, align: o.align });
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, c = this.cam.at(t);
    const pen = this.penScreen(t);
    setGrid(this.grid, c, { ink: 1, pen: pen ? [pen[0], pen[1], 1] : [0, 0, 0] });
    this.grid.render(renderer, out);
    const U = this.ui;
    U.clear();
    this.draw(t, c, U.ctx, f);
    U.ctx.setTransform(1, 0, 0, 1, 0, 0);
    U.ctx.globalAlpha = 1;
    drawKaraoke(U.ctx, c, t, this.kw, { alpha: (g, tt) => this.kAlpha(g, tt) });
    if (this.cw.length) {
      // a soft scrim under the captions, so the map never fights them; only while a caption is showing,
      // so it never dims words or pictures set in the world (enter.ts mixes both)
      // each caption gets a band of shade wherever it sits
      for (const [g, [y0, y1]] of this.cwBand) {
        const ca = this.kAlpha(g, t);
        if (ca <= 0.003) continue;
        const b0 = Math.max(0, y0 - 110), b1 = Math.min(H, y1 + 90);
        const sg = U.ctx.createLinearGradient(0, b0, 0, b1), m0 = (y0 - b0) / (b1 - b0), m1 = (y1 - b0) / (b1 - b0);
        sg.addColorStop(0, rgba('ink', 0)); sg.addColorStop(m0, rgba('ink', 0.62 * ca)); sg.addColorStop(m1, rgba('ink', 0.62 * ca)); sg.addColorStop(1, rgba('ink', b1 >= H ? 0.7 * ca : 0));
        U.ctx.fillStyle = sg; U.ctx.fillRect(0, b0, W, b1 - b0);
      }
      drawKaraoke(U.ctx, SCREEN, t, this.cw, { alpha: (g, tt) => this.kAlpha(g, tt) });
    }
    if (this.showClock) drawClock(U.ctx, this.clock, t);
    this.drawTop(t, c, U.ctx);
    U.ctx.setTransform(1, 0, 0, 1, 0, 0);
    comp.draw(renderer, U.upload(), out);
    this.fx.clear();
    this.drawFx(t, c, this.fx);
    this.fx.render(renderer, out);
    return { bloom: 0.5, bloomThreshold: 0.86, vignette: 0.36, grain: 0.045, ...this.post(t) };
  }
}
export { measure, font, rgba, LIN, F, label, setWorld, w2s, pt, W, H };
