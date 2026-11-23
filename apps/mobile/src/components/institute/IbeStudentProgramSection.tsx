import { Text } from '../ui/Text';
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Lock,
  Briefcase,
  FileSpreadsheet,
  UserCheck,
  BookOpen,
  Trophy,
  ChevronRight,
  GraduationCap,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { isBsbaHrmUser, isBsEntrepUser } from '../../lib/ite-eligibility';

interface ProgramFeatureItem {
  id: string;
  title: string;
  description: string;
  icon: typeof Briefcase;
  path: string;
}

export function IbeStudentProgramSection() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();

  const isEntrep = isBsEntrepUser(user);
  const isHrm = isBsbaHrmUser(user);

  const programCode = isEntrep ? 'BS ENTREP' : isHrm ? 'BSBA HRM' : null;
  const programName = isEntrep
    ? 'BS Entrepreneurship'
    : isHrm
    ? 'BS Business Administration Major in Human Resource Management'
    : 'IBE Academic Program';

  const entrepFeatures: ProgramFeatureItem[] = [
    {
      id: 'business-plan',
      title: 'Business Plan Guide',
      description: '14 sequential entrepreneurship lessons, sample templates, and guided venture builder.',
      icon: Briefcase,
      path: '/business-plan',
    },
    {
      id: 'financial-statements',
      title: 'Financial Statements',
      description: 'Prepare, validate, and export Income Statement, Balance Sheet, Cash Flow, and Equity reports.',
      icon: FileSpreadsheet,
      path: '/financial-statements',
    },
    {
      id: 'hall-of-fame',
      title: 'Entrepreneur Hall of Fame',
      description: 'Explore 10 famous entrepreneurs, verified achievements, and career milestones.',
      icon: Trophy,
      path: '/hall-of-fame',
    },
    {
      id: 'learning-hub',
      title: 'IBE Learning Hub',
      description: 'Curated entrepreneurship, finance, marketing, and operations business courses.',
      icon: BookOpen,
      path: '/learning-hub',
    },
  ];

  const hrmFeatures: ProgramFeatureItem[] = [
    {
      id: 'mock-interview',
      title: 'Mock Interview AI',
      description: 'AI interview coach, 36 sample answers, Recruiter Mode simulation, and readiness quiz.',
      icon: UserCheck,
      path: '/mock-interview',
    },
    {
      id: 'wordwise',
      title: 'IBE WordWise',
      description: 'Live 150,000+ English Dictionary with A–Z lookup, 6 academic vocabulary categories, Word of the Day.',
      icon: BookOpen,
      path: '/wordwise',
    },
    {
      id: 'hall-of-fame',
      title: 'HR Leaders Hall of Fame',
      description: 'Explore 10 famous HR leaders, workplace leadership milestones, and ethical management.',
      icon: Trophy,
      path: '/hall-of-fame',
    },
    {
      id: 'learning-hub',
      title: 'IBE Learning Hub',
      description: 'Curated business communication, people management, and professional courses.',
      icon: BookOpen,
      path: '/learning-hub',
    },
  ];

  const activeFeatures = isEntrep
    ? entrepFeatures
    : isHrm
    ? hrmFeatures
    : [...entrepFeatures.slice(0, 2), ...hrmFeatures.slice(0, 2)];

  const handleOpenFeature = (featureId: string) => {
    router.push({
      pathname: '/student/feature',
      params: { feature: featureId },
    } as never);
  };

  return (
    <View style={styles.container}>
      {/* ── Program Header Box ── */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: theme.isDark ? '#231E12' : '#FFFDF5',
            borderColor: theme.isDark ? '#5C4410' : '#FDE68A',
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.programPill, { backgroundColor: '#D97706' }]}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.programPillText}>Your Program</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: theme.isDark ? '#374151' : '#E5E7EB',
                },
              ]}
            >
              <Lock size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.statusBadgeText, { color: theme.colors.textSecondary }]}>
                {programCode ? 'Locked' : 'IBE Catalog'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.programTitleRow}>
          {programCode && (
            <View style={[styles.codeBadge, { backgroundColor: '#D97706' }]}>
              <Text style={styles.codeBadgeText}>{programCode}</Text>
            </View>
          )}
          <Text style={[styles.programNameText, { color: theme.colors.text }]} numberOfLines={2}>
            {programName}
          </Text>
        </View>
        <Text style={[styles.programDescText, { color: theme.colors.textSecondary }]}>
          {isEntrep
            ? 'Specialized venture creation, financial modeling, and business development workspace.'
            : isHrm
            ? 'Specialized recruitment simulation, academic language proficiency, and leadership tools.'
            : 'Explore your IBE degree program tools and learning resources.'}
        </Text>
      </View>

      {/* ── Feature Cards Grid/List ── */}
      <View style={styles.featureList}>
        {activeFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.isDark ? '#374151' : '#F3F4F6',
                },
              ]}
              onPress={() => handleOpenFeature(feature.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Open ${feature.title}`}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#D97706' }]}>
                  <Icon size={20} color="#FFFFFF" />
                </View>
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>Workspace</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                  {feature.description}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.actionText}>Launch {feature.title}</Text>
                <ChevronRight size={16} color="#D97706" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 14,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  programPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  programTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  programNameText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  programDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  featureList: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  availableBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
});

