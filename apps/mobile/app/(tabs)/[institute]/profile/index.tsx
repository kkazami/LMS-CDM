import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { typography } from '../../../../src/lib/typography';
import { Flame, Zap, Award } from 'lucide-react-native';

export default function ProfileScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const { data } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.profile.get(),
  });

  const profile = data?.profile;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="My Profile" subtitle="Academic Identity & Statistics" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarLetter}>{(user?.name || 'S').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.nameText, typography.headingLg, { color: theme.colors.text }]}>
            {user?.name || 'Scholar'}
          </Text>
          <Text style={[styles.emailText, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.roleText, { color: theme.colors.primary }]}>{user?.role || 'STUDENT'}</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>ACADEMIC STATS</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Flame size={20} color="#F59E0B" />
            <Text style={[styles.statValue, typography.tabularLg, { color: theme.colors.text }]}>
              {profile?.currentStreak || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Day Streak</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Zap size={20} color="#EAB308" />
            <Text style={[styles.statValue, typography.tabularLg, { color: theme.colors.text }]}>
              {profile?.exp || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total EXP</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Award size={20} color="#10B981" />
            <Text style={[styles.statValue, typography.tabularLg, { color: theme.colors.text }]}>
              {'Lvl ' + (profile?.level || 1)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tier</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  nameText: {
    fontWeight: '700',
  },
  emailText: {
    fontSize: 13,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
