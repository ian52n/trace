# Notes

Extended commentary on Trace — the design calls behind the prototype, what got cut, what's still rough, and what I'd reach for next. The short writeup at [WRITEUP.md](../WRITEUP.md) is what you actually asked for; this is for anyone curious enough to keep reading. For the SwiftUI → React Native port specifically, see [rebuild.md](rebuild.md).

## Why this shape

Three calls I made early and held:

- **Mobile-native, cross-platform.** The role title leads with "Mobile," and a runner reaching for this on a Tuesday morning is on their phone. The first cut was SwiftUI; the rebuild is React Native (Expo) so the same product ships on **iOS and Android** from one codebase — matching the stack in the job description and doubling the reachable audience for not much more code.

- **Story-first, not data-first.** Strava and Komoot already win on route data. They will never win on voice. So I optimized for the editorial layer: a serif typeface, generous whitespace, copy that earns its place. The demo lives or dies on whether the writing feels like Atlas Obscura.

- **AI as authorship, not as a chatbot.** The "AI-native" piece isn't a chat surface — it's a generator that produces in-voice content keyed to the user's actual location and intent. This is the bet I think Atlas Obscura should be making: AI that extends a strong editorial brand into places the editors haven't been yet. Claude isn't decorating an experience; it's writing entries for an atlas.

## The one big architectural call

The native app discovered POIs and stitched routes **on-device** with Apple's `MKLocalSearch` / `MKDirections` — fast, free, Apple-only. Those APIs don't exist on Android, so the cross-platform rebuild moves the whole geo pipeline **server-side** into the Worker (Google Places + Directions + Geocoding). Benefits: one code path, identical results on both platforms, the heavy work off the device, and the app stays a thin, fast client. The trade is a network round-trip and a Google bill (cents). Full reasoning in [rebuild.md](rebuild.md).

## What I cut

No accounts, no Strava import, no social, no onboarding, no settings, no GPS recording, no automated tests. Every cut bought time for the parts that make the demo feel like a real product: the typography, the curated content, the staged progress messages on the generate flow, the empty states, and the editorial bar of the AI output.

I also kept the prototype honest about what it doesn't know. Generated runs show only the measured distance — not faked elevation gain or surface type — because the app doesn't have that data, and shipping made-up numbers in a content-led brand's prototype would be the wrong signal. Curated runs keep those fields because I hand-set them.

## What got fixed along the way

- **Over-long generated routes.** Early on, a 21 km request near an airport could return a 140 km loop — walking routes balloon around runways, water, and highways. The Worker now measures the actual loop and tightens/widens up to three passes, and rejects anything still wildly off so the app falls back to a correct-length geometric loop. See [architecture.md → Stage 5](architecture.md#stage-5-distance-control).
- **Hero photos that wouldn't load.** The curated runs originally pulled photos from Wikimedia at runtime; Wikimedia returns HTTP 403 to app image loaders (okhttp/Fresco on Android, CFNetwork on iOS). The photos are now cropped to 16:9 and **bundled into the app**, so the feed renders instantly and offline.

## What's still rough

- **No error / empty state on generation failure.** If Claude or the Worker times out, the loading overlay just disappears silently.
- **Geometric fallback isn't walkable.** When the real-route guard rejects a loop (airports, waterfronts), the app draws a perfect circle of the right length — correct distance, but not a path you could actually run. Better than a 140 km route; still a placeholder.
- **POI selection on lopsided distributions.** When POIs cluster to one side of the pin, the angular-spread selector has a relaxed fallback, but extreme cases can still come out shorter than requested.

## What's next

- Update curated runs daily, and personalize them.
- POI categories factored into the prompt — sending Claude not just names but types ("historic site", "park", "viewpoint") so it can write more confidently about what each is.
- A "saved for trip" mode that groups runs by upcoming travel destination and surfaces them on the days you'll be there.
- A small lock-screen / home-screen widget that surfaces the next run on your trip.
- An elevation API so elevation gain is real instead of null.
- A "regenerate" button on AI-generated detail screens.
- Real photos for the curated runs from a properly licensed library (the current set are Wikimedia Commons CC-licensed — fine for a prototype, but a content-led brand would curate these themselves).
- Automated tests for the geometry and selection algorithms in `worker/src/geo.ts` — exactly the kind of pure functions that benefit from them.
