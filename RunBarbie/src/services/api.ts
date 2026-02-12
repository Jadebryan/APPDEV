import axios from 'axios';
import { Platform } from 'react-native';
import { AuthResponse, RegisterVerificationResponse, Post, User, CreatePostData, CreateReelData, Reel, ReelCommentApi, Conversation, Message } from '../types';
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
if (__DEV__ && typeof console !== 'undefined') {
  console.log('[API] Base URL:', API_BASE_URL);
}

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
  parentId?: string;
  likeCount?: number;
  likedByMe?: boolean;
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

  updatePost: async (postId: string, updates: Partial<CreatePostData>): Promise<Post> => {
    const response = await api.patch(`/posts/${postId}`, updates);
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

  getPostLikers: async (postId: string): Promise<{ _id: string; username: string; avatar?: string }[]> => {
    const response = await api.get(`/posts/${postId}/likers`);
    return response.data;
  },

  addComment: async (postId: string, text: string, parentId?: string): Promise<PostComment> => {
    const response = await api.post(`/posts/${postId}/comments`, { text, parentId });
    return response.data;
  },

  likeComment: async (postId: string, commentId: string): Promise<PostComment> => {
    const response = await api.post(`/posts/${postId}/comments/${commentId}/like`);
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

  deletePost: async (postId: string): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/posts/${postId}`);
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

  getFollowers: async (userId: string): Promise<User[]> => {
    const response = await api.get(`/users/${userId}/followers`);
    return response.data;
  },

  getFollowing: async (userId: string): Promise<User[]> => {
    const response = await api.get(`/users/${userId}/following`);
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

  recordProfileView: async (profileUserId: string): Promise<{ ok: boolean }> => {
    const response = await api.post('/users/me/profile-view', { profileUserId });
    return response.data;
  },

  getProfileVisitors: async (): Promise<{ users: { _id: string; username: string; avatar?: string; viewedAt: string }[]; count: number }> => {
    const response = await api.get('/users/me/profile-visitors');
    return response.data;
  },

  getProfileVisitorsCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/users/me/profile-visitors/count');
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

  getSavedReels: async (): Promise<Reel[]> => {
    const response = await api.get('/users/me/saved-reels');
    return response.data;
  },

  registerPushToken: async (expoPushToken: string): Promise<{ ok: boolean }> => {
    const response = await api.patch('/users/me/push-token', { expoPushToken });
    return response.data;
  },

  getNotificationPreferences: async (): Promise<{
    likes: boolean;
    comments: boolean;
    follow: boolean;
    messages: boolean;
    weeklySummary: boolean;
    challenges: boolean;
  }> => {
    const response = await api.get('/users/me/notification-preferences');
    return response.data;
  },

  updateNotificationPreferences: async (prefs: {
    likes?: boolean;
    comments?: boolean;
    follow?: boolean;
    messages?: boolean;
    weeklySummary?: boolean;
    challenges?: boolean;
  }) => {
    const response = await api.patch('/users/me/notification-preferences', prefs);
    return response.data;
  },

  getConnectedApps: async (): Promise<{ strava: boolean; garmin: boolean; appleHealth: boolean }> => {
    const response = await api.get('/users/me/connected-apps');
    return response.data;
  },

  updateConnectedApps: async (apps: { strava?: boolean; garmin?: boolean; appleHealth?: boolean }) => {
    const response = await api.patch('/users/me/connected-apps', apps);
    return response.data;
  },
};

// Real search (users/tags from API; Facebook trail events when token provided; recent searches from storage)
const realSearchService = {
  /** Search users by username or registered name/email via backend. Expects `/search/users?q=` endpoint. */
  searchUsers: async (q: string): Promise<User[]> => {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const res = await api.get<User[]>('/search/users', { params: { q: trimmed } });
    return res.data;
  },

  /** Search tags/hashtags via backend. Expects `/search/tags?q=` endpoint. */
  searchTags: async (q: string): Promise<SearchTag[]> => {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const res = await api.get<SearchTag[]>('/search/tags', { params: { q: trimmed } });
    return res.data;
  },

  /** Trending tags from backend. Expects `/search/tags/trending` endpoint. Falls back to [] if missing. */
  getTrendingTags: async (): Promise<SearchTag[]> => {
    try {
      const res = await api.get<SearchTag[]>('/search/tags/trending');
      return res.data;
    } catch {
      return [];
    }
  },
  getRecentSearches: async (): Promise<string[]> => storage.getRecentSearches(),
  addRecentSearch: async (term: string): Promise<void> => {
    const list = await storage.getRecentSearches();
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...list.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 20);
    await storage.setRecentSearches(updated);
  },
  clearRecentSearches: async (): Promise<void> => {
    await storage.setRecentSearches([]);
  },
  /**
   * Suggested accounts to follow. Expects `/search/users/suggested` endpoint.
   * If the backend doesn't implement this yet (404), gracefully fall back to [] so the app doesn't error.
   */
  getSuggestedUsers: async (): Promise<User[]> => {
    try {
      const res = await api.get<User[]>('/search/users/suggested');
      return res.data;
    } catch {
      return [];
    }
  },
  /** Get trending posts and reels sorted by likes */
  getTrending: async (): Promise<Array<Post | Reel & { type: 'post' | 'reel'; likeCount: number }>> => {
    try {
      const res = await api.get<Array<Post | Reel & { type: 'post' | 'reel'; likeCount: number }>>('/search/trending');
      return res.data;
    } catch {
      return [];
    }
  },
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
  bookmarkReel: async (reelId: string): Promise<{ savedReels: string[] }> => {
    const res = await api.post<{ savedReels: string[] }>(`/reels/${reelId}/bookmark`);
    return res.data;
  },
  unbookmarkReel: async (reelId: string): Promise<{ savedReels: string[] }> => {
    const res = await api.delete<{ savedReels: string[] }>(`/reels/${reelId}/bookmark`);
    return res.data;
  },
  reportReel: async (reelId: string, body: { reason: string; comment?: string }): Promise<{ ok: boolean; message?: string }> => {
    const res = await api.post<{ ok: boolean; message?: string }>(`/reels/${reelId}/report`, body);
    return res.data;
  },
  deleteReel: async (reelId: string): Promise<{ ok: boolean }> => {
    const res = await api.delete<{ ok: boolean }>(`/reels/${reelId}`);
    return res.data;
  },
  getReelComments: async (reelId: string): Promise<ReelCommentApi[]> => {
    const res = await api.get<ReelCommentApi[]>(`/reels/${reelId}/comments`);
    return res.data;
  },
  addReelComment: async (reelId: string, text: string, parentId?: string): Promise<ReelCommentApi> => {
    const res = await api.post<ReelCommentApi>(`/reels/${reelId}/comments`, { text, parentId });
    return res.data;
  },
};

// Upload to Cloudinary via server (photos + videos)
export const uploadService = {
  uploadImage: async (base64Image: string): Promise<string> => {
    const res = await api.post<{ url: string }>('/upload/image', { image: base64Image });
    return res.data.url;
  },
  /** 5 min timeout for large reels; optional onProgress(0–100) for UI. Optional trim params for video trimming. */
  uploadVideo: async (videoUri: string, onProgress?: (percent: number) => void, trimParams?: { startTime: number; endTime: number }): Promise<string> => {
    const formData = new FormData();
    // Append trim params FIRST so busboy parses them before the file
    if (trimParams) {
      formData.append('trimStartTime', trimParams.startTime.toString());
      formData.append('trimEndTime', trimParams.endTime.toString());
    }
    formData.append('video', {
      uri: videoUri,
      type: 'video/mp4',
      name: 'video.mp4',
    } as unknown as Blob);
    
    const token = await storage.getToken();
    const VIDEO_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/upload/video`);
      xhr.timeout = VIDEO_UPLOAD_TIMEOUT_MS;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.url);
          } catch {
            reject(new Error('Video upload failed'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err?.error || 'Video upload failed'));
          } catch {
            reject(new Error('Video upload failed'));
          }
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error. Check your connection.')));
      xhr.addEventListener('timeout', () => reject(new Error('Upload took too long. Try a shorter video or better connection.')));

      xhr.send(formData);
    });
  },
  uploadStoryImage: async (base64Image: string): Promise<string> => {
    const res = await api.post<{ url: string }>('/upload/story', { image: base64Image });
    return res.data.url;
  },
};

const realChatService = {
  getConversations: async (): Promise<Conversation[]> => {
    const res = await api.get<Conversation[]>('/chats/conversations');
    return res.data;
  },
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const res = await api.get<Message[]>(`/chats/conversations/${conversationId}/messages`);
    return res.data;
  },
  sendMessage: async (conversationId: string, text: string, replyToMessageId?: string): Promise<Message> => {
    const res = await api.post<Message>(`/chats/conversations/${conversationId}/messages`, { text, replyToMessageId });
    return res.data;
  },
  markConversationRead: async (conversationId: string): Promise<void> => {
    await api.patch(`/chats/conversations/${conversationId}/read`);
  },
  getActiveUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/chats/active-users');
    return res.data;
  },
  getOrCreateConversation: async (userId: string): Promise<Conversation> => {
    const res = await api.get<Conversation>(`/chats/conversations/${userId}`);
    return res.data;
  },
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
  viewCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
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

  deleteStory: async (storyId: string): Promise<{ ok: boolean }> => {
    const res = await api.delete<{ ok: boolean }>(`/stories/${storyId}`);
    return res.data;
  },

  markViewed: async (storyId: string): Promise<{ ok: boolean }> => {
    const res = await api.post<{ ok: boolean }>(`/stories/${storyId}/view`);
    return res.data;
  },

  getViewers: async (
    storyId: string
  ): Promise<{ total: number; viewers: { id: string; username: string; avatar?: string }[] }> => {
    const res = await api.get<{ total: number; viewers: { id: string; username: string; avatar?: string }[] }>(
      `/stories/${storyId}/viewers`
    );
    return res.data;
  },

  likeStory: async (storyId: string): Promise<{ liked: boolean; likeCount: number }> => {
    const res = await api.post<{ liked: boolean; likeCount: number }>(`/stories/${storyId}/like`);
    return res.data;
  },

  replyToStory: async (storyId: string, text: string): Promise<{ ok: boolean; conversationId?: string }> => {
    const res = await api.post<{ ok: boolean; conversationId?: string }>(`/stories/${storyId}/reply`, { text });
    return res.data;
  },
};

// Notifications API (auth required)
export interface NotificationApi {
  id: string;
  type:
    | 'like'
    | 'comment'
    | 'follow'
    | 'reel_like'
    | 'mention'
    | 'tag'
    | 'story_like'
    | 'story_reply'
    | 'profile_view'
    | 'story_view';
  username: string;
  avatar?: string;
  userId?: string;
  text: string;
  timestamp: number;
  read: boolean;
  postId?: string;
  postImage?: string;
  reelId?: string;
  storyId?: string;
  storyImage?: string;
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

export interface RunHistoryItem {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  distanceKm: number;
  durationSeconds: number;
  path: { lat: number; lng: number; timestamp?: string }[];
  sosTriggeredAt: string | null;
}

export const runService = {
  startRun: async (shareLiveLocation: boolean, emergencyContact: string): Promise<{ runId: string; startedAt: string }> => {
    const res = await api.post('/runs/start', { shareLiveLocation, emergencyContact });
    return res.data;
  },
  updateLocation: async (runId: string, lat: number, lng: number): Promise<void> => {
    await api.patch(`/runs/${runId}/location`, { lat, lng });
  },
  endRun: async (runId: string, distanceKm: number, durationSeconds: number): Promise<void> => {
    await api.patch(`/runs/${runId}/end`, { distanceKm, durationSeconds });
  },
  triggerSos: async (runId: string): Promise<{ emergencyContact: string; mapsUrl: string; username: string }> => {
    const res = await api.post(`/runs/${runId}/sos`);
    return res.data;
  },
  getLiveLocation: async (userId: string): Promise<{ active: boolean; lat?: number; lng?: number }> => {
    const res = await api.get(`/runs/live/${userId}`);
    return res.data;
  },
  getRunHistory: async (limit?: number): Promise<{ runs: RunHistoryItem[] }> => {
    const res = await api.get<{ runs: RunHistoryItem[] }>('/runs/history', limit ? { params: { limit } } : undefined);
    return res.data;
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
