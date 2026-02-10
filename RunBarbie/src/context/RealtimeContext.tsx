import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { storage } from '../utils/storage';

export type RealtimeEvent =
  | 'post:new'
  | 'story:new'
  | 'reel:new'
  | 'message:new'
  | 'notification:new'
  | 'conversation:updated';

type Listener = (payload: unknown) => void;

interface RealtimeContextType {
  connected: boolean;
  subscribe: (event: RealtimeEvent, listener: Listener) => () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Map<RealtimeEvent, Set<Listener>>>(new Map());
  const socketRef = useRef<ReturnType<typeof getSocket>>(null);

  const subscribe = useCallback((event: RealtimeEvent, listener: Listener) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(listener);
    return () => {
      listenersRef.current.get(event)?.delete(listener);
    };
  }, []);

  const emitToListeners = useCallback((event: RealtimeEvent, payload: unknown) => {
    listenersRef.current.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.warn('[Realtime] Listener error:', e);
      }
    });
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    const s = getSocket();
    if (s?.connected) s.emit('join_conversation', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    const s = getSocket();
    if (s?.connected) s.emit('leave_conversation', conversationId);
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
      socketRef.current = null;
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const token = await storage.getToken();
        if (!token || !mounted) return;
        const socket = connectSocket(token);
        socketRef.current = socket;
        socket.on('connect', () => {
          if (mounted) setConnected(true);
        });
        socket.on('disconnect', () => {
          if (mounted) setConnected(false);
        });
        socket.on('post:new', (payload) => emitToListeners('post:new', payload));
        socket.on('story:new', (payload) => emitToListeners('story:new', payload));
        socket.on('reel:new', (payload) => emitToListeners('reel:new', payload));
        socket.on('message:new', (payload) => emitToListeners('message:new', payload));
        socket.on('notification:new', (payload) => emitToListeners('notification:new', payload));
        socket.on('conversation:updated', (payload) => emitToListeners('conversation:updated', payload));
      } catch (e) {
        console.warn('[Realtime] Connect error:', e);
      }
    })();
    return () => {
      mounted = false;
      disconnectSocket();
      setConnected(false);
      socketRef.current = null;
    };
  }, [user?._id, emitToListeners]);

  const value: RealtimeContextType = {
    connected,
    subscribe,
    joinConversation,
    leaveConversation,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime(): RealtimeContextType {
  const ctx = useContext(RealtimeContext);
  if (ctx === undefined) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}
