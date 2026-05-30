/**
 * The domain model.
 *
 * One `Run` type backs both curated entries (bundled JSON) and AI-generated
 * runs (from the Worker), plus small pure helpers for display and geometry.
 * Mirrors the SwiftUI app's `Run` struct so the two front-ends stay in step.
 */
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Surface = 'road' | 'trail' | 'mixed' | 'track';

export type Vibe =
  | 'historic'
  | 'nature'
  | 'weird'
  | 'coffee'
  | 'iconic'
  | 'hidden'
  | 'water'
  | 'urban';

export type BestTime = 'dawn' | 'morning' | 'midday' | 'evening' | 'anytime';

/**
 * One point on a route. A `label`/`note` marks a real named stop (drawn as a
 * numbered pin and listed under "what you'll pass"); unlabelled points are just
 * polyline geometry that draws the line.
 */
export interface Waypoint {
  lat: number;
  lng: number;
  label: string | null;
  note: string | null;
}

/**
 * A run, treated as a destination. `elevationGainM` and `surface` are null for
 * AI-generated runs (no data source yet) and the UI omits them rather than
 * faking numbers; `distanceKm` is always real (polyline-derived for generated
 * runs). `createdAt` is an ISO 8601 string so it sorts and persists as-is.
 */
export interface Run {
  id: string;
  title: string;
  city: string;
  country: string;
  distanceKm: number;
  elevationGainM: number | null;
  surface: Surface | null;
  vibes: Vibe[];
  bestTime: BestTime;
  hook: string;
  story: string;
  waypoints: Waypoint[];
  postRunMove: string;
  heroImageURL: string | null;
  isAIGenerated: boolean;
  createdAt: string; // ISO 8601
}

// MARK: - Display helpers

export function locationLine(run: Run): string {
  return `${run.city}, ${run.country}`;
}

export function surfaceLabel(surface: Surface): string {
  return surface; // raw value already reads well: road / trail / mixed / track
}

export function vibeLabel(vibe: Vibe): string {
  return vibe.charAt(0).toUpperCase() + vibe.slice(1);
}

/** Ionicon name for a vibe — the cross-platform stand-in for the SF Symbols
 *  the SwiftUI app used. */
export function vibeIcon(vibe: Vibe): IoniconName {
  switch (vibe) {
    case 'historic':
      return 'library';
    case 'nature':
      return 'leaf';
    case 'weird':
      return 'sparkles';
    case 'coffee':
      return 'cafe';
    case 'iconic':
      return 'star';
    case 'hidden':
      return 'search';
    case 'water':
      return 'water';
    case 'urban':
      return 'business';
  }
}

export function bestTimeLabel(bestTime: BestTime): string {
  switch (bestTime) {
    case 'dawn':
      return 'best at dawn';
    case 'morning':
      return 'best in the morning';
    case 'midday':
      return 'best at midday';
    case 'evening':
      return 'best at golden hour';
    case 'anytime':
      return 'anytime';
  }
}

// MARK: - Geometry

/** Sum of haversine distances between consecutive waypoints, in km. */
export function polylineDistanceKm(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineMeters(waypoints[i], waypoints[i + 1]);
  }
  return total / 1000;
}

function haversineMeters(a: Waypoint, b: Waypoint): number {
  const R = 6_371_000; // Earth radius, meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
