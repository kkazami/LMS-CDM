import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Users,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  Send,
  PlusCircle,
  GraduationCap,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { ScreenWrapper } from '../../../../src/components/common/ScreenWrapper';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import type { Course } from '@lms/types';

export default function TeacherDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, bottomClearance } = useResponsive();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.courses.list(instituteCode);
      if (response?.courses) {
        setCourses(response.courses);
      }
    } catch {
      // Graceful fallback
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

  // Estimate total students
  const totalStudents = courses.reduce((acc, c) => acc + (c.studentCount ?? c.enrolledCount ?? 0), 0);

  return (
    <ScreenWrapper withTopInset={true}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: s(14),
            paddingBottom: bottomClearance,
          },
        ]}
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
        {/* Top Header Card */}
        <View
          style={[
            styles.topHeader,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              padding: s(13),
              borderRadius: s(14),
              marginBottom: s(12),
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text
              style={[styles.welcomeLabel, { color: theme.colors.textSecondary, fontSize: font(10.5) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              FACULTY PORTAL &bull; {user?.role || 'PROFESSOR'}
            </Text>
            <Text
              style={[styles.teacherName, { color: theme.colors.text, fontSize: font(18) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Prof. {user?.name || 'Instructor'}
            </Text>
            <View style={styles.badgeRow}>
              <Badge label={user?.institute?.name || theme.name} variant="primary" size="sm" />
            </View>
          </View>
          <View
            style={[
              styles.avatarBox,
              {
                backgroundColor: `${theme.colors.primary}18`,
                width: s(44),
                height: s(44),
                borderRadius: s(22),
              },
            ]}
          >
            <GraduationCap size={s(24)} color={theme.colors.primary} />
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={[styles.statsGrid, { gap: s(8), marginBottom: s(14) }]}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(12),
                padding: s(8),
                minHeight: s(76),
              },
            ]}
          >
            <View
              style={[
                styles.statIconCircle,
                {
                  backgroundColor: `${theme.colors.primary}15`,
                  width: s(28),
                  height: s(28),
                  borderRadius: s(14),
                  marginBottom: s(3),
                },
              ]}
            >
              <BookOpen size={s(15)} color={theme.colors.primary} />
            </View>
            <Text
              style={[styles.statNumber, { color: theme.colors.text, fontSize: font(15) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {courses.length}
            </Text>
            <Text
              style={[styles.statTitle, { color: theme.colors.textSecondary, fontSize: font(10.5) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Assigned Classes
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(12),
                padding: s(8),
                minHeight: s(76),
              },
            ]}
          >
            <View
              style={[
                styles.statIconCircle,
                {
                  backgroundColor: `${theme.colors.info}15`,
                  width: s(28),
                  height: s(28),
                  borderRadius: s(14),
                  marginBottom: s(3),
                },
              ]}
            >
              <Users size={s(15)} color={theme.colors.info} />
            </View>
            <Text
              style={[styles.statNumber, { color: theme.colors.text, fontSize: font(15) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {totalStudents}
            </Text>
            <Text
              style={[styles.statTitle, { color: theme.colors.textSecondary, fontSize: font(10.5) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Total Students
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(12),
                padding: s(8),
                minHeight: s(76),
              },
            ]}
          >
            <View
              style={[
                styles.statIconCircle,
                {
                  backgroundColor: `${theme.colors.success}15`,
                  width: s(28),
                  height: s(28),
                  borderRadius: s(14),
                  marginBottom: s(3),
                },
              ]}
            >
              <FileCheck size={s(15)} color={theme.colors.success} />
            </View>
            <Text
              style={[styles.statNumber, { color: theme.colors.text, fontSize: font(15) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Active
            </Text>
            <Text
              style={[styles.statTitle, { color: theme.colors.textSecondary, fontSize: font(10.5) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Classwork
            </Text>
          </View>
        </View>

        {/* Quick Instructor Actions */}
        <View style={[styles.section, { marginBottom: s(14) }]}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text, fontSize: font(15), marginBottom: s(8) }]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Faculty Shortcuts
          </Text>
          <View style={[styles.shortcutRow, { gap: s(10) }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Manage Classwork"
              style={[
                styles.shortcutCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: s(12),
                  padding: s(12),
                  minHeight: s(78),
                },
              ]}
              onPress={() => router.push('/teacher/courses')}
              activeOpacity={0.8}
            >
              <PlusCircle size={s(18)} color={theme.colors.primary} />
              <Text
                style={[styles.shortcutTitle, { color: theme.colors.text, fontSize: font(13), marginTop: s(6) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Add Classwork
              </Text>
              <Text
                style={[styles.shortcutDesc, { color: theme.colors.textSecondary, fontSize: font(10.5) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                numberOfLines={1}
              >
                Create syllabus assignment
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Class Broadcast"
              style={[
                styles.shortcutCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: s(12),
                  padding: s(12),
                  minHeight: s(78),
                },
              ]}
              onPress={() => router.push('/teacher/alerts')}
              activeOpacity={0.8}
            >
              <Send size={s(18)} color={theme.colors.warning} />
              <Text
                style={[styles.shortcutTitle, { color: theme.colors.text, fontSize: font(13), marginTop: s(6) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Send Broadcast
              </Text>
              <Text
                style={[styles.shortcutDesc, { color: theme.colors.textSecondary, fontSize: font(10.5) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                numberOfLines={1}
              >
                Notify class students
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Classes List */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { marginBottom: s(8) }]}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.text, fontSize: font(15) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              My Teaching Schedule
            </Text>
            <TouchableOpacity onPress={() => router.push('/teacher/courses')}>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary, fontSize: font(12) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Manage All
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: s(16) }} />
          ) : courses.length === 0 ? (
            <Card style={[styles.emptyCard, { paddingVertical: s(28) }]}>
              <BookOpen size={s(36)} color={theme.colors.textSecondary} />
              <Text
                style={[styles.emptyTitle, { color: theme.colors.text, fontSize: font(14) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                No Teaching Classes Assigned
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontSize: font(11.5) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Contact your institute dean or department chair to assign courses.
              </Text>
            </Card>
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.classItemCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: s(13),
                    padding: s(12),
                    marginBottom: s(10),
                  },
                ]}
                onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: course.id } })}
                activeOpacity={0.8}
              >
                <View style={[styles.classCardTop, { marginBottom: s(6) }]}>
                  <Badge label={course.code || 'CODE'} variant="primary" size="sm" />
                  <View style={styles.enrolledBadge}>
                    <Users size={s(13)} color={theme.colors.textSecondary} />
                    <Text
                      style={[styles.enrolledCountText, { color: theme.colors.textSecondary, fontSize: font(11.5) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {course.studentCount ?? course.enrolledCount ?? 0} Students
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.classTitle, { color: theme.colors.text, fontSize: font(14.5), marginBottom: s(8) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={2}
                >
                  {course.title}
                </Text>

                <View style={[styles.classFooter, { borderTopColor: theme.colors.border, paddingTop: s(8) }]}>
                  <Text
                    style={[styles.semesterText, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {course.section || 'Class Section'}
                  </Text>
                  <View style={styles.hubLink}>
                    <Text
                      style={[styles.hubLinkText, { color: theme.colors.primary, fontSize: font(11.5) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Manage Roster & Grades
                    </Text>
                    <ChevronRight size={s(14)} color={theme.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 6,
  },
  topHeader: {
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  welcomeLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  teacherName: {
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  avatarBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '800',
  },
  statTitle: {
    marginTop: 1,
    textAlign: 'center',
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  seeAllText: {
    fontWeight: '600',
  },
  shortcutRow: {
    flexDirection: 'row',
  },
  shortcutCard: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontWeight: '700',
  },
  shortcutDesc: {
    marginTop: 1,
  },
  classItemCard: {
    borderWidth: 1,
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enrolledCountText: {
    fontWeight: '500',
  },
  classTitle: {
    fontWeight: '700',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  semesterText: {},
  hubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hubLinkText: {
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 12,
  },
});
