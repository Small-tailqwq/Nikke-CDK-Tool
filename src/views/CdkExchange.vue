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
          <!-- 用户卡片 -->
          <div
            v-for="user in userStore.users"
            :key="user.id"
            class="user-card"
            :class="{ 'is-selected': selectedUserIds.includes(user.id) }"
            @click="toggleUserSelection(user)"
          >
            <div class="user-card-content">
              <div class="user-info">
                <h3>{{ user.name }}</h3>
                <p class="server-info">{{ user.serverName }}</p>
                <p class="uid">UID: {{ user.uid }}</p>
              </div>
              <div class="cookie-info">
                <el-tag 
                  :type="getCookieStatusType(user.cookieExpireDays)"
                  size="small"
                >
                  Cookie剩余 {{ user.cookieExpireDays }} 天
                </el-tag>
              </div>
              <div class="selection-indicator">
                <el-icon v-if="selectedUserIds.includes(user.id)">
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
              <br>
              <span class="keyboard-tip">按 Enter 换行</span>
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
                {{ result.cdk }} - {{ result.success ? '兑换成功' : '兑换失败' }}
              </span>
            </template>
            <p class="result-message">{{ result.message }}</p>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <!-- 最近兑换记录 -->
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>最近兑换记录</span>
          <el-button type="text" @click="$router.push('/history')">
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

    <!-- 用户对话框 -->
    <user-dialog
      v-model:visible="dialogVisible"
      :is-edit="false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Plus, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import { useRoute } from 'vue-router'
import UserDialog from '../components/UserDialog.vue'
import { exchangeCDK } from '../utils/api'

const route = useRoute()
const userStore = useUserStore()
const exchangeStore = useExchangeStore()

const selectedUserIds = ref([])
const dialogVisible = ref(false)
const exchanging = ref(false)
const activeResults = ref([])
const exchangeResults = ref([])

const form = reactive({
  cdk: ''
})

// 监听路由参数变化
watch(
  () => route.query.cdks,
  (newCdks) => {
    if (newCdks) {
      form.cdk = decodeURIComponent(newCdks)
      // 清除路由参数，避免刷新页面时重复填充
      window.history.replaceState({}, '', '/cdk')
    }
  },
  { immediate: true }
)

// 是否可以兑换
const canExchange = computed(() => {
  return selectedUserIds.value.length > 0 && form.cdk.trim().split('\n').some(cdk => cdk.trim() !== '')
})

// 兑换按钮文本
const exchangeButtonText = computed(() => {
  if (selectedUserIds.value.length === 0) return '请选择用户'
  const cdkCount = form.cdk.trim().split('\n').filter(cdk => cdk.trim() !== '').length
  return `为 ${selectedUserIds.value.length} 个用户兑换 ${cdkCount} 个CDK`
})

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days > 180) return 'success'
  if (days > 30) return 'warning'
  return 'danger'
}

// 切换用户选择
const toggleUserSelection = (user) => {
  const index = selectedUserIds.value.indexOf(user.id)
  if (index === -1) {
    selectedUserIds.value.push(user.id)
  } else {
    selectedUserIds.value.splice(index, 1)
  }
}

// 显示添加用户对话框
const showAddUserDialog = () => {
  dialogVisible.value = true
}

// 处理回车键
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

// 处理兑换
const handleExchange = async () => {
  if (!canExchange.value) return

  exchanging.value = true
  exchangeResults.value = []
  
  try {
    const selectedUsers = selectedUserIds.value.map(id => userStore.getUserById(id))
    const cdkList = form.cdk.split('\n').map(cdk => cdk.trim()).filter(cdk => cdk)
    
    // 为每个用户兑换每个CDK
    const results = []
    for (const user of selectedUsers) {
      for (const cdk of cdkList) {
        // 记录兑换开始时间
        const exchangeStartTime = new Date()
        try {
          const result = await exchangeCDK(user.cookie, cdk)
          // 使用兑换开始时间作为记录时间
          results.push({
            userId: user.id,
            userName: user.name,
            cdk: cdk,
            success: result.success,
            message: result.message,
            date: exchangeStartTime.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).replace(/\//g, '-')
          })
        } catch (error) {
          // 使用兑换开始时间作为记录时间
          results.push({
            userId: user.id,
            userName: user.name,
            cdk: cdk,
            success: false,
            message: error.message || '兑换失败',
            date: exchangeStartTime.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).replace(/\//g, '-')
          })
        }
        // 添加小延迟，避免请求过于密集
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 按时间排序结果
    results.sort((a, b) => new Date(a.date) - new Date(b.date))

    // 添加兑换记录
    await exchangeStore.addExchangeRecords(results)
    exchangeResults.value = results

    // 显示结果统计
    const successCount = results.filter(r => r.success).length
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

  .selected-count {
    font-size: 14px;
    color: var(--el-color-primary);
  }

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
      }
    }

    .form-tip {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      color: var(--el-text-color-secondary);
      font-size: 13px;
      line-height: 1.4;
      margin-top: 4px;

      .el-icon {
        margin-top: 2px;
        font-size: 14px;
        color: var(--el-color-info);
      }

      .keyboard-tip {
        color: var(--el-color-info);
        font-size: 12px;
      }
    }
  }

  .exchange-results {
    margin-top: 20px;

    .result-title {
      margin-left: 10px;
      font-size: 14px;
    }

    .result-message {
      margin: 10px 0;
      font-size: 14px;
      color: #606266;
    }
  }
}
</style> 