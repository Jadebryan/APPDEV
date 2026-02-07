import React, { useState, useRef } from 'react';
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
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Post } from '../types';
import { getTimeAgo } from '../utils/timeAgo';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../navigation/types';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  currentUserId?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_ASPECT_RATIO = 1;

const ACTIVITY_CONFIG: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; label: string }> = {
  run: { icon: 'run-fast', color: '#FF69B4', label: 'Run' },
  hike: { icon: 'hiking', color: '#2E7D32', label: 'Hike' },
  cycle: { icon: 'bike', color: '#1565C0', label: 'Cycle' },
  walk: { icon: 'walk', color: '#6A1B9A', label: 'Walk' },
  other: { icon: 'run', color: '#757575', label: 'Activity' },
};

type PostCardNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;

/**
 * PostCard - Instagram-style post with activity badge, timestamp, double-tap like, comment count, shadow
 */
const PostCard: React.FC<PostCardProps> = ({ post, onLike, currentUserId }) => {
  const [currentImageIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [saved, setSaved] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;
  const navigation = useNavigation<PostCardNav>();

  const totalImages = 1;
  const showCarouselIndicator = totalImages > 1;
  const activityConfig = ACTIVITY_CONFIG[post.activityType] || ACTIVITY_CONFIG.other;
  const mockCommentCount = 4; // Stable mock for UI

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
      username: post.user.username,
      caption: post.caption,
      image: post.image,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Run Barbie🎀 - ${post.user.username} • ${post.caption}`,
      });
    } catch {
      // ignore
    }
  };

  const handleToggleSave = () => {
    setSaved((prev) => !prev);
    setOptionsVisible(false);
  };

  const handleMenu = () => {
    setOptionsVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header: Profile, username, activity badge, timestamp, menu */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {post.user.avatar ? (
            <Image source={{ uri: post.user.avatar }} style={styles.profilePicture} />
          ) : (
            <View style={[styles.profilePicture, styles.profilePlaceholder]}>
              <Ionicons name="person" size={20} color="#999" />
            </View>
          )}
          <View style={styles.headerTextRow}>
            <Text style={styles.username}>{post.user.username}</Text>
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

      {/* Main Image: double-tap to like with heart animation */}
      <TouchableWithoutFeedback onPress={handleImagePress}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.image }}
            style={[styles.image, { height: SCREEN_WIDTH * IMAGE_ASPECT_RATIO }]}
            resizeMode="cover"
          />
          {showHeart && (
            <Animated.View
              style={[
                styles.heartOverlay,
                {
                  opacity: heartOpacity,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={80} color="#FF69B4" />
            </Animated.View>
          )}
          {showCarouselIndicator && (
            <View style={styles.carouselIndicator}>
              <Text style={styles.carouselText}>
                {currentImageIndex + 1}/{totalImages}
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Action Buttons - pink heart when liked */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={() => onLike(post._id)} style={styles.actionButton}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#FF69B4' : '#000'}
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
        <View style={styles.likesSection}>
          <Text style={styles.likesText}>
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </Text>
        </View>
      )}

      <View style={styles.captionSection}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{post.user.username}</Text>{' '}
          {post.caption}
        </Text>
      </View>

      {/* Comment count - mock */}
      {mockCommentCount > 0 ? (
        <TouchableOpacity style={styles.commentsLink} onPress={handleOpenComments}>
          <Text style={styles.commentsLinkText}>View all {mockCommentCount} comments</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.commentsLink} onPress={handleOpenComments}>
          <Text style={styles.commentsLinkText}>Add a comment...</Text>
        </TouchableOpacity>
      )}

      {(post.distance || post.duration) && (
        <View style={styles.statsSection}>
          {post.distance && <Text style={styles.statText}>📏 {post.distance} km</Text>}
          {post.duration && <Text style={styles.statText}>⏱️ {post.duration} min</Text>}
        </View>
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

            {/* Run Barbie-themed quick actions */}
            <View style={styles.sheetIconRow}>
              <TouchableOpacity
                style={styles.sheetIconCard}
                onPress={handleToggleSave}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color="#000"
                />
                <Text style={styles.sheetIconLabel}>Save run</Text>
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
                onPress={() => {
                  setOptionsVisible(false);
                  Alert.alert(
                    'Add to goals',
                    'Soon you\'ll be able to add this run to a training goal.',
                  );
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="flag-outline" size={22} color="#000" />
                <Text style={styles.sheetIconLabel}>Set goal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetList}>
              <TouchableOpacity style={styles.sheetItem} activeOpacity={0.8}>
                <Ionicons name="star-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Mark as inspiration</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} activeOpacity={0.8}>
                <Ionicons name="notifications-off-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Mute this athlete</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} activeOpacity={0.8}>
                <Ionicons name="trail-sign-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Save route idea</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} activeOpacity={0.8}>
                <Ionicons name="information-circle-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>View athlete profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} activeOpacity={0.8}>
                <Ionicons name="eye-off-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>Hide this post</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetItem} activeOpacity={0.8}>
                <Ionicons name="person-circle-outline" size={18} color="#000" style={styles.sheetItemIcon} />
                <Text style={styles.sheetItemText}>About this athlete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, styles.sheetItemDestructive]}
                activeOpacity={0.8}
                onPress={() => {
                  setOptionsVisible(false);
                  Alert.alert('Report trail / content', 'Thanks, we\'ll review this activity.', [
                    { text: 'OK' },
                  ]);
                }}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#FF3B30" style={styles.sheetItemIcon} />
                <Text style={[styles.sheetItemText, styles.sheetItemTextDestructive]}>Report</Text>
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
    marginBottom: 12,
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 12,
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
});

export default PostCard;
