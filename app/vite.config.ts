import { defineConfig, normalizePath, type Plugin } from 'vite';
import { cpSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { renderJobs } from './scripts/render-jobs.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');
const assetDirs = ['audio', 'data'];
// renders: served to the dev server's library page (index.html), never copied into builds
const devDirs = ['out'];
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

interface LibNode { name: string; path: string; type: 'dir' | 'file'; size?: number; mtime?: number; children?: LibNode[] }
/** The video files under a directory as a tree (folders without videos are left out). */
function scanVideos(abs: string, rel = ''): LibNode[] {
  let entries: string[] = [];
  try { entries = readdirSync(abs); } catch { return []; }
  const out: LibNode[] = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const a = path.join(abs, name), r = rel ? `${rel}/${name}` : name;
    let st;
    try { st = statSync(a); } catch { continue; }
    if (st.isDirectory()) {
      // a render's chapter segments: only the one being rendered (watchable) is shown
      const children = scanVideos(a, r).filter((c) => !name.endsWith('.parts') || /\.rendering\.mp4$/.test(c.name));
      if (children.length) out.push({ name, path: r, type: 'dir', mtime: st.mtimeMs, children });
    } else if (VIDEO_EXT.test(name)) out.push({ name, path: r, type: 'file', size: st.size, mtime: st.mtimeMs });
  }
  return out.sort((x, y) => (x.type === y.type ? x.name.localeCompare(y.name, undefined, { numeric: true }) : x.type === 'dir' ? -1 : 1));
}

// Git can check out directory symlinks as plain files on Windows. Serve the
// original assets through Vite and copy them into builds without using symlinks.
function repoAssets(): Plugin {
  return {
    name: 'repo-assets',
    configureServer(server) {
      // render jobs started from the library page
      server.middlewares.use(renderJobs(import.meta.dirname, repoRoot));
      // the library page's listing of rendered videos
      server.middlewares.use('/api/library', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ name: 'out', path: '', type: 'dir', children: scanVideos(path.join(repoRoot, 'out')) }));
      });
      server.middlewares.use((req, _res, next) => {
        if ([...assetDirs, ...devDirs].some((dir) => req.url?.startsWith(`/${dir}/`))) {
          req.url = `/@fs/${encodeURI(normalizePath(repoRoot))}${req.url}`;
        }
        next();
      });
    },
    writeBundle(options) {
      if (!options.dir) return;
      for (const dir of assetDirs) {
        cpSync(path.join(repoRoot, dir), path.join(options.dir, dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [repoAssets()],
  // PDOOM_NO_HMR=1: no live reload (export renders must not reload mid-run when a file changes)
  server: { port: 5173, strictPort: false, hmr: process.env.PDOOM_NO_HMR ? false : undefined, fs: { allow: [repoRoot] } },
  resolve: { alias: { '@root': repoRoot } },
  build: {
    target: 'esnext', assetsInlineLimit: 0,
    rollupOptions: { input: { library: path.resolve(import.meta.dirname, 'index.html'), player: path.resolve(import.meta.dirname, 'player.html') } },
  },
});
