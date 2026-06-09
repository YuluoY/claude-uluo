// === NotificationCard Component ===

import React, { useCallback } from 'react';
import type { Notification } from '../../types';
import { CATEGORY_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants';

export interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
}

/**
 * Renders a single notification item.
 *
 * Displays title, content, priority badge, category badge,
 * timestamp and read/unread status.
 */
export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const handleMarkAsRead = useCallback(() => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  }, [notification.id, notification.isRead, onMarkAsRead]);

  const priorityColor = PRIORITY_COLORS[notification.priority];
  const priorityLabel = PRIORITY_LABELS[notification.priority];
  const categoryLabel = CATEGORY_LABELS[notification.category];

  const formattedDate = new Date(notification.createdAt).toLocaleString();

  return (
    <div
      className={`notification-card ${notification.isRead ? 'notification-card--read' : 'notification-card--unread'}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        backgroundColor: notification.isRead ? '#f9fafb' : '#ffffff',
        position: 'relative',
        cursor: notification.isRead ? 'default' : 'pointer',
        opacity: notification.isRead ? 0.85 : 1,
      }}
      onClick={handleMarkAsRead}
      role="listitem"
      aria-label={`Notification: ${notification.title}`}
    >
      {/* Unread indicator dot */}
      {!notification.isRead && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
          }}
          aria-hidden="true"
        />
      )}

      {/* Header row: title + badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          paddingRight: 24,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: notification.isRead ? 500 : 700,
            color: '#111827',
          }}
        >
          {notification.title}
        </h4>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 9999,
              backgroundColor: priorityColor,
              color: '#ffffff',
            }}
          >
            {priorityLabel}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 9999,
              backgroundColor: '#f3f4f6',
              color: '#374151',
            }}
          >
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <p
        style={{
          margin: '0 0 8px 0',
          fontSize: 13,
          color: '#4b5563',
          lineHeight: 1.5,
        }}
      >
        {notification.content}
      </p>

      {/* Footer: timestamp + read status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#9ca3af',
        }}
      >
        <span>{formattedDate}</span>
        <span>
          {notification.isRead
            ? `Read at ${notification.readAt ? new Date(notification.readAt).toLocaleString() : ''}`
            : 'Unread'}
        </span>
      </div>
    </div>
  );
};
