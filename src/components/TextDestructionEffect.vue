<template>
  <div v-if="isActive" class="blackhole-container">
    <!-- 反色遮罩层 -->
    <div class="invert-overlay" :class="{ active: invertActive }"></div>

    <!-- 黑洞视觉中心 -->
    <div class="blackhole-core" :class="{ collapsing: isCleaningUp }" :style="coreStyle">
      <div class="blackhole-event-horizon"></div>
      <div class="blackhole-accretion"></div>
      <div class="blackhole-glow"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useDoroStore } from '../stores/doro'

const doroStore = useDoroStore()
const isActive = ref(false)
const isCleaningUp = ref(false)
const invertActive = ref(false)
const coreStyle = ref({})
const pageAnimations = []
let invertTimer = null
let cleanupTimer = null
let generation = 0

function restorePage() {
  pageAnimations.splice(0).forEach((animation) => animation.cancel())
}

function absorbPage() {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  // Measure every block before starting animations; retain the real text and layout.
  const blocks = [
    ...document.querySelectorAll(
      '.el-header, .el-footer, .about-container > *, .about-card > .el-card__body > *'
    ),
  ]
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(
      ({ rect }) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth
    )
    .slice(0, 36)

  blocks.forEach(({ element, rect }, index) => {
    const x = rect.left + rect.width / 2
    const y = (Math.max(0, rect.top) + Math.min(window.innerHeight, rect.bottom)) / 2
    const dx = cx - x
    const dy = cy - y
    const distance = Math.hypot(dx, dy)
    const twist = dx < 0 ? -1 : 1
    const delay = 180 + Math.min(distance / Math.hypot(cx, cy), 1) * 350 + (index % 3) * 55
    const origin = x - rect.left + 'px ' + (y - rect.top) + 'px'
    const pose = (progress, turn, sx, sy) =>
      'translate(' +
      (dx * progress - dy * turn) +
      'px,' +
      (dy * progress + dx * turn) +
      'px) rotate(' +
      turn * 90 +
      'deg) scale(' +
      sx +
      ',' +
      sy +
      ')'
    pageAnimations.push(
      element.animate(
        [
          { offset: 0, transform: 'none', opacity: 1, transformOrigin: origin },
          {
            offset: 0.25,
            transform: pose(-0.025, -0.015 * twist, 1.015, 0.99),
            opacity: 1,
            transformOrigin: origin,
          },
          {
            offset: 0.58,
            transform: pose(0.18, 0.15 * twist, 0.88, 1.04),
            opacity: 1,
            transformOrigin: origin,
          },
          {
            offset: 0.83,
            transform: pose(0.66, 0.18 * twist, 0.4, 0.65),
            opacity: 0.9,
            transformOrigin: origin,
          },
          { offset: 1, transform: pose(1, 0, 0.015, 0.015), opacity: 0, transformOrigin: origin },
        ],
        {
          duration: 2650 - delay,
          delay,
          easing: 'cubic-bezier(0.55, 0.02, 0.86, 0.4)',
          fill: 'forwards',
        }
      )
    )
  })
}

watch(
  () => doroStore.isTransitioning,
  async (transitioning) => {
    const current = ++generation
    clearTimeout(invertTimer)
    clearTimeout(cleanupTimer)
    if (!transitioning) {
      isCleaningUp.value = true
      invertActive.value = false
      // The battle background is mounted before restoring the underlying page.
      await nextTick()
      if (current !== generation) return
      restorePage()
      cleanupTimer = setTimeout(() => {
        isActive.value = false
        isCleaningUp.value = false
      }, 600)
      return
    }
    restorePage()
    isActive.value = true
    isCleaningUp.value = false
    invertActive.value = false
    coreStyle.value = {
      left: window.innerWidth / 2 + 'px',
      top: window.innerHeight / 2 + 'px',
      transform: 'translate(-50%, -50%)',
    }
    await nextTick()
    if (current !== generation || !doroStore.isTransitioning) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    absorbPage()
    invertTimer = setTimeout(() => {
      invertActive.value = true
    }, 2100)
  }
)

onBeforeUnmount(() => {
  generation++
  clearTimeout(invertTimer)
  clearTimeout(cleanupTimer)
  restorePage()
})
</script>

<style scoped>
.blackhole-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
}

.blackhole-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 16%, rgba(7, 3, 15, 0.8) 100%);
  animation: gravity-darken 2.65s ease-in forwards;
}

@keyframes gravity-darken {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.invert-overlay {
  position: fixed;
  inset: 0;
  z-index: 9995;
  backdrop-filter: invert(0);
  transition: backdrop-filter 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.invert-overlay.active {
  backdrop-filter: invert(1) hue-rotate(180deg);
}

.blackhole-core {
  position: fixed;
  z-index: 9997;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.5s ease-out;
}

.blackhole-core.collapsing {
  transform: translate(-50%, -50%) scale(0) !important;
  opacity: 0;
  transition:
    transform 0.4s ease-in,
    opacity 0.4s ease-out;
}

.blackhole-event-horizon {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #000 30%,
    #1a0a2e 50%,
    rgba(10, 0, 30, 0.8) 70%,
    transparent 100%
  );
  box-shadow:
    0 0 60px rgba(0, 0, 0, 0.9),
    0 0 120px rgba(80, 0, 150, 0.5),
    inset 0 0 30px rgba(0, 0, 0, 0.8);
  animation: blackholePulse 0.6s ease-in-out infinite alternate;
}

.blackhole-accretion {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: rgba(180, 60, 255, 0.7);
  border-right-color: rgba(0, 200, 255, 0.5);
  border-bottom-color: rgba(120, 40, 200, 0.3);
  animation: accretionSpin 1.2s linear infinite;
  filter: blur(2px);
}

.blackhole-accretion::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-left-color: rgba(255, 100, 200, 0.4);
  border-bottom-color: rgba(100, 160, 255, 0.3);
  animation: accretionSpin 2s linear infinite reverse;
}

.blackhole-glow {
  position: absolute;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 40%,
    rgba(100, 0, 200, 0.2) 60%,
    transparent 100%
  );
  animation: blackholePulse 0.8s ease-in-out 0.2s infinite alternate;
}

@keyframes accretionSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes blackholePulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blackhole-container::before {
    display: none;
  }
  .invert-overlay {
    display: none;
  }
  .blackhole-core {
    display: none;
  }
}
</style>
