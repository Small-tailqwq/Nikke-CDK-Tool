import crypto from 'node:crypto'

const LI_PASS_SIGN_KEY = 'be83e12d807ed10f5cdcb3144773ee56'
const DEFAULT_CAPTCHA_APPID = '188981228'
const LOGIN_ENDPOINT = 'https://li-sg.intlgame.com/account/login'
const AUTH_ENDPOINT = 'https://aws-na.intlgame.com/v2/auth/login'
const BL_LOGIN_ENDPOINT = 'https://api.blablalink.com/api/user/Login'

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex')
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    passwordIsMd5: false,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true
    if (arg === '--password-is-md5') args.passwordIsMd5 = true
  }

  return args
}

function buildQuery(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

function mask(value, prefix = 8, suffix = 4) {
  if (!value) return ''
  if (value.length <= prefix + suffix) return '<redacted>'
  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`
}

function parseJsonLike(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function buildLoginRequest({
  email,
  password,
  passwordIsMd5 = false,
  ticket = '',
  randstr = '',
  captchaAppId = DEFAULT_CAPTCHA_APPID,
  now = Date.now(),
}) {
  const passwordMd5 = passwordIsMd5 ? password : md5(password)
  const deviceTs = now - 2500
  const signTs = now

  const payload = {
    account: email,
    password: passwordMd5,
    account_type: 1,
    support_captcha: 1,
    machine_check_type: 3,
    tencent_response: JSON.stringify({
      appid: captchaAppId,
      ret: 0,
      ticket,
      randstr,
    }),
    device_info: {
      guest_id: crypto.randomUUID(),
      lang_type: 'en',
      app_version: 'WebWidget_1.31.0',
      screen_height: 1440,
      screen_width: 2560,
      device_brand: 'Google Inc.',
      device_model: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      network_type: '4g',
      ram_total: 70,
      rom_total: 70,
      cpu_name: 'Win32',
      android_imei: '',
      ios_idfa: '',
      page: 'https%3A%2F%2Fwww.blablalink.com%2Flogin',
      page_with_search: 'https%3A%2F%2Fwww.blablalink.com%2Flogin',
      ts: deviceTs,
    },
  }

  const body = JSON.stringify(payload)
  const sigParams = {
    account_plat_type: '131',
    app_id: '09af79d65d6e4fdf2d2569f0d365739d',
    lang_type: 'en',
    os: '3',
    sdk_version: '1.31.0',
    source: '66',
    ts: String(signTs),
  }
  const qs = buildQuery(sigParams)
  const sigInput = `/account/login?${qs}${body}${LI_PASS_SIGN_KEY}`
  const sig = md5(sigInput)

  return {
    url: `${LOGIN_ENDPOINT}?${qs}&sig=${sig}`,
    body,
    sig,
    sigInputLength: sigInput.length,
    passwordMd5,
    deviceTs,
    signTs,
    guestId: payload.device_info.guest_id,
  }
}

function buildAuthLoginRequest({ email, liLoginResult, guestId, now = Date.now() }) {
  const payload = {
    device_info: {
      guest_id: guestId || crypto.randomUUID(),
      lang_type: 'en',
      app_version: 'WebWidget_1.31.0',
      screen_height: 1440,
      screen_width: 2560,
      device_brand: 'Google Inc.',
      device_model: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      network_type: '4g',
      ram_total: 103,
      rom_total: 103,
      cpu_name: 'Win32',
      android_imei: '',
      ios_idfa: '',
      page: 'https%3A%2F%2Fwww.blablalink.com%2Flogin',
      page_with_search: 'https%3A%2F%2Fwww.blablalink.com%2Flogin',
      ts: now,
    },
    channel_dis: '00000000',
    channel_info: {
      openid: String(liLoginResult.uid),
      token: String(liLoginResult.token),
      account_plat_type: 131,
      account: email,
      account_type: 1,
      lang_type: 'en',
    },
    auto_bind_lip: 1,
  }

  const body = JSON.stringify(payload)
  const sigParams = {
    channelid: '131',
    conn: '0',
    gameid: '29080',
    os: '3',
    sdk_version: '1.31.0',
    seq: '',
    source: '66',
    ts: String(now),
  }
  const qs = buildQuery(sigParams)
  const sig = md5(`/v2/auth/login?${qs}${body}${LI_PASS_SIGN_KEY}`)

  return {
    url: `${AUTH_ENDPOINT}?${qs}&sig=${sig}`,
    body,
    sig,
  }
}

function buildGameLoginBody({ email, authData, liLoginResult }) {
  const extraJson = parseJsonLike(authData.extra_json)
  const notify = extraJson.need_notify_rsp || {}
  const status = extraJson.get_status_rsp || {}
  const channelInfo = authData.channel_info || {}

  const body = {
    game_openid: authData.openid,
    game_channelid: channelInfo.channelId || channelInfo.channel_id || 131,
    game_token: authData.token,
    game_id: '29080',
    game_expire_time:
      authData.token_expire_time ||
      channelInfo.expire_ts ||
      liLoginResult.expire ||
      Math.floor(Date.now() / 1000) + 29 * 86400,
    game_uid: notify.game_sacc_uid || authData.uid || channelInfo.openid || liLoginResult.uid,
    game_user_name: authData.user_name || email.split('@')[0],
    game_adult_status: status.adult_check_status ?? 1,
    game_email: email,
  }

  if (status.region) {
    body.game_user_region = status.region
  }

  return body
}

function getSetCookieList(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const combined = headers.get('set-cookie')
  return combined ? combined.split(/,\s*(?=[^;,]+=)/) : []
}

async function replayLogin() {
  const args = parseArgs(process.argv.slice(2))
  const email = process.env.LI_PASS_EMAIL
  const password = process.env.LI_PASS_PASSWORD
  const ticket = process.env.LI_PASS_TICKET || ''
  const randstr = process.env.LI_PASS_RANDSTR || ''
  const captchaAppId = process.env.LI_PASS_CAPTCHA_APPID || DEFAULT_CAPTCHA_APPID

  if (!email || !password) {
    console.error('Missing LI_PASS_EMAIL or LI_PASS_PASSWORD.')
    console.error('PowerShell example:')
    console.error("$env:LI_PASS_EMAIL='you@example.com'; $env:LI_PASS_PASSWORD='<password>'; node scripts/replay-login-local.mjs")
    process.exitCode = 2
    return
  }

  const request = buildLoginRequest({
    email,
    password,
    passwordIsMd5: args.passwordIsMd5,
    ticket,
    randstr,
    captchaAppId,
  })

  console.log('[replay-login] request prepared')
  console.log(JSON.stringify({
    email: mask(email, 3, 10),
    hasTicket: Boolean(ticket),
    hasRandstr: Boolean(randstr),
    captchaAppId,
    passwordMd5: mask(request.passwordMd5),
    sig: request.sig,
    sigInputLength: request.sigInputLength,
    deviceTs: request.deviceTs,
    signTs: request.signTs,
  }, null, 2))

  if (args.dryRun) {
    console.log('[replay-login] dry run complete; no network request sent')
    return
  }

  const response = await fetch(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.blablalink.com',
      'Referer': 'https://www.blablalink.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    },
    body: request.body,
  })

  const text = await response.text()
  let result
  try {
    result = JSON.parse(text)
  } catch {
    result = { raw: text.slice(0, 500) }
  }

  const safeResult = {
    httpStatus: response.status,
    ret: result.ret,
    msg: result.msg,
    is_login: result.is_login,
    uid: result.uid,
    expire: result.expire,
    token: result.token ? mask(result.token, 12, 6) : undefined,
    tokenLength: result.token ? result.token.length : 0,
    extra_json: result.extra_json,
    raw: result.raw,
  }

  console.log('[replay-login] response')
  console.log(JSON.stringify(safeResult, null, 2))

  if (result.ret === 0 && result.token) {
    console.log('[replay-login] token acquired')

    console.log('\n[replay-login] step 2: exchanging LI token for game auth token...')
    const authRequest = buildAuthLoginRequest({
      email,
      liLoginResult: result,
      guestId: request.guestId,
    })

    const authResp = await fetch(authRequest.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/login',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      },
      body: authRequest.body,
    })

    const authData = await authResp.json()
    console.log('[replay-login] auth login response:')
    console.log(JSON.stringify({
      httpStatus: authResp.status,
      ret: authData.ret,
      msg: authData.msg,
      uid: authData.uid,
      openid: authData.openid,
      user_name: authData.user_name,
      topToken: authData.token ? mask(authData.token, 16, 8) : '',
      channelToken: authData.channel_info?.token ? mask(authData.channel_info.token, 16, 8) : '',
    }, null, 2))

    if (authData.ret !== 0 || !authData.token || !authData.openid) {
      console.log('[replay-login] ❌ auth login did not return usable game token/openid')
      return
    }

    console.log('\n[replay-login] step 3: hydrating blablalink session cookies...')
    const gameRequestBody = buildGameLoginBody({ email, authData, liLoginResult: result })

    const loginResp = await fetch(BL_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/login',
        'X-Channel-Type': '2',
        'X-Language': 'en',
        'X-Common-Params': '{"game_id":"16","area_id":"global","source":"pc_web","intl_game_id":"29080","language":"en","env":"prod"}',
      },
      body: JSON.stringify(gameRequestBody),
    })

    const loginData = await loginResp.json()
    const setCookies = getSetCookieList(loginResp.headers)
    const cookieString = setCookies
      .map((cookie) => cookie.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')
    const gameTokenMatch = cookieString.match(/game_token=([^;]+)/)
    const gameOpenidMatch = cookieString.match(/game_openid=([^;]+)/)

    console.log('[replay-login] Login API response ret:', loginData?.ret ?? loginData?.code, 'hasToken:', Boolean(loginData?.token ?? loginData?.data?.token))

    if (gameTokenMatch) {
      console.log('[replay-login] ✅ game_token acquired:', mask(gameTokenMatch[1], 16, 8))
      console.log('[replay-login] ✅ game_openid:', mask(gameOpenidMatch?.[1], 8, 4) || 'N/A')
    } else if (loginData?.code === 0 && loginData?.data?.token) {
      console.log('[replay-login] ✅ game_token acquired from Login body:', mask(loginData.data.token, 16, 8))
    } else {
      console.log('[replay-login] ❌ no game_token in Login response')
      console.log('[replay-login] Set-Cookie length:', cookieString.length)
    }
  } else if (result.ret === 2170) {
    console.log('[replay-login] signature accepted; captcha ticket is required')
  }
}

await replayLogin()
