import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { useTheme } from '../src/hooks/useTheme';

/**
 * Root Gateway Router.
 * Directs users to the appropriate interface based on session state and verified role:
 * - Unauthenticated -> /(auth)/login
 * - STUDENT -> /student/dashboard
 * - PROFESSOR / TEACHER -> /teacher/dashboard
 * - ADMIN -> /unsupported-role
 */
export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingBox}>
          <Text style={[styles.brandTitle, { color: theme.colors.primary }]}>CdM LMS</Text>
          <Text style={[styles.brandSubtitle, { color: theme.colors.textSecondary }]}>
            Learning Management System
          </Text>
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
        </View>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = (user.role || '').toUpperCase();

  if (role === 'STUDENT') {
    return <Redirect href="/student/dashboard" />;
  }

  if (role === 'PROFESSOR' || role === 'TEACHER') {
    return <Redirect href="/teacher/dashboard" />;
  }

  if (role === 'ADMIN') {
    return <Redirect href="/unsupported-role" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    padding: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 32,
  },
});
