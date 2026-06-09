// ============================================================
// Notification Module — Barrel Export
// ============================================================
// Import from this file to consume the entire module:
//
//   import {
//     NotificationList,
//     NotificationCard,
//     useNotifications,
//     useNotificationActions,
//     useUnreadCount,
//     useNotificationStore,
//     createNotification,
//     fetchNotifications,
//     markAsRead,
//     type Notification,
//     type CreateNotificationPayload,
//     NotificationType,
//     NotificationStatus,
//   } from '@/features/notification';
// ============================================================

// ---- Types ----
export type {
  Notification,
  CreateNotificationPayload,
  MarkAsReadPayload,
  PaginatedResponse,
  NotificationQueryParams,
} from './types';
export { NotificationType, NotificationStatus } from './types';

// ---- Constants ----
export {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_CLASS_MAP,
  NOTIFICATION_TITLE_MAX_LENGTH,
  NOTIFICATION_CONTENT_PREVIEW_MAX_LENGTH,
} from './constants';

// ---- API ----
export {
  createNotification,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  resetMockStore,
} from './api';

// ---- Store ----
export { useNotificationStore } from './stores/notificationStore';
export type { NotificationState } from './stores/notificationStore';

// ---- Hooks ----
export {
  useNotifications,
  useNotificationActions,
  useUnreadCount,
} from './hooks/useNotifications';

// ---- Components ----
export { NotificationList } from './components/NotificationList';
export type { NotificationListProps } from './components/NotificationList';

export { NotificationCard } from './components/NotificationCard';
export type { NotificationCardProps } from './components/NotificationCard';
