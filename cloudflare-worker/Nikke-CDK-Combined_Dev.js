// 🌍🇨🇳 NIKKE CDK工具 - 统一Cloudflare Worker
// 同时支持国际服和国服CDK兑换功能

// 国际服固定请求头
const GLOBAL_HEADERS = {
  'x-channel-type': '2',
  'x-language': 'en',
  'x-common-params': '{"game_id":"16","area_id":"global","source":"pc_web","intl_game_id":"29080","language":"en","env":"prod"}'
}

// 国服API端点
const CN_ENDPOINTS = {
  CDK_EXCHANGE: 'https://x8m8.ams.game.qq.com/ide/',
  CAPTCHA: 'https://ssl.captcha.qq.com/getimage',
  LOG: 'https://ams.game.qq.com/log'
}

// 生成请求ID的辅助函数
function generateReqId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// CORS响应头
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie, X-Forwarded-Cookie, x-auth-key, x-channel-type, x-language, x-common-params',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '1728000'
})

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
    console.log('[renew] ⇢ incoming', JSON.stringify(requestBody));
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
    console.log('[renew] ⇠ http', res.status, 'code', data.code, 'cookies', setCookies.length);
    if (res.status !== 200 || data.code !== 0 || !setCookies.length) {
      return new Response(JSON.stringify({ success: false, msg: 'renew fail', data }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    /* 3. 解析新 cookie */
    const newMap = new Map();
    let maxAge = 0;
    for (const sc of setCookies) {
      const [pair] = sc.split(';'); const [k, v] = pair.split('=');
      newMap.set(k.trim(), v);
      if (k.trim() === 'game_token') console.log('[renew] ✔ token', v.slice(0, 16) + '...');
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
    console.log('[renew] Δ added', added.map(o => o.key), 'changed', changed, 'unchanged', newMap.size - added.length - changed.length);
    console.log('[renew] ✔ expireAt', expireAt, '(' + (maxAge / 86400) + 'd)');

    /* 5. 回复前端 */
    const expireDays = maxAge > 0 ? Math.floor(maxAge / 86400) : undefined;
    const hasGameToken = mergedMap.has('game_token');

    return new Response(JSON.stringify({
      success: true,
      message: 'Cookie renewed',
      data: {
        newCookie: cookieString,
        expireAt,
        maxAge,
        totalCookies: setCookies.length,
        hasGameToken,
        expireDays,
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

    // 构建代理请求
    const proxyRequest = new Request(finalUrl, {
      method: 'GET',
      headers: {
        ...GLOBAL_HEADERS,
        'Cookie': cookie,
        'Origin': 'https://www.blablalink.com',
        'Referer': 'https://www.blablalink.com/'
      }
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
    console.error('获取区域列表失败:', err)
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

// 📊 处理国服日志记录
async function handleCnLogging(request) {
  const origin = request.headers.get('Origin')

  try {
    const logData = await request.json()

    // 发送日志到国服服务器 (模拟原始行为)
    const logResponse = await fetch(`${CN_ENDPOINTS.LOG}?sCloudApiName=atm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
        'Origin': 'https://nikke.qq.com',
        'Referer': 'https://nikke.qq.com/'
      },
      body: JSON.stringify(logData)
    })

    const result = await logResponse.json()

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })

  } catch (error) {
    console.error('日志记录失败:', error)
    return new Response(JSON.stringify({
      success: true,
      message: 'Log ignored'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

// ==================== 主路由处理 ====================

// 🎯 Worker入口点
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // 处理OPTIONS预检
    if (method === 'OPTIONS') {
      return handleOptions(request)
    }

    // 路由分发
    switch (true) {
      // ==================== 国际服路由 ====================

      // 国际服CDK兑换 (简化路径 - 支持/api前缀和无前缀)
      case path === '/global/exchange' && method === 'POST':
        return handleGlobalCdkExchange(request)
      case path === '/api/global/exchange' && method === 'POST':
        return handleGlobalCdkExchange(request)

      // 国际服兑换历史 (简化路径 - 支持/api前缀和无前缀)
      case path === '/global/history' && method === 'POST':
        return handleGlobalHistory(request)
      case path === '/api/global/history' && method === 'POST':
        return handleGlobalHistory(request)

      // 国际服角色信息获取 (新增)
      case path === '/global/player-info' && method === 'POST':
        return handleGlobalPlayerInfo(request)
      case path === '/api/global/player-info' && method === 'POST':
        return handleGlobalPlayerInfo(request)

      // 国际服区域列表获取 (新增)
      case path === '/global/region-list' && method === 'POST':
        return handleGlobalRegionList(request)
      case path === '/api/global/region-list' && method === 'POST':
        return handleGlobalRegionList(request)

      // Cookie续期 (新增)
      case path === '/global/cookie-renewal' && method === 'POST':
        return handleCookieRenewal(request)
      case path === '/api/global/cookie-renewal' && method === 'POST':
        return handleCookieRenewal(request)

      // 向后兼容：保留原有复杂路径
      case path === '/api/game/proxy/Game/RecordCdkRedemption' && method === 'POST':
        return handleGlobalCdkExchange(request)

      case path === '/api/game/proxy/Game/GetCdkRedemptionHistory' && method === 'POST':
        return handleGlobalHistory(request)

      // ==================== 国服路由 ====================

      // 获取验证码
      case path === '/cn/captcha' && method === 'GET':
        return handleCnGetCaptcha(request)



      // 国服CDK兑换
      case path === '/cn/cdk/exchange' && method === 'POST':
        return handleCnCdkExchange(request)

      // 日志记录
      case path === '/cn/log' && method === 'POST':
        return handleCnLogging(request)

      // 国服健康检查
      case path === '/cn/health' && method === 'GET':
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'NIKKE CN CDK Worker is running',
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request.headers.get('Origin'))
          }
        })



      // ==================== 通用路由 ====================

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
            cn_log: '/cn/log',
            cn_health: '/cn/health',

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

      // ==================== 404处理 ====================

      default:
        return new Response(JSON.stringify({
          error: 'Not Found',
          message: '请求的端点不存在',
          available_endpoints: [
            'POST /global/exchange (国际服CDK兑换 - 推荐)',
            'POST /global/history (国际服兑换历史 - 推荐)',
            'POST /global/player-info (国际服角色信息获取 - 新增)',
            'POST /global/region-list (国际服服务器区域列表 - 新增)',
            'POST /global/cookie-renewal (国际服Cookie续期 - 新增)',
            'POST /api/game/proxy/Game/RecordCdkRedemption (国际服CDK兑换 - 向后兼容)',
            'POST /api/game/proxy/Game/GetCdkRedemptionHistory (国际服兑换历史 - 向后兼容)',
            'GET /cn/captcha?aid=xxx (国服验证码获取)',

            'POST /cn/cdk/exchange (国服CDK兑换)',
            'POST /cn/log (国服日志记录)',
            'GET /cn/health (国服健康检查)',
            'GET /health (通用健康检查)',

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