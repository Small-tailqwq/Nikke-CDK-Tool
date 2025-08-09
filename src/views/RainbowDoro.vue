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
// Prefer webp if available, fallback to bundled png; respect base path
const baseUrl = import.meta.env.BASE_URL || '/'
const webpUrl = baseUrl + 'doro_icon.webp'
const testWebp = new Image()
testWebp.onload = () => (doroImg.src = webpUrl)
testWebp.onerror = () => (doroImg.src = doroPng)
testWebp.src = webpUrl

const colors = ['#ff0033', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']

// 车道参数
const DORO_SIZE = 80
const LANE_GAP = 20
let lanes = []
let usedLanes = new Set()

// doro队列
let doros = []

// 背景元素 - 保留原有的外星人和大脸doro
let bigDoros = []
let aliens = []
let meteors = []
let shootingStars = [] // 🌠流星

// emoji数据 - 大幅扩展
const alienEmojis = ['👽', '🛸', '🌌', '⭐', '🚀']
const orangeEmoji = '🍊'
const shootingStarEmoji = '🌠'

// 特殊外星人组合数据
const specialAliens = [
  // 普通外星人系列
  { type: 'simple', emoji: '👽', name: '外星人' },
  { type: 'simple', emoji: '🛸', name: '飞碟' },
  { type: 'simple', emoji: '🚀', name: '火箭' },
  { type: 'simple', emoji: '🌌', name: '银河' },
  { type: 'simple', emoji: '⭐', name: '星星' },

  // 特殊组合系列
  { type: 'combo', emoji: '✌👽', name: '比✌的外星人' },
  { type: 'vertical', emojis: ['👽', '🛸'], name: '骑飞碟的外星人' },
  { type: 'combo', emoji: '🛸💫', name: '闪亮飞碟' },
  { type: 'combo', emoji: '🚀✨', name: '闪亮火箭' },
  { type: 'combo', emoji: '👽🎪', name: '马戏团外星人' },

  // 星球系列
  { type: 'planet', emoji: '🌕', name: '满月', size: 'huge' },
  // { type: 'planet', emoji: '🌍', name: '地球', size: 'large' },
  // { type: 'planet', emoji: '🪐', name: '土星', size: 'large' },
  // { type: 'planet', emoji: '☄️', name: '彗星', size: 'medium' },
  // { type: 'planet', emoji: '🌟', name: '闪亮星', size: 'medium' },
]

function getAvailableLane() {
  // 计算可用车道
  const canvas = cvs.value
  const h = canvas.height / (window.devicePixelRatio || 1)
  const laneCount = Math.floor((h - LANE_GAP) / (DORO_SIZE + LANE_GAP))
  if (lanes.length !== laneCount) {
    lanes = []
    for (let i = 0; i < laneCount; i++) {
      lanes.push(LANE_GAP + i * (DORO_SIZE + LANE_GAP))
    }
  }
  // 找到未被占用的车道
  const available = lanes.filter((_, idx) => !usedLanes.has(idx))
  if (available.length === 0) return null
  const idx = Math.floor(Math.random() * available.length)
  return { y: available[idx], laneIdx: lanes.indexOf(available[idx]) }
}

function spawnDoro() {
  const lane = getAvailableLane()
  if (!lane) return
  usedLanes.add(lane.laneIdx)
  doros.push({
    x: -200,
    y: lane.y,
    laneIdx: lane.laneIdx,
    speed: 2.5 + Math.random() * 2,
    tailLen: 400 + Math.random() * 80,
    born: Date.now(),
  })
  // 下一只doro随机0.8~1.8秒后生成
  spawnTimer = setTimeout(spawnDoro, 800 + Math.random() * 1000)
}

// 初始化背景元素
function initBackground() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  // 生成大型变形doro
  bigDoros = []
  for (let i = 0; i < 3; i++) {
    bigDoros.push({
      x: -300 - i * 200,
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

// 生成特殊外星人彩蛋 - 全新升级版
function spawnAlien() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  if (Math.random() < 0.008) {
    // 稍微提高生成频率
    const specialAlien = specialAliens[Math.floor(Math.random() * specialAliens.length)]

    // 根据类型设置不同的尺寸
    let baseSize = 25
    if (specialAlien.size === 'huge') baseSize = 80
    else if (specialAlien.size === 'large') baseSize = 50
    else if (specialAlien.size === 'medium') baseSize = 35

    // 为不同类型设置不同的运动模式
    let motionType = 'wave' // 默认波浪运动
    if (specialAlien.type === 'planet')
      motionType = 'straight' // 星球直线运动
    else if (specialAlien.emoji && specialAlien.emoji.includes('🚀'))
      motionType = 'rocket' // 火箭抛物线
    else if (specialAlien.emoji && specialAlien.emoji.includes('🛸'))
      motionType = 'zigzag' // 飞碟之字形
    else if (specialAlien.type === 'vertical') motionType = 'wave' // 垂直组合用波浪

    aliens.push({
      x: -150,
      y: Math.random() * h * 0.8 + h * 0.1, // 避开边缘
      specialAlien: specialAlien,
      speed: specialAlien.type === 'planet' ? 0.3 + Math.random() * 0.7 : 1 + Math.random() * 2,
      size: baseSize + Math.random() * 15,
      motionType: motionType,
      amplitude: 30 + Math.random() * 50, // 波浪幅度
      frequency: 0.02 + Math.random() * 0.03, // 波浪频率
      phase: Math.random() * Math.PI * 2, // 初始相位
      baseY: 0, // 会在下面设置
      rotation: 0,
      rotationSpeed:
        specialAlien.type === 'planet' ? 0.01 + Math.random() * 0.02 : 0.03 + Math.random() * 0.07,
    })

    // 设置基准Y坐标
    const lastAlien = aliens[aliens.length - 1]
    lastAlien.baseY = lastAlien.y
  }
}

// 生成橘子流星群 - 简化版本
function spawnMeteor() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi

  if (Math.random() < 0.01) {
    // 降低生成频率
    // 生成1-6个橘子
    const groupSize = 1 + Math.floor(Math.random() * 6)
    const baseX = Math.random() * w
    const baseSpeed = 2 + Math.random() * 3

    for (let i = 0; i < groupSize; i++) {
      meteors.push({
        x: baseX + (Math.random() - 0.5) * 100,
        y: -50 - i * 20,
        speed: baseSpeed + (Math.random() - 0.5) * 1,
        size: 12 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.08 + Math.random() * 0.15,
      })
    }
  }
}

// 生成🌠流星效果 - 简化版本
function spawnShootingStar() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  if (Math.random() < 0.002) {
    // 降低生成频率
    const fromLeft = Math.random() > 0.5
    const startX = fromLeft ? -100 : w + 100
    const startY = Math.random() * h * 0.4 + h * 0.1

    shootingStars.push({
      x: startX,
      y: startY,
      speed: 4 + Math.random() * 3,
      size: 20 + Math.random() * 10,
      angle: fromLeft ? Math.PI / 4 : (3 * Math.PI) / 4,
    })
  }
}

let frameCount = 0

function render() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  frameCount++

  // 检查是否需要重新启动doro生成（解决后台切换问题）
  if (frameCount % 120 === 0) {
    // 每2秒检查一次
    if (doros.length === 0 && !spawnTimer) {
      console.log('重新启动doro生成')
      spawnDoro()
    }
  }

  // 画所有doro
  doros.forEach((doro, idx) => {
    // 彩虹尾巴
    colors.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(doro.x - doro.tailLen, doro.y + i * 6 + 20, doro.tailLen, 6)
    })
    // 星星 - 大幅减少数量，并且只在某些帧显示
    if (frameCount % 3 === 0) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.random() + ')'
        const sx = (Math.random() * canvas.width) / dpi,
          sy = (Math.random() * canvas.height) / dpi
        ctx.fillRect(sx, sy, 2, 2)
      }
    }
    // doro本体
    ctx.drawImage(doroImg, doro.x, doro.y, DORO_SIZE, DORO_SIZE)
    doro.x += doro.speed
  })

  // 绘制背景元素
  drawMeteors()
  drawShootingStars()
  drawBigDoros()
  drawAliens()

  // 更新背景元素 - 降低频率
  if (frameCount % 10 === 0) {
    updateBigDoros()
    spawnAlien()
    spawnMeteor()
    spawnShootingStar()
  }

  // 移除出界doro，释放车道
  for (let i = doros.length - 1; i >= 0; i--) {
    if (doros[i].x - doros[i].tailLen > canvas.width / (window.devicePixelRatio || 1)) {
      usedLanes.delete(doros[i].laneIdx)
      doros.splice(i, 1)
    }
  }

  rafId = requestAnimationFrame(render)
}

// 太阳系背景已移除以提高性能

// 绘制大型变形doro - 简化版本
function drawBigDoros() {
  bigDoros.forEach((bigDoro) => {
    bigDoro.x += bigDoro.speed
    bigDoro.rotation += bigDoro.rotationSpeed

    ctx.save()
    ctx.globalAlpha = bigDoro.alpha
    ctx.translate(bigDoro.x + bigDoro.size / 2, bigDoro.y + bigDoro.size / 2)
    ctx.rotate(bigDoro.rotation)
    ctx.scale(bigDoro.scaleX, bigDoro.scaleY)

    // 简化变形效果 - 只在某些帧执行
    if (frameCount % 4 === 0) {
      const time = Date.now()
      const warp = Math.sin(time * 0.002) * 0.05
      ctx.scale(1 + warp, 1 - warp * 0.2)
    }

    ctx.drawImage(doroImg, -bigDoro.size / 2, -bigDoro.size / 2, bigDoro.size, bigDoro.size)
    ctx.restore()
  })
}

// 更新大型doro
function updateBigDoros() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  // 清理出界的大型doro
  bigDoros = bigDoros.filter((bigDoro) => bigDoro.x <= w + 300)

  // 随机生成新的大型doro
  if (bigDoros.length < 3 && Math.random() < 0.01) {
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

// 绘制特殊外星人彩蛋 - 全新升级版
function drawAliens() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi

  aliens.forEach((alien) => {
    // 根据运动类型更新位置
    alien.x += alien.speed

    switch (alien.motionType) {
      case 'wave':
        // 波浪运动
        alien.y = alien.baseY + Math.sin(alien.x * alien.frequency + alien.phase) * alien.amplitude
        break
      case 'zigzag':
        // 之字形运动
        alien.y = alien.baseY + Math.sin(alien.x * 0.05) * 60
        break
      case 'rocket':
        // 火箭抛物线运动
        const progress = alien.x / (w + 300)
        alien.y = alien.baseY - Math.sin(progress * Math.PI) * 100
        break
      case 'straight':
        // 直线运动（星球）
        // Y坐标不变，保持直线
        break
    }

    alien.rotation += alien.rotationSpeed

    ctx.save()
    ctx.translate(alien.x + alien.size / 2, alien.y + alien.size / 2)

    // 星球类型不旋转，其他的旋转
    if (alien.specialAlien.type !== 'planet') {
      ctx.rotate(alien.rotation)
    }

    ctx.font = `${alien.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 根据类型绘制不同内容
    if (alien.specialAlien.type === 'vertical') {
      // 垂直组合（骑飞碟的外星人）
      ctx.fillText(alien.specialAlien.emojis[0], 0, -alien.size * 0.3) // 外星人在上
      ctx.fillText(alien.specialAlien.emojis[1], 0, alien.size * 0.3) // 飞碟在下
    } else {
      // 单个emoji或combo
      ctx.fillText(alien.specialAlien.emoji, 0, 0)
    }

    // 星球特殊效果：发光
    if (alien.specialAlien.type === 'planet' && alien.specialAlien.size === 'huge') {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
      ctx.shadowBlur = 20
      ctx.fillText(alien.specialAlien.emoji, 0, 0)
      ctx.shadowBlur = 0 // 重置阴影
    }

    ctx.restore()
  })

  // 清理出界的外星人
  aliens = aliens.filter((alien) => alien.x <= w + 200)
}

// 绘制橘子流星群 - 简化版本
function drawMeteors() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const h = canvas.height / dpi

  meteors.forEach((meteor) => {
    meteor.y += meteor.speed
    meteor.rotation += meteor.rotationSpeed

    // 简化：只绘制主体，不要复杂拖尾
    ctx.save()
    ctx.font = `${meteor.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(orangeEmoji, meteor.x, meteor.y)
    ctx.restore()
  })

  // 清理出界的流星
  meteors = meteors.filter((meteor) => meteor.y <= h + 50)
}

// 绘制🌠流星效果 - 简化版本
function drawShootingStars() {
  const canvas = cvs.value
  const dpi = window.devicePixelRatio || 1
  const w = canvas.width / dpi
  const h = canvas.height / dpi

  shootingStars.forEach((star) => {
    star.x += Math.cos(star.angle) * star.speed
    star.y += Math.sin(star.angle) * star.speed

    // 简化：只绘制主体
    ctx.save()
    ctx.font = `${star.size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(shootingStarEmoji, star.x, star.y)
    ctx.restore()
  })

  // 清理出界的🌠流星
  shootingStars = shootingStars.filter(
    (star) => star.x >= -200 && star.x <= w + 200 && star.y >= -200 && star.y <= h + 200
  )
}

// 页面可见性检测
function handleVisibilityChange() {
  if (!document.hidden) {
    // 页面重新变为可见时，检查并重启动画
    console.log('页面重新可见，检查动画状态')
    if (!rafId) {
      console.log('重新启动render循环')
      rafId = requestAnimationFrame(render)
    }
    // 如果没有doro且没有生成计时器，重新启动生成
    if (doros.length === 0 && !spawnTimer) {
      console.log('重新启动doro生成')
      spawnDoro()
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
  usedLanes.clear()

  // 初始化所有背景元素
  initBackground()

  spawnDoro()
  doroImg.onload = () => render()

  // 添加页面可见性检测
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(spawnTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
