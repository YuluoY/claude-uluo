<script setup lang="ts">
/**
 * BookList — 书籍列表组件。
 * 完整覆盖四态：idle / loading / empty / error / success。
 * 纯展示组件——不包含业务逻辑，所有数据通过 props 传入。
 */
import type { Book, ReservationStatus } from '../../types/book.types'
import type { AsyncStatus } from '@/types/common.types'
import { BookCard } from '../BookCard'
import { Loader2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  books: readonly Book[]
  status: AsyncStatus
  errorMessage?: string
  hasMore?: boolean
  reservedBookIds: ReadonlySet<string>
  reservableBookIds: ReadonlySet<string>
  reservationStatusMap: ReadonlyMap<string, ReservationStatus>
}

const props = withDefaults(defineProps<Props>(), {
  errorMessage: '',
  hasMore: false,
})

const emit = defineEmits<{
  reserve: [bookId: string]
  cancel: [bookId: string]
  select: [book: Book]
  loadMore: []
  retry: []
}>()
</script>

<template>
  <div class="book-list">
    <!-- idle: 初始状态——提示用户开始搜索 -->
    <div v-if="status === 'idle'" class="book-list__state book-list__state--idle">
      <p class="book-list__state-text">
        {{ t('book.search.placeholder') }}
      </p>
    </div>

    <!-- loading: 搜索中 -->
    <div v-else-if="status === 'loading' && books.length === 0" class="book-list__state book-list__state--loading">
      <Loader2 :size="24" class="book-list__spinner" aria-hidden="true" />
      <p class="book-list__state-text">{{ t('book.search.loading') }}</p>
    </div>

    <!-- error: 搜索失败 -->
    <div v-else-if="status === 'error'" class="book-list__state book-list__state--error">
      <p class="book-list__state-text">{{ errorMessage || t('common.error') }}</p>
      <button class="book-list__retry-btn" @click="emit('retry')">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- empty: 无结果 -->
    <div v-else-if="status === 'success' && books.length === 0" class="book-list__state book-list__state--empty">
      <p class="book-list__state-text">{{ t('book.search.noResults') }}</p>
    </div>

    <!-- success: 有结果 -->
    <template v-else>
      <ul class="book-list__items">
        <li v-for="book in books" :key="book.id" class="book-list__item">
          <BookCard
            :book="book"
            :is-reserved="reservedBookIds.has(book.id)"
            :is-reservable="reservableBookIds.has(book.id)"
            :active-reservation-status="reservationStatusMap.get(book.id)"
            @reserve="emit('reserve', $event)"
            @cancel="emit('cancel', $event)"
            @select="emit('select', $event)"
          />
        </li>
      </ul>

      <div v-if="hasMore" class="book-list__load-more">
        <button
          class="book-list__load-more-btn"
          :disabled="status === 'loading'"
          @click="emit('loadMore')"
        >
          <Loader2 v-if="status === 'loading'" :size="16" class="book-list__spinner" aria-hidden="true" />
          <span v-else>{{ t('common.loading') }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.book-list {
  width: 100%;
}

.book-list__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl) var(--spacing-lg);
  text-align: center;
}

.book-list__state-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
}

.book-list__spinner {
  animation: spin 1s linear infinite;
  color: var(--color-primary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.book-list__retry-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.book-list__retry-btn:hover {
  background-color: var(--color-primary-light);
}

.book-list__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.book-list__item {
  list-style: none;
}

.book-list__load-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg) 0;
}

.book-list__load-more-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-xl);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.book-list__load-more-btn:hover:not(:disabled) {
  background-color: var(--color-bg-secondary);
}

.book-list__load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
