import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR_URI } from '../utils/defaultAvatar';
import { Post, User } from '../types';
import { userService } from '../services/api';
import { FeedStackParamList } from '../navigation/types';

type UserProfileRoute = RouteProp<FeedStackParamList, 'UserProfile'>;
type UserProfileNav = NativeStackNavigationProp<FeedStackParamList, 'UserProfile'>;

const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation<UserProfileNav>();
  const route = useRoute<UserProfileRoute>();
  const { userId, username: paramUsername, avatar: paramAvatar, bio: paramBio } = route.params;
  const { user: currentUser, updateUser } = useAuth();
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);

  const isOwnProfile = currentUser?._id === userId;

  const loadData = useCallback(async () => {
    try {
      const [userData, postsData] = await Promise.all([
        userService.getUserProfile(userId),
        userService.getUserPosts(userId),
      ]);
      setProfile(userData);
      setPosts(postsData);
      setFollowing(currentUser?.following?.includes(userId) ?? false);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile({
        _id: userId,
        email: '',
        username: paramUsername ?? 'Athlete',
        bio: paramBio,
        avatar: paramAvatar,
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, currentUser?._id, currentUser?.following, paramUsername, paramAvatar, paramBio]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Record profile view (TikTok-style) when viewing someone else's profile
  useEffect(() => {
    if (!isOwnProfile && userId && currentUser?._id) {
      userService.recordProfileView(userId).catch(() => {});
    }
  }, [userId, isOwnProfile, currentUser?._id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      await userService.followUser(profile._id);

      // Optimistically toggle local following state
      setFollowing((prev) => !prev);

      // Update viewed profile's followers list
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followers: following
                ? prev.followers.filter((id) => id !== currentUser?._id)
                : [...prev.followers, currentUser!._id],
            }
          : null
      );

      // Update current logged-in user's "following" list in auth context
      if (currentUser) {
        const isCurrentlyFollowing = currentUser.following?.includes(profile._id) ?? false;
        const nextFollowing = isCurrentlyFollowing
          ? (currentUser.following || []).filter((id) => id !== profile._id)
          : [...(currentUser.following || []), profile._id];
        updateUser({ ...currentUser, following: nextFollowing });
      }
    } catch (e) {
      console.error('Follow error:', e);
    }
  };

  const openPost = (item: Post) => {
    navigation.navigate('Comments', {
      postId: item._id,
      username: profile?.username ?? paramUsername ?? 'user',
      caption: item.caption,
      image: item.image,
    });
  };

  const goToMyProfile = () => {
    (navigation.getParent() as any)?.navigate('ProfileStack');
    navigation.goBack();
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.username ?? paramUsername ?? 'Athlete';
  const displayBio = profile?.bio ?? paramBio;
  const displayAvatar = profile?.avatar ?? paramAvatar;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{displayName}</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: displayAvatar || DEFAULT_AVATAR_URI }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.username}>{displayName}</Text>
            {displayBio ? <Text style={styles.bio}>{displayBio}</Text> : null}
            {isOwnProfile ? (
              <TouchableOpacity style={styles.editBtn} onPress={goToMyProfile} activeOpacity={0.7}>
                <Text style={styles.editBtnText}>View my profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followingBtn]}
                onPress={handleFollow}
                activeOpacity={0.7}
              >
                <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => profile && navigation.navigate('FollowList', { mode: 'followers', userId: profile._id, username: profile.username })}
                activeOpacity={0.7}
              >
                <Text style={styles.statNumber}>{profile?.followers?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => profile && navigation.navigate('FollowList', { mode: 'following', userId: profile._id, username: profile.username })}
                activeOpacity={0.7}
              >
                <Text style={styles.statNumber}>{profile?.following?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.thumb, { width: (width - 4) / 3, height: (width - 4) / 3 }]}
            onPress={() => openPost(item)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.image }} style={styles.thumbImage} />
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  avatarContainer: { marginBottom: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '600',
    color: '#666',
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  editBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  followBtn: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF69B4',
    marginBottom: 16,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followingBtnText: {
    color: '#000',
  },
  stats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  statItem: { alignItems: 'center' },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  gridRow: {
    marginBottom: 2,
    gap: 2,
  },
  gridContent: { paddingBottom: 24 },
  thumb: {
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
});

export default UserProfileScreen;
