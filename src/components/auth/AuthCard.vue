<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  loading?: boolean
}>()

defineEmits<{ submit: [] }>()
</script>

<template>
  <div class="w-full max-w-[420px]">
    <div
      class="bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-8 md:p-10 transition-all duration-300"
    >
      <!-- Logo -->
      <div class="text-center mb-8">
        <div
          class="w-12 h-12 mx-auto mb-4 rounded-xl bg-linear-to-br from-[#10a37f] to-[#1a7f64]
                 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30"
        >
          A
        </div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-[#ececec] tracking-tight">
          {{ title }}
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-[#b4b4b4]">
          {{ subtitle }}
        </p>
      </div>

      <!-- Form slot -->
      <slot />

      <!-- Submit button -->
      <el-button
        v-if="!loading"
        type="primary"
        native-type="submit"
        class="w-full rounded-xl! mt-4"
        style="height:44px; font-size:1rem; font-weight:500; --el-button-bg-color: #10a37f; --el-button-border-color: #10a37f; --el-button-hover-bg-color: #0d8c6d; --el-button-hover-border-color: #0d8c6d;"
        @click="$emit('submit')"
      >
        <slot name="btnText" />
      </el-button>
      <el-button
        v-else
        type="primary"
        loading
        class="w-full rounded-xl! mt-4"
        style="height:44px; font-size:1rem; font-weight:500; --el-button-bg-color: #10a37f; --el-button-border-color: #10a37f;"
      />

      <!-- Footer slot -->
      <div class="mt-4">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-form-item__label) {
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  padding-bottom: 0.375rem;
}
html.dark :deep(.el-form-item__label) {
  color: #ececec;
}
:deep(.el-input__wrapper) {
  background-color: #f7f7f8;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: none;
}
html.dark :deep(.el-input__wrapper) {
  background-color: #3a3a3a;
  border-color: #4a4a4a;
}
:deep(.el-input__wrapper:hover) {
  border-color: #d1d5db;
}
html.dark :deep(.el-input__wrapper:hover) {
  border-color: #5a5a5a;
}
:deep(.el-input__wrapper.is-focus),
html.dark :deep(.el-input__wrapper.is-focus) {
  border-color: #10a37f;
  box-shadow: 0 0 0 1px #10a37f;
}
:deep(.el-input__inner) {
  color: #111827;
}
html.dark :deep(.el-input__inner) {
  color: #ececec;
}
:deep(.el-input__inner::placeholder) {
  color: #9ca3af;
}
html.dark :deep(.el-input__inner::placeholder) {
  color: #6b6b6b;
}
:deep(.el-form-item.is-error .el-input__wrapper) {
  border-color: #ef4444;
  box-shadow: 0 0 0 1px #ef4444;
}
:deep(.el-form-item__error) {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
