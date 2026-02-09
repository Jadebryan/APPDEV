const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

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

    // Transform user to match frontend expectations
    const transformedUser = {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      followers: user.followers.map(id => id.toString()),
      following: user.following.map(id => id.toString()),
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

    // Transform user to match frontend expectations
    const transformedUser = {
      _id: updatedUser._id.toString(),
      email: updatedUser.email,
      username: updatedUser.username,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      followers: updatedUser.followers.map(id => id.toString()),
      following: updatedUser.following.map(id => id.toString()),
      createdAt: updatedUser.createdAt.toISOString(),
    };

    res.json(transformedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
