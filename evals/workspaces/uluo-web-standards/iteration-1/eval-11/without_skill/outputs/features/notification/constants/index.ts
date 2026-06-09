// === Notification Constants ===

import type { NotificationCategory, NotificationPriority } from '../types';

/** API base path for notification endpoints */
export const NOTIFICATION_API_BASE = '/api/notifications';

/** Default page size for list queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum items allowed per page */
export const MAX_PAGE_SIZE = 100;

/** Priority display labels */
export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/** Priority colour mapping (hex values) */
export const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

/** Category display labels */
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  system: 'System',
  message: 'Message',
  alert: 'Alert',
  reminder: 'Reminder',
  update: 'Update',
};

/** Refresh interval for polling (ms). 0 means no polling. */
export const POLL_INTERVAL_MS = 30_000;

/** Maximum retry attempts for API calls */
export const MAX_RETRY_ATTEMPTS = 3;
