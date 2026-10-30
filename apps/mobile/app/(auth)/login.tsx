import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { LogIn, Mail, LockKeyhole, Eye, EyeOff, Check, Sun, Moon } from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth-store';
import { useThemeStore } from '../../src/stores/theme-store';
import { getInstituteTheme, INSTITUTE_LIST, type InstituteCode } from '../../src/lib/theme';
import { Button } from '../../src/components/common/Button';
import { API_BASE_URL } from '../../src/lib/constants';
import { getCachedData } from '../../src/lib/offline-storage';
import { restoreStudentReturn } from '../../src/lib/student-navigation';
import { startGoogleLogin } from '../../src/lib/google-login';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore(s => s.loginWithGoogle);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const insets = useSafeAreaInsets();

  const [selectedInstitute, setSelectedInstitute] = useState<InstituteCode>('ics');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const busy = loading || googleBusy;
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize theme from storage/system on mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Dynamic theme based on selected institute and active theme mode (light/dark)
  const currentTheme = getInstituteTheme(selectedInstitute, isDark);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canvas = isDark ? '#0F131C' : '#FAF9F5';
  const surface = isDark ? '#191F2A' : '#FFFFFF';
  const ink = isDark ? '#F1F5F9' : '#101824';
  const secondary = isDark ? '#B6C0D0' : '#52627A';
  const border = isDark ? '#364051' : '#DFE4DB';
  const field = isDark ? '#121823' : '#FAFBF8';
  const openPolicy = (path: string) => { void Linking.openURL(`${API_BASE_URL}${path}`).catch(() => setErrorMessage('Unable to open the policy. Please try again.')); };

  const handleLogin = async () => {
    if (busy) return;
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!acceptedPolicies) {
      setErrorMessage('Agree to the Terms and Conditions and acknowledge the Privacy Policy to sign in.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await login(email.trim().toLowerCase(), password, selectedInstitute, acceptedPolicies);

      try {
        Burnt.toast({
          title: 'Welcome back!',
          message: `Signed in as ${response.user.name}`,
          preset: 'done',
        });
      } catch {
        // Ignore native toast failure
      }

      const role = (response.user.role || '').toUpperCase();
      if (role === 'STUDENT') {
        const savedTarget = await getCachedData<string>('return_intent');
        const target = restoreStudentReturn(savedTarget);
        router.replace((response.user.requiresEnrollment ? '/join-class' : target || '/student/dashboard') as any);
      } else if (role === 'PROFESSOR' || role === 'TEACHER') {
        router.replace('/teacher/dashboard');
      } else if (role === 'ADMIN') {
        router.replace('/unsupported-role');
      } else {
        router.replace('/student/dashboard');
      }
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please verify your credentials.';
      setErrorMessage(msg);
      try {
        Burnt.toast({
          title: 'Authentication Error',
          message: msg,
          preset: 'error',
        });
      } catch {
        // Fallback alert
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    if (!acceptedPolicies) {
      setErrorMessage('Agree to the Terms and Conditions and acknowledge the Privacy Policy to continue with Google.');
      return;
    }
    setGoogleBusy(true);
    setErrorMessage(null);
    try {
      const response = await loginWithGoogle(() => startGoogleLogin(selectedInstitute, acceptedPolicies));
      if (!response) return;
      // The gateway applies the same institute, role and enrollment routing as password sign-in.
      const savedTarget = await getCachedData<string>('return_intent');
      router.replace((response.user.requiresEnrollment ? '/join-class' : restoreStudentReturn(savedTarget) || '/') as never);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Google sign-in could not be completed. Please try again.');
    } finally { setGoogleBusy(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: canvas }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.intro}>
        <Text style={[styles.headline, { color: ink }]}>Your next chapter</Text>
        <View><Text style={[styles.serif, { color: ink }]}>starts here.</Text><View style={styles.underline} /></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Use ${isDark ? 'light' : 'dark'} appearance`} onPress={event => { void toggleTheme({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }); }} style={styles.themeToggle}>
          {isDark ? <Sun size={19} color={secondary} /> : <Moon size={19} color={secondary} />}
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { backgroundColor: surface }]}>
        <Image source={require('../../assets/cdm-logo.png')} style={styles.crest} resizeMode="contain" accessibilityLabel="Colegio de Montalban crest" />
        <Text style={[styles.welcome, { color: ink }]}>Welcome back.</Text>
        <Text style={[styles.subtitle, { color: secondary }]}>Sign in to your CdM learning space.</Text>
        <Text style={[styles.label, { color: ink }]}>Select your institute</Text>
        <View style={[styles.institutes, { backgroundColor: field, borderColor: border }]}>
          {(['ics', 'ite', 'ibe'] as const).map(code => {
            const institute = INSTITUTE_LIST.find(item => item.code === code)!;
            const selected = selectedInstitute === code;
            return <TouchableOpacity key={code} accessibilityRole="tab" accessibilityLabel={institute.name} accessibilityState={{ selected }} disabled={busy} onPress={() => setSelectedInstitute(code)} style={[styles.institute, { backgroundColor: selected ? isDark ? '#2C3544' : '#EEF1F5' : 'transparent', borderColor: selected ? border : 'transparent' }]}>
              <Text style={{ color: selected ? ink : secondary, fontSize: 13, fontWeight: selected ? '600' : '400' }}>{code.toUpperCase()}</Text>
            </TouchableOpacity>;
          })}
        </View>
        <View style={styles.instituteName}><View style={[styles.dot, { backgroundColor: currentTheme.colors.primary }]} /><Text style={[styles.helper, { color: secondary }]}>{currentTheme.name}</Text></View>
        {!!errorMessage && <Text accessibilityRole="alert" style={[styles.error, { color: isDark ? '#FDA4AF' : '#B42318' }]}>{errorMessage}</Text>}
        <Text style={[styles.label, { color: ink }]}>Email or student ID</Text>
        <View style={[styles.field, { backgroundColor: field, borderColor: border }]}><Mail size={17} color={secondary} />
          <TextInput accessibilityLabel="Email or Student ID" value={email} onChangeText={setEmail} placeholder="Enter your email or student ID" placeholderTextColor={secondary} style={[styles.input, { color: ink }]} autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!busy} returnKeyType="next" />
        </View>
        <Text style={[styles.label, { color: ink, marginTop: 18 }]}>Password</Text>
        <View style={[styles.field, { backgroundColor: field, borderColor: border }]}><LockKeyhole size={17} color={secondary} />
          <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={secondary} style={[styles.input, { color: ink }]} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" editable={!busy} returnKeyType="go" onSubmitEditing={() => { if (!busy) void handleLogin(); }} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} style={styles.eye} onPress={() => setPasswordVisible(value => !value)}>{passwordVisible ? <EyeOff size={17} color={secondary} /> : <Eye size={17} color={secondary} />}</TouchableOpacity>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.forgot} onPress={() => router.push('/(auth)/forgot-password')}><Text style={[styles.helper, { color: ink, textDecorationLine: 'underline' }]}>Forgot Password?</Text></TouchableOpacity>
        <View style={styles.consent}>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="I agree to the Terms and Conditions and acknowledge the Privacy Policy" accessibilityState={{ checked: acceptedPolicies, disabled: busy }} disabled={busy} style={styles.checkTarget} onPress={() => setAcceptedPolicies(value => !value)}>
            <View style={[styles.checkbox, { borderColor: secondary, backgroundColor: acceptedPolicies ? ink : 'transparent' }]}>{acceptedPolicies && <Check size={14} color={surface} />}</View>
          </TouchableOpacity>
          <Text style={[styles.helper, { flex: 1, color: secondary }]}>I agree to the <Text accessibilityRole="link" onPress={() => openPolicy('/terms')} style={{ color: ink, textDecorationLine: 'underline' }}>Terms and Conditions</Text> and acknowledge the <Text accessibilityRole="link" onPress={() => openPolicy('/privacy')} style={{ color: ink, textDecorationLine: 'underline' }}>Privacy Policy</Text>.</Text>
        </View>
        <View style={styles.register}><Text style={[styles.helper, { color: secondary }]}>Need an account?</Text><TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(auth)/register')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[styles.helper, { color: ink, fontWeight: '600' }]}>Create student account</Text></TouchableOpacity></View>
        <Button title="Sign In" icon={LogIn} loading={loading} disabled={googleBusy} onPress={handleLogin} textColor="#FFFFFF" style={{ backgroundColor: isDark ? '#334A69' : '#101824', borderColor: 'transparent', borderRadius: 9, marginTop: 12, minHeight: 48 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 }}><View style={{ flex: 1, height: 1, backgroundColor: border }} /><Text style={[styles.helper, { color: secondary }]}>or</Text><View style={{ flex: 1, height: 1, backgroundColor: border }} /></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ disabled: busy, busy: googleBusy }} disabled={busy} onPress={() => { void handleGoogle(); }} style={{ minHeight: 48, borderWidth: 1, borderColor: border, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, opacity: busy ? 0.6 : 1 }}>
          {googleBusy ? <ActivityIndicator size="small" color={ink} /> : <Svg width={19} height={19} viewBox="0 0 48 48" accessible={false}>
            <Path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.6c3.9-3.6 6.1-8.8 6.1-15.1Z" />
            <Path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.2c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z" />
            <Path fill="#FBBC05" d="M12.6 27.4a12.3 12.3 0 0 1 0-7.8v-5.3H5.8a20.2 20.2 0 0 0 0 18.4l6.8-5.3Z" />
            <Path fill="#EA4335" d="M24 11.2c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 3 20.4 20.4 0 0 0 5.8 14.3l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z" />
          </Svg>}
          <Text style={{ color: ink, fontSize: 14, fontWeight: '600' }}>{googleBusy ? 'Connecting to Google…' : 'Continue with Google'}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.support} onPress={() => { void Linking.openURL(`${API_BASE_URL}/support`).catch(() => setErrorMessage('Unable to open support. Please try again.')); }}><Text style={[styles.helper, { color: secondary }]}>Login help and support</Text></TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, alignItems: 'center' },
  intro: { alignItems: 'center', marginBottom: 28, width: '100%', maxWidth: 420, paddingTop: 4 },
  headline: { fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.8, textAlign: 'center' },
  serif: { fontSize: 31, lineHeight: 38, fontStyle: 'italic', fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textAlign: 'center' },
  underline: { height: 4, backgroundColor: '#DDC46D', borderRadius: 4, marginTop: -1, transform: [{ rotate: '-2deg' }] },
  themeToggle: { position: 'absolute', right: -12, top: -10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, shadowColor: '#172035', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3 },
  crest: { width: 54, height: 54, alignSelf: 'center', marginBottom: 12 },
  welcome: { fontSize: 23, lineHeight: 30, fontWeight: '700', textAlign: 'center', letterSpacing: -0.7 },
  subtitle: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 4, marginBottom: 26 },
  label: { fontSize: 14, lineHeight: 21, marginBottom: 7 },
  institutes: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 9 },
  institute: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  instituteName: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  helper: { fontSize: 13, lineHeight: 20 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 9, paddingLeft: 12, minHeight: 48 },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 12, paddingRight: 8 },
  eye: { minWidth: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  forgot: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginTop: 2 },
  consent: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  checkTarget: { width: 44, minHeight: 44, alignItems: 'flex-start', paddingTop: 2 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  register: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 4, marginTop: 4 },
  support: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  error: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
});
