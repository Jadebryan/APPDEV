import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  Animated,
  Share,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Reel } from '../types';
import { ActivityType } from '../types';
import { mockDataService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';

// Tab bar height from AppNavigator (50 + paddingTop 5 + paddingBottom 5)
const TAB_BAR_HEIGHT = 60;

interface ReelComment {
  id: string;
  username: string;
  text: string;
  timeAgo: string;
  likeCount: number;
}

const REEL_COMMENTS_MOCK: ReelComment[] = [
  { id: '1', username: 'trail_runner', text: 'Looks like such a fun route! 🌲', timeAgo: '15h', likeCount: 181 },
  { id: '2', username: 'marathon_mike', text: 'Perfect tempo pace 🔥', timeAgo: '2d', likeCount: 80 },
  { id: '3', username: 'bike_lover', text: 'Those shoes are sick 👟', timeAgo: '1d', likeCount: 42 },
];

const EMOJI_QUICK = ['❤️', '👏', '🔥', '🙌', '😢', '😍', '😮', '😂'];

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  hike: 'Hike',
  cycle: 'Cycle',
  walk: 'Walk',
  other: 'Activity',
};

/** Single reel video using expo-video; only active reel plays (Instagram-style). */
const ReelVideo: React.FC<{
  videoUri: string;
  isActive: boolean;
  muted: boolean;
}> = ({ videoUri, isActive, muted }) => {
  const player = useVideoPlayer(videoUri, p => {
    p.loop = true;
  });
  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);
  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
      {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
    />
  );
};

/** Memoized reel cell: re-renders only when visibility, mute, or like state changes (Instagram-style perf). */
type ReelCellProps = {
  item: Reel;
  index: number;
  isActive: boolean;
  muted: boolean;
  isLiked: boolean;
  overlayBottom: number;
  rightActionsBottom: number;
  screenWidth: number;
  reelItemHeight: number;
  scale: Animated.Value;
  onReelPress: (item: Reel) => void;
  onLike: (reelId: string) => void;
  onComment: (item: Reel) => void;
  onShare: (item: Reel) => void;
  onMore: (item: Reel) => void;
  onFollow: (userId: string) => void;
  onUsernamePress: (item: Reel) => void;
  isFollowing: boolean;
};

const ReelCell = memo(function ReelCell({
  item,
  index,
  isActive,
  muted,
  isLiked,
  overlayBottom,
  rightActionsBottom,
  screenWidth,
  reelItemHeight,
  scale,
  onReelPress,
  onLike,
  onComment,
  onShare,
  onMore,
  onFollow,
  onUsernamePress,
  isFollowing,
}: ReelCellProps) {
  const heartScale = scale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.2],
  });
  const heartOpacity = scale.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });
  return (
    <View style={[styles.reelItem, { width: screenWidth, height: reelItemHeight }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => onReelPress(item)}
      />
      <View style={[styles.videoWrapper, { width: screenWidth, height: reelItemHeight }]}>
        <ReelVideo videoUri={item.videoUri} isActive={isActive} muted={muted} />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />
      {item.activityType && (
        <View style={styles.activityBadge}>
          <Ionicons name="footsteps" size={12} color="#fff" />
          <Text style={styles.activityBadgeText}>
            {ACTIVITY_LABELS[item.activityType]}
          </Text>
        </View>
      )}
      <Animated.View
        style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
        pointerEvents="none"
      >
        <Ionicons name="heart" size={80} color="#fff" />
      </Animated.View>
      <View style={[styles.rightActions, { bottom: rightActionsBottom }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => onLike(item._id)}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={32} color={isLiked ? '#FF69B4' : '#fff'} />
          <Text style={styles.actionLabel}>{item.likes?.length ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => onComment(item)}>
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={styles.actionLabel}>{item.commentCount ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => onShare(item)}>
          <Ionicons name="paper-plane-outline" size={28} color="#fff" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => onMore(item)}>
          <Ionicons name="ellipsis-horizontal" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={[styles.bottomOverlay, { bottom: overlayBottom }]} pointerEvents="box-none">
        <View style={styles.userRow}>
          <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={() => onUsernamePress(item)}>
            {item.user?.avatar ? (
              <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => onUsernamePress(item)} style={styles.usernameTouch}>
            <Text style={styles.username}>@{item.user?.username ?? 'user'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.followBtn} activeOpacity={0.8} onPress={() => onFollow(item.userId)}>
            <Text style={styles.followBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        </View>
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
        ) : null}
      </View>
    </View>
  );
});

const ReelsScreen: React.FC = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [commentsSheetVisible, setCommentsSheetVisible] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState<Reel | null>(null);
  const [sheetComments, setSheetComments] = useState<ReelComment[]>(REEL_COMMENTS_MOCK);
  const [sheetCommentText, setSheetCommentText] = useState('');
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [selectedReelForMore, setSelectedReelForMore] = useState<Reel | null>(null);
  const [autoScrollOn, setAutoScrollOn] = useState(false);
  const { user } = useAuth();
  // Use measured reel area height so video fills exactly (no black gap from miscalculation)
  const [reelAreaHeight, setReelAreaHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT - insets.top);
  const REEL_ITEM_HEIGHT = reelAreaHeight;
  const overlayBottom = 10;
  const rightActionsBottom = 12;
  const heartScales = useRef<{ [key: string]: Animated.Value }>({});
  const lastTapRef = useRef<{ reelId: string; time: number }>({ reelId: '', time: 0 });
  const flatListRef = useRef<FlatList>(null);
  const prevOrientationRef = useRef(isLandscape);

  useEffect(() => {
    loadReels();
  }, []);

  useEffect(() => {
    if (user?.following) {
      setFollowingIds(prev => new Set([...prev, ...user.following]));
    }
  }, [user?.following]);

  // On orientation change: scroll to current reel so it stays in view and layout is correct
  useEffect(() => {
    if (prevOrientationRef.current !== isLandscape && reels.length > 0 && REEL_ITEM_HEIGHT > 0) {
      prevOrientationRef.current = isLandscape;
      const offset = Math.min(activeIndex * REEL_ITEM_HEIGHT, Math.max(0, reels.length * REEL_ITEM_HEIGHT - REEL_ITEM_HEIGHT));
      flatListRef.current?.scrollToOffset({ offset, animated: false });
    } else {
      prevOrientationRef.current = isLandscape;
    }
  }, [isLandscape, REEL_ITEM_HEIGHT, activeIndex, reels.length]);

  const loadReels = async () => {
    try {
      const data = await mockDataService.getReels();
      setReels(data);
      data.forEach(reel => {
        if (!heartScales.current[reel._id]) {
          heartScales.current[reel._id] = new Animated.Value(0);
        }
      });
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReels();
  }, []);

  const handleLikeReel = useCallback(
    async (reelId: string) => {
      if (!user) return;
      try {
        const updated = await mockDataService.likeReel(reelId);
        setReels(prev => prev.map(r => (r._id === reelId ? updated : r)));
      } catch (e) {
        console.error('Like reel error:', e);
      }
    },
    [user]
  );

  const triggerDoubleTapLike = useCallback(
    (item: Reel) => {
      const scale = heartScales.current[item._id] || new Animated.Value(0);
      heartScales.current[item._id] = scale;
      scale.setValue(0);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      handleLikeReel(item._id);
    },
    [handleLikeReel]
  );

  const handleReelPress = useCallback(
    (item: Reel) => {
      const now = Date.now();
      const { reelId, time } = lastTapRef.current;
      if (reelId === item._id && now - time < 350) {
        triggerDoubleTapLike(item);
        lastTapRef.current = { reelId: '', time: 0 };
        return;
      }
      lastTapRef.current = { reelId: item._id, time: now };
    },
    [triggerDoubleTapLike]
  );

  const handleOpenComments = useCallback((item: Reel) => {
    setSelectedReelForComments(item);
    setSheetComments(REEL_COMMENTS_MOCK);
    setSheetCommentText('');
    setCommentsSheetVisible(true);
  }, []);

  const handleCloseCommentsSheet = useCallback(() => {
    setCommentsSheetVisible(false);
    setSelectedReelForComments(null);
  }, []);

  const handleAddSheetComment = useCallback(() => {
    const trimmed = sheetCommentText.trim();
    if (!trimmed || !user) return;
    setSheetComments(prev => [
      { id: `${Date.now()}`, username: user.username, text: trimmed, timeAgo: 'Now', likeCount: 0 },
      ...prev,
    ]);
    setSheetCommentText('');
  }, [sheetCommentText, user]);

  const handleShareReel = useCallback(async (item: Reel) => {
    try {
      await Share.share({
        message: `Run Barbie🎀 – @${item.user?.username ?? 'user'} • ${item.caption ?? ''}`,
      });
    } catch {
      // user cancelled or share failed
    }
  }, []);

  const handleMoreReel = useCallback((item: Reel) => {
    setSelectedReelForMore(item);
    setMoreSheetVisible(true);
  }, []);

  const handleCloseMoreSheet = useCallback(() => {
    setMoreSheetVisible(false);
    setSelectedReelForMore(null);
  }, []);

  const handleFollowReelUser = useCallback(async (userId: string) => {
    if (!user) return;
    try {
      await mockDataService.followUser(userId);
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    } catch (e) {
      console.error('Follow error:', e);
    }
  }, [user]);

  const handleUsernamePress = useCallback(
    (item: Reel) => {
      if (item.userId === user?._id) {
        (navigation as any).navigate('Profile');
      } else {
        Alert.alert('Profile', `@${item.user?.username ?? 'user'}'s profile – coming soon`);
      }
    },
    [navigation, user?._id]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  // Instagram-style: only the fully visible reel counts as "viewable" (no half-item switching)
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 100,
    minimumViewTime: 50,
  }).current;

  const renderReelItem = useCallback(
    ({ item, index }: { item: Reel; index: number }) => {
      if (!heartScales.current[item._id]) {
        heartScales.current[item._id] = new Animated.Value(0);
      }
      return (
        <ReelCell
          item={item}
          index={index}
          isActive={index === activeIndex}
          muted={muted}
          isLiked={!!(user && item.likes.includes(user._id))}
          isFollowing={followingIds.has(item.userId)}
          overlayBottom={overlayBottom}
          rightActionsBottom={rightActionsBottom}
          screenWidth={SCREEN_WIDTH}
          reelItemHeight={REEL_ITEM_HEIGHT}
          scale={heartScales.current[item._id]!}
          onReelPress={handleReelPress}
          onLike={handleLikeReel}
          onComment={handleOpenComments}
          onShare={handleShareReel}
          onMore={handleMoreReel}
          onFollow={handleFollowReelUser}
          onUsernamePress={handleUsernamePress}
        />
      );
    },
    [activeIndex, muted, user, followingIds, overlayBottom, rightActionsBottom, SCREEN_WIDTH, REEL_ITEM_HEIGHT, handleReelPress, handleLikeReel, handleOpenComments, handleShareReel, handleMoreReel, handleFollowReelUser, handleUsernamePress]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: REEL_ITEM_HEIGHT,
      offset: REEL_ITEM_HEIGHT * index,
      index,
    }),
    [REEL_ITEM_HEIGHT]
  );

  if (loading && reels.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (reels.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Ionicons name="videocam-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No reels yet</Text>
          <Text style={styles.emptySubtext}>
            Short-form video from the community — check back soon
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadReels}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      {/* Reel area fills remaining space; measured height = no black gap */}
      <View
        style={styles.reelAreaWrapper}
        onLayout={e => setReelAreaHeight(e.nativeEvent.layout.height)}
      >
        <View style={[styles.reelListClip, { width: SCREEN_WIDTH }]}>
          <FlatList
          ref={flatListRef}
          data={reels}
          keyExtractor={item => item._id}
          renderItem={renderReelItem}
          extraData={{ activeIndex, muted }}
          style={styles.flatList}
          contentContainerStyle={styles.flatListContent}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={REEL_ITEM_HEIGHT}
          snapToAlignment="start"
          snapToStart
          disableIntervalMomentum
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          scrollEventThrottle={16}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF69B4"
            />
          }
        />
        </View>
      </View>
      {/* Mute toggle - fixed */}
      <TouchableOpacity
        style={styles.muteButton}
        onPress={() => setMuted(prev => !prev)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Comments bottom sheet (reel-style overlay) */}
      <Modal
        visible={commentsSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCommentsSheet}
      >
        <View style={styles.commentsSheetBackdropWrap}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseCommentsSheet}
          />
          <KeyboardAvoidingView
            style={styles.commentsSheetWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
            pointerEvents="box-none"
          >
            <View
              style={[styles.commentsSheet, { height: SCREEN_HEIGHT * 0.66 }]}
              pointerEvents="box-none"
            >
            <TouchableOpacity
              style={styles.commentsDragHandle}
              onPress={handleCloseCommentsSheet}
              activeOpacity={1}
            >
              <View style={styles.commentsDragLine} />
            </TouchableOpacity>
            <Text style={styles.commentsSheetTitle}>Comments</Text>

            <FlatList
              data={sheetComments}
              keyExtractor={item => item.id}
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              renderItem={({ item }) => (
                <View style={styles.sheetCommentRow}>
                  <View style={styles.sheetCommentLeft}>
                    <View style={styles.sheetCommentAvatar}>
                      <Ionicons name="person" size={18} color="#999" />
                    </View>
                    <View style={styles.sheetCommentBody}>
                      <Text style={styles.sheetCommentMeta}>
                        {item.username}  {item.timeAgo}
                      </Text>
                      <Text style={styles.sheetCommentText}>{item.text}</Text>
                      <TouchableOpacity activeOpacity={0.7} style={styles.sheetReplyBtn}>
                        <Text style={styles.sheetReplyText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.sheetCommentRight}>
                    <TouchableOpacity style={styles.sheetCommentLike} activeOpacity={0.7}>
                      <Ionicons name="heart-outline" size={18} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.sheetCommentLikeCount}>{item.likeCount}</Text>
                  </View>
                </View>
              )}
            />

            <View style={styles.sheetEmojiRow}>
              {EMOJI_QUICK.map((emoji, i) => (
                <TouchableOpacity key={i} style={styles.sheetEmojiBtn} activeOpacity={0.7}>
                  <Text style={styles.sheetEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetInputRow}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.sheetInputAvatar} />
              ) : (
                <View style={[styles.sheetInputAvatar, styles.sheetInputAvatarPlaceholder]}>
                  <Ionicons name="person" size={18} color="#999" />
                </View>
              )}
              <TextInput
                style={styles.sheetInput}
                value={sheetCommentText}
                onChangeText={setSheetCommentText}
                placeholder={`Add a comment for ${selectedReelForComments?.user?.username ?? 'user'}...`}
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity style={styles.sheetEmojiInputBtn} activeOpacity={0.7}>
                <Ionicons name="happy-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            </View>
        </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* More options bottom sheet (three dots) */}
      <Modal
        visible={moreSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseMoreSheet}
      >
        <View style={styles.moreSheetBackdropWrap}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseMoreSheet}
          />
          <View style={styles.moreSheetCard} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.moreSheetDragHandle}
              onPress={handleCloseMoreSheet}
              activeOpacity={1}
            >
              <View style={styles.moreSheetDragLine} />
            </TouchableOpacity>

            <View style={styles.moreSheetTopRow}>
              <TouchableOpacity style={styles.moreSheetTopBtn} activeOpacity={0.7}>
                <Ionicons name="bookmark-outline" size={28} color="#000" />
                <Text style={styles.moreSheetTopBtnLabel}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetTopBtn} activeOpacity={0.7}>
                <Ionicons name="refresh" size={28} color="#000" />
                <Text style={styles.moreSheetTopBtnLabel}>Remix</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetTopBtn} activeOpacity={0.7}>
                <Ionicons name="layers-outline" size={28} color="#000" />
                <Text style={styles.moreSheetTopBtnLabel}>Sequence</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moreSheetList}>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="expand-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>View fullscreen</Text>
              </TouchableOpacity>
              <View style={styles.moreSheetRow}>
                <Ionicons name="refresh-circle-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Auto scroll</Text>
                <View style={styles.moreSheetNewBadge}><Text style={styles.moreSheetNewText}>New</Text></View>
                <TouchableOpacity
                  style={[styles.moreSheetToggle, autoScrollOn && styles.moreSheetToggleOn]}
                  onPress={() => setAutoScrollOn(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.moreSheetToggleThumb, autoScrollOn && styles.moreSheetToggleThumbOn]} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Turn on Reels notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="information-circle-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Why you're seeing this post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="eye-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Interested</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="eye-off-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Not interested</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="flag-outline" size={22} color="#E53935" />
                <Text style={[styles.moreSheetRowText, styles.moreSheetRowTextDanger]}>Report...</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="settings-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Manage content preferences</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7}>
                <Ionicons name="options-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>See your algorithm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelAreaWrapper: {
    flex: 1,
    minHeight: 0,
  },
  reelListClip: {
    flex: 1,
    overflow: 'hidden',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FF69B4',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reelItem: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  activityBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 56 : 80,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 80,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameTouch: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF69B4',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  caption: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  muteButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 52 : 56,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  commentsSheetBackdropWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  commentsSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  commentsDragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  commentsDragLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
  },
  commentsSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sheetCommentLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  sheetCommentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sheetCommentBody: {
    flex: 1,
  },
  sheetCommentMeta: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  sheetCommentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  sheetReplyText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  sheetReplyBtn: {
    alignSelf: 'flex-start',
  },
  sheetCommentRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  sheetCommentLike: {
    padding: 4,
  },
  sheetCommentLikeCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sheetEmojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FAFAFA',
  },
  sheetEmojiBtn: {
    padding: 6,
  },
  sheetEmojiText: {
    fontSize: 22,
  },
  sheetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'android' ? 14 : 24,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#fff',
  },
  sheetInputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  sheetInputAvatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
  },
  sheetEmojiInputBtn: {
    marginLeft: 8,
    padding: 4,
  },
  moreSheetBackdropWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  moreSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 32,
    maxHeight: '85%',
  },
  moreSheetDragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  moreSheetDragLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
  },
  moreSheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  moreSheetTopBtn: {
    alignItems: 'center',
    width: 80,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  moreSheetTopBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginTop: 6,
  },
  moreSheetList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  moreSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  moreSheetRowText: {
    fontSize: 15,
    color: '#000',
    marginLeft: 14,
    flex: 1,
  },
  moreSheetRowTextDanger: {
    color: '#E53935',
  },
  moreSheetNewBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  moreSheetNewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  moreSheetToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  moreSheetToggleOn: {
    backgroundColor: '#FF69B4',
    justifyContent: 'flex-end',
  },
  moreSheetToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  moreSheetToggleThumbOn: {},
});

export default ReelsScreen;
