import { supabase } from '@/libs/supabase'
import type { Chat, Message, Model } from '@/types/chat'

// ========== Chats ==========

export interface ChatWithCount extends Chat {
  messageCount: number
}

export interface HistoryQuery {
  search?: string
  model?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'ascending' | 'descending'
}

export interface HistoryResult {
  chats: ChatWithCount[]
  total: number
}

export async function fetchHistoryChats(
  userId: string,
  query: HistoryQuery,
): Promise<HistoryResult> {
  const {
    search,
    model,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 10,
    sortField = 'created_at',
    sortOrder = 'descending',
  } = query

  // 1) 查询总数（带筛选）
  let countQuery = supabase
    .from('chats')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (search) countQuery = countQuery.ilike('title', `%${search}%`)
  if (model) countQuery = countQuery.eq('model', model)
  if (dateFrom) countQuery = countQuery.gte('created_at', dateFrom)
  if (dateTo) countQuery = countQuery.lte('created_at', `${dateTo}T23:59:59`)

  const { count, error: countError } = await countQuery
  if (countError) throw countError

  // 2) 查询数据
  let dataQuery = supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)

  if (search) dataQuery = dataQuery.ilike('title', `%${search}%`)
  if (model) dataQuery = dataQuery.eq('model', model)
  if (dateFrom) dataQuery = dataQuery.gte('created_at', dateFrom)
  if (dateTo) dataQuery = dataQuery.lte('created_at', `${dateTo}T23:59:59`)

  // 排序
  const asc = sortOrder === 'ascending'
  dataQuery = dataQuery.order(sortField, { ascending: asc })

  // 分页
  const from = (page - 1) * pageSize
  dataQuery = dataQuery.range(from, from + pageSize - 1)

  const { data: chats, error } = await dataQuery
  if (error) throw error

  // 3) 批量查询消息数
  const chatIds = (chats ?? []).map((c) => c.id)
  let countMap = new Map<string, number>()

  if (chatIds.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('chat_id')
      .in('chat_id', chatIds)

    if (msgs) {
      msgs.forEach((m) => {
        countMap.set(m.chat_id, (countMap.get(m.chat_id) ?? 0) + 1)
      })
    }
  }

  // 4) 组装结果
  const result: ChatWithCount[] = (chats ?? []).map((c) => ({
    ...c,
    messageCount: countMap.get(c.id) ?? 0,
  }))

  return { chats: result, total: count ?? 0 }
}

export async function fetchModels(): Promise<Model[]> {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('enabled', true)

  if (error) throw error
  return data ?? []
}

export async function fetchChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createChat(chat: Omit<Chat, 'id' | 'created_at'>): Promise<Chat> {
  const { data, error } = await supabase
    .from('chats')
    .insert(chat)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', id)

  if (error) throw error
}

export async function deleteChat(id: string): Promise<void> {
  await supabase.from('messages').delete().eq('chat_id', id)
  const { error } = await supabase.from('chats').delete().eq('id', id)
  if (error) throw error
}

// ========== Messages ==========

export async function fetchMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createMessage(msg: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(msg)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMessages(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('messages').delete().in('id', ids)
  if (error) throw error
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) throw error
}

export async function countMessages(chatId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
  if (error) throw error
  return count ?? 0
}

// ========== Auth ==========

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}
