<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDarkMode } from '@/composables/useDarkMode'

defineProps<{ showLang?: boolean }>()

const { locale } = useI18n()
const { isDark, toggleDark } = useDarkMode()

function toggleLang() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('lang', locale.value)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 flex items-center gap-3 z-50">
      <button
        v-if="showLang"
        class="px-3 py-1.5 rounded-full text-sm font-medium
               bg-white dark:bg-[#2f2f2f] text-gray-700 dark:text-[#ececec]
               border border-gray-200 dark:border-[#424242]
               hover:bg-gray-50 dark:hover:bg-[#3a3a3a]
               transition-colors duration-200 cursor-pointer select-none"
        @click="toggleLang"
      >
        {{ locale === 'zh' ? '🌐 中文' : '🌐 English' }}
      </button>
      <button
        class="p-2 rounded-full text-lg
               bg-white dark:bg-[#2f2f2f]
               border border-gray-200 dark:border-[#424242]
               hover:bg-gray-50 dark:hover:bg-[#3a3a3a]
               transition-colors duration-200 cursor-pointer select-none"
        @click="toggleDark"
        :title="isDark ? '切换亮色' : '切换暗色'"
      >
        {{ isDark ? '☀️' : '🌙' }}
      </button>
    </div>
  </Teleport>
</template>
