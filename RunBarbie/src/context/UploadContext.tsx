import React, { createContext, useState, useCallback, useContext } from 'react';
import { postService, uploadService, reelService, storyService } from '../services/api';
import { useToast } from './ToastContext';
import { useStories } from './StoriesContext';
import { convertImageToBase64 } from '../utils/imageUtils';
import type { ActivityType } from '../types';
import type { PostLocation } from '../types';

export type UploadType = 'post' | 'reel' | 'story' | null;

interface UploadState {
  active: boolean;
  type: UploadType;
  progress: number;
}

interface UploadContextType {
  upload: UploadState;
  runPostUpload: (payload: {
    imageUris: string[];
    caption: string;
    activityType: ActivityType;
    distance?: number;
    duration?: number;
    location?: PostLocation;
  }) => void;
  runReelUpload: (payload: { videoUri: string; caption: string; activityType: ActivityType; trimStartTime?: number; trimEndTime?: number }) => void;
  runStoryUpload: (payload: { imageUri: string; caption: string; activityType: ActivityType }) => void;
}

const defaultState: UploadState = { active: false, type: null, progress: 0 };

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { refreshStories } = useStories();
  const [upload, setUpload] = useState<UploadState>(defaultState);

  const setProgress = useCallback((progress: number) => {
    setUpload((prev) => (prev.active ? { ...prev, progress } : prev));
  }, []);

  const runPostUpload = useCallback(
    async (payload: {
      imageUris: string[];
      caption: string;
      activityType: ActivityType;
      distance?: number;
      duration?: number;
      location?: PostLocation;
    }) => {
      setUpload({ active: true, type: 'post', progress: 0 });
      try {
        const imageUrls: string[] = [];
        const total = payload.imageUris.length;
        for (let i = 0; i < total; i++) {
          const base64 = await convertImageToBase64(payload.imageUris[i]);
          const url = await uploadService.uploadImage(base64);
          imageUrls.push(url);
          setProgress(Math.round(((i + 1) / total) * 90));
        }
        await postService.createPost({
          images: imageUrls,
          caption: payload.caption,
          activityType: payload.activityType,
          distance: payload.distance,
          duration: payload.duration,
          location: payload.location,
        });
        setProgress(100);
        setTimeout(() => {
          setUpload(defaultState);
          showToast('Post shared', 'success');
        }, 300);
      } catch (e: any) {
        setUpload(defaultState);
        showToast(e?.message || 'Failed to share post', 'error');
      }
    },
    [showToast, setProgress]
  );

  const runReelUpload = useCallback(
    async (payload: { videoUri: string; caption: string; activityType: ActivityType; trimStartTime?: number; trimEndTime?: number }) => {
      setUpload({ active: true, type: 'reel', progress: 0 });
      try {
        // Upload video with trim parameters
        const videoUrl = await uploadService.uploadVideo(
          payload.videoUri, 
          (percent) => {
            setProgress(Math.round(percent * 0.9));
          },
          payload.trimStartTime !== undefined && payload.trimEndTime !== undefined
            ? { startTime: payload.trimStartTime, endTime: payload.trimEndTime }
            : undefined
        );
        await reelService.createReel({
          videoUri: videoUrl,
          caption: payload.caption.trim() || 'No caption',
          activityType: payload.activityType,
        });
        setProgress(100);
        setTimeout(() => {
          setUpload(defaultState);
          showToast('Reel shared', 'success');
        }, 300);
      } catch (e: any) {
        setUpload(defaultState);
        showToast(e?.message || 'Failed to share reel', 'error');
      }
    },
    [showToast, setProgress]
  );

  const runStoryUpload = useCallback(
    async (payload: { imageUri: string; caption: string; activityType: ActivityType }) => {
      setUpload({ active: true, type: 'story', progress: 0 });
      try {
        const base64 = await convertImageToBase64(payload.imageUri);
        setProgress(30);
        const mediaUri = await uploadService.uploadStoryImage(base64);
        setProgress(80);
        await storyService.createStory({ mediaUri, caption: payload.caption, activityType: payload.activityType });
        setProgress(100);
        setTimeout(async () => {
          setUpload(defaultState);
          showToast('Story shared', 'success');
          await refreshStories();
        }, 300);
      } catch (e: any) {
        setUpload(defaultState);
        showToast(e?.message || 'Failed to share story', 'error');
      }
    },
    [showToast, setProgress, refreshStories]
  );

  const value: UploadContextType = {
    upload,
    runPostUpload,
    runReelUpload,
    runStoryUpload,
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

export const useUpload = (): UploadContextType => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
};
