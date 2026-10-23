import React, { useEffect, useState } from 'react';
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

export default function StudentFlashcardStudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
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
      if (response?.cards && response.cards.length > 0) {
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
    if (!currentCard || !deckId) return;

    const nextCorrect = status === 'correct' ? correctCount + 1 : correctCount;
    const nextIncorrect = status === 'incorrect' ? incorrectCount + 1 : incorrectCount;

    if (status === 'correct') setCorrectCount(nextCorrect);
    else setIncorrectCount(nextIncorrect);

    // Record card progress in background
    api.flashcards.recordProgress(currentCard.id, status).catch(() => {});

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      // Session finished! Complete session and award EXP
      setSessionCompleted(true);
      try {
        const stats = {
          totalCards: cards.length,
          correct: nextCorrect,
          incorrect: nextIncorrect,
          unseen: 0,
        };
        const res = await api.flashcards.completeSession(deckId, stats);
        setExpAwarded(res?.expEarned || 50);

        try {
          Burnt.toast({
            title: 'Study Session Finished!',
            message: `+${res?.expEarned || 50} EXP granted`,
            preset: 'done',
          });
        } catch {
          // Fallback
        }
      } catch {
        setExpAwarded(30);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSessionCompleted(false);
    setExpAwarded(0);
  };

  const progressPercent = cards.length > 0 ? ((currentIndex + (sessionCompleted ? 1 : 0)) / cards.length) * 100 : 0;

  return (
    <Screen contentContainerStyle={styles.screenInner}>
      <AppHeader
        showBack
        title={sessionCompleted ? 'Session Complete' : `Card ${currentIndex + 1} of ${cards.length}`}
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
            onRetry={loadCards}
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
        ) : (
          /* ==================== ACTIVE STUDY CARD ==================== */
          <View style={styles.cardContainer}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => setIsFlipped((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={`Flashcard: ${isFlipped ? 'showing answer' : 'showing question'}. Double tap to flip.`}
              style={[
                styles.flashcard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: isFlipped ? theme.colors.primary : theme.colors.border,
                  borderRadius: radius.xl,
                  padding: s(spacing.xl),
                  minHeight: s(280),
                },
              ]}
            >
              <View style={styles.cardSideBadge}>
                <Badge
                  label={isFlipped ? 'ANSWER (BACK)' : 'PROMPT (FRONT)'}
                  variant={isFlipped ? 'primary' : 'default'}
                  size="sm"
                />
                <View style={[styles.flipPromptRow, { gap: s(spacing.xs) }]}>
                  <RotateCw size={s(13)} color={theme.colors.textSecondary} />
                  <Text
                    style={[styles.flipPromptText, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Tap to flip
                  </Text>
                </View>
              </View>

              <View style={styles.cardContentBox}>
                <Text
                  style={[
                    styles.cardMainText,
                    {
                      color: theme.colors.text,
                      fontSize: font(19),
                      lineHeight: font(27),
                    },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {isFlipped ? currentCard.back : currentCard.front}
                </Text>
              </View>

              {/* Hint Section */}
              {!isFlipped && Boolean(currentCard.hint) ? (
                <View style={[styles.hintContainer, { marginTop: s(spacing.md) }]}>
                  {showHint ? (
                    <View
                      style={[
                        styles.hintBox,
                        {
                          backgroundColor: theme.colors.surfaceAlt,
                          borderRadius: radius.md,
                          padding: s(spacing.md),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.hintText,
                          { color: theme.colors.textSecondary, fontSize: font(12.5), lineHeight: font(18) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Hint: {currentCard.hint}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.revealHintBtn, { minHeight: TOUCH_TARGET }]}
                      onPress={() => setShowHint(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Reveal flashcard hint"
                    >
                      <HelpCircle size={s(14)} color={theme.colors.primary} />
                      <Text
                        style={[
                          styles.revealHintText,
                          { color: theme.colors.primary, fontSize: font(13), marginLeft: s(spacing.xs) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        Reveal Hint
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </TouchableOpacity>

            {/* Spaced Repetition Response Buttons */}
            <View style={[styles.responseButtonsRow, { marginTop: s(spacing.xl), gap: s(spacing.md) }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Mark incorrect or review needed"
                style={[
                  styles.respBtn,
                  {
                    backgroundColor: theme.colors.dangerBg,
                    borderColor: theme.colors.danger,
                    borderRadius: radius.md,
                    paddingVertical: s(spacing.md),
                  },
                ]}
                onPress={() => handleResponse('incorrect')}
                activeOpacity={0.8}
              >
                <XCircle size={s(20)} color={theme.colors.danger} />
                <Text
                  style={[styles.respBtnText, { color: theme.colors.danger, fontSize: font(14), marginLeft: s(spacing.xs) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Mark correct and confident"
                style={[
                  styles.respBtn,
                  {
                    backgroundColor: theme.colors.successBg,
                    borderColor: theme.colors.success,
                    borderRadius: radius.md,
                    paddingVertical: s(spacing.md),
                  },
                ]}
                onPress={() => handleResponse('correct')}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={s(20)} color={theme.colors.success} />
                <Text
                  style={[styles.respBtnText, { color: theme.colors.success, fontSize: font(14), marginLeft: s(spacing.xs) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Got It
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
