import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SyncIndicatorProps {
  isSyncing: boolean;
}

export function SyncIndicator({ isSyncing }: SyncIndicatorProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [isSyncing, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!isSyncing) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="sync-outline" size={14} color="#6C63FF" />
      </Animated.View>
      <Text style={styles.text}>Sync…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderRadius: 20,
  },
  text: { fontSize: 11, color: '#6C63FF', fontWeight: '600' },
});
