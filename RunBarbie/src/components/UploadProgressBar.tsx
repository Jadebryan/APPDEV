import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUpload } from '../context/UploadContext';

const LABELS: Record<string, string> = {
  post: 'Uploading post',
  reel: 'Uploading reel',
  story: 'Uploading story',
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  post: 'image-outline',
  reel: 'videocam-outline',
  story: 'camera-outline',
};

/**
 * Inline upload progress bar – sits under the story section in the feed.
 * Shown when post/reel/story is uploading in the background.
 */
const UploadProgressBar: React.FC = () => {
  const { upload } = useUpload();

  if (!upload.active || !upload.type) return null;

  const label = LABELS[upload.type] || 'Uploading...';
  const icon = ICONS[upload.type] || 'cloud-upload-outline';
  const showPct = upload.progress >= 0 && upload.progress < 100;

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={16} color="#0095F6" />
      </View>
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {showPct && (
            <Text style={styles.percent}>{upload.progress}%</Text>
          )}
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, upload.progress))}%` }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,149,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  percent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0095F6',
  },
  barBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#0095F6',
    borderRadius: 3,
  },
});

export default UploadProgressBar;
