import { ref, watchEffect } from 'vue'
import { Sunny, Moon } from '@element-plus/icons-vue'

const THEME_KEY = 'theme-preference'

// 主题状态：'light', 'dark', 'auto'
export const themeMode = ref('auto')

// 当前实际应用的主题
export const theme = ref('dark')

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'auto') {
    themeMode.value = saved
  } else {
    themeMode.value = 'auto'
  }

  // 根据模式设置实际主题
  if (themeMode.value === 'auto') {
    theme.value = getSystemTheme()
  } else {
    theme.value = themeMode.value
  }
}

// 监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (themeMode.value === 'auto') {
    theme.value = e.matches ? 'dark' : 'light'
  }
})

// 三状态循环切换：light -> dark -> auto -> light
export function toggleTheme() {
  if (themeMode.value === 'light') {
    themeMode.value = 'dark'
    theme.value = 'dark'
  } else if (themeMode.value === 'dark') {
    themeMode.value = 'auto'
    theme.value = getSystemTheme()
  } else {
    themeMode.value = 'light'
    theme.value = 'light'
  }

  localStorage.setItem(THEME_KEY, themeMode.value)
}

// 获取当前主题按钮的图标
export function getThemeIcon() {
  if (themeMode.value === 'light') return Sunny
  if (themeMode.value === 'dark') return Moon
  return 'A' // 自动模式显示 A
}

// 获取当前主题按钮的标题
export function getThemeTitle() {
  if (themeMode.value === 'light') return '当前：亮色模式'
  if (themeMode.value === 'dark') return '当前：暗色模式'
  return '当前：跟随系统'
}

// 初始化主题
getInitialTheme()

watchEffect(() => {
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
  document.documentElement.classList.toggle('light', theme.value === 'light')
}) 