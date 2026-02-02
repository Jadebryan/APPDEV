# Run Barbie🎀 - Project Summary

## 📱 Project Overview

**Run Barbie🎀** is a React Native mobile application built with Expo and TypeScript, designed specifically for hikers, runners, and outdoor athletes to share their activities and connect with like-minded individuals. Similar to Instagram but tailored for the outdoor fitness community.

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Framework**: React Native with Expo SDK 51
- **Language**: TypeScript (strict mode)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Context API + Hooks
- **Storage**: AsyncStorage for local data persistence
- **Image Handling**: Expo Image Picker + File System

### Backend (Node.js + Express)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs for hashing

## 📁 Project Structure

```
run-barbie/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── PostCard.tsx     # Post display component
│   ├── screens/             # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── FeedScreen.tsx
│   │   ├── CreatePostScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/          # Navigation setup
│   │   ├── AppNavigator.tsx # Main navigation logic
│   │   └── types.ts         # Navigation type definitions
│   ├── context/             # React Context providers
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── services/            # API services
│   │   └── api.ts           # Axios-based API client
│   ├── types/               # TypeScript interfaces
│   │   └── index.ts         # User, Post, Activity types
│   └── utils/               # Utility functions
│       └── storage.ts       # AsyncStorage helpers
├── server/
│   ├── models/              # MongoDB models
│   │   ├── User.js
│   │   └── Post.js
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── posts.js         # Post CRUD operations
│   │   └── users.js         # User profile endpoints
│   ├── middleware/          # Express middleware
│   │   └── auth.js          # JWT authentication middleware
│   └── index.js             # Server entry point
├── assets/                  # Static assets (icons, images)
├── App.tsx                  # Root component
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── app.json                 # Expo configuration
```

## ✨ Features Implemented

### ✅ Authentication
- User registration with email, password, and username
- Secure login with JWT tokens
- Token-based authentication for protected routes
- Persistent sessions using AsyncStorage

### ✅ Feed Screen
- Instagram-style scrollable feed
- Display all posts from all users
- Pull-to-refresh functionality
- Post cards showing:
  - User avatar and username
  - Uploaded photo
  - Caption
  - Activity type badge (run, hike, cycle, walk, other)
  - Distance and duration (if provided)
  - Like button with like count

### ✅ Create Post Screen
- Image selection from camera or gallery
- Activity type selector (run, hike, cycle, walk, other)
- Caption input (multiline)
- Optional distance input (km)
- Optional duration input (minutes)
- Base64 image encoding for backend transmission

### ✅ Profile Screen
- User information display:
  - Avatar (placeholder if none)
  - Username
  - Bio (if set)
  - Post count
  - Follower count
  - Following count
- Grid view of user's posts
- Logout functionality

### ✅ Social Interaction
- Like/unlike posts
- Like count display
- Follow/unfollow users (backend ready)
- User relationship tracking

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Posts
- `GET /api/posts` - Get all posts (public)
- `POST /api/posts` - Create new post (protected)
- `POST /api/posts/:id/like` - Like/unlike post (protected)

### Users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/posts` - Get user's posts
- `POST /api/users/:id/follow` - Follow/unfollow user (protected)

## 🎨 UI/UX Features

- **Modern Design**: Clean, Instagram-inspired interface
- **Pink Theme**: Brand color (#FF69B4) throughout
- **Activity Badges**: Visual indicators for activity types
- **Responsive Layout**: Works on various screen sizes
- **Loading States**: Activity indicators for async operations
- **Error Handling**: User-friendly error messages
- **Empty States**: Helpful messages when no content exists

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Protected API routes with middleware
- Input validation on both client and server
- Secure token storage in AsyncStorage

## 📊 Data Models

### User Model
```typescript
{
  _id: string;
  email: string;
  username: string;
  bio?: string;
  avatar?: string;
  followers: string[];
  following: string[];
  createdAt: string;
}
```

### Post Model
```typescript
{
  _id: string;
  userId: string;
  user: User;
  image: string; // Base64 encoded
  caption: string;
  activityType: 'run' | 'hike' | 'cycle' | 'walk' | 'other';
  distance?: number; // km
  duration?: number; // minutes
  likes: string[]; // User IDs
  createdAt: string;
}
```

## 🚀 Getting Started

1. **Install dependencies**: `npm install`
2. **Set up MongoDB**: Configure `.env` file
3. **Update API URL**: Set your IP address in `src/services/api.ts`
4. **Start server**: `npm run server`
5. **Start app**: `npm start` (in new terminal)
6. **Run on device**: Scan QR code with Expo Go

See `QUICKSTART.md` for detailed instructions.

## 🎓 Educational Value

This project demonstrates:
- ✅ Modern mobile app development with React Native
- ✅ TypeScript implementation throughout
- ✅ RESTful API design and implementation
- ✅ Database modeling with MongoDB
- ✅ Authentication and authorization
- ✅ Image handling and processing
- ✅ Component-based architecture
- ✅ State management patterns
- ✅ Navigation patterns
- ✅ Clean code practices

Perfect for university app development courses!

## 🔮 Future Enhancements

- Cloud image storage (AWS S3, Cloudinary)
- Push notifications
- Real-time updates with WebSockets
- Strava API integration
- Map view showing activity locations
- Activity badges and achievements
- Comments on posts
- Search functionality
- Direct messaging
- Activity statistics and charts

## 📝 Notes

- Images are currently stored as base64 strings in MongoDB (not recommended for production)
- For production, implement cloud storage (AWS S3, Cloudinary, etc.)
- API base URL needs to be updated for physical device testing
- MongoDB connection string should be kept secure (use environment variables)

## 👨‍💻 Development

- **TypeScript**: Strict mode enabled
- **Code Style**: Functional components with Hooks
- **Error Handling**: Try-catch blocks with user-friendly messages
- **Code Organization**: Separation of concerns (screens, components, services)

---

**Built with ❤️ for outdoor athletes and fitness enthusiasts!**
