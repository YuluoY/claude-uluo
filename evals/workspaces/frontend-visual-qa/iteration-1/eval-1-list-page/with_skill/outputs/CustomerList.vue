<template>
  <div class="customer-list">
    <!-- ═══════════════════════════════════════════ -->
    <!-- 1. 操作栏：新建按钮 + 搜索 -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="customer-list__toolbar">
      <div class="customer-list__toolbar-left">
        <el-button
          type="primary"
          :icon="Plus"
          @click="handleCreate"
        >
          新建客户
        </el-button>
      </div>
      <div class="customer-list__toolbar-right">
        <el-input
          v-model="searchKeyword"
          class="customer-list__search"
          placeholder="搜索客户名称、手机号"
          :prefix-icon="Search"
          clearable
          @input="handleSearchDebounced"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- 2. 筛选区：常用筛选 + 更多筛选（渐进呈现） -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="customer-list__filters">
      <div class="customer-list__filter-item">
        <span class="customer-list__filter-label">状态</span>
        <el-select
          v-model="filters.status"
          class="customer-list__filter-select"
          placeholder="全部"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="活跃" value="active" />
          <el-option label="非活跃" value="inactive" />
          <el-option label="潜在" value="lead" />
        </el-select>
      </div>

      <div class="customer-list__filter-item">
        <span class="customer-list__filter-label">来源</span>
        <el-select
          v-model="filters.source"
          class="customer-list__filter-select"
          placeholder="全部"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="官网注册" value="website" />
          <el-option label="市场活动" value="campaign" />
          <el-option label="客户推荐" value="referral" />
          <el-option label="直接联系" value="direct" />
        </el-select>
      </div>

      <div class="customer-list__filter-item">
        <span class="customer-list__filter-label">创建时间</span>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          start-placeholder="开始"
          end-placeholder="结束"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleFilterChange"
        />
      </div>

      <!-- 高级筛选：折叠，渐进呈现 -->
      <el-popover
        v-model:visible="advancedFilterVisible"
        placement="bottom-start"
        :width="320"
        trigger="click"
      >
        <template #reference>
          <button
            class="customer-list__filter-more"
            :class="{ 'is-active': hasAdvancedFilters }"
          >
            <el-icon><MoreFilled /></el-icon>
            <span>更多筛选</span>
            <span v-if="advancedFilterBadge" class="customer-list__filter-badge">
              {{ advancedFilterBadge }}
            </span>
          </button>
        </template>

        <div class="customer-list__advanced-filters">
          <div class="customer-list__advanced-item">
            <label>客户等级</label>
            <el-select
              v-model="filters.level"
              placeholder="全部"
              clearable
              style="width: 100%"
              @change="handleFilterChange"
            >
              <el-option label="VIP" value="vip" />
              <el-option label="高级" value="premium" />
              <el-option label="标准" value="standard" />
            </el-select>
          </div>
          <div class="customer-list__advanced-item">
            <label>所属行业</label>
            <el-select
              v-model="filters.industry"
              placeholder="全部"
              clearable
              filterable
              style="width: 100%"
              @change="handleFilterChange"
            >
              <el-option label="互联网" value="internet" />
              <el-option label="金融" value="finance" />
              <el-option label="制造业" value="manufacturing" />
              <el-option label="教育" value="education" />
              <el-option label="医疗" value="healthcare" />
            </el-select>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- 3. 批量操作栏：选中行时出现 -->
    <!-- ═══════════════════════════════════════════ -->
    <div
      v-if="selectedRows.length > 0"
      class="customer-list__batch-bar"
    >
      <div class="customer-list__batch-left">
        <span class="customer-list__selected-count">
          已选择 <strong>{{ selectedRows.length }}</strong> 位客户
        </span>
        <el-button text size="small" @click="clearSelection">取消选择</el-button>
      </div>
      <div class="customer-list__batch-right">
        <el-button
          :disabled="selectedRows.length === 0"
          @click="handleBatchExport"
        >
          导出客户
        </el-button>
        <el-button
          type="danger"
          :disabled="selectedRows.length === 0"
          @click="handleBatchDelete"
        >
          删除客户
        </el-button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- 4. 表格区：含 loading / empty / error 状态 -->
    <!-- ═══════════════════════════════════════════ -->

    <!-- 4a. 加载状态 — 骨架屏（首屏加载） -->
    <div v-if="pageState === 'loading'" class="customer-list__skeleton">
      <el-skeleton :rows="8" animated :throttle="200" />
    </div>

    <!-- 4b. 错误状态 -->
    <div v-else-if="pageState === 'error'" class="customer-list__empty">
      <el-icon class="customer-list__empty-icon" :size="56"><WarningFilled /></el-icon>
      <h3 class="customer-list__empty-title">加载失败</h3>
      <p class="customer-list__empty-desc">
        {{ errorMessage || '无法加载客户列表，请检查网络连接后重试。' }}
      </p>
      <el-button type="primary" :icon="Refresh" @click="fetchCustomers">
        重新加载
      </el-button>
    </div>

    <!-- 4c. 空状态 — 初始型（无客户数据） -->
    <div v-else-if="pageState === 'empty-initial'" class="customer-list__empty">
      <el-icon class="customer-list__empty-icon" :size="56"><User /></el-icon>
      <h3 class="customer-list__empty-title">还没有客户</h3>
      <p class="customer-list__empty-desc">
        创建第一个客户，开始管理您的客户信息
      </p>
      <el-button type="primary" :icon="Plus" @click="handleCreate">
        新建客户
      </el-button>
    </div>

    <!-- 4d. 空状态 — 搜索无结果 -->
    <div v-else-if="pageState === 'empty-search'" class="customer-list__empty">
      <el-icon class="customer-list__empty-icon" :size="56"><Search /></el-icon>
      <h3 class="customer-list__empty-title">未找到匹配的客户</h3>
      <p class="customer-list__empty-desc">
        试试其他关键词，或清除筛选条件
      </p>
      <el-button @click="clearFilters">清除筛选</el-button>
    </div>

    <!-- 4e. 正常状态 — 数据表格 -->
    <template v-else>
      <div
        ref="tableWrapperRef"
        class="customer-list__table-wrapper"
      >
        <el-table
          ref="tableRef"
          :data="tableData"
          :row-key="(row) => row.id"
          :row-class-name="tableRowClassName"
          border
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <!-- 多选列 -->
          <el-table-column type="selection" width="48" />

          <el-table-column
            prop="name"
            label="客户名称"
            min-width="160"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="customer-list__cell-name">
                <span class="customer-list__cell-name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            prop="phone"
            label="手机号"
            width="140"
          />

          <el-table-column
            prop="company"
            label="所属公司"
            min-width="160"
          />

          <el-table-column
            prop="industry"
            label="行业"
            width="120"
          />

          <el-table-column
            prop="status"
            label="状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="statusTagType(row.status)"
                size="small"
                disable-transitions
              >
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            prop="source"
            label="来源"
            width="110"
          />

          <el-table-column
            prop="createdAt"
            label="创建时间"
            width="140"
            sortable="custom"
          >
            <template #default="{ row }">
              <span class="customer-list__cell-time">{{ row.createdAt }}</span>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="140"
            fixed="right"
          >
            <template #default="{ row }">
              <div class="customer-list__cell-actions">
                <el-button text size="small" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button text size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页：单页时隐藏 -->
      <div
        v-if="pagination.total > pagination.pageSize"
        class="customer-list__pagination"
      >
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </template>

    <!-- ═══════════════════════════════════════════ -->
    <!-- 5. 删除确认弹窗 -->
    <!-- ═══════════════════════════════════════════ -->
    <el-dialog
      v-model="deleteDialog.visible"
      :title="deleteDialog.isBatch ? '批量删除客户' : '删除客户'"
      width="440px"
      :close-on-click-modal="false"
    >
      <p>
        {{
          deleteDialog.isBatch
            ? `确定要删除选中的 ${deleteDialog.count} 位客户吗？删除后数据不可恢复。`
            : `确定要删除客户「${deleteDialog.name}」吗？删除后数据不可恢复。`
        }}
      </p>
      <template #footer>
        <el-button @click="deleteDialog.visible = false">取消</el-button>
        <el-button
          type="danger"
          :loading="deleteDialog.loading"
          @click="confirmDelete"
        >
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Search,
  MoreFilled,
  WarningFilled,
  User,
  Refresh,
} from '@element-plus/icons-vue'

// ═══════════════════════════════════════════
// Props & Emits
// ═══════════════════════════════════════════
const props = defineProps({
  // 预留：父组件可注入数据获取函数，实现依赖反转
  fetchApi: { type: Function, default: null },
})

const emit = defineEmits(['create', 'edit', 'row-delete', 'batch-delete', 'batch-export'])

// ═══════════════════════════════════════════
// Template Refs
// ═══════════════════════════════════════════
const tableRef = ref(null)
const tableWrapperRef = ref(null)

// ═══════════════════════════════════════════
// 页面状态枚举
// 'loading' | 'error' | 'empty-initial' | 'empty-search' | 'ready'
// ═══════════════════════════════════════════
const pageState = ref('loading')
const errorMessage = ref('')

// ═══════════════════════════════════════════
// 搜索
// ═══════════════════════════════════════════
const searchKeyword = ref('')
let searchTimer = null

function handleSearchDebounced() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => handleSearch(), 300)
}

function handleSearch() {
  clearTimeout(searchTimer)
  pagination.currentPage = 1
  fetchCustomers()
}

// ═══════════════════════════════════════════
// 筛选
// ═══════════════════════════════════════════
const filters = reactive({
  status: '',
  source: '',
  dateRange: [],
  level: '',
  industry: '',
})

const advancedFilterVisible = ref(false)

const hasAdvancedFilters = computed(() => {
  return filters.level !== '' || filters.industry !== ''
})

const advancedFilterBadge = computed(() => {
  let count = 0
  if (filters.level) count++
  if (filters.industry) count++
  return count > 0 ? count : null
})

function handleFilterChange() {
  pagination.currentPage = 1
  fetchCustomers()
}

function clearFilters() {
  filters.status = ''
  filters.source = ''
  filters.dateRange = []
  filters.level = ''
  filters.industry = ''
  searchKeyword.value = ''
  pagination.currentPage = 1
  fetchCustomers()
}

// ═══════════════════════════════════════════
// 表格数据 & 分页
// ═══════════════════════════════════════════
const tableData = ref([])
const selectedRows = ref([])

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
})

function tableRowClassName({ row }) {
  if (selectedRows.value.some((r) => r.id === row.id)) {
    return 'customer-list__row--selected'
  }
  return ''
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
}

// ═══════════════════════════════════════════
// 状态标签映射
// ═══════════════════════════════════════════
const statusMap = {
  active: { label: '活跃', type: 'success' },
  inactive: { label: '非活跃', type: 'info' },
  lead: { label: '潜在', type: 'warning' },
}

function statusLabel(status) {
  return statusMap[status]?.label ?? status
}

function statusTagType(status) {
  return statusMap[status]?.type ?? 'info'
}

// ═══════════════════════════════════════════
// 数据获取
// ═══════════════════════════════════════════
async function fetchCustomers() {
  pageState.value = 'loading'
  errorMessage.value = ''

  const params = {
    keyword: searchKeyword.value,
    status: filters.status,
    source: filters.source,
    level: filters.level,
    industry: filters.industry,
    dateFrom: filters.dateRange?.[0] || '',
    dateTo: filters.dateRange?.[1] || '',
    page: pagination.currentPage,
    pageSize: pagination.pageSize,
  }

  try {
    // 实际项目中替换为真实 API 调用
    // const res = await (props.fetchApi || customerApi.list)(params)
    const res = await mockFetch(params)

    tableData.value = res.data
    pagination.total = res.total

    if (res.total === 0) {
      const hasFilters = searchKeyword.value
        || filters.status || filters.source || filters.level || filters.industry
        || (filters.dateRange && filters.dateRange.length > 0)
      pageState.value = hasFilters ? 'empty-search' : 'empty-initial'
    } else {
      pageState.value = 'ready'
    }
  } catch (err) {
    pageState.value = 'error'
    errorMessage.value = err?.message || '无法加载客户列表，请检查网络连接后重试。'
  }
}

function handlePageChange(page) {
  pagination.currentPage = page
  fetchCustomers()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.currentPage = 1
  fetchCustomers()
}

// ═══════════════════════════════════════════
// 操作处理
// ═══════════════════════════════════════════
function handleCreate() {
  emit('create')
}

function handleEdit(row) {
  emit('edit', row)
}

function handleDelete(row) {
  deleteDialog.isBatch = false
  deleteDialog.count = 1
  deleteDialog.name = row.name
  deleteDialog.ids = [row.id]
  deleteDialog.visible = true
}

function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  deleteDialog.isBatch = true
  deleteDialog.count = selectedRows.value.length
  deleteDialog.name = ''
  deleteDialog.ids = selectedRows.value.map((r) => r.id)
  deleteDialog.visible = true
}

function handleBatchExport() {
  if (selectedRows.value.length === 0) return
  emit('batch-export', selectedRows.value)
  ElMessage.success(`正在导出 ${selectedRows.value.length} 位客户的数据`)
}

// ═══════════════════════════════════════════
// 删除确认
// ═══════════════════════════════════════════
const deleteDialog = reactive({
  visible: false,
  isBatch: false,
  count: 0,
  name: '',
  ids: [],
  loading: false,
})

async function confirmDelete() {
  deleteDialog.loading = true
  try {
    // await customerApi.delete(deleteDialog.ids)
    await new Promise((r) => setTimeout(r, 500)) // mock

    const msg = deleteDialog.isBatch
      ? `已删除 ${deleteDialog.count} 位客户`
      : `已删除客户「${deleteDialog.name}」`
    ElMessage.success(msg)

    deleteDialog.visible = false
    clearSelection()
    fetchCustomers()
  } catch {
    ElMessage.error('删除失败，请重试')
  } finally {
    deleteDialog.loading = false
  }
}

// ═══════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════
onMounted(() => {
  fetchCustomers()
})

// ═══════════════════════════════════════════
// Mock 数据（开发阶段占位，实际接入 API 后删除）
// ═══════════════════════════════════════════
const mockRecords = Array.from({ length: 86 }, (_, i) => ({
  id: i + 1,
  name: `客户${String(i + 1).padStart(3, '0')}`,
  phone: `138${String(10000000 + i).slice(0, 8)}`,
  company: `${['星辰科技', '远航集团', '云帆数据', '启明网络', '泰和实业', '锐思信息'][i % 6]}有限公司`,
  industry: ['互联网', '金融', '制造业', '教育', '医疗', '互联网'][i % 6],
  status: ['active', 'inactive', 'lead', 'active', 'active', 'lead'][i % 6],
  source: ['website', 'campaign', 'referral', 'direct', 'website', 'campaign'][i % 6],
  createdAt: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
}))

async function mockFetch(params) {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
  let filtered = [...mockRecords]

  if (params.keyword) {
    const kw = params.keyword.toLowerCase()
    filtered = filtered.filter(
      (r) => r.name.includes(kw) || r.phone.includes(kw),
    )
  }
  if (params.status) {
    filtered = filtered.filter((r) => r.status === params.status)
  }
  if (params.source) {
    filtered = filtered.filter((r) => r.source === params.source)
  }
  if (params.level) {
    filtered = filtered.filter((r) => r.id % 3 === 0)
  }
  if (params.industry) {
    filtered = filtered.filter((r) => r.industry === params.industry)
  }

  const total = filtered.length
  const start = (params.page - 1) * params.pageSize
  const data = filtered.slice(start, start + params.pageSize)

  return { data, total }
}
</script>

<style lang="scss" scoped>
// 引用项目已有的 token 体系
// 假定项目在 vite.config 中配置了 scss additionalData 自动注入全局变量
@use './customer-list-tokens' as t;

@import './customer-list';
</style>
