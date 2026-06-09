// ============================================================
// Notification Module — Constants
// ============================================================

/** Default pagination settings. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Human-readable labels keyed by notification type. */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  info: '信息',
  success: '成功',
  warning: '警告',
  error: '错误',
};

/** Human-readable labels keyed by notification status. */
export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  unread: '未读',
  read: '已读',
};

/** Icon glyphs (emoji fallback) keyed by notification type — used when no icon library is present. */
export const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

/** CSS class suffix keyed by notification type for styling variants. */
export const NOTIFICATION_TYPE_CLASS_MAP: Record<string, string> = {
  info: 'notification-card--info',
  success: 'notification-card--success',
  warning: 'notification-card--warning',
  error: 'notification-card--error',
};

/** Maximum title length before truncation in the card. */
export const NOTIFICATION_TITLE_MAX_LENGTH = 60;

/** Maximum content length before truncation in the list view. */
export const NOTIFICATION_CONTENT_PREVIEW_MAX_LENGTH = 120;
