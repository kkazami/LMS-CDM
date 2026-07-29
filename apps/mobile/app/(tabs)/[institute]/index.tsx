import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useTheme } from '../../../src/hooks/useTheme';
import { Badge } from '../../../src/components/common/Badge';
import { Card } from '../../../src/components/common/Card';
import {
  BookOpen,
  Megaphone,
  ClipboardList,
  Trophy,
  FlaskConical,
  ChevronRight,
  Bell,
} from 'lucide-react-native';

export default function DashboardHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const role = (user?.role || 'STUDENT').toUpperCase();
  const instituteCode = user?.institute?.code || 'ics';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Top Bar Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.instituteLabel}>{user?.institute?.name || 'Lumina LMS'}</Text>
            <Text style={styles.greeting}>Welcome back, {user?.name || 'User'}!</Text>
          </View>
          <View style={styles.badgeRow}>
            <Badge label={role} variant="info" />
          </View>
        </View>

        {/* Quick Action Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push(`/(tabs)/${instituteCode}/courses` as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
              <BookOpen size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.statLabel}>Enrolled Courses</Text>
            <Text style={styles.statValue}>My Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push(`/(tabs)/${instituteCode}/assignments` as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#3B82F618' }]}>
              <ClipboardList size={22} color="#3B82F6" />
            </View>
            <Text style={styles.statLabel}>Assignments</Text>
            <Text style={styles.statValue}>Tasks Due</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push(`/(tabs)/${instituteCode}/announcements` as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#10B98118' }]}>
              <Megaphone size={22} color="#10B981" />
            </View>
            <Text style={styles.statLabel}>Announcements</Text>
            <Text style={styles.statValue}>Latest Updates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push(`/(tabs)/${instituteCode}/leaderboards` as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#F59E0B18' }]}>
              <Trophy size={22} color="#F59E0B" />
            </View>
            <Text style={styles.statLabel}>Leaderboard</Text>
            <Text style={styles.statValue}>Rankings</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Activities Card */}
        <Card
          title="Interactive Labs"
          subtitle="Simulations, 3D Hardware Labs & CodeLab"
          style={styles.activitiesCard}
          onPress={() => router.push(`/(tabs)/${instituteCode}/activities` as any)}
        >
          <View style={styles.activityCardContent}>
            <View style={[styles.flaskBadge, { backgroundColor: theme.colors.primary }]}>
              <FlaskConical size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>Explore Virtual Labs</Text>
              <Text style={styles.activitySub}>Status & details on mobile availability</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </View>
        </Card>

        {/* Recent Announcements Banner */}
        <Text style={styles.sectionTitle}>System Notices</Text>
        <Card style={styles.noticeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Bell size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Welcome to Lumina LMS Mobile</Text>
              <Text style={styles.noticeBody}>All your courses, grades, and announcements on the go.</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  instituteLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  greeting: { fontSize: 22, fontWeight: '800', color: '#2C2727', marginTop: 2 },
  badgeRow: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C2727', marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#2C2727', marginTop: 2 },
  activitiesCard: { marginBottom: 20 },
  activityCardContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flaskBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 15, fontWeight: '700', color: '#2C2727' },
  activitySub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  noticeCard: { backgroundColor: '#FFFFFF' },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#2C2727' },
  noticeBody: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
