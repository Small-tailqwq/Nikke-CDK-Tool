<template>
  <div class="page">
    <h2>官方登录回调</h2>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else>
      <el-card class="summary" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>登录信息摘要</span>
            <el-tag size="small" type="info"
              >来源: {{ parsed?.href?.split('?')[0] || '未知' }}</el-tag
            >
          </div>
        </template>

        <div class="summary-grid">
          <div class="row">
            <span class="label">账号：</span
            ><span class="value">{{ derived.user_name || '(未知)' }}</span>
          </div>
          <div class="row">
            <span class="label">UID：</span><span class="value">{{ derived.uid || '(未知)' }}</span>
          </div>
          <div class="row">
            <span class="label">OpenID：</span
            ><span class="value mono">{{ derived.openid || '(未知)' }}</span>
          </div>
          <div class="row">
            <span class="label">Channel：</span
            ><span class="value">{{ derived.channelid || '(未知)' }}</span>
          </div>
          <div class="row">
            <span class="label">GameID：</span
            ><span class="value">{{ derived.game_id || '29080' }}</span>
          </div>
        </div>

        <div class="actions">
          <el-button type="primary" :loading="saving" @click="applyToUser">{{
            applyBtnText
          }}</el-button>
          <el-button @click="goUsers">前往用户管理</el-button>
          <el-button @click="toggleRaw" text>{{
            showRaw ? '收起原始数据' : '展开原始数据'
          }}</el-button>
        </div>
      </el-card>

      <el-card v-if="playerInfo" class="player" shadow="never">
        <template #header><span>角色信息</span></template>
        <div class="summary-grid">
          <div class="row">
            <span class="label">角色名：</span><span class="value">{{ playerInfo.role_name }}</span>
          </div>
          <div class="row">
            <span class="label">等级：</span
            ><span class="value">{{ playerInfo.player_level }}</span>
          </div>
          <div class="row">
            <span class="label">战力：</span
            ><span class="value">{{ playerInfo.team_combat?.toLocaleString?.() }}</span>
          </div>
          <div class="row">
            <span class="label">区域：</span><span class="value">{{ playerInfo.region_name }}</span>
          </div>
        </div>
      </el-card>

      <el-card v-if="creatingNew" class="create" shadow="never">
        <template #header><span>新建用户</span></template>
        <div class="form">
          <el-radio-group v-model="server">
            <el-radio-button label="global">国际服</el-radio-button>
            <el-radio-button label="tw">港澳台服</el-radio-button>
          </el-radio-group>
          <el-input v-model="remark" placeholder="备注名（默认使用角色名或账号名）" />
          <div>
            <el-button type="success" :loading="saving" @click="confirmCreate"
              >创建并保存</el-button
            >
          </div>
        </div>
      </el-card>

      <el-input v-if="showRaw" v-model="raw" type="textarea" :autosize="{ minRows: 8 }" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { getGlobalUserCompleteInfo } from '../utils/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const error = ref('')
const raw = ref('')
const parsed = ref(null)
const standardCookie = ref('')
const derived = ref({})
const playerInfo = ref(null)
const saving = ref(false)
const creatingNew = ref(false)
const server = ref('global')
const remark = ref('')
const showRaw = ref(false)
const userStore = useUserStore()

const existingUser = computed(() => {
  const uid = derived.value?.uid
  if (!uid) return null
  const all = userStore.users
  return all.find((u) => String(u.uid) === String(uid)) || null
})

const applyBtnText = computed(() =>
  existingUser.value ? '更新此用户的Cookie' : '将登录态保存为新用户'
)

onMounted(async () => {
  try {
    // 🔐 安全改进：支持两种模式 - 旧版Base64数据和新版令牌模式
    const token = route.query.token
    const b64 = route.query.data

    if (token) {
      // 新版令牌模式：通过POST请求获取数据
      await fetchAuthDataByToken(token)
    } else if (b64) {
      // 旧版Base64模式：向后兼容
      const json = decodeURIComponent(
        atob(String(b64))
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          })
          .join('')
      )
      raw.value = json
      parsed.value = JSON.parse(json)

      // 优先使用书签携带的标准Cookie，否则尝试从LS推导
      standardCookie.value = parsed.value.standardCookie || deriveCookieFromLS(parsed.value.ls)
      derived.value = parsed.value.derived || deriveCore(parsed.value.ls)

      // 静默写入快照，供"从快照填充"使用
      writeToStorage()

      // 拉取角色信息用于展示
      if (standardCookie.value) {
        fetchPlayer()
      }
      raw.value = JSON.stringify(sanitizeAuthPayloadForDisplay(parsed.value), null, 2)
      clearAuthParams()
    } else {
      error.value = '缺少认证参数 (token 或 data)'
      return
    }
  } catch (e) {
    error.value = '解析失败: ' + (e && e.message)
  }
})

// 🔐 新增：通过令牌获取认证数据
async function fetchAuthDataByToken(token) {
  try {
    saving.value = true

    // 通过POST请求获取加密的认证数据
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://nikke-cdk.hayasa.org'
    const response = await fetch(`${apiBaseUrl}/api/auth/token-data`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '获取认证数据失败')
    }

    const responseData = result.data

    // 🔐 检测是否为加密数据（新版三重加密）
    let decryptedCookie = null

    if (responseData._encrypted_cookie && responseData.sid) {
      console.log('🔐 检测到加密Cookie，开始三重解密...')

      try {
        // 动态导入解密工具
        const { decryptCookieData } = await import('@/utils/cookieDecrypt')

        // 使用三重密钥解密：SID + Token + Salt（盐包含在加密数据包中）
        decryptedCookie = await decryptCookieData(
          responseData._encrypted_cookie,
          responseData.sid,
          token
        )

        console.log('✅ Cookie解密成功，长度:', decryptedCookie.length)

        // 构建解密后的数据对象
        parsed.value = {
          ...responseData,
          standardCookie: decryptedCookie,
          // 移除加密字段，避免混淆
          _encrypted_cookie: undefined,
        }

        standardCookie.value = decryptedCookie
        derived.value = responseData.derived || {}
      } catch (decryptError) {
        console.error('❌ Cookie解密失败:', decryptError)
        throw new Error('Cookie解密失败: ' + decryptError.message)
      }
    } else {
      // 旧版明文数据（向后兼容）
      console.log('⚠️ 检测到明文Cookie（旧版格式）')
      parsed.value = responseData
      standardCookie.value = responseData.standardCookie || deriveCookieFromLS(responseData.ls)
      derived.value = responseData.derived || deriveCore(responseData.ls)
    }

    raw.value = JSON.stringify(sanitizeAuthPayloadForDisplay(parsed.value), null, 2)

    // 静默写入快照，供"从快照填充"使用
    writeToStorage()

    // 拉取角色信息用于展示
    if (standardCookie.value) {
      fetchPlayer()
    }

    clearAuthParams()

    console.log('🔐 通过令牌成功获取认证数据，已清除URL中的令牌参数')
  } catch (e) {
    console.error('通过令牌获取认证数据失败:', e)
    error.value = '获取认证数据失败: ' + (e && e.message)
  } finally {
    saving.value = false
  }
}

function writeToStorage() {
  try {
    const payload = {
      ts: Date.now(),
      source: parsed.value?.href ? String(parsed.value.href).split('?')[0] : '',
      hasCookie: Boolean(standardCookie.value),
      cookieKeys: standardCookie.value
        ? standardCookie.value.split(';').map((part) => part.trim().split('=')[0]).filter(Boolean)
        : [],
      derived: derived.value,
    }
    localStorage.setItem('nikke_official_login_snapshot', JSON.stringify(payload))
  } catch (e) {
    // 忽略本地存储错误
    console.warn('写入快照失败:', e)
  }
}

function clearAuthParams() {
  if (!window.history.replaceState) return
  const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#/auth/callback`
  window.history.replaceState(null, '', cleanUrl)
}

function sanitizeAuthPayloadForDisplay(payload) {
  if (!payload || typeof payload !== 'object') return payload
  const cloned = JSON.parse(JSON.stringify(payload))
  const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return
    for (const key of Object.keys(obj)) {
      if (/cookie|token|password|ticket|randstr/i.test(key)) {
        obj[key] = '<redacted>'
      } else if (typeof obj[key] === 'object') {
        redact(obj[key])
      }
    }
  }
  redact(cloned)
  return cloned
}

function goUsers() {
  router.replace({ path: '/user' })
}

function toggleRaw() {
  showRaw.value = !showRaw.value
}

function deriveCore(ls) {
  try {
    let lip = {}
    try {
      lip = JSON.parse(ls?.['lip-user-info'] || '{}')
    } catch {}
    const ci = lip.channel_info || {}
    let extra = lip.extra_json || {}
    if (typeof extra === 'string') {
      try {
        extra = JSON.parse(extra)
      } catch {
        extra = {}
      }
    }
    const nn = (extra && extra.need_notify_rsp) || {}
    const game_id = '29080'
    return {
      game_id,
      openid: lip.openid || ci.openid || '',
      channelid: ci.channelId || ci.channel_id || '',
      uid: nn.game_sacc_uid || nn.li_uid || ci.openid || lip.uid || '',
      user_name: lip.user_name || (ci.account ? String(ci.account).split('@')[0] : ''),
    }
  } catch {
    return {}
  }
}

function deriveCookieFromLS(ls) {
  try {
    let lip = {}
    try {
      lip = JSON.parse(ls?.['lip-user-info'] || '{}')
    } catch {}
    const ci = lip.channel_info || {}
    let extra = lip.extra_json || {}
    if (typeof extra === 'string') {
      try {
        extra = JSON.parse(extra)
      } catch {
        extra = {}
      }
    }
    const nn = (extra && extra.need_notify_rsp) || {}
    const isLikelyHex = (value) => typeof value === 'string' && /^[a-fA-F0-9]{32,64}$/.test(value)
    const gameToken = isLikelyHex(lip.token) ? lip.token : isLikelyHex(ci.token) ? ci.token : ''
    const kv = [
      ['game_adult_status', 1],
      ['game_channelid', ci.channelId || ci.channel_id || ''],
      ['game_gameid', '29080'],
      ['game_login_game', '0'],
      ['game_openid', lip.openid || ci.openid || ''],
      ['game_token', gameToken],
      ['game_uid', nn.game_sacc_uid || nn.li_uid || ci.openid || lip.uid || ''],
      ['game_user_name', lip.user_name || (ci.account ? String(ci.account).split('@')[0] : '')],
    ].filter(([k, v]) => v !== undefined && v !== null && String(v) !== '')
    return kv.map(([k, v]) => `${k}=${String(v)}`).join('; ')
  } catch {
    return ''
  }
}

async function fetchPlayer() {
  try {
    const res = await getGlobalUserCompleteInfo(standardCookie.value)
    if (res.success) {
      playerInfo.value = res.data
      if (!remark.value) remark.value = res.data.role_name || derived.value.user_name || ''
    }
  } catch (e) {
    // 忽略展示失败
  }
}

async function applyToUser() {
  try {
    if (!standardCookie.value) {
      ElMessage.warning('未获取到有效 Cookie')
      return
    }
    saving.value = true
    const user = existingUser.value
    if (user) {
      await userStore.updateUser(user.id, {
        cookie: standardCookie.value,
        cookieOriginal: standardCookie.value,
        server: user.server,
        uid: user.uid || derived.value.uid,
        userName: user.userName || derived.value.user_name,
        playerInfo: playerInfo.value || user.playerInfo,
      })
      ElMessage.success('已更新此用户的 Cookie')
      router.replace({ path: '/user' })
    } else {
      creatingNew.value = true
    }
  } catch (e) {
    console.error('更新用户失败:', e)
    ElMessage.error('更新失败：' + (e && e.message ? e.message : '请稍后重试'))
  } finally {
    saving.value = false
  }
}

async function confirmCreate() {
  try {
    if (!standardCookie.value) {
      ElMessage.warning('未获取到有效 Cookie')
      return
    }
    saving.value = true
    const name = remark.value || playerInfo.value?.role_name || derived.value.user_name || '新用户'
    await userStore.addUser({
      name,
      server: server.value,
      serverName: server.value === 'tw' ? '港澳台服' : '国际服',
      uid: derived.value.uid || '',
      userName: derived.value.user_name || '',
      cookie: standardCookie.value,
      cookieOriginal: standardCookie.value,
      playerInfo: playerInfo.value || undefined,
      cookieExpireDays: 30,
      cookieActualExpireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    ElMessage.success('已创建并保存用户')
    router.replace({ path: '/user' })
  } catch (e) {
    console.error('创建用户失败:', e)
    ElMessage.error('创建失败：' + (e && e.message ? e.message : '请稍后重试'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page {
  padding: 16px;
}
.actions {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  flex-wrap: wrap;
}
.summary .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  padding: 8px 0;
}
.row .label {
  color: var(--el-text-color-secondary);
  margin-right: 6px;
}
.row .value {
  color: var(--el-text-color-primary);
}
.mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.error {
  color: #c00;
  margin-bottom: 12px;
}
</style>
