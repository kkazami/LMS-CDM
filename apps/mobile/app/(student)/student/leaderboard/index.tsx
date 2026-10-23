import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Trophy,
  Award,
  Flame,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import {
  Screen,
  AppHeader,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { radius, spacing } from '../../../../src/lib/theme';
import type { LeaderboardEntry, StudentBadge } from '@lms/types';

type ActiveTab = 'leaderboard' | 'badges';
type BadgeCategoryFilter = 'ALL' | 'LEARNING' | 'STREAK' | 'EXCELLENCE' | 'LEVEL' | 'SPECIAL';

export default function StudentLeaderboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Leaderboard data
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  // Badges data
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategoryFilter>('ALL');

  const instituteCode = user?.institute?.code?.toLowerCase() || 'ics';

  const loadData = async () => {
    try {
      setErrorMessage(null);
      const [leaderboardRes, badgesRes] = await Promise.allSettled([
        api.leaderboard.get(instituteCode),
        api.gamification.getBadges(),
      ]);

      let hadSuccess = false;
      if (leaderboardRes.status === 'fulfilled') {
        const list = leaderboardRes.value.entries || [];
        setEntries(list);
        hadSuccess = true;
        const selfEntry = list.find((e) => e.isCurrentUser || e.userId === user?.id);
        if (selfEntry?.userName?.startsWith('Student #')) {
          setIsAnonymized(true);
        }
      }

      if (badgesRes.status === 'fulfilled') {
        setBadges(badgesRes.value.badges || []);
        hadSuccess = true;
      }

      if (!hadSuccess) {
        setErrorMessage('Could not load leaderboard data. Please check your connection.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not fetch gamification data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTogglePrivacy = async (value: boolean) => {
    try {
      setTogglingPrivacy(true);
      await api.gamification.updatePrivacy(value);
      setIsAnonymized(value);
      try {
        Burnt.toast({
          title: value ? 'Anonymous Mode On' : 'Public Profile Enabled',
          message: value
            ? 'Your real name is hidden on the leaderboard'
            : 'Your name is now visible on the leaderboard',
          preset: 'done',
        });
      } catch {
        // Fallback
      }
      loadData();
    } catch (err: any) {
      Alert.alert('Privacy Update Failed', err?.message || 'Could not update anonymity preference.');
      setIsAnonymized(!value);
    } finally {
      setTogglingPrivacy(false);
    }
  };

  // Filtered badges
  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'ALL') return badges;
    return badges.filter((b) => b.category === selectedCategory);
  }, [badges, selectedCategory]);

  const unlockedBadgesCount = useMemo(() => {
    return badges.filter((b) => b.isUnlocked).length;
  }, [badges]);

  // Current student rank
  const selfRankEntry = useMemo(() => {
    return entries.find((e) => e.isCurrentUser || e.userId === user?.id);
  }, [entries, user?.id]);

  // Top 3 Podium
  const top3 = useMemo(() => entries.slice(0, 3), [entries]);
  const restEntries = useMemo(() => entries.slice(3), [entries]);

  const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const renderLeaderboardHeader = () => (
    <View style={styles.leaderboardHeader}>
      {/* Privacy Toggle Box */}
      <View
        style={[
          styles.privacyBox,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: radius.lg,
            padding: s(spacing.md),
            marginBottom: s(spacing.lg),
          },
        ]}
      >
        <View style={styles.privacyInfo}>
          <View style={[styles.privacyTitleRow, { gap: s(spacing.xs) }]}>
            {isAnonymized ? (
              <EyeOff size={s(18)} color={theme.colors.textSecondary} />
            ) : (
              <Eye size={s(18)} color={theme.colors.primary} />
            )}
            <Text
              style={[styles.privacyTitle, { color: theme.colors.text, fontSize: font(14) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Anonymous Mode
            </Text>
          </View>
          <Text
            style={[
              styles.privacyDesc,
              { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 3 },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {isAnonymized
              ? 'You appear as Student #XXXX to classmates'
              : 'Your name is visible to peers on the leaderboard'}
          </Text>
        </View>
        <Switch
          value={isAnonymized}
          onValueChange={handleTogglePrivacy}
          disabled={togglingPrivacy}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* User Status Card */}
      {selfRankEntry ? (
        <Card
          style={[
            styles.selfRankCard,
            {
              backgroundColor: `${theme.colors.primary}12`,
              borderColor: theme.colors.primary,
              borderRadius: radius.lg,
              padding: s(spacing.md),
              marginBottom: s(spacing.lg),
            },
          ]}
        >
          <View style={styles.selfRankRow}>
            <View style={[styles.selfRankLeft, { gap: s(spacing.md) }]}>
              <View
                style={[
                  styles.selfRankBadge,
                  {
                    backgroundColor: theme.colors.primary,
                    width: s(44),
                    height: s(44),
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text
                  style={[styles.selfRankNumber, { fontSize: font(16) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  #{selfRankEntry.rank}
                </Text>
              </View>
              <View style={styles.selfRankDetails}>
                <Text
                  style={[styles.selfRankTitle, { color: theme.colors.text, fontSize: font(15) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Your Standing
                </Text>
                <Text
                  style={[styles.selfRankSubtitle, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {selfRankEntry.userName}
                </Text>
              </View>
            </View>

            <View style={[styles.selfRankMetrics, { gap: s(spacing.lg) }]}>
              <View style={styles.metricItem}>
                <Text
                  style={[styles.metricValue, { color: theme.colors.primary, fontSize: font(16) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {selfRankEntry.totalPoints.toLocaleString()}
                </Text>
                <Text
                  style={[styles.metricLabel, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  EXP
                </Text>
              </View>
              {selfRankEntry.currentStreak > 0 ? (
                <View style={styles.metricItem}>
                  <View style={[styles.streakRow, { gap: 2 }]}>
                    <Flame size={s(14)} color={theme.colors.warning} />
                    <Text
                      style={[styles.metricValue, { color: theme.colors.warning, fontSize: font(16) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {selfRankEntry.currentStreak}d
                    </Text>
                  </View>
                  <Text
                    style={[styles.metricLabel, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Streak
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      ) : null}

      {/* Podium Top 3 */}
      {top3.length > 0 ? (
        <View style={[styles.podiumContainer, { marginBottom: s(spacing.lg) }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.textSecondary, fontSize: font(12), marginBottom: s(spacing.md) },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            TOP SCHOLARS
          </Text>
          <View style={[styles.podiumRow, { gap: s(spacing.sm) }]}>
            {/* 2nd Place */}
            {top3[1] ? (
              <View
                style={[
                  styles.podiumItem,
                  styles.podiumSecond,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    paddingVertical: s(spacing.md),
                  },
                ]}
              >
                <View
                  style={[
                    styles.podiumRankBadge,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      width: s(28),
                      height: s(28),
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.podiumRankText, { color: theme.colors.textSecondary, fontSize: font(13) }]}>2</Text>
                </View>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      width: s(44),
                      height: s(44),
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: theme.colors.text, fontSize: font(16) }]}>
                    {getInitials(top3[1].userName)}
                  </Text>
                </View>
                <Text
                  style={[styles.podiumName, { color: theme.colors.text, fontSize: font(13) }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {top3[1].userName}
                </Text>
                <Text
                  style={[styles.podiumExp, { color: theme.colors.primary, fontSize: font(12) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {top3[1].totalPoints.toLocaleString()} EXP
                </Text>
              </View>
            ) : (
              <View style={styles.podiumItem} />
            )}

            {/* 1st Place */}
            {top3[0] ? (
              <View
                style={[
                  styles.podiumItem,
                  styles.podiumFirst,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.warning,
                    borderRadius: radius.lg,
                    paddingVertical: s(spacing.md),
                  },
                ]}
              >
                <View
                  style={[
                    styles.podiumRankBadge,
                    {
                      backgroundColor: theme.colors.warning,
                      width: s(28),
                      height: s(28),
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Trophy size={s(16)} color="#FFFFFF" />
                </View>
                <View
                  style={[
                    styles.avatarCircle,
                    styles.avatarFirst,
                    {
                      backgroundColor: theme.colors.primary,
                      width: s(52),
                      height: s(52),
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: '#FFFFFF', fontSize: font(18) }]}>
                    {getInitials(top3[0].userName)}
                  </Text>
                </View>
                <Text
                  style={[styles.podiumName, { color: theme.colors.text, fontWeight: '700', fontSize: font(13.5) }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {top3[0].userName}
                </Text>
                <Text
                  style={[styles.podiumExp, { color: theme.colors.primary, fontWeight: '800', fontSize: font(12.5) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {top3[0].totalPoints.toLocaleString()} EXP
                </Text>
                {top3[0].currentStreak > 0 ? (
                  <View
                    style={[
                      styles.streakPill,
                      {
                        backgroundColor: theme.colors.warningBg,
                        borderRadius: radius.sm,
                        paddingHorizontal: s(6),
                        paddingVertical: 2,
                      },
                    ]}
                  >
                    <Flame size={s(12)} color={theme.colors.warning} />
                    <Text
                      style={[styles.streakPillText, { color: theme.colors.warning, fontSize: font(11) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {top3[0].currentStreak}d
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* 3rd Place */}
            {top3[2] ? (
              <View
                style={[
                  styles.podiumItem,
                  styles.podiumThird,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    paddingVertical: s(spacing.md),
                  },
                ]}
              >
                <View
                  style={[
                    styles.podiumRankBadge,
                    {
                      backgroundColor: `${theme.colors.primary}20`,
                      width: s(28),
                      height: s(28),
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.podiumRankText, { color: theme.colors.primary, fontSize: font(13) }]}>3</Text>
                </View>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: `${theme.colors.primary}25`,
                      width: s(44),
                      height: s(44),
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: theme.colors.primary, fontSize: font(16) }]}>
                    {getInitials(top3[2].userName)}
                  </Text>
                </View>
                <Text
                  style={[styles.podiumName, { color: theme.colors.text, fontSize: font(13) }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {top3[2].userName}
                </Text>
                <Text
                  style={[styles.podiumExp, { color: theme.colors.primary, fontSize: font(12) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {top3[2].totalPoints.toLocaleString()} EXP
                </Text>
              </View>
            ) : (
              <View style={styles.podiumItem} />
            )}
          </View>
        </View>
      ) : null}

      {restEntries.length > 0 ? (
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.textSecondary, fontSize: font(12), marginTop: s(spacing.md), marginBottom: s(spacing.sm) },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          HONOR ROLL RANKINGS
        </Text>
      ) : null}
    </View>
  );

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isSelf = item.isCurrentUser || item.userId === user?.id;
    return (
      <View
        style={[
          styles.leaderboardRow,
          {
            backgroundColor: isSelf ? `${theme.colors.primary}15` : theme.colors.card,
            borderColor: isSelf ? theme.colors.primary : theme.colors.border,
            borderRadius: radius.md,
            padding: s(spacing.md),
            marginBottom: s(spacing.sm),
          },
        ]}
      >
        <View style={styles.rowRankCol}>
          <Text
            style={[
              styles.rowRankText,
              { color: isSelf ? theme.colors.primary : theme.colors.textSecondary, fontSize: font(14) },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            #{item.rank}
          </Text>
        </View>

        <View
          style={[
            styles.rowAvatar,
            {
              backgroundColor: isSelf ? theme.colors.primary : theme.colors.surfaceAlt,
              width: s(38),
              height: s(38),
              borderRadius: radius.full,
              marginRight: s(spacing.sm),
            },
          ]}
        >
          <Text
            style={[styles.rowAvatarText, { color: isSelf ? '#FFFFFF' : theme.colors.text, fontSize: font(14) }]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {getInitials(item.userName)}
          </Text>
        </View>

        <View style={styles.rowMainInfo}>
          <View style={[styles.rowNameLine, { gap: s(spacing.xs) }]}>
            <Text
              style={[
                styles.rowName,
                { color: theme.colors.text, fontWeight: isSelf ? '700' : '600', fontSize: font(14) },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {item.userName}
            </Text>
            {isSelf ? (
              <Badge label="YOU" variant="primary" size="sm" style={styles.youBadge} />
            ) : null}
          </View>
          {item.levelTier ? (
            <Text
              style={[styles.rowTier, { color: theme.colors.textSecondary, fontSize: font(11), marginTop: 2 }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Tier: {item.levelTier.toUpperCase()}
            </Text>
          ) : null}
        </View>

        <View style={styles.rowExpCol}>
          <Text
            style={[styles.rowExpValue, { color: theme.colors.primary, fontSize: font(14) }]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {item.totalPoints.toLocaleString()}
          </Text>
          <Text
            style={[styles.rowExpLabel, { color: theme.colors.textSecondary, fontSize: font(10), marginTop: 1 }]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            EXP
          </Text>
        </View>
      </View>
    );
  };

  const renderBadgesHeader = () => (
    <View style={[styles.badgesHeader, { marginBottom: s(spacing.md) }]}>
      {/* Progress Summary Card */}
      <Card
        style={[
          styles.badgeStatsCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: radius.lg,
            padding: s(spacing.lg),
            marginBottom: s(spacing.md),
          },
        ]}
      >
        <View style={styles.badgeStatsRow}>
          <View style={styles.badgeStatsLeft}>
            <Text
              style={[styles.badgeStatsValue, { color: theme.colors.primary, fontSize: font(22) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {unlockedBadgesCount} / {badges.length}
            </Text>
            <Text
              style={[styles.badgeStatsLabel, { color: theme.colors.textSecondary, fontSize: font(13), marginTop: 4 }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Badges Unlocked ({Math.round((unlockedBadgesCount / (badges.length || 1)) * 100)}%)
            </Text>
          </View>
          <View
            style={[
              styles.badgeTrophyCircle,
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
      </Card>

      {/* Category Filter Pills */}
      <View style={[styles.categoryPillScroll, { gap: s(spacing.sm), marginBottom: s(spacing.xs) }]}>
        {(
          [
            { id: 'ALL', label: 'All' },
            { id: 'LEARNING', label: 'Learning' },
            { id: 'STREAK', label: 'Streaks' },
            { id: 'EXCELLENCE', label: 'Excellence' },
            { id: 'LEVEL', label: 'Levels' },
            { id: 'SPECIAL', label: 'Special' },
          ] as const
        ).map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${cat.label} badges`}
              style={[
                styles.categoryPill,
                {
                  borderRadius: radius.full,
                  paddingHorizontal: s(spacing.md),
                  paddingVertical: s(spacing.xs),
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceAlt,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  {
                    fontSize: font(12),
                    color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderBadgeItem = ({ item }: { item: StudentBadge }) => {
    return (
      <View
        style={[
          styles.badgeCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: item.isUnlocked ? theme.colors.primary : theme.colors.border,
            borderRadius: radius.lg,
            padding: s(spacing.md),
            marginBottom: s(spacing.sm),
            opacity: item.isUnlocked ? 1 : 0.65,
          },
        ]}
      >
        <View
          style={[
            styles.badgeIconContainer,
            {
              backgroundColor: item.isUnlocked
                ? `${theme.colors.primary}18`
                : theme.colors.surfaceAlt,
              width: s(48),
              height: s(48),
              borderRadius: radius.full,
              marginRight: s(spacing.md),
            },
          ]}
        >
          {item.isUnlocked ? (
            <Sparkles size={s(24)} color={theme.colors.primary} />
          ) : (
            <Lock size={s(22)} color={theme.colors.textSecondary} />
          )}
        </View>

        <View style={styles.badgeInfo}>
          <View style={[styles.badgeTitleRow, { gap: s(spacing.sm) }]}>
            <Text
              style={[styles.badgeTitle, { color: theme.colors.text, fontSize: font(15) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {item.title}
            </Text>
            {item.isUnlocked ? (
              <Badge label="UNLOCKED" variant="success" size="sm" />
            ) : (
              <Badge label="LOCKED" variant="muted" size="sm" />
            )}
          </View>
          <Text
            style={[
              styles.badgeDescription,
              { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 3, lineHeight: font(17) },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {item.description}
          </Text>
          {item.earnedAt ? (
            <Text
              style={[
                styles.earnedDate,
                { color: theme.colors.primary, fontSize: font(11), marginTop: 4 },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Earned {new Date(item.earnedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen contentContainerStyle={styles.screenInner}>
      <AppHeader
        showBack
        title="Hall of Fame"
        subtitle={`${instituteCode.toUpperCase()} • EXP & Badges`}
      />

      {/* Segment Tab Bar */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'leaderboard' }}
          accessibilityLabel="Leaderboard Tab"
          style={[
            styles.tabItem,
            { paddingVertical: s(spacing.md) },
            activeTab === 'leaderboard' && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setActiveTab('leaderboard')}
          activeOpacity={0.8}
        >
          <Trophy
            size={s(18)}
            color={activeTab === 'leaderboard' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                fontSize: font(14),
                color:
                  activeTab === 'leaderboard'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === 'leaderboard' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'badges' }}
          accessibilityLabel="Badges & Rewards Tab"
          style={[
            styles.tabItem,
            { paddingVertical: s(spacing.md) },
            activeTab === 'badges' && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setActiveTab('badges')}
          activeOpacity={0.8}
        >
          <Award
            size={s(18)}
            color={activeTab === 'badges' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                fontSize: font(14),
                color:
                  activeTab === 'badges'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === 'badges' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Badges & Rewards
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContainer}>
        {errorMessage && (
          <View style={{ paddingHorizontal: s(spacing.lg), paddingTop: s(spacing.md) }}>
            <ErrorBanner
              message={errorMessage}
              onRetry={loadData}
              onDismiss={() => setErrorMessage(null)}
              retryAccessibilityLabel="Retry loading rankings"
            />
          </View>
        )}

        {loading ? (
          <View style={[styles.loadingContainer, { padding: s(spacing.lg) }]}>
            <SkeletonBlock
              width="100%"
              height={s(72)}
              borderRadius={radius.lg}
              style={{ marginBottom: s(spacing.md) }}
            />
            <View style={{ flexDirection: 'row', gap: s(spacing.sm), marginBottom: s(spacing.lg), alignItems: 'flex-end' }}>
              <SkeletonBlock width="31%" height={s(140)} borderRadius={radius.lg} />
              <SkeletonBlock width="34%" height={s(170)} borderRadius={radius.lg} />
              <SkeletonBlock width="31%" height={s(130)} borderRadius={radius.lg} />
            </View>
            {[1, 2, 3].map((i) => (
              <SkeletonBlock
                key={i}
                width="100%"
                height={s(56)}
                borderRadius={radius.md}
                style={{ marginBottom: s(spacing.sm) }}
              />
            ))}
          </View>
        ) : activeTab === 'leaderboard' ? (
          <FlatList
            data={restEntries}
            keyExtractor={(item) => item.userId}
            ListHeaderComponent={renderLeaderboardHeader}
            renderItem={renderLeaderboardItem}
            contentContainerStyle={[styles.listContent, { padding: s(spacing.lg) }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            ListEmptyComponent={
              top3.length === 0 ? (
                <Card
                  style={[
                    styles.emptyContainer,
                    {
                      padding: s(spacing.xxxl),
                      borderRadius: radius.lg,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Trophy size={s(48)} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    No Leaderboard Rankings Yet
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Complete assignments and practice on CodeLab to earn EXP!
                  </Text>
                </Card>
              ) : null
            }
          />
        ) : (
          <FlatList
            data={filteredBadges}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderBadgesHeader}
            renderItem={renderBadgeItem}
            contentContainerStyle={[styles.listContent, { padding: s(spacing.lg) }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            ListEmptyComponent={
              <Card
                style={[
                  styles.emptyContainer,
                  {
                    padding: s(spacing.xxxl),
                    borderRadius: radius.lg,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Award size={s(48)} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  No Badges in this Category
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Select another category or complete course challenges to earn new achievements!
                </Text>
              </Card>
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: TOUCH_TARGET ?? 44,
  },
  tabText: {},
  loadingContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  leaderboardHeader: {
    marginBottom: 8,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  privacyInfo: {
    flex: 1,
    marginRight: 12,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyTitle: {
    fontWeight: '600',
  },
  privacyDesc: {
    lineHeight: 16,
  },
  selfRankCard: {
    borderWidth: 1,
  },
  selfRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selfRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selfRankBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfRankNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selfRankDetails: {
    justifyContent: 'center',
  },
  selfRankTitle: {
    fontWeight: '700',
  },
  selfRankSubtitle: {
    marginTop: 2,
  },
  selfRankMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontWeight: '800',
  },
  metricLabel: {},
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  podiumContainer: {},
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  podiumFirst: {
    minHeight: 180,
    borderWidth: 2,
  },
  podiumSecond: {
    minHeight: 155,
  },
  podiumThird: {
    minHeight: 140,
  },
  podiumRankBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumRankText: {
    fontWeight: '800',
  },
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarFirst: {},
  avatarText: {
    fontWeight: '800',
  },
  podiumName: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumExp: {
    fontWeight: '700',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  streakPillText: {
    fontWeight: '700',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  rowRankCol: {
    width: 36,
    alignItems: 'center',
  },
  rowRankText: {
    fontWeight: '700',
  },
  rowAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatarText: {
    fontWeight: '700',
  },
  rowMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowName: {},
  youBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rowTier: {},
  rowExpCol: {
    alignItems: 'flex-end',
  },
  rowExpValue: {
    fontWeight: '700',
  },
  rowExpLabel: {},
  badgesHeader: {},
  badgeStatsCard: {
    borderWidth: 1,
  },
  badgeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeStatsLeft: {
    flex: 1,
  },
  badgeStatsValue: {
    fontWeight: '800',
  },
  badgeStatsLabel: {},
  badgeTrophyCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryPill: {
    borderWidth: 1,
    minHeight: (TOUCH_TARGET ?? 44) - 8,
    justifyContent: 'center',
  },
  categoryPillText: {},
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTitle: {
    fontWeight: '700',
    flex: 1,
  },
  badgeDescription: {},
  earnedDate: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
});