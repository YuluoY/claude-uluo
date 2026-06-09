// src/composables/useCustomerList.ts
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Customer, CustomerFilters, PaginationState } from '@/types/customer'

// Replace with actual API imports in a real project
const mockApi = {
  async getCustomers(params: any): Promise<{ data: Customer[]; total: number }> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 500))
    // Mock data generation would go here
    return { data: [], total: 0 }
  },
  async deleteCustomers(ids: string[]): Promise<void> {
    await new Promise((r) => setTimeout(r, 300))
  },
}

export function useCustomerList() {
  // --- State ---
  const data = ref<Customer[]>([])
  const loading = ref(false)
  const filters = reactive<CustomerFilters>({
    keyword: '',
    status: '',
    dateRange: null,
  })
  const selectedRows = ref<Customer[]>([])
  const pagination = reactive<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  })

  // --- Computed ---
  const showEmpty = computed(() => !loading.value && data.value.length === 0)
  const showBatchBar = computed(() => selectedRows.value.length > 0)
  const selectedCount = computed(() => selectedRows.value.length)

  // --- Actions ---
  async function fetchData() {
    loading.value = true
    try {
      const params = {
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        ...filters,
      }
      const res = await mockApi.getCustomers(params)
      data.value = res.data
      pagination.total = res.total
    } catch (err) {
      ElMessage.error('Failed to load customers. Please try again.')
      console.error('fetchData error:', err)
    } finally {
      loading.value = false
    }
  }

  async function batchDelete(ids: string[]) {
    try {
      await ElMessageBox.confirm(
        `Are you sure you want to delete ${ids.length} customer(s)? This action cannot be undone.`,
        'Confirm Batch Delete',
        { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' },
      )
      await mockApi.deleteCustomers(ids)
      ElMessage.success(`Successfully deleted ${ids.length} customer(s).`)
      clearSelection()
      await fetchData()
    } catch (err) {
      // Cancellation also lands here (catch block for confirm dialog)
      if (err !== 'cancel') {
        ElMessage.error('Batch delete failed.')
        console.error('batchDelete error:', err)
      }
    }
  }

  async function deleteOne(id: string, name: string) {
    try {
      await ElMessageBox.confirm(
        `Delete customer "${name}"? This action cannot be undone.`,
        'Confirm Delete',
        { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' },
      )
      await mockApi.deleteCustomers([id])
      ElMessage.success(`Customer "${name}" has been deleted.`)
      await fetchData()
    } catch (err) {
      if (err !== 'cancel') {
        ElMessage.error('Delete failed.')
      }
    }
  }

  function resetFilters() {
    filters.keyword = ''
    filters.status = ''
    filters.dateRange = null
    pagination.currentPage = 1
    fetchData()
  }

  function clearSelection() {
    selectedRows.value = []
  }

  function handleSelectionChange(rows: Customer[]) {
    selectedRows.value = rows
  }

  function handlePageChange(page: number) {
    pagination.currentPage = page
    fetchData()
  }

  function handleSizeChange(size: number) {
    pagination.pageSize = size
    pagination.currentPage = 1
    fetchData()
  }

  // Debounced keyword search: re-fetch 300ms after user stops typing
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    () => filters.keyword,
    () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        pagination.currentPage = 1
        fetchData()
      }, 300)
    },
  )

  // --- Return ---
  return {
    data,
    loading,
    filters,
    selectedRows,
    pagination,
    showEmpty,
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
  }
}
