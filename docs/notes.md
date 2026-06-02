# Notes

Extended commentary on Trace — the design calls behind the prototype, what got cut, what's still rough, and what I'd reach for next. [WRITEUP.md](../WRITEUP.md) is the short version; this is for anyone curious enough to keep reading. (This is the original native-iOS version; the project was later rebuilt cross-platform — see the [`react-native`](https://github.com/ian52n/trace/tree/react-native) branch.)

## Why this shape

Three calls I made early and held:

- **Mobile-native, not a website.** A runner reaching for this on a Tuesday morning is on their phone, not at a laptop. SwiftUI + MapKit + Core Location is the right canvas, and using on-device Apple APIs (`MKLocalSearch`, `MKDirections`) means the route geometry is fast, accurate, and free.

- **Story-first, not data-first.** Strava and Komoot already win on route data. They will never win on voice. So I optimized for the editorial layer: a serif typeface, generous whitespace, copy that earns its place. The demo lives or dies on whether the writing feels like Atlas Obscura.

- **AI as authorship, not as a chatbot.** The "AI-native" piece isn't a chat surface — it's a generator that produces in-voice content keyed to the user's actual location and intent. It's the bet I'd make for any content-led brand: AI that extends a strong editorial voice into places the editors haven't been yet. Claude isn't decorating an experience; it's writing entries for an atlas.

## What I cut

No accounts, no Strava import, no social, no onboarding, no settings, no GPS recording, no automated tests. Every cut bought me time for the parts that make the demo feel like a real product: the typography, the curated content, the staged progress messages on the generate flow, the empty states, and the editorial bar of the AI output.

I also kept the prototype honest about what it doesn't actually know. Generated runs show only the measured distance — not faked elevation gain or surface type — because the app doesn't have that data, and shipping made-up numbers in a content-led brand's prototype would be the wrong signal. Curated runs keep those fields because I hand-set them.

## What's still rough

- **No error / empty state on generation failure.** If Claude or the Worker times out, the loading overlay just disappears silently.
- **POI selection on lopsided distributions.** When POIs are clustered to one side of the pin (coastline, city edge), the angular-spread selector has a relaxed-separation fallback, but in extreme cases the loop still ends up shorter than requested.

## What's next

- Update curated runs daily. They should be personalized.
- POI types factored into the prompt — sending Claude not just names but categories ("historic site", "park", "viewpoint") so it can write more confidently about what each is.
- A "saved for trip" mode that groups runs by upcoming travel destination and offers them on the days you'll be there.
- A small lock-screen widget that surfaces the next run on your trip.
- An elevation API integration to make the elevation gain real instead of nil.
- A "regenerate" button on AI-generated detail screens.
- Real photos for the curated runs sourced from a proper licensed library (the current set are Wikimedia Commons CC-licensed — fine, but a content-led brand would curate these themselves).
- Automated tests for the geometry and selection algorithms — exactly the kind of code that benefits from them.