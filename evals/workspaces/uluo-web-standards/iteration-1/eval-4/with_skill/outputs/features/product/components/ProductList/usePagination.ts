import { ref, computed, toValue, readonly, type MaybeRefOrGetter } from 'vue'

/** usePagination 配置 */
export interface UsePaginationOptions {
  /** 每页条数，默认 10 */
  pageSize?: number
}

/** usePagination 返回值 */
export interface UsePaginationReturn<T> {
  /** 当前页码（只读） */
  currentPage: Readonly<ReturnType<typeof ref<number>>>
  /** 总页数 */
  totalPages: ReturnType<typeof computed<number>>
  /** 当前页数据 */
  paginatedItems: ReturnType<typeof computed<T[]>>
  /** 数据总条数 */
  totalCount: ReturnType<typeof computed<number>>
  /** 跳转到指定页（自动钳位到有效范围） */
  goToPage: (page: number) => void
  /** 下一页 */
  nextPage: () => void
  /** 上一页 */
  prevPage: () => void
  /** 重置到第一页（筛选条件变更时调用） */
  resetPage: () => void
}

/**
 * 通用分页 composable。
 * 接受任意类型数组（支持 Ref / ComputedRef / Getter / 裸值），
 * 返回当前页数据和分页控制方法。
 *
 * @param items - 数据源，支持 MaybeRefOrGetter
 * @param options - 分页配置
 * @returns 分页状态和控制方法
 */
export function usePagination<T>(
  items: MaybeRefOrGetter<T[]>,
  options: UsePaginationOptions = {},
): UsePaginationReturn<T> {
  const pageSize = options.pageSize ?? 10

  const currentPage = ref(1)

  const totalCount = computed(() => toValue(items).length)

  const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))

  const paginatedItems = computed(() => {
    const source = toValue(items)
    const start = (currentPage.value - 1) * pageSize
    return source.slice(start, start + pageSize)
  })

  /** 跳转到指定页，超出范围自动钳位 */
  function goToPage(page: number): void {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  }

  function nextPage(): void {
    if (currentPage.value < totalPages.value) {
      currentPage.value += 1
    }
  }

  function prevPage(): void {
    if (currentPage.value > 1) {
      currentPage.value -= 1
    }
  }

  function resetPage(): void {
    currentPage.value = 1
  }

  return {
    currentPage: readonly(currentPage),
    totalPages,
    paginatedItems,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
  }
}
