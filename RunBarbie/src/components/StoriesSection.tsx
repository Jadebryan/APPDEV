import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Image,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StoryItem from './StoryItem';
import { useAuth } from '../context/AuthContext';
import { useStories, Story } from '../context/StoriesContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../navigation/types';

type StoriesNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;

/**
 * StoriesSection Component
 * Horizontally scrollable row of story items
 * First item is always "Your Story" with gradient ring and plus badge
 * Tap opens full-screen story overlay
 */
const StoriesSection: React.FC = () => {
  const { user } = useAuth();
  const { stories: allStories, myStory } = useStories();
  const navigation = useNavigation<StoriesNav>();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // Group stories by userId - Instagram style (all stories from one user shown together)
  const storiesByUser = useMemo(() => {
    const groups: Map<string, Array<Story & { id: string }>> = new Map();
    
    // Your story first (only if it has mediaUri)
    if (myStory && myStory.mediaUri) {
      const yourStoryKey = user?._id || 'your-story';
      if (!groups.has(yourStoryKey)) {
        groups.set(yourStoryKey, []);
      }
      groups.get(yourStoryKey)!.push({
        ...myStory,
        id: 'your-story',
      });
    }

    // Group other stories by userId
    allStories
      .filter((s) => s.mediaUri && (!user?._id || s.userId !== user._id))
      .forEach((s) => {
        if (!groups.has(s.userId)) {
          groups.set(s.userId, []);
        }
        groups.get(s.userId)!.push({
          ...s,
          id: s.id,
        });
      });

    return groups;
  }, [allStories, myStory, user]);

  // Flatten grouped stories into viewing order (all from user 1, then all from user 2, etc.)
  const activeStories: Array<Story & { id: string }> = useMemo(() => {
    const list: Array<Story & { id: string }> = [];
    storiesByUser.forEach((userStories) => {
      list.push(...userStories);
    });
    return list;
  }, [storiesByUser]);

  // Get current user's story group and position
  const currentUserStoryInfo = useMemo(() => {
    if (selectedStoryIndex === null || !selectedStory) return null;
    
    const currentUserId = selectedStory.id === 'your-story' 
      ? (user?._id || 'your-story')
      : selectedStory.userId;
    
    const userStories = storiesByUser.get(currentUserId) || [];
    const positionInUserStories = userStories.findIndex((s) => s.id === selectedStory.id);
    
    return {
      userId: currentUserId,
      userStories,
      currentIndex: positionInUserStories,
      totalCount: userStories.length,
    };
  }, [selectedStoryIndex, selectedStory, storiesByUser, user]);

  // Stories list for horizontal scroll display (includes inactive "Your story")
  const stories: Array<Story & { id: string; isActive: boolean }> = useMemo(() => {
    const list: Array<Story & { id: string; isActive: boolean }> = [];
    // Your story first
    if (myStory) {
      list.push({
        ...myStory,
        id: 'your-story',
        isActive: !!myStory.mediaUri,
      });
    } else {
      list.push({
        id: 'your-story',
        userId: user?._id || '',
        username: user?.username || 'You',
        avatar: user?.avatar,
        mediaUri: '',
        isActive: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Then others, mapped from StoriesContext
    allStories
      .filter((s) => !user?._id || s.userId !== user._id)
      .forEach((s) => {
        list.push({
          ...s,
          id: s.id,
          isActive: true,
        });
      });

    return list;
  }, [allStories, myStory, user]);

  const selectedStory = selectedStoryIndex !== null ? activeStories[selectedStoryIndex] : null;

  const handleNextStory = useCallback(() => {
    if (selectedStoryIndex === null) return;
    
    const currentStory = activeStories[selectedStoryIndex];
    if (!currentStory) return;
    
    const currentUserId = currentStory.id === 'your-story' 
      ? (user?._id || 'your-story')
      : currentStory.userId;
    
    const userStories = storiesByUser.get(currentUserId) || [];
    const currentIndexInUser = userStories.findIndex((s) => s.id === currentStory.id);
    
    // Check if there's a next story from the same user
    if (currentIndexInUser + 1 < userStories.length) {
      // Move to next story from same user
      const nextStory = userStories[currentIndexInUser + 1];
      const nextIndex = activeStories.findIndex((s) => s.id === nextStory.id);
      if (nextIndex !== -1) {
        setSelectedStoryIndex(nextIndex);
      }
    } else {
      // No more stories from this user, move to next user's first story
      const userIds = Array.from(storiesByUser.keys());
      const currentUserIndex = userIds.indexOf(currentUserId);
      const nextUserId = userIds[currentUserIndex + 1];
      
      if (nextUserId) {
        const nextUserStories = storiesByUser.get(nextUserId);
        if (nextUserStories && nextUserStories.length > 0) {
          const nextStory = nextUserStories[0];
          const nextIndex = activeStories.findIndex((s) => s.id === nextStory.id);
          if (nextIndex !== -1) {
            setSelectedStoryIndex(nextIndex);
          }
        } else {
          setSelectedStoryIndex(null);
        }
      } else {
        // No more users, exit
        setSelectedStoryIndex(null);
      }
    }
  }, [selectedStoryIndex, activeStories, storiesByUser, user]);

  const handlePreviousStory = useCallback(() => {
    if (selectedStoryIndex === null) return;
    
    const currentStory = activeStories[selectedStoryIndex];
    if (!currentStory) return;
    
    const currentUserId = currentStory.id === 'your-story' 
      ? (user?._id || 'your-story')
      : currentStory.userId;
    
    const userStories = storiesByUser.get(currentUserId) || [];
    const currentIndexInUser = userStories.findIndex((s) => s.id === currentStory.id);
    
    // Check if there's a previous story from the same user
    if (currentIndexInUser - 1 >= 0) {
      // Move to previous story from same user
      const prevStory = userStories[currentIndexInUser - 1];
      const prevIndex = activeStories.findIndex((s) => s.id === prevStory.id);
      if (prevIndex !== -1) {
        setSelectedStoryIndex(prevIndex);
      }
    } else {
      // No more stories from this user, move to previous user's last story
      const userIds = Array.from(storiesByUser.keys());
      const currentUserIndex = userIds.indexOf(currentUserId);
      const prevUserId = userIds[currentUserIndex - 1];
      
      if (prevUserId) {
        const prevUserStories = storiesByUser.get(prevUserId);
        if (prevUserStories && prevUserStories.length > 0) {
          const prevStory = prevUserStories[prevUserStories.length - 1];
          const prevIndex = activeStories.findIndex((s) => s.id === prevStory.id);
          if (prevIndex !== -1) {
            setSelectedStoryIndex(prevIndex);
          }
        } else {
          setSelectedStoryIndex(null);
        }
      } else {
        // First user, exit
        setSelectedStoryIndex(null);
      }
    }
  }, [selectedStoryIndex, activeStories, storiesByUser, user]);

  // Auto-advance story after 5 seconds
  useEffect(() => {
    if (selectedStoryIndex === null) {
      progressAnim.setValue(0);
      return;
    }

    // Reset progress animation
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    // Auto-advance to next story after 5 seconds
    progressTimer.current = setTimeout(() => {
      handleNextStory();
    }, 5000);

    return () => {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
      }
    };
  }, [selectedStoryIndex, handleNextStory]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((story, index) => {
          const isYourStory = story.id === 'your-story';
          return (
            <StoryItem
              key={story.id}
              username={story.username}
              avatar={story.avatar}
              isActive={story.isActive}
              isYourStory={isYourStory}
              // Your story: tap to view if exists, else open capture. Plus badge always opens capture.
              onPress={() => {
                if (isYourStory && story.mediaUri) {
                  const index = activeStories.findIndex((s) => s.id === 'your-story');
                  if (index !== -1) setSelectedStoryIndex(index);
                } else if (isYourStory) {
                  navigation.navigate('StoryCapture');
                } else {
                  const index = activeStories.findIndex((s) => s.id === story.id);
                  if (index !== -1) setSelectedStoryIndex(index);
                }
              }}
              onAddPress={() => navigation.navigate('StoryCapture')}
            />
          );
        })}
      </ScrollView>

      {/* Story tap overlay - full-screen modal - Instagram-style */}
      <Modal
        visible={selectedStoryIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedStoryIndex(null)}
      >
        <View style={styles.overlay}>
          {selectedStory && (
            <>
              {/* Progress bars at top - one for each story from current user */}
              {selectedStory && (() => {
                const currentUserId = selectedStory.id === 'your-story' 
                  ? (user?._id || 'your-story')
                  : selectedStory.userId;
                const userStories = storiesByUser.get(currentUserId) || [];
                
                if (userStories.length === 0) return null;
                
                return (
                  <View style={styles.overlayProgressContainer}>
                    {userStories.map((story, idx) => {
                      const isCurrent = story.id === selectedStory.id;
                      const currentIndex = userStories.findIndex((s) => s.id === selectedStory.id);
                      const isPast = idx < currentIndex;
                      return (
                        <View 
                          key={story.id} 
                          style={[
                            styles.overlayProgressBarWrapper,
                            idx > 0 && { marginLeft: Platform.OS === 'android' ? 2 : 3 }
                          ]}
                        >
                          <View style={styles.overlayProgressBarBg} />
                          {isPast ? (
                            <View style={[styles.overlayProgressBar, { width: '100%' }]} />
                          ) : isCurrent ? (
                            <Animated.View
                              style={[
                                styles.overlayProgressBar,
                                {
                                  width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                  }),
                                },
                              ]}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                );
              })()}

              {/* Tap zones for navigation - left side goes back, right side goes forward */}
              <TouchableOpacity
                style={styles.tapZoneLeft}
                activeOpacity={1}
                onPress={handlePreviousStory}
              />
              <TouchableOpacity
                style={styles.tapZoneRight}
                activeOpacity={1}
                onPress={handleNextStory}
              />

              {/* Top header - Profile, username, time, menu */}
              <View style={styles.storyTopHeader} pointerEvents="box-none">
                <View style={styles.storyHeaderRow}>
                  {selectedStory.avatar ? (
                    <Image source={{ uri: selectedStory.avatar }} style={styles.storyHeaderAvatar} />
                  ) : (
                    <View style={[styles.storyHeaderAvatar, styles.overlayAvatarPlaceholder]}>
                      <Ionicons name="person" size={Platform.OS === 'android' ? 16 : 18} color="#fff" />
                    </View>
                  )}
                    <View style={styles.storyHeaderText}>
                    <View style={styles.storyHeaderTopRow}>
                      <Text style={styles.overlayUsername}>
                        {selectedStory.id === 'your-story' ? 'Your story' : selectedStory.username}
                      </Text>
                      {currentUserStoryInfo && currentUserStoryInfo.totalCount > 1 && (
                        <Text style={styles.storyCounter}>
                          {currentUserStoryInfo.currentIndex + 1} / {currentUserStoryInfo.totalCount}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.overlayHint}>
                      {(() => {
                        const created = new Date(selectedStory.createdAt);
                        const now = new Date();
                        const diffMs = now.getTime() - created.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        if (diffMins < 1) return 'Just now';
                        if (diffMins < 60) return `${diffMins}m`;
                        const diffHours = Math.floor(diffMins / 60);
                        return `${diffHours}h`;
                      })()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.storyMenuButton}
                  onPress={() => setSelectedStoryIndex(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Full-screen story image */}
              <View style={styles.storyImageWrapper}>
                <Image
                  source={{
                    uri:
                      selectedStory.mediaUri ||
                      selectedStory.avatar ||
                      'https://images.unsplash.com/photo-1528701800489-20be3c30c1d5?w=800',
                  }}
                  style={styles.storyImage}
                  resizeMode="cover"
                />
                {/* Bottom gradient overlay for text readability */}
                <View style={styles.storyImageGradient} />
                
                {/* Caption/Activity overlay - aligned with creation preview */}
                {(selectedStory.caption || selectedStory.activityType) && (
                  <View style={styles.storyContentOverlay}>
                    {selectedStory.activityType && (
                      <View style={styles.storyTag}>
                        <Ionicons name="sparkles" size={Platform.OS === 'android' ? 12 : 14} color="#fff" />
                        <Text style={styles.storyTagText}>
                          {selectedStory.activityType === 'other' ? 'Activity' : selectedStory.activityType.charAt(0).toUpperCase() + selectedStory.activityType.slice(1)}
                        </Text>
                      </View>
                    )}
                    {selectedStory.caption && (
                      <Text style={styles.storyCaption} numberOfLines={2}>
                        {selectedStory.caption}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Bottom interaction bar - Instagram style */}
              <View style={styles.storyBottomBar} pointerEvents="box-none">
                <View style={styles.storyMessageInput}>
                  <TextInput
                    style={styles.messageInput}
                    placeholder="Send message"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    editable={false}
                  />
                </View>
                <View style={styles.storyActions}>
                  <TouchableOpacity style={styles.storyActionButton} activeOpacity={0.7}>
                    <Ionicons name="heart-outline" size={Platform.OS === 'android' ? 22 : 24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.storyActionButton, { marginLeft: Platform.OS === 'android' ? 12 : 16 }]} activeOpacity={0.7}>
                    <Ionicons name="chatbubble-outline" size={Platform.OS === 'android' ? 22 : 24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.storyActionButton, { marginLeft: Platform.OS === 'android' ? 12 : 16 }]} activeOpacity={0.7}>
                    <Ionicons name="paper-plane-outline" size={Platform.OS === 'android' ? 22 : 24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayProgressContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 8 : 12,
    left: Platform.OS === 'android' ? 8 : 12,
    right: Platform.OS === 'android' ? 8 : 12,
    flexDirection: 'row',
    zIndex: 10,
  },
  overlayProgressBarWrapper: {
    flex: 1,
    height: 2,
    overflow: 'hidden',
  },
  overlayProgressBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  overlayProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  tapZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '33%',
    zIndex: 15,
  },
  tapZoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '33%',
    zIndex: 15,
  },
  storyTopHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 20,
    left: Platform.OS === 'android' ? 12 : 16,
    right: Platform.OS === 'android' ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  storyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storyHeaderAvatar: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    borderRadius: Platform.OS === 'android' ? 16 : 18,
    marginRight: Platform.OS === 'android' ? 8 : 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  overlayAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyHeaderText: {
    flexDirection: 'column',
    flex: 1,
  },
  storyHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayUsername: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '600',
    color: '#fff',
  },
  storyCounter: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginLeft: Platform.OS === 'android' ? 6 : 8,
  },
  overlayHint: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  storyMenuButton: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImageWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  storyImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'android' ? 120 : 140,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  storyContentOverlay: {
    position: 'absolute',
    left: Platform.OS === 'android' ? 10 : 12,
    right: Platform.OS === 'android' ? 10 : 12,
    bottom: Platform.OS === 'android' ? 70 : 80,
  },
  storyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10,
    paddingVertical: Platform.OS === 'android' ? 3 : 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,105,180,0.9)',
    marginBottom: Platform.OS === 'android' ? 4 : 6,
  },
  storyTagText: {
    fontSize: Platform.OS === 'android' ? 10 : 11,
    fontWeight: '700',
    color: '#fff',
    marginLeft: Platform.OS === 'android' ? 4 : 6,
  },
  storyCaption: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#fff',
    fontWeight: '500',
  },
  storyBottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 12 : 16,
    left: Platform.OS === 'android' ? 12 : 16,
    right: Platform.OS === 'android' ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  storyMessageInput: {
    flex: 1,
    marginRight: Platform.OS === 'android' ? 8 : 10,
  },
  messageInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Platform.OS === 'android' ? 18 : 20,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyActionButton: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StoriesSection;
