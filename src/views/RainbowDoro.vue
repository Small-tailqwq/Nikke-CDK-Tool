<template>
  <div class="rainbow-wrapper">
    <canvas ref="cvs"></canvas>
    <!-- <el-button class="back-btn" size="small" @click="$router.push('/')">
        返 回
      </el-button> -->
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import doroPng from '@/assets/doro_icon.png'

const cvs = ref()
let ctx, rafId, spawnTimer
const doroImg = new Image()
doroImg.src = doroPng

// 性能优化变量
let lastFrameTime = 0
const targetFPS = 60
const frameInterval = 1000 / targetFPS
let backgroundCanvas, backgroundCtx
let starsCanvas, starsCtx
let frameCount = 0

const colors = [
  '#ff0033',
  '#ff7f00',
  '#ffff00',
  '#00ff00',
  '#0000ff',
  '#4b0082',
  '#9400d3',
]

// doro参数
const DORO_SIZE = 80
const DORO_SPAWN_COUNT = 1 // 每次同时生成的彩虹doro数量
const MAX_DOROS = 3 // 同屏最大彩虹doro数量
const MAX_BIG_DOROS = 3 // 同屏最大大脸doro数量
const LAUNCH_ANGLE_RANGE = 15 // 发射角度范围（度数）

// doro队列
let doros = []

// 背景元素
let bigDoros = []
let aliens = []
let meteors = []
let shootingStars = [] // 🌠流星

// emoji数据
const alienEmojis = ['👽', '🛸', '🌌', '⭐', '🚀']
const orangeEmoji = '🍊'
const shootingStarEmoji = '🌠'

// 预计算的星星位置 - 避免每帧重新计算
let starPositions = []

// 数量控制算法
function calculateSpawnDelay(currentCount, maxCount, baseDelay) {
  if (currentCount >= maxCount) {
    return -1 // 停止生成
  }

  const ratio = currentCount / maxCount
  // 当接近最大数量时，延迟倍数呈指数增长
  const delayMultiplier = 1 + Math.pow(ratio * 3, 2)
  return baseDelay * delayMultiplier
}

function shouldSpawn(currentCount, maxCount) {
  return currentCount < maxCount
}

function spawnDoro() {
  // 检查是否应该生成新的doro
  if (!shouldSpawn(doros.length, MAX_DOROS)) {
    // 如果达到最大数量，延迟500ms后再检查
    spawnTimer = setTimeout(spawnDoro, 500)
    return
  }

  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  // 同时生成多个彩虹doro（但不超过最大数量）
  const spawnCount = Math.min(DORO_SPAWN_COUNT, MAX_DOROS - doros.length)

  for (let doroIndex = 0; doroIndex < spawnCount; doroIndex++) {
    // 随机发射系统：从左侧随机高度，角度为水平轴上下15°
    const startX = -200 - doroIndex * 100 // 错开起始位置
    const startY = Math.random() * h // 随机高度

    // 发射角度：水平轴上下15°随机
    const angleInDegrees = (Math.random() - 0.5) * 2 * LAUNCH_ANGLE_RANGE // -15° 到 +15°
    const angle = (angleInDegrees * Math.PI) / 180 // 转为弧度

    // 计算发射距离（确保能飞出屏幕）
    const distance = w + 400 + Math.random() * 200
    const endX = startX + Math.cos(angle) * distance
    const endY = startY + Math.sin(angle) * distance

    doros.push({
      x: startX,
      y: startY,
      endX: endX,
      endY: endY,
      angle: angle,
      speed: 2.5 + Math.random() * 2,
      tailLen: 400 + Math.random() * 80,
      born: Date.now() + doroIndex * 100, // 稍微错开生成时间
      distance: distance,
      traveled: 0,
      launchAngle: angleInDegrees, // 记录发射角度用于调试
    })
  }

  // 计算下次生成延迟（基于当前数量动态调整）
  const baseDelay = 800 + Math.random() * 1000
  const nextDelay = calculateSpawnDelay(doros.length, MAX_DOROS, baseDelay)

  if (nextDelay > 0) {
    spawnTimer = setTimeout(spawnDoro, nextDelay)
  } else {
    // 如果返回-1，说明已达最大数量，等待一段时间后再检查
    spawnTimer = setTimeout(spawnDoro, 1000)
  }
}

// 初始化背景元素 - 优化性能
function initBackground() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  // 创建离屏canvas用于背景缓存
  createBackgroundCanvas(w, h)
  createStarsCanvas(w, h)

  // 太阳系行星已移除以提高性能

  // 生成大型变形doro - 控制初始数量
  bigDoros = []
  for (let i = 0; i < MAX_BIG_DOROS; i++) {
    bigDoros.push({
      x: -300 - i * 200, // 错开初始位置
      y: Math.random() * h,
      size: 120 + Math.random() * 80,
      speed: 0.3 + Math.random() * 0.7,
      rotation: 0,
      rotationSpeed: 0.015 + Math.random() * 0.02,
      scaleX: 0.8 + Math.random() * 0.3,
      scaleY: 0.8 + Math.random() * 0.3,
      alpha: 0.2 + Math.random() * 0.3,
    })
  }

  // 生成外星人
  aliens = []

  // 生成橘子流星
  meteors = []

  // 生成🌠流星
  shootingStars = []
}

// 创建背景缓存canvas
function createBackgroundCanvas(w, h) {
  backgroundCanvas = document.createElement('canvas')
  backgroundCanvas.width = w
  backgroundCanvas.height = h
  backgroundCtx = backgroundCanvas.getContext('2d')
}

// 创建星星缓存canvas
function createStarsCanvas(w, h) {
  starsCanvas = document.createElement('canvas')
  starsCanvas.width = w
  starsCanvas.height = h
  starsCtx = starsCanvas.getContext('2d')

  // 预生成星星位置
  starPositions = []
  for (let i = 0; i < 50; i++) {
    // 减少星星数量
    starPositions.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random(),
      alpha: 0.3 + Math.random() * 0.7,
    })
  }

  // 绘制星星到缓存canvas
  starsCtx.clearRect(0, 0, w, h)
  starPositions.forEach((star) => {
    starsCtx.fillStyle = `rgba(255,255,255,${star.alpha})`
    starsCtx.fillRect(star.x, star.y, star.size, star.size)
  })
}

// 生成外星人彩蛋 - 降低频率
function spawnAlien() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const h = canvas.height / dpi

  if (Math.random() < 0.005) {
    // 提高到0.5%概率
    aliens.push({
      x: -100,
      y: Math.random() * h,
      emoji: alienEmojis[Math.floor(Math.random() * alienEmojis.length)],
      speed: 1 + Math.random() * 2,
      size: 25 + Math.random() * 15, // 稍微减小尺寸
      rotation: 0,
      rotationSpeed: 0.03 + Math.random() * 0.07,
    })
  }
}

// 生成橘子流星群
function spawnMeteor() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi

  if (Math.random() < 0.015) {
    // 提高概率生成流星群
    // 生成3-6个橘子组成流星群
    const groupSize = 3 + Math.floor(Math.random() * 4)
    const baseX = Math.random() * w
    const baseSpeed = 2 + Math.random() * 3

    for (let i = 0; i < groupSize; i++) {
      meteors.push({
        x: baseX + (Math.random() - 0.5) * 100, // 在基础位置附近分散
        y: -50 - i * 20, // 错开高度
        speed: baseSpeed + (Math.random() - 0.5) * 1,
        size: 12 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.08 + Math.random() * 0.15,
        trail: [],
      })
    }
  }
}

// 生成🌠流星效果
function spawnShootingStar() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  if (Math.random() < 0.003) {
    // 较低概率生成
    const fromLeft = Math.random() > 0.5
    const startX = fromLeft ? -100 : w + 100
    const endX = fromLeft ? w + 100 : -100
    const startY = Math.random() * h * 0.4 + h * 0.1 // 上半部分
    const endY = Math.random() * h * 0.4 + h * 0.5 // 下半部分

    shootingStars.push({
      x: startX,
      y: startY,
      endX: endX,
      endY: endY,
      speed: 4 + Math.random() * 3,
      size: 25 + Math.random() * 15,
      angle: Math.atan2(endY - startY, endX - startX),
      trail: [],
    })
  }
}

function render(currentTime) {
  // 帧率控制
  if (currentTime - lastFrameTime < frameInterval) {
    rafId = requestAnimationFrame(render)
    return
  }
  lastFrameTime = currentTime

  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi
  const time = Date.now()
  frameCount++

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 使用缓存的星星背景
  if (starsCanvas) {
    ctx.drawImage(starsCanvas, 0, 0)
  }

  // 所有元素每帧都绘制，避免闪烁
  // drawBackground() // 已移除太阳系背景
  drawMeteors()
  drawShootingStars()
  drawBigDoros()
  drawAliens()

  // 降低更新逻辑的频率，但保持绘制连续性
  if (frameCount % 3 === 0) {
    spawnAlien()
    spawnMeteor()
    spawnShootingStar()
  }

  if (frameCount % 2 === 0) {
    updateBigDoros()
  }

  // 画所有doro - 主要动画保持流畅
  doros.forEach((doro, idx) => {
    // 按轨道移动
    doro.traveled += doro.speed
    const progress = doro.traveled / doro.distance

    if (progress <= 1) {
      doro.x = doro.x + Math.cos(doro.angle) * doro.speed
      doro.y = doro.y + Math.sin(doro.angle) * doro.speed
    }

    // 彩虹尾巴 - 沿着轨道方向
    colors.forEach((c, i) => {
      ctx.fillStyle = c
      const tailX = doro.x - Math.cos(doro.angle) * doro.tailLen
      const tailY = doro.y - Math.sin(doro.angle) * doro.tailLen + i * 6
      const tailEndX = doro.x
      const tailEndY = doro.y + i * 6

      ctx.save()
      ctx.translate(tailX, tailY)
      ctx.rotate(doro.angle)
      ctx.fillRect(0, 0, doro.tailLen, 6)
      ctx.restore()
    })

    // doro本体 - 朝向移动方向
    ctx.save()
    ctx.translate(doro.x + DORO_SIZE / 2, doro.y + DORO_SIZE / 2)
    ctx.rotate(doro.angle)
    ctx.drawImage(doroImg, -DORO_SIZE / 2, -DORO_SIZE / 2, DORO_SIZE, DORO_SIZE)
    ctx.restore()
  })

  // 移除出界doro
  for (let i = doros.length - 1; i >= 0; i--) {
    const doro = doros[i]
    const progress = doro.traveled / doro.distance
    if (progress > 1.2) {
      // 超出轨道一定距离后移除
      doros.splice(i, 1)
    }
  }

  rafId = requestAnimationFrame(render)
}

// 太阳系背景已移除以提高性能

// 绘制大型变形doro - 优化版本
function drawBigDoros() {
  bigDoros.forEach((bigDoro) => {
    // 每帧更新位置，保持平滑
    bigDoro.x += bigDoro.speed
    bigDoro.rotation += bigDoro.rotationSpeed

    ctx.save()
    ctx.globalAlpha = bigDoro.alpha
    ctx.translate(bigDoro.x + bigDoro.size / 2, bigDoro.y + bigDoro.size / 2)
    ctx.rotate(bigDoro.rotation)
    ctx.scale(bigDoro.scaleX, bigDoro.scaleY)

    // 简化变形效果
    const time = Date.now()
    const warp = Math.sin(time * 0.002) * 0.1
    ctx.scale(1 + warp, 1 - warp * 0.3)

    ctx.drawImage(
      doroImg,
      -bigDoro.size / 2,
      -bigDoro.size / 2,
      bigDoro.size,
      bigDoro.size
    )
    ctx.restore()
  })
}

// 更新大型doro - 应用数量控制算法
function updateBigDoros() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  // 移除出界的大型doro
  for (let i = bigDoros.length - 1; i >= 0; i--) {
    if (bigDoros[i].x > w + 300) {
      bigDoros.splice(i, 1)
    }
  }

  // 根据数量控制算法决定是否生成新的大型doro
  if (shouldSpawn(bigDoros.length, MAX_BIG_DOROS) && Math.random() < 0.3) {
    // 30%概率在检查时生成，避免一次性生成太多
    bigDoros.push({
      x: -300,
      y: Math.random() * h,
      size: 150 + Math.random() * 100,
      speed: 0.5 + Math.random() * 1,
      rotation: 0,
      rotationSpeed: 0.02 + Math.random() * 0.03,
      scaleX: 0.8 + Math.random() * 0.4,
      scaleY: 0.8 + Math.random() * 0.4,
      alpha: 0.3 + Math.random() * 0.4,
    })
  }
}

// 绘制外星人彩蛋
function drawAliens() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi

  aliens.forEach((alien) => {
    // 每帧更新位置，保持平滑
    alien.x += alien.speed
    alien.rotation += alien.rotationSpeed

    ctx.save()
    ctx.translate(alien.x + alien.size / 2, alien.y + alien.size / 2)
    ctx.rotate(alien.rotation)
    ctx.font = `${alien.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(alien.emoji, 0, 0)
    ctx.restore()
  })

  // 移除出界的外星人
  for (let i = aliens.length - 1; i >= 0; i--) {
    if (aliens[i].x > w + 100) {
      aliens.splice(i, 1)
    }
  }
}

// 绘制橘子流星群 - 优化版本
function drawMeteors() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const h = canvas.height / dpi

  meteors.forEach((meteor) => {
    // 每帧更新位置，保持平滑
    meteor.y += meteor.speed
    meteor.rotation += meteor.rotationSpeed

    // 更新轨迹 - 增加拖尾长度
    meteor.trail.push({ x: meteor.x, y: meteor.y })
    if (meteor.trail.length > 6) {
      // 增加到6段拖尾
      meteor.trail.shift()
    }

    // 绘制拖尾
    meteor.trail.forEach((point, index) => {
      if (index < meteor.trail.length - 1) {
        ctx.save()
        ctx.globalAlpha = ((index + 1) / meteor.trail.length) * 0.4
        ctx.font = `${
          (meteor.size * (index + 1)) / meteor.trail.length
        }px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(orangeEmoji, point.x, point.y)
        ctx.restore()
      }
    })

    // 绘制主体
    ctx.save()
    ctx.font = `${meteor.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(orangeEmoji, meteor.x, meteor.y)
    ctx.restore()
  })

  // 移除出界的流星
  for (let i = meteors.length - 1; i >= 0; i--) {
    if (meteors[i].y > h + 50) {
      meteors.splice(i, 1)
    }
  }
}

// 绘制🌠流星效果
function drawShootingStars() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  shootingStars.forEach((star) => {
    // 每帧更新位置
    star.x += Math.cos(star.angle) * star.speed
    star.y += Math.sin(star.angle) * star.speed

    // 更新轨迹
    star.trail.push({ x: star.x, y: star.y })
    if (star.trail.length > 8) {
      // 更长的拖尾
      star.trail.shift()
    }

    // 绘制拖尾
    star.trail.forEach((point, index) => {
      if (index < star.trail.length - 1) {
        ctx.save()
        ctx.globalAlpha = ((index + 1) / star.trail.length) * 0.6
        ctx.font = `${(star.size * (index + 1)) / star.trail.length}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(shootingStarEmoji, point.x, point.y)
        ctx.restore()
      }
    })

    // 绘制主体
    ctx.save()
    ctx.font = `${star.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(shootingStarEmoji, star.x, star.y)
    ctx.restore()
  })

  // 移除出界的流星
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i]
    if (
      star.x < -200 ||
      star.x > w + 200 ||
      star.y < -200 ||
      star.y > h + 200
    ) {
      shootingStars.splice(i, 1)
    }
  }
}

onMounted(() => {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpi
  canvas.height = window.innerHeight * dpi
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  ctx = canvas.getContext('2d')
  ctx.scale(dpi, dpi)

  doros = []

  // 初始化所有背景元素
  initBackground()

  spawnDoro()
  doroImg.onload = () => render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(spawnTimer)
})
</script>

<style scoped>
.rainbow-wrapper {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  z-index: 999999;
}
.back-btn {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1000000;
}
.el-main > .rainbow-wrapper {
  max-width: none !important;
  margin: 0 !important;
  width: 100% !important;
}
</style>
