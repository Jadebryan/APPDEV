import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import { DEFAULT_AVATAR_URI } from '../utils/defaultAvatar';
import { useTheme } from '../context/ThemeContext';

type VisitorItem = { _id: string; username: string; avatar?: string; viewedAt: string };

function getTimeAgo(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}w ago`;
  return new Date(ts).toLocaleDateString();
}

const ProfileVisitorsScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const [list, setList] = useState<VisitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const { users } = await userService.getProfileVisitors();
      setList(users ?? []);
    } catch (e) {
      console.error('Profile visitors load error:', e);
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const onRefresh = () => {
    setRefreshing(true);
    loadList();
  };

  const handleAccountPress = (item: VisitorItem) => {
    if (currentUser?._id === item._id) return;
    // ProfileVisitors is inside ProfileStack; UserProfile lives in FeedStack — get tab navigator and navigate there
    const tabNav = navigation.getParent()?.getParent();
    if (tabNav && typeof (tabNav as any).navigate === 'function') {
      (tabNav as any).navigate('FeedStack', {
        screen: 'UserProfile',
        params: { userId: item._id, username: item.username, avatar: item.avatar },
      });
    } else {
      (navigation as any).navigate('UserProfile', {
        userId: item._id,
        username: item.username,
        avatar: item.avatar,
      });
    }
  };

  const renderItem = ({ item }: { item: VisitorItem }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => handleAccountPress(item)}
    >
      <Image
        source={{ uri: item.avatar || DEFAULT_AVATAR_URI }}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
        <Text style={styles.viewedAt}>{getTimeAgo(item.viewedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile views</Text>
        <View style={styles.headerRight} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="eye-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No profile views yet</Text>
          <Text style={styles.emptySubtext}>When someone views your profile, they'll appear here</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
          }
        />
      )}
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  viewedAt: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});

export default ProfileVisitorsScreen;
