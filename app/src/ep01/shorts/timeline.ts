// The EP01 Shorts (?video=short-ep01-dns, short-ep01-tls): one vertical plate each, over the Short's own voice
// (channel/episodes/01-press-enter/shorts.md → analysis/<short>/script.txt, episode_vo.py --short N).
import type { TimelineEntry } from '../../engine/engine';
import type { SceneClass } from '../../engine/scene';
import type { Lyrics } from '../../engine/lyrics';
import type { AudioData } from '../../engine/audio';
import { VIDEO } from '../../engine/video';

const modules = import.meta.glob<{ default: SceneClass }>('./*.ts');
const PLATES: Record<string, [string, string]> = {
  'short-ep01-dns': ['dns', 'How DNS finds a website'],
  'short-ep01-tls': ['tls', 'The TLS handshake, visualised'],
  'short-ep01-waterfall': ['waterfall', 'Where 0.8 seconds actually goes'],
};

export function makeEp01ShortTimeline(_ly: Lyrics, au: AudioData): TimelineEntry[] {
  const [id, chapter] = PLATES[VIDEO] ?? ['dns', 'Short'];
  const load = () => { const m = modules[`./${id}.ts`]; return m ? m() : Promise.reject(new Error(`scene module not found: ep01/shorts/${id}.ts`)); };
  return [{ id, load, start: 0, end: au.duration, chapter }];
}
