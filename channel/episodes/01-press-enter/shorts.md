# EP01 Shorts (9:16, vertical)

Revised 11 Oct 2026 after the script-reviewer's notes (`review.md`).

## Short 1: How DNS finds a website
- **From:** EP01, chapter 3 · **Target:** about 45 seconds (no time in the title: the Hindi track runs longer)

How does your computer find a website it has never visited?
It can't use the name. It needs a number: an IP address.
Finding it is the job of DNS.
First, your browser and your operating system check if they already know.
If not, the question goes to a DNS resolver, usually your internet provider's.
The resolver can walk down a tree: the root, then ".com", then the site's own servers.
But it keeps every answer until its timer runs out, and it serves thousands of people.
So it usually knows already.
For Wikipedia, I measured it: about 10 milliseconds, from a cache.
The full trip, from Enter to page, is in the long video.

## Short 2: The TLS handshake, visualised
- **From:** EP01, chapter 5 · **Target:** about 50 seconds

Two computers that have never met agree on a secret, while anyone can watch.
Your browser sends hello, and one half of a key exchange.
The server sends back the other half.
From the two halves, both sides calculate the same secret key.
The key never crosses the network. Watchers see only the halves.
But is it the real server? It sends its certificate: this public key belongs to this site, signed by an authority.
A certificate is public, though. Anyone could send a copy.
So the server signs the handshake with its private key, the one only the real site has.
Your browser checks that signature, and the certificate's chain, name and expiry date.
All of that takes a single round trip.
How this fits into everything that happens after you press Enter: the full video.

## Short 3: Where 0.8 seconds actually goes
- **From:** EP01, chapter 8 (the real waterfall) · **Target:** about 45 seconds
- **Drafted 12 Oct 2026, revised after the script-reviewer's notes.** Numbers from `demo/README.md` (run 1, cold). Line 6 is your take from chapter 8 (option d), in your own words; swap it if you prefer another.
- **On screen:** one vertical waterfall bar for the first request, growing phase by phase, with the clock above it.

| # | Line | On screen |
|---|---|---|
| 1 | Wikipedia's server answered in about 15 milliseconds. So why did the page take 800? | "~15 ms" small, "800 ms" large; an empty, tall timeline |
| 2 | I measured it: Wikipedia's page about DNS, in Chrome, on my connection. | the address, then the timeline's scale in milliseconds |
| 3 | Finding the server's address took about 10 milliseconds. | a thin DNS slice, labelled 14 ms (run 1) |
| 4 | Opening a connection: 75 milliseconds. Making it private: 80. | TCP and TLS slices |
| 5 | Each is one trip there and back. | a there-and-back arc on each slice |
| 6 | Then 90 milliseconds of waiting. | the wait slice splits: "~75 network · ~15 server" |
| 7 | I used to believe a slow site always meant a slow server. | "slow server?" set large, then struck out |
| 8 | But before the first byte, almost all the time was round trips: the network, not the server. | TCP, TLS and the network part of the wait light together: about 230 of the first 266 ms (DNS not lit) |
| 9 | And the images came from a second server, so it paid for its own lookup and both handshakes again. | a second column of about the same height repeats DNS, TCP and TLS |
| 10 | The rest of the 0.8 seconds is the page itself arriving and being drawn. | the bar extends to 786 ms: files and paint, dimmer |
| 11 | Every one of those steps, slowed down, is in the full video. | the full map, the packet at the laptop |
