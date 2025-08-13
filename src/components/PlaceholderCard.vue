<!-- 
  广告占位卡片组件
  当检测到广告被拦截时显示的温馨提示
-->
<template>
  <div class="placeholder-notice-wrapper">
    <div class="placeholder-notice">
      <!-- 小doro表情 -->
      <div class="doro-avatar">
        <img src="/doro_icon.webp" alt="Doro" class="doro-icon" />
        <div class="doro-expression">😢</div>
      </div>

      <!-- 提示文字 -->
      <div class="notice-content">
        <h4 class="notice-title">神秘小卡片被广告拦截器拦截了</h4>
        <p class="notice-message">
          但是我做了一个备用的~⭐<br />
          点击跳转可以到达全网最好的PC端收菜助手：DoroHelper 💖
        </p>

        <!-- 可选的操作按钮 -->
        <div class="notice-actions">
          <el-button size="small" type="primary" plain @click="showWhitelistGuide">
            <el-icon><InfoFilled /></el-icon>
            如何加白
          </el-button>
          <el-button size="small" type="success" plain @click="visitGitHub">
            <el-icon><ArrowRight /></el-icon>
            跳转
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { InfoFilled, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// Props (保留原有接口兼容性)
interface Props {
  placeholderData?: {
    groupName?: string
    note?: string
    image?: string
    status?: string
  }
}

const props = defineProps<Props>()

// 显示白名单设置指南
const showWhitelistGuide = async () => {
  try {
    await ElMessageBox.alert(
      `<div style="text-align: left; line-height: 1.6;">
        <div style="margin: 15px 0;">
          <strong>uBlock Origin：</strong><br/>
          1. 点击浏览器工具栏中的 uBlock Origin 图标<br/>
          2. 点击大的电源按钮禁用拦截器<br/>
          3. 刷新页面
        </div>
        <div style="margin: 15px 0;">
          <strong>AdBlock Plus：</strong><br/>
          1. 点击 AdBlock Plus 图标<br/>
          2. 选择"在此站点上暂停"<br/>
          3. 刷新页面
        </div>
        <div style="margin: 15px 0;">
          <strong>AdGuard：</strong><br/>
          1. 点击 AdGuard 图标<br/>
          2. 点击"暂停保护"<br/>
          3. 选择"在此网站上"
        </div>
        <p style="color: #909399; font-size: 12px; margin-bottom: 0;">
          谢谢你的支持！这并不会帮助我们继续提供免费的工具服务 ❤️<br \>*本广告无任何收益
        </p>
      </div>`,
      '设置白名单指南',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了',
        type: 'info',
        center: true,
        lockScroll: true,
      }
    )
  } catch (error) {
    // 用户取消了对话框
  }
}

// 访问 GitHub 项目
const visitGitHub = () => {
  window.open('https://github.com/1204244136/DoroHelper', '_blank', 'noopener,noreferrer')
  ElMessage.success('感谢你的支持！⭐')
}
</script>

<style scoped>
.placeholder-notice-wrapper {
  width: 100%;
  margin: 10px 0;
}

.placeholder-notice {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.placeholder-notice:hover {
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.placeholder-notice::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%);
  animation: shimmer 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: rotate(180deg) scale(1.1);
    opacity: 0.1;
  }
}

.doro-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
}

.doro-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08));
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

.doro-expression {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ffffff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
  color: #1f2937;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.notice-content {
  max-width: 280px;
}

.notice-title {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.notice-message {
  margin: 0 0 15px 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
}

.notice-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.notice-actions .el-button {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.notice-actions .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .placeholder-notice {
    background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
    border-color: #4b5563;
  }

  .placeholder-notice:hover {
    border-color: #6b7280;
  }

  .notice-title {
    color: #f3f4f6;
  }

  .notice-message {
    color: #d1d5db;
  }

  .doro-expression {
    background: #374151;
    color: white;
  }
}

html.dark .placeholder-notice {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  border-color: #4b5563;
}

html.dark .placeholder-notice:hover {
  border-color: #6b7280;
}

html.dark .notice-title {
  color: #f3f4f6;
}

html.dark .notice-message {
  color: #d1d5db;
}

html.dark .doro-expression {
  background: #374151;
  color: white;
}

/* 亮色模式适配 */
html.light .placeholder-notice {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

html.light .placeholder-notice:hover {
  border-color: #d1d5db;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

html.light .placeholder-notice::before {
  background: radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%);
}

html.light .notice-title {
  color: #1f2937;
}

html.light .notice-message {
  color: #4b5563;
}

html.light .doro-expression {
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
}

html.light .doro-icon {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08));
}

/* 响应式设计 */
@media (max-width: 768px) {
  .placeholder-notice {
    padding: 15px;
    min-height: 140px;
  }

  .doro-icon {
    width: 32px;
    height: 32px;
  }

  .doro-expression {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }

  .notice-title {
    font-size: 14px;
  }

  .notice-message {
    font-size: 12px;
  }

  .notice-actions .el-button {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* MessageBox 移动端优化 */
:deep(.el-message-box) {
  /* 移动端居中显示 */
  @media (max-width: 768px) {
    max-width: 90vw !important;
    width: auto !important;

    .el-message-box__content {
      max-height: 60vh;
      overflow-y: auto;
    }

    .el-message-box__message {
      font-size: 14px;
      line-height: 1.5;
    }
  }

  /* 平板端优化 */
  @media (min-width: 769px) and (max-width: 1024px) {
    max-width: 80vw !important;
  }
}
</style>
