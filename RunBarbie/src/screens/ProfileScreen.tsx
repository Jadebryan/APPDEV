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
import { userService, reelService } from '../services/api';
import { ProfileStackParamList } from '../navigation/types';

type ProfileNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

type TabType = 'posts' | 'reels' | 'saved';

const SAVED_SECTIONS = [
  { id: 'saved-posts', label: 'Saved posts', sublabel: 'Runs you saved as inspiration', icon: 'bookmark-outline' as const, tab: 'FeedStack' as const, screen: 'SavedPosts' as const },
  { id: 'goals', label: 'Goals', sublabel: 'Run goals you set from posts', icon: 'flag-outline' as const, tab: 'FeedStack' as const, screen: 'Goals' as const },
  { id: 'saved-routes', label: 'Saved routes', sublabel: 'Route ideas from posts', icon: 'trail-sign-outline' as const, tab: 'FeedStack' as const, screen: 'SavedRoutes' as const },
  { id: 'saved-reels', label: 'Saved reels', sublabel: 'Reels and run list', icon: 'play-circle-outline' as const, tab: 'Reels' as const, screen: 'SavedReels' as const },
];

const FROM_PROFILE_PARAMS = { fromProfile: true };

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [tab, setTab] = useState<TabType>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const openSavedSection = (item: (typeof SAVED_SECTIONS)[0]) => {
    const mainTabs = (navigation.getParent() as any)?.getParent?.();
    if (item.tab === 'FeedStack') {
      mainTabs?.navigate('FeedStack', { screen: item.screen, params: FROM_PROFILE_PARAMS });
    } else {
      mainTabs?.navigate('Reels', { screen: item.screen, params: FROM_PROFILE_PARAMS });
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [postsData, reelsData] = await Promise.all([
        userService.getUserPosts(user._id),
        reelService.getReels(),
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

  const renderSavedSection = ({ item }: { item: (typeof SAVED_SECTIONS)[0] }) => (
    <TouchableOpacity style={styles.savedRow} onPress={() => openSavedSection(item)} activeOpacity={0.7}>
      <View style={styles.savedRowIcon}>
        <Ionicons name={item.icon} size={24} color="#000" />
      </View>
      <View style={styles.savedRowText}>
        <Text style={styles.savedRowLabel}>{item.label}</Text>
        <Text style={styles.savedRowSublabel}>{item.sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

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
        <TouchableOpacity
          style={[styles.tab, tab === 'saved' && styles.tabActive]}
          onPress={() => setTab('saved')}
        >
          <Ionicons name="bookmark-outline" size={22} color={tab === 'saved' ? '#000' : '#666'} />
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
          data={tab === 'saved' ? SAVED_SECTIONS : gridData}
          numColumns={tab === 'saved' ? 1 : 3}
          keyExtractor={(item) => ((item as any)._id != null ? (item as any)._id : (item as any).id)}
          ListHeaderComponent={header}
          columnWrapperStyle={tab === 'saved' ? undefined : styles.gridRow}
          contentContainerStyle={tab === 'saved' ? styles.savedListContent : styles.gridContent}
          renderItem={tab === 'saved' ? renderSavedSection : renderGridItem}
          key={tab}
          refreshControl={tab !== 'saved' ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#333" /> : undefined}
          ListEmptyComponent={
            tab === 'saved' ? null : (
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
            )
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
  savedListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  savedRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  savedRowText: { flex: 1 },
  savedRowLabel: { fontSize: 16, fontWeight: '600', color: '#000' },
  savedRowSublabel: { fontSize: 13, color: '#666', marginTop: 2 },
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
