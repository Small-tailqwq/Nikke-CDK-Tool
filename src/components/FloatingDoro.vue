<template>
  <!-- 文字破坏效果 -->
  <TextDestructionEffect />

  <!-- 战斗模式白色背景 -->
  <div v-if="doroStore.isInAimingGame" class="battle-background"></div>

  <!-- 血条显示 -->
  <div v-if="doroStore.isInAimingGame" class="health-bar">
    <div
      class="health-fill"
      :style="{ width: `${(doroStore.doroHealth / 10) * 100}%` }"
    ></div>
  </div>

  <div
    v-if="doroStore.isVisible"
    class="floating-doro"
    :class="{
      'is-dragging': doroStore.isDragging,
      'is-long-pressing': doroStore.isLongPressing,
      'is-exploding': doroStore.isExploding,
      'is-spinning': doroStore.isSpinning,
      'is-final-exploding': doroStore.isFinalExploding,
      teleporting: doroStore.isTeleporting,
      'is-transitioning': doroStore.isTransitioning,
      'is-invincible': doroStore.isInvincible,
      'is-speed-boosted': doroStore.isSpeedBoosted,
    }"
    :style="{
      top: `${doroStore.position.y}px`,
      left: `${doroStore.position.x}px`,
      transform: `scale(${doroStore.doroScale})`,
      '--shake-intensity': `${longPressIntensity}px`,
    }"
    @click.stop="doroStore.handleInteractionClick"
    @mousedown.stop="doroStore.handleDragStart"
    @touchstart.stop="doroStore.handleDragStart"
  >
    <img :src="doroIcon" alt="Doro" class="doro-icon" />
  </div>

  <!-- Explosion Fragments Container -->
  <div v-if="fragments.length" class="fragments-container">
    <img
      v-for="fragment in fragments"
      :key="fragment.id"
      :src="doroIcon"
      class="doro-fragment"
      :style="fragment.style"
    />
  </div>
</template>

<script setup>
import { ref, watch, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { useDoroStore } from '../stores/doro'
import doroIcon from '@/assets/doro_icon.png'
import TextDestructionEffect from './TextDestructionEffect.vue'

const doroStore = useDoroStore()

// --- Local State for Animations ---
const longPressIntensity = ref(5)
const fragments = ref([])
let intensityInterval = null
let mouseX = ref(0)
let mouseY = ref(0)

// --- Mouse tracking and evasion ---
let lastEvasionTime = 0
let mouseHistory = [] // 记录鼠标轨迹，用于预测

function handleMouseMove(event) {
  mouseX.value = event.clientX
  mouseY.value = event.clientY

  // 更新store中的鼠标位置
  doroStore.updateMousePosition(mouseX.value, mouseY.value)

  // 记录鼠标轨迹（只保留最近5帧）
  mouseHistory.push({ x: mouseX.value, y: mouseY.value, time: Date.now() })
  if (mouseHistory.length > 5) {
    mouseHistory.shift()
  }

  // 如果在跟枪模式下，检查是否需要机动躲避
  if (doroStore.isInAimingGame && doroStore.isEvading) {
    const currentTime = Date.now()

    // 限制躲避频率，避免过于频繁的机动
    if (currentTime - lastEvasionTime < 200) return

    const halfSize = (60 * doroStore.doroScale) / 2
    const doroX = doroStore.position.x + halfSize
    const doroY = doroStore.position.y + halfSize
    const distance = Math.sqrt(
      (mouseX.value - doroX) ** 2 + (mouseY.value - doroY) ** 2
    )

    // 检查鼠标是否在威胁范围内，并且有接近趋势
    if (distance < 120 && isMouseApproaching(doroX, doroY)) {
      performEvasiveManeuver(doroX, doroY)
      lastEvasionTime = currentTime
    }
  }
}

function isMouseApproaching(doroX, doroY) {
  if (mouseHistory.length < 3) return false

  // 检查鼠标是否在向Doro方向移动
  const recent = mouseHistory[mouseHistory.length - 1]
  const previous = mouseHistory[mouseHistory.length - 3]

  const prevDistance = Math.sqrt(
    (previous.x - doroX) ** 2 + (previous.y - doroY) ** 2
  )
  const currentDistance = Math.sqrt(
    (recent.x - doroX) ** 2 + (recent.y - doroY) ** 2
  )

  return currentDistance < prevDistance // 距离在缩短，说明在接近
}

function performEvasiveManeuver(doroX, doroY) {
  // 计算与鼠标的相对位置
  const deltaX = doroX - mouseX.value
  const deltaY = doroY - mouseY.value
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)

  if (distance === 0) return

  // 计算基础躲避方向（垂直于鼠标-Doro连线）
  const normalX = deltaX / distance
  const normalY = deltaY / distance

  // 生成垂直方向向量
  const perpX = -normalY
  const perpY = normalX

  // 随机选择左转还是右转，并加入一些随机性
  const turnDirection = Math.random() > 0.5 ? 1 : -1
  const randomFactor = 0.7 + Math.random() * 0.6 // 0.7-1.3的随机因子

  // 计算机动向量（曲线躲避）
  const evasionDistance = 25 * randomFactor // 机动距离
  const evasionX =
    perpX * turnDirection * evasionDistance + normalX * evasionDistance * 0.3
  const evasionY =
    perpY * turnDirection * evasionDistance + normalY * evasionDistance * 0.3

  // 应用机动
  const doroSize = 60 * doroStore.doroScale
  const margin = 30
  let newX = doroStore.position.x + evasionX
  let newY = doroStore.position.y + evasionY

  // 边界检查
  newX = Math.max(margin, Math.min(newX, window.innerWidth - doroSize - margin))
  newY = Math.max(
    margin,
    Math.min(newY, window.innerHeight - doroSize - margin)
  )

  doroStore.position.x = newX
  doroStore.position.y = newY
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})

// --- Watchers to trigger animations ---

// Watch for long-pressing state to manage shake intensity
watch(
  () => doroStore.isLongPressing,
  (pressing) => {
    console.log('Long pressing changed to:', pressing)
    if (pressing) {
      intensityInterval = setInterval(() => {
        longPressIntensity.value += 2
      }, 200)
    } else {
      clearInterval(intensityInterval)
      longPressIntensity.value = 5
    }
  }
)

// Watch for exploding state to generate fragments
watch(
  () => doroStore.isExploding,
  (exploding) => {
    console.log('Exploding state changed to:', exploding)
    if (exploding) {
      generateFragments()
      setTimeout(() => {
        fragments.value = [] // Clear fragments after 2s
        console.log('Fragments cleared')
      }, 2000)
    }
  }
)

function generateFragments() {
  console.log('Generating fragments at position:', doroStore.position)
  const count = 12 + Math.floor(Math.random() * 5) // 12-16 fragments
  const newFragments = []

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI
    const distance = 150 + Math.random() * 200 // Fly out distance
    const endScale = 1.5 + Math.random()
    const rotation = Math.random() * 720 - 360

    // 使用reactive对象确保Vue能跟踪变化
    const fragmentStyle = reactive({
      position: 'absolute',
      transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
      opacity: 1,
      top: `${doroStore.position.y + (60 * doroStore.doroScale) / 2}px`, // 动态中心点
      left: `${doroStore.position.x + (60 * doroStore.doroScale) / 2}px`,
      transition:
        'transform 2s cubic-bezier(0.1, 1, 0.2, 1), opacity 2s cubic-bezier(0.5, 1, 1, 1)',
      width: '60px', // 恢复原始大小
      height: '60px',
      willChange: 'transform, opacity',
    })

    newFragments.push({ id: i, style: fragmentStyle })
  }

  fragments.value = newFragments
  console.log('Created', newFragments.length, 'fragments')

  // 使用nextTick确保DOM更新后再开始动画
  nextTick(() => {
    setTimeout(() => {
      fragments.value.forEach((fragment, i) => {
        const angle = Math.random() * 2 * Math.PI
        const distance = 150 + Math.random() * 200
        const endScale = 1.5 + Math.random()
        const rotation = Math.random() * 720 - 360

        fragment.style.transform = `translate(-50%, -50%) translate(${
          Math.cos(angle) * distance
        }px, ${
          Math.sin(angle) * distance
        }px) scale(${endScale}) rotate(${rotation}deg)`
        fragment.style.opacity = 0
      })
    }, 50) // 稍微延迟确保初始状态被应用
  })
}
</script>

<style scoped>
/* 战斗模式白色背景 */
.battle-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  z-index: 9997; /* 在内容之上，在Doro之下 */
}

/* 血条样式 */
.health-bar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px; /* 长度翻倍：200px -> 400px */
  height: 16px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #fff;
  border-radius: 0; /* 去掉圆角 */
  z-index: 9999;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  animation: health-bar-glow 2s ease-in-out infinite alternate;
}

.health-fill {
  height: 100%;
  background: #ff6600; /* 改为橘红色 */
  border-radius: 0; /* 去掉圆角 */
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
  position: relative;
}

.health-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  border-radius: 0; /* 去掉圆角 */
  animation: health-shine 1.5s ease-in-out infinite;
}

.floating-doro {
  position: fixed;
  z-index: 9998; /* 比大多数内容高，比弹窗低 */
  width: 60px; /* 恢复原始大小 */
  height: 60px; /* 恢复原始大小 */
  cursor: grab;
  user-select: none;
  /* 移除transform的transition，防止干扰scale */
  transition: opacity 0.3s;
  opacity: 1;
  transform-origin: center center;
}

.floating-doro.teleporting {
  animation: teleport-flash 0.3s ease-in-out;
}

.floating-doro.is-dragging {
  cursor: grabbing;
  /* 拖动时完全禁用transition，确保scale立即生效 */
  transition: none !important;
}

.doro-icon {
  width: 100%;
  height: 100%;
  pointer-events: none; /* 防止图片干扰鼠标事件 */
  animation: float 3s ease-in-out infinite;
  transition: filter 0.1s ease-out;
}

.floating-doro.is-dragging .doro-icon {
  animation: none; /* 拖动时停止浮动动画 */
}

.floating-doro.is-long-pressing .doro-icon {
  /* 长按时：停止浮动，开始抖动+变红 */
  animation: danger-shake 0.25s infinite, grow-red 3s linear forwards;
}

.floating-doro.is-spinning {
  /* 跟枪模式下的鼠标样式 */
  cursor: crosshair !important;
}

.floating-doro.is-transitioning .doro-icon {
  /* 过场动画：发动机启动效果 */
  animation: engine-startup 3s ease-out forwards, transition-shake 0.3s infinite;
}

.floating-doro.is-spinning:not(.is-transitioning) .doro-icon {
  /* 游戏中的高速旋转动画 */
  animation: high-speed-spin 0.1s linear infinite;
}

.floating-doro.is-final-exploding .doro-icon {
  /* 最终爆炸时的抖动 */
  animation: final-explosion-shake 0.2s infinite;
}

.floating-doro.is-invincible .doro-icon {
  /* 无敌帧：发光闪烁效果 */
  animation: invincible-glow 0.3s ease-in-out infinite alternate;
}

.floating-doro.is-speed-boosted .doro-icon {
  /* 速度加成：红色光芒效果 */
  filter: drop-shadow(0 0 10px #ff4444) brightness(1.2);
}

.floating-doro.is-exploding .doro-icon {
  transform: scale(0) !important;
  opacity: 0 !important;
  transition: transform 0.1s, opacity 0.1s;
}

/* Explosion fragments */
.fragments-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}
.doro-fragment {
  position: absolute;
  width: 60px; /* 恢复原始大小 */
  height: 60px; /* 恢复原始大小 */
  will-change: transform, opacity;
  transition: transform 2s cubic-bezier(0.1, 1, 0.2, 1),
    opacity 2s cubic-bezier(0.5, 1, 1, 1);
}

/* Remove old explosion style */
.explosion {
  display: none;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 新的危险抖动动画：更有趣的多方向抖动 */
@keyframes danger-shake {
  0% {
    transform: translateX(0) translateY(0) rotate(0deg);
  }
  10% {
    transform: translateX(calc(var(--shake-intensity) * -0.8))
      translateY(calc(var(--shake-intensity) * 0.3)) rotate(-2deg);
  }
  20% {
    transform: translateX(calc(var(--shake-intensity) * 0.8))
      translateY(calc(var(--shake-intensity) * -0.3)) rotate(1deg);
  }
  30% {
    transform: translateX(calc(var(--shake-intensity) * -0.6))
      translateY(calc(var(--shake-intensity) * 0.6)) rotate(-1deg);
  }
  40% {
    transform: translateX(calc(var(--shake-intensity) * 0.6))
      translateY(calc(var(--shake-intensity) * -0.4)) rotate(2deg);
  }
  50% {
    transform: translateX(calc(var(--shake-intensity) * -0.4))
      translateY(calc(var(--shake-intensity) * 0.2)) rotate(-1deg);
  }
  60% {
    transform: translateX(calc(var(--shake-intensity) * 0.4))
      translateY(calc(var(--shake-intensity) * -0.6)) rotate(1deg);
  }
  70% {
    transform: translateX(calc(var(--shake-intensity) * -0.2))
      translateY(calc(var(--shake-intensity) * 0.4)) rotate(-2deg);
  }
  80% {
    transform: translateX(calc(var(--shake-intensity) * 0.2))
      translateY(calc(var(--shake-intensity) * -0.2)) rotate(1deg);
  }
  90% {
    transform: translateX(calc(var(--shake-intensity) * -0.1))
      translateY(calc(var(--shake-intensity) * 0.1)) rotate(-1deg);
  }
  100% {
    transform: translateX(0) translateY(0) rotate(0deg);
  }
}

@keyframes grow-red {
  from {
    filter: saturate(1) brightness(1);
  }
  to {
    filter: saturate(8) sepia(0.5) hue-rotate(-20deg) brightness(1.1);
  }
}

/* 高速旋转动画 */
@keyframes high-speed-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 最终爆炸抖动动画 */
@keyframes final-explosion-shake {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(-3px, -3px) rotate(-2deg);
  }
  50% {
    transform: translate(3px, 3px) rotate(2deg);
  }
  75% {
    transform: translate(-2px, 3px) rotate(-1deg);
  }
  100% {
    transform: translate(2px, -2px) rotate(1deg);
  }
}

/* 瞬移闪烁动画 */
@keyframes teleport-flash {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.2);
    filter: brightness(2) saturate(2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 血条发光动画 */
@keyframes health-bar-glow {
  from {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }
  to {
    box-shadow: 0 4px 20px rgba(255, 255, 255, 0.4);
  }
}

/* 血条闪光动画 */
@keyframes health-shine {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* 发动机启动动画：从慢到快的旋转 */
@keyframes engine-startup {
  0% {
    transform: rotate(0deg);
    animation-timing-function: ease-out;
  }
  20% {
    transform: rotate(180deg);
    animation-timing-function: ease-in-out;
  }
  50% {
    transform: rotate(720deg);
    animation-timing-function: ease-in;
  }
  80% {
    transform: rotate(1800deg);
    animation-timing-function: linear;
  }
  100% {
    transform: rotate(3600deg);
    animation-timing-function: linear;
  }
}

/* 过场期间的轻微抖动 */
@keyframes transition-shake {
  0%,
  100% {
    transform: translateX(0) translateY(0);
  }
  25% {
    transform: translateX(-1px) translateY(-1px);
  }
  50% {
    transform: translateX(1px) translateY(1px);
  }
  75% {
    transform: translateX(-1px) translateY(1px);
  }
}

/* 无敌帧发光动画 */
@keyframes invincible-glow {
  from {
    filter: drop-shadow(0 0 5px #44ff44) brightness(1);
  }
  to {
    filter: drop-shadow(0 0 15px #44ff44) brightness(1.5);
  }
}
</style>
