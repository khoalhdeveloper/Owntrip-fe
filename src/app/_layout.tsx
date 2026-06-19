import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfirmProvider } from '@/components/ConfirmProvider';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ui/ToastConfig';
import { applyAppTextDefaults } from '@/utils/appDefaults';

applyAppTextDefaults();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ConfirmProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="decorations" options={{ title: 'Decoration' }} />
            <Stack.Screen name="achievement" options={{ title: 'Achievement' }} />
            <Stack.Screen name="missions" options={{ title: 'Missions' }} />
            <Stack.Screen name="trip" />
            <Stack.Screen name="create-trip" />
            <Stack.Screen name="instant-plan" />
            <Stack.Screen name="hotel-management" />
          </Stack>
          <Toast config={toastConfig} />
        </ConfirmProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
