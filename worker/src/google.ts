// Google Maps Platform calls: Places (POI discovery), Directions (walking-route
// stitching), Geocoding (city label), and polyline decoding. All use one
// server-side API key with Places API + Directions API + Geocoding API enabled.

import type { LatLng, NamedPlace } from './geo';

type Vibe = 'historic' | 'nature' | 'weird' | 'coffee' | string;

const PLACE_KEYWORDS: Record<string, string[]> = {
  historic: ['historic site', 'monument', 'memorial', 'old church'],
  nature: ['park', 'garden', 'trail', 'waterfront'],
  weird: ['museum', 'statue', 'art gallery', 'unusual landmark'],
  coffee: ['cafe', 'coffee shop', 'bakery'],
};

const FALLBACK_KEYWORDS = ['park', 'landmark', 'monument', 'viewpoint', 'plaza'];

/** Search nearby POIs for a vibe, deduped by name and sorted by distance. */
export async function findPOIs(
  apiKey: string,
  center: LatLng,
  radiusMeters: number,
  vibe: Vibe
): Promise<NamedPlace[]> {
  const primary = PLACE_KEYWORDS[vibe] ?? FALLBACK_KEYWORDS;
  let places = await runKeywordSearches(apiKey, center, radiusMeters, primary);

  // Escalate to generic keywords if the vibe-specific search is too sparse.
  if (dedupe(places).length < 4) {
    const more = await runKeywordSearches(
      apiKey,
      center,
      radiusMeters,
      FALLBACK_KEYWORDS
    );
    places = [...places, ...more];
  }

  return dedupe(places)
    .map((p) => ({ p, d: distance(center, p) }))
    .filter((x) => x.d <= radiusMeters * 1.5)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.p);
}

async function runKeywordSearches(
  apiKey: string,
  center: LatLng,
  radiusMeters: number,
  keywords: string[]
): Promise<NamedPlace[]> {
  const results = await Promise.all(
    keywords.map((kw) => nearbySearch(apiKey, center, radiusMeters, kw))
  );
  return results.flat();
}

async function nearbySearch(
  apiKey: string,
  center: LatLng,
  radiusMeters: number,
  keyword: string
): Promise<NamedPlace[]> {
  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
  );
  url.searchParams.set('location', `${center.lat},${center.lng}`);
  url.searchParams.set('radius', String(Math.round(radiusMeters)));
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: {
        name: string;
        geometry?: { location?: { lat: number; lng: number } };
      }[];
    };
    return (data.results ?? [])
      .filter((r) => r.name && r.geometry?.location)
      .map((r) => ({
        name: r.name,
        lat: r.geometry!.location!.lat,
        lng: r.geometry!.location!.lng,
      }));
  } catch {
    return [];
  }
}

export interface DirectionsResult {
  /** Decoded route polyline, ordered. */
  polyline: LatLng[];
  /** Total walking distance in km (sum of legs). */
  distanceKm: number;
  /** Cumulative distance (km) from the start at each ordered POI. */
  cumulativeKmAtPOI: number[];
}

/**
 * Walking loop through ordered POIs: origin = destination = first POI, the rest
 * as intermediate waypoints. Returns the decoded polyline + measured distances.
 */
export async function walkingLoop(
  apiKey: string,
  pois: NamedPlace[]
): Promise<DirectionsResult | null> {
  if (pois.length < 2) return null;
  const origin = `${pois[0].lat},${pois[0].lng}`;
  const mids = pois.slice(1).map((p) => `${p.lat},${p.lng}`);

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', origin); // close the loop
  url.searchParams.set('waypoints', mids.join('|'));
  url.searchParams.set('mode', 'walking');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: {
        overview_polyline?: { points?: string };
        legs?: { distance?: { value: number } }[];
      }[];
    };
    const route = data.routes?.[0];
    if (!route?.overview_polyline?.points || !route.legs) return null;

    const polyline = decodePolyline(route.overview_polyline.points);
    const legMeters = route.legs.map((l) => l.distance?.value ?? 0);
    const totalMeters = legMeters.reduce((a, b) => a + b, 0);

    // POI k is reached after legs[0..k-1]; POI 0 is the start (0 km).
    const cumulativeKmAtPOI: number[] = [0];
    let acc = 0;
    for (let i = 0; i < legMeters.length - 1; i++) {
      acc += legMeters[i];
      cumulativeKmAtPOI.push(acc / 1000);
    }

    return { polyline, distanceKm: totalMeters / 1000, cumulativeKmAtPOI };
  } catch {
    return null;
  }
}

/** Reverse-geocode a pin to "City" + "Country" for the entry's location line. */
export async function reverseGeocodeCity(
  apiKey: string,
  center: LatLng
): Promise<{ city: string | null; country: string | null }> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${center.lat},${center.lng}`);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { city: null, country: null };
    const data = (await res.json()) as {
      results?: { address_components?: AddressComponent[] }[];
    };
    for (const result of data.results ?? []) {
      const comps = result.address_components ?? [];
      const city =
        pick(comps, 'locality') ??
        pick(comps, 'postal_town') ??
        pick(comps, 'administrative_area_level_2');
      const country = pick(comps, 'country');
      if (city || country) return { city, country };
    }
  } catch {
    // fall through
  }
  return { city: null, country: null };
}

interface AddressComponent {
  long_name: string;
  types: string[];
}

function pick(comps: AddressComponent[], type: string): string | null {
  return comps.find((c) => c.types.includes(type))?.long_name ?? null;
}

/** Standard Google encoded-polyline decoder. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    lat += decodeSignedNext();
    lng += decodeSignedNext();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;

  function decodeSignedNext(): number {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}

function distance(a: LatLng, b: LatLng): number {
  // local import-free haversine to keep this module self-contained for distance sorting
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function dedupe(places: NamedPlace[]): NamedPlace[] {
  const seen = new Set<string>();
  const out: NamedPlace[] = [];
  for (const p of places) {
    const key = p.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
