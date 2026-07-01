<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElButton } from 'element-plus'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/types/chat'

const md = new MarkdownIt({
  breaks: true,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {
        /* */
      }
    }
    return md.utils.escapeHtml(str)
  },
})

const props = defineProps<{ message: Message }>()
const emit = defineEmits<{ retry: [msg: Message]; delete: [msg: Message] }>()
const { t } = useI18n()
const store = useChatStore()
const isUser = computed(() => props.message.role === 'user')
const copiedFeedback = ref(false)
const showReasoning = ref(false)
const msgRef = ref<HTMLElement | null>(null)
const fullScreenCode = ref<{ code: string; lang: string } | null>(null)
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i

const imageUrls = computed(() => {
  const urls: string[] = []
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g
  let m
  while ((m = linkRe.exec(props.message.content)) !== null) {
    if (IMAGE_EXT.test(m[2]!)) urls.push(m[2]!)
  }
  const rawRe = /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|svg|bmp|ico)(?:\?[^\s]*)?)/gi
  while ((m = rawRe.exec(props.message.content)) !== null) {
    if (!urls.includes(m[1]!)) urls.push(m[1]!)
  }
  return urls
})

const textContent = computed(() =>
  props.message.content
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, n, u) => (IMAGE_EXT.test(u) ? '' : `[${n}](${u})`))
    .trim(),
)

const displayContent = computed(() => {
  if (
    !isUser.value &&
    !textContent.value &&
    !props.message.isStreaming &&
    imageUrls.value.length === 0
  )
    return ''
  return textContent.value
})

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const renderedContent = computed(() => {
  if (isUser.value) return displayContent.value
  if (props.message.isStreaming) return escapeHtml(displayContent.value)
  try {
    const html = md.render(displayContent.value)
    return DOMPurify.sanitize(html)
  } catch {
    return displayContent.value
  }
})

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copiedFeedback.value = true
    setTimeout(() => (copiedFeedback.value = false), 1500)
  } catch {
    /* */
  }
}

function handleDelete() {
  emit('delete', props.message)
}

watch(
  () => renderedContent.value,
  () => {
    if (!props.message.isStreaming) {
      nextTick(() => {
        addCodeToolbars()
      })
    }
  },
  { immediate: true },
)

function addCodeToolbars() {
  const el = msgRef.value
  if (!el) return
  el.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-toolbar')) return
    const code = pre.querySelector('code')
    if (!code) return
    const lang = code.className.match(/language-(\w+)/)?.[1] || ''
    const codeText = code.textContent || ''
    pre.style.position = 'relative'

    if (lang) {
      const lbl = document.createElement('span')
      lbl.textContent = lang
      Object.assign(lbl.style, {
        position: 'absolute',
        top: '4px',
        left: '8px',
        fontSize: '10px',
        color: '#64748b',
        textTransform: 'uppercase',
        userSelect: 'none',
        lineHeight: '1',
      })
      pre.appendChild(lbl)
    }

    const tb = document.createElement('div')
    tb.className = 'code-toolbar'
    Object.assign(tb.style, {
      position: 'absolute',
      top: '4px',
      right: '8px',
      display: 'flex',
      gap: '4px',
      zIndex: '10',
    })

    const fsBtn = mkBtn()
    fsBtn.innerHTML =
      '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>'
    fsBtn.title = '全屏'
    fsBtn.onclick = () => {
      fullScreenCode.value = { code: codeText, lang }
    }
    tb.appendChild(fsBtn)

    const cpBtn = mkBtn()
    cpBtn.innerHTML =
      '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
    cpBtn.title = '复制'
    cpBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(codeText)
        cpBtn.innerHTML = '<span style="font-size:10px;color:#34d399">✓</span>'
        setTimeout(() => {
          cpBtn.innerHTML =
            '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
        }, 1500)
      } catch {
        /* */
      }
    }
    tb.appendChild(cpBtn)

    pre.appendChild(tb)
  })
}


function mkBtn() {
  const btn = document.createElement('button')
  Object.assign(btn.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '20px',
    border: 'none',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })
  btn.onmouseenter = () => {
    btn.style.background = 'rgba(255,255,255,0.14)'
    btn.style.color = '#e2e8f0'
  }
  btn.onmouseleave = () => {
    btn.style.background = 'rgba(255,255,255,0.06)'
    btn.style.color = '#94a3b8'
  }
  return btn
}
</script>

<template>
  <div
    class="flex gap-4 max-w-3xl mx-auto group animate-fadeIn"
    :class="isUser ? 'flex-row-reverse' : ''"
  >
    <div
      v-if="isUser && store.avatar"
      class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-600 shrink-0 mt-1"
    >
      <img :src="store.avatar" class="w-full h-full object-cover" />
    </div>
    <div
      v-else-if="!isUser && store.aiLogo"
      class="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-1"
    >
      <img :src="store.aiLogo" class="w-full h-full object-cover" />
    </div>
    <div
      v-else
      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
      :class="
        isUser
          ? 'bg-[#18a058] text-white'
          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
      "
    >
      {{ isUser ? (store.nickname?.charAt(0) || 'U').toUpperCase() : 'AI' }}
    </div>

    <div class="max-w-[75%] flex flex-col gap-1.5" :class="isUser ? 'items-end' : 'items-start'">
      <div
        ref="msgRef"
        class="rounded-2xl px-4 py-3 leading-relaxed"
        :class="
          isUser
            ? 'bg-[#18a058] text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
        "
      >
        <div v-if="!isUser && message.reasoning" class="mb-2">
          <button
            class="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
            @click="showReasoning = !showReasoning"
          >
            <svg
              class="w-3 h-3 transition-transform"
              :class="showReasoning ? 'rotate-90' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>已深度思考（{{ message.reasoning.length }} 字）</span>
          </button>
          <div
            v-if="showReasoning"
            class="mt-1.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap"
          >
            {{ message.reasoning }}
          </div>
        </div>

        <div
          v-if="!isUser && displayContent"
          class="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none chat-content"
          v-html="renderedContent"
        />
        <div
          v-else-if="!isUser && !message.isStreaming && !displayContent"
          class="text-sm text-gray-400 flex flex-col items-center gap-2"
        >
          <span class="italic">~ 空消息 ~</span>
          <ElButton size="small" type="warning" plain @click="emit('retry', message)"
            >重新生成</ElButton
          >
        </div>
        <p v-else-if="isUser && textContent" class="text-sm leading-relaxed whitespace-pre-wrap">
          {{ textContent }}
        </p>

        <div v-if="imageUrls.length > 0" class="mt-2 space-y-2">
          <a
            v-for="(url, idx) in imageUrls"
            :key="idx"
            :href="url"
            target="_blank"
            class="block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
          >
            <img
              :src="url"
              class="w-full max-h-80 object-cover"
              :alt="`image-${idx}`"
              loading="lazy"
            />
          </a>
        </div>

        <div
          v-if="!isUser && message.model && !message.isStreaming"
          class="mt-2 text-[10px] text-gray-400 dark:text-gray-500 select-none"
        >
          {{ message.model }}
        </div>
        <span
          v-if="message.isStreaming"
          class="inline-block w-1.5 h-4 bg-[#18a058] ml-0.5 animate-pulse align-text-bottom rounded-sm"
        />
      </div>

      <div
        v-if="message.content && !message.isStreaming"
        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1"
      >
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
          title="复制"
          @click="copyContent"
        >
          <svg
            v-if="!copiedFeedback"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span v-else class="text-xs text-green-500">已复制</span>
        </button>
        <button
          v-if="isUser"
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
          title="删除"
          @click="handleDelete"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="fullScreenCode"
      class="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-6"
      @click.self="fullScreenCode = null"
    >
      <div
        class="w-full max-w-4xl max-h-[85vh] bg-[#1e293b] dark:bg-[#0f172a] rounded-xl overflow-hidden flex flex-col shadow-2xl"
      >
        <div
          class="flex items-center justify-between px-4 py-2.5 bg-[#0f172a] border-b border-gray-700 shrink-0"
        >
          <span class="text-xs text-gray-400 uppercase">{{ fullScreenCode.lang || 'code' }}</span>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1 text-xs rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer transition-colors"
              @click="
                async ($event: MouseEvent) => {
                  try {
                    await navigator.clipboard.writeText(fullScreenCode!.code)
                    const t = $event.target as HTMLElement
                    const orig = t.textContent || ''
                    t.textContent = '✓ 已复制'
                    setTimeout(() => (t.textContent = orig), 1500)
                  } catch {
                    /* */
                  }
                }
              "
            >
              复制
            </button>
            <button
              class="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 cursor-pointer transition-colors"
              @click="fullScreenCode = null"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <pre
            class="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap font-mono"
            style="background: transparent; padding: 0; margin: 0; border: 0"
          ><code>{{ fullScreenCode.code }}</code></pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
.chat-content :deep(pre) {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 0.75rem;
  padding-top: 1.75rem;
  border-radius: 0.5rem;
  overflow: auto;
  font-size: 0.75rem;
  margin: 0.5rem 0;
  position: relative;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}
html.dark .chat-content :deep(pre) {
  background-color: #0f172a;
}
.chat-content :deep(code) {
  background-color: #e5e7eb;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}
html.dark .chat-content :deep(code) {
  background-color: #374151;
  color: #f87171;
}
.chat-content :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}
.chat-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}
.chat-content :deep(th),
.chat-content :deep(td) {
  border: 1px solid #d1d5db;
  padding: 0.375rem 0.75rem;
  text-align: left;
  font-size: 0.75rem;
}
html.dark .chat-content :deep(th),
html.dark .chat-content :deep(td) {
  border-color: #4b5563;
}
.chat-content :deep(th) {
  background-color: #f3f4f6;
  font-weight: 600;
}
html.dark .chat-content :deep(th) {
  background-color: #374151;
}
.chat-content :deep(ul),
.chat-content :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.chat-content :deep(li) {
  margin: 0.125rem 0;
}
.chat-content :deep(blockquote) {
  border-left: 3px solid #18a058;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: #6b7280;
}
html.dark .chat-content :deep(blockquote) {
  color: #9ca3af;
}
.chat-content :deep(p) {
  margin: 0.25rem 0;
}
</style>
