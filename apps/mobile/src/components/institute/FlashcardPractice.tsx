import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, HelpCircle, Layers, RotateCw, X, XCircle } from 'lucide-react-native';
import type { FlashcardCard } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../lib/design-system';

interface Props {
  card: FlashcardCard;
  title: string;
  index: number;
  count: number;
  flipped: boolean;
  saving: boolean;
  showHint: boolean;
  onHint: () => void;
  onFlip: () => void;
  onClose: () => void;
  onRate: (rating: 'correct' | 'incorrect') => void;
  notice?: React.ReactNode;
}

export function FlashcardPractice({ card, title, index, count, flipped, saving, showHint, onHint, onFlip, onClose, onRate, notice }: Props) {
  const theme = useTheme(), insets = useSafeAreaInsets(), reduced = useReducedMotion();
  const rotation = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    rotation.stopAnimation();
    if (reduced) { rotation.setValue(flipped ? 1 : 0); return; }
    Animated.timing(rotation, { toValue: flipped ? 1 : 0, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [flipped, reduced, rotation]);
  useEffect(() => {
    rotation.setValue(flipped ? 1 : 0);
    entry.setValue(reduced ? 1 : 0);
    if (!reduced) Animated.timing(entry, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => { entry.stopAnimation(); rotation.stopAnimation(); };
  }, [card.id, reduced, entry, rotation]);
  const dark = theme.isDark;
  const colors = { ink: dark ? '#F1F5F9' : '#152033', secondary: dark ? '#ACB5C5' : '#52627A', face: dark ? '#171C27' : '#FFFFFF', edge: dark ? '#343B49' : '#D5DBE4' };
  const segments = Math.min(count, 20);
  const progress = count > 0 ? index / count : 0;
  return <LinearGradient colors={dark ? ['#4A290F', '#151B28', '#0D131F'] : ['#F5E7D5', '#F1F3F7', '#EDF0F5']} style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
    <View style={styles.frame}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close flashcard session" onPress={onClose} style={styles.icon}><X size={27} color={colors.ink} /></Pressable>
        <View style={{ flex: 1 }}><Text numberOfLines={2} style={[styles.title, { color: colors.ink }]}>{title}</Text><Text style={[styles.small, { color: colors.secondary }]}>Card {index + 1} of {count}</Text></View>
        {!!card.hint && <Pressable accessibilityRole="button" accessibilityLabel={showHint ? 'Hide hint' : 'Show hint'} accessibilityState={{ expanded: showHint }} style={styles.icon} onPress={onHint}><HelpCircle size={23} color={colors.secondary} /></Pressable>}
        <Layers size={23} color={colors.secondary} />
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: count, now: index }} style={styles.progress}>
        {Array.from({ length: segments }, (_, segment) => <View key={segment} style={[styles.segment, { backgroundColor: segment / segments < progress ? dark ? '#F2B574' : '#A9470A' : dark ? '#414956' : '#D3D9E2', borderColor: Math.floor(progress * segments) === segment ? colors.ink : 'transparent', borderWidth: 2 }]} />)}
      </View>
      {notice}
      <Animated.View style={[styles.stack, { opacity: entry, transform: [{ translateX: entry.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}>
        {[2, 1].map(depth => <View key={depth} pointerEvents="none" style={[styles.stackedCard, { backgroundColor: colors.face, borderColor: colors.edge, transform: [{ translateY: depth * 7 }, { scale: 1 - depth * 0.035 }] }]} />)}
        <Pressable accessibilityRole="button" accessibilityLabel={flipped ? 'Show question' : 'Show answer'} disabled={saving} onPress={onFlip} style={styles.flipTarget}>
          {([false, true] as const).map(back => <Animated.View key={String(back)} pointerEvents={back === flipped ? 'auto' : 'none'} accessibilityElementsHidden={back !== flipped} importantForAccessibility={back === flipped ? 'auto' : 'no-hide-descendants'} style={[styles.face, { backgroundColor: colors.face, borderColor: colors.edge, opacity: rotation.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: back ? [0, 0, 1, 1] : [1, 1, 0, 0] }), transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [0, 1], outputRange: back ? ['180deg', '360deg'] : ['0deg', '180deg'] }) }] }]}>
            <View style={styles.faceHeader}><Text style={[styles.label, { color: colors.secondary }]}>{back ? 'ANSWER' : 'QUESTION'}</Text><RotateCw size={17} color={colors.secondary} /></View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.copy} showsVerticalScrollIndicator>
              {back && <Text style={[styles.prompt, { color: colors.secondary, borderColor: colors.edge }]}>{card.front}</Text>}
              <Text selectable style={[styles.content, { color: colors.ink }]}>{back ? card.back : card.front}</Text>
              {!back && showHint && !!card.hint && <Text style={[styles.hint, { color: colors.secondary }]}>Hint · {card.hint}</Text>}
            </ScrollView>
            <View style={[styles.flipLabel, { borderColor: colors.edge }]}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{back ? 'Show question' : 'Show answer'}</Text></View>
          </Animated.View>)}
        </Pressable>
      </Animated.View>
      <Text accessibilityLiveRegion="polite" style={[styles.instruction, { color: colors.secondary }]}>{saving ? 'Saving your review…' : flipped ? 'How well did you remember?' : 'Think of your answer, then tap the card to reveal.'}</Text>
      <View style={styles.ratings}>
        {([{ rating: 'incorrect', label: 'Again', detail: 'Review needed', icon: XCircle, ink: dark ? '#FDA4AF' : '#B42318', bg: dark ? '#421D25' : '#FFF1F2', edge: dark ? '#7F3545' : '#F0A5AC' }, { rating: 'correct', label: 'Got It', detail: 'Remembered', icon: CheckCircle2, ink: dark ? '#6EE7B7' : '#047857', bg: dark ? '#0C352A' : '#ECFDF5', edge: dark ? '#17674D' : '#83CFB3' }] as const).map(item => <Pressable key={item.rating} accessibilityRole="button" accessibilityLabel={item.rating === 'correct' ? 'Mark correct and confident' : 'Mark incorrect or review needed'} accessibilityState={{ disabled: !flipped || saving, busy: saving }} disabled={!flipped || saving} onPress={() => onRate(item.rating)} style={({ pressed }) => [styles.rating, { backgroundColor: item.bg, borderColor: item.edge, opacity: saving || !flipped ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <item.icon size={28} color={item.ink} /><Text style={{ color: item.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' }}>{item.label}</Text><Text style={{ color: item.ink, fontSize: 12 }}>{item.detail}</Text>
        </Pressable>)}
      </View>
    </View>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, frame: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  icon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '700' }, small: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  progress: { flexDirection: 'row', gap: 5, paddingHorizontal: 22, paddingBottom: 12 }, segment: { flex: 1, height: 8, borderRadius: 5 },
  stack: { flex: 1, minHeight: 220, marginHorizontal: 16, marginTop: 12, marginBottom: 20 },
  stackedCard: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 18, borderWidth: 1 }, flipTarget: { flex: 1 },
  face: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderWidth: 1, borderRadius: 18, padding: 20, backfaceVisibility: 'hidden' },
  faceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 1 },
  copy: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  content: { fontSize: 25, lineHeight: 37, fontWeight: '500' },
  prompt: { fontSize: 16, lineHeight: 25, paddingBottom: 20, marginBottom: 20, borderBottomWidth: 1 },
  hint: { fontSize: 14, lineHeight: 23, marginTop: 20 },
  flipLabel: { alignSelf: 'center', borderWidth: 1, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10, marginTop: 14 },
  instruction: { textAlign: 'center', fontSize: 12, lineHeight: 18, paddingHorizontal: 16, marginBottom: 10 },
  ratings: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  rating: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 100, borderWidth: 1, borderRadius: 14, paddingVertical: 10 },
});
