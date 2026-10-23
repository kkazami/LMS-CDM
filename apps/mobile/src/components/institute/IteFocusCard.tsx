import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { TOUCH_TARGET } from '../../lib/typography';
import type { FocusSummaryResponse } from '@lms/api-client';

interface IteFocusCardProps {
  onRefreshTrigger?: number;
}

export function IteFocusCard({ onRefreshTrigger }: IteFocusCardProps) {
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [summary, setSummary] = useState<FocusSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.ite.getFocusSummary();
      if (res && typeof res === 'object') {
        setSummary(res);
      } else {
        setSummary(null);
      }
    } catch {
      setError('Focus mode statistics are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, onRefreshTrigger]);

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.info}15` }]}>
            <Sparkles size={18} color={theme.colors.info} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Focus & Deep Work
          </Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading focus sessions...
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
            Focus & Deep Work
          </Text>
        </View>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading focus summary"
          style={[styles.retryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}
          onPress={fetchSummary}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color={theme.colors.primary} />
          <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const diff = summary.focusedMinutesThisWeek - summary.focusedMinutesLastWeek;
  const maxDailyMinutes = Math.max(15, ...summary.sevenDaySeries.map((d) => d.focusedMinutes || 0));

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.colors.info}15` }]}>
          <Sparkles size={18} color={theme.colors.info} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Focus & Deep Work
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
            Weekly study streak & concentration insights
          </Text>
        </View>
      </View>

      {/* Main stats highlights */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
          <View style={styles.statIconRow}>
            <Clock size={14} color={theme.colors.primary} />
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>This Week</Text>
          </View>
          <Text style={[styles.statBigNumber, { color: theme.colors.text }]}>
            {summary.focusedMinutesThisWeek}
            <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}> min</Text>
          </Text>
          <View style={styles.diffRow}>
            {diff > 0 ? (
              <>
                <TrendingUp size={12} color={theme.colors.success} />
                <Text style={[styles.diffText, { color: theme.colors.success }]}>+{diff}m vs last wk</Text>
              </>
            ) : diff < 0 ? (
              <>
                <TrendingDown size={12} color={theme.colors.danger} />
                <Text style={[styles.diffText, { color: theme.colors.danger }]}>{diff}m vs last wk</Text>
              </>
            ) : (
              <>
                <Minus size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.diffText, { color: theme.colors.textSecondary }]}>Equal to last wk</Text>
              </>
            )}
          </View>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
          <View style={styles.statIconRow}>
            <CheckCircle2 size={14} color={theme.colors.success} />
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sessions</Text>
          </View>
          <Text style={[styles.statBigNumber, { color: theme.colors.text }]}>
            {summary.completedSessionsThisWeek}
            <Text style={[styles.statUnit, { color: theme.colors.textSecondary }]}> done</Text>
          </Text>
          <Text style={[styles.diffText, { color: theme.colors.textSecondary }]}>
            {summary.longestCompletedSessionMinutes > 0
              ? `Best: ${summary.longestCompletedSessionMinutes}m streak`
              : 'Keep studying'}
          </Text>
        </View>
      </View>

      {/* 7-day mini bar chart */}
      {summary.sevenDaySeries && summary.sevenDaySeries.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={[styles.chartTitle, { color: theme.colors.textSecondary }]}>
            Past 7 Days Focus Distribution
          </Text>
          <View style={styles.barsContainer}>
            {summary.sevenDaySeries.map((day, idx) => {
              const heightPercent = Math.min(100, Math.max(8, (day.focusedMinutes / maxDailyMinutes) * 100));
              const hasActivity = day.focusedMinutes > 0;

              return (
                <View key={day.date || idx} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: hasActivity ? theme.colors.primary : theme.colors.surfaceAlt,
                          opacity: hasActivity ? 1 : 0.4,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                    {day.label ? day.label.slice(0, 3) : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
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
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statBigNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  diffText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartSection: {
    marginTop: 4,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 64,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 44,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});
