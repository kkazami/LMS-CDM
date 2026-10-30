import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/common/Button';

export default function GoogleReturnScreen() {
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const theme = useTheme(), router = useRouter();
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setInterrupted(true), 15000); return () => clearTimeout(timer); }, []);
  if (authenticated) return <Redirect href="/" />;
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20, backgroundColor: theme.colors.background }}>
    {!interrupted && <ActivityIndicator color={theme.colors.primary} />}
    <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.text, textAlign: 'center', fontSize: 16, lineHeight: 24 }}>{interrupted ? 'Sign-in was interrupted. Return to login and try Google again.' : 'Completing Google sign-in…'}</Text>
    {interrupted && <Button title="Return to login" onPress={() => router.replace('/(auth)/login')} />}
  </View>;
}
