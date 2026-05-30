// Pure geometry helpers — ported from the iOS POIService/RouteBuilder so the
// cross-platform server pipeline selects and orders POIs the same way the
// native build did on-device.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface NamedPlace extends LatLng {
  name: string;
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Initial bearing a→b in degrees, 0..360 (0 = north, 90 = east). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lng - a.lng);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest difference between two bearings, 0..180. */
export function angularDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return Math.min(raw, 360 - raw);
}

/** How many stops a loop of this length wants: short runs ~3, long runs up to 8. */
export function minimumPOIs(distanceKm: number): number {
  const scaled = Math.round(distanceKm / 2.5);
  return Math.min(Math.max(3, scaled), 8);
}

/**
 * Pick ~`desiredCount` places spread angularly around the pin, favouring those
 * near `targetRadiusKm` so the resulting loop lands close to the requested
 * distance. Relaxes the angular separation if strict spreading is too sparse
 * (e.g. POIs bunched on one side because of water or a city edge).
 */
export function selectSpreadByAngle(
  places: NamedPlace[],
  pin: LatLng,
  targetRadiusKm: number,
  desiredCount: number
): NamedPlace[] {
  if (places.length === 0) return [];

  const scored = places.map((p) => ({
    place: p,
    angle: bearingDegrees(pin, p),
    radialScore: Math.abs(haversineMeters(pin, p) / 1000 - targetRadiusKm),
  }));
  scored.sort((a, b) => a.radialScore - b.radialScore);

  const strict = Math.max(20, (360 / desiredCount) * 0.6);
  let selected = pick(scored, strict, desiredCount);

  if (selected.length < Math.min(desiredCount, scored.length)) {
    const relaxed = pick(scored, strict / 2, desiredCount);
    if (relaxed.length > selected.length) selected = relaxed;
  }
  return selected.map((s) => s.place);
}

function pick(
  candidates: { place: NamedPlace; angle: number; radialScore: number }[],
  separation: number,
  limit: number
) {
  const selected: typeof candidates = [];
  for (const cand of candidates) {
    if (selected.length >= limit) break;
    const tooClose = selected.some(
      (s) => angularDistance(cand.angle, s.angle) < separation
    );
    if (!tooClose) selected.push(cand);
  }
  return selected;
}

/** Greedy nearest-neighbour ordering starting from `start`. */
export function nearestNeighborOrder(
  places: NamedPlace[],
  start: LatLng
): NamedPlace[] {
  const remaining = [...places];
  const ordered: NamedPlace[] = [];
  let current: LatLng = start;
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineMeters(current, p);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    const [next] = remaining.splice(nearestIdx, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
