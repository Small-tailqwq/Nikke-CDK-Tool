import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/announcement'
    },
    {
      path: '/cdk',
      name: 'cdk',
      component: () => import('../views/CdkExchange.vue')
    },
    {
      path: '/user',
      name: 'user',
      component: () => import('../views/UserManagement.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/ExchangeHistory.vue')
    },
    {
      path: '/announcement',
      name: 'announcement',
      component: () => import('../views/CdkAnnouncement.vue')
    },
    {
      path: '/rainbow-doro',
      component: () => import('../views/RainbowDoro.vue'),
      meta: { hidden: true }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/About.vue')
    }
  ]
})

export default router 