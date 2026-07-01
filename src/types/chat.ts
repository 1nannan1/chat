export interface Chat {
  id: string
  user_id: string
  title: string
  model: string
  created_at: string
  memory_summary?: string | null
}

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string | null   // 思维链内容（仅 AI 消息）
  tokens: number
  model: string
  created_at: string
  isStreaming?: boolean
}

export interface Model {
  id: string
  name: string
  provider: string
  enabled: boolean
}

export interface Prompt {
  id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  user_id: string
  is_public: boolean
  desc: string | null
  created_at: string
  updated_at: string
  status: string
}

export interface ChatWithMessages extends Chat {
  messages: Message[]
}
