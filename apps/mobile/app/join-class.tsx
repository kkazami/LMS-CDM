import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { useTheme } from '../src/hooks/useTheme';
import { Input } from '../src/components/common/Input';
import { Button } from '../src/components/common/Button';

export default function JoinClass() {
  const { user, api, isAuthenticated, setUser, logout } = useAuthStore();
  const theme = useTheme(), router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!isAuthenticated || !user) return <Redirect href="/(auth)/login" />;
  if (!user.requiresEnrollment) return <Redirect href="/" />;
  async function join() {
    setBusy(true); setError('');
    try { await api.courses.joinWithCode(code); const response = await api.auth.me(); setUser(response.user); router.replace('/'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to join class.'); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, insets.bottom), backgroundColor: theme.colors.background }}>
    <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 16 }}>Join your first class</Text>
    <Text style={{ color: theme.colors.textSecondary, lineHeight: 24, marginBottom: 24 }}>Your account belongs to {user.institute.code.toUpperCase()}. Enter a code from an instructor in this institute to unlock your learning space.</Text>
    <Input label="Class code" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={32} editable={!busy} />
    {error ? <Text accessibilityRole="alert" style={{ color: theme.isDark ? '#FCA5A5' : '#b42318', marginBottom: 16 }}>{error}</Text> : null}
    <Button title="Join class and continue" onPress={join} loading={busy} disabled={busy || !code.trim()} />
    <Button title="Sign out" variant="ghost" disabled={busy} onPress={() => { void logout().then(() => router.replace('/(auth)/login')); }} />
  </ScrollView></KeyboardAvoidingView>;
}
