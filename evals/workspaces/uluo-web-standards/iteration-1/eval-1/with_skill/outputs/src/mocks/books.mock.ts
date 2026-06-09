/**
 * 全局书籍 Mock 数据——跨领域共享。
 */
import type { Book } from '@/features/book'

export function createGlobalMockBook(overrides: Partial<Book> = {}): Book
{
  return {
    id: 'g-book-001',
    title: 'Sample Book',
    author: 'Sample Author',
    isbn: '978-0-00-000000-0',
    status: 'available',
    description: '',
    coverUrl: undefined,
    publishYear: 2024,
    publisher: '',
    totalCopies: 1,
    availableCopies: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
