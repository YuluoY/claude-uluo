import type { Notification } from '../../types/notification.types';
import {
  NOTIFICATION_PRIORITY_LABEL_KEY,
  NOTIFICATION_STATUS_LABEL_KEY,
} from '../../constants/notification.constants';

interface NotificationCardProps {
  /** 通知实体 */
  notification: Notification;
  /** 标记已读回调 */
  onMarkAsRead: (id: string) => void;
}

/**
 * 通知卡片——纯展示组件（Presentational）
 *
 * 不持有状态、不发请求、无副作用。
 * 仅根据 notification.status 决定是否展示"标记已读"按钮和未读徽标。
 *
 * 可访问性：
 * - 语义标签 <article> 包裹
 * - 按钮有 aria-label
 * - 键盘 Enter/Space 触发标记已读
 */
export function NotificationCard({
  notification,
  onMarkAsRead,
}: NotificationCardProps): React.ReactElement {
  const isUnread = notification.status === 'unread';

  if (!isUnread) {
    // 已读——仅展示内容，无交互
    return (
      <article
        className="notification-card"
        aria-label={notification.title}
      >
        <header className="notification-card__header">
          <h3 className="notification-card__title">{notification.title}</h3>
        </header>
        <p className="notification-card__content">{notification.content}</p>
        <footer className="notification-card__footer">
          <span className="notification-card__meta">
            {NOTIFICATION_PRIORITY_LABEL_KEY[notification.priority]}
            {' · '}
            {notification.createdAt}
          </span>
        </footer>
      </article>
    );
  }

  // 未读——展示未读徽标 + 标记已读按钮
  const handleMarkAsRead = (): void => {
    onMarkAsRead(notification.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMarkAsRead();
    }
  };

  return (
    <article
      className="notification-card notification-card--unread"
      aria-label={notification.title}
    >
      <header className="notification-card__header">
        <h3 className="notification-card__title">{notification.title}</h3>
        <span
          className="notification-card__badge"
          aria-label={NOTIFICATION_STATUS_LABEL_KEY.unread}
        />
      </header>
      <p className="notification-card__content">{notification.content}</p>
      <footer className="notification-card__footer">
        <span className="notification-card__meta">
          {NOTIFICATION_PRIORITY_LABEL_KEY[notification.priority]}
          {' · '}
          {notification.createdAt}
        </span>
        <button
          type="button"
          className="notification-card__action"
          onClick={handleMarkAsRead}
          onKeyDown={handleKeyDown}
          aria-label="标记已读"
        >
          标记已读
        </button>
      </footer>
    </article>
  );
}
