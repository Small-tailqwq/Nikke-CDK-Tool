<template>
  <div
    class="doro-physics-ball"
    :style="{
      left: x + 'px',
      top: y + 'px',
      width: ballSize + 'px',
      height: ballSize + 'px',
    }"
  >
    <div class="doro-ball-bg">
      <picture>
        <source :srcset="baseUrl + 'doro_icon.webp'" type="image/webp" />
        <img
          :src="doroIcon"
          class="doro-ball-icon"
          :style="{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }"
        />
      </picture>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import doroIcon from '@/assets/doro_icon.png'

const emit = defineEmits(['summonEnd'])
const baseUrl = import.meta.env.BASE_URL || '/'

// Props for starting position
const props = defineProps({
  startX: {
    type: Number,
    default: null,
  },
  startY: {
    type: Number,
    default: null,
  },
})

// 物理参数
const ballSize = 64
const gravity = 0.4 // 重力减小，更飘逸
const friction = 0.997 // 摩擦力减小，滚动更久
const bounce = -0.85 // 弹力增大，弹得更高

// 状态
const x = ref(0)
const y = ref(0)
const rotation = ref(0) // 新增：图片旋转角度
let vx = 0
let vy = 0
let isStatic = false
let animationFrameId = null

function init() {
  // 如果提供了起始位置，从该位置开始；否则从屏幕边缘
  if (props.startX !== null && props.startY !== null) {
    x.value = props.startX - ballSize / 2
    y.value = props.startY - ballSize / 2

    // 随机360度方向发射
    const angle = Math.random() * 2 * Math.PI
    const speed = 20 + Math.random() * 15 // 速度随机化
    vx = Math.cos(angle) * speed
    vy = Math.sin(angle) * speed
  } else {
    // 原来的逻辑：从屏幕边缘开始
    const isFromLeft = Math.random() > 0.5
    x.value = isFromLeft ? -ballSize : window.innerWidth
    y.value = Math.random() * (window.innerHeight * 0.4) // 顶部40%随机高度

    // 初始速度指向屏幕中心一个随机区域
    const targetX = window.innerWidth * (0.3 + Math.random() * 0.4)
    const targetY = window.innerHeight * (0.5 + Math.random() * 0.3)
    const angle = Math.atan2(targetY - y.value, targetX - x.value)
    const speed = 25 + Math.random() * 10 // 提高初始速度
    vx = Math.cos(angle) * speed
    vy = Math.sin(angle) * speed
  }
}

function animate() {
  if (isStatic) return

  // 更新速度
  vx *= friction
  vy *= friction
  vy += gravity

  // 更新位置和旋转
  x.value += vx
  y.value += vy
  rotation.value += vx // 根据水平速度更新旋转角度

  // 边界碰撞检测
  const left = 0
  const right = window.innerWidth - ballSize
  const top = 0
  const bottom = window.innerHeight - ballSize

  if (x.value <= left || x.value >= right) {
    vx *= bounce
    x.value = x.value <= left ? left : right
  }
  if (y.value <= top || y.value >= bottom) {
    vy *= bounce
    y.value = y.value <= top ? top : bottom
  }

  // 判断是否静止
  if (Math.abs(vx) < 0.2 && Math.abs(vy) < 0.2 && y.value >= bottom - 1) {
    isStatic = true
    cancelAnimationFrame(animationFrameId) // 停止动画
    setTimeout(() => {
      emit('summonEnd')
    }, 300) // 静止后延迟切换
  } else {
    animationFrameId = requestAnimationFrame(animate)
  }
}

onMounted(() => {
  init()
  animate()
  // 增加一个10秒的保险，防止动画卡死
  setTimeout(() => {
    if (!isStatic) {
      isStatic = true
      cancelAnimationFrame(animationFrameId)
      emit('summonEnd')
    }
  }, 10000) // 10秒后强制结束
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
})
</script>

<style scoped>
.doro-physics-ball {
  position: fixed;
  z-index: 99999;
  pointer-events: none;
  transition: box-shadow 0.2s;
}
.doro-ball-bg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.doro-ball-icon {
  width: 80%;
  height: 80%;
  object-fit: contain;
  border-radius: 50%;
  background: transparent;
  position: absolute;
  top: 50%;
  left: 50%;
}
</style>
