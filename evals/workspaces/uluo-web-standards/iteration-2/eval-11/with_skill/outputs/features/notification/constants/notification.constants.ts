import type { NotificationType } from '../types/notification.types'

/** 通知列表单页数量 */
export const NOTIFICATION_PAGE_SIZE = 20

/** 所有通知类型 */
export const NOTIFICATION_TYPES = ['info', 'warning', 'error', 'success'] as const

/** 通知类型对应图标标签 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: '通知',
  warning: '警告',
  error: '异常',
  success: '成功',
}
