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
  Reels: undefined;
  Search: undefined;
  ChatsStack: undefined;
  Profile: undefined;
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
