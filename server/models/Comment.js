const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  /** Optional: reply to another comment (threaded replies) */
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  /** Users who liked this comment */
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
