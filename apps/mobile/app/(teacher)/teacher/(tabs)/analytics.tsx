import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { BarChart2, TrendingUp, CheckCircle, Clock, Users, Award } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';

export default function TeacherAnalyticsScreen() {
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Academic Analytics</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Course Performance & Submission Turnaround Matrix
          </Text>
        </View>

        {/* Highlight KPI Card */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.kpiHeader}>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                OVERALL PASSING RATE
              </Text>
              <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>
                88.4%
              </Text>
            </View>
            <View style={[styles.kpiIconBox, { backgroundColor: `${theme.colors.primary}18` }]}>
              <TrendingUp size={32} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={[styles.kpiTrend, { color: theme.colors.success }]}>
            &uarr; 3.2% compared to midterm average
          </Text>
        </View>

        {/* 4-stat Matrix Grid */}
        <View style={styles.matrixGrid}>
          <View style={[styles.matrixCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Users size={22} color={theme.colors.info} />
            <Text style={[styles.matrixNum, { color: theme.colors.text }]}>142</Text>
            <Text style={[styles.matrixLabel, { color: theme.colors.textSecondary }]}>Active Students</Text>
          </View>

          <View style={[styles.matrixCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <CheckCircle size={22} color={theme.colors.success} />
            <Text style={[styles.matrixNum, { color: theme.colors.text }]}>94%</Text>
            <Text style={[styles.matrixLabel, { color: theme.colors.textSecondary }]}>Submission Rate</Text>
          </View>

          <View style={[styles.matrixCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Clock size={22} color={theme.colors.warning} />
            <Text style={[styles.matrixNum, { color: theme.colors.text }]}>1.4d</Text>
            <Text style={[styles.matrixLabel, { color: theme.colors.textSecondary }]}>Avg. Turnaround</Text>
          </View>

          <View style={[styles.matrixCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Award size={22} color={theme.colors.primary} />
            <Text style={[styles.matrixNum, { color: theme.colors.text }]}>87.6</Text>
            <Text style={[styles.matrixLabel, { color: theme.colors.textSecondary }]}>Class Average</Text>
          </View>
        </View>

        {/* Grade Distribution Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Grade Distribution (All Courses)
          </Text>

          <View style={[styles.distributionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Grade Tier 1: 90 - 100 */}
            <View style={styles.tierRow}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierLabel, { color: theme.colors.text }]}>Excellent (90–100%)</Text>
                <Text style={[styles.tierPercentage, { color: theme.colors.primary }]}>42% (60 students)</Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.cardSecondary }]}>
                <View style={[styles.barFill, { width: '42%', backgroundColor: theme.colors.primary }]} />
              </View>
            </View>

            {/* Grade Tier 2: 80 - 89 */}
            <View style={styles.tierRow}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierLabel, { color: theme.colors.text }]}>Proficient (80–89%)</Text>
                <Text style={[styles.tierPercentage, { color: theme.colors.info }]}>36% (51 students)</Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.cardSecondary }]}>
                <View style={[styles.barFill, { width: '36%', backgroundColor: theme.colors.info }]} />
              </View>
            </View>

            {/* Grade Tier 3: 75 - 79 */}
            <View style={styles.tierRow}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierLabel, { color: theme.colors.text }]}>Passing (75–79%)</Text>
                <Text style={[styles.tierPercentage, { color: theme.colors.warning }]}>14% (20 students)</Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.cardSecondary }]}>
                <View style={[styles.barFill, { width: '14%', backgroundColor: theme.colors.warning }]} />
              </View>
            </View>

            {/* Grade Tier 4: Below 75 */}
            <View style={styles.tierRow}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierLabel, { color: theme.colors.text }]}>Needs Intervention (&lt;75%)</Text>
                <Text style={[styles.tierPercentage, { color: theme.colors.danger }]}>8% (11 students)</Text>
              </View>
              <View style={[styles.barBackground, { backgroundColor: theme.colors.cardSecondary }]}>
                <View style={[styles.barFill, { width: '8%', backgroundColor: theme.colors.danger }]} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  kpiCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  kpiValue: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTrend: {
    fontSize: 13,
    fontWeight: '600',
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  matrixCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  matrixNum: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  matrixLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  distributionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  tierRow: {
    marginBottom: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tierPercentage: {
    fontSize: 12,
    fontWeight: '700',
  },
  barBackground: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
});
