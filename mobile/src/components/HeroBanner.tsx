import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { bestTimeLabel, vibeIcon, type Run } from '../models/run';
import { colors, vibeGradient } from '../theme/theme';
import { heroImages } from '../data/heroImages';
import { VibePill } from './VibePill';

/**
 * Edge-to-edge hero used by both the card and the detail header. Falls back to
 * a vibe-keyed gradient with a faint glyph when there's no photo (generated
 * runs, or while a remote image loads).
 */
export function HeroBanner({ run }: { run: Run }) {
  const [from, to] = vibeGradient(run.vibes);
  const glyph = vibeIcon(run.vibes[0] ?? 'urban');

  // Prefer a bundled photo; fall back to a remote URL if one is set; if either
  // fails to load, drop to the vibe gradient placeholder.
  const localImage = heroImages[run.id];
  const [remoteFailed, setRemoteFailed] = useState(false);
  const imageSource = localImage
    ? localImage
    : run.heroImageURL && !remoteFailed
      ? { uri: run.heroImageURL }
      : null;

  return (
    <View style={styles.container}>
      {/* Vibe gradient backdrop: the placeholder when there's no photo, and a
          mat during image load. The hero is sized 16:9 to match the cropped
          photo files, so `cover` fills it with no display-time cropping. */}
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        {!imageSource && (
          <Ionicons
            name={glyph}
            size={120}
            color="rgba(255,255,255,0.10)"
            style={styles.glyph}
          />
        )}
      </LinearGradient>

      {imageSource && (
        <Image
          source={imageSource}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setRemoteFailed(true)}
        />
      )}

      {/* Bottom scrim so the pills stay legible over any image. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.footer}>
        <View style={styles.vibes}>
          {run.vibes.slice(0, 3).map((vibe) => (
            <VibePill key={vibe} vibe={vibe} />
          ))}
        </View>
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{bestTimeLabel(run.bestTime)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  glyph: {
    position: 'absolute',
    right: 24,
    top: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 14,
  },
  vibes: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 100,
  },
  timeText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
  },
});
