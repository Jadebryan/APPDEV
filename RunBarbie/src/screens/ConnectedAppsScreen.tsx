import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ProfileStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ConnectedApps'>;

const APPS: { key: 'strava' | 'garmin' | 'appleHealth'; label: string; icon: string }[] = [
  { key: 'strava', label: 'Strava', icon: 'bicycle' },
  { key: 'garmin', label: 'Garmin Connect', icon: 'watch' },
  { key: 'appleHealth', label: 'Apple Health', icon: 'heart' },
];

const ConnectedAppsScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    strava: false,
    garmin: false,
    appleHealth: false,
  });

  useEffect(() => {
    userService.getConnectedApps().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async (key: 'strava' | 'garmin' | 'appleHealth') => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await userService.updateConnectedApps({ [key]: next[key] });
      showToast(next[key] ? `${APPS.find((a) => a.key === key)?.label} connected` : 'Disconnected', 'info');
    } catch {
      setSettings(settings); // Revert on error
      showToast('Failed to update. Check your connection.', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connected apps</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.primary} />
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
        <Text style={styles.headerTitle}>Connected apps</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Import activities & sync</Text>
        {APPS.map(({ key, label, icon }) => (
          <View key={key} style={styles.row}>
            <Ionicons name={icon as any} size={22} color="#000" />
            <Text style={styles.rowText}>{label}</Text>
            <Switch
              value={settings[key]}
              onValueChange={() => toggle(key)}
              trackColor={{ false: '#ddd', true: palette.primary }}
              thumbColor="#fff"
            />
          </View>
        ))}
        <Text style={styles.hint}>
          Connect to sync runs and activities. Preferences are saved to your account. Strava, Garmin, and Apple Health
          integrations are coming soon.
        </Text>
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 12, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowText: { flex: 1, fontSize: 16, color: '#000' },
  hint: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 16,
    marginTop: 16,
    lineHeight: 18,
  },
});

export default ConnectedAppsScreen;
