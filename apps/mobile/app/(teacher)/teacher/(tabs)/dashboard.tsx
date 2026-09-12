import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
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
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { Course } from '@lms/types';

export default function TeacherDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
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
        {/* Top Header Card */}
        <View style={[styles.topHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.welcomeLabel, { color: theme.colors.textSecondary }]}>
              FACULTY PORTAL &bull; {user?.role || 'PROFESSOR'}
            </Text>
            <Text style={[styles.teacherName, { color: theme.colors.text }]}>
              Prof. {user?.name || 'Instructor'}
            </Text>
            <View style={styles.badgeRow}>
              <Badge label={user?.institute?.name || theme.name} variant="primary" size="sm" />
            </View>
          </View>
          <View style={[styles.avatarBox, { backgroundColor: `${theme.colors.primary}18` }]}>
            <GraduationCap size={32} color={theme.colors.primary} />
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.statIconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
              <BookOpen size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {courses.length}
            </Text>
            <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
              Assigned Classes
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.statIconCircle, { backgroundColor: `${theme.colors.info}15` }]}>
              <Users size={20} color={theme.colors.info} />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {totalStudents}
            </Text>
            <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
              Total Students
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.statIconCircle, { backgroundColor: `${theme.colors.success}15` }]}>
              <FileCheck size={20} color={theme.colors.success} />
            </View>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              Active
            </Text>
            <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
              Classwork
            </Text>
          </View>
        </View>

        {/* Quick Instructor Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Faculty Shortcuts
          </Text>
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Manage Classwork"
              style={[styles.shortcutCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push('/teacher/courses')}
              activeOpacity={0.8}
            >
              <PlusCircle size={22} color={theme.colors.primary} />
              <Text style={[styles.shortcutTitle, { color: theme.colors.text }]}>
                Add Classwork
              </Text>
              <Text style={[styles.shortcutDesc, { color: theme.colors.textSecondary }]}>
                Create syllabus assignment
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Class Broadcast"
              style={[styles.shortcutCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push('/teacher/alerts')}
              activeOpacity={0.8}
            >
              <Send size={22} color={theme.colors.warning} />
              <Text style={[styles.shortcutTitle, { color: theme.colors.text }]}>
                Send Broadcast
              </Text>
              <Text style={[styles.shortcutDesc, { color: theme.colors.textSecondary }]}>
                Notify class students
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Classes List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              My Teaching Schedule
            </Text>
            <TouchableOpacity onPress={() => router.push('/teacher/courses')}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                Manage All
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : courses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <BookOpen size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Teaching Classes Assigned
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Contact your institute dean or department chair to assign courses.
              </Text>
            </Card>
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[styles.classItemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: course.id } })}
                activeOpacity={0.8}
              >
                <View style={styles.classCardTop}>
                  <Badge label={course.code || 'CODE'} variant="primary" size="sm" />
                  <View style={styles.enrolledBadge}>
                    <Users size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.enrolledCountText, { color: theme.colors.textSecondary }]}>
                      {course.studentCount ?? course.enrolledCount ?? 0} Students
                    </Text>
                  </View>
                </View>

                <Text style={[styles.classTitle, { color: theme.colors.text }]}>
                  {course.title}
                </Text>

                <View style={[styles.classFooter, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.semesterText, { color: theme.colors.textSecondary }]}>
                    {course.section || 'Class Section'}
                  </Text>
                  <View style={styles.hubLink}>
                    <Text style={[styles.hubLinkText, { color: theme.colors.primary }]}>
                      Manage Roster & Grades
                    </Text>
                    <ChevronRight size={16} color={theme.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topHeader: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  welcomeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  teacherName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    minHeight: 105,
    justifyContent: 'center',
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
  },
  statTitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shortcutCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
    minHeight: 110,
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  shortcutDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  classItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enrolledCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  classTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  semesterText: {
    fontSize: 12,
  },
  hubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hubLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
});
