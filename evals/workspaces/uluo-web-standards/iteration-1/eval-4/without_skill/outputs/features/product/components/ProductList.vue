<script setup lang="ts">
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { usePagination } from '../composables/usePagination'

// ── Product type ────────────────────────────────────────────
export interface Product {
  id: string | number
  name: string
  category: string
  price: number
  imageUrl?: string
  description?: string
}

// ── Props / Emits ───────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    /** Product category used to filter the list; an empty string means "show all" */
    category?: string
    /** Full list of products provided by the parent */
    products: Product[]
    /** Whether data is still being fetched externally */
    loading?: boolean
    /** Number of items per page */
    pageSize?: number
  }>(),
  {
    category: '',
    loading: false,
    pageSize: 10,
  },
)

const emit = defineEmits<{
  /** Fired when the user clicks a product item */
  (e: 'select', payload: Product): void
  /** Fired when the user wants to refresh / retry loading */
  (e: 'retry'): void
  /** Fired whenever pagination changes */
  (e: 'page-change', payload: { currentPage: number; pageSize: number }): void
  /** Fired when the user clicks the "add to cart" action */
  (e: 'add-to-cart', payload: Product): void
}>()

// ── Category filtering (computed) ───────────────────────────
const filteredProducts = computed<Product[]>(() => {
  if (!props.category) return props.products
  return props.products.filter(
    (p) => p.category === props.category,
  )
})

const filteredTotal = computed(() => filteredProducts.value.length)

// ── Pagination ──────────────────────────────────────────────
const {
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  paginatedItems,
  goToPage,
  nextPage,
  prevPage,
  setTotalItems,
} = usePagination(props.pageSize)

// Keep totalItems in sync with the filtered list length
watch(filteredTotal, (val) => {
  setTotalItems(val)
}, { immediate: true })

// Reset to page 1 when the category prop changes
watch(
  () => props.category,
  () => {
    goToPage(1)
  },
)

const displayedProducts = paginatedItems<Product>(
  // Cast needed because ref(array) is structurally compatible
  computed(() => filteredProducts.value) as unknown as Ref<Product[]>,
)

// Emit page-change on every page / size mutation
watch([currentPage, pageSize], ([cp, ps]) => {
  emit('page-change', { currentPage: cp, pageSize: ps })
})

// ── Computed helpers for the template ───────────────────────
const isEmpty = computed(
  () => !props.loading && filteredTotal.value === 0,
)

const displayRange = computed(() => {
  if (filteredTotal.value === 0) return '0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(
    currentPage.value * pageSize.value,
    filteredTotal.value,
  )
  return `${start}-${end}`
})

// ── Event handlers ──────────────────────────────────────────
function handleSelect(product: Product) {
  emit('select', product)
}

function handleAddToCart(product: Product) {
  emit('add-to-cart', product)
}

function handleRetry() {
  emit('retry')
}
</script>

<template>
  <div class="product-list">
    <!-- ═══════════ Loading state ═══════════ -->
    <div v-if="loading" class="product-list__loading">
      <span class="product-list__spinner" aria-hidden="true"></span>
      <p>正在加载商品...</p>
    </div>

    <!-- ═══════════ Error / empty state ═══════════ -->
    <div v-else-if="isEmpty" class="product-list__empty">
      <p class="product-list__empty-text">
        <template v-if="category">「{{ category }}」分类下暂无商品</template>
        <template v-else>暂无商品数据</template>
      </p>
      <button class="product-list__retry-btn" @click="handleRetry">
        重新加载
      </button>
    </div>

    <!-- ═══════════ Product grid ═══════════ -->
    <template v-else>
      <div v-if="category" class="product-list__filter-info">
        当前分类：<strong>{{ category }}</strong
        >（共 {{ filteredTotal }} 件）
      </div>

      <ul class="product-list__grid">
        <li
          v-for="product in displayedProducts"
          :key="product.id"
          class="product-list__card"
          @click="handleSelect(product)"
        >
          <div
            v-if="product.imageUrl"
            class="product-list__image"
            :style="{ backgroundImage: `url(${product.imageUrl})` }"
          ></div>

          <div class="product-list__body">
            <h3 class="product-list__name">{{ product.name }}</h3>
            <p
              v-if="product.description"
              class="product-list__description"
            >
              {{ product.description }}
            </p>
            <div class="product-list__footer">
              <span class="product-list__price">
                ¥{{ product.price.toFixed(2) }}
              </span>
              <button
                class="product-list__cart-btn"
                @click.stop="handleAddToCart(product)"
              >
                加入购物车
              </button>
            </div>
          </div>
        </li>
      </ul>

      <!-- ═══════════ Pagination controls ═══════════ -->
      <nav v-if="totalPages > 1" class="product-list__pagination" aria-label="分页导航">
        <button :disabled="currentPage <= 1" @click="prevPage">
          上一页
        </button>

        <span class="product-list__page-info">
          第 {{ currentPage }} / {{ totalPages }} 页
          （{{ displayRange }} / {{ filteredTotal }} 条）
        </span>

        <button
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >
          下一页
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* ═══════════ CSS Custom Properties (design tokens) ═══════════ */
.product-list {
  --pl-bg: #fff;
  --pl-border: #e0e0e0;
  --pl-text: #212121;
  --pl-text-secondary: #757575;
  --pl-accent: #1976d2;
  --pl-accent-hover: #1565c0;
  --pl-danger: #d32f2f;
  --pl-spinner-color: #1976d2;
  --pl-radius: 8px;
  --pl-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --pl-gap: 16px;
  --pl-transition: 0.2s ease;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  color: var(--pl-text);
}

/* ── Loading ─────────────────────────────── */
.product-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--pl-text-secondary);
}

.product-list__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--pl-border);
  border-top-color: var(--pl-spinner-color);
  border-radius: 50%;
  animation: pl-spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes pl-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Empty state ─────────────────────────── */
.product-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.product-list__empty-text {
  font-size: 16px;
  color: var(--pl-text-secondary);
  margin: 0 0 16px;
}

.product-list__retry-btn {
  padding: 8px 24px;
  border: 1px solid var(--pl-accent);
  border-radius: var(--pl-radius);
  background: var(--pl-bg);
  color: var(--pl-accent);
  cursor: pointer;
  font-size: 14px;
  transition: background var(--pl-transition),
    color var(--pl-transition);
}

.product-list__retry-btn:hover {
  background: var(--pl-accent);
  color: #fff;
}

/* ── Filter info bar ─────────────────────── */
.product-list__filter-info {
  padding: 10px 0;
  font-size: 14px;
  color: var(--pl-text-secondary);
  border-bottom: 1px solid var(--pl-border);
  margin-bottom: var(--pl-gap);
}

.product-list__filter-info strong {
  color: var(--pl-text);
}

/* ── Product grid ────────────────────────── */
.product-list__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--pl-gap);
}

/* ── Product card ────────────────────────── */
.product-list__card {
  background: var(--pl-bg);
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius);
  box-shadow: var(--pl-shadow);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow var(--pl-transition),
    transform var(--pl-transition);
}

.product-list__card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  transform: translateY(-2px);
}

.product-list__image {
  width: 100%;
  height: 180px;
  background-size: cover;
  background-position: center;
  background-color: #f5f5f5;
}

.product-list__body {
  padding: 14px;
}

.product-list__name {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.product-list__description {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--pl-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-list__price {
  font-size: 18px;
  font-weight: 700;
  color: var(--pl-danger);
}

.product-list__cart-btn {
  padding: 6px 14px;
  border: none;
  border-radius: var(--pl-radius);
  background: var(--pl-accent);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--pl-transition);
}

.product-list__cart-btn:hover {
  background: var(--pl-accent-hover);
}

/* ── Pagination ──────────────────────────── */
.product-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--pl-border);
}

.product-list__pagination button {
  padding: 6px 18px;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius);
  background: var(--pl-bg);
  color: var(--pl-text);
  font-size: 14px;
  cursor: pointer;
  transition: border-color var(--pl-transition),
    background var(--pl-transition);
}

.product-list__pagination button:hover:not(:disabled) {
  border-color: var(--pl-accent);
  background: color-mix(in srgb, var(--pl-accent) 8%, transparent);
}

.product-list__pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.product-list__page-info {
  font-size: 14px;
  color: var(--pl-text-secondary);
}
</style>
