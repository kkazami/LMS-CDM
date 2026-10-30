import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { MobileDashboard, LmsCalendarEvent } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';
import { addDays, classOccurrences, eventOnDay, monthDays, schoolDateKey, schoolTime } from '../../lib/ics-calendar';
import { studentNotificationRoute } from '../../lib/student-navigation';
import { useAuthStore } from '../../stores/auth-store';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function IcsCalendar({ calendar, teacher }: { calendar: MobileDashboard['calendar']; teacher: boolean }) {
  const theme = useTheme(), router = useRouter();
  const today = schoolDateKey(new Date());
  const userId = useAuthStore(s => s.user?.id);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'Day' | 'Week' | 'Month'>('Month');
  const [selected, setSelected] = useState<LmsCalendarEvent | null>(null);
  const days = useMemo(() => view === 'Month' ? monthDays(date) : view === 'Day' ? [date]
    : Array.from({ length: 7 }, (_, index) => addDays(date, index - new Date(`${date}T12:00:00Z`).getUTCDay())), [date, view]);
  const events = useMemo(() => [...calendar.events, ...classOccurrences(calendar.schedules, days)]
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate)), [calendar, days]);
  const surface = { backgroundColor: theme.colors.card, borderColor: theme.colors.border };
  const ink = { color: theme.colors.text }, muted = { color: theme.colors.textSecondary };
  function shift(direction: number) {
    if (view !== 'Month') { setDate(addDays(date, direction * (view === 'Week' ? 7 : 1))); return; }
    const next = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + direction);
    setDate(next.toISOString().slice(0, 10));
  }
  function color(event: LmsCalendarEvent) {
    if (event.source === 'class') return theme.isDark ? ['#172E52', '#B8D5FF'] : ['#DBEAFE', '#1E40AF'];
    if (event.source === 'classwork') return theme.isDark ? ['#3B203F', '#FBCFE8'] : ['#FCE7F3', '#9D174D'];
    return theme.isDark ? ['#123E32', '#A7F3D0'] : ['#DCFCE7', '#166534'];
  }
  const destination = selected && (teacher ? selected.courseId ? `/teacher/courses/${selected.courseId}` : null : studentNotificationRoute(selected.deepLink, 'ics'));
  return <View style={[styles.card, surface]}>
    <View style={styles.toolbar}>
      <Text accessibilityRole="header" style={[styles.title, ink]}>Calendar</Text>
      <View style={[styles.segments, { borderColor: theme.colors.border }]}>{(['Day', 'Week', 'Month'] as const).map(item =>
        <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${item} view`} accessibilityState={{ selected: item === view }} onPress={() => setView(item)} style={[styles.segment, item === view && { backgroundColor: theme.isDark ? '#E2E8F0' : '#0F172A' }]}>
          <Text style={{ fontSize: 13, color: item === view ? theme.isDark ? '#0F172A' : '#FFFFFF' : theme.colors.text }}>{item}</Text>
        </Pressable>)}</View>
    </View>
    <View style={styles.toolbar}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => setDate(today)} style={[styles.today, { borderColor: theme.colors.border }]}><Text style={ink}>Today</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Previous ${view.toLowerCase()}`} style={styles.arrow} onPress={() => shift(-1)}><ChevronLeft size={19} color={theme.colors.text} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Next ${view.toLowerCase()}`} style={styles.arrow} onPress={() => shift(1)}><ChevronRight size={19} color={theme.colors.text} /></Pressable>
      </View><Text style={[styles.helper, muted]}>GMT+8</Text>
    </View>
    <Text style={[styles.month, ink]}>{new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric', ...(view === 'Day' ? { day: 'numeric' } : {}) })}</Text>
    {view === 'Month' ? <>
      <View style={styles.weekdays}>{weekdays.map(day => <Text key={day} style={[styles.weekday, muted]}>{day}</Text>)}</View>
      <ScrollView nestedScrollEnabled style={styles.monthViewport}>
        <View style={styles.grid}>{days.map(day => {
          const items = events.filter(event => eventOnDay(event, day));
          return <View key={day} style={[styles.cell, { borderColor: theme.colors.border, backgroundColor: day.slice(0, 7) === date.slice(0, 7) ? theme.colors.card : theme.colors.cardSecondary }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Show ${day}, ${items.length} events`} style={styles.dateButton} onPress={() => { setDate(day); setView('Day'); }}>
              <Text style={[styles.dayNumber, day === today ? { color: theme.isDark ? '#FFAE79' : '#B84400', fontWeight: '800' } : muted]}>{Number(day.slice(-2))}</Text>
            </Pressable>
            {items.slice(0, 2).map(event => <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`${event.courseCode || ''} ${event.title}`} onPress={() => setSelected(event)} style={[styles.event, { backgroundColor: color(event)[0] }]}>
              <Text numberOfLines={1} style={[styles.eventText, { color: color(event)[1] }]}>{event.courseCode || event.title}</Text>
              <Text numberOfLines={1} style={[styles.eventText, { color: color(event)[1] }]}>{event.source === 'class' ? 'Class' : event.title}</Text>
            </Pressable>)}
            {items.length > 2 && <Pressable accessibilityRole="button" accessibilityLabel={`Show ${items.length - 2} more events on ${day}`} onPress={() => { setDate(day); setView('Day'); }} style={{ paddingVertical: 6 }}><Text style={[styles.eventText, muted]}>+{items.length - 2} more</Text></Pressable>}
          </View>;
        })}</View>
      </ScrollView>
    </> : <ScrollView nestedScrollEnabled style={styles.agendaViewport}>
      {days.map(day => {
        const items = events.filter(event => eventOnDay(event, day));
        return <View key={day} style={styles.agendaDay}>
          <Text style={[styles.month, ink]}>{new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          {items.length === 0 ? <Text style={[styles.helper, muted]}>No events scheduled.</Text> : items.map(event => <Pressable key={event.id} accessibilityRole="button" onPress={() => setSelected(event)} style={[styles.agendaEvent, { backgroundColor: color(event)[0] }]}>
            <Text style={[styles.helper, { color: color(event)[1] }]}>{schoolTime(event.eventDate)}{event.endDate ? ` – ${schoolTime(event.endDate)}` : ''}</Text>
            <Text style={{ color: color(event)[1], fontSize: 14, fontWeight: '600' }}>{event.courseCode ? `${event.courseCode} · ` : ''}{event.title}</Text>
          </Pressable>)}
        </View>;
      })}
    </ScrollView>}
    <View style={styles.legend}>{[['#2563EB', 'Classes'], ['#15803D', 'Personal events'], ...(!teacher ? [['#BE185D', 'Tasks & quizzes']] : [])].map(([dot, label]) => <View key={label} style={[styles.row, { gap: 5 }]}><View style={[styles.dot, { backgroundColor: dot }]} /><Text style={[styles.helper, muted]}>{label}</Text></View>)}</View>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
      <View style={styles.overlay}><Pressable accessibilityLabel="Close event details" style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
        <View accessibilityViewIsModal style={[styles.details, surface]}>
          <View style={styles.toolbar}><Text style={[styles.title, ink]}>Event details</Text><Pressable accessibilityRole="button" accessibilityLabel="Close event details" style={styles.arrow} onPress={() => setSelected(null)}><X color={theme.colors.text} size={21} /></Pressable></View>
          <Text style={[styles.title, ink]}>{selected?.courseCode ? `${selected.courseCode} · ` : ''}{selected?.title}</Text>
          <Text style={[styles.detailCopy, muted]}>{selected?.description}</Text>
          {selected && <Text style={[styles.detailCopy, muted]}>{schoolDateKey(selected.eventDate)} · {schoolTime(selected.eventDate)}{selected.endDate ? ` – ${schoolTime(selected.endDate)}` : ''} GMT+8</Text>}
          {!!selected?.room && <Text style={[styles.detailCopy, muted]}>Room {selected.room}</Text>}
          {destination && <Pressable accessibilityRole="button" style={[styles.open, { backgroundColor: theme.colors.text }]} onPress={() => { setSelected(null); router.push(destination as never); }}><Text style={{ color: theme.colors.card, fontWeight: '600' }}>Open {selected?.source === 'classwork' ? 'classwork' : 'course'}</Text></Pressable>}
          {selected?.source === 'personal' && selected.creatorId === userId && <Text style={[styles.helper, muted]}>Your personal event</Text>}
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 28 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, gap: 8, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '700', flexShrink: 1 },
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 3 },
  segment: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, borderRadius: 5 },
  today: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, justifyContent: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  helper: { fontSize: 13, lineHeight: 19 },
  month: { fontSize: 14, fontWeight: '600', paddingHorizontal: 10, marginVertical: 8 },
  weekdays: { flexDirection: 'row', paddingVertical: 9 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12 },
  monthViewport: { maxHeight: 330 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 108, borderTopWidth: 1, borderRightWidth: 1, paddingHorizontal: 2, paddingBottom: 4 },
  dateButton: { minHeight: 34, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 3 },
  dayNumber: { fontSize: 14 },
  event: { borderRadius: 4, padding: 3, marginBottom: 3, minHeight: 36 },
  eventText: { fontSize: 11, lineHeight: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  agendaViewport: { maxHeight: 330 },
  agendaDay: { padding: 8, gap: 6 },
  agendaEvent: { padding: 12, borderRadius: 8, minHeight: 56, gap: 4 },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 20 },
  details: { width: '100%', maxWidth: 480, alignSelf: 'center', borderRadius: 20, padding: 20, gap: 12 },
  detailCopy: { fontSize: 14, lineHeight: 22 },
  open: { padding: 14, minHeight: 48, borderRadius: 10, alignItems: 'center' },
});
