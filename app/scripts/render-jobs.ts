// Render jobs for the library page (index.html → Render…), served by the dev server (see vite.config.ts).
// A job is scripts/render-node.mjs started detached, with --private-server (live reload off, so editing the
// code mid-render can't reload the page being rendered) and --status out/renders/<id>.render.json, which the
// library polls. Jobs outlive a dev-server restart; their status files are the record of them.
//
//   GET  /api/renders          { jobs, videos, speeds }
//   POST /api/render           { video, res: 1080 | 1440 | 2160 }  → the new job
//   POST /api/render/cancel    { id }   stops the job and removes its files
//   POST /api/render/resume    { id }   restarts a stopped or failed job where it left off (its finished chapters stay)
//   POST /api/render/dismiss   { id }   forgets a finished, failed or stopped job (the video stays)
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Connect } from 'vite';

const RES = [1080, 1440, 2160] as const;

export function renderJobs(app: string, root: string): Connect.NextHandleFunction {
  const dir = path.join(root, 'out', 'renders');
  // command-line renders (render-node.mjs --status out/<name>.render.json) show up too
  const outDir = path.join(root, 'out');
  const statusOf = (id: string) => {
    // ids come from the page and become file names: nothing but the names start() makes
    if (!/^[\w-]+$/.test(id)) throw Object.assign(new Error('bad render id'), { code: 400 });
    const inRenders = path.join(dir, `${id}.render.json`), inOut = path.join(outDir, `${id}.render.json`);
    return existsSync(inRenders) || !existsSync(inOut) ? inRenders : inOut;
  };
  const read = (f: string) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
  const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

  function jobs() {
    const files = [dir, outDir].filter((d) => existsSync(d)).flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.render.json')).map((f) => path.join(d, f)));
    return files.map((fp) => {
      const f = path.basename(fp);
      const s = read(fp);
      if (!s) return null;
      const id = f.replace(/\.render\.json$/, '');
      const running = ['starting', 'rendering', 'finishing'].includes(s.state);
      // a job whose process is gone without saying so was stopped (crash, reboot, killed)
      if (running && !alive(s.pid)) s.state = 'stopped';
      return { ...s, id };
    }).filter(Boolean).sort((a, b) => b.startedAt - a.startedAt);
  }
  /** The videos the player knows: data/audio.json (Motion as Code) and data/<video>/audio.json. */
  function videos() {
    const data = path.join(root, 'data');
    const ids = ['', ...readdirSync(data).filter((d) => existsSync(path.join(data, d, 'audio.json')))];
    return ids.map((id) => {
      const a = read(path.join(data, id, 'audio.json'));
      const name = id ? id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Motion as Code';
      return { id, name, duration: a?.duration ?? 0 };
    });
  }
  /** Measured render speed per resolution (frames/s, from finished jobs), for the estimates. */
  function speeds() {
    const out: Record<number, number> = {};
    for (const r of RES) {
      const done = jobs().filter((j) => j.state === 'done' && j.res === r && j.seconds > 0);
      if (done.length) out[r] = done.reduce((a, j) => a + (j.renderedFrames ?? j.total) / j.seconds, 0) / done.length;
    }
    return out;
  }
  function spawnJob(id: string, video: string, res: number) {
    const log = openSync(path.join(dir, `${id}.render.log`), 'a');
    const child = spawn(process.execPath, [path.join(app, 'scripts', 'render-node.mjs'), '--video', video, '--res', String(res),
      '--out', path.join(dir, `${id}.mp4`), '--status', statusOf(id), '--private-server'],
    { cwd: app, detached: true, stdio: ['ignore', log, log], windowsHide: true });
    child.unref();
    return { id, pid: child.pid };
  }
  function resume(id: string) {
    const s = read(statusOf(id));
    if (!s) throw Object.assign(new Error('no such render'), { code: 404 });
    if (['starting', 'rendering', 'finishing'].includes(s.state) && alive(s.pid)) throw Object.assign(new Error('it is still rendering'), { code: 409 });
    const busy = jobs().find((j) => j.id !== id && ['starting', 'rendering', 'finishing'].includes(j.state));
    if (busy) throw Object.assign(new Error(`a render is already running (${busy.id})`), { code: 409 });
    return spawnJob(id, s.video, s.res);
  }
  function start(video: string, res: number) {
    if (!videos().some((v) => v.id === video)) throw Object.assign(new Error(`unknown video "${video}"`), { code: 400 });
    if (!RES.includes(res as (typeof RES)[number])) throw Object.assign(new Error(`resolution must be one of ${RES.join(', ')}`), { code: 400 });
    const busy = jobs().find((j) => ['starting', 'rendering', 'finishing'].includes(j.state));
    if (busy) throw Object.assign(new Error(`a render is already running (${busy.id}); one at a time keeps both fast`), { code: 409 });
    mkdirSync(dir, { recursive: true });
    const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
    const id = `${video || 'motion-as-code'}_${res}p_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return spawnJob(id, video, res);
  }
  function cancel(id: string) {
    const s = read(statusOf(id));
    if (!s) throw Object.assign(new Error('no such render'), { code: 404 });
    if (alive(s.pid)) {
      // the whole tree: node, its private dev server, Chrome and ffmpeg
      if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* already gone */ } }
      else { try { process.kill(-s.pid, 'SIGTERM'); } catch { try { process.kill(s.pid, 'SIGTERM'); } catch { /* gone */ } } }
    }
    const home = path.dirname(statusOf(id));
    for (const f of [`${id}.rendering.mp4`, `${id}.render.json`, `${id}.render.log`]) rmSync(path.join(home, f), { force: true });
    rmSync(path.join(home, `${id}.parts`), { recursive: true, force: true });
    if (s.state !== 'done') for (const f of [`${id}.mp4`, `${id}.chapters.txt`, `${id}.chapters.json`]) rmSync(path.join(home, f), { force: true });
  }
  function dismiss(id: string) {
    const s = read(statusOf(id));
    if (s && ['starting', 'rendering', 'finishing'].includes(s.state) && alive(s.pid)) throw Object.assign(new Error('still rendering: cancel it instead'), { code: 409 });
    const home = path.dirname(statusOf(id));
    for (const f of [`${id}.render.json`, `${id}.render.log`, `${id}.rendering.mp4`]) rmSync(path.join(home, f), { force: true });
    rmSync(path.join(home, `${id}.parts`), { recursive: true, force: true });
  }

  const body = (req: Connect.IncomingMessage) => new Promise<any>((res) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch { res({}); } });
  });
  return async (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/render')) return next();
    const send = (code: number, v: unknown) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(v)); };
    try {
      if (req.method === 'GET' && url.startsWith('/api/renders')) return send(200, { jobs: jobs(), videos: videos(), speeds: speeds() });
      if (req.method !== 'POST') return send(405, { error: 'POST only' });
      const b = await body(req);
      if (url.startsWith('/api/render/cancel')) { cancel(String(b.id ?? '')); return send(200, { ok: true }); }
      if (url.startsWith('/api/render/dismiss')) { dismiss(String(b.id ?? '')); return send(200, { ok: true }); }
      if (url.startsWith('/api/render/resume')) return send(200, resume(String(b.id ?? '')));
      if (url === '/api/render' || url.startsWith('/api/render?')) return send(200, start(String(b.video ?? ''), Number(b.res)));
      return send(404, { error: 'not found' });
    } catch (e: any) {
      return send(e?.code && Number.isInteger(e.code) ? e.code : 500, { error: String(e?.message ?? e) });
    }
  };
}
