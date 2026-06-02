/**
 * NIKKE CDK Tool - Login Bridge Server
 *
 * 用 Puppeteer + LI Pass SDK 从邮箱密码直接获取登录 cookie。
 * 作为独立 Node.js 服务运行，供 Cloudflare Worker 转发调用。
 *
 * 用法: node _research/scripts/login-server.mjs [--port=3456]
 */

import express from 'express';
import puppeteer from 'puppeteer';

const PORT = parseInt(process.env.LOGIN_SERVER_PORT || process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '3456', 10);
const LOGIN_PAGE = 'https://www.blablalink.com/login';

const app = express();
app.use(express.json());

// ──── Helpers ──────────────────────────────────────────────────
function json(res, data, status = 200) {
  res.status(status).json(data);
}

function ok(res, data) {
  json(res, { code: 0, ...data });
}

function fail(res, msg, status = 400) {
  json(res, { code: -1, message: msg }, status);
}

// ──── Config ────────────────────────────────────────────────────
const BROWSER_CONFIG = {
  headless: false,           // 保持可见以利于验证码无感通过
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--window-size=1280,800',
  ],
  defaultViewport: { width: 1280, height: 800 },
  ignoreHTTPSErrors: true,
};

/**
 * 从浏览器页面提取登录后 cookie
 * blablalink.com 的 cookie 格式: game_token=xxx; game_openid=xxx; ...
 */
async function extractCookies(page) {
  return page.evaluate(() => {
    const items = [];
    const cookieStr = document.cookie;
    if (cookieStr) {
      items.push(cookieStr);
    }

    // 从 localStorage 提取 lip-user-info
    try {
      const lipInfo = JSON.parse(localStorage.getItem('lip-user-info') || 'null');
      if (lipInfo) {
        const c = lipInfo.channel_info || {};
        let extra = lipInfo.extra_json || {};
        if (typeof extra === 'string') {
          try { extra = JSON.parse(extra); } catch { extra = {}; }
        }
        const notify = extra.need_notify_rsp || {};
        const parts = [];
        parts.push(`game_adult_status=1`);
        parts.push(`game_channelid=${c.channelId || c.channel_id || ''}`);
        parts.push(`game_gameid=29080`);
        parts.push(`game_login_game=0`);
        parts.push(`game_openid=${lipInfo.openid || c.openid || ''}`);
        parts.push(`game_token=${lipInfo.token || c.token || ''}`);
        parts.push(`game_uid=${notify.game_sacc_uid || notify.li_uid || c.openid || lipInfo.uid || ''}`);
        parts.push(`game_user_name=${lipInfo.user_name || ''}`);
        items.push(parts.join(';'));
      }
    } catch (e) {
      // ignore
    }

    return items.join('; ') || null;
  });
}

/**
 * 拦截 SDK 的登录请求，捕获返回的 token
 */
async function setupLoginInterceptor(page) {
  return page.evaluateOnNewDocument(() => {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._xhrUrl = typeof url === 'string' ? url : url?.url || '';
      return origOpen.apply(this, arguments);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      if (this._xhrUrl && this._xhrUrl.includes('li-sg.intlgame.com/account/login')) {
        this.addEventListener('load', function () {
          try {
            const resp = JSON.parse(this.responseText);
            window.__loginResponse = { ...resp, url: this._xhrUrl };
          } catch (e) {
            window.__loginResponse = { error: e.message };
          }
        });
      }
      return origSend.apply(this, arguments);
    };
  });
}

// ──── Browser Pool ─────────────────────────────────────────────
let browser = null;
let browserPage = null;

async function getBrowser() {
  if (browser?.isConnected()) return browser;
  browser = await puppeteer.launch(BROWSER_CONFIG);
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  });
  browserPage = page;
  return browser;
}

// ──── Login Flow ────────────────────────────────────────────────
async function doLogin(email, password) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    // Intercept login response
    await setupLoginInterceptor(page);

    // Navigate to login page
    console.log('[login-server] Navigating to login page...');
    await page.goto(LOGIN_PAGE, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for LI Pass SDK to be ready (PassFactory.Pass available)
    console.log('[login-server] Waiting for LI Pass SDK...');
    await page.waitForFunction(
      () => window.PassFactory && window.PassFactory.Pass,
      { timeout: 20000 }
    );

    // Initialize LI Pass and authClient
    console.log('[login-server] Initializing auth client...');
    const authResult = await page.evaluate(
      async (email, plainPassword) => {
        try {
          const Pass = window.PassFactory.Pass;
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
            config: { isMobile: true },
          });

          window.__pass = pass;
          const authClient = await pass.getAuthClient();
          window.__auth = authClient;

          // The SDK hashes the plain password before sending /account/login.
          try {
            const result = await authClient.signIn({ account: email, password: plainPassword, account_type: 1 });
            return { signInResult: result };
          } catch (e) {
            // signIn might throw because it triggers a redirect, but the login might still work
            return { signInError: e.message?.substring(0, 200) };
          }
        } catch (e) {
          return { error: e.message };
        }
      },
      email,
      password
    );

    console.log('[login-server] Auth result:', JSON.stringify({ ...authResult, signInResult: authResult?.signInResult ? { ret: authResult.signInResult.ret, hasToken: Boolean(authResult.signInResult.token) } : undefined }).substring(0, 500));

    // Wait for login to complete - either page redirects or cookies are set
    try {
      await page.waitForFunction(
        () => {
          const woke = window.__loginResponse && window.__loginResponse.ret === 0;
          const las = JSON.parse(localStorage.getItem('lip-user-info') || 'null');
          return woke || (las && las.token);
        },
        { timeout: 30000 }
      );
    } catch (e) {
      console.log('[login-server] Timeout waiting for login, checking page state...');
    }

    // Check login response
    const loginResp = await page.evaluate(() => window.__loginResponse);
    console.log('[login-server] Login response: ret=' + loginResp?.ret + ' hasToken=' + Boolean(loginResp?.token));

    // Check page URL (redirected means success)
    const currentUrl = page.url();
    console.log('[login-server] Current URL:', currentUrl);

    // Extract cookies
    const cookies = await extractCookies(page);
    console.log('[login-server] Cookies: hasGameToken=' + Boolean(cookies?.includes('game_token=')) + ' length=' + (cookies?.length ?? 0));

    // Get additional info from localStorage
    const userInfo = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('lip-user-info') || 'null');
      } catch { return null; }
    });

    if (loginResp?.ret === 0 || (userInfo && userInfo.token)) {
      await page.close();
      return {
        success: true,
        hasToken: true,
        uid: loginResp?.uid || userInfo?.channel_info?.openid,
        serverType: 'global',
      };
    }

    await page.close();
    return {
      success: false,
      message: 'Login failed: no valid token or cookie found',
      loginResponse: loginResp,
      currentUrl,
    };
  } catch (e) {
    try { await page.close(); } catch {}
    return { success: false, message: e.message, stack: e.stack?.substring(0, 500) };
  }
}

// ──── Routes ────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  ok(res, { status: 'ok', timestamp: Date.now() });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return fail(res, 'Missing email or password');
  }

  const emailPrefix = email?.substring(0, 3) + '***'
  console.log('[login-server] Login request for:', emailPrefix);
  const result = await doLogin(email, password);
  if (result.success) {
    ok(res, { data: result });
  } else {
    fail(res, result.message || 'Login failed', 500);
  }
});

// ──── Start ─────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[login-server] Running on http://localhost:${PORT}`);
  console.log(`[login-server] POST /login to login with email+password`);
  console.log(`[login-server] GET  /health to check status`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[login-server] Shutting down...');
  if (browser) await browser.close();
  process.exit(0);
});
