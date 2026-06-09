import { useEffect } from 'react'
import { useNotificationStore } from '../stores/useNotificationStore'

/**
 * 通知列表 Hook。
 * 在首次挂载时自动拉取通知列表，返回通知数据、加载状态和重试方法。
 * 四态覆盖：idle → loading → success | error | empty。
 */
export function useNotifications() {
  const notifications = useNotificationStore(state => state.notifications)
  const asyncStatus = useNotificationStore(state => state.asyncStatus)
  const error = useNotificationStore(state => state.error)
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications)

  useEffect(() => {
    if (asyncStatus === 'idle') {
      fetchNotifications()
    }
  }, [asyncStatus, fetchNotifications])

  return {
    notifications,
    asyncStatus,
    error,
    refetch: fetchNotifications,
  } as const
}
