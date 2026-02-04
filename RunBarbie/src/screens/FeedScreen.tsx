import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../components/PostCard';
import StoriesSection from '../components/StoriesSection';
import FeedHeader from '../components/FeedHeader';
import SkeletonPost from '../components/SkeletonPost';
import { ActivityType, Post } from '../types';
import { postService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FeedStackParamList } from '../navigation/types';

type FeedScreenNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<FeedSort>('latest');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<FeedScreenNav>();
  const motivationalLine = MOTIVATIONAL_LINES[Math.floor(Math.random() * MOTIVATIONAL_LINES.length)];
  const listRef = useRef<FlatList<Post>>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await postService.getAllPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
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

  const visiblePosts = useMemo(() => {
    let data = [...posts];
    if (activityFilter !== 'all') {
      data = data.filter((p) => p.activityType === activityFilter);
    }
    if (sortBy === 'popular') {
      data.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0));
    } else {
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return data;
  }, [posts, activityFilter, sortBy]);

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
      <StoriesSection />

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
              streakDays > 0 ? styles.smartCtaActive : styles.smartCtaInactive,
            ]}
          >
            <Ionicons
              name="flame"
              size={14}
              color={streakDays > 0 ? '#FFFFFF' : '#FF69B4'}
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
          <Text style={styles.smartStrong}>{weekDurationMin} min</Text> •{' '}
          <Text style={styles.smartStrong}>{myPostsThisWeek}</Text> posts
        </Text>
      </View>

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

      <View style={styles.motivationalRow}>
        <Text style={styles.motivationalText}>{motivationalLine}</Text>
      </View>
    </>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="footsteps-outline" size={56} color="#FF69B4" />
      </View>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>Share your first run or hike and inspire others.</Text>
      <TouchableOpacity
        style={styles.emptyCta}
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
        ref={listRef}
        data={visiblePosts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            currentUserId={user?._id}
          />
        )}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={<SmartHeader />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF69B4"
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
    backgroundColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  smartCtaInactive: {
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  smartCtaTextActive: {
    color: '#FFFFFF',
  },
  smartCtaTextInactive: {
    color: '#555555',
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
    backgroundColor: '#FF69B4',
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
