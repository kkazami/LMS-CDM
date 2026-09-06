import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { INSTITUTE_LIST, getInstituteTheme, type InstituteCode } from '../../src/lib/theme';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { GraduationCap } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const api = useAuthStore((state) => state.api);
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteCode>('ics');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const theme = getInstituteTheme(selectedInstitute);

  const handleRegister = async () => {
    if (!name || !email || !studentNumber || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.auth.register({
        name,
        email,
        studentNumber,
        password,
        confirmPassword,
        instituteCode: selectedInstitute,
      });
      router.replace('/(auth)/login');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: theme.colors.primary }]}>
            <GraduationCap size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <View style={[styles.activeInstituteBadge, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}40` }]}>
            <Text style={[styles.activeInstituteBadgeText, { color: theme.colors.primary }]}>
              {theme.name}
            </Text>
          </View>
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
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedInstitute(inst.code)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && { color: instTheme.colors.primary, fontWeight: '800' },
                  ]}
                >
                  {inst.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.form, { borderColor: `${theme.colors.primary}25` }]}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Input
            label="Full Name"
            placeholder="Juan Dela Cruz"
            value={name}
            onChangeText={setName}
            ringColor={theme.colors.primary}
          />
          <Input
            label="Email"
            placeholder="juan@school.edu.ph"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            ringColor={theme.colors.primary}
          />
          <Input
            label="Student Number"
            placeholder="23-00875"
            value={studentNumber}
            onChangeText={setStudentNumber}
            ringColor={theme.colors.primary}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            ringColor={theme.colors.primary}
          />
          <Input
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            ringColor={theme.colors.primary}
          />

          <Button
            title="Register"
            onPress={handleRegister}
            loading={loading}
            style={{
              marginTop: 12,
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
            }}
          />

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C2727',
  },
  activeInstituteBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeInstituteBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instituteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  instituteChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
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
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
