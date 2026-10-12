// Generated from channel/episodes/01-press-enter/demo/waterfall_wikipedia-dns.json (run 1, cold). Do not edit by hand.
export interface Row { host: string; path: string; type: string; start: number; end: number; dns: number; tcp: number; tls: number; wait: number; reused: boolean }
export const RUN1: Row[] = [
  { host: "en.wikipedia.org", path: "/wiki/Domain_Name_System", type: "Document", start: 0.0, end: 454.4, dns: 13.6, tcp: 76.8, tls: 82.6, wait: 91.4, reused: false },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Stylesheet", start: 281.6, end: 481.8, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 185.9, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Script", start: 281.8, end: 506.9, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 218.1, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Stylesheet", start: 281.9, end: 486.1, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 201.9, reused: true },
  { host: "en.wikipedia.org", path: "/static/images/icons/enwiki-25.svg", type: "Image", start: 282.0, end: 530.9, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 229.8, reused: true },
  { host: "en.wikipedia.org", path: "\u2026ight/wikipedia-wordmark-en-25.svg", type: "Image", start: 282.0, end: 490.3, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 206.5, reused: true },
  { host: "en.wikipedia.org", path: "\u2026right/wikipedia-tagline-en-25.svg", type: "Image", start: 282.1, end: 534.8, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 245.6, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Image", start: 489.0, end: 567.1, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 77.0, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Image", start: 492.4, end: 574.2, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 80.6, reused: true },
  { host: "en.wikipedia.org", path: "\u2026kins.vector.styles/images/arrow-d", type: "Image", start: 492.5, end: 574.5, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 81.0, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Image", start: 492.8, end: 574.8, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 81.3, reused: true },
  { host: "en.wikipedia.org", path: "\u2026kins.vector.styles/images/link-ex", type: "Image", start: 493.4, end: 575.0, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 81.1, reused: true },
  { host: "en.wikipedia.org", path: "\u2026skinning/images/magnify-clip-ltr.", type: "Image", start: 495.0, end: 575.2, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 79.5, reused: true },
  { host: "upload.wikimedia.org", path: "\u2026a/commons/a/aa/Lock-red-alt-2.svg", type: "Image", start: 498.0, end: 754.9, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 82.0, reused: true },
  { host: "upload.wikimedia.org", path: "\u2026pedia/commons/6/65/Lock-green.svg", type: "Image", start: 498.1, end: 752.5, dns: 16.3, tcp: 77.0, tls: 79.1, wait: 79.5, reused: false },
  { host: "upload.wikimedia.org", path: "\u2026ia/commons/4/4d/Icon_pdf_file.png", type: "Image", start: 498.2, end: 752.8, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 80.1, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Script", start: 632.1, end: 715.8, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 80.4, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Script", start: 634.0, end: 723.2, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 87.7, reused: true },
  { host: "en.wikipedia.org", path: "/w/load.php", type: "Script", start: 634.4, end: 780.1, dns: 0.0, tcp: 0.0, tls: 0.0, wait: 94.0, reused: true },
];
export const NAV1 = { ttfb: 266.4, dcl: 626.2, load: 785.6, fcp: 716.0 };
/** Total load (ms) of the three cold runs and the immediate reload; run 3's HTML took 3.4 s to arrive. */
export const RUNS = { cold: [785.6, 773.0, 5900.7], warm: 294.9, warmTtfb: 78.9, slowHtmlEnd: 3380.6, slowTtfb: 562.3 };
