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
  Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import StoryItem from './StoryItem';
import { useAuth } from '../context/AuthContext';
import { useStories, Story } from '../context/StoriesContext';
import { storyService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import ConfirmModal from './ConfirmModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../navigation/types';
import { chatService } from '../services/api';

type StoriesNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;

/**
 * StoriesSection Component
 * Horizontally scrollable row of story items
 * First item is always "Your Story" with gradient ring and plus badge
 * Tap opens full-screen story overlay
 */
const StoriesSection: React.FC = () => {
  const { user } = useAuth();
  const { stories: allStories, myStories, myStory, refreshStories, loading: storiesLoading } = useStories();
  const navigation = useNavigation<StoriesNav>();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [storyMenuVisible, setStoryMenuVisible] = useState(false);
  const [storyLiked, setStoryLiked] = useState<Set<string>>(new Set());
  const [replyMessage, setReplyMessage] = useState('');
  const [replyInputFocused, setReplyInputFocused] = useState(false);
  const [storyToastMessage, setStoryToastMessage] = useState<string | null>(null);
  const [deleteConfirmStoryId, setDeleteConfirmStoryId] = useState<string | null>(null);
  const [viewersVisible, setViewersVisible] = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const replyMessageRef = useRef(replyMessage);
  replyMessageRef.current = replyMessage;
  const replyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyToastOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Pause story auto-advance when menus/inputs/modals are open
  const storyPaused =
    storyMenuVisible || replyInputFocused || viewersVisible || !!deleteConfirmStoryId;

  const showStoryToast = useCallback((msg: string) => {
    if (replyToastTimerRef.current) clearTimeout(replyToastTimerRef.current);
    setStoryToastMessage(msg);
    replyToastOpacity.setValue(0);
    Animated.timing(replyToastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    replyToastTimerRef.current = setTimeout(() => {
      replyToastTimerRef.current = null;
      Animated.timing(replyToastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setStoryToastMessage(null);
      });
    }, 2500);
  }, [replyToastOpacity]);

  useEffect(() => {
    if (selectedStoryIndex === null && replyToastTimerRef.current) {
      clearTimeout(replyToastTimerRef.current);
      replyToastTimerRef.current = null;
      setStoryToastMessage(null);
    }
  }, [selectedStoryIndex]);

  // Group stories by userId - Instagram style (all stories from one user, multiple slides per user)
  // Current user's stories first so "Your story" opens at index 0
  const storiesByUser = useMemo(() => {
    const groups: Map<string, Array<Story & { id: string }>> = new Map();
    const yourAvatar = user?.avatar ?? '';
    const yourUsername = user?.username ?? 'You';

    // Your stories first (all of them, each with real id) – IG-style multiple slides
    if (user?._id && myStories.length > 0) {
      groups.set(user._id, myStories.map((s) => ({ ...s, id: s.id, username: yourUsername, avatar: yourAvatar })));
    }

    // Other users' stories (group by userId)
    allStories
      .filter((s) => s.mediaUri && s.userId !== user?._id)
      .forEach((s) => {
        if (!groups.has(s.userId)) {
          groups.set(s.userId, []);
        }
        groups.get(s.userId)!.push({ ...s, id: s.id });
      });

    return groups;
  }, [allStories, myStories, user]);

  // Flatten: current user's stories first, then others (tap left/right navigates within then between users)
  const activeStories: Array<Story & { id: string }> = useMemo(() => {
    const list: Array<Story & { id: string }> = [];
    storiesByUser.forEach((userStories) => list.push(...userStories));
    return list;
  }, [storiesByUser]);

  // Get current story's user group and position (for progress bars and "1/3" counter)
  const currentUserStoryInfo = useMemo(() => {
    const currentStory = selectedStoryIndex !== null ? activeStories[selectedStoryIndex] : null;
    if (selectedStoryIndex === null || !currentStory) return null;

    const currentUserId = currentStory.userId;
    const userStories = storiesByUser.get(currentUserId) || [];
    const positionInUserStories = userStories.findIndex((s) => s.id === currentStory.id);

    return {
      userId: currentUserId,
      userStories,
      currentIndex: positionInUserStories,
      totalCount: userStories.length,
    };
  }, [selectedStoryIndex, activeStories, storiesByUser]);

  // Stories list for horizontal scroll (one circle per user; "Your story" first)
  const stories: Array<Story & { id: string; isActive: boolean }> = useMemo(() => {
    const list: Array<Story & { id: string; isActive: boolean }> = [];
    const yourAvatar = user?.avatar ?? '';
    const yourUsername = user?.username ?? 'You';
    // Your story first (one circle; preview = latest story; tap opens all your slides)
    list.push({
      id: user?._id ? `your-${user._id}` : 'your-story',
      userId: user?._id || '',
      username: yourUsername,
      avatar: yourAvatar,
      mediaUri: myStories.length > 0 ? myStories[0].mediaUri : '',
      isActive: myStories.length > 0,
      createdAt: myStories.length > 0 ? myStories[0].createdAt : new Date().toISOString(),
    });

    // Other users (one circle per user)
    const otherUserIds = [...new Set(allStories.filter((s) => s.userId !== user?._id).map((s) => s.userId))];
    otherUserIds.forEach((uid) => {
      const userStories = allStories.filter((s) => s.userId === uid);
      const first = userStories[0];
      if (first) {
        list.push({
          ...first,
          id: first.id,
          isActive: true,
        });
      }
    });

    return list;
  }, [allStories, myStories, user]);

  // Preserve selected story by ID when stories reload
  useEffect(() => {
    if (selectedStoryId && !storiesLoading && activeStories.length > 0 && selectedStoryIndex === null) {
      // Only restore if index is null but we have an ID (stories reloaded)
      const foundIndex = activeStories.findIndex((s) => s.id === selectedStoryId);
      if (foundIndex !== -1) {
        setSelectedStoryIndex(foundIndex);
      } else {
        // Story no longer exists, clear ID
        setSelectedStoryId(null);
      }
    }
  }, [selectedStoryId, activeStories, storiesLoading, selectedStoryIndex]);

  // Validate selectedStoryIndex - if out of bounds, reset to null (but only if not loading)
  useEffect(() => {
    if (selectedStoryIndex !== null && !storiesLoading) {
      if (activeStories.length === 0 || selectedStoryIndex >= activeStories.length) {
        // Try to find by ID first
        if (selectedStoryId) {
          const foundIndex = activeStories.findIndex((s) => s.id === selectedStoryId);
          if (foundIndex !== -1) {
            setSelectedStoryIndex(foundIndex);
            return;
          }
        }
        setSelectedStoryIndex(null);
        setSelectedStoryId(null);
      }
    }
  }, [selectedStoryIndex, activeStories.length, storiesLoading, selectedStoryId, activeStories]);

  const selectedStory = selectedStoryIndex !== null && selectedStoryIndex < activeStories.length ? activeStories[selectedStoryIndex] : null;
  const currentStoryId = selectedStory?.id ?? null;
  const isLiked = currentStoryId ? storyLiked.has(currentStoryId) : false;
  const isOwnStory = selectedStory && user ? selectedStory.userId === user._id : false;

  const handleStoryMenuOption = useCallback(async (action: string) => {
    setStoryMenuVisible(false);
    if (action === 'close') {
      setSelectedStoryIndex(null);
      setSelectedStoryId(null);
      return;
    }
    if (action === 'delete') {
      if (selectedStoryIndex === null) return;
      const currentStory = activeStories[selectedStoryIndex];
      if (!currentStory || currentStory.userId !== user?._id) return;
      setStoryMenuVisible(false);
      setDeleteConfirmStoryId(currentStory.id);
      return;
    }
    if (action === 'mute') {
      showStoryToast('Muted');
      return;
    }
    if (action === 'report') {
      showStoryToast("Thanks, we'll review this");
      return;
    }
    if (action === 'share') {
      const story = selectedStoryIndex !== null ? activeStories[selectedStoryIndex] : null;
      const url = story?.mediaUri || '';
      if (url) {
        Share.share({ message: 'Check out this story', url }).catch(() => {});
      } else {
        Share.share({ message: 'Check out this story' }).catch(() => {});
      }
      showStoryToast('Share opened');
      return;
    }
    if (action === 'copy') {
      showStoryToast('Link copied');
      return;
    }
  }, [selectedStoryIndex, activeStories, user, showStoryToast]);

  const handleConfirmDeleteStory = useCallback(async () => {
    const id = deleteConfirmStoryId;
    setDeleteConfirmStoryId(null);
    if (!id || !user?._id) return;
    try {
      await storyService.deleteStory(id);
      await refreshStories();
      setSelectedStoryIndex(null);
      setSelectedStoryId(null);
      showStoryToast('Story deleted');
    } catch (e) {
      showStoryToast('Failed to delete story');
    }
  }, [deleteConfirmStoryId, user, refreshStories, showStoryToast]);

  // Mark non-own stories as viewed when opened
  useEffect(() => {
    if (!selectedStory || !user?._id) return;
    if (selectedStory.userId === user._id) return;

    storyService
      .markViewed(selectedStory.id)
      .catch(() => {
        // ignore errors; view tracking is best-effort
      });
  }, [selectedStory, user]);

  // Initialize liked set from API data
  useEffect(() => {
    const initial = new Set<string>();
    allStories.forEach((s) => {
      if ((s as any).likedByMe) {
        initial.add(s.id);
      }
    });
    setStoryLiked(initial);
  }, [allStories]);

  const handleSaveStoryImage = useCallback(async () => {
    if (!selectedStory?.mediaUri) {
      showStoryToast('No image to save');
      return;
    }
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showStoryToast('Permission needed to save to gallery');
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}story-${selectedStory.id}.jpg`;
      const downloadRes = await FileSystem.downloadAsync(selectedStory.mediaUri, fileUri);
      await MediaLibrary.createAssetAsync(downloadRes.uri);
      showStoryToast('Saved to gallery');
    } catch (e) {
      showStoryToast('Failed to save');
    }
  }, [selectedStory, showStoryToast]);

  const toggleLike = useCallback(async () => {
    if (!currentStoryId) return;
    try {
      const res = await storyService.likeStory(currentStoryId);
      setStoryLiked((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(currentStoryId);
        else next.delete(currentStoryId);
        return next;
      });
    } catch {
      showStoryToast('Could not update like');
    }
  }, [currentStoryId, showStoryToast]);

  const handleSendReply = useCallback(async () => {
    const text = (replyMessageRef.current || '').trim();
    if (!text || !currentStoryId || !selectedStory) return;
    setReplyMessage('');
    try {
      const res = await storyService.replyToStory(currentStoryId, text);
      showStoryToast('Reply sent!');
      
      // Navigate to chat if conversation was created/updated (IG-style)
      if (res.conversationId && selectedStory.userId !== user?._id) {
        // Close story overlay first
        setSelectedStoryIndex(null);
        setSelectedStoryId(null);
        
        // Fetch conversation to get other user info
        try {
          const conversation = await chatService.getOrCreateConversation(selectedStory.userId);
          const mainTabs = navigation.getParent()?.getParent();
          if (mainTabs && 'navigate' in mainTabs) {
            (mainTabs as any).navigate('ChatsStack', {
              screen: 'ChatDetail',
              params: {
                conversationId: res.conversationId,
                otherUser: conversation.participant,
              },
            });
          }
        } catch (e) {
          console.error('Failed to navigate to chat:', e);
        }
      }
    } catch {
      showStoryToast('Failed to send reply');
    }
  }, [currentStoryId, selectedStory, user, navigation, showStoryToast]);

  const handleNextStory = useCallback(() => {
    if (selectedStoryIndex === null) return;
    
    const currentStory = activeStories[selectedStoryIndex];
    if (!currentStory) return;
    
    const currentUserId = currentStory.userId;
    const userStories = storiesByUser.get(currentUserId) || [];
    const currentIndexInUser = userStories.findIndex((s) => s.id === currentStory.id);
    
    // Check if there's a next story from the same user
    if (currentIndexInUser + 1 < userStories.length) {
      // Move to next story from same user
      const nextStory = userStories[currentIndexInUser + 1];
      const nextIndex = activeStories.findIndex((s) => s.id === nextStory.id);
      if (nextIndex !== -1) {
        setSelectedStoryIndex(nextIndex);
        setSelectedStoryId(nextStory.id);
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
            setSelectedStoryId(nextStory.id);
          }
        } else {
          setSelectedStoryIndex(null);
          setSelectedStoryId(null);
        }
      } else {
        // No more users, exit
        setSelectedStoryIndex(null);
        setSelectedStoryId(null);
      }
    }
  }, [selectedStoryIndex, activeStories, storiesByUser]);

  const handlePreviousStory = useCallback(() => {
    if (selectedStoryIndex === null) return;
    
    const currentStory = activeStories[selectedStoryIndex];
    if (!currentStory) return;
    
    const currentUserId = currentStory.userId;
    const userStories = storiesByUser.get(currentUserId) || [];
    const currentIndexInUser = userStories.findIndex((s) => s.id === currentStory.id);
    
    // Check if there's a previous story from the same user
    if (currentIndexInUser - 1 >= 0) {
      // Move to previous story from same user
      const prevStory = userStories[currentIndexInUser - 1];
      const prevIndex = activeStories.findIndex((s) => s.id === prevStory.id);
      if (prevIndex !== -1) {
        setSelectedStoryIndex(prevIndex);
        setSelectedStoryId(prevStory.id);
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
            setSelectedStoryId(prevStory.id);
          }
        } else {
          setSelectedStoryIndex(null);
          setSelectedStoryId(null);
        }
      } else {
        // First user, exit
        setSelectedStoryIndex(null);
        setSelectedStoryId(null);
      }
    }
  }, [selectedStoryIndex, activeStories, storiesByUser]);

  // Auto-advance story after 5 seconds; pause when user is interacting (menu open or typing reply)
  useEffect(() => {
    if (selectedStoryIndex === null) {
      progressAnim.setValue(0);
      return;
    }

    // Don't auto-advance if stories are loading or if current story is invalid
    if (storiesLoading || !selectedStory || activeStories.length === 0) {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      if (progressAnimationRef.current) {
        progressAnimationRef.current.stop();
        progressAnimationRef.current = null;
      }
      return;
    }

    if (storyPaused) {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      if (progressAnimationRef.current) {
        progressAnimationRef.current.stop();
        progressAnimationRef.current = null;
      }
      progressAnim.setValue(0);
      return;
    }

    // When resuming, start in next tick so animation driver is ready
    const startProgress = () => {
      progressAnim.setValue(0);
      const anim = Animated.timing(progressAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      });
      progressAnimationRef.current = anim;
      anim.start(({ finished }) => {
        progressAnimationRef.current = null;
      });
      progressTimer.current = setTimeout(() => {
        progressTimer.current = null;
        handleNextStory();
      }, 5000);
    };

    const t = setTimeout(startProgress, 0);

    return () => {
      clearTimeout(t);
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      if (progressAnimationRef.current) {
        progressAnimationRef.current.stop();
        progressAnimationRef.current = null;
      }
    };
  }, [selectedStoryIndex, handleNextStory, storyPaused, storiesLoading, selectedStory, activeStories.length]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((story, index) => {
          const isYourStory = story.userId === user?._id;
          return (
            <StoryItem
              key={story.id}
              username={story.username}
              avatar={story.avatar}
              storyPreviewUri={story.isActive ? story.mediaUri : undefined}
              isActive={story.isActive}
              isYourStory={isYourStory}
              // Your story: tap to view all your slides (opens at first), or open capture if none. Plus badge opens capture.
              onPress={() => {
                if (isYourStory && story.mediaUri) {
                  setSelectedStoryIndex(0);
                  setSelectedStoryId(activeStories[0]?.id || null);
                } else if (isYourStory) {
                  navigation.navigate('StoryCapture');
                } else {
                  const index = activeStories.findIndex((s) => s.id === story.id);
                  if (index !== -1) {
                    setSelectedStoryIndex(index);
                    setSelectedStoryId(story.id);
                  }
                }
              }}
              onAddPress={() => navigation.navigate('StoryCapture')}
            />
          );
        })}
      </ScrollView>

      {/* Story tap overlay - full-screen modal - Instagram-style */}
      <Modal
        visible={selectedStoryIndex !== null && selectedStory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedStoryIndex(null);
          setSelectedStoryId(null);
        }}
      >
        <View style={styles.overlay}>
          {selectedStory && (
            <>
              {/* Progress bars at top - one for each story from current user */}
              {selectedStory && (() => {
                const currentUserId = selectedStory.userId;
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

              {/* Top header - Profile, username, time, viewers (own story), menu */}
              <View style={styles.storyTopHeader} pointerEvents="box-none">
                <View style={styles.storyHeaderRow}>
                  {(() => {
                    const headerAvatar = selectedStory.userId === user?._id ? (user?.avatar ?? selectedStory.avatar) : selectedStory.avatar;
                    return headerAvatar ? (
                      <Image source={{ uri: headerAvatar }} style={styles.storyHeaderAvatar} />
                    ) : (
                      <View style={[styles.storyHeaderAvatar, styles.overlayAvatarPlaceholder]}>
                        <Ionicons name="person" size={Platform.OS === 'android' ? 16 : 18} color="#fff" />
                      </View>
                    );
                  })()}
                  <View style={styles.storyHeaderText}>
                    <View style={styles.storyHeaderTopRow}>
                      <Text style={styles.overlayUsername}>
                        {selectedStory.userId === user?._id ? 'Your story' : selectedStory.username}
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
                <View style={styles.storyTopRight}>
                  <TouchableOpacity
                    style={styles.storyMenuButton}
                    onPress={() => setStoryMenuVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
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
                
                {/* Caption/Activity overlay - original simple placement */}
                {(selectedStory.caption || selectedStory.activityType) && (
                  <View style={styles.storyContentOverlay}>
                    {selectedStory.activityType && (
                      <View style={styles.storyTag}>
                        <Ionicons
                          name="sparkles"
                          size={Platform.OS === 'android' ? 12 : 14}
                          color="#fff"
                        />
                        <Text style={styles.storyTagText}>
                          {selectedStory.activityType === 'other'
                            ? 'Activity'
                            : selectedStory.activityType.charAt(0).toUpperCase() +
                              selectedStory.activityType.slice(1)}
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
                {isOwnStory ? (
                  <View style={styles.ownStoryBottomContent}>
                    <View style={styles.ownStoryBottomRow}>
                      <View style={styles.ownStoryActionsRow}>
                      <TouchableOpacity
                        style={styles.ownStoryActionChip}
                        activeOpacity={0.8}
                        onPress={() => {
                          const story = selectedStory;
                          const url = story?.mediaUri || '';
                          if (url) {
                            Share.share({ message: 'Check out this story', url }).catch(() => {});
                          } else {
                            Share.share({ message: 'Check out this story' }).catch(() => {});
                          }
                          showStoryToast('Share opened');
                        }}
                      >
                        <Ionicons
                          name="share-social-outline"
                          size={Platform.OS === 'android' ? 16 : 18}
                          color="#fff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.ownStoryActionText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.ownStoryActionChip}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (selectedStory && selectedStory.userId === user?._id) {
                            setDeleteConfirmStoryId(selectedStory.id);
                          }
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={Platform.OS === 'android' ? 16 : 18}
                          color="#FFB3C4"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.ownStoryActionText, { color: '#FFB3C4' }]}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.ownStoryActionChip}
                        activeOpacity={0.8}
                        onPress={handleSaveStoryImage}
                      >
                        <Ionicons
                          name="download-outline"
                          size={Platform.OS === 'android' ? 16 : 18}
                          color="#fff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.ownStoryActionText}>Save</Text>
                      </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.viewersInlineButton}
                        activeOpacity={0.8}
                        onPress={async () => {
                          if (!selectedStory) return;
                          setViewersVisible(true);
                          setViewersLoading(true);
                          try {
                            const res = await storyService.getViewers(selectedStory.id);
                            setViewers(res.viewers);
                          } catch {
                            setViewers([]);
                          } finally {
                            setViewersLoading(false);
                          }
                        }}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={Platform.OS === 'android' ? 18 : 20}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.storyMessageInput}>
                      <TextInput
                        style={styles.messageInput}
                        placeholder="Send message"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={replyMessage}
                        onChangeText={setReplyMessage}
                        editable={true}
                        onFocus={() => setReplyInputFocused(true)}
                        onBlur={() => setReplyInputFocused(false)}
                      />
                      <TouchableOpacity
                        style={styles.storySendInInput}
                        onPress={handleSendReply}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="send"
                          size={Platform.OS === 'android' ? 20 : 22}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.storyActions}>
                      <TouchableOpacity
                        style={styles.storyActionButton}
                        onPress={toggleLike}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isLiked ? 'heart' : 'heart-outline'}
                          size={Platform.OS === 'android' ? 22 : 24}
                          color={isLiked ? '#FF3B5C' : '#fff'}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {/* In-story toast (reply sent, muted, link copied, etc.) */}
              {storyToastMessage !== null && (
                <Animated.View style={[styles.replySentToast, { opacity: replyToastOpacity }]} pointerEvents="none">
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.replySentToastIcon} />
                  <Text style={styles.replySentToastText}>{storyToastMessage}</Text>
                </Animated.View>
              )}

              {/* Viewers modal for your own story */}
              <Modal visible={viewersVisible} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.storyMenuBackdrop}
                  activeOpacity={1}
                  onPress={() => setViewersVisible(false)}
                >
                  <View style={styles.storyMenuCard} onStartShouldSetResponder={() => true}>
                    <Text style={[styles.storyMenuRowText, { textAlign: 'center', paddingVertical: 8 }]}>
                      Story viewers
                    </Text>
                    {viewersLoading ? (
                      <Text
                        style={{
                          textAlign: 'center',
                          paddingHorizontal: 24,
                          paddingBottom: 20,
                          color: '#555',
                          fontSize: 14,
                        }}
                      >
                        Loading viewers...
                      </Text>
                    ) : viewers.length === 0 ? (
                      <Text
                        style={{
                          textAlign: 'center',
                          paddingHorizontal: 24,
                          paddingBottom: 20,
                          color: '#555',
                          fontSize: 14,
                        }}
                      >
                        No viewers yet.
                      </Text>
                    ) : (
                      <View
                        style={{
                          maxHeight: 320,
                          paddingHorizontal: 12,
                          paddingBottom: 12,
                        }}
                      >
                        {viewers.map((v) => (
                          <View
                            key={v.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                            }}
                          >
                            {v.avatar ? (
                              <Image
                                source={{ uri: v.avatar }}
                                style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  marginRight: 10,
                                  backgroundColor: '#EEE',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Ionicons name="person" size={18} color="#999" />
                              </View>
                            )}
                            <Text style={{ fontSize: 15, color: '#000', fontWeight: '500' }}>
                              {v.username}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.storyMenuRow, { alignItems: 'center' }]}
                      activeOpacity={0.7}
                      onPress={() => setViewersVisible(false)}
                    >
                      <Text style={styles.storyMenuRowText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Three-dots menu */}
              <Modal visible={storyMenuVisible} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.storyMenuBackdrop}
                  activeOpacity={1}
                  onPress={() => setStoryMenuVisible(false)}
                >
                  <View style={styles.storyMenuCard} onStartShouldSetResponder={() => true}>
                    {selectedStory?.userId === user?._id && (
                      <TouchableOpacity style={styles.storyMenuRow} onPress={() => handleStoryMenuOption('delete')} activeOpacity={0.7}>
                        <Text style={[styles.storyMenuRowText, styles.storyMenuRowDanger]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.storyMenuRow} onPress={() => handleStoryMenuOption('mute')} activeOpacity={0.7}>
                      <Text style={styles.storyMenuRowText}>Mute</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.storyMenuRow} onPress={() => handleStoryMenuOption('report')} activeOpacity={0.7}>
                      <Text style={styles.storyMenuRowText}>Report</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.storyMenuRow} onPress={() => handleStoryMenuOption('share')} activeOpacity={0.7}>
                      <Text style={styles.storyMenuRowText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.storyMenuRow} onPress={() => handleStoryMenuOption('copy')} activeOpacity={0.7}>
                      <Text style={styles.storyMenuRowText}>Copy link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.storyMenuRow} onPress={() => handleStoryMenuOption('close')} activeOpacity={0.7}>
                      <Text style={[styles.storyMenuRowText, styles.storyMenuRowDanger]}>Close story</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              <ConfirmModal
                visible={!!deleteConfirmStoryId}
                onClose={() => setDeleteConfirmStoryId(null)}
                title="Delete story?"
                message="Are you sure? This cannot be undone."
                confirmLabel="Delete"
                onConfirm={handleConfirmDeleteStory}
                destructive
                icon="trash-outline"
              />
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
    zIndex: 20,
  },
  storyTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  viewersTopButton: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 2 : 4,
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
    left: Platform.OS === 'android' ? 16 : 20,
    right: Platform.OS === 'android' ? 16 : 20,
    bottom: Platform.OS === 'android' ? 52 : 58,
    paddingBottom: 4,
  },
  storyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 5 : 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,105,180,0.9)',
    marginBottom: Platform.OS === 'android' ? 8 : 10,
  },
  storyTagText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: Platform.OS === 'android' ? 5 : 6,
  },
  storyCaption: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#fff',
    fontWeight: '500',
    lineHeight: Platform.OS === 'android' ? 19 : 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyBottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 12 : 16,
    left: Platform.OS === 'android' ? 12 : 16,
    right: Platform.OS === 'android' ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  ownStoryBottomContent: {
    flex: 1,
  },
  ownStoryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewersInlineButton: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownStoryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ownStoryActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 6 : 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: Platform.OS === 'android' ? 6 : 8,
  },
  ownStoryActionText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '500',
  },
  storyMessageInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 8 : 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Platform.OS === 'android' ? 18 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingRight: Platform.OS === 'android' ? 6 : 8,
  },
  messageInput: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#fff',
  },
  storySendInInput: {
    padding: Platform.OS === 'android' ? 6 : 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  replySentToast: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 72 : 76,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,30,30,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    zIndex: 25,
    elevation: 25,
  },
  replySentToastIcon: {
    marginRight: 10,
  },
  replySentToastText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  storyMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  storyMenuCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'android' ? 28 : 38,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  storyMenuRow: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  storyMenuRowText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  storyMenuRowDanger: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});

export default StoriesSection;
