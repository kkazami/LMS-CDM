import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';

export default function HelpScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Help & Support" subtitle="Get assistance" showBack />
      <View style={styles.content}>
        <Card>
          <Text style={styles.title}>Lumina Support</Text>
          <Text style={styles.body}>If you experience issues logging in or accessing courses, please contact your institute administrator or IT support desk.</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: '#2C2727' },
  body: { fontSize: 14, color: '#4B5563', marginTop: 8, lineHeight: 20 },
});
