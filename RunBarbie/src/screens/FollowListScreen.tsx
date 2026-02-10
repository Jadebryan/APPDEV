import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import { User } from '../types';
import { DEFAULT_AVATAR_URI } from '../utils/defaultAvatar';

type FollowListParams = { mode: 'followers' | 'following'; userId: string; username?: string };

const FollowListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<{ params: FollowListParams }>();
  const { mode, userId, username } = route.params;
  const { user: currentUser, updateUser } = useAuth();
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadList = useCallback(async () => {
    try {
      const data = mode === 'followers'
        ? await userService.getFollowers(userId)
        : await userService.getFollowing(userId);
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Follow list load error:', e);
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, userId]);

  useEffect(() => {
    if (currentUser?.following) {
      setFollowingIds(new Set(currentUser.following));
    }
  }, [currentUser?.following]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const onRefresh = () => {
    setRefreshing(true);
    loadList();
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      await userService.followUser(targetUserId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (next.has(targetUserId)) next.delete(targetUserId);
        else next.add(targetUserId);
        return next;
      });
      const isCurrentlyFollowing = currentUser.following?.includes(targetUserId) ?? false;
      const nextFollowing = isCurrentlyFollowing
        ? (currentUser.following || []).filter((id) => id !== targetUserId)
        : [...(currentUser.following || []), targetUserId];
      updateUser({ ...currentUser, following: nextFollowing });
    } catch (e) {
      console.error('Follow error:', e);
    }
  };

  const handleAccountPress = (item: User) => {
    if (currentUser?._id === item._id) return;
    const root = (navigation.getParent as any)?.()?.getParent?.();
    if (root && 'navigate' in root) {
      (root as any).navigate('FeedStack', {
        screen: 'UserProfile',
        params: { userId: item._id, username: item.username, avatar: item.avatar, bio: item.bio },
      });
    } else {
      (navigation as any).navigate('UserProfile', {
        userId: item._id,
        username: item.username,
        avatar: item.avatar,
        bio: item.bio,
      });
    }
  };

  const title = mode === 'followers' ? 'Followers' : 'Following';
  const headerTitle = username ? `${username}'s ${title.toLowerCase()}` : title;
  const isFollowing = (id: string) => followingIds.has(id);

  const renderItem = ({ item }: { item: User }) => {
    const isCurrentUser = currentUser?._id === item._id;
    const following = isFollowing(item._id);
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => handleAccountPress(item)}
      >
        <Image
          source={{ uri: item.avatar || DEFAULT_AVATAR_URI }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.rowUsername} numberOfLines={1}>{item.username}</Text>
          {item.bio ? (
            <Text style={styles.rowBio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
        {!isCurrentUser && (
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={() => handleFollow(item._id)}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerRight} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF69B5" />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF69B5" />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  rowUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  rowBio: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0095F6',
  },
  followBtnActive: {
    backgroundColor: '#efefef',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followBtnTextActive: {
    color: '#000',
  },
});

export default FollowListScreen;
