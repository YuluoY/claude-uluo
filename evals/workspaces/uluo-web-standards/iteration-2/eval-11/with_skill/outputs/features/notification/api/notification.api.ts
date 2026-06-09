import type { Notification, CreateNotificationPayload } from '../types/notification.types'

/** 内存模拟存储——生产环境替换为真实 HTTP 调用 */
let notifications: Notification[] = []
let idCounter = 0

function generateId(): string {
  idCounter += 1
  return `notification_${idCounter}_${Date.now()}`
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 通知领域 API 层。
 * 当前使用内存模拟，生产环境应替换为 http client 调用。
 */
export const notificationApi = {
  /** 获取通知列表 */
  fetchList: async (): Promise<Notification[]> => {
    await simulateDelay(500)
    return [...notifications]
  },

  /** 创建通知 */
  create: async (payload: CreateNotificationPayload): Promise<Notification> => {
    await simulateDelay(300)
    const notification: Notification = {
      id: generateId(),
      title: payload.title,
      content: payload.content,
      type: payload.type,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    notifications = [notification, ...notifications]
    return notification
  },

  /** 标记通知为已读 */
  markAsRead: async (id: string): Promise<void> => {
    await simulateDelay(200)
    notifications = notifications.map(notification =>
      notification.id === id ? { ...notification, isRead: true } : notification
    )
  },
}
