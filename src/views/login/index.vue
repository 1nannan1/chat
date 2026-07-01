<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { supabase } from '@/libs/supabase'
import { fetchProfile } from '@/api/profile'
import AuthToolbar from '@/components/auth/AuthToolbar.vue'
import AuthCard from '@/components/auth/AuthCard.vue'

const { t } = useI18n()
const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({ email: '', password: '' })

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱 / Email is required', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确 / Invalid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码 / Password is required', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位 / Min 6 characters', trigger: 'blur' },
  ],
}

async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (error) { ElMessage.error(error.message); return }

    // 封禁检查
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const profile = await fetchProfile(user.id)
        if (profile && profile.status !== 'active') {
          await supabase.auth.signOut()
          ElMessage.error('你的账号已被禁用，无法登录')
          return
        }
      } catch { /* 放行 */ }
    }

    ElMessage.success(t('message.loginSuccess'))
    router.push('/chat')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Login failed')
  } finally {
    loading.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); handleLogin() }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-[#f7f7f8] dark:bg-[#212121] px-4 transition-colors duration-300"
    @keydown="handleKeydown"
  >
    <AuthToolbar show-lang />

    <el-form
      ref="formRef" :model="form" :rules="rules"
      label-position="top" size="large"
      class="w-full max-w-[420px]"
      @submit.prevent="handleLogin"
    >
      <AuthCard :title="$t('login.title')" :subtitle="$t('login.subtitle')" @submit="handleLogin">
        <el-form-item :label="$t('register.email')" prop="email">
          <el-input v-model="form.email" :placeholder="$t('register.email')" autocomplete="email" :disabled="loading" />
        </el-form-item>

        <el-form-item :label="$t('login.password')" prop="password">
          <el-input v-model="form.password" type="password" :placeholder="$t('login.password')" autocomplete="current-password" show-password :disabled="loading" />
        </el-form-item>

        <template #btnText>{{ loading ? '' : $t('login.btn') }}</template>

        <template #footer>
          <p class="text-center text-sm text-gray-500 dark:text-[#b4b4b4]">
            {{ $t('login.noAccount') }}
            <span class="text-[#10a37f] hover:underline cursor-pointer font-medium" @click="router.push('/register')">{{ $t('login.switchRegister') }}</span>
          </p>
          <p class="mt-4 text-center text-xs text-gray-400 dark:text-[#8e8e8e] leading-relaxed px-4">
            {{ $t('chat.disclaimer') }}
          </p>
        </template>
      </AuthCard>
    </el-form>
  </div>
</template>
