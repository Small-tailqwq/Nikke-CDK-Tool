<template>
  <div class="app-container">
    <el-container>
      <el-header height="auto">
        <div class="header-content">
          <h1>NIKKE CDK兑换工具</h1>
          <el-menu
            mode="horizontal"
            :router="true"
            :default-active="$route.path"
          >
            <el-menu-item index="/cdk">CDK兑换</el-menu-item>
            <el-menu-item index="/user">用户管理</el-menu-item>
            <el-menu-item index="/history">兑换历史</el-menu-item>
            <el-menu-item index="/announcement">CDK公告</el-menu-item>
          </el-menu>
        </div>
      </el-header>

      <el-main>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <el-footer height="auto" class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h4>NIKKE CDK兑换工具</h4>
            <p class="copyright">© 2025 | 本工具仅供学习交流使用</p>
          </div>
          <div class="footer-section">
            <p class="tech-desc">本项目由以下服务提供支持：</p>
            <div class="tech-stack">
              <el-tooltip content="静态页面托管服务" placement="top">
                <el-tag size="small" type="info" effect="plain">GitHub Pages</el-tag>
              </el-tooltip>
              <el-tooltip content="自动化构建与部署" placement="top">
                <el-tag size="small" type="info" effect="plain">GitHub Actions</el-tag>
              </el-tooltip>
              <el-tooltip content="后端API代理服务" placement="top">
                <el-tag size="small" type="info" effect="plain">Cloudflare Worker</el-tag>
              </el-tooltip>
              <el-tooltip content="CDK列表CDN加速" placement="top">
                <el-tag size="small" type="info" effect="plain">jsDelivr</el-tag>
              </el-tooltip>
              <el-tooltip content="就算你把鼠标放在我上面，但是我只是一只doro" placement="top">
                <el-tag size="small" type="info" effect="plain">Doro</el-tag>
              </el-tooltip>
            </div>
          </div>
        </div>
      </el-footer>
    </el-container>
    <!-- doro悬浮按钮，唯一彩蛋入口 -->
    <div
      class="doro-float"
      :class="{ floating: doroIsFloating, shaking: doroIsShaking, exploding: doroIsExploding }"
      :style="doroFloatStyle"
      @click.stop="handleDoroClick"
      :title="doroClickCount < 3 ? 'doro~' : ''"
    >
      <img :src="doroIcon" alt="doro" />
    </div>
    <!-- doro爆炸飞出 -->
    <transition-group name="doro-burst" tag="div">
      <img
        v-for="item in burstList"
        :key="item.id"
        class="doro-burst-img"
        :src="doroIcon"
        :style="item.style"
      />
    </transition-group>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import doroIcon from '@/assets/doro_icon.png'

const router = useRouter()
const route = useRoute()

// doro彩蛋相关
const doroClickCount = ref(0)
const doroScale = ref(1)
const doroPos = ref({ right: 32, bottom: 32 }) // 初始右下角
const doroIsFloating = ref(false)
const doroIsShaking = ref(false)
const doroShakeIntensity = ref(1)
const doroIsExploding = ref(false)
const burstList = ref([])
let burstId = 0
let shakeTimer = null

// 蛋中蛋彩蛋相关
const rainbowEggReady = ref(false)
const rainbowEggCount = ref(0)

function handleDoroClick(e) {
  if (route.path !== '/about') {
    router.push('/about')
    return
  }
  // 蛋中蛋彩蛋逻辑
  if (rainbowEggReady.value) {
    rainbowEggCount.value++
    if (rainbowEggCount.value >= 3) {
      rainbowEggReady.value = false
      rainbowEggCount.value = 0
      router.push('/rainbow-doro')
      return
    }
    return
  }
  doroClickCount.value++
  // 3次后瞬移
  if (doroClickCount.value === 3) {
    moveDoroRandom()
    doroIsFloating.value = true
  }
  // 3~20次变大并可继续瞬移
  if (doroClickCount.value > 3 && doroClickCount.value < 20) {
    doroScale.value += 0.18
    moveDoroRandom()
  }
  // 10次后常态抖动
  if (doroClickCount.value === 10) {
    doroIsShaking.value = true
    startDoroShake()
  }
  // 抖动幅度递增
  if (doroClickCount.value >= 10 && doroClickCount.value < 20) {
    doroShakeIntensity.value = 1 + (doroClickCount.value - 10) * 0.25
  }
  // 20次爆炸
  if (doroClickCount.value >= 20) {
    triggerBurst()
    resetDoro()
    // 爆炸后允许蛋中蛋
    rainbowEggReady.value = true
    rainbowEggCount.value = 0
  }
}

function moveDoroRandom() {
  // 屏幕边界留白，doro大小最大约200px
  const margin = 40
  const maxW = window.innerWidth - 120 - margin
  const maxH = window.innerHeight - 120 - margin
  const x = Math.random() * maxW + margin / 2
  const y = Math.random() * maxH + margin / 2
  doroPos.value = { left: x, top: y, right: 'auto', bottom: 'auto' }
}

function startDoroShake() {
  if (shakeTimer) clearInterval(shakeTimer)
  shakeTimer = setInterval(() => {
    // 触发视图更新，CSS动画用变量控制幅度
    doroShakeIntensity.value = 1 + (doroClickCount.value - 10) * 0.25
  }, 500)
}

function resetDoro() {
  doroClickCount.value = 0
  doroScale.value = 1
  doroPos.value = { right: 32, bottom: 32 }
  doroIsFloating.value = false
  doroIsShaking.value = false
  doroShakeIntensity.value = 1
  if (shakeTimer) clearInterval(shakeTimer)
}

function triggerBurst() {
  doroIsExploding.value = true
  const burstNum = 24 + Math.floor(Math.random() * 8)
  burstList.value = []
  for (let i = 0; i < burstNum; i++) {
    const angle = Math.random() * 2 * Math.PI
    const distance = 180 + Math.random() * 180
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance
    const rotate = Math.random() * 360
    burstList.value.push({
      id: burstId++,
      style: {
        position: 'fixed',
        left: `calc(50vw + 0px)`,
        top: `calc(50vh + 0px)` ,
        width: '48px',
        height: '48px',
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${0.7 + Math.random() * 0.6})`,
        opacity: 1,
        transition: 'all 1.4s cubic-bezier(.36,1.64,.56,1)',
        zIndex: 99999
      }
    })
  }
  setTimeout(() => {
    burstList.value.forEach(item => {
      item.style.opacity = 0
    })
  }, 200)
  setTimeout(() => {
    burstList.value = []
    doroIsExploding.value = false
  }, 1700)
}

const doroFloatStyle = computed(() => {
  let style = {
    position: 'fixed',
    zIndex: 99999,
    width: `${64 * doroScale.value}px`,
    height: `${64 * doroScale.value}px`,
    transition: 'all 0.35s cubic-bezier(.36,1.64,.56,1)',
    right: '',
    bottom: '',
    left: '',
    top: '',
    transform: ''
  }
  if (doroIsFloating.value && doroPos.value.left !== undefined) {
    style.left = `${doroPos.value.left}px`
    style.top = `${doroPos.value.top}px`
  } else {
    style.right = `${doroPos.value.right}px`
    style.bottom = `${doroPos.value.bottom}px`
  }
  if (doroIsShaking.value) {
    style.animation = `doro-shake 0.35s infinite cubic-bezier(.36,1.64,.56,1)`
    style['--shake-intensity'] = doroShakeIntensity.value
  }
  return style
})

onMounted(() => {
  // 防止窗口缩放后doro出界
  window.addEventListener('resize', () => {
    if (doroIsFloating.value) moveDoroRandom()
  })
})
</script>

<style lang="scss">
:root {
  --app-max-width: 1200px;
  --app-padding: 20px;
  --header-height: 120px;
  --footer-height: 60px;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  min-height: 100vh;
}

#app {
  height: 100%;
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  .el-container {
    min-height: 100vh;
  }

  .el-header {
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 0;

    .header-content {
      max-width: var(--app-max-width);
      margin: 0 auto;
      padding: var(--app-padding);

      h1 {
        margin: 0 0 20px;
        font-size: 24px;
        text-align: center;
      }

      .el-menu {
        justify-content: center;
        border-bottom: none;
      }
    }
  }

  .el-main {
    padding: var(--app-padding);
    flex: 1;
    display: flex;
    flex-direction: column;

    > div {
      max-width: var(--app-max-width);
      margin: 0 auto;
      width: 100%;
      flex: 1;
    }
  }

  .el-footer {
    background-color: #f5f7fa;
    padding: 0;

    .footer-content {
      max-width: var(--app-max-width);
      margin: 0 auto;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--app-padding);

      p {
        margin: 0;
        color: #909399;
        font-size: 14px;
      }
    }
  }
}

// 页面切换动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 全局样式
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// 用户卡片样式
.user-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  padding: 10px 0;

  .user-card {
    height: 120px;
    border: 1px solid #EBEEF5;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
    }

    &.is-selected {
      border-color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }

    .user-card-content {
      padding: 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .user-info {
        h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 500;
        }

        p {
          margin: 0 0 4px 0;
          color: #606266;
          font-size: 14px;

          &.uid {
            font-family: monospace;
          }
        }
      }

      .selection-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        color: var(--el-color-primary);
      }
    }
  }

  .add-user-card {
    border: 2px dashed #DCDFE6;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FAFAFA;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
    }

    .add-user-content {
      text-align: center;
      
      .el-icon {
        font-size: 24px;
        margin-bottom: 8px;
      }

      span {
        display: block;
        font-size: 14px;
      }
    }
  }
}

// 用户卡片动画
.user-card-list-enter-active,
.user-card-list-leave-active {
  transition: all 0.3s ease;
}

.user-card-list-enter-from,
.user-card-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.user-card-list-move {
  transition: transform 0.3s ease;
}

.doro-float {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  cursor: pointer;
  user-select: none;
  overflow: visible;
  transition: box-shadow 0.2s, transform 0.2s;
  z-index: 99999;
}
.doro-float img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.doro-float.floating {
  box-shadow: 0 4px 24px rgba(0,0,0,0.18);
}
.doro-float.shaking {
  animation: doro-shake 0.35s infinite cubic-bezier(.36,1.64,.56,1);
}
@keyframes doro-shake {
  0% { transform: translate(0, 0) rotate(-8deg) scale(var(--shake-intensity,1)); }
  20% { transform: translate(-6px, 2px) rotate(8deg) scale(var(--shake-intensity,1)); }
  40% { transform: translate(6px, -2px) rotate(-8deg) scale(var(--shake-intensity,1)); }
  60% { transform: translate(-4px, 4px) rotate(8deg) scale(var(--shake-intensity,1)); }
  80% { transform: translate(4px, -4px) rotate(-8deg) scale(var(--shake-intensity,1)); }
  100% { transform: translate(0, 0) rotate(8deg) scale(var(--shake-intensity,1)); }
}
.doro-burst-img {
  pointer-events: none;
  position: fixed;
  z-index: 99999;
}

.footer {
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  padding: 20px 0;
  margin-top: 40px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-section h4 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.copyright {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.tech-desc {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.tech-stack {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tech-stack .el-tag {
  margin: 0;
  cursor: help;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  
  .tech-stack {
    justify-content: flex-start;
  }
}
</style> 