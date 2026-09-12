import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Layers,
  PlusCircle,
  Play,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react-native';
import * as Burnt from 'burnt';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { Button } from '../../../../src/components/common/Button';
import { Input } from '../../../../src/components/common/Input';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { FlashcardDeck } from '@lms/types';

export default function StudentFlashcardsListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Deck Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF7517');
  const [savingDeck, setSavingDeck] = useState(false);

  const loadDecks = async () => {
    try {
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
    } catch {
      // Graceful fallback
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

      await api.flashcards.createDeck({
        title: title.trim(),
        description: description.trim(),
        tags,
        color: selectedColor,
      });

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
      loadDecks();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create deck.');
    } finally {
      setSavingDeck(false);
    }
  };

  const colorOptions = ['#FF7517', '#D4A017', '#2563EB', '#10B981', '#8B5CF6', '#EC4899'];

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
        <View style={styles.topTextCol}>
          <Text style={[styles.topTitle, { color: theme.colors.text }]}>Study Flashcards</Text>
          <Text style={[styles.topSubtitle, { color: theme.colors.textSecondary }]}>
            Active Recall & Spaced Repetition Decks
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Create Deck"
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <PlusCircle size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Decks List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Layers size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Study Decks Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Tap the plus button above to build your first active recall flashcard deck.
              </Text>
            </Card>
          }
          renderItem={({ item }) => {
            const mastery =
              item.cardCount > 0 ? Math.round(((item.correctCount || 0) / item.cardCount) * 100) : 0;

            return (
              <TouchableOpacity
                style={[styles.deckCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push({ pathname: '/student/flashcards/[deckId]' as any, params: { deckId: item.id } })}
                activeOpacity={0.85}
              >
                <View style={[styles.deckColorBar, { backgroundColor: item.color || theme.colors.primary }]} />

                <View style={styles.deckBody}>
                  <View style={styles.deckTopRow}>
                    <Text style={[styles.deckTitle, { color: theme.colors.text }]}>
                      {item.title}
                    </Text>
                    <Badge label={`${item.cardCount || 0} Cards`} variant="default" size="sm" />
                  </View>

                  {item.description ? (
                    <Text style={[styles.deckDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagRow}>
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <View key={i} style={[styles.tagPill, { backgroundColor: theme.colors.cardSecondary }]}>
                          <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={[styles.deckFooter, { borderTopColor: theme.colors.border }]}>
                    <View style={styles.masteryInfo}>
                      <Text style={[styles.masteryLabel, { color: theme.colors.textSecondary }]}>
                        Mastery: <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{mastery}%</Text>
                      </Text>
                    </View>

                    <View style={styles.studyPrompt}>
                      <Play size={14} color={theme.colors.primary} />
                      <Text style={[styles.studyPromptText, { color: theme.colors.primary }]}>
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

      {/* Create Deck Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Flashcard Deck</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

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
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>DECK ACCENT COLOR</Text>
            <View style={styles.colorRow}>
              {colorOptions.map((col) => (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: col },
                    selectedColor === col && styles.selectedColorCircle,
                  ]}
                  onPress={() => setSelectedColor(col)}
                />
              ))}
            </View>

            <Button
              title="Create Study Deck"
              onPress={handleCreateDeck}
              loading={savingDeck}
              icon={PlusCircle}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>
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
  topTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  topSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  deckColorBar: {
    width: 8,
  },
  deckBody: {
    flex: 1,
    padding: 16,
  },
  deckTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deckTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  deckDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deckFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  masteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masteryLabel: {
    fontSize: 12,
  },
  studyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studyPromptText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 44,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
});
