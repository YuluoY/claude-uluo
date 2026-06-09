import type { Notification } from '../../types/notification.types'
import { NOTIFICATION_TYPE_LABELS } from '../../constants/notification.constants'
import styles from './NotificationCard.module.css'

interface NotificationCardProps {
  notification: Notification
  onMarkAsRead?: (id: string) => void
}

/**
 * 通知卡片业务组件。
 * 展示单条通知的标题、内容摘要、类型标签、时间和已读状态。
 * 未读通知可通过"标记已读"按钮更新状态。
 */
export function NotificationCard({ notification, onMarkAsRead }: NotificationCardProps) {
  const { id, title, content, type, isRead, createdAt } = notification

  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(id)
    }
  }

  const formattedTime = formatRelativeTime(createdAt)

  return (
    <article
      className={`${styles.card} ${!isRead ? styles['card--unread'] : ''}`}
      aria-label={`${NOTIFICATION_TYPE_LABELS[type]}：${title}`}
    >
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <span className={`${styles.badge} ${styles[`badge--${type}`]}`}>
            {NOTIFICATION_TYPE_LABELS[type]}
          </span>
          <h3 className={styles.title}>{title}</h3>
        </div>
        {!isRead && (
          <span
            className={styles.unreadDot}
            aria-label="未读"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary, #1976d2)',
              flexShrink: 0,
            }}
          />
        )}
      </header>

      <p className={styles.content}>{content}</p>

      <footer className={styles.footer}>
        <time className={styles.timestamp} dateTime={createdAt}>
          {formattedTime}
        </time>
        {isRead ? (
          <span className={styles.readIndicator}>已读</span>
        ) : (
          <button
            className={styles.markReadButton}
            onClick={handleMarkAsRead}
            type="button"
          >
            标记已读
          </button>
        )}
      </footer>
    </article>
  )
}

/**
 * 将 ISO 时间字符串转换为相对时间描述。
 * 此处为简化实现，生产环境应替换为 i18n 感知的日期库（如 dayjs + relativeTime 插件）。
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffSeconds = Math.floor((now - then) / 1000)

  if (diffSeconds < 60) {
    return '刚刚'
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)} 分钟前`
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)} 小时前`
  }
  if (diffSeconds < 604800) {
    return `${Math.floor(diffSeconds / 86400)} 天前`
  }
  return new Date(isoString).toLocaleDateString('zh-CN')
}
