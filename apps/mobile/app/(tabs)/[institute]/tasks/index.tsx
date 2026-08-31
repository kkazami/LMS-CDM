import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, TextInput, Modal, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import { CheckSquare, FileText, Calendar as CalendarIcon, Plus, Check, Trash2, X } from 'lucide-react-native';
import type { TaskItem, NoteItem, LmsCalendarEvent } from '@lms/types';

type WorkspaceTab = 'tasks' | 'notes' | 'calendar';

export default function WorkspaceScreen() {
  const queryClient = useQueryClient();
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tasks');
  const [modalOpen, setModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');

  const instituteCode = user?.institute?.code || 'ics';

  const { data: tasksData, isLoading: isTasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['workspace-tasks', instituteCode],
    queryFn: () => api.workspace.getTasks(instituteCode),
    enabled: activeTab === 'tasks',
  });

  const { data: notesData, isLoading: isNotesLoading, refetch: refetchNotes } = useQuery({
    queryKey: ['workspace-notes', instituteCode],
    queryFn: () => api.workspace.getNotes(instituteCode),
    enabled: activeTab === 'notes',
  });

  const { data: eventsData, isLoading: isEventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['workspace-events', instituteCode],
    queryFn: () => api.workspace.getEvents(instituteCode),
    enabled: activeTab === 'calendar',
  });

  const tasks = tasksData?.tasks || [];
  const notes = notesData?.notes || [];
  const events = eventsData?.events || [];

  const handleCreateItem = async () => {
    if (!titleInput.trim()) return;
    if (activeTab === 'tasks') {
      await api.workspace.createTask({ title: titleInput.trim(), priority: 'MEDIUM' });
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks', instituteCode] });
    } else if (activeTab === 'notes') {
      await api.workspace.createNote({ title: titleInput.trim(), content: contentInput.trim() });
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', instituteCode] });
    }
    setModalOpen(false);
    setTitleInput('');
    setContentInput('');
  };

  const handleToggleTask = async (task: TaskItem) => {
    await api.workspace.updateTask(task.id, { completed: !task.completed });
    queryClient.invalidateQueries({ queryKey: ['workspace-tasks', instituteCode] });
  };

  const handleDeleteTask = async (taskId: string) => {
    await api.workspace.deleteTask(taskId);
    queryClient.invalidateQueries({ queryKey: ['workspace-tasks', instituteCode] });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="Personal Workspace" subtitle="Notes, Kanban Tasks & Calendar" />

      <View style={[styles.tabBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        {(
          [
            { key: 'tasks', label: 'Tasks', icon: CheckSquare },
            { key: 'notes', label: 'Notes', icon: FileText },
            { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComp = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <IconComp size={16} color={isActive ? theme.colors.primary : theme.colors.textSecondary} />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab !== 'calendar' && (
        <TouchableOpacity
          style={[styles.floatingAddBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setModalOpen(true)}
          activeOpacity={0.85}
        >
          <Plus size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {activeTab === 'tasks' && (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={CheckSquare} title="No Tasks" message="Tap + to create a task." />}
          renderItem={({ item }) => (
            <View style={[styles.taskCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  item.completed && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => handleToggleTask(item)}
              >
                {item.completed && <Check size={14} color="#FFFFFF" />}
              </TouchableOpacity>

              <Text
                style={[
                  styles.taskTitle,
                  typography.bodyMd,
                  { color: theme.colors.text },
                  item.completed && styles.taskCompleted,
                ]}
              >
                {item.title}
              </Text>

              <TouchableOpacity onPress={() => handleDeleteTask(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {activeTab === 'notes' && (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={FileText} title="No Notes" message="Tap + to write a note." />}
          renderItem={({ item }) => (
            <View style={[styles.noteCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.noteTitle, typography.headingSm, { color: theme.colors.text }]}>{item.title}</Text>
              <Text style={[styles.noteContent, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                {item.content}
              </Text>
            </View>
          )}
        />
      )}

      {activeTab === 'calendar' && (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon={CalendarIcon} title="No Events" message="No scheduled events." />}
          renderItem={({ item }) => (
            <View style={[styles.eventCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.eventTitle, typography.headingSm, { color: theme.colors.text }]}>{item.title}</Text>
              <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
                {new Date(item.eventDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent={true} onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, typography.headingSm, { color: theme.colors.text }]}>
                {'New ' + (activeTab === 'tasks' ? 'Task' : 'Note')}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Title..."
              placeholderTextColor={theme.colors.textSecondary}
              value={titleInput}
              onChangeText={setTitleInput}
            />

            {activeTab === 'notes' && (
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, height: 80 }]}
                placeholder="Note body..."
                placeholderTextColor={theme.colors.textSecondary}
                value={contentInput}
                onChangeText={setContentInput}
                multiline
              />
            )}

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: theme.colors.primary, minHeight: TOUCH_TARGET }]}
              onPress={handleCreateItem}
            >
              <Text style={styles.createBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minHeight: TOUCH_TARGET,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    flex: 1,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  noteCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  noteTitle: {
    fontWeight: '700',
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  eventCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  eventTitle: {
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '700',
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 99,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  createBtn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
