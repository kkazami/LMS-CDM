import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import { Flame, Layers, Check, X } from 'lucide-react-native';
import type { FlashcardDeck } from '@lms/types';

export default function FlashcardsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const { data: decksData, isLoading: isDecksLoading, refetch: refetchDecks } = useQuery({
    queryKey: ['flashcard-decks', instituteCode],
    queryFn: () => api.flashcards.listDecks(instituteCode),
  });

  const { data: cardsData, isLoading: isCardsLoading } = useQuery({
    queryKey: ['flashcard-cards', activeDeck?.id],
    queryFn: () => api.flashcards.getCards(activeDeck!.id),
    enabled: !!activeDeck,
  });

  const decks = decksData?.decks || [];
  const cards = cardsData?.cards || [];

  const handleStartStudy = (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setCorrectCount(0);
  };

  const handleAnswer = (correct: boolean) => {
    if (correct) setCorrectCount((prev) => prev + 1);
    setIsFlipped(false);
    if (currentCardIdx + 1 < cards.length) {
      setCurrentCardIdx((prev) => prev + 1);
    } else {
      if (activeDeck) {
        api.flashcards.completeSession(activeDeck.id, {
          totalCards: cards.length,
          correct: correctCount + (correct ? 1 : 0),
          incorrect: cards.length - (correctCount + (correct ? 1 : 0)),
          unseen: 0,
        }).catch(() => {});
      }
      setCurrentCardIdx(cards.length);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader
        title={activeDeck ? activeDeck.title : 'Flashcards Study'}
        subtitle={activeDeck ? 'Active Recall Mode' : 'Spaced Repetition Decks'}
      />

      {activeDeck ? (
        <View style={styles.studyContainer}>
          {isCardsLoading ? (
            <SkeletonLoader height={250} borderRadius={20} />
          ) : currentCardIdx >= cards.length ? (
            <View style={[styles.finishCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Flame size={44} color={theme.colors.primary} />
              <Text style={[styles.finishTitle, typography.headingLg, { color: theme.colors.text }]}>
                Study Session Complete!
              </Text>
              <Text style={[styles.finishSub, { color: theme.colors.textSecondary }]}>
                {'Score: ' + correctCount + ' / ' + cards.length + ' Correct'}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary, minHeight: TOUCH_TARGET }]}
                onPress={() => setActiveDeck(null)}
              >
                <Text style={styles.actionBtnText}>Back to Decks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeCardBox}>
              <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                {'Card ' + (currentCardIdx + 1) + ' of ' + cards.length}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Tap to flip card"
                style={[
                  styles.flipCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setIsFlipped(!isFlipped)}
                activeOpacity={0.9}
              >
                <Text style={[styles.cardSideLabel, { color: theme.colors.primary }]}>
                  {isFlipped ? 'ANSWER (BACK)' : 'QUESTION (FRONT)'}
                </Text>
                <Text style={[styles.cardContent, typography.headingSm, { color: theme.colors.text }]}>
                  {isFlipped ? cards[currentCardIdx].back : cards[currentCardIdx].front}
                </Text>
                <Text style={[styles.tapFlipHint, { color: theme.colors.textSecondary }]}>
                  Tap anywhere on card to flip
                </Text>
              </TouchableOpacity>

              <View style={styles.answerButtonsRow}>
                <TouchableOpacity
                  style={[styles.answerBtn, { backgroundColor: '#FEE2E2', minHeight: TOUCH_TARGET }]}
                  onPress={() => handleAnswer(false)}
                >
                  <X size={18} color="#DC2626" />
                  <Text style={[styles.answerBtnText, { color: "#DC2626" }]}>Don't Know</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.answerBtn, { backgroundColor: '#DCFCE7', minHeight: TOUCH_TARGET }]}
                  onPress={() => handleAnswer(true)}
                >
                  <Check size={18} color="#16A34A" />
                  <Text style={[styles.answerBtnText, { color: "#16A34A" }]}>Know</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : isDecksLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={100} borderRadius={16} />
          <SkeletonLoader height={100} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetchDecks}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Layers}
              title="No Study Decks"
              message="Decks created for your courses will appear here."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={'Deck: ' + item.title}
              style={[
                styles.deckCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
              onPress={() => handleStartStudy(item)}
              activeOpacity={0.85}
            >
              <View style={[styles.deckIconBox, { backgroundColor: theme.colors.primary + '18' }]}>
                <Layers size={20} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.deckTitle, typography.headingSm, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.deckSub, { color: theme.colors.textSecondary }]}>
                  {(item.cardCount || 0) + ' cards • ' + (item.courseTitle || 'General')}
                </Text>
              </View>

              <View style={[styles.studyPill, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.studyPillText}>Study</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBox: {
    padding: 16,
    gap: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  deckIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckTitle: {
    fontWeight: '600',
  },
  deckSub: {
    fontSize: 12,
    marginTop: 2,
  },
  studyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  studyPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  studyContainer: {
    flex: 1,
    padding: 16,
  },
  activeCardBox: {
    flex: 1,
    gap: 16,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  flipCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardSideLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  cardContent: {
    textAlign: 'center',
    lineHeight: 28,
  },
  tapFlipHint: {
    fontSize: 11,
    marginTop: 24,
  },
  answerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  answerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  answerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  finishCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  finishTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  finishSub: {
    fontSize: 14,
  },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
