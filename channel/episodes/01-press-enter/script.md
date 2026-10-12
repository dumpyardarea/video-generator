# EP01: What actually happens when you press Enter on a URL

- **Target:** about 11 minutes (long-form, 16:9): ~8.8 min of narration (the DEMO RESULT lines included), plus ~1 min of silent demo footage in ch. 8, your take (~30 s) and slow-motion pauses on the handshakes (~40 s). Retarget to ~10 min if those come out shorter.
- **Format:** one line = one plate. Lines in `[YOUR TAKE: ...]` are yours to write and record. `[DEMO: ...]` lines are a real screen recording; `[DEMO RESULT: ...]` lines narrate the numbers measured (see `demo/README.md`, measured 11 Oct 2026 on Wikipedia's DNS article; when you film it, narrate the numbers you get).
- **Visual motif:** a journey map. The request is a glowing packet travelling across a stylised network; time slows down on every handshake.
- **Revised 11 Oct 2026** after the script-reviewer's notes, twice (`review.md`).

## Hook

You type a web address and press Enter.
A page appears.
I measured it: on my connection, Wikipedia's page about DNS took about 0.8 seconds.
In under a second, about a dozen systems took part before a single pixel appeared.
Your computer found a server it had never met.
It agreed on a secret with that server, out in the open.
So freeze the clock at the moment you press Enter, and follow the request there and back.

## 1. What did you type?

First, the browser decides what you typed: an address, or a search.
"cats" has no dot, so it goes to your search engine.
"example.com" looks like a domain name, so the browser treats it as an address.
Then it splits the address into parts.
The scheme says how to talk: https.
The host says who to talk to: example.com.
The path says what you want: slash, the home page.
You probably didn't type "https". Modern browsers try the secure version first.
And some sites are on a list built into the browser: never load these insecurely.
The packet is ready. Before it leaves, one more check.

## 2. Do we already have it?

First, a service worker, if the site has installed one.
That's a small script that can answer requests itself, even offline.
Then the browser's cache: have I loaded this recently, and did the server say I could keep it?
If the answer is yes, the browser can skip almost everything that follows.
That's why sites you visit every day feel faster than new ones.
For now, a first visit. Nothing is cached. The packet has to go out.

## 3. DNS: finding the address

Computers don't find each other by name. They use numbers, called IP addresses.
So the first question is: what's the IP address of example.com?
Finding it is the job of DNS, the Domain Name System.
The browser checks its own memory of recent lookups, then the operating system's.
If neither knows, the question goes to a DNS resolver: usually your internet provider's, or a public one you chose.
In the worst case, the resolver walks down a tree.
It asks a root server, which points to the servers for ".com".
It asks those, which point to the servers in charge of example.com.
And those servers, the authoritative ones, give the real answer: an IP address.
But the resolver keeps every answer for a while.
Each answer has a timer, called the TTL, that says how long.
And it serves thousands of people, so the top of the tree is almost always cached already.
So a real lookup rarely visits the root at all.
[DEMO RESULT: In my measurement, the whole DNS step took about 10 milliseconds. Something close by already knew the answer.]
Now we know where the server is. Next, we have to reach it.

## 4. TCP: making a connection

To send data reliably, the browser opens a connection using TCP.
TCP makes sure every piece of data arrives, in order, with nothing lost.
It starts with a three-step greeting.
Your computer sends a SYN: "Can we talk?"
The server replies with a SYN-ACK: "Yes. Can we talk?"
Your computer answers with an ACK: "Yes."
That's the three-way handshake.
It costs one full round trip to the server before any real data moves.
[DEMO RESULT: On my connection, one round trip to Wikipedia's servers was about 75 milliseconds.]
Some sites also offer HTTP/3, which runs over a newer protocol called QUIC and needs fewer round trips.
A browser usually learns that a site supports it from the site's first answer.
So HTTP/3 is usually used from the second visit on.
[DEMO RESULT: Wikipedia doesn't offer HTTP/3 yet, so every one of my visits used HTTP/2, over TCP.]

## 5. TLS: a secret, in public

The connection is open, but anything in between could read it: your Wi-Fi, your provider, every router on the path.
So before a single private byte is sent, the two sides set up encryption.
That's TLS, the "S" in HTTPS.
With TLS 1.3, the current version, the setup takes one round trip.
Your browser says hello, and lists the encryption methods it supports.
It also sends one half of a key exchange.
The server picks a method and sends the other half.
From the two halves, both sides calculate the same secret key.
The key itself never crosses the network. Anyone watching sees the halves, and can't work out the secret.
[DEMO RESULT: That handshake took about 80 milliseconds: one more round trip.]
But how does your browser know it's talking to the real example.com, and not an impostor?
The server sends its certificate.
The certificate says: this public key belongs to example.com. And a certificate authority has signed it.
But a certificate is public. Anyone can send a copy of it.
So the server also signs the handshake itself, with the private key that matches the certificate.
Only the real example.com has that private key.
The browser checks that signature.
It checks the certificate's chain of signatures back to an authority it trusts.
And it checks the name matches, and that the certificate hasn't expired.
If anything is wrong, you get a full-page warning.
If everything checks out, the connection is private from here on.
You might be looking for a padlock.
Chrome stopped showing it in 2023, and Safari in 2025.
A secure connection is now the normal case, so they only warn you when one isn't.

## 6. HTTP: asking for the page

Now the browser can finally ask for what it wants. It sends an HTTP request.
The method: GET. "Please send me this."
The path: slash, the home page.
Then headers: which site it's for, and which languages and formats you accept.
And, if you've been here before, the cookies this site gave you.
On the server, a program reads the request and decides what to send back.
It might be a file that's ready. It might be a page made just now, from a database.
The response starts with a status code.
200 means: OK, here it is.
301 means: this has moved permanently.
The browser then starts again at the new address.
404 means: there's nothing here.
After the status come headers: what kind of content this is, and how long it may be kept.
Then the body: the HTML of the page, usually compressed.
[DEMO RESULT: Then about 90 milliseconds of waiting. Most of that is one more round trip. The server itself took only about 15.]
[DEMO RESULT: The first byte arrived about a quarter of a second after I pressed Enter.]

## 7. Everything else on the page

The HTML is only the start.
It points to other files: stylesheets, scripts, images, fonts.
The browser starts fetching them while it's still reading, the moment it sees each one.
Files from the same server reuse the connection we already set up. No new DNS, no new handshakes.
But files from another server repeat everything: DNS, TCP, TLS.
And most pages load from several servers: images, fonts, analytics, video.

## 8. The real waterfall

[DEMO: In a fresh Chrome profile (or a guest window), Chrome DevTools, Network tab, "Disable cache" ticked. Load https://en.wikipedia.org/wiki/Domain_Name_System. Hover the first request's waterfall bar to show its phases. (DevTools' "Initial connection" includes the TLS time: expect about 160 ms there, next to about 80 ms for SSL.)]
[DEMO RESULT: The first request: DNS about 10 milliseconds. The connection about 160, and half of that is TLS. Waiting about 90.]
[DEMO RESULT: That's about 160 milliseconds of handshakes before the page could even be asked for: more than half the wait for the first byte.]
[DEMO: Point at the rows from en.wikipedia.org after the first one: no DNS, no connection phase.]
[DEMO RESULT: Every other file from en.wikipedia.org reused that first connection.]
[DEMO: Point at the upload.wikimedia.org row that shows the connection phases.]
[DEMO RESULT: The images come from a second server, upload.wikimedia.org, and it repeated everything: its own DNS, and about 160 milliseconds of TCP and TLS.]
[DEMO RESULT: The page appeared at about 0.7 seconds, and finished loading at about 0.8.]
[DEMO RESULT: But one of my three runs took almost 6 seconds: the page itself was slow to arrive. "Instant" isn't guaranteed.]
[DEMO: Reload straight away, without "Disable cache".]
[DEMO RESULT: Reloaded straight away: no DNS, no new connection, because the old one was still open. First byte in 79 milliseconds, loaded in 0.3 seconds.]
[YOUR TAKE (chosen 11 Oct 2026, option d; swap any time): I used to believe a slow site always meant a slow server.]
[YOUR TAKE: But when I measured it, Wikipedia's server answered in about 15 milliseconds.]
[YOUR TAKE: Almost all the waiting was round trips: the handshakes, and the request and the answer crossing the network.]
[YOUR TAKE (option h): I haven't had a serious DNS or certificate problem myself yet. But I've seen "DNS_PROBE_FINISHED_NXDOMAIN" and certificate warnings while browsing, and now I know what's going wrong behind them.]
(Other options you were given: a, b, c, e, f, g. If one of e, f or g really happened to you, it can replace option h.)

## 9. And then, pixels

At this point the browser has the HTML, the styles and the scripts. It still has to draw.
How it turns code into pixels is a story of its own: the next video.

## The whole trip

Pressing Enter set off about a dozen systems.
The browser read what you typed, and checked what it already had.
DNS turned a name into an address, from a cache, in about 10 milliseconds.
TCP opened a connection: one round trip.
TLS made it private, and the server proved it was really itself: one more round trip.
HTTP asked for the page, and the server answered.
Then every other file came in, over that connection, or over new ones to other servers.
Most of the waiting was round trips, not servers.
On my connection, all of that took about 0.8 seconds.
The next time a page loads, you'll know where those 0.8 seconds went.
