import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email) setSubmitted(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email address and we'll send instructions.</Text>

        {submitted ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Password reset link has been sent to your email if an account exists.
            </Text>
          </View>
        ) : (
          <>
            <Input
              label="Email Address"
              placeholder="juan@school.edu.ph"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button title="Send Instructions" onPress={handleSubmit} style={{ marginTop: 12 }} />
          </>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F4F4', padding: 24, justifyContent: 'center' },
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '800', color: '#2C2727', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  successBox: { backgroundColor: '#DEF7EC', padding: 16, borderRadius: 12, marginBottom: 16 },
  successText: { color: '#03543F', fontSize: 14, textAlign: 'center' },
  backBtn: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#FF7517', fontWeight: '700', fontSize: 14 },
});
