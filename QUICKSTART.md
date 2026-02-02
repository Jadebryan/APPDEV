# Quick Start Guide - Run Barbie🎀

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB

**Option A: MongoDB Atlas (Easiest - Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account and cluster
3. Get your connection string
4. Create `.env` file:
   ```
   MONGODB_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=any-random-secret-key-here
   PORT=3000
   ```

**Option B: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service
3. Create `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/runbarbie
   JWT_SECRET=any-random-secret-key-here
   PORT=3000
   ```

### 3. Update API URL for Your Device

**Find your computer's IP address:**
- **Windows**: Open Command Prompt → type `ipconfig` → find "IPv4 Address"
- **Mac/Linux**: Open Terminal → type `ifconfig` → find "inet"

**Update `src/services/api.ts`:**
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_IP_ADDRESS:3000/api'  // Replace YOUR_IP_ADDRESS
  : 'https://your-production-url.com/api';
```

Example: `http://192.168.1.100:3000/api`

### 4. Start the Server
```bash
npm run server
```
Wait for: `✅ Connected to MongoDB` and `🚀 Server running on port 3000`

### 5. Start the App
In a **new terminal**:
```bash
npm start
```

### 6. Run on Your Phone
1. Install **Expo Go** app (iOS/Android)
2. Scan the QR code from terminal
3. App will load!

## 📱 Testing the App

1. **Register** a new account
2. **Login** with your credentials  
3. **Create a post**:
   - Tap the "+" tab
   - Select image from camera or gallery
   - Add caption and activity details
   - Share!
4. **View feed** - See all posts
5. **Like posts** - Tap the heart icon
6. **Check profile** - View your posts and stats

## 🐛 Troubleshooting

### "Cannot connect to server"
- ✅ Check server is running (`npm run server`)
- ✅ Verify IP address in `src/services/api.ts`
- ✅ Ensure phone and computer are on same WiFi
- ✅ Try `10.0.2.2` for Android emulator
- ✅ Try `localhost` for iOS simulator

### "MongoDB connection error"
- ✅ Check MongoDB is running
- ✅ Verify connection string in `.env`
- ✅ For Atlas: Check IP whitelist includes your IP

### "Image upload fails"
- ✅ Check image size (keep under 5MB)
- ✅ Ensure camera/gallery permissions granted

## 📚 Next Steps

- Add cloud image storage (Cloudinary, AWS S3)
- Implement push notifications
- Add real-time updates
- Integrate Strava API
- Add map view for activities

## 🎓 For University Project

This project demonstrates:
- ✅ React Native with Expo
- ✅ TypeScript throughout
- ✅ RESTful API with Express
- ✅ MongoDB database
- ✅ JWT authentication
- ✅ Image handling
- ✅ Clean code structure
- ✅ Component-based architecture

Perfect for showcasing modern mobile app development skills!
