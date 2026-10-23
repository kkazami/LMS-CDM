import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { Button } from '../../../../src/components/common/Button';
import { Input } from '../../../../src/components/common/Input';
import {
  Screen,
  AppHeader,
  HeaderIconButton,
  FormModal,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { radius, spacing } from '../../../../src/lib/theme';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { TaskItem } from '@lms/types';

export default function StudentTasksScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setErrorMessage(null);
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
    } catch (err: any) {
      if (!tasks.length) {
        setErrorMessage(err?.message || 'Could not load tasks. Please check your connection.');
      }
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
    <Screen contentContainerStyle={styles.screenInner}>
      <AppHeader
        showBack
        title="Study Planner"
        subtitle="Personal Academic Tasks & Deadlines"
        rightAction={
          <HeaderIconButton
            onPress={() => setShowCreateModal(true)}
            accessibilityLabel="Add new task"
            style={[styles.addBtn, { backgroundColor: theme.colors.primary, borderRadius: radius.full }]}
          >
            <Plus size={s(18)} color="#FFFFFF" />
          </HeaderIconButton>
        }
      />

      {/* Filter Segmented Bar */}
      <View
        style={[
          styles.filterBar,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: s(spacing.lg),
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'PENDING' }}
          accessibilityLabel={`Pending tasks, ${tasks.filter((t) => !t.completed).length} items`}
          style={[
            styles.filterTab,
            { paddingVertical: s(spacing.md) },
            filter === 'PENDING' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setFilter('PENDING')}
        >
          <Text
            style={[
              styles.filterTabText,
              {
                fontSize: font(13),
                color: filter === 'PENDING' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: filter === 'PENDING' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Pending ({tasks.filter((t) => !t.completed).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === 'COMPLETED' }}
          accessibilityLabel={`Completed tasks, ${tasks.filter((t) => t.completed).length} items`}
          style={[
            styles.filterTab,
            { paddingVertical: s(spacing.md) },
            filter === 'COMPLETED' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setFilter('COMPLETED')}
        >
          <Text
            style={[
              styles.filterTabText,
              {
                fontSize: font(13),
                color: filter === 'COMPLETED' ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: filter === 'COMPLETED' ? '700' : '500',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            Completed ({tasks.filter((t) => t.completed).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <View style={styles.mainContainer}>
        {errorMessage && (
          <View style={{ paddingHorizontal: s(spacing.lg), paddingTop: s(spacing.md) }}>
            <ErrorBanner
              message={errorMessage}
              onRetry={loadTasks}
              onDismiss={() => setErrorMessage(null)}
              retryAccessibilityLabel="Retry loading tasks"
            />
          </View>
        )}

        {loading ? (
          <View style={[styles.loadingContainer, { padding: s(spacing.lg) }]}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <SkeletonBlock width={s(24)} height={s(24)} borderRadius={radius.sm} />
                  <View style={{ flex: 1, marginLeft: s(spacing.md) }}>
                    <SkeletonBlock width="70%" height={s(15)} style={{ marginBottom: s(spacing.xs) }} />
                    <SkeletonBlock width="40%" height={s(11)} />
                  </View>
                  <SkeletonBlock width={s(50)} height={s(20)} borderRadius={radius.sm} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { padding: s(spacing.lg) }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={
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
                <CheckSquare size={s(44)} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {filter === 'PENDING' ? 'No Pending Tasks!' : 'No Completed Tasks Yet'}
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
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
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.md),
                    marginBottom: s(spacing.md),
                    opacity: item.completed ? 0.75 : 1,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleToggleTask(item)}
                  style={[styles.checkboxTouch, { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.completed }}
                  accessibilityLabel={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
                >
                  {item.completed ? (
                    <CheckSquare size={s(22)} color={theme.colors.primary} />
                  ) : (
                    <Square size={s(22)} color={theme.colors.textSecondary} />
                  )}
                </TouchableOpacity>

                <View style={[styles.taskBody, { marginLeft: s(spacing.sm) }]}>
                  <View style={styles.taskTitleRow}>
                    <Text
                      style={[
                        styles.taskTitle,
                        {
                          color: theme.colors.text,
                          fontSize: font(14.5),
                          textDecorationLine: item.completed ? 'line-through' : 'none',
                        },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
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

                  {Boolean(item.description) && (
                    <Text
                      style={[
                        styles.taskDesc,
                        { color: theme.colors.textSecondary, fontSize: font(12.5), marginTop: s(spacing.xs) },
                      ]}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                      {item.description}
                    </Text>
                  )}

                  {Boolean(item.dueDate) && (
                    <View style={[styles.dueDateRow, { marginTop: s(spacing.xs) }]}>
                      <Clock size={s(12)} color={theme.colors.textSecondary} />
                      <Text
                        style={[
                          styles.dueDateText,
                          { color: theme.colors.textSecondary, fontSize: font(11.5), marginLeft: s(spacing.xs) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Due: {new Date(item.dueDate!).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteTask(item.id)}
                  style={[styles.deleteBtn, { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete task "${item.title}"`}
                >
                  <Trash2 size={s(17)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Add Task Modal using shared FormModal */}
      <FormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Task"
        subtitle="Create an academic goal or revision reminder"
        closeAccessibilityLabel="Cancel and close add task modal"
        actions={
          <Button
            title="Add to Planner"
            onPress={handleCreateTask}
            loading={savingTask}
            icon={Plus}
          />
        }
      >
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
        <Text
          style={[
            styles.fieldLabel,
            {
              color: theme.colors.textSecondary,
              fontSize: font(12),
              marginTop: s(spacing.sm),
              marginBottom: s(spacing.xs),
            },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          PRIORITY LEVEL
        </Text>
        <View style={[styles.priorityRow, { gap: s(spacing.sm), marginBottom: s(spacing.md) }]}>
          {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => {
            const isSelected = priority === p;
            return (
              <TouchableOpacity
                key={p}
                accessibilityRole="button"
                accessibilityLabel={`Set priority to ${p}`}
                style={[
                  styles.prioBtn,
                  {
                    borderRadius: radius.md,
                    paddingVertical: s(spacing.sm),
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceAlt,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.prioBtnText,
                    {
                      fontSize: font(12.5),
                      color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
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
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    marginRight: 24,
  },
  filterTabText: {},
  loadingContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  checkboxTouch: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBody: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitle: {
    fontWeight: '600',
    flex: 1,
  },
  taskDesc: {
    lineHeight: 18,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontWeight: '500',
  },
  deleteBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  fieldLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityRow: {
    flexDirection: 'row',
  },
  prioBtn: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prioBtnText: {},
});
