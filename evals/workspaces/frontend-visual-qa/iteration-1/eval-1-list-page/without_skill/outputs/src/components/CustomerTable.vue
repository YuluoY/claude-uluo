<!-- src/components/CustomerTable.vue -->
<template>
  <div class="customer-table">
    <el-table
      ref="tableRef"
      :data="data"
      v-loading="loading"
      row-key="id"
      border
      stripe
      :element-loading-text="'Loading customers...'"
      @selection-change="onSelectionChange"
    >
      <!-- Selection Column -->
      <el-table-column type="selection" width="48" fixed="left" />

      <!-- Name -->
      <el-table-column prop="name" label="Name" min-width="160" sortable>
        <template #default="{ row }">
          <div class="customer-table__name-cell">
            <el-avatar :size="32" class="customer-table__avatar">
              {{ row.name.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="customer-table__name-text">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>

      <!-- Email -->
      <el-table-column prop="email" label="Email" min-width="200" sortable />

      <!-- Phone -->
      <el-table-column prop="phone" label="Phone" width="140" />

      <!-- Status -->
      <el-table-column prop="status" label="Status" width="110" align="center">
        <template #default="{ row }">
          <el-tag
            :type="statusTagType(row.status)"
            effect="light"
            size="small"
            disable-transitions
          >
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- Created At -->
      <el-table-column prop="createdAt" label="Created" width="120" sortable>
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>

      <!-- Actions -->
      <el-table-column label="Actions" width="140" fixed="right" align="center">
        <template #default="{ row }">
          <div class="customer-table__actions">
            <el-button link type="primary" :icon="Edit" @click="$emit('edit', row)">
              Edit
            </el-button>
            <el-button link type="danger" :icon="Delete" @click="$emit('delete', row)">
              Delete
            </el-button>
          </div>
        </template>
      </el-table-column>

      <!-- Empty State Slot -->
      <template #empty>
        <div class="customer-table__empty">
          <el-empty
            description="No customers yet"
            :image-size="120"
          >
            <template #default>
              <el-button type="primary" :icon="Plus" @click="$emit('create')">
                Create your first customer
              </el-button>
            </template>
          </el-empty>
        </div>
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import type { Customer, CustomerStatus } from '@/types/customer'

defineProps<{
  data: Customer[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'selection-change', rows: Customer[]): void
  (e: 'edit', row: Customer): void
  (e: 'delete', row: Customer): void
  (e: 'create'): void
}>()

function onSelectionChange(rows: Customer[]) {
  emit('selection-change', rows)
}

function statusTagType(status: CustomerStatus): 'success' | 'info' | 'warning' | 'danger' | '' {
  const map: Record<CustomerStatus, 'success' | 'info' | 'warning' | 'danger'> = {
    active: 'success',
    inactive: 'info',
    lead: 'warning',
    blocked: 'danger',
  }
  return map[status] ?? ''
}

function statusLabel(status: CustomerStatus): string {
  const map: Record<CustomerStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    lead: 'Lead',
    blocked: 'Blocked',
  }
  return map[status] ?? status
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style lang="scss" scoped>
.customer-table {
  // Give the empty state some breathing room
  &__empty {
    padding: 48px 0;
  }

  &__name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__avatar {
    --el-avatar-bg-color: var(--el-color-primary-light-5);
    --el-avatar-text-color: #fff;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
  }

  &__name-text {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 4px;
  }

  // Override Element Plus table header
  &:deep(.el-table__header-wrapper) {
    th {
      background-color: var(--el-fill-color-light);
      font-weight: 600;
      color: var(--el-text-color-regular);
    }
  }

  // Row hover
  &:deep(.el-table__body-wrapper) {
    .el-table__row:hover > td {
      background-color: var(--el-fill-color-lighter);
      cursor: pointer;
    }
  }

  // Smooth loading overlay
  &:deep(.el-loading-mask) {
    transition: opacity 0.25s ease;
  }
}
</style>
