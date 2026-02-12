import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { storage } from '../utils/storage';
import { runService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { FeedStackParamList } from '../navigation/types';
import { formatDurationSeconds } from '../utils/formatDuration';

type Nav = NativeStackNavigationProp<FeedStackParamList, 'ActiveRun'>;
type Route = RouteProp<FeedStackParamList, 'ActiveRun'>;

const LOCATION_INTERVAL_MS = 5000;

const ActiveRunScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const runId = route.params?.runId ?? '';
  const [duration, setDuration] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [emergencySosEnabled, setEmergencySosEnabled] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);
  const pathRef = useRef<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [s, unit] = await Promise.all([
        storage.getSafetySettings(),
        storage.getDistanceUnits(),
      ]);
      setShareLiveLocation(s.shareLiveLocation);
      setEmergencySosEnabled(s.emergencySosEnabled);
      setDistanceUnit(unit);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (loc) => {
          if (!mounted) return;
          const { latitude, longitude } = loc.coords;
          setLastCoords({ lat: latitude, lng: longitude });
          pathRef.current.push({ lat: latitude, lng: longitude });
          if (pathRef.current.length >= 2) {
            const d = haversineKm(
              pathRef.current[pathRef.current.length - 2].lat,
              pathRef.current[pathRef.current.length - 2].lng,
              latitude,
              longitude
            );
            setDistanceKm((prev) => prev + d);
          }
          if (shareLiveLocation) {
            runService.updateLocation(runId, latitude, longitude).catch(() => {});
          }
        }
      );
      locSubRef.current = sub;
      return () => {
        mounted = false;
        sub.remove();
      };
    })();
    return () => {
      locSubRef.current?.remove();
    };
  }, [runId, shareLiveLocation]);

  const handleEndRun = async () => {
    Alert.alert(
      'End Run',
      'Stop tracking and save this run?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Run',
          onPress: async () => {
            try {
              await runService.endRun(runId, distanceKm, duration);
              const units = await storage.getDistanceUnits();
              const distStr = units === 'miles' ? `${(distanceKm * 0.621371).toFixed(2)} mi` : `${distanceKm.toFixed(2)} km`;
              showToast(`Run saved: ${distStr} in ${formatDurationSeconds(duration)}`, 'success');
              navigation.goBack();
            } catch {
              showToast('Could not end run', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSos = () => {
    if (!emergencySosEnabled) return;
    Alert.alert(
      'Emergency SOS',
      'This will call 911 and share your location with your emergency contact. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call for Help',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await runService.triggerSos(runId);
              Linking.openURL('tel:911');
              if (data.emergencyContact && data.mapsUrl) {
                const smsBody = encodeURIComponent(
                  `EMERGENCY - ${data.username} needs help! Location: ${data.mapsUrl}`
                );
                const phone = data.emergencyContact.replace(/\D/g, '');
                if (phone.length >= 10) {
                  Linking.openURL(`sms:${phone}?body=${smsBody}`).catch(() => {});
                }
              }
              showToast('SOS sent. Help is on the way.', 'success');
            } catch {
              Linking.openURL('tel:911');
              showToast('Calling 911', 'info');
            }
          },
        },
      ]
    );
  };

  const distStr = distanceUnit === 'miles' ? (distanceKm * 0.621371).toFixed(2) : distanceKm.toFixed(2);
  const distUnit = distanceUnit === 'miles' ? 'mi' : 'km';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => Alert.alert('End Run?', 'Stop without saving?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
          ])}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Run in progress</Text>
        {shareLiveLocation && (
          <View style={[styles.liveBadge, { backgroundColor: palette.secondaryLight }]}>
            <View style={[styles.liveDot, { backgroundColor: palette.secondary }]} />
            <Text style={[styles.liveText, { color: palette.secondary }]}>Live</Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDurationSeconds(duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{distStr}</Text>
          <Text style={styles.statLabel}>{distUnit}</Text>
        </View>
      </View>

      {emergencySosEnabled && (
        <TouchableOpacity style={styles.sosBtn} onPress={handleSos} activeOpacity={0.8}>
          <Ionicons name="alert-circle" size={32} color="#fff" />
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.endBtn, { backgroundColor: palette.primary }]} onPress={handleEndRun} activeOpacity={0.8}>
        <Text style={styles.endBtnText}>End Run</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#000', textAlign: 'center' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 12, fontWeight: '600' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', color: '#000' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  sosBtn: {
    alignSelf: 'center',
    backgroundColor: '#c00',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  sosBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 4 },
  endBtn: {
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  endBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default ActiveRunScreen;
