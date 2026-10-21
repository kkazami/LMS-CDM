import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { radius, spacing } from '../../lib/theme';
import { HeaderIconButton } from './AppHeader';

export interface FormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Sticky action buttons rendered pinned at the bottom of the modal card. */
  actions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  closeAccessibilityLabel?: string;
}

/**
 * Foundation FormModal primitive:
 * - Proper KeyboardAvoidingView (iOS: 'padding', Android: 'height')
 * - ScrollView with keyboardShouldPersistTaps="handled"
 * - Sticky action buttons at the bottom
 * - Accessible 44x44 close button with REQUIRED accessibilityLabel
 * - Dark mode supported via theme tokens
 */
export function FormModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  actions,
  style,
  contentContainerStyle,
  closeAccessibilityLabel = 'Close modal',
}: FormModalProps) {
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, isLargePhone } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoider}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: radius.xl,
              },
              isLargePhone && styles.cardTablet,
              style,
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: theme.colors.border,
                  paddingHorizontal: s(spacing.lg),
                  paddingVertical: s(spacing.md),
                },
              ]}
            >
              <View style={styles.headerText}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.text,
                      fontSize: font(18),
                      lineHeight: font(24),
                    },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {title}
                </Text>
                {Boolean(subtitle) && (
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: font(12.5),
                        lineHeight: font(17),
                      },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>

              <HeaderIconButton
                onPress={onClose}
                accessibilityLabel={closeAccessibilityLabel}
              >
                <X size={s(20)} color={theme.colors.textSecondary} />
              </HeaderIconButton>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={[
                styles.bodyContent,
                { padding: s(spacing.lg) },
                contentContainerStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {/* Sticky Actions Bar */}
            {Boolean(actions) && (
              <View
                style={[
                  styles.actionsBar,
                  {
                    borderTopColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceAlt,
                    paddingHorizontal: s(spacing.lg),
                    paddingVertical: s(spacing.md),
                  },
                ]}
              >
                {actions}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoider: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTablet: {
    maxWidth: 540,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    minHeight: 52,
  },
  headerText: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
    paddingRight: 8,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    flexGrow: 1,
  },
  actionsBar: {
    borderTopWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
});
