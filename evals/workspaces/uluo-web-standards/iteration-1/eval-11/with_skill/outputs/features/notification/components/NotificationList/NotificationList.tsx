import { useNotifications, useNotificationActions } from '../../hooks';
import { NotificationCard } from '../NotificationCard';
import type { NotificationQueryParams } from '../../types/notification.types';

/**
 * 骨架屏项数——与默认分页大小一致以保持布局稳定
 */
const SKELETON_COUNT = 5;

interface NotificationListProps {
  /** 查询参数——调用方需确保引用稳定（用 useMemo 或定义在组件外部） */
  params?: NotificationQueryParams;
}

/**
 * 通知列表——数据驱动容器组件
 *
 * 覆盖四态（按顺序检查，一次只处于一个状态）：
 *   1. error   → 错误信息 + 重试按钮
 *   2. loading → 骨架屏（保留布局空间）
 *   3. empty   → 引导文案
 *   4. success → 正常列表渲染
 *
 * 可访问性：
 * - 加载态设置 aria-busy="true"
 * - 错误态设置 role="alert"
 * - 使用语义化 <ul> / <li> 列表结构
 * - 键盘 Tab 序自然（button 原生 focusable）
 */
export function NotificationList({ params }: NotificationListProps): React.ReactElement {
  const { asyncState, notifications, refetch } = useNotifications(params);
  const { markAsRead } = useNotificationActions();

  // 1. 错误状态——显示具体错误信息 + 重试
  if (asyncState.status === 'error') {
    return (
      <div className="notification-list notification-list--error" role="alert">
        <p className="notification-list__error-message">
          加载通知失败：{asyncState.error}
        </p>
        <button
          type="button"
          className="notification-list__retry-btn"
          onClick={refetch}
        >
          重试
        </button>
      </div>
    );
  }

  // 2. 加载状态——骨架屏（首屏加载，无旧数据时展示）
  if (asyncState.status === 'loading') {
    return (
      <div className="notification-list notification-list--loading" aria-busy="true">
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <div
            key={index}
            className="notification-card notification-card--skeleton"
          >
            <div className="notification-card__skeleton-title" />
            <div className="notification-card__skeleton-content" />
          </div>
        ))}
      </div>
    );
  }

  // 3. 空状态——有引导文案和行动说明
  if (asyncState.status === 'empty' || asyncState.status === 'idle') {
    return (
      <div className="notification-list notification-list--empty">
        <p className="notification-list__empty-title">暂无通知</p>
        <p className="notification-list__empty-hint">
          新通知将在这里显示，去创建第一条通知吧
        </p>
      </div>
    );
  }

  // 4. 成功状态
  return (
    <ul className="notification-list" role="list">
      {notifications.map((notification) => (
        <li key={notification.id} className="notification-list__item">
          <NotificationCard
            notification={notification}
            onMarkAsRead={markAsRead}
          />
        </li>
      ))}
    </ul>
  );
}
