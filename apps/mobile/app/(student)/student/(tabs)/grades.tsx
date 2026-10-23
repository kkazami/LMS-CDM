import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import {
  GraduationCap,
  BarChart2,
  LineChart,
  ChevronDown,
  Award,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  FileText,
  X,
  Sparkles,
} from 'lucide-react-native';
import Svg, { Rect, Circle, Line as SvgLine, Path, Text as SvgText, G } from 'react-native-svg';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Screen, ErrorBanner } from '../../../../src/components/ui';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import {
  percentToGradePoint,
  isPassing,
  formatGradePoint,
  HIGHEST_GRADE_POINT,
  LOWEST_PASSING_GRADE_POINT,
  PASSING_MIN_PERCENT,
} from '../../../../src/lib/ph-scale';
import {
  filterMobileGradeData,
  getPercent,
  type PerSubjectStat,
} from '../../../../src/lib/grade-filter';
import type { Grade, GradeSummary } from '@lms/types';

type SubTab = 'dashboard' | 'analytics' | 'progress';

const SUB_TABS: { key: SubTab; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Grades', icon: GraduationCap },
  { key: 'analytics', label: 'Analytics', icon: BarChart2 },
  { key: 'progress', label: 'Progress', icon: LineChart },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

export default function StudentGradesScreen() {
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { headerPaddingTop } = useResponsive();

  const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [summaries, setSummaries] = useState<GradeSummary[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Array<{ id: string; title: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadGrades = async () => {
    setErrorMessage(null);
    try {
      // 1. Offline storage first for instant display
      const [cachedGrades, cachedSummaries, cachedEnrolled, cachedCourses] = await Promise.all([
        getCachedData<Grade[]>('student_grades'),
        getCachedData<GradeSummary[]>('student_grade_summaries'),
        getCachedData<Array<{ id: string; title: string; code: string }>>('student_enrolled_courses'),
        getCachedData<Array<{ id: string; title: string; code: string }>>('student_courses'),
      ]);
      if (cachedGrades && cachedGrades.length > 0) {
        setGrades(cachedGrades);
        setLoading(false);
      }
      if (cachedSummaries && cachedSummaries.length > 0) {
        setSummaries(cachedSummaries);
      }
      const initialCourses = (cachedEnrolled && cachedEnrolled.length > 0)
        ? cachedEnrolled
        : (cachedCourses && cachedCourses.length > 0)
        ? cachedCourses
        : [];
      if (initialCourses.length > 0) {
        setEnrolledCourses(initialCourses);
      }

      // 2. Fetch fresh real data from backend (grades and courses in parallel)
      const instituteCode = user?.institute?.code || 'ics';
      const [gradesRes, coursesRes] = await Promise.allSettled([
        api.grades.list(instituteCode),
        api.courses.list(instituteCode),
      ]);

      let coursesFromApi: Array<{ id: string; title: string; code: string }> = [];

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        coursesFromApi = coursesRes.value.courses.map((c) => ({
          id: c.id,
          title: c.title,
          code: c.code,
        }));
      }

      if (gradesRes.status === 'fulfilled') {
        const response = gradesRes.value as any;
        if (response?.grades) {
          setGrades(response.grades);
          await setCachedData('student_grades', response.grades);
        }
        if (response?.summary) {
          setSummaries(response.summary);
          await setCachedData('student_grade_summaries', response.summary);
        }
        if (response?.enrolledCourses && Array.isArray(response.enrolledCourses) && response.enrolledCourses.length > 0) {
          coursesFromApi = response.enrolledCourses;
        }
      }

      // 3. Fallback: derive enrolled courses from summaries/grades if courses list was empty
      if (coursesFromApi.length === 0) {
        const derivedMap = new Map<string, { id: string; title: string; code: string }>();
        if (gradesRes.status === 'fulfilled' && (gradesRes.value as any)?.summary) {
          for (const s of (gradesRes.value as any).summary) {
            if (s.courseId && !derivedMap.has(s.courseId)) {
              derivedMap.set(s.courseId, {
                id: s.courseId,
                title: s.courseName || s.courseCode || 'Course',
                code: s.courseCode || 'CRS',
              });
            }
          }
        }
        if (gradesRes.status === 'fulfilled' && (gradesRes.value as any)?.grades) {
          for (const g of (gradesRes.value as any).grades) {
            if (g.courseId && !derivedMap.has(g.courseId)) {
              derivedMap.set(g.courseId, {
                id: g.courseId,
                title: g.courseName || g.courseCode || 'Course',
                code: g.courseCode || 'CRS',
              });
            }
          }
        }
        coursesFromApi = Array.from(derivedMap.values());
      }

      if (coursesFromApi.length > 0) {
        setEnrolledCourses(coursesFromApi);
        await setCachedData('student_enrolled_courses', coursesFromApi);
        await setCachedData('student_courses', coursesFromApi);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load grades. Displaying cached data if available.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGrades();
  };

  // Pure filtering transformation shared across all sub-tabs (Task 3)
  const {
    isAllSubjects,
    selectedCourse,
    filteredGrades,
    perSubjectStats,
    gwa,
    gwaRemark,
    isGwaPassing,
    overallPercent,
    hasGradedWork,
    milestones,
  } = useMemo(
    () => filterMobileGradeData(grades, summaries, enrolledCourses, selectedCourseId),
    [grades, summaries, enrolledCourses, selectedCourseId]
  );

  // Selected subject label for dropdown
  const selectedCourseLabel = useMemo(() => {
    if (isAllSubjects || !selectedCourse) return 'All subjects';
    return `${selectedCourse.code} — ${selectedCourse.title}`;
  }, [isAllSubjects, selectedCourse]);

  // Derived progress scale caption (Task 2)
  const progressScaleCaption = `${HIGHEST_GRADE_POINT.toFixed(2)} is the highest · ${LOWEST_PASSING_GRADE_POINT.toFixed(2)} (${PASSING_MIN_PERCENT}%) is the lowest passing grade · below ${PASSING_MIN_PERCENT}% is failing`;

  const screenWidth = Dimensions.get('window').width;

  return (
    <Screen scrollable={false}>
      {/* ── Screen Header ── */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
            paddingTop: headerPaddingTop,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Grades</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          View and track your academic performance across all your classes
        </Text>

        {/* ── Sub-view Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabsContainer}
        >
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.subTabButton,
                  isActive && {
                    borderBottomColor: theme.colors.primary,
                    borderBottomWidth: 2.5,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Icon
                  size={16}
                  color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                  style={styles.subTabIcon}
                />
                <Text
                  style={[
                    styles.subTabText,
                    {
                      color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content Area ── */}
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
        {errorMessage && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <ErrorBanner
              message={errorMessage}
              onRetry={loadGrades}
              onDismiss={() => setErrorMessage(null)}
            />
          </View>
        )}

        {/* ── Shared "Subject" Selector (Task 3: Shared across all 3 sub-tabs) ── */}
        {enrolledCourses.length > 0 && (
          <TouchableOpacity
            style={[
              styles.sharedSubjectDropdown,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setIsCoursePickerOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Subject filter, currently ${selectedCourseLabel}`}
          >
            <View style={styles.sharedSubjectLeft}>
              <View
                style={[
                  styles.subjectIconBox,
                  { backgroundColor: `${theme.colors.primary}18` },
                ]}
              >
                <BookOpen size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.subjectTextGroup}>
                <Text style={[styles.subjectMiniLabel, { color: theme.colors.textSecondary }]}>
                  SUBJECT
                </Text>
                <Text
                  style={[styles.subjectDropdownTitle, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {selectedCourseLabel}
                </Text>
              </View>
            </View>
            <ChevronDown size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════
                SUB-VIEW 1: STUDENT GRADES DASHBOARD
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
              <View style={styles.viewContainer}>
                {/* Summary Pill for currently selected subject / all subjects */}
                {filteredGrades.length > 0 && (
                  <View
                    style={[
                      styles.summaryPillRow,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.summaryPillCol}>
                      <Text style={[styles.summaryPillLabel, { color: theme.colors.textSecondary }]}>
                        GRADED ITEMS
                      </Text>
                      <Text style={[styles.summaryPillValue, { color: theme.colors.text }]}>
                        {filteredGrades.length}
                      </Text>
                    </View>

                    <View
                      style={[styles.summaryPillDivider, { backgroundColor: theme.colors.border }]}
                    />

                    <View style={styles.summaryPillCol}>
                      <Text style={[styles.summaryPillLabel, { color: theme.colors.textSecondary }]}>
                        AVERAGE SCORE
                      </Text>
                      <Text style={[styles.summaryPillValue, { color: theme.colors.primary }]}>
                        {overallPercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                )}

                {/* Table Header Row */}
                <View style={[styles.tableColumnHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.columnHeaderText, { color: theme.colors.textSecondary, flex: 2 }]}>
                    ASSIGNMENT / QUIZ
                  </Text>
                  <Text
                    style={[
                      styles.columnHeaderText,
                      { color: theme.colors.textSecondary, flex: 1, textAlign: 'right' },
                    ]}
                  >
                    SCORE / %
                  </Text>
                </View>

                {/* Graded Items List or Clear Empty State */}
                {!hasGradedWork ? (
                  <Card style={styles.emptyCard}>
                    <ClipboardList size={44} color={theme.colors.primary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      {isAllSubjects
                        ? 'No Graded Items Found'
                        : `No Graded Work for ${selectedCourse?.code || 'Subject'}`}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      {isAllSubjects
                        ? 'Grades will appear here once your instructors record evaluations for your classwork.'
                        : `No graded submissions have been recorded yet for ${selectedCourse?.title || 'this class'}.`}
                    </Text>
                  </Card>
                ) : (
                  filteredGrades.map((grade) => {
                    const pct = getPercent(grade);
                    const passing = isPassing(percentToGradePoint(pct));
                    const isAssignment =
                      (grade.itemType || '').toUpperCase() === 'ASSIGNMENT' ||
                      !/quiz/i.test(grade.assignmentTitle);

                    return (
                      <View
                        key={grade.id}
                        style={[
                          styles.gradeRowCard,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        {/* Left Icon + Title & Type */}
                        <View style={styles.gradeRowMain}>
                          <View
                            style={[
                              styles.gradeIconBox,
                              { backgroundColor: `${theme.colors.primary}18` },
                            ]}
                          >
                            <FileText size={18} color={theme.colors.primary} />
                          </View>

                          <View style={styles.gradeRowInfo}>
                            <Text
                              style={[styles.gradeRowTitle, { color: theme.colors.text }]}
                              numberOfLines={1}
                            >
                              {grade.assignmentTitle}
                            </Text>

                            <View style={styles.gradeMetaRow}>
                              <View
                                style={[
                                  styles.typeBadge,
                                  { backgroundColor: `${theme.colors.primary}12` },
                                ]}
                              >
                                <Text
                                  style={[styles.typeBadgeText, { color: theme.colors.primary }]}
                                >
                                  {isAssignment ? 'Assignment' : 'Quiz'}
                                </Text>
                              </View>
                              <Text
                                style={[styles.courseMetaText, { color: theme.colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {grade.courseCode} · {grade.courseName}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Right Score & Percentage Pill */}
                        <View style={styles.gradeRowScores}>
                          <View style={styles.scoreNumberCol}>
                            <Text style={[styles.scoreValueText, { color: theme.colors.text }]}>
                              {grade.value}{' '}
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                                / {grade.maxValue}
                              </Text>
                            </Text>
                            <Text style={[styles.gradedDateText, { color: theme.colors.textSecondary }]}>
                              {formatDate(grade.gradedAt)}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.pctPill,
                              {
                                backgroundColor: passing
                                  ? `${theme.colors.primary}20`
                                  : theme.colors.dangerBg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pctPillText,
                                {
                                  color: passing ? theme.colors.primary : theme.colors.danger,
                                },
                              ]}
                            >
                              {pct}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUB-VIEW 2: VISUAL GRADE ANALYTICS (SVG CHARTS)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <View style={styles.viewContainer}>
                {!hasGradedWork ? (
                  <Card style={styles.emptyCard}>
                    <BarChart2 size={44} color={theme.colors.primary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      {isAllSubjects
                        ? 'Insufficient Data for Analytics'
                        : `No Chart Data for ${selectedCourse?.code || 'Subject'}`}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      {isAllSubjects
                        ? 'Visual analytics will automatically generate once multiple graded evaluations are recorded.'
                        : `Charts will appear once you have graded submissions recorded in ${selectedCourse?.title || 'this class'}.`}
                    </Text>
                  </Card>
                ) : (
                  <>
                    {/* SVG Chart 1: Average Grade by Course (Filtered) */}
                    <View
                      style={[
                        styles.chartCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.chartHeader}>
                        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                          {isAllSubjects ? 'Average Grade by Course' : 'Subject Average Grade'}
                        </Text>
                        <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                          {isAllSubjects
                            ? 'Course percentage averages across your enrolled subjects'
                            : `Performance score for ${selectedCourse?.title || 'selected subject'}`}
                        </Text>
                      </View>

                      {/* SVG Bar Chart */}
                      <View style={styles.svgContainer}>
                        {(() => {
                          const chartWidth = Math.max(screenWidth - 64, 300);
                          const chartHeight = 180;
                          const dataToRender = perSubjectStats;

                          const barWidth = Math.min(
                            44,
                            (chartWidth - 50) / Math.max(dataToRender.length, 1) - 16
                          );
                          const spacing = (chartWidth - 40) / Math.max(dataToRender.length, 1);

                          return (
                            <Svg width={chartWidth} height={chartHeight}>
                              {/* 100% Top Grid Line */}
                              <SvgLine
                                x1="36"
                                y1="20"
                                x2={chartWidth - 10}
                                y2="20"
                                stroke={theme.colors.chartGrid}
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              <SvgText
                                x="8"
                                y="24"
                                fill={theme.colors.chartLabel}
                                fontSize="9"
                                fontWeight="600"
                              >
                                100%
                              </SvgText>

                              {/* Passing Benchmark Line derived from scale */}
                              <SvgLine
                                x1="36"
                                y1={150 - (PASSING_MIN_PERCENT / 100) * 130}
                                x2={chartWidth - 10}
                                y2={150 - (PASSING_MIN_PERCENT / 100) * 130}
                                stroke={theme.colors.primary}
                                strokeDasharray="4 4"
                                strokeWidth="1.2"
                              />
                              <SvgText
                                x="12"
                                y={150 - (PASSING_MIN_PERCENT / 100) * 130 + 4}
                                fill={theme.colors.primary}
                                fontSize="9"
                                fontWeight="700"
                              >
                                {`${PASSING_MIN_PERCENT}%`}
                              </SvgText>

                              {/* 50% Grid Line */}
                              <SvgLine
                                x1="36"
                                y1="85"
                                x2={chartWidth - 10}
                                y2="85"
                                stroke={theme.colors.chartGrid}
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              <SvgText
                                x="12"
                                y="89"
                                fill={theme.colors.chartLabel}
                                fontSize="9"
                                fontWeight="600"
                              >
                                50%
                              </SvgText>

                              {/* 0% Baseline */}
                              <SvgLine
                                x1="36"
                                y1="150"
                                x2={chartWidth - 10}
                                y2="150"
                                stroke={theme.colors.chartAxis}
                                strokeWidth="1.5"
                              />

                              {/* Bars */}
                              {dataToRender.map((item, idx) => {
                                const clampedPct = Math.min(Math.max(item.avgPercent, 0), 100);
                                const barHeight = (clampedPct / 100) * 130;
                                const x = 44 + idx * spacing + (spacing - barWidth) / 2;
                                const y = 150 - barHeight;

                                return (
                                  <G key={idx}>
                                    <Rect
                                      x={x}
                                      y={y}
                                      width={barWidth}
                                      height={Math.max(barHeight, 3)}
                                      rx={4}
                                      fill={
                                        isPassing(item.gradePoint)
                                          ? theme.colors.primary
                                          : theme.colors.danger
                                      }
                                    />
                                    {/* Percentage text above bar */}
                                    <SvgText
                                      x={x + barWidth / 2}
                                      y={Math.max(y - 5, 12)}
                                      fill={theme.colors.text}
                                      fontSize="9"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {item.avgPercent}%
                                    </SvgText>
                                    {/* Course Code below bar */}
                                    <SvgText
                                      x={x + barWidth / 2}
                                      y="166"
                                      fill={theme.colors.chartLabel}
                                      fontSize="9"
                                      fontWeight="600"
                                      textAnchor="middle"
                                    >
                                      {item.courseCode.slice(0, 8)}
                                    </SvgText>
                                  </G>
                                );
                              })}
                            </Svg>
                          );
                        })()}
                      </View>
                    </View>

                    {/* SVG Chart 2: Grade Performance Trend Line */}
                    <View
                      style={[
                        styles.chartCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.chartHeader}>
                        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                          Submission Score Trend
                        </Text>
                        <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                          Chronological score trajectory across completed assessments
                        </Text>
                      </View>

                      {/* SVG Line Chart */}
                      <View style={styles.svgContainer}>
                        {(() => {
                          const chartWidth = Math.max(screenWidth - 64, 300);
                          const chartHeight = 160;
                          const chronologicalGrades = [...filteredGrades].reverse();

                          if (chronologicalGrades.length < 2) {
                            return (
                              <View style={styles.minChartNotice}>
                                <Text style={[styles.minNoticeText, { color: theme.colors.textSecondary }]}>
                                  Complete at least 2 evaluations in this scope to visualize your performance trendline.
                                </Text>
                              </View>
                            );
                          }

                          const stepX = (chartWidth - 50) / Math.max(chronologicalGrades.length - 1, 1);
                          const points = chronologicalGrades.map((g, i) => {
                            const pct = getPercent(g);
                            const clampedPct = Math.min(Math.max(pct, 0), 100);
                            const x = 36 + i * stepX;
                            const y = 140 - (clampedPct / 100) * 110;
                            return { x, y, pct, title: g.assignmentTitle };
                          });

                          const pathD = points.reduce(
                            (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                            ''
                          );

                          return (
                            <Svg width={chartWidth} height={chartHeight}>
                              {/* Baseline passing reference derived from scale */}
                              <SvgLine
                                x1="36"
                                y1={140 - (PASSING_MIN_PERCENT / 100) * 110}
                                x2={chartWidth - 10}
                                y2={140 - (PASSING_MIN_PERCENT / 100) * 110}
                                stroke={theme.colors.border}
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />

                              {/* Trend path */}
                              <Path
                                d={pathD}
                                fill="none"
                                stroke={theme.colors.primary}
                                strokeWidth="2.5"
                              />

                              {/* Points & Labels */}
                              {points.map((pt, i) => (
                                <G key={i}>
                                  <Circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={4.5}
                                    fill={theme.colors.card}
                                    stroke={theme.colors.primary}
                                    strokeWidth="2.5"
                                  />
                                  <SvgText
                                    x={pt.x}
                                    y={pt.y - 8}
                                    fill={theme.colors.text}
                                    fontSize="8.5"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {pt.pct}%
                                  </SvgText>
                                </G>
                              ))}
                            </Svg>
                          );
                        })()}
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SUB-VIEW 3: ACADEMIC PROGRESS TRACKING
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'progress' && (
              <View style={styles.viewContainer}>
                {/* GWA Radial Gauge Card (Task 2: Accessibility label, derived scale caption) */}
                <View
                  accessibilityRole="summary"
                  accessibilityLabel="Cumulative GWA (General Weighted Average)"
                  style={[
                    styles.gwaRadialCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {/* SVG Circular Ring (driven by percentage) */}
                  <View style={styles.radialWrapper}>
                    {(() => {
                      const size = 130;
                      const strokeWidth = 10;
                      const radius = (size - strokeWidth) / 2;
                      const circumference = 2 * Math.PI * radius;
                      const percentRatio = hasGradedWork
                        ? Math.max(0, Math.min(100, overallPercent)) / 100
                        : 0;
                      const dashOffset = circumference * (1 - percentRatio);
                      const ringColor = !hasGradedWork
                        ? theme.colors.border
                        : isGwaPassing
                        ? theme.colors.primary
                        : theme.colors.danger;

                      return (
                        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                            <Circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              stroke={theme.colors.border}
                              strokeWidth={strokeWidth}
                              fill="none"
                            />
                            {hasGradedWork && (
                              <Circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke={ringColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                fill="none"
                              />
                            )}
                          </Svg>
                          <View style={styles.radialInsideText}>
                            <Text
                              style={[
                                styles.radialGwaNumber,
                                { color: hasGradedWork ? ringColor : theme.colors.textSecondary },
                              ]}
                            >
                              {hasGradedWork ? formatGradePoint(gwa) : '—'}
                            </Text>
                            <Text style={[styles.radialGwaSub, { color: theme.colors.textSecondary }]}>
                              {hasGradedWork ? (isGwaPassing ? 'Passed' : 'Failed') : 'No Grades'}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.gwaTextGroup}>
                    {/* Note: Visible "Cumulative GWA ..." heading removed per Task 2 */}
                    <View style={styles.gwaRemarkRow}>
                      <Text style={[styles.gwaRemarkText, { color: theme.colors.text }]}>
                        {hasGradedWork
                          ? `${formatGradePoint(gwa)}`
                          : 'No Grades Yet'}
                      </Text>
                      {hasGradedWork && gwaRemark ? (
                        <View
                          style={[
                            styles.standingPill,
                            {
                              backgroundColor: isGwaPassing
                                ? `${theme.colors.primary}20`
                                : theme.colors.dangerBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.standingPillText,
                              {
                                color: isGwaPassing ? theme.colors.primary : theme.colors.danger,
                              },
                            ]}
                          >
                            {gwaRemark.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Derived scale caption (Task 2) */}
                    <Text style={[styles.gwaScaleCaption, { color: theme.colors.primary }]}>
                      {progressScaleCaption}
                    </Text>

                    <Text style={[styles.gwaDesc, { color: theme.colors.textSecondary }]}>
                      {hasGradedWork
                        ? `Average of ${overallPercent}% across ${filteredGrades.length} recorded evaluation${
                            filteredGrades.length === 1 ? '' : 's'
                          }.`
                        : 'Cumulative GWA and academic standing will be computed once evaluations are recorded.'}
                    </Text>
                  </View>
                </View>

                {/* Per-Subject Progress List (Task 3: Tap a row to select that subject) */}
                <View style={styles.progressSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Subject Progress & Completion
                  </Text>
                  {isAllSubjects && perSubjectStats.length > 0 && (
                    <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
                      Tap any subject to filter by that class
                    </Text>
                  )}
                </View>

                {perSubjectStats.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Award size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Subject Progress Recorded
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Subject progress tracks points earned across completed semester assignments.
                    </Text>
                  </Card>
                ) : (
                  perSubjectStats.map((s) => {
                    const coursePassed = s.remark === 'Passed';
                    const hasItems = s.itemCount > 0;

                    return (
                      <TouchableOpacity
                        key={s.courseId}
                        onPress={() => {
                          if (isAllSubjects) {
                            setSelectedCourseId(s.courseId);
                          }
                        }}
                        activeOpacity={isAllSubjects ? 0.7 : 1}
                        style={[
                          styles.subjectProgressCard,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <View style={styles.subjectTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.subjectCode, { color: theme.colors.text }]}>
                              {s.courseCode}
                            </Text>
                            <Text
                              style={[styles.subjectTitle, { color: theme.colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {s.courseTitle}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.subjectBadge,
                              {
                                backgroundColor: !hasItems
                                  ? `${theme.colors.textSecondary}20`
                                  : coursePassed
                                  ? `${theme.colors.primary}18`
                                  : theme.colors.dangerBg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.subjectBadgeText,
                                {
                                  color: !hasItems
                                    ? theme.colors.textSecondary
                                    : coursePassed
                                    ? theme.colors.primary
                                    : theme.colors.danger,
                                },
                              ]}
                            >
                              {!hasItems
                                ? 'NO WORK YET'
                                : coursePassed
                                ? 'PASSED'
                                : 'FAILED'}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBarTrack,
                              { backgroundColor: theme.colors.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(s.avgPercent, 100)}%`,
                                  backgroundColor: !hasItems
                                    ? 'transparent'
                                    : coursePassed
                                    ? theme.colors.primary
                                    : theme.colors.danger,
                                },
                              ]}
                            />
                          </View>
                        </View>

                        <View style={styles.subjectPointsRow}>
                          <Text style={[styles.subjectPointsText, { color: theme.colors.textSecondary }]}>
                            {s.earnedPoints} / {s.totalPoints} points earned ({s.itemCount} item
                            {s.itemCount === 1 ? '' : 's'})
                          </Text>
                          <Text
                            style={[
                              styles.subjectPctText,
                              { color: hasItems ? theme.colors.text : theme.colors.textSecondary },
                            ]}
                          >
                            {hasItems ? `${formatGradePoint(s.gradePoint)} · ${s.avgPercent}%` : `${s.avgPercent}%`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}

                {/* ── Recent Milestones (Task 4: Respects Subject Filter) ── */}
                {milestones.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <View style={styles.progressSectionHeader}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Recent Milestones
                      </Text>
                      <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
                        Latest {milestones.length} graded item{milestones.length === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.milestonesCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      {milestones.map((item, idx) => {
                        const pct = getPercent(item);
                        const passing = isPassing(percentToGradePoint(pct));
                        const isLast = idx === milestones.length - 1;

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.milestoneRow,
                              !isLast && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
                            ]}
                          >
                            <View style={styles.milestoneLeft}>
                              <View
                                style={[
                                  styles.milestoneIconBox,
                                  { backgroundColor: `${theme.colors.primary}18` },
                                ]}
                              >
                                <Sparkles size={14} color={theme.colors.primary} />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  style={[styles.milestoneTitle, { color: theme.colors.text }]}
                                  numberOfLines={1}
                                >
                                  {item.assignmentTitle}
                                </Text>
                                <Text
                                  style={[styles.milestoneMeta, { color: theme.colors.textSecondary }]}
                                  numberOfLines={1}
                                >
                                  {item.courseCode} · {formatDate(item.gradedAt)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.milestoneRight}>
                              <Text
                                style={[
                                  styles.milestoneScorePct,
                                  { color: passing ? theme.colors.primary : theme.colors.danger },
                                ]}
                              >
                                {pct}%
                              </Text>
                              <Text style={[styles.milestoneScorePts, { color: theme.colors.textSecondary }]}>
                                {item.value}/{item.maxValue}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Shared Course Scope Picker Modal ── */}
      <Modal
        visible={isCoursePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCoursePickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Subject
              </Text>
              <TouchableOpacity
                onPress={() => setIsCoursePickerOpen(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close subject picker"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {/* "All subjects" Option */}
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: theme.colors.border },
                  selectedCourseId === 'all' && {
                    backgroundColor: `${theme.colors.primary}12`,
                  },
                ]}
                onPress={() => {
                  setSelectedCourseId('all');
                  setIsCoursePickerOpen(false);
                }}
              >
                <View style={styles.modalItemTextCol}>
                  <Text
                    style={[
                      styles.modalItemTitle,
                      {
                        color:
                          selectedCourseId === 'all'
                            ? theme.colors.primary
                            : theme.colors.text,
                        fontWeight: selectedCourseId === 'all' ? '700' : '500',
                      },
                    ]}
                  >
                    All subjects
                  </Text>
                  <Text style={[styles.modalItemDesc, { color: theme.colors.textSecondary }]}>
                    Combined overview across all your enrolled classes
                  </Text>
                </View>
                {selectedCourseId === 'all' && (
                  <CheckCircle2 size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              {/* Each Enrolled Course */}
              {enrolledCourses.map((course) => {
                const isSelected = selectedCourseId === course.id;
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: theme.colors.border },
                      isSelected && {
                        backgroundColor: `${theme.colors.primary}12`,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCourseId(course.id);
                      setIsCoursePickerOpen(false);
                    }}
                  >
                    <View style={styles.modalItemTextCol}>
                      <Text
                        style={[
                          styles.modalItemTitle,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {course.code}
                      </Text>
                      <Text
                        style={[styles.modalItemDesc, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {course.title}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle2 size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  subTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    marginRight: 6,
  },
  subTabIcon: {
    marginRight: 6,
  },
  subTabText: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewContainer: {
    gap: 16,
    marginTop: 14,
  },
  sharedSubjectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  sharedSubjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  subjectIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectTextGroup: {
    flex: 1,
  },
  subjectMiniLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  subjectDropdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  summaryPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryPillCol: {
    alignItems: 'center',
  },
  summaryPillLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryPillValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryPillDivider: {
    width: 1,
    height: 24,
  },
  tableColumnHeader: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  columnHeaderText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gradeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  gradeRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  gradeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  gradeRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  gradeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  courseMetaText: {
    fontSize: 11,
    flex: 1,
  },
  gradeRowScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreNumberCol: {
    alignItems: 'flex-end',
  },
  scoreValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gradedDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  pctPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  pctPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  chartHeader: {
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  minChartNotice: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  minNoticeText: {
    fontSize: 12,
    textAlign: 'center',
  },
  gwaRadialCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  radialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialInsideText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialGwaNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  radialGwaSub: {
    fontSize: 9,
    fontWeight: '600',
  },
  gwaTextGroup: {
    flex: 1,
    gap: 4,
  },
  gwaRemarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  gwaRemarkText: {
    fontSize: 22,
    fontWeight: '900',
  },
  gwaScaleCaption: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  standingPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  standingPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  gwaDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  progressSectionHeader: {
    marginTop: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 11,
    marginTop: 2,
  },
  subjectProgressCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  subjectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  subjectCode: {
    fontSize: 14,
    fontWeight: '700',
  },
  subjectTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  progressBarContainer: {
    marginTop: 2,
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectPointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectPointsText: {
    fontSize: 11,
  },
  subjectPctText: {
    fontSize: 12,
    fontWeight: '700',
  },
  milestonesCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 8,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  milestoneIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  milestoneMeta: {
    fontSize: 10.5,
    marginTop: 2,
  },
  milestoneRight: {
    alignItems: 'flex-end',
  },
  milestoneScorePct: {
    fontSize: 13,
    fontWeight: '800',
  },
  milestoneScorePts: {
    fontSize: 10,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    paddingHorizontal: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalItemTextCol: {
    flex: 1,
    marginRight: 10,
  },
  modalItemTitle: {
    fontSize: 14,
  },
  modalItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
