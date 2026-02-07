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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Post, Reel } from '../types';
import { userService } from '../services/api';
import { mockDataService } from '../services/mockData';
import { ProfileStackParamList } from '../navigation/types';

type ProfileNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

type TabType = 'posts' | 'reels';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [tab, setTab] = useState<TabType>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [postsData, reelsData] = await Promise.all([
        userService.getUserPosts(user._id),
        mockDataService.getReels(),
      ]);
      setPosts(postsData);
      setReels(reelsData.filter((r) => r.userId === user._id));
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const showMenu = () => {
    navigation.navigate('ProfileMenu');
  };

  const openPost = (item: Post) => {
    const tabNav = navigation.getParent();
    (tabNav as any)?.navigate('FeedStack', {
      screen: 'Comments',
      params: {
        postId: item._id,
        username: user!.username,
        caption: item.caption,
        image: item.image,
      },
    });
  };

  const openReel = (item: Reel) => {
    const tabNav = navigation.getParent();
    (tabNav as any)?.navigate('Reels', { screen: 'ReelsHome', params: { initialReelId: item._id } });
  };

  if (!user) return null;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekPosts = posts.filter((p) => new Date(p.createdAt).getTime() >= weekAgo);
  const weekDistance = weekPosts.reduce((sum, p) => sum + (p.distance ?? 0), 0);
  const runCount = weekPosts.filter((p) => p.activityType === 'run').length;

  const thumbSize = (width - 4) / 3;
  const gridData = tab === 'posts' ? posts : reels;
  const isPost = (item: Post | Reel): item is Post => 'image' in item;

  const renderGridItem = ({ item }: { item: Post | Reel }) => {
    if (isPost(item)) {
      return (
        <TouchableOpacity
          style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
          onPress={() => openPost(item)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.image }} style={styles.thumbImage} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
        onPress={() => openReel(item)}
        activeOpacity={0.8}
      >
        <View style={styles.reelThumbPlaceholder}>
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{(user.username || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.username}>{user.username}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Text style={styles.editBtnText}>Edit profile</Text>
        </TouchableOpacity>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.following?.length || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {(weekPosts.length > 0 || weekDistance > 0) && (
          <View style={styles.activitySummary}>
            <Ionicons name="fitness-outline" size={18} color="#666" />
            <Text style={styles.activityText}>
              This week: {runCount > 0 ? `${runCount} run${runCount > 1 ? 's' : ''} · ` : ''}
              {weekDistance > 0 ? `${weekDistance.toFixed(1)} km` : 'No distance'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'posts' && styles.tabActive]}
          onPress={() => setTab('posts')}
        >
          <Ionicons name="grid-outline" size={22} color={tab === 'posts' ? '#000' : '#666'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'reels' && styles.tabActive]}
          onPress={() => setTab('reels')}
        >
          <Ionicons name="play-circle-outline" size={22} color={tab === 'reels' ? '#000' : '#666'} />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{user.username}</Text>
        <TouchableOpacity onPress={showMenu} style={styles.menuBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      ) : (
        <FlatList
          data={gridData}
          numColumns={3}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={header}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={renderGridItem}
          key={tab}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {tab === 'posts' ? (
                <>
                  <Ionicons name="images-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No posts yet</Text>
                  <Text style={styles.emptySubtext}>Share your first adventure!</Text>
                </>
              ) : (
                <>
                  <Ionicons name="videocam-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No reels yet</Text>
                  <Text style={styles.emptySubtext}>Create a reel from the Reels tab</Text>
                </>
              )}
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
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
  avatarContainer: {
    marginBottom: 12,
  },
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
  stats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
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
  activitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  activityText: {
    fontSize: 13,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridWrap: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 24,
  },
  gridRow: {
    marginBottom: 2,
    gap: 2,
  },
  thumb: {
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  reelThumbPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});

export default ProfileScreen;
