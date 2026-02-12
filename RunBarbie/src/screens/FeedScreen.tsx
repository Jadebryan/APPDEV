import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../components/PostCard';
import StoriesSection from '../components/StoriesSection';
import FeedHeader from '../components/FeedHeader';
import SkeletonPost from '../components/SkeletonPost';
import { ActivityType, Post, Reel } from '../types';
import { postService, reelService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useStories } from '../context/StoriesContext';
import { FeedStackParamList } from '../navigation/types';
import { formatDurationMinutes } from '../utils/formatDuration';
import UploadProgressBar from '../components/UploadProgressBar';
import ReelThumbnailPlaceholder from '../components/ReelThumbnailPlaceholder';
import * as VideoThumbnails from 'expo-video-thumbnails';

type FeedScreenNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;
type FeedHomeRoute = RouteProp<FeedStackParamList, 'FeedHome'>;

const MOTIVATIONAL_LINES = [
  'Every step counts. 🏃‍♀️',
  'Run your world. 🎀',
  'The trail is calling.',
  'Out there is where you belong.',
];

type FeedSort = 'latest' | 'popular';
type ActivityFilter = ActivityType | 'all';

/**
 * FeedScreen Component - Instagram-style feed
 * Layout: Sticky header → Stories → Smart summary → Filters → Motivational line → Posts
 */
const FeedScreen: React.FC = () => {
  const route = useRoute<FeedHomeRoute>();
  const tagFromParams = route.params?.tag;
  const initialStoryUserId = route.params?.initialStoryUserId;
  const initialStoryId = route.params?.initialStoryId;
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<FeedSort>('latest');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [reelThumbnails, setReelThumbnails] = useState<Record<string, string>>({});
  const { user, updateUser } = useAuth();
  const { subscribe } = useRealtime();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const { pendingStoryOpen, setPendingStoryOpen } = useStories();
  const navigation = useNavigation<FeedScreenNav>();
  const savedPostIds = useMemo(() => new Set(user?.savedPosts ?? []), [user?.savedPosts]);
  const motivationalLine = MOTIVATIONAL_LINES[Math.floor(Math.random() * MOTIVATIONAL_LINES.length)];
  const listRef = useRef<FlatList<Post>>(null);
  const [storyOpenRequest, setStoryOpenRequest] = useState<{
    userId: string;
    storyId?: string;
    requestId: number;
  } | null>(null);

  // If we were asked (via navigation params) to open a specific story, store in state and scroll to top.
  useEffect(() => {
    if (!initialStoryUserId) return;
    setStoryOpenRequest({
      userId: initialStoryUserId,
      storyId: initialStoryId,
      requestId: Date.now(),
    });
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    (navigation as any).setParams?.({ initialStoryUserId: undefined, initialStoryId: undefined });
  }, [initialStoryUserId, initialStoryId, navigation]);

  // Pending story from notification tap (context) – survives navigation timing
  useEffect(() => {
    if (!pendingStoryOpen) return;
    setStoryOpenRequest({
      userId: pendingStoryOpen.userId,
      storyId: pendingStoryOpen.storyId,
      requestId: Date.now(),
    });
    setPendingStoryOpen(null);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [pendingStoryOpen, setPendingStoryOpen]);

  useEffect(() => {
    loadPosts();
  }, []);

  // Real-time: prepend new posts/reels from other users when they post
  useEffect(() => {
    const unsubPost = subscribe('post:new', (payload: unknown) => {
      const post = payload as Post;
      if (post?._id && post?.userId !== user?._id) {
        setPosts((prev) => (prev.some((p) => p._id === post._id) ? prev : [post, ...prev]));
      }
    });
    const unsubReel = subscribe('reel:new', (payload: unknown) => {
      const reel = payload as Reel;
      if (reel?._id && reel?.userId !== user?._id) {
        setReels((prev) => (prev.some((r) => r._id === reel._id) ? prev : [reel, ...prev]));
      }
    });
    return () => {
      unsubPost();
      unsubReel();
    };
  }, [subscribe, user?._id]);

  const loadPosts = async () => {
    try {
      const [postsData, reelsData] = await Promise.all([
        postService.getAllPosts(),
        reelService.getReels(),
      ]);
      setPosts(postsData);
      setReels(reelsData);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    try {
      const updatedPost = await postService.likePost(postId);
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post._id === postId ? updatedPost : post))
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleBookmark = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      const isSaved = savedPostIds.has(postId);
      const res = isSaved
        ? await postService.unbookmarkPost(postId)
        : await postService.bookmarkPost(postId);
      await updateUser({ ...user, savedPosts: res.savedPosts });
      showToast(isSaved ? 'Run removed from saved' : 'Run saved', 'success');
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      showToast('Could not update saved', 'error');
    }
  }, [user, savedPostIds, updateUser, showToast]);

  const { weekDistanceKm, weekDurationMin, myPostsThisWeek, streakDays } = useMemo(() => {
    if (!user?._id) {
      return { weekDistanceKm: 0, weekDurationMin: 0, myPostsThisWeek: 0, streakDays: 0 };
    }
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const mine = posts.filter((p) => p.userId === user._id && new Date(p.createdAt).getTime() >= weekAgo);
    const dist = mine.reduce((sum, p) => sum + (p.distance ?? 0), 0);
    const dur = mine.reduce((sum, p) => sum + (p.duration ?? 0), 0);

    // Compute streak = consecutive days with at least one post, ending today
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTs = startOfToday.getTime();
    const daysWithPosts = new Set<number>();
    mine.forEach((p) => {
      const d = new Date(p.createdAt);
      d.setHours(0, 0, 0, 0);
      daysWithPosts.add(d.getTime());
    });
    let streak = 0;
    for (let offset = 0; offset < 30; offset++) {
      const dayTs = startTs - offset * dayMs;
      if (daysWithPosts.has(dayTs)) {
        streak += 1;
      } else {
        break;
      }
    }

    return {
      weekDistanceKm: Math.round(dist * 10) / 10,
      weekDurationMin: dur,
      myPostsThisWeek: mine.length,
      streakDays: streak,
    };
  }, [posts, user?._id]);

  /** Posts/reels only from users the current user follows (or own). Mutual follow = both see each other's content. */
  const visiblePosts = useMemo(() => {
    const followingOrOwn = (userId: string) => !user || userId === user._id || (user.following ?? []).includes(userId);
    let data = posts.filter(
      (p) => followingOrOwn(p.userId) && !hiddenPostIds.has(p._id) && !mutedUserIds.has(p.userId)
    );
    if (tagFromParams) {
      const tagLower = tagFromParams.toLowerCase().replace(/^#/, '');
      data = data.filter(
        (p) =>
          p.caption.toLowerCase().includes(`#${tagLower}`) ||
          p.caption.toLowerCase().includes(` ${tagLower} `) ||
          p.caption.toLowerCase().startsWith(`${tagLower} `) ||
          p.caption.toLowerCase().endsWith(` ${tagLower}`)
      );
    }
    if (activityFilter !== 'all') {
      data = data.filter((p) => p.activityType === activityFilter);
    }
    const sorted = [...data];
    if (sortBy === 'popular') {
      sorted.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [posts, user, activityFilter, sortBy, hiddenPostIds, mutedUserIds, tagFromParams]);

  const visibleReels = useMemo(
    () =>
      reels.filter(
        (r) => !user || r.userId === user._id || (user.following ?? []).includes(r.userId)
      ),
    [reels, user]
  );

  // Generate lightweight thumbnails for reels for the horizontal preview row - optimized
  useEffect(() => {
    let cancelled = false;
    const loadThumbs = async () => {
      const toGenerate = visibleReels.filter((r) => !reelThumbnails[r._id]);
      if (toGenerate.length === 0) return;
      
      // Generate thumbnails in parallel for faster loading
      const thumbnailPromises = toGenerate.map(async (reel) => {
        try {
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
    if (visibleReels.length > 0) {
      loadThumbs();
    }
    return () => {
      cancelled = true;
    };
  }, [visibleReels, reelThumbnails]);

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set(prev).add(postId));
  }, []);

  const handleMuteUser = useCallback((userId: string) => {
    setMutedUserIds((prev) => new Set(prev).add(userId));
  }, []);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await postService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      showToast('Post deleted', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete post', 'error');
    }
  }, [showToast]);

  const renderPostItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onLike={handleLike}
        currentUserId={user?._id}
        saved={savedPostIds.has(item._id)}
        onBookmark={user ? handleBookmark : undefined}
        onHidePost={handleHidePost}
        onMuteUser={handleMuteUser}
        onDelete={user ? handleDeletePost : undefined}
      />
    ),
    [handleLike, user?._id, savedPostIds, handleBookmark, handleHidePost, handleMuteUser, handleDeletePost],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 500 && !showScrollTop) setShowScrollTop(true);
    if (y <= 500 && showScrollTop) setShowScrollTop(false);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const FilterPill = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SmartHeader = () => (
    <>
      <StoriesSection
        openRequest={storyOpenRequest ?? undefined}
        onConsumeOpenRequest={(requestId) => {
          setStoryOpenRequest((prev) => {
            if (!prev) return prev;
            if (prev.requestId !== requestId) return prev;
            return null;
          });
        }}
      />
      <UploadProgressBar />

      {/* Smart summary card (personalized) */}
      <View style={styles.smartCard}>
        <View style={styles.smartCardTop}>
          <Text style={styles.smartHello}>
            {user?.username ? `Hi, ${user.username} 👟` : 'Welcome 👟'}
          </Text>
          {/* Streak chip – shows consecutive active days */}
          <View
            style={[
              styles.smartCta,
              streakDays > 0 ? [styles.smartCtaActive, { backgroundColor: palette.primary }] : styles.smartCtaInactive,
            ]}
          >
            <Ionicons
              name="flame"
              size={14}
              color={streakDays > 0 ? '#FFFFFF' : palette.primary}
            />
            <Text
              style={[
                styles.smartCtaText,
                streakDays > 0 ? styles.smartCtaTextActive : styles.smartCtaTextInactive,
              ]}
            >
              {streakDays > 0 ? `${streakDays}-day streak` : 'Start streak'}
            </Text>
          </View>
        </View>
        <Text style={styles.smartSub}>
          This week: <Text style={styles.smartStrong}>{weekDistanceKm} km</Text> •{' '}
          <Text style={styles.smartStrong}>{formatDurationMinutes(weekDurationMin)}</Text> •{' '}
          <Text style={styles.smartStrong}>{myPostsThisWeek}</Text> posts
        </Text>
      </View>

      {tagFromParams ? (
        <View style={styles.tagFilterRow}>
          <Text style={[styles.tagFilterLabel, { color: palette.primary }]}>Viewing #{tagFromParams}</Text>
          <TouchableOpacity
            style={styles.tagFilterClear}
            onPress={() => navigation.setParams({ tag: undefined })}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Smart filters */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          <FilterPill label="For you" active={sortBy === 'latest'} onPress={() => setSortBy('latest')} />
          <FilterPill label="Popular" active={sortBy === 'popular'} onPress={() => setSortBy('popular')} />
          <View style={styles.filterDivider} />
          <FilterPill label="All" active={activityFilter === 'all'} onPress={() => setActivityFilter('all')} />
          <FilterPill label="Run" active={activityFilter === 'run'} onPress={() => setActivityFilter('run')} />
          <FilterPill label="Hike" active={activityFilter === 'hike'} onPress={() => setActivityFilter('hike')} />
          <FilterPill label="Cycle" active={activityFilter === 'cycle'} onPress={() => setActivityFilter('cycle')} />
          <FilterPill label="Walk" active={activityFilter === 'walk'} onPress={() => setActivityFilter('walk')} />
        </ScrollView>
      </View>

      {/* Reels row – Instagram-style horizontal strip */}
      {visibleReels.length > 0 && (
        <View style={styles.reelsSection}>
          <View style={styles.reelsSectionHeader}>
            <Text style={styles.reelsSectionTitle}>Reels</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => (navigation.getParent() as any)?.navigate('Reels', { screen: 'ReelsHome' })}
            >
              <Text style={styles.reelsSeeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reelsScrollContent}
          >
            {visibleReels.slice(0, 12).map((reel) => (
              <TouchableOpacity
                key={reel._id}
                activeOpacity={0.9}
                style={styles.reelCard}
                onPress={() =>
                  (navigation.getParent() as any)?.navigate('Reels', {
                    screen: 'ReelsHome',
                    params: { initialReelId: reel._id },
                  })
                }
              >
                <View style={styles.reelCardThumb}>
                  {reelThumbnails[reel._id] ? (
                    <ImageBackground
                      source={{ uri: reelThumbnails[reel._id] }}
                      style={styles.reelCardPlaceholder}
                      imageStyle={{ borderRadius: 12 }}
                    >
                      <View style={styles.reelCardPlayOverlay}>
                        <Ionicons name="play" size={32} color="rgba(255,255,255,0.95)" />
                      </View>
                    </ImageBackground>
                  ) : (
                    <ReelThumbnailPlaceholder
                      width={112}
                      height={160}
                      borderRadius={10}
                    />
                  )}
                  {reel.user?.avatar ? (
                    <View style={styles.reelCardAvatarWrap}>
                      <Image source={{ uri: reel.user.avatar }} style={styles.reelCardAvatar} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.reelCardCaption} numberOfLines={2}>
                  {reel.caption || 'Reel'}
                </Text>
                {(reel.likes?.length ?? 0) > 0 && (
                  <View style={styles.reelCardMeta}>
                    <Ionicons name="heart" size={12} color="#666" />
                    <Text style={styles.reelCardLikes}>{reel.likes.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.motivationalRow}>
        <Text style={styles.motivationalText}>{motivationalLine}</Text>
      </View>
    </>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="footsteps-outline" size={56} color={palette.primary} />
      </View>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>Share your first run or hike and inspire others.</Text>
      <TouchableOpacity
        style={[styles.emptyCta, { backgroundColor: palette.primary }]}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.emptyCtaText}>Share your first post</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FeedHeader />
        <SmartHeader />
        {[1, 2, 3].map((key) => (
          <SkeletonPost key={key} />
        ))}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedHeader />

      <FlatList
        key={`feed-${sortBy}-${activityFilter}-${tagFromParams ?? ''}`}
        ref={listRef}
        data={visiblePosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={<SmartHeader />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.primary}
          />
        }
        ListEmptyComponent={<EmptyState />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />

      {showScrollTop && (
        <TouchableOpacity style={styles.scrollTopBtn} onPress={scrollToTop} activeOpacity={0.85}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  smartCard: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  smartCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  smartHello: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  smartSub: {
    fontSize: 13,
    color: '#666',
  },
  smartStrong: {
    fontWeight: '700',
    color: '#111',
  },
  smartCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smartCtaText: {
    fontWeight: '700',
    fontSize: 12,
  },
  smartCtaActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  smartCtaInactive: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  smartCtaTextActive: {
    color: '#FFFFFF',
  },
  smartCtaTextInactive: {
    color: '#555555',
  },
  tagFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  tagFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagFilterClear: {
    padding: 4,
  },
  filtersRow: {
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtersContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E6E6E6',
    marginHorizontal: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  pillInactive: {
    backgroundColor: '#fff',
    borderColor: '#E6E6E6',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#fff',
  },
  pillTextInactive: {
    color: '#111',
  },
  reelsSection: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reelsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  reelsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  reelsSeeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095F6',
  },
  reelsScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  reelCard: {
    width: 112,
    marginRight: 12,
  },
  reelCardThumb: {
    width: 112,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  reelCardPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelCardPlayOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelCardAvatarWrap: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  reelCardAvatar: {
    width: '100%',
    height: '100%',
  },
  reelCardCaption: {
    fontSize: 12,
    color: '#333',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  reelCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  reelCardLikes: {
    fontSize: 11,
    color: '#666',
  },
  motivationalRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  motivationalText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  emptyCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scrollTopBtn: {
    position: 'absolute',
    right: 16,
    bottom: 70,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default FeedScreen;
