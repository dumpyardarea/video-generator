// Render library (index.html, the dev server's home page): the videos under out/ as a folder tree (from the dev server's
// /api/library). Picking a file plays it and folds the sidebar into one folder icon at the top of the
// stage, shown while the pointer is over it; the icon unfolds the sidebar again, rows staggering in.
// The video keeps playing through all of it (only the layout changes).
// Renders: each live player has a Render button (1080p / 1440p / 4K, with time and size estimates); jobs run
// on the dev server (scripts/render-jobs.ts) and show their progress here. A render in progress is a growing
// fragmented MP4 under out/renders/ and can be watched as it grows: when playback catches up with the
// frames rendered so far, the player reloads the file where it was.

interface LibNode { name: string; path: string; type: 'dir' | 'file'; size?: number; mtime?: number; children?: LibNode[] }
interface Probe { duration: number; w: number; h: number; poster?: string }

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const app = $('app'), tree = $('tree'), foot = $('foot'), stage = $('stage');
const empty = $('empty'), cards = $('cards'), player = $('player'), meta = $('meta');
const video = $<HTMLVideoElement>('video'), screenTitle = $('screenTitle'), dockCount = $('dockCount');

let root: LibNode | null = null;
const open = new Set<string>(['']); // open folders by path ('' = out/)
let active: string | null = null;
const probes = new Map<string, Probe>();

/** A chunk of a render: its segment (growing, or finished), where it starts, how much of it is rendered. */
interface Part { file: string; done: boolean; start: number; frames: number; rendered: number; chapter: number }
interface Job {
  id: string; state: 'starting' | 'rendering' | 'finishing' | 'done' | 'failed' | 'stopped'; video: string; res: number; out: string;
  /** The chapter segment being rendered (a growing file), and every chapter's segment. */
  partial: string; parts?: Part[]; workers?: number; segStart?: number; chapter?: number; chapters?: number; chapterTitle?: string; resumed?: number;
  frame: number; total: number; fps: number; eta: number; duration: number; startedAt: number; finishedAt?: number; message?: string;
  chaptersFile?: string; warnings?: string[];
}
interface VideoInfo { id: string; name: string; duration: number }
let jobs: Job[] = [];
let videosInfo: VideoInfo[] = [];
let speeds: Record<number, number> = {};
const RUNNING = ['starting', 'rendering', 'finishing'];
const running = (j: Job) => RUNNING.includes(j.state);
/** The job a library path (relative to out/) belongs to, and whether it is that job's growing file. */
function jobFor(p: string): { job: Job; growing: boolean; part: number } | null {
  for (const j of jobs) {
    if (j.out === `out/${p}`) return { job: j, growing: false, part: -1 };
    const i = j.parts?.findIndex((x) => x.file === `out/${p}`) ?? -1;
    if (i >= 0) return { job: j, growing: !j.parts![i]!.done && running(j), part: i };
  }
  return null;
}
const pct = (j: Job) => (j.total ? Math.floor((100 * j.frame) / j.total) : 0);
/** Seconds of the video rendered so far, and how far into its current chapter's segment can be played
 *  (playback lags the frames rendered by the fragment being written and the encoder's lookahead: ~3 s). */
const renderedTo = (j: Job) => (j.total ? (j.frame / j.total) * j.duration : 0);
/** The render being watched, the chunk playing, and where that chunk starts in the video. */
let watchingJob: string | null = null, watchIdx = 0, watchSegStart = 0;
const watching = () => jobs.find((j) => j.id === watchingJob) ?? null;

// ------------------------------------------------------------------ helpers
const url = (p: string) => '/out/' + p.split('/').map(encodeURIComponent).join('/');
const files = (n: LibNode): LibNode[] => (n.type === 'file' ? [n] : (n.children ?? []).flatMap(files));
const fmtSize = (b = 0) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtDate = (ms = 0) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const label = (n: LibNode) => n.name.replace(/\.[^.]+$/, '');
const svg = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild as SVGElement; };
const FOLDER = `<svg class="folder-ico" viewBox="0 0 32 26" aria-hidden="true"><path class="f-back" d="M2 4.5A2.5 2.5 0 0 1 4.5 2h7l3 3h13A2.5 2.5 0 0 1 30 7.5v14a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 2 21.5z"/><path class="f-lid" d="M2 10h28v11.5a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 2 21.5z"/></svg>`;
const CHEV = `<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
const FILM = `<svg class="file-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path class="play" d="M10 8.5l5.5 3.5-5.5 3.5z"/></svg>`;

// ------------------------------------------------------------------ probing (duration, size, poster frame)
const queue: LibNode[] = [];
let probing = false;
function probe(n: LibNode) { if (!probes.has(key(n)) && !jobFor(n.path)?.growing) { queue.push(n); pump(); } }
const key = (n: LibNode) => `${n.path}@${n.mtime}`;
async function pump() {
  if (probing) return;
  probing = true;
  while (queue.length) {
    const n = queue.shift()!;
    if (probes.has(key(n))) continue;
    probes.set(key(n), await readProbe(n));
    updateInfo(n);
  }
  probing = false;
}
function readProbe(n: LibNode): Promise<Probe> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'metadata'; v.crossOrigin = 'anonymous';
    const done = (p: Probe) => { v.removeAttribute('src'); v.load(); resolve(p); };
    const timer = setTimeout(() => done({ duration: v.duration || 0, w: v.videoWidth, h: v.videoHeight }), 15000);
    v.onerror = () => { clearTimeout(timer); done({ duration: 0, w: 0, h: 0 }); };
    v.onloadedmetadata = () => { v.currentTime = Math.min(v.duration * 0.3, v.duration - 0.1); };
    v.onseeked = () => {
      clearTimeout(timer);
      let poster: string | undefined;
      try {
        const c = document.createElement('canvas');
        c.width = 480; c.height = Math.round((480 * v.videoHeight) / Math.max(1, v.videoWidth));
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
        poster = c.toDataURL('image/jpeg', 0.8);
      } catch { /* poster is optional */ }
      done({ duration: v.duration, w: v.videoWidth, h: v.videoHeight, poster });
    };
    v.src = url(n.path);
  });
}

// ------------------------------------------------------------------ the tree
function rowFor(n: LibNode, depth: number): HTMLLIElement {
  const li = document.createElement('li');
  li.dataset.path = n.path;
  const b = document.createElement('button');
  b.className = 'row'; b.type = 'button';
  b.setAttribute('role', 'treeitem');
  const name = document.createElement('span'); name.className = 'name'; name.textContent = depth === 0 ? 'out' : n.name;
  const info = document.createElement('span'); info.className = 'info';
  if (n.type === 'dir') {
    li.className = 'dir' + (open.has(n.path) ? ' open' : '');
    b.setAttribute('aria-expanded', String(open.has(n.path)));
    b.append(svg(CHEV), svg(FOLDER), name, info);
    info.textContent = String(files(n).length);
    b.onclick = () => toggleDir(li, n);
    const kids = document.createElement('div'); kids.className = 'kids';
    const ul = document.createElement('ul'); ul.setAttribute('role', 'group');
    for (const c of n.children ?? []) ul.append(rowFor(c, depth + 1));
    kids.append(ul);
    li.append(b, kids);
  } else {
    li.className = 'file' + (n.path === active ? ' active' : '') + (n.path === active && !video.paused ? ' playing' : '');
    const eq = document.createElement('span'); eq.className = 'eq'; eq.innerHTML = '<i></i><i></i><i></i>';
    b.append(svg(FILM), name, eq, info);
    b.title = n.path;
    b.onclick = () => play(n);
    info.textContent = fmtSize(n.size);
    const jf = jobFor(n.path);
    if (jf?.growing) {
      li.classList.add('rendering');
      name.textContent = n.name.replace('.rendering', '');
      info.textContent = running(jf.job) ? `rendering ${pct(jf.job)}%` : jf.job.state;
    }
    li.append(b);
    probe(n);
  }
  return li;
}
function toggleDir(li: HTMLLIElement, n: LibNode) {
  const isOpen = !open.has(n.path);
  if (isOpen) open.add(n.path); else open.delete(n.path);
  li.classList.toggle('open', isOpen);
  li.querySelector(':scope > .row')!.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) stagger(li.querySelector(':scope > .kids > ul') as HTMLElement, false);
}
/** Stagger the rows of `ul` (and, with deep, of every open folder inside it) in. */
function stagger(ul: HTMLElement, deep: boolean) {
  const lists = deep ? [ul, ...ul.querySelectorAll<HTMLElement>('.dir.open > .kids > ul')] : [ul];
  let i = 0;
  // number rows in reading order so the cascade runs top to bottom
  const walk = (u: HTMLElement) => {
    for (const li of u.children as HTMLCollectionOf<HTMLElement>) {
      li.style.setProperty('--i', String(i++));
      const sub = li.querySelector<HTMLElement>(':scope.dir.open > .kids > ul');
      if (deep && sub) walk(sub);
    }
  };
  walk(ul);
  for (const u of lists) { u.classList.remove('reveal'); void u.offsetWidth; u.classList.add('reveal'); }
  setTimeout(() => lists.forEach((u) => u.classList.remove('reveal')), 600 + i * 32);
}
function render() {
  tree.replaceChildren();
  if (!root || !files(root).length) {
    tree.innerHTML = '<div class="tree-empty">No renders yet. Videos saved under <code>out/</code> show up here.</div>';
    foot.textContent = '';
    renderCards();
    return;
  }
  const ul = document.createElement('ul');
  ul.append(rowFor(root, 0));
  tree.append(ul);
  const all = files(root);
  foot.textContent = `${all.length} video${all.length === 1 ? '' : 's'} · ${fmtSize(all.reduce((a, f) => a + (f.size ?? 0), 0))}`;
  dockCount.textContent = String(all.length);
  renderCards();
}
function updateInfo(n: LibNode) {
  const p = probes.get(key(n));
  if (!p) return;
  const li = tree.querySelector<HTMLElement>(`li.file[data-path="${CSS.escape(n.path)}"] .info`);
  if (li && p.duration) li.textContent = `${fmtDur(p.duration)} · ${fmtSize(n.size)}`;
  const card = cards.querySelector<HTMLElement>(`[data-path="${CSS.escape(n.path)}"]`);
  if (card) {
    if (p.poster) (card.querySelector('.thumb') as HTMLElement).style.backgroundImage = `url(${p.poster})`;
    if (p.duration) card.querySelector('.dur')!.textContent = fmtDur(p.duration);
  }
  if (n.path === active) renderMeta(n);
}

// ------------------------------------------------------------------ cards (nothing playing yet)
function renderCards() {
  cards.replaceChildren();
  const all = root ? files(root).sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0)) : [];
  all.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'card'; b.type = 'button'; b.dataset.path = n.path;
    b.style.setProperty('--i', String(i));
    b.innerHTML = '<div class="thumb"><span class="dur"></span></div><div class="cap"><b></b><span></span></div>';
    const jf = jobFor(n.path);
    b.querySelector('b')!.textContent = label(n).replace('.rendering', '');
    b.querySelector('.cap span')!.textContent = jf?.growing ? `rendering ${pct(jf.job)}% · watch while it renders` : `${n.path} · ${fmtSize(n.size)} · ${fmtDate(n.mtime)}`;
    b.onclick = () => play(n);
    cards.append(b);
    updateInfo(n);
  });
}

// ------------------------------------------------------------------ playing
function play(n: LibNode) {
  const jp = jobFor(n.path);
  if (jp && jp.part >= 0 && running(jp.job)) { playPart(jp.job, jp.part, 0); return; }
  watchingJob = null;
  if (active !== n.path) {
    active = n.path;
    video.src = url(n.path);
  }
  empty.hidden = true;
  player.hidden = false;
  updateLiveChip();
  screenTitle.textContent = label(n).replace('.rendering', '');
  document.title = `${label(n)} · Render Library`;
  renderMeta(n);
  markActive();
  video.play().catch(() => { /* autoplay with sound can be refused; the controls are there */ });
  collapse(true);
}
function renderMeta(n: LibNode) {
  const p = probes.get(key(n));
  const rows: [string, string][] = [['file', n.path], ['size', fmtSize(n.size)], ['rendered', fmtDate(n.mtime)]];
  if (p?.duration) rows.splice(1, 0, ['length', fmtDur(p.duration)]);
  if (p?.w) rows.splice(2, 0, ['frame', `${p.w}×${p.h}`]);
  meta.replaceChildren(...rows.map(([k, v]) => { const d = document.createElement('div'); d.innerHTML = '<dt></dt><dd></dd>'; d.children[0]!.textContent = k; d.children[1]!.textContent = v; return d; }));
}
function markActive() {
  for (const li of tree.querySelectorAll<HTMLElement>('li.file')) {
    const on = li.dataset.path === active;
    li.classList.toggle('active', on);
    li.classList.toggle('playing', on && !video.paused);
  }
}
video.addEventListener('play', markActive);
video.addEventListener('pause', markActive);

// ------------------------------------------------------------------ watching a render as it grows
// A render is a sequence of chunks (status.parts), several rendering at once. Watching plays them in order:
// a finished chunk's segment, or the growing one, reopened as it grows; when playback catches up with the
// render it waits for frames. When the render is done it moves to the finished video at the same time.
let reloadTimer = 0, wantPlay = false;
/** Reopen the (grown) file at the same time. */
function reloadAt(src: string, t: number, play: boolean) {
  video.src = src;
  video.addEventListener('loadedmetadata', () => {
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.05));
    if (play) video.play().catch(() => {});
  }, { once: true });
}
/** Seconds of a chunk that can be played (a growing one lags its rendered frames by the fragment being
 *  written and the encoder's lookahead: ~3 s). */
const playable = (p: Part) => (p.done ? p.frames / 60 : Math.max(0, p.rendered / 60 - 3));
function showPlayer(title: string) {
  empty.hidden = true;
  player.hidden = false;
  screenTitle.textContent = title;
  document.title = `${title} · Render Library`;
  collapse(true);
}
/** Play chunk i of job j from t (or wait until enough of it exists). */
function playPart(j: Job, i: number, t: number) {
  clearTimeout(reloadTimer);
  const p = j.parts?.[i];
  if (!p) return;
  watchingJob = j.id; watchIdx = i; watchSegStart = p.start;
  showPlayer(`${videoName(j.video)} · ${j.res}p · rendering`);
  if (!p.done && playable(p) < t + 1) {
    wantPlay = true;
    updateLiveChip();
    reloadTimer = window.setTimeout(() => { const jj = watching(); if (jj && running(jj)) playPart(jj, i, t); }, 1500);
    return;
  }
  wantPlay = false;
  active = p.file.replace(/^out\//, '');
  reloadAt(`${url(active)}?v=${Date.now()}`, t, true);
  markActive();
  updateLiveChip();
}
function catchUp() {
  clearTimeout(reloadTimer);
  const j = watching();
  if (!j) return;
  if (j.state === 'done') { adoptFinished(); return; }
  if (!running(j)) return;
  const p = j.parts?.[watchIdx];
  if (!p) return;
  const atEnd = video.ended || video.currentTime >= video.duration - 0.3;
  if (p.done && atEnd) {
    if (watchIdx + 1 < (j.parts?.length ?? 0)) playPart(j, watchIdx + 1, 0);
  } else if (!p.done && playable(p) >= video.currentTime + 1) {
    // the chunk has grown at least another second past where playback stopped: reopen it there
    wantPlay = false;
    reloadAt(`${url(p.file.replace(/^out\//, ''))}?v=${Date.now()}`, video.currentTime, true);
  } else {
    wantPlay = true;
    reloadTimer = window.setTimeout(catchUp, 1500);
  }
  updateLiveChip();
}
video.addEventListener('ended', catchUp);
video.addEventListener('error', () => {
  const j = watching();
  const p = j?.parts?.[watchIdx];
  if (!j || !p) return;
  // the chunk finished and its segment was renamed (NNN.rendering.mp4 → NNN.mp4), or the growing file was
  // caught mid-write (its newest fragment half on disk): pick it up again in a moment
  const t = video.currentTime || 0;
  wantPlay = true;
  updateLiveChip();
  clearTimeout(reloadTimer);
  reloadTimer = window.setTimeout(() => { const jj = watching(); if (jj?.state === 'done') adoptFinished(); else if (jj) playPart(jj, watchIdx, t); }, p.done ? 200 : 2000);
});
video.addEventListener('playing', () => { if (wantPlay) { wantPlay = false; updateLiveChip(); } });
video.addEventListener('waiting', () => {
  // stalled at the end of what was there when the file was opened
  const b = video.buffered;
  if (b.length && video.currentTime >= b.end(b.length - 1) - 0.25) catchUp();
});
function updateLiveChip() {
  const chip = $('liveChip');
  const j = watching();
  if (!j || j.state === 'done') { chip.hidden = true; return; }
  chip.hidden = false;
  const n = j.parts?.length ?? 0;
  $('liveChipText').textContent = running(j)
    ? `LIVE RENDER · ${fmtDur(watchSegStart + (video.currentTime || 0))} · chunk ${watchIdx + 1}/${n} · ${pct(j)}% rendered${j.workers ? ` · ${j.workers} workers` : ''}${wantPlay ? ' · waiting for frames…' : ''}`
    : `render ${j.state}`;
}
/** The render finished while it was being watched: move to the finished video at the same time. */
function adoptFinished() {
  const j = watching();
  if (!j || j.state !== 'done') return;
  const fin = j.out.replace(/^out\//, '');
  const t = watchSegStart + (video.ended ? video.duration : video.currentTime || 0), playing = !video.paused || wantPlay;
  watchingJob = null;
  active = fin;
  wantPlay = false;
  reloadAt(url(fin), t, playing);
  screenTitle.textContent = label({ name: fin.split('/').pop()!, path: fin, type: 'file' });
  markActive();
  updateLiveChip();
}


// ------------------------------------------------------------------ folding the sidebar
let peekTimer = 0;
function collapse(on: boolean) {
  if (app.classList.contains('collapsed') === on) return;
  app.classList.toggle('collapsed', on);
  if (on) {
    // show the icon for a moment so it is clear where the library went
    app.classList.add('peek');
    clearTimeout(peekTimer);
    peekTimer = window.setTimeout(() => app.classList.remove('peek'), 1800);
  } else {
    app.classList.remove('peek');
    const ul = tree.querySelector<HTMLElement>(':scope > ul');
    if (ul) stagger(ul, true);
  }
}
$('dock').onclick = () => collapse(false);
$('collapse').onclick = () => collapse(true);
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) collapse(!app.classList.contains('collapsed'));
});
// on a phone the open sidebar is a drawer: tapping the stage closes it
stage.addEventListener('click', (e) => {
  if (matchMedia('(max-width: 720px)').matches && !app.classList.contains('collapsed') && active && !(e.target as HTMLElement).closest('.dock')) collapse(true);
});

// ------------------------------------------------------------------ resizing the sidebar (20–50% of the window)
const MIN = 0.2, MAX = 0.5, SB_KEY = 'library.sidebar';
let sbFrac = 0.25;
try { const v = parseFloat(localStorage.getItem(SB_KEY) ?? ''); if (v >= MIN && v <= MAX) sbFrac = v; } catch { /* no storage: default width */ }
const resizer = $('resizer');
const tip = document.createElement('div');
tip.className = 'resize-tip';
$('sidebar').append(tip);
function setWidth(frac: number, save = false) {
  sbFrac = Math.min(MAX, Math.max(MIN, frac));
  const px = Math.round(sbFrac * window.innerWidth);
  app.style.setProperty('--sb', `${px}px`);
  resizer.setAttribute('aria-valuenow', String(Math.round(sbFrac * 100)));
  resizer.setAttribute('aria-valuemin', String(MIN * 100));
  resizer.setAttribute('aria-valuemax', String(MAX * 100));
  tip.textContent = `${Math.round(sbFrac * 100)}% · ${px}px`;
  if (save) try { localStorage.setItem(SB_KEY, String(sbFrac)); } catch { /* not remembered */ }
}
resizer.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  resizer.setPointerCapture(e.pointerId);
  app.classList.add('resizing');
  const move = (ev: PointerEvent) => setWidth(ev.clientX / window.innerWidth);
  const up = () => {
    app.classList.remove('resizing');
    resizer.removeEventListener('pointermove', move);
    resizer.removeEventListener('pointerup', up);
    resizer.removeEventListener('pointercancel', up);
    setWidth(sbFrac, true);
  };
  resizer.addEventListener('pointermove', move);
  resizer.addEventListener('pointerup', up);
  resizer.addEventListener('pointercancel', up);
});
resizer.addEventListener('dblclick', () => setWidth(0.25, true));
resizer.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 0.05 : 0.01;
  if (e.key === 'ArrowLeft') setWidth(sbFrac - step, true);
  else if (e.key === 'ArrowRight') setWidth(sbFrac + step, true);
  else if (e.key === 'Home') setWidth(MIN, true);
  else if (e.key === 'End') setWidth(MAX, true);
  else return;
  e.preventDefault();
});
window.addEventListener('resize', () => setWidth(sbFrac));
setWidth(sbFrac);
// the saved width applies before transitions switch on, so the page doesn't animate into it on load
requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('booting')));

// ------------------------------------------------------------------ renders: jobs, live players, the dialog
const REC_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>';
const RES_OPTS = [
  { res: 1080, k: '1K', name: '1080p', size: '1920×1080' },
  { res: 1440, k: '2K', name: '1440p', size: '2560×1440' },
  { res: 2160, k: '4K', name: '2160p', size: '3840×2160' },
];
// measured on this machine (frames/s); replaced by the average of finished renders once there are some
const DEFAULT_FPS: Record<number, number> = { 1080: 1.8, 1440: 0.48, 2160: 0.5 };
const MB_PER_S: Record<number, number> = { 1080: 3.3, 1440: 6.5, 2160: 11 };
const fmtLong = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
const videoName = (id: string) => videosInfo.find((v) => v.id === id)?.name ?? (id || 'Motion as Code');
const playerUrl = (id: string) => `/player.html${id ? `?video=${encodeURIComponent(id)}` : ''}`;

function renderLive() {
  $('liveList').replaceChildren(...videosInfo.map((v) => {
    const row = document.createElement('div'); row.className = 'live-row';
    const a = document.createElement('a'); a.className = 'live-link'; a.href = playerUrl(v.id);
    a.title = `Preview ${v.name} live in the browser`;
    a.innerHTML = '<span class="live-dot" aria-hidden="true"></span><span></span><span class="live-path"></span>';
    a.children[1]!.textContent = v.name;
    a.children[2]!.textContent = v.duration ? fmtDur(v.duration) : '';
    const r = document.createElement('button'); r.className = 'rbtn'; r.type = 'button';
    r.innerHTML = `${REC_ICO}Render`; r.title = `Render ${v.name} to MP4`;
    r.onclick = () => openRender(v.id);
    row.append(a, r);
    return row;
  }));
}
function renderJobList() {
  const shown = jobs.filter((j) => running(j) || j.state !== 'done' || Date.now() - (j.finishedAt ?? 0) < 30 * 60e3);
  $('jobs').hidden = !shown.length;
  $('jobList').replaceChildren(...shown.map((j) => {
    const el = document.createElement('div'); el.className = `job ${j.state}`;
    el.innerHTML = '<div class="job-top"><span class="job-name"></span><span class="job-res"></span></div><div class="job-bar"><i></i></div><div class="job-line"><span class="grow"></span></div>';
    el.querySelector('.job-name')!.textContent = videoName(j.video);
    el.querySelector('.job-res')!.textContent = `${j.res}p`;
    (el.querySelector('.job-bar i') as HTMLElement).style.width = `${j.state === 'done' ? 100 : pct(j)}%`;
    const line = el.querySelector('.job-line')!, grow = line.querySelector('.grow') as HTMLElement;
    const chap = j.chapters && j.chapters > 1 ? `ch ${j.chapter}/${j.chapters} · ` : '';
    grow.textContent =
      j.state === 'starting' ? 'starting Chrome and a private dev server…'
        : j.state === 'rendering' ? `${chap}${pct(j)}% · ${j.fps.toFixed(1)} fps · ${fmtLong(j.eta)} left`
          : j.state === 'finishing' ? 'finishing the file…'
            : j.state === 'done' ? `done in ${fmtLong(((j.finishedAt ?? j.startedAt) - j.startedAt) / 1000)}${j.warnings?.length ? ' · chapter warnings' : ''}`
              : j.message || `render ${j.state}`;
    if (j.message) grow.title = j.message;
    else if (j.warnings?.length) grow.title = j.warnings.join('\n');
    else if (running(j) && j.chapterTitle) grow.title = `rendering chapter ${j.chapter}: ${j.chapterTitle}`;
    const act = (text: string, cls: string, fn: () => void, title = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = `job-act ${cls}`; b.textContent = text; b.title = title; b.onclick = fn; line.append(b); };
    // a fragment or two must exist before the growing file plays
    // a fragment is written once the next keyframe (2 s later) is encoded, and the encoder runs behind: ~5 s in
    if (j.state === 'rendering' && j.parts?.[0] && playable(j.parts[0]) > 1) act('Watch', 'watch', () => playPart(j, 0, 0), 'Watch it from the start while it renders');
    if (j.state === 'done') act('Play', 'watch', () => watch(j.out));
    // a stopped or failed render keeps its finished chapters: resume renders only the rest
    if (j.state === 'stopped' || j.state === 'failed') act('Resume', 'watch', () => post('/api/render/resume', { id: j.id }).then(poll).catch((e) => alert((e as Error).message)), 'Render the chapters that aren\'t finished');
    if (running(j)) act('Cancel', '', () => cancelJob(j));
    else act('✕', '', () => post('/api/render/dismiss', { id: j.id }).then(poll), 'Remove from this list (the video stays)');
    return el;
  }));
}
function watch(rel: string) {
  const p = rel.replace(/^out\//, '');
  const find = () => (root ? files(root).find((f) => f.path === p) : undefined);
  const n = find();
  if (n) play(n);
  else load().then(() => { const m = find(); if (m) play(m); });
}
async function post(u: string, b: unknown) {
  const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}
async function cancelJob(j: Job) {
  if (!confirm(`Stop rendering ${videoName(j.video)} (${j.res}p)? The partly rendered video is deleted.`)) return;
  if (active && jobFor(active)?.job.id === j.id) {
    video.pause(); video.removeAttribute('src'); video.load();
    active = null; player.hidden = true; empty.hidden = false;
  }
  await post('/api/render/cancel', { id: j.id }).catch((e) => alert((e as Error).message));
  await poll();
}

// the dialog
const dlg = $<HTMLDialogElement>('renderDlg');
let dlgVideo = '', dlgRes = 1080;
function estimate(res: number, dur: number) {
  const fps = speeds[res] ?? DEFAULT_FPS[res]!;
  return { time: (dur * 60) / fps, mb: dur * MB_PER_S[res]!, measured: !!speeds[res] };
}
function renderDialog() {
  const vbox = $('rdlgVideos'), rbox = $('rdlgRes');
  vbox.querySelectorAll('.opt').forEach((e) => e.remove());
  rbox.querySelectorAll('.opt').forEach((e) => e.remove());
  for (const v of videosInfo) {
    const l = document.createElement('label'); l.className = 'opt';
    l.innerHTML = '<input type="radio" name="video"><span><b></b><small></small></span>';
    const i = l.querySelector('input')!; i.value = v.id; i.checked = v.id === dlgVideo;
    i.onchange = () => { dlgVideo = v.id; renderDialog(); };
    l.querySelector('b')!.textContent = v.name;
    l.querySelector('small')!.textContent = fmtDur(v.duration);
    vbox.append(l);
  }
  const dur = videosInfo.find((v) => v.id === dlgVideo)?.duration ?? 0;
  for (const o of RES_OPTS) {
    const e = estimate(o.res, dur);
    const l = document.createElement('label'); l.className = 'opt';
    l.innerHTML = '<input type="radio" name="res"><span><b></b><em></em><span class="est"></span></span>';
    const i = l.querySelector('input')!; i.value = String(o.res); i.checked = o.res === dlgRes;
    i.onchange = () => { dlgRes = o.res; renderDialog(); };
    l.querySelector('b')!.textContent = o.k;
    l.querySelector('em')!.textContent = `${o.name} · ${o.size}`;
    l.querySelector('.est')!.textContent = `≈ ${fmtLong(e.time)} · ${e.mb >= 1000 ? `${(e.mb / 1000).toFixed(1)} GB` : `${Math.round(e.mb)} MB`}`;
    rbox.append(l);
  }
  const e = estimate(dlgRes, dur);
  $('rdlgNote').textContent = (dlgRes === 1440 ? '2K renders at 4K inside and scales down (the engine scales by whole numbers): it takes as long as 4K and is sharper than 1080p. ' : '')
    + `Times are ${e.measured ? 'from your earlier renders' : 'measured on this machine'}. It runs locally (no cost), and you can watch it while it renders.`;
  ($('rdlgPreview') as HTMLAnchorElement).href = playerUrl(dlgVideo);
  const busy = jobs.find(running);
  $<HTMLButtonElement>('rdlgStart').disabled = !!busy;
  $('rdlgErr').textContent = busy ? `A render is already running (${videoName(busy.video)}, ${busy.res}p). Wait for it, or cancel it first.` : '';
}
function openRender(id: string) {
  dlgVideo = videosInfo.some((v) => v.id === id) ? id : videosInfo[0]?.id ?? '';
  renderDialog();
  if (!dlg.open) dlg.showModal();
}
$('rdlgStart').onclick = async () => {
  const b = $<HTMLButtonElement>('rdlgStart');
  b.disabled = true; b.textContent = 'Starting…';
  try {
    await post('/api/render', { video: dlgVideo, res: dlgRes });
    dlg.close();
    collapse(false);
    await poll();
  } catch (e) {
    $('rdlgErr').textContent = (e as Error).message;
  } finally {
    b.textContent = 'Start render';
    if (dlg.open) renderDialog();
  }
};

// polling: quick while something renders
let pollTimer = 0, lastSig: string | null = null; // null: the tree hasn't loaded yet
async function poll() {
  clearTimeout(pollTimer);
  try {
    const r = await (await fetch('/api/renders', { cache: 'no-store' })).json();
    jobs = r.jobs; videosInfo = r.videos; speeds = r.speeds;
  } catch { /* the dev server is restarting */ }
  renderJobList();
  if (!$('liveList').children.length && videosInfo.length) renderLive();
  if (dlg.open) renderDialog();
  // files appear, grow and get renamed as renders move on: rescan when a job changes state
  const sig = jobs.map((j) => `${j.id}:${j.state}`).join('|');
  if (sig !== lastSig) { lastSig = sig; await load(); adoptFinished(); }
  else for (const li of tree.querySelectorAll<HTMLElement>('li.file.rendering')) {
    const jf = jobFor(li.dataset.path!);
    if (jf && running(jf.job)) li.querySelector('.info')!.textContent = `rendering ${pct(jf.job)}%`;
  }
  updateLiveChip();
  pollTimer = window.setTimeout(poll, jobs.some(running) ? 1500 : 8000);
}

// ------------------------------------------------------------------ loading

async function load() {
  try {
    const r = await fetch('/api/library', { cache: 'no-store' });
    root = await r.json();
  } catch {
    root = null;
  }
  render();
}
$('refresh').onclick = async (e) => {
  const b = e.currentTarget as HTMLElement;
  b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin');
  await load();
};
let lastFocus = 0;
window.addEventListener('focus', () => { if (Date.now() - lastFocus > 3000) { lastFocus = Date.now(); load(); poll(); } });
// /?render=<video> (the player's Render link) opens the dialog for that video
const wantRender = new URLSearchParams(location.search).get('render');
poll().then(() => {
  if (wantRender !== null) { openRender(wantRender); history.replaceState(null, '', '/'); }
});
