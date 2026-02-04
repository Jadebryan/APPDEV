import React, { createContext, useState, useCallback, useContext } from 'react';

export type NotificationType = 'like' | 'comment' | 'follow';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  username: string;
  avatar?: string;
  text: string;
  timeAgo: string;
  timestamp: number; // for grouping (ms)
  read: boolean;
  postImage?: string;
  postId?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'like',
    username: 'trail_runner',
    avatar: 'https://i.pravatar.cc/150?img=1',
    text: 'liked your post',
    timeAgo: '2m ago',
    timestamp: Date.now() - 2 * 60 * 1000,
    read: false,
    postImage: 'https://images.unsplash.com/photo-1544966503-7cc75df67383?w=200',
    postId: '1',
  },
  {
    id: '2',
    type: 'comment',
    username: 'marathon_mike',
    avatar: 'https://i.pravatar.cc/150?img=2',
    text: 'commented: "Amazing run! 🔥"',
    timeAgo: '1h ago',
    timestamp: Date.now() - 60 * 60 * 1000,
    read: false,
    postId: '1',
  },
  {
    id: '3',
    type: 'follow',
    username: 'bike_lover',
    avatar: 'https://i.pravatar.cc/150?img=3',
    text: 'started following you',
    timeAgo: '3h ago',
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    read: true,
  },
  {
    id: '4',
    type: 'like',
    username: 'jqalin',
    avatar: 'https://i.pravatar.cc/150?img=4',
    text: 'liked your post',
    timeAgo: 'Yesterday',
    timestamp: Date.now() - 25 * 60 * 60 * 1000,
    read: true,
    postImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=200',
    postId: '2',
  },
];

interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshTimeAgo: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const updateTimeAgo = (ts: number): string => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 172800) return 'Yesterday';
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    if (sec < 2592000) return `${Math.floor(sec / 604800)}w ago`;
    return new Date(ts).toLocaleDateString();
  };

  const refreshTimeAgo = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, timeAgo: updateTimeAgo(n.timestamp) }))
    );
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
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
