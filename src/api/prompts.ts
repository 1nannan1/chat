import { supabase } from '@/libs/supabase'
import type { Prompt } from '@/types/chat'

export async function fetchPrompts(userId: string): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createPrompt(prompt: {
  title: string
  content: string
  category?: string
  user_id: string
}): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .insert({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category || '其他',
      user_id: prompt.user_id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePrompt(
  id: string,
  updates: { title?: string; content?: string; category?: string },
): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase
    .from('prompts')
    .update({ status: 'deleted' })
    .eq('id', id)

  if (error) throw error
}
