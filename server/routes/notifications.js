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
      .sort({ createdAt: -1 })
      .limit(100);

    const transformed = list.map((n) => {
      const from = n.fromUserId;
      const isFromPopulated = from && typeof from === 'object' && 'username' in from;
      const post = n.postId;
      const postImage = post && typeof post === 'object' && post.image ? post.image : undefined;
      return {
        id: n._id.toString(),
        type: n.type,
        username: isFromPopulated ? from.username : 'Unknown',
        avatar: isFromPopulated ? (from.avatar || '') : '',
        text: n.type === 'comment' && n.commentText
          ? `commented: "${n.commentText.length > 50 ? n.commentText.slice(0, 50) + '…' : n.commentText}"`
          : n.type === 'like'
            ? 'liked your post'
            : n.type === 'follow'
              ? 'started following you'
              : '',
        timestamp: n.createdAt ? new Date(n.createdAt).getTime() : 0,
        read: !!n.read,
        postId: n.postId ? (n.postId._id ? n.postId._id.toString() : n.postId.toString()) : undefined,
        postImage: postImage || undefined,
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
