# Hero delivery on a cold connection

## Observed problem

On 2026-10-01 (America/Phoenix), `https://toolor.store/ru` already returned
cache headers for its hero media. Caching did not solve a visitor's first load.
The player fetched a single sequential H.264 container: 4,779,959 bytes on
mobile (361 frames), 5,603,787 bytes on desktop (241 frames).

In Chromium, a cold-cache test at 5 Mbit/s download and 100 ms network latency
jumped to 90% of the hero immediately after the first canvas paint. The live
mobile hero took 6.88 seconds to reach the requested frame; desktop took 8.72
seconds. A local production build of the old code reproduced 7.00 seconds on
mobile under the same limit. This reproduced the network dependency independently
of Netlify. These are individual lab runs, not field percentiles.

## Implementation

- Each keyframe group is an independent static file (31 mobile, 21 desktop).
  The original H.264 samples, resolutions, codec settings and frame counts are
  byte-for-byte unchanged. `pnpm hero:package` verifies this when generating
  assets; the asset tests verify the checked-in results.
- The small manifest is bundled with the component. It does not require a
  separate network request. Current groups take precedence over speculative
  downloads, with at most two requests in flight and coalescing during fast
  scrolls. No MP4 demuxer, animation library or server endpoint is required.
- Compressed prefetch is limited to the current neighbourhood (three mobile
  groups on an idle first view, not all 31). Already visited compressed groups
  remain reusable, bounded by the size of the track. Only one speculative
  request runs, leaving room for an urgent seek.
- Reverse playback copies the original decoded pixel planes and immediately
  closes decoder-owned frames. There is no recompression, downscale or RGB
  round-trip. The cache is limited to two GOPs with a 128 MiB target: for these
  I420/NV12 tracks, two GOPs take about 71 MiB mobile / 127 MiB desktop. Browsers
  that cannot copy pixel planes use the original full-resolution canvas path
  (at least one GOP; a desktop RGBA GOP needs about 169 MiB). At most one spare
  canvas is retained. WebP fallback keeps three nearby decoded images and at
  most two in-flight requests, instead of all 96.
- Forward decoding has a two-frame look-ahead. Reverse decoding prepares the
  preceding GOP, but its flush never blocks presentation of already cached
  frames. Obsolete decoder output cannot reverse the visual scroll direction.
- Forward look-ahead retains the two already-decoded native frames instead of
  discarding them. A slow forward regression traversing 36 samples now submits
  36 unique decodes rather than 303 repeated decodes; disposal closes all frames.
- One animation loop updates scroll easing and commits the latest frame. Decoder
  bursts coalesce, while a synchronously cached frame paints in that same tick
  rather than waiting for a second animation callback. Source-aspect canvas
  buffers use CSS cover cropping, retain native pixels at high display density,
  and avoid buffer resets during toolbar-sized resizes when dimensions are stable.
- The large filtered hero wordmark no longer uses a blurred drop shadow. Its
  existing radial shade still provides contrast. In an isolated WebKit control,
  removing just this filter restored page animation-tick frequency to the
  blank-page baseline; removing only the header filter did not.
- Immutable segment URLs contain a hash of the complete encoded track. A new
  encode produces new URLs, so a year-long cache cannot keep an old video.
  Unversioned assets retain the shorter cache policy.
- Reduced motion and explicit Data Saver select the poster with visible copy
  and CTA. A changing browser estimate of connection speed no longer removes
  the canvas or changes
  the hero's height while the visitor scrolls.
- Failed/truncated current segments retry once, then use WebP fallback. Broken
  speculative neighbours do not disable a working track. Each video request
  has a 15-second timeout; still requests have an eight-second timeout.
- Offscreen and hidden-tab playback pauses and aborts requests. After 1.5
  seconds inactive, decoded caches and the decoder are released; compressed
  visited samples remain available on return. Navigating away releases both.
- Transient decoder errors/rejected promises rebuild the decoder. A three-second
  flush watchdog prevents a permanently pending GPU operation from freezing
  the hero. Repeated decoder failures switch to full-resolution stills.

The revised production runs reached the mobile target in 1.32–1.41 seconds
and the desktop target in 1.56 seconds under the same 5 Mbit/s / 100 ms setup.
The page's first paint and the native scroll easing are included in the scenario;
these measurements do not promise identical results on every phone or network.

The 2026-10-08 idle-prefetch budget is 467,218 bytes on mobile instead of
4,777,797 bytes for the whole track (90.2% less), and 846,048 bytes on desktop
instead of 5,602,195 (84.9% less). These are hero segment payloads only, not the
whole page or a promise that every seek is 90% faster.

One local production lab run on 2026-10-08 (390×844, 3× pixel ratio, a three-second
linear scroll per direction plus 700 ms settling) measured a 95th-percentile gap
between reverse canvas submissions of 66.9 ms in Chromium and 53 ms in WebKit.
The earlier audit of the old player measured 107.1 ms and 158 ms respectively.
These are submission gaps, not a guarantee of screen FPS. Chromium recorded no
Long Tasks during this run; that observer is not available in every engine.
With a cold 5 Mbit/s / 100 ms link, local first canvas paint took 2.18 seconds
from navigation and the subsequent seek to 90% took 0.99 seconds. Local timings
must not be represented as measurements of the deployed Netlify version.

## Verification and deployment

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, then the Playwright
suite against `pnpm start --port 3100` with
`PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e`.
The network regression deliberately stalls an early group while seeking to the
end, checks actual decoded frame indices, and then seeks back to the beginning.
Other checks cover missing segments, still fallback, reduced motion and resize.

Ship the application and generated `public/media/hero/tracks/` assets together.
For a self-hosted reverse proxy serving static files, mirror the immutable cache
policy for `/media/hero/tracks/`; `next start` sends it itself. Netlify rules are
in `netlify.toml`. Verify HTTP 200, expected sizes and Cache-Control on real
segment URLs after deployment, then repeat cold-cache and repeat-visit checks
on the public domain and on physical iOS/Android devices.

The 2026-10-08 regression suite exercises Chromium, WebKit and Firefox. It covers
missing/delayed segments, native decoded-pixel comparison after reverse seeking,
rapid direction changes, resize/breakpoint swaps, offscreen release and return,
Data Saver/reduced motion, a simulated decoder reset, pixel-plane-copy rejection,
and a delayed speculative flush. Hero tests use a 3× pixel ratio; the Chromium
slow-device scenario adds 4× CPU throttling and a cold 5 Mbit/s / 100 ms link.
Pixel comparison uses the same full canvas crop
and permits at most two channel units of rounding (mean below 0.5). Encoded
assets and source masters are unchanged.

Final checks: lint, strict TypeScript, 53 unit/component tests and the production
build passed. The full browser run passed 103 cases, with only the two non-CDP
CPU-emulation variants intentionally skipped. Focus, locale-cookie isolation,
reverse pixel quality and decoder rejection scenarios also passed three repeated
runs in each engine (36 additional executions).

Follow-up after reported perceptual jitter: lint, strict TypeScript, 54
unit/component tests and the production build passed. The next full browser
run, before shared-loop consolidation, passed 109 cases with the same two
intentional non-CDP skips. New checks
cover at most one hero draw per display tick, native mobile buffer geometry,
and the absence of the expensive wordmark filter.

After the shared-loop change, lint, strict TypeScript, all 54 unit/component
tests and a fresh production build passed again. The hero/store browser subset
passed 76 cases with the same two intentional non-CDP skips.

`pnpm hero:audit` samples actual frame changes at animation ticks, not just draw
callbacks. It reports a blank-page control, decoder submissions/flushes and
displayed-frame lag against the eased playhead. A five-second local mobile
Chromium sweep after the shared-loop change observed about 355 distinct forward
updates with a 17.3 ms p95 gap and a 0.5-frame p95 playhead difference (rounding
alone permits 0.5 frame). Reverse observed a 17.1 ms p95 gap. These are individual
lab runs, not field guarantees. Headless WebKit in this environment is limited
to about 30 animation ticks/s even on a blank page; the audit records that
baseline rather than attributing it to the player. Its mobile forward run and
Firefox reverse run still have longer gaps, so engine tests must not be presented
as proof that perceptual jitter is solved on every device.

A composed screenshot regression also checks for black WebKit tiles under the
header. The cause was a filtered decorative glow in the offscreen reviews block,
not corrupt video pixels. Replacing its blur layer with a radial gradient keeps
the decoration without the faulty offscreen filter surface.

These desktop engine checks, including mobile viewports, do not certify constant
frame rates on every physical iPhone/Android device. Browsers without WebCodecs
retain the existing 96-still fallback; it cannot reproduce the temporal density
of all 361/241 video frames. Hardware, network and supported codecs remain real
limits. Confirm on physical devices and the deployed CDN before claiming field
performance.

The source masters are 24 fps (361 mobile / 241 desktop frames). Exact scroll
scrubbing stretches those finite frames over however long the user takes: a
20-second complete mobile sweep cannot show more than about 18 different source
frames per second. Faster rendering cannot manufacture missing intermediate
motion. Changing to time-driven playback or synthesizing intermediate frames
would change the interaction or imagery and requires an explicit decision.

The 2026-10-08 changes are tested locally; they have not been redeployed to the
live site by this task.
