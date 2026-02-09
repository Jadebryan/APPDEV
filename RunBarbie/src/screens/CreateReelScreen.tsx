import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
  Modal,
  Slider,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useAuth } from '../context/AuthContext';
import { ActivityType } from '../types';
import { useUpload } from '../context/UploadContext';

const ACTIVITY_TYPES: ActivityType[] = ['run', 'hike', 'cycle', 'walk', 'other'];
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  hike: 'Hike',
  cycle: 'Cycle',
  walk: 'Walk',
  other: 'Other',
};

const CreateReelScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [originalVideoUri, setOriginalVideoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [checkingDuration, setCheckingDuration] = useState(false);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [trimStartTime, setTrimStartTime] = useState(0);
  const [trimEndTime, setTrimEndTime] = useState(60);
  const { runReelUpload } = useUpload();

  // Hide bottom tabs when CreateReelScreen is open. Use a short delay so that when
  // navigating from CreatePost → Reel, we re-hide after CreatePost's cleanup runs.
  const DEFAULT_TAB_BAR_STYLE = {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#DBDBDB',
    height: 50,
    paddingBottom: 5,
    paddingTop: 5,
  };
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      const tab = parent?.getParent?.();
      const target = tab || parent;
      const hideBar = () => {
        if (target) target.setOptions({ tabBarStyle: { display: 'none' } });
      };
      hideBar();
      const t = setTimeout(hideBar, 50);

      return () => {
        clearTimeout(t);
        if (target) {
          target.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
        }
      };
    }, [navigation])
  );

  // Caption generation – same parts as post/story (runners, hikers, trail runners)
  const captionParts = useMemo(
    () => ({
      run: {
        starters: ['Morning', 'Sunrise', 'Evening', 'Trail', 'Speed', 'Fast', 'Easy', 'Long', 'Quick'],
        verbs: ['Chasing', 'Running', 'Feeling', 'Crushing', 'Conquering', 'Loving', 'Enjoying', 'Pushing'],
        nouns: ['miles', 'PRs', 'pace', 'trail', 'streets', 'path', 'road', 'track', 'route'],
        adjectives: ['fast', 'strong', 'free', 'perfect', 'smooth', 'powerful', 'energetic', 'amazing'],
        endings: ['today', 'vibes', 'mode', 'therapy', 'activated', 'in motion', 'for my mind'],
        emojis: ['🌅', '🏃‍♀️', '⚡', '💪', '🎯', '😊', '📈', '🩵', '🏃', '🧠'],
      },
      hike: {
        starters: ['Trail', 'Mountain', 'Summit', 'Peak', 'Forest', 'Nature', 'Elevation', 'Trail'],
        verbs: ['Chasing', 'Conquering', 'Reaching', 'Exploring', 'Climbing', 'Discovering', 'Finding'],
        nouns: ['views', 'trail', 'peak', 'summit', 'elevation', 'path', 'ridge', 'valley', 'forest'],
        adjectives: ['high', 'amazing', 'breathtaking', 'stunning', 'peaceful', 'serene', 'majestic'],
        endings: ['therapy', 'unlocked', 'magic', 'session', 'vibes', 'in full effect', 'happening'],
        emojis: ['🌲', '🏔️', '⛰️', '🌿', '🔓', '✨', '📈', '🥾', '🧘', '👣'],
      },
      cycle: {
        starters: ['Two wheels', 'Pedal', 'Bike', 'Road', 'Sunday', 'Long', 'Quick', 'Morning'],
        verbs: ['Spinning', 'Pedaling', 'Chasing', 'Riding', 'Cruising', 'Exploring', 'Conquering'],
        nouns: ['city', 'road', 'trail', 'path', 'tailwind', 'ride', 'adventure', 'journey'],
        adjectives: ['endless', 'smooth', 'fast', 'long', 'amazing', 'epic', 'perfect'],
        endings: ['only', 'mode', 'therapy', 'session', 'vibes', 'activated', 'in motion'],
        emojis: ['🚴', '💨', '⚡', '😊', '🛣️', '🚵', '🌅', '🌀', '☀️'],
      },
      walk: {
        starters: ['Steps', 'Stroll', 'Walk', 'Peaceful', 'Little', 'Urban', 'Morning', 'Evening'],
        verbs: ['Walking', 'Strolling', 'Exploring', 'Taking', 'Finding', 'Discovering'],
        nouns: ['soul', 'mind', 'pace', 'steps', 'neighborhood', 'path', 'route', 'journey'],
        adjectives: ['peaceful', 'clear', 'fresh', 'calm', 'serene', 'gentle', 'relaxing'],
        endings: ['meditation', 'therapy', 'reset', 'vibes', 'mode', 'activated', 'in motion'],
        emojis: ['🚶‍♀️', '💫', '🌿', '🧘', '🌬️', '👣', '🏙️', '🕊️', '🚶', '🏘️'],
      },
      other: {
        starters: ['Movement', 'Active', 'Fitness', 'Staying', 'Feeling', 'Moving', 'Doing'],
        verbs: ['Moving', 'Feeling', 'Staying', 'Doing', 'Crushing', 'Loving'],
        nouns: ['movement', 'body', 'mind', 'mood', 'win', 'thing', 'medicine'],
        adjectives: ['strong', 'active', 'alive', 'good', 'amazing', 'powerful'],
        endings: ['today', 'mode', 'medicine', 'therapy', 'vibes', 'activated'],
        emojis: ['💗', '✨', '🎯', '💪', '🔥', '😊', '🧠💪', '🏃‍♀️'],
      },
    }),
    []
  );

  const generateCaption = () => {
    const parts = captionParts[activityType];
    if (!parts) {
      setCaption('Active and moving! 💪');
      return;
    }
    const patterns = [
      () => {
        const starter = parts.starters[Math.floor(Math.random() * parts.starters.length)];
        const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${starter} ${noun} ${emoji}`;
      },
      () => {
        const verb = parts.verbs[Math.floor(Math.random() * parts.verbs.length)];
        const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const ending = parts.endings[Math.floor(Math.random() * parts.endings.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${verb} ${noun} ${ending} ${emoji}`;
      },
      () => {
        const verb = parts.verbs[Math.floor(Math.random() * parts.verbs.length)];
        const adj = parts.adjectives[Math.floor(Math.random() * parts.adjectives.length)];
        const ending = parts.endings[Math.floor(Math.random() * parts.endings.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${verb} ${adj} ${ending} ${emoji}`;
      },
      () => {
        const starter = parts.starters[Math.floor(Math.random() * parts.starters.length)];
        const adj = parts.adjectives[Math.floor(Math.random() * parts.adjectives.length)];
        const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${starter} ${adj} ${noun} ${emoji}`;
      },
      () => {
        const noun1 = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const noun2 = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${noun1.charAt(0).toUpperCase() + noun1.slice(1)} for my ${noun2} ${emoji}`;
      },
    ];
    const patternIndex = Math.floor(Math.random() * patterns.length);
    setCaption(patterns[patternIndex]());
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your media library to choose a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false, // We'll handle trimming ourselves
      aspect: [9, 16],
      quality: 0.8,
      // Remove videoMaxDuration to allow longer videos - we'll trim them
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      const duration = result.assets[0].duration;
      
      // Check duration (in milliseconds, convert to seconds)
      const durationSeconds = duration ? duration / 1000 : null;
      
      // Store original video URI
      setOriginalVideoUri(uri);
      
      // If duration not provided by ImagePicker, we'll check in preview
      if (!durationSeconds) {
        setVideoUri(uri);
        setVideoDuration(null);
        setCheckingDuration(true);
      } else {
        setVideoUri(uri);
        setVideoDuration(durationSeconds);
        
        // If video is longer than 60 seconds, show trim modal
        if (durationSeconds > 60) {
          setTrimStartTime(0);
          setTrimEndTime(60);
          setShowTrimModal(true);
        }
      }
    }
  };

  const handlePost = () => {
    if (!videoUri || !user) return;
    
    // Use trimmed video if trimming was applied
    const finalVideoUri = originalVideoUri && videoDuration && videoDuration > 60 
      ? originalVideoUri // Will be trimmed on backend using trimStartTime and trimEndTime
      : videoUri;
    
    // Final duration check before posting
    const finalDuration = videoDuration && videoDuration > 60 
      ? (trimEndTime - trimStartTime)
      : videoDuration;
    
    if (finalDuration && finalDuration > 60) {
      Alert.alert(
        'Video too long',
        'Reels must be 1 minute or shorter. Please trim your video.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    runReelUpload({
      videoUri: finalVideoUri,
      caption: caption.trim() || 'No caption',
      activityType,
      trimStartTime: originalVideoUri && videoDuration && videoDuration > 60 ? trimStartTime : undefined,
      trimEndTime: originalVideoUri && videoDuration && videoDuration > 60 ? trimEndTime : undefined,
    });
    navigation.goBack();
  };

  const previewHeight = Math.min(SCREEN_HEIGHT * 0.5, SCREEN_WIDTH * (16 / 9));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeftBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New reel</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!videoUri}
          style={styles.headerRightBtn}
        >
          <Text style={[styles.postText, !videoUri && styles.postTextDisabled]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.previewSection}>
          {videoUri ? (
            <View style={[styles.previewWrap, { height: previewHeight }]}>
              <ReelPreview 
                uri={videoUri} 
                onDurationCheck={(duration) => {
                  setVideoDuration(duration);
                  if (duration > 60 && !showTrimModal) {
                    // Auto-trim: set to first 60 seconds, but show trim modal for user to adjust
                    setTrimStartTime(0);
                    setTrimEndTime(Math.min(60, duration));
                    setShowTrimModal(true);
                  }
                }}
              />
              {videoDuration !== null && videoDuration > 60 && (
                <TouchableOpacity 
                  style={styles.trimBtn}
                  onPress={() => setShowTrimModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cut-outline" size={18} color="#fff" />
                  <Text style={styles.trimBtnText}>Trim video</Text>
                </TouchableOpacity>
              )}
              {checkingDuration && (
                <View style={styles.checkingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.checkingText}>Checking duration...</Text>
                </View>
              )}
              <TouchableOpacity style={styles.changeVideoBtn} onPress={pickVideo}>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text style={styles.changeVideoText}>Change video</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.pickWrap, { height: previewHeight }]} onPress={pickVideo} activeOpacity={0.8}>
              <Ionicons name="videocam-outline" size={64} color="#999" />
              <Text style={styles.pickTitle}>Choose video</Text>
              <Text style={styles.pickSubtext}>Up to 60 seconds • 9:16 works best</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.captionSection}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="What's this reel about?"
            placeholderTextColor="#999"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateCaption}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#FF69B4" style={{ marginRight: 6 }} />
            <Text style={styles.generateButtonText}>Generate Caption</Text>
          </TouchableOpacity>
          <Text style={styles.charCount}>{caption.length}/2200</Text>
        </View>

        <View style={styles.activitySection}>
          <Text style={styles.label}>Activity</Text>
          <View style={styles.activityRow}>
            {ACTIVITY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.activityChip, activityType === type && styles.activityChipActive]}
                onPress={() => setActivityType(type)}
              >
                <Text style={[styles.activityChipText, activityType === type && styles.activityChipTextActive]}>
                  {ACTIVITY_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Trim Modal */}
      <Modal
        visible={showTrimModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrimModal(false)}
      >
        <View style={styles.trimModalOverlay}>
          <View style={styles.trimModalContent}>
            <View style={styles.trimModalHeader}>
              <Text style={styles.trimModalTitle}>Trim Video</Text>
              <TouchableOpacity onPress={() => setShowTrimModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {originalVideoUri && videoDuration && (
              <VideoTrimEditor
                videoUri={originalVideoUri}
                duration={videoDuration}
                startTime={trimStartTime}
                endTime={trimEndTime}
                onStartTimeChange={setTrimStartTime}
                onEndTimeChange={setTrimEndTime}
                onConfirm={(start, end) => {
                  // For now, we'll use the original video and handle trimming on backend
                  // Or we can use ImagePicker's editing feature
                  setTrimStartTime(start);
                  setTrimEndTime(end);
                  setShowTrimModal(false);
                  // Note: Actual trimming would need to be done on backend or with FFmpeg
                  // For now, we'll store trim times and handle on upload
                }}
                onCancel={() => {
                  setShowTrimModal(false);
                  // Reset to auto-trim (first 60 seconds)
                  if (videoDuration) {
                    setTrimStartTime(0);
                    setTrimEndTime(Math.min(60, videoDuration));
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/** Video Trim Editor Component */
const VideoTrimEditor: React.FC<{
  videoUri: string;
  duration: number;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  onConfirm: (start: number, end: number) => void;
  onCancel: () => void;
}> = ({ videoUri, duration, startTime, endTime, onStartTimeChange, onEndTimeChange, onConfirm, onCancel }) => {
  const [previewTime, setPreviewTime] = useState(startTime);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimeChange = (value: number) => {
    const newStart = Math.max(0, Math.min(value, duration - 60));
    onStartTimeChange(newStart);
    setPreviewTime(newStart);
    // Adjust end time if needed to maintain 60-second limit
    if (endTime < newStart + 60) {
      onEndTimeChange(Math.min(duration, newStart + 60));
    }
  };

  const handleEndTimeChange = (value: number) => {
    const newEnd = Math.min(duration, Math.max(startTime + 1, value));
    // Ensure max 60 seconds
    if (newEnd - startTime > 60) {
      onEndTimeChange(startTime + 60);
    } else {
      onEndTimeChange(newEnd);
    }
    setPreviewTime(startTime); // Preview from start of selected segment
  };

  return (
    <View style={styles.trimEditor}>
      <View style={styles.trimPreview}>
        <ReelPreview uri={videoUri} previewTime={previewTime} />
      </View>

      <View style={styles.trimControls}>
        <View style={styles.trimTimeDisplay}>
          <View style={styles.trimTimeItem}>
            <Text style={styles.trimTimeLabel}>Start</Text>
            <Text style={styles.trimTimeValue}>{formatTime(startTime)}</Text>
          </View>
          <View style={styles.trimTimeItem}>
            <Text style={styles.trimTimeLabel}>Duration</Text>
            <Text style={styles.trimTimeValue}>{formatTime(endTime - startTime)}</Text>
          </View>
          <View style={styles.trimTimeItem}>
            <Text style={styles.trimTimeLabel}>End</Text>
            <Text style={styles.trimTimeValue}>{formatTime(endTime)}</Text>
          </View>
        </View>

        <View style={styles.trimSliderContainer}>
          <Text style={styles.trimSliderLabel}>Start time</Text>
          <Slider
            style={styles.trimSlider}
            minimumValue={0}
            maximumValue={Math.max(0, duration - 60)}
            value={startTime}
            onValueChange={handleStartTimeChange}
            minimumTrackTintColor="#0095f6"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#0095f6"
          />
        </View>

        <View style={styles.trimSliderContainer}>
          <Text style={styles.trimSliderLabel}>End time</Text>
          <Slider
            style={styles.trimSlider}
            minimumValue={startTime + 1}
            maximumValue={Math.min(duration, startTime + 60)}
            value={endTime}
            onValueChange={handleEndTimeChange}
            minimumTrackTintColor="#0095f6"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#0095f6"
          />
        </View>

        <View style={styles.trimActions}>
          <TouchableOpacity style={styles.trimCancelBtn} onPress={onCancel}>
            <Text style={styles.trimCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trimConfirmBtn}
            onPress={() => onConfirm(startTime, endTime)}
          >
            <Text style={styles.trimConfirmText}>Use this segment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/** Simple preview player for the selected video (no loop, just preview). */
function ReelPreview({ uri, onDurationCheck, previewTime }: { uri: string; onDurationCheck?: (duration: number) => void; previewTime?: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const hasCheckedRef = useRef(false);
  
  // Seek to preview time if provided
  useEffect(() => {
    if (previewTime !== undefined && player.duration > 0) {
      player.currentTime = previewTime;
    }
  }, [previewTime, player]);
  
  useEffect(() => {
    if (!onDurationCheck || hasCheckedRef.current) return;
    
    const checkDuration = () => {
      if (player.duration > 0 && !hasCheckedRef.current) {
        onDurationCheck(player.duration);
        hasCheckedRef.current = true;
      }
    };
    
    // Check duration when player is ready
    const sub = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        checkDuration();
      }
    });
    
    // Also check periodically in case duration loads later (max 5 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      checkDuration();
      if (hasCheckedRef.current || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
    
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [player, onDurationCheck]);
  
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={true}
      {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  headerLeftBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRightBtn: {
    minWidth: 56,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  postText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0095f6',
  },
  postTextDisabled: {
    color: '#ccc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  previewSection: {
    padding: 16,
  },
  previewWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  changeVideoBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  changeVideoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  pickWrap: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  pickSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  durationWarning: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  durationWarningText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  checkingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  trimBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 149, 246, 0.9)',
    borderRadius: 8,
  },
  trimBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  trimModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  trimModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  trimModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  trimModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  trimEditor: {
    flex: 1,
  },
  trimPreview: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    marginTop: 16,
  },
  trimControls: {
    padding: 16,
  },
  trimTimeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  trimTimeItem: {
    alignItems: 'center',
  },
  trimTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  trimTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  trimSliderContainer: {
    marginBottom: 20,
  },
  trimSliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  trimSlider: {
    width: '100%',
    height: 40,
  },
  trimActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  trimCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  trimCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  trimConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#0095f6',
    alignItems: 'center',
  },
  trimConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  captionSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF69B4',
    backgroundColor: '#FFF5FC',
  },
  generateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF69B4',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  activitySection: {
    paddingHorizontal: 16,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activityChipActive: {
    backgroundColor: '#0095f6',
  },
  activityChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  activityChipTextActive: {
    color: '#fff',
  },
});

export default CreateReelScreen;
