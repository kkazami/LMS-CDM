import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { SectionTitle } from '../ui';
import { TOUCH_TARGET } from '../../lib/typography';
import type { KxPostItem } from '@lms/api-client';

interface IcsKnowledgeExchangeCardProps {
  onRefreshTrigger?: number;
}

export function IcsKnowledgeExchangeCard({ onRefreshTrigger }: IcsKnowledgeExchangeCardProps) {
  const router = useRouter();
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [posts, setPosts] = useState<KxPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.knowledgeExchange.listPosts({ limit: 3, sort: 'newest' });
      if (res && Array.isArray(res.posts)) {
        setPosts(res.posts);
      } else {
        setPosts([]);
      }
    } catch {
      setError('Knowledge Exchange discussions are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, onRefreshTrigger]);

  const user = useAuthStore((s) => s.user);
  const role = (user?.role || '').toUpperCase();
  const isTeacher = role === 'PROFESSOR' || role === 'TEACHER' || role === 'ADMIN';
  const kxRoute = isTeacher ? '/teacher/knowledge-exchange' : '/student/knowledge-exchange';

  return (
    <View style={styles.container}>
      <SectionTitle
        title="Knowledge Exchange"
        actionText="Browse All"
        onActionPress={() => router.push(kxRoute as any)}
        actionAccessibilityLabel="Browse all Knowledge Exchange questions"
      />

      {loading ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading campus discussions...
            </Text>
          </View>
        </Card>
      ) : error ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.errorRow}>
            <AlertCircle size={18} color={theme.colors.warning} />
            <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
              {error}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retry loading Knowledge Exchange"
            style={[styles.retryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}
            onPress={fetchPosts}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color={theme.colors.primary} />
            <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </Card>
      ) : posts.length === 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open Knowledge Exchange"
          onPress={() => router.push('/student/knowledge-exchange' as any)}
          activeOpacity={0.8}
        >
          <Card style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.emptyContent}>
              <MessageSquare size={28} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Join the ICS Academic Forum
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Ask technical questions, share code snippets, and learn together.
              </Text>
            </View>
          </Card>
        </TouchableOpacity>
      ) : (
        <View style={styles.postList}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              accessibilityRole="button"
              accessibilityLabel={`View post: ${post.title}`}
              style={[styles.postCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push(kxRoute as any)}
              activeOpacity={0.8}
            >
              <View style={styles.postHeader}>
                <View style={styles.authorRow}>
                  <Text style={[styles.authorName, { color: theme.colors.textSecondary }]}>
                    {post.author?.name || 'ICS Peer'}
                  </Text>
                  {post.tags && post.tags[0] && (
                    <Badge label={post.tags[0].name} variant="primary" size="sm" />
                  )}
                </View>
                {post.status === 'ANSWERED' && (
                  <Badge label="SOLVED" variant="success" size="sm" />
                )}
              </View>

              <Text style={[styles.postTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {post.title}
              </Text>

              <View style={styles.postFooter}>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <ThumbsUp size={13} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      {post.voteCount || 0}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MessageCircle size={13} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      {post.answerCount || 0} answers
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  postList: {
    gap: 10,
  },
  postCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
