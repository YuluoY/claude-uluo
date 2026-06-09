// ============================================================
// Notification Module — Custom Hooks
// ============================================================
// Thin React bindings over the Zustand store so consuming
// components never need to import the store directly.
// ============================================================

import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import type {
  CreateNotificationPayload,
  NotificationQueryParams,
} from '../types';

/**
 * Primary hook for working with the notification list.
 *
 * Usage:
 * ```tsx
 * const { notifications, loading, error, markAsRead } = useNotifications();
 * ```
 *
 * By default it automatically fetches the first page on mount.
 * Pass `{ autoFetch: false }` to opt out.
 */
export function useNotifications(params?: NotificationQueryParams & { autoFetch?: boolean }) {
  const {
    notifications,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    mutating,
    fetchNotifications,
    fetchNextPage,
  } = useNotificationStore();

  const autoFetch = params?.autoFetch !== false;

  useEffect(() => {
    if (autoFetch) {
      fetchNotifications(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoFetch,
    params?.status,
    params?.type,
    params?.page,
    params?.pageSize,
  ]);

  return {
    notifications,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    mutating,
    refetch: useCallback(
      () => fetchNotifications(params),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [params?.status, params?.type],
    ),
    fetchNextPage: useCallback(() => fetchNextPage(), [fetchNextPage]),
  };
}

/**
 * Hook that exposes mutation actions (create, mark-read, delete).
 * Separated so read-heavy components don't re-render on mutation state
 * unless they actually need it.
 */
export function useNotificationActions() {
  const {
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    mutating,
  } = useNotificationStore();

  return {
    createNotification: useCallback(
      (payload: CreateNotificationPayload) => createNotification(payload),
      [createNotification],
    ),
    markAsRead: useCallback((id: string) => markAsRead(id), [markAsRead]),
    markAllAsRead: useCallback(() => markAllAsRead(), [markAllAsRead]),
    deleteNotification: useCallback(
      (id: string) => deleteNotification(id),
      [deleteNotification],
    ),
    mutating,
  };
}

/**
 * Convenience hook that returns the count of unread notifications.
 */
export function useUnreadCount() {
  const notifications = useNotificationStore((s) => s.notifications);
  return notifications.filter((n) => n.status === 'unread').length;
}
