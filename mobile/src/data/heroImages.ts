import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled hero photos for the curated runs, keyed by run id.
 *
 * These ship in the app rather than loading from Wikimedia at runtime:
 * Wikimedia's User-Agent policy returns HTTP 403 to app image loaders
 * (okhttp/Fresco on Android, CFNetwork on iOS), so remote loading is
 * unreliable. Bundling also means the curated feed renders instantly and
 * offline. `require` paths must be static literals for the Metro bundler.
 */
export const heroImages: Record<string, ImageSourcePropType> = {
  '11111111-1111-1111-1111-111111111111': require('../../assets/runs/lisbon.jpg'),
  '22222222-2222-2222-2222-222222222222': require('../../assets/runs/tokyo.jpg'),
  '33333333-3333-3333-3333-333333333333': require('../../assets/runs/edinburgh.jpg'),
  '44444444-4444-4444-4444-444444444444': require('../../assets/runs/reykjavik.jpg'),
  '55555555-5555-5555-5555-555555555555': require('../../assets/runs/nyc.jpg'),
};
