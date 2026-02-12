import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { storage } from '../utils/storage';
import { getWeatherAtLocation, type WeatherData } from '../services/weatherService';
import { getNearbySafePlaces, type SafePlace } from '../services/safeRoutesService';
import { getCyclePhase } from '../utils/cycleUtils';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'StartRun'>;

const StartRunScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [cycleTip, setCycleTip] = useState('');
  const [sunHeatAlert, setSunHeatAlert] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showToast('Location permission needed for run tracking', 'error');
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const { lat, longitude: lon } = loc.coords;

        const [safety, cycleSettings] = await Promise.all([
          storage.getSafetySettings(),
          storage.getCycleSettings(),
        ]);

        const sunAlerts = safety.sunHeatAlerts;
        const cycleAware = safety.menstrualCycleAware;
        const safeRoutes = safety.safeRouteSuggestions;

        const promises: Promise<void>[] = [];

        if (sunAlerts) {
          promises.push(
            getWeatherAtLocation(lat, lon).then((w) => {
              if (mounted && w) {
                setWeather(w);
                if (w.isHot || w.isHighUV) {
                  let msg = '';
                  if (w.isHighUV) msg += `High UV index (${w.uvIndex.toFixed(1)}). `;
                  if (w.isHot) msg += `Hot (${w.tempC.toFixed(0)}°C). `;
                  msg += 'Consider running earlier or later, and stay hydrated!';
                  setSunHeatAlert(msg);
                }
              }
            }).catch(() => {})
          );
        }

        if (cycleAware && cycleSettings) {
          const { tip } = getCyclePhase(cycleSettings);
          if (mounted && tip) setCycleTip(tip);
        }

        if (safeRoutes) {
          promises.push(
            getNearbySafePlaces(lat, lon).then((places) => {
              if (mounted) setSafePlaces(places);
            }).catch(() => {})
          );
        }

        await Promise.all(promises);
      } catch (e) {
        showToast('Could not load run prep', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [showToast]);

  const handleStartRun = async () => {
    setStarting(true);
    try {
      const safety = await storage.getSafetySettings();
      const { runService } = await import('../services/api');
      const { runId } = await runService.startRun(
        safety.shareLiveLocation,
        safety.emergencyContact || ''
      );
      const tabs = navigation.getParent()?.getParent() as any;
      if (tabs?.navigate) {
        tabs.navigate('FeedStack', { screen: 'ActiveRun', params: { runId } });
      }
    } catch (e) {
      showToast('Could not start run', 'error');
    } finally {
      setStarting(false);
    }
  };

  const openMaps = (lat: number, lon: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Preparing your run...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Run</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {sunHeatAlert && (
          <View style={styles.alertBox}>
            <Ionicons name="warning" size={24} color="#c00" />
            <Text style={styles.alertText}>{sunHeatAlert}</Text>
          </View>
        )}

        {weather && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weather</Text>
            <View style={styles.weatherRow}>
              <Ionicons name="thermometer-outline" size={22} color="#666" />
              <Text style={styles.weatherText}>
                {weather.tempC.toFixed(0)}°C · {weather.condition} · UV {weather.uvIndex.toFixed(1)}
              </Text>
            </View>
          </View>
        )}

        {cycleTip ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cycle-aware tip</Text>
            <Text style={styles.tipText}>{cycleTip}</Text>
          </View>
        ) : null}

        {safePlaces.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nearby safe spots</Text>
            <Text style={styles.cardSubtext}>Parks and paths for well-lit runs</Text>
            {safePlaces.slice(0, 5).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.placeRow}
                onPress={() => openMaps(p.lat, p.lon)}
                activeOpacity={0.7}
              >
                <Ionicons name="leaf-outline" size={20} color={palette.secondary} />
                <Text style={styles.placeName}>{p.name}</Text>
                <Text style={styles.placeDist}>{p.distanceKm} km</Text>
                <Ionicons name="open-outline" size={16} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: palette.primary }, starting && styles.startBtnDisabled]}
          onPress={handleStartRun}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.startBtnText}>Start Run</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#666' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF0F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertText: { flex: 1, fontSize: 14, color: '#c00', fontWeight: '500' },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8 },
  cardSubtext: { fontSize: 12, color: '#666', marginBottom: 12 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherText: { fontSize: 15, color: '#000' },
  tipText: { fontSize: 14, color: '#444', lineHeight: 20 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  placeName: { flex: 1, fontSize: 15, color: '#000' },
  placeDist: { fontSize: 13, color: '#999' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});

export default StartRunScreen;
