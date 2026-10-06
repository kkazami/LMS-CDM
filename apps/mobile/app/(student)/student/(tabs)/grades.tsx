import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
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
  AlertCircle,
  FileText,
  X,
  TrendingUp,
} from 'lucide-react-native';
import Svg, { Rect, Circle, Line as SvgLine, Path, Text as SvgText, G } from 'react-native-svg';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { Grade, GradeSummary } from '@lms/types';

type SubTab = 'dashboard' | 'analytics' | 'progress';

const SUB_TABS: { key: SubTab; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Student Grades Dashboard', icon: GraduationCap },
  { key: 'analytics', label: 'Visual Grade Analytics', icon: BarChart2 },
  { key: 'progress', label: 'Academic Progress Tracking', icon: LineChart },
];

function getPercent(grade: Grade): number {
  if (!grade.maxValue || grade.maxValue <= 0) return Math.round(grade.value);
  return Math.round((grade.value / grade.maxValue) * 100 * 10) / 10;
}

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

function getLetterGrade(pct: number): string {
  if (pct >= 95) return 'A+';
  if (pct >= 90) return 'A';
  if (pct >= 85) return 'B+';
  if (pct >= 80) return 'B';
  if (pct >= 75) return 'C+';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

function getGpaValue(pct: number): number {
  if (pct >= 95) return 4.0;
  if (pct >= 90) return 3.75;
  if (pct >= 85) return 3.5;
  if (pct >= 80) return 3.0;
  if (pct >= 75) return 2.5;
  if (pct >= 70) return 2.0;
  if (pct >= 60) return 1.5;
  return 0.0;
}

export default function StudentGradesScreen() {
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [summaries, setSummaries] = useState<GradeSummary[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Array<{ id: string; title: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGrades = async () => {
    try {
      // 1. Offline storage first for instant display
      const [cachedGrades, cachedSummaries, cachedCourses] = await Promise.all([
        getCachedData<Grade[]>('student_grades'),
        getCachedData<GradeSummary[]>('student_grade_summaries'),
        getCachedData<Array<{ id: string; title: string; code: string }>>('student_enrolled_courses'),
      ]);
      if (cachedGrades && cachedGrades.length > 0) {
        setGrades(cachedGrades);
        setLoading(false);
      }
      if (cachedSummaries && cachedSummaries.length > 0) {
        setSummaries(cachedSummaries);
      }
      if (cachedCourses && cachedCourses.length > 0) {
        setEnrolledCourses(cachedCourses);
      }

      // 2. Fetch fresh real data from backend
      const instituteCode = user?.institute?.code || 'ics';
      const response = (await api.grades.list(instituteCode)) as any;

      if (response?.grades) {
        setGrades(response.grades);
        await setCachedData('student_grades', response.grades);
      }
      if (response?.summary) {
        setSummaries(response.summary);
        await setCachedData('student_grade_summaries', response.summary);
      }
      if (response?.enrolledCourses) {
        setEnrolledCourses(response.enrolledCourses);
        await setCachedData('student_enrolled_courses', response.enrolledCourses);
      }
    } catch {
      // Graceful fallback to cached state
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

  // Filter grades based on selected course scope
  const filteredGrades = useMemo(() => {
    if (selectedCourseId === 'all') return grades;
    return grades.filter((g) => g.courseId === selectedCourseId);
  }, [grades, selectedCourseId]);

  // Selected course label for dropdown
  const selectedCourseLabel = useMemo(() => {
    if (selectedCourseId === 'all') return 'All Classes';
    const course = enrolledCourses.find((c) => c.id === selectedCourseId);
    return course ? `${course.code} — ${course.title}` : 'All Classes';
  }, [selectedCourseId, enrolledCourses]);

  // Overall average percentage
  const avgPercent = useMemo(() => {
    if (filteredGrades.length === 0) return 0;
    const sum = filteredGrades.reduce((acc, g) => acc + getPercent(g), 0);
    return Math.round((sum / filteredGrades.length) * 10) / 10;
  }, [filteredGrades]);

  const overallAvgAll = useMemo(() => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + getPercent(g), 0);
    return Math.round((sum / grades.length) * 10) / 10;
  }, [grades]);

  const hasEvaluations = grades.length > 0;

  const cumulativeGpa = useMemo(() => {
    if (!hasEvaluations) return null;
    return getGpaValue(overallAvgAll).toFixed(2);
  }, [hasEvaluations, overallAvgAll]);

  const cumulativeLetter = useMemo(() => {
    if (!hasEvaluations) return null;
    return getLetterGrade(overallAvgAll);
  }, [hasEvaluations, overallAvgAll]);

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* ── Screen Header ── */}
      <View style={[styles.topHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
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
                {/* Filter Dropdown + Summary Pill Row */}
                <View style={styles.filterRow}>
                  {/* Class Scope Dropdown Button */}
                  <TouchableOpacity
                    style={[
                      styles.courseDropdownButton,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setIsCoursePickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.courseDropdownText, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {selectedCourseLabel}
                    </Text>
                    <ChevronDown size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Items / Average Summary Pill (matching Web Header) */}
                  {filteredGrades.length > 0 && (
                    <View
                      style={[
                        styles.summaryPill,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.summaryPillCol}>
                        <Text style={[styles.summaryPillLabel, { color: theme.colors.textSecondary }]}>
                          ITEMS
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
                          AVERAGE
                        </Text>
                        <Text style={[styles.summaryPillValue, { color: theme.colors.primary }]}>
                          {avgPercent.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Table Header Row (Mobile card style matching web columns) */}
                <View style={[styles.tableColumnHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.columnHeaderText, { color: theme.colors.textSecondary, flex: 2 }]}>
                    ASSIGNMENT / QUIZ
                  </Text>
                  <Text style={[styles.columnHeaderText, { color: theme.colors.textSecondary, flex: 1, textAlign: 'right' }]}>
                    SCORE / %
                  </Text>
                </View>

                {/* Graded Items List */}
                {filteredGrades.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <ClipboardList size={44} color={theme.colors.primary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Graded Items Found
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      {selectedCourseId === 'all'
                        ? 'Grades will appear here once your instructors record evaluations for your classwork.'
                        : 'No graded work has been recorded yet for this specific class.'}
                    </Text>
                  </Card>
                ) : (
                  filteredGrades.map((grade) => {
                    const pct = getPercent(grade);
                    const isPassing = pct >= 75;
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
                              {grade.value} <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>/ {grade.maxValue}</Text>
                            </Text>
                            <Text style={[styles.gradedDateText, { color: theme.colors.textSecondary }]}>
                              {formatDate(grade.gradedAt)}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.pctPill,
                              {
                                backgroundColor: isPassing
                                  ? `${theme.colors.primary}20`
                                  : 'rgba(239, 68, 68, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pctPillText,
                                {
                                  color: isPassing ? theme.colors.primary : '#EF4444',
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
                {grades.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <BarChart2 size={44} color={theme.colors.primary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      Insufficient Data for Analytics
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Visual analytics will automatically generate once multiple graded evaluations are recorded.
                    </Text>
                  </Card>
                ) : (
                  <>
                    {/* SVG Chart 1: Average Grade by Course */}
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
                          Average Grade by Course
                        </Text>
                        <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
                          Course percentage averages across your enrolled subjects
                        </Text>
                      </View>

                      {/* SVG Bar Chart */}
                      <View style={styles.svgContainer}>
                        {(() => {
                          const chartWidth = Math.max(screenWidth - 64, 300);
                          const chartHeight = 180;
                          const activeSummaries = summaries.filter((s) => s.gradeCount > 0);
                          const dataToRender =
                            activeSummaries.length > 0
                              ? activeSummaries
                              : enrolledCourses.map((c) => ({
                                  courseCode: c.code,
                                  courseName: c.title,
                                  percentage: 0,
                                  gradeCount: 0,
                                }));

                          const barWidth = Math.min(
                            36,
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
                                stroke={theme.colors.border}
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              <SvgText
                                x="8"
                                y="24"
                                fill={theme.colors.textSecondary}
                                fontSize="9"
                                fontWeight="600"
                              >
                                100%
                              </SvgText>

                              {/* 75% Passing Benchmark Line */}
                              <SvgLine
                                x1="36"
                                y1="52.5"
                                x2={chartWidth - 10}
                                y2="52.5"
                                stroke={theme.colors.primary}
                                strokeDasharray="4 4"
                                strokeWidth="1.2"
                              />
                              <SvgText
                                x="12"
                                y="56.5"
                                fill={theme.colors.primary}
                                fontSize="9"
                                fontWeight="700"
                              >
                                75%
                              </SvgText>

                              {/* 50% Grid Line */}
                              <SvgLine
                                x1="36"
                                y1="85"
                                x2={chartWidth - 10}
                                y2="85"
                                stroke={theme.colors.border}
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              <SvgText
                                x="12"
                                y="89"
                                fill={theme.colors.textSecondary}
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
                                stroke={theme.colors.border}
                                strokeWidth="1.5"
                              />

                              {/* Bars */}
                              {dataToRender.map((item, idx) => {
                                const clampedPct = Math.min(Math.max(item.percentage, 0), 100);
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
                                        item.percentage >= 75
                                          ? theme.colors.primary
                                          : '#EF4444'
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
                                      {item.percentage}%
                                    </SvgText>
                                    {/* Course Code below bar */}
                                    <SvgText
                                      x={x + barWidth / 2}
                                      y="166"
                                      fill={theme.colors.textSecondary}
                                      fontSize="9"
                                      fontWeight="600"
                                      textAnchor="middle"
                                    >
                                      {item.courseCode.slice(0, 7)}
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
                          const chronologicalGrades = [...grades].reverse();

                          if (chronologicalGrades.length < 2) {
                            return (
                              <View style={styles.minChartNotice}>
                                <Text style={[styles.minNoticeText, { color: theme.colors.textSecondary }]}>
                                  Complete at least 2 evaluations to visualize your performance trendline.
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
                              {/* Baseline 75% reference */}
                              <SvgLine
                                x1="36"
                                y1="57.5"
                                x2={chartWidth - 10}
                                y2="57.5"
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
                {/* GPA Radial Gauge & Standing Card */}
                <View
                  style={[
                    styles.gpaRadialCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {/* SVG Circular Ring */}
                  <View style={styles.radialWrapper}>
                    {(() => {
                      const size = 130;
                      const strokeWidth = 10;
                      const radius = (size - strokeWidth) / 2;
                      const circumference = 2 * Math.PI * radius;
                      const gpaRatio = hasEvaluations && cumulativeGpa
                        ? Math.min(Number(cumulativeGpa) / 4.0, 1.0)
                        : 0;
                      const dashOffset = circumference * (1 - gpaRatio);
                      const isPassing = overallAvgAll >= 75;
                      const ringColor = !hasEvaluations
                        ? theme.colors.border
                        : isPassing
                        ? theme.colors.primary
                        : '#EF4444';

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
                            {hasEvaluations && (
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
                            <Text style={[styles.radialGpaNumber, { color: hasEvaluations ? ringColor : theme.colors.textSecondary }]}>
                              {hasEvaluations ? cumulativeGpa : '—'}
                            </Text>
                            <Text style={[styles.radialGpaSub, { color: theme.colors.textSecondary }]}>
                              {hasEvaluations ? 'out of 4.0' : 'No Grades'}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.gpaTextGroup}>
                    <Text style={[styles.gpaStandingLabel, { color: theme.colors.textSecondary }]}>
                      CUMULATIVE STANDING
                    </Text>
                    <View style={styles.letterGradeRow}>
                      <Text style={[styles.letterGradeText, { color: theme.colors.text }]}>
                        {hasEvaluations ? `Grade ${cumulativeLetter}` : 'No Grades Yet'}
                      </Text>
                      <View
                        style={[
                          styles.standingPill,
                          {
                            backgroundColor: !hasEvaluations
                              ? `${theme.colors.textSecondary}18`
                              : overallAvgAll >= 75
                              ? `${theme.colors.primary}20`
                              : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.standingPillText,
                            {
                              color: !hasEvaluations
                                ? theme.colors.textSecondary
                                : overallAvgAll >= 75
                                ? theme.colors.primary
                                : '#EF4444',
                            },
                          ]}
                        >
                          {!hasEvaluations
                            ? 'NO EVALUATIONS'
                            : overallAvgAll >= 75
                            ? 'GOOD STANDING'
                            : 'ACADEMIC REVIEW'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.gpaDesc, { color: theme.colors.textSecondary }]}>
                      {hasEvaluations
                        ? `Overall average of ${overallAvgAll}% across ${grades.length} recorded evaluation${grades.length === 1 ? '' : 's'}.`
                        : 'Cumulative GPA and academic standing will be computed once evaluations are recorded.'}
                    </Text>
                  </View>
                </View>

                {/* Per-Subject Progress List */}
                <View style={styles.progressSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Subject Progress & Completion
                  </Text>
                </View>

                {summaries.length === 0 ? (
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
                  summaries.map((s) => {
                    const isPassing = s.percentage >= 75;
                    const hasItems = s.gradeCount > 0;

                    return (
                      <View
                        key={s.courseId}
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
                              {s.courseName}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.subjectBadge,
                              {
                                backgroundColor: !hasItems
                                  ? `${theme.colors.textSecondary}20`
                                  : isPassing
                                  ? `${theme.colors.primary}18`
                                  : 'rgba(239, 68, 68, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.subjectBadgeText,
                                {
                                  color: !hasItems
                                    ? theme.colors.textSecondary
                                    : isPassing
                                    ? theme.colors.primary
                                    : '#EF4444',
                                },
                              ]}
                            >
                              {!hasItems
                                ? 'NO WORK YET'
                                : s.percentage >= 90
                                ? 'EXCELLENT'
                                : 'ON TRACK'}
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
                                  width: `${Math.min(s.percentage, 100)}%`,
                                  backgroundColor: !hasItems
                                    ? 'transparent'
                                    : isPassing
                                    ? theme.colors.primary
                                    : '#EF4444',
                                },
                              ]}
                            />
                          </View>
                        </View>

                        <View style={styles.subjectPointsRow}>
                          <Text style={[styles.subjectPointsText, { color: theme.colors.textSecondary }]}>
                            {s.earnedPoints} / {s.totalPoints} points earned ({s.gradeCount} item
                            {s.gradeCount === 1 ? '' : 's'})
                          </Text>
                          <Text
                            style={[
                              styles.subjectPctText,
                              { color: hasItems ? theme.colors.text : theme.colors.textSecondary },
                            ]}
                          >
                            {s.percentage}%
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Course Scope Picker Modal ── */}
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
                Select Class Scope
              </Text>
              <TouchableOpacity
                onPress={() => setIsCoursePickerOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {/* "All Classes" Option */}
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
                    All Classes
                  </Text>
                  <Text style={[styles.modalItemDesc, { color: theme.colors.textSecondary }]}>
                    Consolidated grades across all enrolled subjects
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    paddingTop: 16,
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
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewContainer: {
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  courseDropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  courseDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  summaryPillDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 10,
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
  gpaRadialCard: {
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
  radialGpaNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  radialGpaSub: {
    fontSize: 9,
    fontWeight: '600',
  },
  gpaTextGroup: {
    flex: 1,
    gap: 4,
  },
  gpaStandingLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  letterGradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  letterGradeText: {
    fontSize: 20,
    fontWeight: '800',
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
  gpaDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  progressSectionHeader: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
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
