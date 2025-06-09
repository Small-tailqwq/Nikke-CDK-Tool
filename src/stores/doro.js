import { defineStore } from 'pinia'
import { ref, computed, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'

// --- 持久化存储 ---
// 使用一个简单的封装来处理localStorage，避免直接操作
const DoroStorage = {
  getState: () => {
    try {
      const stored = localStorage.getItem('doro_egg_state')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to parse Doro state from localStorage', e)
    }
    return { isVisible: false, position: null }
  },
  setState: (state) => {
    try {
      localStorage.setItem('doro_egg_state', JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save Doro state to localStorage', e)
    }
  },
}

export const useDoroStore = defineStore('doro', () => {
  const router = useRouter()

  // --- 内部状态 ---
  let longPressTimer = null
  let activationTimeout = null

  // --- 响应式 State ---

  // ** 新彩蛋：触发逻辑 **
  const activationClicks = ref(0) // 底部按钮点击计数
  const activationLocked = ref(false) // 激活过程中的锁
  const isSummoning = ref(false) // 是否处于召唤动画阶段
  const isPhysicsBall = ref(false) // 是否显示物理球动画
  const isButtonFalling = ref(false) // 按钮是否正在掉落
  const shouldShowButton = computed(() => !isVisible.value) // 是否应该显示按钮

  // ** 核心状态 **
  const initialState = DoroStorage.getState()
  const isVisible = ref(initialState.isVisible) // Doro悬浮球是否可见
  const position = ref(initialState.position || { x: window.innerWidth - 100, y: window.innerHeight - 150 }) // Doro的位置

  // 如果Doro已经存在，重置按钮状态避免重复触发
  if (initialState.isVisible) {
    activationClicks.value = 0 // 重置按钮点击计数
  }
  const isDragging = ref(false) // 是否正在拖动
  const isLongPressing = ref(false) // 是否正在长按
  const isExploding = ref(false) // 是否正在自爆

  // ** 旧彩蛋：Doro悬浮球交互逻辑 **
  const interactionClicks = ref(0) // Doro悬浮球点击计数
  const doroScale = ref(1)
  const rainbowEggReady = ref(false) // 是否解锁了彩虹蛋

  // ** 新的跟枪游戏状态 **
  const isInAimingGame = ref(false) // 是否进入跟枪模式
  const doroHealth = ref(10) // Doro血量
  const isEvading = ref(false) // 是否在躲避鼠标
  const isSpinning = ref(false) // 是否在高速旋转
  const isFinalExploding = ref(false) // 是否在最终爆炸
  const healthTimer = ref(null) // 血量回复计时器
  const isTeleporting = ref(false) // 是否在瞬移动画中

  // ** 新的平衡机制 **
  const isInvincible = ref(false) // 是否处于无敌帧
  const isSpeedBoosted = ref(false) // 是否获得被击中后的速度加成
  const lastHitTime = ref(0) // 上次被击中的时间

  // ** 过场动画状态 **
  const isTransitioning = ref(false) // 是否在过场动画中

  // ** 鼠标跟踪状态 **
  const mousePosition = reactive({ x: 0, y: 0 }) // 鼠标位置
  const explosionPosition = reactive({ x: 0, y: 0 }) // 爆炸位置，用于物理球重生

  // --- Getters (Computed) ---

  // ** 动态Doro尺寸 **
  const currentDoroSize = computed(() => {
    return 60 * doroScale.value // 基础60px乘以当前缩放
  })

  // ** 动态移动速度 **
  const currentMoveSpeed = computed(() => {
    // 基础速度：根据屏幕大小调整，但最低速度提高
    const screenArea = window.innerWidth * window.innerHeight
    const baseSpeed = Math.max(4, Math.min(10, 2000000 / screenArea * 8)) // 提升到4-10之间

    let finalSpeed = baseSpeed

    // 被击中后的速度翻倍（2秒）
    if (isSpeedBoosted.value) {
      finalSpeed *= 2.5 // 从2倍提升到2.5倍
    }

    // 低血量时速度大幅提升
    if (doroHealth.value < 3) {
      finalSpeed *= 3 // 从2倍提升到3倍
    }

    return finalSpeed
  })

  // ** 动态提示语 **
  const tooltipMessage = computed(() => {
    const count = activationClicks.value
    // Doro出现时，始终无提示
    if (isVisible.value) {
      return 'OwO'
    }
    // 10次点击后，进入1s倒计时期间，只显示"我跟你爆了！"
    if (count >= 10 && activationLocked.value) return '我跟你爆了！'
    if (count === 9) return '好，那么好！'
    if (count === 8) return '没完了是吧？'
    if (count === 7) return '还点？'
    if (count === 6) return '信doro一回吧，什么都没有的。'
    if (count >= 3) return '真别点了，什么也不会发生的。'
    // Doro未出现且未进入倒计时，或已重置，显示默认提示
    return '就算你把鼠标放在我上面，但是我只是一只doro'
  })

  // --- Actions ---

  // ** 更新鼠标位置 **
  function updateMousePosition(x, y) {
    mousePosition.x = x
    mousePosition.y = y
  }

  // ** 重置所有状态 **
  function resetAllState() {
    activationClicks.value = 0
    activationLocked.value = false
    isVisible.value = false
    isLongPressing.value = false
    isExploding.value = false
    interactionClicks.value = 0
    doroScale.value = 1
    rainbowEggReady.value = false
    isButtonFalling.value = false // 重置按钮掉落状态

    // 重置跟枪游戏状态
    isInAimingGame.value = false
    doroHealth.value = 10
    isEvading.value = false
    isSpinning.value = false
    isFinalExploding.value = false
    isTeleporting.value = false
    isTransitioning.value = false
    isInvincible.value = false
    isSpeedBoosted.value = false
    lastHitTime.value = 0
    if (healthTimer.value) {
      clearTimeout(healthTimer.value)
      healthTimer.value = null
    }

    DoroStorage.setState({ isVisible: false, position: position.value })
  }

  // ** 1. 处理底部栏Doro按钮的点击 **
  function handleActivationClick() {
    // 如果Doro已经存在，忽略按钮点击
    if (isVisible.value || activationLocked.value || isSummoning.value) return

    activationClicks.value++

    if (activationClicks.value >= 10) {
      activationLocked.value = true
      isSummoning.value = true
      isPhysicsBall.value = true

      // 新增：触发按钮掉落动画
      isButtonFalling.value = true

      setTimeout(() => {
        activationLocked.value = false
        // 这里不直接显示Doro，等待动画组件 emit 事件
      }, 1000)
    }
  }

  // ** 2. 处理Doro悬浮球的点击 (重写彩蛋逻辑) **
  function handleInteractionClick() {
    if (isDragging.value) return;

    // 路由判断，确保首次点击跳转到/about
    if (router.currentRoute.value.path !== '/about') {
      router.push('/about');
      return;
    }

    // 蛋中蛋逻辑
    if (rainbowEggReady.value) {
      interactionClicks.value++
      if (interactionClicks.value >= 3) {
        resetAllState()
        router.push('/rainbow-doro')
      }
      return
    }

    // 如果在跟枪游戏中，处理命中逻辑
    if (isInAimingGame.value) {
      handleAimingHit()
      return
    }

    interactionClicks.value++

    // 第3次点击：开始瞬移
    if (interactionClicks.value === 3) {
      startTeleportPhase()
    }
    // 3-13次：继续瞬移，逐渐变大
    else if (interactionClicks.value <= 13) {
      teleportDoro()
      // 从第3次到第13次，逐渐变大到2倍
      // 计算缩放：从1.0到2.0，总共11次点击（3-13）
      const scaleProgress = (interactionClicks.value - 3) / 10 // 0到1的进度
      doroScale.value = 1 + scaleProgress // 1.0到2.0
    }
    // 第14次：进入跟枪游戏
    else if (interactionClicks.value === 14) {
      startAimingGame()
    }
  }

  // ** 3. 瞬移阶段逻辑 **
  function startTeleportPhase() {
    teleportDoro()
  }

  function teleportDoro() {
    // 触发瞬移动画
    isTeleporting.value = true

    // 随机瞬移到屏幕其他位置
    const doroSize = currentDoroSize.value // 使用动态大小
    const margin = 50
    const maxX = window.innerWidth - doroSize - margin
    const maxY = window.innerHeight - doroSize - margin

    setTimeout(() => {
      position.value.x = margin + Math.random() * maxX
      position.value.y = margin + Math.random() * maxY
    }, 150) // 在动画中间切换位置

    setTimeout(() => {
      isTeleporting.value = false
    }, 300) // 动画结束后重置状态
  }

  // ** 4. 跟枪游戏逻辑 **
  function startAimingGame() {
    // 开始过场动画
    isTransitioning.value = true

    // 移动到屏幕中心
    const halfSize = currentDoroSize.value / 2 // 动态计算一半大小
    position.value.x = window.innerWidth / 2 - halfSize
    position.value.y = window.innerHeight / 2 - halfSize

    // 过场动画序列
    setTimeout(() => {
      // 开始抖动和旋转（发动机启动效果）
      isSpinning.value = true
    }, 500)

    setTimeout(() => {
      // 过场结束，进入游戏状态
      isTransitioning.value = false
      isInAimingGame.value = true
      isEvading.value = true
      doroHealth.value = 10
      startSmoothMovement()
      startHealthRegenTimer()
    }, 3000) // 3秒过场动画
  }

  // ** 计算离鼠标最远的位置 **
  function getFarthestPosition() {
    if (mousePosition.x === 0 && mousePosition.y === 0) {
      // 如果没有鼠标位置数据，返回随机角落
      const corners = [
        { x: 50, y: 50 },
        { x: window.innerWidth - currentDoroSize.value - 50, y: 50 },
        { x: 50, y: window.innerHeight - currentDoroSize.value - 50 },
        { x: window.innerWidth - currentDoroSize.value - 50, y: window.innerHeight - currentDoroSize.value - 50 }
      ]
      return corners[Math.floor(Math.random() * corners.length)]
    }

    const currentSize = currentDoroSize.value
    const margin = 50

    // 计算有效边界
    const minX = margin
    const maxX = window.innerWidth - currentSize - margin
    const minY = margin
    const maxY = window.innerHeight - currentSize - margin

    // 屏幕四个角落的位置
    const corners = [
      { x: minX, y: minY },         // 左上
      { x: maxX, y: minY },         // 右上
      { x: minX, y: maxY },         // 左下
      { x: maxX, y: maxY }          // 右下
    ]

    // 找到离鼠标最远的角落
    let farthestCorner = corners[0]
    let maxDistance = 0

    corners.forEach(corner => {
      const distance = Math.sqrt(
        Math.pow(corner.x - mousePosition.x, 2) + Math.pow(corner.y - mousePosition.y, 2)
      )
      if (distance > maxDistance) {
        maxDistance = distance
        farthestCorner = corner
      }
    })

    return farthestCorner
  }

  function handleAimingHit() {
    const currentTime = Date.now()

    // 检查无敌帧
    if (isInvincible.value || currentTime - lastHitTime.value < 1000) {
      return // 1秒内的重复击中无效
    }

    // 记录击中时间
    lastHitTime.value = currentTime

    // 命中Doro，血量-1
    doroHealth.value = Math.max(0, doroHealth.value - 1)

    // 瞬移到离鼠标最远的位置
    const farthestPos = getFarthestPosition()
    position.value.x = farthestPos.x
    position.value.y = farthestPos.y
    console.log(`Doro 被击中后瞬移到最远位置: (${farthestPos.x}, ${farthestPos.y})`)

    // 激活无敌帧和速度加成
    isInvincible.value = true
    isSpeedBoosted.value = true

    // 1秒后解除无敌帧
    setTimeout(() => {
      isInvincible.value = false
    }, 1000)

    // 2秒后解除速度加成
    setTimeout(() => {
      isSpeedBoosted.value = false
    }, 2000)

    // 重置血量回复计时器
    resetHealthTimer()
    startHealthRegenTimer() // 重新开始血量回复

    // 血量为0时触发最终爆炸
    if (doroHealth.value === 0) {
      triggerFinalExplosion()
    } else {
      // 命中后短暂停止移动，然后继续（缩短时间）
      isEvading.value = false
      setTimeout(() => {
        if (isInAimingGame.value) isEvading.value = true
      }, 100) // 从300ms减少到100ms，更快恢复
    }
  }

  function startSmoothMovement() {
    if (!isInAimingGame.value) return

    let directionX = (Math.random() - 0.5) * 2.5 // 增强初始方向
    let directionY = (Math.random() - 0.5) * 2.5
    let lastDirectionChange = Date.now()
    let lastMouseAvoidance = 0

    const moveInterval = setInterval(() => {
      if (!isInAimingGame.value) {
        clearInterval(moveInterval)
        return
      }

      // 总是移动（简化逻辑）
      const currentTime = Date.now()
      const moveSpeed = currentMoveSpeed.value // 使用动态速度
      const doroSize = currentDoroSize.value

      // 计算Doro中心位置
      const doroCenterX = position.value.x + doroSize / 2
      const doroCenterY = position.value.y + doroSize / 2

      // 计算与鼠标的距离
      const mouseDistance = Math.sqrt(
        Math.pow(doroCenterX - mousePosition.x, 2) + Math.pow(doroCenterY - mousePosition.y, 2)
      )

      // 智能躲避鼠标（更敏感的躲避）
      const dangerDistance = 150 + (doroHealth.value < 5 ? 100 : 0) // 血量低时更早躲避
      let isAvoiding = false

      if (mouseDistance < dangerDistance && currentTime - lastMouseAvoidance > 100) {
        // 计算远离鼠标的方向
        const avoidX = doroCenterX - mousePosition.x
        const avoidY = doroCenterY - mousePosition.y
        const avoidLength = Math.sqrt(avoidX * avoidX + avoidY * avoidY)

        if (avoidLength > 0) {
          // 标准化躲避方向，并加强躲避力度
          directionX = (avoidX / avoidLength) * 1.5 // 增强躲避力度
          directionY = (avoidY / avoidLength) * 1.5
          lastDirectionChange = currentTime
          lastMouseAvoidance = currentTime
          isAvoiding = true
        }
      }

      // 强制随机移动 - 确保Doro永远不会停下来
      if (!isAvoiding && currentTime - lastDirectionChange > 300) {
        if (Math.random() < 0.25) { // 25%概率改变方向
          directionX = (Math.random() - 0.5) * 2
          directionY = (Math.random() - 0.5) * 2
          lastDirectionChange = currentTime
        }
      }

      // 如果方向向量太小，强制给一个随机推力
      if (Math.abs(directionX) < 0.3 && Math.abs(directionY) < 0.3) {
        directionX = (Math.random() - 0.5) * 1.2
        directionY = (Math.random() - 0.5) * 1.2
      }

      // 平滑移动
      const margin = 30 // 增加边距，避免被堵在角落
      let newX = position.value.x + directionX * moveSpeed
      let newY = position.value.y + directionY * moveSpeed

      // 智能边界处理：提前转向避免被困
      const edgeDistance = 100 // 增加到100px提前转向
      if (newX <= margin + edgeDistance || newX >= window.innerWidth - doroSize - margin - edgeDistance) {
        directionX = -directionX * (0.8 + Math.random() * 0.4) // 加入随机性
        // 如果靠近边界，额外添加随机垂直分量
        directionY += (Math.random() - 0.5) * 0.5
      }
      if (newY <= margin + edgeDistance || newY >= window.innerHeight - doroSize - margin - edgeDistance) {
        directionY = -directionY * (0.8 + Math.random() * 0.4)
        // 如果靠近边界，额外添加随机水平分量
        directionX += (Math.random() - 0.5) * 0.5
      }

      // 限制方向向量的最大值
      directionX = Math.max(-1.5, Math.min(1.5, directionX))
      directionY = Math.max(-1.5, Math.min(1.5, directionY))

      // 应用边界检查
      position.value.x = Math.max(margin, Math.min(newX, window.innerWidth - doroSize - margin))
      position.value.y = Math.max(margin, Math.min(newY, window.innerHeight - doroSize - margin))
    }, 16) // ~60fps的平滑移动
  }

  function startHealthRegenTimer() {
    resetHealthTimer()
    healthTimer.value = setTimeout(() => {
      if (isInAimingGame.value && doroHealth.value < 10) {
        doroHealth.value = Math.min(10, doroHealth.value + 1)
        startHealthRegenTimer() // 继续下一次回复
      }
    }, 3500) // 从2秒增加到3.5秒，让回复更慢
  }

  function resetHealthTimer() {
    if (healthTimer.value) {
      clearTimeout(healthTimer.value)
      healthTimer.value = null
    }
  }

  function triggerFinalExplosion() {
    isInAimingGame.value = false
    isEvading.value = false
    isSpinning.value = false
    isFinalExploding.value = true

    // 移动到屏幕中心
    const halfSize = currentDoroSize.value / 2 // 动态计算一半大小
    position.value.x = window.innerWidth / 2 - halfSize
    position.value.y = window.innerHeight / 2 - halfSize

    // 开始变大和抖动动画
    let scaleIncrement = 0
    const growInterval = setInterval(() => {
      scaleIncrement += 0.1
      doroScale.value = 1 + scaleIncrement

      if (scaleIncrement >= 2) {
        clearInterval(growInterval)
        // 触发爆炸并重生
        explodeAndRespawn()
      }
    }, 100)
  }

  function explodeAndRespawn() {
    isExploding.value = true

    // 记录爆炸位置（Doro中心点）
    const halfSize = currentDoroSize.value / 2
    explosionPosition.x = position.value.x + halfSize
    explosionPosition.y = position.value.y + halfSize

    setTimeout(() => {
      // 重置基础状态
      doroScale.value = 1
      interactionClicks.value = 0
      rainbowEggReady.value = true
      isExploding.value = false
      isFinalExploding.value = false

      // 启动重生动画（物理球）
      isPhysicsBall.value = true
      isVisible.value = false
    }, 2100)
  }

  // ** 5. 处理Doro悬浮球的交互 (拖动与长按) **
  function handleDragStart(event) {
    // 在跟枪游戏中禁用拖动
    if (isInAimingGame.value) return

    console.log('handleDragStart called')
    isDragging.value = false // 重置拖动状态

    // 启动长按检测
    isLongPressing.value = true
    longPressTimer = setTimeout(() => {
      console.log('Long press timeout triggered - calling selfDestruct')
      // 3秒后触发自爆 - 调用拥有正确计时的selfDestruct函数
      selfDestruct()
    }, 3000)

    // 记录初始拖动位置
    const startX = event.clientX || event.touches[0].clientX
    const startY = event.clientY || event.touches[0].clientY
    const startPos = { ...position.value }
    let hasMovedSignificantly = false

    function onDrag(moveEvent) {
      const currentX = moveEvent.clientX || moveEvent.touches[0].clientX
      const currentY = moveEvent.clientY || moveEvent.touches[0].clientY
      const deltaX = Math.abs(currentX - startX)
      const deltaY = Math.abs(currentY - startY)

      // 只有在明显移动时才认为是拖动（避免微小的手抖被误认为拖动）
      if (deltaX > 5 || deltaY > 5) {
        hasMovedSignificantly = true
        // 一旦开始明显移动，就不是长按了，是拖动
        if (isLongPressing.value) {
          console.log('Movement detected, canceling long press')
          clearTimeout(longPressTimer)
          longPressTimer = null
          isLongPressing.value = false
        }
        isDragging.value = true // 确认是拖动操作

        // 更新位置
        const newX = startPos.x + (currentX - startX)
        const newY = startPos.y + (currentY - startY)

        // 边界检查
        const doroSize = currentDoroSize.value // 使用动态大小
        const minX = 0
        const minY = 0
        const maxX = window.innerWidth - doroSize
        const maxY = window.innerHeight - doroSize

        position.value.x = Math.max(minX, Math.min(newX, maxX))
        position.value.y = Math.max(minY, Math.min(newY, maxY))
      }
    }

    function onDragEnd() {
      console.log('onDragEnd called, hasMovedSignificantly:', hasMovedSignificantly)
      // 清理所有事件和状态
      clearTimeout(longPressTimer)
      longPressTimer = null
      isLongPressing.value = false

      // 使用setTimeout确保drag和click事件不会混淆
      setTimeout(() => {
        isDragging.value = false
      }, 0)

      window.removeEventListener('mousemove', onDrag)
      window.removeEventListener('mouseup', onDragEnd)
      window.removeEventListener('touchmove', onDrag)
      window.removeEventListener('touchend', onDragEnd)
    }

    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', onDragEnd)
    window.addEventListener('touchmove', onDrag)
    window.addEventListener('touchend', onDragEnd)
  }

  // 召唤动画开始
  function startSummonAnimation() {
    isSummoning.value = true
    isPhysicsBall.value = true
  }
  // 召唤动画结束，切换为悬浮 Doro
  function finishSummonAnimation() {
    isSummoning.value = false
    isPhysicsBall.value = false
    isVisible.value = true
    activationClicks.value = 0

    // 如果是重生后的召唤，随机位置
    if (rainbowEggReady.value) {
      teleportDoro()
    }
  }

  // ** 4. 自爆方法 **
  function selfDestruct() {
    console.log('selfDestruct called')
    isLongPressing.value = false
    isExploding.value = true
    console.log('isExploding set to true')
    setTimeout(() => {
      console.log('Resetting all state after explosion')
      resetAllState()
    }, 2100) // 正确的计时：等待2秒的爆炸动画结束后再重置状态
  }

  // ** 监听状态并持久化 **
  watch([isVisible, position], () => {
    DoroStorage.setState({
      isVisible: isVisible.value,
      position: position.value,
    })
  },
    { deep: true }
  )

  // --- 返回公开的 state 和 actions ---
  return {
    // 状态
    isVisible,
    position,
    isDragging,
    isLongPressing,
    isExploding,
    interactionClicks,
    doroScale,
    currentDoroSize,
    tooltipMessage,
    isSummoning,
    isPhysicsBall,
    isButtonFalling,
    shouldShowButton,

    // 跟枪游戏状态
    isInAimingGame,
    doroHealth,
    isEvading,
    isSpinning,
    isFinalExploding,
    isTeleporting,
    isTransitioning,
    isInvincible,
    isSpeedBoosted,
    currentMoveSpeed,
    mousePosition,
    explosionPosition,

    // 方法
    handleActivationClick,
    handleInteractionClick,
    handleDragStart,
    startSummonAnimation,
    finishSummonAnimation,
    selfDestruct,
    updateMousePosition,
  }
}) 