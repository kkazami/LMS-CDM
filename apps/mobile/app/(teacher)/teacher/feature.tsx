import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { AppHeader, Screen } from '../../../src/components/ui';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/common/Button';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuthStore } from '../../../src/stores/auth-store';
import { isIbeUser } from '../../../src/lib/ite-eligibility';
import { IbeFeatureScreen, type IbeFeature } from '../../../src/screens/IbeFeatureScreen';

const INSTRUCTOR_IBE_FEATURES: readonly string[] = [
  'consultation-management',
  'gradebooks',
  'archives',
  'calendar',
  'manage-leaderboard',
  'create-class',
];

export default function TeacherFeatureScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  if (isIbeUser(user) && feature && INSTRUCTOR_IBE_FEATURES.includes(feature)) {
    return <IbeFeatureScreen feature={feature as IbeFeature} />;
  }

  return (
    <Screen>
      <AppHeader title="Student Workspace" showBack onBack={() => router.replace('/teacher/dashboard')} />
      <View style={styles.container}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: theme.isDark ? '#3D2A08' : '#FFF9E6',
              borderColor: theme.isDark ? '#6B4C0A' : '#F3D580',
            },
          ]}
        >
          <ShieldAlert size={36} color={theme.isDark ? '#FFAE19' : '#D97706'} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          Restricted to Enrolled Students
        </Text>

        <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
          IBE student workspaces (Business Plan Guide, Financial Statements, Mock Interview AI, and WordWise) are tailored exclusively for student coursework submissions.
        </Text>

        <Text style={[styles.subdesc, { color: theme.colors.textSecondary }]}>
          Faculty tools such as Attendance Management, Class Analytics, Gradebooks, and Bulletins can be accessed from your Dashboard or More menu.
        </Text>

        <Button
          title="Back to Faculty Dashboard"
          onPress={() => router.replace('/teacher/dashboard')}
          style={{ marginTop: 8 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    maxWidth: 480,
    alignSelf: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  subdesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

