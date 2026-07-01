import '@/assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
// Element Plus 样式
// 使用 CDN 或按需引入方式，这里使用全量引入
import 'element-plus/dist/index.css'
// 代码语法高亮样式
import 'highlight.js/styles/github-dark.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ElementPlus)

app.mount('#app')
