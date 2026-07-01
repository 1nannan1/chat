import { ref, onMounted, watch } from 'vue'

/**
 * 暗黑模式 — 登录/注册页共享
 * 读取 localStorage/系统偏好，切换时写入文档 class
 */
export function useDarkMode() {
  const isDark = ref(false)

  onMounted(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      isDark.value = true
    }
  })

  watch(isDark, (val) => {
    document.documentElement.classList.toggle('dark', val)
    localStorage.setItem('theme', val ? 'dark' : 'light')
  }, { immediate: true })

  function toggle() {
    isDark.value = !isDark.value
  }

  return { isDark, toggleDark: toggle }
}
