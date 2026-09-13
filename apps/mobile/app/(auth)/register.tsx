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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../src/stores/auth-store';
import { getInstituteTheme, INSTITUTE_LIST, type InstituteCode } from '../../src/lib/theme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { TOUCH_TARGET } from '../../src/lib/typography';

export default function RegisterScreen() {
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const login = useAuthStore((s) => s.login);

  const [selectedInstitute, setSelectedInstitute] = useState<InstituteCode>('ics');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentTheme = getInstituteTheme(selectedInstitute, false);

  const handleRegister = async () => {
    // 1. Validation
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!/^\d{2}-\d{5}$/.test(studentNumber.trim())) {
      setErrorMessage('Student number must follow the format XX-XXXXX (e.g., 23-00875).');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await api.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        studentNumber: studentNumber.trim(),
        password,
        confirmPassword,
        instituteCode: selectedInstitute,
      });

      try {
        Burnt.toast({
          title: 'Account Created!',
          message: 'Signing you into CdM LMS...',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      // Automatically sign in the new student
      await login(email.trim().toLowerCase(), password, selectedInstitute);
      router.replace('/student/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      try {
        Burnt.toast({
          title: 'Registration Error',
          message: msg,
          preset: 'error',
        });
      } catch {
        // Fallback
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
          {/* Header */}
          <View style={styles.topNav}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { borderColor: currentTheme.colors.border }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.navTitle, { color: currentTheme.colors.text }]}>
              Student Registration
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Institute Selection */}
          <View style={[styles.instituteSelectorContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border }]}>
            <Text style={[styles.selectorLabel, { color: currentTheme.colors.textSecondary }]}>
              CHOOSE YOUR INSTITUTE
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
            <Text style={[styles.selectedInstituteName, { color: currentTheme.colors.primary }]}>
              {currentTheme.name}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>
              Create Student Account
            </Text>
            <Text style={[styles.cardSubtitle, { color: currentTheme.colors.textSecondary }]}>
              Join your institute's digital classrooms and academic community
            </Text>

            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: `${currentTheme.colors.danger}15`, borderColor: currentTheme.colors.danger }]}>
                <Text style={[styles.errorText, { color: currentTheme.colors.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <Input
              label="Full Name"
              placeholder="e.g. Maria Santos"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              ringColor={currentTheme.colors.primary}
            />

            <Input
              label="Email Address"
              placeholder="e.g. msantos@cdm.edu.ph"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              ringColor={currentTheme.colors.primary}
            />

            <Input
              label="Student Number (Format: 23-00875)"
              placeholder="e.g. 23-00875"
              value={studentNumber}
              onChangeText={setStudentNumber}
              autoCapitalize="none"
              autoCorrect={false}
              ringColor={currentTheme.colors.primary}
            />

            <Input
              label="Password (min. 6 characters)"
              placeholder="Create a strong password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              ringColor={currentTheme.colors.primary}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              ringColor={currentTheme.colors.primary}
            />

            <Button
              title="Create Student Account"
              onPress={handleRegister}
              loading={loading}
              icon={UserPlus}
              style={[styles.submitButton, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }]}
            />
          </View>

          {/* Return to Login */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: currentTheme.colors.textSecondary }]}>
              Already registered?
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={styles.loginLink}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.loginLinkText, { color: currentTheme.colors.primary }]}>
                Sign In
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  selectedInstituteName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
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
    fontSize: 20,
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
  submitButton: {
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
  loginLink: {
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
