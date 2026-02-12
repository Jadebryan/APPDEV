import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { ProfileStackParamList } from '../navigation/types';
import { storage } from '../utils/storage';
import { PALETTES, type PaletteId } from '../theme/palettes';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMenu'>;

type DistanceUnit = 'km' | 'miles';

const APP_VERSION = '1.0.0';

const ProfileMenuScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { palette, paletteId, setPaletteId } = useTheme();
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [paletteModalVisible, setPaletteModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  useEffect(() => {
    storage.getDistanceUnits().then(setDistanceUnit);
  }, []);

  const applyPalette = async (id: PaletteId) => {
    await setPaletteId(id);
    setPaletteModalVisible(false);
    showToast(`Palette: ${PALETTES[id].name}`, 'success');
  };

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

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <TouchableOpacity style={styles.row} onPress={() => setPaletteModalVisible(true)} activeOpacity={0.7}>
          <View style={[styles.palettePreview, { backgroundColor: palette.primary }]} />
          <View style={styles.rowLabelWrap}>
            <Text style={styles.rowText}>Color palette</Text>
            <Text style={styles.rowSubtext}>{palette.name}</Text>
          </View>
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
          <Ionicons name="shield-checkmark-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Safety & Wellness</Text>
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

      {/* Color palette modal */}
      <Modal
        visible={paletteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPaletteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPaletteModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Color palette</Text>
            <Text style={styles.modalSubtitle}>Choose your app accent colors</Text>
            {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.optionRow,
                  paletteId === id && { backgroundColor: PALETTES[id].primaryLight, borderColor: PALETTES[id].primaryLight },
                ]}
                onPress={() => applyPalette(id)}
                activeOpacity={0.7}
              >
                <View style={styles.paletteSwatches}>
                  <View style={[styles.paletteSwatch, { backgroundColor: PALETTES[id].primary }]} />
                  <View style={[styles.paletteSwatch, { backgroundColor: PALETTES[id].secondary }]} />
                </View>
                <Text
                  style={[
                    styles.optionText,
                    paletteId === id && { color: PALETTES[id].primary, fontWeight: '600' as const },
                  ]}
                >
                  {PALETTES[id].name}
                </Text>
                {paletteId === id && (
                  <Ionicons name="checkmark-circle" size={24} color={PALETTES[id].primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setPaletteModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
              style={[styles.optionRow, distanceUnit === 'km' && [styles.optionRowSelected, { backgroundColor: palette.primaryLight, borderColor: palette.primaryLight }]]}
              onPress={() => applyUnit('km')}
              activeOpacity={0.7}
            >
              <Ionicons name="resize-outline" size={22} color={distanceUnit === 'km' ? palette.primary : '#666'} />
              <Text style={[styles.optionText, distanceUnit === 'km' && { color: palette.primary, fontWeight: '600' }]}>
                Kilometres (km)
              </Text>
              {distanceUnit === 'km' && (
                <Ionicons name="checkmark-circle" size={24} color={palette.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionRow, distanceUnit === 'miles' && [styles.optionRowSelected, { backgroundColor: palette.primaryLight, borderColor: palette.primaryLight }]]}
              onPress={() => applyUnit('miles')}
              activeOpacity={0.7}
            >
              <Ionicons name="resize-outline" size={22} color={distanceUnit === 'miles' ? palette.primary : '#666'} />
              <Text style={[styles.optionText, distanceUnit === 'miles' && { color: palette.primary, fontWeight: '600' }]}>
                Miles (mi)
              </Text>
              {distanceUnit === 'miles' && (
                <Ionicons name="checkmark-circle" size={24} color={palette.primary} />
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAboutModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.aboutContent}>
              <View style={[styles.aboutIconWrap, { backgroundColor: palette.primaryLight }]}>
                <Ionicons name="footsteps" size={40} color={palette.primary} />
              </View>
              <Text style={[styles.modalTitle, { textAlign: 'center' }]}>RunBarbie</Text>
              <Text style={[styles.modalSubtitle, { textAlign: 'center' }]}>Your trail running community</Text>
              <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
              <Text style={styles.aboutDesc}>
                Share runs, discover events, and stay motivated with runners and hikers.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalCancelBtn, styles.aboutDoneBtn, { backgroundColor: palette.primary }]}
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
  palettePreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  paletteSwatches: {
    flexDirection: 'row',
    gap: 6,
  },
  paletteSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  optionRowSelected: {},
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  optionTextSelected: {
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
  aboutContent: {
    alignItems: 'center',
    marginBottom: 8,
  },
  aboutIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutVersion: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
    textAlign: 'center',
  },
  aboutDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  aboutDoneBtn: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 12,
  },
  aboutDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ProfileMenuScreen;
