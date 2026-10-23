import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Activity,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { TOUCH_TARGET } from '../../lib/typography';
import type { InstructorAtRiskEntry } from '@lms/api-client';

interface IteInstructorAtRiskCardProps {
  onRefreshTrigger?: number;
}

export function IteInstructorAtRiskCard({ onRefreshTrigger }: IteInstructorAtRiskCardProps) {
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [entries, setEntries] = useState<InstructorAtRiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtRisk = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.ite.getInstructorAtRiskSummary();
      if (res && Array.isArray(res.entries)) {
        setEntries(res.entries);
      } else {
        setEntries([]);
      }
    } catch {
      setError('Academic risk insights are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchAtRisk();
  }, [fetchAtRisk, onRefreshTrigger]);

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.danger}15` }]}>
            <AlertTriangle size={18} color={theme.colors.danger} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            At-Risk Students
          </Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Checking course engagement alerts...
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
            At-Risk Students
          </Text>
        </View>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading at risk students"
          style={[styles.retryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}
          onPress={fetchAtRisk}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color={theme.colors.primary} />
          <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.success}15` }]}>
            <CheckCircle2 size={18} color={theme.colors.success} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              At-Risk Students (ITE)
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Academic intervention and engagement monitor
            </Text>
          </View>
        </View>
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyText, { color: theme.colors.success }]}>
            No high-risk students identified across your active courses.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.colors.danger}15` }]}>
          <AlertTriangle size={18} color={theme.colors.danger} />
        </View>
        <View style={styles.headerTextCol}>
          <View style={styles.titleBadgeRow}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              At-Risk Students
            </Text>
            <Badge label={`${entries.length} HIGH`} variant="danger" size="sm" />
          </View>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
            Students needing immediate attention or follow-up
          </Text>
        </View>
      </View>

      <View style={styles.entryList}>
        {entries.slice(0, 5).map((entry) => (
          <TouchableOpacity
            key={`${entry.studentId}-${entry.courseId}`}
            accessibilityRole="button"
            accessibilityLabel={`View participation for ${entry.name}`}
            style={[styles.entryRow, { borderBottomColor: theme.colors.border }]}
            onPress={() => {
              router.push({
                pathname: '/teacher/courses/[courseId]' as any,
                params: { courseId: entry.courseId, initialTab: 'PARTICIPATION' },
              });
            }}
            activeOpacity={0.75}
          >
            <View style={styles.entryContent}>
              <Text style={[styles.studentName, { color: theme.colors.text }]} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text style={[styles.courseAndReason, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {entry.courseTitle} &bull; {entry.reasons?.[0]?.detail || 'Requires intervention'}
              </Text>
            </View>
            <View style={styles.viewAction}>
              <Text style={[styles.viewText, { color: theme.colors.primary }]}>Review</Text>
              <ArrowRight size={14} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyContent: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  entryList: {
    marginTop: 4,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  entryContent: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  courseAndReason: {
    fontSize: 12,
  },
  viewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
