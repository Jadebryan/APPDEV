export type ActivityType = 'run' | 'hike' | 'cycle' | 'walk' | 'other';

export interface User {
  _id: string;
  email: string;
  username: string;
  bio?: string;
  avatar?: string;
  followers: string[];
  following: string[];
  createdAt: string;
}

export interface Post {
  _id: string;
  userId: string;
  user: User;
  image: string;
  caption: string;
  activityType: ActivityType;
  distance?: number; // in km
  duration?: number; // in minutes
  likes: string[]; // array of user IDs who liked
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreatePostData {
  image: string;
  caption: string;
  activityType: ActivityType;
  distance?: number;
  duration?: number;
}

export interface Reel {
  _id: string;
  userId: string;
  user: User;
  videoUri: string;
  caption: string;
  activityType?: ActivityType;
  likes: string[];
  commentCount?: number;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  _id: string;
  participant: User;
  lastMessage: { text: string; createdAt: string; senderId: string };
  unreadCount: number;
  updatedAt: string;
}
