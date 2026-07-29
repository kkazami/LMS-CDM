import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';

export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Settings" subtitle="App preferences" showBack />
      <View style={styles.content}>
        <Card>
          <Text style={styles.text}>App Version 1.0.0</Text>
          <Text style={styles.subText}>Push notifications & dark mode settings coming soon.</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  text: { fontSize: 16, fontWeight: '700', color: '#2C2727' },
  subText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
