import { create } from 'zustand'
import type { Notification, CreateNotificationPayload, AsyncStatus } from '../types/notification.types'
import { notificationApi } from '../api/notification.api'
import { to } from '../../../shared/utils/to'

interface NotificationState {
  notifications: Notification[]
  asyncStatus: AsyncStatus
  error: string | undefined
  fetchNotifications: () => Promise<void>
  createNotification: (payload: CreateNotificationPayload) => Promise<void>
  markAsRead: (id: string) => Promise<void>
}

/**
 * 通知领域 Zustand Store。
 * 管理通知列表的加载、创建、标记已读等操作的状态。
 * 异步操作通过 to() 元组解包处理错误，避免 try-catch 嵌套。
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  asyncStatus: 'idle',
  error: undefined,

  fetchNotifications: async () => {
    set({ asyncStatus: 'loading', error: undefined })

    const [err, data] = await to(notificationApi.fetchList())
    if (err) {
      set({ asyncStatus: 'error', error: err.message })
      return
    }

    if (data && data.length === 0) {
      set({ notifications: data, asyncStatus: 'empty' })
      return
    }

    set({ notifications: data ?? [], asyncStatus: 'success' })
  },

  createNotification: async (payload: CreateNotificationPayload) => {
    const [err, notification] = await to(notificationApi.create(payload))
    if (err) {
      set({ error: err.message })
      return
    }

    if (notification) {
      const { notifications: current } = get()
      set({
        notifications: [notification, ...current],
        asyncStatus: current.length === 0 ? 'success' : get().asyncStatus,
      })
    }
  },

  markAsRead: async (id: string) => {
    const [err] = await to(notificationApi.markAsRead(id))
    if (err) {
      set({ error: err.message })
      return
    }

    set(state => ({
      notifications: state.notifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      ),
    }))
  },
}))
