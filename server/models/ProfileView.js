const mongoose = require('mongoose');

const profileViewSchema = new mongoose.Schema({
  viewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  profileUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

profileViewSchema.index({ profileUserId: 1, createdAt: -1 });
profileViewSchema.index({ profileUserId: 1, viewerId: 1 });

module.exports = mongoose.model('ProfileView', profileViewSchema);
