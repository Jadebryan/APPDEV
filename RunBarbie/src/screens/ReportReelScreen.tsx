import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ReelsStackParamList } from '../navigation/types';
import { reelService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

type ReportReelRoute = RouteProp<ReelsStackParamList, 'ReportReel'>;

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'other', label: 'Other' },
] as const;

const ReportReelScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<ReportReelRoute>();
  const { reelId } = route.params;
  const { showToast } = useToast();
  const [reason, setReason] = useState<string>('other');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await reelService.reportReel(reelId, { reason, comment: comment.trim() || undefined });
      showToast("Thanks, we'll review this reel", 'success');
      (navigation as any).navigate('ReelsHome', { reportedReelId: reelId });
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to submit report', 'info');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report reel</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Reason</Text>
        {REPORT_REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.option, reason === r.value && styles.optionSelected]}
            onPress={() => setReason(r.value)}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, reason === r.value && [styles.radioSelected, { borderColor: palette.primary }]]}>
              {reason === r.value && <View style={[styles.radioDot, { backgroundColor: palette.primary }]} />}
            </View>
            <Text style={styles.optionText}>{r.label}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { marginTop: 20 }]}>Additional details (optional)</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Anything else we should know?"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: palette.primary }, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit report</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionSelected: { backgroundColor: '#f0f0f0' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: '#FF69B4' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF69B4' },
  optionText: { fontSize: 16, color: '#000' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ReportReelScreen;
