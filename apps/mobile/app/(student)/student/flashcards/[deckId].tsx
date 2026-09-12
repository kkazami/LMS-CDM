import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
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
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { FlashcardCard } from '@lms/types';

export default function StudentFlashcardStudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch {
      // Graceful fallback to cached cards
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme.colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.topTitle, { color: theme.colors.text }]}>
          {sessionCompleted ? 'Session Complete' : `Card ${currentIndex + 1} of ${cards.length}`}
        </Text>

        <View style={{ width: 38 }} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.cardSecondary }]}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.primary }]} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Cards in this Deck</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Add flashcards to begin your active recall study session.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      ) : sessionCompleted ? (
        /* ==================== SUMMARY SCREEN ==================== */
        <View style={styles.summaryContainer}>
          <View style={[styles.trophyCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
            <Trophy size={56} color={theme.colors.primary} />
          </View>

          <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
            Fantastic Practice!
          </Text>
          <Text style={[styles.summarySub, { color: theme.colors.textSecondary }]}>
            You completed all cards in this active recall deck.
          </Text>

          {/* EXP Reward Pill */}
          <View style={[styles.rewardBadge, { backgroundColor: '#FEF9C3', borderColor: '#F59E0B' }]}>
            <Zap size={20} color="#D97706" />
            <Text style={styles.rewardText}>+{expAwarded} EXP Earned</Text>
          </View>

          {/* Stats Box */}
          <View style={[styles.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: theme.colors.success }]}>{correctCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Correct</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: theme.colors.danger }]}>{incorrectCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Review Needed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: theme.colors.primary }]}>
                {cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Accuracy</Text>
            </View>
          </View>

          <View style={styles.summaryActions}>
            <Button
              title="Practice Again"
              onPress={handleRestart}
              icon={RotateCcw}
              style={{ flex: 1, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }}
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
            activeOpacity={0.95}
            onPress={() => setIsFlipped((prev) => !prev)}
            style={[
              styles.flashcard,
              {
                backgroundColor: theme.colors.card,
                borderColor: isFlipped ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <View style={styles.cardSideBadge}>
              <Badge
                label={isFlipped ? 'ANSWER (BACK)' : 'PROMPT (FRONT)'}
                variant={isFlipped ? 'primary' : 'default'}
                size="sm"
              />
              <View style={styles.flipPromptRow}>
                <RotateCw size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.flipPromptText, { color: theme.colors.textSecondary }]}>Tap to flip</Text>
              </View>
            </View>

            <View style={styles.cardContentBox}>
              <Text style={[styles.cardMainText, { color: theme.colors.text }]}>
                {isFlipped ? currentCard.back : currentCard.front}
              </Text>
            </View>

            {/* Hint Section */}
            {!isFlipped && currentCard.hint ? (
              <View style={styles.hintContainer}>
                {showHint ? (
                  <View style={[styles.hintBox, { backgroundColor: theme.colors.cardSecondary }]}>
                    <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                      Hint: {currentCard.hint}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.revealHintBtn}
                    onPress={() => setShowHint(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <HelpCircle size={14} color={theme.colors.primary} />
                    <Text style={[styles.revealHintText, { color: theme.colors.primary }]}>
                      Reveal Hint
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Spaced Repetition Buttons */}
          <View style={styles.responseButtonsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Incorrect"
              style={[styles.respBtn, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
              onPress={() => handleResponse('incorrect')}
              activeOpacity={0.8}
            >
              <XCircle size={20} color="#DC2626" />
              <Text style={[styles.respBtnText, { color: '#991B1B' }]}>Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Hard"
              style={[styles.respBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
              onPress={() => handleResponse('incorrect')}
              activeOpacity={0.8}
            >
              <Text style={[styles.respBtnText, { color: '#92400E' }]}>Hard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Good"
              style={[styles.respBtn, { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }]}
              onPress={() => handleResponse('correct')}
              activeOpacity={0.8}
            >
              <Text style={[styles.respBtnText, { color: '#1E40AF' }]}>Good</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Easy"
              style={[styles.respBtn, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}
              onPress={() => handleResponse('correct')}
              activeOpacity={0.8}
            >
              <CheckCircle2 size={20} color="#059669" />
              <Text style={[styles.respBtnText, { color: '#065F46' }]}>Easy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  flashcard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  cardSideBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flipPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flipPromptText: {
    fontSize: 11,
  },
  cardContentBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardMainText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  hintContainer: {
    alignItems: 'center',
  },
  revealHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revealHintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hintBox: {
    padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  responseButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  respBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: TOUCH_TARGET,
  },
  respBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  trophyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 20,
  },
  rewardText: {
    color: '#854D0E',
    fontSize: 15,
    fontWeight: '800',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    marginBottom: 24,
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
