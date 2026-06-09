<!-- src/components/CustomerFilter.vue -->
<template>
  <div class="customer-filter">
    <div class="customer-filter__row">
      <el-input
        v-model="localKeyword"
        class="customer-filter__search"
        placeholder="Search by name, email, or phone..."
        :prefix-icon="Search"
        clearable
        @clear="emit('reset')"
      />
      <el-select
        v-model="localStatus"
        class="customer-filter__status"
        placeholder="All Statuses"
        clearable
      >
        <el-option label="Active" value="active" />
        <el-option label="Inactive" value="inactive" />
        <el-option label="Lead" value="lead" />
        <el-option label="Blocked" value="blocked" />
      </el-select>
      <el-date-picker
        v-model="localDateRange"
        class="customer-filter__date"
        type="daterange"
        range-separator="—"
        start-placeholder="Start Date"
        end-placeholder="End Date"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        :teleported="false"
      />
      <div class="customer-filter__actions">
        <el-button type="primary" :icon="Search" @click="emit('search')">
          Search
        </el-button>
        <el-button :icon="Refresh" @click="emit('reset')">
          Reset
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import type { CustomerFilters } from '@/types/customer'

const props = defineProps<{
  modelValue: CustomerFilters
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: CustomerFilters): void
  (e: 'search'): void
  (e: 'reset'): void
}>()

const localKeyword = computed({
  get: () => props.modelValue.keyword,
  set: (val) => emit('update:modelValue', { ...props.modelValue, keyword: val }),
})
const localStatus = computed({
  get: () => props.modelValue.status,
  set: (val) => emit('update:modelValue', { ...props.modelValue, status: val }),
})
const localDateRange = computed({
  get: () => props.modelValue.dateRange,
  set: (val) => emit('update:modelValue', { ...props.modelValue, dateRange: val }),
})
</script>

<style lang="scss" scoped>
.customer-filter {
  $block: &;

  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 16px;

  &__row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__search {
    flex: 1 1 240px;
    min-width: 200px;
  }

  &__status {
    flex: 0 0 160px;
  }

  &__date {
    flex: 0 0 280px;
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
  }
}
</style>
