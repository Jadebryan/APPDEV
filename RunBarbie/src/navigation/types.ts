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
  Chats: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
