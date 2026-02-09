import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { notificationService } from '../services/api';
import { useAuth } from './AuthContext';

export type NotificationType = 'like' | 'comment' | 'follow' | 'reel_like' | 'mention' | 'tag';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  username: string;
  avatar?: string;
  text: string;
  timeAgo: string;
  timestamp: number;
  read: boolean;
  postImage?: string;
  postId?: string;
  reelId?: string;
}

function updateTimeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 172800) return 'Yesterday';
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}w ago`;
  return new Date(ts).toLocaleDateString();
}

function mapApiToItem(api: { id: string; type: NotificationType; username: string; avatar?: string; text: string; timestamp: number; read: boolean; postId?: string; postImage?: string; reelId?: string }): NotificationItem {
  return {
    id: api.id,
    type: api.type,
    username: api.username,
    avatar: api.avatar,
    text: api.text,
    timeAgo: updateTimeAgo(api.timestamp),
    timestamp: api.timestamp,
    read: api.read,
    postId: api.postId,
    postImage: api.postImage,
    reelId: api.reelId,
  };
}

interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshTimeAgo: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const list = await notificationService.getNotifications();
      setNotifications(list.map(mapApiToItem));
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    await loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refreshTimeAgo = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, timeAgo: updateTimeAgo(n.timestamp) }))
    );
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    notificationService.markAsRead(id).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notificationService.markAllAsRead().catch(() => {});
  }, []);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    refreshTimeAgo,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (ctx === undefined) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
