/**
 * Socket.io client for real-time: feed (posts, stories, reels), chats, notifications.
 * Server URL = API base URL without /api (e.g. http://localhost:3000/api -> http://localhost:3000).
 */
import { io as ioClient, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

function getSocketServerUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const base = process.env.EXPO_PUBLIC_API_URL;
    return base.replace(/\/api\/?$/, '') || base;
  }
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }
  return 'https://your-production-url.com';
}

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    socket.auth = { token };
    return socket;
  }
  const url = getSocketServerUrl();
  socket = ioClient(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocketServerUrlForLog(): string {
  return getSocketServerUrl();
}
