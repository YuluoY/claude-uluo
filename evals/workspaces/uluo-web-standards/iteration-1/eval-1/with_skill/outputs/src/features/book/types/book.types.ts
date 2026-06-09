/**
 * 书籍领域类型定义。
 * 使用 string union 替代 enum，遵循 no-enum 规则。
 */
import type { PaginatedData } from '@/types/api.types'

/** 书籍状态 */
export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'maintenance'

export const BOOK_STATUS = {
  available: 'available',
  borrowed: 'borrowed',
  reserved: 'reserved',
  maintenance: 'maintenance',
} as const

/** 服务端返回的完整 Book */
export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  status: BookStatus
  description: string
  coverUrl?: string
  publishYear: number
  publisher: string
  totalCopies: number
  availableCopies: number
  createdAt: string
  updatedAt: string
}

/** 预约状态 */
export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled' | 'expired'

export const RESERVATION_STATUS = {
  active: 'active',
  fulfilled: 'fulfilled',
  cancelled: 'cancelled',
  expired: 'expired',
} as const

/** 服务端返回的完整 Reservation */
export interface Reservation {
  id: string
  bookId: string
  userId: string
  status: ReservationStatus
  book: Book
  reservedAt: string
  expiresAt: string
  cancelledAt?: string
}

/** 搜索查询参数 */
export interface BookSearchQueryParams {
  keyword?: string
  author?: string
  isbn?: string
  status?: BookStatus
  page?: number
  pageSize?: number
}

/** 创建预约请求体 */
export interface CreateReservationPayload {
  bookId: string
  userId: string
}

/** 用户预约查询参数 */
export interface ReservationQueryParams {
  userId: string
  status?: ReservationStatus
  page?: number
  pageSize?: number
}

/** 带计数的预约统计 */
export interface ReservationCount {
  total: number
  active: number
  fulfilled: number
  cancelled: number
  expired: number
}

/** 预约操作结果 */
export interface ReservationResult {
  reservation: Reservation
  activeCount: number
}
