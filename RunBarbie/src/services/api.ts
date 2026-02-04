import axios from 'axios';
import { AuthResponse, Post, User, CreatePostData, Conversation, Message } from '../types';
import { storage } from '../utils/storage';
import { mockDataService } from './mockData';

// Set to true to use mock data (no backend required)
// Set to false to use real backend API
const USE_MOCK_DATA = true;

// IMPORTANT: For physical device testing, replace 'localhost' with your computer's IP address
// Run 'npm run get-ip' to find your IP address
// Example: 'http://192.168.1.100:3000/api'
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' // Change to your IP for physical device: http://YOUR_IP:3000/api
  : 'https://your-production-url.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock API services
const mockAuthService = {
  register: async (email: string, password: string, username: string): Promise<AuthResponse> => {
    return await mockDataService.register(email, password, username);
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return await mockDataService.login(email, password);
  },
};

const mockPostService = {
  getAllPosts: async (): Promise<Post[]> => {
    return await mockDataService.getAllPosts();
  },

  createPost: async (postData: CreatePostData): Promise<Post> => {
    return await mockDataService.createPost(postData);
  },

  likePost: async (postId: string): Promise<Post> => {
    return await mockDataService.likePost(postId);
  },
};

const mockUserService = {
  getUserProfile: async (userId: string): Promise<User> => {
    return await mockDataService.getUserProfile(userId);
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    return await mockDataService.getUserPosts(userId);
  },

  followUser: async (userId: string): Promise<User> => {
    return await mockDataService.followUser(userId);
  },
};

export interface SearchTag {
  tag: string;
  postCount: number;
}

const mockSearchService = {
  searchUsers: async (query: string): Promise<User[]> => mockDataService.searchUsers(query),
  searchTags: async (query: string): Promise<SearchTag[]> => mockDataService.searchTags(query),
  getTrendingTags: async (): Promise<SearchTag[]> => mockDataService.getTrendingTags(),
  getRecentSearches: (): string[] => mockDataService.getRecentSearches(),
  addRecentSearch: (term: string) => mockDataService.addRecentSearch(term),
  clearRecentSearches: () => mockDataService.clearRecentSearches(),
  getSuggestedUsers: async (): Promise<User[]> => mockDataService.getSuggestedUsers(),
};

// Real API services
const realAuthService = {
  register: async (email: string, password: string, username: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, username });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

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
};

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
};

// Real search (stub - use mock for now)
const realSearchService = {
  searchUsers: async (_q: string): Promise<User[]> => [],
  searchTags: async (_q: string): Promise<SearchTag[]> => [],
  getTrendingTags: async (): Promise<SearchTag[]> => [],
  getRecentSearches: (): string[] => [],
  addRecentSearch: (_term: string) => {},
  clearRecentSearches: () => {},
  getSuggestedUsers: async (): Promise<User[]> => [],
};

const mockChatService = {
  getConversations: async (): Promise<Conversation[]> => mockDataService.getConversations(),
  getMessages: async (conversationId: string): Promise<Message[]> => mockDataService.getMessages(conversationId),
  sendMessage: async (conversationId: string, text: string): Promise<Message> => mockDataService.sendMessage(conversationId, text),
  markConversationRead: async (conversationId: string): Promise<void> => mockDataService.markConversationRead(conversationId),
  getActiveUsers: async (): Promise<User[]> => mockDataService.getActiveUsers(),
  getOrCreateConversation: async (otherUserId: string): Promise<Conversation> => mockDataService.getOrCreateConversation(otherUserId),
};

const realChatService = {
  getConversations: async (): Promise<Conversation[]> => [],
  getMessages: async (_id: string): Promise<Message[]> => [],
  sendMessage: async (_id: string, _text: string): Promise<Message> => ({ _id: '', conversationId: '', senderId: '', text: '', createdAt: '', read: false }),
  markConversationRead: async (_id: string): Promise<void> => {},
  getActiveUsers: async (): Promise<User[]> => [],
  getOrCreateConversation: async (_id: string): Promise<Conversation> => ({ _id: '', participant: {} as User, lastMessage: { text: '', createdAt: '', senderId: '' }, unreadCount: 0, updatedAt: '' }),
};

// Export services based on USE_MOCK_DATA flag
export const authService = USE_MOCK_DATA ? mockAuthService : realAuthService;
export const postService = USE_MOCK_DATA ? mockPostService : realPostService;
export const userService = USE_MOCK_DATA ? mockUserService : realUserService;
export const searchService = USE_MOCK_DATA ? mockSearchService : realSearchService;
export const chatService = USE_MOCK_DATA ? mockChatService : realChatService;

export default api;
