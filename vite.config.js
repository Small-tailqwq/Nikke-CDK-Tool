import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import compressPlugin from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'
import cdkAdminPlugin from './scripts/vite-plugin-cdk-admin.mjs'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Nikke-CDK-Tool/',
  plugins: [
    vue(),
    // 本地 CDK 管理后台的读写接口（仅 dev 生效）
    cdkAdminPlugin(),
    // Auto import Element Plus APIs & components on demand
    AutoImport({
      dts: 'src/auto-imports.d.ts',
      imports: ['vue', 'vue-router'],
      resolvers: [ElementPlusResolver()],
      vueTemplate: true,
    }),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [
        ElementPlusResolver({ importStyle: 'css' }), // auto import CSS for used components
      ],
    }),
    // Pre-compress assets for static hosting (gzip + brotli)
    compressPlugin({ algorithm: 'gzip' }),
    compressPlugin({ algorithm: 'brotliCompress', ext: '.br' }),
    // PWA：可安装为独立应用（移动端/桌面），与 base 路径一致
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // 开发模式也注册 Service Worker，否则站点不满足“可安装”条件，
      // Chrome 不会派发 beforeinstallprompt，安装引导弹窗永不出现
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'NIKKE CDK Tools',
        short_name: 'NIKKE CDK',
        description: 'NIKKE CDK 兑换与 BlaBla 每日任务工具',
        lang: 'zh-CN',
        theme_color: '#141414',
        background_color: '#141414',
        display: 'standalone',
        orientation: 'portrait',
        // 相对路径：dev 解析为 /，生产解析为 /Nikke-CDK-Tool/
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,png,woff2}'],
        // 公告大图不预缓存（体积大），通过运行时按需缓存
        globIgnores: ['**/announcement-images/**', 'icons/*.png'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // 谷歌字体：可离线复用
            urlPattern: ({ url }) =>
              url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true
  },
  json: {
    stringify: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        charset: false
      }
    }
  },
  build: {
    cssCodeSplit: true,
    cssMinify: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/vue/') ||
            id.includes('/node_modules/vue-router/') ||
            id.includes('/node_modules/pinia/')
          ) {
            return 'vue'
          }
          if (
            id.includes('/node_modules/element-plus/') ||
            id.includes('/node_modules/@element-plus/icons-vue/')
          ) {
            return 'element-plus'
          }
          if (id.includes('/node_modules/axios/')) {
            return 'axios'
          }
          return undefined
        },
      },
    },
  },
})
