const mongoose = require('mongoose');

const activeRunSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  distanceKm: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  path: [{ lat: Number, lng: Number, timestamp: Date }],
  lastLocation: { lat: Number, lng: Number, updatedAt: Date },
  shareLiveLocation: { type: Boolean, default: false },
  emergencyContact: { type: String, default: '' },
  sosTriggeredAt: { type: Date, default: null },
}, { timestamps: true });

activeRunSchema.index({ userId: 1, endedAt: 1 });

module.exports = mongoose.model('ActiveRun', activeRunSchema);
