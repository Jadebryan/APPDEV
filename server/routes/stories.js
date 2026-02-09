const express = require('express');
const Story = require('../models/Story');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all active stories (not expired), grouped by user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 });

    const currentUserId = req.user?._id ? req.user._id.toString() : null;

    const transformed = stories.map((s) => {
      const likes = Array.isArray(s.likes) ? s.likes : [];
      const likeCount = likes.length;
      const likedByMe =
        !!currentUserId && likes.some((id) => id.toString() === currentUserId);

      return {
        id: s._id.toString(),
        userId: s.userId._id.toString(),
        username: s.userId.username,
        avatar: s.userId.avatar,
        mediaUri: s.mediaUri,
        caption: s.caption,
        activityType: s.activityType,
        createdAt: s.createdAt.toISOString(),
        viewCount: Array.isArray(s.viewers) ? s.viewers.length : 0,
        likeCount,
        likedByMe,
      };
    });

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

// Delete story (auth, owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own story' });
    }
    await Story.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark story as viewed by current user
router.post('/:id/view', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Do not track views on your own story
    if (story.userId.toString() === req.user._id.toString()) {
      return res.json({ ok: true });
    }

    // Only count views for active (non-expired) stories
    const now = new Date();
    if (story.expiresAt <= now) {
      return res.status(410).json({ error: 'Story has expired' });
    }

    await Story.findByIdAndUpdate(story._id, {
      $addToSet: { viewers: req.user._id },
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get viewers for a story (owner only)
router.get('/:id/viewers', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('viewers', 'username avatar');
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only see viewers for your own story' });
    }

    const viewers =
      story.viewers?.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        avatar: u.avatar,
      })) ?? [];

    res.json({
      total: viewers.length,
      viewers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like / Unlike a story (heart reaction)
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const userId = req.user._id.toString();
    const likes = Array.isArray(story.likes) ? story.likes.map((id) => id.toString()) : [];
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
      story.likes = story.likes.filter((id) => id.toString() !== userId);
    } else {
      story.likes = [...(story.likes || []), req.user._id];

      // Notify story owner (but not self)
      const ownerId = story.userId.toString();
      if (ownerId !== userId) {
        await Notification.create({
          toUserId: story.userId,
          fromUserId: req.user._id,
          type: 'story_like',
        }).catch(() => {});

        const { sendPushToUser } = require('../utils/push');
        const likerUsername = req.user.username || 'Someone';
        sendPushToUser(
          story.userId,
          'Story like',
          `${likerUsername} liked your story`,
          { storyId: story._id.toString(), type: 'story_like' }
        ).catch(() => {});
      }
    }

    await story.save();

    const likeCount = Array.isArray(story.likes) ? story.likes.length : 0;
    res.json({ liked: !hasLiked, likeCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reply to a story (creates/updates chat conversation and sends notification)
router.post('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const { text } = req.body;
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const senderId = req.user._id.toString();
    const ownerId = story.userId.toString();

    // Don't create chat/notify yourself when replying to your own story
    if (ownerId !== senderId) {
      // Create or update conversation (IG-style: story reply creates chat)
      const Conversation = require('../models/Conversation');
      const Message = require('../models/Message');
      const mongoose = require('mongoose');
      
      const senderObjId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
      const ownerObjId = mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
      
      // Find existing conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [senderObjId, ownerObjId], $size: 2 },
      });

      if (!conversation) {
        // Sort IDs to ensure consistent ordering
        const sortedIds = [senderObjId, ownerObjId].sort((a, b) => {
          const aStr = a.toString();
          const bStr = b.toString();
          return aStr.localeCompare(bStr);
        });
        conversation = new Conversation({
          participants: sortedIds,
          unreadCount: new Map(),
        });
        await conversation.save();
      }

      // Add message to conversation
      const message = new Message({
        conversationId: conversation._id,
        senderId: req.user._id,
        text: trimmed,
        storyId: story._id,
        storyMediaUri: story.mediaUri,
      });
      await message.save();

      // Update conversation lastMessage and unreadCount
      const ownerIdStr = ownerObjId.toString();
      const currentUnread = conversation.unreadCount?.get(ownerIdStr) || 0;
      conversation.unreadCount = conversation.unreadCount || new Map();
      conversation.unreadCount.set(ownerIdStr, currentUnread + 1);
      conversation.lastMessage = {
        text: trimmed,
        senderId: req.user._id,
        createdAt: new Date(),
      };
      conversation.updatedAt = new Date();
      await conversation.save();

      // Create notification
      await Notification.create({
        toUserId: story.userId,
        fromUserId: req.user._id,
        type: 'story_reply',
        commentText: trimmed.slice(0, 200),
      }).catch(() => {});

      const { sendPushToUser } = require('../utils/push');
      const senderUsername = req.user.username || 'Someone';
      const preview = trimmed.slice(0, 60);
      const body =
        preview.length > 0
          ? `${senderUsername} replied to your story: "${preview}${preview.length >= 60 ? '…' : ''}"`
          : `${senderUsername} replied to your story`;
      sendPushToUser(story.userId, 'Story reply', body, {
        storyId: story._id.toString(),
        type: 'story_reply',
        conversationId: conversation._id.toString(),
      }).catch(() => {});

      // Return conversation ID so frontend can navigate to chat
      return res.status(201).json({ ok: true, conversationId: conversation._id.toString() });
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
