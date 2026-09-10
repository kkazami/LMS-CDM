import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Bell, Send, Plus, Megaphone, CheckCircle2, X } from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { Course, Announcement } from '@lms/types';

export default function TeacherAlertsScreen() {
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<'GENERAL' | 'URGENT' | 'EXAM'>('GENERAL');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const loadData = async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const [coursesRes, announcementsRes] = await Promise.allSettled([
        api.courses.list(instituteCode),
        api.announcements.list(instituteCode),
      ]);

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
        if (coursesRes.value.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(coursesRes.value.courses[0].id);
        }
      }
      if (announcementsRes.status === 'fulfilled' && announcementsRes.value?.announcements) {
        setAnnouncements(announcementsRes.value.announcements);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendBroadcast = async () => {
    if (!selectedCourseId) {
      Alert.alert('Course Required', 'Please select a course for this broadcast.');
      return;
    }
    if (!broadcastMessage.trim()) {
      Alert.alert('Message Required', 'Please enter announcement content.');
      return;
    }

    setSendingBroadcast(true);
    try {
      await api.courses.broadcast(selectedCourseId, broadcastMessage.trim(), broadcastCategory);

      try {
        Burnt.toast({
          title: 'Broadcast Dispatched',
          message: 'All enrolled students have been notified.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setBroadcastMessage('');
      setShowBroadcastModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Broadcast Error', err?.message || 'Failed to dispatch broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Class Broadcasts</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Dispatch Push Alerts & Announcements to Students
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="New Broadcast"
            style={[styles.newBroadcastBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowBroadcastModal(true)}
            activeOpacity={0.8}
          >
            <Send size={16} color="#FFFFFF" />
            <Text style={styles.newBroadcastBtnText}>Compose</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Recent Bulletins & Broadcasts
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 24 }} />
        ) : announcements.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Megaphone size={40} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Broadcasts Sent Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Use the compose button above to notify enrolled students instantly.
            </Text>
          </Card>
        ) : (
          announcements.map((ann) => (
            <View
              key={ann.id}
              style={[styles.announcementCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <View style={styles.announcementTop}>
                <Badge label="BROADCAST" variant="primary" size="sm" />
                {ann.createdAt && (
                  <Text style={[styles.announcementDate, { color: theme.colors.textSecondary }]}>
                    {new Date(ann.createdAt).toLocaleString()}
                  </Text>
                )}
              </View>
              <Text style={[styles.announcementTitle, { color: theme.colors.text }]}>
                {ann.title}
              </Text>
              <Text style={[styles.announcementContent, { color: theme.colors.textSecondary }]}>
                {ann.content}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Compose Broadcast Modal */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Compose Class Broadcast
              </Text>
              <TouchableOpacity
                onPress={() => setShowBroadcastModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Target Course Selector */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              TARGET COURSE
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coursePillsScroll}>
              {courses.map((course) => {
                const isSelected = selectedCourseId === course.id;
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.coursePill,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCourseId(course.id)}
                  >
                    <Text
                      style={[
                        styles.coursePillText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {course.code || course.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category Selector */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              ALERT PRIORITY
            </Text>
            <View style={styles.categoryRow}>
              {(['GENERAL', 'URGENT', 'EXAM'] as const).map((cat) => {
                const isSelected = broadcastCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryBtn,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setBroadcastCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryBtnText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message Input */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              BROADCAST MESSAGE
            </Text>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.colors.cardSecondary,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              multiline
              numberOfLines={4}
              placeholder="Enter announcement text to send to all enrolled students..."
              placeholderTextColor={theme.colors.textSecondary}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
            />

            <Button
              title="Dispatch Broadcast"
              onPress={handleSendBroadcast}
              loading={sendingBroadcast}
              icon={Send}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  newBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: TOUCH_TARGET,
  },
  newBroadcastBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  announcementCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  announcementTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementDate: {
    fontSize: 11,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  announcementContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  coursePillsScroll: {
    marginBottom: 8,
  },
  coursePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  coursePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
});
