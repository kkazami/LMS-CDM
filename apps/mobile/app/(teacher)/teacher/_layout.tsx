import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Stack } from 'expo-router';

export default function TeacherLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'fade' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="codelab/index" />
      <Stack.Screen name="practical-labs/index" />
      <Stack.Screen name="meetings/index" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge-exchange/index" options={{ headerShown: false }} />
    </Stack>
  );
}
