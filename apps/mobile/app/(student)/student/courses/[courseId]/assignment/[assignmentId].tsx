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
  Award,
  Clock,
  Paperclip,
  CheckCircle2,
  FileUp,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../../../src/stores/auth-store';
import { useTheme } from '../../../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../../../src/hooks/useResponsive';
import { Badge } from '../../../../../../src/components/common/Badge';
import { Button } from '../../../../../../src/components/common/Button';
import { Card } from '../../../../../../src/components/common/Card';
import {
  Screen,
  AppHeader,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../../../src/lib/typography';
import { radius, spacing } from '../../../../../../src/lib/theme';
import type { ClassworkItem } from '@lms/types';
import { ClassworkAttachments, ClassworkDescription } from '../../../../../../src/components/classwork/ClassworkAttachments';

export default function StudentAssignmentDetailScreen() {
  const { courseId, assignmentId } = useLocalSearchParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [assignment, setAssignment] = useState<ClassworkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<Array<{ url: string; fileName: string; type: string }>>([]);

  const loadAssignment = async () => {
    if (!courseId || !assignmentId) return;

    try {
      setErrorMessage(null);
      const classworkRes = await api.courses.getClasswork(courseId);
      const match = (classworkRes?.items || []).find((i) => i.id === assignmentId);
      if (match) {
        setAssignment(match);
        if (match.submission?.attachments) {
          setLocalAttachments(
            match.submission.attachments.map((a) => ({
              url: a.url,
              fileName: a.fileName,
              type: 'FILE',
            }))
          );
        }
      } else {
        setErrorMessage('Assignment not found in course classwork.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not load assignment details. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAssignment();
  }, [courseId, assignmentId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAssignment();
  };

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
      Alert.alert('File Error', err?.message || 'Could not open file picker.');
    }
  };

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

  const handleSubmitAssignment = async () => {
    if (!assignment || !courseId) return;

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
        assignment.id,
        'SUBMITTED',
        primaryAtt?.url,
        primaryAtt?.fileName,
        undefined,
        localAttachments.length > 0 ? localAttachments : undefined
      );

      try {
        Burnt.toast({
          title: 'Assignment Submitted!',
          message: 'Your work has been turned in.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      loadAssignment();
    } catch (err: any) {
      const serverMessage = err?.message || err?.error?.message || err?.bodyData?.message || err?.bodyData?.error;
      Alert.alert('Submission Error', serverMessage || 'Could not submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubmitAssignment = async () => {
    if (!assignment || !courseId) return;

    Alert.alert('Unsubmit Assignment?', 'Your submission will be reverted to draft so you can update files.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsubmit',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await api.courses.submitAssignment(courseId, assignment.id, 'DRAFT');
            try {
              Burnt.toast({
                title: 'Draft Restored',
                message: 'You may now replace your files.',
                preset: 'done',
              });
            } catch {
              // Fallback
            }
            loadAssignment();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not unsubmit.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const submission = assignment?.submission;
  const isGraded = submission?.status === 'GRADED' || (typeof submission?.grade === 'number');
  const isSubmitted = submission?.status === 'SUBMITTED';

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
      <AppHeader
        showBack
        title="Assignment Details"
        subtitle={assignment?.title || 'Course Classwork Activity'}
      />

      <View style={[styles.mainContent, { padding: s(spacing.lg) }]}>
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadAssignment}
            onDismiss={() => setErrorMessage(null)}
            retryAccessibilityLabel="Retry loading assignment details"
            style={{ marginBottom: s(spacing.md) }}
          />
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                  marginBottom: s(spacing.md),
                },
              ]}
            >
              <SkeletonBlock width={s(80)} height={s(20)} borderRadius={radius.sm} style={{ marginBottom: s(spacing.sm) }} />
              <SkeletonBlock width="85%" height={s(22)} style={{ marginBottom: s(spacing.md) }} />
              <SkeletonBlock width="45%" height={s(14)} />
            </View>

            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                  marginBottom: s(spacing.md),
                },
              ]}
            >
              <SkeletonBlock width="35%" height={s(14)} style={{ marginBottom: s(spacing.md) }} />
              <SkeletonBlock width="100%" height={s(13)} style={{ marginBottom: s(spacing.xs) }} />
              <SkeletonBlock width="95%" height={s(13)} style={{ marginBottom: s(spacing.xs) }} />
              <SkeletonBlock width="70%" height={s(13)} />
            </View>

            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                },
              ]}
            >
              <SkeletonBlock width="40%" height={s(14)} style={{ marginBottom: s(spacing.md) }} />
              <SkeletonBlock width="100%" height={s(44)} borderRadius={radius.md} />
            </View>
          </View>
        ) : !assignment ? (
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
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Assignment Not Found
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              The requested classwork item may have been removed or unpublished.
            </Text>
          </Card>
        ) : (
          <>
            {/* Title & Metadata Header Card */}
            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                  marginBottom: s(spacing.md),
                },
              ]}
            >
              <View style={[styles.badgeRow, { gap: s(spacing.xs), marginBottom: s(spacing.sm) }]}>
                <Badge label={assignment.type} variant="primary" size="sm" />
                {isGraded ? (
                  <Badge
                    label={`Score: ${submission?.grade}/${assignment.maxPoints ?? 100}`}
                    variant="success"
                    size="sm"
                  />
                ) : isSubmitted ? (
                  <Badge label="Submitted" variant="info" size="sm" />
                ) : assignment.dueDate ? (
                  <Badge
                    label={`Due ${new Date(assignment.dueDate).toLocaleDateString()}`}
                    variant="default"
                    size="sm"
                  />
                ) : null}
              </View>

              <Text
                style={[
                  styles.assignmentTitle,
                  { color: theme.colors.text, fontSize: font(20), lineHeight: font(26) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {assignment.title}
              </Text>

              <View style={[styles.metaRow, { gap: s(spacing.md), marginTop: s(spacing.xs) }]}>
                {assignment.maxPoints && (
                  <View style={styles.metaItem}>
                    <Award size={s(16)} color={theme.colors.primary} />
                    <Text
                      style={[styles.metaText, { color: theme.colors.textSecondary, fontSize: font(13) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {assignment.maxPoints} Points
                    </Text>
                  </View>
                )}
                {assignment.dueDate && (
                  <View style={styles.metaItem}>
                    <Clock size={s(16)} color={theme.colors.warning} />
                    <Text
                      style={[styles.metaText, { color: theme.colors.textSecondary, fontSize: font(13) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {new Date(assignment.dueDate).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Prompt Instructions */}
            {Boolean(assignment.description) && (
              <View
                style={[
                  styles.detailCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cardHeading,
                    { color: theme.colors.textSecondary, fontSize: font(11), marginBottom: s(spacing.sm) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  INSTRUCTIONS & SPECIFICATIONS
                </Text>
                <ClassworkDescription
                  content={assignment.description}
                  textStyle={[
                    styles.promptText,
                    { color: theme.colors.text, fontSize: font(14), lineHeight: font(22) },
                  ]}
                />
              </View>
            )}

            {/* Reference Attachments from Instructor */}
            {Boolean(assignment.attachments && assignment.attachments.length > 0) && (
              <View
                style={[
                  styles.detailCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <ClassworkAttachments
                  attachments={assignment.attachments}
                  title="REFERENCE MATERIALS"
                />
              </View>
            )}

            {/* Graded Evaluation Notice */}
            {isGraded && (
              <View
                style={[
                  styles.gradeNoticeBox,
                  {
                    backgroundColor: theme.colors.successBg,
                    borderColor: theme.colors.success,
                    borderRadius: radius.lg,
                    padding: s(spacing.md),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <CheckCircle2 size={s(24)} color={theme.colors.success} />
                <View style={{ flex: 1, marginLeft: s(spacing.md) }}>
                  <Text
                    style={[
                      styles.gradeNoticeTitle,
                      { color: theme.colors.success, fontSize: font(15) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Graded: {submission?.grade} / {assignment.maxPoints}
                  </Text>
                  <Text
                    style={[
                      styles.gradeNoticeSub,
                      { color: theme.colors.textSecondary, fontSize: font(12), marginTop: 2 },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Your submission has been reviewed and recorded by your professor.
                  </Text>
                </View>
              </View>
            )}

            {/* Submission Section */}
            {assignment.type !== 'MATERIAL' && (
              <View
                style={[
                  styles.detailCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cardHeading,
                    { color: theme.colors.textSecondary, fontSize: font(11), marginBottom: s(spacing.sm) },
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
                      Attach your solution documents or images
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
                          marginBottom: s(spacing.sm),
                        },
                      ]}
                    >
                      <Paperclip size={s(16)} color={theme.colors.primary} />
                      <Text
                        style={[
                          styles.uploadedFileName,
                          { color: theme.colors.text, fontSize: font(13), marginLeft: s(spacing.sm) },
                        ]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {file.fileName}
                      </Text>
                      {!submission?.isReturned && (
                        <TouchableOpacity
                          onPress={() => setLocalAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove attached file ${file.fileName}`}
                        >
                          <Trash2 size={s(16)} color={theme.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}

                {/* Upload Buttons */}
                {!submission?.isReturned && (
                  <View style={[styles.pickerRow, { gap: s(spacing.md), marginTop: s(spacing.xs) }]}>
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

                {/* Submission Action */}
                <View style={[styles.actionSection, { marginTop: s(spacing.lg) }]}>
                  {isSubmitted && !submission?.isReturned ? (
                    <Button
                      title="Unsubmit Assignment"
                      onPress={handleUnsubmitAssignment}
                      loading={submitting}
                      variant="outline"
                      style={{ width: '100%' }}
                    />
                  ) : submission?.isReturned ? (
                    <View style={styles.lockedNotice}>
                      <Text
                        style={[
                          styles.lockedText,
                          { color: theme.colors.success, fontSize: font(13) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Submission Finalized & Graded
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
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    paddingBottom: 40,
  },
  mainContent: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 12,
  },
  detailCard: {
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  assignmentTitle: {
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {},
  cardHeading: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  promptText: {},
  referenceFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  referenceFileName: {
    flex: 1,
  },
  gradeNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  gradeNoticeTitle: {
    fontWeight: '700',
  },
  gradeNoticeSub: {},
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
  },
  pickerRow: {
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
  actionSection: {},
  lockedNotice: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  lockedText: {
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
});
