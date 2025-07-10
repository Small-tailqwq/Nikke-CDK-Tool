<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑用户' : '添加用户'"
    :width="isMobile ? '90%' : '600px'"
    @close="handleClose"
    class="user-dialog"
    :fullscreen="isMobile"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :label-width="isMobile ? '80px' : '120px'"
      @submit.prevent
    >
      <el-form-item label="用户名" prop="name">
        <el-input v-model="form.name" placeholder="请输入用户名" />
        <el-popover
          v-if="showTutorial && currentTutorialField === 'name'"
          :visible="true"
          :title="tutorialSteps.name.title"
          :placement="tutorialSteps.name.placement"
          width="300"
          trigger="manual"
        >
          <template #reference>
            <div class="tutorial-target"></div>
          </template>
          <p>{{ tutorialSteps.name.content }}</p>
          <div class="tutorial-footer">
            <el-button type="primary" size="small" @click="handleTutorialNext"
              >下一步</el-button
            >
            <el-button size="small" @click="skipTutorial">跳过教程</el-button>
          </div>
        </el-popover>
      </el-form-item>

      <el-form-item label="服务器" prop="server">
        <el-select v-model="form.server" placeholder="请选择服务器">
          <el-option
            v-for="server in serverOptions"
            :key="server.value"
            :label="server.label"
            :value="server.value"
          />
        </el-select>
        <el-popover
          v-if="showTutorial && currentTutorialField === 'server'"
          :visible="true"
          :title="tutorialSteps.server.title"
          :placement="tutorialSteps.server.placement"
          width="300"
          trigger="manual"
        >
          <template #reference>
            <div class="tutorial-target"></div>
          </template>
          <p>{{ tutorialSteps.server.content }}</p>
          <div class="tutorial-footer">
            <el-button type="primary" size="small" @click="handleTutorialNext"
              >下一步</el-button
            >
            <el-button size="small" @click="skipTutorial">跳过教程</el-button>
          </div>
        </el-popover>
      </el-form-item>

      <el-form-item label="UID" v-if="isEdit">
        <el-input v-model="form.uid" disabled />
      </el-form-item>

      <el-form-item label="游戏URL" v-if="form.server === 'cn'" prop="gameUrl">
        <el-input
          v-model="form.gameUrl"
          type="textarea"
          :rows="3"
          placeholder="请粘贴完整的游戏URL，例如：&#10;https://cdn-activity.game.qq.com/xxx?role_id=123&role_name=xxx&area_id=1&zone_id=1&...&#10;&#10;系统会自动解析URL中的参数信息"
        />
      </el-form-item>

      <!-- 国际服显示Cookie信息 -->
      <el-form-item
        label="Cookie信息"
        prop="cookie"
        v-if="form.server !== 'cn'"
      >
        <template v-if="isEdit && !showCookie">
          <el-card
            class="cookie-mask"
            shadow="never"
            @click="showCookie = true"
          >
            <div class="cookie-mask-content">
              <div class="cookie-mask-icon">
                <el-icon><Lock /></el-icon>
              </div>
              <div class="cookie-mask-text">
                <span class="cookie-mask-title">Cookie 已加密存储</span>
                <span class="cookie-mask-desc">点击查看 Cookie 详情</span>
              </div>
            </div>
          </el-card>
          <div class="cookie-info-footer">
            <div class="cookie-expire-info">
              <el-tag
                :type="getCookieStatusType(form.cookieExpireDays)"
                size="small"
                class="cookie-days"
              >
                {{ getCookieStatusText(form.cookieExpireDays) }}
              </el-tag>
            </div>
            <div class="cookie-expire-setting">
              <el-input-number
                v-model="form.cookieExpireDays"
                :min="form.cookieValidationFailed ? -1 : 1"
                :max="30"
                size="small"
                class="expire-days-input"
              />
              <span class="expire-days-label">天</span>
              <el-tooltip
                content="系统已自动计算Cookie的剩余有效期天数，您可以手动调整。手动修改后系统不会自动覆盖您的设置。"
                placement="top"
              >
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
              <el-button
                v-if="shouldShowRenewButton"
                type="primary"
                size="small"
                :loading="renewLoading"
                @click="handleRenewCookie"
                class="renew-button"
              >
                <el-icon><Refresh /></el-icon>
                续期至30天
              </el-button>
            </div>
          </div>
        </template>
        <template v-else-if="isEdit && showCookie">
          <div class="cookie-content">
            <div class="cookie-content-header">
              <span class="cookie-content-title">Cookie 详情</span>
              <el-button
                type="primary"
                link
                @click="showCookie = false"
                class="cookie-hide-btn"
              >
                <el-icon><ArrowLeft /></el-icon>
                返回
              </el-button>
            </div>
            <el-input
              v-model="form.cookie"
              type="textarea"
              :rows="10"
              :placeholder="cookiePlaceholder"
            />
            <div class="cookie-info-footer">
              <div class="cookie-expire-info">
                <el-tag
                  :type="getCookieStatusType(form.cookieExpireDays)"
                  size="small"
                  class="cookie-days"
                >
                  {{ getCookieStatusText(form.cookieExpireDays) }}
                </el-tag>
              </div>
              <div class="cookie-expire-setting">
                <el-input-number
                  v-model="form.cookieExpireDays"
                  :min="form.cookieValidationFailed ? -1 : 1"
                  :max="30"
                  size="small"
                  class="expire-days-input"
                />
                <span class="expire-days-label">天</span>
                <el-tooltip
                  content="系统已自动计算Cookie的剩余有效期天数，您可以手动调整。手动修改后系统不会自动覆盖您的设置。"
                  placement="top"
                >
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
                <el-button
                  v-if="shouldShowRenewButton"
                  type="primary"
                  size="small"
                  :loading="renewLoading"
                  @click="handleRenewCookie"
                  class="renew-button"
                >
                  <el-icon><Refresh /></el-icon>
                  续期至30天
                </el-button>
              </div>
            </div>
          </div>
        </template>
        <el-input
          v-else
          v-model="form.cookie"
          type="textarea"
          :rows="10"
          :placeholder="cookiePlaceholder"
        />
      </el-form-item>

      <!-- 国服显示角色信息 -->
      <el-form-item
        label="角色信息"
        v-if="form.server === 'cn' && parsedGameInfo"
      >
        <div class="cn-game-info">
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">游戏服区:</span>
              <el-tag
                :type="parsedGameInfo.area_id === '1' ? 'success' : 'primary'"
                size="small"
              >
                {{ parsedGameInfo.area_id === '1' ? '微信' : 'QQ' }}
              </el-tag>
            </div>
            <div class="info-row">
              <span class="info-label">角色名称:</span>
              <span class="info-value">{{
                parsedGameInfo.role_name_decoded
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">角色ID:</span>
              <span class="info-value">{{ parsedGameInfo.role_id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cookie状态:</span>
              <el-tag type="info" size="small"> 国服不适用 </el-tag>
            </div>
          </div>
        </div>
      </el-form-item>

      <!-- 国际服/港澳台服显示角色信息 -->
      <el-form-item
        label="角色信息"
        v-if="
          (form.server === 'global' || form.server === 'tw') &&
          (parsedGlobalInfo || globalInfoLoading)
        "
      >
        <div class="global-game-info" v-loading="globalInfoLoading">
          <div class="info-card" v-if="parsedGlobalInfo">
            <div class="info-row">
              <span class="info-label">游戏服区:</span>
              <el-tag type="primary" size="small">
                {{ parsedGlobalInfo.region_name }}
              </el-tag>
            </div>
            <div class="info-row">
              <span class="info-label">角色名称:</span>
              <span class="info-value">{{ parsedGlobalInfo.role_name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">角色等级:</span>
              <span class="info-value">{{
                parsedGlobalInfo.player_level
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">拥有角色数:</span>
              <span class="info-value">{{
                parsedGlobalInfo.own_nikke_cnt
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">战力:</span>
              <span class="info-value">{{
                parsedGlobalInfo.team_combat?.toLocaleString()
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cookie状态:</span>
              <el-tag
                :type="getCookieStatusType(form.cookieExpireDays)"
                size="small"
              >
                {{ getCookieStatusText(form.cookieExpireDays) }}
              </el-tag>
            </div>
          </div>
          <div class="loading-placeholder" v-else-if="globalInfoLoading">
            <span>正在获取角色信息...</span>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <div class="dialog-footer-left">
          <el-button type="info" link @click="openHelpLink" class="help-button">
            <el-icon><QuestionFilled /></el-icon>
            获取帮助
          </el-button>
        </div>
        <div class="dialog-footer-right">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="saving">
            保存
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import {
  Lock,
  InfoFilled,
  ArrowLeft,
  QuestionFilled,
  Refresh,
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import {
  parseGameUrlCN,
  getGlobalUserCompleteInfo,
  renewGlobalCookie,
  shouldRenewCookie,
} from '../utils/api'
import { showCustomMessage } from '../utils/customMessage'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['update:visible'])

const userStore = useUserStore()
const exchangeStore = useExchangeStore()
const formRef = ref(null)
const saving = ref(false)
const dialogVisible = ref(false)
const showCookie = ref(false)

// 添加教程相关变量
const showTutorial = ref(false)
const currentTutorialField = ref('')
const tutorialSteps = {
  name: {
    title: '设置用户名',
    content: '输入一个便于识别的用户名',
    placement: 'bottom',
  },
  server: {
    title: '选择服务器',
    content: '选择您游戏所在的服务器',
    placement: 'bottom',
  },
}

// 国服游戏信息解析
const parsedGameInfo = ref(null)

// 国际服角色信息解析
const parsedGlobalInfo = ref(null)
const globalInfoLoading = ref(false)

// Cookie续期功能
const renewLoading = ref(false)
const isRenewing = ref(false) // 标记是否正在续期，避免重复解析

// 新增：标记用户是否手动修改了过期天数
const manualExpireDaysEdit = ref(false)

// 服务器选项
const serverOptions = [
  { label: '国际服', value: 'global' },
  { label: '港澳台服', value: 'tw' },
  { label: '国服', value: 'cn' },
]

// 表单数据
const form = reactive({
  name: '',
  server: 'global',
  cookie: '',
  cookieExpireDays: 0, // 将由Cookie解析函数自动计算
  cookieActualExpireDate: null, // 新增：真正的cookie过期日期
  uid: '',
  gameUrl: '',
})

// 临时存储编辑模式的数据
const editFormData = ref(null)

// 解析Cookie过期时间并生成标准Cookie
const parseAndStandardizeCookie = (cookieInput) => {
  if (!cookieInput || !cookieInput.trim()) {
    return {
      standardCookie: '',
      originalCookie: '',
      expireDays: 0,
      expireDate: null,
      isValid: false,
      error: 'Cookie输入为空',
    }
  }

  const originalCookie = cookieInput.trim()

  try {
    // 检查是否为Application面板格式
    const isApplicationFormat = originalCookie.includes('\t')

    if (isApplicationFormat) {
      return parseApplicationCookie(originalCookie)
    } else {
      return parseStandardCookie(originalCookie)
    }
  } catch (error) {
    console.error('Cookie解析失败:', error)
    return {
      standardCookie: '',
      originalCookie,
      expireDays: -1,
      expireDate: null,
      isValid: false,
      error: `Cookie解析失败: ${error.message}`,
    }
  }
}

// 解析Application面板格式Cookie
const parseApplicationCookie = (cookieStr) => {
  const cookieLines = cookieStr.split('\n').filter((line) => line.trim())
  const cookiePairs = []
  let gameTokenExpireDate = null

  // 定义游戏相关的关键Cookie名称
  const gameCookieNames = [
    'game_token',
    'game_uid',
    'game_openid',
    'game_gameid',
    'game_channelid',
    'game_user_name',
    'game_adult_status',
    'game_login_game',
  ]

  const foundCookies = {}

  // 解析每一行Cookie
  for (const line of cookieLines) {
    const parts = line.split('\t')
    if (parts.length < 5) continue

    const cookieName = parts[0]?.trim()
    const cookieValue = parts[1]?.trim()
    const expireDateStr = parts[4]?.trim()

    // 只处理游戏相关的Cookie
    const isGameCookie = gameCookieNames.includes(cookieName)

    if (isGameCookie && cookieValue) {
      foundCookies[cookieName] = cookieValue
      cookiePairs.push(`${cookieName}=${cookieValue}`)

      // 特别关注game_token的过期时间
      if (
        cookieName === 'game_token' &&
        expireDateStr &&
        expireDateStr !== 'Session'
      ) {
        try {
          const expireDate = new Date(expireDateStr)
          if (!isNaN(expireDate.getTime()) && expireDate > new Date()) {
            gameTokenExpireDate = expireDate
          }
        } catch (e) {
          console.warn(`解析${cookieName}过期时间失败:`, expireDateStr, e)
        }
      }
    }
  }

  // 验证必需的Cookie字段
  const requiredFields = [
    'game_token',
    'game_gameid',
    'game_openid',
    'game_uid',
    'game_channelid',
    'game_user_name',
  ]
  const missingFields = requiredFields.filter((field) => !foundCookies[field])

  if (missingFields.length > 0) {
    return {
      standardCookie: '',
      originalCookie: cookieStr,
      expireDays: -1,
      expireDate: null,
      isValid: false,
      error: `缺少必需的Cookie字段: ${missingFields.join(', ')}`,
    }
  }

  // 生成标准Cookie
  let standardCookie = cookiePairs.join('; ')

  // 计算过期时间
  let expireDays = 30 // 默认30天
  let expireDate = null

  if (gameTokenExpireDate) {
    const now = new Date()
    const diffTime = gameTokenExpireDate.getTime() - now.getTime()
    expireDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    expireDate = gameTokenExpireDate

    // 在标准Cookie中添加expires字段（用于内部时间判断）
    const expireStr = gameTokenExpireDate.toUTCString()
    standardCookie += `; expires=${expireStr}`
  } else {
    // 无法解析到过期时间，先设置为30天，但标记需要API验证
    expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expireStr = expireDate.toUTCString()
    standardCookie += `; expires=${expireStr}`

    console.warn(
      '无法从Application Cookie中解析到game_token过期时间，设置为30天后'
    )
    console.warn('⚠️ Cookie过期时间未知，需要通过API验证实际有效性')
  }

  return {
    standardCookie,
    originalCookie: cookieStr,
    expireDays: Math.min(expireDays, 30), // 限制最大30天
    expireDate: expireDate?.toISOString(),
    isValid: true,
    error: null,
  }
}

// 解析标准格式Cookie
const parseStandardCookie = (cookieStr) => {
  // 检查是否包含游戏相关的cookie
  const requiredFields = [
    'game_token',
    'game_uid',
    'game_openid',
    'game_gameid',
    'game_channelid',
    'game_user_name',
  ]
  const missingFields = requiredFields.filter(
    (field) => !cookieStr.includes(field)
  )

  if (missingFields.length > 0) {
    return {
      standardCookie: '',
      originalCookie: cookieStr,
      expireDays: -1,
      expireDate: null,
      isValid: false,
      error: `缺少必需的Cookie字段: ${missingFields.join(', ')}`,
    }
  }

  let expireDate = null
  let expireDays = 30

  // 尝试从现有的expires属性中解析
  const expiresMatch = cookieStr.match(/expires=([^;]+)/i)
  if (expiresMatch) {
    try {
      const parsedDate = new Date(expiresMatch[1].trim())
      if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
        expireDate = parsedDate
        const now = new Date()
        const diffTime = expireDate.getTime() - now.getTime()
        expireDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }
    } catch (e) {
      console.warn('解析现有expires失败:', e)
    }
  }

  // 如果没有expires或解析失败，添加默认expires
  let standardCookie = cookieStr
  if (!expireDate) {
    expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    expireDays = 30

    if (!expiresMatch) {
      // 如果没有expires字段，添加一个
      const expireStr = expireDate.toUTCString()
      standardCookie += `; expires=${expireStr}`
    } else {
      // 如果有但解析失败，替换它
      const expireStr = expireDate.toUTCString()
      standardCookie = standardCookie.replace(
        /expires=([^;]+)/i,
        `expires=${expireStr}`
      )
    }
  }

  return {
    standardCookie,
    originalCookie: cookieStr,
    expireDays: Math.min(expireDays, 30),
    expireDate: expireDate?.toISOString(),
    isValid: true,
    error: null,
  }
}

// 兼容性处理：处理老版本数据
const migrateOldCookieData = (userData) => {
  if (!userData.cookie) return userData

  // 检查是否已经是新格式（包含expires）
  if (userData.cookie.includes('expires=')) {
    return userData // 已经是新格式，无需迁移
  }

  // 老版本数据，需要迁移
  console.log('检测到老版本Cookie数据，开始迁移:', userData.name)

  // 🔧 优化老版本Cookie处理：设置为需要验证状态，而不是直接标记为过期
  const expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 临时设置30天
  const expireStr = expireDate.toUTCString()

  return {
    ...userData,
    cookie: `${userData.cookie}; expires=${expireStr}`,
    cookieExpireDays: -1, // 标记为需要验证状态
    cookieActualExpireDate: expireDate.toISOString(),
    needsCookieUpdate: true, // 标记需要更新Cookie
    needsApiValidation: true, // 新增：标记需要API验证
  }
}

// 替换原来的parseCookieExpireDate函数
const parseCookieExpireDate = (cookieStr) => {
  const result = parseAndStandardizeCookie(cookieStr)
  return result.expireDays
}

// Cookie输入框提示文本
const cookiePlaceholder = computed(() => {
  return `请粘贴完整的Cookie信息，支持以下两种格式：

1. 从Application面板复制的格式（推荐，可自动解析过期时间）：
game_token  abc123  .domain.com  /  2025-07-19T13:03:11.018Z
game_uid    123456  .domain.com  /  2025-07-19T13:03:11.018Z

2. 标准Cookie格式（如包含expires或max-age属性也可自动解析过期时间）：
game_token=abc123; game_uid=123456; expires=Wed, 21 Oct 2025 07:28:00 GMT

注意：Cookie最大有效期为30天，您可以手动调整过期天数，也可以随时点击续期按钮将Cookie续期至30天`
})

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days === -1) return 'danger' // 过期时间异常
  if (days > 20) return 'success'
  if (days > 7) return 'warning'
  return 'danger'
}

// 获取更友好的Cookie状态文本
const getCookieStatusText = (days) => {
  if (days === -1) return 'Cookie过期时间异常'
  if (days > 20) return `Cookie有效期${days}天`
  if (days > 7) return `Cookie有效期${days}天`
  return `Cookie即将过期(${days}天)`
}

// 处理教程相关函数
const handleTutorialNext = () => {
  if (currentTutorialField.value === 'name') {
    currentTutorialField.value = 'server'
  } else {
    skipTutorial()
  }
}

const skipTutorial = () => {
  showTutorial.value = false
  currentTutorialField.value = ''
}

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  server: [{ required: true, message: '请选择服务器', trigger: 'change' }],
  cookie: [
    {
      required: () => form.server !== 'cn',
      message: '请输入Cookie信息',
      trigger: 'blur',
    },
    {
      validator: (rule, value, callback) => {
        // 国服不验证cookie字段
        if (form.server === 'cn') {
          callback()
          return
        }

        if (!value) {
          callback(new Error('请输入Cookie信息'))
          return
        }

        // 使用新的解析逻辑
        const parseResult = parseAndStandardizeCookie(value)

        if (!parseResult.isValid) {
          callback(new Error(parseResult.error))
          return
        }

        // 🔧 关键修复：只有在用户没有手动修改过期天数时才更新过期信息
        if (!manualExpireDaysEdit.value) {
          // 设置程序更新标志，避免监听器误判为用户手动修改
          window.isUpdatingExpireDays = true
          form.cookieExpireDays = parseResult.expireDays
          form.cookieActualExpireDate = parseResult.expireDate
          nextTick(() => {
            window.isUpdatingExpireDays = false
          })
        } else {
          console.log(
            '检测到用户手动修改过期天数，跳过自动更新，保持用户设置:',
            form.cookieExpireDays
          )
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
  gameUrl: [
    {
      required: true,
      message: '请输入游戏URL',
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.server !== 'cn') {
          callback()
          return
        }

        if (!value) {
          callback(new Error('请输入游戏URL'))
          return
        }

        const result = parseGameUrlCN(value)
        if (!result.isValid) {
          const errorMsg =
            result.missingParams?.length > 0
              ? `游戏URL缺少必要参数: ${result.missingParams.join(', ')}`
              : '游戏URL格式不正确'
          callback(new Error(errorMsg))
          return
        }

        callback()
      },
    },
  ],
}

// 检测是否为移动端
const isMobile = computed(() => window.innerWidth <= 768)

// 计算是否显示续期按钮
const shouldShowRenewButton = computed(() => {
  // 只有国际服和港澳台服才支持Cookie续期
  if (form.server === 'cn' || !form.cookie) {
    return false
  }

  // 放宽续期条件：允许用户随时手动续期（除非已经是30天满期）
  // 或者当Cookie剩余天数≤20天时自动显示续期按钮
  return form.cookieExpireDays < 30 && form.cookieExpireDays > 0
})

// 监听Cookie值变化，自动更新过期时间
watch(
  () => form.cookie,
  (newValue, oldValue) => {
    if (form.server !== 'cn' && newValue) {
      // 只有在Cookie内容真正发生变化时才重新解析
      // 避免编辑模式下加载已有数据时触发不必要的解析
      // 避免续期过程中的重复解析
      if (
        newValue !== oldValue &&
        oldValue !== undefined &&
        !isRenewing.value
      ) {
        // 🔧 关键改进：当Cookie内容变化时，重置手动编辑标志，允许重新解析
        if (manualExpireDaysEdit.value) {
          console.log(
            '检测到Cookie内容变化，重置手动编辑标志，将重新解析过期时间'
          )
          manualExpireDaysEdit.value = false
        }

        // 设置程序更新标志，避免监听器误判为用户手动修改
        window.isUpdatingExpireDays = true
        form.cookieExpireDays = parseCookieExpireDate(newValue)
        nextTick(() => {
          window.isUpdatingExpireDays = false
        })
      }
    }
  }
)

// 新增：监听用户手动修改过期天数
watch(
  () => form.cookieExpireDays,
  (newValue, oldValue) => {
    // 如果过期天数发生变化，且不是在续期过程中，也不是程序自动解析更新，标记为用户手动修改
    if (
      newValue !== oldValue &&
      oldValue !== undefined &&
      !isRenewing.value &&
      !window.isUpdatingExpireDays // 新增：程序更新标志
    ) {
      manualExpireDaysEdit.value = true
      console.log('检测到用户手动修改过期天数:', newValue)
    }
  }
)

// 监听visible属性变化
watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val
    showCookie.value = false // 重置Cookie显示状态

    if (val) {
      if (props.isEdit && props.userId) {
        // 编辑模式：获取用户数据
        const userData = userStore.getUserById(props.userId)
        if (userData) {
          // 🔧 兼容性处理：检查是否为老版本数据
          const migratedData = migrateOldCookieData(userData)

          // 保存编辑前的数据，用于取消时恢复
          editFormData.value = { ...migratedData }

          // 设置表单数据
          Object.assign(form, {
            name: migratedData.name,
            server: migratedData.server,
            cookie: migratedData.cookieOriginal || migratedData.cookie, // 显示原始Cookie格式
            cookieExpireDays: migratedData.cookieExpireDays || 0,
            cookieActualExpireDate: migratedData.cookieActualExpireDate || null,
            uid: migratedData.uid,
            gameUrl: migratedData.gameUrl,
          })

          // 如果是国际服或港澳台服，设置过期信息
          if (migratedData.server !== 'cn') {
            form.cookieExpireDays = migratedData.cookieExpireDays || 0
            form.cookieActualExpireDate =
              migratedData.cookieActualExpireDate || null

            // 如果是迁移后的数据，提示用户更新Cookie
            if (migratedData.needsCookieUpdate) {
              console.warn('检测到老版本Cookie，建议用户更新Cookie信息')
            }

            // 编辑模式下重置手动修改标志，允许用户修改
            manualExpireDaysEdit.value = false
          }

          // 如果是国服，需要解析游戏信息
          if (userData.server === 'cn' && userData.gameUrl) {
            nextTick(() => {
              handleGameUrlParse()
            })
          }

          // 如果是国际服或港澳台服，需要加载角色信息
          if (
            (userData.server === 'global' || userData.server === 'tw') &&
            userData.cookie
          ) {
            // 如果已有存储的角色信息，直接显示
            if (userData.playerInfo) {
              parsedGlobalInfo.value = userData.playerInfo
            } else {
              // 否则重新获取角色信息
              nextTick(() => {
                handleGlobalCookieParse()
              })
            }
          }
        }
      } else {
        // 添加模式：重置表单
        resetForm()
        editFormData.value = null
        parsedGameInfo.value = null
      }
    } else {
      // 对话框关闭时，如果是编辑模式且没有保存，恢复原始数据
      if (props.isEdit && editFormData.value) {
        const userData = userStore.getUserById(props.userId)
        if (userData) {
          // 恢复用户列表中的实际数据
          Object.assign(userData, editFormData.value)
        }
      }
      // 清理临时数据
      editFormData.value = null
      parsedGameInfo.value = null
      parsedGlobalInfo.value = null
      manualExpireDaysEdit.value = false // 重置手动修改标志
      form.cookieValidationFailed = false // 重置Cookie验证失败标志
      clearTimeout(window.globalCookieParseTimer)
    }
  }
)

// 监听对话框可见性变化
watch(
  () => dialogVisible.value,
  (val) => {
    emit('update:visible', val)
  }
)

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  // 完全重置所有字段到初始值
  Object.assign(form, {
    name: '',
    server: 'global',
    cookie: '',
    cookieExpireDays: 0, // 将由Cookie解析函数自动计算
    cookieActualExpireDate: null, // 新增：真正的cookie过期日期
    cookieValidationFailed: false, // 新增：Cookie验证失败标志
    uid: '',
    gameUrl: '',
  })
  // 重置手动修改标志
  manualExpireDaysEdit.value = false
}

// 处理关闭
const handleClose = () => {
  dialogVisible.value = false
}

// 打开帮助链接
const openHelpLink = () => {
  window.open(
    'https://chalk-quotation-b2d.notion.site/20f563f728f180d9a526ccbc8a278d60#213563f728f18056ad62dc32552a50bb',
    '_blank'
  )
}

// 处理国服游戏URL解析
const handleGameUrlParse = async () => {
  if (!form.gameUrl || form.server !== 'cn') {
    parsedGameInfo.value = null
    return
  }

  try {
    const result = parseGameUrlCN(form.gameUrl)

    if (!result.isValid) {
      parsedGameInfo.value = null
      const errorMsg =
        result.missingParams?.length > 0
          ? `游戏URL缺少必要参数: ${result.missingParams.join(', ')}`
          : '游戏URL格式不正确，请检查URL是否完整'
      showCustomMessage(errorMsg, 'error')
      return
    }

    // 解码角色名称
    const roleNameDecoded = result.params.role_name
      ? decodeURIComponent(result.params.role_name)
      : ''

    // 设置解析后的游戏信息
    parsedGameInfo.value = {
      ...result.params,
      role_name_decoded: roleNameDecoded,
    }

    // 自动填充用户名和UID
    if (roleNameDecoded && !form.name) {
      form.name = roleNameDecoded
    }

    if (result.params.role_id) {
      form.uid = result.params.role_id
    }

    // 将解析后的参数作为cookie存储（国服特殊处理）
    form.cookie = JSON.stringify(result.params)
  } catch (error) {
    parsedGameInfo.value = null
    console.error('解析游戏URL时出错:', error)
  }
}

// 监听游戏URL变化
watch(() => form.gameUrl, handleGameUrlParse)

// 处理国际服Cookie解析，获取角色信息
const handleGlobalCookieParse = async () => {
  if (!form.cookie || form.server === 'cn') {
    parsedGlobalInfo.value = null
    return
  }

  // 只有国际服和港澳台服才需要获取角色信息
  if (form.server !== 'global' && form.server !== 'tw') {
    parsedGlobalInfo.value = null
    return
  }

  try {
    globalInfoLoading.value = true

    // 验证Cookie格式是否正确
    const requiredFields = [
      'game_token',
      'game_gameid',
      'game_openid',
      'game_uid',
      'game_channelid',
      'game_user_name',
    ]

    const missingFields = requiredFields.filter(
      (field) => !form.cookie.includes(field)
    )

    if (missingFields.length > 0) {
      console.warn('Cookie缺少必要字段，跳过角色信息获取:', missingFields)
      parsedGlobalInfo.value = null
      return
    }

    // 调用API获取角色信息
    const result = await getGlobalUserCompleteInfo(form.cookie)

    if (result.success && result.data) {
      parsedGlobalInfo.value = result.data

      // 如果用户名为空，自动填充角色名
      if (!form.name && result.data.role_name) {
        form.name = result.data.role_name
      }

      // 自动填充UID
      if (result.data.role_name) {
        form.uid = form.cookie.match(/game_uid=([^;]+)/)?.[1] || ''
      }

      console.log('成功获取国际服角色信息:', result.data)
    } else {
      console.warn('获取国际服角色信息失败:', result.message)
      parsedGlobalInfo.value = null

      // 🔧 关键修复：如果API验证失败且错误信息表明Cookie无效，则标记Cookie状态为异常
      if (
        result.message &&
        result.message.includes('无法从Cookie中提取必要的游戏参数')
      ) {
        console.warn('检测到Cookie已失效，设置状态为异常')
        // 设置程序更新标志，避免监听器误判为用户手动修改
        window.isUpdatingExpireDays = true
        form.cookieExpireDays = -1 // 设置为异常状态
        // 标记为Cookie验证失效状态，用于保存时保护
        form.cookieValidationFailed = true
        nextTick(() => {
          window.isUpdatingExpireDays = false
        })
        showCustomMessage('检测到Cookie已失效，请重新设置Cookie信息', 'warning')
      }
    }
  } catch (error) {
    console.error('解析国际服角色信息时出错:', error)
    parsedGlobalInfo.value = null
  } finally {
    globalInfoLoading.value = false
  }
}

// 监听Cookie变化，自动获取角色信息
watch(
  () => form.cookie,
  (newCookie) => {
    if (form.server !== 'cn' && newCookie) {
      // 延迟一点时间执行，避免在表单验证过程中频繁调用
      clearTimeout(window.globalCookieParseTimer)
      window.globalCookieParseTimer = setTimeout(() => {
        handleGlobalCookieParse()
      }, 1000)
    } else {
      parsedGlobalInfo.value = null
    }
  }
)

// 监听服务器变化，清理角色信息
watch(
  () => form.server,
  () => {
    parsedGlobalInfo.value = null
    clearTimeout(window.globalCookieParseTimer)
  }
)

// 处理Cookie续期
const handleRenewCookie = async () => {
  if (form.server === 'cn') {
    showCustomMessage('国服用户无需Cookie续期', 'info')
    return
  }

  if (!form.cookie) {
    showCustomMessage('请先输入Cookie信息', 'warning')
    return
  }

  try {
    renewLoading.value = true
    isRenewing.value = true // 标记正在续期

    // 执行Cookie续期
    const result = await renewGlobalCookie(form.cookie)

    if (result.success) {
      // 📝 详细调试信息
      console.log('=== Cookie续期详细信息 ===')
      console.log('原始Cookie长度:', form.cookie?.length || 0)
      console.log('新Cookie长度:', result.data.newCookie?.length || 0)
      console.log('Cookie是否发生变化:', form.cookie !== result.data.newCookie)
      console.log('续期前过期天数:', form.cookieExpireDays)
      console.log('续期后过期天数:', result.data.expireDays)

      // 检查关键Cookie字段是否更新
      const oldTokenMatch = form.cookie?.match(/game_token=([^;]+)/)
      const newTokenMatch = result.data.newCookie?.match(/game_token=([^;]+)/)
      if (oldTokenMatch && newTokenMatch) {
        console.log(
          'game_token是否更新:',
          oldTokenMatch[1] !== newTokenMatch[1]
        )
        console.log('旧token:', oldTokenMatch[1]?.substring(0, 20) + '...')
        console.log('新token:', newTokenMatch[1]?.substring(0, 20) + '...')
      }

      // 📋 智能更新Cookie格式
      const wasApplicationFormat = form.cookie?.includes('\t')
      const originalCookie = form.cookie // 保存原始Cookie用于比较

      // 检查Cookie内容是否真的发生了变化
      const cookieChanged = originalCookie !== result.data.newCookie

      // 🔧 新续期逻辑：智能处理Cookie格式和存储
      isRenewing.value = true
      manualExpireDaysEdit.value = true // 防止Cookie变化触发重新解析

      // 生成新的过期时间（添加expires字段）
      const newExpireDate = new Date(
        Date.now() + result.data.expireDays * 24 * 60 * 60 * 1000
      )
      const newExpireStr = newExpireDate.toUTCString()

      // 构建新的标准Cookie（包含expires）
      let newStandardCookie = result.data.newCookie
      if (!newStandardCookie.includes('expires=')) {
        newStandardCookie += `; expires=${newExpireStr}`
      } else {
        // 如果已有expires，替换它
        newStandardCookie = newStandardCookie.replace(
          /expires=([^;]+)/i,
          `expires=${newExpireStr}`
        )
      }

      // 📝 关键改进：保持显示格式不变
      if (wasApplicationFormat) {
        console.log('续期成功，保持Application面板显示格式')
        // 显示格式保持为Application面板格式（用户输入的原始格式）
        // 但内部存储使用新的标准Cookie
        // form.cookie 保持不变，用户看到的还是Application格式
      } else {
        // 如果原来就是标准格式，更新显示的Cookie
        form.cookie = newStandardCookie
      }

      // 更新过期信息
      form.cookieExpireDays = result.data.expireDays
      form.cookieActualExpireDate = newExpireDate.toISOString()

      // 🔧 更新存储：使用新的存储格式
      if (props.isEdit && props.userId) {
        const userData = userStore.getUserById(props.userId)
        if (userData) {
          // 更新存储数据：标准Cookie（供API使用） + 原始Cookie（供显示使用）
          userData.cookie = newStandardCookie // 存储标准Cookie（供API使用）
          userData.cookieOriginal = form.cookie // 保持原始显示格式
          userData.cookieExpireDays = result.data.expireDays
          userData.cookieActualExpireDate = form.cookieActualExpireDate

          // 保存到本地存储
          await userStore.updateUser(props.userId, {
            cookie: newStandardCookie, // 标准Cookie（供API使用）
            cookieOriginal: form.cookie, // 原始Cookie（供显示使用）
            cookieExpireDays: result.data.expireDays,
            cookieActualExpireDate: form.cookieActualExpireDate,
          })
        }
      }

      // 🎯 新的成功提示信息
      let successMessage = `Cookie续期成功！新的有效期：${result.data.expireDays}天`

      if (wasApplicationFormat) {
        successMessage +=
          '\n✅ 保持Application面板显示格式，内部已更新标准Cookie'
      } else {
        successMessage += '\n✅ 标准Cookie格式已更新'
      }

      if (!cookieChanged) {
        successMessage += '\n📝 Cookie令牌未变化，仅延长了过期时间'
      } else {
        successMessage += '\n🔄 Cookie令牌已更新为最新版本'
      }

      showCustomMessage(successMessage, 'success')

      console.log('Cookie续期成功:', {
        renewedAt: result.data.renewedAt,
        newExpireDays: result.data.expireDays,
        newActualExpireDate: form.cookieActualExpireDate,
      })

      // 续期成功后重置手动修改标志，允许用户继续手动调整
      // 延迟重置标志，确保Cookie更新完成
      setTimeout(() => {
        manualExpireDaysEdit.value = false
        isRenewing.value = false
      }, 100)
    } else {
      showCustomMessage(result.message || 'Cookie续期失败', 'error')
      console.error('Cookie续期失败:', result)
      // 续期失败时立即清除标志
      isRenewing.value = false
      manualExpireDaysEdit.value = false
    }
  } catch (error) {
    console.error('Cookie续期异常:', error)
    showCustomMessage('Cookie续期过程中发生异常', 'error')
    // 异常时立即清除标志
    isRenewing.value = false
    manualExpireDaysEdit.value = false
  } finally {
    renewLoading.value = false
  }
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    saving.value = true

    let uid = ''
    let userName = form.name

    if (form.server === 'cn') {
      // 国服：从解析的参数中获取信息
      try {
        const params = JSON.parse(form.cookie)
        uid = params.role_id || ''
        userName = decodeURIComponent(params.role_name || form.name)
      } catch (error) {
        console.warn('解析国服参数失败:', error)
      }
    } else {
      // 国际服：从Cookie中解析用户信息
      uid = form.cookie.match(/game_uid=([^;]+)/)?.[1] || ''
      userName = form.cookie.match(/game_user_name=([^;]+)/)?.[1] || form.name
    }

    // 构建服务器显示名称
    let serverName = serverOptions.find((s) => s.value === form.server)?.label
    if (form.server === 'cn' && parsedGameInfo.value) {
      serverName = `国服 | ${
        parsedGameInfo.value.area_id === '1' ? '微信' : 'QQ'
      }`
    } else if (
      (form.server === 'global' || form.server === 'tw') &&
      parsedGlobalInfo.value
    ) {
      serverName = `${
        serverOptions.find((s) => s.value === form.server)?.label
      } | ${parsedGlobalInfo.value.region_name}`
    }

    // 🔧 新的Cookie存储逻辑
    let cookieData = {
      cookie: form.cookie, // 默认值，如果不是国际服会被覆盖
      cookieOriginal: form.cookie, // 原始输入格式（用于显示）
      cookieExpireDays: Number(form.cookieExpireDays),
      cookieActualExpireDate: form.cookieActualExpireDate,
    }

    // 处理国际服和港澳台服的Cookie
    if (form.server !== 'cn' && form.cookie) {
      const parseResult = parseAndStandardizeCookie(form.cookie)
      if (parseResult.isValid) {
        cookieData = {
          cookie: parseResult.standardCookie, // 存储标准Cookie（供API使用）
          cookieOriginal: parseResult.originalCookie, // 存储原始Cookie（供显示使用）
          // 🔧 关键修复：如果Cookie验证失败，保持异常状态，否则使用解析结果
          cookieExpireDays: form.cookieValidationFailed
            ? -1
            : parseResult.expireDays,
          cookieActualExpireDate: form.cookieValidationFailed
            ? form.cookieActualExpireDate
            : parseResult.expireDate,
        }
        console.log('保存Cookie状态:', {
          原始解析结果: parseResult.expireDays,
          当前表单状态: form.cookieExpireDays,
          Cookie验证失效标志: form.cookieValidationFailed,
          最终保存状态: cookieData.cookieExpireDays,
          是否保持异常状态: form.cookieValidationFailed,
        })
      }
    }

    const userData = {
      name: form.name,
      server: form.server,
      serverName,
      uid,
      userName,
      ...cookieData, // 应用Cookie数据
    }

    // 如果是国服，额外保存原始游戏URL，并设置Cookie过期天数为0（表示不适用）
    if (form.server === 'cn') {
      userData.gameUrl = form.gameUrl
      userData.cookieExpireDays = 0 // 国服不适用Cookie过期天数
    } else if (
      (form.server === 'global' || form.server === 'tw') &&
      parsedGlobalInfo.value
    ) {
      // 国际服和港澳台服：保存角色详细信息
      userData.playerInfo = {
        player_level: parsedGlobalInfo.value.player_level,
        own_nikke_cnt: parsedGlobalInfo.value.own_nikke_cnt,
        team_combat: parsedGlobalInfo.value.team_combat,
        region_name: parsedGlobalInfo.value.region_name,
        region_id: parsedGlobalInfo.value.region_id,
        area_id: parsedGlobalInfo.value.area_id,
        role_name: parsedGlobalInfo.value.role_name,
        // 可以保存更多信息
        avatar_frame: parsedGlobalInfo.value.avatar_frame,
        costume: parsedGlobalInfo.value.costume,
        guild_name: parsedGlobalInfo.value.guild_name,
        hard_progress: parsedGlobalInfo.value.hard_progress,
        normal_progress: parsedGlobalInfo.value.normal_progress,
        tower_floor: parsedGlobalInfo.value.tower_floor,
        icon: parsedGlobalInfo.value.icon,
      }
    }

    if (form.server !== 'cn') {
      // Cookie现在通过新的自动续期系统管理，无需手动设置浏览器Cookie
    }

    let savedUser
    if (props.isEdit && props.userId) {
      // 编辑模式：保留原有用户的 id 和创建时间
      const existingUser = userStore.getUserById(props.userId)
      if (existingUser) {
        userData.id = existingUser.id
        userData.createTime = existingUser.createTime
      }
      await userStore.updateUser(props.userId, userData)
      // 更新成功后清理临时数据
      editFormData.value = null
      savedUser = userStore.getUserById(props.userId)
    } else {
      // 添加模式：创建新用户
      userData.createTime = new Date().toLocaleString()
      savedUser = await userStore.addUser(userData)
    }

    showCustomMessage(props.isEdit ? '更新成功' : '添加成功', 'success')

    // 如果是国际服或港澳台服用户，尝试同步历史记录
    // 🔧 修复：只有当Cookie验证通过时才进行自动同步
    if (
      savedUser &&
      savedUser.server !== 'cn' &&
      !form.cookieValidationFailed
    ) {
      // 使用setTimeout确保对话框关闭后再同步，避免UI阻塞
      setTimeout(() => {
        try {
          // 使用普通同步方法，只同步第一页
          exchangeStore
            .syncUserHistory(savedUser, { page: 1, user: savedUser })
            .then((result) => {
              if (result && result.success) {
                console.log('自动同步历史记录成功:', result.message)
              }
            })
            .catch((err) => {
              console.warn('自动同步历史记录失败:', err)
            })
        } catch (error) {
          console.warn('同步历史记录出错:', error)
        }
      }, 500)
    } else if (
      savedUser &&
      savedUser.server !== 'cn' &&
      form.cookieValidationFailed
    ) {
      console.log('检测到Cookie已失效，跳过自动同步历史记录功能')
    }

    handleClose()
  } catch (error) {
    if (error.message) {
      showCustomMessage(error.message, 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss">
// 全局样式，确保在生产环境中也能正确应用
.el-dialog {
  @media screen and (max-width: 768px) {
    &.user-dialog {
      // 确保对话框在移动端正确显示
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      max-width: 100% !important;
      max-height: 100% !important;
      .el-dialog__body {
        padding: 16px !important;
        max-height: calc(100vh - 120px);
        overflow-y: auto;
      }

      .el-dialog__header {
        padding: 16px !important;
        margin-right: 0;
        .el-dialog__title {
          font-size: 16px;
        }
      }

      .el-dialog__footer {
        padding: 12px 16px !important;
      }

      .el-form-item {
        margin-bottom: 18px;

        .el-form-item__label {
          font-size: 14px;
          line-height: 1.4;
        }

        .el-form-item__content {
          line-height: 1.4;
        }
      }

      .el-input,
      .el-select {
        font-size: 14px;
      }

      .el-textarea {
        .el-textarea__inner {
          font-size: 13px !important;
        }
      }

      // 优化表单在移动端的间距
      .el-form-item {
        margin-bottom: 20px;
        position: relative;

        &:last-child {
          margin-bottom: 0;
        }

        // 特别处理cookie字段的间距
        &:has([prop='cookie']) {
          margin-bottom: 16px;

          .el-form-item__content {
            .cookie-mask,
            .cookie-content {
              margin-bottom: 0;
            }

            .cookie-info-footer {
              margin-top: 8px;
            }
          }
        }

        // 直接针对包含cookie输入框的表单项
        &[prop='cookie'] {
          .el-form-item__content {
            > * {
              width: 100%;
              box-sizing: border-box;
            }
          }
        }
      }
    }
  }

  .cookie-mask {
    height: 120px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-light);
    margin-bottom: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    max-width: 360px;
    box-sizing: border-box;
    display: flex;
    align-items: center;

    @media screen and (max-width: 768px) {
      height: 90px;
      margin-bottom: 12px;
      border-radius: 6px;
      width: 100%;
      max-width: none;
    }

    &:hover {
      @media screen and (min-width: 769px) {
        border-color: var(--el-color-primary-light-5);
        box-shadow: var(--el-box-shadow-light);
        transform: translateY(-2px);

        .cookie-mask-icon {
          transform: scale(1.1);
          background-color: var(--el-color-primary-light-8);

          .el-icon {
            color: var(--el-color-primary);
          }
        }

        .cookie-mask-text {
          .cookie-mask-title {
            color: var(--el-color-primary);
          }
        }
      }
    }

    &:active {
      transform: translateY(0);
      box-shadow: var(--el-box-shadow-lighter);
    }

    .cookie-mask-content {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 24px;
      gap: 16px;
      position: relative;
      z-index: 1;

      @media screen and (max-width: 768px) {
        padding: 0 14px;
        gap: 12px;
      }
    }

    .cookie-mask-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--el-color-primary-light-9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      @media screen and (max-width: 768px) {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .el-icon {
        font-size: 24px;
        color: var(--el-color-primary-light-3);
        transition: color 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        @media screen and (max-width: 768px) {
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }

    .cookie-mask-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      flex-grow: 1;
      justify-content: center;

      @media screen and (max-width: 768px) {
        gap: 2px;
        justify-content: center;
        align-self: center;
      }

      .cookie-mask-title {
        font-size: 15px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        transition: color 0.3s ease;
        line-height: 1.3;

        @media screen and (max-width: 768px) {
          font-size: 13px;
          line-height: 1.2;
        }
      }

      .cookie-mask-desc {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        line-height: 1.3;

        @media screen and (max-width: 768px) {
          font-size: 11px;
          line-height: 1.2;
        }
      }
    }
  }

  .cookie-info-footer {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 360px;
    box-sizing: border-box;

    @media screen and (max-width: 768px) {
      padding: 8px 10px;
      margin-top: 10px;
      flex-direction: column;
      gap: 10px;
      align-items: stretch;
      justify-content: flex-start;
      width: 100%;
      max-width: none;
      border-radius: 6px;
    }

    .cookie-expire-info {
      display: flex;
      align-items: center;

      @media screen and (max-width: 768px) {
        justify-content: flex-start;
        width: 100%;
        margin-bottom: 4px;
      }

      .cookie-days {
        font-size: 13px;
        padding: 0 8px;
        height: 24px;
        line-height: 24px;
        white-space: nowrap;

        @media screen and (max-width: 768px) {
          font-size: 12px;
          height: 22px;
          line-height: 22px;
          padding: 0 6px;
          white-space: nowrap;
        }
      }
    }

    .cookie-expire-setting {
      display: flex;
      align-items: center;
      gap: 8px;

      @media screen and (max-width: 768px) {
        width: 100%;
        justify-content: flex-start;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      .expire-days-input {
        width: 100px;

        @media screen and (max-width: 768px) {
          width: 100px;
          flex-shrink: 0;
        }

        :deep(.el-input__inner) {
          @media screen and (max-width: 768px) {
            font-size: 13px;
            height: 30px;
            text-align: center;
            padding: 0 8px;
          }
        }
      }

      .expire-days-label {
        color: var(--el-text-color-regular);
        font-size: 13px;
        flex-shrink: 0;
        white-space: nowrap;

        @media screen and (max-width: 768px) {
          font-size: 12px;
          line-height: 1.2;
          white-space: nowrap;
        }
      }

      .info-icon {
        color: var(--el-text-color-secondary);
        font-size: 14px;
        cursor: help;
        flex-shrink: 0;

        @media screen and (max-width: 768px) {
          font-size: 13px;
        }
      }

      .renew-button {
        margin-left: 8px;
        flex-shrink: 0;
        font-size: 12px;
        height: 28px;
        padding: 0 12px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.3s ease;

        @media screen and (max-width: 768px) {
          margin-left: 0;
          margin-top: 6px;
          width: auto;
          height: 26px;
          padding: 0 10px;
          font-size: 11px;
        }

        .el-icon {
          font-size: 12px;

          @media screen and (max-width: 768px) {
            font-size: 11px;
          }
        }

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
        }

        &:active {
          transform: translateY(0);
        }

        &.is-loading {
          cursor: not-allowed;

          .el-icon {
            animation: rotate 1s linear infinite;
          }
        }
      }
    }

    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  }

  .cookie-content {
    max-width: 360px;
    box-sizing: border-box;

    @media screen and (max-width: 768px) {
      width: 100%;
      max-width: none;
      box-sizing: border-box;
    }

    .cookie-content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      @media screen and (max-width: 768px) {
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 8px;
      }

      .cookie-content-title {
        font-size: 15px;
        font-weight: 500;
        color: var(--el-text-color-primary);

        @media screen and (max-width: 768px) {
          font-size: 14px;
        }
      }

      .cookie-hide-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;

        @media screen and (max-width: 768px) {
          font-size: 12px;
        }

        .el-icon {
          font-size: 14px;

          @media screen and (max-width: 768px) {
            font-size: 13px;
          }
        }
      }
    }

    .el-textarea {
      @media screen and (max-width: 768px) {
        font-size: 13px;
      }
    }
  }

  // 国服角色信息显示样式
  .cn-game-info {
    .info-card {
      padding: 16px;
      background-color: var(--el-fill-color-light);
      border-radius: 8px;
      border: 1px solid var(--el-border-color-lighter);

      @media screen and (max-width: 768px) {
        padding: 12px;
        border-radius: 6px;
      }

      .info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        @media screen and (max-width: 768px) {
          margin-bottom: 10px;
          flex-direction: row;
          gap: 8px;
        }

        &:last-child {
          margin-bottom: 0;
        }

        .info-label {
          font-size: 14px;
          color: var(--el-text-color-regular);
          font-weight: 500;
          min-width: 80px;

          @media screen and (max-width: 768px) {
            font-size: 13px;
            min-width: 70px;
          }
        }

        .info-value {
          font-size: 14px;
          color: var(--el-text-color-primary);
          font-weight: 500;
          text-align: right;
          flex: 1;
          word-break: break-all;

          @media screen and (max-width: 768px) {
            font-size: 13px;
            text-align: left;
          }
        }

        .el-tag {
          margin-left: auto;

          @media screen and (max-width: 768px) {
            margin-left: 0;
          }
        }
      }
    }
  }

  // 国际服角色信息显示样式（复用国服样式）
  .global-game-info {
    .info-card {
      padding: 16px;
      background-color: var(--el-fill-color-light);
      border-radius: 8px;
      border: 1px solid var(--el-border-color-lighter);

      @media screen and (max-width: 768px) {
        padding: 12px;
        border-radius: 6px;
      }

      .info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        @media screen and (max-width: 768px) {
          margin-bottom: 10px;
          flex-direction: row;
          gap: 8px;
        }

        &:last-child {
          margin-bottom: 0;
        }

        .info-label {
          font-size: 14px;
          color: var(--el-text-color-regular);
          font-weight: 500;
          min-width: 80px;

          @media screen and (max-width: 768px) {
            font-size: 13px;
            min-width: 70px;
          }
        }

        .info-value {
          font-size: 14px;
          color: var(--el-text-color-primary);
          font-weight: 500;
          text-align: right;
          flex: 1;
          word-break: break-all;

          @media screen and (max-width: 768px) {
            font-size: 13px;
            text-align: left;
          }
        }

        .el-tag {
          margin-left: auto;

          @media screen and (max-width: 768px) {
            margin-left: 0;
          }
        }
      }
    }

    .loading-placeholder {
      padding: 24px;
      text-align: center;
      color: var(--el-text-color-secondary);
      font-size: 14px;
      background-color: var(--el-fill-color-light);
      border-radius: 8px;
      border: 1px solid var(--el-border-color-lighter);

      @media screen and (max-width: 768px) {
        padding: 16px;
        font-size: 13px;
      }
    }
  }

  // Dialog footer样式
  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    @media screen and (max-width: 768px) {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .dialog-footer-left {
      display: flex;
      align-items: center;

      @media screen and (max-width: 768px) {
        justify-content: center;
        order: 2;
      }

      .help-button {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: var(--el-color-info);
        padding: 8px 12px;
        border-radius: 4px;
        transition: all 0.3s ease;

        @media screen and (max-width: 768px) {
          font-size: 12px;
          padding: 6px 10px;
        }

        &:hover {
          background-color: var(--el-color-info-light-9);
          color: var(--el-color-info-dark-2);
        }

        .el-icon {
          font-size: 14px;

          @media screen and (max-width: 768px) {
            font-size: 13px;
          }
        }
      }
    }

    .dialog-footer-right {
      display: flex;
      gap: 12px;
      align-items: center;

      @media screen and (max-width: 768px) {
        order: 1;
        width: 100%;
        justify-content: flex-end;
        gap: 10px;
      }
    }
  }
}
</style>
