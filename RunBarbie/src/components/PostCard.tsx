import React, { useState, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Share,
  Modal,
  Pressable,
  Linking,
  ScrollView,
  TextInput,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Post } from '../types';
import { getTimeAgo } from '../utils/timeAgo';
import { formatDurationMinutes } from '../utils/formatDuration';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../navigation/types';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { postService, userService } from '../services/api';
import { DEFAULT_AVATAR_URI } from '../utils/defaultAvatar';
import ConfirmModal from './ConfirmModal';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  currentUserId?: string;
  saved?: boolean;
  onBookmark?: (postId: string) => void;
  onHidePost?: (postId: string) => void;
  onMuteUser?: (userId: string) => void;
  onDelete?: (postId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_ASPECT_RATIO = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DOUBLE_TAP_DELAY = 300;

const ACTIVITY_CONFIG: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; label: string }> = {
  run: { icon: 'run-fast', color: '#FF69B4', label: 'Run' }, // overridden by theme when rendering
  hike: { icon: 'hiking', color: '#2E7D32', label: 'Hike' },
  cycle: { icon: 'bike', color: '#1565C0', label: 'Cycle' },
  walk: { icon: 'walk', color: '#6A1B9A', label: 'Walk' },
  other: { icon: 'run', color: '#757575', label: 'Activity' },
};

type PostCardNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;

/**
 * ZoomableImage - Component that supports pinch-to-zoom with smooth animations and auto-reset
 */
const ZoomableImage: React.FC<{
  uri: string;
  style: any;
  onPress: () => void;
  onDoubleTap?: () => void;
}> = ({ uri, style, onPress, onDoubleTap }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const isZoomed = useRef(false);
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const scaleAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const resetZoom = useCallback(() => {
    // Cancel any ongoing animation
    if (scaleAnimation.current) {
      scaleAnimation.current.stop();
    }
    
    // Smooth spring animation back to original size
    scaleAnimation.current = Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]);
    
    scaleAnimation.current.start(() => {
      scaleAnimation.current = null;
    });
    
    lastScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
    isZoomed.current = false;
  }, [scale, translateX, translateY]);

  const handleDoubleTap = useCallback(() => {
    // Double tap is disabled (no zoom / like)
    onPress();
  }, [onPress]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Check if it's a pinch gesture (2 touches)
        if (evt.nativeEvent.touches.length === 2) {
          return true;
        }
        // Allow panning when zoomed
        return isZoomed.current;
      },
      onPanResponderGrant: (evt) => {
        // Cancel any ongoing animation
        if (scaleAnimation.current) {
          scaleAnimation.current.stop();
          scaleAnimation.current = null;
        }
        
        if (evt.nativeEvent.touches.length === 2) {
          // Pinch gesture started
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          initialDistance.current = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          initialScale.current = lastScale.current;
        } else {
          // Pan gesture started
          scale.setOffset(lastScale.current);
          translateX.setOffset(lastTranslate.current.x);
          translateY.setOffset(lastTranslate.current.y);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2 && initialDistance.current !== null) {
          // Handle pinch gesture with smooth scaling
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const currentDistance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          const newScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, (initialScale.current * currentDistance) / initialDistance.current)
          );
          
          // Use setValue for immediate, smooth updates during pinch
          scale.setValue(newScale);
          isZoomed.current = newScale > 1.05;
        } else if (isZoomed.current) {
          // Handle pan gesture when zoomed - smooth panning
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        scale.flattenOffset();
        translateX.flattenOffset();
        translateY.flattenOffset();
        
        const currentScale = (scale as any)._value || lastScale.current;
        lastScale.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale));
        lastTranslate.current = {
          x: (translateX as any)._value || 0,
          y: (translateY as any)._value || 0,
        };
        
        // Always reset zoom smoothly when released
        resetZoom();
        
        // Reset initial distance for next pinch
        initialDistance.current = null;
      },
    })
  ).current;

  return (
    <View style={style} {...panResponder.panHandlers}>
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            transform: [
              { scale },
              { translateX },
              { translateY },
            ],
          }}
        >
          <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};

/**
 * PostCard - Instagram-style post with activity badge, timestamp, double-tap like, comment count, shadow
 */
const PostCard: React.FC<PostCardProps> = ({ post, onLike, currentUserId, saved: savedProp = false, onBookmark, onHidePost, onMuteUser, onDelete }) => {
  const { palette } = useTheme();
  const imageUrls = (post.images && post.images.length > 0) ? post.images : [post.image];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [savedLocal, setSavedLocal] = useState(false);
  const saved = onBookmark ? savedProp : savedLocal;
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [editCaptionVisible, setEditCaptionVisible] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [editSaving, setEditSaving] = useState(false);
  const [likersModalVisible, setLikersModalVisible] = useState(false);
  const [likers, setLikers] = useState<{ _id: string; username: string; avatar?: string }[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;
  const navigation = useNavigation<PostCardNav>();
  const { showToast } = useToast();

  const openLikersModal = useCallback(async () => {
    if (post.likes.length === 0) return;
    setLikersModalVisible(true);
    setLikersLoading(true);
    try {
      const list = await postService.getPostLikers(post._id);
      setLikers(list ?? []);
    } catch (e) {
      setLikers([]);
    } finally {
      setLikersLoading(false);
    }
  }, [post._id, post.likes.length]);

  const handleLikerPress = useCallback(
    (user: { _id: string; username: string; avatar?: string }) => {
      setLikersModalVisible(false);
      if (user._id === currentUserId) return;
      navigation.navigate('UserProfile', {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
      });
    },
    [currentUserId, navigation]
  );

  const user = post.user ?? (post as { userId?: { username?: string; avatar?: string; bio?: string } }).userId;
  const safeUser = user ? { username: user.username ?? 'Unknown', avatar: user.avatar ?? '', bio: user.bio ?? '' } : { username: 'Unknown', avatar: '', bio: '' };

  const closeAndToast = (message: string, type: 'success' | 'info' = 'info') => {
    setOptionsVisible(false);
    showToast(message, type);
  };

  const totalImages = imageUrls.length;
  const showCarouselIndicator = totalImages > 1;
  const baseConfig = ACTIVITY_CONFIG[post.activityType] || ACTIVITY_CONFIG.other;
  const activityConfig = post.activityType === 'run' ? { ...baseConfig, color: palette.primary } : baseConfig;
  const commentCount = post.commentCount ?? 0;

  const handleImagePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      lastTap.current = 0;
      onLike(post._id);
      setShowHeart(true);
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 800,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowHeart(false);
        heartOpacity.setValue(0);
      });
    } else {
      lastTap.current = now;
    }
  };

  const handleOpenComments = () => {
    navigation.navigate('Comments', {
      postId: post._id,
      username: safeUser.username,
      caption: post.caption,
      image: imageUrls[0],
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Run Barbie🎀 - ${safeUser.username} • ${post.caption}`,
      });
    } catch {
      // ignore
    }
  };

  const handleToggleSave = () => {
    if (onBookmark) {
      onBookmark(post._id);
      setOptionsVisible(false);
      // Toast is shown by parent (e.g. FeedScreen) after API completes to avoid double toast
    } else {
      const next = !saved;
      setSavedLocal(next);
      setOptionsVisible(false);
      showToast(next ? 'Run saved' : 'Run removed from saved', 'success');
    }
  };

  const handleSetGoal = () => {
    setOptionsVisible(false);
    navigation.navigate('AddGoal', { post });
  };
  const handleCopyLink = () => {
    setOptionsVisible(false);
    const url = `https://runbarbie.app/post/${post._id}`;
    Share.share({ message: url, title: 'Post link' }).catch(() => {});
    showToast('Link ready – share to copy', 'info');
  };
  const handleViewSavedRuns = () => {
    setOptionsVisible(false);
    navigation.navigate('SavedPosts');
  };
  const handleMuteAthlete = () => {
    onMuteUser?.(post.userId);
    closeAndToast(`Muted @${safeUser.username}`, 'info');
  };
  const handleSaveRouteIdea = async () => {
    if (!post.location || post.location.latitude == null || post.location.longitude == null) {
      closeAndToast('This post has no location to save', 'info');
      return;
    }
    try {
      await userService.addSavedRoute({
        postId: post._id,
        name: post.location?.name,
        latitude: post.location?.latitude,
        longitude: post.location?.longitude,
      });
      setOptionsVisible(false);
      showToast('Route idea saved', 'success');
      navigation.navigate('SavedRoutes');
    } catch (e) {
      closeAndToast(e instanceof Error ? e.message : 'Could not save route', 'info');
    }
  };
  const handleViewProfile = () => {
    setOptionsVisible(false);
    navigation.navigate('UserProfile', {
      userId: post.userId,
      username: safeUser.username,
      avatar: safeUser.avatar,
      bio: safeUser.bio,
    });
  };
  const handleHidePost = () => {
    onHidePost?.(post._id);
    closeAndToast('Post hidden', 'info');
  };
  const handleReport = () => {
    setOptionsVisible(false);
    navigation.navigate('Report', { postId: post._id });
  };

  const handleEditCaption = () => {
    if (!isOwnPost) return;
    setEditedCaption(post.caption);
    setOptionsVisible(false);
    setEditCaptionVisible(true);
  };

  const handleSaveCaption = async () => {
    if (!isOwnPost) return;
    const trimmed = editedCaption.trim();
    if (!trimmed) {
      setEditedCaption(post.caption);
      setEditCaptionVisible(false);
      return;
    }
    try {
      setEditSaving(true);
      const updated = await postService.updatePost(post._id, { caption: trimmed });
      // Optimistically update caption on the current card
      (post as Post).caption = updated.caption;
      setEditCaptionVisible(false);
      showToast('Caption updated', 'success');
    } catch (e) {
      showToast('Could not update caption', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const postOwnerId = (post.user && (post.user as { _id?: string })._id) || post.userId;
  const isOwnPost = !!currentUserId && !!postOwnerId && postOwnerId === currentUserId;

  const handleDelete = () => {
    setOptionsVisible(false);
    if (!isOwnPost || !onDelete) return;
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    setDeleteConfirmVisible(false);
    onDelete?.(post._id);
  };

  const handleViewOnMap = () => {
    if (!post.location) return;
    const { latitude, longitude } = post.location;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleMenu = () => {
    setOptionsVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header: Profile, username, activity badge, timestamp, menu */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: safeUser.avatar || DEFAULT_AVATAR_URI }}
            style={styles.profilePicture}
          />
          <View style={styles.headerTextRow}>
            <Text style={styles.username}>{safeUser.username}</Text>
            <View style={[styles.activityBadge, { backgroundColor: `${activityConfig.color}20` }]}>
              <MaterialCommunityIcons name={activityConfig.icon} size={12} color={activityConfig.color} />
              <Text style={[styles.activityBadgeText, { color: activityConfig.color }]}>{activityConfig.label}</Text>
            </View>
          </View>
          {post.createdAt ? (
            <Text style={styles.timestamp}>{getTimeAgo(post.createdAt)}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={handleMenu} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Main Image(s): double-tap to like with heart animation; multi-image uses per-page tap so ScrollView can receive swipes */}
      <View style={styles.imageContainer}>
        {totalImages > 1 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
            contentContainerStyle={{ width: SCREEN_WIDTH * totalImages }}
            style={styles.imageScroll}
          >
            {imageUrls.map((uri, index) => (
              <View key={index} style={styles.imagePage}>
                <ZoomableImage
                  uri={uri}
                  style={[styles.image, { width: SCREEN_WIDTH, height: SCREEN_WIDTH * IMAGE_ASPECT_RATIO }]}
                  onPress={handleImagePress}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ZoomableImage
            uri={imageUrls[0]}
            style={[styles.image, { height: SCREEN_WIDTH * IMAGE_ASPECT_RATIO }]}
            onPress={handleImagePress}
          />
        )}
        {showHeart && (
          <Animated.View
            style={[
              styles.heartOverlay,
              {
                opacity: heartOpacity,
                transform: [{ scale: heartScale }],
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={80} color={palette.primary} />
          </Animated.View>
        )}
        {showCarouselIndicator && (
          <View style={styles.carouselIndicator} pointerEvents="none">
            <Text style={styles.carouselText}>
              {currentImageIndex + 1}/{totalImages}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons - pink heart when liked */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={() => onLike(post._id)} style={styles.actionButton}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? palette.primary : '#000'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenComments}>
            <Ionicons name="chatbubble-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="paper-plane-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={handleToggleSave}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={saved ? '#000' : '#000'}
          />
        </TouchableOpacity>
      </View>

      {post.likes.length > 0 && (
        <TouchableOpacity style={styles.likesSection} onPress={openLikersModal} activeOpacity={0.7}>
          <Text style={styles.likesText}>
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Likers list modal (TikTok-style) */}
      <Modal
        visible={likersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLikersModalVisible(false)}
      >
        <Pressable style={styles.likersBackdrop} onPress={() => setLikersModalVisible(false)}>
          <Pressable style={styles.likersSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.likersHandle} />
            <View style={styles.likersHeader}>
              <Text style={styles.likersTitle}>Liked by</Text>
              <TouchableOpacity onPress={() => setLikersModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {likersLoading ? (
              <View style={styles.likersLoading}>
                <Text style={styles.likersLoadingText}>Loading...</Text>
              </View>
            ) : likers.length === 0 ? (
              <View style={styles.likersLoading}>
                <Text style={styles.likersEmptyText}>No likes yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.likersList} contentContainerStyle={styles.likersListContent}>
                {likers.map((u) => (
                  <TouchableOpacity
                    key={u._id}
                    style={styles.likersRow}
                    onPress={() => handleLikerPress(u)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: u.avatar || DEFAULT_AVATAR_URI }}
                      style={styles.likersAvatar}
                    />
                    <Text style={styles.likersUsername}>@{u.username}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.captionSection}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{safeUser.username}</Text>{' '}
          {post.caption}
        </Text>
      </View>

      {/* Comment count – real from API */}
      {commentCount > 0 ? (
        <TouchableOpacity style={styles.commentsLink} onPress={handleOpenComments}>
          <Text style={styles.commentsLinkText}>View all {commentCount} comments</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.commentsLink} onPress={handleOpenComments}>
          <Text style={styles.commentsLinkText}>Add a comment...</Text>
        </TouchableOpacity>
      )}

      {(post.distance || post.duration) && (
        <View style={styles.statsSection}>
          {post.distance && <Text style={styles.statText}>📏 {post.distance} km</Text>}
          {post.duration != null && post.duration > 0 && (
            <Text style={styles.statText}>⏱️ {formatDurationMinutes(post.duration)}</Text>
          )}
        </View>
      )}

      {post.location && (
        <TouchableOpacity style={styles.locationSection} onPress={handleViewOnMap} activeOpacity={0.7}>
          <Ionicons name="location" size={16} color="#0095F6" style={styles.locationIcon} />
          <Text style={styles.locationName} numberOfLines={1}>{post.location.name ?? 'Pinned location'}</Text>
          <Text style={styles.viewOnMapText}>View on map</Text>
          <Ionicons name="open-outline" size={14} color="#0095F6" />
        </TouchableOpacity>
      )}

      {/* Bottom sheet-style options, Instagram-like */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setOptionsVisible(false)}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            {/* Run Barbie-themed quick actions: Copy link, Share, Set goal (save is only in action bar) */}
            <View style={styles.sheetIconRow}>
              <TouchableOpacity
                style={styles.sheetIconCard}
                onPress={handleCopyLink}
                activeOpacity={0.8}
              >
                <Ionicons name="link-outline" size={22} color="#000" />
                <Text style={styles.sheetIconLabel}>Copy link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetIconCard}
                onPress={() => {
                  setOptionsVisible(false);
                  handleShare();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={22} color="#000" />
                <Text style={styles.sheetIconLabel}>Share vibe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetIconCard}
                onPress={handleSetGoal}
                activeOpacity={0.8}
              >
                <Ionicons name="flag-outline" size={22} color="#000" />
                <Text style={styles.sheetIconLabel}>Set goal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetList}>
              <TouchableOpacity style={styles.sheetItem} onPress={handleViewSavedRuns} activeOpacity={0.8}>
                <Ionicons name="bookmark-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>View saved runs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} onPress={handleMuteAthlete} activeOpacity={0.8}>
                <Ionicons name="notifications-off-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Mute this athlete</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} onPress={handleSaveRouteIdea} activeOpacity={0.8}>
                <Ionicons name="trail-sign-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Save route idea</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} onPress={handleViewProfile} activeOpacity={0.8}>
                <Ionicons name="information-circle-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>View athlete profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} onPress={handleHidePost} activeOpacity={0.8}>
                <Ionicons name="eye-off-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Hide this post</Text>
              </TouchableOpacity>

              {isOwnPost && (
                <TouchableOpacity style={styles.sheetItem} onPress={handleEditCaption} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                  <Text style={styles.sheetItemText}>Edit caption</Text>
                </TouchableOpacity>
              )}

              {isOwnPost && onDelete ? (
                <TouchableOpacity style={[styles.sheetItem, styles.sheetItemDestructive]} activeOpacity={0.8} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" style={styles.sheetItemIcon} />
                  <Text style={[styles.sheetItemText, styles.sheetItemTextDestructive]}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.sheetItem, styles.sheetItemDestructive]}
                activeOpacity={0.8}
                onPress={handleReport}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#FF3B30" style={styles.sheetItemIcon} />
                <Text style={[styles.sheetItemText, styles.sheetItemTextDestructive]}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title="Delete post?"
        message="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        destructive
        icon="trash-outline"
      />

      {/* Inline edit caption modal */}
      <Modal
        visible={editCaptionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !editSaving && setEditCaptionVisible(false)}
      >
        <Pressable
          style={styles.editBackdrop}
          onPress={() => {
            if (!editSaving) setEditCaptionVisible(false);
          }}
        >
          <View style={styles.editCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.editTitle}>Edit caption</Text>
            <Text style={styles.editSubtitle}>Tweak your story without deleting the post.</Text>
            <View style={styles.editInputWrapper}>
              <TextInput
                style={styles.editInput}
                placeholder="Write a caption..."
                placeholderTextColor="#999"
                multiline
                value={editedCaption}
                onChangeText={setEditedCaption}
                editable={!editSaving}
              />
            </View>
            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={styles.editCancelButton}
                activeOpacity={0.7}
                onPress={() => !editSaving && setEditCaptionVisible(false)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveButton}
                activeOpacity={0.7}
                onPress={handleSaveCaption}
                disabled={editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 0,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  profilePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
  },
  imageScroll: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * IMAGE_ASPECT_RATIO,
  },
  imagePage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * IMAGE_ASPECT_RATIO,
  },
  image: {
    width: '100%',
    backgroundColor: '#7a2276ff',
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  likesSection: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  likesText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
  },
  likersBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  likersSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    minHeight: 200,
  },
  likersHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  likersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  likersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  likersLoading: {
    padding: 24,
    alignItems: 'center',
  },
  likersLoadingText: {
    fontSize: 14,
    color: '#999',
  },
  likersEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  likersList: {
    maxHeight: 320,
  },
  likersListContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  likersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likersAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  likersUsername: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  captionSection: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  commentsLink: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  commentsLinkText: {
    fontSize: 14,
    color: '#999',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  locationIcon: {
    marginRight: 6,
  },
  locationName: {
    flex: 1,
    fontSize: 13,
    color: '#0095F6',
    fontWeight: '500',
  },
  viewOnMapText: {
    fontSize: 13,
    color: '#0095F6',
    fontWeight: '600',
    marginRight: 4,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    marginBottom: 16,
  },
  sheetIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sheetIconCard: {
    alignItems: 'center',
  },
  sheetIconLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#000',
  },
  sheetList: {
    marginTop: 4,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sheetItemIcon: {
    marginRight: 12,
  },
  sheetItemText: {
    fontSize: 14,
    color: '#000',
  },
  sheetItemDestructive: {
    marginTop: 4,
  },
  sheetItemTextDestructive: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  editSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 14,
  },
  editInputWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 16,
    maxHeight: 140,
  },
  editInput: {
    fontSize: 14,
    color: '#000',
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f2f2f2',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  editSaveButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0095F6',
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default memo(PostCard);
