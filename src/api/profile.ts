import { supabase } from '@/libs/supabase'
import type { Profile } from '@/types/profile'

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'nickname' | 'avatar' | 'desc'>>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}
