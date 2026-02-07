import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '../context/AuthContext';
import { reelService } from '../services/api';
import { ActivityType } from '../types';

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
  const [caption, setCaption] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [posting, setPosting] = useState(false);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 90,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!videoUri || !user) return;
    setPosting(true);
    try {
      await reelService.createReel({
        videoUri,
        caption: caption.trim() || 'No caption',
        activityType,
      });
      Alert.alert('Reel posted', 'Your reel is live!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not post reel. Try again.');
    } finally {
      setPosting(false);
    }
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
          disabled={!videoUri || posting}
          style={styles.headerRightBtn}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#0095f6" />
          ) : (
            <Text style={[styles.postText, (!videoUri || posting) && styles.postTextDisabled]}>
              Post
            </Text>
          )}
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
              <ReelPreview uri={videoUri} />
              <TouchableOpacity style={styles.changeVideoBtn} onPress={pickVideo}>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text style={styles.changeVideoText}>Change video</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.pickWrap, { height: previewHeight }]} onPress={pickVideo} activeOpacity={0.8}>
              <Ionicons name="videocam-outline" size={64} color="#999" />
              <Text style={styles.pickTitle}>Choose video</Text>
              <Text style={styles.pickSubtext}>Up to 90 seconds • 9:16 works best</Text>
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
    </SafeAreaView>
  );
};

/** Simple preview player for the selected video (no loop, just preview). */
function ReelPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
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
