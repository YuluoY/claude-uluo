// ============================================================
// Notification Module — Zustand Store
// ============================================================
// Manages: notification list, loading/error states, and
// high-level CRUD actions that delegate to the API layer.
// ============================================================

import { create } from 'zustand';
import type {
  Notification,
  CreateNotificationPayload,
  NotificationQueryParams,
  PaginatedResponse,
} from '../types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../constants';
import * as api from '../api';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface NotificationState {
  // ---- Data ----
  notifications: Notification[];
  /** Total across all pages (useful for "showing X of Y" badges). */
  total: number;
  /** Current pagination info. */
  page: number;
  pageSize: number;
  totalPages: number;

  // ---- Async flags ----
  loading: boolean;
  error: string | null;
  /** True when a mutating action (create / mark-read / delete) is in flight. */
  mutating: boolean;

  // ---- Actions ----
  fetchNotifications: (params?: NotificationQueryParams) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  createNotification: (payload: CreateNotificationPayload) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  /** Reset store state (useful for cleanup in tests). */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

function getInitialState(): Pick<
  NotificationState,
  | 'notifications'
  | 'total'
  | 'page'
  | 'pageSize'
  | 'totalPages'
  | 'loading'
  | 'error'
  | 'mutating'
> {
  return {
    notifications: [],
    total: 0,
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
    loading: false,
    error: null,
    mutating: false,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>((set, get) => ({
  ...getInitialState(),

  // ---- Fetch (first page) ----
  fetchNotifications: async (params?: NotificationQueryParams) => {
    const { pageSize } = get();
    set({ loading: true, error: null });

    try {
      const res: PaginatedResponse<Notification> =
        await api.fetchNotifications({
          page: params?.page ?? DEFAULT_PAGE,
          pageSize: params?.pageSize ?? pageSize,
          status: params?.status,
          type: params?.type,
        });

      set({
        notifications: res.data,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
        loading: false,
      });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '获取通知列表失败',
        loading: false,
      });
    }
  },

  // ---- Fetch next page (infinite-scroll friendly) ----
  fetchNextPage: async () => {
    const { page, totalPages, pageSize, loading } = get();
    if (loading || page >= totalPages) return;

    set({ loading: true, error: null });

    try {
      const res: PaginatedResponse<Notification> =
        await api.fetchNotifications({ page: page + 1, pageSize });

      set((prev) => ({
        notifications: [...prev.notifications, ...res.data],
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
        loading: false,
      }));
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '加载更多通知失败',
        loading: false,
      });
    }
  },

  // ---- Create ----
  createNotification: async (payload: CreateNotificationPayload) => {
    set({ mutating: true, error: null });

    try {
      const created = await api.createNotification(payload);
      set((prev) => ({
        notifications: [created, ...prev.notifications],
        total: prev.total + 1,
        mutating: false,
      }));
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '创建通知失败',
        mutating: false,
      });
    }
  },

  // ---- Mark single as read ----
  markAsRead: async (id: string) => {
    set({ mutating: true, error: null });

    try {
      const updated = await api.markAsRead({ id });
      set((prev) => ({
        notifications: prev.notifications.map((n) =>
          n.id === id ? updated : n,
        ),
        mutating: false,
      }));
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '标记已读失败',
        mutating: false,
      });
    }
  },

  // ---- Mark all as read ----
  markAllAsRead: async () => {
    set({ mutating: true, error: null });

    try {
      await api.markAllAsRead();
      set((prev) => ({
        notifications: prev.notifications.map((n) => ({
          ...n,
          status: 'read' as const,
          updatedAt: new Date().toISOString(),
        })),
        mutating: false,
      }));
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '全部标记已读失败',
        mutating: false,
      });
    }
  },

  // ---- Delete ----
  deleteNotification: async (id: string) => {
    set({ mutating: true, error: null });

    try {
      const deleted = await api.deleteNotification(id);
      if (deleted) {
        set((prev) => ({
          notifications: prev.notifications.filter((n) => n.id !== id),
          total: prev.total - 1,
        }));
      }
      set({ mutating: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : '删除通知失败',
        mutating: false,
      });
    }
  },

  // ---- Reset ----
  reset: () => {
    set(getInitialState());
  },
}));
