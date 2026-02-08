import { User, Post, Reel, ActivityType, Message, Conversation, CreateReelData } from '../types';

// Mock users (avatars: Unsplash / pravatar)
export const mockUsers: User[] = [
  {
    _id: '1',
    email: 'hiker1@example.com',
    username: 'trail_runner',
    bio: 'Love hiking and running! 🏃‍♀️',
    avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200',
    followers: ['2', '3', '4'],
    following: ['2', '4'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '2',
    email: 'runner2@example.com',
    username: 'marathon_mike',
    bio: 'Training for my next marathon 💪',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200',
    followers: ['1', '3', '5'],
    following: ['1', '3'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '3',
    email: 'cyclist3@example.com',
    username: 'bike_lover',
    bio: 'Cycling enthusiast 🚴',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    followers: ['1', '2'],
    following: ['1', '2', '4'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '4',
    email: 'runner4@example.com',
    username: 'sunrise_jogger',
    bio: 'Early morning miles ☀️ Trail & road',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    followers: ['1', '2', '3'],
    following: ['1', '2'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '5',
    email: 'hiker5@example.com',
    username: 'peak_seeker',
    bio: 'Summit chaser 🏔️ PH trails',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    followers: ['1', '2', '4'],
    following: ['1', '4'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: '6',
    email: 'run6@example.com',
    username: 'weekend_warrior',
    bio: 'Long runs on weekends only 😅',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    followers: ['2', '3'],
    following: ['1', '2', '3', '4', '5'],
    createdAt: new Date().toISOString(),
  },
];

// Mock posts (all with Unsplash images)
export const mockPosts: Post[] = [
  {
    _id: '1',
    userId: '1',
    user: mockUsers[0],
    image: 'https://images.unsplash.com/photo-1544966503-7cc75df67383?w=800',
    caption: 'Beautiful morning run! #running #morningrun 🏃‍♀️',
    activityType: 'run',
    distance: 5.2,
    duration: 28,
    likes: ['2', '3'],
    location: { latitude: 14.5995, longitude: 120.9842, name: 'Rizal Park, Manila' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: '2',
    userId: '2',
    user: mockUsers[1],
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    caption: 'Amazing hike today! #hiking #outdoors The view was incredible 🥾',
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
    caption: 'Long ride through the countryside #cycling #fitness 🚴',
    activityType: 'cycle',
    distance: 45.0,
    duration: 120,
    likes: ['1', '2'],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    _id: '4',
    userId: '4',
    user: mockUsers[3],
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    caption: 'Sunrise 10K done! #running #trailrun #fitness',
    activityType: 'run',
    distance: 10,
    duration: 52,
    likes: ['1', '2', '5'],
    location: { latitude: 14.5520, longitude: 121.0515, name: 'BGC, Taguig' },
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    _id: '5',
    userId: '5',
    user: mockUsers[4],
    image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800',
    caption: 'Summit sunrise 🏔️ #hiking #mountains #outdoors',
    activityType: 'hike',
    distance: 8.5,
    duration: 240,
    likes: ['1', '3', '4'],
    createdAt: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    _id: '6',
    userId: '1',
    user: mockUsers[0],
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    caption: 'Recovery run in the park #running #recovery',
    activityType: 'run',
    distance: 3.0,
    duration: 18,
    likes: ['4'],
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    _id: '7',
    userId: '6',
    user: mockUsers[5],
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',
    caption: 'Weekend long run with the crew #running #longrun #runbarbie',
    activityType: 'run',
    distance: 21,
    duration: 125,
    likes: ['1', '2', '3', '4'],
    createdAt: new Date(Date.now() - 17280000).toISOString(),
  },
  {
    _id: '8',
    userId: '2',
    user: mockUsers[1],
    image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800',
    caption: 'Trail run in the rain 🌧️ #trailrun #running',
    activityType: 'run',
    distance: 7.2,
    duration: 42,
    likes: ['3', '5'],
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
];

// Sample video URLs for reels (public test videos)
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

// Mock reels
export const mockReels: Reel[] = [
  {
    _id: 'r1',
    userId: '1',
    user: mockUsers[0],
    videoUri: SAMPLE_VIDEOS[0],
    caption: 'Morning trail run 🌅 Feeling strong today!',
    activityType: 'run',
    likes: ['2', '3'],
    commentCount: 5,
    duration: 18,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'r2',
    userId: '2',
    user: mockUsers[1],
    videoUri: SAMPLE_VIDEOS[1],
    caption: 'Summit views 🏔️ Worth every step',
    activityType: 'hike',
    likes: ['1'],
    commentCount: 2,
    duration: 30,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    _id: 'r3',
    userId: '3',
    user: mockUsers[2],
    videoUri: SAMPLE_VIDEOS[2],
    caption: 'Sunday long ride 🚴',
    activityType: 'cycle',
    likes: ['1', '2'],
    commentCount: 8,
    duration: 45,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    _id: 'r4',
    userId: '1',
    user: mockUsers[0],
    videoUri: SAMPLE_VIDEOS[3],
    caption: 'Easy recovery run 🩵',
    activityType: 'run',
    likes: [],
    commentCount: 0,
    duration: 22,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    _id: 'r5',
    userId: '2',
    user: mockUsers[1],
    videoUri: SAMPLE_VIDEOS[4],
    caption: 'Chasing PRs 💪',
    activityType: 'run',
    likes: ['3'],
    commentCount: 3,
    duration: 15,
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    _id: 'r6',
    userId: '4',
    user: mockUsers[3],
    videoUri: SAMPLE_VIDEOS[0],
    caption: 'Morning vibes only 🌅',
    activityType: 'run',
    likes: ['1', '2'],
    commentCount: 4,
    duration: 20,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    _id: 'r7',
    userId: '5',
    user: mockUsers[4],
    videoUri: SAMPLE_VIDEOS[1],
    caption: 'Peak views today 🏔️',
    activityType: 'hike',
    likes: ['1', '3', '4'],
    commentCount: 6,
    duration: 28,
    createdAt: new Date(Date.now() - 25200000).toISOString(),
  },
  {
    _id: 'r8',
    userId: '6',
    user: mockUsers[5],
    videoUri: SAMPLE_VIDEOS[2],
    caption: 'Sunday long run recap',
    activityType: 'run',
    likes: ['2'],
    commentCount: 1,
    duration: 35,
    createdAt: new Date(Date.now() - 28800000).toISOString(),
  },
];

// Mock tags (hashtags with post counts) for search
const MOCK_TAGS: { tag: string; postCount: number }[] = [
  { tag: 'running', postCount: 1240 },
  { tag: 'trailrun', postCount: 892 },
  { tag: 'marathon', postCount: 756 },
  { tag: 'hiking', postCount: 634 },
  { tag: 'cycling', postCount: 521 },
  { tag: 'runbarbie', postCount: 312 },
  { tag: 'morningrun', postCount: 289 },
  { tag: 'fitness', postCount: 445 },
  { tag: 'outdoors', postCount: 398 },
  { tag: 'recovery', postCount: 156 },
];

// Recent searches (in-memory)
let recentSearches: string[] = [];

// Mock conversations: userId1 < userId2 for consistent id; unread per user
interface ConversationData {
  _id: string;
  userId1: string;
  userId2: string;
  lastMessage: { text: string; createdAt: string; senderId: string };
  unreadCount1: number;
  unreadCount2: number;
  updatedAt: string;
}
const mockConversationsData: ConversationData[] = [
  {
    _id: 'conv_1_2',
    userId1: '1',
    userId2: '2',
    lastMessage: { text: 'Down for a long run this weekend?', createdAt: new Date(Date.now() - 120000).toISOString(), senderId: '2' },
    unreadCount1: 1,
    unreadCount2: 0,
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    _id: 'conv_1_3',
    userId1: '1',
    userId2: '3',
    lastMessage: { text: 'That trail was amazing 🏔️', createdAt: new Date(Date.now() - 3600000).toISOString(), senderId: '1' },
    unreadCount1: 0,
    unreadCount2: 0,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'conv_2_3',
    userId1: '2',
    userId2: '3',
    lastMessage: { text: 'See you at the track!', createdAt: new Date(Date.now() - 7200000).toISOString(), senderId: '3' },
    unreadCount1: 0,
    unreadCount2: 1,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];
const mockMessagesByConv: Record<string, Message[]> = {
  conv_1_2: [
    { _id: 'm1', conversationId: 'conv_1_2', senderId: '1', text: 'Hey! Great run today', createdAt: new Date(Date.now() - 86400000).toISOString(), read: true },
    { _id: 'm2', conversationId: 'conv_1_2', senderId: '2', text: 'Thanks! Same to you 💪', createdAt: new Date(Date.now() - 86000000).toISOString(), read: true },
    { _id: 'm3', conversationId: 'conv_1_2', senderId: '2', text: 'Down for a long run this weekend?', createdAt: new Date(Date.now() - 120000).toISOString(), read: false },
  ],
  conv_1_3: [
    { _id: 'm4', conversationId: 'conv_1_3', senderId: '3', text: 'Saw your hike post!', createdAt: new Date(Date.now() - 7200000).toISOString(), read: true },
    { _id: 'm5', conversationId: 'conv_1_3', senderId: '1', text: 'That trail was amazing 🏔️', createdAt: new Date(Date.now() - 3600000).toISOString(), read: true },
  ],
  conv_2_3: [
    { _id: 'm6', conversationId: 'conv_2_3', senderId: '2', text: 'Morning run tomorrow?', createdAt: new Date(Date.now() - 86400000).toISOString(), read: true },
    { _id: 'm7', conversationId: 'conv_2_3', senderId: '3', text: 'See you at the track!', createdAt: new Date(Date.now() - 7200000).toISOString(), read: false },
  ],
};

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

  requestPasswordReset: async (email: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    // Mock: always succeed (don't reveal if email exists). Real backend would send email.
    const _exists = mockUsers.some(u => u.email === email);
    return;
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
    location?: { latitude: number; longitude: number; name?: string };
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
      location: postData.location,
      createdAt: new Date().toISOString(),
    };
    
    mockPostsData.unshift(newPost);
    return newPost;
  },

  likePost: async (postId: string): Promise<Post> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const user = currentMockUser;
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const post = mockPostsData.find(p => p._id === postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    const isLiked = post.likes.includes(user._id);
    
    if (isLiked) {
      post.likes = post.likes.filter(id => id !== user._id);
    } else {
      post.likes.push(user._id);
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

  updateProfile: async (updates: { username?: string; bio?: string; avatar?: string }): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (!currentMockUser) throw new Error('Not authenticated');
    const idx = mockUsers.findIndex(u => u._id === currentMockUser!._id);
    if (idx === -1) throw new Error('User not found');
    if (updates.username !== undefined) mockUsers[idx].username = updates.username;
    if (updates.bio !== undefined) mockUsers[idx].bio = updates.bio;
    if (updates.avatar !== undefined) mockUsers[idx].avatar = updates.avatar;
    currentMockUser = { ...mockUsers[idx] };
    return currentMockUser;
  },

  // Reels
  getReels: async (): Promise<Reel[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockReels.map(reel => ({
      ...reel,
      user: mockUsers.find(u => u._id === reel.userId) || mockUsers[0],
    }));
  },

  likeReel: async (reelId: string): Promise<Reel> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const user = currentMockUser;
    if (!user) throw new Error('Not authenticated');
    const reel = mockReels.find(r => r._id === reelId);
    if (!reel) throw new Error('Reel not found');
    const isLiked = reel.likes.includes(user._id);
    if (isLiked) {
      reel.likes = reel.likes.filter(id => id !== user._id);
    } else {
      reel.likes.push(user._id);
    }
    return {
      ...reel,
      user: mockUsers.find(u => u._id === reel.userId) || mockUsers[0],
    };
  },

  createReel: async (data: CreateReelData): Promise<Reel> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const user = currentMockUser;
    if (!user) throw new Error('Not authenticated');
    const newId = `r${Date.now()}`;
    const reel: Reel = {
      _id: newId,
      userId: user._id,
      user: { ...user },
      videoUri: data.videoUri,
      caption: data.caption.trim() || 'No caption',
      activityType: data.activityType,
      likes: [],
      commentCount: 0,
      duration: 15,
      createdAt: new Date().toISOString(),
    };
    mockReels.unshift(reel);
    return reel;
  },

  // Search
  searchUsers: async (query: string): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return mockUsers.filter(
      u =>
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  },

  searchTags: async (query: string): Promise<{ tag: string; postCount: number }[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_TAGS.filter(t => t.tag.toLowerCase().includes(q));
  },

  getTrendingTags: async (): Promise<{ tag: string; postCount: number }[]> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...MOCK_TAGS].sort((a, b) => b.postCount - a.postCount);
  },

  getRecentSearches: (): string[] => recentSearches,

  addRecentSearch: (term: string) => {
    const t = term.trim();
    if (!t) return;
    recentSearches = [t, ...recentSearches.filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, 10);
  },

  clearRecentSearches: () => {
    recentSearches = [];
  },

  getSuggestedUsers: async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    if (!currentMockUser) return mockUsers.slice(0, 8);
    return mockUsers
      .filter(u => u._id !== currentMockUser!._id)
      .slice(0, 8);
  },

  getUpcomingTrailPosts: async (): Promise<{ id: string; title: string; trailName: string; date: string; image: string; location?: string; registerUrl?: string; postId?: string }[]> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [
      { id: 'ut1', title: 'Manila Mountain Trail Run 2025', trailName: 'Rizal Mountain Range', date: 'Sat, Mar 8', image: mockPosts[0].image, location: 'Rizal, Philippines', registerUrl: 'https://example.com/events/manila-mountain-2025' },
      { id: 'ut2', title: 'Cordillera Ultra Trail', trailName: 'Benguet Highlands', date: 'Sun, Mar 9', image: mockPosts[1].image, location: 'Baguio, Philippines', registerUrl: 'https://example.com/events/cordillera-ultra' },
      { id: 'ut3', title: 'Palawan Coastal Trail Run', trailName: 'El Nido Trails', date: 'Sat, Mar 15', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800', location: 'Palawan, Philippines', registerUrl: 'https://example.com/events/palawan-coastal' },
      { id: 'ut4', title: 'Tagaytay Ridge Run', trailName: 'Taal Vista Trails', date: 'Sun, Mar 16', image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800', location: 'Tagaytay, Philippines' },
    ];
  },

  // Chats
  getActiveUsers: async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    if (!currentMockUser) return [];
    return mockUsers
      .filter(u => u._id !== currentMockUser!._id)
      .slice(0, 10);
  },

  getOrCreateConversation: async (otherUserId: string): Promise<Conversation> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    if (!currentMockUser) throw new Error('Not authenticated');
    const me = currentMockUser._id;
    const id1 = me < otherUserId ? me : otherUserId;
    const id2 = me < otherUserId ? otherUserId : me;
    const convId = `conv_${id1}_${id2}`;
    let conv = mockConversationsData.find(c => c._id === convId);
    if (conv) {
      const participantId = conv.userId1 === me ? conv.userId2 : conv.userId1;
      const participant = mockUsers.find(u => u._id === participantId);
      const unreadCount = conv.userId1 === me ? conv.unreadCount1 : conv.unreadCount2;
      if (!participant) throw new Error('User not found');
      return { _id: conv._id, participant, lastMessage: conv.lastMessage, unreadCount, updatedAt: conv.updatedAt };
    }
    const other = mockUsers.find(u => u._id === otherUserId);
    if (!other) throw new Error('User not found');
    const newConv: ConversationData = {
      _id: convId,
      userId1: id1,
      userId2: id2,
      lastMessage: { text: '', createdAt: new Date().toISOString(), senderId: '' },
      unreadCount1: 0,
      unreadCount2: 0,
      updatedAt: new Date().toISOString(),
    };
    mockConversationsData.push(newConv);
    mockMessagesByConv[convId] = [];
    return {
      _id: convId,
      participant: other,
      lastMessage: newConv.lastMessage,
      unreadCount: 0,
      updatedAt: newConv.updatedAt,
    };
  },

  getConversations: async (): Promise<Conversation[]> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    if (!currentMockUser) return [];
    const me = currentMockUser._id;
    return mockConversationsData
      .filter(c => c.userId1 === me || c.userId2 === me)
      .map(c => {
        const participantId = c.userId1 === me ? c.userId2 : c.userId1;
        const participant = mockUsers.find(u => u._id === participantId);
        const unreadCount = c.userId1 === me ? c.unreadCount1 : c.unreadCount2;
        if (!participant) return null;
        return {
          _id: c._id,
          participant,
          lastMessage: c.lastMessage,
          unreadCount,
          updatedAt: c.updatedAt,
        };
      })
      .filter((c): c is Conversation => c !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const list = mockMessagesByConv[conversationId] || [];
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    if (!currentMockUser) throw new Error('Not authenticated');
    const list = mockMessagesByConv[conversationId] || [];
    const conv = mockConversationsData.find(c => c._id === conversationId);
    const newMsg: Message = {
      _id: `m_${Date.now()}`,
      conversationId,
      senderId: currentMockUser._id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    list.push(newMsg);
    mockMessagesByConv[conversationId] = list;
    if (conv) {
      conv.lastMessage = { text: newMsg.text, createdAt: newMsg.createdAt, senderId: currentMockUser._id };
      conv.updatedAt = newMsg.createdAt;
      const me = currentMockUser._id;
      if (conv.userId1 === me) {
        conv.unreadCount1 = 0;
        conv.unreadCount2 += 1;
      } else {
        conv.unreadCount2 = 0;
        conv.unreadCount1 += 1;
      }
    }
    return newMsg;
  },

  markConversationRead: async (conversationId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const conv = mockConversationsData.find(c => c._id === conversationId);
    if (!currentMockUser || !conv) return;
    const me = currentMockUser._id;
    if (conv.userId1 === me) conv.unreadCount1 = 0;
    else conv.unreadCount2 = 0;
    const list = mockMessagesByConv[conversationId] || [];
    list.forEach(m => { m.read = true; });
  },
};
