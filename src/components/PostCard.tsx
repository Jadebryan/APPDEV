import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  currentUserId?: string;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, currentUserId }) => {
  const isLiked = currentUserId ? post.likes.includes(currentUserId) : false;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'run':
        return '🏃';
      case 'hike':
        return '🥾';
      case 'cycle':
        return '🚴';
      case 'walk':
        return '🚶';
      default:
        return '🏃';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {post.user.avatar ? (
            <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
          <Text style={styles.username}>{post.user.username}</Text>
        </View>
        <View style={styles.activityBadge}>
          <Text style={styles.activityEmoji}>{getActivityIcon(post.activityType)}</Text>
          <Text style={styles.activityType}>{post.activityType.toUpperCase()}</Text>
        </View>
      </View>

      <Image source={{ uri: post.image }} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onLike(post._id)} style={styles.likeButton}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#FF69B4' : '#000'}
            />
            <Text style={styles.likeCount}>{post.likes.length}</Text>
          </TouchableOpacity>

          {(post.distance || post.duration) && (
            <View style={styles.stats}>
              {post.distance && (
                <Text style={styles.statText}>📏 {post.distance} km</Text>
              )}
              {post.duration && (
                <Text style={styles.statText}>⏱️ {post.duration} min</Text>
              )}
            </View>
          )}
        </View>

        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{post.user.username}</Text> {post.caption}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  activityEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  activityType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF69B4',
  },
  image: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  content: {
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    marginLeft: 6,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 15,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
  },
});

export default PostCard;
