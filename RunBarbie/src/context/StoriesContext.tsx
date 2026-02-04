import React, { createContext, useContext, useMemo, useState } from 'react';
import { ActivityType, User } from '../types';
import { useAuth } from './AuthContext';

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
  addOrUpdateMyStory: (input: {
    mediaUri: string;
    caption?: string;
    activityType?: ActivityType;
  }) => void;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

// Some mock stories from other users so the row isn't empty
const seedStories: (currentUser?: User | null) => Story[] = (currentUser) => {
  const now = Date.now();
  const base: Story[] = [
    {
      id: 's1',
      userId: '1',
      username: 'trail_runner',
      avatar: 'https://i.pravatar.cc/150?img=4',
      mediaUri: 'https://images.unsplash.com/photo-1528701800489-20be3c30c1d5?w=800',
      caption: 'Sunrise miles on the ridge 🌄',
      activityType: 'run',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 's2',
      userId: '2',
      username: 'marathon_mike',
      avatar: 'https://i.pravatar.cc/150?img=5',
      mediaUri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
      caption: 'Tempo Tuesday in the park.',
      activityType: 'run',
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // We don't create a story for the current user by default; they add it
  return base;
};

export const StoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>(() => seedStories(user));

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

