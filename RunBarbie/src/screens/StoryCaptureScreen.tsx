import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ActivityType } from '../types';
import { useStories } from '../context/StoriesContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUpload } from '../context/UploadContext';
import { postService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ACTIVITY_OPTIONS: ActivityType[] = ['run', 'hike', 'cycle', 'walk', 'other'];

type LayoutType = 'single' | '2x1' | '2x2' | '3x2';

const LAYOUT_CONFIG: Record<LayoutType, { cols: number; rows: number; slots: number }> = {
  single: { cols: 1, rows: 1, slots: 1 },
  '2x1': { cols: 2, rows: 1, slots: 2 },
  '2x2': { cols: 2, rows: 2, slots: 4 },
  '3x2': { cols: 3, rows: 2, slots: 6 },
};

const LAYOUT_OUTPUT_PORTRAIT = { width: 540, height: 960 };  // 9:16
const LAYOUT_OUTPUT_LANDSCAPE = { width: 960, height: 540 }; // 16:9

const StoryCaptureScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { stories } = useStories();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { runStoryUpload } = useUpload();

  const [mode, setMode] = useState<'photo' | 'layout'>('photo');
  const [layoutType, setLayoutType] = useState<LayoutType>('2x1');
  const [layoutOrientation, setLayoutOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const LAYOUT_OUTPUT = layoutOrientation === 'landscape' ? LAYOUT_OUTPUT_LANDSCAPE : LAYOUT_OUTPUT_PORTRAIT;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [layoutSlots, setLayoutSlots] = useState<(string | null)[]>([]);
  const [caption, setCaption] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [usedCaptions, setUsedCaptions] = useState<Set<string>>(new Set());
  const [capturing, setCapturing] = useState(false);
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [sourceModalSlot, setSourceModalSlot] = useState<number | null>(null);
  const layoutRef = useRef<View>(null);

  const openSourceModal = (slotIndex: number) => {
    setSourceModalSlot(slotIndex);
    setSourceModalVisible(true);
  };

  const closeSourceModal = () => {
    setSourceModalVisible(false);
    setSourceModalSlot(null);
  };

  const handleSourceOption = (action: 'camera' | 'gallery' | 'remove') => {
    closeSourceModal();
    const idx = sourceModalSlot;
    if (idx === null) return;
    if (action === 'camera') captureForSlot(idx);
    else if (action === 'gallery') pickImageForSlot(idx);
    else if (action === 'remove') setLayoutSlots((p) => { const n = [...p]; n[idx] = null; return n; });
  };

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
        if (target) target.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
      };
    }, [navigation])
  );

  useEffect(() => {
    const loadUsedCaptions = async () => {
      if (!user?._id) return;
      const used = new Set<string>();
      stories.filter((s) => s.userId === user._id && s.caption).forEach((s) => s.caption && used.add(s.caption.trim()));
      try {
        const allPosts = await postService.getAllPosts();
        allPosts.filter((p) => p.userId === user._id && p.caption).forEach((p) => p.caption && used.add(p.caption.trim()));
      } catch {}
      setUsedCaptions(used);
    };
    loadUsedCaptions();
  }, [user?._id, stories]);

  useEffect(() => {
    const { slots } = LAYOUT_CONFIG[layoutType];
    setLayoutSlots((prev) => {
      const next = [...prev.slice(0, slots)];
      while (next.length < slots) next.push(null);
      return next;
    });
  }, [layoutType]);

  const captionParts = useMemo(
    () => ({
      run: { starters: ['Morning', 'Sunrise', 'Evening', 'Trail'], verbs: ['Chasing', 'Running', 'Crushing'], nouns: ['miles', 'pace', 'trail'], adjectives: ['fast', 'strong', 'free'], endings: ['today', 'vibes', 'mode'], emojis: ['🌅', '🏃‍♀️', '⚡'] },
      hike: { starters: ['Trail', 'Mountain', 'Summit'], verbs: ['Conquering', 'Exploring', 'Climbing'], nouns: ['views', 'trail', 'peak'], adjectives: ['high', 'amazing', 'stunning'], endings: ['therapy', 'unlocked', 'magic'], emojis: ['🌲', '🏔️', '⛰️'] },
      cycle: { starters: ['Two wheels', 'Pedal', 'Bike'], verbs: ['Spinning', 'Riding', 'Cruising'], nouns: ['road', 'trail', 'path'], adjectives: ['smooth', 'fast', 'epic'], endings: ['mode', 'therapy', 'activated'], emojis: ['🚴', '💨', '⚡'] },
      walk: { starters: ['Steps', 'Stroll', 'Walk'], verbs: ['Walking', 'Exploring', 'Finding'], nouns: ['soul', 'pace', 'path'], adjectives: ['peaceful', 'calm', 'serene'], endings: ['meditation', 'therapy', 'reset'], emojis: ['🚶‍♀️', '💫', '🌿'] },
      other: { starters: ['Movement', 'Active', 'Fitness'], verbs: ['Moving', 'Feeling', 'Crushing'], nouns: ['movement', 'body', 'mind'], adjectives: ['strong', 'active', 'alive'], endings: ['today', 'mode', 'therapy'], emojis: ['💗', '✨', '🎯'] },
    }),
    [],
  );

  const generateCaption = () => {
    const parts = captionParts[activityType];
    if (!parts) {
      setCaption('Active and moving! 💪');
      return;
    }
    const templates = [
      () => `${parts.starters[Math.floor(Math.random() * parts.starters.length)]} ${parts.nouns[Math.floor(Math.random() * parts.nouns.length)]} ${parts.emojis[Math.floor(Math.random() * parts.emojis.length)]}`,
      () => `${parts.verbs[Math.floor(Math.random() * parts.verbs.length)]} ${parts.adjectives[Math.floor(Math.random() * parts.adjectives.length)]} ${parts.endings[Math.floor(Math.random() * parts.endings.length)]} ${parts.emojis[Math.floor(Math.random() * parts.emojis.length)]}`,
    ];
    for (let i = 0; i < 10; i++) {
      const gen = templates[Math.floor(Math.random() * templates.length)]();
      if (!usedCaptions.has(gen.trim())) {
        setCaption(gen);
        return;
      }
    }
    setCaption(templates[0]() || 'Active and moving! 💪');
  };

  const pickImageForSlot = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Please grant camera roll permissions in Settings.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]) {
        setLayoutSlots((prev) => {
          const next = [...prev];
          next[slotIndex] = result.assets![0].uri;
          return next;
        });
      }
    } catch (e) {
      showToast('Failed to open gallery.', 'error');
    }
  };

  const captureForSlot = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLayoutSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = result.assets![0].uri;
        return next;
      });
    }
  };

  const pickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Please grant camera roll permissions in Settings.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageDimensions(asset.width && asset.height ? { width: asset.width, height: asset.height } : null);
      }
    } catch (e) {
      showToast('Failed to open gallery.', 'error');
    }
  };

  const captureWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageDimensions(asset.width && asset.height ? { width: asset.width, height: asset.height } : null);
    }
  };

  const handleShare = async () => {
    if (mode === 'photo') {
      if (!imageUri) return;
      runStoryUpload({ imageUri, caption, activityType });
      navigation.goBack();
      return;
    }

    // Layout mode: capture the layout view as image
    const { slots } = LAYOUT_CONFIG[layoutType];
    const filled = layoutSlots.slice(0, slots).filter(Boolean).length;
    if (filled === 0) {
      showToast('Add at least one photo to the layout.', 'error');
      return;
    }

    if (!layoutRef.current) return;
    setCapturing(true);
    try {
      const uri = await captureRef(layoutRef, {
        format: 'jpg',
        quality: 0.9,
        width: LAYOUT_OUTPUT.width,
        height: LAYOUT_OUTPUT.height,
        result: 'tmpfile',
      });
      if (uri) {
        runStoryUpload({ imageUri: uri, caption, activityType });
        navigation.goBack();
      } else {
        showToast('Failed to create layout image.', 'error');
      }
    } catch (e) {
      showToast('Failed to capture layout.', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const hasImage = mode === 'photo' ? !!imageUri : layoutSlots.some(Boolean);

  const MAX_PREVIEW = 280;
  const previewSize = useMemo(() => {
    if (mode === 'layout') return { width: 135, height: 240 };
    if (!imageDimensions) return { width: 135, height: 240 };
    const { width: w, height: h } = imageDimensions;
    const isLandscape = w > h;
    if (isLandscape) {
      const width = Math.min(320, MAX_PREVIEW * (w / h));
      return { width, height: width * (h / w) };
    }
    const height = Math.min(MAX_PREVIEW, 320 * (h / w));
    return { width: height * (w / h), height };
  }, [mode, imageDimensions]);

  const layoutPreviewSize = Math.min(screenWidth - 24, 320);
  const layoutPreviewHeight =
    layoutOrientation === 'landscape' ? layoutPreviewSize * (9 / 16) : layoutPreviewSize * (16 / 9);
  const slotWidth = layoutPreviewSize / LAYOUT_CONFIG[layoutType].cols;
  const slotHeight = layoutPreviewHeight / LAYOUT_CONFIG[layoutType].rows;

  const renderLayoutPreview = () => {
    const { cols, rows, slots } = LAYOUT_CONFIG[layoutType];
    return (
      <View ref={layoutRef} collapsable={false} style={[styles.layoutCaptureView, { width: LAYOUT_OUTPUT.width, height: LAYOUT_OUTPUT.height }]}>
        <View style={[styles.layoutGrid, { width: LAYOUT_OUTPUT.width, height: LAYOUT_OUTPUT.height }]}>
          {Array.from({ length: rows }).map((_, row) => (
            <View key={row} style={styles.layoutRow}>
              {Array.from({ length: cols }).map((_, col) => {
                const idx = row * cols + col;
                const uri = layoutSlots[idx] || null;
                const slotW = LAYOUT_OUTPUT.width / cols;
                const slotH = LAYOUT_OUTPUT.height / rows;
                return (
                  <View key={idx} style={[styles.layoutSlot, { width: slotW, height: slotH }]}>
                    {uri ? (
                      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.layoutSlotEmpty]} />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.headerRightButton}
          disabled={!hasImage || capturing}
          activeOpacity={hasImage ? 0.6 : 1}
        >
          <Text style={[styles.shareButtonText, { color: hasImage && !capturing ? palette.primary : '#999' }]}>
            {capturing ? 'Creating…' : 'Share'}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle}>New story</Text>
        </View>
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
          {/* Mode toggle: Photo | Layout */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'photo' && { backgroundColor: palette.primary }]}
              onPress={() => setMode('photo')}
              activeOpacity={0.85}
            >
              <Ionicons name="image" size={18} color={mode === 'photo' ? '#fff' : '#333'} />
              <Text style={[styles.modeChipText, mode === 'photo' && { color: '#fff' }]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'layout' && { backgroundColor: palette.primary }]}
              onPress={() => setMode('layout')}
              activeOpacity={0.85}
            >
              <Ionicons name="grid" size={18} color={mode === 'layout' ? '#fff' : '#333'} />
              <Text style={[styles.modeChipText, mode === 'layout' && { color: '#fff' }]}>Layout</Text>
            </TouchableOpacity>
          </View>

          {mode === 'photo' && (
            <>
              <View style={[styles.previewWrapper, { width: previewSize.width, height: previewSize.height }]}>
                {imageUri ? (
                  <>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    <View style={styles.previewGradient} />
                    <View style={styles.previewOverlayRow}>
                      <View style={[styles.previewTag, { backgroundColor: palette.primary + 'E6' }]}>
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
            </>
          )}

          {mode === 'layout' && (
            <>
              <View style={styles.layoutOptionsRow}>
                {(['2x1', '2x2', '3x2'] as LayoutType[]).map((lt) => (
                  <TouchableOpacity
                    key={lt}
                    style={[styles.layoutOptionChip, layoutType === lt && { borderColor: palette.primary, backgroundColor: palette.primaryLight }]}
                    onPress={() => setLayoutType(lt)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.layoutOptionText, layoutType === lt && { color: palette.primary, fontWeight: '700' }]}>{lt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.layoutOptionsRow, { marginTop: 4 }]}>
                <TouchableOpacity
                  style={[styles.layoutOptionChip, layoutOrientation === 'portrait' && { borderColor: palette.primary, backgroundColor: palette.primaryLight }]}
                  onPress={() => setLayoutOrientation('portrait')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="phone-portrait-outline" size={16} color={layoutOrientation === 'portrait' ? palette.primary : '#666'} style={{ marginRight: 6 }} />
                  <Text style={[styles.layoutOptionText, layoutOrientation === 'portrait' && { color: palette.primary, fontWeight: '700' }]}>Portrait</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.layoutOptionChip, layoutOrientation === 'landscape' && { borderColor: palette.primary, backgroundColor: palette.primaryLight }]}
                  onPress={() => setLayoutOrientation('landscape')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="phone-landscape-outline" size={16} color={layoutOrientation === 'landscape' ? palette.primary : '#666'} style={{ marginRight: 6 }} />
                  <Text style={[styles.layoutOptionText, layoutOrientation === 'landscape' && { color: palette.primary, fontWeight: '700' }]}>Landscape</Text>
                </TouchableOpacity>
              </View>

              {/* Hidden full-size layout for capture (positioned off-screen) */}
              <View style={styles.offscreenLayout}>{renderLayoutPreview()}</View>

              {/* Interactive preview - tap slots to add photos */}
              <View style={[styles.layoutPreviewWrap, { width: layoutPreviewSize, height: layoutPreviewHeight }]}>
                {Array.from({ length: LAYOUT_CONFIG[layoutType].rows }).map((_, row) => (
                  <View key={row} style={styles.layoutRow}>
                    {Array.from({ length: LAYOUT_CONFIG[layoutType].cols }).map((_, col) => {
                      const idx = row * LAYOUT_CONFIG[layoutType].cols + col;
                      const uri = layoutSlots[idx] || null;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.layoutSlotTouchable, { width: slotWidth - 2, height: slotHeight - 2 }]}
                          onPress={() => openSourceModal(idx)}
                          activeOpacity={0.8}
                        >
                          {uri ? (
                            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          ) : (
                            <View style={[StyleSheet.absoluteFill, styles.layoutSlotEmptyTouchable]}>
                              <Ionicons name="add" size={28} color="#999" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </>
          )}

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
            <TouchableOpacity
              style={[styles.generateButton, { borderColor: palette.primary, backgroundColor: palette.primaryLight }]}
              onPress={generateCaption}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={16} color={palette.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.generateButtonText, { color: palette.primary }]}>Generate Caption</Text>
            </TouchableOpacity>
            <Text style={[styles.label, { marginTop: 12 }]}>Activity</Text>
            <View style={styles.activityRow}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.activityChip,
                    activityType === opt && [styles.activityChipActive, { backgroundColor: palette.primary, borderColor: palette.primary }],
                  ]}
                  onPress={() => setActivityType(opt)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.activityChipText, activityType === opt && styles.activityChipTextActive]}>
                    {opt === 'other' ? 'Other' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add / Replace photo modal */}
      <Modal
        visible={sourceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSourceModal}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={closeSourceModal}>
          <View style={[styles.modalCard, { borderColor: palette.primary + '30' }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {sourceModalSlot !== null && layoutSlots[sourceModalSlot] ? 'Replace photo' : 'Add photo'}
            </Text>
            <Text style={styles.modalSubtitle}>Choose where to get your photo from</Text>
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[styles.modalOption, { borderColor: palette.primary + '40' }]}
                onPress={() => handleSourceOption('camera')}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: palette.primary + '20' }]}>
                  <Ionicons name="camera" size={24} color={palette.primary} />
                </View>
                <Text style={styles.modalOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOption, { borderColor: palette.primary + '40' }]}
                onPress={() => handleSourceOption('gallery')}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: palette.primary + '20' }]}>
                  <Ionicons name="images" size={24} color={palette.primary} />
                </View>
                <Text style={styles.modalOptionText}>Gallery</Text>
              </TouchableOpacity>
              {sourceModalSlot !== null && layoutSlots[sourceModalSlot] && (
                <TouchableOpacity
                  style={[styles.modalOption, styles.modalOptionDestructive]}
                  onPress={() => handleSourceOption('remove')}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionIconDestructive}>
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </View>
                  <Text style={styles.modalOptionTextDestructive}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.modalCancel} onPress={closeSourceModal} activeOpacity={0.7}>
              <Text style={[styles.modalCancelText, { color: palette.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#fff',
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerRightButton: { minWidth: 56, height: 40, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitleWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' as const },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  shareButtonText: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 28 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignSelf: 'center' },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD',
    gap: 6,
  },
  modeChipText: { fontSize: 14, fontWeight: '600', color: '#333' },
  previewWrapper: { alignSelf: 'center', borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  previewImage: { width: '100%', height: '100%' },
  previewGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, backgroundColor: 'rgba(0,0,0,0.35)' },
  previewOverlayRow: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  previewTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 4 },
  previewTagText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  previewCaption: { fontSize: 13, color: '#fff' },
  previewPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  previewText: { marginTop: 8, fontSize: 13, color: '#EEE', textAlign: 'center' },
  captureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  captureButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#DDD', flex: 1, marginHorizontal: 4 },
  captureText: { fontSize: 13, color: '#111', fontWeight: '500' },
  layoutOptionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center' },
  layoutOptionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  layoutOptionText: { fontSize: 14, fontWeight: '600', color: '#333' },
  offscreenLayout: { position: 'absolute', left: -9999, top: 0, opacity: 0 },
  layoutCaptureView: { overflow: 'hidden', backgroundColor: '#111' },
  layoutGrid: { flexDirection: 'column' },
  layoutRow: { flexDirection: 'row' },
  layoutSlot: { overflow: 'hidden' },
  layoutSlotEmpty: { backgroundColor: '#222' },
  layoutPreviewWrap: { alignSelf: 'center', flexDirection: 'column', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  layoutSlotTouchable: { margin: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: '#222' },
  layoutSlotEmptyTouchable: { justifyContent: 'center', alignItems: 'center' },
  metaSection: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  captionInput: { minHeight: 60, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111', textAlignVertical: 'top' as const },
  activityRow: { flexDirection: 'row', flexWrap: 'wrap' },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  generateButtonText: { fontSize: 13, fontWeight: '600' },
  activityChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 8, marginBottom: 8 },
  activityChipActive: {},
  activityChipText: { fontSize: 12, color: '#444', fontWeight: '500' },
  activityChipTextActive: { color: '#fff', fontWeight: '700' },
  // Add/Replace photo modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  modalOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  modalOption: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 100,
  },
  modalOptionDestructive: { borderColor: 'rgba(255,59,48,0.3)' },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalOptionIconDestructive: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,59,48,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalOptionText: { fontSize: 14, fontWeight: '600', color: '#333' },
  modalOptionTextDestructive: { fontSize: 14, fontWeight: '600', color: '#FF3B30' },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
});

export default StoryCaptureScreen;
