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
- All compressed groups may be cached; decoded full-resolution canvases are
  limited to one or two GOPs with a 128 MiB target (one 1440p GOP needs ~169 MiB).
  There is only one spare canvas; its buffer is reused. WebP fallback keeps
  three decoded images and at most two in-flight requests instead of all 96.
- Immutable segment URLs contain a hash of the complete encoded track. A new
  encode produces new URLs, so a year-long cache cannot keep an old video.
  Unversioned assets retain the shorter cache policy.
- Reduced motion and explicit Data Saver still select the poster. A changing
  browser estimate of connection speed no longer removes the canvas or changes
  the hero's height while the visitor scrolls.
- Failed/truncated segments retry once, then use WebP fallback. Each video
  request has a 15-second timeout. Navigating away aborts pending downloads.

The revised production runs reached the mobile target in 1.32–1.41 seconds
and the desktop target in 1.56 seconds under the same 5 Mbit/s / 100 ms setup.
The page's first paint and the native scroll easing are included in the scenario;
these measurements do not promise identical results on every phone or network.

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

Chromium and WebKit desktop engines were also exercised at a 390×844 viewport
and 3× pixel ratio in both scroll directions. Neither reported JavaScript
errors. WebKit's reverse decode cadence remained slower than Chromium's; these
engine checks do not certify a constant frame rate on physical iPhones. The
available Playwright installation had no matching Firefox binary.

At implementation time the revised build was tested locally; the live site had
not yet been redeployed with these changes.
