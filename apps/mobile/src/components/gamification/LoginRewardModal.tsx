import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, TOUCH_TARGET } from '../../lib/typography';
import { Flame, Zap } from 'lucide-react-native';

interface LoginRewardModalProps {
  visible: boolean;
  streak: number;
  expEarned: number;
  onClaim: () => void;
}

export function LoginRewardModal({ visible, streak, expEarned, onClaim }: LoginRewardModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClaim}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.flameCircle, { backgroundColor: '#FEF3C7' }]}>
            <Flame size={44} color="#F59E0B" />
          </View>

          <Text style={[styles.title, typography.headingLg, { color: theme.colors.text }]}>
            Daily Login Reward!
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You logged in today and maintained your study streak!
          </Text>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardBadge, { backgroundColor: '#FEF3C7' }]}>
              <Flame size={18} color="#D97706" />
              <Text style={[styles.rewardText, { color: '#92400E' }]}>{streak} Day Streak</Text>
            </View>
            <View style={[styles.rewardBadge, { backgroundColor: '#FEF9C3' }]}>
              <Zap size={18} color="#CA8A04" />
              <Text style={[styles.rewardText, { color: '#854D0E' }]}>{'+' + expEarned + ' EXP'}</Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Claim Reward"
            style={[styles.claimBtn, { backgroundColor: theme.colors.primary, minHeight: TOUCH_TARGET }]}
            onPress={onClaim}
            activeOpacity={0.85}
          >
            <Text style={styles.claimBtnText}>Claim Reward</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  flameCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 6,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  claimBtn: {
    width: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
