import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { getCachedData } from '../../lib/offline-storage';
import { useTheme } from '../../hooks/useTheme';
export type ResumeItem = { courseId: string; title: string; route: string };
export function ContinueLearning({ courseIds }: { courseIds: string[] }) {
  const [item, setItem] = useState<ResumeItem | null>(null);
  const theme = useTheme(), router = useRouter();
  useFocusEffect(useCallback(() => {
    let active = true;
    void getCachedData<ResumeItem>('continue_learning').then(value => { if (active) setItem(value); });
    return () => { active = false; };
  }, []));
  const allowed = item && courseIds.includes(item.courseId) && new RegExp(`^/student/courses/[A-Za-z0-9_-]+/(?:materials|assignment)/[A-Za-z0-9_-]+$`).test(item.route);
  return <Card style={{ marginBottom: 20, padding: 20 }}>
    <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Continue learning</Text>
    <Text style={{ fontSize: 16, lineHeight: 24, color: theme.colors.textSecondary, marginBottom: 16 }}>{allowed ? item.title : 'Choose a course to begin your next learning session.'}</Text>
    <Button title={allowed ? 'Continue' : 'Browse courses'} onPress={() => router.push((allowed ? item.route : '/student/courses') as any)} />
  </Card>;
}
