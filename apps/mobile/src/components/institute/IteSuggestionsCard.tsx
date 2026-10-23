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
  Lightbulb,
  AlertCircle,
  Clock,
  Compass,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { TOUCH_TARGET } from '../../lib/typography';
import type { StudySuggestion, SuggestionCategory } from '@lms/api-client';

interface IteSuggestionsCardProps {
  onRefreshTrigger?: number;
}

export function IteSuggestionsCard({ onRefreshTrigger }: IteSuggestionsCardProps) {
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [suggestions, setSuggestions] = useState<StudySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.ite.getSuggestions();
      if (res && Array.isArray(res.suggestions)) {
        setSuggestions(res.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch {
      setError('Study suggestions are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions, onRefreshTrigger]);

  const getCategoryDetails = (category: SuggestionCategory) => {
    switch (category) {
      case 'OVERDUE':
        return {
          icon: AlertCircle,
          color: theme.colors.danger,
          label: 'OVERDUE',
          badgeVariant: 'danger' as const,
        };
      case 'DUE_SOON':
        return {
          icon: Clock,
          color: theme.colors.warning,
          label: 'DUE SOON',
          badgeVariant: 'warning' as const,
        };
      case 'ENGAGEMENT':
        return {
          icon: Compass,
          color: theme.colors.info,
          label: 'ACTIVITY',
          badgeVariant: 'info' as const,
        };
      case 'FOCUS':
        return {
          icon: Sparkles,
          color: theme.colors.primary,
          label: 'FOCUS',
          badgeVariant: 'primary' as const,
        };
      case 'ON_TRACK':
      default:
        return {
          icon: CheckCircle2,
          color: theme.colors.success,
          label: 'ON TRACK',
          badgeVariant: 'success' as const,
        };
    }
  };

  const handleSuggestionPress = (item: StudySuggestion) => {
    if (item.category === 'OVERDUE' || item.category === 'DUE_SOON') {
      router.push('/student/tasks' as any);
    } else if (item.category === 'FOCUS') {
      router.push('/student/courses' as any);
    } else {
      router.push('/student/courses' as any);
    }
  };

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: `${theme.colors.warning}15` }]}>
            <Lightbulb size={18} color={theme.colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Study Suggestions
          </Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Checking your course priorities...
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
            <Lightbulb size={18} color={theme.colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Study Suggestions
          </Text>
        </View>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading study suggestions"
          style={[styles.retryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}
          onPress={fetchSuggestions}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color={theme.colors.primary} />
          <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.colors.warning}15` }]}>
          <Lightbulb size={18} color={theme.colors.warning} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Smart Study Suggestions
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
            Prioritized tasks and weekly academic recommendations
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {suggestions.slice(0, 3).map((item) => {
          const cat = getCategoryDetails(item.category);
          const Icon = cat.icon;

          return (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${cat.label}: ${item.title}`}
              style={[styles.itemCard, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
              onPress={() => handleSuggestionPress(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.itemIconCircle, { backgroundColor: `${cat.color}15` }]}>
                <Icon size={16} color={cat.color} />
              </View>

              <View style={styles.itemContent}>
                <View style={styles.itemTagRow}>
                  <Badge label={cat.label} variant={cat.badgeVariant} size="sm" />
                </View>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.itemDetail, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {item.detail}
                </Text>
              </View>

              <ChevronRight size={16} color={theme.colors.textSecondary} style={styles.chevron} />
            </TouchableOpacity>
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
  list: {
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    marginLeft: 8,
  },
});
