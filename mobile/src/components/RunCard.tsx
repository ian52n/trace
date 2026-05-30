import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  surfaceLabel,
  type Run,
} from '../models/run';
import { colors, fonts } from '../theme/theme';
import { HeroBanner } from './HeroBanner';
import { GeneratedChip } from './VibePill';

export function RunCard({ run }: { run: Run }) {
  return (
    <View style={styles.card}>
      <View style={styles.heroClip}>
        <HeroBanner run={run} />
      </View>

      <View style={styles.body}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>
            {run.city.toUpperCase()}  ·  {run.country.toUpperCase()}
          </Text>
          {run.isAIGenerated && <GeneratedChip />}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {run.title}
        </Text>

        <Text style={styles.hook} numberOfLines={2}>
          {run.hook}
        </Text>

        <View style={styles.stats}>
          <Text style={styles.stat}>{run.distanceKm.toFixed(1)} km</Text>
          {run.elevationGainM != null && (
            <Text style={styles.stat}>↑ {run.elevationGainM} m</Text>
          )}
          {run.surface != null && (
            <Text style={styles.stat}>{surfaceLabel(run.surface)}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: colors.cream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.5)',
    // iOS shadow + Android elevation
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroClip: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  body: {
    padding: 16,
    gap: 10,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: colors.muted,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 22,
    color: colors.ink,
  },
  hook: {
    fontFamily: fonts.serifRegular,
    fontSize: 17,
    lineHeight: 23,
    color: colors.muted,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  stat: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
});
