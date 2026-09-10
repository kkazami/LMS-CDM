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
} from 'react-native';
import { Bell, CheckCheck, BookOpen, Award, Info, AlertTriangle } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { AppNotification } from '@lms/types';

export default function StudentAlertsScreen() {
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const loadNotifications = async () => {
    try {
      const response = await api.notifications.list();
      if (response?.notifications) {
        setNotifications(response.notifications);
      }
    } catch {
      // Handled gracefully
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
    } catch {
      // Ignore failure
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore
    }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          <View style={styles.headerRightGroup}>
            {unreadCount > 0 && (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Mark all as read"
                  onPress={handleMarkAllRead}
                  style={styles.markAllBtn}
                >
                  <CheckCheck size={16} color={theme.colors.primary} />
                  <Text style={[styles.markAllText, { color: theme.colors.primary }]}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
                <Badge label={`${unreadCount} New`} variant="primary" size="sm" />
              </>
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
                { color: filter === 'ALL' ? '#FFFFFF' : theme.colors.textSecondary },
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
                { color: filter === 'UNREAD' ? '#FFFFFF' : theme.colors.textSecondary },
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
            <TouchableOpacity
              style={[
                styles.notificationCard,
                {
                  backgroundColor: item.isRead ? theme.colors.card : theme.colors.cardSecondary,
                  borderColor: item.isRead ? theme.colors.border : theme.colors.primary,
                  borderLeftWidth: item.isRead ? 1 : 4,
                },
              ]}
              onPress={() => {
                if (!item.isRead) handleMarkRead(item.id);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>
                {getNotificationIcon(item.type)}
              </View>

              <View style={styles.notificationBody}>
                <View style={styles.cardTopLine}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
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
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
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
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
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
