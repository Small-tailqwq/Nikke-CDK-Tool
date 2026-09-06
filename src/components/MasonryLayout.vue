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
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  items: any[]
  columnWidth?: number
  gap?: number
  edgePadding?: number
  getItemKey?: (item: any, index: number) => string | number
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 280,
  gap: 20,
  edgePadding: 0,
  getItemKey: (_item: any, index: number) => index,
})

const containerRef = ref<HTMLElement>()
const itemPositions = ref<Array<{ left: number; top: number; width: number }>>([])
const containerHeight = ref(0)
let observer: ResizeObserver | null = null
let layoutFrame = 0
let mounted = false
let lastContainerWidth = 0
const observedSizes = new Map<HTMLElement, { width: number; height: number }>()

const getResponsiveColumnConfig = (width: number) => {
  if (width <= 480)
    return { minWidth: Math.max(props.columnWidth * 0.8, 200), maxColumns: width < 360 ? 1 : 2 }
  if (width <= 768) return { minWidth: props.columnWidth * 0.85, maxColumns: 3 }
  if (width <= 1024) return { minWidth: props.columnWidth * 0.9, maxColumns: 4 }
  return { minWidth: props.columnWidth, maxColumns: 4 }
}

const getItemStyle = (index: number) => {
  const position = itemPositions.value[index]
  return {
    position: 'absolute' as const,
    left: '0px',
    top: '0px',
    width: position ? `${position.width}px` : '100%',
    opacity: position ? '1' : '0',
    transform: position ? `translate(${position.left}px, ${position.top}px)` : 'translateY(20px)',
  }
}

function scheduleLayout() {
  if (!mounted || layoutFrame) return
  layoutFrame = requestAnimationFrame(calculateLayout)
}

function calculateLayout() {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = 0
  const container = containerRef.value
  if (!mounted || !container) return
  const width = container.clientWidth
  if (!width) return
  lastContainerWidth = width
  const { minWidth, maxColumns } = getResponsiveColumnConfig(width)
  const padding = Math.min(
    Math.max(0, props.edgePadding),
    Math.max(0, (width - Math.min(minWidth, width)) / 2)
  )
  const availableWidth = Math.max(1, width - padding * 2)
  const count = Math.max(
    1,
    Math.min(maxColumns, Math.floor((availableWidth + props.gap) / (minWidth + props.gap)))
  )
  const itemWidth = Math.max(1, (availableWidth - (count - 1) * props.gap) / count)
  const items = Array.from(container.children) as HTMLElement[]
  const activeItems = new Set(items)
  for (const element of observedSizes.keys()) {
    if (!activeItems.has(element)) {
      observer?.unobserve(element)
      observedSizes.delete(element)
    }
  }

  // Batch width writes before measuring heights: one layout, no per-card read/write cycle.
  for (const item of items) {
    if (item.style.width !== `${itemWidth}px`) item.style.width = `${itemWidth}px`
  }
  const heights = new Array(count).fill(padding)
  const positions = items.map((item) => {
    const column = heights.indexOf(Math.min(...heights))
    const position = {
      left: padding + column * (itemWidth + props.gap),
      top: heights[column],
      width: itemWidth,
    }
    const measured = { width: item.offsetWidth, height: item.offsetHeight }
    heights[column] += measured.height + props.gap
    if (!observedSizes.has(item)) observer?.observe(item)
    observedSizes.set(item, measured)
    return position
  })
  itemPositions.value = positions
  containerHeight.value = items.length ? Math.max(...heights) - props.gap + padding : 0
}

watch(() => props.items.map((item, index) => props.getItemKey(item, index)), scheduleLayout, {
  flush: 'post',
})
watch(() => [props.columnWidth, props.gap, props.edgePadding], scheduleLayout, { flush: 'post' })

onMounted(() => {
  mounted = true
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (element === containerRef.value) {
        if (element.clientWidth !== lastContainerWidth) scheduleLayout()
        continue
      }
      const previous = observedSizes.get(element)
      if (
        previous &&
        (element.offsetWidth !== previous.width || element.offsetHeight !== previous.height)
      ) {
        scheduleLayout()
      }
    }
  })
  if (containerRef.value) observer.observe(containerRef.value)
  window.addEventListener('resize', scheduleLayout)
  scheduleLayout()
})

onUnmounted(() => {
  mounted = false
  cancelAnimationFrame(layoutFrame)
  observer?.disconnect()
  observedSizes.clear()
  window.removeEventListener('resize', scheduleLayout)
})

defineExpose({ recalculate: scheduleLayout })
</script>

<style scoped>
.masonry-layout {
  position: relative;
  width: 100%;
  transition: height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.masonry-item {
  box-sizing: border-box;
  transition:
    transform 0.25s ease,
    opacity 0.2s ease;
  backface-visibility: hidden; /* 防止背面闪烁 */
}

.masonry-item:hover,
.masonry-item:focus-within {
  z-index: 20;
}
@media (prefers-reduced-motion: reduce) {
  .masonry-layout,
  .masonry-item {
    transition: none;
  }
}
</style>
