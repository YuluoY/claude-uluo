<!-- src/components/BatchActionBar.vue -->
<template>
  <transition name="batch-bar">
    <div v-if="visible" class="batch-action-bar">
      <div class="batch-action-bar__info">
        <el-icon :size="18"><InfoFilled /></el-icon>
        <span class="batch-action-bar__count">
          {{ count }} customer{{ count === 1 ? '' : 's' }} selected
        </span>
      </div>
      <div class="batch-action-bar__actions">
        <slot name="actions">
          <el-button type="danger" :icon="Delete" @click="$emit('batch-delete')">
            Batch Delete
          </el-button>
          <el-button :icon="Download" @click="$emit('export')">
            Export Selected
          </el-button>
        </slot>
        <el-button link type="primary" @click="$emit('clear')">
          Deselect All
        </el-button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { InfoFilled, Delete, Download } from '@element-plus/icons-vue'

defineProps<{
  visible: boolean
  count: number
}>()

defineEmits<{
  (e: 'batch-delete'): void
  (e: 'export'): void
  (e: 'clear'): void
}>()
</script>

<style lang="scss" scoped>
.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background-color: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
  overflow: hidden;

  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-color-primary);
    font-weight: 500;
    font-size: 14px;
  }

  &__count {
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// Transition (slide + fade)
.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: all 0.25s ease;
}
.batch-bar-enter-from,
.batch-bar-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
}
.batch-bar-enter-to,
.batch-bar-leave-from {
  max-height: 60px;
  opacity: 1;
}
</style>
