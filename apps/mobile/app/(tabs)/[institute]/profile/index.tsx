import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { User, Mail, GraduationCap, Building2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Profile" subtitle="Account details" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarLetter}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Badge label={user?.role || 'STUDENT'} variant="info" />
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.infoRow}>
            <Mail size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          {user?.studentNumber ? (
            <View style={styles.infoRow}>
              <GraduationCap size={18} color="#6B7280" />
              <Text style={styles.infoLabel}>Student ID:</Text>
              <Text style={styles.infoValue}>{user.studentNumber}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Building2 size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Institute:</Text>
            <Text style={styles.infoValue}>{user?.institute?.name || 'Lumina Institute'}</Text>
          </View>
        </Card>

        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="danger"
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  userName: { fontSize: 22, fontWeight: '800', color: '#2C2727', marginBottom: 6 },
  detailsCard: { padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#2C2727', flex: 1, textAlign: 'right' },
});
