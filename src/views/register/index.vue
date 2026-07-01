<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { supabase } from '@/libs/supabase'
import AuthToolbar from '@/components/auth/AuthToolbar.vue'
import AuthCard from '@/components/auth/AuthCard.vue'

const { t, locale } = useI18n()
const router = useRouter()

// ========== 注册开关 ==========
const allowRegister = ref(true)
onMounted(async () => {
  try {
    const { data } = await supabase.from('settings').select('allow_register').single()
    if (data && data.allow_register === false) allowRegister.value = false
  } catch { /* 默认允许 */ }
})

// ========== 表单 ==========
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({ email: '', password: '', confirm: '' })

const validateConfirm = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  callback(value !== form.password ? new Error(locale.value === 'zh' ? '两次密码不一致' : 'Passwords do not match') : undefined)
}

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱 / Email is required', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确 / Invalid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码 / Password is required', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位 / Min 6 characters', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请确认密码 / Confirm password', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

async function handleRegister() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const { error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { ElMessage.error(error.message); return }
    ElMessage.success(t('message.registerSuccess'))
    router.push('/login')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : 'Registration failed')
  } finally {
    loading.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); handleRegister() }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-[#f7f7f8] dark:bg-[#212121] px-4 transition-colors duration-300"
    @keydown="handleKeydown"
  >
    <AuthToolbar show-lang />

    <div class="w-full max-w-[420px]">
      <!-- 注册关闭 -->
      <div v-if="!allowRegister"
        class="flex items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 shadow-sm"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <span>{{ locale === 'zh' ? '管理员已关闭注册功能' : 'Registration is currently disabled' }}</span>
      </div>

      <!-- 注册表单 -->
      <el-form v-else
        ref="formRef" :model="form" :rules="rules"
        label-position="top" size="large"
        @submit.prevent="handleRegister"
      >
        <AuthCard :title="$t('register.title')" :subtitle="$t('register.subtitle')" :loading="loading" @submit="handleRegister">
          <el-form-item :label="$t('register.email')" prop="email">
            <el-input v-model="form.email" :placeholder="$t('register.email')" autocomplete="email" :disabled="loading" />
          </el-form-item>

          <el-form-item :label="$t('register.password')" prop="password">
            <el-input v-model="form.password" type="password" :placeholder="$t('register.password')" autocomplete="new-password" show-password :disabled="loading" />
          </el-form-item>

          <el-form-item :label="$t('register.confirmPassword')" prop="confirm">
            <el-input v-model="form.confirm" type="password" :placeholder="$t('register.confirmPassword')" autocomplete="new-password" show-password :disabled="loading" />
          </el-form-item>

          <template #btnText>{{ $t('register.btn') }}</template>

          <template #footer>
            <p class="text-center text-sm text-gray-500 dark:text-[#b4b4b4]">
              {{ $t('register.hasAccount') }}
              <span class="text-[#10a37f] hover:underline cursor-pointer font-medium" @click="router.push('/login')">{{ $t('register.switchLogin') }}</span>
            </p>
          </template>
        </AuthCard>
      </el-form>
    </div>
  </div>
</template>
