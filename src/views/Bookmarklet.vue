<template>
  <div class="page">
    <h2>官方登录助手</h2>
    <ol>
      <li>
        将下方按钮拖到浏览器书签栏，或右键复制链接添加为书签：
        <a :href="bookmarkletHref" class="bookmarklet">NIKKE 登录回传</a>
      </li>
      <li>
        点击“前往官方登录页”，在新开的登录页完成登录（可能被拦截则会在本标签打开）。
        登录完成后可直接关闭登录页。
      </li>
      <li>
        登录页关闭后，你当前这个标签会自动前往官方 <code>/cdk</code> 页面。 在该页面点击书签 “NIKKE
        登录回传”。
      </li>
      <li>
        页面将回到本工具的“登录回调”页，查看信息卡片并选择“更新此用户的Cookie”或“创建并保存”。
      </li>
    </ol>

    <div class="actions">
      <el-button type="primary" @click="goOfficial">前往官方登录页</el-button>
      <el-button @click="copyBookmarklet">复制书签脚本</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      title="安全与使用说明"
      description="脚本仅在官方站点读取与兑换相关的少量 cookie/localStorage 字段，并通过 URL hash 回传至本工具，不会外发到第三方服务器；本页面不会关闭你的当前标签。若弹窗被拦截，将在本标签直接打开登录页；若未自动跳转到 /cdk，可手动访问官方 /cdk 再点击书签。"
    />

    <h3>调试信息</h3>
    <el-input v-model="bookmarkletSrc" type="textarea" :autosize="{ minRows: 6 }" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const callbackUrl = location.origin + location.pathname + '#/auth/callback'

// 需要回传的关键项（最小化）：站点 cookie 中将由后端生成；我们只需要 game_token/openid/uid 等
// 这里从官方站读取：
// - document.cookie（仅官方域）
// - 一些 localStorage 键（若官方使用）

const bookmarkletCode = `(() => {
  try {
    const safeLS = (() => { try { return { ...localStorage }; } catch { return {}; } })();
    let lip = {};
    try { lip = JSON.parse(safeLS['lip-user-info'] || '{}'); } catch {}
    const ci = lip.channel_info || {};
    let extra = lip.extra_json || {};
    if (typeof extra === 'string') { try { extra = JSON.parse(extra); } catch { extra = {}; } }
    const nn = (extra && extra.need_notify_rsp) || {};
    // 解析 document.cookie 为 map
    const cookiePairs = (document.cookie || '').split(';').map(s => s.trim()).filter(Boolean);
    const cookieMap = {};
    for (const p of cookiePairs) {
      const idx = p.indexOf('=');
      if (idx > -1) cookieMap[p.slice(0, idx)] = p.slice(idx + 1);
    }

    // 从 cookie 优先获取；缺失时从 LS 回退
    const gameIdFromCookie = cookieMap['game_gameid'] || (document.cookie.match(/__ss_storage_cookie_cache_game_id__=(\d+)/)?.[1]) || '';
    const game_id = gameIdFromCookie || '29080';

  // 选择正确的 game_token：优先 cookie；LS 中顶层 lip.token 才是游戏侧 token，channel_info.token 仍是 LI Pass token
  const tokenCandidates = [cookieMap['game_token'], lip.token, ci.token].filter(v => !!v);
  const isLikelyHex = (s) => typeof s === 'string' && /^[a-fA-F0-9]{32,64}$/.test(s);
  let token = tokenCandidates.find(isLikelyHex) || '';

    // openid/uid：优先 cookie，其次从 LS 识别
    // SDK 中 top-level openid 是 game_openid；channel_info.openid 更接近 game_uid
    const cookie_openid = cookieMap['game_openid'] || '';
    const cookie_uid = cookieMap['game_uid'] || '';

  const derived_uid = cookie_uid || nn.game_sacc_uid || nn.li_uid || ci.openid || lip.uid || '';
  const derived_openid = cookie_openid || lip.openid || ci.openid || '';

    const channelid = cookieMap['game_channelid'] || ci.channelId || ci.channel_id || '';
    const user_name = cookieMap['game_user_name'] || lip.user_name || (ci.account ? String(ci.account).split('@')[0] : '');
    const adult = cookieMap['game_adult_status'] || '1';
    const login_game = cookieMap['game_login_game'] || '0';

    // 组装标准 Cookie（按较常见顺序输出）
    const kv = [
      ['game_adult_status', adult],
      ['game_channelid', channelid],
      ['game_gameid', game_id],
      ['game_login_game', login_game],
      ['game_openid', derived_openid],
      ['game_token', token],
      ['game_uid', derived_uid],
      ['game_user_name', user_name]
    ].filter(([k,v]) => v !== undefined && v !== null && String(v) !== '');
    const standardCookie = kv.map(([k,v]) => k + '=' + String(v)).join('; ');
    const data = {
      href: location.href,
      cookie: document.cookie,
      // 仅回传必要的 LS 键，避免冗余与隐私暴露
      ls: { 'lip-user-info': safeLS['lip-user-info'] },
      standardCookie,
      derived: { game_id, openid: derived_openid, channelid, uid: derived_uid, user_name }
    };
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const cb = '${callbackUrl}';
    location.href = cb + '?data=' + encodeURIComponent(payload);
  } catch (e) {
    alert('回传失败: ' + (e && e.message));
  }
})();`

const bookmarkletSrc = ref(bookmarkletCode)
const bookmarkletHref = computed(() => 'javascript:' + encodeURIComponent(bookmarkletSrc.value))

function goOfficial() {
  const loginUrl = 'https://www.blablalink.com/login?to=/cdk'
  const targetUrl = 'https://www.blablalink.com/cdk'

  // 尝试在命名窗口里打开登录页；不要加 noopener，否则拿不到句柄
  let w = null
  try {
    w = window.open(loginUrl, 'nikkeLoginWin')
  } catch {}

  // 被拦截则回退为同标签跳转
  if (!w) {
    location.assign(loginUrl)
    return
  }

  const timer = setInterval(() => {
    // 跨域也可读取 closed
    if (w && w.closed) {
      clearInterval(timer)
      // 登录页关闭后，将当前标签导向 /cdk，避免“打开新标签后又被关闭”的困惑
      location.assign(targetUrl)
    }
  }, 500)

  // 保险：最长轮询 3 分钟
  setTimeout(() => clearInterval(timer), 180000)
}

async function copyBookmarklet() {
  await navigator.clipboard.writeText('javascript:' + bookmarkletSrc.value)
}
</script>

<style scoped>
.page {
  padding: 16px;
}
.bookmarklet {
  display: inline-block;
  padding: 6px 10px;
  background: #409eff;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;
}
.actions {
  margin: 12px 0;
  display: flex;
  gap: 8px;
}
</style>
