const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  image: {
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
    required: true,
  },
  distance: {
    type: Number, // in km
  },
  duration: {
    type: Number, // in minutes
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Post', postSchema);
