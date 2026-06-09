/**
 * 通知状态——未读 | 已读
 */
export type NotificationStatus = 'unread' | 'read';

/**
 * 通知优先级
 */
export type NotificationPriority = 'low' | 'medium' | 'high';

/**
 * 通知分类
 */
export type NotificationCategory = 'system' | 'task' | 'message';

/**
 * 通知实体
 */
export interface Notification {
  /** 唯一标识 */
  readonly id: string;
  /** 通知标题 */
  readonly title: string;
  /** 通知内容 */
  readonly content: string;
  /** 阅读状态 */
  readonly status: NotificationStatus;
  /** 优先级 */
  readonly priority: NotificationPriority;
  /** 分类 */
  readonly category: NotificationCategory;
  /** 创建时间（ISO 8601） */
  readonly createdAt: string;
  /** 阅读时间（ISO 8601），未读时为 undefined */
  readonly readAt?: string;
}

/**
 * 创建通知请求体
 */
export interface CreateNotificationPayload {
  title: string;
  content: string;
  priority: NotificationPriority;
  category: NotificationCategory;
}

/**
 * 通知列表查询参数
 */
export interface NotificationQueryParams {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 按状态筛选 */
  status?: NotificationStatus;
  /** 按优先级筛选 */
  priority?: NotificationPriority;
}

/**
 * 分页响应泛型
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/**
 * 异步状态——Discriminated Union
 *
 * 用单一字面量标签 status 区分所有状态，
 * 替代散落的 isLoading/isError/hasData 布尔值组合。
 * TypeScript 窄化后精确知道每个分支可用属性。
 */
export type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'empty' };
