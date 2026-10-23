import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';

export default function StudentRootLayout() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.requiresEnrollment) return <Redirect href="/join-class" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
