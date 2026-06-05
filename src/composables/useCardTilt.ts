import { ref, onMounted } from 'vue'

const ROTATE_X_GAIN = 22.5
const ROTATE_Y_GAIN = 19.5
const BRIGHTNESS_GAIN = 0.45
const SHADOW_X_GAIN = 14
const SHADOW_Y_GAIN = 10
const SHADOW_BLUR_BASE = 28

export function useCardTilt() {
  const wrapperRef = ref<HTMLElement | null>(null)
  let hoverActive = false

  const resetHover = () => {
    const w = wrapperRef.value
    if (!w) return

    w.style.removeProperty('--tilt-x')
    w.style.removeProperty('--tilt-y')
    w.style.removeProperty('--img-brightness')
    w.style.removeProperty('--shadow-x')
    w.style.removeProperty('--shadow-y')
    w.style.removeProperty('--shadow-blur')
  }

  const updateHover = (clientX: number, clientY: number) => {
    const w = wrapperRef.value
    if (!w) return

    const rect = w.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const nx = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width / 2)))
    const ny = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height / 2)))

    w.style.setProperty('--tilt-x', `${(-ny * ROTATE_X_GAIN).toFixed(4)}deg`)
    w.style.setProperty('--tilt-y', `${(nx * ROTATE_Y_GAIN).toFixed(4)}deg`)
    w.style.setProperty('--img-brightness', `${(1 - ny * BRIGHTNESS_GAIN).toFixed(4)}`)
    w.style.setProperty('--shadow-x', `${(-nx * SHADOW_X_GAIN).toFixed(2)}px`)
    w.style.setProperty('--shadow-y', `${(SHADOW_Y_GAIN + Math.abs(ny) * SHADOW_Y_GAIN).toFixed(2)}px`)
    w.style.setProperty('--shadow-blur', `${(SHADOW_BLUR_BASE + Math.abs(nx) * 12).toFixed(2)}px`)
  }

  const isFinePointer = () =>
    window.matchMedia('(hover: hover) and (pointer: fine)').matches

  const onPointerEnter = (e: PointerEvent) => {
    if (!isFinePointer()) return
    hoverActive = true
    // Use the wrapper (currentTarget) so this works with event delegation
    const w = e.currentTarget as HTMLElement
    wrapperRef.value = w
    updateHover(e.clientX, e.clientY)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!hoverActive) return
    updateHover(e.clientX, e.clientY)
  }

  const onPointerLeave = () => {
    hoverActive = false
    resetHover()
  }

  onMounted(() => {
    resetHover()
  })

  return {
    wrapperRef,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    resetHover,
  }
}
