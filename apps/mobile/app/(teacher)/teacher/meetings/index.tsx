import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Switch,
  Linking,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  Video,
  Plus,
  Users,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import {
  Screen,
  AppHeader,
  Card,
  SectionTitle,
  FormModal,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { isIteUser } from '../../../../src/lib/ite-eligibility';
import { radius, spacing } from '../../../../src/lib/theme';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type {
  ClassMeetingItem,
  MeetingAttendee,
  MeetingAttendanceResponse,
} from '@lms/api-client';
import type { Course } from '@lms/types';

type TabFilter = 'ALL' | 'LIVE' | 'UPCOMING' | 'PAST';

function formatDeviceLocalTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Time not set';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Time not set';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Time not set';
  }
}

function formatMeetingError(err: any): string {
  const status = err?.status || err?.statusCode;
  if (status === 401 || status === 403 || (status && status >= 500)) {
    return 'Meetings are temporarily unavailable. Please try again later.';
  }
  const message = String(err?.message || '');
  if (
    message.includes('permission denied') ||
    message.includes('PrismaClient') ||
    message.includes('database') ||
    message.includes('SQL')
  ) {
    return 'Meetings are temporarily unavailable. Please try again later.';
  }
  return err?.message || 'Meetings are temporarily unavailable. Please try again later.';
}

export default function TeacherMeetingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const isEligible = isIteUser(user);

  const [meetings, setMeetings] = useState<ClassMeetingItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');

  // Create Meeting Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [scheduledDateStr, setScheduledDateStr] = useState('');

  // Attendance Modal State
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [attendanceMeeting, setAttendanceMeeting] = useState<ClassMeetingItem | null>(null);
  const [attendanceData, setAttendanceData] = useState<MeetingAttendanceResponse | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Cancelling State
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchMeetings = useCallback(
    async (isBackground = false) => {
      if (!isEligible) {
        setLoading(false);
        return;
      }
      try {
        if (!isBackground) setError(null);
        const [meetingsRes, coursesRes] = await Promise.allSettled([
          api.meetings.list({ status: 'all' }),
          api.courses.list('ite'),
        ]);

        if (meetingsRes.status === 'fulfilled') {
          setMeetings(meetingsRes.value?.meetings || []);
        } else if (!isBackground) {
          setError(formatMeetingError(meetingsRes.reason));
        }

        if (coursesRes.status === 'fulfilled') {
          const fetchedCourses = coursesRes.value?.courses || [];
          setCourses(fetchedCourses);
          if (fetchedCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(fetchedCourses[0].id);
          }
        }
      } catch (err: any) {
        if (!isBackground) {
          setError(formatMeetingError(err));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, isEligible, selectedCourseId]
  );

  // Auto-refresh every 30 seconds while screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!isEligible) return;
      fetchMeetings();
      const interval = setInterval(() => {
        fetchMeetings(true);
      }, 30000);

      return () => clearInterval(interval);
    }, [fetchMeetings, isEligible])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMeetings();
  };

  // Open Create Modal
  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setJoinUrl('');
    setStartNow(true);
    // Default scheduled time to 1 hour ahead formatted in local ISO string
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    setScheduledDateStr(inOneHour.toISOString().slice(0, 16));
    setCreateError(null);
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
    setCreateModalVisible(true);
  };

  // Submit Create Meeting
  const handleCreateMeeting = async () => {
    setCreateError(null);

    if (!selectedCourseId) {
      setCreateError('Please select a course for this meeting.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateError('Meeting title is required.');
      return;
    }
    if (trimmedTitle.length > 120) {
      setCreateError('Meeting title must not exceed 120 characters.');
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 500) {
      setCreateError('Description must not exceed 500 characters.');
      return;
    }

    const trimmedUrl = joinUrl.trim();
    if (!trimmedUrl) {
      setCreateError('Meeting link is required.');
      return;
    }
    if (!trimmedUrl.toLowerCase().startsWith('https://')) {
      setCreateError('Meeting link must use a secure https:// address.');
      return;
    }
    if (trimmedUrl.length > 2048) {
      setCreateError('Meeting link must not exceed 2,048 characters.');
      return;
    }

    let scheduledIso: string | undefined = undefined;
    if (!startNow) {
      if (!scheduledDateStr) {
        setCreateError('Please provide a scheduled date and time.');
        return;
      }
      const parsedDate = new Date(scheduledDateStr);
      if (isNaN(parsedDate.getTime())) {
        setCreateError('Please enter a valid scheduled date/time (e.g. 2026-10-23T10:00).');
        return;
      }
      scheduledIso = parsedDate.toISOString();
    }

    try {
      setCreating(true);
      await api.meetings.create({
        courseId: selectedCourseId,
        title: trimmedTitle,
        description: trimmedDesc || undefined,
        joinUrl: trimmedUrl,
        startNow,
        scheduledAt: scheduledIso,
      });

      setCreateModalVisible(false);
      handleRefresh();
      Alert.alert('Success', 'Class meeting has been created successfully.');
    } catch (err: any) {
      // Mirror the server's real error message on failure
      const serverMessage = err?.message || 'Failed to create meeting.';
      setCreateError(serverMessage);
    } finally {
      setCreating(false);
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = (meeting: ClassMeetingItem) => {
    Alert.alert(
      'Cancel Meeting',
      `Are you sure you want to cancel "${meeting.title}"? Students will no longer be able to join.`,
      [
        { text: 'Keep Meeting', style: 'cancel' },
        {
          text: 'Yes, Cancel Meeting',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingId(meeting.id);
              await api.meetings.cancel(meeting.id);
              handleRefresh();
              Alert.alert('Meeting Cancelled', 'The meeting has been cancelled.');
            } catch (err: any) {
              Alert.alert('Cancellation Failed', formatMeetingError(err));
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  // View Attendance
  const handleViewAttendance = async (meeting: ClassMeetingItem) => {
    setAttendanceMeeting(meeting);
    setAttendanceData(null);
    setAttendanceError(null);
    setAttendanceModalVisible(true);
    setLoadingAttendance(true);

    try {
      const data = await api.meetings.getAttendance(meeting.id);
      setAttendanceData(data);
    } catch (err: any) {
      setAttendanceError(formatMeetingError(err));
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Categorize
  const liveMeetings = useMemo(
    () => meetings.filter((m) => m.derivedStatus === 'LIVE' || m.status === 'LIVE'),
    [meetings]
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings.filter(
        (m) =>
          (m.derivedStatus === 'SCHEDULED' || m.status === 'SCHEDULED') &&
          m.derivedStatus !== 'LIVE'
      ),
    [meetings]
  );

  const pastMeetings = useMemo(
    () =>
      meetings.filter(
        (m) =>
          m.derivedStatus === 'ENDED' ||
          m.derivedStatus === 'CANCELLED' ||
          m.status === 'ENDED' ||
          m.status === 'CANCELLED'
      ),
    [meetings]
  );

  const filteredMeetings = useMemo(() => {
    if (activeTab === 'LIVE') return liveMeetings;
    if (activeTab === 'UPCOMING') return upcomingMeetings;
    if (activeTab === 'PAST') return pastMeetings;
    return meetings;
  }, [activeTab, meetings, liveMeetings, upcomingMeetings, pastMeetings]);

  if (!isEligible) {
    return (
      <Screen scrollable={false} withTopInset={true}>
        <AppHeader
          title="Class Meetings"
          showBack={true}
          onBack={() => router.back()}
        />
        <View style={styles.restrictedContainer}>
          <Card style={styles.restrictedCard}>
            <ShieldAlert size={48} color={theme.colors.warning} />
            <Text
              style={[styles.restrictedTitle, { color: theme.colors.text }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              ITE Feature Only
            </Text>
            <Text
              style={[styles.restrictedDesc, { color: theme.colors.textSecondary }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Class Meetings are exclusively available for faculty instructors in the Institute of Teacher Education (ITE).
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  const renderMeetingCard = (item: ClassMeetingItem) => {
    const isLive = item.derivedStatus === 'LIVE' || item.status === 'LIVE';
    const isCancelled = item.derivedStatus === 'CANCELLED' || item.status === 'CANCELLED';
    const isEnded = item.derivedStatus === 'ENDED' || item.status === 'ENDED';
    const isCancelling = cancellingId === item.id;

    const displayTime = formatDeviceLocalTime(
      item.scheduledAt || item.startedAt || item.primaryTimeIso
    );

    return (
      <Card
        key={item.id}
        style={[
          styles.meetingCard,
          isLive && { borderColor: theme.colors.success, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Badge
              label={item.courseCode || 'ITE COURSE'}
              variant="primary"
              size="sm"
            />
            {isLive ? (
              <View
                style={[
                  styles.liveIndicator,
                  { backgroundColor: `${theme.colors.danger}15` },
                ]}
              >
                <Radio size={12} color={theme.colors.danger} />
                <Text style={[styles.liveText, { color: theme.colors.danger }]}>
                  LIVE NOW
                </Text>
              </View>
            ) : isCancelled ? (
              <Badge label="CANCELLED" variant="danger" size="sm" />
            ) : isEnded ? (
              <Badge label="ENDED" variant="default" size="sm" />
            ) : (
              <Badge label="UPCOMING" variant="info" size="sm" />
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Attendance: ${item.joinCount ?? 0} attendees`}
            style={[styles.attendeePill, { backgroundColor: `${theme.colors.info}18` }]}
            onPress={() => handleViewAttendance(item)}
            activeOpacity={0.7}
          >
            <Users size={12} color={theme.colors.info} />
            <Text style={[styles.attendeePillText, { color: theme.colors.info }]}>
              {item.joinCount ?? 0} joined
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.meetingTitle,
            { color: theme.colors.text, fontSize: font(16) },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {item.title}
        </Text>

        <Text
          style={[styles.courseTitle, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.courseTitle}
        </Text>

        {item.description ? (
          <Text
            style={[
              styles.meetingDescription,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={14} color={theme.colors.textSecondary} />
            <Text
              style={[styles.metaText, { color: theme.colors.textSecondary }]}
            >
              {displayTime}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {item.joinUrl ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Open meeting link for ${item.title}`}
              style={[styles.actionBtn, { backgroundColor: `${theme.colors.primary}18` }]}
              onPress={() => {
                const url = (item.joinUrl || '').trim();
                if (url && url.toLowerCase().startsWith('https://')) {
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Unable to open link', 'Please check your browser.');
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <ExternalLink size={14} color={theme.colors.primary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>
                Open Link
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View Attendance"
            style={[styles.actionBtn, { backgroundColor: `${theme.colors.info}18` }]}
            onPress={() => handleViewAttendance(item)}
            activeOpacity={0.7}
          >
            <Users size={14} color={theme.colors.info} />
            <Text style={[styles.actionBtnText, { color: theme.colors.info }]}>
              Attendance
            </Text>
          </TouchableOpacity>

          {!isCancelled && !isEnded && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Cancel ${item.title}`}
              style={[styles.actionBtn, { backgroundColor: `${theme.colors.danger}18` }]}
              onPress={() => handleCancelMeeting(item)}
              disabled={isCancelling}
              activeOpacity={0.7}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={theme.colors.danger} />
              ) : (
                <>
                  <Ban size={14} color={theme.colors.danger} />
                  <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>
                    Cancel
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen scrollable={false} withTopInset={true}>
      <AppHeader
        title="Class Meetings"
        subtitle="Manage Virtual Sessions"
        showBack={true}
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create New Meeting"
            style={[styles.createHeaderBtn, { backgroundColor: theme.colors.primary }]}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.createHeaderBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: theme.colors.border }]}>
        {(['ALL', 'LIVE', 'UPCOMING', 'PAST'] as TabFilter[]).map((tab) => {
          const isSelected = activeTab === tab;
          const count =
            tab === 'ALL'
              ? meetings.length
              : tab === 'LIVE'
              ? liveMeetings.length
              : tab === 'UPCOMING'
              ? upcomingMeetings.length
              : pastMeetings.length;

          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${tab}`}
              style={[
                styles.filterTab,
                isSelected && {
                  backgroundColor: `${theme.colors.primary}18`,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonBlock height={120} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={120} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={120} />
        </View>
      ) : (
        <FlatList
          data={filteredMeetings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderMeetingCard(item)}
          contentContainerStyle={[
            styles.listContent,
            filteredMeetings.length === 0 && styles.listEmptyContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBannerContainer}>
                <ErrorBanner
                  message={error}
                  onRetry={handleRefresh}
                  onDismiss={() => setError(null)}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video size={48} color={theme.colors.textSecondary} />
              <Text
                style={[styles.emptyTitle, { color: theme.colors.text }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {activeTab === 'LIVE'
                  ? 'No Live Meetings'
                  : activeTab === 'UPCOMING'
                  ? 'No Upcoming Meetings'
                  : activeTab === 'PAST'
                  ? 'No Past Meetings'
                  : 'No Class Meetings Created'}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.colors.textSecondary },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                Tap "+ New" in the header to create and schedule your first virtual class session.
              </Text>
            </View>
          }
        />
      )}

      {/* Create Meeting Modal */}
      <FormModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Schedule Class Meeting"
        subtitle="Create video link for ITE course"
        actions={
          <View style={styles.modalActionsRow}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setCreateModalVisible(false)}
              disabled={creating}
              style={{ flex: 1 }}
            />
            <Button
              title={creating ? 'Creating...' : 'Create Meeting'}
              variant="primary"
              onPress={handleCreateMeeting}
              loading={creating}
              disabled={creating}
              style={{ flex: 1.5 }}
            />
          </View>
        }
      >
        <View style={styles.formContent}>
          {createError ? (
            <ErrorBanner
              message={createError}
              onDismiss={() => setCreateError(null)}
            />
          ) : null}

          {/* Course Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Course <Text style={{ color: theme.colors.danger }}>*</Text>
            </Text>
            {courses.length === 0 ? (
              <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                No courses assigned.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.coursePillsContainer}
              >
                {courses.map((c) => {
                  const isSelected = selectedCourseId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.coursePill,
                        {
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                          backgroundColor: isSelected
                            ? `${theme.colors.primary}18`
                            : theme.colors.cardSecondary,
                        },
                      ]}
                      onPress={() => setSelectedCourseId(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.coursePillText,
                          {
                            color: isSelected
                              ? theme.colors.primary
                              : theme.colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {c.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Title Input */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelCountRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Meeting Title <Text style={{ color: theme.colors.danger }}>*</Text>
              </Text>
              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                {title.length}/120
              </Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="e.g. Chapter 4 Lecture & Discussion"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
          </View>

          {/* Description Input */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelCountRow}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Description (Optional)
              </Text>
              <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                {description.length}/500
              </Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                {
                  backgroundColor: theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Provide agenda or materials students need to prepare..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Join URL Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
              Meeting Link (HTTPS) <Text style={{ color: theme.colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="https://meet.google.com/abc-defg-hij"
              placeholderTextColor={theme.colors.textSecondary}
              value={joinUrl}
              onChangeText={setJoinUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={2048}
            />
            <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
              Must start with https:// (Google Meet, Zoom, MS Teams, etc.).
            </Text>
          </View>

          {/* Start Now Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Start Immediately
              </Text>
              <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                Marks the meeting as LIVE NOW right upon creation.
              </Text>
            </View>
            <Switch
              value={startNow}
              onValueChange={setStartNow}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          {/* Scheduled Date/Time if not starting now */}
          {!startNow && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                Scheduled Date & Time
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.cardSecondary,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="YYYY-MM-DDTHH:mm (e.g. 2026-10-23T14:30)"
                placeholderTextColor={theme.colors.textSecondary}
                value={scheduledDateStr}
                onChangeText={setScheduledDateStr}
                autoCapitalize="none"
              />
              <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                Meeting will display in each student's local device time.
              </Text>
            </View>
          )}
        </View>
      </FormModal>

      {/* Attendance Modal */}
      <FormModal
        visible={attendanceModalVisible}
        onClose={() => setAttendanceModalVisible(false)}
        title="Meeting Attendance"
        subtitle={attendanceMeeting?.title || 'Attendance Log'}
        actions={
          <Button
            title="Close"
            variant="outline"
            onPress={() => setAttendanceModalVisible(false)}
            style={{ width: '100%' }}
          />
        }
      >
        <View style={styles.attendanceContent}>
          {loadingAttendance ? (
            <View style={styles.attendanceLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.attendanceLoadingText, { color: theme.colors.textSecondary }]}>
                Loading attendee logs...
              </Text>
            </View>
          ) : attendanceError ? (
            <ErrorBanner
              message={attendanceError}
              onRetry={() => attendanceMeeting && handleViewAttendance(attendanceMeeting)}
            />
          ) : !attendanceData || attendanceData.attendees.length === 0 ? (
            <View style={styles.emptyAttendance}>
              <Users size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyAttendanceTitle, { color: theme.colors.text }]}>
                No Attendees Recorded
              </Text>
              <Text style={[styles.emptyAttendanceSubtitle, { color: theme.colors.textSecondary }]}>
                When students tap "Join Meeting", their participation will be recorded here automatically.
              </Text>
            </View>
          ) : (
            <View style={styles.attendeesList}>
              <View style={styles.attendanceSummaryHeader}>
                <Text style={[styles.totalAttendeesText, { color: theme.colors.text }]}>
                  Total Attendees: {attendanceData.totalAttendees}
                </Text>
              </View>
              {attendanceData.attendees.map((attendee) => (
                <View
                  key={attendee.userId + attendee.joinedAt}
                  style={[
                    styles.attendeeRow,
                    {
                      backgroundColor: theme.colors.cardSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.attendeeInfo}>
                    <Text style={[styles.attendeeName, { color: theme.colors.text }]}>
                      {attendee.name}
                    </Text>
                    {attendee.studentNumber ? (
                      <Text style={[styles.attendeeNumber, { color: theme.colors.textSecondary }]}>
                        ID: {attendee.studentNumber}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.attendeeTimeCol}>
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.attendeeJoinedAt, { color: theme.colors.textSecondary }]}>
                      {formatDeviceLocalTime(attendee.joinedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    minHeight: TOUCH_TARGET,
  },
  createHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 12,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: spacing.md,
  },
  errorBannerContainer: {
    marginBottom: spacing.md,
  },
  meetingCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  attendeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  attendeePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meetingTitle: {
    fontWeight: '700',
    marginTop: 2,
  },
  courseTitle: {
    fontSize: 13,
  },
  meetingDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 4,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    minHeight: TOUCH_TARGET,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  restrictedCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  restrictedDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContent: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  labelCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 11,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    minHeight: TOUCH_TARGET,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  coursePillsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  coursePill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coursePillText: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  attendanceContent: {
    paddingVertical: spacing.xs,
  },
  attendanceLoading: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  attendanceLoadingText: {
    fontSize: 13,
  },
  emptyAttendance: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyAttendanceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyAttendanceSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  attendeesList: {
    gap: spacing.xs,
  },
  attendanceSummaryHeader: {
    paddingBottom: spacing.xs,
  },
  totalAttendeesText: {
    fontSize: 13,
    fontWeight: '700',
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  attendeeNumber: {
    fontSize: 11,
    marginTop: 1,
  },
  attendeeTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeJoinedAt: {
    fontSize: 11,
  },
});
