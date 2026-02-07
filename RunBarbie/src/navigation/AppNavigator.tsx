import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import FeedScreen from '../screens/FeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import StoryCaptureScreen from '../screens/StoryCaptureScreen';
import CommentsScreen from '../screens/CommentsScreen';
import ReelsScreen from '../screens/ReelsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import { useAuth } from '../context/AuthContext';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProfileMenuScreen from '../screens/ProfileMenuScreen';
import CreateReelScreen from '../screens/CreateReelScreen';
import { RootStackParamList, MainTabParamList, FeedStackParamList, ChatsStackParamList, ProfileStackParamList, ReelsStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const ChatsStack = createNativeStackNavigator<ChatsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ReelsStack = createNativeStackNavigator<ReelsStackParamList>();

/**
 * Feed tab has its own stack so Create Post keeps the tab bar visible
 */
const FeedStackNavigator = () => (
  <FeedStack.Navigator screenOptions={{ headerShown: false }}>
    <FeedStack.Screen name="FeedHome" component={FeedScreen} />
    <FeedStack.Screen name="CreatePost" component={CreatePostScreen} />
    <FeedStack.Screen name="Notifications" component={NotificationsScreen} />
    <FeedStack.Screen name="StoryCapture" component={StoryCaptureScreen} />
    <FeedStack.Screen name="Comments" component={CommentsScreen} />
  </FeedStack.Navigator>
);

/**
 * Bottom Navigation Component - Instagram-style
 * Chats tab has its own stack: list + conversation detail
 */
const ChatsStackNavigator = () => (
  <ChatsStack.Navigator screenOptions={{ headerShown: false }}>
    <ChatsStack.Screen name="ChatsList" component={ChatsScreen} />
    <ChatsStack.Screen name="ChatDetail" component={ChatDetailScreen} />
  </ChatsStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    <ProfileStack.Screen name="ProfileMenu" component={ProfileMenuScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
  </ProfileStack.Navigator>
);

const ReelsStackNavigator = () => (
  <ReelsStack.Navigator screenOptions={{ headerShown: false }}>
    <ReelsStack.Screen name="ReelsHome" component={ReelsScreen} />
    <ReelsStack.Screen name="CreateReel" component={CreateReelScreen} />
  </ReelsStack.Navigator>
);

/**
 * Bottom Navigation Component - Instagram-style
 * 5 icons: Home (filled when active), Reels, Chats, Search, Profile (circular avatar)
 * White background with subtle top border
 */
const MainTabs = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'FeedStack') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Reels') {
            // Reels/Video icon (play button)
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'ChatsStack') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'ProfileStack') {
            // Return circular avatar for profile tab
            if (focused) {
              return (
                <View style={styles.profileTab}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
                  ) : (
                    <View style={[styles.profileAvatar, styles.profilePlaceholder]}>
                      <Ionicons name="person" size={20} color="#000" />
                    </View>
                  )}
                </View>
              );
            } else {
              return (
                <View style={styles.profileTab}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.profileAvatarOutline} />
                  ) : (
                    <View style={[styles.profileAvatarOutline, styles.profilePlaceholder]}>
                      <Ionicons name="person-outline" size={20} color="#000" />
                    </View>
                  )}
                </View>
              );
            }
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#000',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#DBDBDB',
          height: 50,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarShowLabel: false,
        headerShown: false,
      })}
    >
      <Tab.Screen name="FeedStack" component={FeedStackNavigator} options={{ title: 'Feed' }} />
      <Tab.Screen name="Reels" component={ReelsStackNavigator} options={{ title: 'Reels' }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="ChatsStack" component={ChatsStackNavigator} options={{ title: 'Chats' }} />
      <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  profileTab: {
    width: 24,
    height: 24,
  },
  profileAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  profileAvatarOutline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  profilePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
