<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import { supabase } from '@/libs/supabase'
import PromptSelector from './PromptSelector.vue'

const { t } = useI18n()
const store = useChatStore()
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const attachedFiles = ref<{ name: string; url: string }[]>([])
const uploading = ref(false)
const MAX_FILE_SIZE = 20 * 1024 * 1024

function handleSend() {
  const text = inputText.value.trim()
  const content = text || (attachedFiles.value.length > 0 ? '请查看附件' : '')
  if ((!content || !text) && attachedFiles.value.length === 0) return
  if (store.sending) return
  let finalContent = text
  for (const f of attachedFiles.value) {
    if (finalContent) finalContent += '\n'
    finalContent += `[${f.name}](${f.url})`
  }
  store.sendMessage(finalContent)
  inputText.value = ''
  attachedFiles.value = []
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

function onInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}

async function handleUploadFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.csv,.json,.py,.js,.ts,.html,.css'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { ElMessage.warning(t('chat.fileTooBig')); return }
    uploading.value = true
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const safeName = `${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}.${ext}`
      const path = `${store.userId}/${safeName}`
      const { error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path)
      attachedFiles.value.push({ name: file.name, url: urlData.publicUrl })
      ElMessage.success(t('chat.fileUploaded'))
    } catch (e: unknown) { ElMessage.error(e instanceof Error ? e.message : '上传失败') }
    finally { uploading.value = false }
  }
  input.click()
}

function removeFile(idx: number) { attachedFiles.value.splice(idx, 1) }

function handlePromptSelect(content: string) {
  inputText.value = content
  inputRef.value?.focus()
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all overflow-hidden">
    <!-- 封禁提示 -->
    <div v-if="store.status === 'banned'"
      class="flex items-center gap-2 px-5 py-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
      <span>你的账号已被封禁，无法发送消息</span>
    </div>
    <template v-else>
    <div v-if="attachedFiles.length > 0" class="flex flex-wrap gap-2 px-4 pt-3">
      <span v-for="(f, idx) in attachedFiles" :key="idx" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        <span class="max-w-32 truncate">{{ f.name }}</span>
        <button class="ml-0.5 hover:text-red-500 cursor-pointer" @click="removeFile(idx)">&times;</button>
      </span>
    </div>

    <textarea ref="inputRef" v-model="inputText" rows="1"
      class="w-full bg-transparent resize-none outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 px-5 pt-4 pb-3"
      :placeholder="t('chat.placeholder')" :disabled="store.sending"
      @input="onInput" @keydown="handleKeydown"></textarea>

    <div class="flex items-center justify-between px-4 pb-3">
      <div class="flex items-center gap-1">
        <button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors disabled:opacity-40"
          :disabled="store.sending || uploading" :title="t('chat.uploadFile')" @click="handleUploadFile">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
        <PromptSelector @select="handlePromptSelect" />
      </div>

      <div class="flex items-center gap-2">
        <el-select :model-value="store.currentModel" @update:model-value="(v: string) => store.currentModel = v" size="small" style="width: 140px">
          <el-option v-for="model in store.models" :key="model.id" :label="model.name" :value="model.name" />
        </el-select>

        <button v-if="!store.sending"
          class="p-2 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          :class="(inputText.trim() || attachedFiles.length > 0) ? 'bg-[#18a058] text-white hover:bg-[#14804a] shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'"
          :disabled="!inputText.trim() && attachedFiles.length === 0" @click="handleSend">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
        <button v-else class="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors" @click="store.stopSending?.()" title="停止">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" /></svg>
        </button>
      </div>
    </div>
    </template>
  </div>
</template>
