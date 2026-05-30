# Architecture

How Trace's **Generate** tab turns a pin on a map into a story-driven run.

In the cross-platform build the entire pipeline runs **server-side** in the Cloudflare Worker. The app sends a pin, a distance, and a vibe; the Worker discovers real POIs, stitches a walking loop, measures it, and asks Claude to write it up — then returns a finished run. Moving this off-device is what lets iOS and Android produce identical results (see [rebuild.md](rebuild.md) for why).

## Pipeline overview

```
App: drop pin + pick distance + vibe
   POST { lat, lng, distanceKm, vibe }
                  │
                  ▼  Cloudflare Worker (worker/src/index.ts)
┌──────────────────────────────────────────┐
│  findPOIs            (google.ts)          │
│  Google Places nearby search, vibe        │
│  keywords + generic fallback              │
│  → candidate POIs, deduped, by distance   │
└──────────────────────────────────────────┘
                  │
                  ▼   ┌─ refine up to 3× ──────────────┐
┌──────────────────────────────────────────┐           │
│  selectSpreadByAngle (geo.ts)            │           │
│  pick stops spread around the pin near    │           │
│  the target radius                        │           │
└──────────────────────────────────────────┘           │
                  ▼                                      │
┌──────────────────────────────────────────┐           │
│  nearestNeighborOrder (geo.ts)           │           │
│  order the stops into a sensible loop     │           │
└──────────────────────────────────────────┘           │
                  ▼                                      │
┌──────────────────────────────────────────┐           │
│  walkingLoop        (google.ts)          │           │
│  Google Directions walking route through  │           │
│  the stops → polyline + measured length   │           │
└──────────────────────────────────────────┘           │
                  ▼                                      │
        measure ratio = actual / requested              │
        0.6–1.5 → accept · too long → tighten ──────────┘
        too short → widen · still wild → reject
                  │
                  ▼
┌──────────────────────────────────────────┐
│  reverseGeocodeCity (google.ts)          │
│  pin → "City", "Country"                  │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  callClaude         (claude.ts)          │
│  AO voice + JSON schema, anchored to the  │
│  measured length and the named stops      │
│  → title, hook, story, postRunMove        │
└──────────────────────────────────────────┘
                  │
   { title, hook, story, postRunMove,
     waypoints, distanceKm, city, country }
                  │
                  ▼
   App builds a Run → detail screen
```

On the app side, [`mobile/src/services/aiService.ts`](../mobile/src/services/aiService.ts) makes the request and assembles the `Run`. It surfaces staged progress (`searching → routing → writing`) so the loading overlay reflects roughly what the Worker is doing rather than a fixed timer.

---

## Stage 1: POI search

[`worker/src/google.ts` → `findPOIs`](../worker/src/google.ts)

Google Places **Nearby Search**, keyed to the vibe:

| Vibe | Primary keywords |
|------|------------------|
| historic | historic site, monument, memorial, old church |
| nature | park, garden, trail, waterfront |
| weird | museum, statue, art gallery, unusual landmark |
| coffee | cafe, coffee shop, bakery |

Each vibe's keywords run in parallel. If the vibe-specific search is too sparse (< 4 unique places), it escalates to generic fallbacks (park, landmark, monument, viewpoint, plaza) so a thin area still yields a loop.

`base radius = max(distanceKm × 1000 / π, 800 m)`. Results are deduped by name, filtered to within `base × 1.5`, and sorted by distance from the pin.

---

## Stage 2: POI selection

[`worker/src/geo.ts` → `selectSpreadByAngle`](../worker/src/geo.ts)

Naïvely picking the closest N produces a loop clustered next to the pin. Instead:

1. Target straight-line radius for the requested loop:
   ```
   targetRadiusKm = (distanceKm / 2π) / 1.3
   ```
   The 1.3 deflates for the typical ratio of walking-route length to straight-line tour length.
2. Score each candidate by `|distanceFromPin − targetRadius|` (lower = better fit).
3. Greedily select stops at least `(360 / desiredCount) × 0.6` degrees apart in bearing — forcing angular spread instead of clustering.
4. If strict spreading is too sparse (lopsided distribution — coastline, city edge), relax the separation by half and top up.

Desired count scales with distance via `minimumPOIs` (3 stops for short runs, up to 8 for long ones), plus one.

---

## Stage 3: Loop ordering

[`worker/src/geo.ts` → `nearestNeighborOrder`](../worker/src/geo.ts)

A nearest-neighbor TSP heuristic starting from the pin, so the stops come out in an order that minimizes backtracking. Good enough for a prototype; a real TSP solver would do marginally better.

---

## Stage 4: Route building

[`worker/src/google.ts` → `walkingLoop`](../worker/src/google.ts)

One Google **Directions** call in `walking` mode: origin and destination are the first stop, the rest are intermediate waypoints, closing the loop. From the response it takes:

- the **overview polyline** (decoded to coordinates — the line drawn on the map),
- the **total length** (sum of leg distances — the run's real measured distance),
- the **cumulative distance at each stop** (so Claude can pace the story).

The decoded polyline becomes the waypoint list; each named stop labels its nearest polyline point so the detail screen can show numbered pins and a "what you'll pass" list.

---

## Stage 5: Distance control

[`worker/src/index.ts` → `buildRoute`](../worker/src/index.ts)

This is the guardrail that keeps a 21 km request from returning a 140 km loop. Walking routes near airports, water, or highways can balloon far past the straight-line estimate, so the Worker **measures and adjusts**:

- Build the loop, measure `ratio = actual / requested`.
- **0.6 ≤ ratio ≤ 1.5** → accept.
- **ratio > 1.5** (too long) → pull the radius in (`× 0.6`) and use fewer stops, retry.
- **ratio < 0.6** (too short) → spread out (`× 1.4`), add a stop, retry.
- Up to 3 passes (each is one Directions call); the closest-to-target pass is kept.
- It also never selects stops beyond `radius × 2.5`, so a sparse area can't pull in places tens of km away.

If even the best pass is still over **1.6×** the request (e.g. an airport with no walkable loop near that length), the Worker **rejects** the route and returns an empty one. The app then draws a correct-length geometric loop with a textures-only story — a sane fallback rather than a nonsensical distance.

---

## Stage 6: Prompt construction

[`worker/src/claude.ts`](../worker/src/claude.ts)

**System prompt** sets the voice (Atlas Obscura — quirky, literary, dry, observational) and the JSON schema. Key rules:

- Given a POI list: reference them by name; don't invent additional named places.
- Without one: write about textures and types; don't invent named businesses, statues, or streets.
- Never fabricate historical facts; generalize when unsure.

**User prompt** includes:

- Coordinates and the resolved city.
- The **actual measured route length**, with an explicit instruction to anchor the story to it ("do not write '10 km' if the loop is 4 km").
- The ordered stops with cumulative km-from-start:
  ```
  1. Our Lady of Pompeii Church (~0.0 km in)
  2. Patchin Place (~1.0 km in)
  3. St. Patrick's Old Cathedral (~2.1 km in)
  ```
  so Claude can reference the rhythm of the run ("around the two-kilometer mark…").

Model: **Claude Opus** (`claude-opus-4-7`) for editorial prose quality.

---

## Worker shape & backward compatibility

[`worker/src/index.ts`](../worker/src/index.ts)

The Worker accepts two request shapes, distinguished by whether the body carries a `pois` array:

- **Cross-platform (RN) path** — body is just `{ lat, lng, distanceKm, vibe }`. The Worker runs the full geo pipeline above and returns `{ title, hook, story, postRunMove, waypoints, distanceKm, city, country }`.
- **Legacy (native iOS) path** — the SwiftUI app runs `MKLocalSearch` / `MKDirections` on-device and sends a pre-built `pois` array. The Worker skips geo and just writes the entry, returning `{ title, hook, story, postRunMove }`. This keeps the original Swift app working against the same backend.

Other routes: `GET /` is a health check; `OPTIONS /` is CORS preflight.

Both API keys — `ANTHROPIC_API_KEY` and a server-side `GOOGLE_MAPS_API_KEY` (Places + Directions + Geocoding) — are Worker secrets set via `wrangler secret put`. They are never on disk locally, never in the repo, never in either app binary.

---

## Service selection & offline mock

[`mobile/src/config.ts`](../mobile/src/config.ts) · [`mobile/src/services/aiService.ts`](../mobile/src/services/aiService.ts)

`AI_WORKER_URL` in `config.ts` points at the deployed Worker. The `makeAIService()` factory returns the real `ClaudeAIService` when a URL is set, and a `MockAIService` (hand-written templates + a geometric loop) otherwise — so the app runs fully offline for demos. The factory is the only place that knows the difference; screens and the store just see an `AIService`.

If the Worker returns an empty `waypoints` array (the Stage 5 rejection), the client draws a geometric `circularLoop` of the requested length, so the map always shows a sensibly-sized loop.

---

## Honest constraints in the data model

[`mobile/src/models/run.ts`](../mobile/src/models/run.ts)

```ts
interface Run {
  distanceKm: number;            // always real (polyline-derived for generated runs)
  elevationGainM: number | null; // null for generated runs — no elevation source yet
  surface: Surface | null;       // null for generated runs — not inferred
  // ...
}
```

The detail screen hides any field that's null. Generated runs show only their measured distance; curated runs (with hand-set numbers) show all three. Shipping fabricated elevation or surface numbers in a content-led brand's prototype would be the wrong signal.
