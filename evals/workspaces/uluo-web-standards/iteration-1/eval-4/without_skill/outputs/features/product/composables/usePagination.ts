import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface PaginationState {
  currentPage: Ref<number>
  pageSize: Ref<number>
  totalItems: Ref<number>
  totalPages: ComputedRef<number>
  paginatedItems: <T>(items: Ref<T[]>) => ComputedRef<T[]>
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  firstPage: () => void
  lastPage: () => void
  setPageSize: (size: number) => void
  setTotalItems: (count: number) => void
}

export function usePagination(initialPageSize = 10): PaginationState {
  const currentPage = ref(1)
  const pageSize = ref(initialPageSize)
  const totalItems = ref(0)

  const totalPages = computed(() => {
    if (totalItems.value === 0) return 0
    return Math.ceil(totalItems.value / pageSize.value)
  })

  function paginatedItems<T>(items: Ref<T[]>): ComputedRef<T[]> {
    return computed(() => {
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return items.value.slice(start, end)
    })
  }

  function goToPage(page: number): void {
    if (page < 1) {
      currentPage.value = 1
    } else if (page > totalPages.value) {
      currentPage.value = totalPages.value
    } else {
      currentPage.value = page
    }
  }

  function nextPage(): void {
    goToPage(currentPage.value + 1)
  }

  function prevPage(): void {
    goToPage(currentPage.value - 1)
  }

  function firstPage(): void {
    currentPage.value = 1
  }

  function lastPage(): void {
    currentPage.value = totalPages.value
  }

  function setPageSize(size: number): void {
    pageSize.value = size
    currentPage.value = 1
  }

  function setTotalItems(count: number): void {
    totalItems.value = count
  }

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotalItems,
  }
}
