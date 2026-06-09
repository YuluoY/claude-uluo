/** 书籍领域常量——修改半径=1 */

import { RESERVATION_EXPIRY_HOURS, MAX_ACTIVE_RESERVATIONS_PER_USER, DEFAULT_PAGE_SIZE } from '@/constants/app.constants'

export const BOOK_SEARCH_DEBOUNCE_MS = 300

export const BOOK_SEARCH_MIN_KEYWORD_LENGTH = 1

export const BOOK_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE

export const BOOK_RESERVATION_EXPIRY_HOURS = RESERVATION_EXPIRY_HOURS

export const BOOK_MAX_ACTIVE_RESERVATIONS = MAX_ACTIVE_RESERVATIONS_PER_USER

/** 可预约的状态列表 */
export const RESERVABLE_BOOK_STATUSES: readonly string[] = ['available', 'reserved'] as const

/** 可取消的预约状态列表 */
export const CANCELLABLE_RESERVATION_STATUSES: readonly string[] = ['active'] as const
