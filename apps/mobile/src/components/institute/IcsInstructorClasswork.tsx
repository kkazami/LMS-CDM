import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookOpenText, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck, ClipboardList, Clock,
  FlaskConical, GraduationCap, Layers3, ListChecks, MessagesSquare, MoreHorizontal, Puzzle, type LucideIcon,
} from 'lucide-react-native';
import type { ClassworkItem } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../common/Button';
import { Text } from '../ui/Text';
import { FormModal } from '../ui/FormModal';
import { SurfacePressable } from '../motion/SurfacePressable';
import { ClassworkDescription } from '../classwork/ClassworkAttachments';

const categories: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  ASSIGNMENT: { label: 'Assignments', Icon: ClipboardList, color: '#2563EB' },
  QUIZ: { label: 'Quizzes', Icon: ListChecks, color: '#7C3AED' },
  MATERIAL: { label: 'Materials', Icon: BookOpenText, color: '#059669' },
  ACTIVITY: { label: 'Activities', Icon: Puzzle, color: '#B45309' },
  RECITATION: { label: 'Recitations', Icon: MessagesSquare, color: '#DB2777' },
  MIDTERM_EXAM: { label: 'Midterm Exams', Icon: ClipboardCheck, color: '#DC2626' },
  FINAL_EXAM: { label: 'Final Exams', Icon: GraduationCap, color: '#4F46E5' },
};

export function IcsInstructorClasswork({ courseId, items }: { courseId: string; items: ClassworkItem[] }) {
  const theme = useTheme(), router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<ClassworkItem | null>(null);
  const grouped = new Map<string, ClassworkItem[]>();
  for (const item of items) {
    const type = item.type || 'MATERIAL';
    const group = grouped.get(type);
    if (group) group.push(item);
    else grouped.set(type, [item]);
  }
  const ink = { color: theme.colors.text }, muted = { color: theme.colors.textSecondary };
  const border = { borderColor: theme.colors.border };
  const accent = theme.isDark ? '#FFAE79' : '#B84400';
  const tint = theme.isDark ? '#382419' : '#FFF0E5';
  function workspace(action?: string, itemId?: string) {
    setSelected(null);
    router.push({ pathname: '/teacher/tools', params: { tool: 'classwork', courseId, ...(action && { action }), ...(itemId && { itemId }) } });
  }
  function labs(assignmentId?: string, itemId?: string) {
    setSelected(null);
    router.push({ pathname: '/teacher/practical-labs', params: { courseId, ...(assignmentId && { assignmentId }), ...(itemId && { itemId, action: 'link' }) } });
  }
  function openItem(item: ClassworkItem) {
    if (item.labAssignmentId) labs(item.labAssignmentId);
    else if (item.formId) workspace('form', item.formId);
    else workspace(undefined, item.id);
  }
  function dateLabel(value: string) {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  return <View style={styles.list}>
    <View style={styles.actions}>
      <Button title="Create Form Assessment" onPress={() => workspace('form')} style={[styles.action, { flexGrow: 1.4 }]} textStyle={styles.actionText} />
      <Button title="Add Task" variant="outline" onPress={() => workspace('add')} style={[styles.action, { flexGrow: 0.8, backgroundColor: theme.colors.card }]} textStyle={styles.actionText} />
      <Button title="Practical Labs" variant="outline" onPress={() => labs()} style={[styles.action, { flexGrow: 1, borderColor: theme.isDark ? '#875035' : '#FED7AA' }]} textColor={accent} textStyle={styles.actionText} />
    </View>
    {!items.length && <View style={[styles.group, border, { backgroundColor: theme.colors.card, padding: 20, gap: 4 }]}>
      <Text style={[styles.label, ink]}>No classwork yet</Text>
      <Text style={muted}>Add assignments, quizzes, and materials for your students.</Text>
    </View>}
    {Array.from(grouped, ([type, group]) => {
      const category = Object.hasOwn(categories, type) ? categories[type] : {
        label: type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()), Icon: Layers3, color: theme.colors.textSecondary,
      };
      const expanded = !collapsed[type];
      const Chevron = expanded ? ChevronDown : ChevronRight;
      return <View key={type} style={[styles.group, border, { backgroundColor: theme.colors.card }]}>
        <SurfacePressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setCollapsed(previous => ({ ...previous, [type]: expanded }))} style={styles.groupHeading}>
          <Chevron size={15} color={theme.colors.textSecondary} />
          <category.Icon size={18} color={category.color} />
          <Text style={[styles.label, ink, { flex: 1 }]}>{category.label}</Text>
          <Text style={[styles.count, muted, { backgroundColor: theme.colors.cardSecondary }]}>{group.length}</Text>
        </SurfacePressable>
        {expanded && group.map(item => {
          const Icon = item.labAssignmentId ? FlaskConical : category.Icon;
          const startsAt = item.labStartsAt || item.opensAt;
          return <View key={item.id} style={[styles.itemRow, border]}>
            <SurfacePressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => openItem(item)} style={styles.item}>
              <View style={[styles.itemIcon, { backgroundColor: item.labAssignmentId ? tint : theme.colors.cardSecondary }]}><Icon size={16} color={item.labAssignmentId ? accent : category.color} /></View>
              <View style={styles.itemText}>
                <Text style={[styles.label, ink]}>{item.title}</Text>
                {!!item.description && <ClassworkDescription content={item.description} numberOfLines={2} textStyle={[styles.detail, muted]} />}
                <View style={styles.metadata}>
                  {!!item.labAssignmentId && <Text style={[styles.detail, { color: accent }]}>Guided practical lab</Text>}
                  {!!startsAt && <View style={styles.date}><Clock size={12} color={theme.colors.textSecondary} /><Text style={[styles.detail, muted]}>Start {dateLabel(startsAt)}</Text></View>}
                  {!!item.dueDate && <View style={styles.date}><CalendarDays size={12} color={theme.colors.textSecondary} /><Text style={[styles.detail, muted]}>Due {dateLabel(item.dueDate)}</Text></View>}
                  {item.maxPoints != null && <Text style={[styles.detail, muted]}>{item.maxPoints} pts</Text>}
                </View>
              </View>
            </SurfacePressable>
            <SurfacePressable accessibilityRole="button" accessibilityLabel={`Manage ${item.title}`} onPress={() => setSelected(item)} style={styles.more}><MoreHorizontal size={18} color={theme.colors.textSecondary} /></SurfacePressable>
          </View>;
        })}
      </View>;
    })}
    <FormModal visible={selected !== null} title={selected?.title || 'Classwork options'} onClose={() => setSelected(null)}>
      {selected && <View style={{ gap: 8 }}>
        <Button title="Edit Classwork Item" variant="outline" onPress={() => workspace('edit', selected.id)} />
        {!selected.labAssignmentId && !selected.formId && selected.type !== 'MATERIAL' && <Button title="Link Practical Lab" variant="outline" onPress={() => labs(undefined, selected.id)} />}
        <Button title="Delete Classwork Item" variant="outline" textColor={theme.colors.danger} onPress={() => workspace('delete', selected.id)} />
      </View>}
    </FormModal>
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  action: { flexShrink: 1, paddingHorizontal: 8, borderRadius: 12 },
  actionText: { fontSize: 12, textAlign: 'center' },
  group: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  groupHeading: { paddingHorizontal: 15, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  count: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontSize: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14, paddingLeft: 15 },
  itemIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, minWidth: 0, gap: 4 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 7, rowGap: 4, marginTop: 2 },
  date: { flexDirection: 'row', flexShrink: 1, alignItems: 'center', gap: 4 },
  detail: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
  more: { width: 40, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
