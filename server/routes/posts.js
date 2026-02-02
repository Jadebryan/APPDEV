const express = require('express');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('userId', 'username avatar')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { image, caption, activityType, distance, duration } = req.body;

    if (!image || !activityType) {
      return res.status(400).json({ error: 'Image and activity type are required' });
    }

    const post = new Post({
      userId: req.user._id,
      image,
      caption,
      activityType,
      distance,
      duration,
    });

    await post.save();
    await post.populate('userId', 'username avatar bio followers following createdAt');

    // Transform post to match frontend expectations
    const transformedPost = {
      ...post.toObject(),
      user: post.userId,
      _id: post._id.toString(),
      userId: post.userId._id.toString(),
    };

    res.status(201).json(transformedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const isLiked = post.likes.some(like => like.toString() === userId);

    if (isLiked) {
      post.likes = post.likes.filter(like => like.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    await post.populate('userId', 'username avatar bio followers following createdAt');
    await post.populate('likes', 'username');

    // Transform post to match frontend expectations
    const transformedPost = {
      ...post.toObject(),
      user: post.userId,
      _id: post._id.toString(),
      userId: post.userId._id.toString(),
      likes: post.likes.map(like => like._id.toString()),
    };

    res.json(transformedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
