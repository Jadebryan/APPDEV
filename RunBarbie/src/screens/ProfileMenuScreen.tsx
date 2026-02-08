import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ProfileStackParamList } from '../navigation/types';
import { storage } from '../utils/storage';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMenu'>;

type DistanceUnit = 'km' | 'miles';

const APP_VERSION = '1.0.0';

const ProfileMenuScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  useEffect(() => {
    storage.getDistanceUnits().then(setDistanceUnit);
  }, []);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
  };

  const applyUnit = async (unit: DistanceUnit) => {
    await storage.setDistanceUnits(unit);
    setDistanceUnit(unit);
    setDistanceModalVisible(false);
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
        <TouchableOpacity style={styles.row} onPress={() => setDistanceModalVisible(true)} activeOpacity={0.7}>
          <Ionicons name="resize-outline" size={22} color="#000" />
          <View style={styles.rowLabelWrap}>
            <Text style={styles.rowText}>Distance units</Text>
            <Text style={styles.rowSubtext}>{distanceUnit === 'km' ? 'Kilometres (km)' : 'Miles (mi)'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Connections – Strava, Garmin, etc. */}
        <Text style={styles.sectionTitle}>Connections</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ConnectedApps')} activeOpacity={0.7}>
          <Ionicons name="link-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Connected apps</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* More – notifications, safety, help */}
        <Text style={styles.sectionTitle}>More</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('NotificationsSettings')} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SafetySettings')} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Safety & live location</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('HelpFeedback')} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Help & feedback</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => setAboutModalVisible(true)} activeOpacity={0.7}>
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

      {/* Distance units modal */}
      <Modal
        visible={distanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDistanceModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDistanceModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Distance units</Text>
            <Text style={styles.modalSubtitle}>Show distances in runs and activities</Text>
            <TouchableOpacity
              style={[styles.optionRow, distanceUnit === 'km' && styles.optionRowSelected]}
              onPress={() => applyUnit('km')}
              activeOpacity={0.7}
            >
              <Ionicons name="resize-outline" size={22} color={distanceUnit === 'km' ? '#0095f6' : '#666'} />
              <Text style={[styles.optionText, distanceUnit === 'km' && styles.optionTextSelected]}>
                Kilometres (km)
              </Text>
              {distanceUnit === 'km' && (
                <Ionicons name="checkmark-circle" size={24} color="#0095f6" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionRow, distanceUnit === 'miles' && styles.optionRowSelected]}
              onPress={() => applyUnit('miles')}
              activeOpacity={0.7}
            >
              <Ionicons name="resize-outline" size={22} color={distanceUnit === 'miles' ? '#0095f6' : '#666'} />
              <Text style={[styles.optionText, distanceUnit === 'miles' && styles.optionTextSelected]}>
                Miles (mi)
              </Text>
              {distanceUnit === 'miles' && (
                <Ionicons name="checkmark-circle" size={24} color="#0095f6" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setDistanceModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* About modal */}
      <Modal
        visible={aboutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.aboutModalOverlay}
          activeOpacity={1}
          onPress={() => setAboutModalVisible(false)}
        >
          <View style={styles.aboutModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.aboutIconWrap}>
              <Ionicons name="footsteps" size={40} color="#0095f6" />
            </View>
            <Text style={styles.aboutAppName}>RunBarbie</Text>
            <Text style={styles.aboutTagline}>Your trail running community</Text>
            <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
            <Text style={styles.aboutDesc}>
              Share runs, discover events, and stay motivated with runners and hikers.
            </Text>
            <TouchableOpacity
              style={styles.aboutDoneBtn}
              onPress={() => setAboutModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.aboutDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    backgroundColor: '#f5f5f5',
  },
  optionRowSelected: {
    backgroundColor: '#E8F4FD',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  optionTextSelected: {
    color: '#0095f6',
    fontWeight: '600',
  },
  modalCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  aboutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aboutModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  aboutIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutAppName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  aboutTagline: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  aboutVersion: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  aboutDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  aboutDoneBtn: {
    backgroundColor: '#0095f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  aboutDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ProfileMenuScreen;
