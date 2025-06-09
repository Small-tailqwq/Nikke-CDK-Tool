<template>
  <div class="cdk-announcement">
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <el-card class="filter-card">
          <div class="filter-header">
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
                  style="width: 100px"
                >
                  <el-option label="可用" value="可用" />
                  <el-option label="已过期" value="已过期" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  size="small"
                  @click="loadCdkList(true)"
                  >刷新列表</el-button
                >
              </el-form-item>
            </el-form>

            <!-- 批量操作按钮 -->
            <div v-if="selectedCdks.length > 0" class="batch-actions">
              <el-button
                type="success"
                size="small"
                @click="handleBatchExchange"
              >
                批量兑换 ({{ selectedCdks.length }})
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col
        v-for="cdk in filteredCdks"
        :key="cdk.code"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="6"
        class="mb-4"
      >
        <el-card
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

            <!-- 状态条 -->
            <div
              class="cdk-status"
              :class="
                cdk.status === '可用'
                  ? 'status-available'
                  : 'status-unavailable'
              "
            >
              {{ cdk.status }}
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
          </div>

          <!-- Footer -->
          <div v-if="cdk.author" class="cdk-footer">
            提供者：{{ cdk.author }}
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
import { fetchCdkList } from '../utils/fetchCdk'
import type { CDK } from '../utils/fetchCdk'
import { useRouter } from 'vue-router'

type ServerType = 'global' | 'tw' | 'cn'
type FilterForm = {
  server: ServerType | null
  status: string
}

const router = useRouter()

// CDK列表数据
const cdkList = ref<CDK[]>([])
const filterForm = ref<FilterForm>({
  server: null,
  status: '',
})

// 选中的CDK列表
const selectedCdks = ref<string[]>([])

// 复制状态管理
const copiedCode = ref<string | null>(null)

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
const loadCdkList = async (forceRefresh = false) => {
  try {
    const data = await fetchCdkList()
    // 过滤掉状态不是 '可用' 或 '已过期' 的CDK
    cdkList.value = data.cdks.filter(
      (cdk) => cdk.status === '可用' || cdk.status === '已过期'
    )
  } catch (error) {
    ElMessage.error('获取CDK列表失败')
    console.error(error)
  }
}

// 过滤CDK列表
const filteredCdks = computed(() => {
  let result = [...cdkList.value]

  // 优先显示可用的CDK
  result.sort((a, b) => {
    if (a.status === '可用' && b.status !== '可用') return -1
    if (a.status !== '可用' && b.status === '可用') return 1
    return 0
  })

  // 应用过滤器
  if (filterForm.value.server) {
    result = result.filter((cdk) =>
      cdk.servers.includes(filterForm.value.server as ServerType)
    )
  }
  if (filterForm.value.status) {
    result = result.filter((cdk) => cdk.status === filterForm.value.status)
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
    ElMessage.error('复制失败，请手动复制')
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
  ElMessage.success('CDK已复制到剪贴板')

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

// 页面加载时获取CDK列表（首次加载不显示提示）
onMounted(() => {
  console.log('CDK公告组件已挂载')
  loadCdkList(false)
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

  @media screen and (max-width: 768px) {
    padding: 12px;
  }
}

.filter-card {
  margin-bottom: 20px;

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
  overflow: hidden;
  border-radius: 0 0 8px 8px;
  border: none;
  height: 100%;
  animation: fadeInUp 0.3s ease-out;
  transition: transform 0.25s;

  @media screen and (max-width: 768px) {
    font-size: 14px;
  }

  &:hover {
    @media screen and (min-width: 769px) {
      transform: translateY(-4px);
    }
  }

  &.available {
    border-top: 4px solid #67c23a;
  }

  &.unavailable {
    border-top: 4px solid #f56c6c;
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
  border-radius: 0 0 8px 8px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);

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
    color: #909399;
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
    color: #f56c6c;
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
    background: #67c23a;
  }
  &.status-unavailable {
    background: #f56c6c;
  }
}

/* =============== 复选框 =============== */
.cdk-checkbox-wrapper {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 20;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  &:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }
}
.cdk-checkbox {
  pointer-events: auto;
  margin: 0; /* 移除默认外边距 */
  :deep(.el-checkbox__input) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    .el-checkbox__inner {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      &::after {
        width: 3px;
        height: 7px;
        left: 4px;
        top: 1px;
      }
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
    background: #67c23a;
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
    background: var(--el-tag-bg-color, #f0f9eb);
    transform: translateY(-100%);
    pointer-events: none;
    z-index: 2;
  }
  &.copied {
    color: #fff;
    background: #67c23a;
    border-color: #67c23a;
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

/* =============== Footer =============== */
.cdk-footer {
  padding: 0 16px 12px;
  font-size: 12px;
  color: #909399;
  text-align: right;
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
@media (prefers-color-scheme: dark) {
  .cdk-card {
    background: var(--el-bg-color-overlay);
  }
  .cdk-image:not(.has-image) {
    background: linear-gradient(135deg, #2c2c2c 0%, #1d1e1f 100%);
  }
  .code-tag::after {
    background: var(--el-tag-bg-color, #1d1e1f);
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
</style>
