import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';
import { ChatsStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ChatsStackParamList, 'ChatInfo'>;
type Route = RouteProp<ChatsStackParamList, 'ChatInfo'>;

const ChatInfoScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { otherUser } = route.params;
  const { showToast } = useToast();
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const openProfile = () => {
    navigation.navigate('UserProfile', {
      userId: otherUser._id,
      username: otherUser.username,
      avatar: otherUser.avatar,
      bio: otherUser.bio,
    });
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
    showToast(muted ? 'Notifications unmuted' : 'Notifications muted', 'info');
  };

  const toggleBlock = () => {
    if (blocked) {
      setBlocked(false);
      showToast('User unblocked', 'success');
    } else {
      setBlocked(true);
      showToast('User blocked', 'neutral');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat info</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            {otherUser.avatar ? (
              <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {(otherUser.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>{otherUser.username}</Text>
          {otherUser.bio ? (
            <Text style={styles.bio}>{otherUser.bio}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.actionRow} onPress={openProfile} activeOpacity={0.7}>
          <Ionicons name="person-outline" size={22} color="#000" />
          <Text style={styles.actionText}>View profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={toggleMute} activeOpacity={0.7}>
          <Ionicons name={muted ? 'notifications-off-outline' : 'notifications-outline'} size={22} color="#000" />
          <Text style={styles.actionText}>{muted ? 'Unmute notifications' : 'Mute notifications'}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={toggleBlock} activeOpacity={0.7}>
          <Ionicons name="ban-outline" size={22} color={blocked ? '#22c55e' : '#e53935'} />
          <Text style={[styles.actionText, blocked && styles.actionTextGreen]}>
            {blocked ? 'Unblock' : 'Block'}
          </Text>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '600',
    color: '#666',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  actionTextGreen: {
    color: '#22c55e',
  },
});

export default ChatInfoScreen;
