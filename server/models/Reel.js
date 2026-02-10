const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  videoUri: {
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
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  commentCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Reel', reelSchema);
