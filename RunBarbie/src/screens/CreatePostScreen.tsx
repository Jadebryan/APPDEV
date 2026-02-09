import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  Keyboard,
  Linking,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { ActivityType, PostLocation } from '../types';
import { postService, uploadService } from '../services/api';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStories } from '../context/StoriesContext';
import { useUpload } from '../context/UploadContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_POST_PHOTOS = 10;

const CreatePostScreen: React.FC = () => {
  const { showToast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [distance, setDistance] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const totalDurationMinutes = (parseInt(durationHours, 10) || 0) * 60 + (parseInt(durationMinutes, 10) || 0);
  const [loading, setLoading] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false); // Step 2: editing details
  const [usedCaptions, setUsedCaptions] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState<PostLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationMode, setLocationMode] = useState<'choose' | 'search' | 'preview'>('choose');
  const [locationPreview, setLocationPreview] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const [searchResults, setSearchResults] = useState<{ latitude: number; longitude: number; name: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [cropAspect, setCropAspect] = useState<'original' | '1:1' | '4:5'>('1:1');
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropImageUri, setCropImageUri] = useState<string | null>(null);
  const [cropImageSize, setCropImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const navigation = useNavigation();
  const { user } = useAuth();
  const { stories } = useStories();
  const { runPostUpload } = useUpload();

  const image = images[selectedImageIndex] || null;

  // Hide bottom tabs when CreatePostScreen is open
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

  const activityTypes: ActivityType[] = ['run', 'hike', 'cycle', 'walk', 'other'];

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

  const loadRecentPhotos = useCallback(async () => {
    // Don't load MediaLibrary on Android – Expo Go can't provide it and the native module logs a warning.
    if (Platform.OS === 'android') return;

    try {
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status !== 'granted') return;

      const assetsResponse = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.photo],
        first: 24,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      const uris = assetsResponse.assets.map((asset) => asset.uri).filter(Boolean) as string[];
      setRecentPhotos(uris);
    } catch (error) {
      console.warn('Could not load recent photos:', error);
    }
  }, []);

  useEffect(() => {
    loadRecentPhotos();
  }, [loadRecentPhotos]);

  const pickFromRecent = (uri: string) => {
    if (images.length >= MAX_POST_PHOTOS) {
      showToast(`Maximum ${MAX_POST_PHOTOS} photos per post.`, 'info');
      return;
    }
    setImages((prev) => [...prev, uri].slice(0, MAX_POST_PHOTOS));
    setSelectedImageIndex(images.length);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_POST_PHOTOS,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((asset) => asset.uri).slice(0, MAX_POST_PHOTOS);
        setImages(uris);
        setSelectedImageIndex(0);
        loadRecentPhotos(); // Refresh recents so new picks appear next time
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Failed to open gallery. Please try again.', 'error');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (images.length >= MAX_POST_PHOTOS) {
        showToast(`Maximum ${MAX_POST_PHOTOS} photos per post.`, 'info');
        return;
      }
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, MAX_POST_PHOTOS));
      setSelectedImageIndex(images.length);
      loadRecentPhotos(); // Refresh recents so new photo appears
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image:', error);
      throw error;
    }
  };

  const handleNext = () => {
    if (images.length === 0) {
      showToast('Please select at least one image', 'error');
      return;
    }
    setShowDetails(true);
  };

  const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });

  const applyEdit = useCallback(
    async (action: () => Promise<{ uri: string }>) => {
      const uri = images[selectedImageIndex];
      if (!uri) return;
      setEditLoading(true);
      try {
        const result = await action();
        setImages((prev) => {
          const next = [...prev];
          next[selectedImageIndex] = result.uri;
          return next;
        });
        setEditModalVisible(false);
        showToast('Photo updated', 'success');
      } catch (e) {
        console.warn('Edit failed:', e);
        showToast('Could not edit photo. Try again.', 'info');
      } finally {
        setEditLoading(false);
      }
    },
    [images, selectedImageIndex, showToast]
  );

  const handleRotate90 = useCallback(() => {
    const uri = images[selectedImageIndex];
    if (!uri) return;
    applyEdit(() =>
      ImageManipulator.manipulateAsync(uri, [{ rotate: 90 }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG })
    );
  }, [images, selectedImageIndex, applyEdit]);

  const handleFlipH = useCallback(() => {
    const uri = images[selectedImageIndex];
    if (!uri) return;
    applyEdit(() =>
      ImageManipulator.manipulateAsync(uri, [{ flip: ImageManipulator.FlipType.Horizontal }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      })
    );
  }, [images, selectedImageIndex, applyEdit]);

  const handleFlipV = useCallback(() => {
    const uri = images[selectedImageIndex];
    if (!uri) return;
    applyEdit(() =>
      ImageManipulator.manipulateAsync(uri, [{ flip: ImageManipulator.FlipType.Vertical }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      })
    );
  }, [images, selectedImageIndex, applyEdit]);

  const openCropModal = useCallback(async () => {
    const uri = images[selectedImageIndex];
    if (!uri) return;
    setEditModalVisible(false);
    try {
      const size = await getImageDimensions(uri);
      setCropImageUri(uri);
      setCropImageSize(size);
      setCropAspect('1:1');
      setCropZoom(1);
      const boxW = SCREEN_WIDTH;
      const boxH = SCREEN_WIDTH;
      const scale = Math.max(boxW / size.width, boxH / size.height);
      setCropPan({
        x: (boxW - size.width * scale) / 2,
        y: (boxH - size.height * scale) / 2,
      });
      setCropModalVisible(true);
    } catch (e) {
      showToast('Could not load image for crop.', 'info');
    }
  }, [images, selectedImageIndex, getImageDimensions, showToast]);

  const closeCropModal = useCallback(() => {
    setCropModalVisible(false);
    setCropImageUri(null);
    setCropImageSize(null);
    setEditModalVisible(true);
  }, []);

  const getCropBoxSize = useCallback(() => {
    if (!cropImageSize) return { width: SCREEN_WIDTH, height: SCREEN_WIDTH };
    const w = SCREEN_WIDTH;
    if (cropAspect === '1:1') return { width: w, height: w };
    if (cropAspect === '4:5') return { width: w, height: w * (5 / 4) };
    return { width: w, height: w * (cropImageSize.height / cropImageSize.width) };
  }, [cropAspect, cropImageSize]);

  const applyCropFromModal = useCallback(async () => {
    if (!cropImageUri || !cropImageSize) return;
    const box = getCropBoxSize();
    const scale =
      cropZoom * Math.max(box.width / cropImageSize.width, box.height / cropImageSize.height);
    const cropW = Math.round(box.width / scale);
    const cropH = Math.round(box.height / scale);
    let originX = Math.round(-cropPan.x / scale);
    let originY = Math.round(-cropPan.y / scale);
    originX = Math.max(0, Math.min(cropImageSize.width - cropW, originX));
    originY = Math.max(0, Math.min(cropImageSize.height - cropH, originY));
    const finalW = Math.min(cropW, cropImageSize.width - originX);
    const finalH = Math.min(cropH, cropImageSize.height - originY);
    if (finalW <= 0 || finalH <= 0) return;
    setCropApplying(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        cropImageUri,
        [{ crop: { originX, originY, width: finalW, height: finalH } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImages((prev) => {
        const next = [...prev];
        next[selectedImageIndex] = result.uri;
        return next;
      });
      setCropModalVisible(false);
      setCropImageUri(null);
      setCropImageSize(null);
      showToast('Photo cropped', 'success');
    } catch (e) {
      showToast('Could not crop. Try again.', 'info');
    } finally {
      setCropApplying(false);
    }
  }, [
    cropImageUri,
    cropImageSize,
    cropPan,
    cropZoom,
    getCropBoxSize,
    selectedImageIndex,
    showToast,
  ]);

  const cropPanResponder = useMemo(() => {
    const box = getCropBoxSize();
    const imgW = cropImageSize?.width ?? 1;
    const imgH = cropImageSize?.height ?? 1;
    const scale = cropZoom * Math.max(box.width / imgW, box.height / imgH);
    const minX = Math.min(0, box.width - imgW * scale);
    const minY = Math.min(0, box.height - imgH * scale);
    const maxX = 0;
    const maxY = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        panStartRef.current = { x: cropPan.x, y: cropPan.y };
      },
      onPanResponderMove: (_, g) => {
        const nx = Math.max(minX, Math.min(maxX, panStartRef.current.x + g.dx));
        const ny = Math.max(minY, Math.min(maxY, panStartRef.current.y + g.dy));
        setCropPan({ x: nx, y: ny });
      },
      onPanResponderRelease: (_, g) => {
        const nx = Math.max(minX, Math.min(maxX, panStartRef.current.x + g.dx));
        const ny = Math.max(minY, Math.min(maxY, panStartRef.current.y + g.dy));
        setCropPan({ x: nx, y: ny });
      },
    });
  }, [cropImageSize, cropZoom, cropAspect, getCropBoxSize, cropPan.x, cropPan.y]);

  useEffect(() => {
    if (!cropImageSize || !cropModalVisible) return;
    const box = getCropBoxSize();
    const scale =
      cropZoom * Math.max(box.width / cropImageSize.width, box.height / cropImageSize.height);
    setCropPan({
      x: (box.width - cropImageSize.width * scale) / 2,
      y: (box.height - cropImageSize.height * scale) / 2,
    });
  }, [cropAspect, cropModalVisible, cropImageSize, getCropBoxSize]);

  const handlePinCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to pin this post on the map.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      let name: string | undefined;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place?.city || place?.street || place?.name) {
          name = [place.name, place.street, place.city].filter(Boolean).join(', ') || undefined;
        }
      } catch {
        name = 'Pinned location';
      }
      setLocation({ latitude, longitude, name: name || 'Pinned location' });
      setLocationModalVisible(false);
    } catch (e) {
      console.error('Location error', e);
      showToast('Could not get location. Try again.', 'error');
    } finally {
      setLocationLoading(false);
    }
  };

  // Keep ref in sync so we can ignore stale results when user keeps typing
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Live location search: Nominatim (many results with names, IG-style) with expo-location fallback.
  const SEARCH_DEBOUNCE_MS = 500;
  const NOMINATIM_LIMIT = 15;
  useEffect(() => {
    if (locationMode !== 'search') return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Nominatim: many results with display_name (like IG location search)
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${NOMINATIM_LIMIT}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'RunBarbie/1.0 (location search)' },
        });
        if (searchQueryRef.current.trim() !== q) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSearchResults(
              data.map((r: { lat: string; lon: string; display_name: string }) => ({
                latitude: parseFloat(r.lat),
                longitude: parseFloat(r.lon),
                name: r.display_name || q,
              }))
            );
            return;
          }
        }
        // Fallback: expo-location geocode (fewer results, no names)
        const results = await Location.geocodeAsync(q);
        if (searchQueryRef.current.trim() !== q) return;
        setSearchResults(
          results.map((r) => ({
            latitude: r.latitude,
            longitude: r.longitude,
            name: q,
          }))
        );
      } catch (e) {
        console.error('Location search error', e);
        if (searchQueryRef.current.trim() === q) setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [locationMode, searchQuery]);

  const handleSearchLocation = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleSelectSearchResult = (lat: number, lng: number, name?: string) => {
    setLocationPreview({
      latitude: lat,
      longitude: lng,
      name: name?.trim() || searchQuery.trim() || 'Searched location',
    });
    setLocationMode('preview');
  };

  const handleViewPreviewOnMap = () => {
    if (!locationPreview) return;
    const url = `https://www.google.com/maps?q=${locationPreview.latitude},${locationPreview.longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleConfirmPreviewLocation = () => {
    if (!locationPreview) return;
    setLocation({
      latitude: locationPreview.latitude,
      longitude: locationPreview.longitude,
      name: locationPreview.name,
    });
    setLocationModalVisible(false);
    setLocationMode('choose');
    setLocationPreview(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBackFromPreview = () => {
    setLocationPreview(null);
    setLocationMode('search');
  };

  const openLocationModal = () => {
    setLocationMode('choose');
    setLocationPreview(null);
    setSearchQuery('');
    setSearchResults([]);
    setLocationModalVisible(true);
  };

  const closeLocationModal = () => {
    setLocationModalVisible(false);
    setLocationMode('choose');
    setLocationPreview(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveLocation = () => setLocation(null);

  const handleSubmit = () => {
    if (images.length === 0) {
      showToast('Please select at least one image', 'error');
      return;
    }

    runPostUpload({
      imageUris: images,
      caption,
      activityType,
      distance: distance ? parseFloat(distance) : undefined,
      duration: totalDurationMinutes > 0 ? totalDurationMinutes : undefined,
      location: location ?? undefined,
    });
    navigation.goBack();
  };

  // Calculate pace from distance and duration (duration in minutes)
  const calculatePace = () => {
    if (distance && totalDurationMinutes > 0) {
      const dist = parseFloat(distance);
      if (dist > 0) {
        const paceMin = Math.floor(totalDurationMinutes / dist);
        const paceSec = Math.round(((totalDurationMinutes / dist) % 1) * 60);
        return `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;
      }
    }
    return null;
  };

  const formatDurationDisplay = () => {
    if (totalDurationMinutes <= 0) return null;
    const hours = Math.floor(totalDurationMinutes / 60);
    const minutes = totalDurationMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Step 1: Media selection (Instagram-style)
  if (!showDetails) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            style={styles.headerRightButton}
            disabled={images.length === 0}
          >
            <Text style={[styles.nextButton, images.length === 0 && styles.nextButtonDisabled]}>Next</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap} pointerEvents="none">
            <Text style={styles.headerTitle}>New post</Text>
          </View>
        </View>

        {/* Media Preview Area */}
        <View style={styles.previewArea}>
          {images.length > 0 ? (
            <View style={styles.previewContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setSelectedImageIndex(index);
                }}
                style={styles.previewScrollView}
                contentContainerStyle={{ width: SCREEN_WIDTH * images.length }}
              >
                {images.map((uri, index) => (
                  <View key={`preview-${index}-${uri}`} style={styles.previewImageContainer}>
                    <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                  </View>
                ))}
              </ScrollView>
              
              {/* Image indicator dots */}
              {images.length > 1 && (
                <View style={styles.imageIndicators}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicatorDot,
                        index === selectedImageIndex && styles.indicatorDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
              
              {/* Stats Overlay - Run Barbie style */}
              {(distance || durationHours || durationMinutes) && (
                <View style={styles.statsOverlay}>
                  <View style={styles.statsHeader}>
                    <Ionicons name="footsteps" size={16} color="#fff" />
                    <Text style={styles.statsHeaderText}>RUN BARBIE</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    {distance && (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Distance</Text>
                        <Text style={styles.statValue}>{distance} km</Text>
                      </View>
                    )}
                    {formatDurationDisplay() && (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Time</Text>
                        <Text style={styles.statValue}>{formatDurationDisplay()}</Text>
                      </View>
                    )}
                    {calculatePace() && (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Pace</Text>
                        <Text style={styles.statValue}>{calculatePace()}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.editPhotoButton}
                onPress={() => setEditModalVisible(true)}
                disabled={editLoading}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.editPhotoButtonText}>Edit photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="image-outline" size={64} color="#ccc" />
              <Text style={styles.previewPlaceholderText}>Your photo will appear here</Text>
              <Text style={styles.previewPlaceholderSubtext}>Take a photo or choose from gallery below</Text>
            </View>
          )}
        </View>

        {/* Add photo – primary actions */}
        <View style={styles.addPhotoSection}>
          <Text style={styles.addPhotoLabel}>Add photo</Text>
          <View style={styles.addPhotoRow}>
            <TouchableOpacity style={styles.addPhotoCard} onPress={takePhoto} activeOpacity={0.8}>
              <View style={styles.addPhotoIconWrap}>
                <Ionicons name="camera" size={28} color="#000" />
              </View>
              <Text style={styles.addPhotoCardLabel}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addPhotoCard} onPress={pickImage} activeOpacity={0.8}>
              <View style={styles.addPhotoIconWrap}>
                <Ionicons name="images" size={28} color="#000" />
              </View>
              <Text style={styles.addPhotoCardLabel}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent photos – only when we have any (e.g. iOS) */}
        {recentPhotos.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.recentSectionLabel}>Recent photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScrollContent}
            >
              {recentPhotos.slice(0, 15).map((uri, index) => (
                <TouchableOpacity
                  key={`${uri}-${index}`}
                  style={styles.recentThumb}
                  onPress={() => pickFromRecent(uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.recentThumbImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Edit photo</Text>
              {editLoading ? (
                <ActivityIndicator size="small" color="#0095F6" style={{ marginVertical: 16 }} />
              ) : (
                <>
                  <TouchableOpacity style={styles.editOption} onPress={handleRotate90}>
                    <Ionicons name="refresh" size={22} color="#333" />
                    <Text style={styles.editOptionText}>Rotate 90°</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editOption} onPress={openCropModal}>
                    <Ionicons name="crop-outline" size={22} color="#333" />
                    <Text style={styles.editOptionText}>Crop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editOption} onPress={handleFlipH}>
                    <Ionicons name="swap-horizontal" size={22} color="#333" />
                    <Text style={styles.editOptionText}>Flip horizontal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editOption} onPress={handleFlipV}>
                    <Ionicons name="swap-vertical" size={22} color="#333" />
                    <Text style={styles.editOptionText}>Flip vertical</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.editModalCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.editModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Crop modal – Instagram-style pan + zoom + aspect ratio */}
        <Modal
          visible={cropModalVisible}
          animationType="slide"
          onRequestClose={closeCropModal}
          statusBarTranslucent
        >
          <View style={styles.cropModalContainer}>
            <View style={styles.cropHeader}>
              <TouchableOpacity onPress={closeCropModal} style={styles.cropHeaderBtn}>
                <Text style={styles.cropHeaderCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.cropHeaderTitle}>Crop</Text>
              <TouchableOpacity
                onPress={applyCropFromModal}
                style={styles.cropHeaderBtn}
                disabled={cropApplying}
              >
                {cropApplying ? (
                  <ActivityIndicator size="small" color="#0095F6" />
                ) : (
                  <Text style={styles.cropHeaderDone}>Done</Text>
                )}
              </TouchableOpacity>
            </View>
            {cropImageUri && cropImageSize && (
              <>
                <View style={styles.cropAspectPills}>
                  {(['original', '1:1', '4:5'] as const).map((aspect) => (
                    <TouchableOpacity
                      key={aspect}
                      style={[styles.cropAspectPill, cropAspect === aspect && styles.cropAspectPillActive]}
                      onPress={() => setCropAspect(aspect)}
                    >
                      <Text style={[styles.cropAspectPillText, cropAspect === aspect && styles.cropAspectPillTextActive]}>
                        {aspect === 'original' ? 'Original' : aspect === '1:1' ? '1:1' : '4:5'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {(() => {
                  const box = getCropBoxSize();
                  const scale =
                    cropZoom *
                    Math.max(box.width / cropImageSize.width, box.height / cropImageSize.height);
                  return (
                    <>
                      <View
                        style={[styles.cropBoxContainer, { width: box.width, height: box.height }]}
                        {...cropPanResponder.panHandlers}
                      >
                        <View style={[styles.cropBoxInner, { width: box.width, height: box.height }]} collapsable={false}>
                          <Image
                            source={{ uri: cropImageUri }}
                            style={[
                              styles.cropImage,
                              {
                                width: cropImageSize.width * scale,
                                height: cropImageSize.height * scale,
                                transform: [{ translateX: cropPan.x }, { translateY: cropPan.y }],
                              },
                            ]}
                            resizeMode="stretch"
                          />
                        </View>
                        <View style={[styles.cropFrame, { width: box.width, height: box.height }]} pointerEvents="none" />
                      </View>
                    </>
                  );
                })()}
                <View style={styles.cropZoomRow}>
                  <TouchableOpacity
                    style={styles.cropZoomBtn}
                    onPress={() => setCropZoom((z) => Math.max(1, z - 0.25))}
                  >
                    <Ionicons name="remove" size={28} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.cropZoomLabel}>{cropZoom.toFixed(1)}×</Text>
                  <TouchableOpacity
                    style={styles.cropZoomBtn}
                    onPress={() => setCropZoom((z) => Math.min(3, z + 0.25))}
                  >
                    <Ionicons name="add" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Step 2: Edit details (caption, activity, stats)
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 60}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.headerRightButton}
            disabled={loading}
            activeOpacity={0.6}
          >
            {loading ? (
              <ActivityIndicator color="#0095F6" size="small" />
            ) : (
              <Text style={styles.shareButton}>Share</Text>
            )}
          </TouchableOpacity>
          <View style={styles.headerTitleWrap} pointerEvents="none">
            <Text style={styles.headerTitle}>Edit post</Text>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.editScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Image Preview */}
          {images.length > 0 && (
            <View style={styles.editPreviewContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setSelectedImageIndex(index);
                }}
                contentContainerStyle={{ width: SCREEN_WIDTH * images.length }}
              >
                {images.map((uri, index) => (
                  <Image
                    key={`edit-preview-${index}-${uri}`}
                    source={{ uri }}
                    style={styles.editPreviewImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.editImageIndicators}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.editIndicatorDot,
                        index === selectedImageIndex && styles.editIndicatorDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.editForm}>
            {/* Activity Type */}
            <Text style={styles.editLabel}>Activity Type</Text>
            <View style={styles.activityButtons}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.activityButton,
                    activityType === type && styles.activityButtonActive,
                  ]}
                  onPress={() => setActivityType(type)}
                >
                  <Text
                    style={[
                      styles.activityButtonText,
                      activityType === type && styles.activityButtonTextActive,
                    ]}
                  >
                    {type === 'other' ? 'Other' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Caption */}
            <Text style={styles.editLabel}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor="#999"
              value={caption}
              onChangeText={setCaption}
              multiline
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

            {/* Add location / Pinned location */}
            <Text style={styles.editLabel}>Location</Text>
            {location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color="#0095F6" />
                <Text style={styles.locationText} numberOfLines={1}>{location.name ?? 'Pinned location'}</Text>
                <TouchableOpacity onPress={handleRemoveLocation} style={styles.removeLocationBtn} activeOpacity={0.7}>
                  <Text style={styles.removeLocationText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addLocationButton}
                onPress={openLocationModal}
                disabled={locationLoading}
                activeOpacity={0.85}
              >
                <View style={styles.addLocationButtonContent}>
                  <Ionicons name="location-outline" size={20} color="#0095F6" style={styles.addLocationIcon} />
                  <Text style={styles.addLocationButtonText}>Add location (pin on map)</Text>
                </View>
              </TouchableOpacity>
            )}
            <Text style={styles.locationHint}>Others can see where this was posted on the map.</Text>

            {/* Location modal: I'm here now vs Search for a place */}
            <Modal
              visible={locationModalVisible}
              transparent
              animationType="slide"
              onRequestClose={closeLocationModal}
            >
              <View style={styles.locationModalOverlay}>
                <View style={styles.locationModalContent}>
                  <View style={styles.locationModalHeader}>
                    <Text style={styles.locationModalTitle}>
                      {locationMode === 'choose' ? 'Add location' : locationMode === 'preview' ? 'Confirm location' : 'Search for a place'}
                    </Text>
                    <TouchableOpacity onPress={closeLocationModal} style={styles.locationModalClose} hitSlop={12}>
                      <Ionicons name="close" size={28} color="#000" />
                    </TouchableOpacity>
                  </View>

                  {locationMode === 'preview' && locationPreview ? (
                    <View style={styles.locationPreviewContainer}>
                      <Text style={styles.locationPreviewName} numberOfLines={2}>{locationPreview.name}</Text>
                      <Text style={styles.locationPreviewCoords}>
                        {locationPreview.latitude.toFixed(4)}, {locationPreview.longitude.toFixed(4)}
                      </Text>
                      <TouchableOpacity
                        style={styles.locationPreviewMapBtn}
                        onPress={handleViewPreviewOnMap}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="map" size={22} color="#fff" />
                        <Text style={styles.locationPreviewMapBtnText}>View on map</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.locationPreviewConfirmBtn}
                        onPress={handleConfirmPreviewLocation}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.locationPreviewConfirmBtnText}>Use this location</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.locationBackBtn} onPress={handleBackFromPreview}>
                        <Ionicons name="arrow-back" size={20} color="#0095F6" />
                        <Text style={styles.locationBackBtnText}>Back to results</Text>
                      </TouchableOpacity>
                    </View>
                  ) : locationMode === 'choose' ? (
                    <>
                      <TouchableOpacity
                        style={styles.locationOptionCard}
                        onPress={handlePinCurrentLocation}
                        disabled={locationLoading}
                        activeOpacity={0.8}
                      >
                        {locationLoading ? (
                          <ActivityIndicator size="small" color="#0095F6" />
                        ) : (
                          <>
                            <View style={styles.locationOptionIconWrap}>
                              <Ionicons name="navigate" size={28} color="#0095F6" />
                            </View>
                            <View style={styles.locationOptionTextWrap}>
                              <Text style={styles.locationOptionTitle}>I'm here now</Text>
                              <Text style={styles.locationOptionSub}>Pin your current location (GPS)</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.locationOptionCard}
                        onPress={() => setLocationMode('search')}
                        activeOpacity={0.8}
                      >
                        <View style={styles.locationOptionIconWrap}>
                          <Ionicons name="search" size={28} color="#0095F6" />
                        </View>
                        <View style={styles.locationOptionTextWrap}>
                          <Text style={styles.locationOptionTitle}>Search for a place</Text>
                          <Text style={styles.locationOptionSub}>Find and add any location</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.locationSearchRow}>
                        <Ionicons name="search" size={20} color="#666" style={styles.locationSearchIcon} />
                        <TextInput
                          style={styles.locationSearchInput}
                          placeholder="Search for a place or address..."
                          placeholderTextColor="#999"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          onSubmitEditing={handleSearchLocation}
                          returnKeyType="search"
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.locationSearchBtn}
                          onPress={handleSearchLocation}
                          disabled={searchLoading}
                        >
                          {searchLoading ? (
                            <ActivityIndicator size="small" color="#0095F6" />
                          ) : (
                            <Text style={styles.locationSearchBtnText}>Search</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.locationBackBtn}
                        onPress={() => { setLocationMode('choose'); setSearchResults([]); }}
                      >
                        <Ionicons name="arrow-back" size={20} color="#0095F6" />
                        <Text style={styles.locationBackBtnText}>Back</Text>
                      </TouchableOpacity>
                      <ScrollView
                        style={styles.locationResultsScroll}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.locationResultsContent}
                      >
                        {searchResults.length === 0 && !searchLoading ? (
                          searchQuery.trim() ? (
                            <Text style={styles.locationResultsEmpty}>No results. Try another search.</Text>
                          ) : (
                            <Text style={styles.locationResultsHint}>Results appear as you type.</Text>
                          )
                        ) : (
                          searchResults.map((r, i) => (
                            <TouchableOpacity
                              key={`${r.latitude}-${r.longitude}-${i}`}
                              style={styles.locationResultItem}
                              onPress={() => handleSelectSearchResult(r.latitude, r.longitude, r.name)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="location-outline" size={20} color="#666" />
                              <Text style={styles.locationResultText} numberOfLines={2}>
                                {r.name}
                              </Text>
                              <Ionicons name="add-circle-outline" size={22} color="#0095F6" />
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </>
                  )}
                </View>
              </View>
            </Modal>

            <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
              <View style={styles.editModalOverlay}>
                <View style={styles.editModalContent}>
                  <Text style={styles.editModalTitle}>Edit photo</Text>
                  {editLoading ? (
                    <ActivityIndicator size="small" color="#0095F6" style={{ marginVertical: 16 }} />
                  ) : (
                    <>
                      <TouchableOpacity style={styles.editOption} onPress={handleRotate90}>
                        <Ionicons name="refresh" size={22} color="#333" />
                        <Text style={styles.editOptionText}>Rotate 90°</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.editOption} onPress={openCropModal}>
                        <Ionicons name="crop-outline" size={22} color="#333" />
                        <Text style={styles.editOptionText}>Crop</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.editOption} onPress={handleFlipH}>
                        <Ionicons name="swap-horizontal" size={22} color="#333" />
                        <Text style={styles.editOptionText}>Flip horizontal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.editOption} onPress={handleFlipV}>
                        <Ionicons name="swap-vertical" size={22} color="#333" />
                        <Text style={styles.editOptionText}>Flip vertical</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={styles.editModalCancel} onPress={() => setEditModalVisible(false)}>
                    <Text style={styles.editModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Crop modal – same as step 1 */}
            <Modal
              visible={cropModalVisible}
              animationType="slide"
              onRequestClose={closeCropModal}
              statusBarTranslucent
            >
              <View style={styles.cropModalContainer}>
                <View style={styles.cropHeader}>
                  <TouchableOpacity onPress={closeCropModal} style={styles.cropHeaderBtn}>
                    <Text style={styles.cropHeaderCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.cropHeaderTitle}>Crop</Text>
                  <TouchableOpacity
                    onPress={applyCropFromModal}
                    style={styles.cropHeaderBtn}
                    disabled={cropApplying}
                  >
                    {cropApplying ? (
                      <ActivityIndicator size="small" color="#0095F6" />
                    ) : (
                      <Text style={styles.cropHeaderDone}>Done</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {cropImageUri && cropImageSize && (
                  <>
                    <View style={styles.cropAspectPills}>
                      {(['original', '1:1', '4:5'] as const).map((aspect) => (
                        <TouchableOpacity
                          key={aspect}
                          style={[styles.cropAspectPill, cropAspect === aspect && styles.cropAspectPillActive]}
                          onPress={() => setCropAspect(aspect)}
                        >
                          <Text style={[styles.cropAspectPillText, cropAspect === aspect && styles.cropAspectPillTextActive]}>
                            {aspect === 'original' ? 'Original' : aspect === '1:1' ? '1:1' : '4:5'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {(() => {
                      const box = getCropBoxSize();
                      const scale =
                        cropZoom *
                        Math.max(box.width / cropImageSize.width, box.height / cropImageSize.height);
                      return (
                        <View
                          style={[styles.cropBoxContainer, { width: box.width, height: box.height }]}
                          {...cropPanResponder.panHandlers}
                        >
                          <View style={[styles.cropBoxInner, { width: box.width, height: box.height }]} collapsable={false}>
                            <Image
                              source={{ uri: cropImageUri }}
                              style={[
                                styles.cropImage,
                                {
                                  width: cropImageSize.width * scale,
                                  height: cropImageSize.height * scale,
                                  transform: [{ translateX: cropPan.x }, { translateY: cropPan.y }],
                                },
                              ]}
                              resizeMode="stretch"
                            />
                          </View>
                          <View style={[styles.cropFrame, { width: box.width, height: box.height }]} pointerEvents="none" />
                        </View>
                      );
                    })()}
                    <View style={styles.cropZoomRow}>
                      <TouchableOpacity
                        style={styles.cropZoomBtn}
                        onPress={() => setCropZoom((z) => Math.max(1, z - 0.25))}
                      >
                        <Ionicons name="remove" size={28} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.cropZoomLabel}>{cropZoom.toFixed(1)}×</Text>
                      <TouchableOpacity
                        style={styles.cropZoomBtn}
                        onPress={() => setCropZoom((z) => Math.min(3, z + 0.25))}
                      >
                        <Ionicons name="add" size={28} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </Modal>

            {/* Stats Inputs */}
            <View style={styles.statsInputRow}>
              <View style={styles.statsInputHalf}>
                <Text style={styles.editLabel}>Distance (km)</Text>
                <TextInput
                  style={styles.statsInput}
                  placeholder="0.0"
                  placeholderTextColor="#999"
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.statsInputHalf}>
                <Text style={styles.editLabel}>Duration</Text>
                <View style={styles.durationRow}>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    value={durationHours}
                    onChangeText={setDurationHours}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.durationUnit}>h</Text>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.durationUnit}>m</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
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
  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#fff',
    position: 'relative',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightButton: {
    minWidth: 56,
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  nextButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0095F6',
  },
  nextButtonDisabled: {
    color: '#666',
  },
  shareButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0095F6',
  },
  // Preview Area
  previewArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  previewScrollView: {
    flex: 1,
  },
  previewImageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 3,
  },
  indicatorDotActive: {
    backgroundColor: '#000',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  editPhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  editOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
    gap: 12,
  },
  editOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editModalCancel: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editModalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  cropModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  cropHeaderBtn: {
    minWidth: 70,
    alignItems: Platform.OS === 'ios' ? 'flex-start' : 'center',
  },
  cropHeaderCancel: {
    fontSize: 16,
    color: '#fff',
  },
  cropHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  cropHeaderDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0095F6',
  },
  cropAspectPills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  cropAspectPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cropAspectPillActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cropAspectPillText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  cropAspectPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  cropBoxContainer: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  cropBoxInner: {
    overflow: 'hidden',
    position: 'relative',
  },
  cropImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cropFrame: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cropZoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 24,
  },
  cropZoomBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropZoomLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  previewPlaceholderSubtext: {
    marginTop: 6,
    fontSize: 14,
    color: '#999',
  },
  // Add photo – primary actions
  addPhotoSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  addPhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  addPhotoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addPhotoCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  // Recent photos (only when we have any)
  recentSection: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  recentSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recentScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
    flexDirection: 'row',
  },
  recentThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  recentThumbImage: {
    width: '100%',
    height: '100%',
  },
  // Stats Overlay
  statsOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 12,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '33%',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Edit Form
  editPreviewContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#fff',
    position: 'relative',
  },
  editPreviewImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  editImageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 3,
  },
  editIndicatorDotActive: {
    backgroundColor: '#000',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  editForm: {
    padding: 16,
  },
  editScrollContent: {
    paddingBottom: Platform.OS === 'android' ? 28 : 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  activityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  activityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    marginBottom: 8,
  },
  activityButtonActive: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  activityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activityButtonTextActive: {
    color: '#fff',
  },
  captionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  removeLocationBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeLocationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0095F6',
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#0095F6',
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  addLocationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addLocationIcon: {
    marginRight: 8,
  },
  addLocationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095F6',
  },
  locationHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  locationModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
    maxHeight: '80%',
  },
  locationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  locationModalClose: {
    padding: 4,
  },
  locationOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  locationOptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  locationOptionTextWrap: {
    flex: 1,
  },
  locationOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  locationOptionSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  locationSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationSearchIcon: {
    marginRight: 8,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
    paddingRight: 8,
  },
  locationSearchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  locationSearchBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095F6',
  },
  locationPreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  locationPreviewName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  locationPreviewCoords: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  locationPreviewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0095F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 8,
  },
  locationPreviewMapBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  locationPreviewConfirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  locationPreviewConfirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  locationBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  locationBackBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095F6',
    marginLeft: 6,
  },
  locationResultsScroll: {
    maxHeight: 280,
  },
  locationResultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  locationResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  locationResultText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 10,
  },
  locationResultsEmpty: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
  },
  locationResultsHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  statsInputRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statsInputHalf: {
    flex: 1,
    marginRight: 8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 8,
  },
  durationInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#000',
    minWidth: 0,
  },
  durationUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  statsInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default CreatePostScreen;
