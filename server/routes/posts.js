const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all posts – transform to match frontend (user, _id string, userId string, commentCount)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('userId', 'username avatar bio followers following createdAt')
      .populate('likes', 'username')
      .sort({ createdAt: -1 });

    const postIds = posts.map((p) => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds } } },
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

// Create post (image = Cloudinary URL, or images = array of URLs)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { image, images: imagesArray, caption, activityType, distance, duration, location } = req.body;

    const imageUrls = Array.isArray(imagesArray) && imagesArray.length > 0
      ? imagesArray
      : (image ? [image] : []);

    if (imageUrls.length === 0 || !activityType) {
      return res.status(400).json({ error: 'At least one image and activity type are required' });
    }

    const post = new Post({
      userId: req.user._id,
      image: imageUrls[0],
      images: imageUrls.length > 1 ? imageUrls : undefined,
      caption: caption || '',
      activityType,
      distance,
      duration,
      location: location || undefined,
    });

    await post.save();
    await post.populate('userId', 'username avatar bio followers following createdAt');

    const u = post.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const userObj = isPopulated
      ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '', bio: u.bio || '', followers: u.followers || [], following: u.following || [], createdAt: u.createdAt?.toISOString?.() || '' }
      : { _id: (post.userId && post.userId.toString) ? post.userId.toString() : '', username: 'Unknown', avatar: '', bio: '', followers: [], following: [], createdAt: '' };

    const transformedPost = {
      ...post.toObject(),
      user: userObj,
      _id: post._id.toString(),
      userId: userObj._id,
      likes: (post.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
      commentCount: 0,
    };

    res.status(201).json(transformedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const comments = await Comment.find({ postId: post._id })
      .populate('userId', 'username avatar')
      .sort({ createdAt: 1 });

    const list = comments.map((c) => {
      const u = c.userId;
      const isPopulated = u && typeof u === 'object' && 'username' in u;
      return {
        _id: c._id.toString(),
        postId: c.postId.toString(),
        userId: u && u._id ? u._id.toString() : (c.userId && c.userId.toString ? c.userId.toString() : ''),
        username: isPopulated ? u.username : 'Unknown',
        avatar: isPopulated ? (u.avatar || '') : '',
        text: c.text,
        createdAt: c.createdAt.toISOString(),
      };
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment (auth)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const comment = new Comment({
      postId: post._id,
      userId: req.user._id,
      text: String(text).trim(),
    });
    await comment.save();
    const postOwnerId = (post.userId && post.userId.toString ? post.userId.toString() : post.userId.toString());
    const commenterId = req.user._id.toString();
    if (postOwnerId !== commenterId) {
      await Notification.create({
        toUserId: post.userId,
        fromUserId: req.user._id,
        type: 'comment',
        postId: post._id,
        commentId: comment._id,
        commentText: (comment.text || '').slice(0, 100),
      }).catch(() => {});
    }
    await comment.populate('userId', 'username avatar');
    const u = comment.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    res.status(201).json({
      _id: comment._id.toString(),
      postId: comment.postId.toString(),
      userId: u && u._id ? u._id.toString() : '',
      username: isPopulated ? u.username : 'Unknown',
      avatar: isPopulated ? (u.avatar || '') : '',
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bookmark post (auth)
router.post('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const postIdStr = post._id.toString();
    const saved = (user.savedPosts || []).map((id) => id.toString());
    if (saved.includes(postIdStr)) {
      return res.json({ savedPosts: saved });
    }
    user.savedPosts = user.savedPosts || [];
    user.savedPosts.push(post._id);
    await user.save();
    const updated = (user.savedPosts || []).map((id) => id.toString());
    res.json({ savedPosts: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unbookmark post (auth)
router.delete('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    user.savedPosts = (user.savedPosts || []).filter((id) => id.toString() !== post._id.toString());
    await user.save();
    const updated = (user.savedPosts || []).map((id) => id.toString());
    res.json({ savedPosts: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report post (auth)
router.post('/:id/report', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const { reason, comment } = req.body;
    const validReasons = ['spam', 'inappropriate', 'harassment', 'other'];
    const r = validReasons.includes(reason) ? reason : 'other';
    await Report.findOneAndUpdate(
      { postId: post._id, userId: req.user._id },
      { postId: post._id, userId: req.user._id, reason: r, comment: comment ? String(comment).trim() : '' },
      { upsert: true, new: true }
    );
    res.json({ ok: true, message: 'Report submitted. We will review this post.' });
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
      const postOwnerId = post.userId && post.userId.toString ? post.userId.toString() : post.userId.toString();
      if (postOwnerId !== userId) {
        await Notification.create({
          toUserId: post.userId,
          fromUserId: req.user._id,
          type: 'like',
          postId: post._id,
        }).catch(() => {});
      }
    }

    await post.save();
    await post.populate('userId', 'username avatar bio followers following createdAt');
    await post.populate('likes', 'username');

    const u = post.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const userObj = isPopulated
      ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '', bio: u.bio || '', followers: u.followers || [], following: u.following || [], createdAt: u.createdAt?.toISOString?.() || '' }
      : { _id: (post.userId && post.userId.toString) ? post.userId.toString() : '', username: 'Unknown', avatar: '', bio: '', followers: [], following: [], createdAt: '' };

    const transformedPost = {
      ...post.toObject(),
      user: userObj,
      _id: post._id.toString(),
      userId: userObj._id,
      likes: (post.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
    };

    res.json(transformedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
