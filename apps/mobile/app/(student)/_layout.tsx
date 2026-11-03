import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { ActivityIndicator, View } from 'react-native';

export default function StudentRootLayout() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator accessibilityLabel="Opening your learning space" /></View>;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== 'STUDENT') return <Redirect href="/" />;
  if (user?.requiresEnrollment) return <Redirect href="/join-class" />;
  return (
    <Stack
      key={user?.id}
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
