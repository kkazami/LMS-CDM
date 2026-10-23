import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  Send,
  Megaphone,
  CheckCircle2,
  X,
  Users,
  User,
  Clock,
  AlertTriangle,
  MessageCircle,
  Search,
  Check,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { ScreenWrapper, ScreenHeaderContainer } from '../../../../src/components/common/ScreenWrapper';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { Course } from '@lms/types';

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface BroadcastItem {
  id: string;
  senderId?: string;
  message: string;
  category: string;
  scope: string;
  scopeLabel: string;
  recipientCount: number;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string | null;
}

const BROADCAST_CATEGORIES = [
  { value: 'GENERAL' as const, label: 'General', icon: MessageCircle, desc: 'Regular updates' },
  { value: 'REMINDER' as const, label: 'Reminder', icon: Clock, desc: 'Upcoming deadlines' },
  { value: 'ALERT' as const, label: 'Alert', icon: AlertTriangle, desc: 'Urgent announcements' },
];

export default function TeacherAlertsScreen() {
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, bottomClearance } = useResponsive();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Course Scope Picker state
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);

  // Compose modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [modalCourseId, setModalCourseId] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<'GENERAL' | 'REMINDER' | 'ALERT'>('GENERAL');
  const [scopeType, setScopeType] = useState<'ALL' | 'SELECT'>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [modalStudents, setModalStudents] = useState<EnrolledStudent[]>([]);
  const [loadingModalStudents, setLoadingModalStudents] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Edit Broadcast modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  const [editBroadcastMessage, setEditBroadcastMessage] = useState('');
  const [editBroadcastCategory, setEditBroadcastCategory] = useState<'GENERAL' | 'REMINDER' | 'ALERT'>('GENERAL');
  const [savingEditBroadcast, setSavingEditBroadcast] = useState(false);

  // Load courses on mount
  const loadCourses = async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.courses.list(instituteCode);
      if (response?.courses && response.courses.length > 0) {
        setCourses(response.courses);
        const firstCourseId = response.courses[0].id;
        setSelectedCourseId(firstCourseId);
        await loadCourseBroadcasts(firstCourseId);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load broadcasts & students for a specific course
  const loadCourseBroadcasts = async (courseId: string) => {
    if (!courseId) return;
    try {
      const res = await api.courses.getBroadcasts(courseId);
      if (res?.broadcasts) {
        setBroadcasts(res.broadcasts);
      }
      if (res?.enrolledStudents) {
        setEnrolledStudents(res.enrolledStudents);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // When changing course on main view
  const handleSelectCourse = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setLoading(true);
    await loadCourseBroadcasts(courseId);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedCourseId) {
      await loadCourseBroadcasts(selectedCourseId);
    } else {
      await loadCourses();
    }
    setRefreshing(false);
  };

  // Open Compose Modal
  const handleOpenCompose = async () => {
    const courseId = selectedCourseId || (courses.length > 0 ? courses[0].id : '');
    setModalCourseId(courseId);
    setBroadcastMessage('');
    setBroadcastCategory('GENERAL');
    setScopeType('ALL');
    setSelectedStudentIds(new Set());
    setStudentSearchQuery('');
    setShowBroadcastModal(true);

    if (courseId) {
      setLoadingModalStudents(true);
      try {
        const res = await api.courses.getBroadcasts(courseId);
        if (res?.enrolledStudents) {
          setModalStudents(res.enrolledStudents);
        }
      } catch {
        setModalStudents(enrolledStudents);
      } finally {
        setLoadingModalStudents(false);
      }
    }
  };

  // When changing target course inside modal
  const handleModalCourseChange = async (courseId: string) => {
    setModalCourseId(courseId);
    setSelectedStudentIds(new Set());
    setLoadingModalStudents(true);
    try {
      const res = await api.courses.getBroadcasts(courseId);
      if (res?.enrolledStudents) {
        setModalStudents(res.enrolledStudents);
      }
    } catch {
      // fallback
    } finally {
      setLoadingModalStudents(false);
    }
  };

  // Toggle student selection
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(new Set(modalStudents.map((s) => s.id)));
  };

  const clearStudentSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Filter students by search
  const filteredModalStudents = modalStudents.filter((s) => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  // Send Broadcast
  const handleSendBroadcast = async () => {
    if (!modalCourseId) {
      Alert.alert('Course Required', 'Please select a course for this broadcast.');
      return;
    }
    if (!broadcastMessage.trim()) {
      Alert.alert('Message Required', 'Please enter your broadcast message.');
      return;
    }
    if (scopeType === 'SELECT' && selectedStudentIds.size === 0) {
      Alert.alert('Recipients Required', 'Please select at least 1 student or choose "Entire Class".');
      return;
    }

    setSendingBroadcast(true);
    try {
      const scopeValue = scopeType === 'ALL' ? 'ALL' : Array.from(selectedStudentIds).join(',');
      await api.courses.broadcast(modalCourseId, broadcastMessage.trim(), broadcastCategory, scopeValue);

      try {
        Burnt.toast({
          title: 'Broadcast Dispatched',
          message:
            scopeType === 'ALL'
              ? 'Notification delivered to the entire class.'
              : `Delivered to ${selectedStudentIds.size} student${selectedStudentIds.size !== 1 ? 's' : ''}.`,
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setBroadcastMessage('');
      setShowBroadcastModal(false);

      // Refresh current view if target course is selected
      if (modalCourseId === selectedCourseId) {
        await loadCourseBroadcasts(selectedCourseId);
      } else {
        setSelectedCourseId(modalCourseId);
        await loadCourseBroadcasts(modalCourseId);
      }
    } catch (err: any) {
      Alert.alert('Broadcast Error', err?.message || 'Failed to dispatch broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Open Edit Broadcast
  const handleOpenEditBroadcast = (b: BroadcastItem) => {
    setEditingBroadcastId(b.id);
    setEditBroadcastMessage(b.message);
    const cat = (b.category || '').toUpperCase();
    if (cat === 'ALERT' || cat === 'URGENT') {
      setEditBroadcastCategory('ALERT');
    } else if (cat === 'REMINDER' || cat === 'EXAM') {
      setEditBroadcastCategory('REMINDER');
    } else {
      setEditBroadcastCategory('GENERAL');
    }
    setShowEditModal(true);
  };

  // Save Edit Broadcast
  const handleSaveEditBroadcast = async () => {
    if (!selectedCourseId || !editingBroadcastId || !editBroadcastMessage.trim()) return;

    setSavingEditBroadcast(true);
    try {
      await api.courses.updateBroadcast(
        selectedCourseId,
        editingBroadcastId,
        editBroadcastMessage.trim(),
        editBroadcastCategory
      );

      try {
        Burnt.toast({
          title: 'Broadcast Updated',
          message: 'Changes saved to broadcast history.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setShowEditModal(false);
      setEditingBroadcastId(null);
      setEditBroadcastMessage('');
      await loadCourseBroadcasts(selectedCourseId);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update broadcast.');
    } finally {
      setSavingEditBroadcast(false);
    }
  };

  // Delete Broadcast with Native Confirmation Dialog
  const handleDeleteBroadcast = (b: BroadcastItem) => {
    if (!selectedCourseId) return;

    Alert.alert(
      'Delete Broadcast',
      'Are you sure you want to delete this broadcast? The broadcast alert will be removed for enrolled students.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.courses.deleteBroadcast(selectedCourseId, b.id);
              try {
                Burnt.toast({
                  title: 'Broadcast Deleted',
                  message: 'Broadcast removed from class history.',
                  preset: 'done',
                });
              } catch {
                // Fallback
              }
              await loadCourseBroadcasts(selectedCourseId);
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete broadcast.');
            }
          },
        },
      ]
    );
  };

  // Category Badge Config: handles new options + gracefully falls back for old URGENT / EXAM records
  const getCategoryBadgeConfig = (category: string) => {
    const cat = (category || '').toUpperCase();
    switch (cat) {
      case 'ALERT':
      case 'URGENT':
        return {
          label: cat === 'URGENT' ? 'URGENT' : 'ALERT',
          variant: 'danger' as const,
        };
      case 'REMINDER':
      case 'EXAM':
        return {
          label: cat === 'EXAM' ? 'EXAM' : 'REMINDER',
          variant: 'warning' as const,
        };
      case 'GENERAL':
        return {
          label: 'GENERAL',
          variant: 'primary' as const,
        };
      default:
        return {
          label: cat || 'BROADCAST',
          variant: 'default' as const,
        };
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <ScreenWrapper>
      {/* Header Container with Safe Area Inset */}
      <ScreenHeaderContainer
        style={[
          styles.headerContainer,
          {
            paddingHorizontal: s(16),
            paddingBottom: s(10),
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: s(10) }}>
            <Text
              style={[styles.headerTitle, { color: theme.colors.text, fontSize: font(21) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Class Broadcasts
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.colors.textSecondary, fontSize: font(11.5) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Push real-time notifications to your students
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Compose Broadcast"
            style={[
              styles.newBroadcastBtn,
              {
                backgroundColor: theme.colors.primary,
                paddingHorizontal: s(10),
                paddingVertical: s(6),
                borderRadius: s(16),
                minHeight: s(32),
              },
            ]}
            onPress={handleOpenCompose}
            activeOpacity={0.8}
          >
            <Send size={s(12)} color="#FFFFFF" />
            <Text
              style={[styles.newBroadcastBtnText, { fontSize: font(12) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Compose
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenHeaderContainer>

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
        <View style={[styles.sectionHeaderRow, { marginBottom: s(10), gap: s(8) }]}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text, fontSize: font(15.5) }]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Broadcast History
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Filter by class"
            style={[
              styles.courseDropdownTrigger,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                paddingHorizontal: s(8),
                paddingVertical: s(5),
                borderRadius: s(8),
                maxWidth: '58%',
              },
            ]}
            onPress={() => courses.length > 0 && setIsCoursePickerOpen(true)}
            activeOpacity={courses.length > 1 ? 0.8 : 1}
          >
            <Text
              style={[styles.courseDropdownTriggerText, { color: theme.colors.text, fontSize: font(12) }]}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {selectedCourse?.code || 'Select Course'}
            </Text>
            <Text
              style={[styles.courseDropdownTriggerCount, { color: theme.colors.textSecondary, fontSize: font(11) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              &bull; {broadcasts.length} sent
            </Text>
            {courses.length > 1 && (
              <ChevronDown size={s(13)} color={theme.colors.textSecondary} style={{ marginLeft: s(3) }} />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: s(24) }} />
        ) : broadcasts.length === 0 ? (
          <Card style={[styles.emptyCard, { paddingVertical: s(32) }]}>
            <Megaphone size={s(36)} color={theme.colors.textSecondary} />
            <Text
              style={[styles.emptyTitle, { color: theme.colors.text, fontSize: font(15) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              No Broadcasts Sent Yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontSize: font(11.5) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Send a push broadcast above to notify enrolled students in {selectedCourse?.code || 'this course'}.
            </Text>
          </Card>
        ) : (
          broadcasts.map((b) => {
            const badgeConfig = getCategoryBadgeConfig(b.category);
            const canManage =
              user?.role?.toUpperCase() === 'ADMIN' ||
              user?.id === b.senderId ||
              (selectedCourse as any)?.instructor?.id === user?.id ||
              (selectedCourse as any)?.instructorId === user?.id;

            return (
              <View
                key={b.id}
                style={[
                  styles.broadcastCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: s(13),
                    padding: s(12),
                    marginBottom: s(10),
                  },
                ]}
              >
                <View style={[styles.broadcastTop, { marginBottom: s(8) }]}>
                  <View style={[styles.badgeDateRow, { gap: s(6) }]}>
                    <Badge label={badgeConfig.label} variant={badgeConfig.variant} size="sm" />
                    <Text
                      style={[styles.broadcastDate, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {new Date(b.createdAt).toLocaleDateString()} at{' '}
                      {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {canManage && (
                    <View style={[styles.broadcastActions, { gap: s(5) }]}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Edit broadcast"
                        onPress={() => handleOpenEditBroadcast(b)}
                        style={[
                          styles.broadcastActionBtn,
                          {
                            borderColor: theme.colors.border,
                            width: s(26),
                            height: s(26),
                            borderRadius: s(6),
                          },
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Pencil size={s(12)} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Delete broadcast"
                        onPress={() => handleDeleteBroadcast(b)}
                        style={[
                          styles.broadcastActionBtn,
                          {
                            borderColor: theme.colors.border,
                            width: s(26),
                            height: s(26),
                            borderRadius: s(6),
                          },
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={s(12)} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.broadcastMessage,
                    {
                      color: theme.colors.text,
                      fontSize: font(13),
                      lineHeight: s(18),
                      marginBottom: s(8),
                    },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {b.message}
                </Text>

                <View style={[styles.recipientRow, { borderTopColor: theme.colors.border, paddingTop: s(8) }]}>
                  {b.scope === 'ALL' ? (
                    <Users size={s(13)} color={theme.colors.textSecondary} />
                  ) : (
                    <User size={s(13)} color={theme.colors.textSecondary} />
                  )}
                  <Text
                    style={[styles.recipientLabel, { color: theme.colors.textSecondary, fontSize: font(11.5) }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Sent to: {b.scopeLabel}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ==================== COMPOSE BROADCAST MODAL ==================== */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Compose Class Broadcast
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Instant notification delivered to student devices
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBroadcastModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Target Course Selector */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                TARGET COURSE
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coursePillsScroll}>
                {courses.map((course) => {
                  const isSelected = modalCourseId === course.id;
                  return (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.coursePill,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => handleModalCourseChange(course.id)}
                    >
                      <Text
                        style={[
                          styles.coursePillText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {course.code || course.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Category Selector (GENERAL / REMINDER / ALERT) */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                ALERT CATEGORY
              </Text>
              <View style={styles.categoryRow}>
                {BROADCAST_CATEGORIES.map((cat) => {
                  const isSelected = broadcastCategory === cat.value;
                  const Icon = cat.icon;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryBtn,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setBroadcastCategory(cat.value)}
                    >
                      <Icon size={14} color={isSelected ? '#FFFFFF' : theme.colors.textSecondary} />
                      <Text
                        style={[
                          styles.categoryBtnText,
                          { color: isSelected ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Recipient Scope Selector */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                RECIPIENTS
              </Text>
              <View style={styles.scopeTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.scopeTabBtn,
                    {
                      backgroundColor: scopeType === 'ALL' ? theme.colors.primary : theme.colors.cardSecondary,
                      borderColor: scopeType === 'ALL' ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setScopeType('ALL')}
                >
                  <Users size={14} color={scopeType === 'ALL' ? '#FFFFFF' : theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.scopeTabText,
                      { color: scopeType === 'ALL' ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: scopeType === 'ALL' ? '700' : '500' },
                    ]}
                  >
                    Entire Class ({modalStudents.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scopeTabBtn,
                    {
                      backgroundColor: scopeType === 'SELECT' ? theme.colors.primary : theme.colors.cardSecondary,
                      borderColor: scopeType === 'SELECT' ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setScopeType('SELECT')}
                >
                  <User size={14} color={scopeType === 'SELECT' ? '#FFFFFF' : theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.scopeTabText,
                      { color: scopeType === 'SELECT' ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: scopeType === 'SELECT' ? '700' : '500' },
                    ]}
                  >
                    Select Students {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Student Picker (when SELECT is chosen) */}
              {scopeType === 'SELECT' && (
                <View style={[styles.studentPickerCard, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
                  {/* Search and Selection Actions */}
                  <View style={styles.searchRow}>
                    <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      <Search size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                      <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search student..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={studentSearchQuery}
                        onChangeText={setStudentSearchQuery}
                      />
                    </View>
                    <View style={styles.bulkBtnRow}>
                      <TouchableOpacity onPress={selectAllStudents} style={styles.quickTextBtn}>
                        <Text style={[styles.quickTextBtnLabel, { color: theme.colors.primary }]}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={clearStudentSelection} style={styles.quickTextBtn}>
                        <Text style={[styles.quickTextBtnLabel, { color: theme.colors.danger }]}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Student Checklist */}
                  {loadingModalStudents ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 14 }} />
                  ) : filteredModalStudents.length === 0 ? (
                    <Text style={[styles.emptyPickerText, { color: theme.colors.textSecondary }]}>
                      {modalStudents.length === 0
                        ? 'No approved students found in this course.'
                        : 'No students match your search.'}
                    </Text>
                  ) : (
                    <ScrollView style={styles.studentListScroll} nestedScrollEnabled>
                      {filteredModalStudents.map((s) => {
                        const isChecked = selectedStudentIds.has(s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.studentItemRow,
                              { borderBottomColor: theme.colors.border },
                              isChecked && { backgroundColor: theme.colors.primary + '10' },
                            ]}
                            onPress={() => toggleStudent(s.id)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.checkboxCircle,
                                {
                                  borderColor: isChecked ? theme.colors.primary : theme.colors.border,
                                  backgroundColor: isChecked ? theme.colors.primary : 'transparent',
                                },
                              ]}
                            >
                              {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                            </View>

                            <View style={[styles.studentMiniAvatar, { backgroundColor: theme.colors.primary }]}>
                              <Text style={styles.studentAvatarLetter}>{getInitials(s.name)}</Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={[styles.studentItemName, { color: theme.colors.text }]} numberOfLines={1}>
                                {s.name}
                              </Text>
                              <Text style={[styles.studentItemEmail, { color: theme.colors.textSecondary }]}>
                                {s.email}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Message Input */}
              <View style={styles.messageHeaderRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                  BROADCAST MESSAGE
                </Text>
                <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                  {broadcastMessage.length}/500
                </Text>
              </View>
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: theme.colors.cardSecondary,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                multiline
                numberOfLines={4}
                maxLength={500}
                placeholder="Type your notification message to deliver directly to students..."
                placeholderTextColor={theme.colors.textSecondary}
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
              />
            </ScrollView>

            <Button
              title="Dispatch Broadcast"
              onPress={handleSendBroadcast}
              loading={sendingBroadcast}
              disabled={
                !broadcastMessage.trim() ||
                (scopeType === 'SELECT' && selectedStudentIds.size === 0)
              }
              icon={Send}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>

      {/* ==================== EDIT BROADCAST MODAL ==================== */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Edit Broadcast
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Update notification message and priority
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Category Selector (GENERAL / REMINDER / ALERT) */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              ALERT CATEGORY
            </Text>
            <View style={styles.categoryRow}>
              {BROADCAST_CATEGORIES.map((cat) => {
                const isSelected = editBroadcastCategory === cat.value;
                const Icon = cat.icon;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryBtn,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setEditBroadcastCategory(cat.value)}
                  >
                    <Icon size={14} color={isSelected ? '#FFFFFF' : theme.colors.textSecondary} />
                    <Text
                      style={[
                        styles.categoryBtnText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message Input */}
            <View style={styles.messageHeaderRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                BROADCAST MESSAGE
              </Text>
              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                {editBroadcastMessage.length}/500
              </Text>
            </View>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              multiline
              numberOfLines={4}
              maxLength={500}
              placeholder="Update broadcast message..."
              placeholderTextColor={theme.colors.textSecondary}
              value={editBroadcastMessage}
              onChangeText={setEditBroadcastMessage}
            />

            <Button
              title="Save Changes"
              onPress={handleSaveEditBroadcast}
              loading={savingEditBroadcast}
              disabled={!editBroadcastMessage.trim()}
              icon={Check}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Course Scope Picker Modal ── */}
      <Modal
        visible={isCoursePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCoursePickerOpen(false)}
      >
        <View style={styles.pickerModalBackdrop}>
          <View
            style={[
              styles.pickerModalSheet,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.pickerModalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.pickerModalTitle, { color: theme.colors.text }]}>
                Select Class Filter
              </Text>
              <TouchableOpacity
                onPress={() => setIsCoursePickerOpen(false)}
                style={styles.pickerModalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerModalList}>
              {courses.map((course) => {
                const isSelected = selectedCourseId === course.id;
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.pickerModalItem,
                      { borderBottomColor: theme.colors.border },
                      isSelected && {
                        backgroundColor: `${theme.colors.primary}14`,
                      },
                    ]}
                    onPress={() => {
                      handleSelectCourse(course.id);
                      setIsCoursePickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerModalItemTextCol}>
                      <Text
                        style={[
                          styles.pickerModalItemTitle,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {course.code}
                      </Text>
                      <Text
                        style={[styles.pickerModalItemDesc, { color: theme.colors.textSecondary }]}
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  newBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: TOUCH_TARGET,
  },
  newBroadcastBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  courseDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '65%',
  },
  courseDropdownTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  courseDropdownTriggerCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
    paddingBottom: 28,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerModalCloseBtn: {
    padding: 4,
  },
  pickerModalList: {
    paddingHorizontal: 12,
  },
  pickerModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginVertical: 2,
  },
  pickerModalItemTextCol: {
    flex: 1,
    marginRight: 10,
  },
  pickerModalItemTitle: {
    fontSize: 14,
  },
  pickerModalItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  broadcastCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  broadcastTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  broadcastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  broadcastActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastDate: {
    fontSize: 11,
  },
  broadcastMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  recipientLabel: {
    fontSize: 12,
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB20',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  coursePillsScroll: {
    marginBottom: 6,
  },
  coursePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  coursePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: TOUCH_TARGET,
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scopeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  scopeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: TOUCH_TARGET,
  },
  scopeTabText: {
    fontSize: 12,
  },
  studentPickerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  bulkBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickTextBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  studentListScroll: {
    maxHeight: 160,
  },
  studentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentMiniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  studentItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  studentItemEmail: {
    fontSize: 11,
  },
  emptyPickerText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  messageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  charCount: {
    fontSize: 11,
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14,
    marginTop: 6,
  },
});
