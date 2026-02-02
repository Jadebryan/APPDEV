import { User, Post, ActivityType } from '../types';

// Mock users
export const mockUsers: User[] = [
  {
    _id: '1',
    email: 'hiker1@example.com',
    username: 'trail_runner',
    bio: 'Love hiking and running! 🏃‍♀️',
    avatar: '',
    followers: ['2', '3'],
    following: ['2'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '2',
    email: 'runner2@example.com',
    username: 'marathon_mike',
    bio: 'Training for my next marathon 💪',
    avatar: '',
    followers: ['1', '3'],
    following: ['1'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '3',
    email: 'cyclist3@example.com',
    username: 'bike_lover',
    bio: 'Cycling enthusiast 🚴',
    avatar: '',
    followers: ['1'],
    following: ['1', '2'],
    createdAt: new Date().toISOString(),
  },
];

// Mock posts
export const mockPosts: Post[] = [
  {
    _id: '1',
    userId: '1',
    user: mockUsers[0],
    image: 'https://images.unsplash.com/photo-1544966503-7cc75df67383?w=800',
    caption: 'Beautiful morning run! 🏃‍♀️',
    activityType: 'run',
    distance: 5.2,
    duration: 28,
    likes: ['2', '3'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: '2',
    userId: '2',
    user: mockUsers[1],
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    caption: 'Amazing hike today! The view was incredible 🥾',
    activityType: 'hike',
    distance: 12.5,
    duration: 180,
    likes: ['1'],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    _id: '3',
    userId: '3',
    user: mockUsers[2],
    image: 'https://images.unsplash.com/photo-1502744688674-c619d1586c0a?w=800',
    caption: 'Long ride through the countryside 🚴',
    activityType: 'cycle',
    distance: 45.0,
    duration: 120,
    likes: ['1', '2'],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

// Mock current user (will be set on login)
let currentMockUser: User | null = null;
let mockPostsData: Post[] = [...mockPosts];

export const mockDataService = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = mockUsers.find(u => u.email === email);
    if (!user || password !== 'password123') {
      throw new Error('Invalid credentials');
    }
    
    currentMockUser = user;
    const token = `mock_token_${user._id}`;
    
    return { token, user };
  },

  register: async (email: string, password: string, username: string): Promise<{ token: string; user: User }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user exists
    if (mockUsers.find(u => u.email === email || u.username === username)) {
      throw new Error('User already exists');
    }
    
    const newUser: User = {
      _id: String(mockUsers.length + 1),
      email,
      username,
      bio: '',
      avatar: '',
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);
    currentMockUser = newUser;
    const token = `mock_token_${newUser._id}`;
    
    return { token, user: newUser };
  },

  // Posts
  getAllPosts: async (): Promise<Post[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPostsData.map(post => ({
      ...post,
      user: mockUsers.find(u => u._id === post.userId) || mockUsers[0],
    }));
  },

  createPost: async (postData: {
    image: string;
    caption: string;
    activityType: ActivityType;
    distance?: number;
    duration?: number;
  }): Promise<Post> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!currentMockUser) {
      throw new Error('Not authenticated');
    }
    
    const newPost: Post = {
      _id: String(mockPostsData.length + 1),
      userId: currentMockUser._id,
      user: currentMockUser,
      image: postData.image,
      caption: postData.caption,
      activityType: postData.activityType,
      distance: postData.distance,
      duration: postData.duration,
      likes: [],
      createdAt: new Date().toISOString(),
    };
    
    mockPostsData.unshift(newPost);
    return newPost;
  },

  likePost: async (postId: string): Promise<Post> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!currentMockUser) {
      throw new Error('Not authenticated');
    }
    
    const post = mockPostsData.find(p => p._id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    const isLiked = post.likes.includes(currentMockUser._id);
    
    if (isLiked) {
      post.likes = post.likes.filter(id => id !== currentMockUser._id);
    } else {
      post.likes.push(currentMockUser._id);
    }
    
    return {
      ...post,
      user: mockUsers.find(u => u._id === post.userId) || mockUsers[0],
    };
  },

  // Users
  getUserProfile: async (userId: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const user = mockUsers.find(u => u._id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockPostsData
      .filter(p => p.userId === userId)
      .map(post => ({
        ...post,
        user: mockUsers.find(u => u._id === post.userId) || mockUsers[0],
      }));
  },

  followUser: async (userId: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!currentMockUser) {
      throw new Error('Not authenticated');
    }
    
    const targetUser = mockUsers.find(u => u._id === userId);
    if (!targetUser) {
      throw new Error('User not found');
    }
    
    const isFollowing = currentMockUser.following.includes(userId);
    
    if (isFollowing) {
      currentMockUser.following = currentMockUser.following.filter(id => id !== userId);
      targetUser.followers = targetUser.followers.filter(id => id !== currentMockUser!._id);
    } else {
      currentMockUser.following.push(userId);
      targetUser.followers.push(currentMockUser._id);
    }
    
    return targetUser;
  },

  getCurrentUser: (): User | null => currentMockUser,
  
  setCurrentUser: (user: User | null) => {
    currentMockUser = user;
  },
};
