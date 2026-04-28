import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import { runSync, scheduleSync } from '../sync/syncEngine';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { sendLocalNotification } from '../notifications/notificationService';

export function useSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const isSyncing = useTaskStore((s) => s.isSyncing);
  const lastSyncRef = useRef<Date | null>(null);
  const wasOfflineRef = useRef(false);

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
      // Silently fail — retry on next trigger
    }
  }, [userId, isSyncing]);

  // Detect network reconnect by polling on AppState change (Expo Go compatible)
  useEffect(() => {
    if (!userId) return;

    const handleAppState = async (next: AppStateStatus) => {
      if (next !== 'active') return;

      const state = await Network.getNetworkStateAsync();
      const isNowOnline = state.isConnected === true && state.isInternetReachable !== false;

      const lastSync = lastSyncRef.current;
      const fiveMinutes = 5 * 60 * 1000;
      const stale = !lastSync || Date.now() - lastSync.getTime() > fiveMinutes;

      // Trigger if back online after being offline, or stale
      if ((wasOfflineRef.current && isNowOnline) || stale) {
        scheduleSync(userId, 1000);
      }

      wasOfflineRef.current = !isNowOnline;
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [userId]);

  return { sync, isSyncing, lastSync: lastSyncRef.current };
}
