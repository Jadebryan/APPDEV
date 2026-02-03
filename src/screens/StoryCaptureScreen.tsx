import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ActivityType } from '../types';
import { useStories } from '../context/StoriesContext';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/api';

const ACTIVITY_OPTIONS: ActivityType[] = ['run', 'hike', 'cycle', 'walk', 'other'];

const StoryCaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const { addOrUpdateMyStory, stories } = useStories();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [usedCaptions, setUsedCaptions] = useState<Set<string>>(new Set());

  // Hide bottom tabs when StoryCaptureScreen is open
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' },
        });
      }

      return () => {
        if (parent) {
          parent.setOptions({
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#DBDBDB',
              height: 50,
              paddingBottom: 5,
              paddingTop: 5,
            },
          });
        }
      };
    }, [navigation])
  );

  // Load used captions from posts and stories
  useEffect(() => {
    const loadUsedCaptions = async () => {
      if (!user?._id) return;

      const used = new Set<string>();

      // Get captions from user's stories
      const myStories = stories.filter((s) => s.userId === user._id && s.caption);
      myStories.forEach((story) => {
        if (story.caption) {
          used.add(story.caption.trim());
        }
      });

      // Get captions from user's posts
      try {
        const allPosts = await postService.getAllPosts();
        const myPosts = allPosts.filter((p) => p.userId === user._id && p.caption);
        myPosts.forEach((post) => {
          if (post.caption) {
            used.add(post.caption.trim());
          }
        });
      } catch (error) {
        console.error('Error loading posts for caption suggestions:', error);
      }

      setUsedCaptions(used);
    };

    loadUsedCaptions();
  }, [user?._id, stories]);

  // Caption generation components - like password generator parts
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
    [],
  );

  // Generate a new caption dynamically by combining parts
  const generateCaption = () => {
    const parts = captionParts[activityType];
    if (!parts) {
      setCaption('Active and moving! 💪');
      return;
    }

    // Different caption patterns/templates
    const patterns = [
      // Pattern 1: Starter + Noun + Emoji
      () => {
        const starter = parts.starters[Math.floor(Math.random() * parts.starters.length)];
        const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${starter} ${noun} ${emoji}`;
      },
      // Pattern 2: Verb + Noun + Ending + Emoji
      () => {
        const verb = parts.verbs[Math.floor(Math.random() * parts.verbs.length)];
        const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const ending = parts.endings[Math.floor(Math.random() * parts.endings.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${verb} ${noun} ${ending} ${emoji}`;
      },
      // Pattern 3: Feeling + Adjective + Ending + Emoji
      () => {
        const verb = parts.verbs[Math.floor(Math.random() * parts.verbs.length)];
        const adj = parts.adjectives[Math.floor(Math.random() * parts.adjectives.length)];
        const ending = parts.endings[Math.floor(Math.random() * parts.endings.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${verb} ${adj} ${ending} ${emoji}`;
      },
      // Pattern 4: Starter + Adjective + Noun + Emoji
      () => {
        const starter = parts.starters[Math.floor(Math.random() * parts.starters.length)];
        const adj = parts.adjectives[Math.floor(Math.random() * parts.adjectives.length)];
        const noun = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${starter} ${adj} ${noun} ${emoji}`;
      },
      // Pattern 5: Noun + for + Noun + Emoji
      () => {
        const noun1 = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const noun2 = parts.nouns[Math.floor(Math.random() * parts.nouns.length)];
        const emoji = parts.emojis[Math.floor(Math.random() * parts.emojis.length)];
        return `${noun1.charAt(0).toUpperCase() + noun1.slice(1)} for my ${noun2} ${emoji}`;
      },
    ];

    // Try to generate a unique caption (max 10 attempts)
    let attempts = 0;
    let generatedCaption = '';
    
    while (attempts < 10) {
      const patternIndex = Math.floor(Math.random() * patterns.length);
      generatedCaption = patterns[patternIndex]();
      
      // Check if this caption hasn't been used
      if (!usedCaptions.has(generatedCaption.trim())) {
        setCaption(generatedCaption);
        return;
      }
      attempts++;
    }
    
    // If all attempts resulted in used captions, use the last generated one anyway
    setCaption(generatedCaption || 'Active and moving! 💪');
  };

  const pickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const captureWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleShare = () => {
    if (!imageUri) return;
    addOrUpdateMyStory({ mediaUri: imageUri, caption, activityType });
    navigation.goBack();
  };

  const hasImage = !!imageUri;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New story</Text>
        <View style={styles.headerIcon} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 60}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.previewWrapper}>
            {hasImage ? (
              <>
                <Image source={{ uri: imageUri! }} style={styles.previewImage} resizeMode="cover" />
                {/* subtle gradient + preview text overlay */}
                <View style={styles.previewGradient} />
                <View style={styles.previewOverlayRow}>
                  <View style={styles.previewTag}>
                  <Ionicons name="sparkles" size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.previewTagText}>Run Barbie story</Text>
                  </View>
                  {caption.length > 0 && (
                    <Text style={styles.previewCaption} numberOfLines={1}>
                      {caption}
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons name="image" size={40} color="#BBB" />
                <Text style={styles.previewText}>Add a trail photo for your story</Text>
              </View>
            )}
          </View>

          <View style={styles.captureRow}>
            <TouchableOpacity style={styles.captureButton} onPress={captureWithCamera} activeOpacity={0.85}>
              <Ionicons name="camera" size={18} color="#000" />
            <Text style={[styles.captureText, { marginLeft: 6 }]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={pickFromLibrary} activeOpacity={0.85}>
              <Ionicons name="images" size={18} color="#000" />
            <Text style={[styles.captureText, { marginLeft: 6 }]}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaSection}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a note about your run, hike, or ride..."
              placeholderTextColor="#999"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={140}
              textAlignVertical="top"
            />

            {/* Generate Caption Button */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateCaption}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={16} color="#FF69B4" style={{ marginRight: 6 }} />
              <Text style={styles.generateButtonText}>Generate Caption</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 12 }]}>Activity</Text>
            <View style={styles.activityRow}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.activityChip,
                    activityType === opt && styles.activityChipActive,
                  ]}
                  onPress={() => setActivityType(opt)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.activityChipText,
                      activityType === opt && styles.activityChipTextActive,
                    ]}
                  >
                    {opt === 'other' ? 'Other' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.shareButton, !hasImage && styles.shareButtonDisabled]}
            activeOpacity={hasImage ? 0.9 : 1}
            onPress={handleShare}
            disabled={!hasImage}
          >
            <Text style={styles.shareText}>Share to story</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 28, // extra so fields don't sit under footer
  },
  previewWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    aspectRatio: 9 / 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewOverlayRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,105,180,0.9)',
    marginBottom: 4,
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  previewCaption: {
    fontSize: 13,
    color: '#fff',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewText: {
    marginTop: 8,
    fontSize: 13,
    color: '#EEE',
    textAlign: 'center',
  },
  captureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
    flex: 1,
    marginHorizontal: 4,
  },
  captureText: {
    fontSize: 13,
    color: '#111',
    fontWeight: '500',
  },
  metaSection: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  captionInput: {
    minHeight: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111',
    textAlignVertical: 'top',
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  activityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  activityChipActive: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  activityChipText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },
  activityChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  shareButton: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FF69B4',
  },
  shareButtonDisabled: {
    backgroundColor: '#F2A9D0',
  },
  shareText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default StoryCaptureScreen;

