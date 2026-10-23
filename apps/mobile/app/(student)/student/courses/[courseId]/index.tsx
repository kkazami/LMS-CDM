import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Radio,
  FileText,
  Users,
  Award,
  Clock,
  Paperclip,
  CheckCircle2,
  UploadCloud,
  FileUp,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../../src/stores/auth-store';
import { useTheme } from '../../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../../src/hooks/useResponsive';
import { Badge } from '../../../../../src/components/common/Badge';
import { Card } from '../../../../../src/components/common/Card';
import { Button } from '../../../../../src/components/common/Button';
import {
  Screen,
  AppHeader,
  FormModal,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../../src/lib/typography';
import { radius, spacing } from '../../../../../src/lib/theme';
import { percentToGradePoint, formatGradePoint, getGradeRemark, isPassing } from '../../../../../src/lib/ph-scale';
import { ClassworkAttachments, ClassworkDescription } from '../../../../../src/components/classwork/ClassworkAttachments';
import type { CourseGradesResponse } from '@lms/api-client';
import type {
  CourseDetail,
  CourseStreamResponse,
  CourseClassworkResponse,
  ClassworkItem,
  CoursePeopleResponse,
} from '@lms/types';

type TabType = 'STREAM' | 'CLASSWORK' | 'PEOPLE' | 'GRADES';

export default function StudentCourseHubScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [activeTab, setActiveTab] = useState<TabType>('STREAM');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [stream, setStream] = useState<CourseStreamResponse | null>(null);
  const [classwork, setClasswork] = useState<CourseClassworkResponse | null>(null);
  const [people, setPeople] = useState<CoursePeopleResponse | null>(null);
  const [grades, setGrades] = useState<CourseGradesResponse | null>(null);

  // Classwork filter
  const [classworkFilter, setClassworkFilter] = useState<'ALL' | 'ASSIGNMENT' | 'QUIZ' | 'MATERIAL'>('ALL');

  // Submission Drawer / Modal state
  const [selectedAssignment, setSelectedAssignment] = useState<ClassworkItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<Array<{ url: string; fileName: string; type: string }>>([]);

  const loadAllCourseData = async () => {
    if (!courseId) return;

    try {
      setErrorMessage(null);
      const [courseRes, streamRes, classworkRes, peopleRes, gradesRes] = await Promise.allSettled([
        api.courses.get(courseId),
        api.courses.getStream(courseId),
        api.courses.getClasswork(courseId),
        api.courses.getPeople(courseId),
        api.courses.getGrades(courseId),
      ]);

      let loadedSomething = false;
      if (courseRes.status === 'fulfilled' && courseRes.value?.course) {
        setCourse(courseRes.value.course as CourseDetail);
        loadedSomething = true;
      }
      if (streamRes.status === 'fulfilled') {
        setStream(streamRes.value);
        loadedSomething = true;
      }
      if (classworkRes.status === 'fulfilled') {
        setClasswork(classworkRes.value);
        loadedSomething = true;
      }
      if (peopleRes.status === 'fulfilled') {
        setPeople(peopleRes.value);
        loadedSomething = true;
      }
      if (gradesRes.status === 'fulfilled') {
        setGrades(gradesRes.value);
        loadedSomething = true;
      }

      if (!loadedSomething) {
        setErrorMessage('Could not load course details. Please check your connection.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load course information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllCourseData();
  }, [courseId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllCourseData();
  };

  // Document Picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSubmitting(true);
        try {
          const uploadRes = await api.upload.file(file.uri, file.name, file.mimeType || 'application/octet-stream');
          setLocalAttachments((prev) => [
            ...prev,
            { url: uploadRes.url, fileName: uploadRes.fileName, type: 'FILE' },
          ]);
        } catch (uploadErr: any) {
          const msg = uploadErr?.message || uploadErr?.bodyData?.error || 'Could not upload file to the server.';
          Alert.alert('Upload Failed', msg);
        } finally {
          setSubmitting(false);
        }
      }
    } catch (err: any) {
      Alert.alert('File Error', err?.message || 'Could not open document picker.');
    }
  };

  // Image Picker
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `submission_${Date.now()}.jpg`;
        setSubmitting(true);
        try {
          const uploadRes = await api.upload.file(asset.uri, fileName, asset.mimeType || 'image/jpeg');
          setLocalAttachments((prev) => [
            ...prev,
            { url: uploadRes.url, fileName: uploadRes.fileName, type: 'FILE' },
          ]);
        } catch (uploadErr: any) {
          const msg = uploadErr?.message || uploadErr?.bodyData?.error || 'Could not upload image to the server.';
          Alert.alert('Upload Failed', msg);
        } finally {
          setSubmitting(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Image Error', err?.message || 'Could not open photo gallery.');
    }
  };

  // Submit Assignment
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !courseId) return;

    // Reject unuploaded local device URIs before sending to server
    const invalidAttachment = localAttachments.find(
      (att) => !att.url || att.url.startsWith('file:') || att.url.startsWith('content:')
    );
    if (invalidAttachment) {
      Alert.alert(
        'Upload Required',
        `The file "${invalidAttachment.fileName}" has not been uploaded to the server yet. Please re-attach it or remove it before turning in.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const primaryAtt = localAttachments[0];
      await api.courses.submitAssignment(
        courseId,
        selectedAssignment.id,
        'SUBMITTED',
        primaryAtt?.url,
        primaryAtt?.fileName,
        undefined,
        localAttachments.length > 0 ? localAttachments : undefined
      );

      try {
        Burnt.toast({
          title: 'Assignment Submitted!',
          message: 'Work turned in successfully.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setSelectedAssignment(null);
      setLocalAttachments([]);
      loadAllCourseData();
    } catch (err: any) {
      const serverMessage = err?.message || err?.error?.message || err?.bodyData?.message || err?.bodyData?.error;
      Alert.alert('Submission Failed', serverMessage || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Unsubmit Assignment
  const handleUnsubmitAssignment = async () => {
    if (!selectedAssignment || !courseId) return;

    Alert.alert('Unsubmit Assignment?', 'You can make changes and resubmit your work before the deadline.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsubmit',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.courses.submitAssignment(courseId, selectedAssignment.id, 'DRAFT');
            try {
              Burnt.toast({
                title: 'Assignment Unsubmitted',
                message: 'Draft status restored.',
                preset: 'done',
              });
            } catch {
              // Fallback
            }
            setSelectedAssignment(null);
            setLocalAttachments([]);
            loadAllCourseData();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not unsubmit assignment.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Filter classwork items
  const filteredClassworkItems = (classwork?.items || []).filter((item) => {
    if (classworkFilter === 'ALL') return true;
    return item.type === classworkFilter;
  });

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
      {/* Course Banner Topbar */}
      <AppHeader
        showBack
        title={course?.title || 'Course Hub'}
        subtitle={`Instructor: ${course?.instructorName || 'Faculty Instructor'}`}
        rightAction={
          <View style={[styles.headerBadgeGroup, { gap: s(spacing.xs) }]}>
            <Badge label={course?.code || course?.courseCode || 'COURSE'} variant="primary" size="sm" />
            {course?.section ? <Badge label={course.section} variant="default" size="sm" /> : null}
          </View>
        }
      />

      {/* 4 Segmented Navigation Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'STREAM' }}
          accessibilityLabel="Course stream tab"
          style={[
            styles.tabBtn,
            { paddingVertical: s(spacing.md) },
            activeTab === 'STREAM' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
          ]}
          onPress={() => setActiveTab('STREAM')}
        >
          <Radio size={s(16)} color={activeTab === 'STREAM' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text
            style={[
              styles.tabLabel,
              {
                fontSize: font(13),
                color: activeTab === 'STREAM' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'STREAM' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Stream
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'CLASSWORK' }}
          accessibilityLabel="Classwork syllabus tab"
          style={[
            styles.tabBtn,
            { paddingVertical: s(spacing.md) },
            activeTab === 'CLASSWORK' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
          ]}
          onPress={() => setActiveTab('CLASSWORK')}
        >
          <FileText size={s(16)} color={activeTab === 'CLASSWORK' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text
            style={[
              styles.tabLabel,
              {
                fontSize: font(13),
                color: activeTab === 'CLASSWORK' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'CLASSWORK' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Classwork
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'PEOPLE' }}
          accessibilityLabel="People and roster tab"
          style={[
            styles.tabBtn,
            { paddingVertical: s(spacing.md) },
            activeTab === 'PEOPLE' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
          ]}
          onPress={() => setActiveTab('PEOPLE')}
        >
          <Users size={s(16)} color={activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text
            style={[
              styles.tabLabel,
              {
                fontSize: font(13),
                color: activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'PEOPLE' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            People
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'GRADES' }}
          accessibilityLabel="Course grades tab"
          style={[
            styles.tabBtn,
            { paddingVertical: s(spacing.md) },
            activeTab === 'GRADES' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
          ]}
          onPress={() => setActiveTab('GRADES')}
        >
          <Award size={s(16)} color={activeTab === 'GRADES' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text
            style={[
              styles.tabLabel,
              {
                fontSize: font(13),
                color: activeTab === 'GRADES' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: activeTab === 'GRADES' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Grades
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      <View style={[styles.mainTabContent, { padding: s(spacing.lg) }]}>
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadAllCourseData}
            onDismiss={() => setErrorMessage(null)}
            retryAccessibilityLabel="Retry loading course details"
            style={{ marginBottom: s(spacing.md) }}
          />
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <SkeletonBlock width="100%" height={s(84)} borderRadius={radius.lg} style={{ marginBottom: s(spacing.md) }} />
            <SkeletonBlock width="100%" height={s(120)} borderRadius={radius.lg} style={{ marginBottom: s(spacing.md) }} />
            <SkeletonBlock width="100%" height={s(100)} borderRadius={radius.lg} />
          </View>
        ) : (
          <>
            {/* ==================== TAB 1: STREAM ==================== */}
            {activeTab === 'STREAM' && (
              <View>
                {/* Pinned Broadcast Alerts */}
                {Boolean(stream?.broadcasts && stream.broadcasts.length > 0) && (
                  <View style={[styles.broadcastSection, { marginBottom: s(spacing.md) }]}>
                    {stream!.broadcasts.map((b) => (
                      <View
                        key={b.id}
                        style={[
                          styles.broadcastCard,
                          {
                            backgroundColor:
                              b.category === 'URGENT' || b.category === 'ALERT'
                                ? theme.colors.dangerBg
                                : theme.colors.warningBg,
                            borderColor:
                              b.category === 'URGENT' || b.category === 'ALERT'
                                ? theme.colors.danger
                                : theme.colors.warning,
                            borderRadius: radius.lg,
                            padding: s(spacing.md),
                            marginBottom: s(spacing.sm),
                          },
                        ]}
                      >
                        <View style={styles.broadcastCardTop}>
                          <Badge
                            label={b.category || 'NOTICE'}
                            variant={b.category === 'URGENT' || b.category === 'ALERT' ? 'danger' : 'warning'}
                            size="sm"
                          />
                          <Text
                            style={[styles.broadcastTimestamp, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text
                          style={[styles.broadcastMessage, { color: theme.colors.text, fontSize: font(14), lineHeight: font(20) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {b.message}
                        </Text>
                        <Text
                          style={[styles.broadcastSender, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          &bull; Broadcast by {b.senderName}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Stream Announcements Feed */}
                <Text
                  style={[
                    styles.sectionHeading,
                    { color: theme.colors.text, fontSize: font(16), marginBottom: s(spacing.md) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Course Announcements
                </Text>

                {(!stream?.announcements || stream.announcements.length === 0) ? (
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
                    <Radio size={s(40)} color={theme.colors.textSecondary} />
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: theme.colors.text, fontSize: font(16), lineHeight: font(22) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      No Stream Announcements Yet
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Your instructor will post course updates, reminders, and links here.
                    </Text>
                  </Card>
                ) : (
                  stream.announcements.map((ann) => (
                    <View
                      key={ann.id}
                      style={[
                        styles.streamCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          borderRadius: radius.lg,
                          padding: s(spacing.lg),
                          marginBottom: s(spacing.md),
                        },
                      ]}
                    >
                      <View style={[styles.streamCardHeader, { marginBottom: s(spacing.md) }]}>
                        <View
                          style={[
                            styles.authorAvatar,
                            {
                              backgroundColor: theme.colors.primary,
                              width: s(40),
                              height: s(40),
                              borderRadius: radius.full,
                              marginRight: s(spacing.sm),
                            },
                          ]}
                        >
                          <Text style={[styles.avatarLetter, { fontSize: font(15) }]}>
                            {getInitials(ann.author?.name)}
                          </Text>
                        </View>
                        <View style={styles.authorMeta}>
                          <Text
                            style={[styles.authorName, { color: theme.colors.text, fontSize: font(14) }]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {ann.author?.name || 'Course Instructor'}
                          </Text>
                          <Text
                            style={[styles.annTimestamp, { color: theme.colors.textSecondary, fontSize: font(11), marginTop: 2 }]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {new Date(ann.createdAt).toLocaleDateString()} at{' '}
                            {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[styles.annContent, { color: theme.colors.text, fontSize: font(14), lineHeight: font(20) }]}
                        selectable
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {ann.content}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 2: CLASSWORK ==================== */}
            {activeTab === 'CLASSWORK' && (
              <View>
                {/* Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[styles.filterScrollView, { marginBottom: s(spacing.md) }]}
                  contentContainerStyle={{ gap: s(spacing.sm) }}
                >
                  {(['ALL', 'ASSIGNMENT', 'QUIZ', 'MATERIAL'] as const).map((cat) => {
                    const isSelected = classworkFilter === cat;
                    const label =
                      cat === 'ALL'
                        ? 'All Modules'
                        : cat === 'ASSIGNMENT'
                        ? 'Assignments'
                        : cat === 'QUIZ'
                        ? 'Quizzes'
                        : 'Materials';
                    return (
                      <TouchableOpacity
                        key={cat}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter ${label}`}
                        style={[
                          styles.filterPill,
                          {
                            borderRadius: radius.full,
                            paddingHorizontal: s(spacing.md),
                            paddingVertical: s(spacing.xs),
                            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceAlt,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => setClassworkFilter(cat)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            {
                              fontSize: font(12),
                              color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {filteredClassworkItems.length === 0 ? (
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
                    <FileText size={s(40)} color={theme.colors.textSecondary} />
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: theme.colors.text, fontSize: font(16), lineHeight: font(22) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      No Classwork Found
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      No syllabus items currently match this category filter.
                    </Text>
                  </Card>
                ) : (
                  filteredClassworkItems.map((item) => {
                    const submission = item.submission;
                    const isGraded = submission?.status === 'GRADED' || typeof submission?.grade === 'number';
                    const isSubmitted = submission?.status === 'SUBMITTED';
                    const isMissing = !submission && item.dueDate && new Date(item.dueDate) < new Date();

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.classworkCard,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                            borderRadius: radius.lg,
                            padding: s(spacing.lg),
                            marginBottom: s(spacing.md),
                          },
                        ]}
                        onPress={() => {
                          if (item.type === 'MATERIAL') {
                            router.push(`/student/courses/${courseId}/materials/${item.id}` as any);
                            return;
                          }
                          setSelectedAssignment(item);
                          setLocalAttachments(
                            submission?.attachments?.map((a) => ({
                              url: a.url,
                              fileName: a.fileName,
                              type: 'FILE',
                            })) || []
                          );
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Classwork item ${item.title}, ${item.type}`}
                      >
                        <View style={[styles.classworkCardTop, { marginBottom: s(spacing.sm) }]}>
                          <Badge
                            label={item.type}
                            variant={item.type === 'ASSIGNMENT' ? 'primary' : item.type === 'QUIZ' ? 'warning' : 'info'}
                            size="sm"
                          />

                          {/* Status Badge */}
                          {isGraded ? (
                            <Badge
                              label={`Graded: ${submission?.grade ?? '—'}/${item.maxPoints ?? 100}`}
                              variant="success"
                              size="sm"
                            />
                          ) : isSubmitted ? (
                            <Badge label="Submitted" variant="info" size="sm" />
                          ) : isMissing ? (
                            <Badge label="Missing" variant="danger" size="sm" />
                          ) : item.dueDate ? (
                            <Badge
                              label={`Due ${new Date(item.dueDate).toLocaleDateString()}`}
                              variant="default"
                              size="sm"
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[styles.classworkTitle, { color: theme.colors.text, fontSize: font(16) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {item.title}
                        </Text>

                        {Boolean(item.description) && (
                          <Text
                            style={[
                              styles.classworkDescription,
                              { color: theme.colors.textSecondary, fontSize: font(13), marginBottom: s(spacing.md) },
                            ]}
                            numberOfLines={2}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {item.description}
                          </Text>
                        )}

                        <View
                          style={[
                            styles.classworkFooter,
                            { borderTopColor: theme.colors.border, paddingTop: s(spacing.sm) },
                          ]}
                        >
                          <View style={[styles.footerInfoRow, { gap: s(spacing.sm) }]}>
                            {item.maxPoints && (
                              <Text
                                style={[styles.ptsText, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                                maxFontSizeMultiplier={maxFontSizeMultiplier}
                              >
                                {item.maxPoints} Points
                              </Text>
                            )}
                            {Boolean(item.attachments && item.attachments.length > 0) && (
                              <View style={[styles.attCount, { gap: 4 }]}>
                                <Paperclip size={s(13)} color={theme.colors.textSecondary} />
                                <Text
                                  style={[styles.ptsText, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                                >
                                  {item.attachments!.length} files
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={[styles.submissionActionPrompt, { color: theme.colors.primary, fontSize: font(12) }]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {item.type === 'MATERIAL' ? 'View Details' : submission ? 'View Submission' : 'Turn In & Submit'} &rarr;
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* ==================== TAB 3: PEOPLE ==================== */}
            {activeTab === 'PEOPLE' && (
              <View>
                {/* Instructor Section */}
                <Text
                  style={[
                    styles.sectionHeading,
                    { color: theme.colors.text, fontSize: font(16), marginBottom: s(spacing.sm) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Course Instructor
                </Text>
                <View
                  style={[
                    styles.personCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      borderRadius: radius.lg,
                      padding: s(spacing.md),
                      marginBottom: s(spacing.lg),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.authorAvatar,
                      {
                        backgroundColor: theme.colors.primary,
                        width: s(40),
                        height: s(40),
                        borderRadius: radius.full,
                        marginRight: s(spacing.sm),
                      },
                    ]}
                  >
                    <Text style={[styles.avatarLetter, { fontSize: font(15) }]}>
                      {getInitials(people?.instructor?.name)}
                    </Text>
                  </View>
                  <View style={styles.authorMeta}>
                    <Text
                      style={[styles.personName, { color: theme.colors.text, fontSize: font(14) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {people?.instructor?.name || 'Professor'}
                    </Text>
                    <Text
                      style={[styles.personEmail, { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {people?.instructor?.email || 'instructor@cdm.edu.ph'}
                    </Text>
                  </View>
                  <Badge label="FACULTY" variant="primary" size="sm" />
                </View>

                {/* Classmates Section */}
                <View style={[styles.classmatesHeader, { marginTop: s(spacing.md), marginBottom: s(spacing.sm) }]}>
                  <Text
                    style={[styles.sectionHeading, { color: theme.colors.text, fontSize: font(16), marginBottom: 0 }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Classmates
                  </Text>
                  <Badge label={`${people?.totalEnrolled ?? 0} Enrolled`} variant="default" size="sm" />
                </View>

                {(!people?.students || people.students.length === 0) ? (
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
                    <Users size={s(40)} color={theme.colors.textSecondary} />
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: theme.colors.text, fontSize: font(16), lineHeight: font(22) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      No Classmates Enrolled
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Class roster will update as students enroll and receive approval.
                    </Text>
                  </Card>
                ) : (
                  people.students.map((student) => (
                    <View
                      key={student.id}
                      style={[
                        styles.personCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          borderRadius: radius.md,
                          padding: s(spacing.md),
                          marginBottom: s(spacing.sm),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.studentAvatar,
                          {
                            backgroundColor: theme.colors.surfaceAlt,
                            width: s(38),
                            height: s(38),
                            borderRadius: radius.full,
                            marginRight: s(spacing.sm),
                          },
                        ]}
                      >
                        <Text
                          style={[styles.studentAvatarText, { color: theme.colors.text, fontSize: font(13) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {getInitials(student.name)}
                        </Text>
                      </View>
                      <View style={styles.authorMeta}>
                        <Text
                          style={[styles.personName, { color: theme.colors.text, fontSize: font(14) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {student.name}
                        </Text>
                        <Text
                          style={[styles.personEmail, { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {student.studentNumber !== 'N/A' ? student.studentNumber : student.email}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 4: GRADES ==================== */}
            {activeTab === 'GRADES' && (
              <View>
                {/* Course Standing Summary Card */}
                <View
                  style={[
                    styles.courseGradeSummaryCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      borderRadius: radius.xl,
                      padding: s(spacing.xl),
                      marginBottom: s(spacing.xl),
                    },
                  ]}
                >
                  <View style={[styles.gradeSummaryTop, { marginBottom: s(spacing.lg) }]}>
                    <View>
                      <Text
                        style={[
                          styles.gradeSummaryLabel,
                          { color: theme.colors.textSecondary, fontSize: font(11) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        ESTIMATED COURSE STANDING
                      </Text>
                      <Text
                        style={[
                          styles.courseGradePercentage,
                          { color: theme.colors.primary, fontSize: font(32) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {(() => {
                          const avg = grades?.summary?.averagePercentage;
                          if (avg !== null && avg !== undefined) return `${avg}%`;
                          if (grades?.summary && grades.summary.totalPossiblePoints > 0) {
                            return `${Math.round((grades.summary.totalEarnedPoints / grades.summary.totalPossiblePoints) * 100)}%`;
                          }
                          return 'In Progress';
                        })()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.gradePointBox,
                        {
                          backgroundColor: `${theme.colors.primary}18`,
                          paddingHorizontal: s(spacing.md),
                          minWidth: s(72),
                          height: s(60),
                          borderRadius: radius.lg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradePointText,
                          { color: theme.colors.primary, fontSize: font(22) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {(() => {
                          let avg = grades?.summary?.averagePercentage;
                          if ((avg === null || avg === undefined) && grades?.summary && grades.summary.totalPossiblePoints > 0) {
                            avg = Math.round((grades.summary.totalEarnedPoints / grades.summary.totalPossiblePoints) * 100);
                          }
                          const gp = grades?.summary?.gradePoint ?? percentToGradePoint(avg);
                          return gp !== null ? (grades?.summary?.gradePointFormatted || formatGradePoint(gp)) : '—';
                        })()}
                      </Text>
                      {(() => {
                        let avg = grades?.summary?.averagePercentage;
                        if ((avg === null || avg === undefined) && grades?.summary && grades.summary.totalPossiblePoints > 0) {
                          avg = Math.round((grades.summary.totalEarnedPoints / grades.summary.totalPossiblePoints) * 100);
                        }
                        const gp = grades?.summary?.gradePoint ?? percentToGradePoint(avg);
                        const remark = grades?.summary?.remark || (gp !== null ? getGradeRemark(gp) : '');
                        return remark ? (
                          <Text
                            style={[
                              styles.gradeRemarkSub,
                              { color: isPassing(gp) ? theme.colors.primary : theme.colors.danger, fontSize: font(10) },
                            ]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {remark}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.gradeMetricsRow,
                      { borderTopColor: theme.colors.border, paddingTop: s(spacing.md) },
                    ]}
                  >
                    <View style={styles.metricItem}>
                      <Text
                        style={[styles.metricNum, { color: theme.colors.text, fontSize: font(16) }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {grades?.summary?.totalEarnedPoints ?? 0} / {grades?.summary?.totalPossiblePoints ?? 0}
                      </Text>
                      <Text
                        style={[styles.metricLabel, { color: theme.colors.textSecondary, fontSize: font(11), marginTop: 2 }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Points Earned
                      </Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricItem}>
                      <Text
                        style={[styles.metricNum, { color: theme.colors.success, fontSize: font(16) }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {grades?.summary?.gradedCount ?? 0}
                      </Text>
                      <Text
                        style={[styles.metricLabel, { color: theme.colors.textSecondary, fontSize: font(11), marginTop: 2 }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Graded
                      </Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricItem}>
                      <Text
                        style={[styles.metricNum, { color: theme.colors.danger, fontSize: font(16) }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {grades?.summary?.missingCount ?? 0}
                      </Text>
                      <Text
                        style={[styles.metricLabel, { color: theme.colors.textSecondary, fontSize: font(11), marginTop: 2 }]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Missing
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Itemized Grade List */}
                <Text
                  style={[
                    styles.sectionHeading,
                    { color: theme.colors.text, fontSize: font(16), marginBottom: s(spacing.md) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Course Assessments
                </Text>

                {(!grades?.items || grades.items.length === 0) ? (
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
                    <Award size={s(40)} color={theme.colors.textSecondary} />
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: theme.colors.text, fontSize: font(16), lineHeight: font(22) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      No Evaluated Items
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Grades for assignments and quizzes in this course will be listed here.
                    </Text>
                  </Card>
                ) : (
                  grades.items.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.gradeItemCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          borderRadius: radius.lg,
                          padding: s(spacing.md),
                          marginBottom: s(spacing.sm),
                        },
                      ]}
                    >
                      <View style={[styles.gradeItemHeader, { marginBottom: s(spacing.sm) }]}>
                        <View style={{ flex: 1, marginRight: s(spacing.sm) }}>
                          <Text
                            style={[styles.gradeItemTitle, { color: theme.colors.text, fontSize: font(15) }]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[styles.gradeItemType, { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 }]}
                            maxFontSizeMultiplier={maxFontSizeMultiplier}
                          >
                            {item.type} {item.dueDate ? `• Due ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                          </Text>
                        </View>
                        <Badge
                          label={item.status}
                          variant={item.status === 'GRADED' ? 'success' : item.status === 'MISSING' ? 'danger' : 'info'}
                          size="sm"
                        />
                      </View>

                      <View
                        style={[
                          styles.scoreBadgeBox,
                          {
                            backgroundColor: theme.colors.surfaceAlt,
                            borderRadius: radius.sm,
                            paddingHorizontal: s(spacing.md),
                            paddingVertical: s(spacing.xs),
                          },
                        ]}
                      >
                        <Text
                          style={[styles.scoreTitle, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          Score
                        </Text>
                        <Text
                          style={[styles.scoreResult, { color: theme.colors.text, fontSize: font(13) }]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          {item.score !== null ? `${item.score} / ${item.maxPoints}` : `— / ${item.maxPoints}`}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </View>

      {/* ==================== SUBMISSION / ASSIGNMENT FORM MODAL ==================== */}
      <FormModal
        visible={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title={selectedAssignment?.title || 'Assignment Details'}
        subtitle={
          selectedAssignment
            ? `${selectedAssignment.type} ${selectedAssignment.maxPoints ? `• ${selectedAssignment.maxPoints} pts` : ''}`
            : undefined
        }
        closeAccessibilityLabel="Close assignment modal"
        actions={
          selectedAssignment?.type !== 'MATERIAL' ? (
            <View style={{ width: '100%' }}>
              {selectedAssignment?.submission?.status === 'SUBMITTED' && !selectedAssignment.submission.isReturned ? (
                <Button
                  title="Unsubmit Assignment"
                  onPress={handleUnsubmitAssignment}
                  loading={submitting}
                  variant="outline"
                  style={{ width: '100%' }}
                />
              ) : selectedAssignment?.submission?.isReturned ? (
                <View style={[styles.gradedNoticeBox, { paddingVertical: s(spacing.sm) }]}>
                  <Text
                    style={[styles.gradedNoticeText, { color: theme.colors.success, fontSize: font(13) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Assignment has been officially finalized.
                  </Text>
                </View>
              ) : (
                <Button
                  title={localAttachments.length > 0 ? 'Turn In Assignment' : 'Mark as Done'}
                  onPress={handleSubmitAssignment}
                  loading={submitting}
                  icon={CheckCircle2}
                  style={{ width: '100%' }}
                />
              )}
            </View>
          ) : undefined
        }
      >
        {/* Assignment Prompt */}
        {Boolean(selectedAssignment?.description) && (
          <View style={[styles.modalSection, { marginBottom: s(spacing.md) }]}>
            <Text
              style={[
                styles.modalSectionHeading,
                { color: theme.colors.textSecondary, fontSize: font(11), marginBottom: s(spacing.xs) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              INSTRUCTIONS
            </Text>
            <ClassworkDescription
              content={selectedAssignment!.description}
              textStyle={[
                styles.modalPrompt,
                { color: theme.colors.text, fontSize: font(14), lineHeight: font(20) },
              ]}
            />
          </View>
        )}

        {/* Assignment Metadata */}
        <View style={[styles.modalMetaRow, { gap: s(spacing.md), marginBottom: s(spacing.md) }]}>
          {selectedAssignment?.maxPoints && (
            <View style={[styles.modalMetaItem, { gap: 6 }]}>
              <Award size={s(16)} color={theme.colors.primary} />
              <Text
                style={[styles.modalMetaText, { color: theme.colors.text, fontSize: font(12) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {selectedAssignment.maxPoints} Points Possible
              </Text>
            </View>
          )}
          {selectedAssignment?.dueDate && (
            <View style={[styles.modalMetaItem, { gap: 6 }]}>
              <Clock size={s(16)} color={theme.colors.warning} />
              <Text
                style={[styles.modalMetaText, { color: theme.colors.text, fontSize: font(12) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Due: {new Date(selectedAssignment.dueDate).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Syllabus Attachments from Instructor */}
        {Boolean(selectedAssignment?.attachments && selectedAssignment.attachments.length > 0) && (
          <View style={[styles.modalSection, { marginBottom: s(spacing.md) }]}>
            <ClassworkAttachments
              attachments={selectedAssignment?.attachments}
              title="ATTACHED REFERENCE MATERIALS"
            />
          </View>
        )}

        {/* Graded Feedback if already evaluated */}
        {selectedAssignment?.submission?.grade !== null &&
          selectedAssignment?.submission?.grade !== undefined && (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: theme.colors.successBg,
                  borderColor: theme.colors.success,
                  borderRadius: radius.md,
                  padding: s(spacing.md),
                  marginBottom: s(spacing.md),
                },
              ]}
            >
              <CheckCircle2 size={s(24)} color={theme.colors.success} />
              <View style={{ flex: 1, marginLeft: s(spacing.sm) }}>
                <Text
                  style={[styles.feedbackTitle, { color: theme.colors.success, fontSize: font(14) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Submission Graded: {selectedAssignment.submission.grade} / {selectedAssignment.maxPoints}
                </Text>
                <Text
                  style={[styles.feedbackSubtitle, { color: theme.colors.textSecondary, fontSize: font(11), marginTop: 2 }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Returned on {selectedAssignment.submission.submittedAt ? new Date(selectedAssignment.submission.submittedAt).toLocaleDateString() : 'Official Assessment'}
                </Text>
              </View>
            </View>
          )}

        {/* Student Uploads Section */}
        {selectedAssignment?.type !== 'MATERIAL' && (
          <View style={styles.modalSection}>
            <Text
              style={[
                styles.modalSectionHeading,
                { color: theme.colors.textSecondary, fontSize: font(11), marginBottom: s(spacing.xs) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              YOUR SUBMISSION FILES
            </Text>

            {localAttachments.length === 0 ? (
              <View
                style={[
                  styles.dropZone,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: radius.md,
                    paddingVertical: s(spacing.xl),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <UploadCloud size={s(32)} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.dropZoneText,
                    { color: theme.colors.textSecondary, fontSize: font(13), marginTop: s(spacing.xs) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  No files attached yet
                </Text>
              </View>
            ) : (
              localAttachments.map((file, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.uploadedFileRow,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: s(spacing.md),
                      paddingVertical: s(spacing.sm),
                      marginBottom: s(spacing.xs),
                    },
                  ]}
                >
                  <Paperclip size={s(16)} color={theme.colors.primary} />
                  <Text
                    style={[styles.uploadedFileName, { color: theme.colors.text, fontSize: font(13), marginLeft: s(spacing.xs) }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {file.fileName}
                  </Text>
                  {!selectedAssignment?.submission?.isReturned && (
                    <TouchableOpacity
                      onPress={() => {
                        setLocalAttachments((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete attached file ${file.fileName}`}
                    >
                      <Trash2 size={s(16)} color={theme.colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {/* File Pickers */}
            {!selectedAssignment?.submission?.isReturned && (
              <View style={[styles.pickerActionsRow, { gap: s(spacing.md), marginTop: s(spacing.xs) }]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Attach Document"
                  style={[
                    styles.pickerBtn,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  <FileUp size={s(18)} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.pickerBtnText,
                      { color: theme.colors.text, fontSize: font(13), marginLeft: s(spacing.xs) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Add Document
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Attach Photo"
                  style={[
                    styles.pickerBtn,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={s(18)} color={theme.colors.primary} />
                  <Text
                    style={[
                      styles.pickerBtnText,
                      { color: theme.colors.text, fontSize: font(13), marginLeft: s(spacing.xs) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Add Photo
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    paddingBottom: 40,
  },
  headerBadgeGroup: {
    flexDirection: 'row',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: TOUCH_TARGET ?? 44,
  },
  tabLabel: {},
  mainTabContent: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 12,
  },
  broadcastSection: {},
  broadcastCard: {
    borderWidth: 1,
  },
  broadcastCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  broadcastTimestamp: {},
  broadcastMessage: {
    fontWeight: '600',
    marginBottom: 4,
  },
  broadcastSender: {},
  sectionHeading: {
    fontWeight: '700',
  },
  streamCard: {
    borderWidth: 1,
  },
  streamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontWeight: '700',
  },
  annTimestamp: {},
  annContent: {},
  filterScrollView: {
    flexDirection: 'row',
  },
  filterPill: {
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {},
  classworkCard: {
    borderWidth: 1,
  },
  classworkCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classworkTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  classworkDescription: {
    lineHeight: 18,
  },
  classworkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ptsText: {
    fontWeight: '500',
  },
  attCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submissionActionPrompt: {
    fontWeight: '700',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  personName: {
    fontWeight: '700',
  },
  personEmail: {},
  classmatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontWeight: '700',
  },
  courseGradeSummaryCard: {
    borderWidth: 1,
  },
  gradeSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeSummaryLabel: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  courseGradePercentage: {
    fontWeight: '900',
    marginTop: 4,
  },
  gradePointBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradePointText: {
    fontWeight: '900',
  },
  gradeRemarkSub: {
    fontWeight: '700',
    marginTop: -2,
  },
  gradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNum: {
    fontWeight: '800',
  },
  metricLabel: {},
  metricDivider: {
    width: 1,
    height: 24,
  },
  gradeItemCard: {
    borderWidth: 1,
  },
  gradeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gradeItemTitle: {
    fontWeight: '700',
  },
  gradeItemType: {},
  scoreBadgeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTitle: {
    fontWeight: '600',
  },
  scoreResult: {
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  modalSection: {},
  modalSectionHeading: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalPrompt: {},
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalMetaText: {
    fontWeight: '500',
  },
  attItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  attFileName: {
    flex: 1,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  feedbackTitle: {
    fontWeight: '700',
  },
  feedbackSubtitle: {},
  dropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneText: {},
  uploadedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  uploadedFileName: {
    flex: 1,
    fontWeight: '500',
  },
  pickerActionsRow: {
    flexDirection: 'row',
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: TOUCH_TARGET ?? 44,
  },
  pickerBtnText: {
    fontWeight: '600',
  },
  gradedNoticeBox: {
    alignItems: 'center',
  },
  gradedNoticeText: {
    fontWeight: '600',
  },
});
