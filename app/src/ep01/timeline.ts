// EP01, pressing Enter on a URL (?video=ep01): one plate per chapter (two for TLS), each cut in the pause before
// its first line. Script: channel/episodes/01-press-enter/script.md → analysis/ep01/script.txt (episode_vo.py).
import type { TimelineEntry } from '../engine/engine';
import type { SceneClass } from '../engine/scene';
import type { Lyrics } from '../engine/lyrics';
import type { AudioData } from '../engine/audio';

const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: ep01/scenes/${name}.ts`));
};

/** [plate, a phrase of its first line, chapter (the YouTube chapter list)]. */
const PLATES: [string, string, string][] = [
  ['enter', 'You type a web address', 'Intro'],
  ['parse', 'First, the browser decides', 'What did you type?'],
  ['cache', 'First, a service worker', 'Do we already have it?'],
  ['dns', 'Computers don\'t find each other', 'DNS: finding the address'],
  ['tcp', 'To send data reliably', 'TCP: making a connection'],
  ['tls-keys', 'The connection is open, but anything', 'TLS: a secret, in public'],
  ['tls-cert', 'But how does your browser know', 'TLS: a secret, in public'],
  ['http', 'Now the browser can finally ask', 'HTTP: asking for the page'],
  ['subresources', 'The HTML is only the start', 'Everything else on the page'],
  ['waterfall', 'The first request: DNS', 'The real waterfall'],
  ['pixels', 'At this point the browser has the HTML', 'And then, pixels'],
  ['trip', 'Pressing Enter set off', 'The whole trip'],
];

export function makeEp01Timeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  const cut = (q: string) => {
    const l = ly.get(q);
    const prev = ly.lines[l.i - 1];
    const gap = prev ? l.start - prev.end : 1;
    return l.i === 0 ? 0 : l.start - Math.min(0.3, Math.max(0.05, gap * 0.45));
  };
  const starts = PLATES.map(([, q]) => cut(q));
  return PLATES.map(([id, , chapter], i) => ({ id, load: scene(id), start: starts[i]!, end: starts[i + 1] ?? au.duration, chapter }));
}
