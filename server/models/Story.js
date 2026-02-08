const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mediaUri: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  activityType: {
    type: String,
    enum: ['run', 'hike', 'cycle', 'walk', 'other'],
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Story', storySchema);
