import React, { useEffect, useRef, useState } from 'react';
import { FlashcardPractice } from '../../../../src/components/institute/FlashcardPractice';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  RotateCw,
  HelpCircle,
  Trophy,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { Card } from '../../../../src/components/common/Card';
import {
  Screen,
  AppHeader,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { radius, spacing } from '../../../../src/lib/theme';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { FlashcardCard } from '@lms/types';
import { queueCardReview, queueCardCompletion, syncCardQueue } from '../../../../src/lib/flashcard-queue';

export default function StudentFlashcardStudyScreen() {
  const { deckId, deckTitle } = useLocalSearchParams<{ deckId: string; deckTitle?: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Session stats
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [expAwarded, setExpAwarded] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const startedAt = useRef(Date.now());
  const completionKey = useRef(`cards-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const finishSession = async () => {
    const key = completionKey.current;
    const durationSeconds = Math.floor((Date.now() - startedAt.current) / 1000);
    if (durationSeconds < 5) {
      setErrorMessage('Your reviews are saved. A session must last at least 5 seconds to receive a reward.');
      return;
    }
    try {
      await queueCardCompletion({ deckId: deckId!, cardsReviewed: cards.length, durationSeconds, idempotencyKey: completionKey.current });
      const res = await syncCardQueue();
      if (completionKey.current !== key) return;
      setExpAwarded(previous => Math.max(previous, res.expEarned ?? 0));
      setErrorMessage(null);
    } catch {
      setErrorMessage('Saved on this device · sync pending. Reconnect and retry to confirm your reviews and reward.');
    }
  };

  const loadCards = async () => {
    if (!deckId) return;

    try {
      setErrorMessage(null);
      const cached = await getCachedData<FlashcardCard[]>(`deck_cards_${deckId}`);
      if (cached && cached.length > 0) {
        setCards(cached);
        setLoading(false);
      }

      const response = await api.flashcards.getCards(deckId);
      if (response?.cards) {
        setCards(response.cards);
        await setCachedData(`deck_cards_${deckId}`, response.cards);
      }
    } catch (err: any) {
      if (!cards.length) {
        setErrorMessage(err?.message || 'Could not load flashcards. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [deckId]);

  const currentCard = cards[currentIndex];

  const handleResponse = async (status: 'correct' | 'incorrect') => {
    if (!currentCard || !deckId || !isFlipped || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setErrorMessage(null);
    try {
      await queueCardReview(currentCard.id, status === 'correct' ? 'knew_it' : 'still_learning');
    } catch {
      setErrorMessage('This review could not save on this device. Reconnect to verify your sign-in, then tap your answer again.');
      savingRef.current = false;
      setSaving(false);
      return;
    }

    const nextCorrect = status === 'correct' ? correctCount + 1 : correctCount;
    const nextIncorrect = status === 'incorrect' ? incorrectCount + 1 : incorrectCount;

    if (status === 'correct') setCorrectCount(nextCorrect);
    else setIncorrectCount(nextIncorrect);
    void syncCardQueue().catch(() => setErrorMessage('Saved on this device · sync pending. Your reviews will retry after you reconnect.'));

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setSessionCompleted(true);
      await finishSession();
    }
    savingRef.current = false;
    setSaving(false);
  };

  const handleRestart = () => {
    if (savingRef.current) return;
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSessionCompleted(false);
    setExpAwarded(0);
    startedAt.current = Date.now();
    completionKey.current = `cards-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  if (!loading && currentCard && !sessionCompleted) return <FlashcardPractice
    card={currentCard} title={deckTitle || 'Study flashcards'} index={currentIndex} count={cards.length}
    flipped={isFlipped} saving={saving} showHint={showHint}
    onHint={() => setShowHint(value => !value)} onFlip={() => setIsFlipped(value => !value)}
    onClose={() => router.back()} onRate={rating => { void handleResponse(rating); }}
    notice={errorMessage ? <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} /> : null}
  />;

  const progressPercent = cards.length > 0 ? ((currentIndex + (sessionCompleted ? 1 : 0)) / cards.length) * 100 : 0;

  return (
    <Screen contentContainerStyle={styles.screenInner}>
      <AppHeader
        showBack
        title={sessionCompleted ? 'Session Complete' : loading ? 'Loading flashcards' : 'Study flashcards'}
        subtitle="Active Recall Practice Session"
      />

      {/* Progress Bar */}
      <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.surfaceAlt, height: s(4) }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPercent}%`, backgroundColor: theme.colors.primary, height: s(4) },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.contentScroll, { padding: s(spacing.lg) }]}>
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={sessionCompleted ? finishSession : loadCards}
            onDismiss={() => setErrorMessage(null)}
            retryAccessibilityLabel="Retry loading flashcards"
            style={{ marginBottom: s(spacing.md) }}
          />
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <SkeletonBlock
              width="100%"
              height={s(280)}
              borderRadius={radius.xl}
              style={{ marginBottom: s(spacing.xl) }}
            />
            <View style={{ flexDirection: 'row', gap: s(spacing.md) }}>
              <SkeletonBlock width="48%" height={s(48)} borderRadius={radius.md} />
              <SkeletonBlock width="48%" height={s(48)} borderRadius={radius.md} />
            </View>
          </View>
        ) : cards.length === 0 ? (
          <Card
            style={[
              styles.emptyCard,
              {
                padding: s(spacing.xxxl),
                borderRadius: radius.lg,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <HelpCircle size={s(48)} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              No Cards in this Deck
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Add flashcards to begin your active recall study session.
            </Text>
            <Button
              title="Go Back"
              onPress={() => router.back()}
              style={{ marginTop: s(spacing.lg) }}
            />
          </Card>
        ) : sessionCompleted ? (
          /* ==================== SUMMARY SCREEN ==================== */
          <View style={styles.summaryContainer}>
            <View
              style={[
                styles.trophyCircle,
                {
                  backgroundColor: `${theme.colors.primary}18`,
                  width: s(88),
                  height: s(88),
                  borderRadius: radius.full,
                },
              ]}
            >
              <Trophy size={s(50)} color={theme.colors.primary} />
            </View>

            <Text
              style={[
                styles.summaryTitle,
                { color: theme.colors.text, fontSize: font(22), lineHeight: font(28) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Fantastic Practice!
            </Text>
            <Text
              style={[
                styles.summarySub,
                { color: theme.colors.textSecondary, fontSize: font(14), lineHeight: font(20) },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              You completed all cards in this active recall deck.
            </Text>

            {/* EXP Reward Pill */}
            <View
              style={[
                styles.rewardBadge,
                {
                  backgroundColor: theme.colors.warningBg,
                  borderColor: theme.colors.warning,
                  borderRadius: radius.full,
                  paddingHorizontal: s(spacing.lg),
                  paddingVertical: s(spacing.sm),
                },
              ]}
            >
              <Zap size={s(20)} color={theme.colors.warning} />
              <Text
                style={[
                  styles.rewardText,
                  { color: theme.colors.warning, fontSize: font(14) },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                +{expAwarded} EXP Earned
              </Text>
            </View>

            {/* Stats Box */}
            <View
              style={[
                styles.statsCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: radius.lg,
                  padding: s(spacing.lg),
                  marginVertical: s(spacing.xl),
                },
              ]}
            >
              <View style={styles.statCol}>
                <Text
                  style={[styles.statNum, { color: theme.colors.success, fontSize: font(22) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {correctCount}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Correct
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statCol}>
                <Text
                  style={[styles.statNum, { color: theme.colors.danger, fontSize: font(22) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {incorrectCount}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Review Needed
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statCol}>
                <Text
                  style={[styles.statNum, { color: theme.colors.primary, fontSize: font(22) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0}%
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Accuracy
                </Text>
              </View>
            </View>

            <View style={[styles.summaryActions, { gap: s(spacing.md) }]}>
              <Button
                title="Practice Again"
                onPress={handleRestart}
                icon={RotateCcw}
                style={{ flex: 1 }}
              />
              <Button
                title="Return to Decks"
                onPress={() => router.back()}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    flex: 1,
  },
  progressBarBackground: {
    width: '100%',
  },
  progressBarFill: {},
  contentScroll: {
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 32,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 32,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  summaryContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  trophyCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  summarySub: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
  },
  rewardText: {
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 4,
  },
  statDivider: {
    width: 1,
  },
  summaryActions: {
    flexDirection: 'row',
    width: '100%',
  },
  cardContainer: {
    flex: 1,
  },
  flashcard: {
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  cardSideBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flipPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flipPromptText: {},
  cardContentBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  cardMainText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  hintContainer: {},
  hintBox: {},
  hintText: {},
  revealHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revealHintText: {
    fontWeight: '600',
  },
  responseButtonsRow: {
    flexDirection: 'row',
  },
  respBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: TOUCH_TARGET ?? 44,
  },
  respBtnText: {
    fontWeight: '700',
  },
});
