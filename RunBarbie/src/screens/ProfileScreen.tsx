import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR_URI } from '../utils/defaultAvatar';
import { Post, Reel } from '../types';
import { userService, reelService } from '../services/api';
import { ProfileStackParamList } from '../navigation/types';
import ReelThumbnailPlaceholder from '../components/ReelThumbnailPlaceholder';

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
  const [reelThumbnails, setReelThumbnails] = useState<Record<string, string>>({});
  const [profileVisitorsCount, setProfileVisitorsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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
      const [postsData, reelsData, freshProfile] = await Promise.all([
        userService.getUserPosts(user._id),
        reelService.getReels(),
        userService.getUserProfile(user._id),
      ]);
      setPosts(postsData);
      setReels(reelsData.filter((r) => r.userId === user._id));
      setFollowersCount(freshProfile?.followers?.length ?? 0);
      setFollowingCount(freshProfile?.following?.length ?? 0);
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

  useEffect(() => {
    if (!user) return;
    userService.getProfileVisitorsCount().then(({ count }) => setProfileVisitorsCount(count)).catch(() => {});
  }, [user]);

  // Generate thumbnails for reels - optimized for faster loading
  useEffect(() => {
    if (tab !== 'reels' || reels.length === 0) return;
    
    let cancelled = false;
    const loadThumbs = async () => {
      const toGenerate = reels.filter((r) => !reelThumbnails[r._id]);
      if (toGenerate.length === 0) return;
      
      // Prioritize first 9 items (first 3 rows of grid) for immediate visibility
      const INITIAL_BATCH = 9;
      const initialBatch = toGenerate.slice(0, INITIAL_BATCH);
      const remainingBatch = toGenerate.slice(INITIAL_BATCH);
      
      // Generate initial batch first (visible items)
      const generateBatch = async (batch: typeof reels) => {
        if (cancelled || batch.length === 0) return;
        
        const thumbnailPromises = batch.map(async (reel) => {
          try {
            // Use lower quality and earlier timestamp for faster generation
            const { uri } = await VideoThumbnails.getThumbnailAsync(reel.videoUri, {
              time: 500, // Earlier timestamp for faster access
              quality: 0.7, // Lower quality for faster generation
            });
            return { reelId: reel._id, uri };
          } catch {
            return null;
          }
        });
        
        const results = await Promise.all(thumbnailPromises);
        if (!cancelled) {
          const updates: Record<string, string> = {};
          results.forEach((result) => {
            if (result) {
              updates[result.reelId] = result.uri;
            }
          });
          if (Object.keys(updates).length > 0) {
            setReelThumbnails((prev) => ({ ...prev, ...updates }));
          }
        }
      };
      
      // Generate initial batch immediately
      await generateBatch(initialBatch);
      
      // Generate remaining items in smaller batches
      if (!cancelled && remainingBatch.length > 0) {
        const BATCH_SIZE = 6;
        for (let i = 0; i < remainingBatch.length; i += BATCH_SIZE) {
          if (cancelled) break;
          const batch = remainingBatch.slice(i, i + BATCH_SIZE);
          await generateBatch(batch);
        }
      }
    };
    loadThumbs();
    return () => {
      cancelled = true;
    };
  }, [reels, reelThumbnails, tab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    userService.getProfileVisitorsCount().then(({ count }) => setProfileVisitorsCount(count)).catch(() => {});
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
    const hasThumb = !!reelThumbnails[item._id];
    return (
      <TouchableOpacity
        style={[styles.thumb, { width: thumbSize, height: thumbSize }]}
        onPress={() => openReel(item)}
        activeOpacity={0.8}
      >
        {hasThumb ? (
          <ImageBackground
            source={{ uri: reelThumbnails[item._id] }}
            style={styles.reelThumbImage}
            imageStyle={{ borderRadius: 0 }}
          >
            <View style={styles.reelThumbOverlay}>
              <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.95)" />
            </View>
          </ImageBackground>
        ) : (
          <ReelThumbnailPlaceholder width={thumbSize} height={thumbSize} />
        )}
      </TouchableOpacity>
    );
  };

  const header = (
    <>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.avatar || DEFAULT_AVATAR_URI }}
            style={styles.avatar}
          />
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
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { mode: 'followers', userId: user._id, username: user.username })}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { mode: 'following', userId: user._id, username: user.username })}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
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
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProfileVisitors')}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={22} color="#000" />
            {profileVisitorsCount > 0 && (
              <View style={styles.headerIconBadge}>
                <Text style={styles.headerIconBadgeText}>{profileVisitorsCount > 99 ? '99+' : profileVisitorsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={showMenu} style={styles.menuBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
          </TouchableOpacity>
        </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerIconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF69B5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerIconBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
  reelThumbImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
