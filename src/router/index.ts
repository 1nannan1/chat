import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/chat',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/register/index.vue'),
    },
    {
      path: '/',
      component: () => import('@/layout/MainLayout.vue'),
      children: [
        {
          path: 'chat',
          name: 'chat',
          component: () => import('@/views/chat/index.vue'),
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/history/index.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/profile/index.vue'),
        },
      ],
    },
  ],
})

export default router
