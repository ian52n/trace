# Trace — Writeup

## The gap I'm filling

Every existing tool for runners-who-travel treats a run as a **route**: a polyline on a map, optimized by distance and elevation. Strava heatmaps show *where* locals run. AllTrails shows *what trail*. Komoot shows *how to get there*. None of them treat a run as a **destination** with a story — the way Atlas Obscura treats places.

A passionate runner traveling somewhere new doesn't want "a 10k loop near my hotel." They want _"the run locals do at 6am along the old aqueduct that ends at the bakery."_ That's the wedge.

## What I built

A two-feature SwiftUI prototype:

**1. A curated atlas of runs.** Five seed entries — Lisbon, Tokyo, Edinburgh, Reykjavík, NYC — each hand-written in Atlas Obscura voice: a hook, a story, what you'll pass, where to eat after. Quality over quantity, because the point was to set the editorial bar so the detail screen treats a run with the gravity of a destination, not the utility of a route card.

**2. An AI generator that produces real loops, in voice.** The user drops a pin, picks a distance and a vibe (historic / nature / weird / coffee). On the device, the app:

1. Queries Apple's POI database via `MKLocalSearch` with up to 4 tiered query sets — vibe-specific first, then broader, then vibe-agnostic, with an expanded radius on the last tier when the area is sparse.
2. Selects a subset of those POIs spread angularly around the pin at a target radius matching the requested distance, so the resulting loop is close to what the user asked for.
3. Threads `MKDirections` walking routes between consecutive POIs to produce a polyline that follows real streets and stays on land.
4. Sends the resulting POI sequence (with each POI's cumulative km-from-start) and the **measured** route length to a Cloudflare Worker, which prompts **Claude Opus 4.7** with a system message tuned for Atlas Obscura voice.
5. Claude returns a title, hook, three-paragraph story, and post-run move — anchored to the actual measured route, with the freedom to reference real POI names where they sharpen the writing.

The Anthropic API key lives only in the Worker as a server-side secret; no key ships in the app binary.

See [docs/architecture.md](docs/architecture.md) for the pipeline detail and the geometry behind the wedge selection.

## Why this shape

Three calls I made early and held:

- **Mobile-native, not a website.** The role title leads with "Mobile," and a runner reaching for this on a Tuesday morning is on their phone, not at a laptop. SwiftUI + MapKit + Core Location is the right canvas, and using on-device Apple APIs (`MKLocalSearch`, `MKDirections`) means the route geometry is fast, accurate, and free.

- **Story-first, not data-first.** Strava and Komoot already win on route data. They will never win on voice. So I optimized for the editorial layer: a serif typeface, generous whitespace, copy that earns its place. The demo lives or dies on whether the writing feels like Atlas Obscura.

- **AI as authorship, not as a chatbot.** The "AI-native" piece isn't a chat surface — it's a generator that produces in-voice content keyed to the user's actual location and intent. This is the bet I think Atlas Obscura should be making: AI that extends a strong editorial brand into places the editors haven't been yet. Claude isn't decorating an experience; it's writing entries for an atlas.

## What I cut

No accounts, no Strava import, no social, no onboarding, no settings, no GPS recording, no app icon, no real hero photos, no automated tests. Every cut bought me time for the parts that make the demo feel like a real product: the typography, the curated content, the staged progress messages on the generate flow, the empty states, and the editorial bar of the AI output.

I also kept the prototype honest about what it doesn't actually know. Generated runs show only the measured distance — not faked elevation gain or surface type — because the app doesn't have that data, and shipping made-up numbers in a content-led brand's prototype would be the wrong signal. Curated runs keep those fields because I hand-set them.

## What's still rough

- **Hero images are gradient placeholders, not photos.** The next 30 minutes would be Unsplash photo URLs for the five curated runs.
- **Curated post-run venues weren't recently verified.** I named real places (Manteigaria in Lisbon, Kayaba Coffee in Tokyo, etc.) but didn't confirm current ownership or hours. A closed bakery in a curated guide is exactly the kind of bug a content-led brand notices.
- **No error / empty state on generation failure.** If Claude or the Worker times out, the loading overlay just disappears silently. Easy fix; deferred for time.
- **POI selection on lopsided distributions.** When POIs are clustered to one side of the pin (coastline, city edge), the angular-spread selector has a relaxed-separation fallback, but in extreme cases the loop still ends up shorter than requested.

## If I had another day

- POI types factored into the prompt — sending Claude not just names but categories ("historic site", "park", "viewpoint") so it can write more confidently about what each is.
- A "saved for trip" mode that groups runs by upcoming travel destination and offers them on the days you'll be there.
- A small lock-screen widget that surfaces the next run on your trip.
- An elevation API integration to make the elevation gain real instead of nil.
- Real photos, sourced and licensed properly.
- Automated tests for the geometry and selection algorithms — exactly the kind of code that benefits from them.

## Process note

This prototype was built collaboratively with Claude as my pair-programmer, which feels like the right meta-disclosure for a role titled "AI-Native." I drove the product calls (the slice, the gap thesis, the editorial direction, every UI decision) and reviewed every line of code that landed; Claude wrote most of the SwiftUI scaffolding under my direction. The Cloudflare Worker pattern, the wedge-selection geometry, and the progress-callback API for the AI service all came out of working through tradeoffs in chat. The curated content was Claude-drafted in my voice and edited.

The AI generator at the heart of the app calls Claude too — that part isn't meta; that's the product.
