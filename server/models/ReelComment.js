const mongoose = require('mongoose');

const reelCommentSchema = new mongoose.Schema(
  {
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReelComment',
      default: null,
    },
  },
  { timestamps: true }
);

reelCommentSchema.index({ reelId: 1, createdAt: -1 });
reelCommentSchema.index({ parentId: 1 });

module.exports = mongoose.model('ReelComment', reelCommentSchema);
