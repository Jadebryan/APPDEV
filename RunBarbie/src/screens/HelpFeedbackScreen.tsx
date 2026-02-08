import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'HelpFeedback'>;

const FAQ_ITEMS = [
  { q: 'How do I add a post?', a: 'Tap the + icon on the home tab to create a post. Add a photo, caption, activity type, and optional distance/duration.' },
  { q: 'How do I share my location?', a: "When creating a post, tap 'Add location' and choose 'I'm here now' for current GPS or 'Search for a place' to pick a location." },
  { q: 'How do I find trail run events?', a: "Open the Search tab and check the Highlight section for upcoming trail run events. Tap an event to view or register." },
  { q: 'How do I message someone?', a: "Go to the Chats tab, tap 'Message' on a suggested user or open an existing conversation to send messages." },
];

const HelpFeedbackScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [expanded, setExpanded] = useState<number | null>(null);

  const openMail = (to: string, subject: string) => {
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & feedback</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>FAQ</Text>
        {FAQ_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqRow}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.7}
          >
            <Text style={styles.faqQ}>{item.q}</Text>
            <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            {expanded === i && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Contact</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => openMail('support@runbarbie.app', 'RunBarbie Support')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Contact support</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => openMail('feedback@runbarbie.app', 'RunBarbie Feedback')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbox-outline" size={22} color="#000" />
          <Text style={styles.rowText}>Send feedback</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
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
  faqRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  faqQ: { fontSize: 16, fontWeight: '500', color: '#000', marginBottom: 4 },
  faqA: { fontSize: 14, color: '#666', lineHeight: 20, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowText: { flex: 1, fontSize: 16, color: '#000' },
});

export default HelpFeedbackScreen;
