const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const { hasRecentDuplicateNotification } = require('../utils/notifications');

const router = express.Router();

// Update current user profile (auth) – must be before /:id
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (typeof username === 'string' && username.trim()) {
      const trimmed = username.trim();
      const existing = await User.findOne({ username: trimmed, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      user.username = trimmed;
    }
    if (typeof bio === 'string') user.bio = bio.trim();
    if (typeof avatar === 'string') user.avatar = avatar.trim();
    await user.save();
    const transformed = {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      avatar: user.avatar || '',
      followers: (user.followers || []).map(id => id.toString()),
      following: (user.following || []).map(id => id.toString()),
      savedPosts: (user.savedPosts || []).map(id => id.toString()),
      createdAt: user.createdAt.toISOString(),
    };
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification preferences (auth)
router.get('/me/notification-preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const prefs = user.notificationPreferences || {};
    res.json({
      likes: prefs.likes !== false,
      comments: prefs.comments !== false,
      follow: prefs.follow !== false,
      messages: prefs.messages !== false,
      weeklySummary: prefs.weeklySummary !== false,
      challenges: prefs.challenges === true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification preferences (auth)
router.patch('/me/notification-preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { likes, comments, follow, messages, weeklySummary, challenges } = req.body;
    if (!user.notificationPreferences) user.notificationPreferences = {};
    if (typeof likes === 'boolean') user.notificationPreferences.likes = likes;
    if (typeof comments === 'boolean') user.notificationPreferences.comments = comments;
    if (typeof follow === 'boolean') user.notificationPreferences.follow = follow;
    if (typeof messages === 'boolean') user.notificationPreferences.messages = messages;
    if (typeof weeklySummary === 'boolean') user.notificationPreferences.weeklySummary = weeklySummary;
    if (typeof challenges === 'boolean') user.notificationPreferences.challenges = challenges;
    user.markModified('notificationPreferences');
    await user.save();
    const prefs = user.notificationPreferences || {};
    res.json({
      likes: prefs.likes !== false,
      comments: prefs.comments !== false,
      follow: prefs.follow !== false,
      messages: prefs.messages !== false,
      weeklySummary: prefs.weeklySummary !== false,
      challenges: prefs.challenges === true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get connected apps (auth)
router.get('/me/connected-apps', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('connectedApps').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const apps = user.connectedApps || {};
    res.json({
      strava: !!apps.strava,
      garmin: !!apps.garmin,
      appleHealth: !!apps.appleHealth,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update connected apps (auth) – toggles connection state
router.patch('/me/connected-apps', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { strava, garmin, appleHealth } = req.body;
    if (!user.connectedApps) user.connectedApps = {};
    if (typeof strava === 'boolean') user.connectedApps.strava = strava;
    if (typeof garmin === 'boolean') user.connectedApps.garmin = garmin;
    if (typeof appleHealth === 'boolean') user.connectedApps.appleHealth = appleHealth;
    user.markModified('connectedApps');
    await user.save();
    const apps = user.connectedApps || {};
    res.json({
      strava: !!apps.strava,
      garmin: !!apps.garmin,
      appleHealth: !!apps.appleHealth,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register Expo push token for current user (auth)
router.patch('/me/push-token', authMiddleware, async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.expoPushToken = typeof expoPushToken === 'string' && expoPushToken.trim() ? expoPushToken.trim() : null;
    await user.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record that current user viewed someone's profile (TikTok-style profile views)
router.post('/me/profile-view', authMiddleware, async (req, res) => {
  try {
    const { profileUserId } = req.body;
    const viewerId = req.user._id;
    if (!profileUserId || profileUserId === viewerId.toString()) {
      return res.json({ ok: true });
    }
    const ProfileView = require('../models/ProfileView');
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(profileUserId)) {
      return res.status(400).json({ error: 'Invalid profile user id' });
    }
    await ProfileView.create({
      viewerId,
      profileUserId,
    }).catch(() => {});

    // Create a notification for the profile owner (but not for self-views)
    try {
      const ownerId = profileUserId;
      if (ownerId.toString() !== viewerId.toString()) {
        const isDuplicate = await hasRecentDuplicateNotification(Notification, {
          toUserId: ownerId,
          fromUserId: viewerId,
          type: 'profile_view',
        }, 5 * 60 * 1000); // 5 minutes window

        if (!isDuplicate) {
          await Notification.create({
            toUserId: ownerId,
            fromUserId: viewerId,
            type: 'profile_view',
          }).catch(() => {});

          try {
            const io = req.app.get('io');
            if (io) {
              io.to(`user:${ownerId}`).emit('notification:new', {});
            }
          } catch (_e) {
            // ignore socket errors
          }
        }
      }
    } catch (_e) {
      // notifications are best-effort
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users who viewed current user's profile (TikTok-style, deduped by latest view)
router.get('/me/profile-visitors', authMiddleware, async (req, res) => {
  try {
    const profileUserId = req.user._id;
    const ProfileView = require('../models/ProfileView');
    const views = await ProfileView.aggregate([
      { $match: { profileUserId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$viewerId',
          viewedAt: { $first: '$createdAt' },
        },
      },
      { $sort: { viewedAt: -1 } },
      { $limit: 100 },
    ]);
    if (views.length === 0) {
      return res.json({ users: [], count: 0 });
    }
    const viewerIds = views.map((v) => v._id);
    const users = await User.find({ _id: { $in: viewerIds } })
      .select('username avatar')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const list = views.map((v) => {
      const u = userMap.get(v._id.toString());
      return {
        _id: v._id.toString(),
        username: u ? u.username : 'Unknown',
        avatar: u ? (u.avatar || '') : '',
        viewedAt: v.viewedAt,
      };
    });
    res.json({ users: list, count: list.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile visitors count only (for profile stat)
router.get('/me/profile-visitors/count', authMiddleware, async (req, res) => {
  try {
    const ProfileView = require('../models/ProfileView');
    const result = await ProfileView.aggregate([
      { $match: { profileUserId: req.user._id } },
      { $group: { _id: '$viewerId' } },
      { $count: 'count' },
    ]);
    const count = result.length > 0 ? result[0].count : 0;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's saved (bookmarked) posts – full post objects
router.get('/me/saved-posts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.savedPosts || user.savedPosts.length === 0) {
      return res.json([]);
    }
    const posts = await Post.find({ _id: { $in: user.savedPosts } })
      .populate('userId', 'username avatar bio followers following createdAt')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });
    const Comment = require('../models/Comment');
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: posts.map((p) => p._id) } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));
    const transformed = posts.map((post) => {
      const u = post.userId;
      const isPopulated = u && typeof u === 'object' && 'username' in u;
      const userObj = isPopulated
        ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '', bio: u.bio || '', followers: u.followers || [], following: u.following || [], createdAt: u.createdAt?.toISOString?.() || '' }
        : { _id: (post.userId && post.userId.toString) ? post.userId.toString() : '', username: 'Unknown', avatar: '', bio: '', followers: [], following: [], createdAt: '' };
      return {
        ...post.toObject(),
        user: userObj,
        _id: post._id.toString(),
        userId: userObj._id,
        likes: (post.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
        commentCount: countMap.get(post._id.toString()) || 0,
      };
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's saved reels – full reel objects
router.get('/me/saved-reels', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.savedReels || user.savedReels.length === 0) {
      return res.json([]);
    }
    const reels = await Reel.find({ _id: { $in: user.savedReels } })
      .populate('userId', 'username avatar')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });
    const transformed = reels.map((reel) => {
      const u = reel.userId;
      const isPopulated = u && typeof u === 'object' && 'username' in u;
      const userObj = isPopulated
        ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '' }
        : { _id: (reel.userId && reel.userId.toString) ? reel.userId.toString() : '', username: 'Unknown', avatar: '' };
      return {
        ...reel.toObject(),
        user: userObj,
        _id: reel._id.toString(),
        userId: userObj._id,
        likes: (reel.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
      };
    });
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's goals
router.get('/me/goals', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('goals');
    const goals = (user && user.goals) ? user.goals : [];
    res.json(goals.map((g) => ({
      _id: g._id?.toString(),
      postId: g.postId?.toString(),
      title: g.title,
      targetDistance: g.targetDistance,
      targetDuration: g.targetDuration,
      createdAt: g.createdAt?.toISOString?.() || '',
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add goal (auth)
router.post('/me/goals', authMiddleware, async (req, res) => {
  try {
    const { postId, title, targetDistance, targetDuration } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Goal title is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.goals) user.goals = [];
    user.goals.push({
      postId: postId || undefined,
      title: String(title).trim(),
      targetDistance: targetDistance != null ? Number(targetDistance) : undefined,
      targetDuration: targetDuration != null ? Number(targetDuration) : undefined,
    });
    await user.save();
    const g = user.goals[user.goals.length - 1];
    res.status(201).json({
      _id: g._id.toString(),
      postId: g.postId?.toString(),
      title: g.title,
      targetDistance: g.targetDistance,
      targetDuration: g.targetDuration,
      createdAt: g.createdAt?.toISOString?.() || '',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete goal (auth)
router.delete('/me/goals/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.goals = (user.goals || []).filter((g) => g._id.toString() !== req.params.id);
    await user.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's saved routes
router.get('/me/saved-routes', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('savedRoutes');
    const routes = (user && user.savedRoutes) ? user.savedRoutes : [];
    res.json(routes.map((r) => ({
      _id: r._id?.toString(),
      postId: r.postId?.toString(),
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: r.createdAt?.toISOString?.() || '',
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add saved route (auth)
router.post('/me/saved-routes', authMiddleware, async (req, res) => {
  try {
    const { postId, name, latitude, longitude } = req.body;
    if (!postId) return res.status(400).json({ error: 'Post ID is required' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.savedRoutes) user.savedRoutes = [];
    if (user.savedRoutes.some((r) => r.postId && r.postId.toString() === postId)) {
      return res.status(400).json({ error: 'Route already saved' });
    }
    user.savedRoutes.push({
      postId,
      name: name || '',
      latitude: latitude != null ? Number(latitude) : undefined,
      longitude: longitude != null ? Number(longitude) : undefined,
    });
    await user.save();
    const r = user.savedRoutes[user.savedRoutes.length - 1];
    res.status(201).json({
      _id: r._id.toString(),
      postId: r.postId?.toString(),
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: r.createdAt?.toISOString?.() || '',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove saved route (auth)
router.delete('/me/saved-routes/:postId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.savedRoutes = (user.savedRoutes || []).filter((r) => r.postId && r.postId.toString() !== req.params.postId);
    await user.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users who follow this user (for Followers list screen)
router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('followers')
      .populate('followers', 'username avatar bio');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const list = (user.followers || []).filter(Boolean).map((u) => ({
      _id: u._id.toString(),
      username: u.username,
      avatar: u.avatar || '',
      bio: u.bio || '',
    }));

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users this user follows (for Following list screen) (for Following list screen)
router.get('/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('following')
      .populate('following', 'username avatar bio');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const list = (user.following || []).filter(Boolean).map((u) => ({
      _id: u._id.toString(),
      username: u.username,
      avatar: u.avatar || '',
      bio: u.bio || '',
    }));

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const toId = (x) => (x && x._id ? x._id.toString() : x && x.toString ? x.toString() : '');
    // Transform user to match frontend expectations
    const transformedUser = {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      followers: (user.followers || []).map(toId).filter(Boolean),
      following: (user.following || []).map(toId).filter(Boolean),
      createdAt: user.createdAt.toISOString(),
    };

    res.json(transformedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user posts
router.get('/:id/posts', async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.id })
      .populate('userId', 'username avatar bio followers following createdAt')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });

    // Transform posts to match frontend expectations
    const transformedPosts = posts.map(post => ({
      ...post.toObject(),
      user: post.userId,
      _id: post._id.toString(),
      userId: post.userId._id.toString(),
      likes: post.likes.map(like => like._id.toString()),
    }));

    res.json(transformedPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow/Unfollow user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = currentUser.following.some(
      id => id.toString() === targetUserId
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== targetUserId
      );
      targetUser.followers = targetUser.followers.filter(
        id => id.toString() !== currentUserId.toString()
      );
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
      await Notification.create({
        toUserId: targetUserId,
        fromUserId: currentUserId,
        type: 'follow',
      }).catch(() => {});
      try {
        const io = req.app.get('io');
        if (io) io.to(`user:${targetUserId}`).emit('notification:new', {});
      } catch (e) { /* ignore */ }

      // Push: "X started following you" (IG-style)
      const { sendPushToUser } = require('../utils/push');
      const followerUsername = req.user.username || 'Someone';
      sendPushToUser(targetUserId, 'New follower', `${followerUsername} started following you`, { userId: currentUserId.toString(), type: 'follow' }).catch(() => {});
    }

    await currentUser.save();
    await targetUser.save();

    const updatedUser = await User.findById(targetUserId)
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    const toId = (x) => (x && x._id ? x._id.toString() : x && x.toString ? x.toString() : '');
    // Transform user to match frontend expectations
    const transformedUser = {
      _id: updatedUser._id.toString(),
      email: updatedUser.email,
      username: updatedUser.username,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      followers: (updatedUser.followers || []).map(toId).filter(Boolean),
      following: (updatedUser.following || []).map(toId).filter(Boolean),
      createdAt: updatedUser.createdAt.toISOString(),
    };

    res.json(transformedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
