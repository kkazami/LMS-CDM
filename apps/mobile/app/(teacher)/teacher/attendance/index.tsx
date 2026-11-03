import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, AppHeader } from '../../../../src/components/ui';
import { Button } from '../../../../src/components/common/Button';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
export default function AttendanceAssignments() {
  const api = useAuthStore(s => s.api); const theme = useTheme(); const router = useRouter();
  const [items, setItems] = useState<Array<{ id: string; title: string }>>([]); const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { let active = true; void api.attendance.assignments().then(value => { if (active) setItems(value); }).catch(() => { if (active) setError('Attendance assignments unavailable.'); }); return () => { active = false; }; }, [api]));
  return <Screen scroll><AppHeader title="Attendance assignments" showBack /><Text style={{ color: theme.colors.text, margin: 16 }}>Classes where you have attendance-only helper access.</Text>{error && <Text accessibilityRole="alert" style={{ color: theme.colors.text }}>{error}</Text>}{items.map(item => <Button key={item.id} title={item.title} variant="outline" onPress={() => router.push({ pathname: '/teacher/attendance/[courseId]', params: { courseId: item.id } })} />)}{!items.length && !error && <Text style={{ color: theme.colors.text, margin: 16 }}>No delegated attendance assignments.</Text>}</Screen>;
}
