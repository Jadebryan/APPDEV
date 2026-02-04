import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, NotificationItem, NotificationType } from '../context/NotificationsContext';

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
  const navigation = useNavigation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshTimeAgo } = useNotifications();

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
        return <Ionicons name="heart" size={14} color="#FF69B4" />;
      case 'comment':
        return <Ionicons name="chatbubble" size={14} color="#666" />;
      case 'follow':
        return <Ionicons name="person-add" size={14} color="#0095F6" />;
      default:
        return null;
    }
  };

  const handlePressItem = (item: NotificationItem) => {
    if (!item.read) markAsRead(item.id);
    // TODO: navigate to post or profile when wired
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
      {item.postImage && (
        <Image source={{ uri: item.postImage }} style={styles.thumb} />
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
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllWrap}>
            <Text style={styles.markAll}>Mark all as read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>
      {sections.length === 0 ? (
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
  },
  backButton: {
    padding: 8,
    marginLeft: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  markAllWrap: {
    padding: 8,
    marginRight: 4,
  },
  markAll: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
  },
  headerRight: {
    width: 100,
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
