// === NotificationList Component ===

import React, { useCallback } from 'react';
import { NotificationCard } from '../NotificationCard';
import type { Notification, NotificationQueryParams } from '../../types';
import type { NotificationCardProps } from '../NotificationCard';

export interface NotificationListProps {
  /** Array of notifications to render */
  notifications: Notification[];
  /** Total unread count (displayed in header) */
  unreadCount?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Called when a notification is marked read */
  onMarkAsRead?: NotificationCardProps['onMarkAsRead'];
  /** Called when "Mark All Read" is clicked */
  onMarkAllAsRead?: () => void;
  /** Called to retry after an error */
  onRetry?: () => void;
  /** Pagination helpers */
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Renders a list of notifications with header, loading, error,
 * empty-state, and pagination support.
 */
export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  unreadCount = 0,
  isLoading = false,
  error = null,
  onMarkAsRead,
  onMarkAllAsRead,
  onRetry,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const hasNotifications = notifications.length > 0;
  const showPagination = totalPages > 1 && onPageChange;

  const handlePageChange = useCallback(
    (page: number) => {
      if (onPageChange && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    },
    [onPageChange, totalPages],
  );

  // --- Loading state ---
  if (isLoading && !hasNotifications) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: '#6b7280',
          fontSize: 14,
        }}
        role="status"
        aria-label="Loading notifications"
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'notification-spin 0.6s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        Loading notifications…
        <style>{`
          @keyframes notification-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          border: '1px solid #fca5a5',
          borderRadius: 8,
          backgroundColor: '#fef2f2',
          color: '#991b1b',
        }}
        role="alert"
      >
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Failed to load notifications</p>
        <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#b91c1c' }}>{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              border: '1px solid #fca5a5',
              borderRadius: 6,
              backgroundColor: '#ffffff',
              color: '#991b1b',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // --- Empty state ---
  if (!hasNotifications) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: '#9ca3af',
        }}
      >
        <p style={{ fontSize: 14, margin: 0 }}>No notifications yet</p>
        <p style={{ fontSize: 12, margin: '4px 0 0' }}>
          You are all caught up!
        </p>
      </div>
    );
  }

  // --- Normal list ---
  return (
    <div role="list" aria-label="Notifications list">
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
          Notifications
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                padding: '1px 8px',
                borderRadius: 9999,
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </span>

        {onMarkAllAsRead && unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Cards */}
      {notifications.map((n) => (
        <NotificationCard
          key={n.id}
          notification={n}
          onMarkAsRead={onMarkAsRead}
        />
      ))}

      {/* Loading overlay for subsequent pages */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 16, color: '#6b7280', fontSize: 13 }}>
          Loading more…
        </div>
      )}

      {/* Pagination */}
      {showPagination && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              backgroundColor: currentPage <= 1 ? '#f3f4f6' : '#ffffff',
              color: currentPage <= 1 ? '#9ca3af' : '#374151',
              cursor: currentPage <= 1 ? 'default' : 'pointer',
            }}
          >
            Previous
          </button>

          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              backgroundColor: currentPage >= totalPages ? '#f3f4f6' : '#ffffff',
              color: currentPage >= totalPages ? '#9ca3af' : '#374151',
              cursor: currentPage >= totalPages ? 'default' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
