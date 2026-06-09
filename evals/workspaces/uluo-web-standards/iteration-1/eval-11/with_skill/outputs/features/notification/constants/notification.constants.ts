/**
 * 通知列表默认分页大小
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * 通知状态值映射（as const 替代 enum，运行时可用，编译后为零开销字符串字面量）
 */
export const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
} as const;

/**
 * 通知优先级值映射
 */
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

/**
 * 通知分类值映射
 */
export const NOTIFICATION_CATEGORY = {
  SYSTEM: 'system',
  TASK: 'task',
  MESSAGE: 'message',
} as const;

/**
 * 通知状态对应的 i18n label key
 */
export const NOTIFICATION_STATUS_LABEL_KEY: Readonly<Record<string, string>> = {
  unread: 'notification.status.unread',
  read: 'notification.status.read',
};

/**
 * 通知优先级对应的 i18n label key
 */
export const NOTIFICATION_PRIORITY_LABEL_KEY: Readonly<Record<string, string>> = {
  low: 'notification.priority.low',
  medium: 'notification.priority.medium',
  high: 'notification.priority.high',
};

/**
 * 通知分类对应的 i18n label key
 */
export const NOTIFICATION_CATEGORY_LABEL_KEY: Readonly<Record<string, string>> = {
  system: 'notification.category.system',
  task: 'notification.category.task',
  message: 'notification.category.message',
};

/**
 * API 端点常量——集中定义，避免散落多文件
 */
export const NOTIFICATION_API_ENDPOINTS = {
  LIST: '/api/notifications',
  CREATE: '/api/notifications',
  MARK_READ: (id: string): string => `/api/notifications/${id}/read`,
} as const;
