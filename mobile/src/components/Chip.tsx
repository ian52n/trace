import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import type { IoniconName } from '../models/run';

/** Pill toggle used for filters (Discover) and the distance/vibe pickers
 *  (Generate). Filled ink when active, outlined cream when not. */
export function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: IoniconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {icon && (
          <Ionicons
            name={icon}
            size={11}
            color={active ? colors.cream : colors.ink}
          />
        )}
        <Text
          style={[styles.label, { color: active ? colors.cream : colors.ink }]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 100,
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  chipInactive: {
    backgroundColor: colors.cream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199,186,166,0.6)',
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
