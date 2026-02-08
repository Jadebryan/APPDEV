import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FeedStackParamList } from '../navigation/types';
import { userService } from '../services/api';
import { useToast } from '../context/ToastContext';

type AddGoalRoute = RouteProp<FeedStackParamList, 'AddGoal'>;

const AddGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddGoalRoute>();
  const { post } = route.params;
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [targetDistance, setTargetDistance] = useState('');
  const [targetDurationHours, setTargetDurationHours] = useState('');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalTargetDurationMinutes =
    (parseInt(targetDurationHours, 10) || 0) * 60 + (parseInt(targetDurationMinutes, 10) || 0);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      showToast('Goal title is required', 'info');
      return;
    }
    try {
      setSubmitting(true);
      await userService.addGoal({
        postId: post._id,
        title: trimmed,
        targetDistance: targetDistance ? parseFloat(targetDistance) : undefined,
        targetDuration: totalTargetDurationMinutes > 0 ? totalTargetDurationMinutes : undefined,
      });
      showToast('Goal added', 'success');
      navigation.goBack();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to add goal', 'info');
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
        <Text style={styles.headerTitle}>Set goal</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Goal title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Run 5k like this post"
            placeholderTextColor="#999"
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>Target distance (km, optional)</Text>
          <TextInput
            style={styles.input}
            value={targetDistance}
            onChangeText={setTargetDistance}
            placeholder="e.g. 5"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Target duration (optional)</Text>
          <View style={styles.durationRow}>
            <TextInput
              style={styles.durationInput}
              value={targetDurationHours}
              onChangeText={setTargetDurationHours}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.durationUnit}>h</Text>
            <TextInput
              style={styles.durationInput}
              value={targetDurationMinutes}
              onChangeText={setTargetDurationMinutes}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.durationUnit}>m</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Add goal</Text>
            )}
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 40 },
  keyboard: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  durationInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#000',
    minWidth: 0,
  },
  durationUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  submitBtn: {
    backgroundColor: '#FF69B4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default AddGoalScreen;
