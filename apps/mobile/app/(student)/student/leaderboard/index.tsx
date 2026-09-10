import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
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
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { LeaderboardEntry, StudentBadge } from '@lms/types';

type ActiveTab = 'leaderboard' | 'badges';
type BadgeCategoryFilter = 'ALL' | 'LEARNING' | 'STREAK' | 'EXCELLENCE' | 'LEVEL' | 'SPECIAL';

export default function StudentLeaderboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const [leaderboardRes, badgesRes] = await Promise.allSettled([
        api.leaderboard.get(instituteCode),
        api.gamification.getBadges(),
      ]);

      if (leaderboardRes.status === 'fulfilled') {
        const list = leaderboardRes.value.entries || [];
        setEntries(list);
        const selfEntry = list.find((e) => e.isCurrentUser || e.userId === user?.id);
        if (selfEntry?.userName?.startsWith('Student #')) {
          setIsAnonymized(true);
        }
      }

      if (badgesRes.status === 'fulfilled') {
        setBadges(badgesRes.value.badges || []);
      }
    } catch (err: any) {
      Burnt.toast({
        title: 'Error loading data',
        message: err?.message || 'Could not fetch gamification data',
        preset: 'error',
      });
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
      Burnt.toast({
        title: value ? 'Anonymous Mode On' : 'Public Profile Enabled',
        message: value
          ? 'Your real name is hidden on the leaderboard'
          : 'Your name is now visible on the leaderboard',
        preset: 'done',
      });
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
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.privacyInfo}>
          <View style={styles.privacyTitleRow}>
            {isAnonymized ? (
              <EyeOff size={18} color={theme.colors.textSecondary} />
            ) : (
              <Eye size={18} color={theme.colors.primary} />
            )}
            <Text style={[styles.privacyTitle, { color: theme.colors.text }]}>
              Anonymous Mode
            </Text>
          </View>
          <Text style={[styles.privacyDesc, { color: theme.colors.textSecondary }]}>
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
            },
          ]}
        >
          <View style={styles.selfRankRow}>
            <View style={styles.selfRankLeft}>
              <View
                style={[
                  styles.selfRankBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.selfRankNumber}>#{selfRankEntry.rank}</Text>
              </View>
              <View style={styles.selfRankDetails}>
                <Text style={[styles.selfRankTitle, { color: theme.colors.text }]}>
                  Your Standing
                </Text>
                <Text style={[styles.selfRankSubtitle, { color: theme.colors.textSecondary }]}>
                  {selfRankEntry.userName}
                </Text>
              </View>
            </View>

            <View style={styles.selfRankMetrics}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                  {selfRankEntry.totalPoints.toLocaleString()}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                  EXP
                </Text>
              </View>
              {selfRankEntry.currentStreak > 0 ? (
                <View style={styles.metricItem}>
                  <View style={styles.streakRow}>
                    <Flame size={14} color={theme.colors.warning} />
                    <Text style={[styles.metricValue, { color: theme.colors.warning }]}>
                      {selfRankEntry.currentStreak}d
                    </Text>
                  </View>
                  <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
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
        <View style={styles.podiumContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            TOP SCHOLARS
          </Text>
          <View style={styles.podiumRow}>
            {/* 2nd Place */}
            {top3[1] ? (
              <View
                style={[
                  styles.podiumItem,
                  styles.podiumSecond,
                  { backgroundColor: theme.colors.card, borderColor: '#94A3B8' },
                ]}
              >
                <View style={[styles.podiumRankBadge, { backgroundColor: '#94A3B8' }]}>
                  <Text style={styles.podiumRankText}>2</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: '#64748B' }]}>
                  <Text style={styles.avatarText}>{getInitials(top3[1].userName)}</Text>
                </View>
                <Text
                  style={[styles.podiumName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {top3[1].userName}
                </Text>
                <Text style={[styles.podiumExp, { color: theme.colors.primary }]}>
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
                  { backgroundColor: theme.colors.card, borderColor: '#F59E0B' },
                ]}
              >
                <View style={[styles.podiumRankBadge, { backgroundColor: '#F59E0B' }]}>
                  <Trophy size={16} color="#FFFFFF" />
                </View>
                <View
                  style={[
                    styles.avatarCircle,
                    styles.avatarFirst,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(top3[0].userName)}</Text>
                </View>
                <Text
                  style={[styles.podiumName, { color: theme.colors.text, fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {top3[0].userName}
                </Text>
                <Text style={[styles.podiumExp, { color: theme.colors.primary, fontWeight: '800' }]}>
                  {top3[0].totalPoints.toLocaleString()} EXP
                </Text>
                {top3[0].currentStreak > 0 ? (
                  <View style={styles.streakPill}>
                    <Flame size={12} color={theme.colors.warning} />
                    <Text style={[styles.streakPillText, { color: theme.colors.warning }]}>
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
                  { backgroundColor: theme.colors.card, borderColor: '#D97706' },
                ]}
              >
                <View style={[styles.podiumRankBadge, { backgroundColor: '#D97706' }]}>
                  <Text style={styles.podiumRankText}>3</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: '#B45309' }]}>
                  <Text style={styles.avatarText}>{getInitials(top3[2].userName)}</Text>
                </View>
                <Text
                  style={[styles.podiumName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {top3[2].userName}
                </Text>
                <Text style={[styles.podiumExp, { color: theme.colors.primary }]}>
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
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 12 }]}>
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
          },
        ]}
      >
        <View style={styles.rowRankCol}>
          <Text
            style={[
              styles.rowRankText,
              { color: isSelf ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            #{item.rank}
          </Text>
        </View>

        <View
          style={[
            styles.rowAvatar,
            { backgroundColor: isSelf ? theme.colors.primary : `${theme.colors.textSecondary}30` },
          ]}
        >
          <Text style={styles.rowAvatarText}>{getInitials(item.userName)}</Text>
        </View>

        <View style={styles.rowMainInfo}>
          <View style={styles.rowNameLine}>
            <Text
              style={[
                styles.rowName,
                { color: theme.colors.text, fontWeight: isSelf ? '700' : '600' },
              ]}
              numberOfLines={1}
            >
              {item.userName}
            </Text>
            {isSelf ? (
              <Badge label="YOU" variant="primary" size="sm" style={styles.youBadge} />
            ) : null}
          </View>
          {item.levelTier ? (
            <Text style={[styles.rowTier, { color: theme.colors.textSecondary }]}>
              Tier: {item.levelTier.toUpperCase()}
            </Text>
          ) : null}
        </View>

        <View style={styles.rowExpCol}>
          <Text style={[styles.rowExpValue, { color: theme.colors.primary }]}>
            {item.totalPoints.toLocaleString()}
          </Text>
          <Text style={[styles.rowExpLabel, { color: theme.colors.textSecondary }]}>
            EXP
          </Text>
        </View>
      </View>
    );
  };

  const renderBadgesHeader = () => (
    <View style={styles.badgesHeader}>
      {/* Progress Summary Card */}
      <Card
        style={[
          styles.badgeStatsCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.badgeStatsRow}>
          <View style={styles.badgeStatsLeft}>
            <Text style={[styles.badgeStatsValue, { color: theme.colors.primary }]}>
              {unlockedBadgesCount} / {badges.length}
            </Text>
            <Text style={[styles.badgeStatsLabel, { color: theme.colors.textSecondary }]}>
              Badges Unlocked ({Math.round((unlockedBadgesCount / (badges.length || 1)) * 100)}%)
            </Text>
          </View>
          <View
            style={[
              styles.badgeTrophyCircle,
              { backgroundColor: `${theme.colors.primary}18` },
            ]}
          >
            <Award size={28} color={theme.colors.primary} />
          </View>
        </View>
      </Card>

      {/* Category Filter Pills */}
      <View style={styles.categoryPillScroll}>
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
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: isSelected ? '#FFFFFF' : theme.colors.text },
                ]}
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
                : `${theme.colors.textSecondary}15`,
            },
          ]}
        >
          {item.isUnlocked ? (
            <Sparkles size={24} color={theme.colors.primary} />
          ) : (
            <Lock size={22} color={theme.colors.textSecondary} />
          )}
        </View>

        <View style={styles.badgeInfo}>
          <View style={styles.badgeTitleRow}>
            <Text style={[styles.badgeTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            {item.isUnlocked ? (
              <Badge label="UNLOCKED" variant="success" size="sm" />
            ) : (
              <Badge label="LOCKED" variant="muted" size="sm" />
            )}
          </View>
          <Text style={[styles.badgeDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>
          {item.earnedAt ? (
            <Text style={[styles.earnedDate, { color: theme.colors.primary }]}>
              Earned {new Date(item.earnedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Navigation Header */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Hall of Fame
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {instituteCode.toUpperCase()} • EXP & Badges
          </Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Segment Tab Bar */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityLabel="Leaderboard Tab"
          style={[
            styles.tabItem,
            activeTab === 'leaderboard' && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setActiveTab('leaderboard')}
          activeOpacity={0.8}
        >
          <Trophy
            size={18}
            color={activeTab === 'leaderboard' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'leaderboard'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === 'leaderboard' ? '700' : '500',
              },
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityLabel="Badges & Rewards Tab"
          style={[
            styles.tabItem,
            activeTab === 'badges' && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setActiveTab('badges')}
          activeOpacity={0.8}
        >
          <Award
            size={18}
            color={activeTab === 'badges' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'badges'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: activeTab === 'badges' ? '700' : '500',
              },
            ]}
          >
            Badges & Rewards
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading rankings & badges...
          </Text>
        </View>
      ) : activeTab === 'leaderboard' ? (
        <FlatList
          data={restEntries}
          keyExtractor={(item) => item.userId}
          ListHeaderComponent={renderLeaderboardHeader}
          renderItem={renderLeaderboardItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            top3.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Trophy size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  No Leaderboard Rankings Yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Complete assignments and practice on CodeLab to earn EXP!
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredBadges}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderBadgesHeader}
          renderItem={renderBadgeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Award size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Badges in this Category
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Select another category or earn new achievements!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRightSpacer: {
    width: 44,
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
    paddingVertical: 14,
    minHeight: TOUCH_TARGET,
  },
  tabText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  leaderboardHeader: {
    marginBottom: 8,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  privacyInfo: {
    flex: 1,
    marginRight: 12,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  privacyDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  selfRankCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  selfRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selfRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selfRankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfRankNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  selfRankDetails: {
    justifyContent: 'center',
  },
  selfRankTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  selfRankSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  selfRankMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  podiumContainer: {
    marginBottom: 18,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumRankText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarFirst: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumExp: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  streakPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  rowRankCol: {
    width: 36,
    alignItems: 'center',
  },
  rowRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rowMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: {
    fontSize: 14,
  },
  youBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rowTier: {
    fontSize: 11,
    marginTop: 2,
  },
  rowExpCol: {
    alignItems: 'flex-end',
  },
  rowExpValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowExpLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  badgesHeader: {
    marginBottom: 12,
  },
  badgeStatsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
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
    fontSize: 22,
    fontWeight: '800',
  },
  badgeStatsLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  badgeTrophyCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: TOUCH_TARGET - 8,
    justifyContent: 'center',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  badgeDescription: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  earnedDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});