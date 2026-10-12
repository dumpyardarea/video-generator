// Caption emphasis for EP01 and its Shorts: the ONE phrase per line that carries its point, set larger and kept in
// the signal green after it is said. Used sparingly on purpose (about one line in five, never two per line): if
// everything is highlighted, nothing is. Technical tokens (DNS, TCP, example.com, 404, "10 milliseconds") are
// handled by rule in _ep.ts (Plex Mono, the series' machine voice), so they are not listed here.
// Each entry: [a phrase of the line, the words to emphasise, exactly as in the script].
export const EMPH: [string, string][] = [
  // EP01
  ['In under a second', 'a dozen systems'],
  ['Your computer found a server', 'never met'],
  ['It agreed on a secret', 'out in the open'],
  ['Modern browsers try the secure', 'secure version first'],
  ['If the answer is yes', 'skip almost everything'],
  ["Computers don't find each other", 'numbers'],
  ['In the worst case', 'worst case'],
  ['rarely visits the root', 'rarely'],
  ['TCP makes sure every piece', 'in order'],
  ["That's the three-way handshake", 'three-way handshake'],
  ['The connection is open, but anything', 'could read it'],
  ['The key itself never crosses', 'never crosses the network'],
  ['But how does your browser know', 'impostor'],
  ['But a certificate is public', 'Anyone can send a copy'],
  ['Only the real example.com', 'Only'],
  ['Files from the same server reuse', 'reuse the connection'],
  ['But files from another server', 'repeat everything'],
  ['But one of my three runs', "isn't guaranteed"],
  ['I used to believe', 'slow server'],
  ['Almost all the waiting was round trips', 'round trips'],
  ['Most of the waiting was round trips', 'not servers'],
  // Short 1 · How DNS finds a website
  ["It can't use the name", 'a number'],
  ['So it usually knows', 'knows already'],
  // Short 2 · The TLS handshake, visualised
  ['Two computers that have never met', 'anyone can watch'],
  ['From the two halves', 'same secret key'],
  ['The key never crosses the network', 'never crosses the network'],
  ['So the server signs the handshake', 'only the real site'],
];
