/**
 * Check if a recent duplicate notification already exists (e.g. same user liked same post within window).
 * Used to avoid bombarding the recipient with repeated notifications from rapid repeated actions.
 * @param {Model} Notification - Mongoose Notification model
 * @param {object} opts - { toUserId, fromUserId, type, postId?, reelId? }
 * @param {number} [windowMs=120000] - Consider duplicates within this many ms (default 2 minutes)
 * @returns {Promise<boolean>} true if a duplicate exists
 */
async function hasRecentDuplicateNotification(Notification, opts, windowMs = 120000) {
  const { toUserId, fromUserId, type, postId, reelId } = opts;
  const query = {
    toUserId,
    fromUserId,
    type,
    createdAt: { $gte: new Date(Date.now() - windowMs) },
  };
  if (postId != null) query.postId = postId;
  if (reelId != null) query.reelId = reelId;
  const existing = await Notification.findOne(query).lean();
  return !!existing;
}

module.exports = { hasRecentDuplicateNotification };
