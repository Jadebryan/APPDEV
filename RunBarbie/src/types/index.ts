export type ActivityType = 'run' | 'hike' | 'cycle' | 'walk' | 'other';

export interface User {
  _id: string;
  email: string;
  username: string;
  bio?: string;
  avatar?: string;
  followers: string[];
  following: string[];
  savedPosts?: string[]; // post IDs the user has bookmarked
  createdAt: string;
}

export interface PostLocation {
  latitude: number;
  longitude: number;
  name?: string; // optional place name
}

export interface Post {
  _id: string;
  userId: string;
  user: User;
  image: string;
  /** Multiple photo URLs when post has more than one image */
  images?: string[];
  caption: string;
  activityType: ActivityType;
  distance?: number; // in km
  duration?: number; // in minutes
  likes: string[]; // array of user IDs who liked
  commentCount?: number;
  location?: PostLocation; // pinned location for map
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** Returned by register when email verification is required (real API). */
export interface RegisterVerificationResponse {
  message: string;
  email: string;
}

export interface CreatePostData {
  /** Single image URL (legacy) */
  image?: string;
  /** Multiple image URLs; when present, used for carousel posts */
  images?: string[];
  caption: string;
  activityType: ActivityType;
  distance?: number;
  duration?: number;
  location?: PostLocation;
  /** User IDs to tag in the post; they receive a notification and push */
  taggedUserIds?: string[];
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
  duration?: number; // video length in seconds
  createdAt: string;
}

export interface CreateReelData {
  videoUri: string;
  caption: string;
  activityType?: ActivityType;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
  storyId?: string;
  storyMediaUri?: string;
}

export interface Conversation {
  _id: string;
  participant: User;
  lastMessage: { text: string; createdAt: string; senderId: string };
  unreadCount: number;
  updatedAt: string;
}
