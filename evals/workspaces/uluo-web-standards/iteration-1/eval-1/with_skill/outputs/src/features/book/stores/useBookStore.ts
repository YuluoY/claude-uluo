/**
 * 书籍领域全局状态管理（Pinia store）。
 * 管理当前选中的书籍、搜索状态、预约状态。
 * 组件通过此 store 消费数据，不直接操作原始 API 响应。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Book, Reservation } from '../types/book.types'
import type { AsyncStatus } from '@/types/common.types'
import { useBookSearch } from '../hooks/useBookSearch'
import { useReservation } from '../hooks/useReservation'

export const useBookStore = defineStore('book', () =>
{
  // --- 搜索状态 ---
  const search = useBookSearch()

  // --- 预约状态 ---
  const reservation = useReservation()

  // --- 选中书籍 ---
  const selectedBook: Ref<Book | undefined> = ref(undefined)
  const detailStatus = ref<AsyncStatus>('idle')

  // --- 计算属性 ---
  const activeReservations: ComputedRef<readonly Reservation[]> = computed(() =>
    reservation.userReservations.value.filter(r => r.status === 'active'),
  )

  const activeReservationBookIds: ComputedRef<Set<string>> = computed(() =>
    new Set(
      activeReservations.value.map(r => r.bookId),
    ),
  )

  const canReserveMore: ComputedRef<boolean> = computed(() =>
    (reservation.reservationCount.value?.active ?? 0) < 5,
  )

  // --- 操作 ---
  function selectBook(book: Book): void
  {
    selectedBook.value = book
    detailStatus.value = 'success'
  }

  function clearSelection(): void
  {
    selectedBook.value = undefined
    detailStatus.value = 'idle'
  }

  async function initUserData(userId: string): Promise<void>
  {
    await Promise.all([
      reservation.loadUserReservations(userId),
      reservation.loadReservationCount(userId),
    ])
  }

  return {
    // 搜索
    books: search.books,
    searchStatus: search.status,
    searchTotal: search.total,
    searchKeyword: search.keyword,
    hasMoreBooks: search.hasMore,
    searchErrorMessage: search.errorMessage,
    performSearch: search.search,
    loadMoreBooks: search.loadMore,
    resetSearch: search.reset,

    // 预约
    userReservations: reservation.userReservations,
    reservationCount: reservation.reservationCount,
    actionStatus: reservation.actionStatus,
    actionErrorMessage: reservation.errorMessage,
    reserveBook: reservation.reserve,
    cancelReservation: reservation.cancel,
    hasActiveReservation: reservation.hasActiveReservation,
    activeReservations,
    activeReservationBookIds,
    canReserveMore,

    // 选中
    selectedBook,
    detailStatus,
    selectBook,
    clearSelection,

    // 初始化
    initUserData,
  }
})
