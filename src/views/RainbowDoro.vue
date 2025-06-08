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
  
  const colors = ['#ff0033', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
  
  // 车道参数
  const DORO_SIZE = 80
  const LANE_GAP = 20
  let lanes = []
  let usedLanes = new Set()
  
  // doro队列
  let doros = []
  
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
      born: Date.now()
    })
    // 下一只doro随机0.8~1.8秒后生成
    spawnTimer = setTimeout(spawnDoro, 800 + Math.random() * 1000)
  }
  
  function render() {
    const canvas = cvs.value
    const dpi = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  
    // 画所有doro
    doros.forEach((doro, idx) => {
      // 彩虹尾巴
      colors.forEach((c, i) => {
        ctx.fillStyle = c
        ctx.fillRect(doro.x - doro.tailLen, doro.y + i * 6 + 20, doro.tailLen, 6)
      })
      // 星星
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.random() + ')'
        const sx = Math.random() * canvas.width / dpi,
              sy = Math.random() * canvas.height / dpi
        ctx.fillRect(sx, sy, 2, 2)
      }
      // doro本体
      ctx.drawImage(doroImg, doro.x, doro.y, DORO_SIZE, DORO_SIZE)
      doro.x += doro.speed
    })
  
    // 移除出界doro，释放车道
    for (let i = doros.length - 1; i >= 0; i--) {
      if (doros[i].x - doros[i].tailLen > canvas.width / (window.devicePixelRatio || 1)) {
        usedLanes.delete(doros[i].laneIdx)
        doros.splice(i, 1)
      }
    }
  
    rafId = requestAnimationFrame(render)
  }
  
  onMounted(() => {
    const canvas = cvs.value
    const dpi = window.devicePixelRatio || 1
    canvas.width  = window.innerWidth  * dpi
    canvas.height = window.innerHeight * dpi
    canvas.style.width  = window.innerWidth  + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx = canvas.getContext('2d')
    ctx.scale(dpi, dpi)
  
    doros = []
    usedLanes.clear()
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