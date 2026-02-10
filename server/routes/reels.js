const express = require('express');
const Reel = require('../models/Reel');
const User = require('../models/User');
const Report = require('../models/Report');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all reels
router.get('/', async (req, res) => {
  try {
    const reels = await Reel.find()
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
        commentCount: reel.commentCount ?? 0,
      };
    });

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create reel (videoUri = Cloudinary URL)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { videoUri, caption, activityType } = req.body;

    if (!videoUri) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const reel = new Reel({
      userId: req.user._id,
      videoUri,
      caption: caption || '',
      activityType,
    });

    await reel.save();
    await reel.populate('userId', 'username avatar bio followers following createdAt');

    const u = reel.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const userObj = isPopulated
      ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '' }
      : { _id: (reel.userId && reel.userId.toString) ? reel.userId.toString() : '', username: 'Unknown', avatar: '' };

    const transformed = {
      ...reel.toObject(),
      user: userObj,
      _id: reel._id.toString(),
      userId: userObj._id,
      likes: [],
      commentCount: 0,
    };

    try {
      const io = req.app.get('io');
      if (io) io.to('feed').emit('reel:new', transformed);
    } catch (e) { /* ignore */ }

    res.status(201).json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a reel (auth)
router.get('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    const ReelComment = require('../models/ReelComment');
    const comments = await ReelComment.find({ reelId: reel._id })
      .populate('userId', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    const list = comments.map((c) => {
      const u = c.userId;
      const isPopulated = u && typeof u === 'object' && 'username' in u;
      return {
        _id: c._id.toString(),
        id: c._id.toString(),
        reelId: c.reelId.toString(),
        userId: c.userId && (u._id || c.userId) ? (u._id ? u._id.toString() : c.userId.toString()) : '',
        username: isPopulated ? u.username : 'Unknown',
        avatar: isPopulated ? (u.avatar || '') : '',
        text: c.text,
        parentId: c.parentId ? c.parentId.toString() : undefined,
        createdAt: c.createdAt.toISOString(),
        timeAgo: timeAgo(c.createdAt),
        likeCount: 0,
        timestamp: new Date(c.createdAt).getTime(),
      };
    });

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}w ago`;
  return d.toLocaleDateString();
}

// Add comment to reel (auth)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    const trimmed = (text || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'Comment text is required' });

    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    const ReelComment = require('../models/ReelComment');
    const newComment = new ReelComment({
      reelId: reel._id,
      userId: req.user._id,
      text: trimmed,
      parentId: parentId || null,
    });
    await newComment.save();
    await newComment.populate('userId', 'username avatar');

    await Reel.findByIdAndUpdate(reel._id, { $inc: { commentCount: 1 } });

    const u = newComment.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const created = newComment.createdAt instanceof Date ? newComment.createdAt : new Date(newComment.createdAt);
    const createdObj = {
      _id: newComment._id.toString(),
      id: newComment._id.toString(),
      reelId: newComment.reelId.toString(),
      userId: u && (u._id || u) ? (u._id ? u._id.toString() : u.toString()) : '',
      username: isPopulated ? u.username : 'Unknown',
      avatar: isPopulated ? (u.avatar || '') : '',
      text: newComment.text,
      parentId: newComment.parentId ? newComment.parentId.toString() : undefined,
      createdAt: created.toISOString(),
      timeAgo: timeAgo(created),
      likeCount: 0,
      timestamp: created.getTime(),
    };

    res.status(201).json(createdObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reel (auth, owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    const ownerId = (reel.userId && reel.userId.toString && reel.userId.toString()) || reel.userId.toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own reel' });
    }
    const Notification = require('../models/Notification');
    const ReelComment = require('../models/ReelComment');
    await Notification.deleteMany({ reelId: reel._id });
    await ReelComment.deleteMany({ reelId: reel._id });
    await Reel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bookmark reel (auth)
router.post('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.savedReels) user.savedReels = [];
    if (user.savedReels.some((id) => id.toString() === reel._id.toString())) {
      return res.json({ savedReels: (user.savedReels || []).map((id) => id.toString()) });
    }
    user.savedReels.push(reel._id);
    await user.save();
    res.json({ savedReels: user.savedReels.map((id) => id.toString()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unbookmark reel (auth)
router.delete('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.savedReels) user.savedReels = [];
    user.savedReels = user.savedReels.filter((id) => id.toString() !== req.params.id);
    await user.save();
    res.json({ savedReels: user.savedReels.map((id) => id.toString()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report reel (auth)
router.post('/:id/report', authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    const { reason, comment } = req.body;
    const validReasons = ['spam', 'inappropriate', 'harassment', 'other'];
    const r = validReasons.includes(reason) ? reason : 'other';
    await Report.findOneAndUpdate(
      { reelId: reel._id, userId: req.user._id },
      { reelId: reel._id, userId: req.user._id, reason: r, comment: comment ? String(comment).trim() : '' },
      { upsert: true, new: true }
    );
    res.json({ ok: true, message: 'Report submitted. We will review this reel.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/unlike reel
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id).populate('userId', 'username avatar bio followers following createdAt').populate('likes', 'username');

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const userId = req.user._id.toString();
    const isLiked = reel.likes.some((l) => l._id?.toString?.() === userId || l.toString() === userId);

    if (isLiked) {
      reel.likes = reel.likes.filter((l) => (l._id?.toString?.() || l.toString()) !== userId);
    } else {
      reel.likes.push(req.user._id);
      const reelOwnerId = reel.userId && (reel.userId._id ? reel.userId._id.toString() : reel.userId.toString());
      if (reelOwnerId !== userId) {
        const Notification = require('../models/Notification');
        const { hasRecentDuplicateNotification } = require('../utils/notifications');
        const isDuplicate = await hasRecentDuplicateNotification(Notification, {
          toUserId: reel.userId,
          fromUserId: req.user._id,
          type: 'reel_like',
          reelId: reel._id,
        });
        if (!isDuplicate) {
          await Notification.create({
            toUserId: reel.userId,
            fromUserId: req.user._id,
            type: 'reel_like',
            reelId: reel._id,
          }).catch(() => {});
          try {
            const io = req.app.get('io');
            if (io) io.to(`user:${reelOwnerId}`).emit('notification:new', {});
          } catch (e) { /* ignore */ }
          const { sendPushToUser } = require('../utils/push');
          const likerUsername = req.user.username || 'Someone';
          sendPushToUser(reel.userId, 'Like', `${likerUsername} liked your reel`, { reelId: reel._id.toString(), type: 'reel_like' }).catch(() => {});
        }
      }
    }

    await reel.save();

    const u = reel.userId;
    const isPopulated = u && typeof u === 'object' && 'username' in u;
    const userObj = isPopulated
      ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '' }
      : { _id: (reel.userId && reel.userId.toString) ? reel.userId.toString() : '', username: 'Unknown', avatar: '' };

    const transformed = {
      ...reel.toObject(),
      user: userObj,
      _id: reel._id.toString(),
      userId: userObj._id,
      likes: (reel.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
      commentCount: reel.commentCount ?? 0,
    };

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
