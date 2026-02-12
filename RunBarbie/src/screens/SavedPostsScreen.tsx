import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../services/api';
import { Post } from '../types';
import { getTimeAgo } from '../utils/timeAgo';
import { useToast } from '../context/ToastContext';
import { FeedStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';

type SavedPostsRoute = RouteProp<FeedStackParamList, 'SavedPosts'>;

const SavedPostsScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<SavedPostsRoute>();
  const { showToast } = useToast();
  const fromProfile = route.params?.fromProfile === true;

  const handleBack = () => {
    if (fromProfile) {
      const mainTabs = (navigation.getParent() as any)?.getParent?.();
      mainTabs?.navigate('ProfileStack');
    } else {
      navigation.goBack();
    }
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await userService.getSavedPosts();
      setPosts(list);
    } catch {
      showToast('Failed to load saved posts', 'info');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const openComments = (post: Post) => {
    const user = post.user ?? (post as { userId?: { username?: string } }).userId;
    const username = user?.username ?? 'Unknown';
    navigation.navigate('Comments', {
      postId: post._id,
      username,
      caption: post.caption,
      image: post.image,
    });
  };

  const renderItem = ({ item }: { item: Post }) => {
    const user = item.user ?? (item as { userId?: { username?: string; avatar?: string } }).userId;
    const username = user?.username ?? 'Unknown';
    const avatar = user?.avatar;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openComments(item)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />
        <View style={styles.cardBody}>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.caption} numberOfLines={2}>{item.caption || 'No caption'}</Text>
          {item.createdAt && <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved (inspiration)</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No saved posts</Text>
          <Text style={styles.emptySub}>Save runs from the feed (⋯ → Save run or Mark as inspiration)</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  cardBody: { flex: 1, marginLeft: 12 },
  username: { fontSize: 15, fontWeight: '600', color: '#000' },
  caption: { fontSize: 14, color: '#555', marginTop: 2 },
  time: { fontSize: 12, color: '#999', marginTop: 4 },
});

export default SavedPostsScreen;
