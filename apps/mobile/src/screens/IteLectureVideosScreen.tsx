import { Text } from '../components/ui/Text';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  Film,
  Play,
  Clock,
  ExternalLink,
  ShieldAlert,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import {
  Screen,
  AppHeader,
  HeaderIconButton,
  Card,
  ErrorBanner,
  SkeletonBlock,
  FormModal,
} from '../components/ui';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { isIteUser } from '../lib/ite-eligibility';
import { API_BASE_URL } from '../lib/constants';
import { getOnPrimaryColor } from '../lib/design-system';
import { radius, spacing } from '../lib/theme';
import { TOUCH_TARGET } from '../lib/typography';
import type { IteLectureVideoItem, IteLectureCourseSummary } from '@lms/api-client';

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Recorded Lecture';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function IteLectureVideosScreen({ role = 'STUDENT' }: { role?: 'STUDENT' | 'TEACHER' }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const isEligible = isIteUser(user);
  const isInstructor = role === 'TEACHER';

  const [lectures, setLectures] = useState<IteLectureVideoItem[]>([]);
  const [courses, setCourses] = useState<IteLectureCourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLecture, setActiveLecture] = useState<IteLectureVideoItem | null>(null);

  // Instructor create lecture modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newSourceType, setNewSourceType] = useState<'YOUTUBE' | 'DRIVE'>('YOUTUBE');
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchLectures = useCallback(
    async (isBackground = false) => {
      if (!isEligible) {
        setLoading(false);
        return;
      }
      try {
        if (!isBackground) setError(null);
        const res = await api.lectureVideos.list();
        setLectures(res?.lectures || []);
        setCourses(res?.courses || []);
        if (!newCourseId && res?.courses && res.courses.length > 0) {
          setNewCourseId(res.courses[0].id);
        }
      } catch (err: any) {
        if (!isBackground) {
          setError(err?.message || 'Could not load lecture videos. Please try again.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, isEligible, newCourseId]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isEligible) return;
      fetchLectures();
    }, [isEligible, fetchLectures])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLectures();
  };

  const filteredLectures = useMemo(() => {
    if (selectedCourseId === 'ALL') return lectures;
    return lectures.filter((item) => item.courseId === selectedCourseId);
  }, [lectures, selectedCourseId]);

  const handleOpenExternal = async (url: string | null) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open Link', `Please open ${url} in your browser.`);
      }
    } catch {
      Alert.alert('Error', 'Unable to open the video link.');
    }
  };

  const handleCreateLecture = async () => {
    if (!newTitle.trim()) {
      setFormError('Lecture title is required.');
      return;
    }
    if (!newCourseId) {
      setFormError('Please select a course.');
      return;
    }
    if (!newExternalUrl.trim()) {
      setFormError('Please provide the video URL.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await api.lectureVideos.create({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        courseId: newCourseId,
        sourceType: newSourceType,
        externalUrl: newExternalUrl.trim(),
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewExternalUrl('');
      fetchLectures();
    } catch (err: any) {
      setFormError(err?.message || 'Could not publish lecture video.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLecture = (item: IteLectureVideoItem) => {
    Alert.alert(
      'Delete Lecture Video',
      `Remove "${item.title}" from ${item.courseCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.lectureVideos.delete(item.id);
              setLectures((prev) => prev.filter((l) => l.id !== item.id));
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete lecture video.');
            }
          },
        },
      ]
    );
  };

  if (!isEligible) {
    return (
      <Screen>
        <AppHeader showBack title="Lecture Videos" subtitle="Recorded course lectures" />
        <View style={[styles.centerBox, { padding: s(spacing.xl) }]}>
          <Card
            style={[
              styles.emptyCard,
              {
                padding: s(spacing.xxl),
                borderRadius: radius.lg,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <ShieldAlert size={s(42)} color={theme.colors.danger} />
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.colors.text, fontSize: font(16), marginTop: s(spacing.md) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              ITE Feature Only
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary, fontSize: font(13), marginTop: s(spacing.xs) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Lecture Videos are exclusively available to Institute of Teacher Education students and faculty.
            </Text>
            <Button
              title="Go Back"
              variant="outline"
              onPress={() => router.back()}
              style={{ marginTop: s(spacing.lg) }}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        showBack
        title="Lecture Videos"
        subtitle="Recorded lectures & course videos"
        rightAction={
          isInstructor && courses.length > 0 ? (
            <HeaderIconButton
              accessibilityLabel="Add Lecture Video"
              onPress={() => {
                setFormError('');
                if (!newCourseId && courses[0]) setNewCourseId(courses[0].id);
                setShowCreateModal(true);
              }}
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Plus size={s(20)} color={getOnPrimaryColor(theme)} />
            </HeaderIconButton>
          ) : undefined
        }
      />

      {/* Course Filter Pills */}
      {courses.length > 0 && (
        <View
          style={[
            styles.filterBar,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
              paddingVertical: s(spacing.sm),
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: s(spacing.lg),
              gap: s(spacing.xs),
            }}
          >
            <TouchableOpacity
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCourseId === 'ALL' }}
              style={[
                styles.filterChip,
                {
                  paddingHorizontal: s(spacing.md),
                  paddingVertical: s(spacing.xs),
                  borderRadius: radius.full,
                  backgroundColor:
                    selectedCourseId === 'ALL' ? theme.colors.primary : theme.colors.surfaceAlt,
                  borderColor:
                    selectedCourseId === 'ALL' ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedCourseId('ALL')}
            >
              <Text
                style={{
                  fontSize: font(12),
                  fontWeight: selectedCourseId === 'ALL' ? '700' : '500',
                  color:
                    selectedCourseId === 'ALL'
                      ? getOnPrimaryColor(theme)
                      : theme.colors.textSecondary,
                }}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                All Courses ({lectures.length})
              </Text>
            </TouchableOpacity>

            {courses.map((course) => {
              const isSelected = selectedCourseId === course.id;
              return (
                <TouchableOpacity
                  key={course.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.filterChip,
                    {
                      paddingHorizontal: s(spacing.md),
                      paddingVertical: s(spacing.xs),
                      borderRadius: radius.full,
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceAlt,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCourseId(course.id)}
                >
                  <Text
                    style={{
                      fontSize: font(12),
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? getOnPrimaryColor(theme) : theme.colors.textSecondary,
                    }}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {course.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {error && (
        <View style={{ paddingHorizontal: s(spacing.lg), paddingTop: s(spacing.md) }}>
          <ErrorBanner
            message={error}
            onRetry={() => fetchLectures()}
            onDismiss={() => setError(null)}
          />
        </View>
      )}

      {loading ? (
        <View style={{ padding: s(spacing.lg), gap: s(spacing.md) }}>
          <SkeletonBlock width="100%" height={s(140)} borderRadius={radius.lg} />
          <SkeletonBlock width="100%" height={s(140)} borderRadius={radius.lg} />
          <SkeletonBlock width="100%" height={s(140)} borderRadius={radius.lg} />
        </View>
      ) : (
        <FlatList
          data={filteredLectures}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={{
            padding: s(spacing.lg),
            gap: s(spacing.md),
            paddingBottom: s(spacing.xxxl),
          }}
          ListEmptyComponent={
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
              <Film size={s(40)} color={theme.colors.textSecondary} />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text, fontSize: font(16), marginTop: s(spacing.md) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                No Lecture Videos Yet
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.colors.textSecondary, fontSize: font(13), marginTop: s(spacing.xs) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {isInstructor
                  ? 'Tap the + button in the top right to publish a recorded lecture video for your class.'
                  : 'Recorded lectures posted by your ITE instructors will appear here.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => {
            const progress = item.myProgress;
            const isCompleted = progress?.status === 'COMPLETED';
            const isInProgress = progress?.status === 'IN_PROGRESS';

            return (
              <Card
                style={[
                  styles.lectureCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.badgeGroup, { gap: s(spacing.xs) }]}>
                    <Badge label={item.courseCode} variant="primary" size="sm" />
                    <Badge label={item.sourceLabel} variant="default" size="sm" />
                    {!isInstructor && isCompleted && (
                      <Badge label="Completed" variant="success" size="sm" />
                    )}
                    {!isInstructor && isInProgress && (
                      <Badge
                        label={`In Progress · ${Math.round(progress?.percentWatched || 0)}%`}
                        variant="warning"
                        size="sm"
                      />
                    )}
                  </View>

                  {item.canManage && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title}`}
                      onPress={() => handleDeleteLecture(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={s(17)} color={theme.colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text
                  style={[
                    styles.lectureTitle,
                    { color: theme.colors.text, fontSize: font(15), marginTop: s(spacing.sm) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: font(12),
                    marginTop: 2,
                  }}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {item.courseTitle}
                  {item.courseSection ? ` (${item.courseSection})` : ''}
                </Text>

                {item.description ? (
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: font(13),
                      lineHeight: font(18),
                      marginTop: s(spacing.xs),
                    }}
                    numberOfLines={3}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.metaRow,
                    {
                      marginTop: s(spacing.md),
                      paddingTop: s(spacing.sm),
                      borderTopColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={[styles.metaLeft, { gap: s(spacing.xs) }]}>
                    <Clock size={s(13)} color={theme.colors.textSecondary} />
                    <Text
                      style={{ color: theme.colors.textSecondary, fontSize: font(11.5) }}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {formatDuration(item.durationSeconds)} &bull; {item.uploadedByName}
                      {item.createdAt ? ` &bull; ${formatDate(item.createdAt)}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={[styles.actionRow, { marginTop: s(spacing.md), gap: s(spacing.sm) }]}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Watch ${item.title}`}
                    style={[
                      styles.watchBtn,
                      {
                        backgroundColor: theme.colors.primary,
                        borderRadius: radius.md,
                        paddingVertical: s(spacing.sm),
                        paddingHorizontal: s(spacing.md),
                        gap: s(spacing.xs),
                      },
                    ]}
                    onPress={() => setActiveLecture(item)}
                  >
                    <Play size={s(15)} color={getOnPrimaryColor(theme)} />
                    <Text
                      style={{
                        color: getOnPrimaryColor(theme),
                        fontSize: font(13),
                        fontWeight: '700',
                      }}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Watch Lecture
                    </Text>
                  </TouchableOpacity>

                  {item.externalUrl ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.title} externally`}
                      style={[
                        styles.extBtn,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surfaceAlt,
                          borderRadius: radius.md,
                          paddingVertical: s(spacing.sm),
                          paddingHorizontal: s(spacing.md),
                          gap: s(spacing.xs),
                        },
                      ]}
                      onPress={() => handleOpenExternal(item.externalUrl)}
                    >
                      <ExternalLink size={s(14)} color={theme.colors.text} />
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: font(12.5),
                          fontWeight: '600',
                        }}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Open Link
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* In-App Video Player Modal */}
      <Modal
        visible={Boolean(activeLecture)}
        animationType="slide"
        onRequestClose={() => setActiveLecture(null)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.border,
                paddingHorizontal: s(spacing.lg),
                paddingVertical: s(spacing.md),
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: s(spacing.md) }}>
              <Text
                style={{ color: theme.colors.text, fontSize: font(15), fontWeight: '700' }}
                numberOfLines={1}
              >
                {activeLecture?.title}
              </Text>
              <Text
                style={{ color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 }}
                numberOfLines={1}
              >
                {activeLecture?.courseCode} &bull; {activeLecture?.uploadedByName}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close video player"
              onPress={() => setActiveLecture(null)}
              style={[
                styles.closeModalBtn,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderRadius: radius.full,
                },
              ]}
            >
              <X size={s(18)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {activeLecture && (
            <View style={{ flex: 1 }}>
              {Platform.OS === 'web' ? (
                <View style={[styles.centerBox, { padding: s(spacing.xl) }]}>
                  <Button
                    title="Open Lecture Video"
                    onPress={() =>
                      handleOpenExternal(
                        activeLecture.externalUrl ||
                          activeLecture.embedUrl ||
                          (activeLecture.streamUrl ? `${API_BASE_URL}${activeLecture.streamUrl}` : null)
                      )
                    }
                  />
                </View>
              ) : activeLecture.embedUrl ? (
                <WebView
                  source={{ uri: activeLecture.embedUrl }}
                  style={{ flex: 1, backgroundColor: '#000000' }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                />
              ) : activeLecture.streamUrl ? (
                <WebView
                  source={{
                    uri: `${API_BASE_URL}${activeLecture.streamUrl}`,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  }}
                  style={{ flex: 1, backgroundColor: '#000000' }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                />
              ) : (
                <View style={[styles.centerBox, { padding: s(spacing.xl) }]}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: font(14) }}>
                    Video stream is unavailable for this item.
                  </Text>
                </View>
              )}

              {activeLecture.description ? (
                <View
                  style={{
                    padding: s(spacing.lg),
                    backgroundColor: theme.colors.card,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: font(13),
                      fontWeight: '700',
                      marginBottom: 4,
                    }}
                  >
                    Lecture Notes
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: font(12.5),
                      lineHeight: font(18),
                    }}
                  >
                    {activeLecture.description}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Modal>

      {/* Instructor Add Lecture Video Modal */}
      {isInstructor && (
        <FormModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add Lecture Video"
          subtitle="Share a YouTube or Google Drive lecture with your ITE course"
        >
          {formError ? (
            <ErrorBanner
              message={formError}
              onDismiss={() => setFormError('')}
              style={{ marginBottom: s(spacing.md) }}
            />
          ) : null}

          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: font(11),
              fontWeight: '700',
              letterSpacing: 0.5,
              marginBottom: s(spacing.xs),
            }}
          >
            COURSE
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: s(spacing.md) }}
            contentContainerStyle={{ gap: s(spacing.xs) }}
          >
            {courses.map((course) => {
              const selected = newCourseId === course.id;
              return (
                <TouchableOpacity
                  key={course.id}
                  accessibilityRole="button"
                  style={[
                    styles.filterChip,
                    {
                      paddingHorizontal: s(spacing.md),
                      paddingVertical: s(spacing.xs),
                      borderRadius: radius.md,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setNewCourseId(course.id)}
                >
                  <Text
                    style={{
                      fontSize: font(12),
                      fontWeight: selected ? '700' : '500',
                      color: selected ? getOnPrimaryColor(theme) : theme.colors.text,
                    }}
                  >
                    {course.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: font(11),
              fontWeight: '700',
              letterSpacing: 0.5,
              marginBottom: s(spacing.xs),
            }}
          >
            VIDEO SOURCE
          </Text>
          <View style={{ flexDirection: 'row', gap: s(spacing.sm), marginBottom: s(spacing.md) }}>
            {(['YOUTUBE', 'DRIVE'] as const).map((src) => {
              const selected = newSourceType === src;
              return (
                <TouchableOpacity
                  key={src}
                  accessibilityRole="button"
                  style={[
                    styles.sourceToggleBtn,
                    {
                      flex: 1,
                      paddingVertical: s(spacing.sm),
                      borderRadius: radius.md,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setNewSourceType(src)}
                >
                  {selected && <CheckCircle2 size={s(14)} color={getOnPrimaryColor(theme)} />}
                  <Text
                    style={{
                      fontSize: font(12.5),
                      fontWeight: '700',
                      color: selected ? getOnPrimaryColor(theme) : theme.colors.textSecondary,
                    }}
                  >
                    {src === 'YOUTUBE' ? 'YouTube' : 'Google Drive'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Lecture Title"
            placeholder="e.g., Week 3: Principles of Teaching & Learning"
            value={newTitle}
            onChangeText={setNewTitle}
          />

          <Input
            label={newSourceType === 'YOUTUBE' ? 'YouTube Video URL' : 'Google Drive Share URL'}
            placeholder={
              newSourceType === 'YOUTUBE'
                ? 'https://www.youtube.com/watch?v=...'
                : 'https://drive.google.com/file/d/.../view'
            }
            value={newExternalUrl}
            onChangeText={setNewExternalUrl}
            autoCapitalize="none"
          />

          {newSourceType === 'DRIVE' && (
            <Text
              style={{
                color: theme.colors.warning,
                fontSize: font(11.5),
                lineHeight: font(16),
                marginBottom: s(spacing.sm),
              }}
            >
              Progress tracking isn&apos;t available for Google Drive videos. Use a YouTube or uploaded video for tracked lectures.
            </Text>
          )}

          <Input
            label="Description (Optional)"
            placeholder="Key topics covered and study notes..."
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
            numberOfLines={3}
          />

          <Button
            title="Publish Lecture Video"
            onPress={handleCreateLecture}
            loading={saving}
            style={{ marginTop: s(spacing.md) }}
          />
        </FormModal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    borderBottomWidth: 1,
  },
  filterChip: {
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  lectureCard: {
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flex: 1,
  },
  lectureTitle: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: TOUCH_TARGET ?? 44,
  },
  extBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: TOUCH_TARGET ?? 44,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    minHeight: 40,
  },
});
