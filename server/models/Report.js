const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
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
  reason: {
    type: String,
    enum: ['spam', 'inappropriate', 'harassment', 'other'],
    required: true,
  },
  comment: { type: String, default: '' },
}, { timestamps: true });

reportSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
