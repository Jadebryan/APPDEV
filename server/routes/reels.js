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
    };

    res.status(201).json(transformed);
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
    };

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
