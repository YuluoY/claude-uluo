<script setup lang="ts">
import { computed, watch } from 'vue'
import { usePagination } from './usePagination'
import type { Product, ProductListProps, ProductListEmits } from './types'

// Props —— 显式类型声明，带默认值
const props = withDefaults(defineProps<ProductListProps>(), {
  loading: false,
  error: null,
  pageSize: 10,
})

// Emits —— 显式类型声明
const emit = defineEmits<ProductListEmits>()

// 按分类筛选（纯 computed，无副作用）
const filteredProducts = computed<Product[]>(() => {
  // 空分类表示不过滤，返回全部商品
  if (!props.category) {
    return props.products
  }
  return props.products.filter((product) => product.category === props.category)
})

// 分页逻辑
const {
  currentPage,
  totalPages,
  paginatedItems,
  totalCount,
  goToPage,
  resetPage,
} = usePagination<Product>(filteredProducts, { pageSize: props.pageSize })

// 分类变化时重置分页到第一页——这是 watch 的合理用途：
// 筛选条件变化 → 必须执行副作用（重置页码），无法用 computed 表达
watch(
  () => props.category,
  () => {
    resetPage()
  },
)

// ---- 展示状态判断（四态） ----

/** 错误态：有错误信息且非加载中 */
const isError = computed(() => props.error !== null && props.error !== undefined && !props.loading)

/** 加载态：加载中且无缓存数据（避免覆盖已有数据造成闪烁） */
const isLoading = computed(() => props.loading && totalCount.value === 0)

/** 空状态：非加载且筛选后无数据 */
const isEmpty = computed(() => !props.loading && totalCount.value === 0 && !isError.value)

// ---- 事件处理 ----

function handleSelect(productId: string): void {
  emit('select', productId)
}

function handlePageChange(page: number): void {
  goToPage(page)
  emit('page-change', page)
}

function handleRetry(): void {
  emit('retry')
}
</script>

<template>
  <div class="product-list">
    <!-- 错误态：显示错误信息 + 重试按钮 -->
    <div
      v-if="isError"
      class="product-list__error"
      role="alert"
    >
      <p class="product-list__error-message">{{ props.error }}</p>
      <button
        class="product-list__retry-btn"
        @click="handleRetry"
      >
        重试
      </button>
    </div>

    <!-- 加载态：仅无缓存数据时展示骨架屏 -->
    <div
      v-else-if="isLoading"
      class="product-list__loading"
      aria-busy="true"
      aria-label="正在加载商品列表"
    >
      <span class="product-list__loading-text">加载中...</span>
    </div>

    <!-- 空状态：有引导文案 -->
    <div
      v-else-if="isEmpty"
      class="product-list__empty"
    >
      <p class="product-list__empty-title">暂无商品</p>
      <p class="product-list__empty-hint">
        {{ props.category ? `分类「${props.category}」下没有商品，试试其他分类` : '暂无商品数据' }}
      </p>
    </div>

    <!-- 成功态：正常展示 -->
    <div
      v-else
      class="product-list__body"
    >
      <ul class="product-list__items">
        <li
          v-for="product in paginatedItems"
          :key="product.id"
          class="product-list__item-wrapper"
        >
          <button
            class="product-list__item"
            type="button"
            :aria-label="`选择商品：${product.name}`"
            @click="handleSelect(product.id)"
          >
            <span class="product-list__item-name">{{ product.name }}</span>
            <span class="product-list__item-price">&yen;{{ product.price.toFixed(2) }}</span>
          </button>
        </li>
      </ul>

      <!-- 分页导航 -->
      <nav
        v-if="totalPages > 1"
        class="product-list__pagination"
        aria-label="分页导航"
      >
        <button
          class="product-list__page-btn"
          type="button"
          :disabled="currentPage <= 1"
          aria-label="上一页"
          @click="handlePageChange(currentPage - 1)"
        >
          上一页
        </button>

        <span
          class="product-list__page-info"
          aria-current="page"
        >
          {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          class="product-list__page-btn"
          type="button"
          :disabled="currentPage >= totalPages"
          aria-label="下一页"
          @click="handlePageChange(currentPage + 1)"
        >
          下一页
        </button>
      </nav>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.product-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  color: var(--color-text);
  background-color: var(--color-surface);

  // ---- 错误态 ----
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    min-height: var(--size-error-min-height, 200px);
    padding: var(--spacing-xl);
  }

  &__error-message {
    margin: 0;
    font-size: var(--font-size-md);
    color: var(--color-error);
    text-align: center;
  }

  &__retry-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--size-btn-min-width, 80px);
    min-height: var(--size-touch-target, 44px);
    padding: var(--spacing-xs) var(--spacing-lg);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: background-color var(--duration-fast);

    &:hover {
      background-color: var(--color-primary-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  // ---- 加载态 ----
  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--size-loading-min-height, 200px);
  }

  &__loading-text {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  // ---- 空状态 ----
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    min-height: var(--size-empty-min-height, 200px);
    padding: var(--spacing-xl);
  }

  &__empty-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
  }

  &__empty-hint {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-align: center;
  }

  // ---- 成功态 / 列表 ----
  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item-wrapper {
    display: contents;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: var(--size-touch-target, 44px);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    color: var(--color-text);
    font-size: var(--font-size-md);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duration-fast);

    &:hover {
      background-color: var(--color-surface-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__item-name {
    color: var(--color-text);
  }

  &__item-price {
    font-weight: var(--font-weight-bold);
    color: var(--color-price);
  }

  // ---- 分页 ----
  &__pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) 0;
  }

  &__page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--size-touch-target, 44px);
    padding: var(--spacing-xs) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background-color var(--duration-fast), border-color var(--duration-fast);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background-color: var(--color-primary-light);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: var(--opacity-disabled, 0.4);
      cursor: not-allowed;
    }
  }

  &__page-info {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
}
</style>
