import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  X,
  Eye,
  HelpCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Screen, AppHeader, ErrorState } from '../ui';
import { Badge } from '../common/Badge';
import { isIcsUser } from '../../lib/ite-eligibility';
import { TOUCH_TARGET } from '../../lib/typography';
import type { KxPostItem } from '@lms/api-client';

type TabKey = 'all' | 'unanswered' | 'answered' | 'discussions';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All Posts' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'answered', label: 'Solved' },
  { key: 'discussions', label: 'Discussions' },
];

export function KnowledgeExchangeBrowseView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<KxPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedPost, setSelectedPost] = useState<KxPostItem | null>(null);

  const fetchPosts = useCallback(
    async (isRefresh = false) => {
      if (!isIcsUser(user)) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const res = await api.knowledgeExchange.listPosts({
          tab: activeTab,
          search: searchQuery.trim() || undefined,
          page: 1,
          limit: 25,
        });

        if (res && Array.isArray(res.posts)) {
          setPosts(res.posts);
        } else {
          setPosts([]);
        }
      } catch {
        setError('Knowledge Exchange posts are temporarily unavailable. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, activeTab, searchQuery, user]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
  };

  if (!isIcsUser(user)) {
    return (
      <Screen scrollable={false} withTopInset={false}>
        <AppHeader
          title="Knowledge Exchange"
          showBack={true}
          onBack={() => router.back()}
        />
        <View style={styles.restrictedContainer}>
          <View style={[styles.restrictedIconBox, { backgroundColor: `${theme.colors.warning}15` }]}>
            <HelpCircle size={40} color={theme.colors.warning} />
          </View>
          <Text style={[styles.restrictedTitle, { color: theme.colors.text }]}>
            ICS Exclusive Forum
          </Text>
          <Text style={[styles.restrictedDesc, { color: theme.colors.textSecondary }]}>
            Knowledge Exchange is currently available for students and faculty in the Institute of Computer Studies.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back to dashboard"
            style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const renderPostItem = ({ item }: { item: KxPostItem }) => {
    const isSolved = item.status === 'ANSWERED';

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View post: ${item.title}`}
        style={[
          styles.postCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => setSelectedPost(item)}
        activeOpacity={0.75}
      >
        <View style={styles.postCardHeader}>
          <View style={styles.authorBadgeRow}>
            <View style={[styles.avatarCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                {item.author?.name ? item.author.name[0].toUpperCase() : 'P'}
              </Text>
            </View>
            <View>
              <Text style={[styles.authorNameText, { color: theme.colors.text }]}>
                {item.author?.name || 'ICS Member'}
              </Text>
              <Text style={[styles.postDateText, { color: theme.colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {isSolved && (
            <Badge label="SOLVED" variant="success" size="sm" />
          )}
        </View>

        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={[styles.itemBodySnippet, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((t) => (
              <Badge key={t.id} label={t.name} variant="default" size="sm" />
            ))}
          </View>
        )}

        {/* Card Footer metrics */}
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
          <View style={styles.metaStat}>
            <ThumbsUp size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.metaStatText, { color: theme.colors.textSecondary }]}>
              {item.voteCount || 0} votes
            </Text>
          </View>

          <View style={styles.metaStat}>
            <MessageCircle size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.metaStatText, { color: theme.colors.textSecondary }]}>
              {item.answerCount || 0} answers
            </Text>
          </View>

          <View style={styles.metaStat}>
            <Eye size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.metaStatText, { color: theme.colors.textSecondary }]}>
              {item.viewCount || 0} views
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scrollable={false} withTopInset={false}>
      <AppHeader
        title="Knowledge Exchange"
        subtitle="ICS Community Q&A & Solutions"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search questions or topics..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => fetchPosts()}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${tab.label}`}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isSelected ? '#FFFFFF' : theme.colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Post List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.centerLoadingText, { color: theme.colors.textSecondary }]}>
            Loading discussions...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <ErrorState
            title="Discussions Unavailable"
            message={error}
            onRetry={() => fetchPosts()}
          />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <MessageSquare size={48} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyHeader, { color: theme.colors.text }]}>
            No Questions Found
          </Text>
          <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
            {searchQuery
              ? `No discussions matching "${searchQuery}".`
              : 'There are no questions in this category yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <Modal
          visible={!!selectedPost}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.modalHeaderTitleRow}>
                <MessageSquare size={20} color={theme.colors.primary} />
                <Text style={[styles.modalHeaderTitle, { color: theme.colors.text }]}>
                  Question Details
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close details modal"
                onPress={() => setSelectedPost(null)}
                style={styles.modalCloseBtn}
              >
                <X size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.modalMetaRow}>
                <View style={[styles.avatarCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
                  <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                    {selectedPost.author?.name ? selectedPost.author.name[0].toUpperCase() : 'P'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalAuthorName, { color: theme.colors.text }]}>
                    {selectedPost.author?.name || 'ICS Member'}
                  </Text>
                  <Text style={[styles.modalDate, { color: theme.colors.textSecondary }]}>
                    Posted {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {selectedPost.status === 'ANSWERED' && (
                  <Badge label="SOLVED" variant="success" size="sm" />
                )}
              </View>

              <Text style={[styles.modalPostTitle, { color: theme.colors.text }]}>
                {selectedPost.title}
              </Text>

              <Text style={[styles.modalPostBody, { color: theme.colors.text }]}>
                {selectedPost.body}
              </Text>

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <View style={styles.modalTagSection}>
                  <Text style={[styles.modalSectionLabel, { color: theme.colors.textSecondary }]}>
                    TAGS & TOPICS
                  </Text>
                  <View style={styles.tagRow}>
                    {selectedPost.tags.map((t) => (
                      <Badge key={t.id} label={t.name} variant="primary" size="sm" />
                    ))}
                  </View>
                </View>
              )}

              {/* Stats Box */}
              <View style={[styles.modalStatsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.modalStatItem}>
                  <ThumbsUp size={16} color={theme.colors.primary} />
                  <Text style={[styles.modalStatVal, { color: theme.colors.text }]}>{selectedPost.voteCount || 0}</Text>
                  <Text style={[styles.modalStatSub, { color: theme.colors.textSecondary }]}>Votes</Text>
                </View>
                <View style={[styles.modalStatDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.modalStatItem}>
                  <MessageCircle size={16} color={theme.colors.info} />
                  <Text style={[styles.modalStatVal, { color: theme.colors.text }]}>{selectedPost.answerCount || 0}</Text>
                  <Text style={[styles.modalStatSub, { color: theme.colors.textSecondary }]}>Answers</Text>
                </View>
                <View style={[styles.modalStatDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.modalStatItem}>
                  <Eye size={16} color={theme.colors.success} />
                  <Text style={[styles.modalStatVal, { color: theme.colors.text }]}>{selectedPost.viewCount || 0}</Text>
                  <Text style={[styles.modalStatSub, { color: theme.colors.textSecondary }]}>Views</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  tabsRow: {
    marginBottom: 10,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabChipText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  postCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  authorNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  postDateText: {
    fontSize: 11,
    marginTop: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  itemBodySnippet: {
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 16,
  },
  metaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerLoadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  restrictedIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  restrictedDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 18,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalAuthorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalDate: {
    fontSize: 12,
    marginTop: 2,
  },
  modalPostTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 12,
  },
  modalPostBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  modalTagSection: {
    marginBottom: 18,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalStatsCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  modalStatSub: {
    fontSize: 11,
    marginTop: 1,
  },
  modalStatDivider: {
    width: 1,
    height: 30,
  },
});
