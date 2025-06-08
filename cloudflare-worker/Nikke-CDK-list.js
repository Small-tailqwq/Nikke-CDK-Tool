// ------------- 配置 -------------
const GITHUB_RAW = 'https://raw.githubusercontent.com/Small-tailqwq/Nikke-CDK-Tool/masrer/public/cdk-list.json';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// ------------- 工具函数 -------------
function jsonResp(body, extra = {}) {
  return new Response(body, {
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

async function fetchAndCache(kv) {
  const res = await fetch(GITHUB_RAW, { cf: { cacheTtl: 86400 } }); // → edge cache
  if (!res.ok) throw new Error('GitHub fetch failed ' + res.status);
  const text = await res.text();
  await kv.put('latest', text, { expirationTtl: 3600 });             // KV 1 h
  return jsonResp(text);
}

// ------------- Worker 入口 -------------
export default {
  /** @param {Request} request @param {Env} env @param {ExecutionContext} ctx */
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    // --- CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // --- 公告 JSON ---------------------------------------------------------
    if (pathname === '/api/') {
      // ① 先读 KV
      const kvSnap = await env.CDK_JSON.get('latest');
      if (kvSnap) {
        // 后台异步刷新，不阻塞响应
        ctx.waitUntil(fetchAndCache(env.CDK_JSON).catch(() => {}));
        return jsonResp(kvSnap);
      }
      // ② KV 为空 → 回源 GitHub
      return fetchAndCache(env.CDK_JSON);
    }

    // --- 手动刷新钩子（GitHub Action 调用） -------------------------------
    if (pathname === '/api/refresh' && request.method === 'POST') {
      if (request.headers.get('x-auth-key') !== env.REFRESH_KEY)
        return new Response('Forbidden', { status: 403 });

      try {
        await fetchAndCache(env.CDK_JSON);
        return new Response('OK');
      } catch (e) {
        return new Response('Fail ' + e.message, { status: 500 });
      }
    }

    // --- 其他路径
    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Cloudflare Env interface (仅供 TypeScript 提示，可省略)
 * @typedef {Object} Env
 * @property {KVNamespace} CDK_JSON
 * @property {string} REFRESH_KEY
 */
