<script setup lang="ts">
/**
 * ReservationPanel — 预约操作面板组件。
 * 显示预约确认/取消确认，处理预约过程中的 loading/error 状态。
 */
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Book, Reservation } from '../../types/book.types'
import type { AsyncStatus } from '@/types/common.types'
import { useI18n } from 'vue-i18n'
import { Loader2, AlertCircle } from 'lucide-vue-next'

const { t } = useI18n()

interface Props {
  book: Book
  actionStatus: AsyncStatus
  errorMessage: string
  isAlreadyReserved: boolean
  canReserve: boolean
  canReserveMore: boolean
  activeReservation?: Reservation
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirmReserve: [bookId: string]
  confirmCancel: [reservationId: string]
  close: []
}>()

const showConfirmCancel = ref(false)

function handleReserveClick(): void
{
  emit('confirmReserve', props.book.id)
}

function handleCancelClick(): void
{
  // 需要二次确认
  if (!showConfirmCancel.value)
  {
    showConfirmCancel.value = true

    return
  }

  if (props.activeReservation)
    emit('confirmCancel', props.activeReservation.id)
}

function handleDismissCancel(): void
{
  showConfirmCancel.value = false
}

function getActionLabel(): string
{
  if (props.actionStatus === 'loading')
    return t('reservation.creating')

  if (props.isAlreadyReserved)
    return t('reservation.cancel')

  return t('reservation.create')
}

function getHintText(): string | undefined
{
  if (!props.canReserveMore && !props.isAlreadyReserved)
    return t('reservation.maxReached', { max: 5 })

  if (!props.canReserve && !props.isAlreadyReserved)
    return t('reservation.notAvailable')

  if (props.isAlreadyReserved && props.activeReservation)
    return t('reservation.expiresIn', { hours: 48 })

  return undefined
}
</script>

<template>
  <aside class="reservation-panel">
    <header class="reservation-panel__header">
      <h3 class="reservation-panel__title">{{ book.title }}</h3>
      <button
        class="reservation-panel__close"
        @click="emit('close')"
        aria-label="Close panel"
      >
        &times;
      </button>
    </header>

    <div class="reservation-panel__body">
      <p class="reservation-panel__author">{{ t('book.detail.author') }}: {{ book.author }}</p>
      <p class="reservation-panel__copies">
        {{ t('book.detail.availableCopies') }}: {{ book.availableCopies }}/{{ book.totalCopies }}
      </p>

      <!-- Hint text -->
      <p v-if="getHintText()" class="reservation-panel__hint">
        {{ getHintText() }}
      </p>

      <!-- Error message -->
      <div v-if="actionStatus === 'error' && errorMessage" class="reservation-panel__error">
        <AlertCircle :size="16" aria-hidden="true" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Cancel confirmation -->
      <div v-if="showConfirmCancel" class="reservation-panel__cancel-confirm">
        <p>{{ t('common.confirm') }}</p>
        <div class="reservation-panel__cancel-actions">
          <button
            class="reservation-panel__btn reservation-panel__btn--danger"
            :disabled="actionStatus === 'loading'"
            @click="handleCancelClick"
          >
            <Loader2 v-if="actionStatus === 'loading'" :size="14" class="book-list__spinner" aria-hidden="true" />
            <span v-else>{{ t('reservation.cancel') }}</span>
          </button>
          <button
            class="reservation-panel__btn reservation-panel__btn--secondary"
            @click="handleDismissCancel"
          >
            {{ t('common.back') }}
          </button>
        </div>
      </div>

      <!-- Action buttons -->
      <div v-else class="reservation-panel__actions">
        <button
          v-if="!isAlreadyReserved"
          class="reservation-panel__btn reservation-panel__btn--primary"
          :disabled="!canReserve || !canReserveMore || actionStatus === 'loading'"
          @click="handleReserveClick"
        >
          <Loader2 v-if="actionStatus === 'loading'" :size="14" class="book-list__spinner" aria-hidden="true" />
          <span v-else>{{ t('reservation.create') }}</span>
        </button>

        <button
          v-else
          class="reservation-panel__btn reservation-panel__btn--danger-outline"
          :disabled="actionStatus === 'loading'"
          @click="handleCancelClick"
        >
          <Loader2 v-if="actionStatus === 'loading'" :size="14" class="book-list__spinner" aria-hidden="true" />
          <span v-else>{{ t('reservation.cancel') }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.reservation-panel {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-bg);
}

.reservation-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.reservation-panel__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.reservation-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-xl);
  cursor: pointer;
  flex-shrink: 0;
}

.reservation-panel__close:hover {
  color: var(--color-text-primary);
}

.reservation-panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.reservation-panel__author,
.reservation-panel__copies {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.reservation-panel__hint {
  padding: var(--spacing-sm);
  border-radius: 6px;
  background-color: var(--color-warning-light);
  color: var(--color-warning);
  font-size: var(--font-size-sm);
}

.reservation-panel__error {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: 6px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.reservation-panel__actions {
  margin-top: var(--spacing-sm);
}

.reservation-panel__cancel-confirm {
  margin-top: var(--spacing-sm);
}

.reservation-panel__cancel-confirm p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.reservation-panel__cancel-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.reservation-panel__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.reservation-panel__btn--primary {
  border: none;
  background-color: var(--color-primary);
  color: var(--color-primary-foreground);
}

.reservation-panel__btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.reservation-panel__btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reservation-panel__btn--danger {
  border: none;
  background-color: var(--color-error);
  color: var(--color-primary-foreground);
}

.reservation-panel__btn--danger-outline {
  border: 1px solid var(--color-error);
  background-color: transparent;
  color: var(--color-error);
}

.reservation-panel__btn--danger-outline:hover:not(:disabled) {
  background-color: var(--color-error-light);
}

.reservation-panel__btn--secondary {
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  color: var(--color-text-secondary);
}

.reservation-panel__btn--secondary:hover {
  background-color: var(--color-bg-secondary);
}

.book-list__spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
