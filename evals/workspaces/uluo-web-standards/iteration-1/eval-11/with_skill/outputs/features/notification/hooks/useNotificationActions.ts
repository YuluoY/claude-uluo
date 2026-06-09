import { useNotificationStore } from '../stores/useNotificationStore';
import type { CreateNotificationPayload } from '../types/notification.types';

/**
 * 通知操作 Hook
 *
 * 提供创建和标记已读操作，不触发列表加载、不订阅列表状态。
 * 用于仅在组件中需要执行通知操作（非展示列表）的场景。
 *
 * 由于 Zustand store 方法引用稳定，返回的 createNotification / markAsRead
 * 不会在重渲染时变化，无需 useCallback 包裹。
 */
export function useNotificationActions(): {
  createNotification: (payload: CreateNotificationPayload) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
} {
  const createNotification = useNotificationStore((s) => s.createNotification);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  return { createNotification, markAsRead };
}
