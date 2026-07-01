<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { supabase } from '@/libs/supabase'
import { fetchProfile, updateProfile, updatePassword, signOut } from '@/api/profile'
import type { Profile } from '@/types/profile'
import { useChatStore } from '@/stores/chat'

const { t } = useI18n()
const router = useRouter()
const chatStore = useChatStore()

// ========== 状态 ==========
const loading = ref(true)
const saving = ref(false)
const activeTab = ref<'profile' | 'password' | 'about'>('profile')

const profile = reactive<Profile>({
  user_id: '',
  created_at: '',
  nickname: '',
  avatar: null,
  role: 'user',
  email: null,
  desc: null,
  status: 'active',
})

// 密码表单
const passwordForm = reactive({
  current: '',
  newPass: '',
  confirm: '',
})

const passwordFormRef = ref<FormInstance>()

const passwordRules: FormRules = {
  current: [
    { required: true, message: '请输入当前密码 / Current password is required', trigger: 'blur' },
  ],
  newPass: [
    { required: true, message: '请输入新密码 / New password is required', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位 / Min 6 characters', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请确认新密码 / Confirm new password', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (e?: Error) => void) => {
        if (value !== passwordForm.newPass) {
          callback(new Error('两次密码不一致 / Passwords do not match'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// ========== 生命周期 ==========
onMounted(async () => {
  try {
    const user = await supabase.auth.getUser()
    if (!user.data.user) {
      router.push('/login')
      return
    }
    const userId = user.data.user.id
    profile.user_id = userId
    profile.email = user.data.user.email ?? null

    const p = await fetchProfile(userId)
    if (p) {
      profile.nickname = p.nickname
      profile.avatar = p.avatar
      profile.role = p.role
      profile.created_at = p.created_at
      profile.desc = p.desc
    }
  } catch (e) {
    console.error('Failed to load profile', e)
  } finally {
    loading.value = false
  }
})

// ========== 头像上传 ==========
async function handleAvatarUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.user_id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      profile.avatar = urlData.publicUrl
      chatStore.avatar = urlData.publicUrl  // ← 同步侧边栏头像

      await updateProfile(profile.user_id, { avatar: profile.avatar })
      ElMessage.success(t('profile.saveSuccess'))
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }
  input.click()
}

// ========== 保存资料 ==========
async function handleSaveProfile() {
  saving.value = true
  try {
    await updateProfile(profile.user_id, {
      nickname: profile.nickname,
      desc: profile.desc,
    })
    chatStore.nickname = profile.nickname  // ← 同步侧边栏昵称
    ElMessage.success(t('profile.saveSuccess'))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'Save failed')
  } finally {
    saving.value = false
  }
}

// ========== 修改密码 ==========
async function handleChangePassword() {
  if (!passwordFormRef.value) return
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    await updatePassword(passwordForm.newPass)
    ElMessage.success(t('profile.passwordSuccess'))
    passwordForm.current = ''
    passwordForm.newPass = ''
    passwordForm.confirm = ''
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'Password update failed')
  } finally {
    saving.value = false
  }
}

// ========== 退出 ==========
async function handleLogout() {
  await signOut()
  router.push('/login')
}

async function confirmLogout() {
  try {
    await ElMessageBox.confirm(t('profile.logoutConfirm'), t('profile.title'), {
      confirmButtonText: t('profile.logout'),
      cancelButtonText: t('profile.cancel'),
      type: 'warning',
    })
    await handleLogout()
  } catch {
    // cancelled
  }
}

// ========== 格式化日期 ==========
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ========== 首字母 ==========
function initial(name: string) {
  return name?.charAt(0).toUpperCase() || 'U'
}

const tabs = [
  { key: 'profile', label: 'profile.info', icon: '👤' },
  { key: 'password', label: 'profile.password', icon: '🔒' },
  { key: 'about', label: 'profile.about', icon: 'ℹ️' },
] as const
</script>

<template>
  <div class="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="flex items-center gap-3 mb-8">
        <button
          class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors"
          @click="router.push('/chat')"
          :title="$t('history.back')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t('profile.title') }}
        </h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <el-skeleton :rows="6" animated class="w-full max-w-xl" />
      </div>

      <template v-else>
        <!-- 个人资料卡片 -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors">
          <div class="flex items-center gap-5">
            <!-- 头像 -->
            <div class="relative group shrink-0 cursor-pointer" @click="handleAvatarUpload">
              <div
                v-if="profile.avatar"
                class="w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-600"
              >
                <img :src="profile.avatar" class="w-full h-full object-cover" alt="avatar" />
              </div>
              <div
                v-else
                class="w-20 h-20 rounded-full bg-linear-to-br from-[#10a37f] to-[#1a7f64]
                       flex items-center justify-center text-white text-3xl font-bold"
              >
                {{ initial(profile.nickname) }}
              </div>
              <div
                class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
              >
                {{ $t('profile.changeAvatar') }}
              </div>
            </div>

            <!-- 用户信息 -->
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ profile.nickname || 'User' }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ profile.email }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-medium
                         bg-[#10a37f]/10 text-[#10a37f] dark:bg-[#10a37f]/20 dark:text-[#10a37f]"
                >
                  {{ profile.role === 'admin' ? 'Admin' : 'User' }}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  {{ $t('profile.memberSince') }} {{ profile.created_at ? formatDate(profile.created_at) : '-' }}
                </span>
              </div>
            </div>

            <!-- 退出 -->
            <el-button
              type="danger"
              plain
              size="small"
              @click="confirmLogout"
            >
              {{ $t('profile.logout') }}
            </el-button>
          </div>
        </div>

        <!-- Tab 切换 -->
        <el-tabs v-model="activeTab" class="profile-tabs">
          <el-tab-pane
            v-for="tab in tabs"
            :key="tab.key"
            :label="`${tab.icon} ${$t(tab.label)}`"
            :name="tab.key"
          >
            <!-- 个人信息 -->
            <template v-if="tab.key === 'profile'">
              <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <el-form label-position="top" size="large">
                  <el-form-item :label="$t('profile.nickname')">
                    <el-input
                      v-model="profile.nickname"
                      :placeholder="$t('profile.nickname')"
                    />
                  </el-form-item>

                  <el-form-item :label="$t('profile.bio')">
                    <el-input
                      v-model="profile.desc"
                      type="textarea"
                      :rows="3"
                      :placeholder="$t('profile.bioPlaceholder')"
                    />
                  </el-form-item>
                </el-form>

                <el-button
                  type="primary"
                  class="w-full"
                  size="large"
                  :loading="saving"
                  @click="handleSaveProfile"
                  style="--el-button-bg-color: #10a37f; --el-button-border-color: #10a37f; --el-button-hover-bg-color: #0d8c6d; --el-button-hover-border-color: #0d8c6d;"
                >
                  {{ $t('profile.save') }}
                </el-button>
              </div>
            </template>

            <!-- 修改密码 -->
            <template v-if="tab.key === 'password'">
              <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <el-form
                  ref="passwordFormRef"
                  :model="passwordForm"
                  :rules="passwordRules"
                  label-position="top"
                  size="large"
                >
                  <el-form-item :label="$t('profile.currentPassword')" prop="current">
                    <el-input
                      v-model="passwordForm.current"
                      type="password"
                      show-password
                      :placeholder="$t('profile.currentPassword')"
                    />
                  </el-form-item>

                  <el-form-item :label="$t('profile.newPassword')" prop="newPass">
                    <el-input
                      v-model="passwordForm.newPass"
                      type="password"
                      show-password
                      :placeholder="$t('profile.newPassword')"
                    />
                  </el-form-item>

                  <el-form-item :label="$t('profile.confirmPassword')" prop="confirm">
                    <el-input
                      v-model="passwordForm.confirm"
                      type="password"
                      show-password
                      :placeholder="$t('profile.confirmPassword')"
                    />
                  </el-form-item>

                  <el-form-item>
                    <el-button
                      type="primary"
                      native-type="submit"
                      class="w-full"
                      size="large"
                      :loading="saving"
                      @click.prevent="handleChangePassword"
                      style="--el-button-bg-color: #10a37f; --el-button-border-color: #10a37f; --el-button-hover-bg-color: #0d8c6d; --el-button-hover-border-color: #0d8c6d;"
                    >
                      {{ $t('profile.updatePassword') }}
                    </el-button>
                  </el-form-item>
                </el-form>
              </div>
            </template>

            <!-- 关于 -->
            <template v-if="tab.key === 'about'">
              <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div class="space-y-4 text-sm">
                  <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.version') }}</span>
                    <span class="text-gray-900 dark:text-gray-200 font-medium">v1.0.0</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.techStack') }}</span>
                    <span class="text-gray-900 dark:text-gray-200 font-medium">Vue 3 + Element Plus + Supabase</span>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.builtBy') }}</span>
                    <span class="text-gray-900 dark:text-gray-200 font-medium">AI Chat Team</span>
                  </div>
                </div>
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
  </div>
</template>

<style scoped>
.profile-tabs :deep(.el-tabs__header) {
  margin-bottom: 1.5rem;
}
.profile-tabs :deep(.el-tabs__item) {
  font-size: 0.875rem;
  font-weight: 500;
  height: 2.5rem;
  line-height: 2.5rem;
}
.profile-tabs :deep(.el-tabs__active-bar) {
  background-color: #10a37f;
}
.profile-tabs :deep(.el-tabs__item:hover) {
  color: #10a37f;
}
.profile-tabs :deep(.el-tabs__item.is-active) {
  color: #10a37f;
}
</style>
