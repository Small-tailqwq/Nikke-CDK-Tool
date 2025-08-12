<!-- 
  广告卡片组件
  外观与CDK组合卡片保持一致，但包含特殊的广告功能
-->
<template>
  <div class="cdk-group-card-wrapper ad-card-wrapper" :class="adBlockerClass">
    <!-- 卡片重叠效果的背景层 -->
    <div class="card-stack-bg card-stack-1"></div>
    <div class="card-stack-bg card-stack-2"></div>

    <!-- 主卡片 -->
    <el-card
      class="cdk-group-card ad-card"
      :class="{
        'ad-available': true,
        expanding: false,
      }"
      body-style="padding: 0; display: flex; flex-direction: column;"
      @click="handleCardClick"
    >
      <!-- 关闭按钮 -->
      <div v-if="closeable" class="ad-close-button" @click="handleClose">
        <el-icon><Close /></el-icon>
      </div>

      <!-- Header / 图片 -->
      <div class="cdk-image" :class="{ 'has-image': !!adData.image }">
        <img
          v-if="adData.image"
          :src="getImageUrl(adData.image)"
          :alt="adData.groupName || '广告'"
          class="announcement-image"
        />
        <div v-else class="image-placeholder">
          <el-icon><Picture /></el-icon>
          <span>广告内容</span>
        </div>

        <!-- 状态条 -->
        <div class="cdk-status status-ad">
          <span>{{ adData.status }}</span>
        </div>
      </div>

      <!-- 卡片内容 -->
      <div class="cdk-content">
        <!-- 标题 -->
        <h3 class="cdk-title">{{ adData.groupName }}</h3>

        <!-- 广告描述 -->
        <div v-if="adData.note" class="cdk-description ad-description" v-html="adData.note"></div>

        <!-- 广告标识 (供广告屏蔽器识别) -->
        <div class="ad-identifier" style="display: none">
          Advertisement | Sponsored Content | Google Ad
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close, Picture } from '@element-plus/icons-vue'
import { handleAdClick, handleAdClose } from '../utils/adInjector.js'

// Props
interface Props {
  adData: {
    groupName: string
    note?: string
    image?: string
    status: string
    githubUrl: string
    closeable: boolean
    adBlockerClass: string
  }
}

const props = defineProps<Props>()

// 关闭功能
const closeable = computed(() => props.adData.closeable)

// 广告屏蔽器类名
const adBlockerClass = computed(() => props.adData.adBlockerClass)

// 处理卡片点击
const handleCardClick = () => {
  handleAdClick()
}

// 处理关闭按钮点击
const handleClose = (event: Event) => {
  handleAdClose(event)
  // 通知父组件刷新列表
  emit('adClosed')
}

// 拼接完整的图片 URL
const getImageUrl = (localPath: string): string => {
  if (!localPath) return ''
  return `${import.meta.env.BASE_URL}${
    localPath.startsWith('/') ? localPath.substring(1) : localPath
  }`
}

// 定义事件
const emit = defineEmits<{
  adClosed: []
}>()
</script>

<style lang="scss" scoped>
// 继承CDK卡片的基础样式
.cdk-group-card-wrapper.ad-card-wrapper {
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);

  // 卡片重叠效果
  .card-stack-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    background: var(--el-bg-color, #ffffff);
    border: 1px solid var(--el-border-color-light);
    opacity: 0.1;
    z-index: -1;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

    &.card-stack-1 {
      transform: translate(2px, 2px) rotate(0.5deg);
    }

    &.card-stack-2 {
      transform: translate(4px, 4px) rotate(1deg);
    }
  }

  &:hover {
    transform: translateY(-4px);

    .card-stack-bg {
      opacity: 0.15;

      &.card-stack-1 {
        transform: translate(3px, 3px) rotate(0.8deg);
      }

      &.card-stack-2 {
        transform: translate(6px, 6px) rotate(1.5deg);
      }
    }
  }
}

.cdk-group-card.ad-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  background:
    linear-gradient(var(--el-bg-color, white), var(--el-bg-color, white)) padding-box,
    linear-gradient(135deg, #f093fb 0%, #f5576c 100%) border-box;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  min-height: 280px;

  &:hover {
    box-shadow: 0 12px 32px rgba(240, 147, 251, 0.3);
    transform: scale(1.02);
  }

  &.ad-available {
    border-color: #f093fb;
    background:
      linear-gradient(var(--el-bg-color, white), var(--el-bg-color, white)) padding-box,
      linear-gradient(135deg, #f093fb 0%, #f5576c 100%) border-box;
  }
}

// 关闭按钮
.ad-close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  font-size: 12px;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
}

// 图片区域
.cdk-image {
  position: relative;
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;

  &.has-image {
    padding: 0;
  }

  .announcement-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    opacity: 0.9;

    .el-icon {
      font-size: 32px;
    }
  }
}

// 状态条
.cdk-status {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(8px);

  &.status-ad {
    background: rgba(240, 147, 251, 0.9);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
}

// 内容区域
.cdk-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cdk-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #2c3e50);
  line-height: 1.4;
  transition: color 0.3s ease; /* 添加主题切换动画 */
}

.ad-description {
  font-size: 14px;
  color: var(--el-text-color-regular, #666);
  line-height: 1.5;
  flex: 1;
  transition: color 0.3s ease; /* 添加主题切换动画 */
}

// 广告标识 (隐藏但供广告屏蔽器识别)
.ad-identifier {
  display: none !important;
  visibility: hidden !important;
  position: absolute !important;
  left: -9999px !important;
}

// 广告屏蔽器可以通过这些类名识别并屏蔽广告
.advertisement,
.google-ad,
.adsense-ad,
.ad-banner {
  /* 供广告屏蔽器识别的类名 */
  opacity: 1;
}

// 响应式设计
@media (max-width: 768px) {
  .cdk-image {
    height: 140px;
  }

  .cdk-content {
    padding: 12px;
  }

  .cdk-title {
    font-size: 15px;
  }

  .ad-description {
    font-size: 13px;
  }
}

/* =============== 暗色模式适配 =============== */
/* 媒体查询暗色模式 */
@media (prefers-color-scheme: dark) {
  .cdk-group-card-wrapper.ad-card-wrapper {
    .card-stack-bg {
      background: var(--el-bg-color, #141414);
      border-color: var(--el-border-color-light, rgba(255, 255, 255, 0.1));
    }
  }

  .ad-close-button {
    background: rgba(255, 255, 255, 0.1);
    color: var(--el-text-color-primary, #e5eaf3);
    backdrop-filter: blur(8px);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

/* Element Plus 暗色模式 */
html.dark {
  .cdk-group-card-wrapper.ad-card-wrapper {
    .card-stack-bg {
      background: var(--el-bg-color, #141414);
      border-color: var(--el-border-color-light, rgba(255, 255, 255, 0.1));
    }

    &:hover {
      .card-stack-bg {
        border-color: var(--el-border-color, rgba(255, 255, 255, 0.15));
      }
    }
  }

  .cdk-group-card.ad-card {
    /* 暗色模式下的阴影效果调整 */
    &:hover {
      box-shadow: 
        0 12px 32px rgba(240, 147, 251, 0.2),
        0 0 24px rgba(240, 147, 251, 0.1);
    }
  }

  .ad-close-button {
    background: rgba(255, 255, 255, 0.1);
    color: var(--el-text-color-primary, #e5eaf3);
    backdrop-filter: blur(8px);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }
  }

  .cdk-image {
    /* 暗色模式下图片占位符的背景 */
    .image-placeholder {
      color: rgba(255, 255, 255, 0.8);
    }
  }
}
</style>
