<template>
  <div class="cdk-group-card-wrapper">
    <!-- 主卡片 -->
    <el-card
      class="cdk-group-card"
      :class="{
        available: getGroupStatus(group) === '可用',
        unavailable: getGroupStatus(group) === '已过期',
        'partially-available': getGroupStatus(group) === '部分可用',
      }"
      body-style="padding: 0; display: flex; flex-direction: column;"
    >
      <!-- 复选框 -->
      <div class="cdk-checkbox-wrapper">
        <el-checkbox
          v-model="isGroupSelected"
          :disabled="getGroupStatus(group) === '已过期'"
          class="cdk-checkbox"
          :show-label="false"
          @click.stop=""
          @change="handleCheckboxChange"
        />
      </div>

      <!-- Header / 图片 -->
      <div class="cdk-image" :class="{ 'has-image': !!group.image }">
        <img
          v-if="group.image"
          :src="getImageUrl(group.image)"
          :alt="group.groupName || '未命名CDK组合'"
          class="announcement-image"
        />
        <div v-else class="image-placeholder">
          <el-icon><Picture /></el-icon>
          <span>CDK组合</span>
        </div>

        <!-- 状态条 -->
        <div
          class="cdk-status"
          :class="{
            'status-available': getGroupStatus(group) === '可用',
            'status-unavailable': getGroupStatus(group) === '已过期',
            'status-partially-available': getGroupStatus(group) === '部分可用',
          }"
        >
          {{ getGroupStatus(group) }}
        </div>

        <!-- 组合标识 -->
        <div class="group-badge">
          <el-icon><Collection /></el-icon>
          <span>{{ group.cdks.length }}个CDK</span>
        </div>
      </div>

      <!-- Body -->
      <div class="cdk-content">
        <h3>{{ group.groupName || '未命名CDK组合' }}</h3>

        <div class="group-summary">
          <h4>包含CDK：</h4>
          <div class="cdk-codes-preview">
            <el-tag
              v-for="(cdkInfo, index) in getDisplayCdkInfo()"
              :key="cdkInfo.code"
              size="small"
              class="code-preview-tag"
              :class="{
                expired: cdkInfo.status === '已过期',
              }"
            >
              {{ cdkInfo.code }}
            </el-tag>
            <span v-if="hasMoreCodes()" class="more-indicator">
              +{{ group.cdks.length - getDisplayCdkInfo().length }}个...
            </span>
          </div>
        </div>

        <div class="group-total-reward">
          <h4>总奖励：</h4>
          <p>{{ getTotalReward() }}</p>
        </div>

        <div class="cdk-servers">
          <el-tag
            v-for="server in getGroupServers(group)"
            :key="server"
            size="small"
          >
            {{ getServerName(server) }}
          </el-tag>
        </div>

        <!-- 展开/收起按钮 - 上移 -->
        <div class="expand-button">
          <el-button
            type="primary"
            size="default"
            plain
            @click="toggleExpanded"
          >
            <el-icon><Grid /></el-icon>
            查看详情
          </el-button>
        </div>

        <!-- 备注信息 - 下移 -->
        <div v-if="group.note" class="cdk-note">
          <el-tooltip :content="group.note" placement="top">
            <el-icon><InfoFilled /></el-icon>
            <span>备注</span>
          </el-tooltip>
        </div>

        <!-- Footer信息合并到content中 -->
        <div v-if="group.author" class="cdk-author">
          提供者：{{ group.author }}
        </div>
      </div>
    </el-card>

    <!-- 遮罩层和展开的子CDK卡片 -->
    <teleport to="body">
      <transition name="overlay">
        <div
          v-if="isExpanded"
          class="overlay-backdrop"
          @click="closeOverlay"
          @keydown.esc="closeOverlay"
          tabindex="0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overlay-title"
        >
          <div class="overlay-container" @click.stop="">
            <div class="overlay-header">
              <h3 id="overlay-title">
                {{ group.groupName || '未命名CDK组合' }}
              </h3>
              <el-button
                type="primary"
                circle
                size="small"
                @click="closeOverlay"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>

            <div class="sub-cards-container">
              <div
                v-for="(subCdk, index) in group.cdks"
                :key="subCdk.code"
                class="sub-cdk-card"
                :class="{
                  available: subCdk.status === '可用',
                  unavailable: subCdk.status === '已过期',
                }"
                :style="{ '--delay': index * 100 + 'ms' }"
              >
                <div class="sub-cdk-header">
                  <h4>{{ subCdk.name || subCdk.code }}</h4>
                  <!-- 状态条 -->
                  <div
                    class="sub-cdk-status"
                    :class="{
                      'status-available': subCdk.status === '可用',
                      'status-unavailable': subCdk.status === '已过期',
                    }"
                  >
                    {{ subCdk.status }}
                  </div>
                </div>

                <!-- CDK代码区域 - 复用单个CDK卡片样式 -->
                <div class="sub-cdk-code-section">
                  <el-tag
                    class="code-tag"
                    size="large"
                    :class="{ copied: copiedCode === subCdk.code }"
                    @mousedown="copyCdk(subCdk.code, $event)"
                  >
                    {{ subCdk.code }}
                    <el-icon><Document /></el-icon>
                  </el-tag>
                </div>

                <div v-if="subCdk.reward" class="sub-cdk-reward">
                  <h4>奖励内容：</h4>
                  <p>{{ subCdk.reward }}</p>
                </div>

                <div class="sub-cdk-servers">
                  <el-tag
                    v-for="server in subCdk.servers"
                    :key="server"
                    size="small"
                  >
                    {{ getServerName(server) }}
                  </el-tag>
                </div>

                <div v-if="subCdk.note" class="sub-cdk-note">
                  <el-tooltip :content="subCdk.note" placement="top">
                    <el-icon><InfoFilled /></el-icon>
                    <span>备注</span>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document,
  InfoFilled,
  Picture,
  Collection,
  Grid,
  Close,
} from '@element-plus/icons-vue'
import type { CDKGroup } from '../utils/fetchCdk'
import {
  getGroupTotalReward,
  getGroupCodes,
  getGroupStatus,
  getGroupServers,
} from '../utils/fetchCdk'

interface Props {
  group: CDKGroup
  selectedCdks: string[]
}

interface Emits {
  (e: 'update:selectedCdks', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 展开状态
const isExpanded = ref(false)

// 复制状态管理
const copiedCode = ref<string | null>(null)

// 是否选中整个组合（智能判断）
const isGroupSelected = computed({
  get() {
    const groupStatus = getGroupStatus(props.group)

    if (groupStatus === '可用') {
      // 全部可用时，需要选中所有CDK
      const groupCodes = getGroupCodes(props.group)
      return groupCodes.every((code) => props.selectedCdks.includes(code))
    } else if (groupStatus === '部分可用') {
      // 部分可用时，需要选中所有可用的CDK
      const availableCodes = getAvailableGroupCodes()
      return (
        availableCodes.length > 0 &&
        availableCodes.every((code) => props.selectedCdks.includes(code))
      )
    } else {
      // 全部过期时，永远不选中
      return false
    }
  },
  set(value: boolean) {
    handleGroupSelection(value)
  },
})

// 获取组合中可用的CDK代码
const getAvailableGroupCodes = (): string[] => {
  return props.group.cdks
    .filter((cdk) => cdk.status === '可用')
    .map((cdk) => cdk.code)
}

// 处理组合选择
const handleGroupSelection = (value: boolean) => {
  const groupCodes = getGroupCodes(props.group)
  const availableCodes = getAvailableGroupCodes()
  let newSelected = [...props.selectedCdks]

  if (value) {
    // 智能选择：如果全部可用，选择所有；如果部分可用，只选择可用的
    const codesToSelect =
      getGroupStatus(props.group) === '可用' ? groupCodes : availableCodes

    codesToSelect.forEach((code) => {
      if (!newSelected.includes(code)) {
        newSelected.push(code)
      }
    })
  } else {
    // 取消选中所有相关CDK（包括已过期的）
    newSelected = newSelected.filter((code) => !groupCodes.includes(code))
  }

  emit('update:selectedCdks', newSelected)
}

// 获取服务器名称
const getServerName = (server: string): string => {
  const serverNames: Record<string, string> = {
    global: '国际服',
    tw: '港澳台服',
    cn: '国服',
  }
  return serverNames[server] || server
}

// 拼接完整的图片 URL
const getImageUrl = (localPath: string): string => {
  if (!localPath) return ''
  return `${import.meta.env.BASE_URL}${
    localPath.startsWith('/') ? localPath.substring(1) : localPath
  }`
}

// 获取总奖励
const getTotalReward = (): string => {
  return getGroupTotalReward(props.group) || '暂无详细信息'
}

// 切换展开状态
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// 关闭遮罩层
const closeOverlay = () => {
  isExpanded.value = false
}

// 处理复选框变更
const handleCheckboxChange = (value: boolean) => {
  // 复选框变更事件，阻止卡片点击事件
  handleGroupSelection(value)
}

// 复制CDK相关功能 - 复用单个CDK卡片的实现
const fallbackCopyTextToClipboard = (code: string, e: MouseEvent) => {
  const textArea = document.createElement('textarea')
  textArea.value = code
  textArea.style.cssText = 'position:fixed;pointer-events:none;opacity:0;'
  document.body.appendChild(textArea)

  try {
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange()
      range.selectNodeContents(textArea)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
      textArea.setSelectionRange(0, 999999)
    } else {
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

const copyCdk = async (code: string, e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code)
      handleCopySuccess(code, e)
    } else {
      fallbackCopyTextToClipboard(code, e)
    }
  } catch (err) {
    console.error('Clipboard API失败，使用回退方法:', err)
    fallbackCopyTextToClipboard(code, e)
  }
}

// 获取要显示的CDK信息（2行显示）
const getDisplayCdkInfo = (): Array<{ code: string; status: string }> => {
  // 假设每行大约可以显示4个标签，2行就是8个
  return props.group.cdks.slice(0, 8).map((c) => ({
    code: c.code,
    status: c.status,
  }))
}

// 是否有更多CDK代码
const hasMoreCodes = (): boolean => {
  return props.group.cdks.length > 8
}
</script>

<style lang="scss" scoped>
.cdk-group-card-wrapper {
  position: relative;
}

.cdk-group-card {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  border: none;
  height: 100%;
  transition: all 0.3s ease, background-color 0.3s ease, border-color 0.3s ease; /* 添加主题切换动画 */
  background: var(--el-bg-color);

  &:hover {
    @media screen and (min-width: 769px) {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }

  &.available {
    border-top: 4px solid var(--el-color-success);
  }

  &.unavailable {
    border-top: 4px solid var(--el-color-danger);
  }

  &.partially-available {
    border-top: 4px solid var(--el-color-warning);
  }
}

/* =============== 复选框样式（与单个CDK卡片保持一致） =============== */
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

.cdk-image {
  width: 100%;
  height: 120px;
  position: relative;
  border-radius: 8px 8px 0 0;
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

  .image-placeholder {
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

  @media screen and (max-width: 768px) {
    height: 100px;
  }
}

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

  &.status-partially-available {
    background: var(--el-color-warning);
  }
}

.group-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  background: rgba(64, 158, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 4px;

  .el-icon {
    font-size: 14px;
  }
}

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

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-regular);
  }
}

.group-description {
  p {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
  }
}

.group-summary {
  .cdk-codes-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-top: 6px;
    /* 移除高度限制，允许完整显示2行 */
    line-height: 1.4;

    .code-preview-tag {
      font-family: monospace;
      font-size: 12px;

      &.expired {
        background-color: var(--el-color-danger) !important;
        border-color: var(--el-color-danger) !important;
        color: #fff !important;
        opacity: 0.8;
        text-decoration: line-through;
      }
    }

    .more-indicator {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      font-style: italic;
    }
  }
}

.group-total-reward {
  p {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
    line-height: 1.4;
  }
}

.cdk-servers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cdk-note {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px; /* 与普通CDK卡片保持一致 */
  cursor: pointer;
  margin-top: 8px; /* 添加上边距 */

  .el-icon {
    font-size: 12px; /* 与普通CDK卡片保持一致的小图标 */
  }
}

.expand-button {
  margin-top: 8px;

  .el-button {
    width: 100%;
    height: 36px; /* 增加按钮高度 */
  }
}

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

/* =============== 遮罩层样式 =============== */
.overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  will-change: opacity;
  transform: translate3d(0, 0, 0); /* 触发硬件加速 */

  @media screen and (max-width: 768px) {
    padding: 12px;
    align-items: flex-start;
    padding-top: env(safe-area-inset-top, 12px); /* 支持刘海屏 */
  }

  @media screen and (max-width: 480px) {
    padding: 8px;
  }

  /* 高分辨率屏幕优化 */
  @media screen and (-webkit-min-device-pixel-ratio: 2),
    screen and (min-resolution: 192dpi) {
    backdrop-filter: blur(6px);
  }
}

.overlay-container {
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 1200px;
  max-height: 90vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media screen and (max-width: 768px) {
    border-radius: 8px;
    max-height: 95vh;
    margin-top: auto; /* 在移动端推到顶部 */
  }

  @media screen and (max-width: 480px) {
    border-radius: 6px;
    margin: 0;
    max-height: 100vh;
    height: 100%;
    width: 100%;
  }
}

.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 16px;
  }

  @media screen and (max-width: 768px) {
    padding: 16px 20px;

    h3 {
      font-size: 18px;
    }
  }

  @media screen and (max-width: 480px) {
    padding: 12px 16px;

    h3 {
      font-size: 16px;
      margin-right: 12px;
    }
  }
}

.sub-cards-container {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  overflow-y: auto;
  flex: 1;

  /* 美观的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);

  &::-webkit-scrollbar {
    width: 6px;
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

  @media screen and (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media screen and (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 20px;
    gap: 16px;
  }

  @media screen and (max-width: 600px) {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 16px;
  }
}

.sub-cdk-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: slideInCard 0.4s cubic-bezier(0.4, 0, 0.2, 1) var(--delay, 0ms)
    both;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  will-change: transform;
  position: relative;

  &:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  }

  /* 子卡片状态边框 */
  &.available {
    border-top: 3px solid var(--el-color-success);
  }

  &.unavailable {
    border-top: 3px solid var(--el-color-danger);
    opacity: 0.8; /* 过期卡片略微透明 */
  }

  .sub-cdk-header {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;

    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      line-height: 1.3;
      flex: 1;
      margin-right: 8px;
    }
  }

  .sub-cdk-status {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: bold;
    color: #fff;
    white-space: nowrap;
    flex-shrink: 0;

    &.status-available {
      background: var(--el-color-success);
    }

    &.status-unavailable {
      background: var(--el-color-danger);
    }
  }

  .sub-cdk-code-section {
    margin-bottom: 12px;

    .code-tag {
      position: relative;
      overflow: hidden;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      font-family: monospace;
      font-size: 14px;
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
        opacity: 0;
        visibility: hidden;
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
          opacity: 1;
          visibility: visible;
          animation: rippleFill 0.4s ease-out forwards;
        }

        &::after {
          animation: curtainReset 0.5s ease-out 0.5s forwards;
        }
      }

      @media screen and (max-width: 768px) {
        font-size: 13px;
        padding: 6px 10px;
        gap: 6px;
      }

      @media screen and (max-width: 480px) {
        font-size: 12px;
        padding: 8px 12px;
      }
    }
  }

  .sub-cdk-reward {
    margin-bottom: 12px;

    h4 {
      margin: 0 0 4px 0;
      color: var(--el-text-color-secondary);
      font-size: 13px;
      font-weight: 600;

      @media screen and (max-width: 768px) {
        font-size: 12px;
      }
    }

    p {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 13px;
      line-height: 1.4;

      @media screen and (max-width: 768px) {
        font-size: 12px;
      }
    }
  }

  .sub-cdk-servers {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .sub-cdk-note {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    cursor: pointer;
    margin-top: auto;

    .el-icon {
      font-size: 12px; /* 与普通CDK卡片保持一致 */
    }
  }
}

/* =============== 动画效果 =============== */
/* 
 * 性能优化说明：
 * 1. 使用 cubic-bezier 缓动函数提升动画品质
 * 2. 使用 transform3d 和 scale3d 触发硬件加速
 * 3. 分离 opacity 和 transform 动画避免重绘
 * 4. 使用 will-change 提示浏览器优化
 */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.overlay-enter-active .overlay-container,
.overlay-leave-active .overlay-container {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.overlay-enter-from .overlay-container,
.overlay-leave-to .overlay-container {
  transform: scale3d(0.95, 0.95, 1) translate3d(0, 16px, 0);
}

/* 减少不必要的 will-change 声明 */
.overlay-enter-to .overlay-container,
.overlay-leave-from .overlay-container {
  will-change: auto;
}

@keyframes slideInCard {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/* 复用单个CDK卡片的复制动画 */
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
</style>
