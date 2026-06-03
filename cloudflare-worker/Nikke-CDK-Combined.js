// 🌍🇨🇳 NIKKE CDK工具 - 统一Cloudflare Worker
// 同时支持国际服和国服CDK兑换功能
// 生产环境版本 - 已移除调试日志和隐私输出

// ==================== 加密工具 ====================
/**
 * 使用三重密钥（SID + Token + Salt）对 Cookie 进行强加密
 * 
 * 安全特性：
 * - 使用 PBKDF2 密钥派生函数（100000次迭代）
 * - 三重密钥材料：SID（会话）+ Token（一次性）+ Salt（随机）
 * - AES-GCM 256位加密
 * - 每次加密使用不同的盐和IV
 * 
 * 攻击者需要同时获得：
 * 1. Token（仅在URL中传输5分钟）
 * 2. 加密响应包（HTTPS传输）
 * 3. SID（在响应中）
 * 4. Salt（在响应中）
 * 5. 且必须在5分钟内破解
 */
async function encryptCookieDataWithTripleKey(cookieString, sid, token) {
  const encoder = new TextEncoder()

  // 生成随机盐（16字节）
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // 组合 SID 和 Token 作为密码材料
  const password = encoder.encode(`${sid}:${token}`)

  // 导入密码材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    password,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  // 使用 PBKDF2 派生强密钥
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,  // 10万次迭代
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // 生成随机 IV（12字节）
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 加密数据
  const data = encoder.encode(cookieString)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  // 数据结构: [Salt(16字节)] + [IV(12字节)] + [加密数据]
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * 使用单一密钥（SID）对 Cookie 进行加密
 * @deprecated 仅用于向后兼容，新代码应使用 encryptCookieDataWithTripleKey
 */
async function encryptCookieDataLegacy(cookieString, sid) {
  // 使用 SID 派生密钥
  const encoder = new TextEncoder()
  const keyData = encoder.encode(sid.padEnd(32, '0').substring(0, 32))

  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // 生成随机 IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 加密数据
  const data = encoder.encode(cookieString)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  // 返回 IV + 加密数据（Base64）
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * 🔐 统一加密入口函数
 * 根据参数智能选择加密方式
 * 
 * @param {string} cookieString - 要加密的 Cookie 字符串
 * @param {string} sid - 会话 ID
 * @param {string} [token] - 可选的一次性令牌（用于三重加密）
 * @returns {Promise<string>} Base64 编码的加密数据
 */
async function encryptCookieData(cookieString, sid, token = null) {
  if (token) {
    // 如果提供了 token，使用三重加密（更安全）
    return await encryptCookieDataWithTripleKey(cookieString, sid, token)
  } else {
    // 否则使用旧版单密钥加密（向后兼容）
    return await encryptCookieDataLegacy(cookieString, sid)
  }
}

/**
 * 纯 JS MD5 实现 - 适用于 Cloudflare Workers 运行时
 */
function md5(s) {
  var hex_chr = '0123456789abcdef'
  function rhex(n) { var s = '', j; for (j = 0; j < 4; j++) s += hex_chr.charAt((n >>> (j * 8 + 4)) & 0xF) + hex_chr.charAt((n >>> (j * 8)) & 0xF); return s }
  s = unescape(encodeURIComponent(s))
  var n = s.length, x = [], i, olda, oldb, oldc, oldd
  for (i = 0; i < n; i++) x[i>>2] |= s.charCodeAt(i) << ((i % 4) * 8)
  x[i>>2] |= 0x80 << ((i % 4) * 8)
  while ((x.length % 16) !== 14) x.push(0)
  x[x.length] = n * 8; x[x.length] = 0
  var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
  function A32(x, y) { return (x + y) & 0xFFFFFFFF }
  function RL(n, c) { return (n << c) | (n >>> (32 - c)) }
  function CMN(q, a, b, x, s, t) { return A32(RL(A32(A32(a, q), A32(x, t)), s), b) }
  function F(a, b, c, d, x, s, t) { return CMN((b & c) | ((~b) & d), a, b, x, s, t) }
  function G(a, b, c, d, x, s, t) { return CMN((b & d) | (c & (~d)), a, b, x, s, t) }
  function H(a, b, c, d, x, s, t) { return CMN(b ^ c ^ d, a, b, x, s, t) }
  function I(a, b, c, d, x, s, t) { return CMN(c ^ (b | (~d)), a, b, x, s, t) }
  for (i = 0; i < x.length; i += 16) {
    olda = a; oldb = b; oldc = c; oldd = d
    a=F(a,b,c,d,x[i+0],7,-680876936);d=F(d,a,b,c,x[i+1],12,-389564586);c=F(c,d,a,b,x[i+2],17,606105819);b=F(b,c,d,a,x[i+3],22,-1044525330)
    a=F(a,b,c,d,x[i+4],7,-176418897);d=F(d,a,b,c,x[i+5],12,1200080426);c=F(c,d,a,b,x[i+6],17,-1473231341);b=F(b,c,d,a,x[i+7],22,-45705983)
    a=F(a,b,c,d,x[i+8],7,1770035416);d=F(d,a,b,c,x[i+9],12,-1958414417);c=F(c,d,a,b,x[i+10],17,-42063);b=F(b,c,d,a,x[i+11],22,-1990404162)
    a=F(a,b,c,d,x[i+12],7,1804603682);d=F(d,a,b,c,x[i+13],12,-40341101);c=F(c,d,a,b,x[i+14],17,-1502002290);b=F(b,c,d,a,x[i+15],22,1236535329)
    a=G(a,b,c,d,x[i+1],5,-165796510);d=G(d,a,b,c,x[i+6],9,-1069501632);c=G(c,d,a,b,x[i+11],14,643717713);b=G(b,c,d,a,x[i+0],20,-373897302)
    a=G(a,b,c,d,x[i+5],5,-701558691);d=G(d,a,b,c,x[i+10],9,38016083);c=G(c,d,a,b,x[i+15],14,-660478335);b=G(b,c,d,a,x[i+4],20,-405537848)
    a=G(a,b,c,d,x[i+9],5,568446438);d=G(d,a,b,c,x[i+14],9,-1019803690);c=G(c,d,a,b,x[i+3],14,-187363961);b=G(b,c,d,a,x[i+8],20,1163531501)
    a=G(a,b,c,d,x[i+13],5,-1444681467);d=G(d,a,b,c,x[i+2],9,-51403784);c=G(c,d,a,b,x[i+7],14,1735328473);b=G(b,c,d,a,x[i+12],20,-1926607734)
    a=H(a,b,c,d,x[i+5],4,-378558);d=H(d,a,b,c,x[i+8],11,-2022574463);c=H(c,d,a,b,x[i+11],16,1839030562);b=H(b,c,d,a,x[i+14],23,-35309556)
    a=H(a,b,c,d,x[i+1],4,-1530992060);d=H(d,a,b,c,x[i+4],11,1272893353);c=H(c,d,a,b,x[i+7],16,-155497632);b=H(b,c,d,a,x[i+10],23,-1094730640)
    a=H(a,b,c,d,x[i+13],4,681279174);d=H(d,a,b,c,x[i+0],11,-358537222);c=H(c,d,a,b,x[i+3],16,-722521979);b=H(b,c,d,a,x[i+6],23,76029189)
    a=H(a,b,c,d,x[i+9],4,-640364487);d=H(d,a,b,c,x[i+12],11,-421815835);c=H(c,d,a,b,x[i+15],16,530742520);b=H(b,c,d,a,x[i+2],23,-995338651)
    a=I(a,b,c,d,x[i+0],6,-198630844);d=I(d,a,b,c,x[i+7],10,1126891415);c=I(c,d,a,b,x[i+14],15,-1416354905);b=I(b,c,d,a,x[i+5],21,-57434055)
    a=I(a,b,c,d,x[i+12],6,1700485571);d=I(d,a,b,c,x[i+3],10,-1894986606);c=I(c,d,a,b,x[i+10],15,-1051523);b=I(b,c,d,a,x[i+1],21,-2054922799)
    a=I(a,b,c,d,x[i+8],6,1873313359);d=I(d,a,b,c,x[i+15],10,-30611744);c=I(c,d,a,b,x[i+6],15,-1560198380);b=I(b,c,d,a,x[i+13],21,1309151649)
    a=I(a,b,c,d,x[i+4],6,-145523070);d=I(d,a,b,c,x[i+11],10,-1120210379);c=I(c,d,a,b,x[i+2],15,718787259);b=I(b,c,d,a,x[i+9],21,-343485551)
    a=A32(a,olda);b=A32(b,oldb);c=A32(c,oldc);d=A32(d,oldd)
  }
  return rhex(a) + rhex(b) + rhex(c) + rhex(d)
}

function maskSecret(value, visible = 4) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= visible * 2) return '<redacted>'
  return `${text.slice(0, visible)}...${text.slice(-visible)}`
}

function maskCookieString(cookieString) {
  if (!cookieString) return ''
  return cookieString.split(';').map((segment) => {
    const [key, ...rest] = segment.trim().split('=')
    if (!key) return ''
    const value = rest.join('=')
    return `${key}=${maskSecret(value)}`
  }).filter(Boolean).join('; ')
}

function sanitizeSensitiveText(text) {
  if (!text) return ''
  return String(text)
    .replace(/("(?:token|game_token|utoken|password|ticket|randstr|cookie)"\s*:\s*")([^"]*)(")/gi, '$1<redacted>$3')
    .replace(/((?:token|game_token|utoken|password|ticket|randstr|cookie)=)([^&;\s"]+)/gi, '$1<redacted>')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 从 Response 中提取所有 Set-Cookie 头
 */
function extractSetCookiesHeaders(response) {
  const headers = response.headers
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const cookies = []
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') cookies.push(value)
  })
  return cookies
}

/**
 * 从 Set-Cookie 头数组拼接出 cookie 字符串（仅 name=value 部分）
 */
function buildCookieStringFromSetCookies(setCookies) {
  return setCookies.map(sc => sc.split(';')[0]).join('; ')
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

function buildCookieStringFromLoginResult(result, email = '') {
  const extraJson = parseJsonLike(result.extra_json)
  const notify = extraJson.need_notify_rsp || {}
  const channelInfo = result.channel_info || result.channelInfo || {}
  const token = isLikelyGameToken(result.token)
    ? result.token
    : isLikelyGameToken(channelInfo.token) ? channelInfo.token : ''
  const uid = notify.game_sacc_uid || notify.li_uid || result.uid || channelInfo.openid || ''
  const openid = result.openid || notify.game_sacc_openid || notify.game_openid || notify.sacc_openid || channelInfo.openid || uid
  const channelId =
    channelInfo.channelId ||
    channelInfo.channel_id ||
    result.channelid ||
    result.channel_id ||
    '131'
  const userName =
    result.user_name ||
    result.nickname ||
    channelInfo.account ||
    (email ? String(email).split('@')[0] : '')

  const pairs = [
    ['game_adult_status', '1'],
    ['game_channelid', channelId],
    ['game_gameid', '29080'],
    ['game_login_game', '0'],
    ['game_openid', openid],
    ['game_token', token],
    ['game_uid', uid],
    ['game_user_name', userName]
  ].filter(([, value]) => value !== undefined && value !== null && String(value) !== '')

  return pairs.map(([key, value]) => `${key}=${String(value)}`).join('; ')
}

function isLikelyGameToken(value) {
  return typeof value === 'string' && /^[a-f0-9]{32,64}$/i.test(value)
}

function getCookieValue(cookieString, key) {
  if (!cookieString || !key) return ''
  const pattern = new RegExp(`(?:^|;\\s*)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`)
  return cookieString.match(pattern)?.[1] || ''
}

function isCdkCookieUsable(cookieString) {
  return Boolean(
    isLikelyGameToken(getCookieValue(cookieString, 'game_token')) &&
    getCookieValue(cookieString, 'game_openid') &&
    getCookieValue(cookieString, 'game_uid') &&
    getCookieValue(cookieString, 'game_channelid')
  )
}

function mergeLiPassUserInfo(loginResult, userInfoResult) {
  if (!userInfoResult || userInfoResult.ret !== 0) return loginResult

  const loginExtra = parseJsonLike(loginResult.extra_json)
  const userInfoExtra = parseJsonLike(userInfoResult.extra_json)

  return {
    ...loginResult,
    ...userInfoResult,
    uid: userInfoResult.uid || loginResult.uid,
    token: userInfoResult.token || loginResult.token,
    channel_info: {
      ...(loginResult.channel_info || loginResult.channelInfo || {}),
      ...(userInfoResult.channel_info || userInfoResult.channelInfo || {})
    },
    extra_json: {
      ...loginExtra,
      ...userInfoExtra
    }
  }
}

function summarizeLiPassResult(result) {
  if (!result) return null
  const channelInfo = result.channel_info || result.channelInfo || {}
  const extraJson = parseJsonLike(result.extra_json)
  const notify = extraJson.need_notify_rsp || {}
  const keys = Object.keys(result)
  return {
    ret: result.ret,
    msg: result.msg,
    is_login: result.is_login,
    uid: result.uid || '',
    openidPresent: Boolean(result.openid),
    topKeys: keys.filter(k => !['extra_json'].includes(k)).join(','),
    channelInfoKeys: Object.keys(channelInfo).join(','),
    hasOpenidField: Boolean(result.openid !== undefined),
    openidValue: result.openid || '(not set)',
    channelInfoOpenid: channelInfo.openid || '(not set)',
    userName: result.user_name || result.nickname || '',
    channelId: channelInfo.channelId || channelInfo.channel_id || '',
    hasLiToken: Boolean(result.token),
    hasChannelToken: Boolean(channelInfo.token),
    hasUsableGameToken: isLikelyGameToken(result.token) || isLikelyGameToken(channelInfo.token),
    notifyKeys: Object.keys(notify),
    notify_game_sacc_openid: notify.game_sacc_openid || '(not set)',
    notify_game_openid: notify.game_openid || '(not set)',
    notify_sacc_openid: notify.sacc_openid || '(not set)',
  }
}

// 国际服固定请求头
const GLOBAL_HEADERS = {
  'x-channel-type': '2',
  'x-language': 'en',
  'x-common-params': '{"game_id":"16","area_id":"global","source":"pc_web","intl_game_id":"29080","language":"en","env":"prod"}'
}

const BLA_HEADERS = {
  'x-channel-type': '2',
  'x-language': 'zh-TW',
  'x-common-params': '{"game_id":"16","area_id":"global","source":"pc_web","intl_game_id":"29080","language":"zh-TW","env":"prod"}'
}

// 会话镜像反代所需的目标映射
const SESSION_TARGETS = {
  site: 'https://www.blablalink.com',
  api: 'https://api.blablalink.com',
  auth: 'https://aws-na.intlgame.com',
  account: 'https://li-sg.intlgame.com',
  passport: 'https://pass.blablalink.com',
  sdk: 'https://common-web.intlgame.com',
  static: 'https://static.blablalink.com',
  img: 'https://img.blablalink.com',
  community: 'https://t-sg-community.playerinfinite.com',
  report: 'https://na-report.playerinfinite.com',
  lipcommunity: 'https://sg-lipcommunity.playerinfinite.com',
  rum: 'https://rumt-sg.com',
  onetrust: 'https://geolocation.onetrust.com'
}

// 上游域名到会话key的反向映射（用于文本替换）
const SESSION_HOST_TO_KEY = {
  'www.blablalink.com': 'site',
  'api.blablalink.com': 'api',
  'aws-na.intlgame.com': 'auth',
  'li-sg.intlgame.com': 'account',
  'common-web.intlgame.com': 'sdk',
  'static.blablalink.com': 'static',
  'img.blablalink.com': 'img',
  'passport.blablalink.com': 'passport',
  't-sg-community.playerinfinite.com': 'community',
  'na-report.playerinfinite.com': 'report',
  'sg-lipcommunity.playerinfinite.com': 'lipcommunity',
  'rumt-sg.com': 'rum',
  'geolocation.onetrust.com': 'onetrust'
}

// 将会话路径折叠为规范形态，避免重复段导致 404
function normalizeSessionPath(path) {
  const match = path.match(/^\/sess\/([^/]+)\/x\/(.+)$/)
  if (!match) return path

  const sid = match[1]
  let rest = match[2]

  // 折叠开头重复段：/x/api/api/... -> /x/api/...
  rest = rest.replace(/^(api|site|sdk|auth|account|ugc|game|community)\/(?:\1\/)+/i, '$1/')

  // 折叠中间重复段，防止多次拼接
  rest = rest.replace(/\/(api|site|sdk|auth|account|ugc|game|community)\/(?:\1\/)+/ig, '/$1/')

  // 去掉残留的 api/api/
  rest = rest.replace(/^api\/api\//i, 'api/')

  // 根相对 system/* 请求收编到 site
  rest = rest.replace(/^system\//i, 'site/system/')

  return `/sess/${sid}/x/${rest}`
}

const TEXT_BODY_REGEX = /^(text|application)\/(html|json|javascript|xml|xhtml|css)/i

const SESSION_CLIENT_REWRITE_SCRIPT = (sid) => {
  const mapEntries = Object.entries(SESSION_HOST_TO_KEY)
    .map(([host, key]) => `    '${host}': '${key}'`)
    .join(',\n')

  const prefixes = `/sess/${sid}/x/`
  return `<script>(()=>{const hostMap={\n${mapEntries}\n  };const build=(url)=>{try{const u=new URL(url,window.location.href);
// 1. 检查是否已经是会话内路径
if(u.pathname.startsWith('/sess/${sid}/'))return null;
// 2. 同源判断和协议过滤
if(u.origin===location.origin&&(u.protocol==='http:'||u.protocol==='https:')){
// 跳过特殊协议
if(u.protocol.startsWith('data:')||u.protocol.startsWith('blob:')||u.protocol.startsWith('about:')||u.protocol.startsWith('mailto:')||u.protocol.startsWith('javascript:'))return null;
// 同源相对路径映射 - 关键修复：去掉前缀而不是保留整个路径
const pathPrefixMap={'/api/':'api','/passport/':'passport','/auth/':'auth','/sdk/':'sdk','/rum/':'rum','/report/':'report','/lipcommunity/':'lipcommunity','/onetrust/':'onetrust','/community/':'community','/system/':'site'};
for(const[prefix,targetKey]of Object.entries(pathPrefixMap)){if(u.pathname.startsWith(prefix)){const pathWithoutPrefix=u.pathname.substring(prefix.length-1);const search=u.search||'';return '${prefixes}'+targetKey+pathWithoutPrefix+search;}}}
// 3. 域名→key映射
const key=hostMap[u.hostname];if(!key)return null;const path=u.pathname.startsWith('/')?u.pathname:'/'+u.pathname;const search=u.search||'';return '${prefixes}'+key+path+search;}catch(e){return null;}};const rewriteResource=(input)=>{if(typeof input==='string'){const rewritten=build(input);return rewritten||input;}if(input instanceof Request){const rewritten=build(input.url);if(rewritten){return new Request(rewritten,input);}return input;}return input;};const originalFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const resource=rewriteResource(input);return originalFetch(resource,init);};const originalOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){const target=build(url);return originalOpen.call(this,method,target||url,...rest);};const originalSetAttribute=document.createElement('a').setAttribute;const rewriteAnchor=(node)=>{if(!node||!node.getAttribute)return;const href=node.getAttribute('href');const updated=build(href);if(updated){node.setAttribute('href',updated);}};const observer=new MutationObserver((mutations)=>{for(const m of mutations){for(const node of m.addedNodes){if(node.nodeType===1){rewriteAnchor(node);node.querySelectorAll&&node.querySelectorAll('a').forEach(rewriteAnchor);}}}});observer.observe(document.documentElement,{childList:true,subtree:true});})();</script>`
}

function injectSessionHelpers(html, sid) {
  if (!html.includes('<head')) return html

  // SPA 基础路径配置（必须在所有脚本之前）
  const basePath = `/sess/${sid}/x/site/`
  const baseTag = `<base href="${basePath}">`
  const baseVarScript = `<script>window.__APP_BASE__="${basePath}";</script>`

  // 🍪 注入 OptanonConsent Cookie（OneTrust 隐私横幅需要）
  // 这个 Cookie 在官方页面由 OneTrust JS 设置，但在反代环境可能失败
  // 手动预设一个假的同意记录，避免触发阻断逻辑
  // 使用会话隔离路径，确保不同 Session 的 Cookie 互不干扰
  const sessionPath = `/sess/${sid}/`;
  const optanonCookieScript = `<script>
(function(){
  // 检查是否已有 OptanonConsent
  if(!document.cookie.includes('OptanonConsent')){
    const datestamp = new Date().toUTCString().replace(/GMT/, 'GMT+0800 (中国标准时间)');
    const cookieValue = 'isGpcEnabled=0&datestamp=' + encodeURIComponent(datestamp) + 
      '&version=202409.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&' +
      'consentId=' + Math.random().toString(36).substring(2) + 
      '&interactionCount=1&isAnonUser=1&' +
      'landingPath=' + encodeURIComponent(window.location.href) + 
      '&groups=C0001:1,C0004:0';
    
    // 设置到 .blablalink.com 域
    const domain = window.location.hostname.includes('blablalink.com') 
      ? '.blablalink.com' 
      : window.location.hostname;
    
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = 'OptanonConsent=' + cookieValue + 
      '; path=${sessionPath}; domain=' + domain + 
      '; expires=' + expires + 
      '; SameSite=Lax; Secure';
    
    // console.log('[OptanonConsent] Cookie injected (Session Path: ${sessionPath}):', cookieValue.substring(0, 100) + '...');
  }
})();
</script>`;

  // 注入顺序：<base> → window.__APP_BASE__ → OptanonConsent → 客户端重写
  return html.replace(/<head([^>]*)>/i, (match) => `${match}${baseTag}${baseVarScript}${optanonCookieScript}${SESSION_CLIENT_REWRITE_SCRIPT(sid)}`)
}

// 国服API端点
const CN_ENDPOINTS = {
  CDK_EXCHANGE: 'https://x8m8.ams.game.qq.com/ide/',
  CAPTCHA: 'https://ssl.captcha.qq.com/getimage'
}

// 生成请求ID的辅助函数
function generateReqId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ======== 会话镜像辅助函数 ========

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{6,40}$/

function joinCookies(pairs) {
  return pairs.map(([k, v]) => `${k}=${v}`).join('; ')
}

function splitSetCookieHeader(value) {
  if (!value) return []
  const parts = []
  let buffer = ''
  let inQuotes = false
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '"') {
      inQuotes = !inQuotes
    }
    if (char === ',' && !inQuotes) {
      parts.push(buffer.trim())
      buffer = ''
      continue
    }
    buffer += char
  }
  if (buffer) parts.push(buffer.trim())
  return parts
}

/**
 * 重写 Set-Cookie 头，实现会话隔离
 * 
 * 关键修改：
 * 1. Path=/sess/{sid}/ - 会话隔离
 *    - 每个会话的 Cookie 仅在其专属路径下可见
 *    - 多个会话互不干扰
 *    - 安全性更高（Cookie 范围限制）
 * 2. SameSite=Lax
 *    - 适用于同站环境（用户直接访问 Worker）
 *    - 如需跨站支持可改为 None (需配合 Secure)
 * 3. 移除 HttpOnly
 *    - 允许 JavaScript 读取（Bridge iframe 需要）
 * 
 * 安全考虑：
 * - 不使用 KV 存储，避免隐私泄露
 * - Cookie 仅存储在用户浏览器，Worker 不持久化
 * - 通过 Path 实现会话隔离，防止 Cookie 泄露
 */
function rewriteSetCookieForSession(headers, sid) {
  const raw = headers.get('set-cookie')
  if (!raw) {
    // console.log(`[set-cookie] 无Set-Cookie头`)
    return
  }

  // console.log(`[set-cookie] 🍪 原始Set-Cookie头存在，长度: ${raw.length}`)

  const cookieList = splitSetCookieHeader(raw)
  // console.log(`[set-cookie] 解析到 ${cookieList.length} 个Cookie`)

  // 会话隔离路径
  const sessionPath = `/sess/${sid}/`
  const updatedCookies = []

  for (const cookie of cookieList) {
    // 提取Cookie名称用于日志
    const cookieName = cookie.split('=')[0].trim()

    let updatedCookie = cookie
      .replace(/Domain=[^;]+;?\s*/gi, '') // 移除原Domain
      .replace(/Path=[^;]+/gi, `Path=${sessionPath}`) // 🔧 使用会话隔离路径
      .replace(/SameSite=[^;]+/gi, 'SameSite=Lax') // Lax 适用于同站环境

    // 确保Secure标志存在（HTTPS 必需）
    if (!/Secure;?\s*/i.test(updatedCookie)) {
      updatedCookie += '; Secure'
    }

    // 🔧 移除HttpOnly标志，允许JavaScript读取
    updatedCookie = updatedCookie.replace(/HttpOnly;?\s*/gi, '')

    updatedCookies.push(updatedCookie)
    // console.log(`[set-cookie] ✅ 重写Cookie: ${cookieName} → Path=${sessionPath} (会话隔离, HttpOnly已移除)`)
  }

  // 删除旧的set-cookie头，然后逐条添加
  headers.delete('set-cookie')
  updatedCookies.forEach(cookie => {
    headers.append('set-cookie', cookie)
  })

  // console.log(`[set-cookie] 📤 已设置 ${updatedCookies.length} 个会话Cookie (Path=${sessionPath})`)
}

function stripSecurityHeaders(headers) {
  const blocked = [
    'content-security-policy',
    'content-security-policy-report-only',
    'cross-origin-embedder-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
    'x-frame-options'
  ]
  blocked.forEach((key) => headers.delete(key))
}

function setCorsOnResponse(headers, request) {
  const origin = request.headers.get('Origin')
  const cors = corsHeaders(origin)
  for (const key in cors) {
    headers.set(key, cors[key])
  }
  if (origin) {
    const prev = headers.get('Vary')
    headers.set('Vary', prev ? `${prev}, Origin` : 'Origin')
  }
}

function replaceRootRelativeUrls(text, sid) {
  const prefix = `/sess/${sid}/x/site`

  // 🎯 第一步：处理完整域名 URL（https://www.blablalink.com/assets/...）
  // 这是 CORS 问题的核心原因 - HTML 中硬编码的完整 URL
  let result = text

  // 替换所有 www.blablalink.com 的完整 URL
  result = result.replace(
    /(href|src|action|data-src)=(["'])https?:\/\/www\.blablalink\.com(\/[^"'>]*)/gi,
    (match, attr, quote, path) => `${attr}=${quote}${prefix}${path}`
  )

  // 替换协议相对 URL（//www.blablalink.com/assets/...）
  result = result.replace(
    /(href|src|action|data-src)=(["'])\/\/www\.blablalink\.com(\/[^"'>]*)/gi,
    (match, attr, quote, path) => `${attr}=${quote}${prefix}${path}`
  )

  // 🎯 第二步：处理 modulepreload（<link rel="modulepreload" href="...">）
  // 这些预加载链接会导致浏览器提前跨域请求模块
  result = result.replace(
    /(<link[^>]*rel=["']modulepreload["'][^>]*href=)(["'])https?:\/\/www\.blablalink\.com(\/[^"']*)(["'][^>]*>)/gi,
    (match, prefix1, quote1, path, suffix) => `${prefix1}${quote1}${prefix}${path}${suffix}`
  )

  result = result.replace(
    /(<link[^>]*rel=["']modulepreload["'][^>]*href=)(["'])\/\/www\.blablalink\.com(\/[^"']*)(["'][^>]*>)/gi,
    (match, prefix1, quote1, path, suffix) => `${prefix1}${quote1}${prefix}${path}${suffix}`
  )

  // 🎯 第三步：处理绝对路径（/assets/...）
  result = result.replace(/(href|src|action|data-src)=(["'])(\/[^"'>]*)/gi, (match, attr, quote, path) => {
    if (path.startsWith(`/sess/${sid}/`) || path.startsWith(`/cdn-cgi/`)) {
      return `${attr}=${quote}${path}`
    }
    return `${attr}=${quote}${prefix}${path}`
  })

  // 🎯 第四步：处理相对路径（assets/...）
  result = result.replace(/(href|src|action|data-src)=(["'])([^"'>/][^"'>]*)/gi, (match, attr, quote, path) => {
    // 跳过已经是完整 URL 的路径
    if (path.startsWith('http://') || path.startsWith('https://') ||
      path.startsWith('data:') || path.startsWith('blob:') ||
      path.startsWith('javascript:') || path.startsWith('mailto:') ||
      path.startsWith('#') || path.startsWith('/sess/')) {
      return match
    }
    // 转换为绝对路径
    return `${attr}=${quote}${prefix}/${path}`
  })

  // 🎯 第五步：移除第三方脚本（Cloudflare Insights 等）
  // 这些脚本会触发跨域问题，测试环境不需要
  result = result.replace(
    /<script[^>]*src=["']https:\/\/static\.cloudflareinsights\.com[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
    '<!-- Cloudflare Insights removed for CORS compatibility -->'
  )

  return result
}

function rewriteTextHostsWithSid(text, sid, isHtml = false) {
  let result = text
  for (const [host, key] of Object.entries(SESSION_HOST_TO_KEY)) {
    const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const fullPattern = new RegExp(`https?:\\/\\/${escapedHost}`, 'gi')
    result = result.replace(fullPattern, `/sess/${sid}/x/${key}`)

    const protocolRelative = new RegExp(`(?:https?:)?\\/\\/${escapedHost}`, 'gi')
    result = result.replace(protocolRelative, `/sess/${sid}/x/${key}`)
  }

  // 去掉 integrity 和 nonce，避免替换后校验失败（仅 HTML）
  if (isHtml) {
    result = result.replace(/\s+integrity\s*=\s*"[^"]*"/gi, '')
    result = result.replace(/\s+nonce\s*=\s*"[^"]*"/gi, '')
  }

  const sessionBase = `/sess/${sid}/x/site/`
  result = result.replace(/import\.meta\.env\.BASE_URL/g, `'${sessionBase}'`)
  result = result.replace(/createWebHistory\(\)/g, `createWebHistory('${sessionBase}')`)

  result = result.replace(/VITE_VUE_ROUTER_BASE\s*=\s*['"][^'"]*['"]/g, `VITE_VUE_ROUTER_BASE='${sessionBase}'`)
  result = result.replace(/window\.VUE_ROUTER_BASE\s*=\s*['"][^'"]*['"]/g, `window.VUE_ROUTER_BASE='${sessionBase}'`)

  result = result.replace(/__CDN_BASE__\s*=\s*['"][^'"]*['"]/g, `__CDN_BASE__='${sessionBase}'`)
  result = result.replace(/process\.env\.BASE_URL/g, `'${sessionBase}'`)

  const escapedSid = sid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const normalizedPathExpr = `location.pathname.replace(/^\\/sess\\/${escapedSid}\\/x\\/site/, "")`
  result = result.replace(/includes\(location\.pathname\)/g, `includes(${normalizedPathExpr})`)

  // 🔧 关键修复：只对 HTML 应用相对路径替换，避免破坏 JS 代码
  return isHtml ? replaceRootRelativeUrls(result, sid) : result
}

function extractSessionInfo(pathname) {
  const match = pathname.match(/^\/sess\/([^\/]+)\/(.*)$/)
  if (!match) return null
  const [, sid, tail] = match
  if (!SESSION_ID_PATTERN.test(sid)) return null
  return { sid, tail }
}

async function cloneForwardRequest(request, overrides = {}) {
  const initHeaders = new Headers(request.headers)

  // 记录原始头部用于调试
  const originalOrigin = request.headers.get('Origin')
  const originalReferer = request.headers.get('Referer')

  // 🔧 删除安全敏感头部
  const headersToDelete = [
    'Host',
    'Accept-Encoding',
    'Sec-Fetch-Dest',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Site',
    'Sec-Fetch-User',
    'Sec-Ch-Ua',
    'Sec-Ch-Ua-Mobile',
    'Sec-Ch-Ua-Platform'
  ]

  headersToDelete.forEach(header => initHeaders.delete(header))

  // 🔧 清理浏览器域Cookie，避免泄露会话信息
  const cookieHeader = initHeaders.get('Cookie')
  if (cookieHeader) {
    // 游戏相关的Cookie白名单
    const gameCookieKeys = new Set([
      'game_token', 'game_uid', 'game_openid', 'game_gameid', 'game_channelid',
      'game_user_name', 'game_login_game', 'game_adult_status', 'verifysession',
      'login_ticket', 'session_id', 'user_id', 'account_id'
    ])

    // 域名特定的Cookie白名单
    const domainSpecificCookies = new Map([
      ['api.blablalink.com', new Set(['game_token', 'game_openid', 'game_uid'])],
      ['aws-na.intlgame.com', new Set(['login_ticket', 'session_id'])],
      ['li-sg.intlgame.com', new Set(['account_id', 'user_id'])],
      ['pass.blablalink.com', new Set(['passport_token', 'auth_token'])]
    ])

    // 🔧 修复：使用真实目标域名而不是伪装的 Origin
    let targetDomain = overrides.targetDomain || (overrides.origin ? new URL(overrides.origin).hostname : null)
    let allowedKeys = gameCookieKeys

    if (targetDomain && domainSpecificCookies.has(targetDomain)) {
      allowedKeys = domainSpecificCookies.get(targetDomain)
    }

    const filteredCookies = cookieHeader.split(';')
      .map(cookie => cookie.trim())
      .filter(cookie => {
        const [key] = cookie.split('=')
        return allowedKeys.has(key)
      })
      .join('; ')

    if (filteredCookies) {
      initHeaders.set('Cookie', filteredCookies)
      // console.log(`[cloneForwardRequest] Forwarding cookies for ${targetDomain}: ${filteredCookies}`)
    } else {
      initHeaders.delete('Cookie')
      // console.log(`[cloneForwardRequest] No cookies to forward for ${targetDomain}`)
    }
  }

  // 🔧 添加CSRF保护头部
  initHeaders.set('X-Requested-With', 'XMLHttpRequest')

  // 强制设置正确的Origin和Referer
  if (overrides.origin) {
    initHeaders.set('Origin', overrides.origin)
  } else {
    initHeaders.delete('Origin')
  }

  if (overrides.referer) {
    initHeaders.set('Referer', overrides.referer)
  } else {
    initHeaders.delete('Referer')
  }

  // 确保body处理是同步的，使用clone避免消耗原始请求体
  const bodyAllowed = request.method !== 'GET' && request.method !== 'HEAD'
  let body = undefined

  if (bodyAllowed) {
    try {
      body = await request.clone().arrayBuffer()
    } catch (error) {
      console.warn('[cloneForwardRequest] Failed to clone request body:', error)
      body = undefined
    }
  }

  return {
    method: request.method,
    headers: initHeaders,
    redirect: 'manual',
    body
  }
}

function parseCookieHeader(header) {
  if (!header) return []
  return header.split(';').map((segment) => segment.trim()).filter(Boolean).map((entry) => {
    const [key, ...rest] = entry.split('=')
    return [key, rest.join('=')]
  })
}

function filterGameCookies(cookiePairs) {
  const keys = new Set([
    'game_token',
    'game_uid',
    'game_openid',
    'game_gameid',
    'game_channelid',
    'game_user_name',
    'game_login_game',
    'game_adult_status'
  ])

  return cookiePairs.filter(([key]) => keys.has(key))
}

// 🔧 新增：官方代理登录入口页面（控制面板 + 二次弹窗登录 + 手动发送）
async function handleProxyLoginEntrance(request, sid) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIKKE - 官方登录助手</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#e6edf3;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#161b22;border:1px solid #30363d;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);max-width:560px;width:100%;padding:28px}
    h1{font-size:22px;color:#58a6ff;margin-bottom:8px}
    .sub{color:#a5b1c2;font-size:13px;margin-bottom:16px}
    .box{background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:16px;margin:14px 0}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    button{background:#238636;border:none;color:#fff;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600}
    button:hover{background:#2ea043}
    button.secondary{background:#30363d;color:#c9d1d9}
    button.secondary:hover{background:#3a3f46}
    .muted{color:#8b949e;font-size:12px}
    code{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:2px 6px;color:#58a6ff}
    .status{margin-top:10px;font-size:13px}
    .ok{color:#7ee787}
    .err{color:#ff7b72}
    a.link{color:#58a6ff;text-decoration:none}
    a.link:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="card">
    <h1>🔐 官方登录助手</h1>
    <div class="sub">本页将保持打开以“托管会话”。请按步骤完成登录并把 Cookie 发送回主站。</div>

    <div class="box">
      <div class="muted">会话 ID：<code>${sid}</code></div>
      <div class="row" style="margin-top:12px">
  <button id="btnLogin">➡️ 前往官网登录（登录页）</button>
  <button id="btnLoginDirect" class="secondary">🏠 打开官网首页(备用)</button>
        <button id="btnSend">📤 发送到 CallbackAuth</button>
        <button id="btnDebug" class="secondary">🔍 查看会话 Cookie</button>
      </div>
      <div id="status" class="status muted">尚未检测</div>
    </div>

    <div class="box">
      <div class="muted">说明：</div>
      <ul class="muted" style="margin-left:18px;margin-top:6px;line-height:1.6">
        <li>点击“前往官网登录”会在新窗口打开官网，所有 Cookie 都会被写入 <code>/sess/${sid}/</code> 路径。</li>
        <li>登录完成后回到本页，点“发送到 CallbackAuth”。若成功，本页会通知主站并自动关闭。</li>
        <li>如果浏览器阻止了自动跳转，请点击状态区域出现的链接手动完成。</li>
      </ul>
    </div>

    <div class="muted">遇到问题？可以先点“查看会话 Cookie”诊断。</div>
  </div>

  <script>
    let loginWin = null
    let monitorTimer = null
    const sid = ${JSON.stringify(sid)}
    const $ = (id) => document.getElementById(id)
    const setStatus = (html, cls='') => { const el = $('status'); el.className = 'status ' + (cls||'muted'); el.innerHTML = html }
    // 从查询参数读取回调基址 cb（例如 http://127.0.0.1:5173/ 或 https://small-tailqwq.github.io/Nikke-CDK-Tool/）
    const qs = new URLSearchParams(location.search)
    const cbBase = qs.get('cb') || ''

    // 统一的 Cookie 自检函数（不跳转，仅提示）
    async function checkCookieStatus() {
      try {
        const checkUrl = '/sess/' + sid + '/check-cookie' + (cbBase ? ('?cb=' + encodeURIComponent(cbBase)) : '')
        const res = await fetch(checkUrl, { method: 'GET', credentials: 'include' })
        const data = await res.json()
        if (data && data.success) {
          setStatus('✅ 检测到登录 Cookie，可点击“发送到 CallbackAuth”完成导入。', 'ok')
        } else {
          setStatus('⚠️ 小窗已关闭，仍未检测到登录 Cookie。请确认登录是否成功；若确认已登录仍无 Cookie，请反馈此问题。', 'err')
        }
      } catch (e) {
        setStatus('检测失败：' + (e && e.message ? e.message : String(e)), 'err')
      }
    }

    function startPopupMonitor() {
      try { if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = null } } catch (e) {}
      if (!loginWin) return
      // 轮询检测小窗关闭
      monitorTimer = setInterval(() => {
        try {
          if (loginWin && loginWin.closed) {
            clearInterval(monitorTimer)
            monitorTimer = null
            loginWin = null
            setStatus('检测登录状态中…', 'muted')
            checkCookieStatus()
          }
        } catch (e) {
          // 忽略跨域访问异常，继续轮询
        }
      }, 1200)
    }

    $('btnLogin').onclick = () => {
      try {
        // 第二个窗口：作为“反代bala登录页”，使用小窗特性参数
        const features = [
          'toolbar=no','menubar=no','location=no','status=no',
          'scrollbars=yes','resizable=yes','width=900','height=700','left=120','top=80'
        ].join(',')
        // 直接打开官网登录页
        const directUrl = '/sess/' + sid + '/x/site/login'
        loginWin = window.open(directUrl, 'nikke_proxy_login', features)
        if (!loginWin) {
          setStatus('无法打开小窗，请允许站点弹窗或手动在新标签页登录后返回此页。', 'err')
        } else {
          setStatus('已打开小窗：登录页。完成后返回本页点击“发送到 CallbackAuth”。')
          startPopupMonitor()
        }
      } catch (e) {
        setStatus('无法打开新窗口，请检查弹窗拦截。', 'err')
      }
    }

    // 备用入口：打开官网首页
    $('btnLoginDirect').onclick = () => {
      try {
        const features = [
          'toolbar=no','menubar=no','location=no','status=no',
          'scrollbars=yes','resizable=yes','width=900','height=700','left=120','top=80'
        ].join(',')
        const homeUrl = '/sess/' + sid + '/x/site/'
        loginWin = window.open(homeUrl, 'nikke_proxy_login', features)
        if (!loginWin) {
          setStatus('无法打开小窗，请允许站点弹窗。你也可以先用“前往官网登录（登录页）”。', 'err')
        } else {
          setStatus('已打开官网首页(备用)。如需登录，请在右上角点击“登录”。')
          startPopupMonitor()
        }
      } catch (e) {
        setStatus('无法打开新窗口，请检查弹窗拦截。', 'err')
      }
    }

    $('btnDebug').onclick = () => {
      window.open('/sess/' + sid + '/debug/cookies', '_blank')
    }

    $('btnSend').onclick = async () => {
      setStatus('正在检测并发送 Cookie ...')
      try {
        // 将 cb 传给后端，生成与主站一致的回调 URL（支持本地 host）
        const checkUrl = '/sess/' + sid + '/check-cookie' + (cbBase ? ('?cb=' + encodeURIComponent(cbBase)) : '')
        const res = await fetch(checkUrl, {
          method: 'GET',
          credentials: 'include'
        })
        const data = await res.json()
        if (!data.success) {
          setStatus('❌ ' + (data.message || '未检测到有效的登录 Cookie'), 'err')
          return
        }
        setStatus('✅ 检测成功，准备跳转 ...', 'ok')
        const redirectUrl = data.callbackUrl
        // 优先尝试让主页面跳转
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.location.href = redirectUrl
          } else {
            // 备选：直接在当前页打开
            window.location.href = redirectUrl
          }
        } catch (e) {
          // 如果被拦截，则给出可点击链接
          setStatus('请点击此链接完成回调：<a class="link" href="' + redirectUrl + '" target="_blank" rel="noopener">前往 CallbackAuth</a>')
          return
        }

        // 关闭登录页（如果还开着）与当前控制页
        try { if (loginWin && !loginWin.closed) loginWin.close() } catch (e) {}
        setTimeout(() => { try { window.close() } catch (e) {} }, 300)
      } catch (err) {
        setStatus('发送失败：' + (err && err.message ? err.message : String(err)), 'err')
      }
    }
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...corsHeaders(request.headers.get('Origin')),
      'Cache-Control': 'no-store'
    }
  })
}

// ==================== 临时令牌存储 (使用 Cloudflare KV) ====================
// 令牌有效期：5分钟（KV 的 expirationTtl 单位是秒）
const TOKEN_EXPIRY_SECONDS = 5 * 60 // 300秒

/**
 * 生成安全令牌
 */
function generateSecureToken() {
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 存储令牌数据到 KV
 * @param {any} data - 要存储的数据
 * @param {KVNamespace} tokenKV - KV namespace 实例
 * @returns {Promise<string>} token
 */
async function storeTokenData(data, tokenKV) {
  const token = generateSecureToken()

  // 将数据序列化为 JSON
  const jsonData = JSON.stringify(data)

  // 存储到 KV，设置过期时间
  await tokenKV.put(token, jsonData, {
    expirationTtl: TOKEN_EXPIRY_SECONDS
  })

  // console.log(`[token-store] 已存储令牌到KV: ${token.substring(0, 16)}... (有效期${TOKEN_EXPIRY_SECONDS}秒)`)
  return token
}

/**
 * 从 KV 获取并删除令牌数据（一次性使用）
 * @param {string} token - 令牌
 * @param {KVNamespace} tokenKV - KV namespace 实例
 * @param {boolean} [deleteOnRead=true] - 是否在读取后删除
 * @returns {Promise<any|null>} 数据或 null
 */
async function consumeTokenData(token, tokenKV, deleteOnRead = true) {
  const jsonData = await tokenKV.get(token)

  if (!jsonData) {
    return null
  }

  if (deleteOnRead) {
    await tokenKV.delete(token)
  }

  try {
    return JSON.parse(jsonData)
  } catch (e) {
    console.error(`[token-store] 解析令牌数据失败: ${e.message}`)
    return null
  }
}

// ==================== 安全令牌认证处理 ====================

/**
 * 🔐 处理令牌认证数据获取（使用三重加密）
 * @param {Request} request - 请求对象
 * @param {KVNamespace} tokenKV - KV namespace 实例
 */

const LI_PASS_SIGN_KEY = 'be83e12d807ed10f5cdcb3144773ee56'
const LI_PASS_CAPTCHA_APPID = '188981228'

function buildLiPassSignedPostUrl(path, body, ts = Date.now()) {
  const sigParams = {
    account_plat_type: '131',
    app_id: '09af79d65d6e4fdf2d2569f0d365739d',
    lang_type: 'en',
    os: '3',
    sdk_version: '1.31.0',
    source: '66',
    ts: String(ts)
  }
  const qs = Object.keys(sigParams).sort().map(k => `${k}=${sigParams[k]}`).join('&')
  const sig = md5(`${path}?${qs}${body}${LI_PASS_SIGN_KEY}`)
  return `https://li-sg.intlgame.com${path}?${qs}&sig=${sig}`
}

function buildIntlGameSignedPostUrl(path, body, ts = Date.now()) {
  const sigParams = {
    channelid: '131',
    conn: '0',
    gameid: '29080',
    os: '3',
    sdk_version: '1.31.0',
    seq: '',
    source: '66',
    ts: String(ts)
  }
  const qs = Object.keys(sigParams).sort().map(k => `${k}=${sigParams[k]}`).join('&')
  const sig = md5(`${path}?${qs}${body}${LI_PASS_SIGN_KEY}`)
  return `https://aws-na.intlgame.com${path}?${qs}&sig=${sig}`
}

function buildLoginDeviceInfo(ts, guestId) {
  return {
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
    ts
  }
}

async function fetchLiPassUserInfo(uid, token, cookie = '') {
  if (!uid || !token) return null

  const body = JSON.stringify({
    uid: String(uid),
    token: String(token)
  })

  const headers = {
    'Content-Type': 'application/json',
    'Origin': 'https://www.blablalink.com',
    'Referer': 'https://www.blablalink.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
  }
  if (cookie) headers['Cookie'] = cookie

  const upstreamResp = await fetch(buildLiPassSignedPostUrl('/account/getuserinfo', body), {
    method: 'POST',
    headers,
    body
  })

  const text = await upstreamResp.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`/account/getuserinfo returned non-JSON HTTP ${upstreamResp.status}`)
  }

  if (!upstreamResp.ok) {
    throw new Error(data?.msg || `/account/getuserinfo HTTP ${upstreamResp.status}`)
  }

  return data
}

async function fetchIntlGameAuthLogin(liLoginResult, email, guestId) {
  if (!liLoginResult?.uid || !liLoginResult?.token) return null

  const ts = Date.now()
  const body = JSON.stringify({
    device_info: buildLoginDeviceInfo(ts, guestId),
    channel_dis: '00000000',
    channel_info: {
      openid: String(liLoginResult.uid),
      token: String(liLoginResult.token),
      account_plat_type: 131,
      account: email,
      account_type: 1,
      lang_type: 'en'
    },
    auto_bind_lip: 1
  })

  const upstreamResp = await fetch(buildIntlGameSignedPostUrl('/v2/auth/login', body, ts), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.blablalink.com',
      'Referer': 'https://www.blablalink.com/login',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
    },
    body
  })

  const text = await upstreamResp.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`/v2/auth/login returned non-JSON HTTP ${upstreamResp.status}`)
  }

  if (!upstreamResp.ok) {
    throw new Error(data?.msg || `/v2/auth/login HTTP ${upstreamResp.status}`)
  }

  return data
}

function buildBlablalinkGameLoginBody(gameAuthResult, email, liLoginResult = {}) {
  if (!gameAuthResult) return null

  const extraJson = parseJsonLike(gameAuthResult.extra_json)
  const statusRsp = extraJson.get_status_rsp || {}
  const notify = extraJson.need_notify_rsp || {}
  const channelInfo = gameAuthResult.channel_info || gameAuthResult.channelInfo || {}
  const gameToken = isLikelyGameToken(gameAuthResult.token) ? gameAuthResult.token : ''
  const gameOpenid = gameAuthResult.openid || notify.game_sacc_openid || notify.game_openid || ''
  const gameUid = notify.game_sacc_uid || gameAuthResult.uid || channelInfo.openid || liLoginResult.uid || ''

  if (!gameToken || !gameOpenid || !gameUid) return null

  const gameBody = {
    game_openid: String(gameOpenid),
    game_channelid: channelInfo.channelId || channelInfo.channel_id || channelInfo.account_plat_type || gameAuthResult.channelid || gameAuthResult.channel_id || 131,
    game_token: String(gameToken),
    game_id: '29080',
    game_expire_time: gameAuthResult.token_expire_time || channelInfo.expire_ts || liLoginResult.expire || Math.floor(Date.now() / 1000) + 29 * 86400,
    game_uid: String(gameUid),
    game_user_name: gameAuthResult.user_name || gameAuthResult.nickname || email.split('@')[0],
    game_adult_status: statusRsp.adult_check_status ?? 1,
    game_email: email
  }
  if (statusRsp.region) gameBody.game_user_region = statusRsp.region
  return gameBody
}

async function fetchBlablalinkGameLogin(gameBody) {
  if (!gameBody) return { status: 0, bodyText: '', cookies: [] }

  const resp = await fetch('https://api.blablalink.com/api/user/Login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.blablalink.com',
      'Referer': 'https://www.blablalink.com/login',
      'X-Channel-Type': '2',
      'X-Language': 'en',
      'X-Common-Params': GLOBAL_HEADERS['x-common-params']
    },
    body: JSON.stringify(gameBody)
  })
  const bodyText = await resp.text()
  const cookies = extractSetCookiesHeaders(resp)
    .map((value) => value.split(';')[0].trim())
    .filter(Boolean)
  return { status: resp.status, bodyText, cookies }
}

async function handleDirectLogin(request, env) {
  const origin = request.headers.get('Origin')
  const debugEnabled = new URL(request.url).searchParams.get('debug') === '1'

  try {
    const { email, password, ticket, randstr, captchaAppId } = await request.json()

    if (!email || !password) {
      return new Response(JSON.stringify({
        code: -1, message: '缺少邮箱或密码'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      })
    }

    const passwordMd5 = md5(password)

    // ⚠️ 关键：两个不同的时间戳
    const deviceTs = Date.now() - 2500  // device_info 的时间戳（模拟验证码开始时间）
    const signTs = Date.now()           // 签名时的时间戳（当前时间）

    const payload = {
      account: email,
      password: passwordMd5,
      account_type: 1,
      support_captcha: 1,
      machine_check_type: 3,
      tencent_response: JSON.stringify({
        appid: captchaAppId || LI_PASS_CAPTCHA_APPID,
        ret: 0,
        ticket: ticket || '',
        randstr: randstr || ''
      }),
      device_info: {
        guest_id: crypto.randomUUID(),
        lang_type: 'en',
        app_version: 'WebWidget_1.31.0',
        screen_height: 1440,
        screen_width: 2560,
        device_brand: 'Google Inc.',
        device_model: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML; like Gecko) Chrome/147.0.0.0 Safari/537.36',
        network_type: '4g',
        ram_total: 70,
        rom_total: 70,
        cpu_name: 'Win32',
        android_imei: '',
        ios_idfa: '',
        page: 'https%3A%2F%2Fwww.blablalink.com%2Flogin',
        page_with_search: 'https%3A%2F%2Fwww.blablalink.com%2Flogin%3Fto%3D%2F%26back_to%3D%2F',
        ts: deviceTs
      }
    }

    const body = JSON.stringify(payload)

    const sigParams = {
      account_plat_type: '131',
      app_id: '09af79d65d6e4fdf2d2569f0d365739d',
      lang_type: 'en',
      os: '3',
      sdk_version: '1.31.0',
      source: '66',
      ts: String(signTs)  // ⚠️ 使用当前时间戳
    }

    const sortedKeys = Object.keys(sigParams).sort()
    const qs = sortedKeys.map(k => `${k}=${sigParams[k]}`).join('&')
    
    // ✅ 签名输入格式正确
    const sigInput = '/account/login?' + qs + body + LI_PASS_SIGN_KEY
    const sig = md5(sigInput)

    const loginUrl = `https://li-sg.intlgame.com/account/login?${qs}&sig=${sig}`
    const upstreamResp = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
      },
      body
    })

    const result = await upstreamResp.json()

    if (result.ret === 0 && result.is_login) {
      const loginSetCookies = extractSetCookiesHeaders(upstreamResp)
      const loginCookieStr = buildCookieStringFromSetCookies(loginSetCookies)
      let userInfoResult = null
      let userInfoError = ''
      try {
        userInfoResult = await fetchLiPassUserInfo(result.uid, result.token, loginCookieStr)
      } catch (error) {
        userInfoError = error.message || String(error)
      }

      const enrichedResult = mergeLiPassUserInfo(result, userInfoResult)

      let gameAuthResult = null
      let gameAuthError = ''
      try {
        gameAuthResult = await fetchIntlGameAuthLogin(result, email, payload.device_info.guest_id)
      } catch (error) {
        gameAuthError = error.message || String(error)
      }

      const gameLoginBody = buildBlablalinkGameLoginBody(gameAuthResult, email, result)

      let blLoginError = ''
      let blLoginStatus = 0
      let blLoginBodyText = ''
      let blLoginCookies = []
      let blLoginAttempts = []
      try {
        const blResult = await fetchBlablalinkGameLogin(gameLoginBody)
        let blMsg = ''
        try {
          blMsg = JSON.parse(blResult.bodyText)?.msg || ''
        } catch {}
        blLoginAttempts.push({
          label: 'auth-openid',
          status: blResult.status,
          msg: blMsg.slice(0, 120),
          cookieCount: blResult.cookies.length,
        })
        blLoginStatus = blResult.status
        blLoginBodyText = blResult.bodyText
        blLoginCookies = blResult.cookies
      } catch (error) {
        blLoginError = error.message || String(error)
      }

      if (gameLoginBody && blLoginCookies.length === 0 && blLoginBodyText) {
        try {
          const blData = JSON.parse(blLoginBodyText)
          if (blData?.code === 0 && blData?.data?.token) {
            const bodyCookie = buildCookieStringFromLoginResult({
              ...gameAuthResult,
              token: blData.data.token,
              openid: blData.data.open_id || gameAuthResult.openid,
              channelid: blData.data.channel_id || gameAuthResult.channelid,
            }, email)
            if (isCdkCookieUsable(bodyCookie)) {
              blLoginCookies = bodyCookie.split(';').map((part) => part.trim()).filter(Boolean)
            }
          }
        } catch {
          // 保留原始调试信息，继续使用后续 fallback
        }
      }

      const setCookies = extractSetCookiesHeaders(upstreamResp)
      const blCookieStr = blLoginCookies.join('; ')
      const setCookieStr = buildCookieStringFromSetCookies(setCookies)
      const fallbackCookieStr = buildCookieStringFromLoginResult(gameAuthResult || enrichedResult, email)
      const cookieStr = isCdkCookieUsable(blCookieStr) ? blCookieStr
        : isCdkCookieUsable(setCookieStr) ? setCookieStr
        : fallbackCookieStr

      if (!isCdkCookieUsable(cookieStr)) {
        const failurePayload = {
          code: -1,
          message: '账号密码登录成功，但未获取到 CDK 兑换所需的游戏侧 game_token。请确认账号已绑定 NIKKE，或先继续使用官方浏览器登录方式。'
        }
        if (debugEnabled) {
          failurePayload.debug = {
            login: summarizeLiPassResult(result),
            userInfo: summarizeLiPassResult(userInfoResult),
            userInfoError,
            gameAuth: summarizeLiPassResult(gameAuthResult),
            gameAuthError,
            setCookieKeys: setCookies.map(sc => sc.split('=')[0]).filter(Boolean),
            blLogin: {
              status: blLoginStatus,
              error: blLoginError || '(none)',
              bodyPreview: sanitizeSensitiveText(blLoginBodyText).slice(0, 1000),
              cookieCount: blLoginCookies.length,
              cookieKeys: blLoginCookies.map(c => c.split('=')[0]),
              attempts: blLoginAttempts
            }
          }
        }
        return new Response(JSON.stringify(failurePayload), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        })
      }

      return new Response(JSON.stringify({
        code: 0,
        data: {
          success: true,
          cookie: cookieStr,
          token: getCookieValue(cookieStr, 'game_token') || '',
          expire: result.expire || null,
          userName: getCookieValue(cookieStr, 'game_user_name') || gameAuthResult?.nickname || gameAuthResult?.user_name || enrichedResult.nickname || enrichedResult.user_name || '',
          uid: getCookieValue(cookieStr, 'game_uid') || gameAuthResult?.uid || enrichedResult.uid || ''
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      })
    }

    const failurePayload = {
      code: -1,
      message: result.msg || 'Login failed'
    }
    if (debugEnabled) {
      failurePayload.debug = summarizeLiPassResult(result) || {
        ret: result?.ret,
        msg: result?.msg
      }
    }
    return new Response(JSON.stringify(failurePayload), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    })

  } catch (error) {
    console.error('[handleDirectLogin Error]:', error)
    return new Response(JSON.stringify({
      code: -1,
      message: error.message
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    })
  }
}
// ──── Token 认证 ────────────────────────────────────────────────

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

async function handleTokenAuthData(request, tokenKV) {
  const origin = request.headers.get('Origin')

  try {
    if (!tokenKV) {
      return new Response(JSON.stringify({
        success: false,
        message: '令牌存储未配置'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    const { token } = await request.json()

    if (!token || typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      return new Response(JSON.stringify({
        success: false,
        message: '令牌参数无效'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    const payload = await consumeTokenData(token, tokenKV, false)

    if (!payload) {
      return new Response(JSON.stringify({
        success: false,
        message: '令牌无效或已过期'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    if (payload.callbackOrigin && origin !== payload.callbackOrigin) {
      console.warn(`[token-auth] Origin 不匹配: ${origin || '(none)'} !== ${payload.callbackOrigin}`)
      return new Response(JSON.stringify({
        success: false,
        message: '回调来源不匹配'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    const { standardCookie, sid, derived, href } = payload
    if (!standardCookie || !sid) {
      console.error('[token-auth] payload缺少必要数据:', { hasCookie: !!standardCookie, hasSid: !!sid })
      return new Response(JSON.stringify({
        success: false,
        message: '认证数据不完整'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    const responseData = {
      _encrypted_cookie: await encryptCookieDataWithTripleKey(standardCookie, sid, token),
      sid,
      href: href || '',
      derived: derived || {},
      security: {
        method: 'triple-key-pbkdf2',
        keyDerivation: 'PBKDF2',
        iterations: 100000,
        cipher: 'AES-GCM-256'
      }
    }

    await tokenKV.delete(token)
    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })

  } catch (error) {
    console.error('[token-auth] 处理失败:', error)
    return new Response(JSON.stringify({
      success: false,
      message: error.message || '处理令牌认证失败'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

// 🔧 新增：检查登录 Cookie 并生成 CallbackAuth URL
async function handleCheckProxyLoginCookie(request, sid, tokenKV) {
  const cookieHeader = request.headers.get('Cookie') || ''
  if (!tokenKV) {
    return new Response(JSON.stringify({
      success: false,
      message: '令牌存储未配置'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request.headers.get('Origin')),
        'Cache-Control': 'no-store'
      }
    })
  }

  const pairs = parseCookieHeader(cookieHeader)
  const cookieMap = new Map()
  pairs.forEach(([key, value]) => {
    cookieMap.set(key, value)
  })

  const requiredKeys = ['game_token', 'game_openid', 'game_uid']
  const hasValidCookie = requiredKeys.every(key => cookieMap.has(key) && cookieMap.get(key))

  if (!hasValidCookie) {
    return new Response(JSON.stringify({
      success: false,
      message: '未检测到有效的登录 Cookie'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request.headers.get('Origin')),
        'Cache-Control': 'no-store'
      }
    })
  }

  const gameCookies = filterGameCookies(pairs)
  const standardCookie = joinCookies(gameCookies)

  const derived = {
    game_id: cookieMap.get('game_gameid') || '29080',
    openid: cookieMap.get('game_openid') || '',
    channelid: parseInt(cookieMap.get('game_channelid')) || 131,
    uid: cookieMap.get('game_uid') || '',
    user_name: cookieMap.get('game_user_name') || ''
  }

  const url = new URL(request.url)
  const cbBase = url.searchParams.get('cb')
  let callbackBase
  let callbackOrigin = ''
  if (cbBase) {
    try {
      const cbUrl = new URL(cbBase)
      if ((cbUrl.protocol === 'http:' || cbUrl.protocol === 'https:') &&
        isAllowedCorsOrigin(cbUrl.origin)) {
        callbackBase = `${cbUrl.protocol}//${cbUrl.host}${cbUrl.pathname}`
        callbackOrigin = cbUrl.origin
      } else {
        console.warn(`[check-cookie] cb 来源不在允许列表: ${cbUrl.origin}`)
      }
    } catch (e) {
      console.warn(`[check-cookie] 无效的 cb 参数: ${cbBase} (${e.message})`)
    }
  }
  if (!callbackBase) {
    callbackBase = `${url.protocol}//${url.host}`
    callbackOrigin = `${url.protocol}//${url.host}`
  }

  const payload = {
    href: request.url,
    standardCookie,
    sid,
    callbackOrigin,
    derived
  }

  const token = await storeTokenData(payload, tokenKV)

  const baseTrim = callbackBase.endsWith('/') ? callbackBase.slice(0, -1) : callbackBase
  const tokenUrl = `${baseTrim}/#/auth/callback?token=${encodeURIComponent(token)}`

  return new Response(JSON.stringify({
    success: true,
    message: '检测到有效的登录 Cookie',
    callbackUrl: tokenUrl,
    cookieCount: gameCookies.length
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request.headers.get('Origin')),
      'Cache-Control': 'no-store'
    }
  })
}

// 🔧 新增：Cookie 诊断页面
async function handleCookieDebugPage(request, sid = null) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const allHeaders = {}
  for (const [key, value] of request.headers.entries()) {
    allHeaders[key] = value
  }
  const redactedHeaders = { ...allHeaders }
  if (redactedHeaders.cookie) redactedHeaders.cookie = maskCookieString(redactedHeaders.cookie)
  if (redactedHeaders.authorization) redactedHeaders.authorization = '<redacted>'
  const maskedCookieHeader = maskCookieString(cookieHeader)

  // 确定当前访问路径
  const currentPath = sid ? `/sess/${sid}/debug/cookies` : '/debug/cookies'
  const pathInfo = sid
    ? `<span class="status success">会话路径模式</span> - Session ID: <code>${sid}</code>`
    : `<span class="status warning">根路径模式</span> - 只能读取根路径和域级 Cookie`

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Cookie 诊断工具${sid ? ` - ${sid}` : ''}</title>
  <style>
    body{font-family:system-ui;background:#0d1117;color:#e6edf3;padding:40px;max-width:900px;margin:0 auto}
    h1{color:#58a6ff}
    .box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin:20px 0}
    h2{color:#7ee787;font-size:18px;margin-top:0}
    pre{background:#0d1117;border:1px solid #30363d;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px}
    .status{padding:8px 12px;border-radius:6px;display:inline-block;font-weight:bold}
    .success{background:#1a472a;color:#7ee787}
    .error{background:#4c1d1d;color:#f85149}
    .warning{background:#4a3519;color:#f0883e}
    button{background:#238636;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin:5px}
    button:hover{background:#2ea043}
  </style>
</head>
<body>
  <h1>🔍 Cookie 诊断工具</h1>
  
  <div class="box">
    <h2>📍 当前访问模式</h2>
    <p>${pathInfo}</p>
    <p><strong>当前路径：</strong> <code>${currentPath}</code></p>
    ${sid ? `
      <p><strong>提示：</strong>在会话路径下可以读取到 <code>/sess/${sid}/</code> 路径下的所有 Cookie</p>
      <button onclick="location.href='/debug/cookies'">🔄 切换到根路径模式</button>
    ` : `
      <p><strong>⚠️ 注意：</strong>根路径下只能读取到根路径 (<code>/</code>) 和域级 (<code>.domain</code>) 的 Cookie</p>
      <p><strong>如需读取会话 Cookie：</strong>请访问 <code>/sess/{your-sid}/debug/cookies</code></p>
      <p>示例：<a href="/sess/test-sid-12345/debug/cookies" style="color:#58a6ff">/sess/test-sid-12345/debug/cookies</a></p>
    `}
  </div>

  <div class="box">
    <h2>1️⃣ 服务端检测结果</h2>
    <p><strong>Cookie 头长度：</strong> <span class="status ${cookieHeader ? 'success' : 'error'}">${cookieHeader.length} 字符</span></p>
    <p><strong>Cookie 内容：</strong></p>
    <pre>${escapeHtml(maskedCookieHeader || '(空)')}</pre>
  </div>

  <div class="box">
    <h2>2️⃣ 客户端检测结果</h2>
    <p><strong>document.cookie：</strong></p>
    <pre id="client-cookies">(检测中...)</pre>
    <button onclick="refreshClientCookies()">🔄 刷新客户端 Cookie</button>
    <button onclick="sendToProduction()">📤 发送到生产环境</button>
    <div id="send-status" style="margin-top:10px"></div>
  </div>

  <div class="box">
    <h2>3️⃣ 提取的游戏 Cookie</h2>
    <p><strong>标准格式 Cookie：</strong></p>
    <pre id="game-cookies">(尚未提取)</pre>
    <button onclick="extractGameCookies()">🔍 提取游戏 Cookie</button>
  </div>

  <div class="box">
    <h2>4️⃣ 所有请求头</h2>
    <pre>${escapeHtml(JSON.stringify(redactedHeaders, null, 2))}</pre>
  </div>

  <div class="box">
    <h2>5️⃣ 诊断建议</h2>
    <div id="diagnosis"></div>
  </div>

  <script>
    let extractedGameCookies = ''
    const currentSid = ${sid ? `'${sid}'` : 'null'}
    const isSessionMode = !!currentSid
    const maskSecret = (value) => {
      const text = String(value || '')
      if (!text) return ''
      if (text.length <= 8) return '<redacted>'
      return text.slice(0, 4) + '...' + text.slice(-4)
    }
    const maskCookieString = (cookieString) => String(cookieString || '').split(';')
      .map((segment) => {
        const parts = segment.trim().split('=')
        const key = parts.shift()
        if (!key) return ''
        return key + '=' + maskSecret(parts.join('='))
      })
      .filter(Boolean)
      .join('; ')

    function refreshClientCookies() {
      const cookies = document.cookie
      document.getElementById('client-cookies').textContent = maskCookieString(cookies) || '(空)'
      
      // 会话模式下提示
      if (isSessionMode && cookies) {
        // console.log('[Session Mode] 当前会话:', currentSid)
      }
      
      diagnose(${JSON.stringify(Boolean(cookieHeader))}, Boolean(cookies))
    }

    function extractGameCookies() {
      const allCookies = document.cookie
      if (!allCookies) {
        document.getElementById('game-cookies').textContent = '(未找到任何 Cookie)'
        return
      }

      // 解析所有 Cookie
      const pairs = allCookies.split(';').map(pair => pair.trim())
      const cookieMap = {}
      pairs.forEach(pair => {
        const [key, ...valueParts] = pair.split('=')
        if (key) cookieMap[key.trim()] = valueParts.join('=')
      })

      // 提取游戏相关 Cookie（与前端 deriveCore 逻辑一致）
      const gameCookies = []
      const gameKeys = ['game_token', 'game_openid', 'game_gameid', 'game_channelid', 'game_uid', 'game_user_name', 'game_adult_status']
      
      gameKeys.forEach(key => {
        if (cookieMap[key] && cookieMap[key] !== '') {
          gameCookies.push(\`\${key}=\${cookieMap[key]}\`)
        }
      })

      if (gameCookies.length === 0) {
        document.getElementById('game-cookies').textContent = '(未找到游戏相关 Cookie，请确保已登录)'
        extractedGameCookies = ''
        return
      }

      extractedGameCookies = gameCookies.join('; ')
      document.getElementById('game-cookies').textContent = maskCookieString(extractedGameCookies)
    }

    async function sendToProduction() {
      const statusDiv = document.getElementById('send-status')
      
      // 先提取 Cookie
      if (!extractedGameCookies) {
        extractGameCookies()
      }

      if (!extractedGameCookies) {
        statusDiv.innerHTML = '<p class="status error">❌ 未找到有效的游戏 Cookie</p>'
        return
      }

      statusDiv.innerHTML = '<p class="status warning">⏳ 正在发送到生产环境...</p>'

      try {
        // 构造 CallbackAuth 需要的数据结构
        const allCookies = document.cookie
        const pairs = allCookies.split(';').map(pair => pair.trim())
        const cookieMap = {}
        pairs.forEach(pair => {
          const [key, ...valueParts] = pair.split('=')
          if (key) cookieMap[key.trim()] = valueParts.join('=')
        })

        // 构造 derived 数据（从 Cookie 提取）
        // 注意：channelid 需要转为数字类型，与 Bookmarklet 保持一致
        const derived = {
          game_id: cookieMap['game_gameid'] || '29080',
          openid: cookieMap['game_openid'] || '',
          channelid: parseInt(cookieMap['game_channelid']) || 131,
          uid: cookieMap['game_uid'] || '',
          user_name: cookieMap['game_user_name'] || ''
        }

        // 构造 CallbackAuth 期望的数据格式
        const payload = {
          href: window.location.href,
          standardCookie: extractedGameCookies,
          cookie: allCookies,
          ls: {}, // 测试环境没有 localStorage 数据
          derived: derived
        }

        // Base64 编码
        const jsonStr = JSON.stringify(payload)
        const b64 = btoa(unescape(encodeURIComponent(jsonStr)))

  // 发送到生产环境（与默认回调保持一致）
  const productionUrl = 'https://nikke.hayasa.link/#/auth/callback?data=' + encodeURIComponent(b64)
        
        statusDiv.innerHTML = \`
          <p class="status success">✅ 数据已准备完成！</p>
          <p><strong>请点击下方链接跳转到生产环境：</strong></p>
          <p><a href="\${productionUrl}" target="_blank" style="color:#58a6ff;text-decoration:underline">🔗 打开生产环境并导入 Cookie</a></p>
          <p style="font-size:12px;color:#8b949e">提示：链接会在新标签页打开，导入后可直接使用</p>
        \`
      } catch (error) {
        statusDiv.innerHTML = \`<p class="status error">❌ 发送失败: \${error.message}</p>\`
        console.error('发送到生产环境失败:', error)
      }
    }

    function diagnose(serverCookies, clientCookies) {
      const diagDiv = document.getElementById('diagnosis')
      let html = ''

      if (!serverCookies && !clientCookies) {
        html = '<p class="status error">❌ 未检测到任何 Cookie</p>'
        html += '<p>可能原因：</p><ul>'
        html += '<li>尚未完成登录</li>'
        html += '<li>Cookie 被浏览器阻止（隐私设置）</li>'
        html += '<li>Cookie 已过期</li>'
        if (!isSessionMode) {
          html += '<li><strong>路径问题：</strong>游戏 Cookie 可能在会话路径下（/sess/xxx/），根路径读取不到</li>'
        }
        html += '</ul>'
        
        if (!isSessionMode) {
          html += '<p><strong>💡 建议：</strong>如果已经登录，请访问 <code>/sess/{your-sid}/debug/cookies</code> 查看会话 Cookie</p>'
        }
      } else if (!serverCookies && clientCookies) {
        html = '<p class="status warning">⚠️ 客户端有 Cookie，但服务端收不到</p>'
        html += '<p>原因：<strong>跨域请求时浏览器不发送 Cookie</strong></p>'
        html += '<p>解决方案：</p><ul>'
        html += '<li>在浏览器设置中允许第三方 Cookie</li>'
        html += '<li>或将测试页面部署到与 Worker 相同的域名下</li></ul>'
      } else if (serverCookies && clientCookies) {
        html = '<p class="status success">✅ Cookie 正常！服务端和客户端都能读取</p>'
        if (isSessionMode) {
          html += '<p>✅ 会话模式：可以读取 <code>/sess/' + currentSid + '/</code> 路径下的 Cookie</p>'
        }
      } else {
        html = '<p class="status warning">⚠️ 服务端能读到，但客户端读不到</p>'
        html += '<p>可能原因：HttpOnly 标志未正确移除</p>'
      }

      diagDiv.innerHTML = html
    }

    // 自动执行诊断和提取
    refreshClientCookies()
    extractGameCookies()
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...corsHeaders(request.headers.get('Origin')),
      'Cache-Control': 'no-store'
    }
  })
}

async function handleSessionProxy(request, url, sid, tail) {
  const match = tail.match(/^x\/([^\/]+)(?:\/(.*))?$/)
  if (!match) {
    return new Response(JSON.stringify({ error: 'bad session route' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request.headers.get('Origin'))
      }
    })
  }

  let [, key, restPath = ''] = match

  // console.log(`[session-proxy] Initial parse - key: "${key}", restPath: "${restPath}"`)

  // 🎯 SPA Fallback 逻辑：处理前端路由请求
  // 当请求满足以下条件时，返回注入后的 index.html：
  // 1. key === 'site' (访问站点资源)
  // 2. restPath 不匹配静态资源扩展名（.js, .css, .png, .webp, .svg, .woff2, .json 等）
  // 3. restPath 不是 API 调用路径（不包含 'api/' 或 'passport/' 等）
  if (key === 'site' && restPath && request.method === 'GET') {
    const isStaticAsset = /\.(js|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|json|xml|txt|map)$/i.test(restPath)
    const isApiCall = /^(api|passport|auth|sdk|rum|report|lipcommunity|onetrust|community)\//i.test(restPath)

    if (!isStaticAsset && !isApiCall) {
      // console.log(`[spa-fallback] 🔀 Detected SPA route: "${restPath}" → Serving index.html`)

      // 获取 index.html 并注入 helpers
      const upstreamBase = SESSION_TARGETS['site']
      const indexUrl = new URL('/', upstreamBase)

      try {
        const indexResponse = await fetch(indexUrl, {
          method: 'GET',
          headers: {
            'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': request.headers.get('Accept-Language') || 'zh-CN,zh;q=0.9,en;q=0.8'
          }
        })

        if (indexResponse.ok) {
          let html = await indexResponse.text()

          // 🎯 关键修复：必须先重写 URL，再注入 helpers
          // 顺序：URL 重写 → 注入 <base> 和辅助脚本
          html = rewriteTextHostsWithSid(html, sid, true)
          html = injectSessionHelpers(html, sid)

          const headers = new Headers(indexResponse.headers)
          stripSecurityHeaders(headers)
          rewriteSetCookieForSession(headers, sid)
          setCorsOnResponse(headers, request)
          headers.set('Cache-Control', 'no-store')
          headers.set('Content-Type', 'text/html; charset=utf-8')

          // console.log(`[spa-fallback] Served index.html for route "${restPath}"`)
          return new Response(html, {
            status: 200,
            headers
          })
        }
      } catch (error) {
        console.error(`[spa-fallback] ⚠️ Failed to fetch index.html:`, error.message)
        // 继续正常的代理流程
      }
    }
  }

  // 🔧 特殊处理：某些服务的 key 也是 API 路径前缀
  // 这些域名的实际 API 路径会包含与 key 同名的前缀段
  // 例如：api.blablalink.com/api/... 或 li-sg.intlgame.com/account/...
  const needsPathPrefix = ['api', 'account']

  if (needsPathPrefix.includes(key) && restPath && !restPath.startsWith(`${key}/`)) {
    // console.log(`[session-proxy] Adding path prefix: ${key}`)
    restPath = `${key}/${restPath}`
  } else {
    // console.log(`[session-proxy] No path prefix needed. Starts check: ${restPath.startsWith(`${key}/`)}`)
  }

  // 双向路径归位和去重逻辑
  const pathCorrectionMap = {
    // 规则一：site + (api|passport|auth|sdk|rum|report|lipcommunity|onetrust|community)/ → 调整key
    'site': {
      'api': 'api',
      'passport': 'passport',
      'auth': 'auth',
      'sdk': 'sdk',
      'rum': 'rum',
      'report': 'report',
      'lipcommunity': 'lipcommunity',
      'onetrust': 'onetrust',
      'community': 'community'
    },
    // 规则二：key in (passport|auth|sdk|rum|report|lipcommunity|onetrust|Qcommunity) + 同名段/ → 去重
    // 注意：api 和 account 不在此列表中，因为它们的路径本身就包含该前缀
    // 例如：api.blablalink.com/api/... 和 li-sg.intlgame.com/account/...
    'passport': { 'passport': 'passport' },
    'auth': { 'auth': 'auth' },
    'sdk': { 'sdk': 'sdk' },
    'rum': { 'rum': 'rum' },
    'report': { 'report': 'report' },
    'lipcommunity': { 'lipcommunity': 'lipcommunity' },
    'onetrust': { 'onetrust': 'onetrust' },
    'community': { 'community': 'community' }
  }

  // 检查是否需要路径归位
  if (pathCorrectionMap[key] && restPath) {
    for (const [prefix, targetKey] of Object.entries(pathCorrectionMap[key])) {
      if (restPath.startsWith(`${prefix}/`)) {
        // 执行路径归位 - 只去掉外层重复，保留业务前缀
        key = targetKey

        // 智能路径去重：对于所有目标，确保业务前缀不被吞掉
        if (restPath.startsWith(`${prefix}/`)) {
          // 使用正则表达式智能去重，保留业务前缀
          const regex = new RegExp(`^${prefix}\/${prefix}\/`)
          if (regex.test(restPath)) {
            // 从 /prefix/prefix/... 变成 /prefix/...
            restPath = restPath.replace(regex, `${prefix}/`)
          } else {
            // 正常移除重复前缀
            restPath = restPath.substring(prefix.length + 1)
          }
        }

        // console.log(`[session-proxy] Path correction applied: ${targetKey} + ${restPath}`)
        break
      }
    }
  }

  // 额外的路径清理：确保没有连续重复的前缀
  // 注意：排除 api 和 account，因为它们的路径本身就包含该前缀
  const duplicatePrefixes = ['site', 'sdk', 'auth', 'passport', 'rum', 'report', 'lipcommunity', 'onetrust', 'community']
  for (const prefix of duplicatePrefixes) {
    const duplicateRegex = new RegExp(`\/${prefix}\/${prefix}\/`, 'g')
    restPath = restPath.replace(duplicateRegex, `/${prefix}/`)
  }

  const upstreamBase = SESSION_TARGETS[key]
  if (!upstreamBase) {
    return new Response(JSON.stringify({ error: 'unknown upstream target', key }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request.headers.get('Origin'))
      }
    })
  }

  const upstreamUrl = new URL(upstreamBase)
  upstreamUrl.pathname = `/${restPath}`.replace(/\/+/g, '/')
  upstreamUrl.search = url.search

  // ✅ 统一伪装为官网首层来源（关键！）
  const SITE_ORIGIN = 'https://www.blablalink.com'
  const origin = SITE_ORIGIN
  const referer = SITE_ORIGIN + '/'

  // console.log(`[session-proxy] 🔍 REQUEST DETAILS:`)
  // console.log(`[session-proxy]   - Original tail: "${tail}"`)
  // console.log(`[session-proxy]   - Parsed key: "${key}", restPath: "${restPath}"`)
  // console.log(`[session-proxy]   - Final upstream URL: ${upstreamUrl.toString()}`)
  // console.log(`[session-proxy]   - Faked Origin: ${origin}, Referer: ${referer}`)

  let upstreamResponse
  try {
    // 🔧 修复：传入真实目标域名用于 Cookie 过滤，而不是伪装的 Origin
    const forwardInit = await cloneForwardRequest(request, {
      origin,
      referer,
      targetDomain: upstreamUrl.hostname  // 新增：真实目标域名
    })

    // 记录转发请求的详细信息
    // console.log(`[session-proxy] Forwarding request to upstream`)
    // console.log(`[session-proxy] Method: ${forwardInit.method}, URL: ${upstreamUrl.toString()}`)
    // console.log(`[session-proxy] Headers:`, Object.fromEntries(forwardInit.headers))

    upstreamResponse = await fetch(upstreamUrl, forwardInit)

    // 记录上游响应状态
    // console.log(`[session-proxy] 📥 UPSTREAM RESPONSE:`)
    // console.log(`[session-proxy]   - Status: ${upstreamResponse.status} ${upstreamResponse.statusText}`)
    // console.log(`[session-proxy]   - Content-Type: ${upstreamResponse.headers.get('content-type') || 'N/A'}`)
    // console.log(`[session-proxy]   - Set-Cookie count: ${upstreamResponse.headers.get('set-cookie') ? '✅ Has cookies' : '❌ No cookies'}`)

    // 特别检查重定向
    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      const location = upstreamResponse.headers.get('location')
      // console.log(`[session-proxy]   - Redirect Location: ${location || 'N/A'}`)
    }

    if (upstreamResponse.status >= 400) {
      console.error(`[session-proxy] ⚠️ ERROR STATUS ${upstreamResponse.status} for ${upstreamUrl.hostname}${upstreamUrl.pathname}`)
    }

  } catch (error) {
    console.error('session proxy fetch failed', { sid, key, url: upstreamUrl.toString(), error })
    return new Response(JSON.stringify({
      error: 'upstream_fetch_failed',
      message: error?.message || 'session proxy fetch failed'
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request.headers.get('Origin') || '*')
      }
    })
  }

  const headers = new Headers(upstreamResponse.headers)

  // 如果上游返回 3xx 且带 Location，则把 Location 改写进 /sess/{sid}/x/{key}/...
  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
    const loc = upstreamResponse.headers.get('location')
    // console.log(`[redirect] 🔀 Detected ${upstreamResponse.status} redirect`)
    // console.log(`[redirect]   - Original Location: ${loc}`)
    if (loc) {
      try {
        const u = new URL(loc, upstreamUrl) // 兼容相对地址
        // console.log(`[redirect]   - Parsed URL: ${u.toString()}`)
        // console.log(`[redirect]   - Hostname: ${u.hostname}, Pathname: ${u.pathname}`)
        // 把上游 host 映射回会话 key
        let keyForHost = SESSION_HOST_TO_KEY[u.hostname] || key
        // console.log(`[redirect]   - Mapped key: ${keyForHost} (original: ${key})`)

        // 检查重定向路径是否需要归位
        const pathCorrectionMap = {
          'site': {
            'api': 'api',
            'passport': 'passport',
            'auth': 'auth',
            'sdk': 'sdk',
            'rum': 'rum',
            'report': 'report',
            'lipcommunity': 'lipcommunity',
            'onetrust': 'onetrust',
            'community': 'community'
          },
          'api': { 'api': 'api' },
          'passport': { 'passport': 'passport' },
          'auth': { 'auth': 'auth' },
          'sdk': { 'sdk': 'sdk' },
          'rum': { 'rum': 'rum' },
          'report': { 'report': 'report' },
          'lipcommunity': { 'lipcommunity': 'lipcommunity' },
          'onetrust': { 'onetrust': 'onetrust' },
          'community': { 'community': 'community' }
        }

        let redirectPath = u.pathname
        // 对重定向路径应用归位逻辑
        if (pathCorrectionMap[keyForHost] && redirectPath) {
          for (const [prefix, targetKey] of Object.entries(pathCorrectionMap[keyForHost])) {
            if (redirectPath.startsWith(`/${prefix}/`)) {
              keyForHost = targetKey

              // 智能路径去重：使用正则表达式确保业务前缀不被吞掉
              if (redirectPath.startsWith(`/${prefix}/`)) {
                // 使用正则表达式智能去重，保留业务前缀
                const regex = new RegExp(`^\/${prefix}\/${prefix}\/`)
                if (regex.test(redirectPath)) {
                  // 从 /prefix/prefix/... 变成 /prefix/...
                  redirectPath = redirectPath.replace(regex, `/${prefix}/`)
                } else {
                  // 正常移除重复前缀
                  redirectPath = redirectPath.substring(prefix.length + 1)
                }
              }

              // console.log(`[session-proxy] Redirect path correction: ${targetKey} + ${redirectPath}`)
              break
            }
          }
        }

        // 额外的路径清理：确保没有连续重复的前缀
        const duplicatePrefixes = ['api', 'site', 'sdk', 'auth', 'passport', 'rum', 'report', 'lipcommunity', 'onetrust', 'community']
        for (const prefix of duplicatePrefixes) {
          const duplicateRegex = new RegExp(`\/${prefix}\/${prefix}\/`, 'g')
          redirectPath = redirectPath.replace(duplicateRegex, `/${prefix}/`)
        }

        const rewritten = `/sess/${sid}/x/${keyForHost}${redirectPath}${u.search || ''}`
        // console.log(`[redirect]   - Rewritten Location: ${rewritten}`)
        const h = new Headers(upstreamResponse.headers)
        h.set('location', rewritten)
        setCorsOnResponse(h, request)
        stripSecurityHeaders(h)
        h.set('Cache-Control', 'no-store')

        // console.log(`[redirect] ✅ Returning ${upstreamResponse.status} with rewritten Location`)

        // 对307/308状态码保留原方法和body
        if (upstreamResponse.status === 307 || upstreamResponse.status === 308) {
          return new Response(request.body, {
            status: upstreamResponse.status,
            headers: h
          })
        }

        return new Response(null, { status: upstreamResponse.status, headers: h })
      } catch (_) {
        // 如果不是合法URL，就让它照旧返回
      }
    }
  }

  stripSecurityHeaders(headers)
  rewriteSetCookieForSession(headers, sid)
  setCorsOnResponse(headers, request)
  headers.set('Cache-Control', 'no-store')


  const contentType = headers.get('content-type') || ''
  if (TEXT_BODY_REGEX.test(contentType)) {
    const rawText = await upstreamResponse.text()

    // 记录文本响应的关键信息
    // console.log(`[session-proxy] Text response detected, content-type: ${contentType}`)
    // console.log(`[session-proxy] Raw response length: ${rawText.length} chars`)

    // 🩹 路径补丁：修复重复前缀问题（api/api/user/CheckLogin）
    // 这是由于路径处理逻辑在某些情况下会产生重复前缀
    const normalizedRestPath = restPath.replace(/^api\/api\//, 'api/')

    // 🔧 特殊处理1：CheckLogin 初次请求返回假的成功响应
    // 避免页面因为"未登录"而跳转到 404
    // 注意：Content-Type 可能是 text/plain 或 application/json
    const isJsonLike = contentType.includes('application/json') || contentType.includes('text/plain')
    if (isJsonLike && normalizedRestPath === 'api/user/CheckLogin') {
      try {
        const jsonData = JSON.parse(rawText)
        // 如果返回"未登录"错误（code: 300001）
        if (jsonData.code === 300001 || jsonData.msg === 'game not login') {
          // console.log(`[checklogin-bypass] 拦截 CheckLogin 未登录响应`)

          // 返回一个假的"已登录"响应，让页面不跳转
          const fakeResponse = {
            code: 0,
            msg: 'success',
            data: {
              _is_fake: true,  // 标记这是假响应
              _hint: '这是一个临时响应，请先登录'
            }
          }

          return new Response(JSON.stringify(fakeResponse), {
            status: 200,
            headers
          })
        }
      } catch (e) {
        console.error(`[checklogin-bypass] 处理失败:`, e.message)
        // 失败时继续正常流程
      }
    }

    // 🔧 特殊处理2：登录成功后，在响应体中注入加密的 Cookie
    // 这样前端即使跨域也能获取到 Cookie
    if (isJsonLike && normalizedRestPath === 'api/user/Login') {
      try {
        const jsonData = JSON.parse(rawText)
        // 如果登录成功（code === 0），收集 Set-Cookie 并加密注入
        if (jsonData.code === 0) {
          const setCookieHeader = upstreamResponse.headers.get('set-cookie')
          if (setCookieHeader) {
            const cookieList = splitSetCookieHeader(setCookieHeader)
            const cookiePairs = cookieList.map(cookie => {
              const match = cookie.match(/^([^=]+)=([^;]+)/)
              return match ? `${match[1]}=${match[2]}` : ''
            }).filter(Boolean)
            const cookieString = cookiePairs.join('; ')

            // 加密 Cookie 并注入到响应中
            const encryptedCookies = await encryptCookieData(cookieString, sid)
            jsonData._encrypted_cookies = encryptedCookies

            return new Response(JSON.stringify(jsonData), {
              status: upstreamResponse.status,
              headers
            })
          }
        }
      } catch (e) {
        // 失败时继续正常流程
      }
    }

    // 对于API响应，记录关键字段
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(rawText)
        // console.log(`[session-proxy] JSON response:`, { code: jsonData.code, msg: jsonData.msg })
      } catch (e) {
        // 不是有效的JSON，忽略
      }
    }

    // 🔧 关键修复：认证相关的 JSON 响应不改写，直接透传
    // 这些服务的响应包含认证流程的关键数据（token、ticket、跳转URL等）
    // 改写会破坏前端的认证逻辑
    const authServices = ['account', 'auth', 'passport', 'sdk']
    const shouldNotRewrite = authServices.includes(key) && contentType.includes('application/json')

    if (shouldNotRewrite) {
      // console.log(`[session-proxy] Auth service ${key} JSON response - bypassing rewrite`)
      return new Response(rawText, {
        status: upstreamResponse.status,
        headers
      })
    }

    // 🔧 关键修复：HTML 和 JS 使用不同的改写策略
    const isHtml = contentType.includes('text/html')
    const rewritten = rewriteTextHostsWithSid(rawText, sid, isHtml)

    // 🔍 调试：记录 URL 改写情况（生产环境已禁用）
    // if (contentType.includes('javascript')) { ... }
    // if (contentType.includes('text/html')) { ... }

    const finalBody = contentType.includes('text/html') ? injectSessionHelpers(rewritten, sid) : rewritten
    return new Response(finalBody, {
      status: upstreamResponse.status,
      headers
    })
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers
  })
}

function isAllowedCorsOrigin(origin) {
  if (!origin) return false
  try {
    const parsed = new URL(origin)
    const host = parsed.hostname
    if ((host === 'localhost' || host === '127.0.0.1' || host === '::1') &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return true
    }
    if (origin === 'https://small-tailqwq.github.io') return true
    if (origin === 'https://nikke.hayasa.link') return true
    if (parsed.protocol === 'https:' && (host === 'hayasa.org' || host.endsWith('.hayasa.org'))) {
      return true
    }
  } catch {
    return false
  }
  return false
}

// CORS响应头
const corsHeaders = (origin) => {
  const allowOrigin = isAllowedCorsOrigin(origin)
    ? origin
    : 'https://small-tailqwq.github.io'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie, X-Forwarded-Cookie, x-auth-key, x-channel-type, x-language, x-common-params',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '1728000',
    'Vary': 'Origin'
  }
}

// 处理OPTIONS预检
async function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('Origin'))
  })
}

// ==================== BlablaLink API代理处理 ====================

// 🔄 处理Cookie续期请求
// ⚙️  NIKKE CDK – Cloudflare Worker (detailed logs + diff payload)
// 仅列出 handleCookieRenewal；其余逻辑保持不变。

/* 公共工具与 CORS 同之前 —— 省略 */

async function handleCookieRenewal(request) {
  const origin = request.headers.get('Origin') || '*';
  const targetUrl = 'https://api.blablalink.com/api/user/Login';

  try {
    /* 0. 解析请求体 */
    const { cookie: oldCookieString, requestBody } = await request.clone().json();
    // console.log('[renew] ⇢ incoming', JSON.stringify(requestBody));
    if (!oldCookieString || !requestBody) {
      return new Response(JSON.stringify({ success: false, msg: 'missing param' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    }

    /* 1. map 旧 cookie */
    const oldMap = new Map();
    oldCookieString.split(';').forEach(kv => {
      const [k, v] = kv.trim().split('=');
      if (k && v) oldMap.set(k, v);
    });

    /* 2. 请求官方接口 */
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/',
        'X-Channel-Type': '2',
        'X-Language': 'en',
        'Cookie': oldCookieString
      },
      body: JSON.stringify(requestBody)
    });

    const txt = await res.clone().text();
    let data = {}; try { data = JSON.parse(txt); } catch { }
    const setCookies = (typeof res.headers.getAll === 'function') ? res.headers.getAll('set-cookie') : (() => { const sc = res.headers.get('set-cookie'); return sc ? sc.split(/,(?=\w+=)/) : []; })();
    // console.log('[renew] ⇠ http', res.status, 'code', data.code, 'cookies', setCookies.length);
    if (res.status !== 200 || data.code !== 0 || !setCookies.length) {
      return new Response(JSON.stringify({ success: false, msg: 'renew fail', data }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    /* 3. 解析新 cookie */
    const newMap = new Map();
    let maxAge = 0;
    for (const sc of setCookies) {
      const [pair] = sc.split(';'); const [k, v] = pair.split('=');
      newMap.set(k.trim(), v);
      // if (k.trim() === 'game_token') console.log('[renew] ✔ token', v.slice(0, 16) + '...');
      const m = /Max-Age=(\d+)/i.exec(sc); if (m) maxAge = Math.max(maxAge, +m[1]);
    }
    // 合并新旧cookie，优先新
    const mergedMap = new Map([...oldMap, ...newMap]);
    const cookieString = [...mergedMap].map(([k, v]) => `${k}=${v}`).join('; ');
    const expireAt = new Date(Date.now() + maxAge * 1000).toISOString();

    /* 4. 生成 diff */
    const added = [], changed = [], diffDetails = [];
    newMap.forEach((v, k) => {
      if (!oldMap.has(k)) added.push({ key: k, value: v });
      else if (oldMap.get(k) !== v) {
        changed.push(k);
        diffDetails.push({ key: k, old: oldMap.get(k), new: v });
      }
    });
    // console.log('[renew] Δ added', added.map(o => o.key), 'changed', changed, 'unchanged', newMap.size - added.length - changed.length);
    // console.log('[renew] ✔ expireAt', expireAt, '(' + (maxAge / 86400) + 'd)');

    /* 5. 回复前端 */
    const expireDays = maxAge > 0 ? Math.floor(maxAge / 86400) : undefined;
    const hasGameToken = mergedMap.has('game_token');
    const tokenChanged = Boolean(
      oldMap.get('game_token') &&
      mergedMap.get('game_token') &&
      oldMap.get('game_token') !== mergedMap.get('game_token')
    );
    const observedMode = tokenChanged ? 'token-rotated' : 'token-echo';

    return new Response(JSON.stringify({
      success: true,
      message: tokenChanged ? 'Cookie renewed' : 'Cookie rehydrated only',
      data: {
        newCookie: cookieString,
        expireAt,
        maxAge,
        totalCookies: setCookies.length,
        hasGameToken,
        expireDays,
        tokenChanged,
        observedMode,
        added,
        changed: diffDetails
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });

  } catch (err) {
    console.error('[renew] ❌', err);
    return new Response(JSON.stringify({ success: false, msg: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
  }
}

// 其它 handler / router 保持不变




// ==================== 国际服处理逻辑 ====================

// 🌍 处理国际服角色信息获取
async function handleGlobalPlayerInfo(request) {
  const origin = request.headers.get('Origin')
  const targetUrl = `https://api.blablalink.com/api/ugc/direct/standalonesite/User/GetUserGamePlayerInfo`

  try {
    // 解析请求体
    const { cookie, payload } = await request.json()
    if (!cookie || !payload) {
      return new Response(JSON.stringify({
        code: 400,
        msg: 'Missing cookie or payload'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    // 构建代理请求
    const proxyRequest = new Request(targetUrl, {
      method: 'POST',
      headers: {
        ...GLOBAL_HEADERS,
        'Cookie': cookie,
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    // 发送请求并获取响应
    const response = await fetch(proxyRequest)
    const data = await response.text()

    // 返回响应
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin)
      }
    })
  } catch (err) {
    console.error('获取角色信息失败:', err)
    return new Response(JSON.stringify({
      code: 500,
      msg: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

// 🌍 处理国际服区域列表获取
async function handleGlobalRegionList(request) {
  const origin = request.headers.get('Origin')
  const targetUrl = `https://api.blablalink.com/api/lip/direct/commodity/Game/GetRegionList`

  try {
    // 解析请求体
    const { cookie, game_id } = await request.json()
    if (!cookie || !game_id) {
      return new Response(JSON.stringify({
        code: 400,
        msg: 'Missing cookie or game_id'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    // 构建目标URL（使用GET请求）
    const finalUrl = `${targetUrl}?game_id=${game_id}`

    // 🔧 修复：简化请求头，避免可能的无效值
    const safeHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cookie': cookie,
      'Origin': 'https://www.blablalink.com',
      'Referer': 'https://www.blablalink.com/'
    }

    // 构建代理请求
    const proxyRequest = new Request(finalUrl, {
      method: 'GET',
      headers: safeHeaders
    })

    // console.log('[region-list] 请求URL:', finalUrl)
    // console.log('[region-list] 请求头:', JSON.stringify(safeHeaders, null, 2))

    // 发送请求并获取响应
    const response = await fetch(proxyRequest)
    const data = await response.text()

    // console.log('[region-list] 响应状态:', response.status)
    // console.log('[region-list] 响应数据长度:', data.length)

    // 返回响应
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin)
      }
    })
  } catch (err) {
    console.error('[region-list] 错误:', err.message)
    return new Response(JSON.stringify({
      code: 500,
      msg: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

// 🌍 处理国际服CDK兑换
async function handleGlobalCdkExchange(request) {
  const origin = request.headers.get('Origin')
  // 固定映射到实际的游戏服务器路径
  const targetUrl = `https://api.blablalink.com/api/game/proxy/Game/RecordCdkRedemption`

  try {
    // 解析请求体
    const { cdkey, cookie } = await request.json()
    if (!cdkey || !cookie) {
      return new Response(JSON.stringify({
        code: 400,
        msg: 'Missing cdkey or cookie'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    // 构建代理请求
    const proxyRequest = new Request(targetUrl, {
      method: 'POST',
      headers: {
        ...GLOBAL_HEADERS,
        'Cookie': cookie,
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/'
      },
      body: JSON.stringify({ cdkey })
    })

    // 发送请求并获取响应
    const response = await fetch(proxyRequest)
    const data = await response.text()

    // 返回响应
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin)
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({
      code: 500,
      msg: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

async function proxyBlaRequest(request, options) {
  const origin = request.headers.get('Origin')
  const { targetUrl, method = 'GET', defaultPayload = {} } = options

  try {
    const requestData = await request.json()
    const { cookie, payload } = requestData

    if (!cookie) {
      return new Response(
        JSON.stringify({
          code: 400,
          msg: 'Missing cookie',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        }
      )
    }

    const mergedPayload = {
      ...defaultPayload,
      ...(payload || {}),
    }
    const finalUrl = new URL(targetUrl)

    if (method === 'GET') {
      Object.entries(mergedPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          finalUrl.searchParams.set(key, String(value))
        }
      })
    }

    const proxyRequest = new Request(finalUrl.toString(), {
      method,
      headers: {
        ...BLA_HEADERS,
        'Cookie': cookie,
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify(mergedPayload) }),
    })

    const response = await fetch(proxyRequest)
    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin),
      },
    })
  } catch (err) {
    console.error('BlaBla 请求代理失败:', err)
    return new Response(
      JSON.stringify({
        code: 500,
        msg: err.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      }
    )
  }
}

async function handleBlaCheckLogin(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/user/CheckLogin',
    method: 'POST',
  })
}

async function handleBlaTaskList(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/lip/proxy/lipass/Points/GetTaskListWithStatusV2',
    method: 'GET',
    defaultPayload: {
      get_top: 'false',
      intl_game_id: '29080',
    },
  })
}

async function handleBlaDailyCheckin(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/lip/proxy/lipass/Points/DailyCheckIn',
    method: 'POST',
    defaultPayload: {
      task_id: '15',
    },
  })
}

async function handleBlaCompleteTask(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/lip/proxy/lipass/Points/CompleteTaskAddPoint',
    method: 'POST',
    defaultPayload: {
      intl_game_id: '29080',
    },
  })
}

async function handleBlaTotalPoints(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/lip/proxy/lipass/Points/GetUserTotalPoints',
    method: 'GET',
  })
}

async function handleBlaRoleInfo(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/game/proxy/Game/GetSavedRoleInfo',
    method: 'POST',
    defaultPayload: {},
  })
}

async function handleBlaCommodityList(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/lip/proxy/commodity/Commodity/GetUserCommodityList',
    method: 'POST',
    defaultPayload: {
      page_num: 1,
      page_size: 20,
      game_id_list: ['29080'],
      is_bind_lip: true,
    },
  })
}

async function handleBlaExchangeCommodity(request) {
  return proxyBlaRequest(request, {
    targetUrl: 'https://api.blablalink.com/api/lip/proxy/commodity/Commodity/ExchangeCommodity',
    method: 'POST',
  })
}

// 🌍 处理国际服兑换历史
async function handleGlobalHistory(request) {
  const origin = request.headers.get('Origin')
  // 固定映射到实际的游戏服务器路径
  const targetUrl = `https://api.blablalink.com/api/game/proxy/Game/GetCdkRedemptionHistory`

  try {
    // 解析请求体
    const requestData = await request.json()
    const { cookie, page_num, page_size } = requestData

    if (!cookie) {
      return new Response(JSON.stringify({
        code: 400,
        msg: 'Missing cookie'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      })
    }

    // 构建请求体，包含分页参数
    const requestBody = {
      // 如果前端提供了分页参数，则使用它们
      page_num: page_num || 1,
      page_size: page_size || 20
    }

    // 构建代理请求
    const proxyRequest = new Request(targetUrl, {
      method: 'POST',
      headers: {
        ...GLOBAL_HEADERS,
        'Cookie': cookie,
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/'
      },
      body: JSON.stringify(requestBody)
    })

    // 发送请求并获取响应
    const response = await fetch(proxyRequest)
    const data = await response.text()

    // 返回响应
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin)
      }
    })
  } catch (err) {
    console.error('处理历史记录请求失败:', err)
    return new Response(JSON.stringify({
      code: 500,
      msg: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

// ==================== 国服处理逻辑 ====================

// 🔐 获取国服验证码
async function handleCnGetCaptcha(request) {
  const origin = request.headers.get('Origin')
  const url = new URL(request.url)
  const aid = url.searchParams.get('aid')

  if (!aid) {
    return new Response(JSON.stringify({
      success: false,
      message: '缺少aid参数'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }

  try {
    // 获取验证码图片
    const captchaResponse = await fetch(`${CN_ENDPOINTS.CAPTCHA}?aid=${aid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://nikke.qq.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    })

    if (!captchaResponse.ok) {
      throw new Error(`验证码获取失败: ${captchaResponse.status}`)
    }

    // 🚀 优化图片处理：使用更高效的Base64转换
    const captchaData = await captchaResponse.arrayBuffer()
    const uint8Array = new Uint8Array(captchaData)

    // 使用更高效的Base64转换方法
    let binaryString = ''
    const chunkSize = 1024
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize)
      binaryString += String.fromCharCode.apply(null, chunk)
    }
    const captchaBase64 = btoa(binaryString)

    // 🚀 优化Cookie提取：使用更简洁的正则表达式
    const setCookieHeader = captchaResponse.headers.get('set-cookie')
    const verifysession = setCookieHeader?.match(/verifysession=([^;]+)/)?.[1] || null

    return new Response(JSON.stringify({
      success: true,
      captchaUrl: `data:image/jpeg;base64,${captchaBase64}`,
      aid: aid,
      verifysession: verifysession
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })

  } catch (error) {
    console.error('获取验证码失败:', error)
    return new Response(JSON.stringify({
      success: false,
      message: error.message || '获取验证码失败'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}







// 🎮 处理国服CDK兑换
async function handleCnCdkExchange(request) {
  const origin = request.headers.get('Origin')

  try {
    const exchangeData = await request.json()

    // 验证必需参数
    const requiredParams = ['sPassword', 'sCode', 'role_id', 'area_id']
    for (const param of requiredParams) {
      if (!exchangeData[param]) {
        return new Response(JSON.stringify({
          success: false,
          message: `缺少必需参数: ${param}`
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        })
      }
    }

    // 🚀 性能优化：使用固定的已知有效参数，避免每次动态获取
    exchangeData.iChartId = exchangeData.iChartId || "372756"
    exchangeData.iSubChartId = exchangeData.iSubChartId || "372756"
    exchangeData.sIdeToken = exchangeData.sIdeToken || "0HzkLt"

    // 解析游戏参数
    let gameParams = {}
    if (exchangeData.cookie) {
      try {
        gameParams = JSON.parse(exchangeData.cookie)
      } catch (error) {
        console.error('解析游戏参数失败:', error)
      }
    }

    // 构建表单数据 - 确保参数顺序和格式与成功请求一致
    const formData = new URLSearchParams()

    // 按照真实请求的参数顺序添加
    const orderedParams = [
      'iChartId', 'iSubChartId', 'sIdeToken', 'gameid', 'os', 'channelid', 'seq', 'ts', 'version', 'source',
      'sig', 'itopencodeparam', 'sPassword', 'sCode', 'sPlatId', 'sArea', 'encodeparam', 'sPartition',
      'sRoleId', 'role_id', 'role_name', 'area_id', 'zone_id', 'lang_type', 'algorithm', 'encode', 'nickname'
    ]

    // 首先添加有序参数
    orderedParams.forEach(key => {
      if (exchangeData[key] !== null && exchangeData[key] !== undefined) {
        formData.append(key, String(exchangeData[key]))
      }
    })

    // 然后添加其他参数（除了内部使用的字段）
    Object.entries(exchangeData).forEach(([key, value]) => {
      if (!orderedParams.includes(key) &&
        key !== 'verifysession' && key !== 'cookie' &&
        value !== null && value !== undefined) {
        formData.append(key, String(value))
      }
    })

    // 🚀 简化Cookie构建 - 只使用必要的验证信息
    let cookieHeader = ''
    if (exchangeData.verifysession) {
      cookieHeader = `verifysession=${exchangeData.verifysession}`
    }

    // 发送CDK兑换请求 - 模拟完整的浏览器请求
    const exchangeResponse = await fetch(CN_ENDPOINTS.CDK_EXCHANGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'Origin': 'https://nikke.qq.com',
        'Referer': 'https://nikke.qq.com/',
        'Sec-Ch-Ua': '"Microsoft Edge WebView2";v="137", "Microsoft Edge";v="137", "Not/A)Brand";v="24", "Chromium";v="137"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Priority': 'u=1, i',
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
      },
      body: formData.toString()
    })

    if (!exchangeResponse.ok) {
      throw new Error(`请求失败: ${exchangeResponse.status}`)
    }

    const result = await exchangeResponse.json()

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })

  } catch (error) {
    console.error('CDK兑换失败:', error)
    return new Response(JSON.stringify({
      success: false,
      message: error.message || '兑换请求失败'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

const CAPTCHA_JS_URL = 'https://global.captcha.gtimg.com/TCaptcha-global.js'
const CAPTCHA_CACHE_TTL = 3600000
let captchaIntegrityCache = null
let captchaIntegrityTime = 0

async function handleCaptchaIntegrity(request, env) {
  const now = Date.now()
  if (captchaIntegrityCache && now - captchaIntegrityTime < CAPTCHA_CACHE_TTL) {
    return new Response(JSON.stringify(captchaIntegrityCache), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin')) }
    })
  }

  try {
    const resp = await fetch(CAPTCHA_JS_URL)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const jsBuffer = await resp.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-384', jsBuffer)
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

    captchaIntegrityCache = { url: CAPTCHA_JS_URL, integrity: 'sha384-' + hashBase64 }
    captchaIntegrityTime = now
  } catch (e) {
    return new Response(JSON.stringify({ url: '', integrity: '' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin')) }
    })
  }

  return new Response(JSON.stringify(captchaIntegrityCache), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request.headers.get('Origin')) }
  })
}

// ==================== 主路由处理 ====================

// 🎯 Worker入口点
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    let path = url.pathname
    const method = request.method

    // 获取 KV namespace（用于令牌存储）
    const tokenKV = env.TOKEN_KV

    // 处理OPTIONS预检
    if (method === 'OPTIONS') {
      return handleOptions(request)
    }

    if (path.startsWith('/sess/')) {
      const normalized = normalizeSessionPath(path)
      if (normalized !== path) {
        path = normalized
        url.pathname = normalized
      }
    }

    // 🔧 特殊路由优先处理（在会话路由之前）
    // Cookie 检查接口: /sess/{sid}/check-cookie
    if (/^\/sess\/[^\/]+\/check-cookie$/.test(path) && method === 'GET') {
      const checkMatch = path.match(/^\/sess\/([^\/]+)\/check-cookie$/)
      if (checkMatch && SESSION_ID_PATTERN.test(checkMatch[1])) {
        // console.log(`[routing] ✅ Matched: check-cookie for sid=${checkMatch[1]}`)
        return handleCheckProxyLoginCookie(request, checkMatch[1], tokenKV)
      }
      return new Response('Invalid SID', { status: 400 })
    }

    // Debug cookies 页面: /sess/{sid}/debug/cookies
    if (/^\/sess\/[^\/]+\/debug\/cookies$/.test(path) && method === 'GET') {
      const debugMatch = path.match(/^\/sess\/([^\/]+)\/debug\/cookies$/)
      if (debugMatch && SESSION_ID_PATTERN.test(debugMatch[1])) {
        // console.log(`[routing] ✅ Matched: debug/cookies for sid=${debugMatch[1]}`)
        return handleCookieDebugPage(request, debugMatch[1])
      }
      return new Response('Invalid SID', { status: 400 })
    }

    // 会话镜像路由
    const sessionInfo = extractSessionInfo(path)
    // console.log(`[routing] 尝试提取会话信息 path="${path}"`)
    // console.log(`[routing] extractSessionInfo 返回:`, sessionInfo)
    if (sessionInfo) {
      const { sid, tail } = sessionInfo
      // console.log(`[routing] SessionInfo - sid: ${sid}, tail: "${tail}", method: ${method}`)
      // console.log('[routing] ➡️ Fallback to session proxy')
      return handleSessionProxy(request, url, sid, tail)
    }

    // 处理来自测试环境的请求（兜底逻辑）
    if (path.startsWith('/sess/') && path.includes('/x/')) {
      // 提取会话ID和路径
      const sessMatch = path.match(/\/sess\/([^\/]+)\/x\/(.+)/)
      if (sessMatch) {
        const [, sid, restPath] = sessMatch
        // console.log(`[fallback-routing] Matched sess pattern: sid=${sid}, restPath="${restPath}"`)

        return handleSessionProxy(request, url, sid, `x/${restPath}`)
      }
    }

    // 路由分发
    switch (true) {
      // ==================== 官方代理登录 ====================

      // 登录入口页面: /login?sid=xxx
      case path === '/login' && method === 'GET':
        const loginSid = url.searchParams.get('sid')
        if (!loginSid || !SESSION_ID_PATTERN.test(loginSid)) {
          return new Response('Invalid SID', { status: 400 })
        }
        return handleProxyLoginEntrance(request, loginSid)

      // ==================== 诊断工具 ====================

      // Cookie 诊断页面（根路径访问）
      case path === '/debug/cookies' && method === 'GET':
        return handleCookieDebugPage(request, null)

      // ==================== 国际服路由 ====================

      // 国际服CDK兑换
      case path === '/global/exchange' && method === 'POST':
        return handleGlobalCdkExchange(request)

      // 国际服兑换历史
      case path === '/global/history' && method === 'POST':
        return handleGlobalHistory(request)

      // 国际服角色信息获取
      case path === '/global/player-info' && method === 'POST':
        return handleGlobalPlayerInfo(request)

      // 国际服区域列表获取
      case path === '/global/region-list' && method === 'POST':
        return handleGlobalRegionList(request)

      // Cookie续期
      case path === '/global/cookie-renewal' && method === 'POST':
        return handleCookieRenewal(request)

      // BlaBla 任务代理
      case path === '/global/bla/check-login' && method === 'POST':
        return handleBlaCheckLogin(request)
      case path === '/global/bla/task-list' && method === 'POST':
        return handleBlaTaskList(request)
      case path === '/global/bla/daily-checkin' && method === 'POST':
        return handleBlaDailyCheckin(request)
      case path === '/global/bla/complete-task' && method === 'POST':
        return handleBlaCompleteTask(request)
      case path === '/global/bla/total-points' && method === 'POST':
        return handleBlaTotalPoints(request)
      case path === '/global/bla/role-info' && method === 'POST':
        return handleBlaRoleInfo(request)
      case path === '/global/bla/commodity-list' && method === 'POST':
        return handleBlaCommodityList(request)
      case path === '/global/bla/exchange-commodity' && method === 'POST':
        return handleBlaExchangeCommodity(request)

      // ==================== 国服路由 ====================

      // 获取验证码
      case path === '/cn/captcha' && method === 'GET':
        return handleCnGetCaptcha(request)



      // 国服CDK兑换
      case path === '/cn/cdk/exchange' && method === 'POST':
        return handleCnCdkExchange(request)

      // ==================== 安全令牌认证 ====================

      // ==================== 登录桥接 ====================

      // 🔑 邮箱密码登录
      case path === '/api/login' && method === 'POST':
        return handleDirectLogin(request, env)

      // 验证码完整性校验（防止CDN投毒）
      case path === '/api/captcha-integrity' && method === 'GET':
        return handleCaptchaIntegrity(request, env)

      // ==================== 安全令牌认证 ====================

      // 🔐 安全令牌认证数据获取
      case path === '/api/auth/token-data' && method === 'POST':
        return handleTokenAuthData(request, tokenKV)

      // 根路径健康检查
      case path === '/' && method === 'GET':
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'NIKKE CDK Combined Worker is running',
          services: {
            global: 'International server CDK exchange and player info',
            cn: 'Chinese server CDK exchange with captcha support'
          },
          endpoints: {
            global_exchange: '/global/exchange (CDK兑换)',
            global_history: '/global/history (兑换历史)',
            global_player_info: '/global/player-info (角色信息)',
            global_region_list: '/global/region-list (服务器区域)',
            global_cookie_renewal: '/global/cookie-renewal (Cookie续期)',
            cn_captcha: '/cn/captcha',
            cn_exchange: '/cn/cdk/exchange',
          },
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request.headers.get('Origin'))
          }
        })

      // 通用健康检查
      case path === '/health' && method === 'GET':
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'Combined NIKKE CDK Worker is healthy',
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request.headers.get('Origin'))
          }
        })

      // ==================== 根路径兜底反代 ====================

      // 兜底处理：将根路径静态资源代理到上游站点
      case path.startsWith('/') && method === 'GET' && !path.includes('/api/') && !path.includes('/global/') && !path.includes('/cn/'):
        try {
          // 只处理常见的静态资源类型
          const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map']
          const isStaticResource = staticExtensions.some(ext => path.endsWith(ext))

          if (isStaticResource) {
            const upstreamUrl = `https://www.blablalink.com${path}`
            const resourceResponse = await fetch(upstreamUrl, {
              method: 'GET',
              headers: {
                'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
                'Accept': request.headers.get('Accept') || '*/*',
                'Accept-Encoding': 'gzip, deflate, br'
              }
            })

            if (resourceResponse.ok) {
              const headers = new Headers(resourceResponse.headers)
              stripSecurityHeaders(headers)
              setCorsOnResponse(headers, request)

              return new Response(resourceResponse.body, {
                status: resourceResponse.status,
                headers
              })
            }
          }
        } catch (error) {
          console.warn('静态资源代理失败:', error.message)
          // 继续执行到404处理
        }

      // ==================== 404处理 ====================

      default:
        return new Response(JSON.stringify({
          error: 'Not Found',
          message: '请求的端点不存在',
          path: path,
          method: method,
          available_endpoints: [
            'POST /global/exchange (国际服CDK兑换)',
            'POST /global/history (国际服兑换历史)',
            'POST /global/player-info (国际服角色信息获取)',
            'POST /global/region-list (国际服服务器区域列表)',
            'POST /global/cookie-renewal (国际服Cookie续期)',
            'POST /global/check-login (国际服登录状态检查)',
            'GET /cn/captcha?aid=xxx (国服验证码获取)',
            'POST /cn/cdk/exchange (国服CDK兑换)',
            'POST /cn/log (国服日志记录)',
            'GET /cn/health (国服健康检查)',
            'GET /health (通用健康检查)',
            'GET / (根路径健康检查)',
            'GET /login?sid=xxx (官方登录助手)',
            'GET /sess/{sid}/check-cookie (检测登录Cookie)',
            'GET /sess/{sid}/debug/cookies (Cookie诊断页面)',
            'GET /sess/{sid}/x/{service}/... (会话镜像代理)',
            'POST /api/login (邮箱密码直接登录)',
            'GET /api/captcha-integrity (验证码完整性校验)',
            'POST /api/auth/token-data (安全令牌认证)'
          ]
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request.headers.get('Origin'))
}
      })
    }
  }
} 

