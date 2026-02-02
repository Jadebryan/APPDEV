const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

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
