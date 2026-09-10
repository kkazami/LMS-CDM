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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
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
import { Badge } from '../../../../../../src/components/common/Badge';
import { Button } from '../../../../../../src/components/common/Button';
import { Card } from '../../../../../../src/components/common/Card';
import { TOUCH_TARGET } from '../../../../../../src/lib/typography';
import type { ClassworkItem } from '@lms/types';

export default function StudentAssignmentDetailScreen() {
  const { courseId, assignmentId } = useLocalSearchParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [assignment, setAssignment] = useState<ClassworkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<Array<{ url: string; fileName: string; type: string }>>([]);

  const loadAssignment = async () => {
    if (!courseId || !assignmentId) return;

    try {
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
      }
    } catch {
      // Graceful fallback
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
        } catch {
          setLocalAttachments((prev) => [
            ...prev,
            { url: file.uri, fileName: file.name, type: 'FILE' },
          ]);
        } finally {
          setSubmitting(false);
        }
      }
    } catch {
      Alert.alert('File Error', 'Could not open file picker.');
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

  const handleSubmitAssignment = async () => {
    if (!assignment || !courseId) return;

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
        localAttachments
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
      Alert.alert('Submission Error', err?.message || 'Could not submit assignment.');
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme.colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.colors.text }]}>Assignment Details</Text>
        <View style={{ width: 38 }} />
      </View>

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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : !assignment ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Assignment Not Found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              The requested classwork item may have been removed or unpublished.
            </Text>
          </Card>
        ) : (
          <>
            {/* Title & Metadata Header Card */}
            <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.badgeRow}>
                <Badge label={assignment.type} variant="primary" size="sm" />
                {isGraded ? (
                  <Badge label={`Score: ${submission?.grade}/${assignment.maxPoints ?? 100}`} variant="success" size="sm" />
                ) : isSubmitted ? (
                  <Badge label="Submitted" variant="info" size="sm" />
                ) : assignment.dueDate ? (
                  <Badge label={`Due ${new Date(assignment.dueDate).toLocaleDateString()}`} variant="default" size="sm" />
                ) : null}
              </View>

              <Text style={[styles.assignmentTitle, { color: theme.colors.text }]}>
                {assignment.title}
              </Text>

              <View style={styles.metaRow}>
                {assignment.maxPoints && (
                  <View style={styles.metaItem}>
                    <Award size={16} color={theme.colors.primary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      {assignment.maxPoints} Points
                    </Text>
                  </View>
                )}
                {assignment.dueDate && (
                  <View style={styles.metaItem}>
                    <Clock size={16} color={theme.colors.warning} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      {new Date(assignment.dueDate).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Prompt Instructions */}
            {assignment.description ? (
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.cardHeading, { color: theme.colors.textSecondary }]}>
                  INSTRUCTIONS & SPECIFICATIONS
                </Text>
                <Text style={[styles.promptText, { color: theme.colors.text }]}>
                  {assignment.description}
                </Text>
              </View>
            ) : null}

            {/* Reference Attachments from Instructor */}
            {assignment.attachments && assignment.attachments.length > 0 && (
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.cardHeading, { color: theme.colors.textSecondary }]}>
                  REFERENCE MATERIALS ({assignment.attachments.length})
                </Text>
                {assignment.attachments.map((att) => (
                  <View
                    key={att.id}
                    style={[styles.referenceFileRow, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}
                  >
                    <Paperclip size={16} color={theme.colors.primary} />
                    <Text style={[styles.referenceFileName, { color: theme.colors.text }]} numberOfLines={1}>
                      {att.fileName}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Graded Evaluation Notice */}
            {isGraded && (
              <View style={[styles.gradeNoticeBox, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
                <CheckCircle2 size={24} color={theme.colors.success} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.gradeNoticeTitle, { color: theme.colors.success }]}>
                    Graded: {submission?.grade} / {assignment.maxPoints}
                  </Text>
                  <Text style={[styles.gradeNoticeSub, { color: theme.colors.textSecondary }]}>
                    Your submission has been reviewed and recorded by your professor.
                  </Text>
                </View>
              </View>
            )}

            {/* Submission Section */}
            {assignment.type !== 'MATERIAL' && (
              <View style={[styles.detailCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.cardHeading, { color: theme.colors.textSecondary }]}>
                  YOUR SUBMISSION FILES
                </Text>

                {localAttachments.length === 0 ? (
                  <View style={[styles.dropZone, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}>
                    <UploadCloud size={32} color={theme.colors.textSecondary} />
                    <Text style={[styles.dropZoneText, { color: theme.colors.textSecondary }]}>
                      Attach your solution documents or images
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
                      {!submission?.isReturned && (
                        <TouchableOpacity
                          onPress={() => setLocalAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}

                {/* Upload Buttons */}
                {!submission?.isReturned && (
                  <View style={styles.pickerRow}>
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

                {/* Submission Action */}
                <View style={styles.actionSection}>
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
                      <Text style={[styles.lockedText, { color: theme.colors.success }]}>
                        Submission Finalized & Graded
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title={localAttachments.length > 0 ? 'Turn In Assignment' : 'Mark as Done'}
                      onPress={handleSubmitAssignment}
                      loading={submitting}
                      icon={CheckCircle2}
                      style={{ width: '100%', backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }}
                    />
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  assignmentTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
  },
  referenceFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  referenceFileName: {
    fontSize: 13,
    flex: 1,
  },
  gradeNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  gradeNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gradeNoticeSub: {
    fontSize: 12,
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
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
  actionSection: {
    marginTop: 18,
  },
  lockedNotice: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 20,
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
});
