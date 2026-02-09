const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get or create a conversation between current user and another user
router.get('/conversations/:userId', authMiddleware, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user._id.toString();

    if (otherUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const mongoose = require('mongoose');
    const currentUserObjId = mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : currentUserId;
    const otherUserObjId = mongoose.Types.ObjectId.isValid(otherUserId) ? new mongoose.Types.ObjectId(otherUserId) : otherUserId;

    // Find or create conversation (check both orderings)
    let conversation = await Conversation.findOne({
      $or: [
        { participants: { $all: [currentUserObjId, otherUserObjId], $size: 2 } },
      ],
    }).populate('participants', 'username avatar bio');

    if (!conversation) {
      // Sort IDs to ensure consistent ordering
      const sortedIds = [currentUserObjId, otherUserObjId].sort((a, b) => {
        const aStr = a.toString();
        const bStr = b.toString();
        return aStr.localeCompare(bStr);
      });
      conversation = new Conversation({
        participants: sortedIds,
        unreadCount: new Map(),
      });
      await conversation.save();
      await conversation.populate('participants', 'username avatar bio');
    }

    const otherUser = conversation.participants.find(
      (p) => (p._id ? p._id.toString() : p.toString()) !== currentUserId
    );
    
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found in conversation' });
    }

    res.json({
      _id: conversation._id.toString(),
      participant: {
        _id: otherUser._id.toString(),
        username: otherUser.username,
        avatar: otherUser.avatar || '',
        bio: otherUser.bio || '',
      },
      lastMessage: {
        text: conversation.lastMessage?.text || '',
        createdAt: conversation.lastMessage?.createdAt?.toISOString() || conversation.createdAt.toISOString(),
        senderId: conversation.lastMessage?.senderId?.toString() || '',
      },
      unreadCount: conversation.unreadCount?.get(currentUserId) || 0,
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for current user
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username avatar bio')
      .sort({ updatedAt: -1 });

    const transformed = conversations.map((conv) => {
      const participantIds = conv.participants.map((p) => (p._id ? p._id.toString() : p.toString()));
      const otherUser = conv.participants.find((p) => {
        const pid = p._id ? p._id.toString() : p.toString();
        return pid !== currentUserId;
      });
      if (!otherUser) {
        // Fallback if somehow otherUser is not found
        return null;
      }
      return {
        _id: conv._id.toString(),
        participant: {
          _id: otherUser._id ? otherUser._id.toString() : otherUser.toString(),
          username: otherUser.username || 'Unknown',
          avatar: otherUser.avatar || '',
          bio: otherUser.bio || '',
        },
        lastMessage: {
          text: conv.lastMessage?.text || '',
          createdAt: conv.lastMessage?.createdAt?.toISOString() || conv.createdAt.toISOString(),
          senderId: conv.lastMessage?.senderId?.toString() || '',
        },
        unreadCount: conv.unreadCount?.get(currentUserId) || 0,
        updatedAt: conv.updatedAt.toISOString(),
      };
    }).filter(Boolean);

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const currentUserId = req.user._id.toString();
    const participantIds = conversation.participants.map((p) => (p._id ? p._id.toString() : p.toString()));
    if (!participantIds.includes(currentUserId)) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(100);

    const transformed = messages.map((msg) => ({
      _id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      read: msg.read,
      storyId: msg.storyId ? msg.storyId.toString() : undefined,
      storyMediaUri: msg.storyMediaUri || undefined,
    }));

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const currentUserId = req.user._id.toString();
    const participantIds = conversation.participants.map((p) => (p._id ? p._id.toString() : p.toString()));
    if (!participantIds.includes(currentUserId)) {
      return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
    }

    const message = new Message({
      conversationId: conversation._id,
      senderId: req.user._id,
      text: trimmed,
    });
    await message.save();

    // Update conversation lastMessage and unreadCount
    const otherUserId = participantIds.find((id) => id !== currentUserId);
    const currentUnread = conversation.unreadCount?.get(otherUserId) || 0;
    conversation.unreadCount = conversation.unreadCount || new Map();
    conversation.unreadCount.set(otherUserId, currentUnread + 1);
    conversation.lastMessage = {
      text: trimmed,
      senderId: req.user._id,
      createdAt: new Date(),
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    // Send push notification to recipient
    if (otherUserId) {
      const { sendPushToUser } = require('../utils/push');
      const senderUsername = req.user.username || 'Someone';
      const preview = trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed;
      sendPushToUser(
        otherUserId,
        senderUsername,
        preview,
        {
          type: 'message',
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
        }
      ).catch(() => {
        // Fail silently; push notifications are best-effort
      });
    }

    res.status(201).json({
      _id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId.toString(),
      text: message.text,
      createdAt: message.createdAt.toISOString(),
      read: message.read,
      storyId: message.storyId ? message.storyId.toString() : undefined,
      storyMediaUri: message.storyMediaUri || undefined,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark conversation as read
router.patch('/conversations/:conversationId/read', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const currentUserId = req.user._id.toString();
    const participantIds = conversation.participants.map((p) => (p._id ? p._id.toString() : p.toString()));
    if (!participantIds.includes(currentUserId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Mark all messages in this conversation as read for current user
    await Message.updateMany(
      {
        conversationId: conversation._id,
        senderId: { $ne: req.user._id },
        read: false,
      },
      { $set: { read: true } }
    );

    // Reset unread count
    conversation.unreadCount = conversation.unreadCount || new Map();
    conversation.unreadCount.set(currentUserId, 0);
    await conversation.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active users (users you follow or who follow you)
router.get('/active-users', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) return res.json([]);

    const followingIds = (currentUser.following || []).map((id) => id.toString());
    const followerIds = (currentUser.followers || []).map((id) => id.toString());
    const relatedIds = [...new Set([...followingIds, ...followerIds])];

    if (relatedIds.length === 0) return res.json([]);

    const users = await User.find({ _id: { $in: relatedIds } })
      .select('username avatar bio')
      .limit(20);

    const transformed = users.map((u) => ({
      _id: u._id.toString(),
      username: u.username,
      avatar: u.avatar || '',
      bio: u.bio || '',
    }));

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
