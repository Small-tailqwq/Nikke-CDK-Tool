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

// 防抖函数
const debounceCalculateLayout = () => {
  if (recalculateTimer) {
    clearTimeout(recalculateTimer)
  }
  recalculateTimer = setTimeout(() => {
    calculateLayout()
  }, 100)
}

// 计算列数
const calculateColumnCount = () => {
  if (!containerRef.value) return 0
  const containerWidth = containerRef.value.offsetWidth
  const count = Math.floor((containerWidth + props.gap) / (props.columnWidth + props.gap)) || 1
  return Math.max(1, count)
}

// 获取项目样式
const getItemStyle = (index: number) => {
  const position = itemPositions.value[index]
  if (!position) {
    return {
      opacity: '0',
      transform: 'translateY(20px)',
      transition: 'none',
    }
  }

  return {
    position: 'absolute' as const,
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    opacity: '1',
    transform: 'translateY(0)',
    transition: 'all 0.3s ease',
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
    columnHeights.value = new Array(columnCount.value).fill(0)
    itemPositions.value = []

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

    // 真正的瀑布流算法：每次选择最矮的列放置下一个元素
    for (let i = 0; i < props.items.length; i++) {
      const item = items[i] as HTMLElement
      if (!item) continue

      // 找到最矮的列
      const shortestColumnIndex = columnHeights.value.indexOf(Math.min(...columnHeights.value))

      // 计算位置
      const left = shortestColumnIndex * (actualColumnWidth + props.gap)
      const top = columnHeights.value[shortestColumnIndex]

      // 保存位置信息
      itemPositions.value[i] = {
        left,
        top,
        width: actualColumnWidth,
      }

      // 获取元素高度并更新列高度
      await nextTick() // 确保样式已应用
      const itemHeight = item.offsetHeight || 200 // 默认高度
      columnHeights.value[shortestColumnIndex] += itemHeight + props.gap
    }

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
    // 当items变化时，先清空位置信息和容器高度，避免显示错误的布局
    itemPositions.value = []
    containerHeight.value = 0

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
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (recalculateTimer) {
    clearTimeout(recalculateTimer)
  }
})

// 暴露重新计算方法
defineExpose({
  recalculate: calculateLayout,
})
</script>

<style scoped>
.masonry-layout {
  position: relative;
  width: 100%;
  transition: height 0.3s ease;
}

.masonry-item {
  box-sizing: border-box;
}
</style>
