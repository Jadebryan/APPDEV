const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);

// Middleware – allow large bodies for base64 image/video uploads (Cloudinary accepts up to 10MB image; base64 ~1.37x)
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Catch body-parser "request entity too large" and return JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'Image is too large. Try a smaller photo or compress it.' });
  }
  next(err);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api/chats', require('./routes/chats'));

// MongoDB connection – must complete before accepting requests (avoids "buffering timed out" and auth failures)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/runbarbie';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 = accept connections from network (e.g. phone)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    const { init: initSocket } = require('./socket');
    const io = initSocket(httpServer);
    app.set('io', io);
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });
