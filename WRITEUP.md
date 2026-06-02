# Trace — Writeup

Every existing tool for runners-who-travel treats a run as a **route**: a polyline on a map, optimized by distance and elevation. Strava heatmaps show *where* locals run. AllTrails shows *what trail*. Komoot shows *how to get there*. None of them treat a run as a **destination** with a story — the way Atlas Obscura treats places. A passionate runner traveling somewhere new doesn't want "a 10k loop near my hotel." They want *"the run locals do at 6am along the old aqueduct that ends at the bakery."* That's the wedge.

Trace is two features. The **Discover** tab is a hand-curated atlas of runs around the world, each entry written in Atlas Obscura voice with a hook, a story, what you'll pass, and where to eat after. The **Generate** tab lets a user drop a pin, pick a distance, and pick a vibe — and produces a real walking loop, assembled on-device from Apple's nearby POI data (`MKLocalSearch`) and `MKDirections` walking routes, paired with an in-voice writeup from Claude Opus 4.7 via a Cloudflare Worker that keeps the API key server-side. The AI isn't a chatbot bolted on; it's writing entries for the atlas, in places the editors haven't been yet.

---

For the engineering pipeline, see [docs/architecture.md](docs/architecture.md). For longer commentary on why this shape, what got cut, what's still rough, and what's next, see [docs/notes.md](docs/notes.md).

---

*This describes the original native-iOS (SwiftUI) version. The project was later rebuilt as a cross-platform React Native app (iOS + Android) — see the [`react-native`](https://github.com/ian52n/trace/tree/react-native) branch, the repo's default. Trace is an independent portfolio project, not affiliated with Atlas Obscura.*
