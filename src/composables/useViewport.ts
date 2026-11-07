import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// 全局共享一个 resize 监听，按帧节流
const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const finePointer = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : true
)

let subscribers = 0
let rafId = 0
let pointerQuery: MediaQueryList | null = null

const onResize = () => {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    width.value = window.innerWidth
  })
}

const onPointerChange = (e: MediaQueryListEvent) => {
  finePointer.value = e.matches
}

export function useViewport() {
  onMounted(() => {
    if (subscribers++ === 0) {
      width.value = window.innerWidth
      window.addEventListener('resize', onResize, { passive: true })
      if (window.matchMedia) {
        pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
        finePointer.value = pointerQuery.matches
        pointerQuery.addEventListener?.('change', onPointerChange)
      }
    }
  })

  onBeforeUnmount(() => {
    if (--subscribers === 0) {
      window.removeEventListener('resize', onResize)
      pointerQuery?.removeEventListener?.('change', onPointerChange)
      pointerQuery = null
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    }
  })

  return {
    width,
    finePointer,
    /** 手机：≤ 640px */
    isPhone: computed(() => width.value <= 640),
    /** 手机与竖屏平板：≤ 900px，表格改为卡片 */
    isCompact: computed(() => width.value <= 900),
  }
}
