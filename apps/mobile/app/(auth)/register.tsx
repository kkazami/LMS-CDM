import { getOnPrimaryColor } from '../../src/lib/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Briefcase,
  UserCheck,
  GraduationCap,
  Sparkles,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/hooks/useTheme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { API_BASE_URL } from '../../src/lib/constants';

interface ProgramOption {
  code: string;
  name: string;
  subtitle: string;
  icon?: typeof Briefcase;
}

const IBE_PROGRAM_OPTIONS: ProgramOption[] = [
  {
    code: 'BS ENTREP',
    name: 'BS Entrepreneurship',
    subtitle: 'Venture creation, business planning & financial modeling',
    icon: Briefcase,
  },
  {
    code: 'BSBA HRM',
    name: 'BSBA Major in Human Resource Management',
    subtitle: 'Recruitment simulation, HR policy & academic vocabulary',
    icon: UserCheck,
  },
];

const ITE_PROGRAM_OPTIONS: ProgramOption[] = [
  {
    code: 'BECEd',
    name: 'Bachelor of Early Childhood Education',
    subtitle: 'Early childhood development & foundations of teaching',
    icon: GraduationCap,
  },
  {
    code: 'BEEd',
    name: 'Bachelor of Elementary Education',
    subtitle: 'Elementary school curriculum & pedagogy',
    icon: GraduationCap,
  },
  {
    code: 'BTLEd ICT',
    name: 'BTLEd - ICT Major',
    subtitle: 'Information & communications technology education',
    icon: GraduationCap,
  },
  {
    code: 'BSEd SCIENCE',
    name: 'Bachelor of Secondary Education - Science',
    subtitle: 'Integrated sciences curriculum & secondary pedagogy',
    icon: GraduationCap,
  },
];

export default function RegisterScreen() {
  const register = useAuthStore(state => state.register);
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [instituteCode, setInstitute] = useState('ics');
  const [program, setProgram] = useState('');
  const [acceptedPolicies, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isIbe = instituteCode === 'ibe';
  const isIte = instituteCode === 'ite';
  const requiresProgram = isIbe || isIte;
  const activePrograms = isIbe ? IBE_PROGRAM_OPTIONS : isIte ? ITE_PROGRAM_OPTIONS : [];

  const goldAccent = theme.isDark ? '#FFAE19' : '#D97706';
  const goldBg = theme.isDark ? '#3D2A08' : '#FFFDF5';
  const goldBorder = theme.isDark ? '#6B4C0A' : '#FDE68A';

  function handleInstituteChange(nextCode: string) {
    setInstitute(nextCode);
    setProgram('');
    setError('');
  }

  async function submit() {
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^\d{2}-\d{5}$/.test(studentNumber)) {
      setError('Student ID must use XX-XXXXX (26-12345).');
      return;
    }
    if (requiresProgram && !program) {
      setError(
        isIbe
          ? 'Please select your IBE academic program (BS Entrepreneurship or BSBA HRM).'
          : 'Please select your ITE academic program.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedPolicies) {
      setError('Accept the policies to create an account.');
      return;
    }

    setBusy(true);
    try {
      await register({
        name: name.trim(),
        studentNumber: studentNumber.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        instituteCode,
        acceptedPolicies,
        ...(program ? { program } : {}),
      });
      router.replace('/join-class');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
          paddingTop: Math.max(24, insets.top),
          paddingBottom: Math.max(24, insets.bottom),
          backgroundColor: theme.colors.background,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Create your student account
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            lineHeight: 24,
            marginBottom: 20,
          }}
        >
          After registration, join a class in your institute with your instructor’s code.
        </Text>

        {/* Institute Selection */}
        <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: '600' }}>
          Institute
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {['ics', 'ite', 'ibe'].map(code => (
            <Pressable
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ selected: instituteCode === code }}
              disabled={busy}
              onPress={() => handleInstituteChange(code)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 8,
                borderWidth: 1,
                borderColor:
                  instituteCode === code
                    ? code === 'ibe'
                      ? goldAccent
                      : theme.colors.primary
                    : theme.colors.border,
                backgroundColor:
                  instituteCode === code
                    ? code === 'ibe'
                      ? goldBg
                      : theme.colors.primary
                    : theme.colors.card,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '700',
                  color:
                    instituteCode === code
                      ? code === 'ibe'
                        ? goldAccent
                        : getOnPrimaryColor(theme)
                      : theme.colors.text,
                }}
              >
                {code.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Program Selection for IBE / ITE */}
        {requiresProgram && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={14} color={isIbe ? goldAccent : theme.colors.primary} />
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
                Select your {instituteCode.toUpperCase()} Academic Program
              </Text>
            </View>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 12,
                lineHeight: 17,
                marginBottom: 10,
              }}
            >
              Your program customizes your {instituteCode.toUpperCase()} student dashboard and tools, and is locked after registration.
            </Text>

            <View style={{ gap: 10 }}>
              {activePrograms.map(opt => {
                const selected = program === opt.code;
                const Icon = opt.icon || GraduationCap;
                const accent = isIbe ? goldAccent : theme.colors.primary;
                const cardBg = selected
                  ? isIbe
                    ? goldBg
                    : theme.isDark
                    ? '#1E293B'
                    : '#EFF6FF'
                  : theme.colors.card;
                const cardBorder = selected
                  ? isIbe
                    ? goldAccent
                    : theme.colors.primary
                  : theme.colors.border;

                return (
                  <Pressable
                    key={opt.code}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    disabled={busy}
                    onPress={() => {
                      setProgram(opt.code);
                      setError('');
                    }}
                    style={[
                      styles.programCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.programIconBox,
                        {
                          backgroundColor: selected
                            ? isIbe
                              ? goldAccent
                              : theme.colors.primary
                            : theme.isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                    >
                      <Icon
                        size={18}
                        color={selected ? '#FFFFFF' : theme.colors.textSecondary}
                      />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={[
                            styles.codePill,
                            {
                              backgroundColor: selected
                                ? isIbe
                                  ? goldAccent
                                  : theme.colors.primary
                                : theme.isDark
                                ? '#374151'
                                : '#E5E7EB',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.codePillText,
                              { color: selected ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {opt.code}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.programTitle,
                            {
                              color: selected ? (isIbe ? goldAccent : theme.colors.primary) : theme.colors.text,
                              fontWeight: selected ? '700' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.name}
                        </Text>
                      </View>
                      <Text
                        style={[styles.programSubtitle, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {opt.subtitle}
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: isIbe ? goldAccent : theme.colors.primary },
                        ]}
                      >
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          maxLength={150}
          editable={!busy}
        />
        <Input
          label="Student ID (XX-XXXXX)"
          placeholder="26-12345"
          value={studentNumber}
          onChangeText={setStudentNumber}
          maxLength={8}
          editable={!busy}
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!busy}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          secureTextEntry
          editable={!busy}
        />
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 16 }}>
          Use 8+ characters with uppercase, lowercase, and a number.
        </Text>
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
          secureTextEntry
          editable={!busy}
        />
        <Button
          title="Read Terms and Conditions"
          variant="ghost"
          onPress={() => {
            void Linking.openURL(API_BASE_URL + '/terms');
          }}
        />
        <Button
          title="Read Privacy Policy"
          variant="ghost"
          onPress={() => {
            void Linking.openURL(API_BASE_URL + '/privacy');
          }}
        />
        <Button
          title={
            acceptedPolicies
              ? '✓ I accept the Terms and Privacy Policy'
              : 'Accept the Terms and Privacy Policy'
          }
          variant="outline"
          disabled={busy}
          onPress={() => setAccepted(!acceptedPolicies)}
        />
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{
              color: theme.isDark ? '#FCA5A5' : '#b42318',
              marginVertical: 16,
              fontWeight: '600',
            }}
          >
            {error}
          </Text>
        ) : null}
        <Button
          title="Create account"
          onPress={submit}
          loading={busy}
          disabled={busy}
          style={{ marginTop: 20 }}
        />
        <Button
          title="Back to sign in"
          variant="ghost"
          onPress={() => router.replace('/(auth)/login')}
        />
        <Button
          title="Register with Google in the web portal"
          variant="ghost"
          onPress={() => {
            void Linking.openURL(API_BASE_URL + '/register?institute=' + instituteCode);
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  programCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  programIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  programTitle: {
    fontSize: 13,
    flex: 1,
  },
  programSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
