import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Reel } from '../types';
import { ActivityType } from '../types';
import { reelService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

// Tab bar height from AppNavigator (50 + paddingTop 5 + paddingBottom 5)
const TAB_BAR_HEIGHT = 60;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ReelComment {
  id: string;
  username: string;
  text: string;
  timeAgo: string;
  likeCount: number;
  parentId?: string;
  parentUsername?: string;
  timestamp?: number;
}

const REEL_COMMENTS_MOCK: ReelComment[] = [
  { id: '1', username: 'trail_runner', text: 'Looks like such a fun route! 🌲', timeAgo: '15h', likeCount: 181, timestamp: Date.now() - 15 * 3600000 },
  { id: '2', username: 'marathon_mike', text: 'Perfect tempo pace 🔥', timeAgo: '2d', likeCount: 80, timestamp: Date.now() - 2 * 86400000 },
  { id: '3', username: 'bike_lover', text: 'Those shoes are sick 👟', timeAgo: '1d', likeCount: 42, timestamp: Date.now() - 86400000 },
];

const EMOJI_QUICK = ['❤️', '👏', '🔥', '🙌', '😢', '😍', '😮', '😂'];

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  hike: 'Hike',
  cycle: 'Cycle',
  walk: 'Walk',
  other: 'Activity',
};

/** Single reel video using expo-video; only active reel plays (Instagram-style). Used when parent does not need the player (e.g. fullscreen modal). */
const ReelVideo: React.FC<{
  videoUri: string;
  isActive: boolean;
  muted: boolean;
}> = ({ videoUri, isActive, muted }) => {
  const player = useVideoPlayer(videoUri, p => {
    p.loop = true;
  });
  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      // Immediately stop and reset when inactive
      player.pause();
      try {
        player.currentTime = 0;
      } catch (e) {
        // Ignore errors
      }
    }
  }, [isActive, player]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!isActive) {
        player.pause();
        try {
          player.currentTime = 0;
        } catch (e) {
          // Ignore errors
        }
      }
    };
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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoContentFit, setVideoContentFit] = useState<'cover' | 'contain'>('cover');
  const player = useVideoPlayer(item.videoUri, p => {
    p.loop = true;
    // Optimize for longer videos: adjust update interval based on video length
    // For longer videos, use less frequent updates to reduce CPU usage
    p.timeUpdateEventInterval = 0.25;
    p.staysActiveInBackground = false;
    // Enable better buffering for longer videos
    p.playbackRate = 1.0;
  });
  
  // Detect video orientation and adjust contentFit
  useEffect(() => {
    let cancelled = false;
    
    const checkVideoDimensions = async () => {
      if (cancelled) return;
      
      // Check if player has naturalSize or dimensions
      if (player.status === 'readyToPlay' || player.status === 'playing') {
        try {
          // Try to get dimensions from player first
          const playerAny = player as any;
          const naturalSize = playerAny.naturalSize || playerAny.dimensions;
          
          if (naturalSize && naturalSize.width && naturalSize.height) {
            const aspectRatio = naturalSize.width / naturalSize.height;
            if (!cancelled) {
              setVideoContentFit(aspectRatio > 1 ? 'contain' : 'cover');
            }
            return;
          }
          
          // Try alternative: check if player has width/height properties directly
          const width = playerAny.width || playerAny.naturalWidth;
          const height = playerAny.height || playerAny.naturalHeight;
          if (width && height) {
            const aspectRatio = width / height;
            if (!cancelled) {
              setVideoContentFit(aspectRatio > 1 ? 'contain' : 'cover');
            }
            return;
          }
          
          // Fallback: use expo-video-thumbnails to get video dimensions
          try {
            const thumbnail = await VideoThumbnails.getThumbnailAsync(item.videoUri, {
              time: 0,
            });
            if (thumbnail && thumbnail.width && thumbnail.height && !cancelled) {
              const aspectRatio = thumbnail.width / thumbnail.height;
              setVideoContentFit(aspectRatio > 1 ? 'contain' : 'cover');
            }
          } catch (thumbError) {
            // If thumbnail generation fails, default to cover
            if (!cancelled) {
              setVideoContentFit('cover');
            }
          }
        } catch (e) {
          // If we can't detect dimensions, default to cover (portrait assumption)
          if (!cancelled) {
            setVideoContentFit('cover');
          }
        }
      }
    };

    const statusListener = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay' || status.status === 'playing') {
        // Small delay to ensure dimensions are available
        setTimeout(() => checkVideoDimensions(), 100);
      }
    });

    // Check immediately if already ready
    if (player.status === 'readyToPlay' || player.status === 'playing') {
      setTimeout(() => checkVideoDimensions(), 100);
    }

    return () => {
      cancelled = true;
      statusListener.remove();
    };
  }, [player, item.videoUri]);
  
  // Track video loading status - only show loading when video is actually not ready
  useEffect(() => {
    const handleStatusChange = (status: { status: string }) => {
      // Only update loading state if this reel is active
      if (!isActive) return;
      
      if (status.status === 'readyToPlay' || status.status === 'playing') {
        setIsLoading(false);
        setIsBuffering(false);
      } else if (status.status === 'loading' || status.status === 'idle') {
        setIsLoading(true);
        setIsBuffering(false);
      } else if (status.status === 'buffering') {
        setIsBuffering(true);
        setIsLoading(false);
      }
    };

    const statusListener = player.addListener('statusChange', handleStatusChange);

    // Check initial status when effect runs
    const updateStatusFromPlayer = () => {
      if (!isActive) {
        setIsLoading(false);
        setIsBuffering(false);
        return;
      }
      
      const currentStatus = player.status;
      if (currentStatus === 'readyToPlay' || currentStatus === 'playing') {
        setIsLoading(false);
        setIsBuffering(false);
      } else if (currentStatus === 'loading' || currentStatus === 'idle') {
        setIsLoading(true);
        setIsBuffering(false);
      } else if (currentStatus === 'buffering') {
        setIsBuffering(true);
        setIsLoading(false);
      }
    };

    updateStatusFromPlayer();

    return () => {
      statusListener.remove();
    };
  }, [player, isActive]);
  
  // Preload video when it's adjacent to active reel
  useEffect(() => {
    // Preload if this reel is near the active one (for smoother playback)
    // The video player will start buffering when created
    return () => {
      // Cleanup is handled by expo-video automatically
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      // Check if video is already ready before showing loading indicator
      const currentStatus = player.status;
      if (currentStatus === 'readyToPlay' || currentStatus === 'playing') {
        setIsLoading(false);
        setIsBuffering(false);
      } else {
        // Only show loading if video is not ready
        setIsLoading(true);
        setIsBuffering(false);
      }
      // Ensure we play the video
      player.play();
    } else {
      // When reel becomes inactive, immediately stop the video and reset
      // This prevents audio from continuing when scrolling
      player.pause();
      // Reset to beginning immediately to stop any audio
      try {
        player.currentTime = 0;
      } catch (e) {
        // Ignore errors if currentTime can't be set
      }
      // Hide loading indicator when reel becomes inactive
      setIsLoading(false);
      setIsBuffering(false);
    }
  }, [isActive, player]);
  
  // Additional cleanup: ensure video stops when component unmounts or becomes inactive
  useEffect(() => {
    return () => {
      // Cleanup: stop video when component unmounts
      if (!isActive) {
        player.pause();
        try {
          player.currentTime = 0;
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }, [isActive, player]);
  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  // Sync progress bar to real video currentTime/duration
  useEffect(() => {
    if (!isActive) {
      progressAnim.setValue(0);
      return;
    }
    const sync = () => {
      const duration = player.duration;
      const currentTime = player.currentTime;
      if (duration > 0) {
        const progress = Math.min(1, Math.max(0, currentTime / duration));
        progressAnim.setValue(progress);
      }
    };
    sync();
    const sub = player.addListener('timeUpdate', sync);
    return () => {
      sub.remove();
      progressAnim.setValue(0);
    };
  }, [isActive, player, progressAnim]);

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
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit={videoContentFit}
          nativeControls={false}
          {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
        />
        {/* Loading indicator overlay */}
        {(isLoading || isBuffering) && isActive && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>
              {isBuffering ? 'Buffering...' : 'Loading...'}
            </Text>
          </View>
        )}
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
      {/* Full-width progress bar (extends to right-side navs), synced to real video */}
      {isActive ? (
        <View style={styles.reelProgressBarFullWidth} pointerEvents="none">
          <View style={styles.reelProgressBarBg} />
          <Animated.View
            style={[
              styles.reelProgressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
});

const ReelsScreen: React.FC = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<{ params?: { initialReelId?: string; reportedReelId?: string; returnToSearch?: boolean } }>();
  const returnToSearch = route?.params?.returnToSearch;
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
  const [sheetCommentLikedIds, setSheetCommentLikedIds] = useState<Set<string>>(new Set());
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(new Set());
  const sheetInputRef = useRef<TextInput>(null);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [selectedReelForMore, setSelectedReelForMore] = useState<Reel | null>(null);
  const [autoScrollOn, setAutoScrollOn] = useState(false);
  const [savedReelIds, setSavedReelIds] = useState<Set<string>>(new Set());
  const [hiddenReelIds, setHiddenReelIds] = useState<Set<string>>(new Set());
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [reportedReelIds, setReportedReelIds] = useState<Set<string>>(new Set());
  const [fullscreenReel, setFullscreenReel] = useState<Reel | null>(null);
  const [deleteConfirmReelId, setDeleteConfirmReelId] = useState<string | null>(null);
  const [preloadedReels, setPreloadedReels] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { showToast } = useToast();
  // Use measured reel area height so video fills exactly (no black gap from miscalculation)
  const [reelAreaHeight, setReelAreaHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT - insets.top);
  const REEL_ITEM_HEIGHT = reelAreaHeight;
  const overlayBottom = 10;
  const rightActionsBottom = 12;
  const heartScales = useRef<{ [key: string]: Animated.Value }>({});
  const lastTapRef = useRef<{ reelId: string; time: number }>({ reelId: '', time: 0 });
  const flatListRef = useRef<FlatList>(null);
  const prevOrientationRef = useRef(isLandscape);
  const isScreenFocused = useIsFocused();

  useEffect(() => {
    loadReels();
  }, []);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadReels();
    }, [])
  );

  useEffect(() => {
    if (user?.following) {
      setFollowingIds(prev => new Set([...prev, ...user.following]));
    }
  }, [user?.following]);

  // Load saved reel IDs when user is present
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    userService.getSavedReels().then(list => {
      if (!cancelled) setSavedReelIds(new Set(list.map(r => r._id)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // When returning from ReportReel with reportedReelId, hide that reel
  const reportedReelId = route?.params?.reportedReelId;
  useEffect(() => {
    if (reportedReelId) {
      setReportedReelIds(prev => new Set(prev).add(reportedReelId));
      (navigation as any).setParams?.({ reportedReelId: undefined });
    }
  }, [reportedReelId, navigation]);

  // Handle back button press - if came from Search, return to Search tab
  useEffect(() => {
    if (!returnToSearch) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const root = navigation.getParent()?.getParent();
      if (root && 'navigate' in root) {
        (root as any).navigate('Search');
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [returnToSearch, navigation]);

  // When opened from Profile with initialReelId, scroll to that reel
  const initialReelId = route?.params?.initialReelId;
  useEffect(() => {
    const id = initialReelId;
    if (!id || reels.length === 0 || REEL_ITEM_HEIGHT <= 0) return;
    const idx = reels.findIndex(r => r._id === id);
    if (idx >= 0) {
      setActiveIndex(idx);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: idx * REEL_ITEM_HEIGHT, animated: false });
      }, 150);
    }
  }, [reels, initialReelId, REEL_ITEM_HEIGHT]);

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

  const filteredReels = useMemo(
    () =>
      reels.filter((r) => {
        const canSeeUser =
          !user || r.userId === user._id || (user.following ?? []).includes(r.userId);
        return (
          canSeeUser &&
          !hiddenReelIds.has(r._id) &&
          !mutedUserIds.has(r.userId) &&
          !reportedReelIds.has(r._id)
        );
      }),
    [reels, hiddenReelIds, mutedUserIds, reportedReelIds, user]
  );

  useEffect(() => {
    if (activeIndex >= filteredReels.length && filteredReels.length > 0) {
      setActiveIndex(Math.max(0, filteredReels.length - 1));
    }
  }, [filteredReels.length, activeIndex]);

  // Preload adjacent videos for smoother playback (optimize for longer videos)
  useEffect(() => {
    if (filteredReels.length === 0) return;
    
    const preloadIndices = [
      activeIndex - 1, // Previous reel
      activeIndex + 1, // Next reel
      activeIndex + 2, // Next next reel (for faster scrolling)
    ].filter(idx => idx >= 0 && idx < filteredReels.length);

    const newPreloaded = new Set(preloadedReels);
    preloadIndices.forEach(idx => {
      const reel = filteredReels[idx];
      if (reel) {
        newPreloaded.add(reel._id);
      }
    });
    setPreloadedReels(newPreloaded);
  }, [activeIndex, filteredReels]);

  const loadReels = async () => {
    try {
      const data = await reelService.getReels();
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

  const openCreateReel = useCallback(() => {
    (navigation as any).navigate('CreateReel');
  }, [navigation]);

  const handleLikeReel = useCallback(
    async (reelId: string) => {
      if (!user) return;
      try {
        const updated = await reelService.likeReel(reelId);
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
    setSheetCommentLikedIds(new Set());
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
    setExpandedReplyIds(new Set());
    setCommentsSheetVisible(true);
  }, []);

  const handleCloseCommentsSheet = useCallback(() => {
    setCommentsSheetVisible(false);
    setSelectedReelForComments(null);
  }, []);

  const handleAddSheetComment = useCallback(() => {
    const trimmed = sheetCommentText.trim();
    if (!trimmed || !user) return;
    const now = Date.now();
    const newComment: ReelComment = {
      id: `${now}`,
      username: user.username,
      text: trimmed,
      timeAgo: 'Now',
      likeCount: 0,
      timestamp: now,
      ...(replyingToCommentId && replyingToUsername
        ? { parentId: replyingToCommentId, parentUsername: replyingToUsername }
        : {}),
    };
    setSheetComments(prev => [...prev, newComment]);
    setSheetCommentText('');
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
  }, [sheetCommentText, user, replyingToCommentId, replyingToUsername]);

  const handleReplyToComment = useCallback((item: ReelComment) => {
    setReplyingToCommentId(item.id);
    setReplyingToUsername(item.username);
    setSheetCommentText('');
    setTimeout(() => sheetInputRef.current?.focus(), 100);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingToCommentId(null);
    setReplyingToUsername(null);
  }, []);

  type SheetCommentListItem =
    | { type: 'comment'; item: ReelComment }
    | { type: 'viewReplies'; parentId: string; parentUsername: string; count: number };

  const sheetCommentsForList = useMemo((): SheetCommentListItem[] => {
    const topLevel = sheetComments
      .filter(c => !c.parentId)
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    const expanded = expandedReplyIds;
    return topLevel.flatMap(parent => {
      const replies = sheetComments
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
      const items: SheetCommentListItem[] = [{ type: 'comment', item: parent }];
      if (replies.length > 0) {
        if (expanded.has(parent.id)) {
          replies.forEach(r => items.push({ type: 'comment', item: r }));
        } else {
          items.push({
            type: 'viewReplies',
            parentId: parent.id,
            parentUsername: parent.username,
            count: replies.length,
          });
        }
      }
      return items;
    });
  }, [sheetComments, expandedReplyIds]);

  const handleToggleViewReplies = useCallback((parentId: string) => {
    setExpandedReplyIds(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  const handleToggleCommentLike = useCallback((commentId: string) => {
    setSheetCommentLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const handleEmojiQuickPress = useCallback((emoji: string) => {
    setSheetCommentText(prev => prev + emoji);
  }, []);

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

  const handleSaveReel = useCallback(async () => {
    if (!selectedReelForMore || !user) return;
    const id = selectedReelForMore._id;
    const wasSaved = savedReelIds.has(id);
    try {
      if (wasSaved) {
        await reelService.unbookmarkReel(id);
        setSavedReelIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        handleCloseMoreSheet();
        showToast('Removed from saved', 'success');
      } else {
        await reelService.bookmarkReel(id);
        setSavedReelIds(prev => new Set(prev).add(id));
        handleCloseMoreSheet();
        showToast('Reel saved to your list', 'success');
      }
    } catch (e) {
      showToast('Failed to update saved list', 'info');
    }
  }, [selectedReelForMore, savedReelIds, user, handleCloseMoreSheet, showToast]);

  const handleAddToRunList = useCallback(async () => {
    if (!selectedReelForMore || !user) return;
    const id = selectedReelForMore._id;
    const alreadySaved = savedReelIds.has(id);
    try {
      if (!alreadySaved) {
        await reelService.bookmarkReel(id);
        setSavedReelIds(prev => new Set(prev).add(id));
      }
      handleCloseMoreSheet();
      showToast(alreadySaved ? 'Already in your list' : 'Added to your run list', 'success');
      (navigation as any).navigate('SavedReels');
    } catch (e) {
      showToast('Failed to add to list', 'info');
    }
  }, [selectedReelForMore, savedReelIds, user, handleCloseMoreSheet, showToast, navigation]);

  const handleViewFullscreen = useCallback(() => {
    if (selectedReelForMore) setFullscreenReel(selectedReelForMore);
    handleCloseMoreSheet();
  }, [selectedReelForMore, handleCloseMoreSheet]);

  const handleShowFewerLikeThis = useCallback(() => {
    if (!selectedReelForMore) return;
    setHiddenReelIds(prev => new Set(prev).add(selectedReelForMore._id));
    showToast("We'll show fewer reels like this", 'info');
    handleCloseMoreSheet();
  }, [selectedReelForMore, handleCloseMoreSheet, showToast]);

  const handleMuteRunner = useCallback(() => {
    if (!selectedReelForMore) return;
    setMutedUserIds(prev => new Set(prev).add(selectedReelForMore.userId));
    showToast(`You won't see reels from @${selectedReelForMore.user?.username ?? 'this runner'} anymore`, 'info');
    handleCloseMoreSheet();
  }, [selectedReelForMore, handleCloseMoreSheet, showToast]);

  const handleCopyLink = useCallback(() => {
    if (!selectedReelForMore) return;
    Share.share({
      message: `Check out this run on Run Barbie 🎀\nhttps://runbarbie.app/reel/${selectedReelForMore._id}`,
      title: 'Run Barbie',
    }).catch(() => {});
    handleCloseMoreSheet();
  }, [selectedReelForMore, handleCloseMoreSheet]);

  const handleReportReel = useCallback(() => {
    if (!selectedReelForMore) return;
    if (!user) {
      showToast('Sign in to report', 'info');
      handleCloseMoreSheet();
      return;
    }
    handleCloseMoreSheet();
    (navigation as any).navigate('ReportReel', { reelId: selectedReelForMore._id });
  }, [selectedReelForMore, user, showToast, handleCloseMoreSheet, navigation]);

  const handleDeleteReel = useCallback(() => {
    if (!selectedReelForMore || !user || selectedReelForMore.userId !== user._id) return;
    handleCloseMoreSheet();
    setDeleteConfirmReelId(selectedReelForMore._id);
  }, [selectedReelForMore, user, handleCloseMoreSheet]);

  const handleConfirmDeleteReel = useCallback(async () => {
    const id = deleteConfirmReelId;
    setDeleteConfirmReelId(null);
    if (!id) return;
    try {
      await reelService.deleteReel(id);
      setReels(prev => prev.filter(r => r._id !== id));
      showToast('Reel deleted', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete reel', 'error');
    }
  }, [deleteConfirmReelId, showToast]);

  const handleFollowReelUser = useCallback(async (userId: string) => {
    if (!user) return;
    try {
      await userService.followUser(userId);
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
        const newIndex = viewableItems[0].index;
        // Only update if index actually changed to prevent unnecessary re-renders
        if (newIndex !== activeIndex) {
          setActiveIndex(newIndex);
        }
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
          isActive={index === activeIndex && isScreenFocused}
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
    [activeIndex, isScreenFocused, muted, user, followingIds, overlayBottom, rightActionsBottom, SCREEN_WIDTH, REEL_ITEM_HEIGHT, handleReelPress, handleLikeReel, handleOpenComments, handleShareReel, handleMoreReel, handleFollowReelUser, handleUsernamePress]
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
        <TouchableOpacity
          style={[styles.createReelBtn, { top: insets.top + 8 }]}
          onPress={openCreateReel}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={36} color="#fff" />
        </TouchableOpacity>
        <View style={styles.emptyWrap}>
          <Ionicons name="videocam-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No reels yet</Text>
          <Text style={styles.emptySubtext}>
            Short-form video from the community — or create your first reel
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={openCreateReel}>
            <Text style={styles.retryBtnText}>Create reel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryBtn, { marginTop: 8 }]} onPress={loadReels}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={isScreenFocused ? 'light' : 'dark'} />
      {/* Create reel button - top left */}
      <TouchableOpacity
        style={[styles.createReelBtn, { top: insets.top + 8 }]}
        onPress={openCreateReel}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={36} color="#fff" />
      </TouchableOpacity>
      {/* Saved reels button - top right, below mute button */}
      <TouchableOpacity
        style={[styles.createReelBtn, { left: undefined, right: 16, top: (Platform.OS === 'android' ? 52 : 56) + 44 + 12 }]}
        onPress={() => (navigation as any).navigate('SavedReels')}
        activeOpacity={0.8}
      >
        <Ionicons name="bookmark-outline" size={26} color="#fff" />
      </TouchableOpacity>
      {/* Reel area fills remaining space; measured height = no black gap */}
      <View
        style={styles.reelAreaWrapper}
        onLayout={e => setReelAreaHeight(e.nativeEvent.layout.height)}
      >
        <View style={[styles.reelListClip, { width: SCREEN_WIDTH }]}>
          <FlatList
          ref={flatListRef}
          data={filteredReels}
          keyExtractor={item => item._id}
          renderItem={renderReelItem}
          extraData={{ activeIndex, muted, isScreenFocused }}
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
          // Optimize for longer videos: maintain smaller render window
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={null}
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
              data={sheetCommentsForList}
              keyExtractor={item => item.type === 'comment' ? item.item.id : `view-${item.parentId}`}
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              renderItem={({ item: row }) => {
                if (row.type === 'viewReplies') {
                  const isExpanded = expandedReplyIds.has(row.parentId);
                  const label = row.count === 1 ? 'View 1 reply' : `View ${row.count} replies`;
                  return (
                    <TouchableOpacity
                      style={styles.sheetViewRepliesRow}
                      activeOpacity={0.7}
                      onPress={() => handleToggleViewReplies(row.parentId)}
                    >
                      <View style={styles.sheetViewRepliesLine} />
                      <Text style={styles.sheetViewRepliesText}>{isExpanded ? 'Hide replies' : label}</Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#0095F6" />
                    </TouchableOpacity>
                  );
                }
                const item = row.item;
                const isLiked = sheetCommentLikedIds.has(item.id);
                const displayCount = item.likeCount + (isLiked ? 1 : 0);
                const isReply = !!item.parentId;
                return (
                  <View style={[styles.sheetCommentRow, isReply && styles.sheetCommentRowReply]}>
                    <View style={styles.sheetCommentLeft}>
                      <View style={styles.sheetCommentAvatar}>
                        <Ionicons name="person" size={18} color="#999" />
                      </View>
                      <View style={styles.sheetCommentBody}>
                        {isReply && item.parentUsername && (
                          <Text style={styles.sheetReplyTo}>Replying to @{item.parentUsername}</Text>
                        )}
                        <Text style={styles.sheetCommentMeta}>
                          {item.username}  {item.timeAgo}
                        </Text>
                        <Text style={styles.sheetCommentText}>{item.text}</Text>
                        <TouchableOpacity activeOpacity={0.7} style={styles.sheetReplyBtn} onPress={() => handleReplyToComment(item)}>
                          <Text style={styles.sheetReplyText}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.sheetCommentRight}>
                      <TouchableOpacity style={styles.sheetCommentLike} activeOpacity={0.7} onPress={() => handleToggleCommentLike(item.id)}>
                        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#FF3B5C' : '#333'} />
                      </TouchableOpacity>
                      <Text style={styles.sheetCommentLikeCount}>{displayCount}</Text>
                    </View>
                  </View>
                );
              }}
            />

            <View style={styles.sheetEmojiRow}>
              {EMOJI_QUICK.map((emoji, i) => (
                <TouchableOpacity key={i} style={styles.sheetEmojiBtn} activeOpacity={0.7} onPress={() => handleEmojiQuickPress(emoji)}>
                  <Text style={styles.sheetEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {replyingToCommentId && replyingToUsername && (
              <View style={styles.sheetReplyingToRow}>
                <Text style={styles.sheetReplyingToText}>Replying to @{replyingToUsername}</Text>
                <TouchableOpacity onPress={handleCancelReply} style={styles.sheetReplyingToCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.sheetInputRow}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.sheetInputAvatar} />
              ) : (
                <View style={[styles.sheetInputAvatar, styles.sheetInputAvatarPlaceholder]}>
                  <Ionicons name="person" size={18} color="#999" />
                </View>
              )}
              <TextInput
                ref={sheetInputRef}
                style={styles.sheetInput}
                value={sheetCommentText}
                onChangeText={setSheetCommentText}
                placeholder={replyingToUsername ? `Reply to @${replyingToUsername}...` : `Add a comment for ${selectedReelForComments?.user?.username ?? 'user'}...`}
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                onSubmitEditing={handleAddSheetComment}
              />
              <TouchableOpacity style={styles.sheetEmojiInputBtn} activeOpacity={0.7} onPress={() => handleEmojiQuickPress('😊')}>
                <Ionicons name="happy-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetSendBtn} activeOpacity={0.7} onPress={handleAddSheetComment}>
                <Ionicons name="send" size={22} color={sheetCommentText.trim() ? '#0095F6' : '#ccc'} />
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
              <TouchableOpacity style={styles.moreSheetTopBtn} activeOpacity={0.7} onPress={handleSaveReel}>
                <Ionicons name={selectedReelForMore && savedReelIds.has(selectedReelForMore._id) ? 'bookmark' : 'bookmark-outline'} size={28} color="#000" />
                <Text style={styles.moreSheetTopBtnLabel}>{selectedReelForMore && savedReelIds.has(selectedReelForMore._id) ? 'Saved' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetTopBtn} activeOpacity={0.7} onPress={() => { selectedReelForMore && handleShareReel(selectedReelForMore); handleCloseMoreSheet(); }}>
                <Ionicons name="share-outline" size={28} color="#000" />
                <Text style={styles.moreSheetTopBtnLabel}>Share run</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetTopBtn} activeOpacity={0.7} onPress={handleAddToRunList}>
                <Ionicons name="list-outline" size={28} color="#000" />
                <Text style={styles.moreSheetTopBtnLabel}>Run list</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moreSheetList}>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7} onPress={handleViewFullscreen}>
                <Ionicons name="expand-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>View fullscreen</Text>
              </TouchableOpacity>
              <View style={styles.moreSheetRow}>
                <Ionicons name="refresh-circle-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Auto scroll</Text>
                <TouchableOpacity
                  style={[styles.moreSheetToggle, autoScrollOn && styles.moreSheetToggleOn]}
                  onPress={() => setAutoScrollOn(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.moreSheetToggleThumb, autoScrollOn && styles.moreSheetToggleThumbOn]} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7} onPress={handleShowFewerLikeThis}>
                <Ionicons name="eye-off-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Show fewer like this</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7} onPress={handleMuteRunner}>
                <Ionicons name="person-remove-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Mute this runner</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7} onPress={handleCopyLink}>
                <Ionicons name="link-outline" size={22} color="#000" />
                <Text style={styles.moreSheetRowText}>Copy link</Text>
              </TouchableOpacity>
              {selectedReelForMore && user && selectedReelForMore.userId === user._id && (
                <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7} onPress={handleDeleteReel}>
                  <Ionicons name="trash-outline" size={22} color="#E53935" />
                  <Text style={[styles.moreSheetRowText, styles.moreSheetRowTextDanger]}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.moreSheetRow} activeOpacity={0.7} onPress={handleReportReel}>
                <Ionicons name="flag-outline" size={22} color="#E53935" />
                <Text style={[styles.moreSheetRowText, styles.moreSheetRowTextDanger]}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteConfirmReelId}
        onClose={() => setDeleteConfirmReelId(null)}
        title="Delete reel?"
        message="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteReel}
        destructive
        icon="trash-outline"
      />

      {/* Fullscreen reel modal */}
      <Modal
        visible={!!fullscreenReel}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenReel(null)}
        statusBarTranslucent
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {fullscreenReel && (
            <ReelVideo videoUri={fullscreenReel.videoUri} isActive={true} muted={muted} />
          )}
          <TouchableOpacity
            style={styles.fullscreenCloseBtn}
            onPress={() => setFullscreenReel(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
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
  createReelBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    backgroundColor: '#000', // Black background for letterboxing when using contain
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  reelProgressBarFullWidth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    overflow: 'hidden',
    zIndex: 10,
  },
  reelProgressBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  reelProgressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 1,
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
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginTop: 6,
  },
  durationIcon: {
    marginRight: 4,
  },
  duration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
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
  sheetCommentRowReply: {
    marginLeft: 28,
  },
  sheetViewRepliesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 28,
    marginBottom: 14,
    paddingVertical: 4,
  },
  sheetViewRepliesLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DDD',
    marginRight: 12,
    borderRadius: 1,
  },
  sheetViewRepliesText: {
    fontSize: 13,
    color: '#0095F6',
    fontWeight: '600',
    marginRight: 4,
  },
  sheetReplyTo: {
    fontSize: 12,
    color: '#0095F6',
    marginBottom: 2,
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
  sheetReplyingToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  sheetReplyingToText: {
    fontSize: 13,
    color: '#666',
  },
  sheetReplyingToCancel: {
    padding: 4,
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
  sheetSendBtn: {
    marginLeft: 6,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreSheetBackdropWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moreSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'android' ? 28 : 36,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  moreSheetDragHandle: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  moreSheetDragLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
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
