<template>
  <div
    class="cdk-group-card-wrapper"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <!-- 卡片重叠效果的背景层 -->
    <div class="card-stack-bg card-stack-1"></div>
    <div class="card-stack-bg card-stack-2"></div>

    <!-- 主卡片 — NIKKE 玻璃卡 -->
    <div
      class="nikke-card"
      :class="{
        available: getGroupStatus(group) === '可用',
        unavailable: getGroupStatus(group) === '已过期',
        'partially-available': getGroupStatus(group) === '部分可用',
        expanding: isExpanded,
      }"
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
          :srcset="getImageSrcset(group.image)"
          :alt="group.groupName || '未命名CDK组合'"
        />
        <div v-else class="image-placeholder">
          <el-icon><Picture /></el-icon>
          <span>CDK组合</span>
        </div>

        <!-- 状态条（已兑换时隐藏可用状态） -->
        <div
          v-if="!(selectedUserExchangeHistory && exchangeStatus === '已兑换')"
          class="cdk-status"
          :class="{
            'status-available': getGroupStatus(group) === '可用',
            'status-unavailable': getGroupStatus(group) === '已过期',
            'status-partially-available': getGroupStatus(group) === '部分可用',
          }"
        >
          {{ getGroupStatus(group) }}
        </div>

        <!-- 兑换状态条（仅在选中角色时显示） -->
        <div
          v-if="exchangeStatus"
          class="exchange-status"
          :class="{
            'exchange-not-redeemed': exchangeStatus === '未兑换',
            'exchange-partially-redeemed': exchangeStatus === '部分兑换',
            'exchange-exhausted': exchangeStatus === '已失效',
            'exchange-redeemed': exchangeStatus === '已兑换',
          }"
        >
          {{ exchangeStatus }}
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
            <span v-if="hasMoreCodes()" class="more-indicator"> …… </span>
          </div>
        </div>

        <div class="group-total-reward">
          <h4>总奖励：</h4>
          <p class="reward-text">{{ getTotalReward() }}</p>
        </div>

        <div class="cdk-servers">
          <el-tag v-for="server in getGroupServers(group)" :key="server" size="small">
            {{ getServerName(server) }}
          </el-tag>
        </div>

        <!-- 展开/收起按钮 - 上移 -->
        <div class="expand-button">
          <el-button type="primary" size="default" @click="toggleExpanded">
            <el-icon><Grid /></el-icon>
            查看详情
          </el-button>
        </div>

        <!-- 备注信息 - 下移 -->
        <div v-if="group.note" class="cdk-note">
          <el-tooltip
            placement="top"
            :show-after="500"
            :teleported="true"
            popper-class="cdk-note-tooltip"
            :append-to-body="true"
          >
            <template #content>
              <div class="note-content" v-html="formatNoteContent(group.note)"></div>
            </template>
            <div class="note-trigger">
              <el-icon class="note-icon"><InfoFilled /></el-icon>
              <span>备注</span>
            </div>
          </el-tooltip>
        </div>

        <!-- Footer信息合并到content中 -->
        <!-- CDK组合没有author字段，移除此部分 -->
      </div>
    </div>

    <!-- 遮罩层和展开的子CDK卡片 -->
    <teleport to="body">
      <transition name="card-expand" appear>
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
              <el-button type="primary" circle size="small" @click="closeOverlay">
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
                :style="{
                  '--delay': index * 150 + 'ms',
                  '--index': index,
                }"
              >
                <div class="sub-cdk-header">
                  <h4>{{ subCdk.name || subCdk.code }}</h4>
                  <div class="sub-cdk-status-group">
                    <!-- 状态条（已兑换时隐藏可用状态） -->
                    <div
                      v-if="
                        !(
                          selectedUserExchangeHistory &&
                          getSubCdkExchangeStatus(subCdk.code) === '已兑换'
                        )
                      "
                      class="sub-cdk-status"
                      :class="{
                        'status-available': subCdk.status === '可用',
                        'status-unavailable': subCdk.status === '已过期',
                      }"
                    >
                      {{ subCdk.status }}
                    </div>

                    <!-- 兑换状态条（仅在选中角色时显示） -->
                    <div
                      v-if="getSubCdkExchangeStatus(subCdk.code)"
                      class="sub-cdk-exchange-status"
                      :class="{
                        'exchange-not-redeemed': getSubCdkExchangeStatus(subCdk.code) === '未兑换',
                        'exchange-redeemed': getSubCdkExchangeStatus(subCdk.code) === '已兑换',
                      }"
                    >
                      {{ getSubCdkExchangeStatus(subCdk.code) }}
                    </div>
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
                    <span class="code-text" :style="'--char-count:'+subCdk.code.length">{{ subCdk.code }}</span>
                    <el-icon class="copy-icon"><Document /></el-icon>
                  </el-tag>
                </div>

                <div v-if="subCdk.reward" class="sub-cdk-reward">
                  <h4>奖励内容：</h4>
                  <p>{{ subCdk.reward }}</p>
                </div>

                <div class="sub-cdk-servers">
                  <el-tag v-for="server in subCdk.servers" :key="server" size="small">
                    {{ getServerName(server) }}
                  </el-tag>
                </div>

                <div v-if="subCdk.note" class="sub-cdk-note">
                  <el-tooltip
                    placement="top"
                    :show-after="500"
                    :teleported="true"
                    popper-class="cdk-note-tooltip"
                    :append-to-body="true"
                  >
                    <template #content>
                      <div class="note-content" v-html="formatNoteContent(subCdk.note)"></div>
                    </template>
                    <div class="note-trigger">
                      <el-icon class="note-icon"><InfoFilled /></el-icon>
                      <span>备注</span>
                    </div>
                  </el-tooltip>
                </div>

                <!-- 贡献者和收录时间 -->
                <div
                  v-if="subCdk.author || subCdk.created"
                  class="sub-cdk-meta"
                  :class="{
                    'has-space-for-row': shouldUseRowLayout(subCdk.author),
                  }"
                >
                  <span v-if="subCdk.author" class="sub-cdk-author"
                    >贡献者：{{ subCdk.author }}</span
                  >
                  <span v-if="subCdk.created" class="sub-cdk-created"
                    >收录时间：{{ subCdk.created }}</span
                  >
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
import { Document, InfoFilled, Picture, Collection, Grid, Close } from '@element-plus/icons-vue'
import { getImageUrl, getImageSrcset } from '@/utils/imageUtils'
import type { CDKGroup } from '../utils/fetchCdk'
import {
  getGroupTotalReward,
  getGroupCodes,
  getGroupStatus,
  getGroupServers,
} from '../utils/fetchCdk'
import { showCustomMessage } from '../utils/customMessage'
import { formatNoteContent } from '../utils/noteUtils'
import type { CheckboxValueType } from 'element-plus'
import { useCardTilt } from '@/composables/useCardTilt'

interface Props {
  group: CDKGroup
  selectedCdks: string[]
  exchangeStatus?: string | null // 新增兑换状态
  selectedUserExchangeHistory?: any[] // 兑换历史记录
}

interface Emits {
  (e: 'update:selectedCdks', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { onPointerEnter, onPointerMove, onPointerLeave } = useCardTilt()

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
  return props.group.cdks.filter((cdk) => cdk.status === '可用').map((cdk) => cdk.code)
}

// 处理组合选择
const handleGroupSelection = (value: boolean) => {
  const groupCodes = getGroupCodes(props.group)
  const availableCodes = getAvailableGroupCodes()
  let newSelected = [...props.selectedCdks]

  if (value) {
    // 智能选择：如果全部可用，选择所有；如果部分可用，只选择可用的
    const codesToSelect = getGroupStatus(props.group) === '可用' ? groupCodes : availableCodes

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
const handleCheckboxChange = (value: CheckboxValueType) => {
  // 复选框变更事件，阻止卡片点击事件
  handleGroupSelection(!!value)
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
    showCustomMessage('复制失败，请手动复制', 'error')
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

  // 使用统一的右上角自定义消息
  showCustomMessage()

  setTimeout(() => {
    copiedCode.value = null
  }, 1500)
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

// 获取要显示的CDK信息（最多显示2行）
const getDisplayCdkInfo = (): Array<{ code: string; status: string }> => {
  // 计算每个CDK标签的大概字符长度，动态决定每行能显示几个
  const maxPerRow = 3 // 更保守的估算，每行最多3个CDK标签
  const maxTotal = maxPerRow * 2 // 2行最多6个

  // 如果有超出的，预留位置给省略号
  const displayCount = props.group.cdks.length > maxTotal ? maxTotal - 1 : maxTotal

  return props.group.cdks.slice(0, displayCount).map((c) => ({
    code: c.code,
    status: c.status,
  }))
}

// 是否有更多CDK代码
const hasMoreCodes = (): boolean => {
  const maxPerRow = 3
  const maxTotal = maxPerRow * 2
  return props.group.cdks.length > maxTotal
}

// 判断是否应该使用行布局
const shouldUseRowLayout = (author?: string): boolean => {
  // 如果作者名称为空或者很短（小于10个字符），使用行布局
  return !author || author.length < 10
}

// 获取单个子CDK的兑换状态
const getSubCdkExchangeStatus = (cdkCode: string): string | null => {
  if (!props.selectedUserExchangeHistory || props.selectedUserExchangeHistory.length === 0) {
    return null
  }

  let isExchanged = false
  let isExhausted = false
  props.selectedUserExchangeHistory.forEach((record: any) => {
    if (record.cdk !== cdkCode) return
    if (
      record.success === true ||
      record.source === '云端' ||
      record.code === 1302016 ||
      (typeof record.message === 'string' && record.message.includes('已兑换过'))
    ) {
      isExchanged = true
    }
    const msg = record.message || ''
    if (record.code === 1302017 || msg.includes('使用次数已耗尽') || msg.includes('无效')) {
      isExhausted = true
    }
  })
  if (isExchanged) return '已兑换'
  if (isExhausted) return '已失效'
  return '未兑换'
}
</script>

<style lang="scss" scoped>
.cdk-group-card-wrapper {
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  --img-brightness: 1;
  --shadow-x: 0px;
  --shadow-y: 0px;
  --shadow-blur: 0px;
  position: relative;
  z-index: 1;
  height: 100%;
  perspective: 800px;

  &:hover {
    z-index: 6;
  }
}

/* =============== NIKKE 玻璃卡片 =============== */
.card-stack-bg {
  position: absolute;
  top: 4px;
  left: 4px;
  right: 0;
  bottom: 0;
  background: rgba(0, 212, 255, 0.04);
  border-radius: var(--cdk-card-radius, 12px);
  border: 1px solid rgba(0, 212, 255, 0.06);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
  transform-origin: center top;
  pointer-events: none;
}

.card-stack-1 {
  transform: translate(2px, 2px);
  opacity: 0.6;
}

.card-stack-2 {
  transform: translate(4px, 4px);
  opacity: 0.3;
}

.nikke-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--cdk-card-radius, 12px);
  border: 1px solid var(--cdk-glass-border);
  transition:
    transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    border-color 0.28s ease,
    background 0.28s ease,
    box-shadow 0.32s ease;
  background: var(--cdk-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  will-change: transform;
  transform:
    rotateX(var(--tilt-x))
    rotateY(var(--tilt-y))
    translateY(0px)
    scale(1);
  box-shadow: 0 18px 28px rgba(5, 8, 15, 0.18);

  &.expanding {
    transform: scale(1.03);
    z-index: 3000;

    .card-stack-1,
    .card-stack-2 {
      opacity: 0;
      transform: scale(0.85);
    }
  }

  &.available {
    border-color: var(--cdk-border-available);
  }

  &.unavailable {
    opacity: 0.8; /* 调整过期卡片的不透明度，避免亮色模式下过于暗淡 */
    border-color: var(--cdk-border-unavailable);
  }

  &.partially-available {
    border-color: var(--cdk-border-partially);
  }
}

@media (hover: hover) and (pointer: fine) {
  .cdk-group-card-wrapper:hover .nikke-card {
    transform:
      rotateX(var(--tilt-x))
      rotateY(var(--tilt-y))
      translateY(-8px)
      scale(1.028);
    border-color: var(--cdk-border-hover);
    background: var(--cdk-glass-hover-bg);
    box-shadow:
      var(--shadow-x) var(--shadow-y) var(--shadow-blur) rgba(5, 8, 15, 0.32),
      var(--cdk-state-shadow, 0 0 0 rgba(0,0,0,0));
  }

  .cdk-group-card-wrapper:hover .nikke-card.available {
    border-color: var(--cdk-border-available-hover);
    --cdk-state-shadow: var(--cdk-glow-cyan);
  }

  .cdk-group-card-wrapper:hover .nikke-card.unavailable {
    border-color: var(--cdk-border-unavailable-hover);
    --cdk-state-shadow: var(--cdk-glow-red);
  }

  .cdk-group-card-wrapper:hover .nikke-card.partially-available {
    border-color: var(--cdk-border-partially-hover);
    --cdk-state-shadow: var(--cdk-glow-orange);
  }

  .cdk-group-card-wrapper:hover .card-stack-1 {
    transform: translate(1px, 3px) scale(1.008) rotate(-0.25deg);
    opacity: 0.78;
  }

  .cdk-group-card-wrapper:hover .card-stack-2 {
    transform: translate(3px, 6px) scale(1.012) rotate(0.35deg);
    opacity: 0.46;
  }

  .cdk-group-card-wrapper:hover .cdk-image img {
    transform: scale(1.045);
    filter: brightness(var(--img-brightness));
  }
}

/* =============== 复选框 =============== */
.cdk-checkbox-wrapper {
  --checkbox-size: 1.4em;

  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: 4px;
  background: rgba(5, 6, 10, 0.7);
  border: 1.5px solid var(--cdk-border-hover);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.15);
  }
}

.cdk-checkbox {
  pointer-events: auto;
  margin: 0;
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: inherit;

  &.is-checked::after {
    content: '✓';
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    bottom: 1px;
    background: #00d4ff;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #05060a;
    font-size: 0.7em;
    font-weight: 800;
    line-height: 1;
    z-index: 2;
  }

  :deep(.el-checkbox__input) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    z-index: 1;
    background: transparent !important;

    .el-checkbox__inner {
      width: 0 !important;
      height: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      opacity: 0 !important;

      &::after { content: none !important; }
    }

    .el-checkbox__label { display: none; }
  }
}

/* =============== 图片 =============== */
.cdk-image {
  width: 100%;
  height: 130px;
  position: relative;
  overflow: hidden;
  background: var(--el-fill-color);

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(transparent, rgba(5, 6, 10, 0.7));
    pointer-events: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transform: scale(1);
    transform-origin: center center;
    filter: brightness(1);
    transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), filter 0.24s ease;
    will-change: transform, filter;
  }

  .image-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 13px;
    font-weight: 500;
    z-index: 1;

    .el-icon { font-size: 22px; }
  }

  @media screen and (max-width: 768px) { height: 110px; }
}

@media (prefers-reduced-motion: reduce) {
  .nikke-card,
  .card-stack-bg,
  .cdk-image img {
    transition: none !important;
    animation: none !important;
  }
}

/* =============== 状态徽章 =============== */
.cdk-status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--cdk-font-mono);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #fff;
  z-index: 2;
  backdrop-filter: blur(4px);

  &.status-available { background: rgba(0, 212, 255, 0.85); }
  &.status-unavailable { background: rgba(255, 51, 85, 0.85); }
  &.status-partially-available { background: rgba(240, 160, 48, 0.85); }
}

.exchange-status {
  position: absolute;
  top: 34px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--cdk-font-mono);
  color: #fff;
  z-index: 2;
  backdrop-filter: blur(4px);

  &.exchange-not-redeemed { background: rgba(0, 212, 255, 0.7); }
  &.exchange-partially-redeemed { background: rgba(240, 160, 48, 0.7); }
  &.exchange-redeemed { background: rgba(108, 110, 114, 0.7); }
  &.exchange-exhausted { background: rgba(240, 160, 48, 0.5); }
}

.group-badge {
  position: absolute;
  bottom: 8px;
  left: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--cdk-font-mono);
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.12);
  border: 1px solid rgba(0, 212, 255, 0.15);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;

  .el-icon { font-size: 12px; }
}

/* =============== 内容区 =============== */
.cdk-content {
  flex: 1;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    line-height: 1.3;
  }

  h4 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.3px;
  }
}

.group-summary {
  .cdk-codes-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    margin-top: 4px;
    max-height: calc(1.6em * 2 + 4px);
    overflow: hidden;

    .code-preview-tag {
      font-family: var(--cdk-font-mono);
      font-size: 11px;
      letter-spacing: 0.3px;
      padding: 1px 6px;
      height: auto;
      line-height: 1.6;
      border-radius: 3px;

      &.expired {
        opacity: 0.5;
        text-decoration: line-through;
      }
    }

    .more-indicator {
      font-size: 11px;
      color: var(--el-text-color-secondary);
      font-style: italic;
      font-weight: 600;
    }
  }
}

.group-total-reward {
  .reward-text {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.cdk-servers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cdk-note {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  cursor: pointer;
  margin-top: 4px;

  .note-icon {
    font-size: 12px !important;
  }

  span { line-height: 1; }
}

.expand-button {
  margin-top: auto;
  padding-top: 8px;

  .el-button {
    width: 100%;
    height: 34px;
    font-size: 13px;
    border-radius: 6px;
  }
}

/* =============== 遮罩层 =============== */
.overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(5, 6, 10, 0.8);
  backdrop-filter: blur(12px);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  @media screen and (max-width: 768px) { padding: 12px; align-items: flex-start; }
  @media screen and (max-width: 480px) { padding: 8px; }
}

.overlay-container {
  background: var(--cdk-overlay-bg);
  border: 1px solid var(--cdk-overlay-border);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  max-width: 1200px;
  max-height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media screen and (max-width: 768px) { border-radius: 12px; max-height: 95vh; }
  @media screen and (max-width: 480px) {
    border-radius: 8px; max-height: 100vh; height: 100%; width: 100%;
  }
}

.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--cdk-overlay-border);

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.sub-cards-container {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  overflow-y: auto;
  flex: 1;

  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: var(--scrollbar-track); border-radius: 6px; }
  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb); border-radius: 6px;
    &:hover { background: var(--scrollbar-thumb-hover); }
  }
}

.sub-cdk-card {
  background: var(--cdk-glass-bg);
  border: 1px solid var(--cdk-glass-border);
  border-radius: 10px;
  padding: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cardRise 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay, 0ms) both;
  display: flex;
  flex-direction: column;

  &.available { border-color: var(--cdk-border-available); }
  &.unavailable { opacity: 0.8; border-color: var(--cdk-border-unavailable); }

  .sub-cdk-header {
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .sub-cdk-status-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-end;
  }

  .sub-cdk-status {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    font-family: var(--cdk-font-mono);
    color: #fff;

    &.status-available { background: rgba(0, 212, 255, 0.8); }
    &.status-unavailable { background: rgba(255, 51, 85, 0.8); }
  }

  .sub-cdk-exchange-status {
    padding: 1px 5px;
    border-radius: 2px;
    font-size: 9px;
    font-weight: 600;
    font-family: var(--cdk-font-mono);
    color: #fff;

    &.exchange-not-redeemed { background: rgba(0, 212, 255, 0.6); }
    &.exchange-redeemed { background: rgba(108, 110, 114, 0.6); }
  }

  .sub-cdk-code-section {
    margin-bottom: 10px;

    .code-tag {
      position: relative;
      overflow: hidden;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      font-family: var(--cdk-font-mono);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s;

      .code-text {
        position: relative;
        z-index: 1;
        transition: color 0.35s, clip-path 0.35s;
      }

      .copy-icon {
        position: relative;
        z-index: 1;
      }

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: #00d4ff;
        transform: scaleX(0);
        transform-origin: left;
        pointer-events: none;
        z-index: 0;
        transition: transform 0.35s ease-out;
      }

      &.copied {
        border-color: #00d4ff;

        &::before {
          transform: scaleX(1);
        }

        .code-text {
          color: #05060a;
          animation: typeReveal 0.35s steps(var(--char-count, 6)) 0.35s both;
          transition: none;
        }
      }
    }
  }

  .sub-cdk-reward {
    margin-bottom: 10px;

    h4 {
      margin: 0 0 3px;
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }

    p {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 12px;
      line-height: 1.4;
    }
  }

  .sub-cdk-servers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  .sub-cdk-note {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--el-text-color-secondary);
    font-size: 11px;
    cursor: pointer;
    margin-top: 6px;

    .note-icon { font-size: 12px !important; }
  }
}

/* =============== 动画 =============== */
.card-expand-enter-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.card-expand-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.card-expand-enter-from { opacity: 0; }
.card-expand-leave-to { opacity: 0; }
.card-expand-enter-from .overlay-container { transform: scale(0.9) translateY(30px); opacity: 0; }
.card-expand-leave-to .overlay-container { transform: scale(0.95) translateY(10px); opacity: 0; }

@keyframes typeReveal {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

@media (hover: hover) and (pointer: fine) {
  .sub-cdk-card:hover {
    transform: translateY(-4px) scale(1.015);
    border-color: var(--cdk-border-hover);
    box-shadow: 0 18px 30px rgba(5, 8, 15, 0.2);
  }

  .sub-cdk-card.available:hover {
    border-color: var(--cdk-border-available-hover);
    box-shadow:
      0 18px 30px rgba(5, 8, 15, 0.2),
      var(--cdk-glow-cyan);
  }

  .sub-cdk-card.unavailable:hover {
    border-color: var(--cdk-border-unavailable-hover);
    box-shadow:
      0 18px 30px rgba(5, 8, 15, 0.2),
      var(--cdk-glow-red);
  }
}

.sub-cdk-author { font-size: 11px; color: var(--el-text-color-secondary); }
.sub-cdk-created { font-size: 11px; color: var(--el-text-color-secondary); }

/* =============== Tooltip =============== */
:global(.cdk-note-tooltip) {
  z-index: 9999 !important;
  max-width: 400px !important;
  background: var(--cdk-overlay-bg) !important;
  border: 1px solid var(--cdk-glass-border) !important;
  border-radius: 8px !important;
  box-shadow: var(--el-box-shadow-dark) !important;
  padding: 10px !important;

  .note-content {
    line-height: 1.5 !important;
    font-size: 13px !important;
    color: var(--el-text-color-regular) !important;

    a { color: var(--el-color-primary) !important; text-decoration: underline !important; }
  }
}

.note-trigger {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: color 0.3s ease;
  color: var(--el-text-color-secondary);

  &:hover { color: #00d4ff; }
}
</style>
