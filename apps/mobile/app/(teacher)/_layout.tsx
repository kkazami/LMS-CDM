import React from 'react';
import { Stack } from 'expo-router';

export default function TeacherRootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
