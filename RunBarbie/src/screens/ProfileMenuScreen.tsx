import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { storage } from '../utils/storage';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMenu'>;

type DistanceUnit = 'km' | 'miles';

const APP_VERSION = '1.0.0';

const ProfileMenuScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');

  useEffect(() => {
    storage.getDistanceUnits().then(setDistanceUnit);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleUnits = () => {
    Alert.alert(
      'Distance units',
      'Show distances in',
      [
        { text: 'Kilometres (km)', onPress: () => applyUnit('km') },
        { text: 'Miles (mi)', onPress: () => applyUnit('miles') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const applyUnit = async (unit: DistanceUnit) => {
    await storage.setDistanceUnits(unit);
    setDistanceUnit(unit);
  };

  const comingSoon = (title: string, message: string) => () => {
    Alert.alert(title, message);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Options</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
          <Ionicons name="person-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Activity & units – runners, hikers, trail runners */}
        <Text style={styles.sectionTitle}>Activity & units</Text>
        <TouchableOpacity style={styles.row} onPress={handleUnits} activeOpacity={0.7}>
          <Ionicons name="resize-outline" size={22} color="#000" />
          <View style={styles.rowLabelWrap}>
            <Text style={styles.rowText}>Distance units</Text>
            <Text style={styles.rowSubtext}>{distanceUnit === 'km' ? 'Kilometres (km)' : 'Miles (mi)'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Connections – Strava, Garmin, etc. */}
        <Text style={styles.sectionTitle}>Connections</Text>
        <TouchableOpacity style={styles.row} onPress={comingSoon('Connected apps', 'Connect Strava, Garmin, Apple Health and more. Coming soon.')} activeOpacity={0.7}>
          <Ionicons name="link-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Connected apps</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* More – notifications, safety, help */}
        <Text style={styles.sectionTitle}>More</Text>
        <TouchableOpacity style={styles.row} onPress={comingSoon('Notifications', 'Push for likes, comments, weekly summary and challenges. Coming soon.')} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={comingSoon('Safety', 'Share live location on runs and set emergency contact. Coming soon for trail runners.')} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Safety & live location</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={comingSoon('Help & feedback', 'FAQ, contact support and send feedback. Coming soon.')} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Help & feedback</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Alert.alert('RunBarbie', `Version ${APP_VERSION}`)} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={22} color="#000" />
          <Text style={styles.rowText}>About</Text>
          <Text style={styles.rowValue}>v{APP_VERSION}</Text>
        </TouchableOpacity>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={[styles.row, styles.logoutRow]} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color="#c00" />
          <Text style={[styles.rowText, styles.logoutText]}>Log out</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 32,
  },
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
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabelWrap: {
    flex: 1,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  rowSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    color: '#999',
  },
  logoutRow: {
    marginTop: 4,
  },
  logoutText: {
    color: '#c00',
    fontWeight: '500',
  },
});

export default ProfileMenuScreen;
