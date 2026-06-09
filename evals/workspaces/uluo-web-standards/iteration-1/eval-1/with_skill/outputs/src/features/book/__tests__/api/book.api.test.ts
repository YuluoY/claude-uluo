/**
 * bookApi 层测试——验证 API 函数调用的正确性。
 * Mock HTTP 层，测试 URL 构建和参数传递。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookApi } from '../../api/book.api'
import { http } from '@/shared/http'

vi.mock('@/shared/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('bookApi', () =>
{
  beforeEach(() =>
  {
    vi.clearAllMocks()
  })

  describe('searchBooks', () =>
  {
    it('should call GET /books with keyword parameter', async () =>
    {
      // Arrange
      vi.mocked(http.get).mockResolvedValue({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20 } })

      // Act
      await bookApi.searchBooks({ keyword: 'typescript' })

      // Assert
      expect(http.get).toHaveBeenCalledWith('/books?keyword=typescript')
    })

    it('should include multiple query parameters', async () =>
    {
      // Arrange
      vi.mocked(http.get).mockResolvedValue({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20 } })

      // Act
      await bookApi.searchBooks({
        keyword: 'typescript',
        page: 2,
        pageSize: 10,
      })

      // Assert
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('keyword=typescript'),
      )
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
      )
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('page_size=10'),
      )
    })
  })

  describe('createReservation', () =>
  {
    it('should call POST /reservations with payload and Idempotency-Key', async () =>
    {
      // Arrange
      vi.mocked(http.post).mockResolvedValue({ success: true, data: {} })

      const payload = { bookId: 'book-1', userId: 'user-1' }

      // Act
      await bookApi.createReservation(payload)

      // Assert
      expect(http.post).toHaveBeenCalledWith(
        '/reservations',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        }),
      )
    })
  })

  describe('cancelReservation', () =>
  {
    it('should call DELETE /reservations/:id', async () =>
    {
      // Arrange
      vi.mocked(http.delete).mockResolvedValue({ success: true, data: {} })

      // Act
      await bookApi.cancelReservation('res-1')

      // Assert
      expect(http.delete).toHaveBeenCalledWith('/reservations/res-1')
    })
  })

  describe('fetchReservationCount', () =>
  {
    it('should call GET /reservations/count with user_id', async () =>
    {
      // Arrange
      vi.mocked(http.get).mockResolvedValue({ success: true, data: {} })

      // Act
      await bookApi.fetchReservationCount('user-1')

      // Assert
      expect(http.get).toHaveBeenCalledWith('/reservations/count?user_id=user-1')
    })
  })
})
