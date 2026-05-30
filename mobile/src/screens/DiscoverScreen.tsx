/**
 * Discover — the curated atlas feed.
 *
 * A `FlatList` of run cards (newest generated runs first, then the curated
 * atlas) with an editorial header and an All / Saved filter. Tapping a card
 * pushes the Detail screen. Generated and saved runs come from the store; the
 * curated set is bundled.
 */
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRunStore } from '../data/store';
import type { Run } from '../models/run';
import { colors, fonts } from '../theme/theme';
import { RunCard } from '../components/RunCard';
import type { DiscoverHomeProps } from '../navigation/types';

export function DiscoverScreen({ navigation }: DiscoverHomeProps) {
  const store = useRunStore();
  const insets = useSafeAreaInsets();
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // `insets.top` because the feed runs under the status bar (no nav header).
  const runs = showSavedOnly ? store.savedRuns : store.allRuns;

  return (
    <View style={styles.container}>
      <FlatList
        data={runs}
        keyExtractor={(run) => run.id}
        contentContainerStyle={{
          paddingTop: insets.top + 4,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          <Header
            showSavedOnly={showSavedOnly}
            savedCount={store.savedIds.size}
            onAll={() => setShowSavedOnly(false)}
            onSaved={() => setShowSavedOnly(true)}
          />
        }
        ListEmptyComponent={<EmptyState showingSaved={showSavedOnly} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Detail', { run: item })}
            style={({ pressed }) => [
              styles.cardWrap,
              pressed && { opacity: 0.85 },
            ]}
          >
            <RunCard run={item} />
          </Pressable>
        )}
      />
    </View>
  );
}

function Header({
  showSavedOnly,
  savedCount,
  onAll,
  onSaved,
}: {
  showSavedOnly: boolean;
  savedCount: number;
  onAll: () => void;
  onSaved: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>TRACE</Text>
      <Text style={styles.display}>Runs as destinations.</Text>
      <Text style={styles.subtitle}>
        A small atlas of runs worth traveling for.
      </Text>

      <View style={styles.filters}>
        <FilterChip label="All" active={!showSavedOnly} onPress={onAll} />
        <FilterChip
          label={savedCount > 0 ? `Saved · ${savedCount}` : 'Saved'}
          icon="heart"
          active={showSavedOnly}
          onPress={onSaved}
        />
      </View>
    </View>
  );
}

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: 'heart';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        active ? styles.filterActive : styles.filterInactive,
      ]}
    >
      {icon && (
        <Ionicons
          name={active ? 'heart' : 'heart-outline'}
          size={11}
          color={active ? colors.cream : colors.ink}
        />
      )}
      <Text
        style={[
          styles.filterLabel,
          { color: active ? colors.cream : colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ showingSaved }: { showingSaved: boolean }) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name={showingSaved ? 'heart-outline' : 'map-outline'}
        size={36}
        color="rgba(107,94,82,0.6)"
      />
      <Text style={styles.emptyTitle}>
        {showingSaved ? 'No saved runs yet' : 'No runs yet'}
      </Text>
      <Text style={styles.emptyBody}>
        {showingSaved
          ? 'Tap the heart on any run to keep it here.'
          : 'Generate a run from the Generate tab.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  cardWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    color: colors.accent,
  },
  display: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 32,
    color: colors.ink,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  filterActive: {
    backgroundColor: colors.ink,
  },
  filterInactive: {
    backgroundColor: colors.cream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.6)',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 22,
    color: colors.ink,
  },
  emptyBody: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
});
