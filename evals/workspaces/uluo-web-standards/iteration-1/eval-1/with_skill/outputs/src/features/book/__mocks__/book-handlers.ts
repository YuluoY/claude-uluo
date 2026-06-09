/**
 * 书籍领域 MSW (Mock Service Worker) handlers。
 * 用于测试时模拟后端 API 响应，不侵入业务代码。
 */
import { http, HttpResponse } from 'msw'
import { MOCK_BOOKS, MOCK_RESERVATIONS, createMockReservation } from './book-data'
import type { Book } from '../types/book.types'

const API_BASE = '/api/v1'

export const bookHandlers = [
  // GET /books — 搜索
  http.get(`${API_BASE}/books`, ({ request }) =>
  {
    const url = new URL(request.url)
    const keyword = url.searchParams.get('keyword')?.toLowerCase()

    let results: readonly Book[] = MOCK_BOOKS

    if (keyword)
    {
      results = MOCK_BOOKS.filter(
        book =>
          book.title.toLowerCase().includes(keyword)
          || book.author.toLowerCase().includes(keyword)
          || book.isbn.includes(keyword),
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        items: results,
        total: results.length,
        page: 1,
        pageSize: 20,
      },
    })
  }),

  // GET /books/:id — 详情
  http.get(`${API_BASE}/books/:id`, ({ params }) =>
  {
    const book = MOCK_BOOKS.find(b => b.id === params.id)

    if (!book)
    {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      }, { status: 404 })
    }

    return HttpResponse.json({ success: true, data: book })
  }),

  // POST /reservations — 创建预约
  http.post(`${API_BASE}/reservations`, async ({ request }) =>
  {
    const body = await request.json() as { bookId: string; userId: string }
    const book = MOCK_BOOKS.find(b => b.id === body.bookId)

    if (!book)
    {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      }, { status: 404 })
    }

    const reservation = createMockReservation({
      id: `res-${Date.now()}`,
      bookId: body.bookId,
      userId: body.userId,
      book,
    })

    return HttpResponse.json({
      success: true,
      data: {
        reservation,
        activeCount: 1,
      },
    }, { status: 201 })
  }),

  // DELETE /reservations/:id — 取消预约
  http.delete(`${API_BASE}/reservations/:id`, ({ params }) =>
  {
    const reservation = MOCK_RESERVATIONS.find(r => r.id === params.id)

    if (!reservation)
    {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Reservation not found' },
      }, { status: 404 })
    }

    return HttpResponse.json({
      success: true,
      data: {
        reservation: { ...reservation, status: 'cancelled' },
        activeCount: 0,
      },
    })
  }),
]
