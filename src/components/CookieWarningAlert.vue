<template>
  <!-- Cookie警告提示区域 -->
  <div v-if="cookieWarnings.length > 0" class="cookie-warning-container">
    <!-- 单个警告 -->
    <el-alert
      v-for="warning in cookieWarnings"
      :key="warning.id"
      :title="getWarningTitle(warning)"
      type="warning"
      :description="getWarningDescription(warning)"
      show-icon
      :closable="true"
      @close="handleClose(warning)"
      class="cookie-warning-item"
    >
      <template #default>
        <div class="warning-content">
          <div class="warning-text">
            <strong>{{ warning.userName }}</strong>
            <el-tag
              :type="warning.userServer === 'global' ? 'primary' : 'success'"
              size="small"
              class="server-tag"
            >
              {{ warning.userServer === 'global' ? '国际服' : '港澳台服' }}
            </el-tag>
            的Cookie已失效
          </div>
          <div class="warning-detail">
            {{ warning.message }}
          </div>
        </div>
      </template>

      <template #action>
        <div class="warning-actions">
          <el-button
            size="small"
            type="primary"
            @click="handleEditUser(warning.userId)"
          >
            更新Cookie
          </el-button>
          <el-button size="small" @click="handleClose(warning)">
            关闭
          </el-button>
        </div>
      </template>
    </el-alert>

    <!-- 全部关闭按钮 -->
    <div v-if="cookieWarnings.length > 1" class="warning-actions-bar">
      <el-button
        size="small"
        type="info"
        @click="handleCloseAll"
        :icon="CloseBold"
      >
        关闭所有警告 ({{ cookieWarnings.length }})
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { CloseBold } from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()

// 获取Cookie警告列表
const cookieWarnings = computed(() => userStore.cookieWarnings)

// 获取警告标题
const getWarningTitle = (warning) => {
  switch (warning.problem) {
    case 'invalid':
      return 'Cookie已失效'
    case 'error':
      return 'Cookie检测失败'
    default:
      return 'Cookie状态异常'
  }
}

// 获取警告描述
const getWarningDescription = (warning) => {
  const baseDesc = `用户 ${warning.userName} 的Cookie需要更新`
  if (warning.timestamp) {
    const time = new Date(warning.timestamp).toLocaleTimeString()
    return `${baseDesc} (检测时间: ${time})`
  }
  return baseDesc
}

// 处理单个警告关闭
const handleClose = (warning) => {
  userStore.dismissCookieWarning(warning.id, warning.userId)
}

// 处理全部关闭
const handleCloseAll = () => {
  userStore.dismissAllCookieWarnings()
}

// 处理编辑用户（跳转到用户管理页面并打开编辑对话框）
const handleEditUser = (userId) => {
  // 跳转到用户管理页面
  router.push('/user-management')

  // 延迟触发编辑用户操作（确保页面已加载）
  setTimeout(() => {
    // 通过事件总线或其他方式通知用户管理页面打开编辑对话框
    const event = new CustomEvent('editUser', {
      detail: { userId },
    })
    window.dispatchEvent(event)
  }, 100)
}
</script>

<style lang="scss" scoped>
.cookie-warning-container {
  position: fixed;
  top: var(--header-height, 120px);
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  z-index: 999;
  pointer-events: none; // 让容器本身不拦截事件

  // 移动端适配
  @media (max-width: 768px) {
    top: calc(var(--header-height, 120px) + 10px);
    width: 95%;
    left: 2.5%;
    transform: none;
  }
}

.cookie-warning-item {
  margin-bottom: 8px;
  pointer-events: auto; // 恢复子元素的事件
  box-shadow: var(--el-box-shadow);
  border-radius: var(--el-border-radius-base);

  :deep(.el-alert__content) {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
}

.warning-content {
  flex: 1;

  .warning-text {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 500;

    @media (max-width: 768px) {
      flex-wrap: wrap;
    }
  }

  .server-tag {
    font-size: 12px;
  }

  .warning-detail {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-top: 2px;
  }
}

.warning-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
}

.warning-actions-bar {
  text-align: center;
  margin-top: 8px;
  pointer-events: auto;
}

// 暗色模式适配
html.dark {
  .cookie-warning-container {
    .cookie-warning-item {
      background-color: var(--el-bg-color-overlay);
      border-color: var(--el-border-color);
    }
  }
}

// 动画效果
.cookie-warning-item {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 关闭动画
.el-alert.is-light.el-alert--warning {
  transition: all 0.3s ease-out;
}
</style>
