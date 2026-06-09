<script setup lang="ts">
/**
 * BookSearch — 书籍搜索组件。
 * 包含搜索输入框和搜索按钮，支持防抖搜索。
 * 使用 emit 向父组件传递搜索关键词。
 */
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { MAX_SEARCH_KEYWORD_LENGTH } from '@/constants/app.constants'

const { t } = useI18n()

const emit = defineEmits<{
  search: [keyword: string]
}>()

const inputValue = ref('')

function handleSubmit(): void
{
  const trimmed = inputValue.value.trim()

  if (trimmed.length === 0)
    return

  if (trimmed.length > MAX_SEARCH_KEYWORD_LENGTH)
    return

  emit('search', trimmed)
}

function handleInputClear(): void
{
  inputValue.value = ''
  emit('search', '')
}
</script>

<template>
  <form class="book-search" @submit.prevent="handleSubmit">
    <div class="book-search__input-wrapper">
      <Search class="book-search__icon" :size="18" aria-hidden="true" />

      <input
        v-model="inputValue"
        type="search"
        class="book-search__input"
        :placeholder="t('book.search.placeholder')"
        :maxlength="MAX_SEARCH_KEYWORD_LENGTH"
        aria-label="Search books"
      />

      <button
        v-if="inputValue.length > 0"
        type="button"
        class="book-search__clear"
        @click="handleInputClear"
        aria-label="Clear search"
      >
        &times;
      </button>
    </div>

    <button
      type="submit"
      class="book-search__button"
      :disabled="inputValue.trim().length === 0"
    >
      {{ t('book.search.button') }}
    </button>
  </form>
</template>

<style scoped>
.book-search {
  display: flex;
  gap: var(--spacing-sm);
  width: 100%;
}

.book-search__input-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

.book-search__input-wrapper:focus-within {
  border-color: var(--color-border-focus);
}

.book-search__icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.book-search__input {
  flex: 1;
  margin-left: var(--spacing-sm);
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.book-search__input::placeholder {
  color: var(--color-text-muted);
}

.book-search__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: var(--spacing-sm);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.book-search__button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: 8px;
  background-color: var(--color-primary);
  color: var(--color-primary-foreground);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.book-search__button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.book-search__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
