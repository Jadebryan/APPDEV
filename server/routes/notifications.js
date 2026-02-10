const express = require('express');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all notifications for current user (auth)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await Notification.find({ toUserId: req.user._id })
      .populate('fromUserId', 'username avatar')
      .populate('postId', 'image')
      .populate('reelId', 'videoUri')
      .sort({ createdAt: -1 })
      .limit(100);

    const transformed = list.map((n) => {
      const from = n.fromUserId;
      const isFromPopulated = from && typeof from === 'object' && 'username' in from;
      const post = n.postId;
      const postImage = post && typeof post === 'object' && post.image ? post.image : undefined;
      const reel = n.reelId;
      const reelIdStr = n.reelId ? (n.reelId._id ? n.reelId._id.toString() : n.reelId.toString()) : undefined;
      let text = '';
      if (n.type === 'comment' && n.commentText) {
        text = `commented: "${n.commentText.length > 50 ? n.commentText.slice(0, 50) + '…' : n.commentText}"`;
      } else if (n.type === 'like') {
        text = 'liked your post';
      } else if (n.type === 'reel_like') {
        text = 'liked your reel';
      } else if (n.type === 'story_like') {
        text = 'liked your story';
      } else if (n.type === 'follow') {
        text = 'started following you';
      } else if (n.type === 'mention' && n.commentText) {
        text = `mentioned you: "${n.commentText.length > 50 ? n.commentText.slice(0, 50) + '…' : n.commentText}"`;
      } else if (n.type === 'mention') {
        text = 'mentioned you in a comment';
      } else if (n.type === 'tag') {
        text = 'tagged you in a post';
      } else if (n.type === 'story_reply' && n.commentText) {
        text = `replied to your story: "${n.commentText.length > 50 ? n.commentText.slice(0, 50) + '…' : n.commentText}"`;
      } else if (n.type === 'story_reply') {
        text = 'replied to your story';
      }
      return {
        id: n._id.toString(),
        type: n.type,
        username: isFromPopulated ? from.username : 'Unknown',
        avatar: isFromPopulated ? (from.avatar || '') : '',
        userId: isFromPopulated && from._id ? from._id.toString() : undefined,
        text,
        timestamp: n.createdAt ? new Date(n.createdAt).getTime() : 0,
        read: !!n.read,
        postId: n.postId ? (n.postId._id ? n.postId._id.toString() : n.postId.toString()) : undefined,
        postImage: postImage || undefined,
        reelId: reelIdStr || undefined,
      };
    });

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read (auth) – must be before /:id/read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { toUserId: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark one as read (auth)
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const n = await Notification.findOne({
      _id: req.params.id,
      toUserId: req.user._id,
    });
    if (!n) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    n.read = true;
    await n.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
