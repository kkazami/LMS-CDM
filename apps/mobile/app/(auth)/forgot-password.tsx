import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, AppHeader } from '../../src/components/ui';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/hooks/useTheme';

export default function ForgotPassword() {
  const api = useAuthStore(s => s.api), theme = useTheme(), router = useRouter();
  const [email, setEmail] = useState(''), [otp, setOtp] = useState(''), [password, setPassword] = useState('');
  const [sent, setSent] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function requestCode() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { const result = await api.auth.forgotPassword(email.trim()); setSent(true); setMessage(result.message); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to request a code. Try again.'); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await api.auth.resetPassword(email.trim(), otp.trim(), password); router.replace('/(auth)/login'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reset. Request a new code and try again.'); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Screen scroll withBottomInset contentContainerStyle={{ padding: 20 }}>
    <AppHeader showBack title="Reset password" />
    <Text style={{ color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 20 }}>Use your LMS email. Your six-digit code expires after 15 minutes and permits one attempt. Request a new code if an attempt fails.</Text>
    <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!busy && !sent} />
    {sent && <><Input label="Six-digit code" value={otp} onChangeText={setOtp} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} editable={!busy} /><Input label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" editable={!busy} /><Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>Use 8+ characters with uppercase, lowercase, and a number.</Text></>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, marginBottom: 16 }}>{message}</Text>}
    <Button title={sent ? 'Reset password' : 'Send reset code'} onPress={sent ? reset : requestCode} loading={busy} disabled={!email.trim() || sent && (otp.length !== 6 || password.length < 8)} />
    {sent && <Button title="Request a new code" variant="ghost" disabled={busy} onPress={() => { setSent(false); setOtp(''); setMessage(''); }} />}
  </Screen></KeyboardAvoidingView>;
}
