const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() { return !this.facebookId && !this.googleId; },
    default: null,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  facebookId: { type: String, default: null, sparse: true },
  googleId: { type: String, default: null, sparse: true },
  bio: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
  goals: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    title: { type: String, required: true },
    targetDistance: Number,
    targetDuration: Number,
    createdAt: { type: Date, default: Date.now },
  }],
  savedRoutes: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    name: String,
    latitude: Number,
    longitude: Number,
    createdAt: { type: Date, default: Date.now },
  }],
  savedReels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel',
  }],
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: { type: String, default: null },
  verificationCodeExpires: { type: Date, default: null },
  resetPasswordCode: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  /** Expo push token for sending push notifications (e.g. "ExponentPushToken[xxx]") */
  expoPushToken: { type: String, default: null },
  /** Push notification preferences – server respects these before sending */
  notificationPreferences: {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follow: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: true },
    challenges: { type: Boolean, default: false },
  },
  /** Connected apps – connection state (tokens stored when OAuth is implemented) */
  connectedApps: {
    strava: { type: Boolean, default: false },
    garmin: { type: Boolean, default: false },
    appleHealth: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

// Hash password before saving (8 rounds = faster registration, still secure)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 8);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
