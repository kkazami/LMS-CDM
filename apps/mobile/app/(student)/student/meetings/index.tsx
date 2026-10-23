import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  Video,
  Calendar,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
  ChevronLeft,
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
import { isIteUser } from '../../../../src/lib/ite-eligibility';
import { radius, spacing } from '../../../../src/lib/theme';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { ClassMeetingItem } from '@lms/api-client';

type TabFilter = 'ALL' | 'LIVE' | 'UPCOMING' | 'PAST';

function formatDeviceLocalTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Time not set';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Time not set';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Time not set';
  }
}

function formatMeetingError(err: any): string {
  const status = err?.status || err?.statusCode;
  if (status === 401 || status === 403 || (status && status >= 500)) {
    return 'Meetings are temporarily unavailable. Please try again later.';
  }
  const message = String(err?.message || '');
  if (
    message.includes('permission denied') ||
    message.includes('PrismaClient') ||
    message.includes('database') ||
    message.includes('SQL')
  ) {
    return 'Meetings are temporarily unavailable. Please try again later.';
  }
  return err?.message || 'Meetings are temporarily unavailable. Please try again later.';
}

export default function StudentMeetingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const isEligible = isIteUser(user);

  const [meetings, setMeetings] = useState<ClassMeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');

  const fetchMeetings = useCallback(
    async (isBackground = false) => {
      if (!isEligible) {
        setLoading(false);
        return;
      }
      try {
        if (!isBackground) setError(null);
        const res = await api.meetings.list({ status: 'all' });
        setMeetings(res?.meetings || []);
      } catch (err: any) {
        if (!isBackground) {
          setError(formatMeetingError(err));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, isEligible]
  );

  // Auto-refresh every 30 seconds while screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!isEligible) return;
      fetchMeetings();
      const interval = setInterval(() => {
        fetchMeetings(true);
      }, 30000);

      return () => clearInterval(interval);
    }, [fetchMeetings, isEligible])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMeetings();
  };

  const handleJoinMeeting = async (meeting: ClassMeetingItem) => {
    try {
      setJoiningId(meeting.id);
      const res = await api.meetings.join(meeting.id);
      const targetUrl = (res?.joinUrl || meeting.joinUrl || '').trim();

      if (!targetUrl || !targetUrl.toLowerCase().startsWith('https://')) {
        Alert.alert(
          'Invalid Meeting Link',
          'The link provided for this class meeting is not a secure https URL.'
        );
        return;
      }

      const supported = await Linking.canOpenURL(targetUrl).catch(() => true);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        Alert.alert(
          'Unable to Open Meeting Link',
          'No compatible application or browser was found to open this meeting link.'
        );
      }
    } catch (err: any) {
      Alert.alert('Join Failed', formatMeetingError(err));
    } finally {
      setJoiningId(null);
    }
  };

  // Categorize meetings
  const liveMeetings = useMemo(
    () => meetings.filter((m) => m.derivedStatus === 'LIVE' || m.status === 'LIVE'),
    [meetings]
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings.filter(
        (m) =>
          (m.derivedStatus === 'SCHEDULED' || m.status === 'SCHEDULED') &&
          m.derivedStatus !== 'LIVE'
      ),
    [meetings]
  );

  const pastMeetings = useMemo(
    () =>
      meetings.filter(
        (m) =>
          m.derivedStatus === 'ENDED' ||
          m.derivedStatus === 'CANCELLED' ||
          m.status === 'ENDED' ||
          m.status === 'CANCELLED'
      ),
    [meetings]
  );

  const filteredMeetings = useMemo(() => {
    if (activeTab === 'LIVE') return liveMeetings;
    if (activeTab === 'UPCOMING') return upcomingMeetings;
    if (activeTab === 'PAST') return pastMeetings;
    return meetings;
  }, [activeTab, meetings, liveMeetings, upcomingMeetings, pastMeetings]);

  if (!isEligible) {
    return (
      <Screen scrollable={false} withTopInset={true}>
        <AppHeader
          title="Class Meetings"
          showBack={true}
          onBack={() => router.back()}
        />
        <View style={styles.restrictedContainer}>
          <Card style={styles.restrictedCard}>
            <ShieldAlert size={48} color={theme.colors.warning} />
            <Text
              style={[styles.restrictedTitle, { color: theme.colors.text }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              ITE Feature Only
            </Text>
            <Text
              style={[styles.restrictedDesc, { color: theme.colors.textSecondary }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Class Meetings are exclusively available for students enrolled in the Institute of Teacher Education (ITE).
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  const renderMeetingCard = (item: ClassMeetingItem) => {
    const isLive = item.derivedStatus === 'LIVE' || item.status === 'LIVE';
    const isCancelled = item.derivedStatus === 'CANCELLED' || item.status === 'CANCELLED';
    const isEnded = item.derivedStatus === 'ENDED' || item.status === 'ENDED';
    const isJoining = joiningId === item.id;

    const displayTime = formatDeviceLocalTime(
      item.scheduledAt || item.startedAt || item.primaryTimeIso
    );

    return (
      <Card
        key={item.id}
        style={[
          styles.meetingCard,
          isLive && { borderColor: theme.colors.success, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Badge
              label={item.courseCode || 'ITE COURSE'}
              variant="primary"
              size="sm"
            />
            {isLive ? (
              <View
                style={[
                  styles.liveIndicator,
                  { backgroundColor: `${theme.colors.danger}15` },
                ]}
              >
                <Radio size={12} color={theme.colors.danger} />
                <Text style={[styles.liveText, { color: theme.colors.danger }]}>
                  LIVE NOW
                </Text>
              </View>
            ) : isCancelled ? (
              <Badge label="CANCELLED" variant="danger" size="sm" />
            ) : isEnded ? (
              <Badge label="ENDED" variant="default" size="sm" />
            ) : (
              <Badge label="UPCOMING" variant="info" size="sm" />
            )}
          </View>
          {item.provider && (
            <Text
              style={[styles.providerLabel, { color: theme.colors.textSecondary }]}
            >
              {item.provider.replace('_', ' ')}
            </Text>
          )}
        </View>

        <Text
          style={[
            styles.meetingTitle,
            { color: theme.colors.text, fontSize: font(16) },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {item.title}
        </Text>

        <Text
          style={[styles.courseTitle, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.courseTitle}
        </Text>

        {item.description ? (
          <Text
            style={[
              styles.meetingDescription,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={14} color={theme.colors.textSecondary} />
            <Text
              style={[styles.metaText, { color: theme.colors.textSecondary }]}
            >
              {displayTime}
            </Text>
          </View>
        </View>

        {isLive && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Join ${item.title}`}
            style={[
              styles.joinButton,
              { backgroundColor: theme.colors.success },
              isJoining && { opacity: 0.7 },
            ]}
            onPress={() => handleJoinMeeting(item)}
            disabled={isJoining}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Video size={16} color="#FFFFFF" />
                <Text style={styles.joinButtonText}>Join Meeting</Text>
                <ExternalLink size={14} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <Screen scrollable={false} withTopInset={true}>
      <AppHeader
        title="Class Meetings"
        subtitle="ITE Virtual Classrooms"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: theme.colors.border }]}>
        {(['ALL', 'LIVE', 'UPCOMING', 'PAST'] as TabFilter[]).map((tab) => {
          const isSelected = activeTab === tab;
          const count =
            tab === 'ALL'
              ? meetings.length
              : tab === 'LIVE'
              ? liveMeetings.length
              : tab === 'UPCOMING'
              ? upcomingMeetings.length
              : pastMeetings.length;

          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${tab}`}
              style={[
                styles.filterTab,
                isSelected && {
                  backgroundColor: `${theme.colors.primary}18`,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonBlock height={120} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={120} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={120} />
        </View>
      ) : (
        <FlatList
          data={filteredMeetings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderMeetingCard(item)}
          contentContainerStyle={[
            styles.listContent,
            filteredMeetings.length === 0 && styles.listEmptyContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBannerContainer}>
                <ErrorBanner
                  message={error}
                  onRetry={handleRefresh}
                  onDismiss={() => setError(null)}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video size={48} color={theme.colors.textSecondary} />
              <Text
                style={[styles.emptyTitle, { color: theme.colors.text }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {activeTab === 'LIVE'
                  ? 'No Live Meetings'
                  : activeTab === 'UPCOMING'
                  ? 'No Upcoming Meetings'
                  : activeTab === 'PAST'
                  ? 'No Past Meetings'
                  : 'No Class Meetings Found'}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {activeTab === 'LIVE'
                  ? 'There are no active video classes right now. Check back when your scheduled session starts.'
                  : 'Class meetings scheduled by your instructors will appear here in your device local time.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 12,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: spacing.md,
  },
  errorBannerContainer: {
    marginBottom: spacing.md,
  },
  meetingCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  providerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  meetingTitle: {
    fontWeight: '700',
    marginTop: 2,
  },
  courseTitle: {
    fontSize: 13,
  },
  meetingDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minHeight: TOUCH_TARGET,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  restrictedCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  restrictedDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
