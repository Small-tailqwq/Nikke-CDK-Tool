<template>
  <div class="cdk-announcement">
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <el-card class="filter-card">
          <div class="filter-header">
            <div class="filter-left">
              <el-form :inline="true" :model="filterForm" class="filter-form">
                <el-form-item label="服务器">
                  <el-select
                    v-model="filterForm.server"
                    placeholder="选择服务器"
                    clearable
                    size="small"
                    style="width: 120px"
                  >
                    <el-option label="国际服" :value="'global'" />
                    <el-option label="港澳台服" :value="'tw'" />
                    <el-option label="国服" :value="'cn'" />
                  </el-select>
                </el-form-item>
                <el-form-item label="状态">
                  <el-select
                    v-model="filterForm.status"
                    placeholder="选择状态"
                    clearable
                    size="small"
                    style="width: 110px"
                  >
                    <el-option label="可用" value="可用" />
                    <el-option label="部分可用" value="部分可用" />
                    <el-option label="已过期" value="已过期" />
                  </el-select>
                </el-form-item>
                <el-form-item label="角色">
                  <el-select
                    v-model="filterForm.character"
                    placeholder="选择角色"
                    clearable
                    size="small"
                    style="width: 140px"
                    @change="handleCharacterChange"
                  >
                    <el-option
                      v-for="user in userStore.users"
                      :key="user.id"
                      :label="user.name"
                      :value="user.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="排序">
                  <el-select
                    v-model="filterForm.sortOrder"
                    placeholder="选择排序"
                    size="small"
                    style="width: 110px"
                  >
                    <el-option label="最新优先" value="desc" />
                    <el-option label="最早优先" value="asc" />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
            <div class="filter-right">
              <!-- 批量操作按钮 -->
              <el-button
                v-if="selectedCdks.length > 0"
                type="success"
                size="small"
                @click="handleBatchExchange"
                class="action-btn"
              >
                批量兑换 ({{ selectedCdks.length }})
              </el-button>
              <!-- CDK提交按钮 -->
              <el-button
                type="primary"
                size="small"
                @click="openSubmitCdk"
                plain
                class="action-btn"
              >
                提交 CDK 入口
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col
        v-for="cdk in filteredCdks"
        :key="getCdkKey(cdk)"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="6"
        class="mb-4"
      >
        <!-- CDK组合卡片 -->
        <CDKGroupCard
          v-if="isCDKGroup(cdk)"
          :group="cdk"
          v-model:selectedCdks="selectedCdks"
          :exchange-status="getCdkExchangeStatus(cdk)"
          :selected-user-exchange-history="selectedUserExchangeHistory"
        />

        <!-- 单个CDK卡片 -->
        <el-card
          v-else
          class="cdk-card"
          :class="{
            available: cdk.status === '可用',
            unavailable: cdk.status !== '可用',
          }"
          body-style="padding: 0; display: flex; flex-direction: column;"
        >
          <!-- 复选框 -->
          <div class="cdk-checkbox-wrapper">
            <el-checkbox
              v-model="selectedCdks"
              :label="cdk.code"
              :disabled="cdk.status !== '可用'"
              class="cdk-checkbox"
              :show-label="false"
            />
          </div>

          <!-- Header / 图片 -->
          <div class="cdk-image" :class="{ 'has-image': !!cdk.image }">
            <img
              v-if="cdk.image"
              :src="getImageUrl(cdk.image)"
              :alt="cdk.name || '未命名CDK'"
              class="announcement-image"
            />
            <div v-else class="image-placeholder">
              <el-icon><Picture /></el-icon>
              <span>暂无图片</span>
            </div>

            <!-- 状态条（已兑换时隐藏可用状态） -->
            <div
              v-if="
                !(
                  filterForm.character && getCdkExchangeStatus(cdk) === '已兑换'
                )
              "
              class="cdk-status"
              :class="
                cdk.status === '可用'
                  ? 'status-available'
                  : 'status-unavailable'
              "
            >
              {{ cdk.status }}
            </div>

            <!-- 兑换状态条（仅在选中角色时显示） -->
            <div
              v-if="getCdkExchangeStatus(cdk)"
              class="exchange-status"
              :class="{
                'exchange-not-redeemed': getCdkExchangeStatus(cdk) === '未兑换',
                'exchange-redeemed': getCdkExchangeStatus(cdk) === '已兑换',
              }"
            >
              {{ getCdkExchangeStatus(cdk) }}
            </div>
          </div>

          <!-- Body -->
          <div class="cdk-content">
            <h3>{{ cdk.name || '未命名CDK' }}</h3>

            <el-tag
              class="code-tag"
              size="large"
              :class="{ copied: copiedCode === cdk.code }"
              @mousedown="copyCdk(cdk.code, $event)"
            >
              {{ cdk.code }}
              <el-icon><Document /></el-icon>
            </el-tag>

            <div v-if="cdk.reward" class="cdk-reward">
              <h4>奖励内容：</h4>
              <p>{{ cdk.reward }}</p>
            </div>

            <div class="cdk-servers">
              <el-tag v-for="server in cdk.servers" :key="server" size="small">
                {{ getServerName(server) }}
              </el-tag>
            </div>

            <div v-if="cdk.note" class="cdk-note">
              <el-tooltip :content="cdk.note" placement="top">
                <el-icon><InfoFilled /></el-icon>
                <span>备注</span>
              </el-tooltip>
            </div>

            <!-- 收录时间 -->
            <div v-if="cdk.created" class="cdk-created">
              收录时间：{{ cdk.created }}
            </div>

            <!-- Footer信息合并到content中 -->
            <div v-if="cdk.author" class="cdk-author">
              提供者：{{ cdk.author }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="filteredCdks.length === 0" description="暂无CDK" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, InfoFilled, Loading, Picture } from '@element-plus/icons-vue'
import {
  fetchCdkList,
  isCDKGroup,
  isSingleCDK,
  getGroupCodes,
  getGroupStatus,
  getGroupServers,
} from '../utils/fetchCdk'
import type { CDK, SingleCDK, CDKGroup } from '../utils/fetchCdk'
import { useRouter } from 'vue-router'
import CDKGroupCard from '../components/CDKGroupCard.vue'
import { showCustomMessage } from '../utils/customMessage'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'

type ServerType = 'global' | 'tw' | 'cn'
type FilterForm = {
  server: ServerType | null
  status: string
  sortOrder: 'desc' | 'asc'
  character: string | null // 新增角色筛选
}

const router = useRouter()
const userStore = useUserStore()
const exchangeStore = useExchangeStore()

// CDK列表数据
const cdkList = ref<CDK[]>([])
const filterForm = ref<FilterForm>({
  server: null,
  status: '',
  sortOrder: 'desc',
  character: null,
})

// 选中的CDK列表
const selectedCdks = ref<string[]>([])

// 复制状态管理
const copiedCode = ref<string | null>(null)

// 选中角色的兑换记录
const selectedUserExchangeHistory = computed(() => {
  if (!filterForm.value.character) return []
  return exchangeStore.history.filter(
    (record: any) => record.userId === filterForm.value.character
  )
})

// 获取CDK的兑换状态（仅在选中角色时启用）
const getCdkExchangeStatus = (
  cdk: CDK
): '未兑换' | '部分兑换' | '已兑换' | null => {
  if (!filterForm.value.character) return null

  if (isCDKGroup(cdk)) {
    // CDK组合的兑换状态
    const groupCodes = getGroupCodes(cdk)
    // 使用Set去重，避免同一个CDK多次兑换导致重复计算
    const exchangedCodes = new Set(
      selectedUserExchangeHistory.value
        .filter((record: any) => groupCodes.includes(record.cdk))
        .map((record: any) => record.cdk)
    )

    if (exchangedCodes.size === 0) {
      return '未兑换'
    } else if (exchangedCodes.size === groupCodes.length) {
      return '已兑换'
    } else {
      return '部分兑换'
    }
  } else {
    // 单个CDK的兑换状态
    const isExchanged = selectedUserExchangeHistory.value.some(
      (record: any) => record.cdk === cdk.code
    )
    return isExchanged ? '已兑换' : '未兑换'
  }
}

// 获取CDK的唯一标识
const getCdkKey = (cdk: CDK): string => {
  if (isCDKGroup(cdk)) {
    return cdk.groupId
  }
  return cdk.code
}

// 获取服务器名称
const getServerName = (server: string): string => {
  const serverNames: Record<ServerType, string> = {
    global: '国际服',
    tw: '港澳台服',
    cn: '国服',
  }
  return serverNames[server as ServerType] || server
}

// 拼接完整的图片 URL（处理 base path）
const getImageUrl = (localPath: string): string => {
  if (!localPath) return ''
  // 使用 import.meta.env.BASE_URL 来正确处理应用的 base 路径
  return `${import.meta.env.BASE_URL}${
    localPath.startsWith('/') ? localPath.substring(1) : localPath
  }`
}

// 加载CDK列表
const loadCdkList = async () => {
  try {
    const data = await fetchCdkList()
    // 过滤掉状态不是 '可用' 或 '已过期' 或 '部分可用' 的CDK
    cdkList.value = data.cdks.filter((cdk) => {
      if (isCDKGroup(cdk)) {
        const status = getGroupStatus(cdk)
        return status === '可用' || status === '已过期' || status === '部分可用'
      } else {
        return cdk.status === '可用' || cdk.status === '已过期'
      }
    })
  } catch (error) {
    showCustomMessage('获取CDK列表失败', 'error')
    console.error(error)
  }
}

// 获取CDK的状态（统一处理单个CDK和组合CDK）
const getCdkStatus = (cdk: CDK): '可用' | '已过期' | '部分可用' => {
  if (isCDKGroup(cdk)) {
    return getGroupStatus(cdk)
  } else {
    return cdk.status
  }
}

// 获取CDK的服务器列表（统一处理单个CDK和组合CDK）
const getCdkServers = (cdk: CDK): Array<'global' | 'tw' | 'cn'> => {
  if (isCDKGroup(cdk)) {
    return getGroupServers(cdk)
  } else {
    return cdk.servers
  }
}

// 获取选中角色的服务器类型
const getSelectedUserServer = (): ServerType | null => {
  if (!filterForm.value.character) return null
  const user = userStore.users.find((u) => u.id === filterForm.value.character)
  return user ? (user.server as ServerType) : null
}

// 过滤CDK列表
const filteredCdks = computed(() => {
  let result = [...cdkList.value]

  // 如果选中了角色，先按服务器过滤
  if (filterForm.value.character) {
    const userServer = getSelectedUserServer()
    if (userServer) {
      result = result.filter((cdk) => {
        const cdkServers = getCdkServers(cdk)
        return cdkServers.includes(userServer)
      })
    }
  }

  // 如果选中了角色，按兑换状态排序：未兑换 > 部分兑换 > 已兑换
  // 否则按可用性排序：可用 > 部分可用 > 已过期
  result.sort((a, b) => {
    if (filterForm.value.character) {
      // 角色筛选模式：按兑换状态排序
      const exchangeStatusA = getCdkExchangeStatus(a)
      const exchangeStatusB = getCdkExchangeStatus(b)

      const getExchangePriority = (status: string | null) => {
        if (status === '未兑换') return 3
        if (status === '部分兑换') return 2
        if (status === '已兑换') return 1
        return 0
      }

      const exchangeDiff =
        getExchangePriority(exchangeStatusB) -
        getExchangePriority(exchangeStatusA)
      if (exchangeDiff !== 0) return exchangeDiff
    }

    // 默认排序：按可用性
    const statusA = getCdkStatus(a)
    const statusB = getCdkStatus(b)
    const getPriority = (status: string) => {
      if (status === '可用') return 3
      if (status === '部分可用') return 2
      if (status === '已过期') return 1
      return 0
    }

    const statusDiff = getPriority(statusB) - getPriority(statusA)
    if (statusDiff !== 0) return statusDiff

    // 最后按创建时间排序
    const getCreated = (cdk: any) => {
      if (isCDKGroup(cdk)) {
        return cdk.cdks.reduce(
          (max: string, sub: any) =>
            sub.created && sub.created > max ? sub.created : max,
          ''
        )
      } else {
        return cdk.created || ''
      }
    }

    const createdA = getCreated(a)
    const createdB = getCreated(b)
    if (createdA && createdB) {
      if (filterForm.value.sortOrder === 'desc') {
        return createdB.localeCompare(createdA)
      } else {
        return createdA.localeCompare(createdB)
      }
    }
    return 0
  })

  // 应用过滤器
  if (filterForm.value.server) {
    result = result.filter((cdk) =>
      getCdkServers(cdk).includes(filterForm.value.server as ServerType)
    )
  }
  if (filterForm.value.status) {
    result = result.filter(
      (cdk) => getCdkStatus(cdk) === filterForm.value.status
    )
  }

  return result
})

// 添加复制工具函数
const fallbackCopyTextToClipboard = (code: string, e: MouseEvent) => {
  const textArea = document.createElement('textarea')
  textArea.value = code
  // 确保在视口外
  textArea.style.cssText = 'position:fixed;pointer-events:none;opacity:0;'
  document.body.appendChild(textArea)

  try {
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      // iOS设备
      const range = document.createRange()
      range.selectNodeContents(textArea)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
      textArea.setSelectionRange(0, 999999)
    } else {
      // 其他设备
      textArea.select()
    }

    document.execCommand('copy')
    handleCopySuccess(code, e)
  } catch (err) {
    console.error('复制失败:', err)
    showCustomMessage('复制失败，请手动复制', 'error')
  }

  document.body.removeChild(textArea)
}

// 处理复制成功的动画效果
const handleCopySuccess = (code: string, e: MouseEvent) => {
  const target = e.target as HTMLElement
  const tagElement = target.closest('.code-tag') as HTMLElement
  if (!tagElement) return

  const rect = tagElement.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  tagElement.style.setProperty('--x', `${x}px`)
  tagElement.style.setProperty('--y', `${y}px`)

  copiedCode.value = code

  // 使用统一的右上角自定义消息
  showCustomMessage()

  setTimeout(() => {
    copiedCode.value = null
  }, 1000)
}

// 复制CDK
const copyCdk = async (code: string, e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 优先使用现代 Clipboard API
      await navigator.clipboard.writeText(code)
      handleCopySuccess(code, e)
    } else {
      // 回退到传统方法
      fallbackCopyTextToClipboard(code, e)
    }
  } catch (err) {
    console.error('Clipboard API失败，使用回退方法:', err)
    fallbackCopyTextToClipboard(code, e)
  }
}

// 批量兑换处理
const handleBatchExchange = () => {
  if (selectedCdks.value.length === 0) return

  // 将选中的CDK通过路由参数传递到兑换页面
  const cdkString = selectedCdks.value.join('\n')
  router.push({
    path: '/cdk',
    query: { cdks: cdkString },
  })

  // 清空选择
  selectedCdks.value = []
}

// 新增：提交CDK入口按钮方法
const openSubmitCdk = () => {
  window.open(
    'https://chalk-quotation-b2d.notion.site/210563f728f1801ea74ec231b2359e79?pvs=105',
    '_blank'
  )
}

// 处理角色选择变化
const handleCharacterChange = (userId: string | null) => {
  if (!userId) return

  const user = userStore.users.find((u) => u.id === userId)
  if (!user) return

  // 检查是否为国服账号且无兑换历史
  if (user.server === 'cn') {
    const userHistory = exchangeStore.history.filter(
      (record: any) => record.userId === userId
    )

    if (userHistory.length === 0) {
      showCustomMessage(
        '国服账号此功能基本不可用，因为无法获取云端兑换历史，请慎用。',
        'warning'
      )
    }
  }
}

// 页面加载时获取CDK列表
onMounted(() => {
  console.log('CDK公告组件已挂载')
  loadCdkList()
  // 加载用户数据和兑换历史
  userStore.fetchUsers()
  exchangeStore.fetchHistory()
})

// 组件卸载时保存缓存
onBeforeUnmount(() => {
  // 这里不需要保存缓存，因为缓存是静态的，不会改变
})
</script>

<style lang="scss" scoped>
/* =============== 通用 =============== */
.cdk-announcement {
  padding: 20px;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  /* 美观的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 6px;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--scrollbar-thumb-hover);
    }

    &:active {
      background: var(--scrollbar-thumb-active);
    }
  }

  &::-webkit-scrollbar-corner {
    background: var(--scrollbar-track);
  }

  @media screen and (max-width: 768px) {
    padding: 12px;

    /* 移动端使用更细的滚动条 */
    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
      width: 6px;
    }
  }
}

.filter-card {
  margin-bottom: 20px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-radius: 8px;

  @media screen and (max-width: 768px) {
    margin-bottom: 12px;
  }
}

.mb-4 {
  margin-bottom: 16px;

  @media screen and (max-width: 768px) {
    margin-bottom: 12px;
  }
}

/* =============== 卡片 =============== */
.cdk-card {
  position: relative;
  overflow: hidden; /* 确保子元素圆角裁切 */
  border-radius: 8px; /* 四角弧度完全对称 */
  border: none;
  height: 100%;
  animation: fadeInUp 0.3s ease-out;
  transition: transform 0.25s, box-shadow 0.25s, background-color 0.3s ease,
    border-color 0.3s ease; /* 添加主题切换动画 */
  background: var(--el-bg-color);

  @media screen and (max-width: 768px) {
    font-size: 14px;
  }

  &:hover {
    @media screen and (min-width: 769px) {
      transform: translateY(-4px);
      /* 增强阴影效果以配合圆角 */
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }

  &.available {
    border-top: 4px solid var(--el-color-success);
    border-radius: 8px !important; /* 覆盖原有单侧圆角，确保四角对称 */
  }

  &.unavailable {
    border-top: 4px solid var(--el-color-danger);
    border-radius: 8px !important; /* 覆盖原有单侧圆角，确保四角对称 */
  }
}

/* =============== 混入 =============== */
@mixin abs-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* =============== 图片头部 =============== */
.cdk-image {
  width: 100%;
  height: 120px;
  position: relative;
  border-radius: 8px 8px 0 0; /* 图片区域：仅顶部圆角，与卡片整体圆角配合 */
  background: var(--el-fill-color-light);

  &.has-image {
    background: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .image-placeholder,
  .image-loading,
  .image-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-weight: 500;

    .el-icon {
      font-size: 24px;
      opacity: 0.8;
    }
  }

  .image-loading {
    .loading-icon {
      animation: rotate 1s linear infinite;
    }
  }

  .image-error {
    color: var(--el-color-danger);
  }

  @media screen and (max-width: 768px) {
    height: 100px;
  }
}

/* =============== 状态条 =============== */
.cdk-status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  height: 20px;
  display: inline-flex;
  align-items: center;
  &.status-available {
    background: var(--el-color-success);
  }
  &.status-unavailable {
    background: var(--el-color-danger);
  }
}

.exchange-status {
  position: absolute;
  top: 35px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  height: 18px;
  display: inline-flex;
  align-items: center;
  opacity: 0.9;

  &.exchange-not-redeemed {
    background: var(--el-color-primary);
  }

  &.exchange-redeemed {
    background: var(--el-color-info);
  }
}

/* =============== 复选框 =============== */
.cdk-checkbox-wrapper {
  --color-checkbox-border-light: rgba(0, 0, 0, 0.2);
  --color-checkbox-border-dark: rgba(255, 255, 255, 0.3);
  --checkbox-bg: radial-gradient(
    circle,
    rgba(0, 0, 0, 0.15) 0%,
    transparent 70%
  );
  --checkbox-size: 1.5em; /* 24px 转换为相对单位 */

  position: absolute;
  top: 0.5em;
  left: 0.5em;
  z-index: 20;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: 0.375em; /* 6px */
  background: var(--el-bg-color);
  border: 2px solid var(--color-checkbox-border-light); /* 恢复原本的灰色边框 */
  box-sizing: border-box; /* 确保边框在外部，不影响内部尺寸 */
  box-shadow: 0 0.0625em 0.1875em rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  /* 背景处理策略：提高在动态背景上的可见性 */
  &::after {
    content: '';
    position: absolute;
    width: 120%;
    height: 120%;
    background: var(--checkbox-bg);
    border-radius: inherit;
    z-index: -1;
    transition: opacity 0.3s ease;
  }

  /* 悬停效果 */
  &:hover {
    box-shadow: 0 0.125em 0.375em rgba(0, 0, 0, 0.25);

    &::after {
      --checkbox-bg: radial-gradient(
        circle,
        rgba(0, 0, 0, 0.25) 0%,
        transparent 70%
      );
    }
  }

  /* 暗色模式适配 */
  @media (prefers-color-scheme: dark) {
    border-color: var(--color-checkbox-border-dark);
    --checkbox-bg: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.15) 0%,
      transparent 70%
    );

    &:hover::after {
      --checkbox-bg: radial-gradient(
        circle,
        rgba(255, 255, 255, 0.25) 0%,
        transparent 70%
      );
    }
  }

  /* Element Plus 暗色模式 */
  html.dark & {
    border-color: var(--color-checkbox-border-dark);
    --checkbox-bg: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.15) 0%,
      transparent 70%
    );

    &:hover::after {
      --checkbox-bg: radial-gradient(
        circle,
        rgba(255, 255, 255, 0.25) 0%,
        transparent 70%
      );
    }
  }
}

.cdk-checkbox {
  --inner-size: 0.875em; /* 14px 转换为相对单位，与外层严格匹配 */

  pointer-events: auto;
  margin: 0;
  width: 100%;
  height: 100%;
  position: relative; /* 为伪元素定位做准备 */
  border-radius: inherit; /* 继承外层容器的圆角 */
  transition: all 0.2s ease; /* 平滑状态切换 */

  /* 方案A：伪元素填充整个容器范围（100%），添加对勾符号 */
  &.is-checked {
    &::after {
      content: '✓'; /* 添加对勾符号，避免空洞感 */
      position: absolute;
      top: 1px; /* 扩展填充范围，覆盖原17px白色层位置 */
      left: 1px;
      right: 1px;
      bottom: 1px;
      background: var(--el-color-primary); /* 使用主题色变量，支持暗色模式 */
      border-radius: calc(0.375em - 1px); /* 相应调整内部圆角 */
      border: none; /* 移除伪元素边框，使用容器原生边框 */
      z-index: 2; /* 提高层级，确保覆盖白色层 */
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 更流畅的缓动函数 */

      /* 对勾符号样式 */
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75em; /* 12px */
      font-weight: bold;
      line-height: 1;

      /* 初始状态：从中心点开始缩放 */
      transform: scale(0);
      transform-origin: center;
    }
  }

  /* 选中状态的缩放动画 */
  &.is-checked::after {
    transform: scale(1);
  }

  /* 悬停状态增强 */
  &:hover.is-checked::after {
    background: var(--el-color-primary-light-3); /* 使用主题色变量 */
    transform: scale(1.02); /* 减小放大幅度，避免过度动画 */
  }

  /* 激活状态增强 */
  &:active.is-checked::after {
    background: var(--el-color-primary-dark-2); /* 使用主题色变量 */
    transform: scale(0.98); /* 减小缩放幅度，保持平滑 */
    transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1); /* 更快的激活反馈 */
  }

  /* 聚焦状态：给整个容器添加光晕效果 */
  &.is-focus.is-checked::after {
    box-shadow: 0 0 0 0.125em var(--el-color-primary-light-5);
  }

  /* 禁用状态保持透明度控制 */
  &.is-disabled.is-checked {
    opacity: 0.6; /* 整体透明度应用到容器 */

    &::after {
      background: var(--el-color-primary);
      transform: scale(1); /* 确保禁用状态也有正确的缩放 */
    }
  }

  /* 为未选中状态添加平滑过渡准备 */
  &:not(.is-checked)::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    bottom: 1px;
    background: transparent; /* 取消选中时背景透明 */
    border-radius: calc(0.375em - 1px);
    border: none; /* 无需边框，使用容器原生边框 */
    z-index: 2; /* 保持一致的层级 */
    transform: scale(0);
    transform-origin: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* 未选中状态的交互效果（悬停、激活时也要确保透明） */
  &:not(.is-checked):hover::after,
  &:not(.is-checked):active::after {
    background: transparent !important; /* 确保取消选中时交互状态也是透明 */
  }

  :deep(.el-checkbox__input) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    position: relative;
    z-index: 1; /* 确保在伪元素之上 */
    background: transparent !important; /* 移除白色背景层 */

    .el-checkbox__inner {
      /* 完全隐藏内部小框，避免白色描边效果 */
      width: 0 !important;
      height: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      opacity: 0 !important;
      visibility: hidden !important;

      &::after {
        /* 移除默认的√符号，现在用大框的伪元素 */
        content: none !important;
        display: none !important;
      }
    }

    /* 所有状态下都隐藏内部小框 */
    &.is-checked .el-checkbox__inner,
    &.is-disabled .el-checkbox__inner,
    &.is-focus .el-checkbox__inner,
    &:hover .el-checkbox__inner {
      width: 0 !important;
      height: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }

    /* 确保所有状态下input元素背景都透明 */
    &.is-checked,
    &.is-disabled,
    &.is-focus,
    &:hover {
      background: transparent !important;
    }
  }

  /* 移除标签相关样式 */
  :deep(.el-checkbox__label) {
    display: none;
  }
}

/* =============== 正文区域 =============== */
.cdk-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: background-color 0.3s ease; /* 添加主题切换动画 */

  @media screen and (max-width: 768px) {
    padding: 12px;
    gap: 8px;
  }

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;

    @media screen and (max-width: 768px) {
      font-size: 16px;
    }
  }
}
.cdk-reward {
  h4 {
    margin: 0;
    color: #606266;
    font-size: 14px;

    @media screen and (max-width: 768px) {
      font-size: 13px;
    }
  }
  p {
    margin: 4px 0 0;
    color: #606266;
    font-size: 14px;

    @media screen and (max-width: 768px) {
      font-size: 13px;
    }
  }
}
.cdk-servers,
.cdk-note {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cdk-note {
  font-size: 12px;
  color: #909399;
  align-items: center;
}

/* =============== 复制按钮动画 =============== */
.code-tag {
  position: relative;
  overflow: hidden;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  &::before {
    content: '';
    position: absolute;
    left: var(--x, 50%);
    top: var(--y, 50%);
    width: 20px;
    height: 20px;
    background: var(--el-color-success);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    pointer-events: none;
    z-index: 1;
    opacity: 0; /* 初始状态完全透明 */
    visibility: hidden; /* 完全隐藏 */
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--el-fill-color-light);
    transform: translateY(-100%);
    pointer-events: none;
    z-index: 2;
  }
  &.copied {
    color: #fff;
    background: var(--el-color-success);
    border-color: var(--el-color-success);
    &::before {
      opacity: 1; /* 显示涟漪效果 */
      visibility: visible; /* 显示 */
      animation: rippleFill 0.4s ease-out forwards;
    }
    &::after {
      animation: curtainReset 0.5s ease-out 0.5s forwards;
    }
  }

  @media screen and (max-width: 768px) {
    font-size: 14px;
    padding: 4px 8px;
  }
}
@keyframes rippleFill {
  to {
    transform: translate(-50%, -50%) scale(22);
  }
}
@keyframes curtainReset {
  to {
    transform: translateY(0);
  }
}

/* =============== Author =============== */
.cdk-author {
  margin-top: 12px;
  padding-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-align: right;
  border-top: 1px solid var(--el-border-color-lighter);
  transition: color 0.3s ease, border-color 0.3s ease; /* 添加主题切换动画 */

  @media screen and (max-width: 768px) {
    margin-top: 8px;
    padding-top: 6px;
  }
}

/* =============== 动画 & 暗黑适配 =============== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  min-height: 60px;

  @media screen and (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px 16px;
    min-height: auto;
  }
}

.filter-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.filter-form {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0;

  @media screen and (max-width: 768px) {
    gap: 12px;
    width: 100%;
  }

  .el-form-item {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;

    .el-form-item__label {
      font-size: 14px;
      color: var(--el-text-color-regular);
      font-weight: 500;
      margin: 0;
      padding: 0;
      line-height: 32px;
      white-space: nowrap;
    }

    .el-form-item__content {
      margin: 0;
    }
  }
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;

  @media screen and (max-width: 768px) {
    justify-content: flex-end;
    width: 100%;
  }
}

.action-btn {
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
  }

  @media screen and (max-width: 768px) {
    padding: 0 12px;
    font-size: 13px;
  }
}

.cdk-created {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
