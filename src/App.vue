<template>
  <div class="app-container">
    <el-container>
      <el-header height="auto">
        <div class="header-content">
          <div class="header-top">
            <div class="header-spacer"></div>
            <div class="title-container">
              <h1>NIKKE CDK Tools</h1>
              <div class="splash-text">{{ currentSplashText }}</div>
            </div>
            <div class="header-actions">
              <el-button
                circle
                size="small"
                @click="openDocumentation"
                title="使用手册"
                class="help-btn"
              >
                <el-icon>
                  <svg viewBox="0 0 1024 1024" width="1em" height="1em">
                    <path
                      fill="currentColor"
                      d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"
                    />
                    <path
                      fill="currentColor"
                      d="M464 336a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm72 112c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16s16-7.2 16-16V464c0-8.8-7.2-16-16-16z"
                    />
                  </svg>
                </el-icon>
              </el-button>
              <el-button
                circle
                size="small"
                @click="toggleTheme"
                :title="getThemeTitle()"
                class="theme-toggle-btn"
              >
                <el-icon v-if="getThemeIcon() !== 'A'">
                  <component :is="getThemeIcon()" />
                </el-icon>
                <span v-else class="auto-icon">A</span>
              </el-button>
            </div>
          </div>
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
                @click="handleNavClick(item.path)"
              >
                {{ item.name }}
              </router-link>
            </div>
          </nav>
        </div>
      </el-header>

      <!-- Cookie警告提示 -->
      <CookieWarningAlert />

      <el-main>
        <router-view v-slot="{ Component, route: currentRoute }">
          <transition
            :name="slideDirection"
            :duration="slideDuration"
            mode="out-in"
          >
            <component :is="Component" :key="currentRoute.path" />
          </transition>
        </router-view>
      </el-main>

      <el-footer height="auto" class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h4>NIKKE CDK Tools</h4>
            <p class="copyright">© 2025 | 本工具仅供学习交流使用</p>
            <div class="footer-links">
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
              <a
                href="https://chalk-quotation-b2d.notion.site/Nikke-20f563f728f180e6ad58e9205a7fa271"
                target="_blank"
                rel="noopener noreferrer"
                class="notion-link"
              >
                <el-tag size="small" type="primary" effect="plain">
                  <el-icon class="notion-icon">
                    <svg viewBox="0 0 1024 1024" width="1em" height="1em">
                      <path
                        fill="currentColor"
                        d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"
                      />
                      <path
                        fill="currentColor"
                        d="M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.4-111.6 40.7C369.2 344 352 380.7 352 420.5c0 39.8 17.2 76.5 48.4 103.8 30 26.3 69.6 40.7 111.6 40.7s81.6-14.4 111.6-40.7C654.8 497 672 460.3 672 420.5c0-39.8-17.2-76.5-48.4-103.8zM512 536c-63.9 0-115.5-51.6-115.5-115.5S448.1 305 512 305s115.5 51.6 115.5 115.5S575.9 536 512 536z"
                      />
                    </svg>
                  </el-icon>
                  使用手册
                </el-tag>
              </a>
            </div>
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
              <el-tooltip content="本项目的实际缔造者" placement="top">
                <el-tag size="small" type="info" effect="plain">Cursor</el-tag>
              </el-tooltip>
              <el-tooltip
                v-if="doroStore.shouldShowButton"
                :content="doroStore.tooltipMessage"
                placement="top"
              >
                <el-tag
                  size="small"
                  type="info"
                  effect="plain"
                  @click="doroStore.handleActivationClick"
                  style="user-select: none"
                  tabindex="-1"
                  :class="{ 'falling-button': doroStore.isButtonFalling }"
                >
                  Doro
                </el-tag>
              </el-tooltip>
            </div>
            <p class="tech-desc" style="margin-top: 16px">友情链接：</p>
            <div class="friend-links">
              <el-tooltip content="超绝收菜神器" placement="top">
                <a
                  href="https://github.com/1204244136/DoroHelper"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="friend-link"
                >
                  <el-tag size="small" type="success" effect="plain">
                    <el-icon class="github-icon"
                      ><svg viewBox="0 0 1024 1024" width="1em" height="1em">
                        <path
                          fill="currentColor"
                          d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"
                        ></path></svg
                    ></el-icon>
                    DoroHelper
                  </el-tag>
                </a>
              </el-tooltip>
              <el-tooltip content="未来可期的多功能收菜神器" placement="top">
                <a
                  href="https://github.com/megumiss/NIKKEAutoScript"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="friend-link"
                >
                  <el-tag size="small" type="warning" effect="plain">
                    <el-icon class="github-icon"
                      ><svg viewBox="0 0 1024 1024" width="1em" height="1em">
                        <path
                          fill="currentColor"
                          d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"
                        ></path></svg
                    ></el-icon>
                    NIKKEAutoScript
                  </el-tag>
                </a>
              </el-tooltip>
            </div>
          </div>
        </div>
      </el-footer>
    </el-container>
    <FloatingDoro v-if="doroStore.isVisible" />
    <DoroSummonAnimation
      v-if="doroStore.isPhysicsBall"
      :startX="doroStore.explosionPosition.x"
      :startY="doroStore.explosionPosition.y"
      @summonEnd="doroStore.finishSummonAnimation"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNavStore } from './stores/nav'
import { useDoroStore } from './stores/doro'
import { useUserStore } from './stores/user'
import { theme, toggleTheme, getThemeIcon, getThemeTitle } from './stores/theme'
import FloatingDoro from './components/FloatingDoro.vue'
import DoroSummonAnimation from './components/DoroSummonAnimation.vue'
import CookieWarningAlert from './components/CookieWarningAlert.vue'
import './assets/theme.scss'

const route = useRoute()
const navStore = useNavStore()
const doroStore = useDoroStore()
const userStore = useUserStore()

// 闪烁标题数组 - 像Minecraft一样的随机展示
const splashTexts = [
  '试试 DoroHelper!',
  '没有任何AI受到伤害',
  '续期是一个谎言',
  '我这怎么能跑',
  '人和代码有一个能跑就行',
  '没有任何CDK收到伤害',
  '所有CDK均为人工采摘',
  '人工智能，并非呆萌！',
  '快被官方逼死的同人',
  '上班时间看这个？',
]

// 当前显示的闪烁标题
const currentSplashText = ref('')

// 随机选择闪烁标题
const getRandomSplashText = () => {
  const randomIndex = Math.floor(Math.random() * splashTexts.length)
  return splashTexts[randomIndex]
}

// 定义菜单项
const menuItems = [
  { path: '/announcement', name: 'CDK公告' },
  { path: '/cdk', name: 'CDK兑换' },
  { path: '/user', name: '用户管理' },
  { path: '/history', name: '兑换历史' },
]

// 页面切换动画相关
const slideDirection = ref('slide-left')
const slideDuration = ref(300)
const prevPageIndex = ref(0)
const currentPageIndex = ref(0)

// 获取页面索引
const getPageIndex = (path) => {
  const index = menuItems.findIndex((item) => item.path === path)
  return index === -1 ? 0 : index
}

// 打开文档
const openDocumentation = () => {
  window.open(
    'https://chalk-quotation-b2d.notion.site/Nikke-20f563f728f180e6ad58e9205a7fa271',
    '_blank'
  )
}

// 处理导航点击
const handleNavClick = (targetPath) => {
  const fromIndex = getPageIndex(route.path)
  const toIndex = getPageIndex(targetPath)

  prevPageIndex.value = fromIndex
  currentPageIndex.value = toIndex

  // 计算页面间距离
  const distance = Math.abs(toIndex - fromIndex)

  // 确定滑动方向
  slideDirection.value = toIndex > fromIndex ? 'slide-left' : 'slide-right'

  // 根据距离调整动画速度
  if (distance === 0) {
    slideDuration.value = 0
  } else if (distance === 1) {
    slideDuration.value = 200
  } else if (distance === 2) {
    slideDuration.value = 220
  } else {
    slideDuration.value = 240
  }
}

// 监听路由变化
watch(route, (to, from) => {
  if (to.path !== from.path) {
    const fromIndex = getPageIndex(from.path)
    const toIndex = getPageIndex(to.path)

    if (fromIndex !== toIndex) {
      prevPageIndex.value = fromIndex
      currentPageIndex.value = toIndex

      const distance = Math.abs(toIndex - fromIndex)
      slideDirection.value = toIndex > fromIndex ? 'slide-left' : 'slide-right'

      if (distance === 0) {
        slideDuration.value = 0
      } else if (distance === 1) {
        slideDuration.value = 300
      } else if (distance === 2) {
        slideDuration.value = 200
      } else {
        slideDuration.value = 150
      }
    }
  }
})

// 初始化当前页面索引和启动各种自动检测
onMounted(async () => {
  currentPageIndex.value = getPageIndex(route.path)

  // 随机选择闪烁标题
  currentSplashText.value = getRandomSplashText()

  // 🔧 初始化每日检测状态
  userStore.initDailyCheckStatus()

  // 🔧 每日首次访问时进行Cookie状态检测
  try {
    console.log('[App] 开始每日Cookie状态检测...')
    await userStore.performDailyCookieCheck()
    console.log('[App] 每日Cookie状态检测完成')
  } catch (error) {
    console.error('[App] 每日Cookie状态检测失败:', error)
  }

  // 自动检测并续期临近过期的Cookie
  try {
    console.log('[App] 开始自动Cookie续期检测...')
    await userStore.performAutoRenewal()
    console.log('[App] 自动Cookie续期检测完成')
  } catch (error) {
    console.error('[App] 自动Cookie续期检测失败:', error)
  }
})

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

// 启动彩虹动画
let rainbowInterval
onMounted(() => {
  rainbowInterval = setInterval(updateRainbowColor, 1000)
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
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

#app {
  height: 100%;
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);

  .el-container {
    min-height: 100vh;
  }

  .el-header {
    background-color: var(--el-bg-color);
    box-shadow: var(--el-box-shadow-lighter);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 0;

    .header-content {
      max-width: var(--app-max-width);
      margin: 0 auto;
      padding: var(--app-padding);
      padding-bottom: 0;

      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        .header-spacer {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
          width: 72px; // 两个32px按钮 + 8px间距
          visibility: hidden; // 隐藏但保持布局空间
        }

        .title-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;

          h1 {
            margin: 0;
            font-size: 24px;
            color: var(--el-text-color-primary);
            text-align: center;
          }

          .splash-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-5%, 20%) scale(1) rotate(-15deg);
            font-size: 14px;
            color: #ffff55;
            font-weight: 600;
            transform-origin: center center;
            animation: minecraft-splash 1s ease-in-out infinite alternate;
            user-select: none;
            cursor: default;
            white-space: nowrap;

            // 文字描边效果提高辨识度
            -webkit-text-stroke: 1px rgba(0, 0, 0, 0.8);
            text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8),
              -1px 1px 0px rgba(0, 0, 0, 0.8), 1px -1px 0px rgba(0, 0, 0, 0.8),
              -1px -1px 0px rgba(0, 0, 0, 0.8), 2px 2px 2px rgba(0, 0, 0, 0.3);

            // 在暗色模式下调整颜色
            html.dark & {
              color: #ffff77;
              -webkit-text-stroke: 1px rgba(0, 0, 0, 0.9);
              text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.9),
                -1px 1px 0px rgba(0, 0, 0, 0.9), 1px -1px 0px rgba(0, 0, 0, 0.9),
                -1px -1px 0px rgba(0, 0, 0, 0.9), 2px 2px 2px rgba(0, 0, 0, 0.5);
            }
          }
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .help-btn,
        .theme-toggle-btn {
          transition: all 0.2s ease-out !important;
          flex-shrink: 0;
          width: 32px;
          height: 32px;

          .auto-icon {
            font-size: 14px;
            font-weight: 600;
            color: var(--el-text-color-primary);
          }

          &:hover {
            background-color: var(--hover-bg) !important;
            transform: translateY(-1px) scale(1.05);
          }

          &:active {
            background-color: var(--active-bg) !important;
            transform: translateY(0) scale(1.02);
          }
        }

        // 移动端适配
        @media screen and (max-width: 768px) {
          h1 {
            font-size: 20px;
          }

          .splash-text {
            font-size: 12px;
            transform: translate(-2%, 25%) scale(1) rotate(-15deg);
          }

          .header-actions {
            gap: 6px;
          }

          .help-btn,
          .theme-toggle-btn {
            width: 28px;
            height: 28px;

            .auto-icon {
              font-size: 12px;
            }
          }
        }

        @media screen and (max-width: 480px) {
          h1 {
            font-size: 18px;
          }

          .splash-text {
            font-size: 11px;
            transform: translate(2%, 30%) scale(1) rotate(-15deg);
          }

          @keyframes minecraft-splash {
            0% {
              transform: translate(2%, 30%) scale(1) rotate(-15deg);
            }
            100% {
              transform: translate(2%, 30%) scale(1.05) rotate(-13deg);
            }
          }

          .header-actions {
            gap: 4px;
          }

          .help-btn,
          .theme-toggle-btn {
            width: 26px;
            height: 26px;

            .auto-icon {
              font-size: 11px;
            }
          }
        }
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

      // Minecraft风格闪烁标语动画
      @keyframes minecraft-splash {
        0% {
          transform: translate(-20%, 20%) scale(1) rotate(-15deg);
        }
        100% {
          transform: translate(-20%, 20%) scale(1.05) rotate(-13deg);
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
    background-color: var(--el-bg-color-page);
    overflow: hidden; // 防止滑动动画时出现滚动条

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

  .footer-links {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    flex-wrap: wrap;

    @media screen and (max-width: 768px) {
      justify-content: center;
    }
  }

  .friend-links {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    flex-wrap: wrap;

    @media screen and (max-width: 768px) {
      justify-content: center;
    }
  }

  .github-link,
  .notion-link,
  .friend-link {
    text-decoration: none;

    .el-tag {
      cursor: pointer;
      transition: all 0.2s ease-out;

      &:hover {
        background-color: var(--hover-bg);
        transform: translateY(-1px);
      }

      &:active {
        background-color: var(--active-bg);
        transform: translateY(0);
      }
    }

    .github-icon,
    .notion-icon {
      margin-right: 4px;
      font-size: 14px;
      vertical-align: -0.125em;
      transition: transform 0.2s ease-out;
    }

    &:hover .github-icon,
    &:hover .notion-icon {
      transform: scale(1.1);
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
    transition: all 0.2s ease-out;

    &:hover {
      background-color: var(--hover-bg);
      transform: translateY(-1px);
    }

    &:active {
      background-color: var(--active-bg);
      transform: translateY(0);
    }
  }
}

// 页面切换动画
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease-out;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

// 快速切换动画（跳过多页时）
.slide-left-enter-active[style*='duration: 200ms'],
.slide-left-leave-active[style*='duration: 200ms'],
.slide-right-enter-active[style*='duration: 200ms'],
.slide-right-leave-active[style*='duration: 200ms'] {
  transition: all 0.2s ease-out;
}

.slide-left-enter-active[style*='duration: 150ms'],
.slide-left-leave-active[style*='duration: 150ms'],
.slide-right-enter-active[style*='duration: 150ms'],
.slide-right-leave-active[style*='duration: 150ms'] {
  transition: all 0.15s ease-out;
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
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    position: relative;
    overflow: hidden;
    background-color: var(--el-bg-color);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--el-box-shadow-light);
      background-color: var(--hover-bg);
      border-color: var(--el-border-color);
    }

    &:active {
      transform: translateY(-1px);
      background-color: var(--active-bg);
    }

    &.is-selected {
      border-color: var(--selected-border);
      background-color: var(--selected-bg);
      box-shadow: var(--selected-glow);

      &:hover {
        background-color: var(--selected-bg);
        transform: translateY(-2px);
        box-shadow: var(--selected-glow), var(--el-box-shadow-light);
      }

      &:active {
        transform: translateY(-1px);
      }
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
          color: var(--el-text-color-primary);
          transition: color 0.2s ease-out;
        }

        p {
          margin: 0 0 4px 0;
          color: var(--el-text-color-regular);
          font-size: 14px;
          transition: color 0.2s ease-out;

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
        transition: all 0.2s ease-out;
        opacity: 0;
        transform: scale(0.8);
      }
    }

    &.is-selected .selection-indicator {
      opacity: 1;
      transform: scale(1);
    }
  }

  .add-user-card {
    border: 2px dashed var(--el-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-fill-color-lighter);
    color: var(--el-text-color-secondary);
    transition: all 0.2s ease-out;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      background: var(--hover-bg);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(-1px);
      background: var(--active-bg);
    }

    .add-user-content {
      text-align: center;
      transition: all 0.2s ease-out;

      .el-icon {
        font-size: 24px;
        margin-bottom: 8px;
        transition: transform 0.2s ease-out;
      }

      span {
        display: block;
        font-size: 14px;
      }
    }

    &:hover .add-user-content .el-icon {
      transform: scale(1.1);
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
  background: var(--el-bg-color);
  border-radius: 50%;
  box-shadow: var(--el-box-shadow-light);
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
  box-shadow: var(--el-box-shadow);
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

// 新增：按钮掉落动画
.falling-button {
  animation: button-fall 3s ease-in forwards;
  transform-origin: center top;
}

@keyframes button-fall {
  // 阶段1：螺丝松动摇摆 (0-1秒)
  0% {
    transform: rotate(0deg) translateY(0);
  }
  10% {
    transform: rotate(-2deg) translateY(0);
  }
  20% {
    transform: rotate(2deg) translateY(0);
  }
  30% {
    transform: rotate(-3deg) translateY(0);
  }
  35% {
    transform: rotate(3deg) translateY(0);
  }

  // 阶段2：开始掉落 (1-3秒)
  40% {
    transform: rotate(-5deg) translateY(10px);
  }
  50% {
    transform: rotate(15deg) translateY(50px);
  }
  60% {
    transform: rotate(-30deg) translateY(120px);
  }
  70% {
    transform: rotate(45deg) translateY(220px);
  }
  80% {
    transform: rotate(-80deg) translateY(350px);
  }
  90% {
    transform: rotate(120deg) translateY(500px);
    opacity: 0.7;
  }
  100% {
    transform: rotate(180deg) translateY(800px);
    opacity: 0;
  }
}
</style>
