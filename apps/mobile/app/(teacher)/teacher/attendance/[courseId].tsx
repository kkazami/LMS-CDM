import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen, AppHeader } from '../../../../src/components/ui';
import { AttendancePanel } from '../../../../src/components/attendance/AttendancePanel';
export default function DelegatedAttendance() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return <Screen scroll contentContainerStyle={{ padding: 16 }}><AppHeader title="Class attendance" showBack /><AttendancePanel courseId={courseId} /></Screen>;
}
