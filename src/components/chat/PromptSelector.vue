<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import { fetchPrompts, createPrompt, updatePrompt, deletePrompt } from '@/api/prompts'
import type { Prompt } from '@/types/chat'

const store = useChatStore()

const emit = defineEmits<{
  select: [content: string]
}>()

const open = ref(false)
const prompts = ref<Prompt[]>([])
const loading = ref(false)
const btnRef = ref<HTMLButtonElement | null>(null)
const panelStyle = ref({})

async function loadPrompts() {
  if (!store.userId) return
  loading.value = true
  try {
    prompts.value = await fetchPrompts(store.userId)
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

function togglePanel() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => positionPanel())
  }
}

function positionPanel() {
  const btn = btnRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  panelStyle.value = {
    position: 'fixed',
    bottom: `${window.innerHeight - rect.top + 4}px`,
    left: `${rect.left}px`,
  }
}

function handleSelect(p: Prompt) {
  emit('select', p.content)
  open.value = false
}

function handleEdit(p: Prompt) {
  editId.value = p.id
  editTitle.value = p.title
  editContent.value = p.content
  showCreate.value = true
}

// 新建/编辑
const showCreate = ref(false)
const editTitle = ref('')
const editContent = ref('')
const editId = ref<string | null>(null)
const saving = ref(false)

async function handleSave() {
  if (!editTitle.value.trim() || !editContent.value.trim()) {
    ElMessage.warning('标题和内容不能为空')
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      await updatePrompt(editId.value, { title: editTitle.value, content: editContent.value })
    } else if (store.userId) {
      await createPrompt({ title: editTitle.value, content: editContent.value, user_id: store.userId })
    }
    showCreate.value = false
    editTitle.value = ''
    editContent.value = ''
    editId.value = null
    await loadPrompts()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await deletePrompt(id)
    await loadPrompts()
    ElMessage.success('已删除')
  } catch {
    ElMessage.error('删除失败')
  }
}

function handleNew() {
  editId.value = null
  editTitle.value = ''
  editContent.value = ''
  showCreate.value = true
}

onMounted(() => {
  if (store.userId) loadPrompts()
})
</script>

<template>
  <div class="inline-flex">
    <!-- 触发按钮 -->
    <button
      ref="btnRef"
      class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
      title="提示词"
      @click="togglePanel"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </button>

    <!-- 固定定位下拉面板（不被父容器裁切） -->
    <Teleport to="body">
      <div
        v-if="open"
        :style="panelStyle"
        class="w-72 max-h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-[999] flex flex-col overflow-hidden"
      >
        <!-- 头部 -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">提示词</span>
          <button class="text-xs text-[#10a37f] hover:text-[#0d8c6d] cursor-pointer" @click="handleNew">
            + 新建
          </button>
        </div>

        <!-- 列表 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="loading" class="p-4 text-center text-xs text-gray-400">加载中...</div>
          <div v-else-if="prompts.length === 0" class="p-4 text-center text-xs text-gray-400">暂无提示词</div>
          <div
            v-for="p in prompts"
            :key="p.id"
            class="group flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
            @click="handleSelect(p)"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{{ p.title }}</div>
              <div class="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{{ p.content }}</div>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5">
              <button
                class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                @click.stop="handleEdit(p)"
                title="编辑"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500 cursor-pointer"
                @click.stop="handleDelete(p.id)"
                title="删除"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 点击外部关闭 -->
      <div v-if="open" class="fixed inset-0 z-[998]" @click="open = false" />
    </Teleport>

    <!-- 新建/编辑对话框 -->
    <Teleport to="body">
      <div
        v-if="showCreate"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30"
        @click.self="showCreate = false"
      >
        <div class="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-5">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-4">
            {{ editId ? '编辑提示词' : '新建提示词' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">标题</label>
              <input
                v-model="editTitle"
                class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:border-[#10a37f]"
                placeholder="给提示词起个名字"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">内容</label>
              <textarea
                v-model="editContent"
                class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:border-[#10a37f] resize-none"
                rows="4"
                placeholder="输入提示词内容..."
              />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              class="px-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              @click="showCreate = false"
            >
              取消
            </button>
            <button
              class="px-4 py-1.5 text-sm rounded-lg bg-[#10a37f] text-white hover:bg-[#0d8c6d] cursor-pointer transition-colors disabled:opacity-50"
              :disabled="saving"
              @click="handleSave"
            >
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
