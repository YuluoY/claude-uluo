import type {
  CreateNotificationPayload,
  Notification,
  NotificationQueryParams,
  PaginatedResponse,
} from '../types/notification.types';
import {
  DEFAULT_PAGE_SIZE,
  NOTIFICATION_API_ENDPOINTS,
} from '../constants/notification.constants';

/**
 * HTTP 请求封装（简化版）
 *
 * 生产环境应替换为 shared/http/http-client.ts 提供的统一实例
 * （携带 baseURL、timeout、请求/响应拦截器等）。
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * 构建查询字符串参数
 */
function buildSearchParams(params: NotificationQueryParams): URLSearchParams {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, status, priority } = params;
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('pageSize', String(pageSize));

  if (status) {
    searchParams.set('status', status);
  }
  if (priority) {
    searchParams.set('priority', priority);
  }

  return searchParams;
}

/**
 * 通知 API 接口定义
 *
 * 每个方法遵循单一职责：
 * - 查询方法返回数据（CQS Query）
 * - 命令方法触发副作用后返回服务端最新状态
 */
export const notificationApi = {
  /**
   * 获取通知分页列表
   */
  fetchList: async (
    params: NotificationQueryParams = {},
  ): Promise<PaginatedResponse<Notification>> => {
    const searchParams = buildSearchParams(params);
    return request<PaginatedResponse<Notification>>(
      `${NOTIFICATION_API_ENDPOINTS.LIST}?${searchParams.toString()}`,
    );
  },

  /**
   * 创建通知——返回服务端创建后的完整实体
   */
  create: async (
    payload: CreateNotificationPayload,
  ): Promise<Notification> => {
    return request<Notification>(NOTIFICATION_API_ENDPOINTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * 标记通知为已读——返回更新后的通知实体
   */
  markAsRead: async (id: string): Promise<Notification> => {
    return request<Notification>(NOTIFICATION_API_ENDPOINTS.MARK_READ(id), {
      method: 'PATCH',
    });
  },
};
