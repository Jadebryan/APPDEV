import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { storage, SafetySettings, CycleSettings } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SafetySettings'>;

const SafetySettingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencySosEnabled, setEmergencySosEnabled] = useState(true);
  const [safeRouteSuggestions, setSafeRouteSuggestions] = useState(true);
  const [sunHeatAlerts, setSunHeatAlerts] = useState(true);
  const [menstrualCycleAware, setMenstrualCycleAware] = useState(false);
  const [lastPeriodStart, setLastPeriodStart] = useState('');
  const [cycleLengthDays, setCycleLengthDays] = useState('28');
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const emergencyInputY = useRef<number>(0);

  useEffect(() => {
    storage.getSafetySettings().then((s) => {
      setShareLiveLocation(s.shareLiveLocation);
      setEmergencyContact(s.emergencyContact || '');
      setEmergencySosEnabled(s.emergencySosEnabled ?? true);
      setSafeRouteSuggestions(s.safeRouteSuggestions ?? true);
      setSunHeatAlerts(s.sunHeatAlerts ?? true);
      setMenstrualCycleAware(s.menstrualCycleAware ?? false);
    });
    storage.getCycleSettings().then((c) => {
      if (c) {
        setLastPeriodStart(c.lastPeriodStart?.slice(0, 10) || '');
        setCycleLengthDays(String(c.cycleLengthDays || 28));
      }
    });
  }, []);

  const saveShareLive = async (value: boolean) => {
    setShareLiveLocation(value);
    const s = await storage.getSafetySettings();
    await storage.setSafetySettings({ ...s, shareLiveLocation: value });
    showToast(value ? 'Live location sharing on' : 'Live location sharing off', 'info');
  };

  const saveEmergencyContact = async () => {
    const s = await storage.getSafetySettings();
    await storage.setSafetySettings({ ...s, emergencyContact: emergencyContact.trim() });
    showToast('Emergency contact saved', 'success');
  };

  const saveSosEnabled = async (value: boolean) => {
    setEmergencySosEnabled(value);
    const s = await storage.getSafetySettings();
    await storage.setSafetySettings({ ...s, emergencySosEnabled: value });
    showToast(value ? 'Emergency SOS enabled' : 'Emergency SOS disabled', 'info');
  };

  const saveSafeRoutes = async (value: boolean) => {
    setSafeRouteSuggestions(value);
    const s = await storage.getSafetySettings();
    await storage.setSafetySettings({ ...s, safeRouteSuggestions: value });
    showToast(value ? 'Safe route suggestions on' : 'Safe route suggestions off', 'info');
  };

  const saveSunHeatAlerts = async (value: boolean) => {
    setSunHeatAlerts(value);
    const s = await storage.getSafetySettings();
    await storage.setSafetySettings({ ...s, sunHeatAlerts: value });
    showToast(value ? 'Sun/heat alerts on' : 'Sun/heat alerts off', 'info');
  };

  const saveMenstrualCycleAware = async (value: boolean) => {
    setMenstrualCycleAware(value);
    const s = await storage.getSafetySettings();
    await storage.setSafetySettings({ ...s, menstrualCycleAware: value });
    showToast(value ? 'Cycle-aware training on' : 'Cycle-aware training off', 'info');
  };

  const saveCycleSettings = async () => {
    if (!lastPeriodStart) return;
    const cycleLen = parseInt(cycleLengthDays, 10) || 28;
    await storage.setCycleSettings({
      lastPeriodStart: lastPeriodStart + 'T00:00:00.000Z',
      cycleLengthDays: Math.max(21, Math.min(45, cycleLen)),
    });
    showToast('Cycle settings saved', 'success');
  };

  const handleTestSos = () => {
    setSosModalVisible(true);
  };

  const handleCall911 = () => {
    setSosModalVisible(false);
    Linking.openURL('tel:911');
  };

  const handleTextEmergencyContact = () => {
    setSosModalVisible(false);
    const phone = emergencyContact.trim().replace(/\D/g, '');
    if (phone.length >= 10) {
      const smsBody = encodeURIComponent('I need help. Please call me back.');
      Linking.openURL(`sms:${phone}?body=${smsBody}`).catch(() => {});
    } else {
      showToast('Add a phone number in Emergency contact first', 'info');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety & Wellness</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <TouchableOpacity
            style={[styles.startRunBtn, { backgroundColor: palette.primary }]}
            onPress={() => navigation.navigate('StartRun')}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={28} color="#fff" />
            <View style={styles.startRunBtnContent}>
              <Text style={styles.startRunBtnText}>Start Run</Text>
              <Text style={styles.startRunBtnSubtext}>Weather check, safe routes & SOS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.runHistoryBtn}
            onPress={() => navigation.navigate('RunHistory')}
            activeOpacity={0.8}
          >
            <Ionicons name="footsteps" size={22} color={palette.primary} />
            <Text style={styles.runHistoryText}>Run history</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Live location & SOS */}
          <Text style={styles.sectionTitle}>On runs</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={22} color="#000" />
            <View style={styles.rowContent}>
              <Text style={styles.rowText}>Share live location during runs</Text>
              <Text style={styles.rowSubtext}>Let trusted contacts see your location in real time</Text>
            </View>
            <Switch
              value={shareLiveLocation}
              onValueChange={saveShareLive}
              trackColor={{ false: '#ddd', true: palette.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.row}>
            <Ionicons name="alert-circle-outline" size={22} color="#000" />
            <View style={styles.rowContent}>
              <Text style={styles.rowText}>Emergency SOS button</Text>
              <Text style={styles.rowSubtext}>Quick access to call for help during runs</Text>
            </View>
            <Switch
              value={emergencySosEnabled}
              onValueChange={saveSosEnabled}
              trackColor={{ false: '#ddd', true: palette.primary }}
              thumbColor="#fff"
            />
          </View>
          {emergencySosEnabled && (
            <TouchableOpacity style={styles.sosTestBtn} onPress={handleTestSos} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={20} color="#c00" />
              <Text style={styles.sosTestText}>Test SOS / Call emergency</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Emergency contact</Text>
          <View
            style={styles.inputRow}
            onLayout={(e) => {
              emergencyInputY.current = e.nativeEvent.layout.y;
            }}
          >
            <TextInput
              style={styles.input}
              placeholder="Name or phone number"
              placeholderTextColor="#999"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              onBlur={saveEmergencyContact}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollTo({
                    y: Math.max(0, emergencyInputY.current - 80),
                    animated: true,
                  });
                }, 150);
              }}
              returnKeyType="done"
            />
          </View>
          <Text style={styles.hint}>Saved automatically when you leave the field. Used when SOS is triggered.</Text>

          {/* Routes & alerts */}
          <Text style={styles.sectionTitle}>Route & weather</Text>
          <View style={styles.row}>
            <Ionicons name="map-outline" size={22} color="#000" />
            <View style={styles.rowContent}>
              <Text style={styles.rowText}>Safe route suggestions</Text>
              <Text style={styles.rowSubtext}>Suggest well-lit, populated routes for solo runs</Text>
            </View>
            <Switch
              value={safeRouteSuggestions}
              onValueChange={saveSafeRoutes}
              trackColor={{ false: '#ddd', true: palette.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.row}>
            <Ionicons name="sunny-outline" size={22} color="#000" />
            <View style={styles.rowContent}>
              <Text style={styles.rowText}>Sun / heat alerts</Text>
              <Text style={styles.rowSubtext}>Warn before hot runs — UV index, heat index</Text>
            </View>
            <Switch
              value={sunHeatAlerts}
              onValueChange={saveSunHeatAlerts}
              trackColor={{ false: '#ddd', true: palette.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Wellness */}
          <Text style={styles.sectionTitle}>Wellness (optional)</Text>
          <View style={styles.row}>
            <Ionicons name="fitness-outline" size={22} color="#000" />
            <View style={styles.rowContent}>
              <Text style={styles.rowText}>Menstrual cycle–aware training</Text>
              <Text style={styles.rowSubtext}>Adjust suggestions based on your cycle phase</Text>
            </View>
            <Switch
              value={menstrualCycleAware}
              onValueChange={saveMenstrualCycleAware}
              trackColor={{ false: '#ddd', true: palette.primary }}
              thumbColor="#fff"
            />
          </View>
          {menstrualCycleAware && (
            <>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Last period start (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025-01-15"
                  placeholderTextColor="#999"
                  value={lastPeriodStart}
                  onChangeText={setLastPeriodStart}
                  onBlur={saveCycleSettings}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Average cycle length (days)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="28"
                  placeholderTextColor="#999"
                  value={cycleLengthDays}
                  onChangeText={setCycleLengthDays}
                  onBlur={saveCycleSettings}
                  keyboardType="number-pad"
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Emergency SOS modal */}
      <Modal
        visible={sosModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSosModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSosModalVisible(false)}>
          <View style={[styles.sosModalCard, { borderColor: palette.primary + '30' }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.sosModalIcon, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Ionicons name="alert-circle" size={36} color="#FF3B30" />
            </View>
            <Text style={styles.sosModalTitle}>Emergency SOS</Text>
            <Text style={styles.sosModalMessage}>
              Get help quickly. Call 911 for emergency services, or text your emergency contact if you've added one.
            </Text>
            <View style={styles.sosModalDivider} />
            <TouchableOpacity
              style={styles.sosModalBtnPrimary}
              onPress={handleCall911}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.sosModalBtnPrimaryText}>Call 911</Text>
            </TouchableOpacity>
            {emergencyContact.trim().replace(/\D/g, '').length >= 10 && (
              <TouchableOpacity
                style={[styles.sosModalBtnSecondary, { borderColor: palette.primary }]}
                onPress={handleTextEmergencyContact}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={20} color={palette.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.sosModalBtnSecondaryText, { color: palette.primary }]}>Text emergency contact</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sosModalCancel} onPress={() => setSosModalVisible(false)} activeOpacity={0.7}>
              <Text style={[styles.sosModalCancelText, { color: palette.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 12, paddingBottom: 120 },
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
  rowContent: { flex: 1 },
  rowText: { fontSize: 16, color: '#000' },
  rowSubtext: { fontSize: 12, color: '#666', marginTop: 2 },
  sosTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
  },
  sosTestText: { fontSize: 14, color: '#c00', fontWeight: '600' },
  inputRow: { paddingHorizontal: 16, paddingVertical: 8 },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 6, marginHorizontal: 16 },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 16,
    marginTop: 8,
  },
  startRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  startRunBtnContent: { flex: 1 },
  runHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  runHistoryText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#000' },
  startRunBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  startRunBtnSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  // SOS modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sosModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  sosModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sosModalTitle: { fontSize: 20, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 8 },
  sosModalMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  sosModalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.1)', marginBottom: 20 },
  sosModalBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  sosModalBtnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sosModalBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  sosModalBtnSecondaryText: { fontSize: 15, fontWeight: '600' },
  sosModalCancel: { alignItems: 'center', paddingVertical: 12 },
  sosModalCancelText: { fontSize: 16, fontWeight: '600' },
});

export default SafetySettingsScreen;
