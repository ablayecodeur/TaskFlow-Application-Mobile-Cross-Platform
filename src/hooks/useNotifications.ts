import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  setBadgeCount,
} from '../notifications/notificationService';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications().then((token) => {
      pushTokenRef.current = token;
    });

    const receivedSub = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, string>;
      if (data?.type === 'sync_complete') {
        setBadgeCount(0);
      }
    });

    const responseSub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;

      if (data?.taskId) {
        router.push(`/task/${data.taskId}`);
      } else if (data?.type === 'daily_digest') {
        router.push('/(tabs)/tasks');
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [isAuthenticated]);

  return { pushToken: pushTokenRef.current };
}
