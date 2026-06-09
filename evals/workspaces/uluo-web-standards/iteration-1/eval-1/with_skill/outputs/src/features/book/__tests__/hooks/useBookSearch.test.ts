/**
 * useBookSearch Hook 单元测试。
 * 测试结构：Arrange → Act → Assert。
 * Mock API 层（bookApi），领域层不 mock。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookSearch } from '../../hooks/useBookSearch'
import { bookApi } from '../../api/book.api'
import type { ApiResponse, PaginatedData } from '@/types/api.types'
import type { Book } from '../../types/book.types'

vi.mock('../../api/book.api', () => ({
  bookApi: {
    searchBooks: vi.fn(),
  },
}))

function createMockBook(overrides: Partial<Book> = {}): Book
{
  return {
    id: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    isbn: '978-0-00-000000-0',
    status: 'available',
    description: 'A test book description',
    coverUrl: undefined,
    publishYear: 2024,
    publisher: 'Test Publisher',
    totalCopies: 5,
    availableCopies: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function createMockSearchResponse(items: Book[], total: number): ApiResponse<PaginatedData<Book>>
{
  return {
    success: true,
    data: {
      items,
      total,
      page: 1,
      pageSize: 20,
    },
  }
}

describe('useBookSearch', () =>
{
  beforeEach(() =>
  {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('should initialize with idle status', () =>
  {
    // Arrange + Act
    const { books, status, total, currentPage } = useBookSearch()

    // Assert
    expect(status.value).toBe('idle')
    expect(books.value).toEqual([])
    expect(total.value).toBe(0)
    expect(currentPage.value).toBe(1)
  })

  it('should search books and populate results', async () =>
  {
    // Arrange
    const mockBooks = [createMockBook()]
    vi.mocked(bookApi.searchBooks).mockResolvedValue(
      createMockSearchResponse(mockBooks, 1),
    )

    const { books, status, search } = useBookSearch()

    // Act
    await search('test')
    vi.advanceTimersByTime(300)
    // Allow async search to complete
    await vi.runAllTimersAsync()

    // Assert
    expect(status.value).toBe('success')
    expect(books.value).toHaveLength(1)
    expect(books.value[0]?.title).toBe('Test Book')
  })

  it('should handle search error', async () =>
  {
    // Arrange
    vi.mocked(bookApi.searchBooks).mockRejectedValue(new Error('Network error'))

    const { status, errorMessage, search } = useBookSearch()

    // Act
    await search('test')
    vi.advanceTimersByTime(300)
    await vi.runAllTimersAsync()

    // Assert
    expect(status.value).toBe('error')
    expect(errorMessage.value).toBeTruthy()
  })

  it('should reset state to idle', () =>
  {
    // Arrange
    const { reset, status, books, total } = useBookSearch()

    // Act
    reset()

    // Assert
    expect(status.value).toBe('idle')
    expect(books.value).toEqual([])
    expect(total.value).toBe(0)
  })
})
