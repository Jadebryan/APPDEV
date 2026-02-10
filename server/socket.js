/**
 * Socket.io server for real-time: feed (posts, stories, reels), chats, notifications.
 * Clients join: user:${userId}, feed. Chat screens join: conversation:${conversationId}.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('No token'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (!userId) return;
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    socket.join('feed');
    socket.on('join_conversation', (conversationId) => {
      if (conversationId && typeof conversationId === 'string') {
        socket.join(`conversation:${conversationId}`);
      }
    });
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId && typeof conversationId === 'string') {
        socket.leave(`conversation:${conversationId}`);
      }
    });
    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call init(httpServer) first.');
  }
  return io;
}

module.exports = { init, getIO };
