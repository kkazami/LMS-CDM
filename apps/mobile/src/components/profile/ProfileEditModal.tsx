import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import type { AuthUser } from '@lms/types';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdated?: (user: AuthUser) => void;
}

export function ProfileEditModal({ visible, onClose, onUpdated }: ProfileEditModalProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

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
  }, [visible, user]);

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
        department: department.trim(),
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

  const isStudent = user?.role === 'STUDENT';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Input
              label="Full Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
            />

            <Input
              label="Bio / Academic Intro"
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
              label="Academic Department / Track"
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g. Computer Science, Information Tech"
            />

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

const styles = StyleSheet.create({
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