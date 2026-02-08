import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';
import { ChatsStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ChatsStackParamList, 'VideoCall'>;
type Route = RouteProp<ChatsStackParamList, 'VideoCall'>;

const VideoCallScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { otherUser } = route.params;
  const { showToast } = useToast();
  const [callState, setCallState] = useState<'calling' | 'connecting' | 'in-call'>('calling');

  useEffect(() => {
    const t = setTimeout(() => setCallState('connecting'), 1500);
    const t2 = setTimeout(() => setCallState('in-call'), 3500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  const endCall = () => {
    showToast('Call ended', 'neutral');
    navigation.goBack();
  };

  const statusText =
    callState === 'calling'
      ? 'Calling...'
      : callState === 'connecting'
        ? 'Connecting...'
        : 'In call';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
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
          {callState === 'in-call' && (
            <View style={styles.liveDot}>
              <View style={styles.livePulse} />
              <View style={styles.liveInner} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{otherUser.username}</Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.8}>
          <Ionicons name="call" size={28} color="#fff" style={styles.endBtnIcon} />
          <Text style={styles.endBtnLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 48,
    fontWeight: '600',
    color: '#888',
  },
  liveDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  livePulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
  },
  liveInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  controls: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  endBtnIcon: {
    transform: [{ rotate: '135deg' }],
  },
  endBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

export default VideoCallScreen;
