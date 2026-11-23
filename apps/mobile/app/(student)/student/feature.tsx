import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { IbeFeatureScreen, type IbeFeature } from '../../../src/screens/IbeFeatureScreen';
import { AppHeader, Screen } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { useTheme } from '../../../src/hooks/useTheme';

export default function StudentFeatureScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const theme = useTheme();

  if (
    feature &&
    ['business-plan', 'financial-statements', 'hall-of-fame', 'learning-hub', 'mock-interview', 'wordwise'].includes(feature)
  ) {
    return <IbeFeatureScreen feature={feature as IbeFeature} />;
  }

  return (
    <Screen>
      <AppHeader title="IBE Feature" showBack />
      <Text style={{ color: theme.colors.text, padding: 20 }}>
        This workspace is unavailable. Go back and select a feature from the Dashboard or More menu.
      </Text>
    </Screen>
  );
}

