import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { storage, SafetySettings } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SafetySettings'>;

const SafetySettingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('');

  useEffect(() => {
    storage.getSafetySettings().then((s) => {
      setShareLiveLocation(s.shareLiveLocation);
      setEmergencyContact(s.emergencyContact || '');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety & live location</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>On runs</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={22} color="#000" />
            <Text style={styles.rowText}>Share live location on runs</Text>
            <Switch
              value={shareLiveLocation}
              onValueChange={saveShareLive}
              trackColor={{ false: '#ddd', true: '#0095f6' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.sectionTitle}>Emergency contact</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Name or phone number"
              placeholderTextColor="#999"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              onBlur={saveEmergencyContact}
              returnKeyType="done"
            />
          </View>
          <Text style={styles.hint}>Saved automatically when you leave the field.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  inputRow: { paddingHorizontal: 16, paddingVertical: 8 },
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
});

export default SafetySettingsScreen;
