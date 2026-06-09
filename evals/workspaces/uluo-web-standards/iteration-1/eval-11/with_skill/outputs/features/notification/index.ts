/**
 * features/notification —— 通知管理领域模块出口
 *
 * 外部消费者不穿透切片内部结构，仅 import 此文件：
 *   import { NotificationList, useNotifications, useNotificationStore, ... } from '@/features/notification'
 */

// 类型
export type {
  Notification,
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
  CreateNotificationPayload,
  NotificationQueryParams,
  PaginatedResponse,
  AsyncState,
} from './types/notification.types';

// 常量
export {
  DEFAULT_PAGE_SIZE,
  NOTIFICATION_STATUS,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_API_ENDPOINTS,
} from './constants/notification.constants';

// API
export { notificationApi } from './api/notification.api';

// Store
export { useNotificationStore } from './stores/useNotificationStore';

// Hooks
export { useNotifications, useNotificationActions } from './hooks';

// Components
export { NotificationCard, NotificationList } from './components';
