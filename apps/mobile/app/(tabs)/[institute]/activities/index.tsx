import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { typography } from '../../../../src/lib/typography';
import { Code2, Cpu, HardDrive, Share2, Sparkles } from 'lucide-react-native';

export default function ActivitiesScreen() {
  const theme = useTheme();

  const activities = [
    {
      title: 'CodeLab IDE',
      desc: 'Coding problems in Python, C++, Java, JS, and SQL.',
      icon: Code2,
      note: 'Available on Web LMS for full IDE experience',
    },
    {
      title: '3D PC Build Lab',
      desc: 'Hardware assembly and compatibility simulator.',
      icon: HardDrive,
      note: 'Available on Web LMS with Three.js WebGL',
    },
    {
      title: 'Arduino & IoT Simulator',
      desc: 'Circuit design and microcontroller breadboard.',
      icon: Cpu,
      note: 'Available on Web LMS',
    },
    {
      title: 'Digital Logic Lab',
      desc: 'Gate logic wiring and truth table automated verification.',
      icon: Share2,
      note: 'Available on Web LMS',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Interactive Labs" subtitle="Specialized Engineering & Coding Activities" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activities.map((act, idx) => {
          const IconComp = act.icon;
          return (
            <View
              key={idx}
              style={[
                styles.card,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '18' }]}>
                <IconComp size={22} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.title, typography.headingSm, { color: theme.colors.text }]}>
                  {act.title}
                </Text>
                <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
                  {act.desc}
                </Text>
                <View style={[styles.noteBadge, { backgroundColor: theme.isDark ? '#2E3547' : '#F3F4F6' }]}>
                  <Sparkles size={12} color={theme.colors.primary} />
                  <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                    {act.note}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    marginVertical: 4,
  },
  noteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  noteText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
