import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import {
  TrendingUp,
  CheckCircle,
  Clock,
  Users,
  Award,
  Download,
  Upload,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Check,
  ChevronDown,
  Layers,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { ScreenWrapper } from '../../../../src/components/common/ScreenWrapper';
import {
  exportAnalyticsToCsvString,
  parseAnalyticsImportCsv,
  type ExportStudentItem,
  type ImportRowData,
} from '../../../../src/lib/analytics-csv';
import type { Course } from '@lms/types';

interface ImportPreviewData {
  courseTitle: string;
  courseCode: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  canCommit: boolean;
  results: Array<{
    identifier: string;
    matchedStudent: {
      id: string;
      name: string;
      email: string;
      studentNumber: string | null;
    } | null;
    score: number | null;
    isValid: boolean;
    error?: string;
  }>;
}

export default function TeacherAnalyticsScreen() {
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, bottomClearance } = useResponsive();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [students, setStudents] = useState<ExportStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Import Modal & Target Course Selection
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetCourse, setImportTargetCourse] = useState<Course | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [rawImportRows, setRawImportRows] = useState<ImportRowData[]>([]);
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);

  // Load instructor's courses
  const loadCourses = useCallback(async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const res = await api.courses.list(instituteCode);
      if (res?.courses) {
        setCourses(res.courses);
      }
    } catch {
      // Non-fatal
    }
  }, [api, user?.institute?.code]);

  // Load student analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api.analytics.getAtRisk(selectedCourseId);
      if (res?.atRiskStudents) {
        setStudents(res.atRiskStudents as ExportStudentItem[]);
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      console.warn('Failed to load student analytics:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, selectedCourseId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    setLoading(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // ── COMPUTED LIVE METRICS ──
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const gradedStudents = students.filter(
      (s) => s.details?.gradeAverage !== null && s.details?.gradeAverage !== undefined
    );
    const passingStudents = gradedStudents.filter((s) => (s.details.gradeAverage ?? 0) >= 75);

    // 1. Overall Passing Rate
    const passingRate =
      gradedStudents.length > 0
        ? ((passingStudents.length / gradedStudents.length) * 100).toFixed(1)
        : totalStudents > 0
        ? '100.0'
        : '0.0';

    // 2. Class Average
    const sumGrades = gradedStudents.reduce((acc, s) => acc + (s.details.gradeAverage ?? 0), 0);
    const classAverage =
      gradedStudents.length > 0 ? (sumGrades / gradedStudents.length).toFixed(1) : 'N/A';

    // 3. Submission Rate
    let totalGradedCount = 0;
    let totalMissedCount = 0;
    students.forEach((s) => {
      totalGradedCount += s.details?.gradedSubmissions?.length || 0;
      totalMissedCount += s.details?.missedAssignments?.length || 0;
    });
    const totalExpected = totalGradedCount + totalMissedCount;
    const submissionRate =
      totalExpected > 0 ? Math.round((totalGradedCount / totalExpected) * 100) : 100;

    // 4. At-risk students count (high + medium)
    const atRiskCount = students.filter(
      (s) => s.riskLevel === 'HIGH' || s.riskLevel === 'MEDIUM'
    ).length;

    // 5. Grade Distribution Breakdown (Tiers)
    const tierExcellent = gradedStudents.filter((s) => (s.details.gradeAverage ?? 0) >= 90).length;
    const tierProficient = gradedStudents.filter(
      (s) => (s.details.gradeAverage ?? 0) >= 80 && (s.details.gradeAverage ?? 0) < 90
    ).length;
    const tierPassing = gradedStudents.filter(
      (s) => (s.details.gradeAverage ?? 0) >= 75 && (s.details.gradeAverage ?? 0) < 80
    ).length;
    const tierIntervention = gradedStudents.filter((s) => (s.details.gradeAverage ?? 0) < 75).length;

    const totalGraded = gradedStudents.length;
    const pctExcellent = totalGraded > 0 ? Math.round((tierExcellent / totalGraded) * 100) : 0;
    const pctProficient = totalGraded > 0 ? Math.round((tierProficient / totalGraded) * 100) : 0;
    const pctPassing = totalGraded > 0 ? Math.round((tierPassing / totalGraded) * 100) : 0;
    const pctIntervention = totalGraded > 0 ? Math.round((tierIntervention / totalGraded) * 100) : 0;

    return {
      totalStudents,
      gradedCount: gradedStudents.length,
      passingRate,
      classAverage,
      submissionRate,
      atRiskCount,
      tiers: {
        excellent: { count: tierExcellent, pct: pctExcellent },
        proficient: { count: tierProficient, pct: pctProficient },
        passing: { count: tierPassing, pct: pctPassing },
        intervention: { count: tierIntervention, pct: pctIntervention },
      },
    };
  }, [students]);

  // Selected course descriptor
  const activeCourse = useMemo(() => {
    if (selectedCourseId === 'all') return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // ── CSV EXPORT HANDLER ──
  const handleExportCsv = async () => {
    if (students.length === 0) {
      Alert.alert('No Data', 'No student records available to export for this selection.');
      return;
    }

    setIsExporting(true);
    try {
      const csvString = exportAnalyticsToCsvString(students);
      const scopeLabel = activeCourse ? activeCourse.code : 'all-courses';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `student-analytics_${scopeLabel}_${dateStr}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export Student Analytics (${scopeLabel})`,
          UTI: 'public.comma-separated-values-text',
        });
        Burnt.toast({
          title: 'Export Complete',
          message: `Exported ${students.length} student records.`,
          preset: 'done',
        });
      } else {
        Alert.alert('File Saved', `Export saved to device cache:\n${filename}`);
      }
    } catch (err: any) {
      console.error('Export CSV error:', err);
      Burnt.toast({
        title: 'Export Failed',
        message: err?.message || 'Could not export CSV.',
        preset: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ── CSV IMPORT HANDLER ──
  const startImportFlow = (targetCourse: Course) => {
    setImportTargetCourse(targetCourse);
    setIsCoursePickerOpen(false);
    pickAndValidateCsv(targetCourse);
  };

  const handleImportPress = () => {
    if (courses.length === 0) {
      Alert.alert('No Courses', 'You do not have any active courses to import grades into.');
      return;
    }

    // If an individual course is already selected, use it directly
    if (activeCourse) {
      startImportFlow(activeCourse);
    } else {
      // Prompt instructor to select which course to import into
      setIsCoursePickerOpen(true);
    }
  };

  const pickAndValidateCsv = async (targetCourse: Course) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsImporting(true);
      const file = result.assets[0];
      const csvText = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const { rows, errors } = parseAnalyticsImportCsv(csvText);

      if (errors.length > 0) {
        Alert.alert('CSV Header Error', errors.join('\n'));
        setIsImporting(false);
        return;
      }

      setRawImportRows(rows);

      // Call backend in validation / preview mode (commit: false)
      const previewRes = await api.analytics.importSupplementary({
        courseId: targetCourse.id,
        rows,
        commit: false,
      });

      setImportPreview(previewRes);
      setIsImportModalOpen(true);
    } catch (err: any) {
      console.error('Import CSV error:', err);
      Alert.alert(
        'Import Error',
        err?.message || 'Failed to parse CSV file. Please verify format.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Commit valid import
  const handleCommitImport = async () => {
    if (!importTargetCourse || !rawImportRows.length || !importPreview?.canCommit) {
      return;
    }

    setIsCommittingImport(true);
    try {
      const commitRes = await api.analytics.importSupplementary({
        courseId: importTargetCourse.id,
        rows: rawImportRows,
        commit: true,
      });

      Burnt.toast({
        title: 'Import Successful',
        message: `Imported scores for ${commitRes.validCount ?? rawImportRows.length} students.`,
        preset: 'done',
      });

      setIsImportModalOpen(false);
      setImportPreview(null);
      setRawImportRows([]);
      setImportTargetCourse(null);

      // Reload live analytics
      loadAnalytics();
    } catch (err: any) {
      Alert.alert('Commit Failed', err?.message || 'Failed to save imported grades.');
    } finally {
      setIsCommittingImport(false);
    }
  };

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
        {/* Header with Title & Action Buttons */}
        <View style={[styles.header, { marginBottom: s(12) }]}>
          <View style={styles.headerLeft}>
            <Text
              style={[styles.title, { color: theme.colors.text, fontSize: font(22) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Academic Analytics
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary, fontSize: font(12) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Live Student Performance & Risk Identification
            </Text>
          </View>

          {/* Action Buttons: Export & Import */}
          <View style={styles.actionButtonsRow}>
            {/* Export CSV Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleExportCsv}
              disabled={isExporting || loading || students.length === 0}
              activeOpacity={0.7}
              accessibilityLabel="Export analytics CSV"
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Download size={s(15)} color={theme.colors.primary} />
                  <Text
                    style={[styles.actionBtnText, { color: theme.colors.primary, fontSize: font(12) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Export
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Import CSV Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={handleImportPress}
              disabled={isImporting}
              activeOpacity={0.8}
              accessibilityLabel="Import supplementary CSV"
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Upload size={s(15)} color="#FFFFFF" />
                  <Text
                    style={[styles.actionBtnText, { color: '#FFFFFF', fontSize: font(12) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Import
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── COURSE SELECTOR PILLS ── */}
        <View style={[styles.selectorContainer, { marginBottom: s(14) }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {/* "All Courses" Pill */}
            <TouchableOpacity
              style={[
                styles.coursePill,
                {
                  backgroundColor:
                    selectedCourseId === 'all' ? theme.colors.primary : theme.colors.card,
                  borderColor:
                    selectedCourseId === 'all' ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedCourseId('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.coursePillText,
                  {
                    color: selectedCourseId === 'all' ? '#FFFFFF' : theme.colors.textSecondary,
                    fontWeight: selectedCourseId === 'all' ? '700' : '500',
                    fontSize: font(12),
                  },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                All Courses ({courses.length})
              </Text>
            </TouchableOpacity>

            {/* Individual Course Pills */}
            {courses.map((c) => {
              const isSelected = selectedCourseId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.coursePill,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCourseId(c.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.coursePillText,
                      {
                        color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: font(12),
                      },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {c.code || c.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={[styles.loadingBox, { paddingVertical: s(40) }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: theme.colors.textSecondary, fontSize: font(13), marginTop: s(10) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Calculating live student analytics...
            </Text>
          </View>
        ) : (
          <>
            {/* Highlight KPI Card */}
            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  padding: s(14),
                  borderRadius: s(14),
                  marginBottom: s(12),
                },
              ]}
            >
              <View style={[styles.kpiHeader, { marginBottom: s(6) }]}>
                <View>
                  <Text
                    style={[
                      styles.kpiLabel,
                      { color: theme.colors.textSecondary, fontSize: font(10.5) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    OVERALL PASSING RATE
                  </Text>
                  <Text
                    style={[
                      styles.kpiValue,
                      { color: theme.colors.primary, fontSize: font(28) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {metrics.passingRate}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.kpiIconBox,
                    {
                      backgroundColor: `${theme.colors.primary}18`,
                      width: s(42),
                      height: s(42),
                      borderRadius: s(21),
                    },
                  ]}
                >
                  <TrendingUp size={s(22)} color={theme.colors.primary} />
                </View>
              </View>
              <Text
                style={[styles.kpiTrend, { color: theme.colors.success, fontSize: font(11.5) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {metrics.gradedCount > 0
                  ? `Computed from ${metrics.gradedCount} graded student enrollments`
                  : 'Awaiting graded assignment submissions'}
              </Text>
            </View>

            {/* 4-stat Matrix Grid */}
            <View style={[styles.matrixGrid, { gap: s(8), marginBottom: s(14) }]}>
              {/* Active Students */}
              <View
                style={[
                  styles.matrixCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: s(12),
                    padding: s(8),
                    minHeight: s(72),
                  },
                ]}
              >
                <Users size={s(16)} color={theme.colors.info} />
                <Text
                  style={[
                    styles.matrixNum,
                    { color: theme.colors.text, fontSize: font(16), marginTop: s(3) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {metrics.totalStudents}
                </Text>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: theme.colors.textSecondary, fontSize: font(10.5), marginTop: s(1) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  Active Students
                </Text>
              </View>

              {/* Submission Rate */}
              <View
                style={[
                  styles.matrixCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: s(12),
                    padding: s(8),
                    minHeight: s(72),
                  },
                ]}
              >
                <CheckCircle size={s(16)} color={theme.colors.success} />
                <Text
                  style={[
                    styles.matrixNum,
                    { color: theme.colors.text, fontSize: font(16), marginTop: s(3) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {metrics.submissionRate}%
                </Text>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: theme.colors.textSecondary, fontSize: font(10.5), marginTop: s(1) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  Submission Rate
                </Text>
              </View>

              {/* At-Risk / Attention */}
              <View
                style={[
                  styles.matrixCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: s(12),
                    padding: s(8),
                    minHeight: s(72),
                  },
                ]}
              >
                <AlertTriangle
                  size={s(16)}
                  color={metrics.atRiskCount > 0 ? theme.colors.danger : theme.colors.warning}
                />
                <Text
                  style={[
                    styles.matrixNum,
                    {
                      color: metrics.atRiskCount > 0 ? theme.colors.danger : theme.colors.text,
                      fontSize: font(16),
                      marginTop: s(3),
                    },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {metrics.atRiskCount}
                </Text>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: theme.colors.textSecondary, fontSize: font(10.5), marginTop: s(1) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  Needs Attention
                </Text>
              </View>

              {/* Class Average */}
              <View
                style={[
                  styles.matrixCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: s(12),
                    padding: s(8),
                    minHeight: s(72),
                  },
                ]}
              >
                <Award size={s(16)} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.matrixNum,
                    { color: theme.colors.text, fontSize: font(16), marginTop: s(3) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {metrics.classAverage}
                </Text>
                <Text
                  style={[
                    styles.matrixLabel,
                    { color: theme.colors.textSecondary, fontSize: font(10.5), marginTop: s(1) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  Class Average
                </Text>
              </View>
            </View>

            {/* Grade Distribution Breakdown (Dynamic from Prisma) */}
            <View style={[styles.section, { marginBottom: s(16) }]}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text, fontSize: font(15), marginBottom: s(8) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Grade Distribution ({activeCourse ? activeCourse.code : 'All Courses'})
              </Text>

              <View
                style={[
                  styles.distributionCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    padding: s(12),
                    borderRadius: s(14),
                  },
                ]}
              >
                {/* Tier 1: 90 - 100 */}
                <View style={[styles.tierRow, { marginBottom: s(10) }]}>
                  <View style={[styles.tierHeader, { marginBottom: s(4) }]}>
                    <Text
                      style={[styles.tierLabel, { color: theme.colors.text, fontSize: font(12) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Excellent (90–100%)
                    </Text>
                    <Text
                      style={[
                        styles.tierPercentage,
                        { color: theme.colors.primary, fontSize: font(11.5) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {metrics.tiers.excellent.pct}% ({metrics.tiers.excellent.count} students)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.barBackground,
                      {
                        backgroundColor: theme.colors.cardSecondary,
                        height: s(7),
                        borderRadius: s(4),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(metrics.tiers.excellent.pct, 0)}%`,
                          backgroundColor: theme.colors.primary,
                          borderRadius: s(4),
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Tier 2: 80 - 89 */}
                <View style={[styles.tierRow, { marginBottom: s(10) }]}>
                  <View style={[styles.tierHeader, { marginBottom: s(4) }]}>
                    <Text
                      style={[styles.tierLabel, { color: theme.colors.text, fontSize: font(12) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Proficient (80–89%)
                    </Text>
                    <Text
                      style={[
                        styles.tierPercentage,
                        { color: theme.colors.info, fontSize: font(11.5) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {metrics.tiers.proficient.pct}% ({metrics.tiers.proficient.count} students)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.barBackground,
                      {
                        backgroundColor: theme.colors.cardSecondary,
                        height: s(7),
                        borderRadius: s(4),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(metrics.tiers.proficient.pct, 0)}%`,
                          backgroundColor: theme.colors.info,
                          borderRadius: s(4),
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Tier 3: 75 - 79 */}
                <View style={[styles.tierRow, { marginBottom: s(10) }]}>
                  <View style={[styles.tierHeader, { marginBottom: s(4) }]}>
                    <Text
                      style={[styles.tierLabel, { color: theme.colors.text, fontSize: font(12) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Passing (75–79%)
                    </Text>
                    <Text
                      style={[
                        styles.tierPercentage,
                        { color: theme.colors.warning, fontSize: font(11.5) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {metrics.tiers.passing.pct}% ({metrics.tiers.passing.count} students)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.barBackground,
                      {
                        backgroundColor: theme.colors.cardSecondary,
                        height: s(7),
                        borderRadius: s(4),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(metrics.tiers.passing.pct, 0)}%`,
                          backgroundColor: theme.colors.warning,
                          borderRadius: s(4),
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Tier 4: Below 75 */}
                <View style={styles.tierRow}>
                  <View style={[styles.tierHeader, { marginBottom: s(4) }]}>
                    <Text
                      style={[styles.tierLabel, { color: theme.colors.text, fontSize: font(12) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Needs Intervention (&lt;75%)
                    </Text>
                    <Text
                      style={[
                        styles.tierPercentage,
                        { color: theme.colors.danger, fontSize: font(11.5) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {metrics.tiers.intervention.pct}% ({metrics.tiers.intervention.count} students)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.barBackground,
                      {
                        backgroundColor: theme.colors.cardSecondary,
                        height: s(7),
                        borderRadius: s(4),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(metrics.tiers.intervention.pct, 0)}%`,
                          backgroundColor: theme.colors.danger,
                          borderRadius: s(4),
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── COURSE PICKER MODAL (When Import is triggered from 'All Courses') ── */}
      <Modal
        visible={isCoursePickerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCoursePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pickerContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(16),
                padding: s(16),
                maxHeight: s(420),
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: theme.colors.text, fontSize: font(16) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Select Course for CSV Import
              </Text>
              <TouchableOpacity
                onPress={() => setIsCoursePickerOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={s(20)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.modalDescription,
                { color: theme.colors.textSecondary, fontSize: font(12), marginBottom: s(12) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Grades must be imported into a specific enrolled course roster. Choose the target course:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {courses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseOptionItem,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.cardSecondary,
                      padding: s(12),
                      borderRadius: s(10),
                      marginBottom: s(8),
                    },
                  ]}
                  onPress={() => startImportFlow(course)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.courseOptionCode,
                      { color: theme.colors.primary, fontSize: font(13), fontWeight: '700' },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {course.code}
                  </Text>
                  <Text
                    style={[
                      styles.courseOptionTitle,
                      { color: theme.colors.text, fontSize: font(12), marginTop: s(2) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                    numberOfLines={1}
                  >
                    {course.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── IMPORT REVIEW / CONFIRMATION MODAL ── */}
      <Modal
        visible={isImportModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!isCommittingImport) setIsImportModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.reviewModalContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(18),
                padding: s(16),
                maxHeight: '85%',
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, { marginBottom: s(8) }]}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.modalTitle, { color: theme.colors.text, fontSize: font(17) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Review Supplementary Import
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: theme.colors.textSecondary, fontSize: font(12), marginTop: s(2) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Target: {importPreview?.courseCode} - {importPreview?.courseTitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsImportModalOpen(false)}
                disabled={isCommittingImport}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={s(20)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Validation Counters Banner */}
            <View
              style={[
                styles.summaryBanner,
                {
                  backgroundColor: theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  padding: s(10),
                  borderRadius: s(10),
                  marginBottom: s(10),
                },
              ]}
            >
              <View style={styles.counterBox}>
                <Text
                  style={[styles.counterLabel, { color: theme.colors.textSecondary, fontSize: font(10) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  TOTAL ROWS
                </Text>
                <Text
                  style={[styles.counterVal, { color: theme.colors.text, fontSize: font(15) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {importPreview?.totalRows ?? 0}
                </Text>
              </View>

              <View style={styles.counterBox}>
                <Text
                  style={[styles.counterLabel, { color: theme.colors.success, fontSize: font(10) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  VALID
                </Text>
                <Text
                  style={[styles.counterVal, { color: theme.colors.success, fontSize: font(15) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {importPreview?.validCount ?? 0}
                </Text>
              </View>

              <View style={styles.counterBox}>
                <Text
                  style={[styles.counterLabel, { color: theme.colors.danger, fontSize: font(10) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  INVALID
                </Text>
                <Text
                  style={[styles.counterVal, { color: theme.colors.danger, fontSize: font(15) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {importPreview?.invalidCount ?? 0}
                </Text>
              </View>
            </View>

            {/* Invalid Row Notice (if any) */}
            {importPreview && importPreview.invalidCount > 0 && (
              <View
                style={[
                  styles.errorNoticeBox,
                  {
                    backgroundColor: `${theme.colors.danger}15`,
                    borderColor: theme.colors.danger,
                    padding: s(8),
                    borderRadius: s(8),
                    marginBottom: s(8),
                  },
                ]}
              >
                <AlertTriangle size={s(15)} color={theme.colors.danger} />
                <Text
                  style={[
                    styles.errorNoticeText,
                    { color: theme.colors.danger, fontSize: font(11), flex: 1, marginLeft: s(6) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Cannot commit import until all row errors are resolved in your CSV.
                </Text>
              </View>
            )}

            {/* Row List */}
            <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={true}>
              {importPreview?.results?.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.reviewRowItem,
                    {
                      borderColor: item.isValid ? theme.colors.border : theme.colors.danger,
                      backgroundColor: item.isValid
                        ? theme.colors.cardSecondary
                        : `${theme.colors.danger}0C`,
                      padding: s(9),
                      borderRadius: s(8),
                      marginBottom: s(6),
                    },
                  ]}
                >
                  <View style={styles.rowItemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.rowItemName,
                          {
                            color: item.isValid ? theme.colors.text : theme.colors.danger,
                            fontSize: font(12.5),
                            fontWeight: '700',
                          },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                        numberOfLines={1}
                      >
                        {item.matchedStudent?.name || item.identifier}
                      </Text>
                      <Text
                        style={[
                          styles.rowItemEmail,
                          { color: theme.colors.textSecondary, fontSize: font(10.5) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                        numberOfLines={1}
                      >
                        {item.matchedStudent?.email || item.identifier}
                      </Text>
                    </View>

                    {/* Score & Status Badge */}
                    <View style={styles.rowItemRight}>
                      {item.score !== null && (
                        <Text
                          style={[
                            styles.rowItemScore,
                            {
                              color: theme.colors.primary,
                              fontSize: font(13),
                              fontWeight: '800',
                              marginRight: s(6),
                            },
                          ]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {item.score} pts
                        </Text>
                      )}
                      <View
                        style={[
                          styles.rowStatusBadge,
                          {
                            backgroundColor: item.isValid
                              ? `${theme.colors.success}20`
                              : `${theme.colors.danger}20`,
                            paddingHorizontal: s(6),
                            paddingVertical: s(2),
                            borderRadius: s(4),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rowStatusText,
                            {
                              color: item.isValid ? theme.colors.success : theme.colors.danger,
                              fontSize: font(10),
                              fontWeight: '700',
                            },
                          ]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {item.isValid ? 'READY' : 'ERROR'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Specific Error Message */}
                  {!item.isValid && item.error && (
                    <Text
                      style={[
                        styles.rowErrorMsg,
                        { color: theme.colors.danger, fontSize: font(11), marginTop: s(4) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      • {item.error}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalActionsRow, { marginTop: s(12), gap: s(8) }]}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    paddingVertical: s(10),
                    borderRadius: s(10),
                    flex: 1,
                  },
                ]}
                onPress={() => setIsImportModalOpen(false)}
                disabled={isCommittingImport}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    { color: theme.colors.textSecondary, fontSize: font(13) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.commitBtn,
                  {
                    backgroundColor: importPreview?.canCommit
                      ? theme.colors.primary
                      : theme.colors.cardSecondary,
                    paddingVertical: s(10),
                    borderRadius: s(10),
                    flex: 2,
                    opacity: importPreview?.canCommit ? 1 : 0.5,
                  },
                ]}
                onPress={handleCommitImport}
                disabled={!importPreview?.canCommit || isCommittingImport}
                activeOpacity={0.8}
              >
                {isCommittingImport ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.commitBtnText,
                      {
                        color: importPreview?.canCommit ? '#FFFFFF' : theme.colors.textSecondary,
                        fontSize: font(13),
                        fontWeight: '700',
                      },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Commit Import ({importPreview?.validCount ?? 0})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  actionBtnText: {
    fontWeight: '700',
  },
  selectorContainer: {},
  selectorScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  coursePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  coursePillText: {},
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {},
  kpiCard: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontWeight: '900',
    marginTop: 2,
  },
  kpiIconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTrend: {
    fontWeight: '600',
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  matrixCard: {
    width: '48.5%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixNum: {
    fontWeight: '800',
  },
  matrixLabel: {
    textAlign: 'center',
  },
  section: {},
  sectionTitle: {
    fontWeight: '700',
  },
  distributionCard: {
    borderWidth: 1,
  },
  tierRow: {},
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierLabel: {
    fontWeight: '600',
  },
  tierPercentage: {
    fontWeight: '700',
  },
  barBackground: {
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalSubtitle: {
    fontWeight: '500',
  },
  modalDescription: {
    marginTop: 4,
  },
  courseOptionItem: {
    borderWidth: 1,
  },
  courseOptionCode: {},
  courseOptionTitle: {},
  reviewModalContainer: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
  },
  counterBox: {
    alignItems: 'center',
  },
  counterLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  counterVal: {
    fontWeight: '800',
    marginTop: 2,
  },
  errorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  errorNoticeText: {
    fontWeight: '600',
  },
  reviewList: {
    maxHeight: 280,
  },
  reviewRowItem: {
    borderWidth: 1,
  },
  rowItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowItemName: {},
  rowItemEmail: {
    marginTop: 1,
  },
  rowItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowItemScore: {},
  rowStatusBadge: {},
  rowStatusText: {},
  rowErrorMsg: {
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
  },
  commitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  commitBtnText: {},
});
