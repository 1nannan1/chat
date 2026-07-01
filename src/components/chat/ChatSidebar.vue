<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const route = useRoute()
const store = useChatStore()
const searchQ = ref('')

const filteredGroups = computed(() => {
  if (!searchQ.value) return store.chatGroups
  const q = searchQ.value.toLowerCase()
  return store.chatGroups
    .map(g => ({
      ...g,
      chats: g.chats.filter(c => c.title.toLowerCase().includes(q)),
    }))
    .filter(g => g.chats.length > 0)
})

function handleNew() {
  store.createChat()
  if (route.path !== '/chat') router.push('/chat')
}

function handleSelect(id: string) {
  store.selectChat(id)
  if (route.path !== '/chat') router.push('/chat')
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = today.getTime() - d.getTime()
  if (diff < 0) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col h-full bg-[#f7f8fa] dark:bg-gray-950">
    <!-- Logo + 新建 -->
    <div class="px-4 pt-4 pb-3 shrink-0">
      <div class="flex items-center gap-2.5 mb-4 px-1">
        <div class="w-8 h-8 rounded-lg bg-[#18a058] flex items-center justify-center text-white font-bold text-sm">A</div>
        <span class="text-base font-semibold text-gray-800 dark:text-white">AI Chat</span>
      </div>
      <button
        class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-[#18a058] hover:text-[#18a058] hover:bg-[#18a058]/5 transition-all duration-200 cursor-pointer"
        @click="handleNew"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新对话
      </button>
    </div>

    <!-- 搜索 -->
    <div class="px-4 pb-2 shrink-0">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQ"
          class="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 outline-none focus:border-[#18a058] transition-colors placeholder-gray-400"
          placeholder="搜索对话..."
        />
      </div>
    </div>

    <!-- 分组列表 -->
    <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
      <template v-for="group in filteredGroups" :key="group.label">
        <div class="px-2 pt-3 pb-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {{ group.label }}
        </div>
        <div
          v-for="chat in group.chats"
          :key="chat.id"
          class="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200"
          :class="store.currentChatId === chat.id
            ? 'bg-white dark:bg-gray-800 shadow-sm'
            : 'hover:bg-white/60 dark:hover:bg-gray-800/50'"
          @click="handleSelect(chat.id)"
        >
          <svg class="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-gray-700 dark:text-gray-200 truncate">{{ chat.title }}</div>
            <div class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{{ formatTime(chat.created_at) }}</div>
          </div>
        </div>
      </template>
      <div v-if="store.chats.length === 0" class="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
        暂无对话
      </div>
    </div>

    <!-- 用户信息 -->
    <div class="shrink-0 border-t border-gray-200 dark:border-gray-800 px-3 py-3 bg-white/50 dark:bg-gray-900/50">
      <div class="flex items-center gap-3">
        <div
          v-if="store.avatar"
          class="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 shrink-0 relative"
        ><img :src="store.avatar" class="w-full h-full object-cover" />
          <span
            v-if="store.status === 'banned'"
            class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900"
          />
        </div>
        <div
          v-else
          class="w-9 h-9 rounded-full bg-[#18a058] flex items-center justify-center text-white text-sm font-bold shrink-0 relative"
        >{{ (store.nickname || 'U').charAt(0).toUpperCase() }}
          <span
            v-if="store.status === 'banned'"
            class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ store.nickname || '用户' }}</p>
          <p class="text-[11px] text-gray-400 dark:text-gray-500">{{ store.role === 'admin' ? 'Admin' : 'Pro Plan' }}</p>
        </div>
        <button class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 cursor-pointer transition-colors" @click="router.push('/profile')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
