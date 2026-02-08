import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
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
import ChatInfoScreen from '../screens/ChatInfoScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import { useAuth } from '../context/AuthContext';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProfileMenuScreen from '../screens/ProfileMenuScreen';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';
import SafetySettingsScreen from '../screens/SafetySettingsScreen';
import ConnectedAppsScreen from '../screens/ConnectedAppsScreen';
import HelpFeedbackScreen from '../screens/HelpFeedbackScreen';
import CreateReelScreen from '../screens/CreateReelScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import AddGoalScreen from '../screens/AddGoalScreen';
import GoalsScreen from '../screens/GoalsScreen';
import SavedPostsScreen from '../screens/SavedPostsScreen';
import SavedRoutesScreen from '../screens/SavedRoutesScreen';
import ReportScreen from '../screens/ReportScreen';
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
    <FeedStack.Screen name="UserProfile" component={UserProfileScreen} />
    <FeedStack.Screen name="AddGoal" component={AddGoalScreen} />
    <FeedStack.Screen name="Goals" component={GoalsScreen} />
    <FeedStack.Screen name="SavedPosts" component={SavedPostsScreen} />
    <FeedStack.Screen name="SavedRoutes" component={SavedRoutesScreen} />
    <FeedStack.Screen name="Report" component={ReportScreen} />
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
    <ChatsStack.Screen name="ChatInfo" component={ChatInfoScreen} />
    <ChatsStack.Screen name="VideoCall" component={VideoCallScreen} />
    <ChatsStack.Screen name="UserProfile" component={UserProfileScreen} />
  </ChatsStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    <ProfileStack.Screen name="ProfileMenu" component={ProfileMenuScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
    <ProfileStack.Screen name="SafetySettings" component={SafetySettingsScreen} />
    <ProfileStack.Screen name="ConnectedApps" component={ConnectedAppsScreen} />
    <ProfileStack.Screen name="HelpFeedback" component={HelpFeedbackScreen} />
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
const DEFAULT_TAB_BAR_STYLE = {
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#DBDBDB',
  height: 50,
  paddingBottom: 5,
  paddingTop: 5,
};

const MainTabs = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => {
        const state = navigation.getState();
        const focusedIndex = state?.index ?? 0;
        const focusedRoute = state?.routes?.[focusedIndex];
        const nestedState = focusedRoute?.state as { routes?: { name: string }[]; index?: number } | undefined;
        const nestedRoutes = nestedState?.routes;
        const nestedIndex = nestedState?.index ?? 0;
        const currentScreenName = nestedRoutes?.[nestedIndex]?.name;
        const hideTabBar =
          (focusedRoute?.name === 'FeedStack' && (currentScreenName === 'StoryCapture' || currentScreenName === 'CreatePost')) ||
          (focusedRoute?.name === 'Reels' && currentScreenName === 'CreateReel');

        return {
        tabBarStyle: hideTabBar ? { display: 'none' } : DEFAULT_TAB_BAR_STYLE,
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
        tabBarShowLabel: false,
        headerShown: false,
      };
      }}
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
