<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { ElMessageBox, ElSkeleton } from 'element-plus'
import { useI18n } from 'vue-i18n'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import type { Message } from '@/types/chat'

const store = useChatStore()
const { t } = useI18n()
const messagesContainer = ref<HTMLElement | null>(null)
const showScrollBtn = ref(false)
const isNearBottom = ref(true)

function checkNearBottom() {
  const el = messagesContainer.value
  if (!el) return
  isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  showScrollBtn.value = !isNearBottom.value
}

function scrollToBottom() {
  const el = messagesContainer.value
  if (!el) return
  el.scrollTop = el.scrollHeight
  showScrollBtn.value = false
  isNearBottom.value = true
}

const contentHash = computed(() =>
  store.messages.filter(m => m.role === 'assistant').map(m => (m.reasoning || '') + m.content).join('\n'),
)

watch(() => store.messages.length, () => { if (isNearBottom.value) nextTick(() => scrollToBottom()) })
watch(contentHash, () => { if (isNearBottom.value) scrollToBottom() })
watch(() => store.sending, () => { if (store.sending) nextTick(() => scrollToBottom()) })

function handleRetry(aiMsg: Message) {
  const idx = store.messages.indexOf(aiMsg)
  if (idx < 1) return
  for (let i = idx - 1; i >= 0; i--) {
    if (store.messages[i]?.role === 'user') {
      store.sendMessage(store.messages[i]!.content)
      return
    }
  }
}

async function handleDeleteMessage(msg: Message) {
  try {
    await ElMessageBox.confirm(t('chat.confirmDeleteMsg'), t('chat.deleteMsg'),
      { confirmButtonText: t('chat.deleteMsg'), cancelButtonText: '取消', type: 'warning' })
    store.deleteMessage(msg.id)
  } catch { /* */ }
}

const quickCards = [
  { title: '代码生成', desc: '生成代码、调试错误、优化性能', query: '帮我写一段 Python 代码实现...',
    svg: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { title: '文案写作', desc: '撰写文章、润色文案、翻译内容', query: '帮我写一篇产品介绍文案',
    svg: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { title: '数据分析', desc: '分析数据、生成报表、可视化', query: '分析这份数据的趋势和洞察',
    svg: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Prompt 优化', desc: '优化提示词、设计 Prompt 流程', query: '如何优化这个 Prompt？',
    svg: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11' },
]
</script>

<template>
  <div class="h-full flex flex-col bg-[#f7f8fa] dark:bg-gray-950">
    <template v-if="!store.currentChatId || store.messages.length === 0 && !store.loadingMessages">
      <div class="flex-1 flex flex-col items-center justify-center px-6">
        <div class="flex flex-col items-center animate-fadeIn">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#18a058] to-[#0d8c6d] flex items-center justify-center mb-5 shadow-lg shadow-[#18a058]/20">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white mb-1">AI Chat Assistant</h1>
          <p class="text-sm text-gray-400 dark:text-gray-500 mb-8">企业级 AI SaaS 智能助手</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-8">
          <button v-for="card in quickCards" :key="card.title"
            class="group flex flex-col items-start text-left p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-[#18a058]/30 hover:shadow-md transition-all duration-200 cursor-pointer"
            @click="store.sendMessage(card.query)">
            <div class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-3 group-hover:bg-[#18a058]/10 transition-colors">
              <svg class="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-[#18a058] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path :d="card.svg" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-0.5">{{ card.title }}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{{ card.desc }}</span>
          </button>
        </div>
      </div>

      <div class="px-6 pb-8 w-full flex justify-center">
        <div class="w-full max-w-3xl"><ChatInput /></div>
      </div>
    </template>

    <template v-else>
      <div class="flex-1 relative min-h-0">
        <div ref="messagesContainer" class="absolute inset-0 overflow-y-auto px-4 py-6" @scroll="checkNearBottom">
          <div class="max-w-3xl mx-auto space-y-5">
            <ElSkeleton v-if="store.loadingMessages" :rows="6" animated />
            <ChatMessage v-for="msg in store.messages" :key="msg.id" :message="msg"
              @retry="handleRetry" @delete="handleDeleteMessage" />
          </div>
        </div>
        <button v-if="showScrollBtn"
          class="absolute bottom-4 right-8 p-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-all z-10"
          @click="scrollToBottom">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </button>
      </div>
      <div class="px-4 pb-4 pt-2 w-full flex justify-center">
        <div class="w-full max-w-3xl"><ChatInput /></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.animate-fadeIn { animation: fadeIn 0.4s ease-out; }
</style>
