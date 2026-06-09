/**
 * 书籍领域 API 层——封装所有书籍/预约相关的 HTTP 请求。
 * 全部经由 shared/http 统一客户端，不在组件/store 中直接调 fetch。
 * API 函数不做 try-catch——错误由调用方 to() 消费。
 */
import type { ApiResponse, PaginatedData } from '@/types/api.types'
import type {
  Book,
  BookSearchQueryParams,
  Reservation,
  ReservationQueryParams,
  CreateReservationPayload,
  ReservationResult,
  ReservationCount,
} from '../types/book.types'
import { http } from '@/shared/http'

export const bookApi = {
  /**
   * 搜索书籍——支持关键词/作者/ISBN 组合查询。
   * 使用 offset-based 分页（管理后台场景）。
   */
  searchBooks(params: BookSearchQueryParams): Promise<ApiResponse<PaginatedData<Book>>>
  {
    const queryParams: Record<string, string> = {}

    if (params.keyword)
      queryParams.keyword = params.keyword
    if (params.author)
      queryParams.author = params.author
    if (params.isbn)
      queryParams.isbn = params.isbn
    if (params.status)
      queryParams.status = params.status
    if (params.page !== undefined)
      queryParams.page = String(params.page)
    if (params.pageSize !== undefined)
      queryParams.page_size = String(params.pageSize)

    const query = new URLSearchParams(queryParams).toString()

    return http.get<PaginatedData<Book>>(`/books?${query}`)
  },

  /** 获取单本书详情 */
  getBookById(id: string): Promise<ApiResponse<Book>>
  {
    return http.get<Book>(`/books/${id}`)
  },

  /** 创建预约 */
  createReservation(payload: CreateReservationPayload): Promise<ApiResponse<ReservationResult>>
  {
    return http.post<ReservationResult>('/reservations', payload, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    })
  },

  /** 取消预约——子资源动作模式 DELETE /reservations/:id */
  cancelReservation(reservationId: string): Promise<ApiResponse<ReservationResult>>
  {
    return http.delete<ReservationResult>(`/reservations/${reservationId}`)
  },

  /** 获取用户的所有预约 */
  fetchUserReservations(params: ReservationQueryParams): Promise<ApiResponse<PaginatedData<Reservation>>>
  {
    const queryParams: Record<string, string> = {
      user_id: params.userId,
    }

    if (params.status)
      queryParams.status = params.status
    if (params.page !== undefined)
      queryParams.page = String(params.page)
    if (params.pageSize !== undefined)
      queryParams.page_size = String(params.pageSize)

    const query = new URLSearchParams(queryParams).toString()

    return http.get<PaginatedData<Reservation>>(`/reservations?${query}`)
  },

  /** 获取用户预约统计 */
  fetchReservationCount(userId: string): Promise<ApiResponse<ReservationCount>>
  {
    return http.get<ReservationCount>(`/reservations/count?user_id=${userId}`)
  },
}
