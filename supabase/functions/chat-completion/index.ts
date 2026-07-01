// @ts-nocheck — 此文件运行在 Supabase Deno 运行时，本地 TS 不认识 Deno 全局
// Supabase Edge Function — AI Chat Completion Proxy
// API Key 只存在于服务端，浏览器不可见
// 
// 记忆功能：每次对话结束后 AI 自动生成摘要，下次对话注入为上下文

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import mammoth from 'https://esm.sh/mammoth@1.6.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface FileMsg {
  role: string
  content: string
}

interface ReqBody {
  modelName: string
  messages: FileMsg[]
  chatId: string
  memorySummary?: string   // 上一轮对话的摘要，注入为 System Prompt
}

/**
 * 调用 AI API 的核心函数
 */
async function callAI(
  messages: FileMsg[],
  modelName: string,
  apiModel: string,
  baseUrl: string,
  apiKey: string,
  maxTokens = 4096,
) {
  const apiUrl = /\/chat\/completions$/i.test(baseUrl)
    ? baseUrl
    : `${baseUrl}/chat/completions`

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages,
      stream: false,
      max_tokens: maxTokens,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`API error (${resp.status}): ${text.slice(0, 200)}`)
  }

  const data = await resp.json()
  const msg = data.choices?.[0]?.message
  return {
    content: (msg?.content ?? '') as string,
    reasoning: (msg?.reasoning_content ?? '') as string,
    usage: data.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined,
  }
}

/** 从 JWT token 中提取 user_id（只解码 payload，不验证签名） */
function extractUserId(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1]!))
    return payload.sub || null
  } catch {
    return null
  }
}

// 简单定价：每百万 token 的价格（美元）
const PRICING: Record<string, { input: number; output: number }> = {
  deepseek: { input: 0.5, output: 2 },
  openai: { input: 10, output: 30 },
}

const STORAGE_RE = /https?:\/\/[^/\s]+\/storage\/v1\/object\/public\/[^/\s]+\/([^\s)]+)/g
const TEXT_EXTS = new Set([
  'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml',
  'py', 'js', 'ts', 'html', 'css', 'log', 'env', 'ini', 'cfg',
])

async function readTextFromUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) return null
    const name = decodeURIComponent(url.split('/').pop() || '')
    const ext = name.split('.').pop()?.toLowerCase() || ''
    if (TEXT_EXTS.has(ext)) return (await resp.text()).slice(0, 8000)
    if (ext === 'docx' || ext === 'doc') {
      const buffer = await resp.arrayBuffer()
      const result = await mammoth.extractRawText({ buffer })
      return (result.value || '').slice(0, 8000)
    }
    return null
  } catch {
    return null
  }
}

async function enrichMessages(messages: FileMsg[]): Promise<FileMsg[]> {
  const results = await Promise.all(
    messages.map(async (msg) => {
      const urls = msg.content.match(STORAGE_RE)
      if (!urls) return msg
      let newContent = msg.content
      for (const url of urls) {
        const text = await readTextFromUrl(url)
        if (text) {
          newContent = newContent.replace(url, '').trim()
          newContent += `\n\n---\n附件内容：\n\`\`\`\n${text}\n\`\`\``
        }
      }
      return { ...msg, content: newContent }
    }),
  )
  return results
}

const SUMMARIZE_PROMPT = `请用2-3句话（中文）总结这段对话的核心内容，必须包含：1) 用户的目标 2) 当前进度 3) 关键决策。用于提供给后续对话作为上下文。`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { modelName, messages, chatId, memorySummary }: ReqBody = await req.json()
    const userId = extractUserId(req.headers.get('Authorization'))
    console.log('[chat-completion] Model:', modelName, 'Chat:', chatId, 'Summary:', memorySummary ? 'yes' : 'no')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: model, error } = await supabase
      .from('models')
      .select('id, name, api_key, base_url, provider')
      .eq('name', modelName)
      .eq('enabled', true)
      .single()

    if (error || !model || !model.api_key) {
      return new Response(
        JSON.stringify({ error: `Model "${modelName}" not configured` }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
      )
    }

    const MAP: Record<string, string> = { 'deepseek-r1': 'deepseek-reasoner' }
    const apiModel = MAP[model.name] ?? model.name
    const baseUrl = model.base_url.replace(/\/+$/, '')

    // 附件文本提取
    const enrichedPromise = enrichMessages(messages)
    const timeoutPromise = new Promise<FileMsg[]>((_, reject) =>
      setTimeout(() => reject(new Error('file_extract_timeout')), 8000),
    )
    let enrichedMessages = await Promise.race([enrichedPromise, timeoutPromise]).catch(() => messages)

    // === 记忆注入：如果有上一轮摘要，作为 System Prompt 置顶 ===
    if (memorySummary) {
      enrichedMessages = [
        {
          role: 'system',
          content: `[历史对话摘要] ${memorySummary}\n请基于以上历史上下文继续辅助用户。`,
        },
        ...enrichedMessages,
      ]
      console.log('[chat-completion] Injected memory summary, length:', memorySummary.length)
    }

    // === 调用 AI 主回复 ===
    const { content, reasoning, usage } = await callAI(
      enrichedMessages, modelName, apiModel, baseUrl, model.api_key, 4096,
    )

    // === Token 消耗记录 ===
    if (usage?.total_tokens) {
      const provider = (model.provider || '').toLowerCase()
      const pricing = PRICING[provider] || PRICING['openai']
      const cost = ((usage.prompt_tokens || 0) * pricing.input + (usage.completion_tokens || 0) * pricing.output) / 1_000_000
      const { error: usageError } = await supabase.from('usage_logs').insert({
        user_id: userId,
        model_id: model.id,
        chat_id: chatId,
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens,
        cost,
      })
      if (usageError) console.error('[chat-completion] Usage log error:', usageError.message)
      console.log('[chat-completion] Usage:', usage.total_tokens, 'tokens, cost:', cost.toFixed(6))
    }

    // === 记忆生成：异步生成摘要（不阻塞主响应） ===
    let newSummary = ''
    if (content) {
      try {
        const summarizeMessages: FileMsg[] = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'assistant', content },
        ]
        // 只取最近 20 条消息做摘要，避免 token 超标
        const summaryInput = [
          { role: 'system', content: SUMMARIZE_PROMPT },
          ...summarizeMessages.slice(-20),
        ]
        const summaryRes = await callAI(summaryInput, modelName, apiModel, baseUrl, model.api_key, 150)
        newSummary = summaryRes.content || ''
        if (newSummary) {
          await supabase.from('chats').update({ memory_summary: newSummary }).eq('id', chatId)
          console.log('[chat-completion] Summary saved:', newSummary.length, 'chars')
        }
      } catch (e) {
        console.warn('[chat-completion] Summary generation failed:', e instanceof Error ? e.message : 'unknown')
      }
    }

    return new Response(
      JSON.stringify({
        content,
        reasoning,
        usage: usage
          ? { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, total_tokens: usage.total_tokens }
          : undefined,
        memorySummary: newSummary || undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  }
})
