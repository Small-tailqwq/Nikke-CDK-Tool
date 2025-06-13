<template>
  <div class="blabla-auth-status">
    <!-- 状态指示器 -->
    <div class="auth-indicator" :class="authStatusClass">
      <el-icon class="status-icon">
        <component :is="statusIcon" />
      </el-icon>
      <span class="status-text">{{ statusText }}</span>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button
          v-if="showRefreshButton"
          :loading="isRefreshing"
          size="small"
          type="primary"
          @click="handleRefresh"
        >
          {{ isRefreshing ? '检查中...' : '检查状态' }}
        </el-button>

        <el-button
          v-if="showLoginButton"
          size="small"
          type="primary"
          @click="handleLogin"
        >
          前往登录
        </el-button>
      </div>
    </div>

    <!-- 详细信息（可展开） -->
    <el-collapse-transition>
      <div v-if="showDetails" class="auth-details">
        <div class="detail-item">
          <span class="label">状态：</span>
          <span class="value">{{ authSummary.status }}</span>
        </div>

        <div v-if="authSummary.userInfo" class="detail-item">
          <span class="label">用户信息：</span>
          <span class="value">{{ userDisplayName }}</span>
        </div>

        <div v-if="authSummary.lastCheck" class="detail-item">
          <span class="label">最后检查：</span>
          <span class="value">{{ formatTime(authSummary.lastCheck) }}</span>
        </div>

        <div class="detail-item">
          <span class="label">活跃状态：</span>
          <span class="value">{{ isActive ? '活跃' : '不活跃' }}</span>
        </div>
      </div>
    </el-collapse-transition>

    <!-- 切换详细信息按钮 -->
    <el-button
      text
      size="small"
      class="toggle-details"
      @click="showDetails = !showDetails"
    >
      {{ showDetails ? '隐藏详情' : '显示详情' }}
      <el-icon :class="{ 'rotate-180': showDetails }">
        <ArrowDown />
      </el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user'
import {
  Loading,
  CircleCheck,
  Warning,
  CircleClose,
  QuestionFilled,
  ArrowDown,
} from '@element-plus/icons-vue'

// Props
const props = defineProps({
  autoInit: {
    type: Boolean,
    default: true,
  },
  showOnlyWhenNeeded: {
    type: Boolean,
    default: false,
  },
})

// Store
const userStore = useUserStore()

// 响应式状态
const isRefreshing = ref(false)
const showDetails = ref(false)

// 计算属性
const authSummary = computed(() => userStore.blablaAuthSummary)
const isActive = computed(() => authSummary.value.manager?.isActive ?? false)

const authStatusClass = computed(() => {
  const status = authSummary.value.status
  return {
    'status-checking': status === 'checking',
    'status-authenticated': status === 'authenticated',
    'status-expired': status === 'expired',
    'status-unknown': status === 'unknown',
  }
})

const statusIcon = computed(() => {
  const status = authSummary.value.status
  switch (status) {
    case 'checking':
      return Loading
    case 'authenticated':
      return CircleCheck
    case 'expired':
      return Warning
    case 'unknown':
      return QuestionFilled
    default:
      return CircleClose
  }
})

const statusText = computed(() => {
  const status = authSummary.value.status
  switch (status) {
    case 'checking':
      return 'BlablaLink认证检查中...'
    case 'authenticated':
      return 'BlablaLink已登录'
    case 'expired':
      return 'BlablaLink登录已过期'
    case 'unknown':
      return 'BlablaLink登录状态未知'
    default:
      return 'BlablaLink连接异常'
  }
})

const userDisplayName = computed(() => {
  const userInfo = authSummary.value.userInfo
  if (!userInfo) return '未知'

  // 根据实际返回的用户信息结构调整
  return userInfo.name || userInfo.nickname || userInfo.openid || '用户'
})

const showRefreshButton = computed(() => {
  return ['unknown', 'expired'].includes(authSummary.value.status)
})

const showLoginButton = computed(() => {
  return authSummary.value.status === 'expired'
})

// 如果设置了只在需要时显示，且当前状态正常，则隐藏组件
const shouldShow = computed(() => {
  if (!props.showOnlyWhenNeeded) return true
  return ['checking', 'expired', 'unknown'].includes(authSummary.value.status)
})

// 方法
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await userStore.checkBlablaAuth()
  } catch (error) {
    console.error('刷新认证状态失败:', error)
  } finally {
    isRefreshing.value = false
  }
}

const handleLogin = () => {
  const currentUrl = encodeURIComponent(window.location.href)
  window.open(`https://www.blablalink.com/login?to=${currentUrl}`, '_blank')
}

const formatTime = (timeString) => {
  try {
    return new Date(timeString).toLocaleString('zh-CN')
  } catch {
    return timeString
  }
}

// 生命周期
onMounted(async () => {
  if (props.autoInit) {
    await userStore.initBlablaAuth()
  }
})

onUnmounted(() => {
  // 组件卸载时不销毁认证管理器，因为它是全局的
  // userStore.destroyBlablaAuth()
})
</script>

<style scoped>
.blabla-auth-status {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-bg-color-page);
  margin-bottom: 16px;
}

.auth-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 18px;
}

.status-checking .status-icon {
  color: var(--el-color-primary);
  animation: rotate 1s linear infinite;
}

.status-authenticated .status-icon {
  color: var(--el-color-success);
}

.status-expired .status-icon {
  color: var(--el-color-warning);
}

.status-unknown .status-icon {
  color: var(--el-color-info);
}

.status-text {
  flex: 1;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 8px;
}

.auth-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.detail-item {
  display: flex;
  margin-bottom: 4px;
  font-size: 14px;
}

.label {
  width: 80px;
  color: var(--el-text-color-secondary);
}

.value {
  color: var(--el-text-color-primary);
  font-family: monospace;
}

.toggle-details {
  margin-top: 8px;
  width: 100%;
  border: none !important;
  padding: 4px !important;
}

.toggle-details .el-icon {
  margin-left: 4px;
  transition: transform 0.3s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 暗色模式适配 */
.dark .blabla-auth-status {
  background: var(--el-bg-color-overlay);
}
</style>
