# Setup Instructions for Run Barbie🎀

## Prerequisites

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** - Choose one:
   - **Local MongoDB**: [Download](https://www.mongodb.com/try/download/community)
   - **MongoDB Atlas** (Cloud): [Sign up](https://www.mongodb.com/cloud/atlas) (Free tier available)
3. **Expo CLI**: `npm install -g expo-cli`
4. **Expo Go App** on your phone (iOS App Store / Google Play Store)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up MongoDB

### Option A: Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **Mac/Linux**: `mongod` or `brew services start mongodb-community`
3. Update `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/runbarbie
   ```

### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier)
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string
6. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/runbarbie
   ```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - A random secret key for JWT tokens
   - `PORT` - Server port (default: 3000)

## Step 4: Update API Base URL for React Native

**Important**: React Native cannot access `localhost` from a physical device.

1. Find your computer's IP address:
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **Mac/Linux**: `ifconfig` or `ip addr`

2. Update `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = __DEV__ 
     ? 'http://YOUR_IP_ADDRESS:3000/api'  // Replace YOUR_IP_ADDRESS
     : 'https://your-production-url.com/api';
   ```

   Example: `http://192.168.1.100:3000/api`

## Step 5: Start the Backend Server

In one terminal window:

```bash
npm run server
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on port 3000
```

## Step 6: Start the Expo App

In another terminal window:

```bash
npm start
```

This will:
1. Start the Expo development server
2. Open Expo DevTools in your browser
3. Display a QR code

## Step 7: Run on Your Device

### Option A: Physical Device (Recommended)

1. Install **Expo Go** app on your phone
2. Scan the QR code from the terminal/browser
3. The app will load on your device

### Option B: Emulator/Simulator

- **iOS**: Press `i` in the terminal (requires Xcode)
- **Android**: Press `a` in the terminal (requires Android Studio)

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongosh` or check MongoDB Compass
- Verify connection string in `.env`
- Check firewall settings

### API Connection Issues

- Verify server is running on port 3000
- Check IP address in `src/services/api.ts`
- Ensure phone and computer are on the same network
- Try using `10.0.2.2` for Android emulator
- Try using `localhost` for iOS simulator

### Expo Issues

- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Testing the App

1. **Register** a new account
2. **Login** with your credentials
3. **Create a post** with an image
4. **View posts** in the feed
5. **Like posts** and check your profile

## Project Structure

```
run-barbie/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation setup
│   ├── types/           # TypeScript interfaces
│   ├── services/        # API services
│   ├── context/         # React Context (Auth)
│   └── utils/           # Utility functions
├── server/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   └── middleware/      # Express middleware
└── assets/              # Images and static files
```

## Next Steps

- Add image upload to cloud storage (AWS S3, Cloudinary)
- Implement push notifications
- Add real-time updates with WebSockets
- Integrate Strava API
- Add map view for activities
- Implement activity badges
