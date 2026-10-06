import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Search,
  X,
  BookOpen,
  Calendar,
  Clock,
  User,
  Megaphone,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
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

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
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

      if (annRes.status === 'fulfilled' && annRes.value?.announcements) {
        setAnnouncements(annRes.value.announcements);
        await setCachedData('student_announcements_full', annRes.value.announcements);
      }
      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
        await setCachedData('student_courses', coursesRes.value.courses);
      }
    } catch {
      // Graceful fallback to cached state
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* ── Screen Header ── */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: `${theme.colors.border}40` }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Announcements
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              Updates & notices for your enrolled courses
            </Text>
          </View>

          <View style={[styles.headerPill, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Megaphone size={16} color={theme.colors.primary} />
            <Text style={[styles.headerPillText, { color: theme.colors.primary }]}>
              {filteredAnnouncements.length}
            </Text>
          </View>
        </View>

        {/* ── Search Input ── */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by keyword, instructor, or subject..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Course Scope Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
        >
          <TouchableOpacity
            style={[
              styles.chipButton,
              selectedCourseId === 'all'
                ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
            onPress={() => setSelectedCourseId('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selectedCourseId === 'all' ? '#FFFFFF' : theme.colors.textSecondary,
                  fontWeight: selectedCourseId === 'all' ? '700' : '500',
                },
              ]}
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
                  isSelected
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setSelectedCourseId(course.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {course.code || course.title} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Announcements Content List ── */}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredAnnouncements.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Megaphone size={44} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {searchQuery.trim().length > 0
                ? 'No Matching Announcements'
                : selectedCourseId !== 'all'
                ? 'No Announcements for This Course'
                : courses.length === 0
                ? 'No Course Enrollments'
                : 'No Announcements Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
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
                },
              ]}
            >
              {/* Card Header: Author info, Course Code badge, Date */}
              <View style={styles.cardHeader}>
                <View style={styles.authorGroup}>
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: `${theme.colors.primary}20` },
                    ]}
                  >
                    <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                      {(item.authorName || 'I').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.authorMeta}>
                    <Text style={[styles.authorName, { color: theme.colors.text }]}>
                      {item.authorName || 'Course Instructor'}
                    </Text>
                    <View style={styles.timestampRow}>
                      <Clock size={11} color={theme.colors.textSecondary} />
                      <Text style={[styles.timestampText, { color: theme.colors.textSecondary }]}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.courseCode && (
                  <View
                    style={[
                      styles.courseCodeBadge,
                      { backgroundColor: `${theme.colors.primary}15` },
                    ]}
                  >
                    <Text style={[styles.courseCodeBadgeText, { color: theme.colors.primary }]}>
                      {item.courseCode}
                    </Text>
                  </View>
                )}
              </View>

              {/* Title & Body */}
              <View style={styles.contentBody}>
                {item.title && item.title !== item.content && (
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                    {item.title}
                  </Text>
                )}
                <Text
                  style={[styles.cardContentText, { color: theme.colors.text }]}
                  selectable
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
                      backgroundColor: `${theme.colors.background}80`,
                      borderTopColor: theme.colors.border,
                    },
                  ]}
                >
                  <BookOpen size={13} color={theme.colors.textSecondary} />
                  <Text
                    style={[styles.footerCourseText, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.courseName}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    borderBottomWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
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
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chipButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  announcementCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timestampText: {
    fontSize: 11,
    fontWeight: '500',
  },
  courseCodeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  courseCodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
  },
  cardContentText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  footerCourseText: {
    fontSize: 11.5,
    fontWeight: '500',
    flex: 1,
  },
});
