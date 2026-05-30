import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config. The Android Google Maps key is read from the environment so
 * no key is committed: set GOOGLE_MAPS_API_KEY (e.g. in mobile/.env) before
 * `expo prebuild` / EAS build. iOS uses Apple Maps and needs no key.
 */
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

const config: ExpoConfig = {
  name: 'Trace',
  slug: 'trace',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'trace',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.iannorris.trace',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Trace uses your location to suggest runs near you.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.iannorris.trace',
    adaptiveIcon: {
      backgroundColor: '#F5F0E3',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: { apiKey: googleMapsApiKey },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-font',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Trace uses your location to suggest runs near you.',
      },
    ],
    // Sets the iOS development team + automatic signing at prebuild time so
    // physical-device builds are repeatable without hand-editing the pbxproj.
    './plugins/withIosSigning',
  ],
};

export default config;
