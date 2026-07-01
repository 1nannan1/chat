<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/libs/supabase'
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElPagination,
  ElEmpty,
  ElSkeleton,
  ElPopconfirm,
  ElMessage,
  ElTag,
  ElSpace,
  ElIcon,
} from 'element-plus'
import { Search, Delete, View } from '@element-plus/icons-vue'
import { fetchHistoryChats, fetchModels } from '@/api/chat'
import type { HistoryQuery, ChatWithCount } from '@/api/chat'
import type { Model } from '@/types/chat'

const { t } = useI18n()
const router = useRouter()

// ========== 状态 ==========
const loading = ref(true)
const chats = ref<ChatWithCount[]>([])
const total = ref(0)
const models = ref<Model[]>([])

const filters = reactive({
  search: '',
  model: '',
  dateRange: null as [string, string] | null,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const sort = reactive({
  field: 'created_at',
  order: 'descending' as 'ascending' | 'descending',
})

// ========== 数据加载 ==========
async function loadData() {
  loading.value = true
  try {
    const user = await supabase.auth.getUser()
    if (!user.data.user) {
      router.push('/login')
      return
    }

    const query: HistoryQuery = {
      search: filters.search,
      model: filters.model || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
      sortField: sort.field,
      sortOrder: sort.order,
    }

    if (filters.dateRange) {
      query.dateFrom = filters.dateRange[0]
      query.dateTo = filters.dateRange[1]
    }

    const result = await fetchHistoryChats(user.data.user.id, query)
    chats.value = result.chats
    total.value = result.total
  } catch (e) {
    console.error('Failed to load history', e)
    ElMessage.error('加载历史记录失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    models.value = await fetchModels()
  } catch {
    // ignore
  }
  await loadData()
})

// ========== 筛选 ==========
let debounceTimer: ReturnType<typeof setTimeout>
watch(
  () => filters.search,
  () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      pagination.page = 1
      loadData()
    }, 400)
  },
)

function onFilterChange() {
  pagination.page = 1
  loadData()
}

// ========== 排序 ==========
function onSortChange({ prop, order }: { prop: string; order: string }) {
  sort.field = prop || 'created_at'
  sort.order = order === 'ascending' ? 'ascending' : 'descending'
  loadData()
}

// ========== 分页 ==========
function onPageChange(page: number) {
  pagination.page = page
  loadData()
}

function onSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

// ========== 操作 ==========
function handleView(chat: ChatWithCount) {
  router.push(`/chat?id=${chat.id}`)
}

async function handleDelete(chat: ChatWithCount) {
  try {
    const { deleteChat } = await import('@/api/chat')
    await deleteChat(chat.id)
    ElMessage.success(t('history.deleteSuccess'))
    await loadData()
  } catch (e) {
    console.error('Delete failed', e)
    ElMessage.error(t('history.deleteFailed'))
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <!-- 标题 + 返回 -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t('history.title') }}
        </h1>
        <el-button
          size="default"
          @click="router.push('/chat')"
        >
          <template #icon>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </template>
          {{ $t('history.back') }}
        </el-button>
      </div>

      <!-- 筛选栏 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 transition-colors">
        <el-space wrap :size="12" class="w-full flex-wrap">
          <el-input
            v-model="filters.search"
            :placeholder="$t('history.searchPlaceholder')"
            :prefix-icon="Search"
            clearable
            style="width: 14rem"
            size="default"
          />

          <el-select
            v-model="filters.model"
            :placeholder="$t('history.allModels')"
            clearable
            style="width: 10rem"
            size="default"
            @change="onFilterChange"
          >
            <el-option
              v-for="m in models"
              :key="m.name"
              :label="m.name"
              :value="m.name"
            />
          </el-select>

          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="~"
            :start-placeholder="$t('history.startDate')"
            :end-placeholder="$t('history.endDate')"
            value-format="YYYY-MM-DD"
            style="width: 16rem"
            size="default"
            @change="onFilterChange"
          />
        </el-space>
      </div>

      <!-- 表格 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
        <!-- Loading -->
        <template v-if="loading">
          <div class="p-6">
            <el-skeleton :rows="5" animated />
          </div>
        </template>

        <!-- Empty -->
        <template v-else-if="chats.length === 0">
          <el-empty :description="$t('history.empty')" class="py-16" />
        </template>

        <!-- Table -->
        <template v-else>
          <el-table
            :data="chats"
            stripe
            @sort-change="onSortChange"
            :default-sort="{ prop: 'created_at', order: 'descending' }"
            class="history-table"
          >
            <el-table-column
              :label="$t('history.title')"
              prop="title"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate block max-w-[240px]">
                  {{ row.title }}
                </span>
              </template>
            </el-table-column>

            <el-table-column
              :label="$t('history.model')"
              prop="model"
              width="140"
            >
              <template #default="{ row }">
                <el-tag size="small" effect="plain" class="model-tag">
                  {{ row.model }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              :label="$t('history.messages')"
              prop="messageCount"
              width="100"
              align="center"
              sortable="custom"
            >
              <template #default="{ row }">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ row.messageCount }}
                </span>
              </template>
            </el-table-column>

            <el-table-column
              :label="$t('history.createdAt')"
              prop="created_at"
              width="180"
              sortable="custom"
            >
              <template #default="{ row }">
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(row.created_at) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column
              :label="$t('history.actions')"
              width="140"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-space :size="4">
                  <el-button
                    size="small"
                    type="primary"
                    :icon="View"
                    circle
                    @click="handleView(row)"
                  />
                  <el-popconfirm
                    :title="$t('history.confirmDelete')"
                    @confirm="handleDelete(row)"
                  >
                    <template #reference>
                      <el-button
                        size="small"
                        type="danger"
                        :icon="Delete"
                        circle
                      />
                    </template>
                  </el-popconfirm>
                </el-space>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="flex justify-center py-4">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="total"
              layout="total, sizes, prev, pager, next"
              background
              @current-change="onPageChange"
              @size-change="onSizeChange"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-table :deep(.el-table__header th) {
  background-color: #f9fafb;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.8125rem;
}
html.dark .history-table :deep(.el-table__header th) {
  background-color: #1f2937;
  color: #9ca3af;
}
.history-table :deep(.el-table__row) {
  cursor: pointer;
}
.history-table :deep(.el-table__body tr:hover td) {
  background-color: #f3f4f6;
}
html.dark .history-table :deep(.el-table__body tr:hover td) {
  background-color: #374151;
}
.model-tag {
  background-color: #10a37f10;
  border-color: #10a37f30;
  color: #10a37f;
}
html.dark .model-tag {
  background-color: #10a37f20;
  border-color: #10a37f40;
  color: #34d399;
}
</style>
