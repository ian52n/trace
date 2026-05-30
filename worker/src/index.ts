// Trace AI Worker — server-side generation pipeline.
//
// Two request shapes:
//  1. Cross-platform (RN) app sends just a pin + distance + vibe. The Worker
//     discovers POIs (Google Places), stitches a walking loop (Google
//     Directions), then asks Claude to write it up — returning a full run with
//     waypoints. Keeps both platforms identical and the heavy geo off-device.
//  2. Legacy (native iOS) app sends pre-built `pois` (it ran MapKit on-device).
//     The Worker just writes the story. Detected by a non-empty `pois` array.

import {
  haversineMeters,
  minimumPOIs,
  nearestNeighborOrder,
  selectSpreadByAngle,
  type LatLng,
  type NamedPlace,
} from './geo';
import { findPOIs, reverseGeocodeCity, walkingLoop } from './google';
import { buildUserPrompt, callClaude, type POIWithRhythm } from './claude';

export interface Env {
  ANTHROPIC_API_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
}

interface GenerateRequest {
  lat: number;
  lng: number;
  distanceKm: number;
  vibe: string;
  cityHint?: string | null;
  pois?: POIWithRhythm[]; // legacy: client-supplied, skips server geo
}

interface Waypoint {
  lat: number;
  lng: number;
  label: string | null;
  note: string | null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (req.method === 'GET') {
      return cors(new Response('Trace AI worker is alive. POST to generate.', { status: 200 }));
    }
    if (req.method !== 'POST') return jsonError(405, 'Method not allowed');

    let body: GenerateRequest;
    try {
      body = (await req.json()) as GenerateRequest;
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    if (
      typeof body.lat !== 'number' ||
      typeof body.lng !== 'number' ||
      typeof body.distanceKm !== 'number' ||
      typeof body.vibe !== 'string'
    ) {
      return jsonError(400, 'Missing required fields: lat, lng, distanceKm, vibe');
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonError(500, 'Server is missing ANTHROPIC_API_KEY secret');
    }

    // Path 1: legacy — client already supplied POIs, just write the story.
    if (Array.isArray(body.pois) && body.pois.length > 0) {
      try {
        const entry = await callClaude(
          env.ANTHROPIC_API_KEY,
          buildUserPrompt({ ...body, pois: body.pois })
        );
        return cors(json(entry));
      } catch (err) {
        return jsonError(502, String(err));
      }
    }

    // Path 2: server-side geo pipeline.
    const center: LatLng = { lat: body.lat, lng: body.lng };
    let waypoints: Waypoint[] = [];
    let measuredKm = body.distanceKm;
    let poisForPrompt: POIWithRhythm[] = [];

    if (env.GOOGLE_MAPS_API_KEY) {
      try {
        const built = await buildRoute(env.GOOGLE_MAPS_API_KEY, center, body);
        if (built) {
          waypoints = built.waypoints;
          measuredKm = built.distanceKm;
          poisForPrompt = built.poisForPrompt;
        }
      } catch {
        // Fall through to textures-only generation below.
      }
    }

    // City label: prefer the client hint, else reverse-geocode the pin.
    let city = body.cityHint ?? null;
    let country: string | null = body.cityHint ? '' : null;
    if (!city && env.GOOGLE_MAPS_API_KEY) {
      const geo = await reverseGeocodeCity(env.GOOGLE_MAPS_API_KEY, center);
      city = geo.city;
      country = geo.country;
    }

    try {
      const entry = await callClaude(
        env.ANTHROPIC_API_KEY,
        buildUserPrompt({
          lat: body.lat,
          lng: body.lng,
          distanceKm: measuredKm,
          vibe: body.vibe,
          cityHint: city,
          pois: poisForPrompt,
        })
      );
      return cors(
        json({
          ...entry,
          waypoints,
          distanceKm: measuredKm,
          city,
          country,
        })
      );
    } catch (err) {
      return jsonError(502, String(err));
    }
  },
};

/** POI discovery → angular spread selection → nearest-neighbour order →
 *  walking-route stitching → labelled waypoints + per-POI cumulative distance. */
async function buildRoute(
  apiKey: string,
  center: LatLng,
  body: GenerateRequest
): Promise<{
  waypoints: Waypoint[];
  distanceKm: number;
  poisForPrompt: POIWithRhythm[];
} | null> {
  const requested = body.distanceKm;
  const baseRadius = Math.max((requested * 1000) / Math.PI, 800);
  const candidates = await findPOIs(apiKey, center, baseRadius, body.vibe);
  if (candidates.length < 3) return null;

  type RouteResult = {
    waypoints: Waypoint[];
    distanceKm: number;
    poisForPrompt: POIWithRhythm[];
  };

  let radius = requested / (2 * Math.PI) / 1.3; // straight-line radius for the loop
  let count = minimumPOIs(requested) + 1;
  let best: RouteResult | null = null;

  // Build → measure → adjust. Walking routes (especially near airports, water,
  // or highways) can balloon far past the requested distance, so we measure the
  // actual loop and tighten the radius / drop stops when it's too long, or
  // widen when too short. Up to 3 passes (each is one Directions call).
  for (let attempt = 0; attempt < 3; attempt++) {
    // Never pull in POIs far outside the target radius — a sparse area must not
    // be allowed to select stops tens of km away.
    const maxKm = radius * 2.5;
    const near = candidates.filter(
      (c) => haversineMeters(center, c) / 1000 <= maxKm
    );
    if (near.length < 3) break;

    let selected = selectSpreadByAngle(near, center, radius, count);
    if (selected.length < 3) selected = near.slice(0, Math.max(3, count));

    const ordered = nearestNeighborOrder(selected, center);
    const route = await walkingLoop(apiKey, ordered);
    if (!route) break;

    const result: RouteResult = {
      waypoints: buildWaypoints(route.polyline, ordered),
      distanceKm: route.distanceKm,
      poisForPrompt: ordered.map((p, i) => ({
        name: p.name,
        distFromStartKm: route.cumulativeKmAtPOI[i],
      })),
    };
    if (
      best === null ||
      Math.abs(result.distanceKm - requested) <
        Math.abs(best.distanceKm - requested)
    ) {
      best = result;
    }

    const ratio = route.distanceKm / requested;
    if (ratio >= 0.6 && ratio <= 1.5) return result; // close enough — done

    if (ratio > 1.5) {
      radius *= 0.6; // too long: pull stops in and use fewer of them
      count = Math.max(3, count - 2);
    } else {
      radius *= 1.4; // too short: spread out and add a stop
      count = Math.min(9, count + 1);
    }
  }

  // If even our best attempt is wildly off (e.g. an airport or waterfront with
  // no walkable loop near the target length), reject it. The caller then
  // returns an empty route and the app draws a correct-length geometric loop
  // rather than a nonsensical 140 km one.
  if (best !== null && best.distanceKm <= requested * 1.6) return best;
  return null;
}

/** Polyline points become the line; each POI labels its nearest polyline point. */
function buildWaypoints(polyline: LatLng[], pois: NamedPlace[]): Waypoint[] {
  if (polyline.length === 0) {
    return pois.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      label: String(i + 1),
      note: p.name,
    }));
  }
  const waypoints: Waypoint[] = polyline.map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
    label: null,
    note: null,
  }));
  pois.forEach((poi, i) => {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    polyline.forEach((pt, j) => {
      const d = (pt.lat - poi.lat) ** 2 + (pt.lng - poi.lng) ** 2;
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = j;
      }
    });
    waypoints[nearestIdx] = {
      lat: poi.lat,
      lng: poi.lng,
      label: String(i + 1),
      note: poi.name,
    };
  });
  return waypoints;
}

// MARK: - HTTP helpers

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function jsonError(status: number, message: string): Response {
  return cors(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  );
}

function cors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'content-type');
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
