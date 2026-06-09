// ============================================================
// NotificationList Component
// ============================================================
// Renders the full notification list with loading, empty,
// and error states. Orchestrates data fetching and delegates
// rendering of each item to NotificationCard.
// ============================================================

import React, { useEffect, useCallback } from 'react';
import { useNotifications, useNotificationActions } from '../../hooks/useNotifications';
import { NotificationCard } from '../NotificationCard/NotificationCard';
import type { NotificationQueryParams } from '../../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NotificationListProps {
  /** Optional query filters. */
  queryParams?: NotificationQueryParams;
  /** When true, the list will NOT auto-fetch on mount. */
  manualFetch?: boolean;
  /** When true, hides action buttons on each card. */
  readOnly?: boolean;
  /** When true, enables infinite-scroll pagination. */
  infiniteScroll?: boolean;
  /** Callback fired when a notification is clicked / marked read. */
  onNotificationClick?: (id: string) => void;
  /** Callback fired when a notification is deleted. */
  onNotificationDelete?: (id: string) => void;
  /** Additional class name appended to the root element. */
  className?: string;
  /** Custom empty-state message. */
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NotificationList: React.FC<NotificationListProps> = ({
  queryParams,
  manualFetch = false,
  readOnly = false,
  infiniteScroll = false,
  onNotificationClick,
  onNotificationDelete,
  className,
  emptyMessage = '暂无通知',
}) => {
  // Data
  const {
    notifications,
    loading,
    error,
    total,
    page,
    totalPages,
    refetch,
    fetchNextPage,
  } = useNotifications({
    ...queryParams,
    autoFetch: !manualFetch,
  });

  // Actions
  const { markAsRead, deleteNotification } = useNotificationActions();

  // ---- Handlers ----
  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead(id);
      onNotificationClick?.(id);
    },
    [markAsRead, onNotificationClick],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotification(id);
      onNotificationDelete?.(id);
    },
    [deleteNotification, onNotificationDelete],
  );

  // ---- Infinite scroll via IntersectionObserver ----
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!infiniteScroll || page >= totalPages || loading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteScroll, page, totalPages, loading, fetchNextPage]);

  // ---- Render helpers ----
  const renderLoading = () => (
    <div className="notification-list__state notification-list__state--loading">
      <span className="notification-list__spinner" aria-hidden="true" />
      <p>加载中…</p>
    </div>
  );

  const renderError = () => (
    <div className="notification-list__state notification-list__state--error">
      <p>{error}</p>
      <button
        className="notification-list__retry-btn"
        onClick={refetch}
        type="button"
      >
        重试
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="notification-list__state notification-list__state--empty">
      <span className="notification-list__empty-icon" aria-hidden="true">
        📭
      </span>
      <p>{emptyMessage}</p>
    </div>
  );

  const renderList = () => (
    <>
      <div className="notification-list__header">
        <span className="notification-list__count">
          共 {total} 条通知
        </span>
      </div>

      <ul className="notification-list__items" role="list">
        {notifications.map((notification) => (
          <li key={notification.id} className="notification-list__item">
            <NotificationCard
              notification={notification}
              onMarkAsRead={readOnly ? undefined : handleMarkAsRead}
              onDelete={readOnly ? undefined : handleDelete}
              disableDelete={readOnly}
            />
          </li>
        ))}
      </ul>

      {/* Infinite-scroll sentinel */}
      {infiniteScroll && page < totalPages && (
        <div
          ref={sentinelRef}
          className="notification-list__sentinel"
          aria-hidden="true"
        >
          {loading && (
            <span className="notification-list__spinner notification-list__spinner--small" />
          )}
        </div>
      )}
    </>
  );

  // ---- Main render ----
  const rootClass = ['notification-list', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {loading && notifications.length === 0
        ? renderLoading()
        : error && notifications.length === 0
          ? renderError()
          : notifications.length === 0
            ? renderEmpty()
            : renderList()}
    </div>
  );
};

export default NotificationList;
