// The Frontend series' motif (channel/style-registry.md): the inspector. A design tool's dot-grid
// canvas, selection boxes that draw themselves round an element with its box-model layers (margin,
// padding, content) and a tag chip, rulers with px values, and the crosshair cursor that draws them.
// Everything takes a reveal 0..1 so plates can key it to a word.
import * as THREE from 'three';
import { FSPass, W, H } from '../engine/gl';
import type { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import { clamp, ease, lerp } from '../engine/util';
import { drawPen, type Cam } from '../scenes/_vo';
import type { R } from './_fe';

// ================================================================== the canvas: a dot grid
/** Dot grid in world px under a Cam2D (same uniforms as _vo's gridPass, so setGrid() drives it). */
export function dotGridPass(minor = 24, major = 120) {
  return new FSPass(/* glsl */ `
    uniform vec4 uCam; uniform vec2 uRes; uniform vec3 uReveal;
    uniform float uFade, uMinor, uMajor, uInk, uPaper; uniform vec3 uPen;
    void main() {
      vec2 sp = vec2(vUv.x, 1.0 - vUv.y) * uRes;
      vec2 d = sp - 0.5 * uRes;
      float c = cos(-uCam.w), s = sin(-uCam.w);
      d = vec2(c * d.x - s * d.y, s * d.x + c * d.y) / uCam.z;
      vec2 p = uCam.xy + d;
      // distance to the nearest dot / major cross, in screen px
      vec2 q1 = (fract(p / uMinor + 0.5) - 0.5) * uMinor * uCam.z;
      vec2 q4 = (fract(p / uMajor + 0.5) - 0.5) * uMajor * uCam.z;
      float dens = smoothstep(5.0, 14.0, uMinor * uCam.z);
      float dot1 = (1.0 - smoothstep(0.6, 1.6, length(q1))) * dens;
      float arm = 5.0;
      float cross = max(
        (1.0 - smoothstep(0.35, 1.1, abs(q4.x))) * step(abs(q4.y), arm),
        (1.0 - smoothstep(0.35, 1.1, abs(q4.y))) * step(abs(q4.x), arm));
      vec3 base = mix(C_INK, C_BONE * 0.95, uPaper);
      vec3 ink = mix(C_BONE, C_INK, uPaper);
      vec3 col = base + (ink - base) * (dot1 * 0.075 + cross * 0.16) * uInk;
      // a soft cool vignette of light where the cursor is
      float pd = length(sp - uPen.xy);
      col += C_SIGNAL * 0.02 * uPen.z * exp(-pd * pd / (2.0 * 160.0 * 160.0)) * (1.0 - uPaper);
      col *= 1.0 - uFade;
      fragColor = vec4(col, 1.0);
    }`, {
    uCam: { value: new THREE.Vector4(W / 2, H / 2, 1, 0) }, uRes: { value: new THREE.Vector2(W, H) },
    uReveal: { value: new THREE.Vector3(0, 0, 1e5) }, uFade: { value: 0 }, uMinor: { value: minor }, uMajor: { value: major },
    uInk: { value: 1 }, uPaper: { value: 0 }, uPen: { value: new THREE.Vector3(0, 0, 0) },
  });
}

// ================================================================== chips and labels
/** A tag chip: `tag` in mono semibold on signal, then `meta` (dims, class) in ash. Top-left at (x, y). */
export function chip(c: CanvasRenderingContext2D, x: number, y: number, tag: string, meta = '', a = 1, o: { size?: number; paper?: boolean } = {}) {
  if (a <= 0.003) return 0;
  const sz = o.size ?? 18, h = sz * 1.6, pad = sz * 0.5;
  const tw = measure(tag, F.mono(600), sz), mw = meta ? measure(meta, F.mono(400), sz) : 0;
  const w = tw + pad * 2 + (meta ? mw + pad * 2 : 0);
  c.save();
  c.globalAlpha = a;
  c.fillStyle = rgba('signal', 1);
  c.beginPath(); c.roundRect(x, y, tw + pad * 2, h, [3, meta ? 0 : 3, meta ? 0 : 3, 3]); c.fill();
  if (meta) { c.fillStyle = rgba(o.paper ? 'ink' : 'ink2', 0.94); c.beginPath(); c.roundRect(x + tw + pad * 2, y, mw + pad * 2, h, [0, 3, 3, 0]); c.fill(); }
  c.font = font(F.mono(600), sz); c.fillStyle = rgba('ink', 1); c.textBaseline = 'middle';
  c.fillText(tag, x + pad, y + h / 2 + 0.5);
  if (meta) { c.font = font(F.mono(400), sz); c.fillStyle = rgba('ash', 1); c.fillText(meta, x + tw + pad * 3, y + h / 2 + 0.5); }
  c.textBaseline = 'alphabetic';
  c.restore();
  return w;
}

// ================================================================== the selection box
export interface InspectOpts {
  /** Tag chip text, e.g. 'h1.title', and its meta, e.g. '360 × 48'. */
  tag?: string; meta?: string;
  /** Box-model bands (page px) drawn outside the box: margin, and padding inside it. */
  margin?: number; padding?: number;
  /** Tint the content box. */
  content?: boolean;
  /** Chip below the box instead of above. */
  below?: boolean;
  paper?: boolean;
}
/**
 * The inspector's selection of rect r (in the current transform's px; z = screen px per unit).
 * k: 0..1 reveal — the outline draws on (0–0.45), the box-model layers fade in (0.3–0.8), the chip types (0.5–1).
 */
export function inspect(c: CanvasRenderingContext2D, z: number, r: R, k: number, o: InspectOpts = {}, alpha = 1) {
  if (k <= 0.003 || alpha <= 0.003) return;
  const hair = 1 / z;
  const kl = ease.inOutCubic(clamp(k / 0.45)), kf = clamp((k - 0.3) / 0.5), kc = clamp((k - 0.5) / 0.5);
  c.save();
  c.globalAlpha = alpha;
  // box-model layers: margin (acid), padding (ember), content (signal)
  if (kf > 0) {
    const m = o.margin ?? 0, p = o.padding ?? 0;
    if (m > 0) {
      c.fillStyle = rgba('acid', 0.16 * kf);
      c.beginPath(); c.rect(r.x - m, r.y - m, r.w + 2 * m, r.h + 2 * m); c.rect(r.x, r.y, r.w, r.h); c.fill('evenodd');
    }
    if (p > 0) {
      c.fillStyle = rgba('ember', 0.2 * kf);
      c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.rect(r.x + p, r.y + p, r.w - 2 * p, r.h - 2 * p); c.fill('evenodd');
    }
    if (o.content) { c.fillStyle = rgba('signal', 0.14 * kf); c.fillRect(r.x + p, r.y + p, r.w - 2 * p, r.h - 2 * p); }
  }
  // the outline, drawn on clockwise from the top-left
  const per = 2 * (r.w + r.h);
  c.strokeStyle = rgba('signal', 1); c.lineWidth = 1.6 * hair;
  c.setLineDash([per * kl, per]);
  c.strokeRect(r.x, r.y, r.w, r.h);
  c.setLineDash([]);
  // corner handles
  if (kl >= 1) {
    const s = 7 * hair;
    c.fillStyle = rgba(o.paper ? 'bone' : 'ink', 1); c.strokeStyle = rgba('signal', 1); c.lineWidth = 1.4 * hair;
    for (const [hx, hy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) { c.fillRect(hx! - s / 2, hy! - s / 2, s, s); c.strokeRect(hx! - s / 2, hy! - s / 2, s, s); }
  }
  // the chip, typed in
  if (o.tag && kc > 0) {
    const n = Math.ceil(o.tag.length * kc), nm = Math.ceil((o.meta ?? '').length * clamp(kc * 1.4 - 0.4));
    const sz = 18 * hair, h = sz * 1.6;
    chip(c, r.x, o.below ? r.y + r.h + 6 * hair : r.y - h - 6 * hair, o.tag.slice(0, n), (o.meta ?? '').slice(0, nm), 1, { size: sz, paper: o.paper });
  }
  c.restore();
}

/** A horizontal ruler from x0 to x1 at y (current transform px): end ticks, the length in px. */
export function ruler(c: CanvasRenderingContext2D, z: number, x0: number, x1: number, y: number, text: string, k = 1, a = 1, o: { paper?: boolean; above?: boolean } = {}) {
  if (k <= 0.003 || a <= 0.003) return;
  const hair = 1 / z, xe = lerp(x0, x1, ease.inOutCubic(clamp(k)));
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = rgba('signal', 0.9); c.lineWidth = 1.2 * hair;
  c.beginPath(); c.moveTo(x0, y); c.lineTo(xe, y);
  c.moveTo(x0, y - 7 * hair); c.lineTo(x0, y + 7 * hair);
  if (k >= 1) { c.moveTo(x1, y - 7 * hair); c.lineTo(x1, y + 7 * hair); }
  c.stroke();
  if (k > 0.6) {
    const sz = 16 * hair;
    c.font = font(F.mono(500), sz);
    const tw = measure(text, F.mono(500), sz) + 10 * hair;
    const mx = (x0 + x1) / 2, ty = o.above ? y - 22 * hair : y + 8 * hair;
    c.fillStyle = rgba(o.paper ? 'bone' : 'ink', 0.95); c.fillRect(mx - tw / 2, ty, tw, sz * 1.5);
    c.fillStyle = rgba('signal', clamp((k - 0.6) / 0.4)); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, mx, ty + sz * 0.78); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }
  c.restore();
}

// ================================================================== the cursor
/**
 * The inspector's crosshair at screen (sx, sy): four arms with a gap, a hot core, and (through drawPen)
 * the trail of where it has been. `headAt(t)` gives its screen position over time.
 */
export function drawCrosshair(X: LineBatch, t: number, headAt: (t: number) => [number, number] | null, o: { scale?: number; intensity?: number; trail?: boolean; paper?: boolean } = {}) {
  const h = headAt(t);
  if (!h) return;
  const s = o.scale ?? 1, I = o.intensity ?? 1;
  // on paper (a normal-blend batch) the cursor is ink, without the glowing trail
  if ((o.trail ?? true) && !o.paper) drawPen(X, t, headAt, { scale: 0.55 * s, intensity: 0.8 * I, rate: 18, trail: 70 });
  const [x, y] = h, g = 7 * s, l = 22 * s;
  const col: [number, number, number] = o.paper ? LIN.blood : [LIN.ember[0] * 1.8 * I, LIN.ember[1] * 1.8 * I, LIN.ember[2] * 1.8 * I];
  if (o.paper) X.seg2(x - 2.5, y, x + 2.5, y, 5, col, 1);
  X.seg2(x - g - l, y, x - g, y, 1.6, col, 1);
  X.seg2(x + g, y, x + g + l, y, 1.6, col, 1);
  X.seg2(x, y - g - l, x, y - g, 1.6, col, 1);
  X.seg2(x, y + g, x, y + g + l, 1.6, col, 1);
}

// ================================================================== the hand-off
/**
 * "Inspect and expand": a selection outline in screen px that grows from rect `from` to the whole frame
 * (u 0 → 1, the end of a plate) or shrinks from the frame to `to` (the start of the next).
 */
export function expandBox(c: CanvasRenderingContext2D, r: R, u: number, a = 1) {
  if (a <= 0.003) return;
  const k = ease.inOutCubic(clamp(u));
  const x = lerp(r.x, 0, k), y = lerp(r.y, 0, k), w = lerp(r.w, W, k), h = lerp(r.h, H, k);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = a;
  c.strokeStyle = rgba('signal', 1); c.lineWidth = 2;
  c.strokeRect(x, y, w, h);
  c.fillStyle = rgba('ink', 0.9 * k * k);
  c.fillRect(x, y, w, h);
  c.restore();
}
/** A world rect's box on screen (corners through the camera; rolls are small enough to ignore). */
export function screenRect(c: Cam, x: number, y: number, w: number, h: number): R {
  const sx = W / 2 + (x - c.cx) * c.z, sy = H / 2 + (y - c.cy) * c.z;
  return { x: sx, y: sy, w: w * c.z, h: h * c.z };
}
