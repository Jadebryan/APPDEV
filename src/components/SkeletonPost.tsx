import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH;

/**
 * Skeleton placeholder for a post card (shimmer effect)
 */
const SkeletonPost: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.circle, { opacity }]} />
        <View style={styles.headerRight}>
          <Animated.View style={[styles.lineShort, { opacity }]} />
          <Animated.View style={[styles.lineMedium, { opacity }]} />
        </View>
      </View>
      <Animated.View style={[styles.imageBlock, { opacity }]} />
      <View style={styles.actions}>
        <Animated.View style={[styles.iconBlock, { opacity }]} />
        <Animated.View style={[styles.iconBlock, { opacity }]} />
        <Animated.View style={[styles.iconBlock, { opacity }]} />
      </View>
      <Animated.View style={[styles.lineLong, { opacity }]} />
      <Animated.View style={[styles.lineFull, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DBDBDB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  headerRight: {
    flex: 1,
    gap: 6,
  },
  lineShort: {
    height: 12,
    width: 80,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  lineMedium: {
    height: 10,
    width: 120,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  imageBlock: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#E0E0E0',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 16,
  },
  iconBlock: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  lineLong: {
    height: 12,
    width: 120,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
    marginBottom: 6,
  },
  lineFull: {
    height: 14,
    width: '90%',
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
});

export default SkeletonPost;
