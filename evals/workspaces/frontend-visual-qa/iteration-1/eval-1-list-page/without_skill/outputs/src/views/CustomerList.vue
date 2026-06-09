<!-- src/views/CustomerList.vue -->
<template>
  <div class="customer-list" :class="{ 'customer-list--loading': loading }">
    <!-- Page Header -->
    <div class="customer-list__header">
      <div class="customer-list__title-group">
        <h2 class="customer-list__title">Customers</h2>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">Home</el-breadcrumb-item>
          <el-breadcrumb-item>Customers</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <el-button type="primary" :icon="Plus" size="large" @click="handleCreate">
        New Customer
      </el-button>
    </div>

    <!-- Filter Area -->
    <CustomerFilter
      v-model="filters"
      class="customer-list__filter"
      @search="fetchData"
      @reset="resetFilters"
    />

    <!-- Batch Action Bar (slides in when rows are selected) -->
    <BatchActionBar
      :visible="showBatchBar"
      :count="selectedCount"
      class="customer-list__batch-bar"
      @batch-delete="handleBatchDelete"
      @clear="clearSelection"
    />

    <!-- Table (with built-in loading overlay and empty state) -->
    <CustomerTable
      :data="data"
      :loading="loading"
      class="customer-list__table"
      @selection-change="handleSelectionChange"
      @edit="handleEdit"
      @delete="handleDeleteOne"
      @create="handleCreate"
    />

    <!-- Pagination (hidden when empty to avoid clutter) -->
    <div v-if="pagination.total > 0" class="customer-list__footer">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import CustomerFilter from '@/components/CustomerFilter.vue'
import CustomerTable from '@/components/CustomerTable.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import { useCustomerList } from '@/composables/useCustomerList'
import type { Customer } from '@/types/customer'

const {
  data,
  loading,
  filters,
  selectedRows,
  pagination,
  showBatchBar,
  selectedCount,
  fetchData,
  batchDelete,
  deleteOne,
  resetFilters,
  clearSelection,
  handleSelectionChange,
  handlePageChange,
  handleSizeChange,
} = useCustomerList()

// --- Lifecycle ---
onMounted(() => {
  fetchData()
})

// --- Event Handlers ---
function handleCreate() {
  // In a real app: router.push('/customers/new') or emit to open drawer/modal
  console.log('[CustomerList] Open create form')
}

function handleEdit(row: Customer) {
  console.log('[CustomerList] Edit customer:', row.id)
}

function handleDeleteOne(row: Customer) {
  deleteOne(row.id, row.name)
}

function handleBatchDelete() {
  const ids = selectedRows.value.map((r) => r.id)
  batchDelete(ids)
}
</script>

<style lang="scss" scoped>
.customer-list {
  padding: 24px;
  max-width: 1440px;
  margin: 0 auto;
  min-height: calc(100vh - 64px); // account for top nav
  background-color: var(--el-bg-color-page, #f3f6fc);

  // --- Header ---
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1.3;
  }

  // --- Filter ---
  &__filter {
    margin-bottom: 16px;
  }

  // --- Batch Bar ---
  &__batch-bar {
    margin-bottom: 12px;
  }

  // --- Table ---
  &__table {
    background-color: var(--el-bg-color);
    border-radius: 6px;
    overflow: hidden;
  }

  // --- Footer (Pagination) ---
  &__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding: 0 4px;
  }
}
</style>
