/**
 * Detail — one run, read like an Atlas Obscura entry.
 *
 * Full-bleed hero (with floating back / save buttons over it), then the
 * editorial body: title + location, a facts row, the story, the route map, a
 * numbered "what you'll pass" list, and the post-run move. Shared by both the
 * Discover and Generate stacks. Fields that are null for AI-generated runs
 * (elevation, surface) are simply omitted rather than faked.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRunStore } from '../data/store';
import {
  bestTimeLabel,
  locationLine,
  surfaceLabel,
  type Run,
} from '../models/run';
import { colors, fonts } from '../theme/theme';
import { HeroBanner } from '../components/HeroBanner';
import { RouteMap } from '../components/RouteMap';
import type { DetailProps } from '../navigation/types';

export function DetailScreen({ route, navigation }: DetailProps) {
  const { run } = route.params;
  const store = useRunStore();
  const insets = useSafeAreaInsets();
  const saved = store.isSaved(run);

  // Only named/labelled waypoints feed the "what you'll pass" list and the map
  // pins; the rest are unlabelled polyline points that just draw the line.
  const labeled = run.waypoints.filter(
    (w) => w.label != null || w.note != null
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <HeroBanner run={run} />
          <RoundButton
            icon="chevron-back"
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { top: insets.top + 8 }]}
            tint={colors.white}
          />
          <RoundButton
            icon={saved ? 'heart' : 'heart-outline'}
            onPress={() => store.toggleSaved(run)}
            style={[styles.saveBtn, { top: insets.top + 8 }]}
            tint={saved ? colors.accent : colors.white}
          />
        </View>

        <View style={styles.content}>
          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.locationLine}>
              {locationLine(run).toUpperCase()}
              {run.isAIGenerated && (
                <Text style={styles.generatedTag}>
                  {'  ·  '}GENERATED FOR YOU
                </Text>
              )}
            </Text>
            <Text style={styles.title}>{run.title}</Text>
          </View>

          {/* Facts */}
          <View style={styles.facts}>
            <Fact big={run.distanceKm.toFixed(1)} small="KM" />
            {run.elevationGainM != null && (
              <>
                <Divider />
                <Fact big={`${run.elevationGainM}`} small="M GAIN" />
              </>
            )}
            {run.surface != null && (
              <>
                <Divider />
                <Fact big={surfaceLabel(run.surface)} small="SURFACE" />
              </>
            )}
          </View>

          <View style={styles.hr} />

          {/* Story */}
          <Section label="The Run">
            <Text style={styles.story}>{run.story}</Text>
            <Text style={styles.bestTime}>
              {capitalize(bestTimeLabel(run.bestTime))}.
            </Text>
          </Section>

          {/* Map */}
          <Section label="The Route">
            <View style={styles.mapBox}>
              <RouteMap waypoints={run.waypoints} />
            </View>
          </Section>

          {/* Waypoints */}
          {labeled.length > 0 && (
            <Section label="What You'll Pass">
              <View style={{ gap: 14 }}>
                {labeled.map((w, i) => (
                  <View key={i} style={styles.waypointRow}>
                    <View style={styles.waypointDot}>
                      <Text style={styles.waypointDotText}>
                        {w.label ?? '•'}
                      </Text>
                    </View>
                    <Text style={styles.waypointNote}>{w.note ?? ''}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Post-run */}
          <Section label="The Post-Run Move">
            <View style={styles.postRunBox}>
              <Text style={styles.postRunText}>{run.postRunMove}</Text>
            </View>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Fact({ big, small }: { big: string; small: string }) {
  return (
    <View>
      <Text style={styles.factBig}>{big}</Text>
      <Text style={styles.factSmall}>{small}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.factDivider} />;
}

function RoundButton({
  icon,
  onPress,
  style,
  tint,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  style: any;
  tint: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.roundBtn, style, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={18} color={tint} />
    </Pressable>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 22,
  },
  roundBtn: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: { left: 12 },
  saveBtn: { right: 12 },
  titleBlock: { gap: 8 },
  locationLine: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: colors.muted,
  },
  generatedTag: {
    color: colors.accent,
    fontWeight: '600',
  },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 32,
    color: colors.ink,
  },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  factBig: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 18,
    color: colors.ink,
  },
  factSmall: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.muted,
    marginTop: 1,
  },
  factDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.hair,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(199,186,166,0.5)',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.4,
    color: colors.muted,
  },
  story: {
    fontFamily: fonts.serifRegular,
    fontSize: 17,
    lineHeight: 27,
    color: colors.ink,
  },
  bestTime: {
    fontSize: 15,
    fontStyle: 'italic',
    color: colors.muted,
    marginTop: 4,
  },
  mapBox: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.6)',
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  waypointDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  waypointDotText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  waypointNote: {
    flex: 1,
    fontFamily: fonts.serifRegular,
    fontSize: 17,
    lineHeight: 23,
    color: colors.ink,
  },
  postRunBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.5)',
  },
  postRunText: {
    fontFamily: fonts.serifRegular,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
  },
});
