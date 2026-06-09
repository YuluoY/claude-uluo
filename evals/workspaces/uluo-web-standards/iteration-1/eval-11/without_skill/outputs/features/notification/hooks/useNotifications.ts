// === Notification Hooks ===

import { useCallback, useEffect, useRef } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { POLL_INTERVAL_MS } from '../constants';
import type { CreateNotificationPayload, NotificationQueryParams } from '../types';

/**
 * Primary hook for consuming notifications in a component.
 *
 * Returns bound actions + reactive state from the Zustand store.
 * Automatically fetches on mount and optionally polls.
 */
export function useNotifications(params?: NotificationQueryParams) {
  const store = useNotificationStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch on mount (and when params change)
  useEffect(() => {
    store.fetchNotifications(params);
  }, [
    params?.page,
    params?.pageSize,
    params?.isRead,
    params?.category,
    params?.priority,
    params?.sortBy,
    params?.sortOrder,
  ]);

  // Optional polling
  useEffect(() => {
    if (POLL_INTERVAL_MS > 0) {
      pollRef.current = setInterval(() => {
        store.fetchNotifications(params);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [
    params?.page,
    params?.pageSize,
    params?.isRead,
    params?.category,
    params?.priority,
    params?.sortBy,
    params?.sortOrder,
  ]);

  const createNotification = useCallback(
    async (payload: CreateNotificationPayload) => {
      return store.createNotification(payload);
    },
    [],
  );

  const markAsRead = useCallback(async (id: string) => {
    await store.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    await store.markAllAsRead();
  }, []);

  return {
    // State
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    isLoading: store.isLoading,
    error: store.error,
    currentPage: store.currentPage,
    totalPages: store.totalPages,
    total: store.total,
    // Actions
    refetch: () => store.fetchNotifications(params),
    createNotification,
    markAsRead,
    markAllAsRead,
    reset: store.reset,
  };
}
