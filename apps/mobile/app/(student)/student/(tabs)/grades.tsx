import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Award, TrendingUp, CheckCircle, AlertCircle, BookOpen } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import type { Grade, GradeSummary } from '@lms/types';

export default function StudentGradesScreen() {
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [summaries, setSummaries] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGrades = async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.grades.list(instituteCode);
      if (response?.grades) {
        setGrades(response.grades);
      }
      if (response?.summary) {
        setSummaries(response.summary);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGrades();
  };

  // Compute overall average if available
  const numericGrades = grades
    .map((g) => (typeof g.value === 'number' ? (g.maxValue > 0 ? (g.value / g.maxValue) * 100 : g.value) : null))
    .filter((g): g is number => g !== null);
  const averageGrade =
    numericGrades.length > 0
      ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1)
      : 'N/A';

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
          <Text style={[styles.title, { color: theme.colors.text }]}>Academic Records</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Official Grades & Continuous Assessment Results
          </Text>
        </View>

        {/* GPA Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                CUMULATIVE STANDING
              </Text>
              <Text style={[styles.gpaValue, { color: theme.colors.primary }]}>
                {averageGrade !== 'N/A' ? `${averageGrade}%` : 'In Review'}
              </Text>
            </View>
            <View style={[styles.awardBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
              <Award size={36} color={theme.colors.primary} />
            </View>
          </View>

          <View style={[styles.summaryStatsRow, { borderTopColor: theme.colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {grades.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Evaluations
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.colors.success }]}>
                {grades.filter((g) => (g.maxValue > 0 ? (g.value / g.maxValue) * 100 : g.value) >= 75).length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Passed
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {summaries.length || grades.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Subjects
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Grades List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Assessment Breakdowns
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 24 }} />
        ) : grades.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={40} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Grade Records Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Grades will be published once your instructors finalize course assessments.
            </Text>
          </Card>
        ) : (
          grades.map((grade) => {
            const percentage =
              grade.maxValue > 0 ? Math.round((grade.value / grade.maxValue) * 100) : Math.round(grade.value);
            const isPassing = percentage >= 75;
            return (
              <View
                key={grade.id}
                style={[styles.gradeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <View style={styles.gradeCardHeader}>
                  <View style={styles.gradeHeaderInfo}>
                    <Text style={[styles.gradeCourseTitle, { color: theme.colors.text }]}>
                      {grade.assignmentTitle || 'Academic Evaluation'}
                    </Text>
                    <Text style={[styles.gradeCategory, { color: theme.colors.textSecondary }]}>
                      {grade.courseName} ({grade.courseCode})
                    </Text>
                  </View>
                  <Badge
                    label={isPassing ? 'PASSED' : 'RETAKE'}
                    variant={isPassing ? 'success' : 'danger'}
                    size="sm"
                  />
                </View>

                <View style={[styles.scoreRow, { backgroundColor: theme.colors.cardSecondary }]}>
                  <View>
                    <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                      Earned Score
                    </Text>
                    <Text style={[styles.scoreValue, { color: isPassing ? theme.colors.text : theme.colors.danger }]}>
                      {grade.value} / {grade.maxValue} ({percentage}%)
                    </Text>
                  </View>

                  {grade.gradedAt && (
                    <Text style={[styles.feedbackText, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                      Graded on {new Date(grade.gradedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
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
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gpaValue: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  awardBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  gradeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  gradeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gradeHeaderInfo: {
    flex: 1,
    marginRight: 10,
  },
  gradeCourseTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gradeCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreRow: {
    borderRadius: 10,
    padding: 12,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  feedbackContainer: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  feedbackLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});
