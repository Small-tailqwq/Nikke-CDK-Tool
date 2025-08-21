<template>
  <el-icon 
    :class="iconClass" 
    :style="iconStyle"
    v-bind="$attrs"
  >
    <!-- Element Plus 图标 -->
    <component v-if="isElementIcon" :is="iconName" />
    
    <!-- 自定义 SVG 图标 -->
    <svg 
      v-else 
      viewBox="0 0 1024 1024" 
      width="1em" 
      height="1em"
      fill="currentColor"
    >
      <path :d="getSvgPath(iconName)" />
    </svg>
  </el-icon>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as ElementIcons from '@element-plus/icons-vue'

interface Props {
  name: string
  size?: string | number
  color?: string
  hover?: boolean
  spin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: '1em',
  hover: false,
  spin: false,
})

// 判断是否为Element Plus图标
const isElementIcon = computed(() => {
  return Object.keys(ElementIcons).includes(props.name)
})

// 获取图标名称（用于动态组件）
const iconName = computed(() => {
  return isElementIcon.value ? (ElementIcons as any)[props.name] : props.name
})

// 图标class
const iconClass = computed(() => {
  return [
    'app-icon',
    {
      'app-icon--hover': props.hover,
      'app-icon--spin': props.spin,
    }
  ]
})

// 图标样式
const iconStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    fontSize: size,
    color: props.color,
  }
})

// 自定义SVG路径映射
const getSvgPath = (name: string): string => {
  const svgPaths: Record<string, string> = {
    // GitHub图标
    github: "M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z",
    
    // 帮助/问号图标
    help: "M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z M464 336a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm72 112c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16s16-7.2 16-16V464c0-8.8-7.2-16-16-16z",
    
    // Notion图标  
    notion: "M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.4-111.6 40.7C369.2 344 352 380.7 352 420.5c0 39.8 17.2 76.5 48.4 103.8 30 26.3 69.6 40.7 111.6 40.7s81.6-14.4 111.6-40.7C654.8 497 672 460.3 672 420.5c0-39.8-17.2-76.5-48.4-103.8zM512 536c-63.9 0-115.5-51.6-115.5-115.5S448.1 305 512 305s115.5 51.6 115.5 115.5S575.9 536 512 536z",
    
    // 默认图标
    default: "M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z",
  }
  
  return svgPaths[name] || svgPaths.default
}
</script>

<style lang="scss" scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: translateZ(0);
  
  /* 悬停效果 */
  &--hover:hover {
    color: var(--el-color-primary);
    transform: translateZ(0) scale(1.1);
  }
  
  /* 旋转动画 */
  &--spin {
    animation: app-icon-spin 2s linear infinite;
  }
  
  /* SVG图标样式 */
  svg {
    display: block;
    transition: inherit;
  }
}

/* 旋转动画 */
@keyframes app-icon-spin {
  0% {
    transform: translateZ(0) rotate(0deg);
  }
  100% {
    transform: translateZ(0) rotate(360deg);
  }
}

/* 暗色模式下的图标优化 */
html.dark .app-icon {
  &--hover:hover {
    color: var(--el-color-primary-light-3);
  }
}
</style>