// === Notification Store (Zustand) ===

import { create } from 'zustand';
import type {
  CreateNotificationPayload,
  Notification,
  NotificationQueryParams,
  NotificationState,
} from '../types';
import {
  createNotification as apiCreateNotification,
  getNotificationList as apiGetNotificationList,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllRead,
} from '../api';

interface NotificationActions {
  /** Fetch notification list from the server */
  fetchNotifications: (params?: NotificationQueryParams) => Promise<void>;
  /** Create a notification and prepend it to the local list */
  createNotification: (payload: CreateNotificationPayload) => Promise<Notification>;
  /** Mark a notification read locally + on server */
  markAsRead: (id: string) => Promise<void>;
  /** Mark all notifications read */
  markAllAsRead: () => Promise<void>;
  /** Reset the store to its initial state */
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  total: 0,
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // --- State ---
  ...initialState,

  // --- Actions ---

  fetchNotifications: async (params?: NotificationQueryParams) => {
    set({ isLoading: true, error: null });

    try {
      const res = await apiGetNotificationList(params);
      const unreadCount = res.items.filter((n) => !n.isRead).length;

      set({
        notifications: res.items,
        unreadCount,
        currentPage: res.page,
        totalPages: res.totalPages,
        total: res.total,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error fetching notifications';
      set({ error: message, isLoading: false });
    }
  },

  createNotification: async (payload: CreateNotificationPayload) => {
    const notification = await apiCreateNotification(payload);

    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
      total: state.total + 1,
    }));

    return notification;
  },

  markAsRead: async (id: string) => {
    const { notifications } = get();

    // Optimistic update
    const target = notifications.find((n) => n.id === id);
    if (target && !target.isRead) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    }

    try {
      await apiMarkAsRead(id);
    } catch (err) {
      // Revert on failure
      const message =
        err instanceof Error ? err.message : 'Failed to mark as read';
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: false, readAt: null } : n,
        ),
        unreadCount: state.unreadCount + 1,
        error: message,
      }));
    }
  },

  markAllAsRead: async () => {
    const previous = get().notifications;

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() },
      ),
      unreadCount: 0,
    }));

    try {
      await apiMarkAllRead();
    } catch (err) {
      // Revert on failure
      const message =
        err instanceof Error ? err.message : 'Failed to mark all as read';
      set({
        notifications: previous,
        unreadCount: previous.filter((n) => !n.isRead).length,
        error: message,
      });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
