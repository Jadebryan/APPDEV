import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { userService, reelService } from '../services/api';
import { Reel } from '../types';
import { ReelsStackParamList } from '../navigation/types';
import { getTimeAgo } from '../utils/timeAgo';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

type Nav = NativeStackNavigationProp<ReelsStackParamList, 'SavedReels'>;
type SavedReelsRoute = RouteProp<ReelsStackParamList, 'SavedReels'>;

const SavedReelsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SavedReelsRoute>();
  const { showToast } = useToast();
  const fromProfile = route.params?.fromProfile === true;

  const handleBack = () => {
    if (fromProfile) {
      const mainTabs = (navigation.getParent() as any)?.getParent?.();
      mainTabs?.navigate('ProfileStack');
    } else {
      navigation.goBack();
    }
  };
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [reelToRemove, setReelToRemove] = useState<Reel | null>(null);

  const loadReels = useCallback(async () => {
    try {
      setLoading(true);
      const list = await userService.getSavedReels();
      setReels(list);
    } catch {
      showToast('Failed to load saved reels', 'info');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadReels();
    }, [loadReels])
  );

  const handlePlayReel = (reel: Reel) => {
    navigation.navigate('ReelsHome', { initialReelId: reel._id });
  };

  const handleRemove = (reel: Reel) => setReelToRemove(reel);

  const handleConfirmRemove = useCallback(async () => {
    const reel = reelToRemove;
    setReelToRemove(null);
    if (!reel) return;
    try {
      await reelService.unbookmarkReel(reel._id);
      setReels((prev) => prev.filter((r) => r._id !== reel._id));
      showToast('Removed from saved', 'success');
    } catch {
      showToast('Failed to remove', 'info');
    }
  }, [reelToRemove, showToast]);

  const renderItem = ({ item }: { item: Reel }) => {
    const user = item.user ?? (item as { userId?: { username?: string } }).userId;
    const username = user?.username ?? 'Unknown';
    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePlayReel(item)} activeOpacity={0.8}>
        <View style={styles.thumb}>
          <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.caption} numberOfLines={2}>{item.caption || 'No caption'}</Text>
          {item.createdAt && <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>}
        </View>
        <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={22} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved reels</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No saved reels</Text>
          <Text style={styles.emptySub}>Save reels from the menu (⋯ → Save or Run list)</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmModal
        visible={!!reelToRemove}
        onClose={() => setReelToRemove(null)}
        title="Remove from saved"
        message="Remove this reel from your saved list?"
        confirmLabel="Remove"
        onConfirm={handleConfirmRemove}
        destructive
        icon="bookmark-outline"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1, marginLeft: 12 },
  username: { fontSize: 15, fontWeight: '600', color: '#000' },
  caption: { fontSize: 14, color: '#555', marginTop: 2 },
  time: { fontSize: 12, color: '#999', marginTop: 4 },
  removeBtn: {},
});

export default SavedReelsScreen;
