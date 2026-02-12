const express = require('express');
const ActiveRun = require('../models/ActiveRun');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Start a new run
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { shareLiveLocation, emergencyContact } = req.body;

    // End any existing active run
    await ActiveRun.updateMany(
      { userId, endedAt: null },
      { $set: { endedAt: new Date() } }
    );

    const run = await ActiveRun.create({
      userId,
      shareLiveLocation: !!shareLiveLocation,
      emergencyContact: typeof emergencyContact === 'string' ? emergencyContact.trim() : '',
      path: [],
      lastLocation: null,
    });

    res.json({
      runId: run._id.toString(),
      startedAt: run.startedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get run history (completed runs only)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const runs = await ActiveRun.find({ userId, endedAt: { $ne: null } })
      .sort({ endedAt: -1 })
      .limit(limit)
      .select('startedAt endedAt distanceKm durationSeconds path sosTriggeredAt')
      .lean();

    const list = runs.map((r) => ({
      id: r._id.toString(),
      startedAt: r.startedAt?.toISOString?.() || null,
      endedAt: r.endedAt?.toISOString?.() || null,
      distanceKm: r.distanceKm ?? 0,
      durationSeconds: r.durationSeconds ?? 0,
      path: r.path || [],
      sosTriggeredAt: r.sosTriggeredAt?.toISOString?.() || null,
    }));

    res.json({ runs: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update live location during run
router.patch('/:runId/location', authMiddleware, async (req, res) => {
  try {
    const { runId } = req.params;
    const { lat, lng } = req.body;
    const userId = req.user._id;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const run = await ActiveRun.findOne({ _id: runId, userId, endedAt: null });
    if (!run) return res.status(404).json({ error: 'Active run not found' });

    const point = { lat, lng, timestamp: new Date() };
    run.path.push(point);
    run.lastLocation = { lat, lng, updatedAt: new Date() };
    if (run.path.length > 500) run.path = run.path.slice(-500);
    await run.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End run
router.patch('/:runId/end', authMiddleware, async (req, res) => {
  try {
    const { runId } = req.params;
    const { distanceKm, durationSeconds } = req.body;
    const userId = req.user._id;

    const run = await ActiveRun.findOne({ _id: runId, userId, endedAt: null });
    if (!run) return res.status(404).json({ error: 'Active run not found' });

    run.endedAt = new Date();
    if (typeof distanceKm === 'number') run.distanceKm = distanceKm;
    if (typeof durationSeconds === 'number') run.durationSeconds = durationSeconds;
    await run.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger SOS - share location with emergency contact
router.post('/:runId/sos', authMiddleware, async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user._id;

    const run = await ActiveRun.findOne({ _id: runId, userId, endedAt: null });
    if (!run) return res.status(404).json({ error: 'Active run not found' });

    run.sosTriggeredAt = new Date();
    await run.save();

    const user = await User.findById(userId).select('username');
    const loc = run.lastLocation || (run.path.length ? run.path[run.path.length - 1] : null);
    const mapsUrl = loc
      ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
      : 'Location unavailable';

    // In production: send SMS to emergency contact, push notification, etc.
    // For now we return the data so the app can open SMS/call
    res.json({
      ok: true,
      emergencyContact: run.emergencyContact || '',
      location: loc ? { lat: loc.lat, lng: loc.lng } : null,
      mapsUrl,
      username: user?.username || 'Runner',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get live location of a user's active run (for emergency contact viewing - would need auth)
router.get('/live/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const run = await ActiveRun.findOne({
      userId,
      endedAt: null,
      shareLiveLocation: true,
    }).select('lastLocation startedAt');

    if (!run || !run.lastLocation) {
      return res.json({ active: false });
    }

    res.json({
      active: true,
      lat: run.lastLocation.lat,
      lng: run.lastLocation.lng,
      updatedAt: run.lastLocation.updatedAt,
      startedAt: run.startedAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
