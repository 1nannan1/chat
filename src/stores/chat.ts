import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Chat, Message, Model } from '@/types/chat'
import * as api from '@/api/chat'
import { fetchProfile } from '@/api/profile'
import { fetchAIResponse } from '@/api/ai'
import { supabase } from '@/libs/supabase'

export const MODEL_ICONS: Record<string, string> = {
  'deepseek-v4-flash': '⚡',
  'deepseek-chat': '🧠',
  'deepseek-v4-pro': '🧠',
  'deepseek-r1': '🔬',
  'gpt-4o': '🚀',
  'kimi': '🌙',
  'nvidia/nemotron-3-ultra-550b-a55b': '💎',
  'cosmos3-nano-reasoner': '💎',
}

export const MODEL_NAMES: Record<string, string> = {
  'deepseek-v4-flash': 'DeepSeek V4 Flash',
  'deepseek-chat': 'DeepSeek Chat',
  'deepseek-v4-pro': 'DeepSeek V4 Pro',
  'deepseek-r1': 'DeepSeek R1',
  'gpt-4o': 'GPT-4o',
  'kimi': 'Kimi',
  'nvidia/nemotron-3-ultra-550b-a55b': 'Nemotron Ultra',
  'cosmos3-nano-reasoner': 'Cosmos Reasoner',
}

export const useChatStore = defineStore('chat', () => {
  const chats = ref<Chat[]>([])
  const messages = ref<Message[]>([])
  const currentChatId = ref<string | null>(null)
  const currentModel = ref<string>('deepseek-v4-flash')
  const models = ref<Model[]>([])
  const loadingChats = ref(false)
  const loadingMessages = ref(false)
  const sending = ref(false)
  const userId = ref<string | null>(null)
  const avatar = ref<string | null>(null)
  const nickname = ref('')
  const role = ref('')
  const status = ref('active')
  const aiLogo = ref('')

  // ========== Getters ==========
  const currentChat = computed(() =>
    chats.value.find((c) => c.id === currentChatId.value) ?? null,
  )

  const currentModelIcon = computed(() =>
    MODEL_ICONS[currentModel.value] ?? '🤖',
  )

  const currentModelName = computed(() =>
    MODEL_NAMES[currentModel.value] ?? currentModel.value,
  )

  // 按日期分组对话
  const chatGroups = computed(() => {
    const today: Chat[] = []
    const yesterday: Chat[] = []
    const thisWeek: Chat[] = []
    const earlier: Chat[] = []

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000)

    for (const chat of chats.value) {
      const d = new Date(chat.created_at)
      if (d >= todayStart) today.push(chat)
      else if (d >= yesterdayStart) yesterday.push(chat)
      else if (d >= weekStart) thisWeek.push(chat)
      else earlier.push(chat)
    }

    const groups: { label: string; chats: Chat[] }[] = []
    if (today.length) groups.push({ label: '今天', chats: today })
    if (yesterday.length) groups.push({ label: '昨天', chats: yesterday })
    if (thisWeek.length) groups.push({ label: '最近7天', chats: thisWeek })
    if (earlier.length) groups.push({ label: '更早', chats: earlier })
    return groups
  })

  // ========== Actions ==========
  async function init() {
    try {
      const user = await api.getCurrentUser()
      if (!user) return
      userId.value = user.id
      await Promise.all([
        loadChats(),
        loadModels(),
        (async () => {
          try {
            const p = await fetchProfile(user.id)
            if (p) {
              avatar.value = p.avatar
              nickname.value = p.nickname
              role.value = p.role
              status.value = p.status
            }
          } catch { /* silent */ }
        })(),
        (async () => {
          try {
            const { data } = await supabase.from('settings').select('site_logo').single()
            if (data?.site_logo) aiLogo.value = data.site_logo
          } catch { /* silent */ }
        })(),
      ])
    } catch { /* not logged in */ }
  }

  async function loadChats() {
    if (!userId.value) return
    loadingChats.value = true
    try {
      chats.value = await api.fetchChats(userId.value)
    } catch (e) {
      console.error('Failed to load chats', e)
    } finally {
      loadingChats.value = false
    }
  }

  async function loadModels() {
    try {
      models.value = await api.fetchModels()
      if (models.value.length > 0) {
        currentModel.value = models.value[0]!.name
      }
    } catch (e) {
      console.error('Failed to load models', e)
    }
  }

  async function selectChat(chatId: string) {
    if (currentChatId.value === chatId) return
    currentChatId.value = chatId
    loadingMessages.value = true
    messages.value = []
    try {
      messages.value = await api.fetchMessages(chatId)
    } catch (e) {
      console.error('Failed to load messages', e)
    } finally {
      loadingMessages.value = false
    }
  }

  async function createChat(): Promise<Chat | null> {
    if (!userId.value) return null
    try {
      const chat = await api.createChat({
        user_id: userId.value,
        title: '新对话',
        model: currentModel.value,
      })
      chats.value.unshift(chat)
      currentChatId.value = chat.id
      messages.value = []
      return chat
    } catch (e) {
      console.error('Failed to create chat', e)
      return null
    }
  }

  async function deleteChat(chatId: string) {
    try {
      await api.deleteChat(chatId)
      chats.value = chats.value.filter((c) => c.id !== chatId)
      if (currentChatId.value === chatId) {
        currentChatId.value = chats.value[0]?.id ?? null
        if (currentChatId.value) {
          await selectChat(currentChatId.value)
        } else {
          messages.value = []
        }
      }
    } catch (e) {
      console.error('Failed to delete chat', e)
    }
  }

  async function sendMessage(content: string) {
    if (status.value === 'banned') return
    let chat = currentChat.value
    if (!chat) {
      const newChat = await createChat()
      if (!newChat) return
      chat = newChat
    }
    if (!chat || !userId.value) return
    sending.value = true

    try {
      const isFirst = messages.value.length === 0
      if (isFirst) {
        const title = content.length > 30 ? content.slice(0, 30) + '...' : content
        chat.title = title
        await api.updateChatTitle(chat.id, title)
      }

      const userMsg = await api.createMessage({
        chat_id: chat.id, role: 'user', content, tokens: 0, model: currentModel.value,
      })
      messages.value.push(userMsg)

      const savedAi = await api.createMessage({
        chat_id: chat.id, role: 'assistant', content: '', tokens: 0, model: currentModel.value,
      })
      savedAi.isStreaming = true
      messages.value.push(savedAi)

      const { content: replyContent, reasoning, memorySummary } = await fetchAIResponse(
        messages.value.slice(0, -2), content, currentModel.value, chat.id,
        chat.memory_summary || undefined,
      )

      savedAi.reasoning = reasoning
      // 保存记忆摘要到当前对话（Edge Function 已写入 DB，这里同步到内存）
      if (memorySummary && chat) {
        chat.memory_summary = memorySummary
      }
      const msgIdx = messages.value.length - 1
      const aiMsg = messages.value[msgIdx]!
      await supabaseUpdateMessage(savedAi.id, replyContent, reasoning)

      aiMsg.reasoning = ''
      aiMsg.content = ''
      const reasonLines = (reasoning || '').split('\n')
      const contentLines = replyContent.split('\n')
      const totalLines = reasonLines.length + contentLines.length
      // 动态间隔：总动画时间控制在 ~800ms，行多则加速，行少则减速保持效果
      const interval = Math.max(3, Math.min(50, Math.floor(800 / totalLines)))
      let idx = 0
      const timer = setInterval(() => {
        if (idx < reasonLines.length) {
          aiMsg.reasoning = reasonLines.slice(0, idx + 1).join('\n')
        } else if (idx < totalLines) {
          aiMsg.reasoning = reasoning || ''
          aiMsg.content = contentLines.slice(0, idx - reasonLines.length + 1).join('\n')
        } else {
          aiMsg.reasoning = reasoning || ''
          aiMsg.content = replyContent
          clearInterval(timer)
          aiMsg.isStreaming = false
          sending.value = false
        }
        idx++
      }, 30)
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : '请求失败'
      console.error('sendMessage error:', errMsg)
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg?.isStreaming) {
        lastMsg.content = `❌ ${errMsg}`
        lastMsg.isStreaming = false
        if (lastMsg.id) supabaseUpdateMessage(lastMsg.id, `❌ ${errMsg}`).catch(() => {})
      }
      sending.value = false
    }
  }

  async function supabaseUpdateMessage(id: string, content: string, reasoning?: string) {
    try {
      const updates: Record<string, unknown> = { content }
      if (reasoning !== undefined) updates.reasoning = reasoning
      const { error } = await supabase.from('messages').update(updates).eq('id', id)
      if (error) console.error('supabaseUpdateMessage error:', error)
    } catch (e) {
      console.error('supabaseUpdateMessage exception:', e)
    }
  }

  let _abort: AbortController | null = null
  let _typingTimer: ReturnType<typeof setInterval> | null = null

  function stopSending() {
    if (_abort) { _abort.abort(); _abort = null }
    if (_typingTimer) { clearInterval(_typingTimer); _typingTimer = null }
    const last = messages.value[messages.value.length - 1]
    if (last?.isStreaming) last.isStreaming = false
    sending.value = false
  }

  return {
    chats, messages, currentChatId, currentModel, models,
    loadingChats, loadingMessages, sending,
    userId, avatar, nickname, role, status, aiLogo,
    currentChat, currentModelIcon, currentModelName, chatGroups,
    init, loadChats, selectChat, createChat, deleteChat, stopSending,
    async deleteMessage(messageId: string) {
      const idx = messages.value.findIndex((m) => m.id === messageId)
      if (idx === -1 || messages.value[idx]!.role !== 'user') return
      const idsToDelete = [messageId]
      const nextMsg = messages.value[idx + 1]
      if (nextMsg?.role === 'assistant') idsToDelete.push(nextMsg.id)
      try {
        await api.deleteMessages(idsToDelete)
        messages.value = messages.value.filter((m) => !idsToDelete.includes(m.id))
        if (messages.value.length === 0 && currentChatId.value) {
          const chatId = currentChatId.value
          await api.deleteChat(chatId)
          chats.value = chats.value.filter((c) => c.id !== chatId)
          currentChatId.value = chats.value[0]?.id ?? null
          messages.value = []
        }
      } catch (e) {
        console.error('Failed to delete messages', e)
      }
    },
    sendMessage,
  }
})
