import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  BookOpen,
  Clock,
  Megaphone,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { Card } from '../../../../src/components/common/Card';
import {
  Screen,
  AppHeader,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import { radius, spacing } from '../../../../src/lib/theme';
import type { Announcement, Course } from '@lms/types';

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Recent';
  }
}

export default function StudentAnnouncementsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setErrorMessage(null);
      // 1. Offline storage first for instant display
      const [cachedAnnouncements, cachedCourses] = await Promise.all([
        getCachedData<Announcement[]>('student_announcements_full'),
        getCachedData<Course[]>('student_courses'),
      ]);

      if (cachedAnnouncements && cachedAnnouncements.length > 0) {
        setAnnouncements(cachedAnnouncements);
        setLoading(false);
      }
      if (cachedCourses && cachedCourses.length > 0) {
        setCourses(cachedCourses);
      }

      // 2. Fresh real data from backend
      const instituteCode = user?.institute?.code || 'ics';
      const [annRes, coursesRes] = await Promise.allSettled([
        api.announcements.list(instituteCode),
        api.courses.list(instituteCode),
      ]);

      let hadSuccess = false;
      if (annRes.status === 'fulfilled' && annRes.value?.announcements) {
        setAnnouncements(annRes.value.announcements);
        await setCachedData('student_announcements_full', annRes.value.announcements);
        hadSuccess = true;
      }
      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
        await setCachedData('student_courses', coursesRes.value.courses);
        hadSuccess = true;
      }

      if (!hadSuccess && (!cachedAnnouncements || cachedAnnouncements.length === 0)) {
        if (annRes.status === 'rejected') {
          setErrorMessage((annRes as PromiseRejectedResult).reason?.message || 'Could not load announcements.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not load announcements. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtered announcements by course scope and search query
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const matchesCourse =
        selectedCourseId === 'all' || item.courseId === selectedCourseId;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.authorName && item.authorName.toLowerCase().includes(q)) ||
        (item.courseName && item.courseName.toLowerCase().includes(q)) ||
        (item.courseCode && item.courseCode.toLowerCase().includes(q));

      return matchesCourse && matchesSearch;
    });
  }, [announcements, selectedCourseId, searchQuery]);

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      contentContainerStyle={styles.screenInner}
    >
      <AppHeader
        showBack
        title="Announcements"
        subtitle="Updates & notices for your enrolled courses"
        rightAction={
          <View style={[styles.headerPill, { backgroundColor: `${theme.colors.primary}18` }]}>
            <Megaphone size={s(15)} color={theme.colors.primary} />
            <Text
              style={[styles.headerPillText, { color: theme.colors.primary, fontSize: font(12) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {filteredAnnouncements.length}
            </Text>
          </View>
        }
      />

      {/* Top Filter and Search Control Box */}
      <View
        style={[
          styles.controlsContainer,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: s(spacing.lg),
            paddingTop: s(spacing.md),
            paddingBottom: s(spacing.md),
          },
        ]}
      >
        {/* Search Input */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderRadius: radius.md,
              height: s(42),
              paddingHorizontal: s(spacing.md),
            },
          ]}
        >
          <Search size={s(18)} color={theme.colors.textSecondary} style={{ marginRight: s(spacing.sm) }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, fontSize: font(13.5) }]}
            placeholder="Search by keyword, instructor, or subject..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={s(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Course Scope Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterChipsContainer, { gap: s(spacing.sm) }]}
        >
          <TouchableOpacity
            style={[
              styles.chipButton,
              {
                borderRadius: radius.full,
                paddingHorizontal: s(spacing.md),
                paddingVertical: s(spacing.xs),
              },
              selectedCourseId === 'all'
                ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                : { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
            ]}
            onPress={() => setSelectedCourseId('all')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Filter all courses, ${announcements.length} announcements`}
          >
            <Text
              style={[
                styles.chipText,
                {
                  fontSize: font(12),
                  color: selectedCourseId === 'all' ? '#FFFFFF' : theme.colors.textSecondary,
                  fontWeight: selectedCourseId === 'all' ? '700' : '500',
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              All Courses ({announcements.length})
            </Text>
          </TouchableOpacity>

          {courses.map((course) => {
            const isSelected = selectedCourseId === course.id;
            const count = announcements.filter((a) => a.courseId === course.id).length;
            return (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.chipButton,
                  {
                    borderRadius: radius.full,
                    paddingHorizontal: s(spacing.md),
                    paddingVertical: s(spacing.xs),
                  },
                  isSelected
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
                ]}
                onPress={() => setSelectedCourseId(course.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter course ${course.code || course.title}, ${count} announcements`}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      fontSize: font(12),
                      color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {course.code || course.title} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <View style={[styles.contentArea, { padding: s(spacing.lg) }]}>
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadData}
            onDismiss={() => setErrorMessage(null)}
            retryAccessibilityLabel="Retry loading announcements"
            style={{ marginBottom: s(spacing.md) }}
          />
        )}

        {loading ? (
          <View style={styles.loadingSkeletonList}>
            {[1, 2, 3].map((key) => (
              <View
                key={key}
                style={[
                  styles.announcementCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <View style={styles.skeletonHeader}>
                  <SkeletonBlock width={s(36)} height={s(36)} borderRadius={radius.full} />
                  <View style={{ flex: 1, marginLeft: s(spacing.sm) }}>
                    <SkeletonBlock width="45%" height={s(14)} style={{ marginBottom: s(spacing.xs) }} />
                    <SkeletonBlock width="25%" height={s(11)} />
                  </View>
                  <SkeletonBlock width={s(60)} height={s(20)} borderRadius={radius.sm} />
                </View>
                <SkeletonBlock width="80%" height={s(16)} style={{ marginVertical: s(spacing.md) }} />
                <SkeletonBlock width="100%" height={s(12)} style={{ marginBottom: s(spacing.xs) }} />
                <SkeletonBlock width="90%" height={s(12)} />
              </View>
            ))}
          </View>
        ) : filteredAnnouncements.length === 0 ? (
          <Card
            style={[
              styles.emptyCard,
              {
                padding: s(spacing.xxxl),
                borderRadius: radius.lg,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Megaphone size={s(44)} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {searchQuery.trim().length > 0
                ? 'No Matching Announcements'
                : selectedCourseId !== 'all'
                ? 'No Announcements for This Course'
                : courses.length === 0
                ? 'No Course Enrollments'
                : 'No Announcements Yet'}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {searchQuery.trim().length > 0
                ? `No announcements found matching "${searchQuery}". Try a different keyword.`
                : selectedCourseId !== 'all'
                ? 'Your instructor has not posted any announcements for this specific subject yet.'
                : courses.length === 0
                ? 'You are not enrolled in any active courses. Enroll in a class to receive instructor bulletins.'
                : 'Your instructors have not posted any announcements for your classes yet. Check back later!'}
            </Text>
          </Card>
        ) : (
          filteredAnnouncements.map((item) => (
            <View
              key={item.id}
              style={[
                styles.announcementCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  marginBottom: s(spacing.md),
                },
              ]}
            >
              {/* Card Header: Author info, Course Code badge, Date */}
              <View style={[styles.cardHeader, { padding: s(spacing.md) }]}>
                <View style={styles.authorGroup}>
                  <View
                    style={[
                      styles.avatarFallback,
                      {
                        backgroundColor: `${theme.colors.primary}20`,
                        width: s(36),
                        height: s(36),
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.avatarInitial, { color: theme.colors.primary, fontSize: font(15) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {(item.authorName || 'I').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.authorMeta, { marginLeft: s(spacing.sm) }]}>
                    <Text
                      style={[styles.authorName, { color: theme.colors.text, fontSize: font(14) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {item.authorName || 'Course Instructor'}
                    </Text>
                    <View style={styles.timestampRow}>
                      <Clock size={s(11)} color={theme.colors.textSecondary} />
                      <Text
                        style={[styles.timestampText, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.courseCode && (
                  <View
                    style={[
                      styles.courseCodeBadge,
                      {
                        backgroundColor: `${theme.colors.primary}18`,
                        borderRadius: radius.sm,
                        paddingHorizontal: s(spacing.sm),
                        paddingVertical: s(spacing.xs),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.courseCodeBadgeText, { color: theme.colors.primary, fontSize: font(11) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {item.courseCode}
                    </Text>
                  </View>
                )}
              </View>

              {/* Title & Body */}
              <View style={[styles.contentBody, { paddingHorizontal: s(spacing.md), paddingBottom: s(spacing.md) }]}>
                {item.title && item.title !== item.content && (
                  <Text
                    style={[styles.cardTitle, { color: theme.colors.text, fontSize: font(15), lineHeight: font(21) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {item.title}
                  </Text>
                )}
                <Text
                  style={[styles.cardContentText, { color: theme.colors.text, fontSize: font(13.5), lineHeight: font(20) }]}
                  selectable
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {item.content}
                </Text>
              </View>

              {/* Course Title Footer Banner */}
              {item.courseName && (
                <View
                  style={[
                    styles.cardFooter,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderTopColor: theme.colors.border,
                      paddingHorizontal: s(spacing.md),
                      paddingVertical: s(spacing.sm),
                    },
                  ]}
                >
                  <BookOpen size={s(13)} color={theme.colors.textSecondary} />
                  <Text
                    style={[styles.footerCourseText, { color: theme.colors.textSecondary, fontSize: font(11.5) }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {item.courseName}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    paddingBottom: 36,
  },
  controlsContainer: {
    borderBottomWidth: 1,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  headerPillText: {
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  chipButton: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontWeight: '500',
  },
  contentArea: {
    flex: 1,
  },
  loadingSkeletonList: {
    paddingVertical: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  announcementCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontWeight: '700',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timestampText: {
    fontWeight: '500',
  },
  courseCodeBadge: {
    marginLeft: 8,
  },
  courseCodeBadgeText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentBody: {
    marginTop: 2,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  cardContentText: {},
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
  },
  footerCourseText: {
    fontWeight: '500',
    flex: 1,
  },
});
