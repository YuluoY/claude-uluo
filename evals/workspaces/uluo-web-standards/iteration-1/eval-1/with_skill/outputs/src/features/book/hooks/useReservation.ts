/**
 * 预约操作 Hook——管理预约创建/取消和用户预约列表。
 * 一个 Hook 一个职责：只负责预约流程。
 */
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Reservation, ReservationResult, ReservationCount } from '../types/book.types'
import type { AsyncStatus } from '@/types/common.types'
import { bookApi } from '../api/book.api'
import { to } from '@/shared/utils'
import { createLogger } from '@/monitoring'

const logger = createLogger('useReservation')

export interface UseReservationReturn {
  userReservations: Ref<readonly Reservation[]>
  reservationCount: Ref<ReservationCount | null>
  actionStatus: Ref<AsyncStatus>
  errorMessage: Ref<string>

  /** 预约一本书 */
  reserve: (bookId: string, userId: string) => Promise<ReservationResult | undefined>

  /** 取消一个预约 */
  cancel: (reservationId: string) => Promise<ReservationResult | undefined>

  /** 加载当前用户的预约列表 */
  loadUserReservations: (userId: string) => Promise<void>

  /** 加载预约统计 */
  loadReservationCount: (userId: string) => Promise<void>

  /** 检查用户是否已预约某书 */
  hasActiveReservation: (bookId: string) => boolean
}

export function useReservation(): UseReservationReturn
{
  const userReservations: Ref<Reservation[]> = ref([])
  const reservationCount = ref<ReservationCount | null>(null)
  const actionStatus = ref<AsyncStatus>('idle')
  const errorMessage = ref('')

  async function reserve(bookId: string, userId: string): Promise<ReservationResult | undefined>
  {
    actionStatus.value = 'loading'
    errorMessage.value = ''

    const [err, response] = await to(bookApi.createReservation({
      bookId,
      userId,
    }))

    if (err || !response || !response.success)
    {
      const message = err instanceof Error ? err.message : 'Reservation failed'
      logger.error('Reservation failed', err, { bookId, userId })
      actionStatus.value = 'error'
      errorMessage.value = message

      return undefined
    }

    actionStatus.value = 'success'

    logger.info('Reservation created', {
      bookId,
      reservationId: response.data.reservation.id,
    })

    return response.data
  }

  async function cancel(reservationId: string): Promise<ReservationResult | undefined>
  {
    actionStatus.value = 'loading'
    errorMessage.value = ''

    const [err, response] = await to(bookApi.cancelReservation(reservationId))

    if (err || !response || !response.success)
    {
      const message = err instanceof Error ? err.message : 'Cancellation failed'
      logger.error('Reservation cancellation failed', err, { reservationId })
      actionStatus.value = 'error'
      errorMessage.value = message

      return undefined
    }

    // 从本地列表中移除已取消的预约
    userReservations.value = userReservations.value.filter(
      r => r.id !== reservationId,
    )

    actionStatus.value = 'success'

    logger.info('Reservation cancelled', { reservationId })

    return response.data
  }

  async function loadUserReservations(userId: string): Promise<void>
  {
    actionStatus.value = 'loading'

    const [err, response] = await to(bookApi.fetchUserReservations({
      userId,
    }))

    if (err || !response || !response.success)
    {
      logger.error('Load user reservations failed', err, { userId })
      actionStatus.value = 'error'

      return
    }

    userReservations.value = response.data.items
    actionStatus.value = 'idle'
  }

  async function loadReservationCount(userId: string): Promise<void>
  {
    const [err, response] = await to(bookApi.fetchReservationCount(userId))

    if (err || !response || !response.success)
    {
      logger.error('Load reservation count failed', err, { userId })

      return
    }

    reservationCount.value = response.data
  }

  function hasActiveReservation(bookId: string): boolean
  {
    return userReservations.value.some(
      r => r.bookId === bookId && r.status === 'active',
    )
  }

  return {
    userReservations: userReservations as Ref<readonly Reservation[]>,
    reservationCount,
    actionStatus,
    errorMessage,
    reserve,
    cancel,
    loadUserReservations,
    loadReservationCount,
    hasActiveReservation,
  }
}
