import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Run } from '../models/run';

/** Each tab owns a stack that can push the shared Detail screen. */
export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  Detail: { run: Run };
};

export type GenerateStackParamList = {
  GenerateHome: undefined;
  Detail: { run: Run };
};

export type DiscoverHomeProps = NativeStackScreenProps<
  DiscoverStackParamList,
  'DiscoverHome'
>;
export type GenerateHomeProps = NativeStackScreenProps<
  GenerateStackParamList,
  'GenerateHome'
>;

// Detail is reachable from either stack; the param shape is identical.
export type DetailProps = NativeStackScreenProps<
  DiscoverStackParamList & GenerateStackParamList,
  'Detail'
>;
