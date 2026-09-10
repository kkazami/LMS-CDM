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
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../../src/stores/auth-store';
import { useTheme } from '../../../../../src/hooks/useTheme';
import { Badge } from '../../../../../src/components/common/Badge';
import { Card } from '../../../../../src/components/common/Card';
import { Button } from '../../../../../src/components/common/Button';
import { Input } from '../../../../../src/components/common/Input';
import { TOUCH_TARGET } from '../../../../../src/lib/typography';
import type {
  CourseDetail,
  CourseStreamResponse,
  CourseClassworkResponse,
  ClassworkItem,
  CoursePeopleResponse,
  CreateClassworkInput,
  GradeSubmissionInput,
} from '@lms/types';

type TeacherTab = 'STREAM' | 'CLASSWORK' | 'GRADEBOOK' | 'PEOPLE';

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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Banner & Header */}
      <View style={[styles.headerBanner, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: theme.colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerBadges}>
            <Badge label={course?.code || course?.courseCode || 'COURSE'} variant="primary" size="sm" />
            {course?.section && (
              <Badge label={course.section} variant="default" size="sm" />
            )}
            {pendingEnrollments.length > 0 && (
              <Badge label={`${pendingEnrollments.length} Pending`} variant="warning" size="sm" />
            )}
          </View>
        </View>

        <Text style={[styles.courseTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {course?.title || 'Class Management Hub'}
        </Text>

        <Text style={[styles.courseSubtitle, { color: theme.colors.textSecondary }]}>
          Faculty: {course?.instructorName || user?.name} &bull; {people?.totalEnrolled ?? 0} Students Enrolled
        </Text>

        {/* 4 Segmented Faculty Tabs */}
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
                { color: activeTab === 'STREAM' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: activeTab === 'STREAM' ? '700' : '500' },
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
                { color: activeTab === 'CLASSWORK' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: activeTab === 'CLASSWORK' ? '700' : '500' },
              ]}
            >
              Classwork
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'GRADEBOOK' }}
            style={[
              styles.tabBtn,
              activeTab === 'GRADEBOOK' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('GRADEBOOK')}
          >
            <Award size={16} color={activeTab === 'GRADEBOOK' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'GRADEBOOK' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: activeTab === 'GRADEBOOK' ? '700' : '500' },
              ]}
            >
              Gradebook
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
                { color: activeTab === 'PEOPLE' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: activeTab === 'PEOPLE' ? '700' : '500' },
              ]}
            >
              Roster
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
                            {ann.author?.name}
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
                        <Text style={[styles.cwDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}

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
});
