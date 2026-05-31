import { ElMessageBox } from 'element-plus'

export const LI_PASS_CAPTCHA_APPID = '188981228'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://nikke-cdk.hayasa.org'

const SDK_URLS = [
  { url: 'https://global.captcha.gtimg.com/TCaptcha-global.js', integrity: null },
  { url: 'https://ssl.captcha.qq.com/TCaptcha.js', integrity: null },
]

let sdkLoadPromise = null
let integrityCache = null

async function getIntegrity() {
  if (integrityCache) return integrityCache
  try {
    const res = await fetch(`${API_BASE}/api/captcha-integrity`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null
    integrityCache = await res.json()
    return integrityCache
  } catch {
    return null
  }
}

function getTencentCaptchaConstructor() {
  return typeof window !== 'undefined' && typeof window.TencentCaptcha === 'function'
    ? window.TencentCaptcha
    : null
}

function loadScript(entry) {
  const src = typeof entry === 'string' ? entry : entry.url
  const integrity = typeof entry === 'string' ? null : entry.integrity
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (getTencentCaptchaConstructor()) {
        resolve(getTencentCaptchaConstructor())
        return
      }

      existing.addEventListener('load', () => resolve(getTencentCaptchaConstructor()), {
        once: true,
      })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    if (integrity) {
      script.integrity = integrity
      script.crossOrigin = 'anonymous'
    }
    script.onload = () => resolve(getTencentCaptchaConstructor())
    script.onerror = () => reject(new Error(`加载腾讯验证码 SDK 失败: ${src}`))
    document.head.appendChild(script)
  })
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

export async function loadTencentCaptchaSdk(timeoutMs = 10000) {
  const existing = getTencentCaptchaConstructor()
  if (existing) return existing

  if (!sdkLoadPromise) {
    sdkLoadPromise = (async () => {
      const integrity = await getIntegrity()
      if (integrity) {
        SDK_URLS[0].integrity = integrity.integrity
      }

      let lastError = null
      for (const entry of SDK_URLS) {
        try {
          const Captcha = await withTimeout(loadScript(entry), timeoutMs, 'TCaptcha 加载超时')
          if (Captcha) return Captcha
        } catch (error) {
          lastError = error
        }
      }
      throw lastError || new Error('腾讯验证码 SDK 不可用')
    })().finally(() => {
      sdkLoadPromise = null
    })
  }

  return sdkLoadPromise
}

export async function getTencentCaptcha(options = {}) {
  const {
    appid = LI_PASS_CAPTCHA_APPID,
    timeoutMs = 45000,
    fallback = true,
    captchaOptions = { type: 'popup' },
  } = options

  try {
    const Captcha = await loadTencentCaptchaSdk()
    return await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('验证码弹窗超时')), timeoutMs)
      const captcha = new Captcha(
        appid,
        (res) => {
          window.clearTimeout(timer)
          resolve({ ...res, appid })
        },
        captchaOptions
      )
      captcha.show()
    })
  } catch (error) {
    if (!fallback) throw error
    return fallbackCaptchaInput(appid)
  }
}

async function fallbackCaptchaInput(appid) {
  try {
    const ticket = await ElMessageBox.prompt(
      '请在 BlablaLink 登录页完成验证码后，粘贴 Network 中 tencent_response 里的 ticket 值',
      '手动输入验证码',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: 'ticket 不能为空',
      }
    )
    const randstr = await ElMessageBox.prompt('粘贴 randstr 值', '手动输入验证码', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: 'randstr 不能为空',
    })
    return { ret: 0, ticket: ticket.value, randstr: randstr.value, appid }
  } catch {
    throw new Error('用户取消验证码输入')
  }
}
