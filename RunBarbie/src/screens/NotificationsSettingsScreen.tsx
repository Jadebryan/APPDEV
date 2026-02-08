import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { storage, NotificationsSettings } from '../utils/storage';
import { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'NotificationsSettings'>;

const NotificationsSettingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [settings, setSettings] = useState<NotificationsSettings>({
    likes: true,
    comments: true,
    weeklySummary: true,
    challenges: false,
  });

  useEffect(() => {
    storage.getNotificationsSettings().then(setSettings);
  }, []);

  const update = async (key: keyof NotificationsSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await storage.setNotificationsSettings(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Push notifications</Text>
        <View style={styles.row}>
          <Ionicons name="heart-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Likes</Text>
          <Switch
            value={settings.likes}
            onValueChange={(v) => update('likes', v)}
            trackColor={{ false: '#ddd', true: '#0095f6' }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="chatbubble-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Comments</Text>
          <Switch
            value={settings.comments}
            onValueChange={(v) => update('comments', v)}
            trackColor={{ false: '#ddd', true: '#0095f6' }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Weekly summary</Text>
          <Switch
            value={settings.weeklySummary}
            onValueChange={(v) => update('weeklySummary', v)}
            trackColor={{ false: '#ddd', true: '#0095f6' }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="trophy-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Challenges</Text>
          <Switch
            value={settings.challenges}
            onValueChange={(v) => update('challenges', v)}
            trackColor={{ false: '#ddd', true: '#0095f6' }}
            thumbColor="#fff"
          />
        </View>
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
});

export default NotificationsSettingsScreen;
