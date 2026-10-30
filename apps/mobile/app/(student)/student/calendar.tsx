import React, { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LmsCalendarEvent } from '@lms/types';
import { Screen, AppHeader, ErrorBanner, SkeletonBlock } from '../../../src/components/ui';
import { Button } from '../../../src/components/common/Button';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useTheme } from '../../../src/hooks/useTheme';
import { getCachedData, setCachedData } from '../../../src/lib/offline-storage';
import { studentNotificationRoute } from '../../../src/lib/student-navigation';
import { addDays, classOccurrences, schoolDateKey } from '../../../src/lib/ics-calendar';

export default function StudentAgenda() {
  const api = useAuthStore(s => s.api), user = useAuthStore(s => s.user), theme = useTheme(), router = useRouter();
  const [events, setEvents] = useState<LmsCalendarEvent[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [showPast, setShowPast] = useState(false);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  async function load() {
    setError('');
    try {
      const saved = await getCachedData<LmsCalendarEvent[]>('student_agenda');
      if (saved) { setEvents(saved); setLoading(false); }
      const response = await api.workspace.getAgenda();
      const days = Array.from({ length: 60 }, (_, index) => addDays(schoolDateKey(new Date()), index));
      const events = [...response.events, ...classOccurrences(response.schedules, days)];
      setEvents(events); await setCachedData('student_agenda', events);
    } catch { setError('Could not refresh your agenda. Saved dates may have changed; check your course when connected.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <Screen withBottomInset><AppHeader showBack title="Agenda" subtitle="Coursework and campus events" />
    <Button title={showPast ? 'Show upcoming events' : 'Include past events'} variant="ghost" onPress={() => setShowPast(!showPast)} />
    {!!error && <ErrorBanner message={error} onRetry={load} />}
    {loading ? <View style={{ padding: 20, gap: 16 }}><SkeletonBlock height={96} width="100%" /><SkeletonBlock height={96} width="100%" /></View> : <FlatList
      data={events.filter(event => showPast || Date.parse(event.eventDate) >= today.getTime()).sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))} keyExtractor={item => item.id}
      contentContainerStyle={{ padding: 20, gap: 12 }} onRefresh={load} refreshing={loading}
      ListEmptyComponent={<Text style={{ color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24 }}>No events loaded. Pull to refresh when connected.</Text>}
      renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" style={{ padding: 16, minHeight: 72, borderRadius: 12, backgroundColor: theme.colors.card }} onPress={() => {
        const target = studentNotificationRoute(item.deepLink, user?.institute.code ?? 'ics');
        if (target) router.push(target as any);
      }}><Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{item.title}</Text><Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{new Date(item.eventDate).toLocaleString()} · {item.courseTitle || 'Campus'}</Text></TouchableOpacity>}
    />}
  </Screen>;
}
