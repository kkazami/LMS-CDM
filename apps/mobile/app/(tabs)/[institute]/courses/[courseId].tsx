import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Users,
  Award,
  Megaphone,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  User as UserIcon,
  ChevronRight,
  X,
  ExternalLink,
  Plus,
} from 'lucide-react-native';

type TabType = 'stream' | 'classwork' | 'people' | 'grades';

interface AnnouncementItem {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: string;
  };
}

interface BroadcastItem {
  id: string;
  message: string;
  category: string;
  createdAt: string;
  senderName: string;
  senderAvatar?: string | null;
}

interface ClassworkItem {
  id: string;
  type: string;
  title: string;
  description: string;
  maxPoints?: number | null;
  dueDate?: string | null;
  orderIndex: number;
  attachments?: Array<{ id: string; type: string; url: string; fileName: string; fileSize?: number | null }>;
  submission?: {
    id: string;
    status: string;
    grade?: number | null;
    isReturned: boolean;
    submittedAt?: string | null;
    attachments?: Array<{ id: string; url: string; fileName: string }>;
  } | null;
}

interface ClassworkCategory {
  name: string;
  count: number;
  items: ClassworkItem[];
}

interface EnrolledStudent {
  enrollmentId: string;
  id: string;
  name: string;
  email: string;
  studentNumber: string;
  avatarUrl?: string | null;
}

interface GradeItem {
  id: string;
  title: string;
  type: string;
  maxPoints: number;
  score: number | null;
  status: 'GRADED' | 'SUBMITTED' | 'MISSING' | 'ASSIGNED';
  dueDate: string | null;
}

interface GradeSummary {
  averagePercentage: number | null;
  letterGrade: string;
  totalEarnedPoints: number;
  totalPossiblePoints: number;
  totalItems: number;
  completedCount: number;
  gradedCount: number;
  missingCount: number;
}

interface FeedbackComment {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string | null;
  createdAt: string;
}

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('stream');
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab Data States
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [categories, setCategories] = useState<ClassworkCategory[]>([]);
  const [selectedClasswork, setSelectedClasswork] = useState<ClassworkItem | null>(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissionLink, setSubmissionLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [instructor, setInstructor] = useState<any>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [totalEnrolled, setTotalEnrolled] = useState(0);

  const [gradeSummary, setGradeSummary] = useState<GradeSummary | null>(null);
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackComment[]>([]);

  const loadCourseOverview = async () => {
    if (!courseId) return;
    try {
      const res = await api.courses.get(courseId);
      setCourse(res.course);
    } catch {
      // Handled gracefully
    }
  };

  const loadTabData = async () => {
    if (!courseId) return;
    try {
      if (activeTab === 'stream') {
        const res = await api.courses.getStream(courseId);
        setAnnouncements(res.announcements || []);
        setBroadcasts(res.broadcasts || []);
      } else if (activeTab === 'classwork') {
        const res = await api.courses.getClasswork(courseId);
        setCategories(res.categories || []);
      } else if (activeTab === 'people') {
        const res = await api.courses.getPeople(courseId);
        setInstructor(res.instructor);
        setStudents(res.students || []);
        setTotalEnrolled(res.totalEnrolled || 0);
      } else if (activeTab === 'grades') {
        const res = await api.courses.getGrades(courseId);
        setGradeSummary(res.summary);
        setGradeItems(res.items || []);
        setFeedback(res.feedback || []);
      }
    } catch {
      // Fallback gracefully
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCourseOverview(), loadTabData()]).finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCourseOverview(), loadTabData()]);
    setRefreshing(false);
  };

  const handlePostAnnouncement = async () => {
    if (!newPostText.trim() || !courseId) return;
    setIsPosting(true);
    try {
      const res = await api.courses.postStream(courseId, newPostText.trim());
      if (res.announcement) {
        setAnnouncements((prev) => [res.announcement, ...prev]);
        setNewPostText('');
      }
    } catch (err: any) {
      Alert.alert('Post Error', err.message || 'Failed to post announcement.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleSubmission = async () => {
    if (!selectedClasswork || !courseId) return;
    setIsSubmitting(true);
    const newStatus = selectedClasswork.submission?.status === 'SUBMITTED' ? 'DRAFT' : 'SUBMITTED';
    try {
      await api.courses.submitAssignment(
        courseId,
        selectedClasswork.id,
        newStatus,
        submissionLink || undefined,
        submissionLink ? 'Submitted Resource' : undefined
      );

      // Update local state
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === selectedClasswork.id
              ? {
                  ...item,
                  submission: {
                    id: item.submission?.id || 'temp',
                    status: newStatus,
                    grade: item.submission?.grade || null,
                    isReturned: false,
                    submittedAt: newStatus === 'SUBMITTED' ? new Date().toISOString() : null,
                  },
                }
              : item
          ),
        }))
      );

      setSubmissionModalOpen(false);
      setSubmissionLink('');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to update submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyBadge = (dueDateString?: string | null) => {
    if (!dueDateString) return null;
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return <View style={[styles.urgencyBadge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.urgencyText, { color: '#DC2626' }]}>Overdue</Text></View>;
    }
    if (diffHours <= 24) {
      return <View style={[styles.urgencyBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.urgencyText, { color: '#D97706' }]}>Due Today</Text></View>;
    }
    if (diffHours <= 48) {
      return <View style={[styles.urgencyBadge, { backgroundColor: '#FEF9C3' }]}><Text style={[styles.urgencyText, { color: '#CA8A04' }]}>Due Soon</Text></View>;
    }
    return <View style={[styles.urgencyBadge, { backgroundColor: '#F3F4F6' }]}><Text style={[styles.urgencyText, { color: '#6B7280' }]}>{dueDate.toLocaleDateString()}</Text></View>;
  };

  if (loading && !course) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading course workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Top Header Navigation */}
      <View style={[styles.topNavBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.topNavTitleBox}>
          <Text style={[styles.topNavCode, { color: theme.colors.primary }]}>
            {course?.code || course?.courseCode || 'COURSE'}
          </Text>
          <Text style={[styles.topNavTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {course?.title || 'Class Overview'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Rich Hero Gradient Banner */}
        <LinearGradient
          colors={[theme.colors.sidebar, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{course?.code || course?.courseCode || 'COURSE'}</Text>
            </View>
            {course?.section ? (
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Section {course.section}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.heroTitle}>{course?.title}</Text>

          <View style={styles.heroFooter}>
            <View style={styles.instructorInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {(course?.instructorName || 'I').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.instructorLabel}>Instructor</Text>
                <Text style={styles.instructorNameText}>{course?.instructorName || 'Faculty Instructor'}</Text>
              </View>
            </View>

            {course?.room ? (
              <View style={styles.roomTag}>
                <Text style={styles.roomText}>Room: {course.room}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* 4 Segmented Tabs */}
        <View style={[styles.segmentedTabBar, { backgroundColor: theme.colors.card }]}>
          {(
            [
              { key: 'stream', label: 'Stream', icon: Megaphone },
              { key: 'classwork', label: 'Classwork', icon: ClipboardList },
              { key: 'people', label: 'People', icon: Users },
              { key: 'grades', label: 'Grades', icon: Award },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            const IconComponent = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
                ]}
                activeOpacity={0.8}
              >
                <IconComponent size={16} color={isActive ? theme.colors.primary : '#9CA3AF'} />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isActive ? theme.colors.primary : '#6B7280' },
                    isActive && styles.tabButtonTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB 1: STREAM */}
        {activeTab === 'stream' && (
          <View style={styles.tabContainer}>
            {/* Pinned Broadcasts */}
            {broadcasts.length > 0 && (
              <View style={styles.broadcastBox}>
                <View style={styles.broadcastHeader}>
                  <AlertCircle size={18} color="#D97706" />
                  <Text style={styles.broadcastTitle}>Instructor Notice</Text>
                </View>
                {broadcasts.map((b) => (
                  <Text key={b.id} style={styles.broadcastMessage}>
                    {b.message}
                  </Text>
                ))}
              </View>
            )}

            {/* Announcement Post Composer */}
            <View style={[styles.composerCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.composerLabel, { color: theme.colors.text }]}>Share with your class</Text>
              <TextInput
                style={[styles.composerInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Announce something to your class..."
                placeholderTextColor="#9CA3AF"
                value={newPostText}
                onChangeText={setNewPostText}
                multiline
                numberOfLines={3}
              />
              <View style={styles.composerActions}>
                <TouchableOpacity
                  style={[
                    styles.postButton,
                    { backgroundColor: theme.colors.primary },
                    (!newPostText.trim() || isPosting) && styles.buttonDisabled,
                  ]}
                  onPress={handlePostAnnouncement}
                  disabled={!newPostText.trim() || isPosting}
                  activeOpacity={0.8}
                >
                  {isPosting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Send size={14} color="#FFFFFF" />
                      <Text style={styles.postButtonText}>Post</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Stream Feed */}
            {announcements.length === 0 ? (
              <View style={styles.emptyCard}>
                <Megaphone size={40} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Announcements Yet</Text>
                <Text style={styles.emptySubtitle}>Course updates and discussions will appear in this feed.</Text>
              </View>
            ) : (
              announcements.map((a) => (
                <View key={a.id} style={[styles.announcementCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.announcementHeader}>
                    <View style={[styles.authorAvatar, { backgroundColor: `${theme.colors.primary}20` }]}>
                      <Text style={[styles.authorLetter, { color: theme.colors.primary }]}>
                        {a.author.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.authorName, { color: theme.colors.text }]}>{a.author.name}</Text>
                      <Text style={styles.postDate}>{new Date(a.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.postContent, { color: theme.colors.text }]}>{a.content}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: CLASSWORK */}
        {activeTab === 'classwork' && (
          <View style={styles.tabContainer}>
            {categories.length === 0 ? (
              <View style={styles.emptyCard}>
                <ClipboardList size={40} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Classwork Published</Text>
                <Text style={styles.emptySubtitle}>Syllabus modules and assignments will be listed here.</Text>
              </View>
            ) : (
              categories.map((cat, catIdx) => (
                <View key={catIdx} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{cat.name}</Text>
                    <View style={[styles.categoryCountBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
                      <Text style={[styles.categoryCountText, { color: theme.colors.primary }]}>{cat.count}</Text>
                    </View>
                  </View>

                  {cat.items.map((item) => {
                    const isSubmitted = item.submission?.status === 'SUBMITTED' || item.submission?.status === 'GRADED';
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.classworkRow, { backgroundColor: theme.colors.card }]}
                        onPress={() => {
                          setSelectedClasswork(item);
                          setSubmissionModalOpen(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.classworkIconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                          {item.type === 'QUIZ' ? (
                            <CheckCircle2 size={20} color={theme.colors.primary} />
                          ) : item.type === 'MATERIAL' ? (
                            <FileText size={20} color={theme.colors.primary} />
                          ) : (
                            <ClipboardList size={20} color={theme.colors.primary} />
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.classworkTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={styles.classworkMetaRow}>
                            {item.maxPoints ? (
                              <Text style={styles.pointsLabel}>{item.maxPoints} pts</Text>
                            ) : null}
                            {getUrgencyBadge(item.dueDate)}
                          </View>
                        </View>

                        <View style={styles.statusCol}>
                          {isSubmitted ? (
                            <View style={styles.submittedBadge}>
                              <CheckCircle2 size={12} color="#059669" />
                              <Text style={styles.submittedText}>Done</Text>
                            </View>
                          ) : (
                            <ChevronRight size={18} color="#9CA3AF" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: PEOPLE */}
        {activeTab === 'people' && (
          <View style={styles.tabContainer}>
            {/* Instructor Card */}
            <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Instructor</Text>
            <View style={[styles.personCard, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.avatarCircleLg, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarLgText}>{(instructor?.name || 'T').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.personName, { color: theme.colors.text }]}>{instructor?.name || 'Instructor'}</Text>
                <Text style={styles.personEmail}>{instructor?.email}</Text>
                <View style={[styles.rolePill, { backgroundColor: `${theme.colors.primary}18` }]}>
                  <Text style={[styles.rolePillText, { color: theme.colors.primary }]}>Course Instructor</Text>
                </View>
              </View>
            </View>

            {/* Classmates List */}
            <View style={styles.classmatesHeader}>
              <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Classmates</Text>
              <View style={[styles.enrolledPill, { backgroundColor: '#F3F4F6' }]}>
                <Text style={styles.enrolledPillText}>{totalEnrolled} Enrolled</Text>
              </View>
            </View>

            {students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Users size={36} color="#9CA3AF" />
                <Text style={styles.emptySubtitle}>No other students enrolled in this section.</Text>
              </View>
            ) : (
              students.map((student) => (
                <View key={student.id} style={[styles.studentRow, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.studentAvatar, { backgroundColor: '#E5E7EB' }]}>
                    <Text style={styles.studentAvatarLetter}>{student.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: theme.colors.text }]}>{student.name}</Text>
                    <Text style={styles.studentNumberText}>ID: {student.studentNumber}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: GRADES */}
        {activeTab === 'grades' && (
          <View style={styles.tabContainer}>
            {/* Grade Overview Summary Card */}
            <View style={[styles.gradeSummaryCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.gradeSummaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>Course Standing</Text>
                  <Text style={[styles.averageText, { color: theme.colors.primary }]}>
                    {gradeSummary?.averagePercentage !== null && gradeSummary?.averagePercentage !== undefined
                      ? `${gradeSummary.averagePercentage}%`
                      : 'N/A'}
                  </Text>
                  <Text style={styles.totalPointsSubtitle}>
                    Earned: {gradeSummary?.totalEarnedPoints || 0} / {gradeSummary?.totalPossiblePoints || 0} pts
                  </Text>
                </View>

                {gradeSummary?.letterGrade ? (
                  <View style={[styles.letterGradeBox, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Text style={[styles.letterGradeText, { color: theme.colors.primary }]}>
                      {gradeSummary.letterGrade}
                    </Text>
                    <Text style={styles.gradeStatusLabel}>Grade</Text>
                  </View>
                ) : null}
              </View>

              {/* Metric Breakdown Badges */}
              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{gradeSummary?.completedCount || 0}</Text>
                  <Text style={styles.metricLabel}>Completed</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricValue, { color: '#059669' }]}>{gradeSummary?.gradedCount || 0}</Text>
                  <Text style={styles.metricLabel}>Graded</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricValue, { color: '#DC2626' }]}>{gradeSummary?.missingCount || 0}</Text>
                  <Text style={styles.metricLabel}>Missing</Text>
                </View>
              </View>
            </View>

            {/* Individual Coursework Marks */}
            <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Assessment Breakdown</Text>
            {gradeItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Award size={36} color="#9CA3AF" />
                <Text style={styles.emptySubtitle}>No graded coursework assignments posted yet.</Text>
              </View>
            ) : (
              gradeItems.map((g) => (
                <View key={g.id} style={[styles.gradeItemRow, { backgroundColor: theme.colors.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gradeItemTitle, { color: theme.colors.text }]}>{g.title}</Text>
                    <Text style={styles.gradeItemType}>{g.type}</Text>
                  </View>
                  <View style={styles.gradeScoreCol}>
                    {g.score !== null ? (
                      <Text style={[styles.scoreNumber, { color: theme.colors.primary }]}>
                        {g.score} / {g.maxPoints}
                      </Text>
                    ) : (
                      <Text style={styles.scorePending}>Pending</Text>
                    )}
                    <View
                      style={[
                        styles.statusChip,
                        g.status === 'GRADED' && { backgroundColor: '#DEF7EC' },
                        g.status === 'SUBMITTED' && { backgroundColor: '#DBEAFE' },
                        g.status === 'MISSING' && { backgroundColor: '#FEE2E2' },
                        g.status === 'ASSIGNED' && { backgroundColor: '#F3F4F6' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          g.status === 'GRADED' && { color: '#03543F' },
                          g.status === 'SUBMITTED' && { color: '#1E40AF' },
                          g.status === 'MISSING' && { color: '#991B1B' },
                          g.status === 'ASSIGNED' && { color: '#4B5563' },
                        ]}
                      >
                        {g.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Teacher Feedback Section */}
            {feedback.length > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Instructor Notes</Text>
                {feedback.map((f) => (
                  <View key={f.id} style={[styles.feedbackCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.feedbackSender, { color: theme.colors.primary }]}>{f.senderName}</Text>
                    <Text style={[styles.feedbackBody, { color: theme.colors.text }]}>{f.content}</Text>
                    <Text style={styles.feedbackDate}>{new Date(f.createdAt).toLocaleDateString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Submission Interactive Modal */}
      <Modal
        visible={submissionModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSubmissionModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedClasswork?.title || 'Assignment Details'}
              </Text>
              <TouchableOpacity
                onPress={() => setSubmissionModalOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalMetaRow}>
                {selectedClasswork?.maxPoints ? (
                  <View style={[styles.metaBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
                    <Text style={[styles.metaBadgeText, { color: theme.colors.primary }]}>
                      {selectedClasswork.maxPoints} Points
                    </Text>
                  </View>
                ) : null}
                {getUrgencyBadge(selectedClasswork?.dueDate)}
              </View>

              {selectedClasswork?.description ? (
                <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
                  {selectedClasswork.description}
                </Text>
              ) : null}

              {/* Attachments list */}
              {selectedClasswork?.attachments && selectedClasswork.attachments.length > 0 && (
                <View style={styles.attachmentsSection}>
                  <Text style={styles.attachmentsHeading}>Reference Files</Text>
                  {selectedClasswork.attachments.map((att) => (
                    <View key={att.id} style={styles.attachmentItem}>
                      <FileText size={16} color={theme.colors.primary} />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {att.fileName || 'Resource Attachment'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Submission Link/Note input */}
              <Text style={styles.submissionSectionHeading}>Your Submission</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Paste cloud document or repository URL..."
                placeholderTextColor="#9CA3AF"
                value={submissionLink}
                onChangeText={setSubmissionLink}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[
                  styles.submitActionBtn,
                  { backgroundColor: theme.colors.primary },
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleToggleSubmission}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitActionBtnText}>
                    {selectedClasswork?.submission?.status === 'SUBMITTED'
                      ? 'Mark as Incomplete (Unsubmit)'
                      : 'Turn In Assignment'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 56,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  topNavTitleBox: { flex: 1 },
  topNavCode: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  topNavTitle: { fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  heroBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  codePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  sectionPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', lineHeight: 28, marginBottom: 16 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 14,
  },
  instructorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 16, fontWeight: '800', color: '#2C2727' },
  instructorLabel: { fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', textTransform: 'uppercase' },
  instructorNameText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  roomTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  segmentedTabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabButtonText: { fontSize: 13, fontWeight: '600' },
  tabButtonTextActive: { fontWeight: '800' },
  tabContainer: { paddingHorizontal: 16 },
  broadcastBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  broadcastHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  broadcastTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', textTransform: 'uppercase' },
  broadcastMessage: { fontSize: 13, color: '#78350F', lineHeight: 18 },
  composerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  composerLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  composerInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  composerActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  postButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  announcementCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorLetter: { fontSize: 15, fontWeight: '800' },
  authorName: { fontSize: 14, fontWeight: '700' },
  postDate: { fontSize: 11, color: '#9CA3AF' },
  postContent: { fontSize: 14, lineHeight: 21 },
  categorySection: { marginBottom: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  categoryTitle: { fontSize: 16, fontWeight: '800' },
  categoryCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  categoryCountText: { fontSize: 12, fontWeight: '700' },
  classworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    minHeight: 64,
  },
  classworkIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classworkTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  classworkMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointsLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  statusCol: { marginLeft: 8 },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  submittedText: { fontSize: 11, fontWeight: '700', color: '#03543F' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  urgencyText: { fontSize: 10, fontWeight: '700' },
  sectionHeading: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  avatarCircleLg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  personName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  personEmail: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  rolePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  classmatesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  enrolledPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  enrolledPillText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarLetter: { fontSize: 14, fontWeight: '700', color: '#374151' },
  studentName: { fontSize: 14, fontWeight: '600' },
  studentNumberText: { fontSize: 12, color: '#9CA3AF' },
  gradeSummaryCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  gradeSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  summaryLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  averageText: { fontSize: 36, fontWeight: '900', marginVertical: 4 },
  totalPointsSubtitle: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  letterGradeBox: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterGradeText: { fontSize: 26, fontWeight: '900' },
  gradeStatusLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  metricGrid: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 14 },
  metricBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#2C2727' },
  metricLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  gradeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  gradeItemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  gradeItemType: { fontSize: 12, color: '#9CA3AF' },
  gradeScoreCol: { alignItems: 'flex-end' },
  scoreNumber: { fontSize: 14, fontWeight: '800' },
  scorePending: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  feedbackSection: { marginTop: 16 },
  feedbackCard: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  feedbackSender: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  feedbackBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  feedbackDate: { fontSize: 11, color: '#9CA3AF' },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#2C2727', marginTop: 12, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingBottom: 24 },
  modalMetaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaBadgeText: { fontSize: 11, fontWeight: '700' },
  modalDescription: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  attachmentsSection: { marginBottom: 16 },
  attachmentsHeading: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  attachmentName: { fontSize: 13, fontWeight: '600', color: '#374151' },
  submissionSectionHeading: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    marginBottom: 16,
  },
  submitActionBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitActionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
