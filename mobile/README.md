# Trace — React Native (Expo)

Cross-platform rebuild of [Trace](../README.md), the "runs as destinations"
app, for **iOS and Android**. Same product, same editorial voice, one codebase.

Built with Expo (SDK 56), React Native 0.85, TypeScript, React Navigation, and
`react-native-maps`.

## What's here

Two tabs, mirroring the native iOS build:

1. **Discover** — a curated, story-driven feed of iconic and hidden runs. The
   curated content is the same hand-written atlas as the native app
   ([`src/data/curatedRuns.json`](src/data/curatedRuns.json)).
2. **Generate** — drop a pin, pick a distance and a vibe, and the app builds a
   real walking loop and writes an Atlas Obscura-style entry for it.

The big architectural change from the iOS build: the Generate pipeline moved
**server-side**. The native app used MapKit (`MKLocalSearch` + `MKDirections`)
on-device — Apple-only APIs. To stay identical on both platforms, POI discovery
(Google Places) and walking-route stitching (Google Directions) now live in the
[Cloudflare Worker](../worker/), which then calls Claude. The app sends a pin +
distance + vibe and renders the run. See [`src/services/aiService.ts`](src/services/aiService.ts).

When no Worker URL is set, the app falls back to a mock generator so it always
runs offline.

## Run it

`react-native-maps` is a native module, so this needs a **development build**
(not Expo Go).

### iOS (simulator — no keys needed, uses Apple Maps)

```sh
cd mobile
npm install
npx expo run:ios
```

### Android (needs a Google Maps key for tiles)

```sh
cd mobile
cp .env.example .env        # then paste your Maps SDK for Android key
npm install
npx expo run:android
```

The key is read from `GOOGLE_MAPS_API_KEY` by [`app.config.ts`](app.config.ts)
and injected at prebuild — it is never committed.

## Layout

```
mobile/
├── App.tsx                 ← providers, fonts, tab + stack navigation
├── app.config.ts           ← Expo config; Android Maps key from env
├── src/
│   ├── models/run.ts       ← Run / Waypoint / Vibe + display + geometry helpers
│   ├── theme/theme.ts      ← palette, type scale, vibe gradients
│   ├── data/
│   │   ├── curatedRuns.json
│   │   └── store.tsx       ← context store, AsyncStorage persistence
│   ├── services/aiService.ts  ← Worker client + offline mock + factory
│   ├── config.ts           ← Worker URL
│   ├── components/         ← RunCard, HeroBanner, RouteMap, VibePill, Chip
│   ├── screens/            ← Discover, Detail, Generate
│   └── navigation/types.ts
```

## Generation backend

The Worker ([`../worker`](../worker)) owns the server-side pipeline. Deploy it
and set its URL in [`src/config.ts`](src/config.ts). It needs two secrets:
`ANTHROPIC_API_KEY` and a server-side `GOOGLE_MAPS_API_KEY` (Places + Directions
+ Geocoding APIs enabled). See [`../worker/wrangler.toml`](../worker/wrangler.toml).
