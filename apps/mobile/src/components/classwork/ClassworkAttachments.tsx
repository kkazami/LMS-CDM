import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  Video,
  FileText,
  ExternalLink,
  Paperclip,
  AlertCircle,
  Download,
  Globe,
  X,
} from 'lucide-react-native';
import type { ClassworkAttachment } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { radius, spacing } from '../../lib/theme';
import { TOUCH_TARGET } from '../../lib/typography';
import {
  sanitizeUrl,
  getFriendlyLinkTitle,
  LinkKind,
  parseLinksFromText,
} from '../../lib/links';
import { openSafeUrl } from '../../lib/open-link';

export interface ClassworkAttachmentsProps {
  attachments?: ClassworkAttachment[] | null;
  onOpenFile?: (attachment: ClassworkAttachment) => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
}

export function ClassworkAttachments({
  attachments,
  onOpenFile,
  title = 'ATTACHMENTS & RESOURCES',
  style,
}: ClassworkAttachmentsProps) {
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleLinkPress = async (url: string) => {
    setErrorMessage(null);
    await openSafeUrl(url, (msg) => {
      setErrorMessage(msg);
    });
  };

  const renderIcon = (kind: LinkKind | 'file_supported' | 'file_web' | 'invalid') => {
    const iconSize = s(18);
    switch (kind) {
      case 'youtube':
        return <Video size={iconSize} color={theme.colors.primary} />;
      case 'drive':
      case 'docs':
        return <FileText size={iconSize} color={theme.colors.primary} />;
      case 'link':
        return <Globe size={iconSize} color={theme.colors.primary} />;
      case 'file_supported':
      case 'file_web':
        return <Paperclip size={iconSize} color={theme.colors.primary} />;
      case 'invalid':
      default:
        return <AlertCircle size={iconSize} color={theme.colors.textSecondary} />;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {title ? (
        <Text
          style={[
            styles.heading,
            {
              color: theme.colors.textSecondary,
              fontSize: font(11),
              marginBottom: s(spacing.xs),
            },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {title} ({attachments.length})
        </Text>
      ) : null}

      {errorMessage && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: theme.colors.dangerBg,
              borderColor: theme.colors.danger,
              borderRadius: radius.md,
              padding: s(spacing.sm),
              marginBottom: s(spacing.sm),
            },
          ]}
        >
          <View style={styles.errorContent}>
            <AlertCircle size={s(15)} color={theme.colors.danger} />
            <Text
              style={[
                styles.errorText,
                { color: theme.colors.danger, fontSize: font(12) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {errorMessage}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setErrorMessage(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <X size={s(14)} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.list}>
        {attachments.map((att, idx) => {
          const rawUrl = att.url || '';
          const isExplicitFile = att.type === 'FILE' && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://');

          if (isExplicitFile) {
            // Uploaded File
            const canOpen = typeof onOpenFile === 'function';
            const fileName = att.fileName || 'Course Document';
            const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() : 'FILE';

            return (
              <TouchableOpacity
                key={att.id || `att-file-${idx}`}
                disabled={!canOpen}
                onPress={() => canOpen && onOpenFile?.(att)}
                activeOpacity={canOpen ? 0.75 : 1}
                accessibilityRole={canOpen ? 'button' : 'none'}
                accessibilityLabel={`${fileName}, ${ext} file${canOpen ? '' : ', open on web'}`}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: theme.colors.surfaceAlt || theme.colors.cardSecondary,
                    borderColor: theme.colors.border,
                    borderRadius: radius.md,
                    padding: s(spacing.sm),
                    marginBottom: s(spacing.xs),
                    minHeight: Math.max(TOUCH_TARGET, 44),
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: `${theme.colors.primary}12`,
                      borderRadius: radius.sm,
                      width: s(36),
                      height: s(36),
                      marginRight: s(spacing.sm),
                    },
                  ]}
                >
                  {renderIcon(canOpen ? 'file_supported' : 'file_web')}
                </View>

                <View style={styles.infoCol}>
                  <Text
                    style={[
                      styles.primaryTitle,
                      { color: theme.colors.text, fontSize: font(13) },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {fileName}
                  </Text>
                  <Text
                    style={[
                      styles.secondaryText,
                      { color: theme.colors.textSecondary, fontSize: font(11) },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {ext} File {att.fileSize ? `• ${(att.fileSize / 1024).toFixed(0)} KB` : ''}
                  </Text>
                </View>

                {canOpen ? (
                  <View style={styles.actionWrap}>
                    <Download size={s(16)} color={theme.colors.primary} />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        borderRadius: radius.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: theme.colors.textSecondary, fontSize: font(10) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      Open on web
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }

          // Link Attachment (or external URL)
          const sanitized = sanitizeUrl(rawUrl);

          if (!sanitized.isValid) {
            // Rejected / Invalid link
            return (
              <View
                key={att.id || `att-invalid-${idx}`}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: theme.colors.surfaceAlt || theme.colors.cardSecondary,
                    borderColor: theme.colors.border,
                    borderRadius: radius.md,
                    padding: s(spacing.sm),
                    marginBottom: s(spacing.xs),
                    minHeight: Math.max(TOUCH_TARGET, 44),
                    opacity: 0.8,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: theme.colors.card,
                      borderRadius: radius.sm,
                      width: s(36),
                      height: s(36),
                      marginRight: s(spacing.sm),
                    },
                  ]}
                >
                  {renderIcon('invalid')}
                </View>

                <View style={styles.infoCol}>
                  <Text
                    style={[
                      styles.primaryTitle,
                      { color: theme.colors.textMuted || theme.colors.textSecondary, fontSize: font(13) },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {att.fileName || rawUrl || 'Attachment'}
                  </Text>
                  <Text
                    style={[
                      styles.secondaryText,
                      { color: theme.colors.danger, fontSize: font(11) },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Unsupported link
                  </Text>
                </View>
              </View>
            );
          }

          // Valid Tappable Link
          const friendlyTitle = getFriendlyLinkTitle(
            sanitized.url,
            att.fileName,
            sanitized.kind,
            sanitized.domain
          );

          return (
            <TouchableOpacity
              key={att.id || `att-link-${idx}`}
              onPress={() => handleLinkPress(sanitized.url)}
              activeOpacity={0.75}
              accessibilityRole="link"
              accessibilityLabel={`Open link: ${friendlyTitle}, ${sanitized.domain}`}
              style={[
                styles.itemRow,
                {
                  backgroundColor: theme.colors.surfaceAlt || theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  borderRadius: radius.md,
                  padding: s(spacing.sm),
                  marginBottom: s(spacing.xs),
                  minHeight: Math.max(TOUCH_TARGET, 44),
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: `${theme.colors.primary}12`,
                    borderRadius: radius.sm,
                    width: s(36),
                    height: s(36),
                    marginRight: s(spacing.sm),
                  },
                ]}
              >
                {renderIcon(sanitized.kind)}
              </View>

              <View style={styles.infoCol}>
                <Text
                  style={[
                    styles.primaryTitle,
                    { color: theme.colors.text, fontSize: font(13) },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {friendlyTitle}
                </Text>
                <Text
                  style={[
                    styles.secondaryText,
                    { color: theme.colors.textSecondary, fontSize: font(11) },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {sanitized.domain}
                </Text>
              </View>

              <View style={styles.actionWrap}>
                <ExternalLink size={s(15)} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export interface ClassworkDescriptionProps {
  content: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: any;
  numberOfLines?: number;
}

export function ClassworkDescription({
  content,
  style,
  textStyle,
  numberOfLines,
}: ClassworkDescriptionProps) {
  const theme = useTheme();
  const { font, maxFontSizeMultiplier } = useResponsive();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!content) return null;

  const segments = parseLinksFromText(content);

  const handleLinkPress = async (url: string) => {
    setErrorMessage(null);
    await openSafeUrl(url, (msg) => {
      setErrorMessage(msg);
    });
  };

  return (
    <View style={style}>
      {errorMessage && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: theme.colors.dangerBg,
              borderColor: theme.colors.danger,
              borderRadius: radius.sm,
              padding: 6,
              marginBottom: 6,
            },
          ]}
        >
          <View style={styles.errorContent}>
            <AlertCircle size={14} color={theme.colors.danger} />
            <Text
              style={[styles.errorText, { color: theme.colors.danger, fontSize: font(11) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {errorMessage}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <X size={12} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      <Text
        style={textStyle}
        selectable
        numberOfLines={numberOfLines}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {segments.map((seg, i) => {
          if (!seg.isLink || !seg.url) {
            return <React.Fragment key={i}>{seg.text}</React.Fragment>;
          }

          return (
            <Text
              key={i}
              onPress={() => handleLinkPress(seg.url!)}
              accessibilityRole="link"
              accessibilityLabel={`Open link: ${seg.text}`}
              style={{
                color: theme.colors.primary,
                textDecorationLine: 'underline',
              }}
            >
              {seg.text}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  heading: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: {
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  primaryTitle: {
    fontWeight: '600',
  },
  secondaryText: {
    marginTop: 2,
  },
  actionWrap: {
    paddingLeft: 8,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    fontWeight: '500',
    flex: 1,
  },
});
