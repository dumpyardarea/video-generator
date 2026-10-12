import { hexToLinear } from './util';
import { SERIES } from './video';

// Each video lives in a restrained palette: ink, bone, and one signal colour, plus one rare accent.
// The roles are the same for every video (plates and shaders only ever name roles); the values are
// the series' own, picked by ?video= (see channel/style-registry.md: no two series share a palette).
type Palette = {
  ink: string; // background
  ink2: string; // raised panels
  graphite: string; // dim lines, secondary text
  ash: string; // mid grey
  bone: string; // paper white, primary text
  signal: string; // the one signal colour: the pen, what is being said, emphasis
  ember: string; // hotter, lighter signal for cores and highlights
  blood: string; // the deep shadow of signal
  acid: string; // the rare accent: once per video
};

const PALETTES: Record<string, Palette> = {
  // Motion as Code: warm black, bone, hazard orange (the pdoom-video palette)
  '': { ink: '#0A0A0B', ink2: '#151517', graphite: '#5E5B57', ash: '#9C978F', bone: '#EEE9DF', signal: '#FF4D12', ember: '#FF8A3D', blood: '#C21D0B', acid: '#D8FF3C' },
  // EP01, pressing Enter on a URL: violet-black, lavender paper, the packet's phosphor green; warning pink once
  ep01: { ink: '#0D0B14', ink2: '#18142A', graphite: '#4E4866', ash: '#9A93B5', bone: '#EFEAF7', signal: '#7CFF6B', ember: '#D2FFC8', blood: '#2E9E3A', acid: '#FF5FA8' },
  // The frontend series: blue-black, cool paper, inspector cyan; the accent is a highlighter yellow
  frontend: { ink: '#0A0E17', ink2: '#121a28', graphite: '#4A556E', ash: '#8C96AE', bone: '#E8ECF3', signal: '#27C4FF', ember: '#9FEBFF', blood: '#0B6CA6', acid: '#FFD84A' },
};

export const HEX: Palette = PALETTES[SERIES] ?? PALETTES['']!;

export type PaletteKey = keyof Palette;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
