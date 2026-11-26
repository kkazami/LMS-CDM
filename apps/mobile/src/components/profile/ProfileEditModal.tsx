import { useIcsStyles } from '../../hooks/useIcsStyles';
import { Text } from '../ui/Text';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, User, Phone, Building, GraduationCap, FileText, Check } from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TOUCH_TARGET } from '../../lib/typography';
import { isIbeUser, isIteUser } from '../../lib/ite-eligibility';
import type { AuthUser } from '@lms/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdated?: (user: AuthUser) => void;
}

export function ProfileEditModal({ visible, onClose, onUpdated }: ProfileEditModalProps) {
  const styles = useIcsStyles(incumbentStyles, icsStyles);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [yearLevel, setYearLevel] = useState(user?.yearLevel || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setDepartment(user.department || '');
      setYearLevel(user.yearLevel || '');
    }
  // A foreground session refresh must not replace edits the student is typing.
  }, [visible, user?.id]);

  const isStudent = user?.role === 'STUDENT';
  const isProgramLocked = isStudent && (isIbeUser(user) || isIteUser(user)) && Boolean(user?.department?.trim());

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your display name.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.profile.update({
        name: name.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        ...(isProgramLocked ? {} : { department: department.trim() }),
        yearLevel: yearLevel.trim(),
      });

      if (response?.user) {
        setUser(response.user);
        onUpdated?.(response.user);
      }

      Burnt.toast({
        title: 'Profile Updated',
        message: 'Your profile changes have been saved.',
        preset: 'done',
      });

      onClose();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => { if (!saving) onClose(); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Edit Profile</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {user?.email}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              disabled={saving}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Input
              label="Full Name *"
              maxLength={100}
              editable={!saving}
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
            />

            <Input
              label="Bio / Academic Intro"
              maxLength={300}
              editable={!saving}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your peers or instructors about yourself..."
              multiline
              numberOfLines={3}
            />

            <Input
              label="Contact Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +63 912 345 6789"
              keyboardType="phone-pad"
            />

            <Input
              label={isProgramLocked ? 'Academic Program (Locked)' : 'Academic Department / Track'}
              value={department}
              onChangeText={setDepartment}
              editable={!saving && !isProgramLocked}
              placeholder="e.g. Computer Science, Information Tech"
            />
            {isProgramLocked && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: -8, marginBottom: 12 }}>
                Your academic program is locked. Contact an administrator to request a change.
              </Text>
            )}

            {isStudent && (
              <Input
                label="Year Level"
                value={yearLevel}
                onChangeText={setYearLevel}
                placeholder="e.g. 1st Year, 2nd Year"
              />
            )}

            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                disabled={saving}
                onPress={onClose}
                variant="outline"
                style={styles.cancelBtn}
              />
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                icon={Check}
                style={styles.saveBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const incumbentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    padding: 20,
    gap: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});

const styles = incumbentStyles;
const icsStyles = StyleSheet.create({
  modalCard: { borderRadius: 22 },
  closeBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
