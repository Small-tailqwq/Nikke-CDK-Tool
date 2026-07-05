<template>
  <canvas
    ref="canvasRef"
    class="scroll-wave-canvas"
    :class="{ 'is-scrolling': isScrolling }"
    :style="canvasStyle"
    :width="canvasWidth"
    :height="canvasHeight"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

interface Props {
  /** 要监听的滚动容器 DOM 元素；不传则自动查找最近可滚动祖先 */
  container?: HTMLElement | null
}

const props = withDefaults(defineProps<Props>(), {
  container: null,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isScrolling = ref(false)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const containerRect = ref<{ top: number; right: number; height: number }>({ top: 0, right: 0, height: 0 })
const cachedThumbColor = ref('rgba(0,0,0,0.12)')

let rafId = 0
let fadeTimer: ReturnType<typeof setTimeout> | null = null
let lastScrollTop = 0
let phase = 0
let opacity = 0
let resizeObserver: ResizeObserver | null = null

const canvasStyle = computed(() => ({
  right: `${window.innerWidth - containerRect.value.right}px`,
  top: `${containerRect.value.top}px`,
  height: `${containerRect.value.height}px`,
}))

function findScrollableAncestor(el: HTMLElement): HTMLElement | Window {
  let current: HTMLElement | null = el.parentElement
  while (current) {
    const style = getComputedStyle(current)
    const overflowY = style.overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      if (current.scrollHeight > current.clientHeight) {
        return current
      }
    }
    current = current.parentElement
  }
  return window
}

let scrollElement: HTMLElement | Window = window

function getScrollElement(): HTMLElement | Window {
  return scrollElement
}

function updateLayout() {
  const el = scrollElement instanceof Window ? document.documentElement : scrollElement
  const rect = scrollElement instanceof Window
    ? { top: 0, right: window.innerWidth, height: window.innerHeight }
    : scrollElement.getBoundingClientRect()
  containerRect.value = { top: rect.top, right: rect.right, height: rect.height }
  canvasHeight.value = rect.height
  canvasWidth.value = 6
  updateColorCache()
}

function getThumbColor(): string {
  return cachedThumbColor.value
}

function updateColorCache() {
  cachedThumbColor.value = getComputedStyle(document.documentElement).getPropertyValue('--scrollbar-thumb').trim() || 'rgba(0,0,0,0.12)'
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvasWidth.value
  const h = canvasHeight.value
  const maxScroll = Math.max(1, getScrollHeight() - getClientHeight())
  const ratio = Math.min(1, Math.max(0, lastScrollTop / maxScroll))
  const margin = 20
  const centerY = margin + (h - margin * 2) * ratio

  ctx.clearRect(0, 0, w, h)

  if (opacity <= 0) return

  const thumbColor = getThumbColor()
  const wingspan = 80
  const startY = Math.max(0, centerY - wingspan)
  const endY = Math.min(h, centerY + wingspan)

  const gradient = ctx.createLinearGradient(0, centerY - wingspan, 0, centerY + wingspan)
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(0.2, 'transparent')
  gradient.addColorStop(0.35, thumbColor)
  gradient.addColorStop(0.5, thumbColor)
  gradient.addColorStop(0.65, thumbColor)
  gradient.addColorStop(0.8, 'transparent')
  gradient.addColorStop(1, 'transparent')

  ctx.beginPath()
  ctx.strokeStyle = gradient
  ctx.lineWidth = 1.5
  ctx.globalAlpha = opacity

  for (let y = startY; y <= endY; y += 1) {
    const x = w / 2 + Math.sin((y + phase) / 16 * Math.PI * 2) * 2.5
    if (y === startY) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
}

function getScrollTop(): number {
  const el = getScrollElement()
  return el instanceof Window ? window.scrollY : (el as HTMLElement).scrollTop
}

function getScrollHeight(): number {
  const el = getScrollElement()
  return el instanceof Window ? document.documentElement.scrollHeight : (el as HTMLElement).scrollHeight
}

function getClientHeight(): number {
  const el = getScrollElement()
  return el instanceof Window ? window.innerHeight : (el as HTMLElement).clientHeight
}

function onScroll() {
  lastScrollTop = getScrollTop()
  isScrolling.value = true
  opacity = 1

  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }

  fadeTimer = setTimeout(() => {
    fadeTimer = null
    isScrolling.value = false
  }, 500)
}

function animate() {
  if (isScrolling.value) {
    phase = (phase + 2) % 360
  }

  if (!isScrolling.value && opacity > 0) {
    opacity = Math.max(0, opacity - 0.05)
  }

  draw()

  if (!isScrolling.value && opacity <= 0) {
    rafId = 0
    return
  }

  rafId = requestAnimationFrame(animate)
}

watch(isScrolling, (val) => {
  if (val && rafId === 0) {
    rafId = requestAnimationFrame(animate)
  }
})

onMounted(() => {
  if (props.container) {
    scrollElement = props.container
  } else if (canvasRef.value) {
    scrollElement = findScrollableAncestor(canvasRef.value)
  }

  const el = scrollElement instanceof Window ? window : scrollElement
  el.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', updateLayout)

  if (scrollElement instanceof HTMLElement) {
    resizeObserver = new ResizeObserver(updateLayout)
    resizeObserver.observe(scrollElement)
  }

  updateLayout()
  updateColorCache()
})

onBeforeUnmount(() => {
  const el = scrollElement instanceof Window ? window : scrollElement
  el.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updateLayout)

  if (rafId) cancelAnimationFrame(rafId)
  if (fadeTimer) clearTimeout(fadeTimer)

  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style lang="scss" scoped>
.scroll-wave-canvas {
  position: fixed;
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.3s ease;
}
</style>
