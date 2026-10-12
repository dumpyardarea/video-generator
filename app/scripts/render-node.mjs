#!/usr/bin/env node
// The pipeline's renderer (what the render library's Render… runs; also the fallback for `bun scripts/render.ts`).
// Drives the app's export mode in headless Chrome, renders every frame with the engine's motion blur, captures
// it as a PNG and pipes it to ffmpeg.
//
// It renders in CHUNKS of at most --chunk seconds (10), cut inside the timeline's chapters, on several
// workers at once (--jobs; each worker is its own Chrome, so they run on separate cores: a frame's cost is
// the 2D layers and the capture, on one core per tab, not the GPU). Each chunk goes to its own segment in
// <name>.parts/, recorded in <name>.parts/manifest.json: run the same command again after a crash or a stop
// and it renders only the chunks that aren't finished. Then the segments are joined frame-exactly (no
// re-encode, via MPEG-TS) and the voiceover laid over the whole, into <name>.mp4, with <name>.chapters.txt next to it:
// the chapter list for the YouTube description (and .chapters.json, with any rule it breaks).
// A segment being rendered is a fragmented MP4 that plays while it grows, so a render can be watched as it goes.
//
//   node scripts/render-node.mjs [--video frontend] [--res 1080|1440|2160] [--from 0] [--to <end>] [--fps 60]
//        [--samples auto|N] [--min-samples 4] [--max-samples 12] [--shutter 0.5] [--crf 17] [--preset slow]
//        [--out ../out/frontend.mp4] [--status <file.json>] [--private-server | --url http://localhost:5173]
//        [--jobs N] [--chunk 10] [--fresh] [--keep-parts] [--no-sfx]
//
//   Shorts (--video short-…) are vertical: the layout is 1080x1920 and --res names the short side (1080 → 1080x1920).
//   --res 1080: the 1920x1080 layout as is. 2160: the engine renders 3840x2160 (?scale=2) and the page is
//   captured at 2x pixel density. 1440: rendered as 2160 and downscaled (the engine scales by whole numbers),
//   so it takes as long as 4K and is supersampled. (--scale N still works: 1080·N.)
//   --private-server: start a dev server of its own with live reload off, so editing the code mid-render
//   can't reload the page being rendered (the library always uses this).
//   --status: progress as JSON (state, frame, total, chapter, eta …), rewritten about once a second.
//   --jobs: parallel workers (default: what the CPU threads and the free memory allow at the start, at most 10;
//   at most 4 at 1440p / 4K). --enc-threads: threads per chunk encoder (4). --fresh: ignore finished chunks from an earlier run. --keep-parts: keep the segments afterwards.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(`--${k}`);
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(APP, '..');
const VIDEO = opt('video', '');
const FPS = +opt('fps', '60');
const SH = +opt('shutter', '0.5');
const SAMPLES = opt('samples', 'auto') === 'auto'
  ? { min: +opt('min-samples', '4'), max: +opt('max-samples', '12'), tol: +opt('tol', '3') }
  : +opt('samples', '1');
const RES = +(opt('res', '') || 1080 * Math.max(1, Math.min(4, Math.round(+opt('scale', '1')))));
const SCALE = RES <= 1080 ? 1 : Math.ceil(RES / 1080); // engine scale (whole numbers)
/** Shorts (`short-<series>-<name>`) lay out vertical, 1080x1920 logical px; everything else 1920x1080. */
const VERTICAL = VIDEO.startsWith('short-');
const LW = VERTICAL ? 1080 : 1920, LH = VERTICAL ? 1920 : 1080;
const OUT_W = VERTICAL ? RES : Math.round((RES * 16) / 9), OUT_H = VERTICAL ? Math.round((RES * 16) / 9) : RES;
const CRF = opt('crf', '17'), PRESET = opt('preset', 'slow');
const CHUNK = Math.max(2, +opt('chunk', '10'));
// Workers: set by the CPU and the free memory at the start, unless --jobs says. Each worker is a Chrome (~0.35 GB)
// plus its encoder (~0.3 GB at 1080p with 4 threads; an unlimited x264 starts 1.5 threads per CPU thread and
// takes ~1 GB, which is what ran a 16 GB laptop out of memory at 6 workers). 4K roughly triples both.
const ENC_THREADS = Math.max(2, +opt('enc-threads', '4'));
const PER_WORKER_GB = SCALE > 1 ? 2.2 : 0.85; // measured: Chrome ~0.3 GB + encoder ~0.5 GB at 1080p
const autoJobs = Math.min(
  Math.max(1, Math.floor(os.cpus().length / 2.4)), // the tab's core + its encoder's share
  Math.max(1, Math.floor((os.freemem() / 2 ** 30 - 1.5) / PER_WORKER_GB)), // leave 1.5 GB for everything else
  SCALE > 1 ? 4 : 10);
const JOBS = Math.max(1, Math.round(+(opt('jobs', '') || autoJobs)));
const out = path.resolve(opt('out', path.join(ROOT, 'out', `${VIDEO || 'motion-as-code'}${RES !== 1080 ? `_${RES}p` : ''}.mp4`)));
const base = out.replace(/\.mp4$/i, '');
const partsDir = `${base}.parts`, manifestFile = path.join(partsDir, 'manifest.json');
const statusFile = opt('status', '');
const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/');
mkdirSync(path.dirname(out), { recursive: true });

// ------------------------------------------------------------------ status file
const status = { state: 'starting', video: VIDEO, res: RES, out: rel(out), partial: '', parts: [], pid: process.pid, startedAt: Date.now(), frame: 0, total: 0, fps: 0, eta: 0, duration: 0, chapter: 0, chapters: 0, chapterTitle: '', segStart: 0, resumed: 0, message: '' };
let lastWrite = 0;
function writeStatus(force = false) {
  if (!statusFile || (!force && Date.now() - lastWrite < 1000)) return;
  lastWrite = Date.now();
  status.updatedAt = lastWrite;
  try { writeFileSync(statusFile + '.tmp', JSON.stringify(status)); renameSync(statusFile + '.tmp', statusFile); } catch { /* next time */ }
}
writeStatus(true);
const saveJson = (f, v) => { writeFileSync(f + '.tmp', JSON.stringify(v, null, 1)); renameSync(f + '.tmp', f); };

// ------------------------------------------------------------------ helpers
async function reachable(u) { try { return (await fetch(u, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } }
let server = null;
async function serverUrl() {
  if (!flag('private-server')) return opt('url', 'http://localhost:5173');
  const port = 5300 + Math.floor(Math.random() * 600);
  server = spawn(process.execPath, [path.join(APP, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: APP, stdio: 'ignore', env: { ...process.env, PDOOM_NO_HMR: '1' } });
  const u = `http://localhost:${port}`;
  for (let i = 0; i < 300 && !(await reachable(u)); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await reachable(u))) throw new Error('private dev server did not start');
  return u;
}
const run = (args) => new Promise((res, rej) => spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] }).on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
/** YouTube's chapter time format: M:SS, or H:MM:SS past an hour. */
function stamp(s) {
  s = Math.max(0, Math.floor(s + 1e-6));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
/** Consecutive timeline entries with the same chapter → [{ title, start, end }], clipped to [from, to). */
function chaptersOf(timeline, from, to) {
  const chs = [];
  for (const e of timeline) {
    const title = e.chapter ?? '';
    const last = chs[chs.length - 1];
    if (last && last.title === title) last.end = e.end;
    else chs.push({ title, start: e.start, end: e.end });
  }
  if (!chs.length || chs.every((c) => !c.title)) return [{ title: VIDEO || 'Motion as Code', start: from, end: to }];
  chs[0].start = 0;
  chs[chs.length - 1].end = Math.max(chs[chs.length - 1].end, to);
  return chs.filter((c) => c.end > from && c.start < to).map((c) => ({ ...c, start: Math.max(c.start, from), end: Math.min(c.end, to) }));
}
/** The rules YouTube applies to a chapter list (else it shows none). */
function chapterWarnings(chs) {
  const w = [];
  if (chs.length < 3) w.push(`YouTube needs at least 3 chapters (this has ${chs.length})`);
  for (const c of chs) if (c.end - c.start < 10) w.push(`"${c.title}" is ${(c.end - c.start).toFixed(1)} s; YouTube needs 10 s or more`);
  return w;
}

/** Every running chunk encoder, killed if the render fails (else they linger, holding their segments open). */
const encoders = new Set();
const browsers = [];
try {
  const URL = await serverUrl();
  /** A worker: its own Chrome (its own renderer process, so the workers run on separate cores). */
  async function openWorker() {
    const browser = await chromium.launch({
      channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true,
      args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=metal',
        // on a laptop with two GPUs Chrome picks the integrated one unless told: render on the discrete GPU
        '--force_high_performance_gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    });
    browsers.push(browser);
    const page = await browser.newPage({ viewport: { width: LW, height: LH }, deviceScaleFactor: SCALE });
    await page.goto(`${URL}/player.html?export=1${VIDEO ? `&video=${VIDEO}` : ''}${SCALE > 1 ? `&scale=${SCALE}` : ''}`);
    await page.waitForFunction(() => window.__pdoom?.ready || window.__pdoom?.error, null, { timeout: 180000 });
    const err = await page.evaluate(() => window.__pdoom.error || window.__pdoom.errors.join('\n'));
    if (err) throw new Error(`app errors:\n${err}`);
    const size = await page.evaluate(() => [window.__pdoom.width, window.__pdoom.height]);
    if (size[0] !== LW * SCALE || size[1] !== LH * SCALE) throw new Error(`app renders ${size.join('x')}, expected ${LW * SCALE}x${LH * SCALE}`);
    return { page, cdp: await page.context().newCDPSession(page) };
  }
  const first = await openWorker();
  const dur = await first.page.evaluate(() => window.__pdoom.duration);
  const timeline = await first.page.evaluate(() => window.__pdoom.timeline);
  const from = +opt('from', '0'), to = +opt('to', String(dur));
  const audio = path.join(ROOT, 'audio', VIDEO, 'voiceover.mp3');

  // ---------------------------------------------------------------- chapters → chunks, and what an earlier run finished
  const chs = chaptersOf(timeline, from, to);
  const N0 = Math.round(from * FPS), N1 = Math.round(to * FPS);
  // chapter frame boundaries: each starts where the last ended (no frame twice, none missing)
  const bounds = chs.map((c) => Math.round(c.start * FPS)); bounds[0] = N0; bounds.push(N1);
  const key = { video: VIDEO, res: RES, fps: FPS, from, to, crf: CRF, preset: PRESET, samples: SAMPLES, shutter: SH, chunk: CHUNK, chapters: chs.map((c) => c.title) };
  let manifest = null;
  if (!flag('fresh') && existsSync(manifestFile)) {
    try { const m = JSON.parse(readFileSync(manifestFile, 'utf8')); if (JSON.stringify(m.key) === JSON.stringify(key)) manifest = m; } catch { /* start over */ }
  }
  if (!manifest) {
    rmSync(partsDir, { recursive: true, force: true });
    mkdirSync(partsDir, { recursive: true });
    // each chapter split into chunks of at most CHUNK seconds, the unit of work (and of resuming)
    const parts = [];
    chs.forEach((c, ci) => {
      const a = bounds[ci], b = bounds[ci + 1], k = Math.max(1, Math.ceil((b - a) / (CHUNK * FPS)));
      for (let j = 0; j < k; j++) {
        const n0 = a + Math.round(((b - a) * j) / k), n1 = a + Math.round(((b - a) * (j + 1)) / k);
        parts.push({ chapter: ci, n0, n1, file: `${String(parts.length + 1).padStart(3, '0')}.mp4`, done: false });
      }
    });
    manifest = { key, chapters: chs, parts };
    saveJson(manifestFile, manifest);
  }
  const parts = manifest.parts;
  for (const p of parts) { if (p.done && !existsSync(path.join(partsDir, p.file))) p.done = false; p.rendered = p.done ? p.n1 - p.n0 : 0; p.growing = ''; }
  const resumed = parts.filter((p) => p.done).length;
  if (resumed) console.log(`resuming: ${resumed} of ${parts.length} chunks already rendered`);
  const todo = parts.filter((p) => !p.done);
  const jobs = Math.max(1, Math.min(JOBS, todo.length));
  console.log(`${parts.length} chunks in ${chs.length} chapters, ${todo.length} to render on ${jobs} worker${jobs > 1 ? 's' : ''} (${(os.freemem() / 2 ** 30).toFixed(1)} GB free, ${os.cpus().length} CPU threads)`);

  const dt = 1 / FPS, total = N1 - N0;
  const t0 = Date.now();
  let renderedNow = 0;
  const progress = () => {
    const frame = parts.reduce((a, p) => a + p.rendered, 0), fps = renderedNow / Math.max(1e-3, (Date.now() - t0) / 1000);
    const cur = parts.find((p) => !p.done);
    Object.assign(status, {
      frame, fps, eta: fps > 0 ? (total - frame) / fps : 0,
      chapter: cur ? cur.chapter + 1 : chs.length, chapterTitle: cur ? chs[cur.chapter].title : '',
      partial: cur && cur.growing ? rel(cur.growing) : '', segStart: cur ? (cur.n0 - N0) / FPS : 0,
      parts: parts.map((p) => ({ file: rel(p.done ? path.join(partsDir, p.file) : p.growing || path.join(partsDir, p.file)), done: p.done, start: (p.n0 - N0) / FPS, frames: p.n1 - p.n0, rendered: p.rendered, chapter: p.chapter })),
    });
  };
  Object.assign(status, { state: 'rendering', total, duration: to - from, chapters: chs.length, chunks: parts.length, workers: jobs, resumed });
  progress();
  writeStatus(true);

  /** Render one chunk on a worker into its growing segment, then mark it done. */
  async function renderChunk(w, p) {
    const segFile = path.join(partsDir, p.file);
    let growing = segFile.replace(/\.mp4$/, '.rendering.mp4');
    // a leftover from a run that died (an orphaned encoder may still hold it on Windows): use a fresh name
    try { rmSync(growing, { force: true }); } catch { growing = segFile.replace(/\.mp4$/, `.${Date.now()}.rendering.mp4`); }
    p.growing = growing;
    const down = OUT_W !== LW * SCALE ? `scale=${OUT_W}:${OUT_H}:flags=lanczos,` : '';
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS), '-i', 'pipe:0',
      // the chunk's own slice of the voice, so the growing segment can be watched with sound
      '-ss', String(p.n0 / FPS), '-t', String((p.n1 - p.n0) / FPS), '-i', audio,
      '-vf', `${down}scale=out_color_matrix=bt709,setparams=color_primaries=bt709:color_trc=bt709`,
      // a few threads per encoder: several run at once, and each x264 thread holds frames in memory
      '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-pix_fmt', 'yuv420p', '-tune', 'grain', '-x264-params', 'aq-mode=3:rc-lookahead=30', '-threads', String(ENC_THREADS),
      // (no -shortest: AAC comes in 1024-sample blocks, and trimming the video to the audio drops frames)
      '-g', String(FPS * 2), '-c:a', 'aac', '-b:a', '320k', '-frames:v', String(p.n1 - p.n0),
      '-movflags', '+frag_keyframe+empty_moov+default_base_moof', growing], { stdio: ['pipe', 'inherit', 'inherit'] });
    encoders.add(ff);
    const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
    // warm-up: the frame before the chunk, so stateful scenes see sequential time (render's third argument is
    // toScreen: frames are captured from the canvas, so each one must be drawn to it)
    if (p.n0 > 0) await w.page.evaluate(([t, dt]) => window.__pdoom.engine.render(t, dt, false, 1, 0.5), [(p.n0 - 1) * dt, dt]);
    for (let n = p.n0; n < p.n1; n++) {
      await w.page.evaluate(([t, dt, s, sh]) => window.__pdoom.engine.render(t, dt, true, s, sh), [n * dt, dt, SAMPLES, SH]);
      const { data } = await w.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: LW, height: LH, scale: SCALE } });
      if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
      p.rendered = n - p.n0 + 1;
      renderedNow++;
      progress();
      writeStatus();
      if (renderedNow % 60 === 0) process.stdout.write(`\rframe ${status.frame}/${total}  ${status.fps.toFixed(1)} fps  eta ${Math.round(status.eta)} s   `);
    }
    ff.stdin.end();
    await ffDone;
    encoders.delete(ff);
    renameSync(growing, segFile);
    p.done = true; p.growing = '';
    saveJson(manifestFile, { key: manifest.key, chapters: manifest.chapters, parts: parts.map(({ rendered, growing, ...q }) => q) });
    progress();
    writeStatus(true);
  }

  // ---------------------------------------------------------------- the workers, each taking the next unfinished chunk
  const workers = [first];
  if (jobs > 1) workers.push(...(await Promise.all(Array.from({ length: jobs - 1 }, openWorker))));
  const queue = [...todo];
  await Promise.all(workers.map(async (w) => { for (let p = queue.shift(); p; p = queue.shift()) await renderChunk(w, p); }));
  for (const b of browsers.splice(0)) await b.close();

  // ---------------------------------------------------------------- join the chunks, lay the voice over the whole
  Object.assign(status, { state: 'finishing', eta: 0, partial: '' });
  writeStatus(true);
  // Each segment as MPEG-TS with its own time offset (so the timestamps run on across the joins), appended,
  // then remuxed with the voice laid over the whole in one piece: frame-exact. (The concat demuxer drops
  // frames at the joins of fragmented MP4s, and a raw H.264 join loses the B-frames' timestamps at the end.)
  const joined = path.join(partsDir, 'joined.ts');
  rmSync(joined, { force: true });
  for (const p of parts) {
    const ts = path.join(partsDir, p.file.replace(/\.mp4$/, '.ts'));
    await run(['-y', '-loglevel', 'error', '-i', path.join(partsDir, p.file), '-map', '0:v', '-c', 'copy', '-bsf:v', 'h264_mp4toannexb',
      '-output_ts_offset', String((p.n0 - N0) / FPS), '-f', 'mpegts', ts]);
    appendFileSync(joined, readFileSync(ts));
    rmSync(ts, { force: true });
  }
  // the sound: the voice, or (when the video has a cue sheet, analysis/<video>/sfx_cues.py) the effects mixed under it
  let soundtrack = audio;
  if (VIDEO && !flag('no-sfx') && existsSync(path.join(ROOT, 'analysis', VIDEO, 'sfx_cues.py'))) {
    const venv = path.join(ROOT, 'analysis', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const mixWav = path.join(partsDir, 'mix.wav');
    await new Promise((res, rej) => spawn(existsSync(venv) ? venv : 'python', [path.join(ROOT, 'analysis', 'sfx.py'), '--video', VIDEO, '--out', mixWav], { stdio: 'inherit' })
      .on('close', (c) => (c === 0 ? res() : rej(new Error(`sfx.py exited ${c}`)))));
    soundtrack = mixWav;
  }
  await run(['-y', '-loglevel', 'error', '-i', joined, '-ss', String(from), '-t', String((N1 - N0) / FPS), '-i', soundtrack,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-frames:v', String(total), '-movflags', '+faststart', out]);
  rmSync(joined, { force: true });
  // read every video packet's timestamps back before calling it done: the exact frame count, decode order
  // only moving forward, every frame its own presentation time (a bad join shows the wrong frame at a time)
  status.state = 'checking'; writeStatus(true);
  const pk = await new Promise((res, rej) => {
    const pr = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts,dts', '-of', 'csv=p=0', out]);
    let txt = ''; pr.stdout.on('data', (d) => (txt += d)); pr.on('close', (c) => (c === 0 ? res(txt) : rej(new Error(`ffprobe exited ${c}`))));
  });
  const rows = pk.trim().split(/\r?\n/).map((l) => l.split(',').map(Number));
  const pts = new Set(rows.map((r) => r[0])), bad = [];
  if (rows.length !== total) bad.push(`${rows.length} frames, expected ${total}`);
  if (pts.size !== rows.length) bad.push(`${rows.length - pts.size} frames share a timestamp`);
  for (let k = 1; k < rows.length; k++) if (!(rows[k][1] > rows[k - 1][1])) { bad.push(`decode timestamps go backwards at packet ${k}`); break; }
  // the encoder reorders frames (B-frames): if display time equals decode time on every frame, the order was
  // lost, and browsers (which trust the timestamps) freeze the picture while the sound plays on
  if (PRESET !== 'ultrafast' && rows.length > 10 && rows.every((r) => r[0] === r[1])) bad.push('frame reordering lost (display time = decode time on every frame)');
  if (bad.length) throw new Error(`the joined video failed its check: ${bad.join('; ')}. Its chunks are kept in ${rel(partsDir)}.`);
  // the chapter list for the YouTube description
  const list2 = chs.map((c) => ({ time: stamp(c.start - from), title: c.title, start: +(c.start - from).toFixed(3), end: +(c.end - from).toFixed(3) }));
  const warnings = chapterWarnings(chs);
  writeFileSync(`${base}.chapters.txt`, list2.map((c) => `${c.time} ${c.title}`).join('\n') + '\n');
  saveJson(`${base}.chapters.json`, { video: VIDEO, chapters: list2, warnings });
  for (const w of warnings) console.warn(`\nchapters: ${w}`);
  if (!flag('keep-parts')) rmSync(partsDir, { recursive: true, force: true });
  Object.assign(status, { state: 'done', finishedAt: Date.now(), seconds: (Date.now() - status.startedAt) / 1000, renderedFrames: renderedNow, chaptersFile: rel(`${base}.chapters.txt`), warnings, parts: [] });
  writeStatus(true);
  console.log(`\n${out}  (${((Date.now() - t0) / 1000).toFixed(0)} s, ${jobs} workers)\n${base}.chapters.txt`);
} catch (e) {
  Object.assign(status, { state: 'failed', message: String(e?.message ?? e).slice(0, 2000) });
  writeStatus(true);
  console.error(e);
  process.exitCode = 1;
} finally {
  for (const ff of encoders) { try { ff.stdin.destroy(); ff.kill('SIGKILL'); } catch { /* gone */ } }
  for (const b of browsers) await b.close().catch(() => {});
  if (server) server.kill();
}
