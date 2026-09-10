import React from 'react';
import { Stack } from 'expo-router';

export default function StudentRootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
