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
    const { image, images: imagesArray, caption, activityType, distance, duration, location, taggedUserIds } = req.body;

    const imageUrls = Array.isArray(imagesArray) && imagesArray.length > 0
      ? imagesArray
      : (image ? [image] : []);

    if (imageUrls.length === 0 || !activityType) {
      return res.status(400).json({ error: 'At least one image and activity type are required' });
    }

    const tagIds = Array.isArray(taggedUserIds) ? taggedUserIds.filter(id => id && typeof id === 'string').slice(0, 20) : [];

    const post = new Post({
      userId: req.user._id,
      image: imageUrls[0],
      images: imageUrls.length > 1 ? imageUrls : undefined,
      caption: caption || '',
      activityType,
      distance,
      duration,
      location: location || undefined,
      taggedUserIds: tagIds.length ? tagIds : undefined,
    });

    await post.save();
    await post.populate('userId', 'username avatar bio followers following createdAt');

    const postOwnerId = post.userId && (post.userId._id ? post.userId._id.toString() : post.userId.toString());
    const authorId = req.user._id.toString();
    const mongoose = require('mongoose');
    const { sendPushToUser } = require('../utils/push');
    const authorUsername = req.user.username || 'Someone';
    for (const taggedId of tagIds) {
      if (taggedId === authorId || !mongoose.Types.ObjectId.isValid(taggedId)) continue;
      await Notification.create({
        toUserId: taggedId,
        fromUserId: req.user._id,
        type: 'tag',
        postId: post._id,
      }).catch(() => {});
      sendPushToUser(taggedId, 'Tagged', `${authorUsername} tagged you in a post`, { postId: post._id.toString(), type: 'tag' }).catch(() => {});
      try {
        const io = req.app.get('io');
        if (io) io.to(`user:${taggedId}`).emit('notification:new', {});
      } catch (e) { /* ignore */ }
    }

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

    // Real-time: broadcast new post to all feed subscribers
    try {
      const io = req.app.get('io');
      if (io) io.to('feed').emit('post:new', transformedPost);
    } catch (e) { /* ignore */ }

    res.status(201).json(transformedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of users who liked a post (for "who liked" list like TikTok)
router.get('/:id/likers', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .select('likes')
      .populate('likes', 'username avatar');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const users = (post.likes || []).filter(Boolean).map((u) => ({
      _id: u._id.toString(),
      username: u.username,
      avatar: u.avatar || '',
    }));

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a post (auth) – includes replies + comment likes
router.get('/:id/comments', authMiddleware, async (req, res) => {
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
      const likedByMe = (c.likes || []).some((id) => id.toString() === req.user._id.toString());
      return {
        _id: c._id.toString(),
        postId: c.postId.toString(),
        userId: u && u._id ? u._id.toString() : (c.userId && c.userId.toString ? c.userId.toString() : ''),
        username: isPopulated ? u.username : 'Unknown',
        avatar: isPopulated ? (u.avatar || '') : '',
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        parentId: c.parentId ? c.parentId.toString() : undefined,
        likeCount: Array.isArray(c.likes) ? c.likes.length : 0,
        likedByMe,
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
    const { text, parentId } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Optional threaded replies: validate parent comment belongs to this post
    let parentObjId = null;
    if (parentId) {
      const parent = await Comment.findOne({ _id: parentId, postId: post._id }).select('_id');
      if (!parent) {
        return res.status(400).json({ error: 'Parent comment not found' });
      }
      parentObjId = parent._id;
    }
    const comment = new Comment({
      postId: post._id,
      userId: req.user._id,
      text: String(text).trim(),
      parentId: parentObjId,
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
      try {
        const io = req.app.get('io');
        if (io) io.to(`user:${postOwnerId}`).emit('notification:new', {});
      } catch (e) { /* ignore */ }

      // Push: "X commented on your post" (IG-style)
      const { sendPushToUser } = require('../utils/push');
      const commenterUsername = req.user.username || 'Someone';
      const preview = (comment.text || '').trim().slice(0, 50);
      const body = preview ? `${commenterUsername} commented: "${preview}${preview.length >= 50 ? '…' : ''}"` : `${commenterUsername} commented on your post`;
      sendPushToUser(post.userId, 'Comment', body, { postId: post._id.toString(), type: 'comment' }).catch(() => {});
    }

    // Mentions (IG-style): parse @username in comment, notify each mentioned user
    const mentionRegex = /@([a-zA-Z0-9_.]+)/g;
    const usernames = [];
    let m;
    while ((m = mentionRegex.exec(comment.text || '')) !== null) {
      const name = m[1];
      if (name && !usernames.includes(name)) usernames.push(name);
    }
    for (const username of usernames) {
      const mentionedUser = await User.findOne({ username }).select('_id').lean();
      if (!mentionedUser) continue;
      const mentionedId = mentionedUser._id.toString();
      if (mentionedId === commenterId || mentionedId === postOwnerId) continue;
      await Notification.create({
        toUserId: mentionedUser._id,
        fromUserId: req.user._id,
        type: 'mention',
        postId: post._id,
        commentId: comment._id,
        commentText: (comment.text || '').slice(0, 100),
      }).catch(() => {});
      try {
        const io = req.app.get('io');
        if (io) io.to(`user:${mentionedId}`).emit('notification:new', {});
      } catch (e) { /* ignore */ }
      const { sendPushToUser } = require('../utils/push');
      const commenterUsername = req.user.username || 'Someone';
      sendPushToUser(mentionedUser._id, 'Mention', `${commenterUsername} mentioned you in a comment`, { postId: post._id.toString(), type: 'mention' }).catch(() => {});
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
      parentId: comment.parentId ? comment.parentId.toString() : undefined,
      likeCount: 0,
      likedByMe: false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/unlike a comment (auth)
router.post('/:postId/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;
    const comment = await Comment.findOne({ _id: commentId, postId }).populate('userId', 'username avatar');
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    const isLiked = (comment.likes || []).some((id) => id.toString() === userId.toString());
    const updated = await Comment.findByIdAndUpdate(
      comment._id,
      isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true }
    ).populate('userId', 'username avatar');

    const u = updated.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const likedByMe = (updated.likes || []).some((id) => id.toString() === userId.toString());
    res.json({
      _id: updated._id.toString(),
      postId: updated.postId.toString(),
      userId: u && u._id ? u._id.toString() : '',
      username: isPopulated ? u.username : 'Unknown',
      avatar: isPopulated ? (u.avatar || '') : '',
      text: updated.text,
      createdAt: updated.createdAt.toISOString(),
      parentId: updated.parentId ? updated.parentId.toString() : undefined,
      likeCount: Array.isArray(updated.likes) ? updated.likes.length : 0,
      likedByMe,
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

// Delete post (auth, owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const ownerId = (post.userId && post.userId.toString && post.userId.toString()) || post.userId.toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own post' });
    }
    const Comment = require('../models/Comment');
    await Comment.deleteMany({ postId: post._id });
    await Notification.deleteMany({ postId: post._id });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = req.user._id;
    const postId = req.params.id;

    // First check if post exists and get owner info
    const postCheck = await Post.findById(postId).select('userId likes').lean();
    if (!postCheck) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userIdStr = userId.toString();
    const postOwnerId = postCheck.userId ? postCheck.userId.toString() : '';
    const currentLikes = (postCheck.likes || []).map(id => id.toString());
    const isLiked = currentLikes.includes(userIdStr);

    // Use atomic operation to avoid version conflicts
    let updatedPost;
    if (isLiked) {
      // Unlike: remove user from likes array
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $pull: { likes: userId } },
        { new: true }
      );
    } else {
      // Like: add user to likes array (using $addToSet to prevent duplicates)
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $addToSet: { likes: userId } },
        { new: true }
      );

      // Send notification if not liking own post (dedupe: avoid spamming same notif on rapid repeated likes)
      if (postOwnerId !== userIdStr) {
        const { hasRecentDuplicateNotification } = require('../utils/notifications');
        const isDuplicate = await hasRecentDuplicateNotification(Notification, {
          toUserId: postCheck.userId,
          fromUserId: userId,
          type: 'like',
          postId,
        });
        if (!isDuplicate) {
          await Notification.create({
            toUserId: postCheck.userId,
            fromUserId: userId,
            type: 'like',
            postId: postId,
          }).catch(() => {});
          try {
            const io = req.app.get('io');
            if (io) io.to(`user:${postOwnerId}`).emit('notification:new', {});
          } catch (e) { /* ignore */ }

          const { sendPushToUser } = require('../utils/push');
          const likerUsername = req.user.username || 'Someone';
          sendPushToUser(
            postCheck.userId,
            'Like',
            `${likerUsername} liked your post`,
            { postId: postId, type: 'like' }
          ).catch(() => {});
        }
      }
    }

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await updatedPost.populate('userId', 'username avatar bio followers following createdAt');
    await updatedPost.populate('likes', 'username');

    const u = updatedPost.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const userObj = isPopulated
      ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '', bio: u.bio || '', followers: u.followers || [], following: u.following || [], createdAt: u.createdAt?.toISOString?.() || '' }
      : { _id: (updatedPost.userId && updatedPost.userId.toString) ? updatedPost.userId.toString() : '', username: 'Unknown', avatar: '', bio: '', followers: [], following: [], createdAt: '' };

    const transformedPost = {
      ...updatedPost.toObject(),
      user: userObj,
      _id: updatedPost._id.toString(),
      userId: userObj._id,
      likes: (updatedPost.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
    };

    res.json(transformedPost);
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
