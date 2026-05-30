# Rebuild: SwiftUI → React Native

Trace was first built as a native **SwiftUI** app ([`Trace/`](../Trace/), and what `main` holds). This branch is the **React Native (Expo)** rebuild ([`mobile/`](../mobile/)) that runs the same product on **iOS and Android** from one codebase. This doc covers what changed and why.

## Why rebuild at all

The native app was the right first cut: SwiftUI is the fastest way to make an iOS app *feel* finished, and the role leads with "Mobile." But Atlas Obscura's stack lists **React Native**, and the product is the same on both platforms — there's nothing iOS-specific about "a run is a destination." Rebuilding cross-platform doubles the reachable audience (Android is most of the world's phones) for roughly the same surface area, and it's the honest answer to "build our new native mobile app… alongside our web experience."

The React Native version is a faithful port: same two screens, same curated content, same editorial design system (parchment palette, serif body, vibe-keyed gradients), same domain model.

## The one decision that mattered

The native app discovered POIs and built routes **on the device** using Apple's frameworks:

- `MKLocalSearch` — nearby POIs, free, fast, no key.
- `MKDirections` — walking routes between them.

These are **Apple-only**. There is no `MKLocalSearch` on Android. So the cross-platform build had a fork to resolve, and three options:

1. **Two native modules** — keep MapKit on iOS, write an equivalent for Android. Maximum platform-nativeness, but two code paths for the headline feature, divergent results (different POI providers), and the most to maintain.
2. **A JS POI/routing library on-device** — uniform, but heavier in the bundle and weaker data than the platform providers.
3. **Move the geo pipeline server-side.** ← chosen.

The Worker already existed (it held the Anthropic key and called Claude). Extending it to also do **Google Places** (POI search), **Google Directions** (walking routes), and **Google Geocoding** (city labels) meant:

- **One code path**, identical results on iOS and Android.
- The heavy work is **off the device** — the app stays a thin, fast client.
- Better, more consistent data than stitching per-platform providers.
- The keys stay server-side secrets; nothing sensitive ships in either binary.

The cost is a network round-trip and a small Google bill. For a discovery feature that's already calling an LLM, that's the right trade. The algorithms themselves — angular-spread POI selection, nearest-neighbor ordering, the distance refinement loop — were ported almost line-for-line from Swift into [`worker/src/geo.ts`](../worker/src/geo.ts); they just moved from `POIService.swift` to TypeScript.

## One backend, both apps

The Worker stays **backward-compatible**. If a request includes a `pois` array (the SwiftUI app, which still runs MapKit on-device), the Worker skips the geo pipeline and only writes the entry. If it doesn't (the React Native app), the Worker runs the full pipeline. So both front-ends share one deployment — see [architecture.md → Worker shape](architecture.md#worker-shape--backward-compatibility).

## Mapping the pieces

| Native (SwiftUI) | Cross-platform (React Native) |
|---|---|
| SwiftUI views | React Native + React Navigation |
| `@Observable RunStore` | React context + `AsyncStorage` ([`store.tsx`](../mobile/src/data/store.tsx)) |
| `MapKit` `Map`, `MapPolyline` | `react-native-maps` (Apple Maps on iOS, Google Maps on Android) |
| `MKLocalSearch` + `MKDirections` (on-device) | Google Places + Directions (in the Worker) |
| SF Symbols | `@expo/vector-icons` (Ionicons) |
| System serif (New York) | Lora (bundled via `@expo-google-fonts`) |
| `Codable` `Run` struct | `Run` TypeScript interface ([`run.ts`](../mobile/src/models/run.ts)) |
| Bundled `curated_runs.json` | Same JSON, bundled |
| `AsyncImage` from Wikimedia | Photos cropped to 16:9 and **bundled** (Wikimedia 403s app loaders) |

## What's genuinely different on each platform

Most of the app is shared, but a few things are intentionally platform-aware:

- **Maps** — iOS renders Apple Maps for free; Android needs a Google Maps SDK key ([`.env`](../mobile/.env.example), injected at prebuild). The map *component* is identical; only the tile provider differs.
- **Signing** — iOS device builds need an Apple development team; a config plugin ([`plugins/withIosSigning.js`](../mobile/plugins/withIosSigning.js)) sets it at prebuild so it's repeatable. Android debug/release signing is handled by the default keystore.

Everything else — layout, navigation, state, the generation flow, the editorial styling — is one implementation.
