import axios from 'axios';
import { Platform } from 'react-native';
import { AuthResponse, RegisterVerificationResponse, Post, User, CreatePostData, CreateReelData, Reel, Conversation, Message } from '../types';
import { storage } from '../utils/storage';

// API URL: set EXPO_PUBLIC_API_URL in RunBarbie/.env to override (e.g. http://192.168.1.100:3000/api for physical device).
// Android emulator uses 10.0.2.2 to reach host; iOS simulator uses localhost.
function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api'; // Android emulator → host
    return 'http://localhost:3000/api'; // iOS simulator / web
  }
  return 'https://your-production-url.com/api';
}
const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for uploads
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Normalize API errors: attach server message to error.message for consistent handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const serverMsg = err.response?.data?.error;
    if (typeof serverMsg === 'string' && serverMsg.trim()) {
      err.message = serverMsg.trim();
    } else if (err.code === 'ECONNABORTED') {
      err.message = 'Request timed out. Please check your connection and try again.';
    } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
      err.message = "Can't reach the server. Check your connection and that the server is running.";
    }
    return Promise.reject(err);
  }
);

export interface SearchTag {
  tag: string;
  postCount: number;
}

export interface UpcomingTrailPost {
  id: string;
  title: string;
  trailName: string;
  date: string;
  image: string;
  /** Event location e.g. "Manila, Philippines" */
  location?: string;
  /** Registration or event info URL */
  registerUrl?: string;
  postId?: string;
}

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800';

/**
 * Fetch trail run events from Facebook Graph API (search?type=event&q=trail run).
 * Requires a user access token (event search does not work with app-only tokens).
 * Set EXPO_PUBLIC_FACEBOOK_ACCESS_TOKEN in .env to enable. Get a token from
 * Facebook Graph API Explorer or add Facebook Login to your app.
 */
async function fetchFacebookTrailEvents(accessToken: string): Promise<UpcomingTrailPost[]> {
  const q = encodeURIComponent('trail run Philippines');
  const fields = encodeURIComponent('id,name,place{name,location},start_time,cover');
  const url = `${FACEBOOK_GRAPH_API}/search?q=${q}&type=event&fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Facebook API ${res.status}`);
  }
  const data = await res.json();
  const events = data?.data;
  if (!Array.isArray(events)) return [];

  const now = new Date();
  return events
    .filter((e: { start_time?: string }) => {
      if (!e.start_time) return false;
      const start = new Date(e.start_time);
      return start >= now;
    })
    .slice(0, 15)
    .map((e: {
      id: string;
      name: string;
      place?: { name?: string; location?: { city?: string; country?: string } };
      start_time: string;
      cover?: { source?: string };
    }) => {
      const start = new Date(e.start_time);
      const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const place = e.place;
      const location = place?.location
        ? [place.location.city, place.location.country].filter(Boolean).join(', ')
        : place?.name || undefined;
      return {
        id: e.id,
        title: e.name,
        trailName: place?.name || '',
        date: dateStr,
        image: e.cover?.source || DEFAULT_EVENT_IMAGE,
        location,
        registerUrl: `https://www.facebook.com/events/${e.id}`,
      };
    });
}

// Real API services (register sends code; verify-email returns token)
const realAuthService = {
  register: async (
    email: string,
    password: string,
    username: string
  ): Promise<AuthResponse | RegisterVerificationResponse> => {
    const response = await api.post('/auth/register', { email, password, username });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.email) {
        const e = new Error(err.response.data.error || 'Email not verified') as Error & { email?: string };
        e.email = err.response.data.email;
        throw e;
      }
      throw err;
    }
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  verifyEmail: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
  },

  resendVerificationCode: async (email: string): Promise<void> => {
    await api.post('/auth/resend-code', { email });
  },

  resetPassword: async (email: string, code: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { email, code, newPassword });
  },

  resendResetCode: async (email: string): Promise<void> => {
    await api.post('/auth/resend-reset-code', { email });
  },

  loginWithGoogle: async (params: { idToken?: string; accessToken?: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/google', params);
    return response.data;
  },
};

export interface PostComment {
  _id: string;
  postId: string;
  userId: string;
  username: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

const realPostService = {
  getAllPosts: async (): Promise<Post[]> => {
    const response = await api.get('/posts');
    return response.data;
  },

  createPost: async (postData: CreatePostData): Promise<Post> => {
    const response = await api.post('/posts', postData);
    return response.data;
  },

  likePost: async (postId: string): Promise<Post> => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  },

  getComments: async (postId: string): Promise<PostComment[]> => {
    const response = await api.get(`/posts/${postId}/comments`);
    return response.data;
  },

  addComment: async (postId: string, text: string): Promise<PostComment> => {
    const response = await api.post(`/posts/${postId}/comments`, { text });
    return response.data;
  },

  bookmarkPost: async (postId: string): Promise<{ savedPosts: string[] }> => {
    const response = await api.post(`/posts/${postId}/bookmark`);
    return response.data;
  },

  unbookmarkPost: async (postId: string): Promise<{ savedPosts: string[] }> => {
    const response = await api.delete(`/posts/${postId}/bookmark`);
    return response.data;
  },

  reportPost: async (postId: string, body: { reason: string; comment?: string }): Promise<{ ok: boolean; message?: string }> => {
    const response = await api.post(`/posts/${postId}/report`, body);
    return response.data;
  },
};

export interface Goal {
  _id: string;
  postId?: string;
  title: string;
  targetDistance?: number;
  targetDuration?: number;
  createdAt: string;
}

export interface SavedRoute {
  _id: string;
  postId: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

const realUserService = {
  getUserProfile: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    const response = await api.get(`/users/${userId}/posts`);
    return response.data;
  },

  followUser: async (userId: string): Promise<User> => {
    const response = await api.post(`/users/${userId}/follow`);
    return response.data;
  },

  updateProfile: async (_updates: { username?: string; bio?: string; avatar?: string }): Promise<User> => {
    const response = await api.patch('/users/me', _updates);
    return response.data;
  },

  getSavedPosts: async (): Promise<Post[]> => {
    const response = await api.get('/users/me/saved-posts');
    return response.data;
  },

  getGoals: async (): Promise<Goal[]> => {
    const response = await api.get('/users/me/goals');
    return response.data;
  },

  addGoal: async (data: { postId?: string; title: string; targetDistance?: number; targetDuration?: number }): Promise<Goal> => {
    const response = await api.post('/users/me/goals', data);
    return response.data;
  },

  deleteGoal: async (id: string): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/users/me/goals/${id}`);
    return response.data;
  },

  getSavedRoutes: async (): Promise<SavedRoute[]> => {
    const response = await api.get('/users/me/saved-routes');
    return response.data;
  },

  addSavedRoute: async (data: { postId: string; name?: string; latitude?: number; longitude?: number }): Promise<SavedRoute> => {
    const response = await api.post('/users/me/saved-routes', data);
    return response.data;
  },

  removeSavedRoute: async (postId: string): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/users/me/saved-routes/${postId}`);
    return response.data;
  },
};

// Real search (stubs; Facebook trail events when token provided)
const realSearchService = {
  searchUsers: async (_q: string): Promise<User[]> => [],
  searchTags: async (_q: string): Promise<SearchTag[]> => [],
  getTrendingTags: async (): Promise<SearchTag[]> => [],
  getRecentSearches: (): string[] => [],
  addRecentSearch: (_term: string) => {},
  clearRecentSearches: () => {},
  getSuggestedUsers: async (): Promise<User[]> => [],
  getUpcomingTrailPosts: async (facebookAccessToken?: string | null): Promise<UpcomingTrailPost[]> => {
    const token =
      facebookAccessToken ??
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FACEBOOK_ACCESS_TOKEN);
    if (token) {
      try {
        return await fetchFacebookTrailEvents(token);
      } catch (e) {
        console.warn('Facebook trail events fetch failed:', e);
      }
    }
    return [];
  },
};

const realReelService = {
  getReels: async (): Promise<Reel[]> => {
    const res = await api.get<Reel[]>('/reels');
    return res.data;
  },
  likeReel: async (reelId: string): Promise<Reel> => {
    const res = await api.post<Reel>(`/reels/${reelId}/like`);
    return res.data;
  },
  createReel: async (data: CreateReelData): Promise<Reel> => {
    const res = await api.post<Reel>('/reels', data);
    return res.data;
  },
};

// Upload to Cloudinary via server (photos + videos)
export const uploadService = {
  uploadImage: async (base64Image: string): Promise<string> => {
    const res = await api.post<{ url: string }>('/upload/image', { image: base64Image });
    return res.data.url;
  },
  uploadVideo: async (videoUri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('video', {
      uri: videoUri,
      type: 'video/mp4',
      name: 'video.mp4',
    } as unknown as Blob);
    const token = await storage.getToken();
    const res = await fetch(`${API_BASE_URL}/upload/video`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Video upload failed');
    }
    const data = await res.json();
    return data.url;
  },
  uploadStoryImage: async (base64Image: string): Promise<string> => {
    const res = await api.post<{ url: string }>('/upload/story', { image: base64Image });
    return res.data.url;
  },
};

const realChatService = {
  getConversations: async (): Promise<Conversation[]> => [],
  getMessages: async (_id: string): Promise<Message[]> => [],
  sendMessage: async (_id: string, _text: string): Promise<Message> => ({ _id: '', conversationId: '', senderId: '', text: '', createdAt: '', read: false }),
  markConversationRead: async (_id: string): Promise<void> => {},
  getActiveUsers: async (): Promise<User[]> => [],
  getOrCreateConversation: async (_id: string): Promise<Conversation> => ({ _id: '', participant: {} as User, lastMessage: { text: '', createdAt: '', senderId: '' }, unreadCount: 0, updatedAt: '' }),
};

// Story API (real only; mock uses StoriesContext only)
export interface StoryApi {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUri: string;
  caption?: string;
  activityType?: string;
  createdAt: string;
}

export const storyService = {
  getStories: async (): Promise<StoryApi[]> => {
    const res = await api.get<StoryApi[]>('/stories');
    return res.data;
  },
  createStory: async (data: { mediaUri: string; caption?: string; activityType?: string }): Promise<StoryApi> => {
    const res = await api.post<StoryApi>('/stories', data);
    return res.data;
  },
};

// Notifications API (auth required)
export interface NotificationApi {
  id: string;
  type: 'like' | 'comment' | 'follow';
  username: string;
  avatar?: string;
  text: string;
  timestamp: number;
  read: boolean;
  postId?: string;
  postImage?: string;
}

export const notificationService = {
  getNotifications: async (): Promise<NotificationApi[]> => {
    const res = await api.get<NotificationApi[]>('/notifications');
    return res.data;
  },
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
};

// Real API only (mock data removed)
export const authService = realAuthService;
export const postService = realPostService;
export const userService = realUserService;
export const searchService = realSearchService;
export const chatService = realChatService;
export const reelService = realReelService;

export default api;
