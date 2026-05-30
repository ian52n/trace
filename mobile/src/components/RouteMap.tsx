import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import type { Waypoint } from '../models/run';
import { colors } from '../theme/theme';

/** Read-only route preview: an accent polyline through every waypoint, with
 *  numbered pins on the labeled stops. */
export function RouteMap({ waypoints }: { waypoints: Waypoint[] }) {
  const region = useMemo(() => regionFor(waypoints), [waypoints]);
  const coords = useMemo(
    () => waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng })),
    [waypoints]
  );

  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
      {coords.length >= 2 && (
        <Polyline
          coordinates={coords}
          strokeColor={colors.accent}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {waypoints.map((w, i) =>
        w.label ? (
          <Marker
            key={`${i}-${w.label}`}
            coordinate={{ latitude: w.lat, longitude: w.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={w.note ?? undefined}
          >
            <WaypointPin label={w.label} />
          </Marker>
        ) : null
      )}
    </MapView>
  );
}

function WaypointPin({ label }: { label: string }) {
  return (
    <View style={styles.pin}>
      <Text style={styles.pinText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function regionFor(waypoints: Waypoint[]): Region {
  if (waypoints.length === 0) {
    return {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }
  const lats = waypoints.map((w) => w.lat);
  const lngs = waypoints.map((w) => w.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
  };
}

const styles = StyleSheet.create({
  pin: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  pinText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
