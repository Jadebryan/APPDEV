import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../services/api';
import { ProfileStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'NotificationsSettings'>;

type PrefKey = 'likes' | 'comments' | 'follow' | 'messages' | 'weeklySummary' | 'challenges';

const NotificationsSettingsScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    likes: true,
    comments: true,
    follow: true,
    messages: true,
    weeklySummary: true,
    challenges: false,
  });

  useEffect(() => {
    userService.getNotificationPreferences().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = async (key: PrefKey, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await userService.updateNotificationPreferences({ [key]: value });
    } catch {
      setSettings(settings); // Revert on error
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
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
            trackColor={{ false: '#ddd', true: palette.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="chatbubble-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Comments</Text>
          <Switch
            value={settings.comments}
            onValueChange={(v) => update('comments', v)}
            trackColor={{ false: '#ddd', true: palette.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="person-add-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Follows</Text>
          <Switch
            value={settings.follow}
            onValueChange={(v) => update('follow', v)}
            trackColor={{ false: '#ddd', true: palette.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Messages</Text>
          <Switch
            value={settings.messages}
            onValueChange={(v) => update('messages', v)}
            trackColor={{ false: '#ddd', true: palette.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Weekly summary</Text>
          <Switch
            value={settings.weeklySummary}
            onValueChange={(v) => update('weeklySummary', v)}
            trackColor={{ false: '#ddd', true: palette.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="trophy-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Challenges</Text>
          <Switch
            value={settings.challenges}
            onValueChange={(v) => update('challenges', v)}
            trackColor={{ false: '#ddd', true: palette.primary }}
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
});

export default NotificationsSettingsScreen;
