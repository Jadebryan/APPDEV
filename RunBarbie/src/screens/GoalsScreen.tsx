import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userService, Goal } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FeedStackParamList } from '../navigation/types';
import { formatDurationMinutes } from '../utils/formatDuration';

type GoalsRoute = RouteProp<FeedStackParamList, 'Goals'>;

const GoalsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<GoalsRoute>();
  const { showToast } = useToast();
  const fromProfile = route.params?.fromProfile === true;

  const handleBack = () => {
    if (fromProfile) {
      const mainTabs = (navigation.getParent() as any)?.getParent?.();
      mainTabs?.navigate('ProfileStack');
    } else {
      navigation.goBack();
    }
  };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const list = await userService.getGoals();
      setGoals(list);
    } catch (error) {
      showToast('Failed to load goals', 'info');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleDelete = (goal: Goal) => {
    Alert.alert('Delete goal', `Remove "${goal.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.deleteGoal(goal._id);
            setGoals((prev) => prev.filter((g) => g._id !== goal._id));
            showToast('Goal removed', 'success');
          } catch {
            showToast('Failed to remove goal', 'info');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Goal }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {(item.targetDistance != null || item.targetDuration != null) && (
          <Text style={styles.cardSub}>
            {item.targetDistance != null && `${item.targetDistance} km`}
            {item.targetDistance != null && item.targetDuration != null && ' · '}
            {item.targetDuration != null && item.targetDuration > 0 && formatDurationMinutes(item.targetDuration)}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={22} color="#999" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My goals</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      ) : goals.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="flag-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No goals yet</Text>
          <Text style={styles.emptySub}>Set a goal from a post’s menu (⋯ → Set goal)</Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#000' },
  cardSub: { fontSize: 13, color: '#666', marginTop: 4 },
  deleteBtn: {},
});

export default GoalsScreen;
