import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { TOUCH_TARGET } from '../../lib/typography';
import type { StudentCourseParticipation } from '@lms/api-client';

interface IteParticipationCardProps {
  onRefreshTrigger?: number;
}

export function IteParticipationCard({ onRefreshTrigger }: IteParticipationCardProps) {
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [courses, setCourses] = useState<StudentCourseParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.ite.getParticipation();
      if (res && Array.isArray(res.courses)) {
        setCourses(res.courses);
      } else {
        setCourses([]);
      }
    } catch {
      // Graceful error message without exposing database or server internals
      setError('Participation insights are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchParticipation();
  }, [fetchParticipation, onRefreshTrigger]);

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Activity size={18} color={theme.colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            My Course Participation
          </Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Analyzing course engagement...
          </Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.warning}15` }]}>
            <AlertCircle size={18} color={theme.colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            My Course Participation
          </Text>
        </View>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading participation"
          style={[styles.retryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}
          onPress={fetchParticipation}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color={theme.colors.primary} />
          <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  const atRiskCourses = courses.filter((c) => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL' || c.riskLevel === 'MEDIUM');

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Activity size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Course Participation & Progress
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
            ITE engagement analytics and activity trends
          </Text>
        </View>
      </View>

      {/* At-risk banner if needed */}
      {atRiskCourses.length > 0 && (
        <View style={[styles.riskBanner, { backgroundColor: `${theme.colors.warning}15`, borderColor: `${theme.colors.warning}40` }]}>
          <AlertTriangle size={16} color={theme.colors.warning} style={styles.riskIcon} />
          <View style={styles.riskBannerContent}>
            <Text style={[styles.riskBannerTitle, { color: theme.colors.warning }]}>
              Attention Needed
            </Text>
            <Text style={[styles.riskBannerDetail, { color: theme.colors.textSecondary }]}>
              {atRiskCourses.length === 1
                ? `${atRiskCourses[0].courseCode} engagement needs a boost this week.`
                : `${atRiskCourses.length} courses require active participation to stay on track.`}
            </Text>
          </View>
        </View>
      )}

      {/* Course items */}
      <View style={styles.courseList}>
        {courses.map((course) => {
          const isImproving = course.trend === 'improving';
          const isDeclining = course.trend === 'declining';

          return (
            <View
              key={course.courseId}
              style={[styles.courseRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={styles.courseHeader}>
                <View style={styles.courseTitleCol}>
                  <Text style={[styles.courseName, { color: theme.colors.text }]} numberOfLines={1}>
                    {course.courseTitle}
                  </Text>
                  <Text style={[styles.courseCode, { color: theme.colors.textSecondary }]}>
                    {course.courseCode}
                  </Text>
                </View>

                <View style={styles.trendBadgeRow}>
                  {course.riskLevel !== 'LOW' && (
                    <Badge
                      label={course.riskLevel}
                      variant={course.riskLevel === 'MEDIUM' ? 'warning' : 'danger'}
                      size="sm"
                    />
                  )}
                  <View style={[styles.trendPill, { backgroundColor: theme.colors.cardSecondary }]}>
                    {isImproving ? (
                      <TrendingUp size={14} color={theme.colors.success} />
                    ) : isDeclining ? (
                      <TrendingDown size={14} color={theme.colors.danger} />
                    ) : (
                      <Minus size={14} color={theme.colors.textSecondary} />
                    )}
                    <Text
                      style={[
                        styles.trendText,
                        {
                          color: isImproving
                            ? theme.colors.success
                            : isDeclining
                            ? theme.colors.danger
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {isImproving ? 'Improving' : isDeclining ? 'Needs Work' : 'Stable'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Score bar */}
              <View style={styles.metricRow}>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(5, course.engagementScore))}%`,
                          backgroundColor:
                            course.engagementScore >= 75
                              ? theme.colors.success
                              : course.engagementScore >= 50
                              ? theme.colors.warning
                              : theme.colors.danger,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.scoreValue, { color: theme.colors.text }]}>
                  {course.engagementScore}
                  <Text style={[styles.scoreTotal, { color: theme.colors.textSecondary }]}>/100</Text>
                </Text>
              </View>

              {/* Sub-metrics */}
              <View style={styles.footerRow}>
                {course.onTimeRate !== null && (
                  <View style={styles.subMetric}>
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.subMetricText, { color: theme.colors.textSecondary }]}>
                      On-time: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{Math.round(course.onTimeRate)}%</Text>
                    </Text>
                  </View>
                )}

                {course.dailySeries && course.dailySeries.length > 0 && (
                  <View style={styles.subMetric}>
                    <Text style={[styles.subMetricText, { color: theme.colors.textSecondary }]}>
                      Past 7 days: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{course.dailySeries.reduce((acc, d) => acc + (d.count || 0), 0)} activities</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  riskIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  riskBannerContent: {
    flex: 1,
  },
  riskBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  riskBannerDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  courseList: {
    marginTop: 4,
  },
  courseRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
  },
  courseCode: {
    fontSize: 12,
    marginTop: 1,
  },
  trendBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 46,
    textAlign: 'right',
  },
  scoreTotal: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subMetricText: {
    fontSize: 11,
  },
});
