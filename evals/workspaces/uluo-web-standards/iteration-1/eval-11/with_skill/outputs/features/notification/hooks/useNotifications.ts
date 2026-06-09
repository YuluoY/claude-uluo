import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { NotificationQueryParams } from '../types/notification.types';

/**
 * 通知列表 Hook
 *
 * 封装 Zustand store，对组件暴露 AsyncState discriminated union。
 * 组件根据 asyncState.status 按序渲染四态（error → loading → empty → success）。
 *
 * 注意：调用方需确保 params 引用稳定（例如用 useMemo 包裹或定义在组件外部），
 * 避免每次渲染因对象引用变化触发重复请求。
 *
 * @example
 * const params = useMemo(() => ({ page: 1, status: 'unread' as const }), []);
 * const { asyncState, notifications, refetch } = useNotifications(params);
 */
export function useNotifications(params?: NotificationQueryParams): {
  asyncState: ReturnType<typeof useNotificationStore.getState>['asyncState'];
  notifications: ReturnType<typeof useNotificationStore.getState>['notifications'];
  refetch: () => void;
} {
  const asyncState = useNotificationStore((s) => s.asyncState);
  const notifications = useNotificationStore((s) => s.notifications);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    fetchNotifications(params);
  }, [params, fetchNotifications]);

  const refetch = useCallback(() => {
    fetchNotifications(params);
  }, [params, fetchNotifications]);

  return { asyncState, notifications, refetch };
}
