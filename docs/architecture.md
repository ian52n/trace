# Architecture

How Trace's **Generate** tab turns a pin on a map into a story-driven run.

## Pipeline overview

```
User drops pin + picks distance + vibe
                  │
                  ▼
┌──────────────────────────────────────────┐
│  POIService.findPOIs                     │
│  4-tier MKLocalSearch with fallback      │
│  → up to 30 candidate POIs               │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  POIService.selectSpreadByAngle          │
│  Wedge selection at target radius        │
│  → 3-9 POIs (scaled to requested km)     │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  POIService.nearestNeighborOrder         │
│  → POIs ordered into a sensible loop     │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  RouteBuilder.buildLoop                  │
│  MKDirections walking routes between     │
│  consecutive POIs                        │
│  → Real polyline waypoints               │
└──────────────────────────────────────────┘
                  │
                  ▼
       (One refinement pass if
        actual distance is < 70%
        or > 150% of requested)
                  │
                  ▼
┌──────────────────────────────────────────┐
│  Cloudflare Worker (POST /)              │
│  Body: pois + measured distance + vibe   │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  Claude Opus 4.7 via Anthropic API       │
│  System: AO voice + JSON schema          │
│  → title, hook, story, postRunMove       │
└──────────────────────────────────────────┘
                  │
                  ▼
           Run object → detail screen
```

The whole thing is driven from `ClaudeAIService.generateRun(_:onProgress:)`. Each major stage emits a `GenerationStage` via the progress callback (`.searching → .routing → .writing`), and the loading overlay in the UI reflects what's actually happening rather than a fixed timer.

---

## Stage 1: POI search

[`Trace/Data/POIService.swift`](../Trace/Data/POIService.swift)

Four tiers. Each fires only if the previous one didn't produce enough unique POIs:

| Tier | Queries | Radius |
|------|---------|--------|
| 1 | Vibe-specific (e.g. `weird` → museum, statue, art gallery, unusual landmark) | base |
| 2 | Vibe-themed broader vocabulary (e.g. `weird` → scenic spot, monument, tower, fountain, plaza) | base |
| 3 | Cross-vibe — abandons vibe purity (park, trail, landmark, monument, museum, viewpoint, scenic spot, historic site, garden, church, library, lake, river, bridge, plaza, fountain) | base |
| 4 | Vibe-agnostic generics (point of interest, school, library, church, store, restaurant, post office, park, trail, landmark) | base × 1.5 |

`base = max(distanceKm × 1000 / π, 800m)`.

Each tier's queries run in parallel via `withTaskGroup`. The escalation threshold scales with run length:

| Distance | Min POIs |
|----------|----------|
| 5 km     | 3        |
| 8 km     | 3        |
| 12 km    | 5        |
| 16 km    | 6        |
| 21 km    | 8        |

Formula: `min(max(3, round(distanceKm / 2.5)), 8)`.

**Polygon fallback.** If even tier 4 can't produce 3 unique POIs, the route degenerates to a synthetic circle around the pin and the Claude prompt is told there are no named places to reference — so the story can't fabricate landmarks the user won't actually pass.

---

## Stage 2: POI selection

[`POIService.selectSpreadByAngle`](../Trace/Data/POIService.swift)

After the tiered search there are typically 6-30 candidate POIs. Picking the closest N produces a clustered loop near the pin (this was the first bug to fix). Instead:

1. Compute the target straight-line radius for the requested loop:
   ```
   targetRadiusKm = (distanceKm / (2π)) / 1.3
   ```
   The 1.3 deflates for the typical ratio of walking-route length to straight-line tour length. For a 16 km loop the target radius is ~1.96 km.

2. Score every candidate by `|actualDistance − targetRadius|` (lower = closer to ideal).

3. Sort by score; greedily select POIs that are at least `(360 / desiredCount) × 0.6` degrees apart in bearing from the pin. This forces angular spread instead of clustering.

4. If strict spreading misses too many (lopsided POI distribution — coastline, city edge), relax the angular separation by half and top up.

Desired POI count is `minimumPOIs + 1`.

---

## Stage 3: Loop ordering

[`POIService.nearestNeighborOrder`](../Trace/Data/POIService.swift)

A nearest-neighbor TSP heuristic starting from the user's pin. POIs come out in an order that minimizes backtracking. Good enough for prototype purposes; a proper TSP solver would do marginally better.

---

## Stage 4: Route building

[`Trace/Data/RouteBuilder.swift`](../Trace/Data/RouteBuilder.swift)

For each consecutive POI pair (and the closing leg back to POI 1):

1. Build an `MKDirections.Request` with `transportType = .walking`.
2. Take the resulting route's polyline coordinates.
3. Append them to the waypoint list. The first and last (which are the POI coordinates) get the POI name and a numeric label; intermediate points are unlabelled and only contribute to the polyline geometry.

Failure modes:
- If `MKDirections` finds no walking route for a leg (two POIs across water with no pedestrian path), that segment falls back to a straight line. The rest of the loop is still real walking geometry.
- Apple rate-limits `MKDirections` but generously enough that 6-8 sequential calls per generation is well within budget.

---

## Stage 5: Distance refinement

[`ClaudeAIService.buildBestLoop`](../Trace/Data/ClaudeAIService.swift)

After the first walking route is built, the actual polyline distance is measured. If it's well off the requested distance:

- **< 70% of target**: target radius × 1.5, desired count + 1, re-run stages 2-4.
- **> 150% of target**: target radius / 1.4, desired count − 1, re-run stages 2-4.
- **Otherwise**: keep the first attempt.

Exactly one refinement pass. Costs ~3-4 extra seconds of `MKDirections` calls but is well under the Claude latency. The route the user sees is whichever pass landed closer to the requested distance.

---

## Stage 6: Prompt construction

[`worker/src/index.ts`](../worker/src/index.ts)

**System prompt** sets the voice (Atlas Obscura — quirky, literary, dry, observational) and the JSON schema. Key rules:

- When given a POI list: reference them by name; do not invent additional named places.
- When not given a POI list: write about textures and types; do not invent named businesses, statues, or streets.
- Do not fabricate historical facts; generalize when unsure.

**User prompt** includes:

- Coordinates and city hint.
- **The actual measured route length**, with an explicit instruction to anchor the story to it ("do not write '10 km' if the loop is 4 km").
- The ordered POI list with cumulative km-from-start for each:
  ```
  1. Brooklyn Bridge (~0.0 km in)
  2. City Hall Park (~1.2 km in)
  3. South Street Seaport (~2.8 km in)
  ```
  So Claude can reference the rhythm of the run ("around the four-kilometer mark…").

---

## Worker architecture

[`worker/src/index.ts`](../worker/src/index.ts), ~150 lines of TypeScript.

- `POST /` — accepts `{lat, lng, distanceKm, vibe, cityHint?, pois?}`, returns `{title, hook, story, postRunMove}`.
- `GET /` — health check, returns `"Trace AI worker is alive."`.
- `OPTIONS /` — CORS preflight, in case anyone tests from a browser.

Deployed via `wrangler deploy`. The `ANTHROPIC_API_KEY` is a Worker secret uploaded via `wrangler secret put` — never on disk locally, never in the repo, never in the iOS binary.

Latency: typically 5-10s for the Claude call (Opus 4.7 is not fast). The Worker itself adds < 100ms.

---

## Service selection

[`Trace/Config.swift`](../Trace/Config.swift)

```swift
enum Config {
    static let aiWorkerURL: URL? = URL(string: "https://trace-ai.trace-demo.workers.dev")
}

enum AIServiceFactory {
    static func make() -> AIService {
        if let url = Config.aiWorkerURL {
            return ClaudeAIService(workerURL: url)
        }
        return MockAIService()
    }
}
```

If `aiWorkerURL` is nil, the app falls back to `MockAIService` with hand-written templates. The factory is the only place that knows about the choice; the rest of the app (views, store) just sees an `AIService`.

---

## Honest constraints baked into the data model

[`Trace/Models/Run.swift`](../Trace/Models/Run.swift)

```swift
struct Run {
    let distanceKm: Double         // always real (polyline-derived for generated runs)
    let elevationGainM: Int?       // nil for generated runs — we don't have elevation data
    let surface: Surface?          // nil for generated runs — we don't know
    // ...
}
```

The detail screen's facts row hides any field that's nil. Generated runs show only their measured distance. Curated runs (which keep their hand-set numbers) show all three. The choice is deliberate: shipping fabricated numbers in a content-led brand's prototype would be the wrong signal.
