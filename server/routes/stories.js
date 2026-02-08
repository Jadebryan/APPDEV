const express = require('express');
const Story = require('../models/Story');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all active stories (not expired), grouped by user
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 });

    const transformed = stories.map((s) => ({
      id: s._id.toString(),
      userId: s.userId._id.toString(),
      username: s.userId.username,
      avatar: s.userId.avatar,
      mediaUri: s.mediaUri,
      caption: s.caption,
      activityType: s.activityType,
      createdAt: s.createdAt.toISOString(),
    }));

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create story (mediaUri = Cloudinary URL)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mediaUri, caption, activityType } = req.body;

    if (!mediaUri) {
      return res.status(400).json({ error: 'Media URL is required' });
    }

    const story = new Story({
      userId: req.user._id,
      mediaUri,
      caption: caption || '',
      activityType,
    });

    await story.save();

    res.status(201).json({
      id: story._id.toString(),
      userId: req.user._id.toString(),
      username: req.user.username,
      avatar: req.user.avatar,
      mediaUri: story.mediaUri,
      caption: story.caption,
      activityType: story.activityType,
      createdAt: story.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
