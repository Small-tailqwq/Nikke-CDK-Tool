// PWA 安装引导：尽早捕获浏览器的 beforeinstallprompt，
// 提供统一的「安装 / 关闭(不再提示)」控制。
// 注意：iOS Safari 不派发 beforeinstallprompt，无法以编程方式安装，
// 那种情况本模块 isInstallable() 返回 false，调用方不会弹窗。

const DISMISSED_KEY = 'pwa-install-dismissed'
let deferredPrompt = null
let listenerAttached = false

const isDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

const markDismissed = () => {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // 忽略隐私模式等写入失败
  }
}

// 必须在页面加载早期调用（早于 beforeinstallprompt 派发）
export function setupInstallPrompt() {
  if (listenerAttached || typeof window === 'undefined') return
  listenerAttached = true

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    if (import.meta.env.DEV) {
      console.debug('[PWA] beforeinstallprompt 已捕获，可安装')
    }
    window.dispatchEvent(new CustomEvent('pwa-installable'))
  })

  // 已成功安装后不再提示
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    markDismissed()
  })
}

export const isInstallable = () => !!deferredPrompt && !isDismissed()

export const isInstallPromptDismissed = isDismissed

export async function installNow() {
  if (!deferredPrompt) return false
  const promptEvent = deferredPrompt
  deferredPrompt = null
  try {
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    return choice.outcome === 'accepted'
  } catch {
    return false
  }
}

export function dismissInstallPrompt() {
  markDismissed()
}
