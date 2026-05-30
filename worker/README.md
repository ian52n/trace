# Trace AI Worker

The generation backend for Trace. A Cloudflare Worker that, given a pin + distance + vibe, discovers real nearby POIs (Google Places), stitches a walking loop (Google Directions), resolves the city (Google Geocoding), and asks **Claude** to write an Atlas Obscura-style entry — then returns a finished run. It holds both API keys as server-side secrets, so nothing sensitive ships in the app.

See [`../docs/architecture.md`](../docs/architecture.md) for the full pipeline.

## Source

```
src/
├── index.ts    ← request handler + the build-measure-adjust route loop
├── google.ts   ← Google Places / Directions / Geocoding + polyline decode
├── geo.ts      ← POI selection (angular spread) and nearest-neighbor ordering
└── claude.ts   ← Atlas Obscura voice prompt + the Anthropic call
```

## Deploy

```sh
cd worker
npm install
npx wrangler login                            # opens a browser, sign in to Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY     # paste your Anthropic key
npx wrangler secret put GOOGLE_MAPS_API_KEY   # server key: Places + Directions + Geocoding enabled
npx wrangler deploy                            # prints your worker URL
```

Then put the URL in [`../mobile/src/config.ts`](../mobile/src/config.ts) (the React Native app) and/or [`../Trace/Config.swift`](../Trace/Config.swift) (the SwiftUI app).

> The `GOOGLE_MAPS_API_KEY` here is a **separate, server-side key** from the one the Android app uses for map tiles. Restrict it to the Places, Directions, and Geocoding APIs and leave it unrestricted by application (Cloudflare egress IPs rotate). It uses Google's classic endpoints — enable "Places API", "Directions API", and "Geocoding API" (not only the "(New)"/Routes variants).

## Contract

`POST /` accepts two shapes, distinguished by whether `pois` is present.

### Cross-platform (React Native) — full pipeline

```json
{ "lat": 40.7295, "lng": -73.9965, "distanceKm": 8, "vibe": "historic" }
```

Returns a complete run:

```json
{
  "title": "...",
  "hook": "...",
  "story": "paragraph one\n\nparagraph two\n\nparagraph three",
  "postRunMove": "...",
  "waypoints": [ { "lat": 40.73, "lng": -73.99, "label": "1", "note": "Our Lady of Pompeii Church" }, ... ],
  "distanceKm": 7.8,
  "city": "New York",
  "country": "United States"
}
```

`distanceKm` is the **actual measured** loop length, not the request. If no walkable loop near the requested length exists (e.g. an airport), `waypoints` is `[]` and the app draws a geometric loop of the requested size.

### Legacy (native iOS) — writeup only

The SwiftUI app runs `MKLocalSearch` / `MKDirections` on-device and posts the stops it already found:

```json
{
  "lat": 38.7262, "lng": -9.1727, "distanceKm": 8, "vibe": "historic",
  "cityHint": "Lisbon",
  "pois": [ { "name": "Aqueduto das Águas Livres", "distFromStartKm": 0.0 }, ... ]
}
```

When `pois` is non-empty the Worker skips the geo pipeline and just returns `{ title, hook, story, postRunMove }`. This keeps the original Swift app working against the same deployment.

Other routes: `GET /` is a health check; `OPTIONS /` is CORS preflight.

## Model

Uses `claude-opus-4-7` for editorial prose quality. Roughly a couple of cents per generation; a demo's worth costs cents. Claude latency dominates (~5–10s); the geo calls and the Worker itself add well under a second.

## Local dev

```sh
npx wrangler dev   # serves on http://localhost:8787
```

Secrets aren't available in `wrangler dev` unless you add a `.dev.vars` file (gitignored) with `ANTHROPIC_API_KEY=...` and `GOOGLE_MAPS_API_KEY=...`. A simulator can reach `http://localhost:8787`; a physical device on the same network needs your machine's LAN IP.
