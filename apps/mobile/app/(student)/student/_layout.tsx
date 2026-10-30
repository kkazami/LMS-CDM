import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Stack } from 'expo-router';

export default function StudentLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'fade' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="codelab/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="practical-labs/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="assessment" options={{ gestureEnabled: false }} />
      <Stack.Screen name="announcements/index" options={{ headerShown: false }} />
      <Stack.Screen name="achievements/index" options={{ headerShown: false }} />
      <Stack.Screen name="meetings/index" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge-exchange/index" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
