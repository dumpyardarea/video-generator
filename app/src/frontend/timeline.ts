// The frontend-developer explainer (?video=frontend): one plate per script line, each cut in the pause
// before its line (analysis/frontend/script.txt, aligned into data/frontend/lyrics.json).
import type { TimelineEntry } from '../engine/engine';
import type { SceneClass } from '../engine/scene';
import type { Lyrics } from '../engine/lyrics';
import type { AudioData } from '../engine/audio';

const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: frontend/scenes/${name}.ts`));
};

/** [plate, a phrase of the line it starts on, chapter]. YouTube wants chapters of at least 10 s: in a 74 s
 *  video that means three broad ones (the recap alone would be 9.5 s, so it closes the last). */
const PLATES: [string, string, string][] = [
  ['sides', 'Every website', 'Two sides of every website'],
  ['role', 'A frontend developer', 'Two sides of every website'],
  ['html', 'It starts with HTML', 'HTML, CSS and JavaScript'],
  ['css', 'Then CSS', 'HTML, CSS and JavaScript'],
  ['js', 'And JavaScript is the behavior', 'HTML, CSS and JavaScript'],
  ['house', 'Think of a house', 'HTML, CSS and JavaScript'],
  ['frameworks', 'On top of that', 'Frameworks, screens and APIs'],
  ['screens', 'They make sure', 'Frameworks, screens and APIs'],
  ['api', 'And they connect', 'Frameworks, screens and APIs'],
  ['outro', 'So: HTML for structure', 'Frameworks, screens and APIs'],
];

export function makeFrontendTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  const cut = (q: string) => {
    const l = ly.get(q);
    const prev = ly.lines[l.i - 1];
    const gap = prev ? l.start - prev.end : 1;
    return l.i === 0 ? 0 : l.start - Math.min(0.18, Math.max(0.04, gap * 0.45));
  };
  const starts = PLATES.map(([, q]) => cut(q));
  return PLATES.map(([id, , chapter], i) => ({ id, load: scene(id), start: starts[i]!, end: starts[i + 1] ?? au.duration, chapter }));
}
