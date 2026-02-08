const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendVerificationEmail');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const CODE_EXPIRY_MINUTES = 15;

function uniqueUsername(base) {
  const safe = (base || 'user').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20) || 'user';
  return safe;
}

async function ensureUniqueUsername(base) {
  let username = uniqueUsername(base);
  let suffix = 0;
  while (await User.findOne({ username })) {
    username = `${uniqueUsername(base)}${suffix}`;
    suffix += 1;
  }
  return username;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function toUserObject(user) {
  return {
    _id: user._id.toString(),
    email: user.email,
    username: user.username,
    bio: user.bio || '',
    avatar: user.avatar || '',
    followers: (user.followers || []).map(id => id.toString()),
    following: (user.following || []).map(id => id.toString()),
    savedPosts: (user.savedPosts || []).map(id => id.toString()),
    createdAt: user.createdAt.toISOString(),
  };
}

// Register – send verification code (no token until verified)
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }],
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const code = generateCode();
    const verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      username: username.trim(),
      isVerified: false,
      verificationCode: code,
      verificationCodeExpires,
    });
    await user.save();

    // Send email in background so registration responds quickly; if it fails, code is logged below
    sendVerificationEmail(user.email, code).catch((err) => {
      console.error('[Email] Send failed:', err.message);
      console.log('[Email] Verification code for', user.email, ':', code);
    });

    res.status(201).json({
      message: 'Verification code sent to your email',
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email – check code and issue token
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified. You can log in.' });
    }

    if (user.verificationCode !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (!user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: toUserObject(user),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'No account found with this email' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified. You can log in.' });
    }

    const code = generateCode();
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, code);

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password – send reset code by email (don't reveal if email exists)
const RESET_CODE_EXPIRY_MINUTES = 60;

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const code = generateCode();
      user.resetPasswordCode = code;
      user.resetPasswordExpires = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);
      await user.save();

      sendPasswordResetEmail(user.email, code).catch((err) => {
        console.error('[Email] Password reset send failed:', err.message);
        console.log('[Email] Password reset code for', user.email, ':', code);
      });
    }

    res.json({
      message: "If an account exists with this email, we've sent instructions to reset your password.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password – verify code and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ error: 'Reset code expired. Request a new one.' });
    }

    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resend password reset code
router.post('/resend-reset-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'No account found with this email' });
    }

    const code = generateCode();
    user.resetPasswordCode = code;
    user.resetPasswordExpires = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    sendPasswordResetEmail(user.email, code).catch((err) => {
      console.error('[Email] Password reset send failed:', err.message);
      console.log('[Email] Password reset code for', user.email, ':', code);
    });

    res.json({ message: 'Reset code sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login – reject if email not verified
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Sign in with Google.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        email: user.email,
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: toUserObject(user),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google login – body: { idToken } (preferred) or { accessToken }
router.post('/google', async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;
    let email, googleId, name;

    if (idToken) {
      const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!tokenRes.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
      const payload = await tokenRes.json();
      googleId = payload.sub;
      email = (payload.email || '').toLowerCase().trim();
      name = payload.name || payload.given_name || '';
    } else if (accessToken) {
      const url = 'https://www.googleapis.com/oauth2/v2/userinfo';
      const googRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!googRes.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
      const goog = await googRes.json();
      googleId = goog.id;
      email = (goog.email || '').toLowerCase().trim();
      name = goog.name || goog.given_name || '';
    } else {
      return res.status(400).json({ error: 'Google idToken or accessToken is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Google did not provide an email. Please allow email scope.' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      const username = await ensureUniqueUsername(name || email.split('@')[0]);
      user = new User({
        email,
        username,
        googleId,
        password: null,
        isVerified: true,
      });
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toUserObject(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
