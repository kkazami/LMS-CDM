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
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Radio,
  FileText,
  Users,
  Award,
  Megaphone,
  Clock,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileUp,
  Image as ImageIcon,
  Trash2,
  X,
  ExternalLink,
  BookOpen,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../../src/stores/auth-store';
import { useTheme } from '../../../../../src/hooks/useTheme';
import { Badge } from '../../../../../src/components/common/Badge';
import { Card } from '../../../../../src/components/common/Card';
import { Button } from '../../../../../src/components/common/Button';
import { TOUCH_TARGET } from '../../../../../src/lib/typography';
import type {
  CourseDetail,
  CourseStreamResponse,
  CourseClassworkResponse,
  ClassworkItem,
  ClassworkSubmission,
  CoursePeopleResponse,
  CourseGradesResponse,
} from '@lms/types';

type TabType = 'STREAM' | 'CLASSWORK' | 'PEOPLE' | 'GRADES';

export default function StudentCourseHubScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('STREAM');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const [courseRes, streamRes, classworkRes, peopleRes, gradesRes] = await Promise.allSettled([
        api.courses.get(courseId),
        api.courses.getStream(courseId),
        api.courses.getClasswork(courseId),
        api.courses.getPeople(courseId),
        api.courses.getGrades(courseId),
      ]);

      if (courseRes.status === 'fulfilled' && courseRes.value?.course) {
        setCourse(courseRes.value.course as CourseDetail);
      }
      if (streamRes.status === 'fulfilled') {
        setStream(streamRes.value);
      }
      if (classworkRes.status === 'fulfilled') {
        setClasswork(classworkRes.value);
      }
      if (peopleRes.status === 'fulfilled') {
        setPeople(peopleRes.value);
      }
      if (gradesRes.status === 'fulfilled') {
        setGrades(gradesRes.value);
      }
    } catch {
      // Graceful fallback
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
        } catch {
          // Fallback if direct server upload fails in dev: attach local name
          setLocalAttachments((prev) => [
            ...prev,
            { url: file.uri, fileName: file.name, type: 'FILE' },
          ]);
        } finally {
          setSubmitting(false);
        }
      }
    } catch {
      Alert.alert('File Error', 'Could not open document picker.');
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
        } catch {
          setLocalAttachments((prev) => [
            ...prev,
            { url: asset.uri, fileName, type: 'FILE' },
          ]);
        } finally {
          setSubmitting(false);
        }
      }
    } catch {
      Alert.alert('Image Error', 'Could not open photo gallery.');
    }
  };

  // Submit Assignment
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !courseId) return;

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
        localAttachments
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
      Alert.alert('Submission Failed', err?.message || 'Please try again.');
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Course Banner & Navigation Topbar */}
      <View style={[styles.headerBanner, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: theme.colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.courseMetaBadges}>
            <Badge label={course?.code || course?.courseCode || 'COURSE'} variant="primary" size="sm" />
            {course?.section && (
              <Badge label={course.section} variant="default" size="sm" />
            )}
            {course?.room && (
              <Badge label={`Rm ${course.room}`} variant="info" size="sm" />
            )}
          </View>
        </View>

        <Text style={[styles.courseTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {course?.title || 'Course Hub'}
        </Text>

        <Text style={[styles.instructorSubtitle, { color: theme.colors.textSecondary }]}>
          Instructor: {course?.instructorName || 'Faculty Instructor'}
        </Text>

        {/* 4 Segmented Navigation Tabs */}
        <View style={[styles.tabBar, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'STREAM' }}
            style={[
              styles.tabBtn,
              activeTab === 'STREAM' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('STREAM')}
          >
            <Radio size={16} color={activeTab === 'STREAM' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === 'STREAM' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'STREAM' ? '700' : '500',
                },
              ]}
            >
              Stream
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'CLASSWORK' }}
            style={[
              styles.tabBtn,
              activeTab === 'CLASSWORK' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('CLASSWORK')}
          >
            <FileText size={16} color={activeTab === 'CLASSWORK' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === 'CLASSWORK' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'CLASSWORK' ? '700' : '500',
                },
              ]}
            >
              Classwork
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'PEOPLE' }}
            style={[
              styles.tabBtn,
              activeTab === 'PEOPLE' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('PEOPLE')}
          >
            <Users size={16} color={activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'PEOPLE' ? '700' : '500',
                },
              ]}
            >
              People
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'GRADES' }}
            style={[
              styles.tabBtn,
              activeTab === 'GRADES' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('GRADES')}
          >
            <Award size={16} color={activeTab === 'GRADES' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === 'GRADES' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'GRADES' ? '700' : '500',
                },
              ]}
            >
              Grades
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Content */}
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
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* ==================== TAB 1: STREAM ==================== */}
            {activeTab === 'STREAM' && (
              <View>
                {/* Pinned Broadcast Alerts */}
                {stream?.broadcasts && stream.broadcasts.length > 0 && (
                  <View style={styles.broadcastSection}>
                    {stream.broadcasts.map((b) => (
                      <View
                        key={b.id}
                        style={[
                          styles.broadcastCard,
                          {
                            backgroundColor:
                              b.category === 'URGENT' || b.category === 'ALERT'
                                ? `${theme.colors.danger}15`
                                : `${theme.colors.warning}15`,
                            borderColor:
                              b.category === 'URGENT' || b.category === 'ALERT'
                                ? theme.colors.danger
                                : theme.colors.warning,
                          },
                        ]}
                      >
                        <View style={styles.broadcastCardTop}>
                          <Badge
                            label={b.category || 'NOTICE'}
                            variant={b.category === 'URGENT' || b.category === 'ALERT' ? 'danger' : 'warning'}
                            size="sm"
                          />
                          <Text style={[styles.broadcastTimestamp, { color: theme.colors.textSecondary }]}>
                            {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={[styles.broadcastMessage, { color: theme.colors.text }]}>
                          {b.message}
                        </Text>
                        <Text style={[styles.broadcastSender, { color: theme.colors.textSecondary }]}>
                          &bull; Broadcast by {b.senderName}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Stream Announcements Feed */}
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  Course Announcements
                </Text>

                {(!stream?.announcements || stream.announcements.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <Radio size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Stream Announcements Yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Your instructor will post course updates, reminders, and links here.
                    </Text>
                  </Card>
                ) : (
                  stream.announcements.map((ann) => (
                    <View
                      key={ann.id}
                      style={[styles.streamCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={styles.streamCardHeader}>
                        <View style={[styles.authorAvatar, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.avatarLetter}>{getInitials(ann.author?.name)}</Text>
                        </View>
                        <View style={styles.authorMeta}>
                          <Text style={[styles.authorName, { color: theme.colors.text }]}>
                            {ann.author?.name || 'Course Instructor'}
                          </Text>
                          <Text style={[styles.annTimestamp, { color: theme.colors.textSecondary }]}>
                            {new Date(ann.createdAt).toLocaleDateString()} at{' '}
                            {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.annContent, { color: theme.colors.text }]}>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
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
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => setClassworkFilter(cat)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {filteredClassworkItems.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <FileText size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Classwork Found
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      No syllabus items currently match this category filter.
                    </Text>
                  </Card>
                ) : (
                  filteredClassworkItems.map((item) => {
                    const submission = item.submission;
                    const isGraded = submission?.status === 'GRADED' || (typeof submission?.grade === 'number');
                    const isSubmitted = submission?.status === 'SUBMITTED';
                    const isMissing = !submission && item.dueDate && new Date(item.dueDate) < new Date();

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.classworkCard,
                          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        ]}
                        onPress={() => {
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
                      >
                        <View style={styles.classworkCardTop}>
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

                        <Text style={[styles.classworkTitle, { color: theme.colors.text }]}>
                          {item.title}
                        </Text>

                        {item.description ? (
                          <Text
                            style={[styles.classworkDescription, { color: theme.colors.textSecondary }]}
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                        ) : null}

                        <View style={[styles.classworkFooter, { borderTopColor: theme.colors.border }]}>
                          <View style={styles.footerInfoRow}>
                            {item.maxPoints && (
                              <Text style={[styles.ptsText, { color: theme.colors.textSecondary }]}>
                                {item.maxPoints} Points
                              </Text>
                            )}
                            {item.attachments && item.attachments.length > 0 && (
                              <View style={styles.attCount}>
                                <Paperclip size={13} color={theme.colors.textSecondary} />
                                <Text style={[styles.ptsText, { color: theme.colors.textSecondary }]}>
                                  {item.attachments.length} files
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text style={[styles.submissionActionPrompt, { color: theme.colors.primary }]}>
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
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  Course Instructor
                </Text>
                <View style={[styles.personCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.authorAvatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarLetter}>{getInitials(people?.instructor?.name)}</Text>
                  </View>
                  <View style={styles.authorMeta}>
                    <Text style={[styles.personName, { color: theme.colors.text }]}>
                      {people?.instructor?.name || 'Professor'}
                    </Text>
                    <Text style={[styles.personEmail, { color: theme.colors.textSecondary }]}>
                      {people?.instructor?.email || 'instructor@lumina.edu'}
                    </Text>
                  </View>
                  <Badge label="FACULTY" variant="primary" size="sm" />
                </View>

                {/* Classmates Section */}
                <View style={styles.classmatesHeader}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text, marginBottom: 0 }]}>
                    Classmates
                  </Text>
                  <Badge label={`${people?.totalEnrolled ?? 0} Enrolled`} variant="default" size="sm" />
                </View>

                {(!people?.students || people.students.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <Users size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Classmates Enrolled
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Class roster will update as students enroll and receive approval.
                    </Text>
                  </Card>
                ) : (
                  people.students.map((student) => (
                    <View
                      key={student.id}
                      style={[styles.personCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={[styles.studentAvatar, { backgroundColor: theme.colors.cardSecondary }]}>
                        <Text style={[styles.studentAvatarText, { color: theme.colors.text }]}>
                          {getInitials(student.name)}
                        </Text>
                      </View>
                      <View style={styles.authorMeta}>
                        <Text style={[styles.personName, { color: theme.colors.text }]}>
                          {student.name}
                        </Text>
                        <Text style={[styles.personEmail, { color: theme.colors.textSecondary }]}>
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
                <View style={[styles.courseGradeSummaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={styles.gradeSummaryTop}>
                    <View>
                      <Text style={[styles.gradeSummaryLabel, { color: theme.colors.textSecondary }]}>
                        ESTIMATED COURSE STANDING
                      </Text>
                      <Text style={[styles.courseGradePercentage, { color: theme.colors.primary }]}>
                        {grades?.summary?.averagePercentage !== null && grades?.summary?.averagePercentage !== undefined
                          ? `${grades.summary.averagePercentage}%`
                          : 'In Progress'}
                      </Text>
                    </View>
                    <View style={[styles.letterGradeBox, { backgroundColor: `${theme.colors.primary}18` }]}>
                      <Text style={[styles.letterGradeText, { color: theme.colors.primary }]}>
                        {grades?.summary?.letterGrade || '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.gradeMetricsRow, { borderTopColor: theme.colors.border }]}>
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNum, { color: theme.colors.text }]}>
                        {grades?.summary?.totalEarnedPoints ?? 0} / {grades?.summary?.totalPossiblePoints ?? 0}
                      </Text>
                      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                        Points Earned
                      </Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNum, { color: theme.colors.success }]}>
                        {grades?.summary?.gradedCount ?? 0}
                      </Text>
                      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                        Graded
                      </Text>
                    </View>
                    <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricNum, { color: theme.colors.danger }]}>
                        {grades?.summary?.missingCount ?? 0}
                      </Text>
                      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                        Missing
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Itemized Grade List */}
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  Course Assessments
                </Text>

                {(!grades?.items || grades.items.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <Award size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Evaluated Items
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Grades for assignments and quizzes in this course will be listed here.
                    </Text>
                  </Card>
                ) : (
                  grades.items.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.gradeItemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={styles.gradeItemHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.gradeItemTitle, { color: theme.colors.text }]}>
                            {item.title}
                          </Text>
                          <Text style={[styles.gradeItemType, { color: theme.colors.textSecondary }]}>
                            {item.type} {item.dueDate ? `&bull; Due ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                          </Text>
                        </View>
                        <Badge
                          label={item.status}
                          variant={item.status === 'GRADED' ? 'success' : item.status === 'MISSING' ? 'danger' : 'info'}
                          size="sm"
                        />
                      </View>

                      <View style={[styles.scoreBadgeBox, { backgroundColor: theme.colors.cardSecondary }]}>
                        <Text style={[styles.scoreTitle, { color: theme.colors.textSecondary }]}>Score</Text>
                        <Text style={[styles.scoreResult, { color: theme.colors.text }]}>
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
      </ScrollView>

      {/* ==================== SUBMISSION / ASSIGNMENT MODAL ==================== */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Badge
                  label={selectedAssignment?.type || 'ASSIGNMENT'}
                  variant="primary"
                  size="sm"
                />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {selectedAssignment?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAssignment(null)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Assignment Prompt */}
              {selectedAssignment?.description ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionHeading, { color: theme.colors.textSecondary }]}>
                    INSTRUCTIONS
                  </Text>
                  <Text style={[styles.modalPrompt, { color: theme.colors.text }]}>
                    {selectedAssignment.description}
                  </Text>
                </View>
              ) : null}

              {/* Assignment Metadata */}
              <View style={styles.modalMetaRow}>
                {selectedAssignment?.maxPoints && (
                  <View style={styles.modalMetaItem}>
                    <Award size={16} color={theme.colors.primary} />
                    <Text style={[styles.modalMetaText, { color: theme.colors.text }]}>
                      {selectedAssignment.maxPoints} Points Possible
                    </Text>
                  </View>
                )}
                {selectedAssignment?.dueDate && (
                  <View style={styles.modalMetaItem}>
                    <Clock size={16} color={theme.colors.warning} />
                    <Text style={[styles.modalMetaText, { color: theme.colors.text }]}>
                      Due: {new Date(selectedAssignment.dueDate).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Syllabus Attachments from Instructor */}
              {selectedAssignment?.attachments && selectedAssignment.attachments.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionHeading, { color: theme.colors.textSecondary }]}>
                    ATTACHED REFERENCE MATERIALS
                  </Text>
                  {selectedAssignment.attachments.map((att) => (
                    <View
                      key={att.id}
                      style={[styles.attItem, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                    >
                      <Paperclip size={16} color={theme.colors.primary} />
                      <Text style={[styles.attFileName, { color: theme.colors.text }]} numberOfLines={1}>
                        {att.fileName}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Graded Feedback if already evaluated */}
              {selectedAssignment?.submission?.grade !== null &&
                selectedAssignment?.submission?.grade !== undefined && (
                  <View style={[styles.feedbackBox, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
                    <CheckCircle2 size={24} color={theme.colors.success} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.feedbackTitle, { color: theme.colors.success }]}>
                        Submission Graded: {selectedAssignment.submission.grade} / {selectedAssignment.maxPoints}
                      </Text>
                      <Text style={[styles.feedbackSubtitle, { color: theme.colors.textSecondary }]}>
                        Returned on {selectedAssignment.submission.submittedAt ? new Date(selectedAssignment.submission.submittedAt).toLocaleDateString() : 'Official Assessment'}
                      </Text>
                    </View>
                  </View>
                )}

              {/* Student Uploads Section (if assignment can receive submission) */}
              {selectedAssignment?.type !== 'MATERIAL' && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionHeading, { color: theme.colors.textSecondary }]}>
                    YOUR SUBMISSION FILES
                  </Text>

                  {localAttachments.length === 0 ? (
                    <View style={[styles.dropZone, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}>
                      <UploadCloud size={32} color={theme.colors.textSecondary} />
                      <Text style={[styles.dropZoneText, { color: theme.colors.textSecondary }]}>
                        No files attached yet
                      </Text>
                    </View>
                  ) : (
                    localAttachments.map((file, idx) => (
                      <View
                        key={idx}
                        style={[styles.uploadedFileRow, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                      >
                        <Paperclip size={16} color={theme.colors.primary} />
                        <Text style={[styles.uploadedFileName, { color: theme.colors.text }]} numberOfLines={1}>
                          {file.fileName}
                        </Text>
                        {!selectedAssignment?.submission?.isReturned && (
                          <TouchableOpacity
                            onPress={() => {
                              setLocalAttachments((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={16} color={theme.colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}

                  {/* File Pickers (disabled if already returned/graded) */}
                  {!selectedAssignment?.submission?.isReturned && (
                    <View style={styles.pickerActionsRow}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Attach Document"
                        style={[styles.pickerBtn, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                        onPress={handlePickDocument}
                        activeOpacity={0.8}
                      >
                        <FileUp size={18} color={theme.colors.primary} />
                        <Text style={[styles.pickerBtnText, { color: theme.colors.text }]}>Add Document</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Attach Photo"
                        style={[styles.pickerBtn, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                        onPress={handlePickImage}
                        activeOpacity={0.8}
                      >
                        <ImageIcon size={18} color={theme.colors.primary} />
                        <Text style={[styles.pickerBtnText, { color: theme.colors.text }]}>Add Photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Turn In / Unsubmit Bottom Actions */}
            {selectedAssignment?.type !== 'MATERIAL' && (
              <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
                {selectedAssignment?.submission?.status === 'SUBMITTED' && !selectedAssignment.submission.isReturned ? (
                  <Button
                    title="Unsubmit Assignment"
                    onPress={handleUnsubmitAssignment}
                    loading={submitting}
                    variant="outline"
                    style={{ flex: 1 }}
                  />
                ) : selectedAssignment?.submission?.isReturned ? (
                  <View style={styles.gradedNoticeBox}>
                    <Text style={[styles.gradedNoticeText, { color: theme.colors.success }]}>
                      Assignment has been officially finalized.
                    </Text>
                  </View>
                ) : (
                  <Button
                    title={localAttachments.length > 0 ? 'Turn In Assignment' : 'Mark as Done'}
                    onPress={handleSubmitAssignment}
                    loading={submitting}
                    icon={CheckCircle2}
                    style={{ flex: 1, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }}
                  />
                )}
              </View>
            )}
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
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseMetaBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  instructorSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    minHeight: TOUCH_TARGET,
  },
  tabLabel: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  broadcastSection: {
    marginBottom: 16,
  },
  broadcastCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  broadcastCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  broadcastTimestamp: {
    fontSize: 11,
  },
  broadcastMessage: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  broadcastSender: {
    fontSize: 11,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  streamCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  streamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    color: '#FFFFFF',
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
  annTimestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  annContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterScrollView: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
    fontSize: 12,
  },
  classworkCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  classworkCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  classworkDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  classworkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ptsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  attCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  submissionActionPrompt: {
    fontSize: 12,
    fontWeight: '700',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
  },
  personEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  classmatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  courseGradeSummaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  gradeSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gradeSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  courseGradePercentage: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  letterGradeBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterGradeText: {
    fontSize: 28,
    fontWeight: '900',
  },
  gradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  gradeItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  gradeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gradeItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gradeItemType: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreBadgeBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreResult: {
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modalSection: {
    marginBottom: 18,
  },
  modalSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalPrompt: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  attItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  attFileName: {
    fontSize: 13,
    flex: 1,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  dropZone: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropZoneText: {
    fontSize: 13,
    marginTop: 6,
  },
  uploadedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  uploadedFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: TOUCH_TARGET,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  gradedNoticeBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  gradedNoticeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
