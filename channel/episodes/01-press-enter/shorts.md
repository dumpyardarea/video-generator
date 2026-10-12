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
