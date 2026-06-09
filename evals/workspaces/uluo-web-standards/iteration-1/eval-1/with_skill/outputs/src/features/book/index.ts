/**
 * Book 领域模块出口——唯一对外接口。
 * 外部代码不穿透切片内部结构。
 */
export { useBookSearch } from './hooks/useBookSearch'
export type { UseBookSearchReturn } from './hooks/useBookSearch'
export { useReservation } from './hooks/useReservation'
export type { UseReservationReturn } from './hooks/useReservation'
export { useBookStore } from './stores/useBookStore'
export { BookSearch, BookList, BookCard, ReservationPanel } from './components'
export { bookApi } from './api/book.api'
export type {
  Book,
  BookStatus,
  Reservation,
  ReservationStatus,
  BookSearchQueryParams,
  CreateReservationPayload,
  ReservationQueryParams,
  ReservationCount,
  ReservationResult,
} from './types/book.types'
