import { useCallback, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { runSync, scheduleSync } from '../sync/syncEngine';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { sendLocalNotification } from '../notifications/notificationService';

export function useSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const isSyncing = useTaskStore((s) => s.isSyncing);
  const lastSyncRef = useRef<Date | null>(null);

  const sync = useCallback(async () => {
    if (!userId || isSyncing) return;
    try {
      const result = await runSync(userId);
      lastSyncRef.current = new Date();

      const total = result.created + result.updated + result.deleted;
      if (total > 0) {
        await sendLocalNotification(
          'Synchronisation terminée',
          `${result.created} créées · ${result.updated} mises à jour · ${result.deleted} supprimées`,
          { type: 'sync_complete' }
        );
      }
    } catch {
      // Silently fail — will retry on next trigger
    }
  }, [userId, isSyncing]);

  // Sync on network reconnect
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        scheduleSync(userId, 2000);
      }
    });

    return unsubscribe;
  }, [userId]);

  // Sync on app foreground
  useEffect(() => {
    if (!userId) return;

    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        const lastSync = lastSyncRef.current;
        const fiveMinutes = 5 * 60 * 1000;
        if (!lastSync || Date.now() - lastSync.getTime() > fiveMinutes) {
          scheduleSync(userId, 1000);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [userId]);

  return { sync, isSyncing, lastSync: lastSyncRef.current };
}
