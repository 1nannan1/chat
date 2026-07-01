import { supabase } from '@/libs/supabase'
import type { Message } from '@/types/chat'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`

function buildMessages(history: Message[], newContent: string) {
  const msgs: { role: string; content: string }[] = []
  for (const m of history) {
    msgs.push({ role: m.role, content: m.content })
  }
  msgs.push({ role: 'user', content: newContent })
  return msgs
}

export interface AIResponse {
  content: string
  reasoning?: string
  memorySummary?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

/**
 * 通过 Supabase Edge Function 代理调用 AI API
 * API Key 只在服务端，浏览器不透传
 */
export async function fetchAIResponse(
  history: Message[],
  newMessage: string,
  modelName: string,
  chatId: string,
  memorySummary?: string,
): Promise<AIResponse> {
  const messages = buildMessages(history, newMessage)

  console.log('[AI] Calling edge function for', modelName, 'memory:', memorySummary ? 'yes' : 'no')

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const resp = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ modelName, messages, chatId, memorySummary }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Edge Function 错误 (${resp.status}): ${text.slice(0, 200)}`)
  }

  const data = await resp.json()

  if (data?.error) {
    throw new Error(data.error)
  }

  console.log('[AI] Got content', data.content?.length ?? 0, 'chars')

  if (!data?.content) {
    throw new Error('返回内容为空')
  }

  return {
    content: data.content,
    reasoning: data.reasoning || undefined,
    memorySummary: data.memorySummary || undefined,
    usage: data.usage || undefined,
  }
}
