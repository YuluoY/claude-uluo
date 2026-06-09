// === Notification API ===

import { NOTIFICATION_API_BASE } from '../constants';
import type {
  CreateNotificationPayload,
  Notification,
  NotificationListResponse,
  NotificationQueryParams,
} from '../types';

/**
 * Build a query string from NotificationQueryParams, omitting undefined values.
 */
function buildQueryString(params?: NotificationQueryParams): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    searchParams.set('pageSize', String(params.pageSize));
  }
  if (params.isRead !== undefined) {
    searchParams.set('isRead', String(params.isRead));
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }
  if (params.priority) {
    searchParams.set('priority', params.priority);
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Create a new notification.
 */
export async function createNotification(
  payload: CreateNotificationPayload,
): Promise<Notification> {
  const response = await fetch(NOTIFICATION_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `Failed to create notification (HTTP ${response.status})`,
    );
  }

  return response.json() as Promise<Notification>;
}

/**
 * Fetch a paginated list of notifications.
 */
export async function getNotificationList(
  params?: NotificationQueryParams,
): Promise<NotificationListResponse> {
  const qs = buildQueryString(params);
  const response = await fetch(`${NOTIFICATION_API_BASE}${qs}`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `Failed to fetch notifications (HTTP ${response.status})`,
    );
  }

  return response.json() as Promise<NotificationListResponse>;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  id: string,
): Promise<Notification> {
  const response = await fetch(`${NOTIFICATION_API_BASE}/${id}/read`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `Failed to mark notification as read (HTTP ${response.status})`,
    );
  }

  return response.json() as Promise<Notification>;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch(`${NOTIFICATION_API_BASE}/read-all`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.message ?? `Failed to mark all as read (HTTP ${response.status})`,
    );
  }
}
