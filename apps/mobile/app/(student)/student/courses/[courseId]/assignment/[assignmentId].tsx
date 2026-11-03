import { useAssignmentUploads } from '../../../../../../src/hooks/useAssignmentUploads';
import { API_BASE_URL } from '../../../../../../src/lib/constants';
import { openSafeUrl } from '../../../../../../src/lib/open-link';
import { setCachedData, getCachedData } from '../../../../../../src/lib/offline-storage';
import { useAssignmentDraft } from '../../../../../../src/hooks/useAssignmentDraft';
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
  const { attachments: localAttachments, setAttachments: setLocalAttachments, restoreServer, prepareSubmission, confirmReceipt, draftStatus, draftReady, retryDraft } = useAssignmentDraft(courseId, assignmentId);
  const { pickDocument: handlePickDocument, pickImage: handlePickImage, retryUpload, cancelUpload, uploadProgress } = useAssignmentUploads(setLocalAttachments);

  const loadAssignment = async () => {
    if (!courseId || !assignmentId) return;

    try {
      setErrorMessage(null);
      const classworkRes = await api.courses.getClasswork(courseId);
      const match = (classworkRes?.items || []).find((i) => i.id === assignmentId);
      if (match) {
        if (match.labAssignmentId) { router.replace({ pathname: '/student/practical-labs', params: { courseId, assignmentId: match.labAssignmentId } } as any); return; }
        if (!Object.hasOwn(match, 'formId')) { setErrorMessage('The web backend needs an update before this work can open in the app. Continue through the web portal.'); return; }
        if (match.formId) { router.replace({ pathname: '/student/assessment', params: { courseId, formId: match.formId } } as any); return; }
        setAssignment(match);
        void setCachedData('continue_learning', { courseId, title: match.title, route: `/student/courses/${courseId}/assignment/${match.id}` });
        if (match.submission?.attachments) {
          restoreServer(
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

  const handleSubmitAssignment = async () => {
    if (!assignment || !courseId || submitting || uploadProgress !== null) return;

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
      const operationKey = await prepareSubmission();
      const receipt = await api.courses.submitAssignment(
        courseId,
        assignment.id,
        'SUBMITTED',
        undefined,
        undefined,
        operationKey,
        localAttachments.map(({ url, fileName, type }) => ({ url, fileName, type })),
        true
      );
      await confirmReceipt(receipt.submission.id);

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
    if (!assignment || !courseId || submitting || uploadProgress !== null) return;

    Alert.alert('Unsubmit Assignment?', 'Your submission will be reverted to draft so you can update files.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsubmit',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            const operationKey = await prepareSubmission('DRAFT');
            const receipt = await api.courses.submitAssignment(courseId, assignment.id, 'DRAFT', undefined, undefined, operationKey);
            await confirmReceipt(receipt.submission.id, 'DRAFT');
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
        {!!draftStatus && <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 12 }}>{draftStatus}</Text>}
        {!draftReady && <Button title="Retry draft storage" variant="outline" onPress={retryDraft} style={{ marginBottom: 12 }} />}
        {(!draftReady || !!errorMessage) && <Button title="Continue in the web portal" variant="ghost" onPress={() => { void openSafeUrl(`${API_BASE_URL}/${useAuthStore.getState().user?.institute.code ?? 'ics'}/courses/${courseId}/classwork/${assignmentId}`); }} />}
        {uploadProgress !== null && <View style={{ gap: 8, marginBottom: 16 }}><Text accessibilityLiveRegion="polite" style={{ color: theme.colors.text, fontSize: 16 }}>{uploadProgress >= 100 ? 'Checking attachment…' : `Uploading · ${uploadProgress}%`}</Text><Button title="Cancel upload" variant="outline" onPress={cancelUpload} /></View>}
        {uploadProgress === null && localAttachments.filter(file => /^(file|content):/.test(file.url)).map(file => <Button key={file.url} title={`Retry upload: ${file.fileName}`} variant="outline" onPress={() => { void retryUpload(file); }} disabled={!draftReady || submitting} style={{ marginBottom: 12 }} />)}
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
            {isGraded && <Button title="View grades and instructor feedback" variant="outline" onPress={() => router.push(`/student/courses/${courseId}?tab=GRADES` as any)} style={{ marginBottom: 16 }} />}
            {!!submission?.submittedAt && <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>Submitted {new Date(submission.submittedAt).toLocaleString()}</Text>}
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
                        {file.fileName}{/^(file|content):/.test(file.url) ? ' · upload pending' : ''}
                      </Text>
                      {!submission?.isReturned && (
                        <TouchableOpacity
                          disabled={submitting || uploadProgress !== null}
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
