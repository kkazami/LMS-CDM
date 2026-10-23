import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Award,
  Lock,
  Sparkles,
  Flame,
  Star,
  Trophy,
  Shield,
  BookOpen,
  BookCheck,
  Terminal,
  Code2,
  CalendarDays,
  CalendarCheck,
  Timer,
  Zap,
  Globe,
  Crown,
  Layers,
  GraduationCap,
  MessageCircle,
  Sunrise,
  Moon,
  CheckCircle2,
  PartyPopper,
  UserCheck,
  Camera,
  Diamond,
  Gem,
  Send,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import {
  Screen,
  AppHeader,
  Card,
  SectionTitle,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { Badge } from '../../../../src/components/common/Badge';
import { radius, spacing } from '../../../../src/lib/theme';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getBadgeCriteria } from '../../../../src/lib/badge-catalog';
import type { StudentBadge } from '@lms/types';

type CategoryFilter = 'ALL' | 'LEARNING' | 'STREAK' | 'EXCELLENCE' | 'LEVEL' | 'SPECIAL';

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'ALL', label: 'All Badges' },
  { id: 'LEARNING', label: 'Learning' },
  { id: 'STREAK', label: 'Streaks' },
  { id: 'EXCELLENCE', label: 'Excellence' },
  { id: 'LEVEL', label: 'Levels' },
  { id: 'SPECIAL', label: 'Special' },
];

export default function StudentAchievementsScreen() {
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  const fetchBadges = useCallback(async () => {
    try {
      setError(null);
      const res = await api.gamification.getBadges();
      setBadges(res?.badges || []);
    } catch (err: any) {
      console.error('Failed to fetch badges:', err);
      setError(err?.message || 'Unable to load achievements. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBadges();
  }, [fetchBadges]);

  const unlockedCount = useMemo(() => badges.filter((b) => b.isUnlocked).length, [badges]);
  const totalCount = badges.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filteredBadges = useMemo(() => {
    return badges.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'UNLOCKED' && item.isUnlocked) ||
        (statusFilter === 'LOCKED' && !item.isUnlocked);
      return matchCat && matchStatus;
    });
  }, [badges, selectedCategory, statusFilter]);

  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const iconSize = s(24);
    const color = isUnlocked ? theme.colors.primary : theme.colors.textSecondary;

    switch (iconName?.toLowerCase()) {
      case 'flame':
        return <Flame size={iconSize} color={isUnlocked ? theme.colors.warning : color} />;
      case 'star':
        return <Star size={iconSize} color={isUnlocked ? theme.colors.warning : color} />;
      case 'trophy':
        return <Trophy size={iconSize} color={isUnlocked ? theme.colors.warning : color} />;
      case 'shield':
        return <Shield size={iconSize} color={color} />;
      case 'bookopen':
        return <BookOpen size={iconSize} color={color} />;
      case 'bookcheck':
        return <BookCheck size={iconSize} color={isUnlocked ? theme.colors.success : color} />;
      case 'terminal':
        return <Terminal size={iconSize} color={isUnlocked ? theme.colors.info : color} />;
      case 'code2':
        return <Code2 size={iconSize} color={isUnlocked ? theme.colors.primary : color} />;
      case 'calendardays':
        return <CalendarDays size={iconSize} color={color} />;
      case 'calendarcheck':
        return <CalendarCheck size={iconSize} color={isUnlocked ? theme.colors.success : color} />;
      case 'timer':
        return <Timer size={iconSize} color={color} />;
      case 'zap':
        return <Zap size={iconSize} color={isUnlocked ? theme.colors.warning : color} />;
      case 'globe':
        return <Globe size={iconSize} color={color} />;
      case 'crown':
        return <Crown size={iconSize} color={isUnlocked ? theme.colors.warning : color} />;
      case 'layers':
        return <Layers size={iconSize} color={color} />;
      case 'graduationcap':
        return <GraduationCap size={iconSize} color={color} />;
      case 'messagecircle':
        return <MessageCircle size={iconSize} color={color} />;
      case 'sunrise':
        return <Sunrise size={iconSize} color={isUnlocked ? theme.colors.warning : color} />;
      case 'moon':
        return <Moon size={iconSize} color={color} />;
      case 'checkcircle2':
        return <CheckCircle2 size={iconSize} color={isUnlocked ? theme.colors.success : color} />;
      case 'partypopper':
        return <PartyPopper size={iconSize} color={color} />;
      case 'usercheck':
        return <UserCheck size={iconSize} color={color} />;
      case 'camera':
        return <Camera size={iconSize} color={color} />;
      case 'diamond':
        return <Diamond size={iconSize} color={isUnlocked ? theme.colors.info : color} />;
      case 'gem':
        return <Gem size={iconSize} color={isUnlocked ? theme.colors.primary : color} />;
      case 'send':
        return <Send size={iconSize} color={color} />;
      default:
        return isUnlocked ? (
          <Sparkles size={iconSize} color={theme.colors.primary} />
        ) : (
          <Award size={iconSize} color={theme.colors.textSecondary} />
        );
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Overview Progress Card */}
      <Card
        style={[
          styles.overviewCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: radius.lg,
            padding: s(spacing.lg),
            marginBottom: s(spacing.md),
          },
        ]}
      >
        <View style={styles.overviewTopRow}>
          <View style={styles.overviewLeft}>
            <Text
              style={[
                styles.overviewHeading,
                { color: theme.colors.textSecondary, fontSize: font(12) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              ACHIEVEMENT PROGRESS
            </Text>
            <Text
              style={[
                styles.overviewNumbers,
                { color: theme.colors.text, fontSize: font(24) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {unlockedCount}{' '}
              <Text style={{ color: theme.colors.textSecondary, fontSize: font(16) }}>
                / {totalCount} Unlocked
              </Text>
            </Text>
            <Text
              style={[
                styles.overviewSubtitle,
                { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {progressPercent}% of all LMS honors unlocked
            </Text>
          </View>

          <View
            style={[
              styles.trophyIconWrap,
              {
                backgroundColor: `${theme.colors.primary}18`,
                width: s(54),
                height: s(54),
                borderRadius: radius.full,
              },
            ]}
          >
            <Award size={s(28)} color={theme.colors.primary} />
          </View>
        </View>

        {/* Progress Bar */}
        <View
          style={[
            styles.progressBarTrack,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: radius.full,
              marginTop: s(spacing.md),
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: radius.full,
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              },
            ]}
          />
        </View>
      </Card>

      {/* Status Filter Tabs (All / Unlocked / Locked) */}
      <View
        style={[
          styles.statusTabsRow,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            borderRadius: radius.md,
            padding: 3,
            marginBottom: s(spacing.md),
          },
        ]}
      >
        {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map((tab) => {
          const isSelected = statusFilter === tab;
          const label = tab === 'ALL' ? 'All' : tab === 'UNLOCKED' ? `Unlocked (${unlockedCount})` : `Locked (${totalCount - unlockedCount})`;
          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="button"
              accessibilityLabel={`Show ${label}`}
              style={[
                styles.statusTabBtn,
                {
                  backgroundColor: isSelected ? theme.colors.card : 'transparent',
                  borderRadius: radius.sm,
                },
              ]}
              onPress={() => setStatusFilter(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statusTabBtnText,
                  {
                    color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: font(12),
                  },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Filter Pills */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryScroll, { gap: s(spacing.xs), marginBottom: s(spacing.md) }]}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.id;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item.label}`}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  borderRadius: radius.full,
                  paddingHorizontal: s(spacing.md),
                  paddingVertical: s(spacing.xs),
                },
              ]}
              onPress={() => setSelectedCategory(item.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  {
                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: font(12),
                  },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Section Title */}
      <SectionTitle
        title="BADGE GRID"
        subtitle={`${filteredBadges.length} ${filteredBadges.length === 1 ? 'badge' : 'badges'} found`}
        style={{ marginBottom: s(spacing.sm) }}
      />
    </View>
  );

  const renderBadgeCard = ({ item }: { item: StudentBadge }) => {
    const isUnlocked = item.isUnlocked;
    const criteria = getBadgeCriteria(item.badgeRuleId || item.id, item.description);

    return (
      <Card
        style={[
          styles.badgeCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: isUnlocked ? theme.colors.primary : theme.colors.border,
            borderRadius: radius.lg,
            padding: s(spacing.md),
            marginBottom: s(spacing.md),
            opacity: isUnlocked ? 1 : 0.85,
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isUnlocked
                  ? `${theme.colors.primary}18`
                  : theme.colors.surfaceAlt,
                borderColor: isUnlocked ? `${theme.colors.primary}30` : theme.colors.border,
                width: s(46),
                height: s(46),
                borderRadius: radius.full,
              },
            ]}
          >
            {renderBadgeIcon(item.icon, isUnlocked)}
          </View>

          <View style={styles.cardHeaderInfo}>
            <View style={styles.titleStatusRow}>
              <Text
                style={[
                  styles.badgeTitle,
                  { color: theme.colors.text, fontSize: font(15) },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {item.title}
              </Text>
              <Badge
                label={isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                variant={isUnlocked ? 'success' : 'muted'}
                size="sm"
              />
            </View>

            <View style={styles.categoryRow}>
              <Text
                style={[
                  styles.categoryText,
                  { color: theme.colors.textSecondary, fontSize: font(11) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {item.category}
              </Text>
              {isUnlocked && item.earnedAt ? (
                <Text
                  style={[
                    styles.earnedDateText,
                    { color: theme.colors.success, fontSize: font(11) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  &bull; Earned {new Date(item.earnedAt).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Description */}
        <Text
          style={[
            styles.badgeDescription,
            { color: theme.colors.text, fontSize: font(13), marginTop: s(spacing.sm) },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {item.description}
        </Text>

        {/* Criteria & Requirements Box */}
        <View
          style={[
            styles.criteriaBox,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
              borderRadius: radius.md,
              padding: s(spacing.sm),
              marginTop: s(spacing.sm),
            },
          ]}
        >
          <View style={[styles.criteriaHeaderRow, { gap: 4 }]}>
            {isUnlocked ? (
              <CheckCircle2 size={s(12)} color={theme.colors.success} />
            ) : (
              <Lock size={s(12)} color={theme.colors.textSecondary} />
            )}
            <Text
              style={[
                styles.criteriaHeaderLabel,
                {
                  color: isUnlocked ? theme.colors.success : theme.colors.textSecondary,
                  fontSize: font(11),
                  fontWeight: '600',
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {isUnlocked ? 'CRITERIA MET' : 'HOW TO UNLOCK'}
            </Text>
          </View>
          <Text
            style={[
              styles.criteriaText,
              { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {criteria}
          </Text>
        </View>
      </Card>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View
        style={[
          styles.emptyBox,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: radius.lg,
            padding: s(spacing.xl),
            marginTop: s(spacing.md),
          },
        ]}
      >
        <Award size={s(40)} color={theme.colors.textSecondary} />
        <Text
          style={[
            styles.emptyTitle,
            { color: theme.colors.text, fontSize: font(16), marginTop: s(spacing.md) },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          No Badges Found
        </Text>
        <Text
          style={[
            styles.emptyDesc,
            { color: theme.colors.textSecondary, fontSize: font(13), marginTop: 4 },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          No badges match the selected filters.
        </Text>
      </View>
    );
  };

  return (
    <Screen style={styles.screenRoot}>
      <AppHeader
        title="Achievements & Badges"
        subtitle="Track your academic milestones and honors"
        showBack={true}
        onBack={() => router.back()}
      />

      <View style={styles.contentWrap}>
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={fetchBadges}
            style={{ marginHorizontal: s(spacing.md), marginTop: s(spacing.sm) }}
          />
        ) : null}

        {loading ? (
          <View style={{ padding: s(spacing.md), gap: s(spacing.md) }}>
            <SkeletonBlock height={s(120)} borderRadius={radius.lg} />
            <SkeletonBlock height={s(44)} borderRadius={radius.md} />
            <SkeletonBlock height={s(110)} borderRadius={radius.lg} />
            <SkeletonBlock height={s(110)} borderRadius={radius.lg} />
            <SkeletonBlock height={s(110)} borderRadius={radius.lg} />
          </View>
        ) : (
          <FlatList
            data={filteredBadges}
            keyExtractor={(item) => item.id}
            renderItem={renderBadgeCard}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[styles.listContent, { padding: s(spacing.md) }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 8,
  },
  overviewCard: {
    borderWidth: 1,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewLeft: {
    flex: 1,
  },
  overviewHeading: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overviewNumbers: {
    fontWeight: '800',
    marginTop: 4,
  },
  overviewSubtitle: {
    fontWeight: '500',
  },
  trophyIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  statusTabsRow: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  statusTabBtn: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  statusTabBtnText: {
    textAlign: 'center',
  },
  categoryScroll: {
    paddingVertical: 2,
  },
  categoryPill: {
    borderWidth: 1,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillText: {},
  badgeCard: {
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeTitle: {
    fontWeight: '700',
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  categoryText: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  earnedDateText: {
    fontWeight: '500',
  },
  badgeDescription: {
    lineHeight: 18,
  },
  criteriaBox: {
    borderWidth: 1,
  },
  criteriaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criteriaHeaderLabel: {
    letterSpacing: 0.3,
  },
  criteriaText: {
    lineHeight: 16,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontWeight: '700',
  },
  emptyDesc: {
    textAlign: 'center',
  },
});
