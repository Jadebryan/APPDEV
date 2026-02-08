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
}

interface StoriesContextType {
  stories: Story[];
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

function mapApiToStory(api: { id: string; userId: string; username: string; avatar?: string; mediaUri: string; caption?: string; activityType?: string; createdAt: string }): Story {
  return {
    id: api.id,
    userId: api.userId,
    username: api.username,
    avatar: api.avatar,
    mediaUri: api.mediaUri,
    caption: api.caption,
    activityType: api.activityType as ActivityType | undefined,
    createdAt: api.createdAt,
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

  const myStory = useMemo(
    () => (user ? stories.find((s) => s.userId === user._id) : undefined),
    [stories, user],
  );

  const value: StoriesContextType = {
    stories,
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

