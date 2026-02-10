import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ReelThumbnailPlaceholderProps = {
  width: number;
  height: number;
  borderRadius?: number;
};

/**
 * Animated placeholder shown while a reel thumbnail is loading.
 * Pulse/shimmer effect, no default image.
 */
const ReelThumbnailPlaceholder: React.FC<ReelThumbnailPlaceholderProps> = ({
  width,
  height,
  borderRadius = 0,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[styles.wrapper, { width, height, borderRadius }]}>
      <Animated.View style={[styles.bg, { width, height, borderRadius, opacity }]} />
      <View style={styles.iconWrap}>
        <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.95)" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bg: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#333',
  },
  iconWrap: {
    zIndex: 1,
  },
});

export default ReelThumbnailPlaceholder;
