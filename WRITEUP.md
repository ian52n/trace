# Trace — Writeup

Every existing tool for runners-who-travel treats a run as a **route**: a polyline on a map, optimized by distance and elevation. Strava heatmaps show *where* locals run. AllTrails shows *what trail*. Komoot shows *how to get there*. None of them treat a run as a **destination** with a story — the way Atlas Obscura treats places. A passionate runner traveling somewhere new doesn't want "a 10k loop near my hotel." They want *"the run locals do at 6am along the old aqueduct that ends at the bakery."* That's the wedge.

Trace is two features. The **Discover** tab is a hand-curated atlas of runs around the world, each entry written in Atlas Obscura voice with a hook, a story, what you'll pass, and where to eat after. The **Generate** tab lets a user drop a pin, pick a distance, and pick a vibe — and produces a real walking loop, assembled from live geospatial data and paired with an in-voice writeup from **Claude**. The AI isn't a chatbot bolted on; it's writing entries for the atlas, in places the editors haven't been yet.

It's built as a **cross-platform React Native app (Expo, TypeScript)** running natively on **iOS and Android** from one codebase. The whole generation pipeline — finding real nearby POIs (Google Places), stitching them into a walking loop (Google Directions), and writing the entry (Claude) — runs **server-side in a Cloudflare Worker**, so both platforms behave identically and the API keys never ship in the app. Trace started life as a native SwiftUI prototype; the React Native version is a faithful port that widens it to Android while keeping the same editorial feel, and the Worker still speaks the original Swift app's contract so one backend serves both.

---

For the engineering pipeline, see [docs/architecture.md](docs/architecture.md). For the SwiftUI → React Native port and the decision to move geo server-side, see [docs/rebuild.md](docs/rebuild.md). For longer commentary on why this shape, what got cut, and what's next, see [docs/notes.md](docs/notes.md).
