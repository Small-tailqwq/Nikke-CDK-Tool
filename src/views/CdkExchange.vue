<template>
  <div class="cdk-exchange">
    <!-- 用户选择区域 -->
    <el-card class="user-card">
      <template #header>
        <div class="card-header">
          <span>选择用户</span>
          <span class="selected-count" v-if="selectedUserIds.length">
            已选择 {{ selectedUserIds.length }} 个用户
          </span>
        </div>
      </template>

      <div class="user-cards-container" v-loading="userStore.loading">
        <transition-group name="user-card-list">
          <!-- 用户卡片 (显示所有用户) -->
          <div
            v-for="user in userStore.users"
            :key="user.id"
            class="user-card"
            :class="{ 'is-selected': isUserSelected(user.id) }"
            @click="toggleUserSelection(user)"
          >
            <div class="user-card-content">
              <div class="user-info">
                <!-- 角色备注名 -->
                <h3>{{ user.name }}</h3>
                <!-- 角色游戏名 -->
                <p class="player-name">{{ getPlayerGameName(user) }}</p>

                <!-- 统一的游戏服区显示 -->
                <div class="server-info">
                  <!-- 服务器大区信息 -->
                  <div class="server-badge" :class="getServerBadgeClass(user)">
                    {{ getServerDisplayName(user) }}
                  </div>

                  <!-- 服务器小区信息（如果有） -->
                  <div
                    v-if="getSubRegion(user)"
                    class="sub-region-badge"
                    :class="getSubRegionBadgeClass(user)"
                  >
                    {{ getSubRegion(user) }}
                  </div>

                  <!-- 非国服显示Cookie状态 -->
                  <el-tag
                    v-if="user.server !== 'cn'"
                    :type="getCookieStatusType(user.cookieExpireDays)"
                    size="small"
                    class="cookie-status"
                  >
                    Cookie剩余 {{ user.cookieExpireDays }} 天
                  </el-tag>
                </div>
              </div>

              <div class="selection-indicator">
                <el-icon v-if="isUserSelected(user.id)">
                  <Check />
                </el-icon>
              </div>
            </div>
          </div>

          <!-- 添加用户卡片 -->
          <div
            key="add-user"
            class="user-card add-user-card"
            @click="showAddUserDialog"
          >
            <div class="add-user-content">
              <el-icon><Plus /></el-icon>
              <span>添加新用户</span>
            </div>
          </div>
        </transition-group>
      </div>
    </el-card>

    <!-- CDK兑换区域 -->
    <el-card class="cdk-card">
      <template #header>
        <div class="card-header">
          <span>CDK兑换</span>
          <el-button
            type="primary"
            @click="handleExchange"
            :loading="exchanging"
            :disabled="!canExchange"
          >
            {{ exchangeButtonText }}
          </el-button>
        </div>
      </template>

      <!-- CDK输入 -->
      <div v-if="hasUsers" class="exchange-section">
        <el-form :model="form" class="cdk-form">
          <el-form-item label="CDK" label-position="top">
            <div class="cdk-input-wrapper">
              <el-input
                v-model="form.cdk"
                type="textarea"
                :rows="4"
                placeholder="请输入CDK，每行一个&#10;按 Enter 换行"
                :disabled="exchanging"
                @keydown.enter.prevent="handleEnterKey"
                resize="none"
                class="cdk-textarea"
              />
              <div class="form-tip">
                <el-icon><InfoFilled /></el-icon>
                <span>提示：每行输入一个CDK，支持批量兑换</span>
                <br />
              </div>
            </div>
          </el-form-item>
        </el-form>

        <!-- 兑换结果展示 -->
        <div v-if="exchangeResults.length" class="exchange-results">
          <el-collapse v-model="activeResults">
            <el-collapse-item
              v-for="(result, index) in exchangeResults"
              :key="index"
              :name="index"
            >
              <template #title>
                <el-tag
                  :type="result.success ? 'success' : 'danger'"
                  size="small"
                >
                  {{ result.userName }}
                </el-tag>
                <span class="result-title">
                  {{ result.cdk }} -
                  {{ result.success ? '兑换成功' : '兑换失败' }}
                </span>
              </template>
              <p class="result-message">{{ result.message }}</p>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <!-- 无用户提示 -->
      <div v-if="!hasUsers" class="no-users-tip">
        <el-empty description="暂无用户，请先添加用户">
          <el-button type="primary" @click="showAddUserDialog">
            添加用户
          </el-button>
        </el-empty>
      </div>
    </el-card>

    <!-- 最近兑换记录 -->
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>最近兑换记录</span>
          <el-button link @click="$router.push('/history')">
            查看全部
          </el-button>
        </div>
      </template>

      <el-table
        :data="exchangeStore.recentHistory"
        stripe
        v-loading="exchangeStore.loading"
      >
        <el-table-column prop="date" label="兑换时间" width="180" />
        <el-table-column prop="userName" label="用户" />
        <el-table-column prop="cdk" label="CDK" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="结果" />
      </el-table>
    </el-card>

    <!-- 对话框 -->
    <user-dialog v-model:visible="dialogVisible" :is-edit="false" />

    <!-- 国服验证码对话框 -->
    <el-dialog
      v-model="captchaDialogVisible"
      title="国服CDK兑换 - 验证码"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="captcha-dialog-content">
        <div class="user-info">
          <p><strong>用户：</strong>{{ currentCnUser?.name }}</p>
          <p><strong>CDK：</strong>{{ currentCdk }}</p>
          <p v-if="globalCdkTotal > 1">
            <strong>进度：</strong>{{ globalCdkIndex }} /
            {{ globalCdkTotal }}
          </p>
        </div>

        <el-form @submit.prevent="submitCnExchange">
          <el-form-item label="验证码">
            <div class="captcha-container">
              <div class="captcha-image-wrapper">
                <img
                  v-if="captchaForm.captchaUrl"
                  :src="captchaForm.captchaUrl"
                  alt="验证码"
                  class="captcha-image"
                  @click="refreshCaptcha"
                />
                <div v-else class="captcha-placeholder" @click="refreshCaptcha">
                  <el-icon><Refresh /></el-icon>
                  <span>点击获取验证码</span>
                </div>
              </div>

              <div class="captcha-input-wrapper">
                <el-input
                  ref="captchaInputRef"
                  v-model="captchaForm.captcha"
                  placeholder="请输入验证码"
                  :disabled="captchaLoading"
                  @keyup.enter="submitCnExchange"
                />
                <el-button
                  link
                  type="primary"
                  @click="refreshCaptcha"
                  :loading="captchaLoading"
                  size="small"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelCnExchange">取消</el-button>
          <el-button
            type="primary"
            @click="submitCnExchange"
            :loading="captchaLoading"
            :disabled="!captchaForm.captcha"
          >
            兑换
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Plus, InfoFilled, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import { useRoute } from 'vue-router'
import UserDialog from '../components/UserDialog.vue'

import { exchangeCDK, getCaptchaCN, exchangeCDKCN } from '../utils/api'

const route = useRoute()
const userStore = useUserStore()
const exchangeStore = useExchangeStore()

const selectedUserIds = ref([])
const dialogVisible = ref(false)
const exchanging = ref(false)
const activeResults = ref([])
const exchangeResults = ref([])

// 国服验证码对话框状态
const captchaDialogVisible = ref(false)
const captchaForm = reactive({
  captcha: '',
  captchaUrl: '',
  aid: '',
  verifysession: '',
})
const captchaLoading = ref(false)
const currentCnUser = ref(null)
const currentCdk = ref('')
const captchaInputRef = ref(null)
const currentCdkIndex = ref(0)
const totalCdkCount = ref(0)
const isRefreshingCaptcha = ref(false)
const globalCdkIndex = ref(0)
const globalCdkTotal = ref(0)

const form = reactive({
  cdk: '',
})

// 从参数中选择用户
const selectUserFromParam = (userId) => {
  if (!userId) return

  // 日志记录所有用户，帮助调试
  console.log('当前用户列表:', userStore.users)

  // 首先检查用户是否已加载
  const user = userStore.getUserById(userId)
  if (user) {
    console.log(
      '找到用户，自动选择:',
      user.name,
      '用户ID:',
      user.id,
      '类型:',
      typeof user.id
    )
    // 直接设置选中状态，不使用nextTick
    selectedUserIds.value = [Number(user.id)]
    console.log('已设置选中用户:', selectedUserIds.value)
  } else {
    console.warn('未找到ID为', userId, '的用户', '类型:', typeof userId)
    // 尝试重新加载用户列表
    userStore
      .fetchUsers()
      .then(() => {
        console.log('重新加载后的用户列表:', userStore.users)
        const refreshedUser = userStore.getUserById(userId)
        if (refreshedUser) {
          console.log(
            '重新加载后找到用户:',
            refreshedUser.name,
            '用户ID:',
            refreshedUser.id
          )
          // 直接设置选中状态
          selectedUserIds.value = [Number(refreshedUser.id)]
          console.log('重新加载后已设置选中用户:', selectedUserIds.value)
        } else {
          console.error('即使重新加载也未找到用户:', userId)
        }
      })
      .catch((err) => {
        console.error('加载用户数据失败:', err)
      })
  }
}

// 计算属性
const globalUsers = computed(() => {
  return userStore.users.filter((user) => user.server !== 'cn')
})

const cnUsers = computed(() => {
  return userStore.users.filter((user) => user.server === 'cn')
})

const hasGlobalUsers = computed(() => globalUsers.value.length > 0)
const hasCnUsers = computed(() => cnUsers.value.length > 0)
const hasUsers = computed(() => userStore.users.length > 0)

// 监听路由参数变化
watch(
  () => route.query,
  (newQuery) => {
    try {
      console.log('路由参数变化:', newQuery)

      // 防止循环触发，检查是否已清除参数
      if (Object.keys(newQuery).length === 0) {
        console.log('路由参数已被清除，跳过处理')
        return
      }

      // 处理CDKs参数
      if (newQuery.cdks) {
        form.cdk = decodeURIComponent(newQuery.cdks)
      }

      // 处理userId参数，自动选择用户
      if (newQuery.userId) {
        const userId = String(newQuery.userId)
        console.log('从URL参数获取到用户ID:', userId)

        // 确保用户数据已加载
        if (userStore.users.length === 0) {
          console.log('用户列表为空，加载用户数据')
          userStore.fetchUsers().then(() => {
            selectUserFromParam(userId)
          })
        } else {
          selectUserFromParam(userId)
        }
      }

      // 延迟清除路由参数，确保视图更新完成
      setTimeout(() => {
        try {
          if (Object.keys(route.query).length > 0) {
            console.log('清除路由参数...')
            window.history.replaceState({}, '', '/cdk')
          }
        } catch (e) {
          console.error('清除路由参数错误:', e)
        }
      }, 1000)
    } catch (error) {
      console.error('处理路由参数错误:', error)
    }
  },
  { immediate: true }
)

// 是否可以兑换 (统一处理)
const canExchange = computed(() => {
  return (
    selectedUserIds.value.length > 0 &&
    form.cdk
      .trim()
      .split('\n')
      .some((cdk) => cdk.trim() !== '')
  )
})

// 兑换按钮文本 (统一处理)
const exchangeButtonText = computed(() => {
  if (selectedUserIds.value.length === 0) return '请选择用户'
  const cdkCount = form.cdk
    .trim()
    .split('\n')
    .filter((cdk) => cdk.trim() !== '').length
  return `为 ${selectedUserIds.value.length} 个用户兑换 ${cdkCount} 个CDK`
})

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days > 180) return 'success'
  if (days > 30) return 'warning'
  return 'danger'
}

// 解析国服用户的游戏参数
const parseCnUserData = (user) => {
  if (user.server !== 'cn' || !user.cookie) {
    return null
  }

  try {
    const gameParams = JSON.parse(user.cookie)
    return {
      role_id: gameParams.role_id,
      role_name: gameParams.role_name,
      area_id: gameParams.area_id,
      zone_id: gameParams.zone_id,
    }
  } catch (error) {
    console.warn('解析国服用户数据失败:', error)
    return null
  }
}

// 获取国服平台类型（微信/QQ）
const getCnPlatformType = (user) => {
  const cnData = parseCnUserData(user)
  if (!cnData) return 'qq' // 默认QQ

  // area_id: '1' = 微信, '2' = QQ
  return cnData.area_id === '1' ? 'wechat' : 'qq'
}

// 获取国服平台显示文本
const getCnPlatformText = (user) => {
  const platformType = getCnPlatformType(user)
  return platformType === 'wechat' ? '微信区' : 'QQ区'
}

// 获取国服平台CSS类
const getCnPlatformClass = (user) => {
  const platformType = getCnPlatformType(user)
  return platformType === 'wechat' ? 'platform-wechat' : 'platform-qq'
}

// 获取角色游戏名
const getPlayerGameName = (user) => {
  if (user.server === 'cn') {
    // 国服：从cookie中解析role_name
    const cnData = parseCnUserData(user)
    if (cnData && cnData.role_name) {
      try {
        return decodeURIComponent(cnData.role_name)
      } catch {
        return cnData.role_name
      }
    }
  } else if (user.playerInfo && user.playerInfo.role_name) {
    // 国际服：使用playerInfo中的role_name
    return user.playerInfo.role_name
  }
  return user.name // 回退到备注名
}

// 国际服区域映射表（英文 -> 中文）
const regionMapping = {
  Global: '全球区',
  Japan: '日区',
  Korea: '韩区',
  NA: '北美区',
  SEA: '东南亚区',
}

// 获取服务器显示名称（大区）
const getServerDisplayName = (user) => {
  if (user.server === 'cn') {
    // 国服显示"国服"
    return '国服'
  } else if (user.server === 'global') {
    // 国际服显示"国际服"
    return '国际服'
  } else if (user.server === 'tw') {
    // 港澳台服显示"港澳台服"
    return '港澳台服'
  } else {
    // 回退到原始服务器名称
    return user.serverName
  }
}

// 获取服务器小区信息
const getSubRegion = (user) => {
  if (user.server === 'cn') {
    // 国服显示平台类型（QQ区/微信区）
    return getCnPlatformText(user)
  } else if (user.playerInfo && user.playerInfo.region_name) {
    // 国际服/港澳台服显示具体区域（日区、韩区等）
    return (
      regionMapping[user.playerInfo.region_name] || user.playerInfo.region_name
    )
  }
  return null
}

// 获取服务器徽章样式类
const getServerBadgeClass = (user) => {
  if (user.server === 'cn') {
    // 国服所有徽章使用统一的国服样式
    return 'server-cn'
  } else if (user.server === 'global') {
    return 'server-global'
  } else if (user.server === 'tw') {
    return 'server-sea'
  }
  return 'server-global' // 默认
}

// 获取服务器小区徽章样式类
const getSubRegionBadgeClass = (user) => {
  if (user.server === 'cn') {
    // 国服的小区（平台）使用具体的平台样式
    const platformType = getCnPlatformType(user)
    return platformType === 'wechat' ? 'server-wechat' : 'server-qq'
  } else {
    // 国际服/港澳台服的小区使用与大区相同的样式
    return getServerBadgeClass(user)
  }
}

// 切换用户选择
const toggleUserSelection = (user) => {
  const index = selectedUserIds.value.indexOf(user.id)
  if (index === -1) {
    // 选中：确保添加数字类型ID
    selectedUserIds.value.push(Number(user.id))
    console.log(
      '手动选中用户:',
      user.name,
      'ID:',
      user.id,
      '当前已选:',
      selectedUserIds.value
    )
  } else {
    // 取消选中
    selectedUserIds.value.splice(index, 1)
    console.log(
      '取消选中用户:',
      user.name,
      'ID:',
      user.id,
      '当前已选:',
      selectedUserIds.value
    )
  }
}

// 检查用户是否被选中
const isUserSelected = (userId) => {
  // 确保类型一致，使用数字比较
  return selectedUserIds.value.includes(Number(userId))
}

// 显示添加用户对话框
const showAddUserDialog = () => {
  dialogVisible.value = true
}

// 处理回车键 (仅国际服)
const handleEnterKey = (e) => {
  if (e.shiftKey) {
    // Shift + Enter 时插入换行
    const textarea = e.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    form.cdk = form.cdk.substring(0, start) + '\n' + form.cdk.substring(end)
    // 设置光标位置到换行符后
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1
    })
  } else {
    // 普通 Enter 时也插入换行
    const textarea = e.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    form.cdk = form.cdk.substring(0, start) + '\n' + form.cdk.substring(end)
    // 设置光标位置到换行符后
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1
    })
  }
}

// 处理兑换 (统一处理所有用户类型)
const handleExchange = async () => {
  if (!canExchange.value) return

  exchanging.value = true
  exchangeResults.value = []

  try {
    const selectedUsers = selectedUserIds.value
      .map((id) => userStore.getUserById(id))
      .filter((user) => user)

    const cdkList = form.cdk
      .split('\n')
      .map((cdk) => cdk.trim())
      .filter((cdk) => cdk)

    // 为每个用户兑换每个CDK
    const results = []

    // 计算国服用户的总CDK数量
    const cnUsers = selectedUsers.filter((user) => user.server === 'cn')
    const totalCnCdks = cnUsers.length * cdkList.length
    globalCdkTotal.value = totalCnCdks
    globalCdkIndex.value = 0

    for (const user of selectedUsers) {
      // 对于国服用户，计算该用户的CDK总数
      const userCdkCount = user.server === 'cn' ? cdkList.length : 1

      for (let cdkIndex = 0; cdkIndex < cdkList.length; cdkIndex++) {
        const cdk = cdkList[cdkIndex]
        // 记录兑换开始时间
        const exchangeStartTime = new Date()
        try {
          let result

          if (user.server === 'cn') {
            // 国服用户：处理验证码并兑换
            result = await handleCnUserExchange(
              user,
              cdk,
              cdkIndex,
              userCdkCount
            )
          } else {
            // 国际服用户：使用原有逻辑
            result = await exchangeCDK(user.cookie, cdk)
          }

          // 动态导入服务器工具函数
          const { generateHistoryServerInfo } = await import(
            '../utils/serverUtils.js'
          )
          const serverInfo = generateHistoryServerInfo(user)

          // 使用兑换开始时间作为记录时间
          results.push({
            userId: user.id,
            userName: user.name,
            cdk: cdk,
            success: result.success,
            message: result.message,
            ...serverInfo,
            date: exchangeStartTime
              .toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })
              .replace(/\//g, '-'),
          })
        } catch (error) {
          // 动态导入服务器工具函数
          const { generateHistoryServerInfo } = await import(
            '../utils/serverUtils.js'
          )
          const serverInfo = generateHistoryServerInfo(user)

          // 使用兑换开始时间作为记录时间
          results.push({
            userId: user.id,
            userName: user.name,
            cdk: cdk,
            success: false,
            message: error.message || '兑换失败',
            ...serverInfo,
            date: exchangeStartTime
              .toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })
              .replace(/\//g, '-'),
          })
        }
        // 添加小延迟，避免请求过于密集
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // 按时间排序结果
    results.sort((a, b) => new Date(a.date) - new Date(b.date))

    // 添加兑换记录
    await exchangeStore.addExchangeRecords(results)
    exchangeResults.value = results

    // 显示结果统计
    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    if (failCount === 0) {
      ElMessage.success(`全部兑换成功`)
      form.cdk = ''
      selectedUserIds.value = []
    } else if (successCount === 0) {
      ElMessage.error(`全部兑换失败`)
    } else {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`)
    }

    // 展开结果面板
    activeResults.value = results.map((_, index) => index)
  } finally {
    exchanging.value = false
  }
}

// 处理国服用户兑换
const handleCnUserExchange = async (user, cdk, cdkIndex = 0, totalCdks = 1) => {
  return new Promise((resolve) => {
    // 设置当前处理的用户和CDK
    currentCnUser.value = user
    currentCdk.value = cdk
    currentCdkIndex.value = cdkIndex
    totalCdkCount.value = totalCdks

    // 如果对话框未显示，则获取验证码并显示对话框
    if (!captchaDialogVisible.value) {
      getCaptchaAndShowDialog().then(() => {
        // 等待用户输入验证码完成兑换
        const checkResult = () => {
          if (captchaForm.result) {
            // 兑换完成，返回结果
            const result = captchaForm.result
            captchaForm.result = null // 清空结果，准备下次兑换
            resolve(result)
          } else if (!captchaDialogVisible.value) {
            // 对话框关闭，用户取消
            resolve({
              success: false,
              message: '用户取消兑换',
            })
          } else {
            // 继续等待
            setTimeout(checkResult, 100)
          }
        }
        checkResult()
      })
    } else {
      // 对话框已显示，直接等待兑换（不重复刷新验证码）
      const checkResult = () => {
        if (captchaForm.result) {
          // 兑换完成，返回结果
          const result = captchaForm.result
          captchaForm.result = null // 清空结果，准备下次兑换
          resolve(result)
        } else if (!captchaDialogVisible.value) {
          // 对话框关闭，用户取消
          resolve({
            success: false,
            message: '用户取消兑换',
          })
        } else {
          // 继续等待
          setTimeout(checkResult, 100)
        }
      }
      checkResult()
    }
  })
}

// 获取验证码并显示对话框
const getCaptchaAndShowDialog = async () => {
  // 防止重复请求
  if (isRefreshingCaptcha.value) {
    return
  }

  try {
    isRefreshingCaptcha.value = true
    captchaLoading.value = true
    const result = await getCaptchaCN()

    if (result.success) {
      captchaForm.captchaUrl = result.captchaUrl
      captchaForm.aid = result.aid
      captchaForm.verifysession = result.verifysession
      captchaForm.captcha = ''
      captchaForm.result = null
      captchaDialogVisible.value = true

      // 等待对话框显示后自动聚焦输入框
      await nextTick()
      if (captchaInputRef.value) {
        captchaInputRef.value.focus()
      }
    } else {
      ElMessage.error(result.message || '获取验证码失败')
      captchaForm.result = {
        success: false,
        message: result.message || '获取验证码失败',
      }
    }
  } catch (error) {
    ElMessage.error('获取验证码失败')
    captchaForm.result = {
      success: false,
      message: '获取验证码失败',
    }
  } finally {
    captchaLoading.value = false
    isRefreshingCaptcha.value = false
  }
}

// 提交国服验证码兑换
const submitCnExchange = async () => {
  if (!captchaForm.captcha) {
    ElMessage.error('请输入验证码')
    return
  }

  try {
    captchaLoading.value = true

    // 从cookie中解析游戏参数
    let gameParams = {}
    try {
      gameParams = JSON.parse(currentCnUser.value.cookie)
    } catch (error) {
      ElMessage.error('用户数据格式错误')
      captchaForm.result = {
        success: false,
        message: '用户数据格式错误',
      }
      return
    }

    // 准备兑换参数，包含完整的用户cookie信息
    const exchangeParams = {
      ...gameParams,
      verifysession: captchaForm.verifysession,
      cookie: currentCnUser.value.cookie, // 传递完整的用户数据供Worker构建Cookie
    }

    const result = await exchangeCDKCN(
      exchangeParams,
      currentCdk.value,
      captchaForm.captcha
    )

    // 保存结果，但不关闭对话框
    captchaForm.result = result

    // 无论成功失败，都增加全局计数器
    globalCdkIndex.value++

    if (result.success) {
      ElMessage.success('兑换成功')
      // 成功后清空输入框，准备下一个CDK
      captchaForm.captcha = ''

      // 检查是否所有CDK都兑换完成
      if (globalCdkIndex.value >= globalCdkTotal.value) {
        // 所有CDK兑换完成，延迟关闭对话框
        setTimeout(() => {
          captchaDialogVisible.value = false
          // 重置全局状态
          globalCdkIndex.value = 0
          globalCdkTotal.value = 0
        }, 1000)
      } else {
        // 还有更多CDK需要兑换，立即自动聚焦
        nextTick(() => {
          // 自动聚焦输入框，不强制刷新验证码（让用户可以继续使用当前验证码）
          if (captchaInputRef.value) {
            captchaInputRef.value.focus()
          }
        })
      }
    } else {
      ElMessage.error(result.message || '兑换失败')
      // 失败后也要检查是否需要关闭
      if (globalCdkIndex.value >= globalCdkTotal.value) {
        // 所有CDK处理完成，延迟关闭对话框
        setTimeout(() => {
          captchaDialogVisible.value = false
          // 重置全局状态
          globalCdkIndex.value = 0
          globalCdkTotal.value = 0
        }, 1000)
      } else {
        // 失败后立即刷新验证码
        refreshCaptchaOnly().then(() => {
          // 自动聚焦输入框
          nextTick(() => {
            if (captchaInputRef.value) {
              captchaInputRef.value.focus()
            }
          })
        })
      }
    }
  } catch (error) {
    ElMessage.error('兑换失败')
    captchaForm.result = {
      success: false,
      message: error.message || '兑换失败',
    }
  } finally {
    captchaLoading.value = false
  }
}

// 取消国服兑换
const cancelCnExchange = () => {
  captchaForm.result = {
    success: false,
    message: '用户取消兑换',
  }
  captchaDialogVisible.value = false
  // 重置状态
  currentCdkIndex.value = 0
  totalCdkCount.value = 0
  globalCdkIndex.value = 0
  globalCdkTotal.value = 0
  isRefreshingCaptcha.value = false
}

// 刷新验证码
const refreshCaptcha = async () => {
  // 防止重复请求
  if (isRefreshingCaptcha.value) {
    return
  }
  await getCaptchaAndShowDialog()
}

// 仅刷新验证码（不重新显示对话框）
const refreshCaptchaOnly = async () => {
  // 防止重复请求
  if (isRefreshingCaptcha.value) {
    return
  }

  try {
    isRefreshingCaptcha.value = true
    captchaLoading.value = true
    const result = await getCaptchaCN()

    if (result.success) {
      captchaForm.captchaUrl = result.captchaUrl
      captchaForm.aid = result.aid
      captchaForm.verifysession = result.verifysession
      captchaForm.captcha = ''
    } else {
      ElMessage.error(result.message || '获取验证码失败')
    }
  } catch (error) {
    ElMessage.error('获取验证码失败')
  } finally {
    captchaLoading.value = false
    isRefreshingCaptcha.value = false
  }
}

onMounted(() => {
  userStore.fetchUsers()
  exchangeStore.fetchHistory()
})
</script>

<style lang="scss" scoped>
.cdk-exchange {
  .user-card,
  .cdk-card,
  .history-card {
    margin-bottom: 20px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
  }

  .selected-count {
    font-size: 14px;
    color: var(--el-color-primary);
  }

  .user-cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    margin-top: 16px;

    .user-card {
      border: 2px solid var(--el-border-color-light);
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      background: var(--el-bg-color);

      &:hover {
        border-color: var(--el-color-primary-light-5);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &.is-selected {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);

        html.dark & {
          border-color: var(--el-color-success-light-3);
          background: rgba(103, 194, 58, 0.1);
        }
      }

      &.add-user-card {
        border-style: dashed;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;

        .add-user-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--el-color-primary);

          .el-icon {
            font-size: 24px;
          }
        }

        &:hover {
          background: var(--el-color-primary-light-9);
        }
      }

      .user-card-content {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .user-info {
          h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--el-text-color-primary);
          }

          p {
            margin: 2px 0;
            font-size: 14px;
            color: var(--el-text-color-regular);
          }

          .player-name {
            font-weight: 500;
            color: var(--el-text-color-primary);
          }

          .server-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 8px;

            .server-badge,
            .sub-region-badge {
              display: inline-flex;
              align-items: center;
              padding: 3px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              border: 1px solid;

              &.server-global {
                background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
                color: white;
                border-color: #409eff;
                box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
              }

              &.server-sea {
                background: linear-gradient(135deg, #e6a23c 0%, #f0b659 100%);
                color: white;
                border-color: #e6a23c;
                box-shadow: 0 2px 4px rgba(230, 162, 60, 0.3);
              }

              &.server-cn {
                background: linear-gradient(135deg, #909399 0%, #c0c4cc 100%);
                color: white;
                border-color: #909399;
                box-shadow: 0 2px 4px rgba(144, 147, 153, 0.3);
              }

              &.server-wechat {
                background: linear-gradient(135deg, #1aad19 0%, #2dc653 100%);
                color: white;
                border-color: #1aad19;
                box-shadow: 0 2px 4px rgba(26, 173, 25, 0.3);
              }

              &.server-qq {
                background: linear-gradient(135deg, #12b7f5 0%, #4fc3f7 100%);
                color: white;
                border-color: #12b7f5;
                box-shadow: 0 2px 4px rgba(18, 183, 245, 0.3);
              }
            }

            .sub-region-badge {
              opacity: 0.9;
              // 保持与server-badge相同的尺寸
              font-size: 11px;
              padding: 3px 10px;
            }

            .cookie-status {
              flex-shrink: 0;
            }
          }
        }

        .selection-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--el-color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;

          html.dark & {
            background: var(--el-color-success);
          }

          .el-icon {
            font-size: 14px;
          }
        }
      }

      &.is-selected .selection-indicator {
        opacity: 1;
      }
    }
  }

  .exchange-section {
    .cdk-form {
      :deep(.el-form-item) {
        width: 100%;
      }

      :deep(.el-form-item__content) {
        width: 100%;
      }

      :deep(.el-form-item__label) {
        padding-bottom: 8px;
        font-weight: 500;
        font-size: 15px;
        color: var(--el-text-color-primary);
      }

      .cdk-input-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }

      .cdk-textarea {
        width: 100% !important;

        :deep(.el-textarea__inner) {
          width: 100% !important;
          font-family: monospace;
          line-height: 1.5;
          padding: 12px;
          font-size: 14px;

          &:focus {
            box-shadow: 0 0 0 1px var(--el-color-primary) inset;
          }

          /* 美观的滚动条样式 */
          scrollbar-width: thin;
          scrollbar-color: var(--scrollbar-thumb) transparent;

          &::-webkit-scrollbar {
            width: 4px;
          }

          &::-webkit-scrollbar-track {
            background: transparent;
          }

          &::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 2px;
          }
        }
      }

      .form-tip {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--el-color-info);

        .el-icon {
          font-size: 14px;
        }
      }
    }

    .exchange-results {
      margin-top: 20px;

      .result-title {
        margin-left: 12px;
        font-size: 14px;
      }

      .result-message {
        margin: 8px 0 0 0;
        font-size: 13px;
        color: var(--el-text-color-regular);
      }
    }
  }

  .no-users-tip {
    padding: 20px;
    text-align: center;
  }

  // 验证码对话框样式
  .captcha-dialog-content {
    .user-info {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--el-fill-color-extra-light);
      border-radius: 6px;

      p {
        margin: 4px 0;
        font-size: 14px;
      }
    }

    .captcha-container {
      display: flex;
      gap: 12px;
      align-items: flex-start;

      .captcha-image-wrapper {
        flex-shrink: 0;
      }

      .captcha-image {
        width: 120px;
        height: 40px;
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          border-color: var(--el-color-primary);
          box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
        }
      }

      .captcha-placeholder {
        width: 120px;
        height: 40px;
        border: 1px dashed var(--el-border-color);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        color: var(--el-text-color-placeholder);
        font-size: 12px;

        .el-icon {
          font-size: 16px;
          margin-bottom: 2px;
        }

        &:hover {
          border-color: var(--el-color-primary);
          color: var(--el-color-primary);
        }
      }

      .captcha-input-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    }
  }

  // 动画效果
  .user-card-list-enter-active,
  .user-card-list-leave-active {
    transition: all 0.3s ease;
  }

  .user-card-list-enter-from {
    opacity: 0;
    transform: translateY(20px);
  }

  .user-card-list-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }

  // 响应式设计
  @media (max-width: 768px) {
    .user-cards-container {
      grid-template-columns: 1fr;

      .user-card-content {
        .user-info {
          .server-info {
            margin-top: 6px;
            gap: 6px;

            .server-badge,
            .sub-region-badge {
              padding: 2px 8px;
              font-size: 10px;
            }

            .sub-region-badge {
              padding: 2px 8px;
              font-size: 10px;
            }

            .cookie-status {
              font-size: 11px;
            }
          }
        }
      }
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
}
</style>
