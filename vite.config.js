import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import compressPlugin from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Nikke-CDK-Tool/',
  plugins: [
    vue(),
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
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          axios: ['axios']
        }
      }
    }
  }
}) 