import { useNotificationStore } from '../stores/useNotificationStore'

/**
 * 标记已读 Hook。
 * 返回 markAsRead 函数，调用方传入通知 ID 即可标记为已读。
 */
export function useMarkAsRead() {
  const markAsRead = useNotificationStore(state => state.markAsRead)

  return { markAsRead } as const
}
