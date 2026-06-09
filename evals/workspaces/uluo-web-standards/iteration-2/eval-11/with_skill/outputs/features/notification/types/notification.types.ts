/** 通知类型 */
export type NotificationType = 'info' | 'warning' | 'error' | 'success'

/** 通知实体 */
export interface Notification {
  id: string
  title: string
  content: string
  type: NotificationType
  isRead: boolean
  createdAt: string
}

/** 创建通知请求体 */
export type CreateNotificationPayload = Pick<Notification, 'title' | 'content' | 'type'>

/** 异步操作状态——Discriminated Union，单字段区分所有合法状态 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'
