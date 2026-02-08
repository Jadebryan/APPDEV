import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';
import { Conversation, User } from '../types';
import { chatService, searchService } from '../services/api';
import { getTimeAgo } from '../utils/timeAgo';
import { ChatsStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ChatsStackParamList, 'ChatsList'>;

const ChatsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuggestedUsers = useCallback(async () => {
    try {
      const users = await searchService.getSuggestedUsers();
      setSuggestedUsers(users);
    } catch (e) {
      console.error('Load suggested users error', e);
    }
  }, []);

  const loadActiveUsers = useCallback(async () => {
    try {
      const users = await chatService.getActiveUsers();
      setActiveUsers(users);
    } catch (e) {
      console.error('Load active users error', e);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const list = await chatService.getConversations();
      setConversations(list);
    } catch (e) {
      console.error('Load conversations error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadActiveUsers();
    loadSuggestedUsers();
  }, [loadConversations, loadActiveUsers, loadSuggestedUsers]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
    loadActiveUsers();
    loadSuggestedUsers();
  };

  const filtered = searchQuery.trim()
    ? conversations.filter(
        c =>
          c.participant.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          (c.participant.bio && c.participant.bio.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      )
    : conversations;

  const openChat = (conv: Conversation) => {
    navigation.navigate('ChatDetail', { conversationId: conv._id, otherUser: conv.participant });
  };

  const openChatWithUser = async (user: User) => {
    try {
      const conv = await chatService.getOrCreateConversation(user._id);
      navigation.navigate('ChatDetail', { conversationId: conv._id, otherUser: conv.participant });
    } catch (e) {
      console.error('Open chat error', e);
      showToast('Could not start conversation. Try again.', 'error');
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isFromThem = item.lastMessage.senderId === item.participant._id;
    const hasText = (item.lastMessage.text || '').trim().length > 0;
    const preview = hasText
      ? (isFromThem ? item.lastMessage.text : `You: ${item.lastMessage.text}`)
      : 'No messages yet. Say hi! 👋';
    return (
      <TouchableOpacity
        style={styles.convRow}
        activeOpacity={0.7}
        onPress={() => openChat(item)}
      >
        <View style={styles.avatarWrap}>
          {item.participant.avatar ? (
            <Image source={{ uri: item.participant.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {(item.participant.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.convBody}>
          <View style={styles.convTop}>
            <Text style={[styles.username, item.unreadCount > 0 && styles.usernameUnread]} numberOfLines={1}>
              {item.participant.username}
            </Text>
            <Text style={styles.time}>{getTimeAgo(item.lastMessage.createdAt)}</Text>
          </View>
          <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active now */}
      {activeUsers.length > 0 && (
        <View style={styles.activeSection}>
          <Text style={styles.sectionLabel}>Active now</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeScroll}
          >
            {activeUsers.map((u) => (
              <TouchableOpacity
                key={u._id}
                style={styles.activeItem}
                onPress={() => openChatWithUser(u)}
                activeOpacity={0.7}
              >
                <View style={styles.activeAvatarWrap}>
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} style={styles.activeAvatar} />
                  ) : (
                    <View style={[styles.activeAvatar, styles.activeAvatarPlaceholder]}>
                      <Text style={styles.activeAvatarLetter}>
                        {(u.username || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.activeDot} />
                </View>
                <Text style={styles.activeName} numberOfLines={1}>{u.username}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#333" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderConversation}
          contentContainerStyle={filtered.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            filtered.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubbles-outline" size={56} color="#ccc" />
                  <Text style={styles.emptyTitle}>Find your running crew</Text>
                  <Text style={styles.emptySub}>
                    Plan runs, share routes, and stay motivated together.
                  </Text>
                </View>
                {suggestedUsers.filter(u => !conversations.some(c => c.participant._id === u._id)).length > 0 && (
                  <View style={styles.suggestedSection}>
                    <Text style={styles.suggestedSectionTitle}>Start a conversation</Text>
                    {suggestedUsers
                      .filter(u => !conversations.some(c => c.participant._id === u._id))
                      .map((u) => (
                        <TouchableOpacity
                          key={u._id}
                          style={styles.suggestedRow}
                          onPress={() => openChatWithUser(u)}
                          activeOpacity={0.7}
                        >
                          {u.avatar ? (
                            <Image source={{ uri: u.avatar }} style={styles.suggestedAvatar} />
                          ) : (
                            <View style={[styles.suggestedAvatar, styles.suggestedAvatarPlaceholder]}>
                              <Text style={styles.suggestedAvatarLetter}>
                                {(u.username || '?').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.suggestedInfo}>
                            <Text style={styles.suggestedName} numberOfLines={1}>{u.username}</Text>
                            {u.bio ? (
                              <Text style={styles.suggestedBio} numberOfLines={1}>{u.bio}</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={styles.messageBtn}
                            onPress={() => openChatWithUser(u)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.messageBtnText}>Message</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333" />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  activeSection: {
    paddingVertical: 12,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  activeScroll: {
    paddingHorizontal: 16,
  },
  activeItem: {
    alignItems: 'center',
    width: 72,
    marginRight: 16,
  },
  activeAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 6,
    position: 'relative',
  },
  activeAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
  },
  activeAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeAvatarLetter: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  activeName: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '600',
    color: '#666',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0095f6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  convBody: {
    flex: 1,
    minWidth: 0,
  },
  convTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  usernameUnread: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  preview: {
    fontSize: 14,
    color: '#666',
  },
  previewUnread: {
    color: '#000',
    fontWeight: '500',
  },
  emptyStateWrap: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  emptyWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  suggestedSection: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  suggestedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  suggestedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
  },
  suggestedAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedAvatarLetter: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  suggestedInfo: {
    flex: 1,
    minWidth: 0,
  },
  suggestedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  suggestedBio: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  messageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0095f6',
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ChatsScreen;
