import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Layers,
  Plus,
  Play,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { Button } from '../../../../src/components/common/Button';
import { Input } from '../../../../src/components/common/Input';
import {
  Screen,
  AppHeader,
  HeaderIconButton,
  FormModal,
  ErrorBanner,
  SkeletonBlock,
} from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { radius, spacing } from '../../../../src/lib/theme';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { FlashcardDeck } from '@lms/types';

export default function StudentFlashcardsListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Deck Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(theme.colors.primary);
  const [savingDeck, setSavingDeck] = useState(false);

  const loadDecks = async () => {
    try {
      setErrorMessage(null);
      const cached = await getCachedData<FlashcardDeck[]>('student_flashcard_decks');
      if (cached && cached.length > 0) {
        setDecks(cached);
        setLoading(false);
      }

      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.flashcards.listDecks(instituteCode);
      if (response?.decks) {
        setDecks(response.decks);
        await setCachedData('student_flashcard_decks', response.decks);
      }
    } catch (err: any) {
      if (!decks.length) {
        setErrorMessage(err?.message || 'Could not load flashcard decks. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDecks();
  };

  const handleCreateDeck = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a name for this flashcard deck.');
      return;
    }

    setSavingDeck(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const { deck } = await api.flashcards.createDeck({
        title: title.trim(),
        description: description.trim(),
        tags,
        color: selectedColor,
      });
      const updatedDecks = [deck, ...decks.filter(item => item.id !== deck.id)];
      setDecks(updatedDecks);
      setErrorMessage(null);
      await setCachedData('student_flashcard_decks', updatedDecks);

      try {
        Burnt.toast({
          title: 'Deck Created!',
          message: 'Ready for study and practice.',
          preset: 'done',
        });
      } catch {
        // Fallback
      }

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setTagsInput('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create deck.');
    } finally {
      setSavingDeck(false);
    }
  };

  const colorOptions = [...new Set([theme.colors.primary, '#FF7517', '#D4A017', '#10B981', '#8B5CF6', '#EC4899'])];

  return (
    <Screen contentContainerStyle={styles.screenInner}>
      <AppHeader
        showBack
        title="Study Flashcards"
        subtitle="Active Recall & Spaced Repetition Decks"
        rightAction={
          <HeaderIconButton
            onPress={() => setShowCreateModal(true)}
            accessibilityLabel="Create flashcard deck"
            style={[styles.addBtn, { backgroundColor: theme.colors.primary, borderRadius: radius.full }]}
          >
            <Plus size={s(18)} color="#FFFFFF" />
          </HeaderIconButton>
        }
      />

      <View style={styles.mainContainer}>
        {errorMessage && (
          <View style={{ paddingHorizontal: s(spacing.lg), paddingTop: s(spacing.md) }}>
            <ErrorBanner
              message={errorMessage}
              onRetry={loadDecks}
              onDismiss={() => setErrorMessage(null)}
              retryAccessibilityLabel="Retry loading flashcard decks"
            />
          </View>
        )}

        {loading ? (
          <View style={[styles.loadingContainer, { padding: s(spacing.lg) }]}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.deckCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: radius.lg,
                    padding: s(spacing.lg),
                    marginBottom: s(spacing.md),
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: s(spacing.md) }}>
                  <SkeletonBlock width="60%" height={s(18)} />
                  <SkeletonBlock width={s(65)} height={s(20)} borderRadius={radius.sm} />
                </View>
                <SkeletonBlock width="90%" height={s(12)} style={{ marginBottom: s(spacing.xs) }} />
                <SkeletonBlock width="40%" height={s(12)} style={{ marginBottom: s(spacing.md) }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SkeletonBlock width="35%" height={s(14)} />
                  <SkeletonBlock width={s(80)} height={s(24)} borderRadius={radius.sm} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={decks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { padding: s(spacing.lg) }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={
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
                <Layers size={s(48)} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.text, fontSize: font(17), lineHeight: font(23) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  No Study Decks Yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.textSecondary, fontSize: font(13), lineHeight: font(19) },
                  ]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Tap the plus button above to build your first active recall flashcard deck.
                </Text>
              </Card>
            }
            renderItem={({ item }) => {
              const mastery =
                item.cardCount > 0 ? Math.round(((item.correctCount || 0) / item.cardCount) * 100) : 0;

              return (
                <TouchableOpacity
                  style={[
                    styles.deckCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      borderRadius: radius.lg,
                      marginBottom: s(spacing.md),
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/student/flashcards/[deckId]' as any,
                      params: { deckId: item.id, deckTitle: item.title },
                    })
                  }
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Open deck ${item.title}, ${item.cardCount || 0} cards, mastery ${mastery} percent`}
                >
                  <View
                    style={[
                      styles.deckColorBar,
                      { backgroundColor: item.color || theme.colors.primary, width: s(6) },
                    ]}
                  />

                  <View style={[styles.deckBody, { padding: s(spacing.md) }]}>
                    <View style={styles.deckTopRow}>
                      <Text
                        style={[
                          styles.deckTitle,
                          { color: theme.colors.text, fontSize: font(16) },
                        ]}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {item.title}
                      </Text>
                      <Badge label={`${item.cardCount || 0} Cards`} variant="default" size="sm" />
                    </View>

                    {Boolean(item.description) && (
                      <Text
                        style={[
                          styles.deckDesc,
                          { color: theme.colors.textSecondary, fontSize: font(13), marginTop: s(spacing.xs) },
                        ]}
                        numberOfLines={2}
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                      >
                        {item.description}
                      </Text>
                    )}

                    {Boolean(item.tags && item.tags.length > 0) && (
                      <View style={[styles.tagRow, { marginTop: s(spacing.sm), gap: s(spacing.xs) }]}>
                        {item.tags!.slice(0, 3).map((tag, i) => (
                          <View
                            key={i}
                            style={[
                              styles.tagPill,
                              {
                                backgroundColor: theme.colors.surfaceAlt,
                                borderRadius: radius.xs,
                                paddingHorizontal: s(spacing.sm),
                                paddingVertical: 2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                { color: theme.colors.textSecondary, fontSize: font(11) },
                              ]}
                              maxFontSizeMultiplier={maxFontSizeMultiplier}
                            >
                              #{tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View
                      style={[
                        styles.deckFooter,
                        {
                          borderTopColor: theme.colors.border,
                          marginTop: s(spacing.md),
                          paddingTop: s(spacing.sm),
                        },
                      ]}
                    >
                      <View style={styles.masteryInfo}>
                        <Text
                          style={[
                            styles.masteryLabel,
                            { color: theme.colors.textSecondary, fontSize: font(12.5) },
                          ]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          Mastery:{' '}
                          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                            {mastery}%
                          </Text>
                        </Text>
                      </View>

                      <View style={[styles.studyPrompt, { gap: s(spacing.xs) }]}>
                        <Play size={s(14)} color={theme.colors.primary} />
                        <Text
                          style={[
                            styles.studyPromptText,
                            { color: theme.colors.primary, fontSize: font(12.5) },
                          ]}
                          maxFontSizeMultiplier={maxFontSizeMultiplier}
                        >
                          Practice Now
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Create Deck Modal using shared FormModal */}
      <FormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Flashcard Deck"
        subtitle="Build an active recall study deck with spaced repetition"
        closeAccessibilityLabel="Cancel and close create deck modal"
        actions={
          <Button
            title="Create Study Deck"
            onPress={handleCreateDeck}
            loading={savingDeck}
            icon={Plus}
          />
        }
      >
        <Input
          label="Deck Title"
          placeholder="e.g. Data Structures Terminology"
          value={title}
          onChangeText={setTitle}
          ringColor={theme.colors.primary}
        />

        <Input
          label="Description (Optional)"
          placeholder="Summary of topics covered in this deck..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          ringColor={theme.colors.primary}
        />

        <Input
          label="Tags (Comma separated)"
          placeholder="algorithms, cs201, exams"
          value={tagsInput}
          onChangeText={setTagsInput}
          ringColor={theme.colors.primary}
        />

        {/* Color Accent Picker */}
        <Text
          style={[
            styles.fieldLabel,
            {
              color: theme.colors.textSecondary,
              fontSize: font(12),
              marginTop: s(spacing.sm),
              marginBottom: s(spacing.xs),
            },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          DECK ACCENT COLOR
        </Text>
        <View style={[styles.colorRow, { gap: s(spacing.md), marginBottom: s(spacing.lg) }]}>
          {colorOptions.map((col) => (
            <TouchableOpacity
              key={col}
              accessibilityRole="button"
              accessibilityLabel={`Select accent color ${col}`}
              accessibilityState={{ selected: selectedColor === col }}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: col,
                  width: s(36),
                  height: s(36),
                  borderRadius: radius.full,
                  borderColor: theme.colors.border,
                },
                selectedColor === col && [
                  styles.selectedColorCircle,
                  { borderColor: theme.colors.text, borderWidth: 3 },
                ],
              ]}
              onPress={() => setSelectedColor(col)}
            />
          ))}
        </View>
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  deckCard: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  deckColorBar: {},
  deckBody: {
    flex: 1,
  },
  deckTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  deckTitle: {
    fontWeight: '700',
    flex: 1,
  },
  deckDesc: {
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagPill: {},
  tagText: {
    fontWeight: '500',
  },
  deckFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  masteryInfo: {},
  masteryLabel: {},
  studyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyPromptText: {
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  fieldLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    borderWidth: 1,
  },
  selectedColorCircle: {},
});
