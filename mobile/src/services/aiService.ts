/**
 * The Generate tab's data layer.
 *
 * Defines the `AIService` contract and two implementations behind a factory:
 * `ClaudeAIService` (POSTs the pin/distance/vibe to the Worker, which runs the
 * server-side geo + Claude pipeline and returns a finished run) and
 * `MockAIService` (hand-written templates + a geometric loop, so the app runs
 * offline). Both report staged progress for the loading overlay, and the client
 * falls back to a geometric `circularLoop` whenever the Worker returns no route.
 */
import { AI_WORKER_URL } from '../config';
import {
  polylineDistanceKm,
  type Run,
  type Vibe,
  type Waypoint,
} from '../models/run';

export interface GenerateRequest {
  center: { lat: number; lng: number };
  cityHint: string | null;
  distanceKm: number;
  vibe: Vibe;
}

export type GenerationStage = 'searching' | 'routing' | 'writing';

export interface AIService {
  generateRun(
    request: GenerateRequest,
    onProgress: (stage: GenerationStage) => void
  ): Promise<Run>;
}

// MARK: - Geometry fallback

/** A clean circular loop of `stops` waypoints — used by the mock and as a
 *  fallback when the server can't find enough real POIs. */
export function circularLoop(
  center: { lat: number; lng: number },
  distanceKm: number,
  stops: number
): Waypoint[] {
  const radiusKm = distanceKm / (2 * Math.PI);
  const metersPerDegLat = 111.0;
  const metersPerDegLng = 111.0 * Math.cos((center.lat * Math.PI) / 180);
  const points: Waypoint[] = [];
  for (let i = 0; i <= stops; i++) {
    const theta = (i / stops) * 2 * Math.PI;
    const dLat = (radiusKm / metersPerDegLat) * Math.cos(theta);
    const dLng = (radiusKm / metersPerDegLng) * Math.sin(theta);
    points.push({
      lat: center.lat + dLat,
      lng: center.lng + dLng,
      label: null,
      note: null,
    });
  }
  return points;
}

function uuid(): string {
  // RFC4122-ish v4; good enough for client-side run identity.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// MARK: - Claude service (server-side geo pipeline)

interface WorkerResponse {
  title: string;
  hook: string;
  story: string;
  postRunMove: string;
  waypoints: Waypoint[];
  distanceKm: number; // actual measured length of the returned route
  city?: string | null;
  country?: string | null;
}

class ClaudeAIService implements AIService {
  constructor(private readonly workerURL: string) {}

  async generateRun(
    request: GenerateRequest,
    onProgress: (stage: GenerationStage) => void
  ): Promise<Run> {
    onProgress('searching');
    // The Worker runs search → route → write; we surface staged progress
    // optimistically while the single request is in flight.
    const progressTimers = [
      setTimeout(() => onProgress('routing'), 1200),
      setTimeout(() => onProgress('writing'), 2600),
    ];

    try {
      const res = await fetch(this.workerURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: request.center.lat,
          lng: request.center.lng,
          distanceKm: request.distanceKm,
          vibe: request.vibe,
          cityHint: request.cityHint,
        }),
      });
      if (!res.ok) {
        throw new Error(`Worker ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as WorkerResponse;
      const waypoints = data.waypoints?.length
        ? data.waypoints
        : circularLoop(request.center, request.distanceKm, 8);
      return {
        id: uuid(),
        title: data.title,
        city: data.city ?? request.cityHint ?? 'Near you',
        country: data.country ?? (request.cityHint ? '' : '—'),
        distanceKm: data.distanceKm || polylineDistanceKm(waypoints),
        elevationGainM: null,
        surface: null,
        vibes: [request.vibe],
        bestTime: 'dawn',
        hook: data.hook,
        story: data.story,
        waypoints,
        postRunMove: data.postRunMove,
        heroImageURL: null,
        isAIGenerated: true,
        createdAt: new Date().toISOString(),
      };
    } finally {
      progressTimers.forEach(clearTimeout);
    }
  }
}

// MARK: - Mock service (offline)

class MockAIService implements AIService {
  async generateRun(
    request: GenerateRequest,
    onProgress: (stage: GenerationStage) => void
  ): Promise<Run> {
    onProgress('searching');
    await delay(600);
    onProgress('routing');
    await delay(600);
    onProgress('writing');
    await delay(900);

    const waypoints = circularLoop(request.center, request.distanceKm, 8);
    const c = copyFor(request.vibe);
    return {
      id: uuid(),
      title: c.title,
      city: request.cityHint ?? 'Near you',
      country: request.cityHint ? '' : '—',
      distanceKm: polylineDistanceKm(waypoints),
      elevationGainM: null,
      surface: null,
      vibes: [request.vibe],
      bestTime: 'dawn',
      hook: c.hook,
      story: c.story,
      waypoints,
      postRunMove: c.postRun,
      heroImageURL: null,
      isAIGenerated: true,
      createdAt: new Date().toISOString(),
    };
  }
}

interface Copy {
  title: string;
  hook: string;
  story: string;
  postRun: string;
}

function copyFor(vibe: Vibe): Copy {
  switch (vibe) {
    case 'historic':
      return {
        title: 'The Old Walls Circuit',
        hook: "Trace the city's first edges, where stone gives way to streetlight.",
        story:
          "Every city has a version of this run, and the trick is finding it before anyone else is awake. Start where the morning bakers are stacking trays in the dark — you'll hear them before you see them, the metallic clatter, the smell of yeast that hasn't yet become bread.\n\nThe route follows what used to be a wall. You can feel it in the streets, the way they curve where stone once turned. Whatever was inside the wall is now neighborhoods that have been arguing about parking for two hundred years. Whatever was outside is now neighborhoods that pretend they were always inside.\n\nHalfway through, the city does that thing cities do: it shows you something it forgot to hide. A staircase that goes nowhere. A door without a building. Keep moving. You'll come back later, slower, with coffee.",
        postRun:
          "Find the cafe with the most regulars at 8am and order whatever they're having. Don't ask for the menu.",
      };
    case 'nature':
      return {
        title: 'The Quiet Green Loop',
        hook: 'Slip out before the city wakes and the park belongs to you and a few serious dogs.',
        story:
          "There's a particular kind of light that only exists in city parks before 7am. The grass is wet in a way that means business. The runners you pass nod at each other in the way of people who have agreed, without speaking, that this is the correct way to live.\n\nFind the dirt path, not the paved one. The dirt path is where the locals run, and there's always a reason: it's softer, it's prettier, or it knows a shortcut. Sometimes all three.\n\nToward the end you'll pass a stand of trees that the city, somehow, has not yet ruined. Run slower through here. This is the part you'll remember next week, when you're back in your hotel, trying to decide if you liked this place.",
        postRun:
          "There's a farmer's market within 800 meters. Buy a peach. Eat it now, not later.",
      };
    case 'weird':
      return {
        title: "The Run That Doesn't Quite Make Sense",
        hook: 'Every city has a route that doesn’t appear in any guidebook. This is yours.',
        story:
          "This run was built around three things you weren't planning to see. A statue of someone the city has clearly forgotten. A building that appears to have been designed by two different architects who weren't speaking. A small park named after an animal that doesn't live on this continent.\n\nThe route connects them in roughly the right order, and the distances between them are not what you'd expect. That's the point. Atlas Obscura calls this \"the sweet spot between lost and found,\" which is generous, because it mostly feels like lost.\n\nBring water. The most interesting parts of any city are usually uphill, and they don't tell you that until you're already running.",
        postRun:
          "There's a bar somewhere on this route that opens at 11am and serves one thing well. Find it. Don't post about it.",
      };
    case 'coffee':
      return {
        title: 'The Cortado Route',
        hook: 'A run organized entirely around its ending.',
        story:
          "Some runs are about the running. This one is about the espresso at the end. The route is shaped, very intentionally, to drop you at the door of a place where the barista takes their work seriously and the regulars don't look up when you come in.\n\nYou'll run past three other coffee shops on the way. Ignore them. They are fine. The one you're going to is the one with the small queue outside at 7:45am, which is the city's tell that something is happening here.\n\nPace yourself. The reward at the end is small and intense, and you want to deserve it.",
        postRun:
          'Order whatever the person ahead of you ordered. Stand at the bar. Don’t take it to go.',
      };
    default:
      return {
        title: 'A Run, Specifically Here',
        hook: 'A loop calibrated to this exact pin on the map.',
        story:
          "This is a loop the algorithm built around where you're standing. It's not famous. Locals don't have a name for it. But it threads through a few places that, when you string them together, start to feel like a route.\n\nRun it slowly the first time. The second time you'll know which corners to take wide and which streetlight to use as a halfway mark.",
        postRun:
          "Find the closest place that's open and walk in like you've been here before.",
      };
  }
}

// MARK: - Factory

export function makeAIService(): AIService {
  if (AI_WORKER_URL) {
    return new ClaudeAIService(AI_WORKER_URL);
  }
  return new MockAIService();
}

/** Whether the live (Claude) path is configured — drives the Generate footnote. */
export const usingClaude = AI_WORKER_URL != null;
