import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckSquare,
  Square,
  PlusCircle,
  Calendar,
  Trash2,
  Clock,
  X,
  Sparkles,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { Button } from '../../../../src/components/common/Button';
import { Input } from '../../../../src/components/common/Input';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { TaskItem } from '@lms/types';

export default function StudentTasksScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'PENDING' | 'COMPLETED'>('PENDING');

  // Create Task Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const loadTasks = async () => {
    try {
      const cached = await getCachedData<TaskItem[]>('student_workspace_tasks');
      if (cached && cached.length > 0) {
        setTasks(cached);
        setLoading(false);
      }

      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.workspace.getTasks(instituteCode);
      if (response?.tasks) {
        setTasks(response.tasks);
        await setCachedData('student_workspace_tasks', response.tasks);
      }
    } catch {
      // Graceful fallback to cached state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleToggleTask = async (task: TaskItem) => {
    const nextCompleted = !task.completed;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
    );

    try {
      await api.workspace.updateTask(task.id, { completed: nextCompleted });
      if (nextCompleted) {
        try {
          Burnt.toast({
            title: 'Task Completed!',
            preset: 'done',
          });
        } catch {
          // Fallback
        }
      }
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
      );
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          try {
            await api.workspace.deleteTask(taskId);
          } catch {
            loadTasks();
          }
        },
      },
    ]);
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please provide a task title.');
      return;
    }

    setSavingTask(true);
    try {
      await api.workspace.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      try {
        Burnt.toast({
          title: 'Task Added',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      loadTasks();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create task.');
    } finally {
      setSavingTask(false);
    }
  };

  const filteredTasks = tasks.filter((t) => (filter === 'PENDING' ? !t.completed : t.completed));

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

        <View style={styles.headerTextCol}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Study Planner</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Personal Academic Tasks & Deadlines
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add Task"
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <PlusCircle size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Segmented Pills */}
      <View style={[styles.filterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'PENDING' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setFilter('PENDING')}
        >
          <Text
            style={[
              styles.filterTabText,
              {
                color: filter === 'PENDING' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: filter === 'PENDING' ? '700' : '500',
              },
            ]}
          >
            Pending ({tasks.filter((t) => !t.completed).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'COMPLETED' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setFilter('COMPLETED')}
        >
          <Text
            style={[
              styles.filterTabText,
              {
                color: filter === 'COMPLETED' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: filter === 'COMPLETED' ? '700' : '500',
              },
            ]}
          >
            Completed ({tasks.filter((t) => t.completed).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <CheckSquare size={44} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {filter === 'PENDING' ? 'No Pending Tasks!' : 'No Completed Tasks Yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {filter === 'PENDING'
                  ? 'All your academic goals and study tasks are clear.'
                  : 'Check off tasks as you finish them to track your productivity.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.taskCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: item.completed ? theme.colors.border : theme.colors.border,
                  opacity: item.completed ? 0.75 : 1,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleToggleTask(item)}
                style={styles.checkboxTouch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {item.completed ? (
                  <CheckSquare size={22} color={theme.colors.primary} />
                ) : (
                  <Square size={22} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>

              <View style={styles.taskBody}>
                <View style={styles.taskTitleRow}>
                  <Text
                    style={[
                      styles.taskTitle,
                      {
                        color: theme.colors.text,
                        textDecorationLine: item.completed ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Badge
                    label={item.priority.toUpperCase()}
                    variant={
                      item.priority.toLowerCase() === 'high'
                        ? 'danger'
                        : item.priority.toLowerCase() === 'medium'
                        ? 'warning'
                        : 'info'
                    }
                    size="sm"
                  />
                </View>

                {item.description ? (
                  <Text style={[styles.taskDesc, { color: theme.colors.textSecondary }]}>
                    {item.description}
                  </Text>
                ) : null}

                {item.dueDate ? (
                  <View style={styles.dueDateRow}>
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.dueDateText, { color: theme.colors.textSecondary }]}>
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteTask(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add Task Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Task</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Task Title"
              placeholder="e.g. Read Chapters 4-6 or Review Algorithms"
              value={title}
              onChangeText={setTitle}
              ringColor={theme.colors.primary}
            />

            <Input
              label="Notes / Description (Optional)"
              placeholder="Key concepts or reminders..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              ringColor={theme.colors.primary}
            />

            {/* Priority Selector */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>PRIORITY LEVEL</Text>
            <View style={styles.priorityRow}>
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.prioBtn,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardSecondary,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.prioBtnText,
                        { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Due Date (Optional e.g. YYYY-MM-DD)"
              placeholder="2026-09-30"
              value={dueDate}
              onChangeText={setDueDate}
              ringColor={theme.colors.primary}
            />

            <Button
              title="Add to Planner"
              onPress={handleCreateTask}
              loading={savingTask}
              icon={PlusCircle}
              style={{ marginTop: 14 }}
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
  headerTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: TOUCH_TARGET,
  },
  filterTabText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  checkboxTouch: {
    paddingTop: 2,
    marginRight: 12,
  },
  taskBody: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  taskDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 44,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
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
    letterSpacing: 1,
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  prioBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  prioBtnText: {
    fontSize: 12,
  },
});
