import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, GraduationCap, Building2, BookOpen, ShieldCheck, Sparkles } from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../src/stores/auth-store';
import { getInstituteTheme, INSTITUTE_LIST, type InstituteCode } from '../../src/lib/theme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { TOUCH_TARGET } from '../../src/lib/typography';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [selectedInstitute, setSelectedInstitute] = useState<InstituteCode>('ics');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic theme based on selected institute
  const currentTheme = getInstituteTheme(selectedInstitute, false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await login(email.trim().toLowerCase(), password, selectedInstitute);

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
        router.replace('/student/dashboard');
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Branding */}
          <View style={styles.header}>
            <View style={[styles.brandLogo, { backgroundColor: currentTheme.colors.primary }]}>
              <GraduationCap size={36} color="#FFFFFF" />
            </View>
            <Text style={[styles.appName, { color: currentTheme.colors.text }]}>CdM LMS</Text>
            <Text style={[styles.instituteSubheading, { color: currentTheme.colors.primary }]}>
              {currentTheme.name}
            </Text>
          </View>

          {/* Institute Selector Tabs */}
          <View style={[styles.instituteSelectorContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border }]}>
            <Text style={[styles.selectorLabel, { color: currentTheme.colors.textSecondary }]}>
              SELECT YOUR INSTITUTE
            </Text>
            <View style={styles.instituteRow}>
              {INSTITUTE_LIST.map((inst) => {
                const isSelected = selectedInstitute === inst.code;
                const instTheme = getInstituteTheme(inst.code, false);
                return (
                  <TouchableOpacity
                    key={inst.code}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={inst.name}
                    style={[
                      styles.instituteTab,
                      {
                        backgroundColor: isSelected ? instTheme.colors.primary : 'transparent',
                        borderColor: isSelected ? instTheme.colors.primary : currentTheme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedInstitute(inst.code)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.instituteTabText,
                        {
                          color: isSelected ? '#FFFFFF' : currentTheme.colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {inst.short}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Login Card */}
          <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>
              Sign In
            </Text>
            <Text style={[styles.cardSubtitle, { color: currentTheme.colors.textSecondary }]}>
              Access your courses, tasks, and campus resources
            </Text>

            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: `${currentTheme.colors.danger}15`, borderColor: currentTheme.colors.danger }]}>
                <Text style={[styles.errorText, { color: currentTheme.colors.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <Input
              label="Email Address"
              placeholder="e.g. user@cdm.edu.ph"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              ringColor={currentTheme.colors.primary}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              ringColor={currentTheme.colors.primary}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              icon={LogIn}
              style={[styles.loginButton, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }]}
            />
          </View>

          {/* Quick Registration Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: currentTheme.colors.textSecondary }]}>
              New student at CdM?
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.registerLink}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.registerLinkText, { color: currentTheme.colors.primary }]}>
                Create an Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
  },
  instituteSubheading: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  instituteSelectorContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  instituteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  instituteTab: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  instituteTabText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  loginButton: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: TOUCH_TARGET,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    paddingVertical: 4,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
