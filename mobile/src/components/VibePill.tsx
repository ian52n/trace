import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vibeIcon, vibeLabel, type Vibe } from '../models/run';
import { colors } from '../theme/theme';

/** Icon + label pill for a vibe, shown translucent over the hero image. */
export function VibePill({ vibe }: { vibe: Vibe }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={vibeIcon(vibe)} size={11} color={colors.white} />
      <Text style={styles.pillText}>{vibeLabel(vibe)}</Text>
    </View>
  );
}

/** "Generated" badge marking an AI-authored run on cards and the detail header. */
export function GeneratedChip() {
  return (
    <View style={styles.generated}>
      <Ionicons name="sparkles" size={10} color={colors.accent} />
      <Text style={styles.generatedText}>GENERATED</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 100,
  },
  pillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  generated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(156,66,33,0.08)',
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(156,66,33,0.4)',
  },
  generatedText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
