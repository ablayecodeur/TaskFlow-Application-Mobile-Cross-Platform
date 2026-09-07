import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types';
import { Badge } from '../ui/Badge';
import {
  getPriorityColor,
  getStatusColor,
  getStatusLabel,
  getPriorityLabel,
  formatRelativeDate,
  truncate,
} from '../../utils';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, onPress, onToggleComplete, onDelete }: TaskCardProps) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(task.status === 'completed' ? 1 : 0);
  const opacity = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleToggle = () => {
    checkScale.value = withSpring(task.status === 'completed' ? 0 : 1);
    if (task.status !== 'completed') {
      opacity.value = withTiming(0.6, { duration: 150 }, () => {
        opacity.value = withTiming(1, { duration: 150 });
        runOnJS(onToggleComplete)();
      });
    } else {
      onToggleComplete();
    }
  };

  const isCompleted = task.status === 'completed';
  const isOverdue = Boolean(
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    !isCompleted
  );

  return (
    <Animated.View style={[styles.wrapper, cardStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {/* Priority stripe */}
        <View
          style={[styles.stripe, { backgroundColor: getPriorityColor(task.priority) }]}
        />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleToggle}
              style={[styles.checkbox, isCompleted && styles.checkboxDone]}
              activeOpacity={0.7}
            >
              {isCompleted && (
                <Animated.View style={checkStyle}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </Animated.View>
              )}
            </TouchableOpacity>

            <Text
              style={[styles.title, isCompleted && styles.titleDone]}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {task.description && (
            <Text style={styles.description} numberOfLines={2}>
              {truncate(task.description, 100)}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.badges}>
              <Badge
                label={getPriorityLabel(task.priority)}
                color={getPriorityColor(task.priority)}
                size="sm"
              />
              <Badge
                label={getStatusLabel(task.status)}
                color={getStatusColor(task.status)}
                size="sm"
              />
            </View>

            <View style={styles.meta}>
              {task.syncStatus !== 'synced' && (
                <Ionicons name="cloud-upload-outline" size={13} color="#6B7280" style={styles.syncIcon} />
              )}
              {task.dueDate && (
                <Text style={[styles.dueDate, isOverdue && styles.dueDateOverdue]}>
                  {isOverdue && <Ionicons name="warning-outline" size={11} color="#FF4757" />}
                  {' '}{formatRelativeDate(task.dueDate)}
                </Text>
              )}
            </View>
          </View>

          {/* Tags */}
          {task.tags.length > 0 && (
            <View style={styles.tags}>
              {task.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  card: {
    backgroundColor: '#141828',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E2440',
  },
  stripe: { width: 4 },
  content: { flex: 1, padding: 14 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3D4466',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxDone: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: '#F1F5F9', lineHeight: 22 },
  titleDone: { color: '#6B7280', textDecorationLine: 'line-through' },
  deleteBtn: { padding: 2 },

  description: { fontSize: 13, color: '#94A3B8', lineHeight: 19, marginBottom: 10 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncIcon: { opacity: 0.6 },
  dueDate: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  dueDateOverdue: { color: '#FF4757' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#1E2440', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, color: '#7C85B0', fontWeight: '500' },
});
