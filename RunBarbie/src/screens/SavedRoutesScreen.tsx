import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userService, SavedRoute } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FeedStackParamList } from '../navigation/types';
import ConfirmModal from '../components/ConfirmModal';
import { useTheme } from '../context/ThemeContext';

type SavedRoutesRoute = RouteProp<FeedStackParamList, 'SavedRoutes'>;

const SavedRoutesScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<SavedRoutesRoute>();
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
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeToRemove, setRouteToRemove] = useState<SavedRoute | null>(null);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const list = await userService.getSavedRoutes();
      setRoutes(list);
    } catch {
      showToast('Failed to load saved routes', 'info');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [loadRoutes])
  );

  const openInMap = (route: SavedRoute) => {
    const lat = route.latitude;
    const lng = route.longitude;
    if (lat != null && lng != null) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      Linking.openURL(url).catch(() => showToast('Could not open map', 'info'));
    } else {
      showToast('No coordinates for this route', 'info');
    }
  };

  const handleRemove = (route: SavedRoute) => setRouteToRemove(route);

  const handleConfirmRemove = useCallback(async () => {
    const route = routeToRemove;
    setRouteToRemove(null);
    if (!route) return;
    try {
      await userService.removeSavedRoute(route.postId);
      setRoutes((prev) => prev.filter((r) => r.postId !== route.postId));
      showToast('Route removed', 'success');
    } catch {
      showToast('Failed to remove route', 'info');
    }
  }, [routeToRemove, showToast]);

  const renderItem = ({ item }: { item: SavedRoute }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name || 'Saved route'}</Text>
        {(item.latitude != null && item.longitude != null) && (
          <Text style={styles.cardSub}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
        )}
      </View>
      <View style={styles.actions}>
        {(item.latitude != null && item.longitude != null) && (
          <TouchableOpacity onPress={() => openInMap(item)} style={styles.mapBtn}>
            <Ionicons name="map-outline" size={20} color={palette.primary} />
            <Text style={[styles.mapBtnText, { color: palette.primary }]}>Map</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={22} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved routes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trail-sign-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No saved routes</Text>
          <Text style={styles.emptySub}>Save a route from a post with a location (⋯ → Save route idea)</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmModal
        visible={!!routeToRemove}
        onClose={() => setRouteToRemove(null)}
        title="Remove route"
        message={routeToRemove ? `Remove "${routeToRemove.name || 'Saved route'}"? This cannot be undone.` : ''}
        confirmLabel="Remove"
        onConfirm={handleConfirmRemove}
        destructive
        icon="trail-sign-outline"
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
    padding: 14,
    marginBottom: 10,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#000' },
  cardSub: { fontSize: 13, color: '#666', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  mapBtnText: { fontSize: 14, color: '#0095F6', fontWeight: '500', marginLeft: 4 },
  removeBtn: {},
});

export default SavedRoutesScreen;
