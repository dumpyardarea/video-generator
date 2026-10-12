// Which video this page plays, read once from the URL (`?video=frontend`). The default (none) is the
// Motion-as-Code explainer; another video keeps its voiceover in audio/<video>/ and its analysis in
// data/<video>/, and its plates in src/<video>/.
function readVideo() {
  if (typeof location === 'undefined') return '';
  const v = new URLSearchParams(location.search).get('video') ?? '';
  return /^[\w-]+$/.test(v) ? v : '';
}

export const VIDEO = readVideo();
/**
 * Shorts are their own videos, `short-<series>-<name>` (e.g. short-ep01-dns): vertical 9:16, with their own
 * voice and plates, in the look of their series (SERIES is the long-form video they come from).
 */
export const VERTICAL = VIDEO.startsWith('short-');
export const SERIES = VERTICAL ? VIDEO.split('-')[1] ?? '' : VIDEO;
/** Path prefix for this video's data/ and audio/ files ('' or 'frontend/'). */
export const VIDEO_DIR = VIDEO ? `${VIDEO}/` : '';
