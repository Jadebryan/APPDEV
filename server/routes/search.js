const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');

const router = express.Router();

// GET /api/search/users?q=term
// Search by username or email (case-insensitive, partial match)
router.get('/users', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json([]);

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const users = await User.find(
      {
        $or: [
          { username: regex },
          { email: regex },
        ],
      },
      '_id email username bio avatar followers following createdAt',
    )
      .limit(20)
      .lean();

    const transformed = users.map((u) => ({
      _id: u._id.toString(),
      email: u.email,
      username: u.username,
      bio: u.bio || '',
      avatar: u.avatar || '',
      followers: (u.followers || []).map((id) => id.toString()),
      following: (u.following || []).map((id) => id.toString()),
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt).toISOString(),
    }));

    res.json(transformed);
  } catch (error) {
    console.error('search/users error', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/search/tags?q=term
// Search for hashtags in post and reel captions
router.get('/tags', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json([]);

    // Remove # if present and normalize search term
    const searchTerm = q.replace(/^#/, '').toLowerCase();
    if (!searchTerm) return res.json([]);

    // Create regex to match hashtags (case-insensitive)
    // Matches #tag or #tagName where tag starts with searchTerm
    const tagRegex = new RegExp(`#${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\w]*`, 'i');

    // Find posts and reels that contain the hashtag in their caption
    const [posts, reels] = await Promise.all([
      Post.find({ caption: tagRegex }).select('caption').lean(),
      Reel.find({ caption: tagRegex }).select('caption').lean(),
    ]);

    // Extract all unique hashtags from matching posts/reels
    const tagCounts = new Map();

    const extractHashtags = (caption) => {
      if (!caption) return [];
      // Match hashtags: # followed by word characters
      const matches = caption.match(/#[\w]+/g) || [];
      return matches.map(tag => tag.toLowerCase().substring(1)); // Remove # and lowercase
    };

    // Count tags from posts
    posts.forEach(post => {
      const tags = extractHashtags(post.caption);
      tags.forEach(tag => {
        if (tag.startsWith(searchTerm)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    // Count tags from reels
    reels.forEach(reel => {
      const tags = extractHashtags(reel.caption);
      tags.forEach(tag => {
        if (tag.startsWith(searchTerm)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    // Convert to array and sort by post count (descending), then alphabetically
    const results = Array.from(tagCounts.entries())
      .map(([tag, postCount]) => ({
        tag,
        postCount,
      }))
      .sort((a, b) => {
        // Sort by post count first (descending)
        if (b.postCount !== a.postCount) {
          return b.postCount - a.postCount;
        }
        // Then alphabetically
        return a.tag.localeCompare(b.tag);
      })
      .slice(0, 20); // Limit to top 20 results

    res.json(results);
  } catch (error) {
    console.error('search/tags error', error);
    res.status(500).json({ error: 'Failed to search tags' });
  }
});

// GET /api/search/tags/trending
router.get('/tags/trending', async (_req, res) => {
  res.json([]);
});

// GET /api/search/trending
// Returns trending posts and reels sorted by popularity (likes)
router.get('/trending', async (req, res) => {
  try {
    // Get posts and reels, then sort by likes array length
    const [allPosts, allReels] = await Promise.all([
      Post.find()
        .populate('userId', 'username avatar bio')
        .lean(),
      Reel.find()
        .populate('userId', 'username avatar')
        .lean(),
    ]);

    // Sort by likes array length (descending)
    const posts = allPosts
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 30); // take more, filter later
    const reels = allReels
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 30);

    // Transform posts
    const transformedPosts = posts.map((post) => {
      const u = post.userId;
      const isPopulated = u && typeof u === 'object' && 'username' in u;
      const userObj = isPopulated
        ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '', bio: u.bio || '' }
        : { _id: '', username: 'Unknown', avatar: '', bio: '' };
      return {
        type: 'post',
        _id: post._id.toString(),
        userId: userObj._id,
        user: userObj,
        image: post.image || '',
        images: post.images || undefined,
        caption: post.caption || '',
        activityType: post.activityType,
        likes: (post.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
        likeCount: (post.likes || []).length,
        createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : new Date(post.createdAt).toISOString(),
      };
    });

    // Transform reels
    const transformedReels = reels.map((reel) => {
      const u = reel.userId;
      const isPopulated = u && typeof u === 'object' && 'username' in u;
      const userObj = isPopulated
        ? { _id: u._id.toString(), username: u.username, avatar: u.avatar || '' }
        : { _id: '', username: 'Unknown', avatar: '' };
      return {
        type: 'reel',
        _id: reel._id.toString(),
        userId: userObj._id,
        user: userObj,
        videoUri: reel.videoUri || '',
        caption: reel.caption || '',
        activityType: reel.activityType,
        likes: (reel.likes || []).map((l) => (l && l._id ? l._id.toString() : l.toString())),
        likeCount: (reel.likes || []).length,
        createdAt: reel.createdAt instanceof Date ? reel.createdAt.toISOString() : new Date(reel.createdAt).toISOString(),
      };
    });

    // Combine, filter by minimum likes (popularity), then sort by likeCount descending
    const MIN_LIKES = 3; // only feature content with at least 3 likes
    const combined = [...transformedPosts, ...transformedReels]
      .filter((item) => (item.likeCount || 0) >= MIN_LIKES)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 20); // Limit to top 20

    res.json(combined);
  } catch (error) {
    console.error('search/trending error', error);
    res.status(500).json({ error: 'Failed to get trending content' });
  }
});

// GET /api/search/users/suggested
// Returns suggested users based on friends of friends (Instagram-style)
// Requires authentication to show personalized suggestions
router.get('/users/suggested', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let currentUserId = null;
    
    // Get current user ID from token if authenticated
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.decode(token);
        if (decoded && decoded.userId) {
          currentUserId = decoded.userId;
        }
      } catch (e) {
        // Ignore auth errors
      }
    }

    // If not authenticated, return empty array (no personalized suggestions)
    if (!currentUserId) {
      return res.json([]);
    }

    const mongoose = require('mongoose');
    const currentUserObjId = mongoose.Types.ObjectId.isValid(currentUserId) 
      ? new mongoose.Types.ObjectId(currentUserId) 
      : currentUserId;

    // Get current user's following list
    const currentUser = await User.findById(currentUserObjId)
      .select('following')
      .lean();

    if (!currentUser || !currentUser.following || currentUser.following.length === 0) {
      // If user follows no one, return some random users (excluding themselves)
      const users = await User.find({ _id: { $ne: currentUserObjId } })
        .select('_id email username bio avatar followers following createdAt')
        .limit(10)
        .sort({ createdAt: -1 })
        .lean();

      const transformed = users.map((u) => ({
        _id: u._id.toString(),
        email: u.email,
        username: u.username,
        bio: u.bio || '',
        avatar: u.avatar || '',
        followers: (u.followers || []).map((id) => id.toString()),
        following: (u.following || []).map((id) => id.toString()),
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt).toISOString(),
      }));

      return res.json(transformed);
    }

    // Get users followed by people the current user follows (friends of friends)
    const followingIds = currentUser.following.map((id) => 
      mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
    );

    // Get all users that are followed by people in current user's following list
    const excludeIds = [currentUserObjId, ...followingIds];
    const friendsOfFriends = await User.find({
      _id: { $nin: excludeIds }, // Exclude current user and users already followed
      followers: { $in: followingIds }, // Users followed by people the current user follows
    })
      .select('_id email username bio avatar followers following createdAt')
      .lean();

    // Count mutual connections for each suggested user
    const suggestionsWithMutualCount = friendsOfFriends.map((user) => {
      const userFollowers = (user.followers || []).map((id) => 
        mongoose.Types.ObjectId.isValid(id) ? id.toString() : id.toString()
      );
      const mutualCount = followingIds.filter((fid) => 
        userFollowers.includes(fid.toString())
      ).length;

      return {
        user,
        mutualCount,
      };
    });

    // Sort by mutual connections (descending), then by follower count
    suggestionsWithMutualCount.sort((a, b) => {
      if (b.mutualCount !== a.mutualCount) {
        return b.mutualCount - a.mutualCount;
      }
      return (b.user.followers?.length || 0) - (a.user.followers?.length || 0);
    });

    // Take top 20 suggestions
    const topSuggestions = suggestionsWithMutualCount.slice(0, 20);

    const transformed = topSuggestions.map(({ user }) => ({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      avatar: user.avatar || '',
      followers: (user.followers || []).map((id) => id.toString()),
      following: (user.following || []).map((id) => id.toString()),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date(user.createdAt).toISOString(),
    }));

    res.json(transformed);
  } catch (error) {
    console.error('search/users/suggested error', error);
    res.status(500).json({ error: 'Failed to get suggested users' });
  }
});

module.exports = router;

