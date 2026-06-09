// ============================================================
// NotificationCard Component
// ============================================================
// Renders a single notification with type-based styling,
// read/unread indicator, timestamp, and action buttons.
// ============================================================

import React, { useCallback } from 'react';
import type { Notification } from '../../types';
import { NotificationStatus } from '../../types';
import {
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_CLASS_MAP,
  NOTIFICATION_TITLE_MAX_LENGTH,
  NOTIFICATION_CONTENT_PREVIEW_MAX_LENGTH,
} from '../../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHr < 24) return `${diffHr} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NotificationCardProps {
  notification: Notification;
  /** Called when the user clicks the card or the "mark read" button. */
  onMarkAsRead?: (id: string) => void;
  /** Called when the user clicks the delete button. */
  onDelete?: (id: string) => void;
  /** When true, hides the delete button. */
  disableDelete?: boolean;
  /** Additional class name appended to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  disableDelete = false,
  className,
}) => {
  const isUnread = notification.status === NotificationStatus.Unread;

  const handleClick = useCallback(() => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  }, [isUnread, onMarkAsRead, notification.id]);

  const handleMarkRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    },
    [onMarkAsRead, notification.id],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) {
        onDelete(notification.id);
      }
    },
    [onDelete, notification.id],
  );

  const rootClass = [
    'notification-card',
    NOTIFICATION_TYPE_CLASS_MAP[notification.type] ?? '',
    isUnread ? 'notification-card--unread' : 'notification-card--read',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      aria-label={`${notification.title} — ${NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type} — ${isUnread ? '未读' : '已读'}`}
    >
      {/* --- Left: type icon --- */}
      <span className="notification-card__icon" aria-hidden="true">
        {NOTIFICATION_TYPE_ICONS[notification.type] ?? '📌'}
      </span>

      {/* --- Center: body --- */}
      <div className="notification-card__body">
        <div className="notification-card__header">
          <h4 className="notification-card__title">
            {truncate(notification.title, NOTIFICATION_TITLE_MAX_LENGTH)}
          </h4>
          {isUnread && (
            <span className="notification-card__badge" aria-label="未读">
              未读
            </span>
          )}
        </div>

        <p className="notification-card__content">
          {truncate(notification.content, NOTIFICATION_CONTENT_PREVIEW_MAX_LENGTH)}
        </p>

        <span className="notification-card__time">
          {formatTime(notification.createdAt)}
        </span>
      </div>

      {/* --- Right: actions --- */}
      <div className="notification-card__actions">
        {isUnread && onMarkAsRead && (
          <button
            className="notification-card__action-btn notification-card__action-btn--read"
            onClick={handleMarkRead}
            title="标记已读"
            aria-label="标记已读"
          >
            ✓
          </button>
        )}
        {!disableDelete && onDelete && (
          <button
            className="notification-card__action-btn notification-card__action-btn--delete"
            onClick={handleDelete}
            title="删除"
            aria-label="删除通知"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
