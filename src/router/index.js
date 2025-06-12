import { createRouter, createWebHashHistory } from 'vue-router'
import CdkExchange from '../views/CdkExchange.vue'
import UserManagement from '../views/UserManagement.vue'
import ExchangeHistory from '../views/ExchangeHistory.vue'
import CdkAnnouncement from '../views/CdkAnnouncement.vue'

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
      component: CdkExchange
    },
    {
      path: '/user',
      name: 'user',
      component: UserManagement
    },
    {
      path: '/history',
      name: 'history',
      component: ExchangeHistory
    },
    {
      path: '/announcement',
      name: 'announcement',
      component: CdkAnnouncement
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