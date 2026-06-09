/**
 * 书籍领域 Mock 数据工厂。
 * 每个工厂函数接受 overrides 参数，用于按需覆盖字段。
 */
import type { Book, Reservation, ReservationCount, ReservationStatus } from '../types/book.types'

export function createMockBook(overrides: Partial<Book> = {}): Book
{
  return {
    id: 'book-001',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '978-0-13-449416-6',
    status: 'available',
    description: 'A comprehensive guide to software architecture and design.',
    coverUrl: 'https://example.com/covers/clean-architecture.jpg',
    publishYear: 2017,
    publisher: 'Prentice Hall',
    totalCopies: 10,
    availableCopies: 3,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
    ...overrides,
  }
}

export function createMockReservation(overrides: Partial<Reservation> = {}): Reservation
{
  return {
    id: 'res-001',
    bookId: 'book-001',
    userId: 'user-001',
    status: 'active',
    book: createMockBook(),
    reservedAt: '2024-06-08T10:00:00Z',
    expiresAt: '2024-06-10T10:00:00Z',
    ...overrides,
  }
}

export function createMockReservationCount(overrides: Partial<ReservationCount> = {}): ReservationCount
{
  return {
    total: 10,
    active: 3,
    fulfilled: 5,
    cancelled: 1,
    expired: 1,
    ...overrides,
  }
}

export const MOCK_BOOKS: readonly Book[] = [
  createMockBook({ id: 'book-001', title: 'Clean Architecture' }),
  createMockBook({
    id: 'book-002',
    title: 'Design Patterns',
    author: 'Gang of Four',
    isbn: '978-0-201-63361-0',
    status: 'borrowed',
    availableCopies: 0,
  }),
  createMockBook({
    id: 'book-003',
    title: 'Refactoring',
    author: 'Martin Fowler',
    isbn: '978-0-13-475759-9',
    status: 'available',
    availableCopies: 5,
  }),
  createMockBook({
    id: 'book-004',
    title: 'Domain-Driven Design',
    author: 'Eric Evans',
    isbn: '978-0-321-12521-7',
    status: 'reserved',
    availableCopies: 1,
  }),
  createMockBook({
    id: 'book-005',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas',
    isbn: '978-0-13-595705-9',
    status: 'maintenance',
    availableCopies: 0,
  }),
]

export const MOCK_RESERVATIONS: readonly Reservation[] = [
  createMockReservation({ id: 'res-001', book: MOCK_BOOKS[0] as Book }),
  createMockReservation({
    id: 'res-002',
    bookId: 'book-003',
    book: MOCK_BOOKS[2] as Book,
    status: 'fulfilled' as ReservationStatus,
  }),
]
