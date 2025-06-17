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
                :min="1"
                :max="3650"
                size="small"
                class="expire-days-input"
              />
              <span class="expire-days-label">天</span>
              <el-tooltip
                content="系统已自动计算Cookie的剩余有效期天数，您也可以手动调整"
                placement="top"
              >
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
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
                  :min="1"
                  :max="3650"
                  size="small"
                  class="expire-days-input"
                />
                <span class="expire-days-label">天</span>
                <el-tooltip
                  content="系统已自动计算Cookie的剩余有效期天数，您也可以手动调整"
                  placement="top"
                >
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
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
import { ElMessage } from 'element-plus'
import {
  Lock,
  InfoFilled,
  ArrowLeft,
  QuestionFilled,
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import { parseGameUrlCN, getGlobalUserCompleteInfo } from '../utils/api'

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
  uid: '',
  gameUrl: '',
})

// 临时存储编辑模式的数据
const editFormData = ref(null)

// 解析Cookie过期时间
const parseCookieExpireDate = (cookieStr) => {
  // 默认值：如果无法解析，返回365天
  const defaultDays = 365

  try {
    // 首先尝试解析Application面板复制的格式（优先级最高）
    if (cookieStr.includes('\t')) {
      const cookieLines = cookieStr.split('\n').filter((line) => line.trim())
      let latestExpireDate = null

      for (const line of cookieLines) {
        const parts = line.split('\t')
        if (parts.length >= 5) {
          const expireDateStr = parts[4]?.trim()
          if (expireDateStr && expireDateStr !== 'Session') {
            try {
              const expireDate = new Date(expireDateStr)
              if (!isNaN(expireDate.getTime())) {
                // 找到最远的过期日期（而不是最近的）
                if (!latestExpireDate || expireDate > latestExpireDate) {
                  latestExpireDate = expireDate
                }
              }
            } catch (e) {
              console.warn('无法解析Application面板日期:', expireDateStr)
            }
          }
        }
      }

      if (latestExpireDate) {
        const now = new Date()
        const diffTime = latestExpireDate - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        console.log(
          '从Application面板解析到过期时间:',
          latestExpireDate.toISOString(),
          '剩余天数:',
          diffDays
        )
        return Math.max(1, diffDays) // 至少返回1天
      }
    }

    // 特别检查OptanonAlertBoxClosed这个常见的Cookie
    const optanonMatch = cookieStr.match(/OptanonAlertBoxClosed=([^;]+)/i)
    if (optanonMatch && optanonMatch[1]) {
      try {
        const dateStr = optanonMatch[1].trim()
        console.log('找到OptanonAlertBoxClosed:', dateStr)

        // 尝试直接解析ISO格式日期
        const expireDate = new Date(dateStr)

        // 检查日期是否有效
        if (!isNaN(expireDate.getTime())) {
          // 对于OptanonAlertBoxClosed，需要加一年作为实际过期时间
          const actualExpireDate = new Date(expireDate)
          actualExpireDate.setFullYear(actualExpireDate.getFullYear() + 1)

          const now = new Date()
          const diffTime = actualExpireDate - now
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          console.log(
            '从OptanonAlertBoxClosed解析到过期时间(+1年):',
            actualExpireDate.toISOString(),
            '剩余天数:',
            diffDays
          )
          return Math.max(1, diffDays) // 至少返回1天
        } else {
          console.log('OptanonAlertBoxClosed日期无效:', expireDate)
        }
      } catch (e) {
        console.warn('解析OptanonAlertBoxClosed日期失败:', optanonMatch[1], e)
      }
    }

    // 检查datestamp参数
    const datestampMatch = cookieStr.match(/datestamp=([^&]+)/i)
    if (datestampMatch && datestampMatch[1]) {
      try {
        // 解码URL编码的日期字符串
        const dateStr = decodeURIComponent(datestampMatch[1].trim())
        console.log('找到datestamp:', dateStr)

        // 处理特殊格式 "Sun+Jun+08+2025+20:30:51+GMT+0800+(香港标准时间)"
        let expireDate

        // 尝试多种格式
        if (dateStr.includes('+')) {
          // 替换多个+为空格，尝试解析
          const cleanDateStr = dateStr.replace(/\+/g, ' ')
          expireDate = new Date(cleanDateStr)
          console.log(
            '尝试解析清理后的datestamp:',
            cleanDateStr,
            '结果:',
            expireDate
          )
        } else {
          expireDate = new Date(dateStr)
        }

        // 检查日期是否有效
        if (!isNaN(expireDate.getTime())) {
          // 对于datestamp，需要加一年作为实际过期时间
          const actualExpireDate = new Date(expireDate)
          actualExpireDate.setFullYear(actualExpireDate.getFullYear() + 1)

          const now = new Date()
          const diffTime = actualExpireDate - now
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          console.log(
            '从datestamp解析到过期时间(+1年):',
            actualExpireDate.toISOString(),
            '剩余天数:',
            diffDays
          )
          return Math.max(1, diffDays) // 至少返回1天
        } else {
          console.log('datestamp日期无效:', expireDate)
        }
      } catch (e) {
        console.warn('解析datestamp日期失败:', datestampMatch[1], e)
      }
    }

    // 检查是否包含多行（可能是从Application面板复制的格式，但不是制表符分隔的）
    if (cookieStr.includes('\n') && !cookieStr.includes('\t')) {
      const cookieLines = cookieStr.split('\n').filter((line) => line.trim())
      let latestExpireDate = null

      for (const line of cookieLines) {
        // 支持空格分隔的格式
        const parts = line.split(/\s{2,}/)

        if (parts.length >= 5) {
          // 第五列通常是过期时间
          const expireDateStr = parts[4]?.trim()

          if (expireDateStr && expireDateStr !== 'Session') {
            try {
              const expireDate = new Date(expireDateStr)

              // 检查日期是否有效
              if (!isNaN(expireDate.getTime())) {
                // 找到最远的过期日期（而不是最早的）
                if (!latestExpireDate || expireDate > latestExpireDate) {
                  latestExpireDate = expireDate
                }
              }
            } catch (e) {
              console.warn('无法解析日期:', expireDateStr, e)
            }
          }
        }
      }

      // 如果找到有效的过期日期，计算剩余天数
      if (latestExpireDate) {
        const now = new Date()
        const diffTime = latestExpireDate - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        console.log(
          '从多行格式解析到过期时间:',
          latestExpireDate.toISOString(),
          '剩余天数:',
          diffDays
        )
        return Math.max(1, diffDays) // 至少返回1天
      }
    }

    // 尝试从字符串中查找日期格式（ISO格式或标准日期格式）
    const dateRegex =
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}|\d{4}-\d{2}-\d{2}/g
    const matches = cookieStr.match(dateRegex)

    if (matches && matches.length > 0) {
      let latestExpireDate = null

      for (const match of matches) {
        try {
          const expireDate = new Date(match)

          // 检查日期是否有效（不一定要在未来）
          if (!isNaN(expireDate.getTime())) {
            // 如果日期在过去，尝试加一年（可能是Cookie创建日期）
            let adjustedDate = new Date(expireDate)
            if (adjustedDate < new Date()) {
              adjustedDate.setFullYear(adjustedDate.getFullYear() + 1)
              console.log(
                '日期在过去，尝试加一年:',
                match,
                '调整为:',
                adjustedDate
              )
            }

            console.log('找到日期格式:', match, '解析为:', adjustedDate)

            // 如果这是第一个有效日期，或者比之前找到的日期更远，则更新
            if (!latestExpireDate || adjustedDate > latestExpireDate) {
              latestExpireDate = adjustedDate
            }
          }
        } catch (e) {
          console.warn('无法解析日期:', match, e)
        }
      }

      // 如果找到有效的过期日期，计算剩余天数
      if (latestExpireDate) {
        const now = new Date()
        const diffTime = latestExpireDate - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        console.log(
          '最终解析到的过期日期:',
          latestExpireDate.toISOString(),
          '剩余天数:',
          diffDays
        )
        return Math.max(1, diffDays) // 至少返回1天
      }
    }

    // 尝试从标准Cookie字符串中解析 expires 属性
    if (cookieStr.includes('expires=')) {
      const expiresMatches = cookieStr.match(/expires=([^;]+)/gi)
      if (expiresMatches && expiresMatches.length > 0) {
        let latestExpireDate = null

        for (const match of expiresMatches) {
          const dateStr = match.replace(/expires=/i, '').trim()
          try {
            const expireDate = new Date(dateStr)

            // 检查日期是否有效
            if (!isNaN(expireDate.getTime())) {
              // 如果日期在过去，尝试加一年
              let adjustedDate = new Date(expireDate)
              if (adjustedDate < new Date()) {
                adjustedDate.setFullYear(adjustedDate.getFullYear() + 1)
                console.log(
                  'expires日期在过去，尝试加一年:',
                  dateStr,
                  '调整为:',
                  adjustedDate
                )
              }

              // 找到最远的过期日期
              if (!latestExpireDate || adjustedDate > latestExpireDate) {
                latestExpireDate = adjustedDate
              }
            }
          } catch (e) {
            console.warn('无法解析expires日期:', dateStr, e)
          }
        }

        // 如果找到有效的过期日期，计算剩余天数
        if (latestExpireDate) {
          const now = new Date()
          const diffTime = latestExpireDate - now
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          console.log(
            '从expires解析到过期时间:',
            latestExpireDate.toISOString(),
            '剩余天数:',
            diffDays
          )
          return Math.max(1, diffDays) // 至少返回1天
        }
      }
    }

    // 尝试从标准Cookie字符串中解析 max-age 属性（秒为单位）
    if (cookieStr.includes('max-age=')) {
      const maxAgeMatches = cookieStr.match(/max-age=(\d+)/gi)
      if (maxAgeMatches && maxAgeMatches.length > 0) {
        let minMaxAge = null

        for (const match of maxAgeMatches) {
          const maxAgeStr = match.replace(/max-age=/i, '').trim()
          const maxAge = parseInt(maxAgeStr, 10)

          // 检查max-age是否有效
          if (!isNaN(maxAge)) {
            // 如果这是第一个有效值，或者比之前找到的值更小，则更新
            if (minMaxAge === null || maxAge < minMaxAge) {
              minMaxAge = maxAge
            }
          }
        }

        // 如果找到有效的max-age，转换为天数
        if (minMaxAge !== null) {
          const diffDays = Math.ceil(minMaxAge / (60 * 60 * 24))
          return Math.max(1, diffDays) // 至少返回1天
        }
      }
    }

    // 如果上述方法都失败，尝试直接从字符串中提取年份，并构造一个日期
    const yearMatch = cookieStr.match(/\b(202[0-9])\b/g)
    if (yearMatch && yearMatch.length > 0) {
      // 找到所有年份
      const years = yearMatch
        .map((year) => parseInt(year, 10))
        .filter((year) => !isNaN(year))
        .sort((a, b) => b - a) // 降序排列，优先使用最远的年份

      if (years.length > 0) {
        const maxYear = years[0] // 获取最大年份
        const currentYear = new Date().getFullYear()

        // 如果年份是当前年份或过去年份，尝试加一年
        let targetYear = maxYear
        if (maxYear <= currentYear) {
          targetYear = currentYear + 1
          console.log('提取的年份不在未来，使用当前年份+1:', targetYear)
        }

        // 构造一个简单的日期：该年的1月1日
        const futureDate = new Date(targetYear, 0, 1)
        const now = new Date()
        const diffTime = futureDate - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        console.log(
          '从年份构造日期:',
          futureDate.toISOString(),
          '剩余天数:',
          diffDays
        )
        return Math.max(1, diffDays) // 至少返回1天
      }
    }
  } catch (error) {
    console.warn('解析Cookie过期时间失败:', error)
  }

  // 如果无法解析，返回默认值
  console.log('无法解析Cookie过期时间，使用默认值:', defaultDays)
  return defaultDays
}

// Cookie输入框提示文本
const cookiePlaceholder = computed(() => {
  return `请粘贴完整的Cookie信息，支持以下两种格式：

1. 从Application面板复制的格式（推荐，可自动解析过期时间）：
game_token  abc123  .domain.com  /  2024-01-01
game_uid    123456  .domain.com  /  2024-01-01

2. 标准Cookie格式（如包含expires或max-age属性也可自动解析过期时间）：
game_token=abc123; game_uid=123456; expires=Wed, 21 Oct 2023 07:28:00 GMT`
})

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days > 180) return 'success'
  if (days > 30) return 'warning'
  return 'danger'
}

// 获取更友好的Cookie状态文本
const getCookieStatusText = (days) => {
  if (days > 365) return `Cookie有效期超过1年`
  if (days > 180) return `Cookie有效期${days}天`
  if (days > 30) return `Cookie有效期${days}天`
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

        // 国际服使用原有的Cookie验证逻辑
        // 处理从Application面板复制的Cookie格式
        let cookieStr = value

        if (value.includes('\t')) {
          // 如果包含制表符，说明是从Application面板复制的格式
          const cookieLines = value.split('\n')
          const cookiePairs = []

          cookieLines.forEach((line) => {
            const parts = line.split('\t')
            if (parts.length < 5) return // 需要至少5列来获取过期时间

            // 第一列是名称，第二列是值
            cookiePairs.push(`${parts[0]}=${parts[1]}`)
          })

          cookieStr = cookiePairs.filter(Boolean).join('; ')
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

        const missingFields = requiredFields.filter(
          (field) => !cookieStr.includes(field)
        )
        if (missingFields.length > 0) {
          callback(
            new Error(`缺少必需的Cookie字段: ${missingFields.join(', ')}`)
          )
          return
        }

        // 解析Cookie过期时间
        const expireDays = parseCookieExpireDate(value)
        form.cookieExpireDays = expireDays

        // 更新表单中的Cookie值为处理后的格式
        form.cookie = cookieStr
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

// 监听Cookie值变化，自动更新过期时间
watch(
  () => form.cookie,
  (newValue) => {
    if (form.server !== 'cn' && newValue) {
      form.cookieExpireDays = parseCookieExpireDate(newValue)
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
          // 保存编辑前的数据，用于取消时恢复
          editFormData.value = { ...userData }
          // 设置表单数据
          Object.assign(form, {
            name: userData.name,
            server: userData.server,
            cookie: userData.cookie,
            cookieExpireDays: userData.cookieExpireDays || 0,
            uid: userData.uid,
            gameUrl: userData.gameUrl,
          })

          // 如果是国际服或港澳台服，重新解析Cookie过期时间
          if (userData.server !== 'cn' && userData.cookie) {
            form.cookieExpireDays = parseCookieExpireDate(userData.cookie)
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
    uid: '',
    gameUrl: '',
  })
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
      ElMessage.error(errorMsg)
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

    const userData = {
      name: form.name,
      server: form.server,
      serverName,
      uid,
      userName,
      cookie: form.cookie,
      cookieExpireDays: Number(form.cookieExpireDays),
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
      // 国际服和港澳台服：设置浏览器Cookie
      try {
        // 导入Cookie设置工具
        const { setBlablaLinkCookies } = await import('../utils/browser-cookie')
        // 设置浏览器Cookie
        const success = setBlablaLinkCookies(form.cookie, form.cookieExpireDays)
        if (success) {
          console.log(
            `[UserDialog] 成功设置浏览器Cookie，过期天数: ${form.cookieExpireDays}`
          )
        } else {
          console.warn('[UserDialog] 设置浏览器Cookie失败')
        }
      } catch (error) {
        console.error('[UserDialog] 设置浏览器Cookie出错:', error)
      }
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

    ElMessage.success(props.isEdit ? '更新成功' : '添加成功')

    // 如果是国际服或港澳台服用户，尝试同步历史记录
    if (savedUser && savedUser.server !== 'cn') {
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
    }

    handleClose()
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
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
        flex-wrap: nowrap;
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
