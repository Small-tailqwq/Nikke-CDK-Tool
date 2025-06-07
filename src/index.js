// 固定请求头
const FIXED_HEADERS = {
  'Content-Type': 'application/json',
  'x-channel-type': '2',
  'x-language': 'en',
  'x-common-params': '{"game_id":"16","area_id":"global","source":"pc_web","intl_game_id":"29080","language":"en","env":"prod"}'
}

// CORS响应头
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie, x-channel-type, x-language, x-common-params',
  'Access-Control-Max-Age': '1728000'
})

// 处理OPTIONS预检
async function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('Origin'))
  })
}

// 处理POST请求
async function handlePost(request) {
  const origin = request.headers.get('Origin')
  const url = new URL(request.url)
  const targetUrl = `https://api.blablalink.com${url.pathname}${url.search}`
  
  try {
    // 解析请求体
    const { cdkey, cookie } = await request.json()
    if (!cdkey || !cookie) {
      return new Response(JSON.stringify({ code: 400, msg: 'Missing cdkey or cookie' }), {
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
        ...FIXED_HEADERS,
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
    return new Response(JSON.stringify({ code: 500, msg: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin)
      }
    })
  }
}

// Worker入口
export default {
  async fetch(request, env, ctx) {
    // 只允许POST和OPTIONS
    if (request.method === 'OPTIONS') {
      return handleOptions(request)
    }
    if (request.method === 'POST') {
      return handlePost(request)
    }
    
    return new Response('Method Not Allowed', { status: 405 })
  }
} 