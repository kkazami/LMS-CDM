import { Text } from '../../../src/components/ui/Text';
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { IcsFeatureScreen } from '../../../src/screens/IcsFeatureScreen';
import { AppHeader, Screen } from '../../../src/components/ui';
import { useTheme } from '../../../src/hooks/useTheme';

export default function InstructorToolsScreen() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  const theme = useTheme();
  if (tool === 'create-class' || tool === 'archives' || tool === 'organization' || tool === 'seasons' || tool === 'classwork' || tool === 'course-tools') return <IcsFeatureScreen feature={tool} />;
  return <Screen><AppHeader title="Instructor tools" showBack /><Text style={{ color: theme.colors.text, padding: 20 }}>This tool is unavailable. Go back and choose a tool from More.</Text></Screen>;
}
