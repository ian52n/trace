# Trace AI Worker

A ~40-line Cloudflare Worker that proxies AI generation requests from the Trace iOS app to Anthropic's API. Holds the `ANTHROPIC_API_KEY` as a server-side secret so it never ships in the app binary.

## Deploy

```sh
cd worker
npm install
npx wrangler login                          # opens a browser, sign in to Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY   # paste your Anthropic key when prompted
npx wrangler deploy                          # prints your worker URL
```

Then paste the URL into [`../Trace/Config.swift`](../Trace/Config.swift) and rebuild the app.

## Contract

`POST /` with body:

```json
{
  "lat": 38.7262,
  "lng": -9.1727,
  "distanceKm": 8,
  "vibe": "historic",
  "cityHint": "Lisbon"
}
```

Returns:

```json
{
  "title": "...",
  "hook": "...",
  "story": "paragraph one\n\nparagraph two\n\nparagraph three",
  "postRunMove": "..."
}
```

## Model

Uses `claude-opus-4-7` for editorial prose quality. Roughly $0.02 per generation at current rates; a demo's worth of generations costs cents.

## Local dev

```sh
npx wrangler dev
```

Then point the app at `http://localhost:8787` (only works on a simulator; physical devices can't reach localhost).
