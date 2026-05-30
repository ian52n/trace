import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRunStore } from '../data/store';
import { vibeIcon, vibeLabel, type Vibe } from '../models/run';
import { colors, fonts } from '../theme/theme';
import { Chip } from '../components/Chip';
import {
  makeAIService,
  usingClaude,
  type GenerationStage,
} from '../services/aiService';
import type { GenerateHomeProps } from '../navigation/types';

const DEFAULT_REGION: Region = {
  latitude: 40.7295,
  longitude: -73.9965,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const DISTANCE_OPTIONS = [5, 8, 12, 16, 21];
const VIBE_OPTIONS: Vibe[] = ['historic', 'nature', 'weird', 'coffee'];

const service = makeAIService();

export function GenerateScreen({ navigation }: GenerateHomeProps) {
  const store = useRunStore();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // Pin tracks the map center (crosshair stays fixed in the middle).
  const pin = useRef({
    lat: DEFAULT_REGION.latitude,
    lng: DEFAULT_REGION.longitude,
  });
  const [distance, setDistance] = useState(8);
  const [vibe, setVibe] = useState<Vibe>('historic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState<GenerationStage>('searching');

  async function locateMe() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        500
      );
    } catch {
      // Location unavailable — keep the current pin.
    }
  }

  async function generate() {
    setIsGenerating(true);
    setStage('searching');
    try {
      const run = await service.generateRun(
        {
          center: { lat: pin.current.lat, lng: pin.current.lng },
          cityHint: null,
          distanceKm: distance,
          vibe,
        },
        (s) => setStage(s)
      );
      store.addGenerated(run);
      setIsGenerating(false);
      navigation.navigate('Detail', { run });
    } catch {
      setIsGenerating(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 60,
        }}
      >
        {/* Header */}
        <View style={{ gap: 4 }}>
          <Text style={styles.eyebrow}>GENERATE</Text>
          <Text style={styles.display}>Build a run from where you are.</Text>
          <Text style={styles.subtitle}>
            Drop a pin. Pick a distance and a feeling. We'll write the rest.
          </Text>
        </View>

        {/* Map pin picker */}
        <View style={styles.mapBox}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={DEFAULT_REGION}
            onRegionChangeComplete={(r) => {
              pin.current = { lat: r.latitude, lng: r.longitude };
            }}
          >
            {/* Invisible marker keeps Google Maps happy on Android; the visible
                indicator is the fixed crosshair below. */}
            <Marker
              coordinate={{
                latitude: DEFAULT_REGION.latitude,
                longitude: DEFAULT_REGION.longitude,
              }}
              opacity={0}
            />
          </MapView>

          {/* Fixed center crosshair */}
          <View pointerEvents="none" style={styles.crosshairWrap}>
            <View style={styles.crosshair}>
              <Ionicons name="add" size={16} color={colors.white} />
            </View>
          </View>

          <Pressable style={styles.locateBtn} onPress={locateMe} hitSlop={8}>
            <Ionicons name="locate" size={18} color={colors.ink} />
          </Pressable>
        </View>

        {/* Inputs */}
        <View style={{ gap: 18, marginTop: 22 }}>
          <View style={{ gap: 10 }}>
            <Text style={styles.inputLabel}>DISTANCE</Text>
            <View style={styles.chipRow}>
              {DISTANCE_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={`${d} km`}
                  active={distance === d}
                  onPress={() => setDistance(d)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={styles.inputLabel}>VIBE</Text>
            <View style={styles.chipRow}>
              {VIBE_OPTIONS.map((v) => (
                <Chip
                  key={v}
                  label={vibeLabel(v)}
                  icon={vibeIcon(v)}
                  active={vibe === v}
                  onPress={() => setVibe(v)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Generate button */}
        <Pressable
          onPress={generate}
          disabled={isGenerating}
          style={({ pressed }) => [
            styles.generateBtn,
            pressed && { opacity: 0.85 },
            isGenerating && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="sparkles" size={15} color={colors.cream} />
          <Text style={styles.generateText}>Generate a run</Text>
        </Pressable>

        <Text style={styles.footnote}>
          {usingClaude
            ? 'Generation runs server-side: a Cloudflare Worker finds real nearby places, stitches a walking loop, and asks Claude to write it up. The Anthropic key stays a server-side secret; no key ships in the app.'
            : 'AI generation is mocked in this build for offline demos. Set the Worker URL in src/config.ts to enable real generation.'}
        </Text>
      </ScrollView>

      {isGenerating && <GeneratingOverlay vibe={vibe} stage={stage} />}
    </View>
  );
}

function GeneratingOverlay({
  vibe,
  stage,
}: {
  vibe: Vibe;
  stage: GenerationStage;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const message =
    stage === 'searching'
      ? 'Looking for things worth running past…'
      : stage === 'routing'
        ? 'Tracing your route…'
        : 'Asking Claude to write it up…';

  return (
    <View style={styles.overlay}>
      <Animated.View style={{ opacity: pulse }}>
        <Ionicons name={vibeIcon(vibe)} size={40} color={colors.white} />
      </Animated.View>
      <Text style={styles.overlayText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    color: colors.accent,
    marginTop: 6,
  },
  display: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 32,
    color: colors.ink,
  },
  subtitle: { fontSize: 15, color: colors.muted },
  mapBox: {
    height: 260,
    marginTop: 22,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.6)',
  },
  crosshairWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(156,66,33,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.8)',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.4,
    color: colors.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  generateText: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 17,
    color: colors.cream,
  },
  footnote: {
    fontSize: 12,
    color: 'rgba(107,94,82,0.85)',
    marginTop: 14,
    lineHeight: 17,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 36,
  },
  overlayText: {
    fontFamily: fonts.serifRegular,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
});
