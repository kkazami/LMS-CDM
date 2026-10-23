import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import {
  BookOpen,
  FileText,
  File,
  FileCode,
  Image as ImageIcon,
  FileArchive,
  Download,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../../../src/stores/auth-store';
import { useTheme } from '../../../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../../../src/hooks/useResponsive';
import {
  Screen,
  AppHeader,
  Card,
  SectionTitle,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../../../src/components/ui';
import { Badge } from '../../../../../../src/components/common/Badge';
import { radius, spacing } from '../../../../../../src/lib/theme';
import { TOUCH_TARGET } from '../../../../../../src/lib/typography';
import { API_BASE_URL } from '../../../../../../src/lib/constants';
import type { ClassworkItem, ClassworkAttachment, Course } from '@lms/types';
import { ClassworkAttachments, ClassworkDescription } from '../../../../../../src/components/classwork/ClassworkAttachments';
import { openSafeUrl } from '../../../../../../src/lib/open-link';

interface AttachmentLoadState {
  loading: boolean;
  error: string | null;
  downloadedUri?: string | null;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(filename?: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

function getMimeType(filename?: string): string {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'zip':
      return 'application/zip';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default:
      return 'application/octet-stream';
  }
}

export default function StudentMaterialReaderScreen() {
  const router = useRouter();
  const { courseId, materialId } = useLocalSearchParams<{
    courseId: string;
    materialId: string;
  }>();

  const api = useAuthStore((s) => s.api);
  const token = useAuthStore((s) => s.token);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [course, setCourse] = useState<Course | null>(null);
  const [material, setMaterial] = useState<ClassworkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-attachment loading and error states to isolate failures gracefully
  const [attachmentStates, setAttachmentStates] = useState<Record<string, AttachmentLoadState>>({});

  const loadMaterialData = useCallback(async () => {
    if (!courseId || !materialId) {
      setError('Missing course or material identifier.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [classworkRes, courseRes] = await Promise.allSettled([
        api.courses.getClasswork(courseId),
        api.courses.get(courseId),
      ]);

      if (courseRes.status === 'fulfilled' && courseRes.value?.course) {
        setCourse(courseRes.value.course);
      }

      if (classworkRes.status === 'fulfilled') {
        const classworkData = classworkRes.value;
        const allItems: ClassworkItem[] = [
          ...(classworkData.items || []),
          ...(classworkData.categories?.flatMap((c) => c.items) || []),
        ];

        // Unique by ID
        const matched = allItems.find((item) => item.id === materialId);
        if (matched) {
          setMaterial(matched);
        } else {
          setError('This learning material could not be found in the current course.');
        }
      } else {
        throw classworkRes.reason;
      }
    } catch (err: any) {
      console.error('Error loading material details:', err);
      setError(err?.message || 'Could not load learning material details. Please check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, courseId, materialId]);

  useEffect(() => {
    loadMaterialData();
  }, [loadMaterialData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMaterialData();
  }, [loadMaterialData]);

  // Authenticated Attachment Opener & Downloader
  const handleOpenAttachment = useCallback(
    async (att: ClassworkAttachment) => {
      const attId = att.id || att.url;

      setAttachmentStates((prev) => ({
        ...prev,
        [attId]: { loading: true, error: null },
      }));

      try {
        const rawUrl = att.url || '';
        const isAbsoluteHttp = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

        // Check if origin strictly matches API_BASE_URL
        let isSameOrigin = false;
        if (!isAbsoluteHttp) {
          isSameOrigin = true;
        } else {
          try {
            isSameOrigin = new URL(rawUrl).origin === new URL(API_BASE_URL).origin;
          } catch {
            isSameOrigin = false;
          }
        }

        // External URLs must go to Linking only, with zero Bearer token attached
        if (!isSameOrigin) {
          let linkErr: string | null = null;
          const opened = await openSafeUrl(rawUrl, (msg) => {
            linkErr = msg;
          });
          if (!opened && linkErr) {
            throw new Error(linkErr);
          }
          setAttachmentStates((prev) => ({
            ...prev,
            [attId]: { loading: false, error: null },
          }));
          return;
        }

        const targetUrl = isAbsoluteHttp
          ? rawUrl
          : `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

        // If it's a web platform, fetch with Bearer token only for same-origin API URLs
        if (Platform.OS === 'web') {
          const headers: Record<string, string> = {};
          if (token && isSameOrigin && targetUrl.includes('/api/')) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(targetUrl, { headers });
          if (!response.ok) {
            let serverError = `HTTP ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData?.error || errorData?.message) {
                serverError = errorData.error || errorData.message;
              }
            } catch {}
            throw new Error(serverError);
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');

          setAttachmentStates((prev) => ({
            ...prev,
            [attId]: { loading: false, error: null },
          }));
          return;
        }

        // Native Mobile: Download to sandbox cache using expo-file-system
        const safeFileName = (att.fileName || 'attachment')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(-100);
        const destinationUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}${Date.now()}_${safeFileName}`;

        const downloadOptions: FileSystem.DownloadOptions = {
          headers: token && isSameOrigin && targetUrl.includes('/api/') ? { Authorization: `Bearer ${token}` } : {},
        };

        const result = await FileSystem.downloadAsync(targetUrl, destinationUri, downloadOptions);

        if (result.status >= 400) {
          let serverMessage = `Server returned HTTP ${result.status}`;
          try {
            const errorText = await FileSystem.readAsStringAsync(result.uri);
            const parsed = JSON.parse(errorText);
            if (parsed?.error || parsed?.message) {
              serverMessage = parsed.error || parsed.message;
            }
          } catch {}
          throw new Error(serverMessage);
        }

        // Successful download — open with native share sheet / viewer
        setAttachmentStates((prev) => ({
          ...prev,
          [attId]: { loading: false, error: null, downloadedUri: result.uri },
        }));

        const isShareAvailable = await Sharing.isAvailableAsync();
        if (isShareAvailable) {
          await Sharing.shareAsync(result.uri, {
            mimeType: getMimeType(att.fileName),
            dialogTitle: att.fileName || 'Open Attachment',
            UTI: 'public.item',
          });
        } else {
          Alert.alert('File Saved', `File saved to device cache:\n${safeFileName}`);
        }
      } catch (attErr: any) {
        console.warn('Attachment load failed:', attErr);
        const readableMsg =
          attErr?.message ||
          'The file storage service or asset is temporarily unavailable on this server. Please retry.';

        setAttachmentStates((prev) => ({
          ...prev,
          [attId]: {
            loading: false,
            error: readableMsg,
          },
        }));
      }
    },
    [token]
  );

  const renderAttachmentIcon = (fileName?: string) => {
    const ext = getFileExtension(fileName);
    const iconSize = s(22);

    switch (ext) {
      case 'pdf':
        return <FileText size={iconSize} color={theme.colors.danger} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'svg':
        return <ImageIcon size={iconSize} color={theme.colors.info} />;
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'html':
      case 'css':
        return <FileCode size={iconSize} color={theme.colors.primary} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
        return <FileArchive size={iconSize} color={theme.colors.warning} />;
      default:
        return <File size={iconSize} color={theme.colors.primary} />;
    }
  };

  const courseTitle = course ? `${course.code || course.courseCode}: ${course.title}` : 'Course Material';

  return (
    <Screen style={styles.screenRoot}>
      <AppHeader
        title="Learning Material"
        subtitle={courseTitle}
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: s(spacing.md) }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={loadMaterialData}
            style={{ marginBottom: s(spacing.md) }}
          />
        ) : null}

        {loading ? (
          <View style={{ gap: s(spacing.md) }}>
            <SkeletonBlock height={s(110)} borderRadius={radius.lg} />
            <SkeletonBlock height={s(160)} borderRadius={radius.lg} />
            <SkeletonBlock height={s(90)} borderRadius={radius.lg} />
          </View>
        ) : material ? (
          <View style={{ gap: s(spacing.md) }}>
            {/* Header Card */}
            <Card
              style={[
                styles.headerCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                },
              ]}
            >
              <View style={[styles.metaRow, { gap: s(spacing.xs) }]}>
                <Badge label="LEARNING MATERIAL" variant="info" size="sm" />
                {material.dueDate ? (
                  <View style={[styles.dateWrap, { gap: 4 }]}>
                    <Calendar size={s(12)} color={theme.colors.textSecondary} />
                    <Text
                      style={[styles.dateText, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Target: {new Date(material.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.materialTitle,
                  { color: theme.colors.text, fontSize: font(20), marginTop: s(spacing.sm) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {material.title}
              </Text>
            </Card>

            {/* Written Content & Overview Card */}
            <Card
              style={[
                styles.contentCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                },
              ]}
            >
              <SectionTitle
                title="MATERIAL CONTENT"
                subtitle="Curriculum text, instructions, and study guide"
                style={{ marginBottom: s(spacing.md) }}
              />

              {material.description && material.description.trim().length > 0 ? (
                <ClassworkDescription
                  content={material.description}
                  textStyle={[
                    styles.bodyText,
                    {
                      color: theme.colors.text,
                      fontSize: font(14),
                      lineHeight: font(22),
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.emptyContentNotice,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      borderRadius: radius.md,
                      padding: s(spacing.md),
                    },
                  ]}
                >
                  <BookOpen size={s(20)} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.emptyContentText,
                      { color: theme.colors.textSecondary, fontSize: font(13), marginLeft: s(spacing.sm) },
                    ]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    No text overview was provided for this item. Please review the attached resources below.
                  </Text>
                </View>
              )}
            </Card>

            {/* Attachments Section */}
            {Boolean(material.attachments && material.attachments.length > 0) && (
              <Card
                style={[
                  styles.attachmentsCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                  },
                ]}
              >
                <ClassworkAttachments
                  attachments={material.attachments}
                  onOpenFile={handleOpenAttachment}
                  title="ATTACHED RESOURCES"
                />
              </Card>
            )}

          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerCard: {
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontWeight: '500',
  },
  materialTitle: {
    fontWeight: '800',
    lineHeight: 26,
  },
  contentCard: {
    borderWidth: 1,
  },
  bodyText: {
    letterSpacing: 0.2,
  },
  emptyContentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyContentText: {
    flex: 1,
  },
  attachmentsCard: {
    borderWidth: 1,
  },
  attachmentBox: {
    borderWidth: 1,
  },
  attachmentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  attachmentDetails: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  attachmentName: {
    fontWeight: '600',
    lineHeight: 18,
  },
  attachmentSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  attachmentSize: {
    fontWeight: '500',
  },
  attachmentTypeTag: {
    fontWeight: '600',
  },
  downloadBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadBtnText: {
    fontWeight: '700',
  },
  attachmentErrorBox: {
    borderWidth: 1,
  },
  attachmentErrorTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentErrorHeading: {
    fontWeight: '700',
  },
  attachmentErrorDesc: {
    lineHeight: 16,
  },
  retryAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  retryAttachmentText: {
    fontWeight: '700',
  },
});
