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
  FeedHome: { tag?: string; initialStoryUserId?: string; initialStoryId?: string };
  CreatePost: undefined;
  Notifications: undefined;
  ActiveRun: { runId: string };
  StoryCapture: undefined;
  Comments: {
    postId: string;
    username: string;
    caption: string;
    image: string;
    returnToSearch?: boolean;
  };
  UserProfile: {
    userId: string;
    username?: string;
    avatar?: string;
    bio?: string;
  };
  FollowList: {
    mode: 'followers' | 'following';
    userId: string;
    username?: string;
  };
  AddGoal: { post: Post };
  Goals: { fromProfile?: boolean };
  SavedPosts: { fromProfile?: boolean };
  SavedRoutes: { fromProfile?: boolean };
  Report: { postId: string };
};

export type MainTabParamList = {
  FeedStack: undefined;
  Reels: { screen?: 'ReelsHome' | 'CreateReel' | 'SavedReels' | 'ReportReel'; params?: { initialReelId?: string } };
  Search: undefined;
  ChatsStack: undefined;
  ProfileStack: undefined;
};

export type ReelsStackParamList = {
  ReelsHome: { initialReelId?: string; reportedReelId?: string; returnToSearch?: boolean };
  CreateReel: undefined;
  SavedReels: { fromProfile?: boolean };
  ReportReel: { reelId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileMenu: undefined;
  EditProfile: undefined;
  FollowList: {
    mode: 'followers' | 'following';
    userId: string;
    username?: string;
  };
  ProfileVisitors: undefined;
  NotificationsSettings: undefined;
  SafetySettings: undefined;
  StartRun: undefined;
  RunHistory: undefined;
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
