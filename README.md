# Trace

A travel app for passionate runners. **Runs as destinations** — not routes overlaid on cities.

Built for the Atlas Obscura AI-Native Mobile & Product Engineer take-home.

📄 [WRITEUP.md](WRITEUP.md) — the product reasoning behind what's here.
🏗 [docs/architecture.md](docs/architecture.md) — how the AI generator works under the hood.

| Discover | Generate | A run, generated end-to-end |
|---|---|---|
| ![Discover feed](docs/screenshots/discover.png) | ![Generate inputs](docs/screenshots/generate.png) | ![Generated run detail](docs/screenshots/detail-generated.png) |
| The curated atlas. Real photos, AO-style cards. | Drop a pin, pick a distance and a vibe. | A real walking loop through real POIs, with Claude's writeup. |

## What it is

Two-feature SwiftUI prototype:

1. **Discover** — a curated, story-driven feed of iconic and hidden runs around the world. Each entry is hand-written in Atlas Obscura voice: a hook, a story, what you'll pass, a post-run move.

2. **Generate** — drop a pin, pick a distance and a vibe, and the app builds a real walking-route loop, then writes an Atlas Obscura-style entry for it. The route uses `MKLocalSearch` to find real nearby POIs, `MKDirections` to thread walking paths between them, and **Claude Opus 4.7** (via a server-side Cloudflare Worker proxy) to write the story anchored to the actual measured route.

## Quick run

In the simulator — one command after cloning:

```sh
open Trace.xcodeproj
```

Then ⌘R in Xcode against any iOS 17+ simulator (built with Xcode 26.5; iPhone 17 Pro Max is what the screenshots above are from). The Cloudflare Worker is already deployed at the URL baked into [`Trace/Config.swift`](Trace/Config.swift), so the Generate tab calls Claude out of the box — no keys, no env vars, no Worker redeploy.

### On a physical device

The committed project is signed against my Apple Developer team (`LT3456KW44`). To run on your own device, open the project in Xcode and change the team under **Trace → Signing & Capabilities → Team** to your own. iOS 17+.

### Regenerating the project from source

The `.xcodeproj` is committed for one-command setup, but it's actually generated from [`project.yml`](project.yml) via [xcodegen](https://github.com/yonaskolb/XcodeGen):

```sh
brew install xcodegen
xcodegen generate
```

Run this if you change `project.yml` (e.g. swapping the development team).

## Where to read

Suggested order, fastest to depth:

1. [Trace/Models/Run.swift](Trace/Models/Run.swift) — the domain model. One struct.
2. [Trace/Data/curated_runs.json](Trace/Data/curated_runs.json) — the 5 hand-written runs.
3. [Trace/Data/AIService.swift](Trace/Data/AIService.swift) — the AI contract + offline fallback (`MockAIService`).
4. [Trace/Data/ClaudeAIService.swift](Trace/Data/ClaudeAIService.swift) — the real generator. POI search → wedge selection → walking-route stitching → Claude. This is the most interesting file.
5. [Trace/Data/POIService.swift](Trace/Data/POIService.swift) — 4-tier MKLocalSearch with distance-scaled minimums and angular-spread selection.
6. [Trace/Data/RouteBuilder.swift](Trace/Data/RouteBuilder.swift) — `MKDirections` walking-route stitching between POIs.
7. [worker/src/index.ts](worker/src/index.ts) — the ~150-line Cloudflare Worker that holds the Anthropic key and prompts Claude.
8. [Trace/Features/Detail/RunDetailView.swift](Trace/Features/Detail/RunDetailView.swift) — the detail screen.

[docs/architecture.md](docs/architecture.md) has the pipeline diagram and the design decisions behind each stage.

## Repo layout

```
.
├── README.md
├── WRITEUP.md
├── docs/architecture.md
├── project.yml                ← xcodegen spec; the Xcode project is generated from this
├── Trace/                     ← iOS app
│   ├── App/                   ← @main, root TabView
│   ├── Models/                ← Run, Waypoint, Vibe, BestTime, Surface
│   ├── UI/                    ← Theme.swift (typography, palette)
│   ├── Data/                  ← Stores and services (AI, POI, RouteBuilder)
│   ├── Features/
│   │   ├── Discover/          ← Feed + card
│   │   ├── Detail/            ← Run detail + route map
│   │   └── Generate/          ← AI generation flow
│   ├── Config.swift           ← Worker URL + service-selection factory
│   └── Assets.xcassets/
└── worker/                    ← Cloudflare Worker for AI generation
    ├── src/index.ts
    ├── wrangler.toml
    └── package.json
```

## What's intentionally not here

No accounts, no Strava import, no social, no onboarding, no settings, no live GPS recording, no app icon, no real hero photos (gradient placeholders), no automated tests.

The brief was "make one slice feel great." This slice is _runs as destinations + AI-authored runs grounded in real geography_. Everything else got cut to spend the time on the editorial bar of the curated content and the AI generation pipeline.
