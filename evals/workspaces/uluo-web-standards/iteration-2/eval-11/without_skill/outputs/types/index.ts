// ============================================================
// Notification Module — Type Definitions
// ============================================================

/** The kind of notification, used to determine visual treatment. */
export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

/** Read-status lifecycle of a notification. */
export enum NotificationStatus {
  Unread = 'unread',
  Read = 'read',
}

/** Shape of a single notification record returned from the API. */
export interface Notification {
  /** Unique identifier. */
  id: string;
  /** Short heading displayed in the card. */
  title: string;
  /** Full body text. May contain plain-text or simple markup. */
  content: string;
  /** Semantic category (info / success / warning / error). */
  type: NotificationType;
  /** Read status. */
  status: NotificationStatus;
  /** ISO-8601 timestamp of when the notification was created. */
  createdAt: string;
  /** ISO-8601 timestamp of when the notification was last updated. */
  updatedAt: string;
}

/** Payload accepted by the create-notification endpoint. */
export interface CreateNotificationPayload {
  title: string;
  content: string;
  type: NotificationType;
}

/** Payload accepted by the mark-as-read endpoint. */
export interface MarkAsReadPayload {
  id: string;
}

/** Standard paginated response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Query parameters for listing notifications. */
export interface NotificationQueryParams {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus;
  type?: NotificationType;
}
