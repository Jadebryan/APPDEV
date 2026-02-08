import React, { useState, useEffect, useCallback } from 'react';
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
  const { postId, username, caption, image } = route.params;
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState('');

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
      const newComment = await postService.addComment(postId, trimmed);
      setComments((prev) => [newComment, ...prev]);
      setText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
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
            data={comments}
            style={styles.flex}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.commentAvatarImg} />
                  ) : (
                    <Ionicons name="person" size={18} color="#999" />
                  )}
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentText}>
                    <Text style={styles.commentUsername}>{item.username} </Text>
                    {item.text}
                  </Text>
                  <Text style={styles.commentMeta}>{getTimeAgo(item.createdAt)}</Text>
                </View>
              </View>
            )}
          />
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
  commentText: {
    fontSize: 13,
    color: '#000',
  },
  commentUsername: {
    fontWeight: '600',
  },
  commentMeta: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
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

