import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { Message } from '../types';
import { chatService } from '../services/api';
import { getTimeAgo } from '../utils/timeAgo';
import { ChatsStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ChatsStackParamList, 'ChatDetail'>;
type Route = RouteProp<ChatsStackParamList, 'ChatDetail'>;

const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId, otherUser } = route.params;
  const { user: currentUser } = useAuth();
  const { subscribe, joinConversation, leaveConversation } = useRealtime();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async () => {
    try {
      const list = await chatService.getMessages(conversationId);
      setMessages(list);
      await chatService.markConversationRead(conversationId);
      // Auto-scroll to newest message after loading
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (e) {
      console.error('Load messages error', e);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time: join conversation room when screen is focused, leave when blurred
  useFocusEffect(
    useCallback(() => {
      joinConversation(conversationId);
      return () => leaveConversation(conversationId);
    }, [conversationId, joinConversation, leaveConversation])
  );

  // Real-time: when a new message arrives in this conversation, append it
  useEffect(() => {
    const unsub = subscribe('message:new', (payload: unknown) => {
      const msg = payload as Message & { conversationId?: string };
      if (msg?.conversationId === conversationId && msg?._id && msg?.senderId !== currentUser?._id) {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      }
    });
    return unsub;
  }, [subscribe, conversationId, currentUser?._id]);

  // Auto-scroll to end when messages change (e.g., new message received)
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, loading]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !currentUser || sending) return;
    const replyToId = replyingToMessage?._id ?? undefined;
    setSending(true);
    setInputText('');
    setReplyingToMessage(null);
    try {
      const newMsg = await chatService.sendMessage(conversationId, text, replyToId);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('Send message error', e);
      setInputText(text);
      if (replyToId) setReplyingToMessage(messages.find((m) => m._id === replyToId) ?? null);
      showToast('Failed to send. Try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  // Format date for separator (e.g., "Today", "Yesterday", "Monday, Jan 15")
  const formatDateSeparator = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  // Group messages with date separators
  const messagesWithSeparators = useMemo(() => {
    const result: Array<Message | { type: 'date'; date: string; key: string }> = [];
    let lastDate: string | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const dateKey = msgDate.toDateString();
      
      if (dateKey !== lastDate) {
        result.push({ type: 'date', date: formatDateSeparator(msgDate), key: `date-${dateKey}` });
        lastDate = dateKey;
      }
      result.push(msg);
    });

    return result;
  }, [messages]);

  const renderItem = ({ item }: { item: Message | { type: 'date'; date: string; key: string } }) => {
    if ('type' in item && item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateSeparatorLine} />
          <Text style={styles.dateSeparatorText}>{item.date}</Text>
          <View style={styles.dateSeparatorLine} />
        </View>
      );
    }

    const msg = item as Message;
    const isMe = msg.senderId === currentUser?._id;
    const hasStoryPreview = !!msg.storyMediaUri;
    const hasReplyTo = !!msg.replyTo;
    const statusLabel = isMe ? (msg.read ? 'Seen' : 'Sent') : '';
    const storyReplyLabel = isMe ? 'You replied to their story' : 'Replied to your story';
    const replyToLabel = msg.replyTo?.senderId === currentUser?._id ? 'You' : (msg.replyTo?.senderUsername ? `@${msg.replyTo.senderUsername}` : 'Message');
    const replySnippet = msg.replyTo?.text ? (msg.replyTo.text.length > 40 ? msg.replyTo.text.slice(0, 40) + '…' : msg.replyTo.text) : '';

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        <TouchableOpacity
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
          activeOpacity={1}
          onLongPress={() => setReplyingToMessage(msg)}
          delayLongPress={400}
        >
          {hasReplyTo && msg.replyTo && (
            <View style={[styles.replyToPreview, isMe ? styles.replyToPreviewMe : styles.replyToPreviewThem]}>
              <Text style={[styles.replyToLabel, isMe && styles.replyToLabelMe]} numberOfLines={1}>{replyToLabel}</Text>
              <Text style={[styles.replyToSnippet, isMe && styles.replyToSnippetMe]} numberOfLines={2}>{replySnippet || '—'}</Text>
            </View>
          )}
          {hasStoryPreview && (
            <View style={styles.storyPreviewInChat}>
              <Image source={{ uri: msg.storyMediaUri! }} style={styles.storyPreviewImage} />
              <Text style={styles.storyPreviewLabel} numberOfLines={1}>
                {storyReplyLabel}
              </Text>
            </View>
          )}
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.text}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {getTimeAgo(msg.createdAt)}
          </Text>
        </TouchableOpacity>
        {isMe && (
          <Text style={styles.messageStatus}>
            {statusLabel}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUser}
            activeOpacity={0.8}
            onPress={() => {
              const root = navigation.getParent()?.getParent();
              if (root && 'navigate' in root) {
                (root as any).navigate('FeedStack', {
                  screen: 'UserProfile',
                  params: {
                    userId: otherUser._id,
                    username: otherUser.username,
                    avatar: otherUser.avatar,
                    bio: otherUser.bio,
                  },
                });
              }
            }}
          >
            {otherUser.avatar ? (
              <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarLetter}>
                  {(otherUser.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{otherUser.username}</Text>
              <Text style={styles.headerStatus}>Active now</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('VideoCall', { otherUser })}
          >
            <Ionicons name="videocam-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('ChatInfo', { otherUser })}
          >
            <Ionicons name="information-circle-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#333" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messagesWithSeparators}
            keyExtractor={(item) => ('type' in item && item.type === 'date') ? item.key : (item as Message)._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
              </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* Reply preview bar (Messenger-style) */}
        {replyingToMessage && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <View style={styles.replyBarIndicator} />
              <View style={styles.replyBarTextWrap}>
                <Text style={styles.replyBarLabel} numberOfLines={1}>
                  Replying to {replyingToMessage.senderId === currentUser?._id ? 'yourself' : otherUser.username}
                </Text>
                <Text style={styles.replyBarSnippet} numberOfLines={1}>
                  {replyingToMessage.text.length > 50 ? replyingToMessage.text.slice(0, 50) + '…' : replyingToMessage.text}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.replyBarClose}
                onPress={() => setReplyingToMessage(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons name="send" size={22} color={inputText.trim() && !sending ? '#0095f6' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarLetter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerStatus: {
    fontSize: 12,
    color: '#0095f6',
    marginTop: 2,
  },
  headerIcon: {
    padding: 8,
  },
  keyboard: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageRowMe: {
    alignItems: 'flex-end',
  },
  messageRowThem: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: '#0095f6',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#efefef',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: '#000',
  },
  bubbleTextMe: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.8)',
  },
  replyToPreview: {
    marginBottom: 6,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0,0,0,0.2)',
  },
  replyToPreviewMe: {
    borderLeftColor: 'rgba(255,255,255,0.6)',
  },
  replyToPreviewThem: {
    borderLeftColor: 'rgba(0,0,0,0.2)',
  },
  replyToLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0095f6',
    marginBottom: 2,
  },
  replyToLabelMe: {
    color: 'rgba(255,255,255,0.95)',
  },
  replyToSnippet: {
    fontSize: 13,
    color: '#666',
  },
  replyToSnippetMe: {
    color: 'rgba(255,255,255,0.85)',
  },
  messageStatus: {
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
    color: '#666',
  },
  storyPreviewInChat: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  storyPreviewImage: {
    width: 140,
    height: 220,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  storyPreviewLabel: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
  },
  replyBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#f5f5f5',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  replyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  replyBarIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    backgroundColor: '#0095f6',
    marginRight: 10,
  },
  replyBarTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  replyBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0095f6',
    marginBottom: 2,
  },
  replyBarSnippet: {
    fontSize: 13,
    color: '#666',
  },
  replyBarClose: {
    padding: 4,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#efefef',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    color: '#000',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginHorizontal: 12,
  },
});

export default ChatDetailScreen;
