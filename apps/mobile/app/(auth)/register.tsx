import React from 'react';
import { ScrollView, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../../src/lib/constants';
export default function RegisterScreen() {
  const router = useRouter();
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Request LMS Access</Text>
    <Text style={styles.body}>CdM LMS accounts are created by authorized school personnel after enrollment verification. To request an account or correct your registration details, please contact or visit the Office of the Registrar.</Text>
    <Text style={styles.body}>If you have already received an account invitation, use the activation link sent to your registered email address.</Text>
    <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.replace('/(auth)/login')}><Text style={styles.buttonText}>Back to Sign In</Text></Pressable>
    <Pressable accessibilityRole="link" style={styles.link} onPress={() => Linking.openURL(API_BASE_URL.replace(/\/api\/?$/, '') + '/activate')}><Text style={styles.linkText}>Request a New Activation Link</Text></Pressable>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '700' },
  body: { color: '#334155', fontSize: 16, lineHeight: 25, marginTop: 20 },
  button: { backgroundColor: '#0F172A', padding: 16, borderRadius: 8, marginTop: 28, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  link: { paddingVertical: 18 }, linkText: { color: '#334155', textDecorationLine: 'underline', textAlign: 'center' },
});
