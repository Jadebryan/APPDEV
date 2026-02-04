# Run Barbie🎀

A React Native mobile application built with Expo and TypeScript, designed for hikers, runners, and outdoor athletes to share their activities and connect with like-minded individuals.

## Features

- 📸 Instagram-style feed with activity posts
- 🏃 Activity tracking (run, hike, cycle)
- 👤 User profiles with posts grid
- ❤️ Like and follow functionality
- 📷 Image upload from camera or gallery
- 🔐 Authentication system

## Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Node.js, Express, MongoDB
- **Navigation**: React Navigation
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- MongoDB installed and running locally, or MongoDB Atlas account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory:
```
MONGODB_URI=mongodb://localhost:27017/runbarbie
JWT_SECRET=your-secret-key-here
PORT=3000
```

3. Start the backend server:
```bash
npm run server
```

4. Start the Expo development server:
```bash
npm start
```

5. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator / `a` for Android emulator

## Project Structure

```
run-barbie/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── types/          # TypeScript interfaces
│   ├── services/       # API services
│   └── utils/          # Utility functions
├── server/             # Backend server
│   ├── models/         # MongoDB models
│   ├── routes/          # API routes
│   └── middleware/     # Express middleware
└── assets/             # Images and static assets
```

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/users/:id` - Get user profile
- `POST /api/posts/:id/like` - Like/unlike a post
- `POST /api/users/:id/follow` - Follow/unfollow user

## License

This project is created for educational purposes.
