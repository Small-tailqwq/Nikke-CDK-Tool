<template>
  <div class="app-container">
    <el-container>
      <el-header height="auto">
        <div class="header-content">
          <h1>NIKKE CDK兑换工具</h1>
          <nav class="nav-wrapper">
            <div
              class="nav-menu"
              :style="navStore.isRainbowMode ? getActiveItemStyle : {}"
            >
              <router-link
                v-for="item in menuItems"
                :key="item.path"
                :to="item.path"
                class="nav-item"
                :class="{
                  active: route.path === item.path,
                  rainbow: navStore.isRainbowMode,
                }"
              >
                {{ item.name }}
              </router-link>
            </div>
          </nav>
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
            <a
              href="https://github.com/Small-tailqwq/Nikke-CDK-Tool"
              target="_blank"
              rel="noopener noreferrer"
              class="github-link"
            >
              <el-tag size="small" type="info" effect="plain">
                <el-icon class="github-icon"
                  ><svg viewBox="0 0 1024 1024" width="1em" height="1em">
                    <path
                      fill="currentColor"
                      d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"
                    ></path></svg
                ></el-icon>
                GitHub
              </el-tag>
            </a>
          </div>
          <div class="footer-section">
            <p class="tech-desc">本项目由以下服务提供支持：</p>
            <div class="tech-stack">
              <el-tooltip content="静态页面托管服务" placement="top">
                <el-tag size="small" type="info" effect="plain"
                  >GitHub Pages</el-tag
                >
              </el-tooltip>
              <el-tooltip content="自动化构建与部署" placement="top">
                <el-tag size="small" type="info" effect="plain"
                  >GitHub Actions</el-tag
                >
              </el-tooltip>
              <el-tooltip content="后端API代理服务" placement="top">
                <el-tag size="small" type="info" effect="plain"
                  >Cloudflare Worker</el-tag
                >
              </el-tooltip>
              <el-tooltip content="CDK列表CDN加速" placement="top">
                <el-tag size="small" type="info" effect="plain"
                  >jsDelivr</el-tag
                >
              </el-tooltip>
              <el-tooltip
                content="就算你把鼠标放在我上面，但是我只是一只doro"
                placement="top"
              >
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
      :class="{
        floating: doroIsFloating,
        shaking: doroIsShaking,
        exploding: doroIsExploding,
      }"
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import doroIcon from '@/assets/doro_icon.png'
import { useNavStore } from './stores/nav'

const router = useRouter()
const route = useRoute()
const navStore = useNavStore()

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

// 定义菜单项
const menuItems = [
  { path: '/cdk', name: 'CDK兑换' },
  { path: '/user', name: '用户管理' },
  { path: '/history', name: '兑换历史' },
  { path: '/announcement', name: 'CDK公告' },
]

// 彩虹颜色数组
const rainbowColors = [
  '#FF0000', // 红
  '#FF7F00', // 橙
  '#FFFF00', // 黄
  '#00FF00', // 绿
  '#0000FF', // 蓝
  '#4B0082', // 靛
  '#8B00FF', // 紫
]

// 当前彩虹颜色索引
const currentColorIndex = ref(0)

// 更新彩虹颜色
const updateRainbowColor = () => {
  if (navStore.isRainbowMode) {
    currentColorIndex.value =
      (currentColorIndex.value + 1) % rainbowColors.length
  }
}

// 获取当前激活项的样式
const getActiveItemStyle = computed(() => {
  if (!navStore.isRainbowMode) return {}

  return {
    '--nav-active-color': rainbowColors[currentColorIndex.value],
    '--nav-glow-color': rainbowColors[currentColorIndex.value],
  }
})

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
        top: `calc(50vh + 0px)`,
        width: '48px',
        height: '48px',
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${
          0.7 + Math.random() * 0.6
        })`,
        opacity: 1,
        transition: 'all 1.4s cubic-bezier(.36,1.64,.56,1)',
        zIndex: 99999,
      },
    })
  }
  setTimeout(() => {
    burstList.value.forEach((item) => {
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
    transform: '',
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

// 启动彩虹动画
let rainbowInterval
onMounted(() => {
  rainbowInterval = setInterval(updateRainbowColor, 1000)
  // 防止窗口缩放后doro出界
  window.addEventListener('resize', () => {
    if (doroIsFloating.value) moveDoroRandom()
  })
})

onBeforeUnmount(() => {
  if (rainbowInterval) {
    clearInterval(rainbowInterval)
  }
})
</script>

<style lang="scss">
:root {
  --app-max-width: 1200px;
  --app-padding: 20px;
  --header-height: 120px;
  --footer-height: 60px;
}

html,
body {
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
      padding-bottom: 0;

      h1 {
        margin: 0 0 16px;
        font-size: 24px;
        text-align: center;
      }

      .nav-wrapper {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-bottom: 0;

        // 隐藏滚动条但保持功能
        scrollbar-width: none;
        -ms-overflow-style: none;
        &::-webkit-scrollbar {
          display: none;
        }

        // 防止内容溢出
        &::after {
          content: '';
          display: block;
          min-width: 8px;
        }
      }

      .nav-menu {
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: min-content;
        padding: 0 8px;
        gap: 4px;
        height: 40px;
        border-bottom: none;

        .nav-item {
          padding: 0 16px;
          height: 40px;
          line-height: 40px;
          font-size: 15px;
          color: var(--el-text-color-primary);
          text-decoration: none;
          position: relative;
          flex-shrink: 0;
          transition: var(--el-transition-all);

          &:hover {
            color: var(--el-menu-hover-text-color);
          }

          &.active {
            color: var(--nav-active-color, var(--el-menu-active-color));
            font-weight: 500;

            &::before {
              content: '';
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              width: 6px;
              height: 6px;
              background-color: var(
                --nav-active-color,
                var(--el-menu-active-color)
              );
              border-radius: 50%;
              box-shadow: 0 0 12px
                  var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 25px var(--nav-glow-color, var(--el-menu-active-color));
              animation: glow 2s ease-in-out infinite alternate;
              z-index: 2;
            }

            &::after {
              content: '';
              position: absolute;
              bottom: -1px;
              left: 0;
              width: 100%;
              height: 2px;
              background: linear-gradient(
                90deg,
                transparent,
                var(--nav-active-color, var(--el-menu-active-color)) 20%,
                var(--nav-active-color, var(--el-menu-active-color)) 80%,
                transparent
              );
              box-shadow: 0 0 10px
                  var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 20px var(--nav-glow-color, var(--el-menu-active-color));
              animation: shine 3s ease-in-out infinite;
              z-index: 1;
            }
          }

          &.rainbow {
            transition: color 0.5s ease;
            color: var(--nav-active-color, var(--el-menu-active-color));

            &::before {
              content: '';
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              width: 4px;
              height: 4px;
              background-color: var(
                --nav-active-color,
                var(--el-menu-active-color)
              );
              border-radius: 50%;
              box-shadow: 0 0 8px
                  var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 15px var(--nav-glow-color, var(--el-menu-active-color));
              animation: smallGlow 2s ease-in-out infinite alternate;
              z-index: 2;
            }

            &::after {
              content: '';
              position: absolute;
              bottom: -1px;
              left: 0;
              width: 100%;
              height: 1px;
              background: linear-gradient(
                90deg,
                transparent,
                var(--nav-active-color, var(--el-menu-active-color)) 20%,
                var(--nav-active-color, var(--el-menu-active-color)) 80%,
                transparent
              );
              box-shadow: 0 0 5px
                  var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 10px var(--nav-glow-color, var(--el-menu-active-color));
              animation: smallShine 3s ease-in-out infinite;
              z-index: 1;
            }

            &.active {
              font-weight: 500;

              &::before {
                width: 6px;
                height: 6px;
                box-shadow: 0 0 12px
                    var(--nav-glow-color, var(--el-menu-active-color)),
                  0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
                  0 0 25px var(--nav-glow-color, var(--el-menu-active-color));
                animation: glow 2s ease-in-out infinite alternate;
              }

              &::after {
                height: 2px;
                box-shadow: 0 0 10px
                    var(--nav-glow-color, var(--el-menu-active-color)),
                  0 0 20px var(--nav-glow-color, var(--el-menu-active-color));
                animation: shine 3s ease-in-out infinite;
              }
            }
          }
        }
      }

      @keyframes glow {
        from {
          opacity: 0.6;
          transform: translateX(-50%) scale(0.8);
          box-shadow: 0 0 12px
              var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 25px var(--nav-glow-color, var(--el-menu-active-color));
        }
        to {
          opacity: 1;
          transform: translateX(-50%) scale(1.2);
          box-shadow: 0 0 15px
              var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 25px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 30px var(--nav-glow-color, var(--el-menu-active-color));
        }
      }

      @keyframes shine {
        0% {
          opacity: 0.7;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nav-active-color, var(--el-menu-active-color)) 20%,
            var(--nav-active-color, var(--el-menu-active-color)) 80%,
            transparent
          );
          box-shadow: 0 0 10px
            var(--nav-glow-color, var(--el-menu-active-color));
        }
        50% {
          opacity: 1;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nav-active-color, var(--el-menu-active-color)) 40%,
            var(--nav-active-color, var(--el-menu-active-color)) 60%,
            transparent
          );
          box-shadow: 0 0 20px
              var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 30px var(--nav-glow-color, var(--el-menu-active-color));
        }
        100% {
          opacity: 0.7;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nav-active-color, var(--el-menu-active-color)) 20%,
            var(--nav-active-color, var(--el-menu-active-color)) 80%,
            transparent
          );
          box-shadow: 0 0 10px
            var(--nav-glow-color, var(--el-menu-active-color));
        }
      }

      @keyframes smallGlow {
        from {
          opacity: 0.4;
          transform: translateX(-50%) scale(0.8);
          box-shadow: 0 0 8px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 15px var(--nav-glow-color, var(--el-menu-active-color));
        }
        to {
          opacity: 0.8;
          transform: translateX(-50%) scale(1.1);
          box-shadow: 0 0 10px
              var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 18px var(--nav-glow-color, var(--el-menu-active-color));
        }
      }

      @keyframes smallShine {
        0% {
          opacity: 0.5;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nav-active-color, var(--el-menu-active-color)) 20%,
            var(--nav-active-color, var(--el-menu-active-color)) 80%,
            transparent
          );
          box-shadow: 0 0 5px var(--nav-glow-color, var(--el-menu-active-color));
        }
        50% {
          opacity: 0.8;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nav-active-color, var(--el-menu-active-color)) 40%,
            var(--nav-active-color, var(--el-menu-active-color)) 60%,
            transparent
          );
          box-shadow: 0 0 8px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 15px var(--nav-glow-color, var(--el-menu-active-color));
        }
        100% {
          opacity: 0.5;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nav-active-color, var(--el-menu-active-color)) 20%,
            var(--nav-active-color, var(--el-menu-active-color)) 80%,
            transparent
          );
          box-shadow: 0 0 5px var(--nav-glow-color, var(--el-menu-active-color));
        }
      }

      // 移动端适配
      @media screen and (max-width: 768px) {
        .nav-menu {
          height: 36px;
          padding: 0 4px;

          .nav-item {
            padding: 0 12px;
            height: 36px;
            line-height: 36px;
            font-size: 14px;

            &.active::before {
              top: -10px;
              width: 4px;
              height: 4px;
              box-shadow: 0 0 8px var(--el-menu-active-color),
                0 0 15px var(--el-menu-active-color),
                0 0 20px var(--el-menu-active-color);
            }
          }
        }
      }
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--el-border-color);
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
    background-color: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-light);
    padding: 25px 0;
    margin-top: 40px;

    @media screen and (max-width: 768px) {
      padding: 20px 0;
    }
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 20px;

    @media screen and (max-width: 768px) {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0 16px;
    }
  }

  .footer-section {
    display: flex;
    flex-direction: column;
    gap: 8px;

    @media screen and (max-width: 768px) {
      width: 100%;
      align-items: center;
    }

    h4 {
      margin: 0;
      font-size: 16px;
      color: var(--el-text-color-primary);
      font-weight: 500;
    }
  }

  .copyright {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .github-link {
    text-decoration: none;
    margin-top: 4px;

    .el-tag {
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background-color: var(--el-color-info-light-7);
      }
    }

    .github-icon {
      margin-right: 4px;
      font-size: 14px;
      vertical-align: -0.125em;
    }
  }

  .tech-desc {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    @media screen and (max-width: 768px) {
      margin-top: 8px;
    }
  }

  .tech-stack {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    @media screen and (max-width: 768px) {
      justify-content: center;
    }
  }

  .tech-stack .el-tag {
    margin: 0;
    cursor: help;
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
    border: 1px solid #ebeef5;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
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
    border: 2px dashed #dcdfe6;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;

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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
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
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
}
.doro-float.shaking {
  animation: doro-shake 0.35s infinite cubic-bezier(0.36, 1.64, 0.56, 1);
}
@keyframes doro-shake {
  0% {
    transform: translate(0, 0) rotate(-8deg) scale(var(--shake-intensity, 1));
  }
  20% {
    transform: translate(-6px, 2px) rotate(8deg)
      scale(var(--shake-intensity, 1));
  }
  40% {
    transform: translate(6px, -2px) rotate(-8deg)
      scale(var(--shake-intensity, 1));
  }
  60% {
    transform: translate(-4px, 4px) rotate(8deg)
      scale(var(--shake-intensity, 1));
  }
  80% {
    transform: translate(4px, -4px) rotate(-8deg)
      scale(var(--shake-intensity, 1));
  }
  100% {
    transform: translate(0, 0) rotate(8deg) scale(var(--shake-intensity, 1));
  }
}
.doro-burst-img {
  pointer-events: none;
  position: fixed;
  z-index: 99999;
}
</style>
