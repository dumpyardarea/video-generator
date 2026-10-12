// EP02 demo: where the time between first byte and first paint goes, on your own machine.
//
//   cd app && bun install            (once; it brings playwright-core)
//   node ../channel/episodes/02-code-to-pixels/demo/trace.mjs
//
// Loads the same page as EP01's waterfall in Google Chrome (headless, a fresh browser and profile each run, so a
// cold first visit), records a Performance trace (the data DevTools' Performance panel draws), and writes, next to
// this file:
//   trace_run<N>.json            each raw trace (open it in DevTools → Performance → Load profile)
//   trace_summary.json           the numbers the script uses, per run
// and prints a table. Options: --url <page>  --runs <n>  --chromium (use Playwright's Chromium, not Chrome).
import { chromium } from '../../../../app/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('url', 'https://en.wikipedia.org/wiki/Domain_Name_System');
const RUNS = Number(arg('runs', 3));
const CHANNEL = process.argv.includes('--chromium') ? undefined : 'chrome';
const EXE = arg('exe', undefined); // a browser binary, if Playwright can't find one
const CATEGORIES = [
  'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame',
  'blink.user_timing', 'loading', 'v8.execute', 'blink', 'cc', 'gpu', 'toplevel',
];
// trace event name → the pipeline stage it belongs to (main-thread work; raster is counted separately)
const STAGE = {
  ParseHTML: 'parse HTML', ParseAuthorStyleSheet: 'parse CSS',
  EvaluateScript: 'script', 'v8.compile': 'script', 'v8.compileModule': 'script', FunctionCall: 'script', EventDispatch: 'script', TimerFire: 'script', 'v8.evaluateModule': 'script',
  UpdateLayoutTree: 'style', RecalculateStyles: 'style',
  Layout: 'layout',
  PrePaint: 'paint', Paint: 'paint', PaintImage: 'paint', UpdateLayer: 'paint', Layerize: 'paint',
  CompositeLayers: 'composite', Commit: 'composite',
};

function summarise(events) {
  const meta = events.filter((e) => e.ph === 'M' && e.name === 'thread_name');
  const main = meta.filter((e) => e.args?.name === 'CrRendererMain').map((e) => `${e.pid}:${e.tid}`);
  const rasterT = new Set(meta.filter((e) => /Compositor|Raster|TileWorker/i.test(e.args?.name ?? '')).map((e) => `${e.pid}:${e.tid}`));
  // navigation start and first contentful paint (blink marks), first byte of the HTML
  const nav = events.find((e) => e.name === 'navigationStart' && e.args?.data?.isLoadingMainFrame && /^https?:/.test(e.args.data.documentLoaderURL ?? ''));
  if (!nav) throw new Error('no navigationStart in the trace');
  const t0 = nav.ts, frame = nav.args.frame;
  const mark = (n) => events.find((e) => e.name === n && (!e.args?.frame || e.args.frame === frame) && e.ts >= t0);
  const fcp = mark('firstContentfulPaint'), fp = mark('firstPaint'), dcl = mark('domContentLoadedEventEnd') ?? mark('MarkDOMContent');
  const docReq = events.find((e) => e.name === 'ResourceSendRequest' && e.args?.data?.url === URL_ && e.ts >= t0);
  const docRes = docReq && events.find((e) => e.name === 'ResourceReceiveResponse' && e.args?.data?.requestId === docReq.args.data.requestId);
  const ttfb = docRes ? (docRes.args.data.timing ? docRes.args.data.timing.receiveHeadersEnd : (docRes.ts - t0) / 1000) : null;
  const end = (fcp ?? fp).ts;
  // main-thread work between first byte and first paint, by stage (only the outermost event of each kind counts)
  const from = t0 + (ttfb ?? 0) * 1000;
  const byStage = {};
  const mainKey = new Set(main);
  const xs = events.filter((e) => e.ph === 'X' && STAGE[e.name] && mainKey.has(`${e.pid}:${e.tid}`) && e.ts < end && e.ts + (e.dur ?? 0) > from)
    .sort((a, b) => a.ts - b.ts);
  const open = [];
  for (const e of xs) {
    while (open.length && open[open.length - 1].ts + open[open.length - 1].dur <= e.ts) open.pop();
    const st = STAGE[e.name];
    if (!open.some((o) => STAGE[o.name] === st)) {
      const d = Math.min(e.ts + e.dur, end) - Math.max(e.ts, from);
      byStage[st] = (byStage[st] ?? 0) + Math.max(0, d) / 1000;
    }
    open.push(e);
  }
  const raster = events.filter((e) => e.ph === 'X' && /RasterTask|GPUTask/.test(e.name) && rasterT.has(`${e.pid}:${e.tid}`) && e.ts < end && e.ts > from)
    .reduce((s, e) => s + e.dur / 1000, 0);
  // render-blocking requests (stylesheets and parser-blocking scripts), with when they finished
  const blocking = events.filter((e) => e.name === 'ResourceSendRequest' && e.ts >= t0 && /blocking/.test(e.args?.data?.renderBlocking ?? ''))
    .map((e) => {
      const fin = events.find((f) => f.name === 'ResourceFinish' && f.args?.data?.requestId === e.args.data.requestId);
      return { url: e.args.data.url, kind: e.args.data.renderBlocking, start: +((e.ts - t0) / 1000).toFixed(1), end: fin ? +((fin.ts - t0) / 1000).toFixed(1) : null };
    });
  const r = (x) => (x == null ? null : +x.toFixed(1));
  const work = Object.values(byStage).reduce((a, b) => a + b, 0);
  return {
    ttfb: r(ttfb), firstPaint: r(fp && (fp.ts - t0) / 1000), fcp: r(fcp && (fcp.ts - t0) / 1000), dcl: r(dcl && (dcl.ts - t0) / 1000),
    gap: r((end - from) / 1000), mainThread: Object.fromEntries(Object.entries(byStage).map(([k, v]) => [k, r(v)])), mainThreadTotal: r(work),
    idleOrWaiting: r((end - from) / 1000 - work), rasterOffMain: r(raster), renderBlocking: blocking,
  };
}

const out = [];
for (let i = 1; i <= RUNS; i++) {
  const browser = await chromium.launch({ channel: EXE ? undefined : CHANNEL, executablePath: EXE, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const file = path.join(HERE, `trace_run${i}.json`);
  await browser.startTracing(page, { path: file, categories: CATEGORIES, screenshots: false });
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const buf = await browser.stopTracing();
  await browser.close();
  const trace = JSON.parse(buf.toString());
  const s = summarise(trace.traceEvents ?? trace);
  out.push({ run: i, ...s });
  console.log(`run ${i}: first byte ${s.ttfb} ms, first contentful paint ${s.fcp} ms (gap ${s.gap} ms; main thread busy ${s.mainThreadTotal} ms)`);
}
writeFileSync(path.join(HERE, 'trace_summary.json'), JSON.stringify({ url: URL_, measured: new Date().toISOString(), browser: CHANNEL ?? 'chromium', runs: out }, null, 1));
console.log('\nbetween first byte and first paint, main thread (ms):');
const stages = [...new Set(out.flatMap((o) => Object.keys(o.mainThread)))];
console.table(Object.fromEntries(stages.map((k) => [k, Object.fromEntries(out.map((o) => [`run ${o.run}`, o.mainThread[k] ?? 0]))])));
console.log(`wrote trace_run1..${RUNS}.json and trace_summary.json in ${HERE}`);
