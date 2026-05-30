import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';

import { RunStoreProvider } from './src/data/store';
import { colors } from './src/theme/theme';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { GenerateScreen } from './src/screens/GenerateScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import type {
  DiscoverStackParamList,
  GenerateStackParamList,
} from './src/navigation/types';

const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const GenerateStack = createNativeStackNavigator<GenerateStackParamList>();
const Tab = createBottomTabNavigator();

function DiscoverStackScreen() {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="DiscoverHome" component={DiscoverScreen} />
      <DiscoverStack.Screen name="Detail" component={DetailScreen} />
    </DiscoverStack.Navigator>
  );
}

function GenerateStackScreen() {
  return (
    <GenerateStack.Navigator screenOptions={{ headerShown: false }}>
      <GenerateStack.Screen name="GenerateHome" component={GenerateScreen} />
      <GenerateStack.Screen name="Detail" component={DetailScreen} />
    </GenerateStack.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.parchment },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
  });

  if (!fontsLoaded) {
    return null; // splash stays up until the serif is ready
  }

  return (
    <SafeAreaProvider>
      <RunStoreProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.muted,
              tabBarStyle: {
                backgroundColor: colors.cream,
                borderTopColor: 'rgba(199,186,166,0.5)',
              },
              tabBarIcon: ({ color, size, focused }) => {
                const name =
                  route.name === 'Discover'
                    ? focused
                      ? 'map'
                      : 'map-outline'
                    : focused
                      ? 'sparkles'
                      : 'sparkles-outline';
                return <Ionicons name={name} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Discover" component={DiscoverStackScreen} />
            <Tab.Screen name="Generate" component={GenerateStackScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </RunStoreProvider>
    </SafeAreaProvider>
  );
}
