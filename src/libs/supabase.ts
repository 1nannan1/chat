import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 环境变量未配置：请在项目根目录创建 .env 文件，并设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY',
  )
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
)
