import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, BookOpen, Award, Info, AlertTriangle, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Screen, ErrorBanner } from '../../../../src/components/ui';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { isIteUser } from '../../../../src/lib/ite-eligibility';
import { getOnPrimaryColor } from '../../../../src/lib/design-system';
import type { AppNotification } from '@lms/types';

export default function StudentAlertsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const onPrimary = getOnPrimaryColor(theme);
  const { headerPaddingTop } = useResponsive();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotifications = async () => {
    setErrorMessage(null);
    try {
      const response = await api.notifications.list();
      if (response?.notifications) {
        setNotifications(response.notifications);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load notifications. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (id: string) => {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.notifications.delete(id);
    } catch (err: any) {
      setNotifications(previous);
      setErrorMessage(err?.message || 'Failed to delete notification');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const previous = notifications;
            setNotifications([]);
            try {
              await api.notifications.clearAll();
            } catch (err: any) {
              setNotifications(previous);
              setErrorMessage(err?.message || 'Failed to clear all notifications');
            }
          },
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'GRADE':
      case 'EVALUATION':
        return <Award size={20} color={theme.colors.success} />;
      case 'ASSIGNMENT':
      case 'COURSE':
        return <BookOpen size={20} color={theme.colors.primary} />;
      case 'WARNING':
        return <AlertTriangle size={20} color={theme.colors.warning} />;
      default:
        return <Info size={20} color={theme.colors.info} />;
    }
  };

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border, paddingTop: headerPaddingTop }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          <View style={styles.headerRightGroup}>
            {unreadCount > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
                onPress={handleMarkAllRead}
                style={styles.actionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CheckCheck size={14} color={theme.colors.primary} />
                <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>
                  Read all
                </Text>
              </TouchableOpacity>
            )}

            {notifications.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear all notifications"
                onPress={handleClearAll}
                style={styles.actionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={14} color={theme.colors.danger} />
                <Text style={[styles.actionBtnText, { color: theme.colors.danger }]}>
                  Clear all
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="All Notifications"
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === 'ALL' ? theme.colors.primary : theme.colors.cardSecondary,
                borderColor: filter === 'ALL' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setFilter('ALL')}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === 'ALL' ? onPrimary : theme.colors.textSecondary, fontWeight: filter === 'ALL' ? '700' : '500' },
              ]}
            >
              All ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Unread Notifications"
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === 'UNREAD' ? theme.colors.primary : theme.colors.cardSecondary,
                borderColor: filter === 'UNREAD' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setFilter('UNREAD')}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === 'UNREAD' ? onPrimary : theme.colors.textSecondary, fontWeight: filter === 'UNREAD' ? '700' : '500' },
              ]}
            >
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
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
          ListHeaderComponent={
            errorMessage ? (
              <View style={{ marginBottom: 12 }}>
                <ErrorBanner
                  message={errorMessage}
                  onRetry={loadNotifications}
                  onDismiss={() => setErrorMessage(null)}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Bell size={44} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {filter === 'UNREAD' ? 'No Unread Notifications' : 'No Notifications Yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                You're completely caught up with all campus alerts and course updates.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.notificationCard,
                {
                  backgroundColor: item.isRead ? theme.colors.card : theme.colors.cardSecondary,
                  borderColor: item.isRead ? theme.colors.border : theme.colors.primary,
                  borderLeftWidth: item.isRead ? 1 : 4,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cardMainTouch}
                onPress={() => {
                  if (!item.isRead) handleMarkRead(item.id);
                  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
                  const isMeetingAlert =
                    (item.type && item.type.toLowerCase().includes('meeting')) ||
                    text.includes('meeting is live') ||
                    text.includes('class meeting') ||
                    text.includes('meeting');
                  if (isMeetingAlert && isIteUser(user)) {
                    router.push('/student/meetings' as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.iconCircle}>
                  {getNotificationIcon(item.type)}
                </View>

                <View style={styles.notificationBody}>
                  <View style={styles.cardTopLine}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                    )}
                  </View>

                  <Text style={[styles.cardMessage, { color: theme.colors.textSecondary }]}>
                    {item.message}
                  </Text>

                  <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Delete notification"
                activeOpacity={0.6}
              >
                <Trash2 size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
  },
  iconCircle: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationBody: {
    flex: 1,
  },
  cardTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
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
});
