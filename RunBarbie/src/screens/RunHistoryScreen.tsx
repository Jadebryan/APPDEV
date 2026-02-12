import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { runService, RunHistoryItem } from '../services/api';
import { formatDurationSeconds } from '../utils/formatDuration';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const RunHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const [runs, setRuns] = useState<RunHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const { runs: list } = await runService.getRunHistory(50);
      setRuns(list);
    } catch {
      showToast('Failed to load run history', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadRuns();
    }, [loadRuns])
  );

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined, hour: '2-digit', minute: '2-digit' });
  };

  const openInMaps = (item: RunHistoryItem) => {
    const path = item.path || [];
    if (path.length === 0) {
      showToast('No route data for this run', 'info');
      return;
    }
    const first = path[0];
    const url = `https://www.google.com/maps?q=${first.lat},${first.lng}`;
    Linking.openURL(url).catch(() => showToast('Could not open maps', 'error'));
  };

  const renderItem = ({ item }: { item: RunHistoryItem }) => {
    const distStr = item.distanceKm > 0 ? `${item.distanceKm.toFixed(1)} km` : '—';
    const durStr = item.durationSeconds > 0 ? formatDurationSeconds(item.durationSeconds) : '—';
    const hasPath = item.path && item.path.length > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => hasPath && openInMaps(item)}
        activeOpacity={hasPath ? 0.7 : 1}
        disabled={!hasPath}
      >
        <View style={[styles.cardIcon, { backgroundColor: palette.primaryLight }]}>
          <Ionicons name="footsteps" size={24} color={palette.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.date}>{formatDate(item.endedAt || item.startedAt)}</Text>
          <View style={styles.stats}>
            <Text style={styles.stat}>{distStr}</Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.stat}>{durStr}</Text>
          </View>
          {item.sosTriggeredAt && (
            <View style={styles.sosBadge}>
              <Ionicons name="alert-circle" size={12} color="#c00" />
              <Text style={styles.sosText}>SOS triggered</Text>
            </View>
          )}
        </View>
        {hasPath && <Ionicons name="map-outline" size={20} color="#999" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Run history</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : runs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="footsteps-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No runs yet</Text>
          <Text style={styles.emptySub}>Use Start Run in Safety & Wellness to track your runs.</Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
  list: { paddingVertical: 12, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  date: { fontSize: 15, fontWeight: '600', color: '#000' },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  stat: { fontSize: 14, color: '#666' },
  statDot: { fontSize: 14, color: '#999' },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sosText: { fontSize: 12, color: '#c00', fontWeight: '500' },
});

export default RunHistoryScreen;
