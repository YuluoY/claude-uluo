import { create } from 'zustand';
import type {
  AsyncState,
  CreateNotificationPayload,
  Notification,
  NotificationQueryParams,
} from '../types/notification.types';
import { notificationApi } from '../api/notification.api';
import { to } from '../../../shared/utils/to';

/**
 * 通知 Store 状态
 *
 * asyncState 仅追踪 fetchNotifications 生命周期，
 * createNotification 和 markAsRead 采用乐观更新策略，各自管理回滚。
 */
interface NotificationStoreState {
  /** 通知列表 */
  notifications: readonly Notification[];
  /** 列表加载异步状态——Discriminated Union 禁止非法状态组合 */
  asyncState: AsyncState<readonly Notification[]>;

  /** 获取通知列表（查询——修改 asyncState） */
  fetchNotifications: (params?: NotificationQueryParams) => Promise<void>;
  /** 创建通知（命令——乐观添加 + 回滚） */
  createNotification: (payload: CreateNotificationPayload) => Promise<void>;
  /** 标记已读（命令——乐观更新 + 回滚） */
  markAsRead: (id: string) => Promise<void>;
  /** 重置状态到 idle */
  resetState: () => void;
}

export const useNotificationStore = create<NotificationStoreState>(
  (set, get) => ({
    notifications: [],
    asyncState: { status: 'idle' },

    fetchNotifications: async (params?: NotificationQueryParams) => {
      // 保留旧数据，防止 refetch 时列表闪烁消失
      set({ asyncState: { status: 'loading' } });

      const [error, result] = await to(notificationApi.fetchList(params));

      if (error) {
        set({ asyncState: { status: 'error', error: error.message } });
        return;
      }

      // error 为 null → result 必为 PaginatedResponse<Notification>
      const response = result!;

      if (response.items.length === 0) {
        set({ notifications: [], asyncState: { status: 'empty' } });
        return;
      }

      set({
        notifications: response.items,
        asyncState: { status: 'success', data: response.items },
      });
    },

    createNotification: async (payload: CreateNotificationPayload) => {
      // 乐观更新——先生成临时 ID，立即显示
      const tempId = `temp-${Date.now()}`;
      const optimistic: Notification = {
        id: tempId,
        title: payload.title,
        content: payload.content,
        status: 'unread',
        priority: payload.priority,
        category: payload.category,
        createdAt: new Date().toISOString(),
      };

      const previous = get().notifications;
      set({ notifications: [optimistic, ...previous] });

      const [error, created] = await to(notificationApi.create(payload));

      if (error) {
        // 失败回滚——恢复旧列表
        set({ notifications: previous });
        return;
      }

      // 用服务端返回的实体替换临时条目
      const serverNotification = created!;
      set({
        notifications: get().notifications.map((n) =>
          n.id === tempId ? serverNotification : n,
        ),
      });
    },

    markAsRead: async (id: string) => {
      const previous = get().notifications;

      // 乐观更新——立即切换为已读
      set({
        notifications: previous.map((n) =>
          n.id === id
            ? {
                ...n,
                status: 'read' as const,
                readAt: new Date().toISOString(),
              }
            : n,
        ),
      });

      const [error] = await to(notificationApi.markAsRead(id));

      if (error) {
        // 失败回滚
        set({ notifications: previous });
      }
    },

    resetState: () => {
      set({ notifications: [], asyncState: { status: 'idle' } });
    },
  }),
);
