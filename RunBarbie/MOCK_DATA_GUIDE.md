# Mock Data Mode - No Backend Required! 🎉

The app is now configured to run **without a backend server** using mock data. Perfect for quick testing and development!

## 🚀 Quick Start (No Backend)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the app**:
   ```bash
   npm start
   ```

3. **That's it!** No MongoDB, no server setup needed! 🎊

## 🔐 Test Accounts

The mock data includes pre-configured test accounts:

### Option 1: Use Existing Test Accounts
- **Email**: `hiker1@example.com` | **Password**: `password123`
- **Email**: `runner2@example.com` | **Password**: `password123`
- **Email**: `cyclist3@example.com` | **Password**: `password123`

### Option 2: Create New Account
- Register with any email/username
- Use password: `password123` (or any password - mock mode accepts it)
- Your account will be stored in memory

## 📝 Mock Data Features

✅ **Pre-loaded Posts**: 3 sample posts with images  
✅ **User Profiles**: 3 test users with followers/following  
✅ **Full Functionality**: Like, create posts, view profiles  
✅ **Realistic Delays**: Simulates API response times  

## 🔄 Switching Between Mock and Real Backend

### To Use Mock Data (Current Setting)
In `src/services/api.ts`, set:
```typescript
const USE_MOCK_DATA = true;
```

### To Use Real Backend
In `src/services/api.ts`, set:
```typescript
const USE_MOCK_DATA = false;
```

Then start your backend server:
```bash
npm run server
```

## 📱 What Works in Mock Mode

- ✅ User registration
- ✅ User login
- ✅ View feed with posts
- ✅ Create new posts
- ✅ Like/unlike posts
- ✅ View user profiles
- ✅ View user's posts grid
- ✅ Follow/unfollow (backend ready)

## ⚠️ Limitations of Mock Mode

- Data is stored in memory (lost on app restart)
- Images use placeholder URLs (Unsplash)
- No real image upload (uses base64, but not persisted)
- No real authentication security

## 🎨 Sample Data

The app comes with:
- **3 sample users** with different activity types
- **3 sample posts** showing runs, hikes, and cycling
- **Realistic relationships** (followers/following)

## 💡 Tips

- **Create Posts**: Your posts will appear immediately in the feed
- **Like Posts**: Likes are tracked per user
- **New Users**: Register to create your own account
- **Images**: Use any image URL or take photos (stored as base64 in memory)

## 🔮 When to Switch to Real Backend

Switch to real backend when you need:
- Persistent data storage
- Real image uploads
- Production-ready authentication
- Multiple device sync
- Real user accounts

---

**Enjoy testing the app without any backend setup!** 🚀
