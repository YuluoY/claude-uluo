import { useNotifications } from '../../hooks/useNotifications'
import { useMarkAsRead } from '../../hooks/useMarkAsRead'
import { NotificationCard } from '../NotificationCard/NotificationCard'
import styles from './NotificationList.module.css'

const SKELETON_COUNT = 4

/**
 * 通知列表业务组件。
 * 覆盖四态：loading（骨架屏）、empty（引导文案）、error（错误信息+重试）、success（卡片列表）。
 * 渲染决策顺序：error → loading（无旧数据时） → empty → success。
 */
export function NotificationList() {
  const { notifications, asyncStatus, error, refetch } = useNotifications()
  const { markAsRead } = useMarkAsRead()

  // 渲染决策树——一次只处于一个状态
  if (asyncStatus === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert">
          <p className={styles.errorTitle}>加载通知失败</p>
          {error && <p className={styles.errorDetail}>{error}</p>}
          <button className={styles.retryButton} onClick={refetch} type="button">
            重试
          </button>
        </div>
      </div>
    )
  }

  if (asyncStatus === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} aria-label="加载中">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <div key={index} className={styles.skeletonItem} />
          ))}
        </div>
      </div>
    )
  }

  if (asyncStatus === 'empty') {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">&#128276;</span>
          <p className={styles.emptyTitle}>暂无通知</p>
          <p className={styles.emptyHint}>当有新通知时，将在此处显示</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={markAsRead}
          />
        ))}
      </div>
    </div>
  )
}
