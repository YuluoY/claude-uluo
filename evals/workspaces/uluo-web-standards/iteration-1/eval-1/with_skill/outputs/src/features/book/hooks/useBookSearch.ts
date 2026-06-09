/**
 * 书籍搜索 Hook——管理搜索状态、防抖、分页、结果缓存。
 * 一个 Hook 一个职责：只负责搜索流程。
 */
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Book, BookSearchQueryParams } from '../types/book.types'
import type { AsyncStatus } from '@/types/common.types'
import { bookApi } from '../api/book.api'
import { to } from '@/shared/utils'
import { BOOK_SEARCH_DEBOUNCE_MS, BOOK_DEFAULT_PAGE_SIZE } from '../constants/book.constants'
import { createLogger } from '@/monitoring'

const logger = createLogger('useBookSearch')

export interface UseBookSearchReturn {
  books: Ref<readonly Book[]>
  status: Ref<AsyncStatus>
  total: Ref<number>
  currentPage: Ref<number>
  keyword: Ref<string>
  hasMore: ComputedRef<boolean>
  errorMessage: Ref<string>
  search: (keyword: string) => Promise<void>
  loadMore: () => Promise<void>
  reset: () => void
}

export function useBookSearch(): UseBookSearchReturn
{
  const books: Ref<Book[]> = ref([])
  const status = ref<AsyncStatus>('idle')
  const total = ref(0)
  const currentPage = ref(1)
  const keyword = ref('')
  const errorMessage = ref('')

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const pageSize = BOOK_DEFAULT_PAGE_SIZE

  const hasMore: ComputedRef<boolean> = computed(() =>
    books.value.length < total.value,
  )

  async function executeSearch(query: BookSearchQueryParams): Promise<void>
  {
    status.value = 'loading'
    errorMessage.value = ''

    const [err, response] = await to(bookApi.searchBooks(query))

    if (err || !response || !response.success)
    {
      const message = err instanceof Error ? err.message : 'Search failed'
      logger.error('Book search failed', err, { query })
      status.value = 'error'
      errorMessage.value = message

      return
    }

    books.value = response.data.items
    total.value = response.data.total
    currentPage.value = response.data.page
    status.value = books.value.length === 0 ? 'success' : 'success'

    logger.info('Book search completed', {
      keyword: query.keyword,
      resultCount: response.data.items.length,
    })
  }

  async function search(newKeyword: string): Promise<void>
  {
    keyword.value = newKeyword

    if (debounceTimer)
      clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () =>
    {
      currentPage.value = 1

      await executeSearch({
        keyword: newKeyword,
        page: 1,
        pageSize,
      })
    }, BOOK_SEARCH_DEBOUNCE_MS)
  }

  async function loadMore(): Promise<void>
  {
    if (!hasMore.value || status.value === 'loading')
      return

    const nextPage = currentPage.value + 1
    status.value = 'loading'

    const query: BookSearchQueryParams = {
      keyword: keyword.value,
      page: nextPage,
      pageSize,
    }

    const [err, response] = await to(bookApi.searchBooks(query))

    if (err || !response || !response.success)
    {
      const message = err instanceof Error ? err.message : 'Load more failed'
      logger.error('Load more books failed', err, { query })
      status.value = 'error'
      errorMessage.value = message

      return
    }

    books.value = [...books.value, ...response.data.items]
    total.value = response.data.total
    currentPage.value = nextPage
    status.value = 'success'
  }

  function reset(): void
  {
    if (debounceTimer)
      clearTimeout(debounceTimer)

    books.value = []
    status.value = 'idle'
    total.value = 0
    currentPage.value = 1
    keyword.value = ''
    errorMessage.value = ''
  }

  return {
    books: books as Ref<readonly Book[]>,
    status,
    total,
    currentPage,
    keyword,
    hasMore,
    errorMessage,
    search,
    loadMore,
    reset,
  }
}
