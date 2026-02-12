/**
 * Send a push notification via Expo Push API.
 * @param {string} to - Expo push token (e.g. ExponentPushToken[xxx])
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data] - Optional data payload (e.g. { postId, type: 'like' })
 * @returns {Promise<{ ok: boolean }>} - Resolves when request is sent (does not guarantee delivery)
 */
async function sendExpoPush(to, title, body, data = {}) {
  if (!to || typeof to !== 'string' || !to.startsWith('ExponentPushToken[')) {
    return { ok: false };
  }
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        title: title || 'Run Barbie',
        body: body || '',
        data: typeof data === 'object' ? data : {},
        sound: 'default',
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn('[push] Expo API error:', response.status, text);
      return { ok: false };
    }
    const json = await response.json();
    const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
    if (ticket && ticket.status === 'error') {
      console.warn('[push] Expo ticket error:', ticket.message || ticket);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[push] send failed:', err.message);
    return { ok: false };
  }
}

/** Map push type to notification preference key */
const TYPE_TO_PREF = {
  like: 'likes',
  reel_like: 'likes',
  story_like: 'likes',
  comment: 'comments',
  mention: 'comments',
  tag: 'comments',
  story_reply: 'comments',
  follow: 'follow',
  message: 'messages',
};

/**
 * Send a push notification to a user by their MongoDB _id.
 * Fetches the user's expoPushToken and notification preferences.
 * Respects user preferences – only sends if the preference for this type is enabled.
 * @param {object} userId - Mongoose ObjectId of the recipient user
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data] - Optional data payload (must include type for pref check)
 */
async function sendPushToUser(userId, title, body, data = {}) {
  if (!userId) return;
  try {
    const User = require('../models/User');
    const user = await User.findById(userId)
      .select('expoPushToken notificationPreferences')
      .lean();
    if (!user || !user.expoPushToken) return;

    const pushType = data && data.type;
    const prefKey = pushType && TYPE_TO_PREF[pushType];
    if (prefKey && user.notificationPreferences && user.notificationPreferences[prefKey] === false) {
      return; // User disabled this notification type
    }

    await sendExpoPush(user.expoPushToken, title, body, data);
  } catch (err) {
    console.warn('[push] sendPushToUser failed:', err.message);
  }
}

module.exports = { sendExpoPush, sendPushToUser };
