import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { INSTITUTE_LIST, getInstituteTheme, type InstituteCode } from '../../src/lib/theme';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { GraduationCap } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteCode>('ics');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const theme = getInstituteTheme(selectedInstitute);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Auth listener in _layout.tsx handles redirection upon success
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
            <GraduationCap size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>Lumina LMS</Text>
          <Text style={styles.tagline}>Select your institute to continue</Text>
        </View>

        {/* Institute Selector */}
        <View style={styles.instituteContainer}>
          {INSTITUTE_LIST.map((inst) => {
            const isSelected = selectedInstitute === inst.code;
            const instTheme = getInstituteTheme(inst.code);
            return (
              <TouchableOpacity
                key={inst.code}
                style={[
                  styles.instituteChip,
                  isSelected && {
                    borderColor: instTheme.colors.primary,
                    backgroundColor: `${instTheme.colors.primary}15`,
                  },
                ]}
                onPress={() => setSelectedInstitute(inst.code)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.instituteChipText,
                    isSelected && { color: instTheme.colors.primary, fontWeight: '700' },
                  ]}
                >
                  {inst.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Input
            label="Email Address"
            placeholder="student@school.edu.ph"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: theme.colors.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.signupText, { color: theme.colors.primary }]}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4F4',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2C2727',
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  instituteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  instituteChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  instituteChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
