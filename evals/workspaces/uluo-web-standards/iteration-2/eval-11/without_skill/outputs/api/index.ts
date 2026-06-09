// ============================================================
// Notification Module — API Layer (Mock)
// ============================================================
// In a real project these functions would call an HTTP client
// (axios / fetch). Here we simulate async behaviour with
// in-memory data so the module is self-contained and runnable.
// ============================================================

import type {
  Notification,
  CreateNotificationPayload,
  MarkAsReadPayload,
  PaginatedResponse,
  NotificationQueryParams,
} from '../types';
import { NotificationStatus } from '../types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../constants';

// ---------------------------------------------------------------------------
// Internal mock helpers
// ---------------------------------------------------------------------------

/** In-memory "database" shared across all callers. */
const store = new Map<string, Notification>();
let idCounter = 0;

function uid(): string {
  idCounter += 1;
  return `notif-${idCounter.toString().padStart(6, '0')}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Simulate network latency (200-600 ms). */
function delay(ms = 200 + Math.random() * 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new notification and persist it.
 * Returns the created record.
 */
export async function createNotification(
  payload: CreateNotificationPayload,
): Promise<Notification> {
  await delay();

  const notification: Notification = {
    id: uid(),
    title: payload.title,
    content: payload.content,
    type: payload.type,
    status: NotificationStatus.Unread,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  store.set(notification.id, notification);
  return notification;
}

/**
 * Fetch a paginated, optionally-filtered list of notifications.
 * Default sort: newest first (`createdAt` descending).
 */
export async function fetchNotifications(
  params: NotificationQueryParams = {},
): Promise<PaginatedResponse<Notification>> {
  await delay();

  const page = params.page ?? DEFAULT_PAGE;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  // Collect and sort
  let list = Array.from(store.values());
  list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Apply optional filters
  if (params.status !== undefined) {
    list = list.filter((n) => n.status === params.status);
  }
  if (params.type !== undefined) {
    list = list.filter((n) => n.type === params.type);
  }

  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = list.slice(start, start + pageSize);

  return { data, total, page, pageSize, totalPages };
}

/**
 * Mark a single notification as read by its id.
 * Returns the updated record.
 * Throws if the notification does not exist.
 */
export async function markAsRead(
  payload: MarkAsReadPayload,
): Promise<Notification> {
  await delay();

  const existing = store.get(payload.id);
  if (!existing) {
    throw new Error(`Notification with id "${payload.id}" not found`);
  }

  const updated: Notification = {
    ...existing,
    status: NotificationStatus.Read,
    updatedAt: nowISO(),
  };

  store.set(payload.id, updated);
  return updated;
}

/**
 * Mark all unread notifications as read.
 * Returns the count of notifications that were updated.
 */
export async function markAllAsRead(): Promise<number> {
  await delay();

  let count = 0;
  for (const [id, notification] of store.entries()) {
    if (notification.status === NotificationStatus.Unread) {
      store.set(id, {
        ...notification,
        status: NotificationStatus.Read,
        updatedAt: nowISO(),
      });
      count += 1;
    }
  }

  return count;
}

/**
 * Delete a notification by id.
 * Returns true if the notification was deleted, false if it did not exist.
 */
export async function deleteNotification(id: string): Promise<boolean> {
  await delay();
  return store.delete(id);
}

/**
 * Clear ALL mock data (useful for tests / demos).
 */
export function resetMockStore(): void {
  store.clear();
  idCounter = 0;
}
