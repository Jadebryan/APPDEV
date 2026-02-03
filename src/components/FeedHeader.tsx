import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FeedStackParamList } from '../navigation/types';
import { useNotifications } from '../context/NotificationsContext';

type FeedHeaderNav = NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>;

/**
 * FeedHeader Component - Instagram-style header
 * White background, centered logo text (script-style), plus icon (left), heart icon (right = notifications) with unread badge
 */
const FeedHeader: React.FC = () => {
  const navigation = useNavigation<FeedHeaderNav>();
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Left Icon: Create / Add (plus icon) */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Ionicons name="add-outline" size={28} color="#000" />
      </TouchableOpacity>

      {/* Centered Logo Text: Run Barbie with ribbon symbol */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Run Barbie</Text>
        {Platform.OS === 'android' ? (
          <Ionicons name="footsteps" size={20} color="#FF69B4" style={styles.logoIcon} />
        ) : (
          <Text style={[styles.logoText, styles.logoEmoji]}>🎀</Text>
        )}
      </View>

      {/* Right Icon: Notifications (heart outline, pink) with smart unread badge */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('Notifications')}
      >
        <View>
          <Ionicons name="heart-outline" size={26} color="#FF69B4" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
    // Sticky header positioning
    position: 'relative',
    zIndex: 100,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#000',
    letterSpacing: 0.5,
  },
  logoIcon: {
    marginLeft: 4,
  },
  logoEmoji: {
    marginLeft: 2,
  },
});

export default FeedHeader;
