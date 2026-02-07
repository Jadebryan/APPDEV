import type { User } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

export type FeedStackParamList = {
  FeedHome: undefined;
  CreatePost: undefined;
  Notifications: undefined;
  StoryCapture: undefined;
   Comments: {
    postId: string;
    username: string;
    caption: string;
    image: string;
  };
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
};

export type ChatsStackParamList = {
  ChatsList: undefined;
  ChatDetail: { conversationId: string; otherUser: User };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
