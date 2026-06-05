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

    <!-- 吸入的文字粒子 -->
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="sucked-particle"
      :style="particle.style"
    >
      {{ particle.content }}
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
const particles = ref([])
const coreStyle = ref({})

let animationFrameId = null
let nodesToClear = []
let invertTimer = null
let cleanupTimer = null

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const MAX_PARTICLES = 300

watch(
  () => doroStore.isTransitioning,
  (transitioning) => {
    if (transitioning) {
      isCleaningUp.value = false
      invertActive.value = false
      startBlackHole()
    } else if (isActive.value && !isCleaningUp.value) {
      cleanupEffect()
    }
  }
)

function startBlackHole() {
  isActive.value = true
  if (prefersReducedMotion) {
    collectAndSuckTexts()
    setTimeout(() => {
      nodesToClear.forEach(({ node, originalText }) => {
        if (node && node.parentNode) node.textContent = originalText
      })
      nodesToClear = []
      isActive.value = false
    }, 300)
    return
  }
  collectAndSuckTexts()
}

function cleanupEffect() {
  isCleaningUp.value = true

  // 反色叠加层先淡出
  invertActive.value = false

  // 恢复文本
  nodesToClear.forEach(({ node, originalText }) => {
    if (node && node.parentNode) node.textContent = originalText
  })
  nodesToClear = []

  // 等待短暂过渡后清理所有粒子
  cleanupTimer = setTimeout(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    particles.value = []
    isActive.value = false
    isCleaningUp.value = false
  }, 600)

  if (invertTimer) clearTimeout(invertTimer)
}

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  clearTimeout(invertTimer)
  clearTimeout(cleanupTimer)
  nodesToClear.forEach(({ node, originalText }) => {
    if (node && node.parentNode) node.textContent = originalText
  })
  nodesToClear = []
  isActive.value = false
  isCleaningUp.value = false
})

function collectAndSuckTexts() {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const collected = []
  nodesToClear = []
  let id = 0

  function scanTextNodes(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent.trim()
      if (text && text.length > 0) {
        const range = document.createRange()
        range.selectNodeContents(element)
        const rect = range.getBoundingClientRect()

        if (rect.width > 0 && rect.height > 0) {
          nodesToClear.push({ node: element, originalText: element.textContent })
          const chars = Array.from(text)
          chars.forEach((char, index) => {
            if (char.trim() && collected.length < MAX_PARTICLES) {
              const charWidth = rect.width / chars.length
              const startX = rect.left + charWidth * index + charWidth / 2
              const startY = rect.top + rect.height / 2
              const dx = centerX - startX
              const dy = centerY - startY
              const dist = Math.sqrt(dx * dx + dy * dy)
              const angle = Math.atan2(dy, dx)
              const spiralOffset = (Math.random() - 0.5) * Math.PI * 0.6

              collected.push({
                id: id++,
                content: char,
                startX,
                startY,
                centerX,
                centerY,
                dist: Math.max(dist, 20),
                angle: angle + spiralOffset,
                delay: Math.random() * 1800,
                duration: 600 + Math.random() * 1200,
                rotation: (Math.random() - 0.5) * 720,
              })
            }
          })
        }
      }
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      if (!['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
        for (let child of element.childNodes) {
          scanTextNodes(child)
        }
      }
    }
  }

  const bodyChildren = document.body.children
  for (let element of bodyChildren) {
    if (
      !element.classList.contains('blackhole-container') &&
      !element.classList.contains('floating-doro') &&
      !element.classList.contains('fragments-container')
    ) {
      scanTextNodes(element)
    }
  }

  nodesToClear.forEach(({ node }) => {
    if (node.parentNode) node.textContent = ''
  })

  const startTime = Date.now()

  particles.value = collected.map((p) => ({
    ...p,
    style: {
      position: 'fixed',
      left: `${p.startX}px`,
      top: `${p.startY}px`,
      zIndex: 10000,
      pointerEvents: 'none',
      userSelect: 'none',
      fontSize: '16px',
      fontWeight: 'normal',
      color: '#333',
      transform: 'translate(-50%, -50%) rotate(0deg) scale(1)',
      opacity: 1,
    },
  }))

  coreStyle.value = {
    position: 'fixed',
    left: `${centerX}px`,
    top: `${centerY}px`,
    transform: 'translate(-50%, -50%) scale(0)',
    zIndex: 9997,
    transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
  }

  nextTick(() => {
    coreStyle.value.transform = 'translate(-50%, -50%) scale(1)'

    // 延迟触发反色
    invertTimer = setTimeout(() => {
      invertActive.value = true
    }, 2000)

    const animate = () => {
      if (isCleaningUp.value) return

      const elapsed = Date.now() - startTime

      particles.value.forEach((p) => {
        if (elapsed < p.delay) return
        const progress = Math.min(1, (elapsed - p.delay) / p.duration)
        const easedProgress = Math.pow(progress, 2.5)

        const spiralRadius = (1 - easedProgress) * p.dist
        const spiralAngle = p.angle + easedProgress * Math.PI * 5
        const currentX = p.centerX + Math.cos(spiralAngle) * spiralRadius
        const currentY = p.centerY + Math.sin(spiralAngle) * spiralRadius
        const scale = 1 - easedProgress * 0.9
        const rot = easedProgress * p.rotation
        const opacity = Math.max(0, 1 - easedProgress * 1.3)

        if (isCleaningUp.value) {
          p.style.opacity = 0
          p.style.transition = 'opacity 0.3s ease-out'
        } else {
          p.style.transform = `translate(-50%, -50%) translate(${currentX - p.startX}px, ${currentY - p.startY}px) rotate(${rot}deg) scale(${scale})`
          p.style.opacity = opacity
        }
      })

      if (!isCleaningUp.value) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }

    animationFrameId = requestAnimationFrame(animate)
  })
}
</script>

<style scoped>
.blackhole-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
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

.sucked-particle {
  position: fixed;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  font-family: inherit;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .invert-overlay {
    display: none;
  }
  .blackhole-core {
    display: none;
  }
  .sucked-particle {
    display: none;
  }
}
</style>
