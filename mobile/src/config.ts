/**
 * Cloudflare Worker URL for AI generation. When null, the app falls back to the
 * mock generator (mockAIService) so the demo always runs offline.
 *
 * In the cross-platform build the Worker owns the whole geo pipeline — POI
 * discovery (Google Places) and walking-route stitching (Google Directions) —
 * then calls Claude. The app sends a pin + distance + vibe and renders the Run.
 */
export const AI_WORKER_URL: string | null =
  'https://trace-ai.trace-demo.workers.dev';
