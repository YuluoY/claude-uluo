// === Notification Types ===

/** Priority level for a notification */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Category/type of notification */
export type NotificationCategory =
  | 'system'
  | 'message'
  | 'alert'
  | 'reminder'
  | 'update';

/** Core notification entity */
export interface Notification {
  /** Unique identifier */
  id: string;
  /** Notification title */
  title: string;
  /** Notification body content */
  content: string;
  /** Priority level */
  priority: NotificationPriority;
  /** Category */
  category: NotificationCategory;
  /** Whether the notification has been read */
  isRead: boolean;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 read timestamp, null if unread */
  readAt: string | null;
  /** Optional metadata payload */
  metadata?: Record<string, unknown>;
}

/** Payload for creating a new notification */
export interface CreateNotificationPayload {
  title: string;
  content: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  metadata?: Record<string, unknown>;
}

/** Parameters for querying notification list */
export interface NotificationQueryParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Filter by read status */
  isRead?: boolean;
  /** Filter by category */
  category?: NotificationCategory;
  /** Filter by priority */
  priority?: NotificationPriority;
  /** Sort field */
  sortBy?: 'createdAt' | 'priority';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/** Paginated response for notification list */
export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Store state shape for notifications */
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
}
