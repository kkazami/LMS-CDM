import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { typography } from '../../lib/typography';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react-native';

export function StudyTimer() {
  const theme = useTheme();
  const api = useAuthStore((state) => state.api);

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next > 0 && next % 60 === 0) {
            api.gamification.sendHeartbeat().catch(() => {});
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, api]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return (
      (mins < 10 ? '0' : '') + mins + ':' + (remSecs < 10 ? '0' : '') + remSecs
    );
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSeconds(0);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.leftRow}>
        <Clock size={18} color={theme.colors.primary} />
        <Text style={[styles.timerText, typography.tabularLg, { color: theme.colors.text }]}>
          {formatTime(seconds)}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.primary }]}
          onPress={toggleTimer}
        >
          {isActive ? <Pause size={16} color="#FFFFFF" /> : <Play size={16} color="#FFFFFF" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.isDark ? '#2E3547' : '#F3F4F6' }]}
          onPress={resetTimer}
        >
          <RotateCcw size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
