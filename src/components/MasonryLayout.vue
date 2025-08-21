<template>
  <div ref="containerRef" class="masonry-layout" :style="{ height: containerHeight + 'px' }">
    <div
      v-for="(item, index) in items"
      :key="getItemKey(item, index)"
      :style="getItemStyle(index)"
      class="masonry-item"
    >
      <slot :item="item" :index="index"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface Props {
  items: any[]
  columnWidth?: number
  gap?: number
  getItemKey?: (item: any, index: number) => string | number
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 280,
  gap: 20,
  getItemKey: (item: any, index: number) => index,
})

const containerRef = ref<HTMLElement>()
const itemPositions = ref<Array<{ left: number; top: number; width: number }>>([])
const columnHeights = ref<number[]>([])
const containerHeight = ref(0)
const columnCount = ref(0)

let resizeObserver: ResizeObserver | null = null
let isCalculating = false
let recalculateTimer: number | null = null
let itemResizeObservers: ResizeObserver[] = []
let imageUnloaders: Array<() => void> = []

// 防抖函数
const debounceCalculateLayout = () => {
  if (recalculateTimer) {
    clearTimeout(recalculateTimer)
  }
  recalculateTimer = setTimeout(() => {
    calculateLayout()
  }, 50) // 减少防抖时间，提高响应性
}

// 计算列数 - 优化小屏幕适配
const calculateColumnCount = () => {
  if (!containerRef.value) return 0
  const containerWidth = containerRef.value.offsetWidth
  
  // 根据屏幕尺寸智能调整最小列宽和列数范围
  let minColumnWidth = props.columnWidth
  let maxColumns = 4
  
  if (containerWidth <= 480) {
    // 超小屏幕：强制单列或双列
    minColumnWidth = Math.max(props.columnWidth * 0.8, 200) // 最小200px
    maxColumns = containerWidth < 360 ? 1 : 2
  } else if (containerWidth <= 768) {
    // 小屏幕：适度减小列宽，限制最大列数
    minColumnWidth = props.columnWidth * 0.85
    maxColumns = 3
  } else if (containerWidth <= 1024) {
    // 中等屏幕：轻微调整
    minColumnWidth = props.columnWidth * 0.9
    maxColumns = 4
  }
  
  // 基础计算
  const baseCount = Math.floor((containerWidth + props.gap) / (minColumnWidth + props.gap)) || 1
  
  // 应用最大列数限制
  const count = Math.min(baseCount, maxColumns)
  
  return Math.max(1, count)
}

// 获取项目样式
const getItemStyle = (index: number) => {
  const position = itemPositions.value[index]
  if (!position) {
    return {
      opacity: '0',
      transform: 'translateY(20px) translateZ(0) scale(0.95)',
      transition: 'none',
    }
  }

  return {
    position: 'absolute' as const,
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    opacity: '1',
    transform: 'translateY(0) translateZ(0) scale(1)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)', // 使用更平滑的缓动函数
  }
}

// 计算布局
const calculateLayout = async () => {
  if (!containerRef.value || isCalculating) return

  isCalculating = true

  try {
    await nextTick()

    const container = containerRef.value
    const containerWidth = container.offsetWidth
    const newColumnCount = calculateColumnCount()

    columnCount.value = newColumnCount

    // 计算实际列宽
    const totalGap = (columnCount.value - 1) * props.gap
    const actualColumnWidth = (containerWidth - totalGap) / columnCount.value

    // 重置列高度
    const newColumnHeights = new Array(columnCount.value).fill(0)
    const newItemPositions: Array<{ left: number; top: number; width: number }> = []

    // 等待所有元素渲染完成
    await nextTick()

    // 获取当前实际的元素，确保和props.items数量一致
    const items = container.querySelectorAll('.masonry-item')

    // 如果DOM元素数量和props.items数量不一致，可能还在渲染中，稍后重试
    if (items.length !== props.items.length) {
      setTimeout(() => {
        if (!isCalculating) {
          calculateLayout()
        }
      }, 16) // 大约一帧的时间
      return
    }

    // 清理旧的观察者（每次重算重新绑定，避免残留）
    cleanupItemObservers()
    cleanupImageListeners()

    // 真正的瀑布流算法：每次选择最矮的列放置下一个元素
    for (let i = 0; i < props.items.length; i++) {
      const item = items[i] as HTMLElement
      if (!item) continue

      // 找到最矮的列
      const shortestColumnIndex = newColumnHeights.indexOf(Math.min(...newColumnHeights))

      // 计算位置
      const left = shortestColumnIndex * (actualColumnWidth + props.gap)
      const top = newColumnHeights[shortestColumnIndex]

      // 保存位置信息到临时数组
      newItemPositions[i] = {
        left,
        top,
        width: actualColumnWidth,
      }

      // 获取元素高度并更新列高度
      await nextTick() // 确保样式已应用
      const itemHeight = item.offsetHeight || 200 // 默认高度
      newColumnHeights[shortestColumnIndex] += itemHeight + props.gap

      // 监听单个子项高度变化（例如内部展开、图片加载后高度变化）
      attachItemObserver(item)
      // 监听图片加载
      attachImageLoadListeners(item)
    }

    // 一次性更新所有位置信息，避免中间状态导致的闪烁
    itemPositions.value = newItemPositions
    columnHeights.value = newColumnHeights

    // 设置容器高度
    containerHeight.value = Math.max(...columnHeights.value) - props.gap
  } finally {
    isCalculating = false
  }
}

// 监听项目变化
watch(
  () => props.items,
  () => {
    // 当items变化时，不清空位置信息，保持现有布局直到新布局计算完成
    nextTick(() => {
      debounceCalculateLayout()
    })
  },
  { deep: true }
)

// 监听窗口大小变化
const handleResize = () => {
  debounceCalculateLayout()
}

onMounted(() => {
  nextTick(() => {
    calculateLayout()
    window.addEventListener('resize', handleResize)
    // 监听缩放事件（通过visualViewport API）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleResize)
  }
  cleanupItemObservers()
  cleanupImageListeners()
  if (recalculateTimer) {
    clearTimeout(recalculateTimer)
  }
})

// 暴露重新计算方法
defineExpose({
  recalculate: calculateLayout,
})

// =================== 动态高度监听逻辑 ===================
const attachItemObserver = (el: HTMLElement) => {
  try {
    const ro = new ResizeObserver(() => {
      if (!isCalculating) debounceCalculateLayout()
    })
    ro.observe(el)
    itemResizeObservers.push(ro)
  } catch (e) {
    // 忽略不支持情况
  }
}

const cleanupItemObservers = () => {
  itemResizeObservers.forEach((ro) => ro.disconnect())
  itemResizeObservers = []
}

const attachImageLoadListeners = (root: HTMLElement) => {
  const imgs = root.querySelectorAll('img')
  imgs.forEach((img) => {
    if (img.complete) return // 已完成无需监听
    const handler = () => {
      debounceCalculateLayout()
    }
    img.addEventListener('load', handler, { once: true })
    imageUnloaders.push(() => img.removeEventListener('load', handler))
  })
}

const cleanupImageListeners = () => {
  imageUnloaders.forEach((off) => off())
  imageUnloaders = []
}
</script>

<style scoped>
.masonry-layout {
  position: relative;
  width: 100%;
  transition: height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.masonry-item {
  box-sizing: border-box;
  will-change: transform, opacity; /* 优化动画性能 */
  transform: translateZ(0); /* 开启硬件加速 */
  backface-visibility: hidden; /* 防止背面闪烁 */
}
</style>
