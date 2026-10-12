// Thumbnails: a dedicated thumbnail plate (src/<series>/thumbs/<name>.ts) or any frame of a video, as a 1280x720
// PNG (YouTube's size), plus a 320x180 copy to check it reads at the size of a phone search result.
//
//   node scripts/thumbnail.mjs --video ep01 --plate a            # src/ep01/thumbs/a.ts → out/thumbs/ep01_a.png
//   node scripts/thumbnail.mjs --video ep01 --t 167.5            # the frame at 2:47.5 → out/thumbs/ep01_t167.5.png
//        [--out file.png] [--url http://localhost:5173]
//
// The plate renders at 2x (3840x2160) and is scaled down with lanczos, so type stays crisp. It uses the dev server
// at --url if it is up, else starts a private one.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(APP, '..');
const { chromium } = createRequire(path.join(APP, 'package.json'))('playwright-core');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const VIDEO = opt('video', ''), PLATE = opt('plate', ''), T = opt('t', '');
if (!VIDEO || (!PLATE && !T)) { console.error('usage: node scripts/thumbnail.mjs --video <id> (--plate <name> | --t <seconds>) [--out file.png]'); process.exit(2); }
if (VIDEO.startsWith('short-')) { console.error('Shorts take their thumbnail from a frame chosen in YouTube; this command makes 16:9 thumbnails.'); process.exit(2); }
const out = path.resolve(opt('out', path.join(ROOT, 'out', 'thumbs', `${VIDEO}_${PLATE || `t${T}`}.png`)));
mkdirSync(path.dirname(out), { recursive: true });

async function reachable(u) { try { return (await fetch(u, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } }
let server = null, url = opt('url', 'http://localhost:5173');
if (!(await reachable(url))) {
  const port = 5300 + Math.floor(Math.random() * 600);
  server = spawn(process.execPath, [path.join(APP, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: APP, stdio: 'ignore', env: { ...process.env, PDOOM_NO_HMR: '1' } });
  url = `http://localhost:${port}`;
  for (let i = 0; i < 300 && !(await reachable(url)); i++) await new Promise((r) => setTimeout(r, 100));
}
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true, args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=metal', '--force_high_performance_gpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.goto(`${url}/player.html?export=1&scale=2&video=${VIDEO}${PLATE ? `&thumb=${PLATE}` : ''}`);
  await page.waitForFunction(() => window.__pdoom?.ready || window.__pdoom?.error, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__pdoom.error || window.__pdoom.errors.join('\n'));
  if (err) throw new Error(err);
  const t = PLATE ? 0.5 : +T;
  await page.evaluate((t) => window.__pdoom.still(t, 8), t);
  const png = Buffer.from(await page.evaluate(() => window.__pdoom.png()), 'base64');
  const big = out.replace(/\.png$/, '.2160.png');
  writeFileSync(big, png);
  for (const [w, h, f] of [[1280, 720, out], [320, 180, out.replace(/\.png$/, '.320.png')]]) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', big, '-vf', `scale=${w}:${h}:flags=lanczos`, f]);
    if (r.status) throw new Error(`ffmpeg: ${r.stderr}`);
  }
  console.log(`${path.relative(ROOT, out)}  (1280x720; a 320x180 copy beside it to check it reads small; the 3840x2160 master is ${path.basename(big)})`);
} finally {
  await browser.close();
  server?.kill();
}
