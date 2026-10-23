import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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
  PlusCircle,
  Send,
  Paperclip,
  CheckCircle2,
  XCircle,
  FileUp,
  UserCheck,
  UserX,
  X,
  Check,
  Calendar,
  AlertTriangle,
  BookOpen,
  Pencil,
  Trash2,
  Megaphone,
  ClipboardList,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../../src/stores/auth-store';
import { useTheme } from '../../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../../src/hooks/useResponsive';
import { ScreenWrapper, ScreenHeaderContainer } from '../../../../../src/components/common/ScreenWrapper';
import { Badge } from '../../../../../src/components/common/Badge';
import { Card } from '../../../../../src/components/common/Card';
import { Button } from '../../../../../src/components/common/Button';
import { Input } from '../../../../../src/components/common/Input';
import { TOUCH_TARGET } from '../../../../../src/lib/typography';
import { isIteUser } from '../../../../../src/lib/ite-eligibility';
import { ClassworkAttachments, ClassworkDescription } from '../../../../../src/components/classwork/ClassworkAttachments';
import type {
  CourseDetail,
  CourseStreamResponse,
  CourseClassworkResponse,
  ClassworkItem,
  CoursePeopleResponse,
  CreateClassworkInput,
  GradeSubmissionInput,
} from '@lms/types';
import type {
  CourseBroadcastItem,
  CourseFormItem,
  FormAttemptItem,
  CourseParticipationDetailResponse,
} from '@lms/api-client';

type TeacherTab = 'STREAM' | 'CLASSWORK' | 'BROADCAST' | 'FORMS' | 'GRADEBOOK' | 'PEOPLE' | 'PARTICIPATION';

interface GradebookData {
  course: { id: string; title: string; code: string };
  students: Array<{ id: string; name: string; email: string; studentNumber?: string | null }>;
  assignments: Array<{ id: string; title: string; maxPoints: number | null; type: string; dueDate?: string | null }>;
  grades: Record<string, Record<string, { submissionId: string | null; grade: number | null; status: string | null; isReturned: boolean; submittedAt: string | null; attachments: any[] }>>;
}

export default function TeacherCourseDetailScreen() {
  const { courseId, initialTab } = useLocalSearchParams<{ courseId: string; initialTab?: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, bottomClearance } = useResponsive();

  const [activeTab, setActiveTab] = useState<TeacherTab>(
    (initialTab as TeacherTab) || 'STREAM'
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [stream, setStream] = useState<CourseStreamResponse | null>(null);
  const [classwork, setClasswork] = useState<CourseClassworkResponse | null>(null);
  const [people, setPeople] = useState<CoursePeopleResponse | null>(null);
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);

  // Announcement Composer state
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Edit Announcement Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editAnnouncementContent, setEditAnnouncementContent] = useState('');
  const [savingEditAnnouncement, setSavingEditAnnouncement] = useState(false);

  // Create Classwork Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classworkType, setClassworkType] = useState<'ASSIGNMENT' | 'QUIZ' | 'MATERIAL'>('ASSIGNMENT');
  const [cwTitle, setCwTitle] = useState('');
  const [cwDescription, setCwDescription] = useState('');
  const [cwMaxPoints, setCwMaxPoints] = useState('100');
  const [cwDueDate, setCwDueDate] = useState('');
  const [cwAttachments, setCwAttachments] = useState<Array<{ url: string; fileName: string; type: string }>>([]);
  const [savingClasswork, setSavingClasswork] = useState(false);

  // Grading Drawer Modal state
  const [gradingModalVisible, setGradingModalVisible] = useState(false);
  const [gradingStudent, setGradingStudent] = useState<{ id: string; name: string; studentNumber?: string | null } | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<{ id: string; title: string; maxPoints: number | null } | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<{ submissionId: string | null; grade: number | null; status: string | null; isReturned: boolean; submittedAt: string | null; attachments: any[] } | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<CourseBroadcastItem[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastMsgInput, setBroadcastMsgInput] = useState('');
  const [broadcastCategoryInput, setBroadcastCategoryInput] = useState<'GENERAL' | 'URGENT' | 'REMINDER'>('GENERAL');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Forms & Responses state
  const [formsList, setFormsList] = useState<CourseFormItem[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<CourseFormItem | null>(null);
  const [formResponses, setFormResponses] = useState<FormAttemptItem[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [responsesModalVisible, setResponsesModalVisible] = useState(false);

  // ITE Participation state (strictly ITE only)
  const isIte = isIteUser(user);
  const [participationData, setParticipationData] = useState<CourseParticipationDetailResponse | null>(null);
  const [loadingParticipation, setLoadingParticipation] = useState(false);
  const [participationError, setParticipationError] = useState<string | null>(null);

  const fetchBroadcasts = async () => {
    if (!courseId) return;
    setLoadingBroadcasts(true);
    setBroadcastError(null);
    try {
      const res = await api.broadcasts.list(courseId);
      setBroadcasts(res.broadcasts || []);
    } catch {
      setBroadcastError('Failed to load course broadcasts. Please try again.');
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!courseId || !broadcastMsgInput.trim()) return;
    setSendingBroadcast(true);
    try {
      await api.broadcasts.create(courseId, {
        message: broadcastMsgInput.trim(),
        category: broadcastCategoryInput,
      });
      setBroadcastModalVisible(false);
      setBroadcastMsgInput('');
      try {
        Burnt.toast({
          title: 'Broadcast Sent',
          message: 'Alert dispatched to all enrolled students.',
          preset: 'done',
        });
      } catch {}
      await fetchBroadcasts();
    } catch (err: any) {
      Alert.alert('Broadcast Error', err?.message || 'Could not send broadcast alert.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = (broadcastId: string) => {
    if (!courseId) return;
    Alert.alert(
      'Remove Broadcast',
      'Are you sure you want to delete this broadcast alert from the course feed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.broadcasts.delete(courseId, broadcastId);
              try {
                Burnt.toast({
                  title: 'Broadcast Removed',
                  preset: 'done',
                });
              } catch {}
              setBroadcasts((prev) => prev.filter((b) => b.id !== broadcastId));
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete broadcast.');
            }
          },
        },
      ]
    );
  };

  const fetchForms = async () => {
    if (!courseId) return;
    setLoadingForms(true);
    setFormsError(null);
    try {
      const res = await api.forms.list(courseId);
      setFormsList(res.forms || []);
    } catch {
      setFormsError('Failed to load course forms and quizzes. Please try again.');
    } finally {
      setLoadingForms(false);
    }
  };

  const handleOpenFormResponses = async (item: CourseFormItem) => {
    if (!courseId) return;
    setSelectedFormForResponses(item);
    setResponsesModalVisible(true);
    setLoadingResponses(true);
    setResponsesError(null);
    try {
      const res = await api.forms.getResponses(courseId, item.id);
      setFormResponses(res.attempts || []);
    } catch {
      setResponsesError('Could not load student responses. Please retry.');
    } finally {
      setLoadingResponses(false);
    }
  };

  const fetchParticipation = async () => {
    if (!courseId || !isIte) return;
    setLoadingParticipation(true);
    setParticipationError(null);
    try {
      const res = await api.ite.getCourseParticipation(courseId);
      setParticipationData(res);
    } catch {
      // User-friendly message, never raw database text
      setParticipationError('Participation analytics unavailable. Check permissions or try again later.');
    } finally {
      setLoadingParticipation(false);
    }
  };

  const loadData = async () => {
    if (!courseId) return;

    try {
      const [courseRes, streamRes, classworkRes, peopleRes, gradebookRes, enrollmentsRes] = await Promise.allSettled([
        api.courses.get(courseId),
        api.courses.getStream(courseId),
        api.courses.getClasswork(courseId),
        api.courses.getPeople(courseId),
        api.courses.getGradebook(courseId),
        api.courses.getEnrollments(courseId, 'PENDING'),
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
      if (gradebookRes.status === 'fulfilled') {
        setGradebook(gradebookRes.value as GradebookData);
      }
      if (enrollmentsRes.status === 'fulfilled') {
        setPendingEnrollments(enrollmentsRes.value?.enrollments || []);
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
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'BROADCAST' && broadcasts.length === 0 && !loadingBroadcasts) {
      fetchBroadcasts();
    } else if (activeTab === 'FORMS' && formsList.length === 0 && !loadingForms) {
      fetchForms();
    } else if (activeTab === 'PARTICIPATION' && isIte && !participationData && !loadingParticipation) {
      fetchParticipation();
    }
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    if (activeTab === 'BROADCAST') fetchBroadcasts();
    if (activeTab === 'FORMS') fetchForms();
    if (activeTab === 'PARTICIPATION' && isIte) fetchParticipation();
  };

  // Post Stream Announcement
  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim() || !courseId) return;

    setPostingAnnouncement(true);
    try {
      await api.courses.postStream(courseId, newAnnouncement.trim());
      setNewAnnouncement('');
      try {
        Burnt.toast({
          title: 'Announcement Published',
          message: 'Visible on class stream.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }
      // Refresh stream
      const s = await api.courses.getStream(courseId);
      setStream(s);
    } catch (err: any) {
      Alert.alert('Post Error', err?.message || 'Could not post announcement.');
    } finally {
      setPostingAnnouncement(false);
    }
  };

  // Open Edit Announcement Modal
  const handleOpenEditAnnouncement = (ann: { id: string; content: string }) => {
    setEditingAnnouncementId(ann.id);
    setEditAnnouncementContent(ann.content);
    setEditModalVisible(true);
  };

  // Save Announcement Edits
  const handleSaveEditAnnouncement = async () => {
    if (!editingAnnouncementId || !editAnnouncementContent.trim() || !courseId) return;

    setSavingEditAnnouncement(true);
    try {
      await api.courses.updateStream(courseId, editingAnnouncementId, editAnnouncementContent.trim());
      try {
        Burnt.toast({
          title: 'Announcement Updated',
          message: 'Changes saved to class stream.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }
      setEditModalVisible(false);
      setEditingAnnouncementId(null);
      setEditAnnouncementContent('');
      // Refresh stream
      const s = await api.courses.getStream(courseId);
      setStream(s);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update announcement.');
    } finally {
      setSavingEditAnnouncement(false);
    }
  };

  // Delete Announcement with Native Confirmation
  const handleDeleteAnnouncement = (ann: { id: string; content: string }) => {
    if (!courseId) return;

    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.courses.deleteStream(courseId, ann.id);
              try {
                Burnt.toast({
                  title: 'Announcement Deleted',
                  message: 'Removed from class stream.',
                  preset: 'done',
                });
              } catch {
                // Fallback
              }
              // Refresh stream
              const s = await api.courses.getStream(courseId);
              setStream(s);
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete announcement.');
            }
          },
        },
      ]
    );
  };

  // Attach Document for New Classwork
  const handleAttachDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        try {
          const uploadRes = await api.upload.file(file.uri, file.name, file.mimeType || 'application/octet-stream');
          setCwAttachments((prev) => [
            ...prev,
            { url: uploadRes.url, fileName: uploadRes.fileName, type: 'FILE' },
          ]);
        } catch {
          setCwAttachments((prev) => [
            ...prev,
            { url: file.uri, fileName: file.name, type: 'FILE' },
          ]);
        }
      }
    } catch {
      Alert.alert('File Error', 'Could not open file picker.');
    }
  };

  // Save New Classwork
  const handleCreateClasswork = async () => {
    if (!cwTitle.trim() || !courseId) {
      Alert.alert('Title Required', 'Please provide a title for this classwork item.');
      return;
    }

    setSavingClasswork(true);
    try {
      const primaryAtt = cwAttachments[0];
      await api.courses.createClasswork(courseId, {
        title: cwTitle.trim(),
        description: cwDescription.trim(),
        type: classworkType,
        maxPoints: classworkType !== 'MATERIAL' ? parseInt(cwMaxPoints, 10) || 100 : null,
        dueDate: cwDueDate ? new Date(cwDueDate).toISOString() : null,
        attachmentUrl: primaryAtt?.url,
        attachmentName: primaryAtt?.fileName,
      });

      try {
        Burnt.toast({
          title: 'Classwork Created',
          message: 'Enrolled students have been notified.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setShowCreateModal(false);
      setCwTitle('');
      setCwDescription('');
      setCwDueDate('');
      setCwAttachments([]);
      loadData();
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Could not create classwork.');
    } finally {
      setSavingClasswork(false);
    }
  };

  // Open Grading Drawer
  const openGradingDrawer = (student: any, assignment: any) => {
    const studentGrades = gradebook?.grades?.[student.id] || {};
    const sub = studentGrades[assignment.id] || null;

    setGradingStudent(student);
    setGradingAssignment(assignment);
    setActiveSubmission(sub);
    setGradeInput(sub?.grade !== null && sub?.grade !== undefined ? String(sub.grade) : '');
    setFeedbackInput('');
    setGradingModalVisible(true);
  };

  // Submit Grade
  const handleSaveGrade = async () => {
    if (!courseId || !activeSubmission?.submissionId) {
      Alert.alert('No Submission', 'Student has not submitted work for this item yet.');
      return;
    }

    const numericGrade = parseFloat(gradeInput);
    if (isNaN(numericGrade) || numericGrade < 0) {
      Alert.alert('Invalid Grade', 'Please enter a valid numeric score.');
      return;
    }

    const maxPts = gradingAssignment?.maxPoints ?? 100;
    if (numericGrade > maxPts) {
      Alert.alert('Score Exceeds Max', `Score cannot exceed maximum points (${maxPts}).`);
      return;
    }

    setSubmittingGrade(true);
    try {
      await api.courses.gradeSubmission(courseId, {
        submissionId: activeSubmission.submissionId,
        grade: numericGrade,
        feedback: feedbackInput.trim() || undefined,
      });

      try {
        Burnt.toast({
          title: 'Grade Recorded & Returned',
          message: `${gradingStudent?.name} has been notified.`,
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setGradingModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Grading Error', err?.message || 'Failed to submit grade.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Approve / Reject Enrollment
  const handleEnrollmentAction = async (enrollmentId: string, action: 'APPROVE' | 'REJECT') => {
    if (!courseId) return;

    try {
      await api.courses.updateEnrollment(courseId, enrollmentId, action);
      try {
        Burnt.toast({
          title: action === 'APPROVE' ? 'Student Approved' : 'Request Rejected',
          preset: 'done',
        });
      } catch {
        // Fallback
      }
      setPendingEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      loadData();
    } catch (err: any) {
      Alert.alert('Action Error', err?.message || 'Could not update enrollment request.');
    }
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

  return (
    <ScreenWrapper>
      {/* Top Banner & Header Container with Safe Area Inset */}
      <ScreenHeaderContainer
        style={[
          styles.headerBanner,
          {
            paddingHorizontal: s(16),
            paddingBottom: 0,
          },
        ]}
      >
        <View style={[styles.headerTopRow, { marginBottom: s(6) }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                borderColor: theme.colors.border,
                width: s(32),
                height: s(32),
                borderRadius: s(16),
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={s(17)} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={[styles.headerBadges, { gap: s(5) }]}>
            <Badge label={course?.code || course?.courseCode || 'COURSE'} variant="primary" size="sm" />
            {course?.section && (
              <Badge label={course.section} variant="default" size="sm" />
            )}
            {pendingEnrollments.length > 0 && (
              <Badge label={`${pendingEnrollments.length} Pending`} variant="warning" size="sm" />
            )}
          </View>
        </View>

        <Text
          style={[styles.courseTitle, { color: theme.colors.text, fontSize: font(18.5), marginBottom: s(2) }]}
          numberOfLines={2}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {course?.title || 'Class Management Hub'}
        </Text>

        <Text
          style={[styles.courseSubtitle, { color: theme.colors.textSecondary, fontSize: font(11.5), marginBottom: s(8) }]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          numberOfLines={1}
        >
          Faculty: {course?.instructorName || user?.name} &bull; {people?.totalEnrolled ?? 0} Students Enrolled
        </Text>

        {/* Faculty Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabBarScroll, { borderTopColor: theme.colors.border }]}
        >
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'STREAM' }}
            style={[
              styles.tabBtn,
              { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
              activeTab === 'STREAM' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('STREAM')}
          >
            <Radio size={s(14)} color={activeTab === 'STREAM' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: font(11.5),
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
            style={[
              styles.tabBtn,
              { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
              activeTab === 'CLASSWORK' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('CLASSWORK')}
          >
            <FileText size={s(14)} color={activeTab === 'CLASSWORK' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: font(11.5),
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
            accessibilityState={{ selected: activeTab === 'BROADCAST' }}
            style={[
              styles.tabBtn,
              { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
              activeTab === 'BROADCAST' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('BROADCAST')}
          >
            <Megaphone size={s(14)} color={activeTab === 'BROADCAST' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: font(11.5),
                  color: activeTab === 'BROADCAST' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'BROADCAST' ? '700' : '500',
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Broadcast
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'FORMS' }}
            style={[
              styles.tabBtn,
              { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
              activeTab === 'FORMS' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('FORMS')}
          >
            <ClipboardList size={s(14)} color={activeTab === 'FORMS' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: font(11.5),
                  color: activeTab === 'FORMS' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'FORMS' ? '700' : '500',
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Forms & Quizzes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'GRADEBOOK' }}
            style={[
              styles.tabBtn,
              { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
              activeTab === 'GRADEBOOK' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('GRADEBOOK')}
          >
            <Award size={s(14)} color={activeTab === 'GRADEBOOK' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: font(11.5),
                  color: activeTab === 'GRADEBOOK' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'GRADEBOOK' ? '700' : '500',
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Gradebook
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'PEOPLE' }}
            style={[
              styles.tabBtn,
              { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
              activeTab === 'PEOPLE' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('PEOPLE')}
          >
            <Users size={s(14)} color={activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                {
                  fontSize: font(11.5),
                  color: activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'PEOPLE' ? '700' : '500',
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Roster
            </Text>
          </TouchableOpacity>

          {isIte && (
            <TouchableOpacity
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'PARTICIPATION' }}
              style={[
                styles.tabBtn,
                { paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(36) },
                activeTab === 'PARTICIPATION' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab('PARTICIPATION')}
            >
              <Activity size={s(14)} color={activeTab === 'PARTICIPATION' ? theme.colors.primary : theme.colors.textSecondary} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    fontSize: font(11.5),
                    color: activeTab === 'PARTICIPATION' ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: activeTab === 'PARTICIPATION' ? '700' : '500',
                  },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Participation
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ScreenHeaderContainer>

      {/* Main Tab Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            padding: s(13),
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
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* ==================== TAB 1: STREAM ==================== */}
            {activeTab === 'STREAM' && (
              <View>
                {/* Post Announcement Card */}
                <View style={[styles.postCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                    Publish Class Announcement
                  </Text>
                  <TextInput
                    style={[
                      styles.postInput,
                      {
                        backgroundColor: theme.colors.cardSecondary,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    placeholder="Share reminders, assignments, or links with your students..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newAnnouncement}
                    onChangeText={setNewAnnouncement}
                  />
                  <View style={styles.postActions}>
                    <Button
                      title="Post Announcement"
                      onPress={handlePostAnnouncement}
                      loading={postingAnnouncement}
                      disabled={!newAnnouncement.trim()}
                      icon={Send}
                      style={{ borderRadius: 10, minHeight: 40 }}
                    />
                  </View>
                </View>

                {/* Announcements Feed */}
                <Text style={[styles.sectionHeading, { color: theme.colors.text, marginTop: 10 }]}>
                  Recent Stream Posts
                </Text>

                {(!stream?.announcements || stream.announcements.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <Radio size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Stream Announcements
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Post an update above to communicate with your students.
                    </Text>
                  </Card>
                ) : (
                  stream.announcements.map((ann) => {
                    const canManage =
                      user?.role?.toUpperCase() === 'ADMIN' ||
                      user?.id === ann.author?.id ||
                      (course as any)?.instructor?.id === user?.id ||
                      (course as any)?.instructorId === user?.id;

                    return (
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
                              {ann.author?.name}
                            </Text>
                            <Text style={[styles.annTimestamp, { color: theme.colors.textSecondary }]}>
                              {new Date(ann.createdAt).toLocaleDateString()} at{' '}
                              {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                          {canManage && (
                            <View style={styles.annActions}>
                              <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Edit announcement"
                                onPress={() => handleOpenEditAnnouncement(ann)}
                                style={[styles.annActionBtn, { borderColor: theme.colors.border }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Pencil size={14} color={theme.colors.textSecondary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Delete announcement"
                                onPress={() => handleDeleteAnnouncement(ann)}
                                style={[styles.annActionBtn, { borderColor: theme.colors.border }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Trash2 size={14} color={theme.colors.danger} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.annContent, { color: theme.colors.text }]}>
                          {ann.content}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ==================== TAB 2: CLASSWORK ==================== */}
            {activeTab === 'CLASSWORK' && (
              <View>
                {/* Create Classwork Trigger Button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Create Classwork"
                  style={[styles.createTriggerBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowCreateModal(true)}
                  activeOpacity={0.85}
                >
                  <PlusCircle size={20} color="#FFFFFF" />
                  <Text style={styles.createTriggerText}>Create Syllabus Classwork</Text>
                </TouchableOpacity>

                <Text style={[styles.sectionHeading, { color: theme.colors.text, marginTop: 10 }]}>
                  Curriculum Items
                </Text>

                {(!classwork?.items || classwork.items.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <FileText size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Classwork Modules Yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Tap "Create Syllabus Classwork" above to post assignments or learning resources.
                    </Text>
                  </Card>
                ) : (
                  classwork.items.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.cwCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={styles.cwTop}>
                        <Badge
                          label={item.type}
                          variant={item.type === 'ASSIGNMENT' ? 'primary' : item.type === 'QUIZ' ? 'warning' : 'info'}
                          size="sm"
                        />
                        {item.maxPoints && (
                          <Text style={[styles.cwPointsText, { color: theme.colors.textSecondary }]}>
                            {item.maxPoints} pts
                          </Text>
                        )}
                      </View>

                      <Text style={[styles.cwTitle, { color: theme.colors.text }]}>
                        {item.title}
                      </Text>

                      {item.description ? (
                        <ClassworkDescription
                          content={item.description}
                          numberOfLines={2}
                          textStyle={[styles.cwDesc, { color: theme.colors.textSecondary }]}
                        />
                      ) : null}

                      {Boolean(item.attachments && item.attachments.length > 0) && (
                        <ClassworkAttachments
                          attachments={item.attachments}
                          title="ATTACHED RESOURCES"
                          style={{ marginTop: 8 }}
                        />
                      )}

                      <View style={[styles.cwFooter, { borderTopColor: theme.colors.border }]}>
                        <Text style={[styles.cwDueDate, { color: theme.colors.textSecondary }]}>
                          {item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : 'No deadline'}
                        </Text>

                        {item.type !== 'MATERIAL' && (
                          <TouchableOpacity
                            onPress={() => setActiveTab('GRADEBOOK')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={[styles.gradeActionLink, { color: theme.colors.primary }]}>
                              View Submissions &rarr;
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 3: GRADEBOOK ==================== */}
            {activeTab === 'GRADEBOOK' && (
              <View>
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  Class Evaluation Matrix
                </Text>

                {(!gradebook?.assignments || gradebook.assignments.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <Award size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Graded Assignments
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Add assignments in the Classwork tab to open the grading queue.
                    </Text>
                  </Card>
                ) : (
                  gradebook.assignments.map((assignment) => (
                    <View
                      key={assignment.id}
                      style={[styles.gradebookSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={styles.gbHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.gbAssignmentTitle, { color: theme.colors.text }]}>
                            {assignment.title}
                          </Text>
                          <Text style={[styles.gbMaxPoints, { color: theme.colors.textSecondary }]}>
                            Max Points: {assignment.maxPoints ?? 100} &bull; {assignment.type}
                          </Text>
                        </View>
                        <Badge label="GRADABLE" variant="primary" size="sm" />
                      </View>

                      {/* Students List for this assignment */}
                      {(!gradebook.students || gradebook.students.length === 0) ? (
                        <Text style={[styles.noStudentsText, { color: theme.colors.textSecondary }]}>
                          No enrolled students in this course roster.
                        </Text>
                      ) : (
                        gradebook.students.map((student) => {
                          const sub = gradebook.grades?.[student.id]?.[assignment.id];
                          const hasSub = !!sub?.submissionId;
                          const isGraded = sub?.grade !== null && sub?.grade !== undefined;

                          return (
                            <TouchableOpacity
                              key={student.id}
                              style={[styles.studentGradeRow, { borderTopColor: theme.colors.border }]}
                              onPress={() => openGradingDrawer(student, assignment)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.studentInfoCol}>
                                <Text style={[styles.studentRowName, { color: theme.colors.text }]}>
                                  {student.name}
                                </Text>
                                <Text style={[styles.studentRowId, { color: theme.colors.textSecondary }]}>
                                  {student.studentNumber || student.email}
                                </Text>
                              </View>

                              <View style={styles.gradeStatusCol}>
                                {isGraded ? (
                                  <Badge
                                    label={`Score: ${sub.grade}/${assignment.maxPoints ?? 100}`}
                                    variant="success"
                                    size="sm"
                                  />
                                ) : hasSub ? (
                                  <Badge label="Needs Grading" variant="warning" size="sm" />
                                ) : (
                                  <Badge label="Missing" variant="danger" size="sm" />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 4: PEOPLE & ENROLLMENTS ==================== */}
            {activeTab === 'PEOPLE' && (
              <View>
                {/* Pending Requests Section */}
                {pendingEnrollments.length > 0 && (
                  <View style={styles.pendingSection}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.warning }]}>
                      Pending Enrollment Approvals ({pendingEnrollments.length})
                    </Text>
                    {pendingEnrollments.map((enr) => (
                      <View
                        key={enr.id}
                        style={[styles.pendingCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.warning }]}
                      >
                        <View style={styles.pendingInfo}>
                          <Text style={[styles.pendingName, { color: theme.colors.text }]}>
                            {enr.student?.name || 'Student Applicant'}
                          </Text>
                          <Text style={[styles.pendingSub, { color: theme.colors.textSecondary }]}>
                            {enr.student?.studentNumber || enr.student?.email}
                          </Text>
                        </View>
                        <View style={styles.pendingActions}>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Approve"
                            style={[styles.actionIconBtn, { backgroundColor: `${theme.colors.success}20`, borderColor: theme.colors.success }]}
                            onPress={() => handleEnrollmentAction(enr.id, 'APPROVE')}
                          >
                            <Check size={18} color={theme.colors.success} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Reject"
                            style={[styles.actionIconBtn, { backgroundColor: `${theme.colors.danger}20`, borderColor: theme.colors.danger }]}
                            onPress={() => handleEnrollmentAction(enr.id, 'REJECT')}
                          >
                            <X size={18} color={theme.colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Enrolled Roster */}
                <View style={styles.rosterHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text, marginBottom: 0 }]}>
                    Enrolled Students
                  </Text>
                  <Badge label={`${people?.totalEnrolled ?? 0} Enrolled`} variant="primary" size="sm" />
                </View>

                {(!people?.students || people.students.length === 0) ? (
                  <Card style={styles.emptyCard}>
                    <Users size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Enrolled Students
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Students who enroll will appear here once approved.
                    </Text>
                  </Card>
                ) : (
                  people.students.map((st) => (
                    <View
                      key={st.id}
                      style={[styles.rosterCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={[styles.authorAvatar, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarLetter}>{getInitials(st.name)}</Text>
                      </View>
                      <View style={styles.authorMeta}>
                        <Text style={[styles.authorName, { color: theme.colors.text }]}>
                          {st.name}
                        </Text>
                        <Text style={[styles.annTimestamp, { color: theme.colors.textSecondary }]}>
                          {st.studentNumber !== 'N/A' ? st.studentNumber : st.email}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 5: BROADCAST ALERTS ==================== */}
            {activeTab === 'BROADCAST' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.text, marginBottom: 2 }]}>
                      Class Broadcast Alerts
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                      High-priority push notifications and announcements
                    </Text>
                  </View>
                  <Button
                    title="Send Alert"
                    icon={PlusCircle}
                    onPress={() => setBroadcastModalVisible(true)}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 32 }}
                  />
                </View>

                {loadingBroadcasts ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                      Loading class broadcasts...
                    </Text>
                  </View>
                ) : broadcastError ? (
                  <Card style={[styles.errorCard, { borderColor: theme.colors.danger }]}>
                    <AlertTriangle size={24} color={theme.colors.danger} />
                    <Text style={[styles.errorCardText, { color: theme.colors.text }]}>
                      {broadcastError}
                    </Text>
                    <Button
                      title="Retry"
                      variant="outline"
                      icon={RefreshCw}
                      onPress={fetchBroadcasts}
                      style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, minHeight: 32 }}
                    />
                  </Card>
                ) : broadcasts.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Megaphone size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Active Broadcasts
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Tap "Send Alert" above to dispatch reminders or urgent updates to all enrolled students.
                    </Text>
                  </Card>
                ) : (
                  broadcasts.map((item) => {
                    const catVariant =
                      item.category === 'URGENT' ? 'danger' : item.category === 'REMINDER' ? 'warning' : 'primary';
                    return (
                      <View
                        key={item.id}
                        style={[styles.streamCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      >
                        <View style={styles.streamCardHeader}>
                          <Badge label={item.category} variant={catVariant} size="sm" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.annTimestamp, { color: theme.colors.textSecondary }]}>
                              {new Date(item.createdAt).toLocaleDateString()} at{' '}
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Delete broadcast alert"
                            onPress={() => handleDeleteBroadcast(item.id)}
                            style={[styles.annActionBtn, { borderColor: theme.colors.border }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={14} color={theme.colors.danger} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.annContent, { color: theme.colors.text, marginTop: 8 }]}>
                          {item.message}
                        </Text>
                        <View style={[styles.broadcastMetaRow, { borderTopColor: theme.colors.border }]}>
                          <Text style={[styles.broadcastMetaText, { color: theme.colors.textSecondary }]}>
                            Sender: {item.senderName || 'Course Instructor'}
                          </Text>
                          {item.scopeLabel ? (
                            <Text style={[styles.broadcastMetaText, { color: theme.colors.textSecondary }]}>
                              Target: {item.scopeLabel}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ==================== TAB 6: FORMS & QUIZZES (VIEW-ONLY) ==================== */}
            {activeTab === 'FORMS' && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.text, marginBottom: 2 }]}>
                      Forms & Quiz Responses
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                      View student attempt scores and submissions (view-only on mobile)
                    </Text>
                  </View>
                  <Badge label={`${formsList.length} Forms`} variant="default" size="sm" />
                </View>

                {loadingForms ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                      Loading course forms...
                    </Text>
                  </View>
                ) : formsError ? (
                  <Card style={[styles.errorCard, { borderColor: theme.colors.danger }]}>
                    <AlertTriangle size={24} color={theme.colors.danger} />
                    <Text style={[styles.errorCardText, { color: theme.colors.text }]}>
                      {formsError}
                    </Text>
                    <Button
                      title="Retry"
                      variant="outline"
                      icon={RefreshCw}
                      onPress={fetchForms}
                      style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, minHeight: 32 }}
                    />
                  </Card>
                ) : formsList.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <ClipboardList size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Forms or Quizzes
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Forms published on the web will appear here. Build quizzes using the web Form Builder.
                    </Text>
                  </Card>
                ) : (
                  formsList.map((form) => {
                    const attemptsCount = form._count?.attempts ?? 0;
                    return (
                      <View
                        key={form.id}
                        style={[styles.cwCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      >
                        <View style={styles.cwTop}>
                          <Badge
                            label={form.status || 'PUBLISHED'}
                            variant={form.status === 'PUBLISHED' ? 'success' : form.status === 'CLOSED' ? 'danger' : 'default'}
                            size="sm"
                          />
                          <Text style={[styles.cwPointsText, { color: theme.colors.textSecondary }]}>
                            {form._count?.questions ?? 0} Questions
                            {form.timeLimitMinutes ? ` · ${form.timeLimitMinutes} mins` : ''}
                          </Text>
                        </View>

                        <Text style={[styles.cwTitle, { color: theme.colors.text }]}>
                          {form.title}
                        </Text>

                        {form.description ? (
                          <Text style={[styles.cwDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {form.description}
                          </Text>
                        ) : null}

                        <View style={[styles.cwFooter, { borderTopColor: theme.colors.border }]}>
                          <Text style={[styles.cwDueDate, { color: theme.colors.textSecondary }]}>
                            {attemptsCount} submission{attemptsCount === 1 ? '' : 's'} recorded
                          </Text>

                          <TouchableOpacity
                            onPress={() => handleOpenFormResponses(form)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={[styles.gradeActionLink, { color: theme.colors.primary }]}>
                              View Responses &rarr;
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ==================== TAB 7: ITE PARTICIPATION & RISK (VIEW-ONLY) ==================== */}
            {activeTab === 'PARTICIPATION' && isIte && (
              <View>
                <View style={styles.tabHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.sectionHeading, { color: theme.colors.text, marginBottom: 2 }]}>
                      Participation & Risk Monitoring
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                      Student engagement analytics & at-risk cohort alerts (view-only)
                    </Text>
                  </View>
                  <Badge label="ITE Analytics" variant="primary" size="sm" />
                </View>

                {loadingParticipation ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                      Analyzing student participation metrics...
                    </Text>
                  </View>
                ) : participationError ? (
                  <Card style={[styles.errorCard, { borderColor: theme.colors.danger }]}>
                    <AlertTriangle size={24} color={theme.colors.danger} />
                    <Text style={[styles.errorCardText, { color: theme.colors.text }]}>
                      {participationError}
                    </Text>
                    <Button
                      title="Retry"
                      variant="outline"
                      icon={RefreshCw}
                      onPress={fetchParticipation}
                      style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, minHeight: 32 }}
                    />
                  </Card>
                ) : !participationData ? (
                  <Card style={styles.emptyCard}>
                    <Activity size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                      No Participation Data Available
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                      Class activity and engagement statistics will show up once students begin working on assignments.
                    </Text>
                  </Card>
                ) : (
                  <>
                    {/* KPI Cards Row */}
                    <View style={styles.kpiRow}>
                      <View style={[styles.kpiCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>
                          {participationData.kpis.activeThisWeek}
                        </Text>
                        <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                          Active This Week
                        </Text>
                      </View>
                      <View style={[styles.kpiCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.kpiValue, { color: theme.colors.success }]}>
                          {Math.round(participationData.kpis.avgEngagement)}%
                        </Text>
                        <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                          Avg Engagement
                        </Text>
                      </View>
                      <View style={[styles.kpiCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.kpiValue, { color: participationData.kpis.highCount > 0 ? theme.colors.danger : theme.colors.textSecondary }]}>
                          {participationData.kpis.highCount} High &bull; {participationData.kpis.mediumCount} Med
                        </Text>
                        <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>
                          At-Risk Students
                        </Text>
                      </View>
                    </View>

                    {/* Students List */}
                    <Text style={[styles.sectionHeading, { color: theme.colors.text, marginTop: 14 }]}>
                      Student Engagement Roster ({participationData.students.length})
                    </Text>

                    {participationData.students.length === 0 ? (
                      <Card style={styles.emptyCard}>
                        <Users size={36} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                          No Students Enrolled
                        </Text>
                      </Card>
                    ) : (
                      participationData.students.map((st) => {
                        const isHigh = st.riskLevel === 'HIGH';
                        const isMedium = st.riskLevel === 'MEDIUM';
                        const riskVariant = isHigh ? 'danger' : isMedium ? 'warning' : 'success';

                        return (
                          <View
                            key={st.studentId}
                            style={[
                              styles.participationStudentCard,
                              {
                                backgroundColor: theme.colors.card,
                                borderColor: isHigh ? `${theme.colors.danger}60` : theme.colors.border,
                              },
                            ]}
                          >
                            <View style={styles.pCardHeader}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.pStudentName, { color: theme.colors.text }]}>
                                  {st.name}
                                </Text>
                                <Text style={[styles.pStudentMeta, { color: theme.colors.textSecondary }]}>
                                  {st.studentNumber || st.email}
                                </Text>
                              </View>
                              <Badge label={`${st.riskLevel} RISK`} variant={riskVariant} size="sm" />
                            </View>

                            {/* Engagement Progress Bar */}
                            <View style={styles.pProgressSection}>
                              <View style={styles.pProgressLabels}>
                                <Text style={[styles.pProgressTitle, { color: theme.colors.textSecondary }]}>
                                  Engagement Score: {st.engagementScore}%
                                </Text>
                                <View style={styles.trendRow}>
                                  {st.trend === 'UP' && <TrendingUp size={12} color={theme.colors.success} />}
                                  {st.trend === 'DOWN' && <TrendingDown size={12} color={theme.colors.danger} />}
                                  {st.trend === 'STABLE' && <Minus size={12} color={theme.colors.textSecondary} />}
                                  <Text
                                    style={[
                                      styles.trendText,
                                      {
                                        color:
                                          st.trend === 'UP'
                                            ? theme.colors.success
                                            : st.trend === 'DOWN'
                                            ? theme.colors.danger
                                            : theme.colors.textSecondary,
                                      },
                                    ]}
                                  >
                                    {st.trend}
                                  </Text>
                                </View>
                              </View>
                              <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.cardSecondary }]}>
                                <View
                                  style={[
                                    styles.progressBarFill,
                                    {
                                      width: `${Math.min(100, Math.max(0, st.engagementScore))}%`,
                                      backgroundColor:
                                        st.engagementScore >= 75
                                          ? theme.colors.success
                                          : st.engagementScore >= 50
                                          ? theme.colors.warning
                                          : theme.colors.danger,
                                    },
                                  ]}
                                />
                              </View>
                            </View>

                            {/* Inactivity & Overdue info */}
                            <View style={styles.pStatsRow}>
                              <Text style={[styles.pStatItem, { color: theme.colors.textSecondary }]}>
                                Overdue: {st.overdueCount}
                              </Text>
                              {st.lastActivityAt && (
                                <Text style={[styles.pStatItem, { color: theme.colors.textSecondary }]}>
                                  Last active: {new Date(st.lastActivityAt).toLocaleDateString()}
                                </Text>
                              )}
                            </View>

                            {/* Suggested Action */}
                            {(st.suggestedAction || st.reasons?.[0]?.detail) ? (
                              <View style={[styles.suggestedActionBox, { backgroundColor: `${theme.colors.primary}12`, borderColor: `${theme.colors.primary}30` }]}>
                                <AlertTriangle size={13} color={theme.colors.primary} style={{ marginTop: 2 }} />
                                <Text style={[styles.suggestedActionText, { color: theme.colors.text }]}>
                                  Action: {st.suggestedAction || st.reasons?.[0]?.detail}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })
                    )}
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ==================== CREATE CLASSWORK MODAL ==================== */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                New Classwork Module
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Type Selector */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                MODULE TYPE
              </Text>
              <View style={styles.typeRow}>
                {(['ASSIGNMENT', 'QUIZ', 'MATERIAL'] as const).map((t) => {
                  const isSelected = classworkType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeBtn,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setClassworkType(t)}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label="Module Title"
                placeholder="e.g. Midterm Project or Chapter 3 Reading"
                value={cwTitle}
                onChangeText={setCwTitle}
                ringColor={theme.colors.primary}
              />

              <Input
                label="Instructions / Description"
                placeholder="Details, rubric, or reference guidelines..."
                value={cwDescription}
                onChangeText={setCwDescription}
                multiline
                numberOfLines={3}
                ringColor={theme.colors.primary}
              />

              {classworkType !== 'MATERIAL' && (
                <Input
                  label="Maximum Points Possible"
                  placeholder="100"
                  value={cwMaxPoints}
                  onChangeText={setCwMaxPoints}
                  keyboardType="numeric"
                  ringColor={theme.colors.primary}
                />
              )}

              <Input
                label="Due Date (Optional e.g. YYYY-MM-DD)"
                placeholder="2026-09-30"
                value={cwDueDate}
                onChangeText={setCwDueDate}
                ringColor={theme.colors.primary}
              />

              {/* Attachments List */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                ATTACHED FILES ({cwAttachments.length})
              </Text>
              {cwAttachments.map((att, idx) => (
                <View
                  key={idx}
                  style={[styles.attRow, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                >
                  <Paperclip size={16} color={theme.colors.primary} />
                  <Text style={[styles.attName, { color: theme.colors.text }]} numberOfLines={1}>
                    {att.fileName}
                  </Text>
                  <TouchableOpacity onPress={() => setCwAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                    <X size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Upload Reference File"
                style={[styles.uploadAttBtn, { borderColor: theme.colors.border }]}
                onPress={handleAttachDocument}
              >
                <FileUp size={18} color={theme.colors.primary} />
                <Text style={[styles.uploadAttText, { color: theme.colors.primary }]}>
                  Attach Reference Document
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalBottomActions}>
              <Button
                title="Publish Classwork"
                onPress={handleCreateClasswork}
                loading={savingClasswork}
                icon={PlusCircle}
                style={{ borderRadius: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== GRADING DRAWER MODAL ==================== */}
      <Modal
        visible={gradingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGradingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Grade Submission
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  {gradingStudent?.name} &bull; {gradingAssignment?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setGradingModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Submission Status & Attachments */}
              <View style={styles.modalSection}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  STUDENT SUBMISSION DETAILS
                </Text>
                {activeSubmission?.submittedAt ? (
                  <Text style={[styles.subDateText, { color: theme.colors.textSecondary }]}>
                    Submitted on {new Date(activeSubmission.submittedAt).toLocaleString()}
                  </Text>
                ) : (
                  <Text style={[styles.subDateText, { color: theme.colors.danger }]}>
                    Status: {activeSubmission?.status || 'No submission record'}
                  </Text>
                )}

                {activeSubmission?.attachments && activeSubmission.attachments.length > 0 ? (
                  activeSubmission.attachments.map((file, i) => (
                    <View
                      key={i}
                      style={[styles.attRow, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                    >
                      <Paperclip size={16} color={theme.colors.primary} />
                      <Text style={[styles.attName, { color: theme.colors.text }]} numberOfLines={1}>
                        {file.fileName || 'Attached Solution'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.noFileCard, { backgroundColor: theme.colors.cardSecondary }]}>
                    <Text style={[styles.noFileText, { color: theme.colors.textSecondary }]}>
                      No file attachments submitted
                    </Text>
                  </View>
                )}
              </View>

              {/* Score Input */}
              <Input
                label={`Score (Max ${gradingAssignment?.maxPoints ?? 100})`}
                placeholder="e.g. 95"
                value={gradeInput}
                onChangeText={setGradeInput}
                keyboardType="numeric"
                ringColor={theme.colors.primary}
              />

              {/* Feedback Input */}
              <Input
                label="Private Feedback (Optional)"
                placeholder="Add comments on student solution..."
                value={feedbackInput}
                onChangeText={setFeedbackInput}
                multiline
                numberOfLines={3}
                ringColor={theme.colors.primary}
              />
            </ScrollView>

            <View style={styles.modalBottomActions}>
              <Button
                title="Return Grade & Notify Student"
                onPress={handleSaveGrade}
                loading={submittingGrade}
                icon={CheckCircle2}
                style={{ borderRadius: 12, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== EDIT ANNOUNCEMENT MODAL ==================== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Edit Announcement
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Update message on the class stream
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <TextInput
                style={[
                  styles.postInput,
                  {
                    backgroundColor: theme.colors.cardSecondary,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    minHeight: 120,
                    textAlignVertical: 'top',
                  },
                ]}
                multiline
                numberOfLines={5}
                placeholder="Edit announcement content..."
                placeholderTextColor={theme.colors.textSecondary}
                value={editAnnouncementContent}
                onChangeText={setEditAnnouncementContent}
              />
            </View>

            <View style={styles.modalBottomActions}>
              <Button
                title="Save Changes"
                onPress={handleSaveEditAnnouncement}
                loading={savingEditAnnouncement}
                disabled={!editAnnouncementContent.trim()}
                icon={Check}
                style={{ borderRadius: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== CREATE BROADCAST MODAL ==================== */}
      <Modal
        visible={broadcastModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBroadcastModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Dispatch Class Broadcast
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Send high-priority alert to enrolled students
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBroadcastModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                ALERT CATEGORY
              </Text>
              <View style={styles.typeRow}>
                {(['GENERAL', 'URGENT', 'REMINDER'] as const).map((cat) => {
                  const isSelected = broadcastCategoryInput === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.typeBtn,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setBroadcastCategoryInput(cat)}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                MESSAGE
              </Text>
              <TextInput
                style={[
                  styles.postInput,
                  {
                    backgroundColor: theme.colors.cardSecondary,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    minHeight: 90,
                    marginBottom: 16,
                  },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Write your broadcast notification here..."
                placeholderTextColor={theme.colors.textSecondary}
                value={broadcastMsgInput}
                onChangeText={setBroadcastMsgInput}
              />
            </ScrollView>

            <View style={styles.modalBottomActions}>
              <Button
                title="Send Broadcast Alert"
                onPress={handleCreateBroadcast}
                loading={sendingBroadcast}
                disabled={!broadcastMsgInput.trim()}
                icon={Send}
                style={{ borderRadius: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== FORM RESPONSES MODAL (VIEW-ONLY) ==================== */}
      <Modal
        visible={responsesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setResponsesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {selectedFormForResponses?.title || 'Form Responses'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Student submissions & scores (view-only)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setResponsesModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {loadingResponses ? (
                <View style={[styles.loadingBox, { paddingVertical: 40 }]}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    Loading student responses...
                  </Text>
                </View>
              ) : responsesError ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={[{ color: theme.colors.danger, marginBottom: 8 }]}>
                    {responsesError}
                  </Text>
                  {selectedFormForResponses && (
                    <Button
                      title="Retry"
                      variant="outline"
                      onPress={() => handleOpenFormResponses(selectedFormForResponses)}
                      style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, minHeight: 32 }}
                    />
                  )}
                </View>
              ) : formResponses.length === 0 ? (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <ClipboardList size={36} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text, marginTop: 8 }]}>
                    No Submissions Yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    Student submissions will be listed here once they complete this quiz or form.
                  </Text>
                </View>
              ) : (
                formResponses.map((attempt) => {
                  const percent = attempt.percentage !== undefined && attempt.percentage !== null
                    ? Math.round(attempt.percentage)
                    : null;
                  const scoreDisplay = attempt.score !== null && attempt.score !== undefined
                    ? `${attempt.score} / ${attempt.maxScore ?? (selectedFormForResponses as any)?.totalPoints ?? 100}`
                    : 'Not Scored';

                  return (
                    <View
                      key={attempt.id}
                      style={[styles.responseRowCard, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.studentRowName, { color: theme.colors.text }]}>
                          {attempt.user?.name || attempt.user?.email || 'Student'}
                        </Text>
                        <Text style={[styles.studentRowId, { color: theme.colors.textSecondary }]}>
                          {attempt.user?.studentNumber || attempt.user?.email}
                        </Text>
                        <Text style={[styles.annTimestamp, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                          Submitted: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'In Progress'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Badge
                          label={attempt.status || (attempt.score !== null ? 'SCORED' : 'SUBMITTED')}
                          variant={attempt.status === 'GRADED' || attempt.status === 'COMPLETED' ? 'success' : 'primary'}
                          size="sm"
                        />
                        <Text style={[styles.responseScoreText, { color: theme.colors.text, marginTop: 4 }]}>
                          {scoreDisplay}
                        </Text>
                        {percent !== null && (
                          <Text style={[styles.responsePercentText, { color: percent >= 75 ? theme.colors.success : theme.colors.danger }]}>
                            {percent}%
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
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
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  courseSubtitle: {
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
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  postInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 12,
  },
  postActions: {
    alignItems: 'flex-end',
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
  annActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  annActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTriggerBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    minHeight: TOUCH_TARGET,
  },
  createTriggerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cwCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cwTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cwPointsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cwTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cwDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cwFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cwDueDate: {
    fontSize: 12,
  },
  gradeActionLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  gradebookSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  gbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  gbAssignmentTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  gbMaxPoints: {
    fontSize: 12,
    marginTop: 2,
  },
  noStudentsText: {
    fontSize: 13,
    paddingVertical: 10,
  },
  studentGradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  studentInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  studentRowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  studentRowId: {
    fontSize: 12,
    marginTop: 2,
  },
  gradeStatusCol: {
    alignItems: 'flex-end',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 15,
    fontWeight: '700',
  },
  pendingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
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
  modalCard: {
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
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modalSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  typeBtnText: {
    fontSize: 12,
  },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  attName: {
    fontSize: 13,
    flex: 1,
  },
  uploadAttBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
    minHeight: TOUCH_TARGET,
  },
  uploadAttText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBottomActions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  subDateText: {
    fontSize: 13,
    marginBottom: 10,
  },
  noFileCard: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noFileText: {
    fontSize: 12,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 4,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  errorCard: {
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorCardText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 6,
  },
  broadcastMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 10,
  },
  broadcastMetaText: {
    fontSize: 11,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  participationStudentCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pStudentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  pStudentMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  pProgressSection: {
    marginBottom: 8,
  },
  pProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pProgressTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  pStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  pStatItem: {
    fontSize: 11,
  },
  suggestedActionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  suggestedActionText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  responseRowCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  responseScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  responsePercentText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
