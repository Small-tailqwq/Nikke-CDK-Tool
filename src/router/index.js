import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/announcement'
    },
    {
      path: '/helper/bookmarklet',
      name: 'bookmarklet',
      component: () => import('../views/Bookmarklet.vue'),
      meta: { hidden: true }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/CallbackAuth.vue'),
      meta: { hidden: true }
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
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/CdkAdmin.vue'),
      meta: { hidden: true },
      beforeEnter: () => {
        if (!import.meta.env.DEV) {
          return { path: '/' }
        }
      }
    }
  ]
})

export default router 