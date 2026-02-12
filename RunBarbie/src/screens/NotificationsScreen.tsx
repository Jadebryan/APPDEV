import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SectionList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, NotificationItem, NotificationType } from '../context/NotificationsContext';
import { useStories } from '../context/StoriesContext';
import { FeedStackParamList, MainTabParamList } from '../navigation/types';
import { chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type NotificationsNav = NativeStackNavigationProp<FeedStackParamList, 'Notifications'>;

type Section = { title: string; data: NotificationItem[] };

const getSectionTitle = (timestamp: number): string => {
  const now = Date.now();
  const dayMs = 86400 * 1000;
  const diff = now - timestamp;
  if (diff < dayMs) return 'Today';
  if (diff < 7 * dayMs) return 'This week';
  return 'Earlier';
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsNav>();
  const { notifications, unreadCount, loading, refreshNotifications, markAsRead, markAllAsRead, refreshTimeAgo } = useNotifications();
  const { user } = useAuth();
  const { palette } = useTheme();
  const { setPendingStoryOpen } = useStories();
  const [markAllPressed, setMarkAllPressed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    refreshTimeAgo();
    const interval = setInterval(refreshTimeAgo, 60000); // refresh "time ago" every minute
    return () => clearInterval(interval);
  }, [refreshTimeAgo]);

  const sections: Section[] = (() => {
    const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

    // Take a few most recent notifications as "Highlights"
    const HIGHLIGHT_COUNT = 2;
    const highlights = sorted.slice(0, HIGHLIGHT_COUNT);
    const highlightIds = new Set(highlights.map((n) => n.id));

    const bySection: Record<string, NotificationItem[]> = {};
    sorted.forEach((n) => {
      // Skip items already included in Highlights section
      if (highlightIds.has(n.id)) return;
      const title = getSectionTitle(n.timestamp);
      if (!bySection[title]) bySection[title] = [];
      bySection[title].push(n);
    });
    const order = ['Today', 'This week', 'Earlier'];
    const baseSections = order
      .filter((t) => bySection[t]?.length)
      .map((title) => ({ title, data: bySection[title] }));

    const result: Section[] = [];
    if (highlights.length) {
      result.push({ title: 'Highlights', data: highlights });
    }
    return result.concat(baseSections);
  })();

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
      case 'reel_like':
        return <Ionicons name="heart" size={14} color={palette.primary} />;
      case 'comment':
      case 'mention':
        return <Ionicons name="chatbubble" size={14} color="#666" />;
      case 'follow':
        return <Ionicons name="person-add" size={14} color={palette.secondary} />;
      case 'tag':
        return <Ionicons name="pricetag" size={14} color={palette.secondary} />;
      case 'story_like':
        return <Ionicons name="heart" size={14} color={palette.primary} />;
      case 'story_reply':
        return <Ionicons name="chatbubble" size={14} color="#666" />;
      case 'profile_view':
        return <Ionicons name="person" size={14} color={palette.secondary} />;
      case 'story_view':
        return <Ionicons name="eye" size={14} color="#666" />;
      default:
        return <Ionicons name="notifications" size={14} color="#666" />;
    }
  };

  const handlePressItem = (item: NotificationItem) => {
    if (!item.read) markAsRead(item.id);

    if (
      item.postId &&
      (item.type === 'like' ||
        item.type === 'comment' ||
        item.type === 'mention' ||
        item.type === 'tag')
    ) {
      navigation.navigate('Comments', {
        postId: item.postId,
        username: item.username,
        caption: item.text || '',
        image:
          item.postImage ||
          'https://images.unsplash.com/photo-1544966503-7cc75df67383?w=400',
      });
      return;
    }

    if (item.reelId && item.type === 'reel_like') {
      (navigation.getParent() as any)?.navigate?.('Reels', {
        screen: 'ReelsHome',
        params: { initialReelId: item.reelId },
      });
      return;
    }

    if (item.type === 'follow' && item.userId) {
      navigation.navigate('UserProfile', {
        userId: item.userId,
        username: item.username,
        avatar: item.avatar,
      });
      return;
    }

    if (item.type === 'follow') {
      navigation.navigate('FeedHome');
      return;
    }

    // Story reply → jump into chat with the replier
    if (item.type === 'story_reply' && item.userId) {
      (async () => {
        try {
          const conversation = await chatService.getOrCreateConversation(item.userId!);
          const mainTabs = navigation.getParent()?.getParent() as any;
          if (mainTabs && typeof mainTabs.navigate === 'function') {
            mainTabs.navigate('ChatsStack' as keyof MainTabParamList, {
              screen: 'ChatDetail',
              params: {
                conversationId: conversation._id,
                otherUser: conversation.participant,
              },
            });
          }
        } catch (e) {
          console.error('Failed to open chat from story reply notification', e);
          const mainTabs = navigation.getParent()?.getParent() as any;
          if (mainTabs && typeof mainTabs.navigate === 'function') {
            mainTabs.navigate('ChatsStack' as keyof MainTabParamList);
          }
        }
      })();
      return;
    }

    // Story like / view → open the story overlay (your story)
    // Set pending in context first (survives navigation), then reset to FeedHome
    if ((item.type === 'story_like' || item.type === 'story_view') && item.storyId && user?._id) {
      setPendingStoryOpen({ userId: user._id, storyId: item.storyId });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'FeedHome' }],
        })
      );
      return;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      activeOpacity={0.7}
      onPress={() => handlePressItem(item)}
    >
      <View style={styles.avatarWrap}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        <View style={styles.iconBadge}>{renderIcon(item.type)}</View>
      </View>
      <View style={styles.content}>
        <Text style={styles.body} numberOfLines={2}>
          <Text style={styles.username}>{item.username}</Text> {item.text}
        </Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      {(item.postImage || ((item.type === 'story_like' || item.type === 'story_view' || item.type === 'story_reply') && item.storyImage)) && (
        <Image source={{ uri: item.postImage || item.storyImage }} style={styles.thumb} resizeMode="cover" />
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title} pointerEvents="none">Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => { setMarkAllPressed(true); markAllAsRead(); }}
            onPressIn={() => setMarkAllPressed(true)}
            onPressOut={() => setMarkAllPressed(false)}
            style={styles.markAllWrap}
            activeOpacity={0.7}
          >
            <Text style={[styles.markAll, { color: palette.primary }, markAllPressed && styles.markAllPressed]}>Mark all as read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>
      {loading && !refreshing ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color="#DBDBDB" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
    position: 'relative',
  },
  backButton: {
    padding: 8,
    marginLeft: 4,
    zIndex: 1,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  markAllWrap: {
    padding: 4,
    marginRight: 4,
    zIndex: 1,
  },
  markAll: {
    fontSize: 12,
    fontWeight: '600',
  },
  markAllPressed: {
    color: '#999',
  },
  headerRight: {
    width: 80,
    zIndex: 1,
  },
  list: {
    paddingVertical: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowUnread: {
    backgroundColor: '#FFF0F5',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  content: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
    color: '#000',
  },
  body: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default NotificationsScreen;
