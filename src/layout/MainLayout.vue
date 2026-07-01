<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { updateVeeValidateLocale } from '@/utils/validation'
import { useChatStore } from '@/stores/chat'
import { supabase } from '@/libs/supabase'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'

const { t } = useI18n()
const { locale } = useI18n()
const router = useRouter()
const store = useChatStore()
const isDark = ref(false)
const showSidebar = ref(true)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }
  await store.init()
  // 检查用户状态，非 active 则登出
  if (store.status !== 'active') {
    await supabase.auth.signOut()
    router.push('/login')
  }
})

const saved = localStorage.getItem('theme')
if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  isDark.value = true
}
watch(isDark, (v) => {
  document.documentElement.classList.toggle('dark', v)
  localStorage.setItem('theme', v ? 'dark' : 'light')
}, { immediate: true })

function toggleLang() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('lang', locale.value)
  updateVeeValidateLocale(locale.value as 'zh' | 'en')
}
</script>

<template>
  <div class="h-screen flex bg-[#f7f8fa] dark:bg-gray-950">
    <!-- 侧边栏 -->
    <aside
      class="h-full border-r border-gray-200 dark:border-gray-800 transition-all duration-300 shrink-0 overflow-hidden"
      :class="showSidebar ? 'w-[280px]' : 'w-0 border-r-0'"
    >
      <ChatSidebar />
    </aside>

    <!-- 主区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶栏 -->
      <header class="h-14 flex items-center justify-between px-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div class="flex items-center gap-3">
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer transition-colors"
            @click="showSidebar = !showSidebar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span v-if="store.currentChat" class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
            {{ store.currentChat.title }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            @click="toggleLang"
          >{{ locale === 'zh' ? '中' : 'EN' }}</button>
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer transition-colors"
            @click="isDark = !isDark"
          >{{ isDark ? '☀️' : '🌙' }}</button>
        </div>
      </header>

      <main class="flex-1 overflow-hidden">
        <router-view />
      </main>
    </div>
  </div>
</template>
