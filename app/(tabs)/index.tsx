import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTaskStore } from '../../src/store/taskStore';
import { useSync } from '../../src/hooks/useSync';
import { StatsCard } from '../../src/components/common/StatsCard';
import { TaskCard } from '../../src/components/common/TaskCard';
import { SyncIndicator } from '../../src/components/common/SyncIndicator';
import { scheduleSync } from '../../src/sync/syncEngine';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { tasks, stats, isLoading, loadTasks, toggleComplete, removeTask } = useTaskStore();
  const { sync, isSyncing } = useSync();

  useEffect(() => {
    if (user) {
      loadTasks(user.id);
      scheduleSync(user.id, 500);
    }
  }, [user, loadTasks]);

  const urgentTasks = tasks
    .filter((t) => t.priority === 'urgent' && t.status !== 'completed')
    .slice(0, 3);

  const recentTasks = tasks
    .filter((t) => t.status !== 'completed')
    .slice(0, 5);

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => user && loadTasks(user.id)}
            tintColor="#6C63FF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name.split(' ')[0]} 👋
            </Text>
            <Text style={styles.date}>{formatToday()}</Text>
          </View>
          <View style={styles.headerRight}>
            <SyncIndicator isSyncing={isSyncing} />
            <TouchableOpacity onPress={sync} style={styles.syncBtn} disabled={isSyncing}>
              <Ionicons name="refresh-outline" size={20} color="#6C63FF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress banner */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progression globale</Text>
            <Text style={styles.progressPct}>{completionRate}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[styles.progressBarFill, { width: `${completionRate}%` as any }]}
            />
          </View>
          <Text style={styles.progressSub}>
            {stats.completed} sur {stats.total} tâches complétées
          </Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.statsRow}>
          <StatsCard
            label="En attente"
            value={stats.pending}
            icon="time-outline"
            color="#FFB347"
          />
          <StatsCard
            label="En cours"
            value={stats.inProgress}
            icon="play-circle-outline"
            color="#6C63FF"
          />
          <StatsCard
            label="En retard"
            value={stats.overdue}
            icon="alert-circle-outline"
            color="#FF4757"
            subtitle={stats.overdue > 0 ? 'Action requise' : undefined}
          />
        </Animated.View>

        {/* Urgent tasks */}
        {urgentTasks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200)}>
            <SectionHeader title="Urgents" icon="warning" color="#FF4757" />
            {urgentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggleComplete={() => toggleComplete(task.id)}
                onDelete={() => removeTask(task.id)}
              />
            ))}
          </Animated.View>
        )}

        {/* Recent tasks */}
        {recentTasks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250)}>
            <SectionHeader title="À faire" icon="list" color="#6C63FF" onSeeAll={() => router.push('/(tabs)/tasks')} />
            {recentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggleComplete={() => toggleComplete(task.id)}
                onDelete={() => removeTask(task.id)}
              />
            ))}
          </Animated.View>
        )}

        {tasks.length === 0 && !isLoading && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#2D3352" />
            <Text style={styles.emptyTitle}>Aucune tâche</Text>
            <Text style={styles.emptySub}>
              Commencez par créer votre première tâche
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <Text style={styles.emptyBtnText}>Créer une tâche</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  icon,
  color,
  onSeeAll,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLeft}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatToday(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.3 },
  date: { fontSize: 13, color: '#6B7280', marginTop: 3, textTransform: 'capitalize' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(108,99,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCard: {
    backgroundColor: '#141828',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E2440',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressTitle: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  progressPct: { fontSize: 22, fontWeight: '800', color: '#6C63FF' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1E2440',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  progressSub: { fontSize: 12, color: '#6B7280' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9' },
  seeAll: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#4A5270' },
  emptySub: { fontSize: 14, color: '#2D3352', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bottomPad: { height: 100 },
});
