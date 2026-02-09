import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_AVATAR_URI } from '../utils/defaultAvatar';

interface StoryItemProps {
  username: string;
  avatar?: string;
  /** When set, show this as the circle image (story preview, IG-style) instead of avatar */
  storyPreviewUri?: string;
  isActive: boolean;
  isYourStory?: boolean;
  onPress?: () => void;
  onAddPress?: () => void;
}

/**
 * StoryItem Component
 * Displays a single story with gradient ring for active stories
 * Layout: Circular avatar (64-72px) with gradient/gray ring, username below
 */
const StoryItem: React.FC<StoryItemProps> = ({
  username,
  avatar,
  storyPreviewUri,
  isActive,
  isYourStory = false,
  onPress,
  onAddPress,
}) => {
  const avatarSize = 68; // 68px diameter as per requirements
  const ringWidth = 2;
  const totalSize = avatarSize + ringWidth * 2;

  // Instagram-style: show story preview (first story image) when active, else avatar
  const imageUri = storyPreviewUri || avatar || DEFAULT_AVATAR_URI;

  const AvatarContent = () => (
    <View style={[styles.avatarWrapper, { width: avatarSize, height: avatarSize }]}>
      <Image source={{ uri: imageUri }} style={styles.avatar} />
    </View>
  );

  const showGradient = isActive || isYourStory;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        {/* Gradient ring for active stories and "Your story" (pink → orange → yellow) */}
        {showGradient ? (
          <View style={{ width: totalSize, height: totalSize }}>
            <LinearGradient
              colors={['#FF006E', '#FF6B35', '#FFD23F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.gradientRing, { width: totalSize, height: totalSize }]}
            >
              <View style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, overflow: 'hidden', backgroundColor: '#fff', margin: ringWidth }}>
                <AvatarContent />
              </View>
            </LinearGradient>
            {isYourStory && (
              <TouchableOpacity
                style={styles.plusBadge}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddPress?.();
                }}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.grayRing, { width: totalSize, height: totalSize }]}>
            <AvatarContent />
            {isYourStory && (
              <TouchableOpacity
                style={styles.plusBadge}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddPress?.();
                }}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <Text style={styles.username} numberOfLines={1}>
        {isYourStory ? 'Your story' : username}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 16,
    width: 72, // Max width for username text
  },
  avatarContainer: {
    marginBottom: 6,
  },
  gradientRing: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grayRing: {
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#DBDBDB', // Light gray for inactive stories
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  avatarWrapper: {
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0095F6', // Instagram blue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  username: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    maxWidth: 72,
  },
});

export default StoryItem;
