import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, LogOut, Laptop } from 'lucide-react-native';
import { useAuthStore } from '../src/stores/auth-store';
import { useTheme } from '../src/hooks/useTheme';
import { Button } from '../src/components/common/Button';

export default function UnsupportedRoleScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useTheme();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.danger}18` }]}>
          <ShieldAlert size={56} color={theme.colors.danger} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          Desktop Portal Required
        </Text>

        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Administrator and campus management tools are not supported on the mobile app.
          Please use the CdM LMS Web Portal or Desktop App on a computer to access administrative controls.
        </Text>

        {user && (
          <View style={[styles.userBadge, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.userLabel, { color: theme.colors.textSecondary }]}>
              Logged in as
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user.name}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
              {user.email} &bull; <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>{user.role}</Text>
            </Text>
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
          <Laptop size={20} color={theme.colors.primary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Students and Instructors can continue using CdM LMS Mobile. If you have a separate student or faculty account, please switch accounts below.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Sign Out & Switch Account"
            onPress={handleLogout}
            variant="danger"
            icon={LogOut}
            style={styles.actionButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  userBadge: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  userLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
  },
  actionButton: {
    minHeight: 50,
  },
});
