import React from 'react';
import { Stack } from 'expo-router';

export default function CheckinLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="frame" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
