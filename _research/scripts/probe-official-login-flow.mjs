import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const LOGIN_URL = 'https://www.blablalink.com/login'
const DEFAULT_OUTPUT = '_research/artifacts/login-flow-probe.json'

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function mask(value, prefix = 8, suffix = 4) {
  if (!value || typeof value !== 'string') return value
  if (value.length <= prefix + suffix) return '<redacted>'
  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`
}

function sanitizeText(value) {
  if (!value || typeof value !== 'string') return value
  let text = value
  text = text.replace(/("token"\s*:\s*")([^"]+)(")/gi, (_, a, b, c) => `${a}${mask(b, 10, 6)}${c}`)
  text = text.replace(/("game_token"\s*:\s*")([^"]+)(")/gi, (_, a, b, c) => `${a}${mask(b, 10, 6)}${c}`)
  text = text.replace(/("ticket"\s*:\s*")([^"]+)(")/gi, (_, a, b, c) => `${a}${mask(b, 10, 6)}${c}`)
  text = text.replace(/("password"\s*:\s*")([^"]+)(")/gi, (_, a, b, c) => `${a}${mask(b, 4, 4)}${c}`)
  text = text.replace(/(\\"token\\"\s*:\s*\\")([^"\\]+)(\\")/gi, (_, a, b, c) => `${a}${mask(b, 10, 6)}${c}`)
  text = text.replace(/(\\"game_token\\"\s*:\s*\\")([^"\\]+)(\\")/gi, (_, a, b, c) => `${a}${mask(b, 10, 6)}${c}`)
  text = text.replace(/(\\"ticket\\"\s*:\s*\\")([^"\\]+)(\\")/gi, (_, a, b, c) => `${a}${mask(b, 10, 6)}${c}`)
  text = text.replace(/(\\"password\\"\s*:\s*\\")([^"\\]+)(\\")/gi, (_, a, b, c) => `${a}${mask(b, 4, 4)}${c}`)
  text = text.replace(/(game_token=)([^;&\s]+)/gi, (_, a, b) => `${a}${mask(b, 10, 6)}`)
  text = text.replace(/(token=)([^;&\s]+)/gi, (_, a, b) => `${a}${mask(b, 10, 6)}`)
  text = text.replace(/(ticket=)([^;&\s]+)/gi, (_, a, b) => `${a}${mask(b, 10, 6)}`)
  text = text.replace(/(password=)([^;&\s]+)/gi, (_, a, b) => `${a}${mask(b, 4, 4)}`)
  text = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)/g, (_, a, b) => `${a.slice(0, 3)}***@${b}`)
  return text
}

function tryParseJson(text) {
  if (!text || typeof text !== 'string') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function summarizeJson(data) {
  if (!data || typeof data !== 'object') return null
  const channelInfo = data.channel_info || data.channelInfo || {}
  let extra = data.extra_json || {}
  if (typeof extra === 'string') {
    try {
      extra = JSON.parse(extra)
    } catch {
      extra = {}
    }
  }
  const notify = extra.need_notify_rsp || {}
  const status = extra.get_status_rsp || {}
  return {
    code: data.code,
    ret: data.ret,
    msg: data.msg,
    is_login: data.is_login,
    uid: data.uid ? mask(String(data.uid), 4, 4) : undefined,
    user_name: data.user_name ? data.user_name.slice(0, 3) + '***' : undefined,
    hasToken: Boolean(data.token || data.data?.token),
    channelId: channelInfo.channelId || channelInfo.channel_id || data.channelid || data.channel_id,
    hasChannelToken: Boolean(channelInfo.token),
    notifyKeys: Object.keys(notify),
    statusKeys: Object.keys(status),
    dataKeys: data.data && typeof data.data === 'object' ? Object.keys(data.data).slice(0, 20) : undefined,
  }
}

function interestingUrl(url) {
  return /intlgame\.com|blablalink\.com|playerinfinite\.com/i.test(url)
}

const email = process.env.LI_PASS_EMAIL || getArg('email')
const password = process.env.LI_PASS_PASSWORD || getArg('password')
const output = getArg('output', DEFAULT_OUTPUT)
const waitMs = Number(getArg('wait-ms', '180000'))
const mode = getArg(
  'mode',
  process.argv.includes('--manual') ? 'manual' : process.argv.includes('--sdk') ? 'sdk' : 'ui'
)
const region = getArg('region')

if (!email || !password) {
  console.error('Missing credentials. Set LI_PASS_EMAIL and LI_PASS_PASSWORD, or pass --email/--password.')
  process.exit(2)
}

const events = []
const responses = []
const storageEvents = []

await fs.mkdir(path.dirname(output), { recursive: true })

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: { width: 1280, height: 900 },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1280,900',
  ],
})

const page = await browser.newPage()
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
)
await page.setExtraHTTPHeaders({
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
})

await page.exposeFunction('__probeStorageEvent', (event) => {
  const sanitized = sanitizeText(String(event.value || '').slice(0, 1000))
  storageEvents.push({
    type: event.type,
    key: event.key,
    value: sanitized,
    href: event.href,
  })
})

await page.evaluateOnNewDocument(() => {
  const safeSend = (event) => {
    try {
      window.__probeStorageEvent && window.__probeStorageEvent(event)
    } catch {}
  }

  const origSetItem = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    if (String(key).includes('lip') || String(key).includes('game') || String(key).includes('pass')) {
      safeSend({
        type: this === window.sessionStorage ? 'sessionStorage.setItem' : 'localStorage.setItem',
        key: String(key),
        value: String(value),
        href: location.href,
      })
    }
    return origSetItem.apply(this, arguments)
  }

  const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
  if (cookieDescriptor && cookieDescriptor.set) {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      enumerable: true,
      get() {
        return cookieDescriptor.get.call(document)
      },
      set(value) {
        safeSend({ type: 'document.cookie.set', key: String(value).split('=')[0], value: String(value), href: location.href })
        return cookieDescriptor.set.call(document, value)
      },
    })
  }
})

page.on('request', (request) => {
  const url = request.url()
  if (!interestingUrl(url)) return
  const postData = request.postData()
  events.push({
    type: 'request',
    method: request.method(),
    url: sanitizeText(url),
    postDataPreview: sanitizeText(postData ? postData.slice(0, 1500) : ''),
  })
})

page.on('response', async (response) => {
  const url = response.url()
  if (!interestingUrl(url)) return

  const headers = response.headers()
  const contentType = headers['content-type'] || ''
  const record = {
    type: 'response',
    status: response.status(),
    url: sanitizeText(url),
    setCookieKeys: (headers['set-cookie'] || '')
      .split(/,\s*(?=[^;,]+=)/)
      .map((c) => c.split('=')[0]?.trim())
      .filter(Boolean),
  }

  if (/json|text|javascript/i.test(contentType)) {
    try {
      const text = await response.text()
      record.bodyPreview = sanitizeText(text.slice(0, 1800))
      record.summary = summarizeJson(tryParseJson(text))
    } catch (error) {
      record.bodyError = error.message
    }
  }
  responses.push(record)
})

page.on('console', (message) => {
  const text = message.text()
  if (/pass|login|auth|token|openid|channel/i.test(text)) {
    events.push({
      type: 'console',
      level: message.type(),
      text: sanitizeText(text.slice(0, 1000)),
    })
  }
})

async function clickText(text, { exact = true } = {}) {
  return page.evaluate(
    ({ wanted, exactMatch }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim()
      const matches = (value) => {
        const normalized = normalize(value)
        return exactMatch ? normalized === wanted : normalized.includes(wanted)
      }
      const isVisible = (element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
      }
      const elements = Array.from(document.querySelectorAll('button, [role="button"], a, label, span, div'))
      const target = elements.find((element) => isVisible(element) && matches(element.innerText || element.textContent))
      if (!target) return false
      target.click()
      return true
    },
    { wanted: text, exactMatch: exact }
  )
}

async function clickCookieConsent() {
  const selectors = [
    '#onetrust-accept-btn-handler',
    'button[aria-label="Accept all optional cookies"]',
    'button[aria-label="Accept All Cookies"]',
  ]
  for (const selector of selectors) {
    const button = await page.$(selector)
    if (!button) continue
    const visible = await button.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    if (visible) {
      await button.click()
      return true
    }
  }
  return clickText('Accept all optional cookies', { exact: false })
}

async function maybeAcceptRequiredAgreement() {
  return page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
    }
    const words = ['agree', 'privacy', 'terms', 'user agreement', 'read and agree']
    const labels = Array.from(document.querySelectorAll('label, .infinite-checkbox-wrapper, .ant-checkbox-wrapper'))
    for (const label of labels) {
      const text = String(label.innerText || label.textContent || '').toLowerCase()
      if (!isVisible(label) || !words.some((word) => text.includes(word))) continue
      const input = label.querySelector('input[type="checkbox"]')
      if (input && !input.checked) {
        label.click()
        return true
      }
    }
    return false
  })
}

async function runUiLogin() {
  console.log('[probe] using official UI login flow.')
  await clickCookieConsent().catch(() => false)
  if (region) {
    const clickedRegion = await clickText(region, { exact: true }).catch(() => false)
    console.log('[probe] region click:', region, clickedRegion ? 'ok' : 'not found')
    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  const accountInput = await page.waitForSelector('#loginPwdForm_account', { visible: true, timeout: 30000 })
  const formHandle = await accountInput.evaluateHandle((element) => element.closest('form'))
  const form = formHandle.asElement()
  if (!form) throw new Error('Could not resolve visible login password form')
  const passwordInput = await form.$('#loginPwdForm_password')
  const submitButton = await form.$('button[type="submit"], button[name="confirm"]')
  if (!passwordInput || !submitButton) {
    throw new Error('Could not resolve visible login form controls')
  }

  await page.evaluate(
    (loginForm, values) => {
      const setInputValue = (input, value) => {
        input.focus()
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
        if (setter) {
          setter.call(input, value)
        } else {
          input.value = value
        }
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        input.blur()
      }
      setInputValue(loginForm.querySelector('#loginPwdForm_account'), values.email)
      setInputValue(loginForm.querySelector('#loginPwdForm_password'), values.password)
    },
    form,
    { email, password }
  )
  await maybeAcceptRequiredAgreement().catch(() => false)

  const beforeSubmit = await page.evaluate((loginForm) => {
    const button = loginForm.querySelector('button[type="submit"], button[name="confirm"]')
    const account = loginForm.querySelector('#loginPwdForm_account')
    const passwordInput = loginForm.querySelector('#loginPwdForm_password')
    return {
      accountValue: account?.value || '',
      passwordLength: passwordInput?.value?.length || 0,
      buttonText: button?.innerText?.replace(/\s+/g, ' ').trim() || '',
      buttonDisabled: Boolean(button?.disabled || button?.getAttribute('aria-disabled') === 'true'),
    }
  }, form)
  console.log('[probe] form state before submit:', JSON.stringify({
    accountValue: sanitizeText(beforeSubmit.accountValue),
    passwordLength: beforeSubmit.passwordLength,
    buttonText: beforeSubmit.buttonText,
    buttonDisabled: beforeSubmit.buttonDisabled,
  }))
  await submitButton.click()
  await new Promise((resolve) => setTimeout(resolve, 3000))
  const afterSubmit = await page.evaluate(() => {
    const text = Array.from(document.querySelectorAll('body *'))
      .filter((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .map((element) => element.innerText || element.textContent || '')
      .join('\n')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
    return text.slice(0, 1500)
  })
  console.log('[probe] visible text after submit:', sanitizeText(afterSubmit))
  console.log('[probe] clicked Log in. If TencentCaptcha appears, solve it in the Chromium window.')
}

console.log('[probe] opening official login page...')
await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 })

if (mode === 'sdk') {
  console.log('[probe] starting SDK signIn. If TencentCaptcha appears, solve it in the Chromium window.')
  await page.waitForFunction(() => window.PassFactory && window.PassFactory.Pass, { timeout: 30000 })
  await page.evaluate(
    async ({ email: account, password: pwd }) => {
      const Pass = window.PassFactory.Pass
      const pass = new Pass({
        appID: '09af79d65d6e4fdf2d2569f0d365739d',
        gameID: '29080',
        accountPlatType: 131,
        langType: 'en',
        scene: 'LI_PASS_COMPONENT',
        appVersion: 'WebWidget_1.31.0',
        hostCAcc: 'https://li-sg.intlgame.com',
        captchaOption: { enableNonPerception: true },
        source: 66,
        config: { isMobile: false },
      })
      window.__probePass = pass
      const auth = await pass.getAuthClient()
      window.__probeAuth = auth
      window.__probeSignInPromise = auth
        .signIn({ account, password: pwd, account_type: 1 })
        .then((result) => {
          window.__probeSignInResult = result
          return result
        })
        .catch((error) => {
          window.__probeSignInError = {
            message: error && error.message,
            ret: error && error.ret,
            msg: error && error.msg,
          }
          throw error
        })
    },
    { email, password }
  )
} else if (mode === 'ui') {
  await runUiLogin()
} else {
  console.log('[probe] manual mode: please log in in the Chromium window.')
}

const deadline = Date.now() + waitMs
let finalState = null
while (Date.now() < deadline) {
  finalState = await page.evaluate(() => {
    const lipRaw = localStorage.getItem('lip-user-info')
    let lip = null
    try {
      lip = lipRaw ? JSON.parse(lipRaw) : null
    } catch {}
    return {
      href: location.href,
      hasLipUserInfo: Boolean(lip),
      lipKeys: lip ? Object.keys(lip) : [],
      topOpenid: lip && lip.openid,
      uid: lip && lip.uid,
      userName: lip && lip.user_name,
      channelId: lip && lip.channel_info && (lip.channel_info.channelId || lip.channel_info.channel_id),
      channelOpenid: lip && lip.channel_info && lip.channel_info.openid,
      hasChannelToken: Boolean(lip && lip.channel_info && lip.channel_info.token),
      hasTopToken: Boolean(lip && lip.token),
      cookie: document.cookie,
      signInDone: Boolean(window.__probeSignInResult || window.__probeSignInError),
      signInSummary: window.__probeSignInResult
        ? {
            ret: window.__probeSignInResult.ret,
            msg: window.__probeSignInResult.msg,
            uid: window.__probeSignInResult.uid,
            is_login: window.__probeSignInResult.is_login,
            hasToken: Boolean(window.__probeSignInResult.token),
          }
        : null,
      signInError: window.__probeSignInError || null,
    }
  })

  if (finalState?.hasChannelToken || finalState?.cookie?.includes('game_token=')) break
  await new Promise((resolve) => setTimeout(resolve, 1500))
}

const browserCookies = (await page.cookies(
  'https://www.blablalink.com',
  'https://api.blablalink.com',
  'https://li-sg.intlgame.com',
  'https://aws-na.intlgame.com'
))
  .filter((cookie) => /game|lip|token|openid|uid|pass|account/i.test(`${cookie.name} ${cookie.domain}`))
  .map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    valuePreview: sanitizeText(cookie.value),
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }))

const result = {
  capturedAt: new Date().toISOString(),
  mode,
  finalState: {
    ...finalState,
    cookie: sanitizeText(finalState?.cookie || ''),
  },
  browserCookies,
  storageEvents,
  requests: events,
  responses,
}

await fs.writeFile(output, JSON.stringify(result, null, 2), 'utf8')

console.log('[probe] wrote', output)
console.log('[probe] final state:', JSON.stringify({
  href: finalState?.href,
  hasLipUserInfo: finalState?.hasLipUserInfo,
  topOpenid: finalState?.topOpenid ? mask(String(finalState.topOpenid), 4, 4) : undefined,
  uid: finalState?.uid ? mask(String(finalState.uid), 4, 4) : undefined,
  userName: finalState?.userName ? finalState.userName.slice(0, 3) + '***' : undefined,
  channelId: finalState?.channelId,
  hasChannelToken: finalState?.hasChannelToken,
  hasGameCookie: Boolean(finalState?.cookie?.includes('game_token=')),
  signInError: finalState?.signInError,
}, null, 2))

await browser.close()
