import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/hooks/useTheme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { API_BASE_URL } from '../../src/lib/constants';

export default function RegisterScreen() {
  const register = useAuthStore(state => state.register), router = useRouter(), theme = useTheme();
  const [name, setName] = useState(''), [studentNumber, setStudentNumber] = useState(''), [email, setEmail] = useState('');
  const [password, setPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState(''), [instituteCode, setInstitute] = useState('ics');
  const [acceptedPolicies, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit() {
    setError('');
    if (!/^\d{2}-\d{5}$/.test(studentNumber)) { setError('Student ID must use XX-XXXXX (26-12345).'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!acceptedPolicies) { setError('Accept the policies to create an account.'); return; }
    setBusy(true);
    try { await register({ name, studentNumber, email, password, confirmPassword, instituteCode, acceptedPolicies }); router.replace('/join-class'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to register.'); }
    finally { setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background }}>
    <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 12 }}>Create your student account</Text>
    <Text style={{ color: theme.colors.textSecondary, lineHeight: 24, marginBottom: 20 }}>After registration, join a class in your institute with your instructor’s code.</Text>
    <Text style={{ color: theme.colors.text, marginBottom: 8 }}>Institute</Text>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>{['ics', 'ite', 'ibe'].map(code => <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: instituteCode === code }} disabled={busy} onPress={() => setInstitute(code)} style={{ flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: instituteCode === code ? theme.colors.primary : theme.colors.card }}><Text style={{ textAlign: 'center', fontWeight: '600', color: instituteCode === code ? '#fff' : theme.colors.text }}>{code.toUpperCase()}</Text></Pressable>)}</View>
    <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" maxLength={150} editable={!busy} />
    <Input label="Student ID (XX-XXXXX)" placeholder="26-12345" value={studentNumber} onChangeText={setStudentNumber} maxLength={8} editable={!busy} />
    <Input label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" editable={!busy} />
    <Input label="Password" value={password} onChangeText={setPassword} autoComplete="new-password" secureTextEntry editable={!busy} />
    <Text style={{ color: theme.colors.textSecondary, marginBottom: 16 }}>Use 8+ characters with uppercase, lowercase, and a number.</Text>
    <Input label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" secureTextEntry editable={!busy} />
    <Button title="Read Terms and Conditions" variant="ghost" onPress={() => { void Linking.openURL(API_BASE_URL + '/terms'); }} />
    <Button title="Read Privacy Policy" variant="ghost" onPress={() => { void Linking.openURL(API_BASE_URL + '/privacy'); }} />
    <Button title={acceptedPolicies ? '✓ I accept the Terms and Privacy Policy' : 'Accept the Terms and Privacy Policy'} variant="outline" disabled={busy} onPress={() => setAccepted(!acceptedPolicies)} />
    {error ? <Text accessibilityRole="alert" style={{ color: '#b42318', marginVertical: 16 }}>{error}</Text> : null}
    <Button title="Create account" onPress={submit} loading={busy} disabled={busy} style={{ marginTop: 20 }} />
    <Button title="Back to sign in" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
    <Button title="Register with Google in the web portal" variant="ghost" onPress={() => { void Linking.openURL(API_BASE_URL + '/register?institute=' + instituteCode); }} />
  </ScrollView>;
}
