# Notes

Extended commentary on Trace — the design calls behind the prototype, what got cut, what's still rough, and what I'd reach for next. The short writeup at [WRITEUP.md](../WRITEUP.md) is what you actually asked for; this is for anyone curious enough to keep reading.

## Why this shape

Three calls I made early and held:

- **Mobile-native, not a website.** The role title leads with "Mobile," and a runner reaching for this on a Tuesday morning is on their phone, not at a laptop. SwiftUI + MapKit + Core Location is the right canvas, and using on-device Apple APIs (`MKLocalSearch`, `MKDirections`) means the route geometry is fast, accurate, and free.

- **Story-first, not data-first.** Strava and Komoot already win on route data. They will never win on voice. So I optimized for the editorial layer: a serif typeface, generous whitespace, copy that earns its place. The demo lives or dies on whether the writing feels like Atlas Obscura.

- **AI as authorship, not as a chatbot.** The "AI-native" piece isn't a chat surface — it's a generator that produces in-voice content keyed to the user's actual location and intent. This is the bet I think Atlas Obscura should be making: AI that extends a strong editorial brand into places the editors haven't been yet. Claude isn't decorating an experience; it's writing entries for an atlas.

## What I cut

No accounts, no Strava import, no social, no onboarding, no settings, no GPS recording, no automated tests. Every cut bought me time for the parts that make the demo feel like a real product: the typography, the curated content, the staged progress messages on the generate flow, the empty states, and the editorial bar of the AI output.

I also kept the prototype honest about what it doesn't actually know. Generated runs show only the measured distance — not faked elevation gain or surface type — because the app doesn't have that data, and shipping made-up numbers in a content-led brand's prototype would be the wrong signal. Curated runs keep those fields because I hand-set them.

## What's still rough

- **No error / empty state on generation failure.** If Claude or the Worker times out, the loading overlay just disappears silently. Easy fix; deferred for time.
- **POI selection on lopsided distributions.** When POIs are clustered to one side of the pin (coastline, city edge), the angular-spread selector has a relaxed-separation fallback, but in extreme cases the loop still ends up shorter than requested.
- **The 5 curated runs were verified to be open and reasonable**, and two claims that I'd originally overstated (Kayaba Coffee's continuity through its 2006-2009 closure, Sheep Heid Inn's "since 1360" reputation) were softened. There may still be small editorial misses I haven't caught.

## If I had another day

- POI types factored into the prompt — sending Claude not just names but categories ("historic site", "park", "viewpoint") so it can write more confidently about what each is.
- A "saved for trip" mode that groups runs by upcoming travel destination and offers them on the days you'll be there.
- A small lock-screen widget that surfaces the next run on your trip.
- An elevation API integration to make the elevation gain real instead of nil.
- A "regenerate" button on AI-generated detail screens.
- Real photos for the curated runs sourced from a proper licensed library (the current set are Wikimedia Commons CC-licensed — fine, but a content-led brand would curate these themselves).
- Automated tests for the geometry and selection algorithms — exactly the kind of code that benefits from them.

## Process note

This prototype was built collaboratively with Claude as my pair-programmer, which feels like the right meta-disclosure for a role titled "AI-Native." I drove the product calls (the slice, the gap thesis, the editorial direction, every UI decision) and reviewed every line of code that landed; Claude wrote most of the SwiftUI scaffolding under my direction. The Cloudflare Worker pattern, the wedge-selection geometry, and the progress-callback API for the AI service all came out of working through tradeoffs in chat. The curated content was Claude-drafted in my voice and edited.

The AI generator at the heart of the app calls Claude too — that part isn't meta; that's the product.
