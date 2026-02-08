import type { User, Post } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  VerifyEmail: { email: string };
  MainTabs: undefined;
};

export type FeedStackParamList = {
  FeedHome: { tag?: string };
  CreatePost: undefined;
  Notifications: undefined;
  StoryCapture: undefined;
  Comments: {
    postId: string;
    username: string;
    caption: string;
    image: string;
  };
  UserProfile: {
    userId: string;
    username?: string;
    avatar?: string;
    bio?: string;
  };
  AddGoal: { post: Post };
  Goals: undefined;
  SavedPosts: undefined;
  SavedRoutes: undefined;
  Report: { postId: string };
};

export type MainTabParamList = {
  FeedStack: undefined;
  Reels: { screen?: 'ReelsHome' | 'CreateReel'; params?: { initialReelId?: string } };
  Search: undefined;
  ChatsStack: undefined;
  ProfileStack: undefined;
};

export type ReelsStackParamList = {
  ReelsHome: { initialReelId?: string };
  CreateReel: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileMenu: undefined;
  EditProfile: undefined;
  NotificationsSettings: undefined;
  SafetySettings: undefined;
  ConnectedApps: undefined;
  HelpFeedback: undefined;
};

export type ChatsStackParamList = {
  ChatsList: undefined;
  ChatDetail: { conversationId: string; otherUser: User };
  ChatInfo: { otherUser: User };
  VideoCall: { otherUser: User };
  UserProfile: { userId: string; username?: string; avatar?: string; bio?: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
