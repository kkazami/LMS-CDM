import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, AppHeader } from '../../../../src/components/ui';
import { Button } from '../../../../src/components/common/Button';
import { IcsKnowledgeExchangeCard } from '../../../../src/components/institute/IcsKnowledgeExchangeCard';
import { useTheme } from '../../../../src/hooks/useTheme';
export default function StudentCommunity() {
  const theme = useTheme(), router = useRouter();
  return <Screen scroll withBottomInset contentContainerStyle={{ padding: 20 }}><AppHeader title="Community" subtitle="Questions, answers and feedback" />
    <Text style={{ fontSize: 16, lineHeight: 24, color: theme.colors.textSecondary, marginBottom: 20 }}>Ask a focused question, share what you tried, or learn from classmates’ answers.</Text>
    <Button title="Browse Knowledge Exchange" onPress={() => router.push('/student/knowledge-exchange' as any)} style={{ marginBottom: 24 }} />
    <IcsKnowledgeExchangeCard />
  </Screen>;
}
