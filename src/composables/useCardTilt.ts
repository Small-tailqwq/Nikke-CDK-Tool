import { ref, onMounted, onBeforeUnmount } from 'vue'

const ROTATE_X_GAIN = 22.5
const ROTATE_Y_GAIN = 19.5
const BRIGHTNESS_GAIN = 0.45
const SHADOW_X_GAIN = 14
const SHADOW_Y_GAIN = 10
const SHADOW_BLUR_BASE = 28

let activeCard: HTMLElement | null = null
let pointerX = 0
let pointerY = 0
let hasPointer = false
let rafId = 0
let subscribers = 0

function resetCard(card: HTMLElement) {
  card.classList.remove('is-pointer-hovered')
  for (const name of [
    '--tilt-x',
    '--tilt-y',
    '--img-brightness',
    '--shadow-x',
    '--shadow-y',
    '--shadow-blur',
  ]) {
    card.style.removeProperty(name)
  }
}

function updateHover() {
  rafId = 0
  if (!hasPointer) return
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const card = finePointer
    ? (document.elementFromPoint(pointerX, pointerY)?.closest<HTMLElement>('[data-card-tilt]') ??
      null)
    : null
  // Scroll can change the hovered card without dispatching a pointer move.
  const rect = card?.getBoundingClientRect()
  if (activeCard !== card) {
    if (activeCard) resetCard(activeCard)
    activeCard = card
  }
  if (!card || !rect) return
  card.classList.add('is-pointer-hovered')
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const nx = Math.max(-1, Math.min(1, (pointerX - rect.left - rect.width / 2) / (rect.width / 2)))
  const ny = Math.max(-1, Math.min(1, (pointerY - rect.top - rect.height / 2) / (rect.height / 2)))
  card.style.setProperty('--tilt-x', `${(-ny * ROTATE_X_GAIN).toFixed(4)}deg`)
  card.style.setProperty('--tilt-y', `${(nx * ROTATE_Y_GAIN).toFixed(4)}deg`)
  card.style.setProperty('--img-brightness', `${(1 - ny * BRIGHTNESS_GAIN).toFixed(4)}`)
  card.style.setProperty('--shadow-x', `${(-nx * SHADOW_X_GAIN).toFixed(2)}px`)
  card.style.setProperty(
    '--shadow-y',
    `${(SHADOW_Y_GAIN + Math.abs(ny) * SHADOW_Y_GAIN).toFixed(2)}px`
  )
  card.style.setProperty('--shadow-blur', `${(SHADOW_BLUR_BASE + Math.abs(nx) * 12).toFixed(2)}px`)
}

function scheduleHover() {
  if (hasPointer && !rafId) rafId = requestAnimationFrame(updateHover)
}

function trackPointer(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  hasPointer = true
  pointerX = event.clientX
  pointerY = event.clientY
  scheduleHover()
}

function clearHover() {
  cancelAnimationFrame(rafId)
  rafId = 0
  hasPointer = false
  if (activeCard) resetCard(activeCard)
  activeCard = null
}

function onPointerOut(event: PointerEvent) {
  if (!event.relatedTarget) clearHover()
}

export function useCardTilt() {
  const wrapperRef = ref<HTMLElement | null>(null)
  const resetHover = () => {
    if (wrapperRef.value) resetCard(wrapperRef.value)
  }
  const onPointerEnter = (event: PointerEvent) => {
    wrapperRef.value = event.currentTarget as HTMLElement
    trackPointer(event)
  }

  onMounted(() => {
    if (subscribers++ > 0) return
    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('scroll', scheduleHover, { passive: true, capture: true })
    window.addEventListener('pointerout', onPointerOut)
    window.addEventListener('blur', clearHover)
  })
  onBeforeUnmount(() => {
    if (activeCard === wrapperRef.value) clearHover()
    if (--subscribers > 0) return
    clearHover()
    window.removeEventListener('pointermove', trackPointer)
    window.removeEventListener('scroll', scheduleHover, true)
    window.removeEventListener('pointerout', onPointerOut)
    window.removeEventListener('blur', clearHover)
  })

  return {
    wrapperRef,
    onPointerEnter,
    onPointerMove: trackPointer,
    onPointerLeave: trackPointer,
    resetHover,
  }
}
