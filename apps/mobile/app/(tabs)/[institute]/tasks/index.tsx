import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { EmptyState } from '../../../../src/components/common/EmptyState';

export default function TasksScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Tasks" subtitle="Personal task list" showBack />
      <View style={styles.content}>
        <EmptyState
          title="No Personal Tasks"
          message="Keep track of your study schedule and to-do items here."
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
});
