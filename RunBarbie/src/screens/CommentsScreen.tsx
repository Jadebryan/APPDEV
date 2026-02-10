import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FeedStackParamList } from '../navigation/types';
import { postService, PostComment } from '../services/api';
import { getTimeAgo } from '../utils/timeAgo';

type CommentsRoute = RouteProp<FeedStackParamList, 'Comments'>;

const CommentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CommentsRoute>();
  const { postId, username, caption, image, returnToSearch } = route.params;
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const list = await postService.getComments(postId);
      setComments(list);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    try {
      setPosting(true);
      const newComment = await postService.addComment(postId, trimmed, replyingToCommentId || undefined);
      setComments((prev) => [...prev, newComment]);
      setText('');
      setReplyingToCommentId(null);
      setReplyingToUsername(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleReplyToComment = useCallback((item: PostComment) => {
    setReplyingToCommentId(item._id);
    setReplyingToUsername(item.username);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
  }, []);

  const handleToggleViewReplies = useCallback((parentId: string) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  const handleToggleLike = useCallback(async (item: PostComment) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== item._id) return c;
        const liked = !!c.likedByMe;
        const nextLiked = !liked;
        const nextCount = (c.likeCount ?? 0) + (nextLiked ? 1 : -1);
        return { ...c, likedByMe: nextLiked, likeCount: Math.max(0, nextCount) };
      })
    );
    try {
      const updated = await postService.likeComment(postId, item._id);
      setComments((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
    } catch (e) {
      // Revert by refetching this one comment from server response isn’t available; simple fallback: reload all
      loadComments();
    }
  }, [loadComments, postId]);

  type CommentListItem =
    | { type: 'comment'; item: PostComment; isReply: boolean; parentUsername?: string }
    | { type: 'viewReplies'; parentId: string; parentUsername: string; count: number };

  const commentsForList = useMemo<CommentListItem[]>(() => {
    const byId = new Map(comments.map((c) => [c._id, c]));
    const topLevel = comments
      .filter((c) => !c.parentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return topLevel.flatMap((parent) => {
      const replies = comments
        .filter((c) => c.parentId === parent._id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const items: CommentListItem[] = [{ type: 'comment', item: parent, isReply: false }];
      if (replies.length > 0) {
        if (expandedReplyIds.has(parent._id)) {
          replies.forEach((r) =>
            items.push({
              type: 'comment',
              item: r,
              isReply: true,
              parentUsername: (byId.get(r.parentId || '')?.username) || parent.username,
            })
          );
        } else {
          items.push({ type: 'viewReplies', parentId: parent._id, parentUsername: parent.username, count: replies.length });
        }
      }
      return items;
    });
  }, [comments, expandedReplyIds]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (returnToSearch) {
              // Navigate back to Search tab instead of going back in FeedStack
              const root = navigation.getParent()?.getParent();
              if (root && 'navigate' in root) {
                (root as any).navigate('Search');
              } else {
                navigation.goBack();
              }
            } else {
              navigation.goBack();
            }
          }} 
          style={styles.headerIcon}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.headerIcon} />
      </View>

      {/* Post snippet at top */}
      <View style={styles.postRow}>
        <Image source={{ uri: image }} style={styles.postImage} resizeMode="cover" />
        <View style={styles.postTextWrap}>
          <Text style={styles.postUsername}>{username}</Text>
          <Text style={styles.postCaption} numberOfLines={2}>
            {caption}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#FF69B5" />
            <Text style={styles.loadingText}>Loading comments...</Text>
          </View>
        ) : (
          <FlatList
            data={commentsForList}
            style={styles.flex}
            keyExtractor={(row) => (row.type === 'comment' ? row.item._id : `view-${row.parentId}`)}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            }
            renderItem={({ item: row }) => {
              if (row.type === 'viewReplies') {
                const isExpanded = expandedReplyIds.has(row.parentId);
                const label = row.count === 1 ? 'View 1 reply' : `View ${row.count} replies`;
                return (
                  <TouchableOpacity
                    style={styles.viewRepliesRow}
                    activeOpacity={0.7}
                    onPress={() => handleToggleViewReplies(row.parentId)}
                  >
                    <View style={styles.viewRepliesLine} />
                    <Text style={styles.viewRepliesText}>{isExpanded ? 'Hide replies' : label}</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#0095F6" />
                  </TouchableOpacity>
                );
              }
              const item = row.item;
              const isReply = row.isReply;
              const liked = !!item.likedByMe;
              const count = item.likeCount ?? 0;
              return (
                <View style={[styles.commentRow, isReply && styles.commentRowReply]}>
                  <View style={styles.commentLeft}>
                    <View style={styles.commentAvatar}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.commentAvatarImg} />
                      ) : (
                        <Ionicons name="person" size={18} color="#999" />
                      )}
                    </View>
                    <View style={styles.commentBody}>
                      {isReply && row.parentUsername ? (
                        <Text style={styles.replyingTo}>Replying to @{row.parentUsername}</Text>
                      ) : null}
                      <Text style={styles.commentMetaTop}>
                        <Text style={styles.commentUsername}>{item.username}</Text>  {getTimeAgo(item.createdAt)}
                      </Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <TouchableOpacity style={styles.replyBtn} activeOpacity={0.7} onPress={() => handleReplyToComment(item)}>
                        <Text style={styles.replyText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.commentRight}>
                    <TouchableOpacity style={styles.likeBtn} activeOpacity={0.7} onPress={() => handleToggleLike(item)}>
                      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FF3B5C' : '#333'} />
                    </TouchableOpacity>
                    <Text style={styles.likeCount}>{count}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {replyingToCommentId && replyingToUsername && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarIndicator} />
            <View style={styles.replyBarTextWrap}>
              <Text style={styles.replyBarLabel} numberOfLines={1}>Replying to @{replyingToUsername}</Text>
            </View>
            <TouchableOpacity style={styles.replyBarClose} onPress={handleCancelReply} hitSlop={12}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputAvatar}>
            <Ionicons name="person" size={18} color="#999" />
          </View>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Add a comment..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            ref={inputRef}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || posting) && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={!text.trim() || posting}
            activeOpacity={0.8}
          >
            <Text style={styles.sendText}>{posting ? '…' : 'Post'}</Text>
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  postRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  postImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#EEE',
  },
  postTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  postUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  postCaption: {
    fontSize: 13,
    color: '#444',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 20 : 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentRowReply: {
    paddingLeft: 28,
  },
  commentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentRight: {
    width: 52,
    alignItems: 'center',
    paddingTop: 2,
  },
  likeBtn: {
    padding: 4,
  },
  likeCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  commentAvatarImg: {
    width: 32,
    height: 32,
  },
  commentBody: {
    flex: 1,
  },
  replyingTo: {
    fontSize: 11,
    color: '#0095F6',
    fontWeight: '600',
    marginBottom: 2,
  },
  commentMetaTop: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    color: '#000',
  },
  commentUsername: {
    fontWeight: '700',
    color: '#000',
  },
  replyBtn: {
    marginTop: 6,
  },
  replyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  viewRepliesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 40,
    paddingVertical: 8,
    gap: 8,
  },
  viewRepliesLine: {
    width: 22,
    height: 1,
    backgroundColor: '#DDD',
  },
  viewRepliesText: {
    fontSize: 12,
    color: '#0095F6',
    fontWeight: '600',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#fafafa',
    gap: 10,
  },
  replyBarIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#0095F6',
  },
  replyBarTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  replyBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0095F6',
  },
  replyBarClose: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 10 : 8,
    paddingBottom: Platform.OS === 'android' ? 12 : 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#fff',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#000',
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF69B4',
  },
});

export default CommentsScreen;

