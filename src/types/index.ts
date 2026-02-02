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
