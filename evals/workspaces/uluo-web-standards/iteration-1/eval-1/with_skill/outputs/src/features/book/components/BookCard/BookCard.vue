<script setup lang="ts">
/**
 * BookCard — 书籍卡片组件（纯展示）。
 * 显示书籍基本信息、状态标签、预约操作入口。
 * 通过 emit 向父组件传递预约/取消事件，不自行业务判断。
 */
import type { Book, ReservationStatus } from '../../types/book.types'
import { BookOpen } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  book: Book
  isReserved: boolean
  isReservable: boolean
  activeReservationStatus?: ReservationStatus
}>()

const emit = defineEmits<{
  reserve: [bookId: string]
  cancel: [bookId: string]
  select: [book: Book]
}>()

const STATUS_I18N_KEY_MAP: Record<string, string> = {
  available: 'book.status.available',
  borrowed: 'book.status.borrowed',
  reserved: 'book.status.reserved',
  maintenance: 'book.status.maintenance',
}

function getStatusLabel(status: string): string
{
  return t(STATUS_I18N_KEY_MAP[status] ?? 'book.status.available')
}

function getStatusClass(status: string): string
{
  const classMap: Record<string, string> = {
    available: 'book-card__status--available',
    borrowed: 'book-card__status--borrowed',
    reserved: 'book-card__status--reserved',
    maintenance: 'book-card__status--maintenance',
  }

  return classMap[status] ?? ''
}

function handleReserve(): void
{
  emit('reserve', props.book.id)
}

function handleCancel(): void
{
  emit('cancel', props.book.id)
}

function handleSelect(): void
{
  emit('select', props.book)
}
</script>

<template>
  <article class="book-card" @click="handleSelect">
    <div class="book-card__cover">
      <img
        v-if="book.coverUrl"
        :src="book.coverUrl"
        :alt="book.title"
        class="book-card__cover-img"
        loading="lazy"
      >
      <div v-else class="book-card__cover-placeholder">
        <BookOpen :size="32" aria-hidden="true" />
      </div>
    </div>

    <div class="book-card__info">
      <h3 class="book-card__title">{{ book.title }}</h3>
      <p class="book-card__author">{{ book.author }}</p>

      <div class="book-card__meta">
        <span :class="['book-card__status', getStatusClass(book.status)]">
          {{ getStatusLabel(book.status) }}
        </span>
        <span class="book-card__copies">
          {{ t('book.detail.availableCopies') }}: {{ book.availableCopies }}/{{ book.totalCopies }}
        </span>
      </div>
    </div>

    <div class="book-card__actions">
      <button
        v-if="isReserved"
        class="book-card__action-btn book-card__action-btn--cancel"
        @click.stop="handleCancel"
      >
        {{ t('reservation.cancel') }}
      </button>
      <button
        v-else-if="isReservable"
        class="book-card__action-btn book-card__action-btn--reserve"
        @click.stop="handleReserve"
      >
        {{ t('reservation.create') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.book-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-bg);
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.book-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.book-card__cover {
  width: 80px;
  height: 110px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--color-bg-tertiary);
}

.book-card__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-card__cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-muted);
}

.book-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.book-card__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-card__author {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.book-card__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: auto;
}

.book-card__status {
  padding: 2px var(--spacing-sm);
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.book-card__status--available {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.book-card__status--borrowed {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.book-card__status--reserved {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.book-card__status--maintenance {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}

.book-card__copies {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.book-card__actions {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
}

.book-card__action-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid;
  border-radius: 6px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.book-card__action-btn--reserve {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: var(--color-primary-foreground);
}

.book-card__action-btn--reserve:hover {
  background-color: var(--color-primary-hover);
}

.book-card__action-btn--cancel {
  border-color: var(--color-error);
  background-color: transparent;
  color: var(--color-error);
}

.book-card__action-btn--cancel:hover {
  background-color: var(--color-error-light);
}
</style>
