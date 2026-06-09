// === Notification Module - Barrel Export ===

// Types
export type {
  Notification,
  NotificationCategory,
  NotificationPriority,
  NotificationQueryParams,
  NotificationListResponse,
  NotificationState,
  CreateNotificationPayload,
} from './types';

// Constants
export {
  NOTIFICATION_API_BASE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  CATEGORY_LABELS,
  POLL_INTERVAL_MS,
  MAX_RETRY_ATTEMPTS,
} from './constants';

// API
export {
  createNotification,
  getNotificationList,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './api';

// Store
export { useNotificationStore } from './stores/notificationStore';

// Hooks
export { useNotifications } from './hooks/useNotifications';

// Components
export { NotificationCard } from './components/NotificationCard';
export { NotificationList } from './components/NotificationList';
export type { NotificationCardProps } from './components/NotificationCard';
export type { NotificationListProps } from './components/NotificationList';
