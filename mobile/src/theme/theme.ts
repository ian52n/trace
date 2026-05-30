import type { Vibe } from '../models/run';

/**
 * Palette and typography for Trace. Mirrors the SwiftUI Theme: a parchment /
 * cream editorial look with a burnt-sienna accent, serif for body + titles,
 * system sans for labels.
 */
export const colors = {
  parchment: '#F5F0E3', // 0.96, 0.94, 0.89
  cream: '#FBF6ED', //     0.985, 0.965, 0.93
  ink: '#211C19', //       0.13, 0.11, 0.10
  muted: '#6B5E52', //     0.42, 0.37, 0.32
  accent: '#9C4221', //    0.61, 0.26, 0.13
  hair: '#C7BAA6', //      0.78, 0.73, 0.65
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Font families loaded via @expo-google-fonts/lora in App.tsx.
 * Lora is a well-balanced contemporary serif — the cross-platform stand-in for
 * the SwiftUI "New York" serif used in the native build.
 */
export const fonts = {
  serifRegular: 'Lora_400Regular',
  serifMedium: 'Lora_500Medium',
  serifSemiBold: 'Lora_600SemiBold',
  // Labels/eyebrows use the platform sans (San Francisco / Roboto) for contrast.
  sans: undefined as string | undefined,
} as const;

/** Type scale mirroring the SwiftUI Font extension. */
export const type = {
  display: { fontFamily: fonts.serifSemiBold, fontSize: 32 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 26 },
  cardTitle: { fontFamily: fonts.serifSemiBold, fontSize: 22 },
  body: { fontFamily: fonts.serifRegular, fontSize: 17 },
  subtitle: { fontFamily: fonts.sans, fontSize: 15 },
  label: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600' as const },
} as const;

/** Two-stop gradient keyed to a run's primary vibe (hero placeholder). */
export function vibeGradient(vibes: Vibe[]): [string, string] {
  const primary = vibes[0] ?? 'urban';
  switch (primary) {
    case 'historic':
      return ['#8C5933', '#4D2E1A'];
    case 'nature':
      return ['#528052', '#1F4026'];
    case 'weird':
      return ['#734D8C', '#381F4D'];
    case 'coffee':
      return ['#805238', '#472E1F'];
    case 'iconic':
      return ['#B36633', '#66331A'];
    case 'hidden':
      return ['#4D4752', '#1F1F26'];
    case 'water':
      return ['#40668C', '#1A3352'];
    case 'urban':
      return ['#665C52', '#332E29'];
  }
}
