import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityType } from '../types';
import { useAuth } from './AuthContext';
import { storyService } from '../services/api';

export interface Story {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUri: string;
  caption?: string;
  activityType?: ActivityType;
  createdAt: string;
  viewCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
}

interface StoriesContextType {
  stories: Story[];
  /** All of the current user's stories (newest first), for IG-style multi-slide */
  myStories: Story[];
  /** First/latest story for "Your story" ring preview; backward compat */
  myStory?: Story;
  loading: boolean;
  refreshStories: () => Promise<void>;
  addOrUpdateMyStory: (input: {
    mediaUri: string;
    caption?: string;
    activityType?: ActivityType;
  }) => void;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

function mapApiToStory(api: {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUri: string;
  caption?: string;
  activityType?: string;
  createdAt: string;
  viewCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
}): Story {
  return {
    id: api.id,
    userId: api.userId,
    username: api.username,
    avatar: api.avatar,
    mediaUri: api.mediaUri,
    caption: api.caption,
    activityType: api.activityType as ActivityType | undefined,
    createdAt: api.createdAt,
    viewCount: api.viewCount,
    likeCount: api.likeCount,
    likedByMe: api.likedByMe,
  };
}

export const StoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    try {
      const list = await storyService.getStories();
      setStories(list.map(mapApiToStory));
    } catch (error) {
      console.error('Error loading stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const refreshStories = useCallback(async () => {
    setLoading(true);
    await loadStories();
  }, [loadStories]);

  const addOrUpdateMyStory: StoriesContextType['addOrUpdateMyStory'] = ({
    mediaUri,
    caption,
    activityType,
  }) => {
    if (!user?._id) return;

    setStories((prev) => {
      const others = prev.filter((s) => s.userId !== user._id);
      const newStory: Story = {
        id: `me-${Date.now()}`,
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        mediaUri,
        caption,
        activityType,
        createdAt: new Date().toISOString(),
      };
      return [newStory, ...others];
    });
  };

  const myStories = useMemo(
    () =>
      user
        ? stories
            .filter((s) => s.userId === user._id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [stories, user],
  );

  const myStory = useMemo(() => (myStories.length > 0 ? myStories[0] : undefined), [myStories]);

  // Only show stories from users the current user follows, plus their own stories.
  const visibleStories = useMemo(
    () =>
      stories.filter((s) => {
        if (!user) return true;
        if (s.userId === user._id) return true;
        return (user.following ?? []).includes(s.userId);
      }),
    [stories, user],
  );

  const value: StoriesContextType = {
    stories: visibleStories,
    myStories,
    myStory,
    loading,
    refreshStories,
    addOrUpdateMyStory,
  };

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
};

export const useStories = (): StoriesContextType => {
  const ctx = useContext(StoriesContext);
  if (!ctx) {
    throw new Error('useStories must be used within StoriesProvider');
  }
  return ctx;
};

