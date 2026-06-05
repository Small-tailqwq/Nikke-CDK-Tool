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
                title="使用手册"
                class="help-btn"
                @click="openDocumentation"
              >
                <AppIcon name="help" hover />
              </el-button>
              <el-button
                circle
                size="small"
                :title="getThemeTitle()"
                class="theme-toggle-btn"
                @click="onToggleTheme"
              >
                <el-icon v-if="getThemeIcon() !== 'A'">
                  <component :is="getThemeIcon()" />
                </el-icon>
                <span v-else class="auto-icon">A</span>
              </el-button>
            </div>
          </div>
          <nav class="nav-wrapper">
            <div class="nav-menu" :style="navStore.isRainbowMode ? getActiveItemStyle : {}">
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
          <transition :name="slideDirection" :duration="slideDuration" mode="out-in">
            <component :is="Component" :key="currentRoute.path" />
          </transition>
        </router-view>
      </el-main>

      <el-footer height="auto" class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h4>NIKKE CDK Tools</h4>
            <p class="copyright">© 2026 | 本工具仅供学习交流使用</p>
            <div class="footer-links">
              <a
                href="https://github.com/Small-tailqwq/Nikke-CDK-Tool"
                target="_blank"
                rel="noopener noreferrer"
                class="github-link"
              >
                <el-tag size="small" type="info" effect="plain">
                  <AppIcon name="github" class="github-icon" />
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
                  <AppIcon name="notion" class="notion-icon" />
                  使用手册
                </el-tag>
              </a>
            </div>
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
              <el-tooltip content="开源AI编程代理" placement="top">
                <el-tag size="small" type="info" effect="plain">OpenCode</el-tag>
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
                  style="user-select: none"
                  tabindex="-1"
                  :class="{ 'falling-button': doroStore.isButtonFalling }"
                  @click="doroStore.handleActivationClick"
                >
                  Doro
                </el-tag>
              </el-tooltip>
            </div>
            <p class="tech-desc" style="margin-top: 16px">友情链接：</p>
            <div class="friend-links">
              <el-tooltip content="超绝收菜神器" placement="top">
                <a
                  href="https://github.com/1204244136/MDA"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="friend-link"
                >
                  <el-tag size="small" type="success" effect="plain">
                    <AppIcon name="github" class="github-icon" />
                    MDA
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
                    <AppIcon name="github" class="github-icon" />
                    NIKKEAutoScript
                  </el-tag>
                </a>
              </el-tooltip>
              <el-tooltip content="请开发者喝杯咖啡" placement="top">
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="friend-link sponsor-link"
                  @click.prevent="openSponsorPage"
                >
                  <el-tag size="small" type="danger" effect="dark"> ❤ 赞助支持 </el-tag>
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
      :start-x="doroStore.explosionPosition.x"
      :start-y="doroStore.explosionPosition.y"
      @summon-end="doroStore.finishSummonAnimation"
    />
    <ThemeTransition
      :visible="ttVisible"
      :direction="ttDirection"
      @switch-theme="onTransitionSwitch"
      @complete="onTransitionComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useNavStore } from './stores/nav'
import { useDoroStore } from './stores/doro'
import { useUserStore } from './stores/user'
import {
  theme,
  toggleTheme,
  getThemeIcon,
  getThemeTitle,
  themeMode,
  getSystemTheme,
} from './stores/theme'
import ThemeTransition from './components/ThemeTransition.vue'
const FloatingDoro = defineAsyncComponent(() => import('./components/FloatingDoro.vue'))
const DoroSummonAnimation = defineAsyncComponent(
  () => import('./components/DoroSummonAnimation.vue')
)
import { runBlaTasks } from './utils/blaSigner'
import { getBlaTodayKey, hasUserBlaRunToday } from './utils/blaRunState'
import { notifyBlaRunCompletion } from './utils/browserNotification'
import { showCustomMessage, ProgressMessage } from './utils/customMessage'
import CookieWarningAlert from './components/CookieWarningAlert.vue'
import './assets/theme.scss'

const route = useRoute()
const navStore = useNavStore()
const doroStore = useDoroStore()
const userStore = useUserStore()

const ttVisible = ref(false)
const ttDirection = ref('star-trail')
let ttPendingThemeMode = null
let ttPendingThemeValue = null

function onToggleTheme(event) {
  let nextMode, nextTheme
  if (themeMode.value === 'light') {
    nextMode = 'dark'
    nextTheme = 'dark'
  } else if (themeMode.value === 'dark') {
    nextMode = 'auto'
    nextTheme = getSystemTheme()
  } else {
    nextMode = 'light'
    nextTheme = 'light'
  }

  if (nextTheme === theme.value) {
    toggleTheme()
    return
  }

  ttDirection.value = nextTheme === 'dark' ? 'star-trail' : 'sunrise'
  ttPendingThemeMode = nextMode
  ttPendingThemeValue = nextTheme
  ttVisible.value = true
}

// Stripes fully cover the screen — switch theme behind the overlay
function onTransitionSwitch() {
  if (ttPendingThemeMode !== null) {
    themeMode.value = ttPendingThemeMode
    theme.value = ttPendingThemeValue
    localStorage.setItem('theme-preference', ttPendingThemeMode)
  }
}

// Stripes exit animation done — cleanup
function onTransitionComplete() {
  ttVisible.value = false
  ttPendingThemeMode = null
  ttPendingThemeValue = null
}

// 闪烁标题数组 - 像Minecraft一样的随机展示
const splashTexts = [
  '试试 Maa Doro Assistant!',
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

const getBlaOverviewText = (overview) => {
  if (!overview || !overview.totalCount) return '暂无任务数据'
  if (overview.pendingCount === 0) {
    return `${overview.completedCount}/${overview.totalCount} 项已完成`
  }
  if (overview.pendingCount === overview.manualPendingCount) {
    return `${overview.completedCount}/${overview.totalCount} 项已完成，剩余需手动`
  }
  return `${overview.completedCount}/${overview.totalCount} 项已完成`
}

// 定义菜单项
const menuItems = computed(() => {
  const items = [
    { path: '/announcement', name: 'CDK公告' },
    { path: '/cdk', name: 'CDK兑换' },
    { path: '/user', name: '用户管理' },
    { path: '/history', name: '兑换历史' },
  ]
  if (import.meta.env.DEV) {
    items.push({ path: '/admin', name: '⚙️ 管理' })
  }
  return items
})

// 页面切换动画相关
const slideDirection = ref('slide-left')
const slideDuration = ref(300)
const prevPageIndex = ref(0)
const currentPageIndex = ref(0)

// 获取页面索引
const getPageIndex = (path) => {
  const index = menuItems.value.findIndex((item) => item.path === path)
  return index === -1 ? 0 : index
}

// 打开文档
const openDocumentation = () => {
  window.open(
    'https://chalk-quotation-b2d.notion.site/Nikke-20f563f728f180e6ad58e9205a7fa271',
    '_blank'
  )
}

// 打开赞助页面
const openSponsorPage = () => {
  window.open('https://afdian.com/a/thesmalltail', '_blank')
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

  // 执行 Blabla 每日任务
  let blaProgressMessage = null
  try {
    const today = getBlaTodayKey()
    const blaUsers = userStore.users.filter((u) => u.blaEnabled && u.cookie && u.server !== 'cn')
    const pendingBlaUsers = blaUsers.filter((user) => !hasUserBlaRunToday(user, today))

    if (pendingBlaUsers.length > 0) {
      console.log(`[App] 开始执行 Blabla 每日任务，待执行 ${pendingBlaUsers.length} 个账号...`)
      if (blaUsers.length > 0) {
        blaProgressMessage = new ProgressMessage(
          `正在准备 BlaBla 任务，共 ${pendingBlaUsers.length} 个账号...`
        )
        let successCount = 0
        let failCount = 0
        const blaSummaryLines = []
        for (let index = 0; index < pendingBlaUsers.length; index++) {
          const user = pendingBlaUsers[index]
          console.log(`[App] 正在执行用户 ${user.name} 的 Blabla 任务...`)
          blaProgressMessage.updateProgress(
            (index / pendingBlaUsers.length) * 100,
            `正在检查 ${user.name} 的 BlaBla 任务...`
          )
          const result = await runBlaTasks(user.cookie, {
            exchangeEnabled: Boolean(user.blaCustomExchangeEnabled),
            exchangeItems: user.blaMonthlyExchangeItems,
            exchangeRecord: user.blaMonthlyExchangeRecord,
            onProgress: ({ current, total, taskName, detail }) => {
              const taskRatio = total > 0 ? current / total : 1
              const progressPercentage = ((index + taskRatio) / pendingBlaUsers.length) * 100
              blaProgressMessage.updateProgress(
                progressPercentage,
                `正在执行 ${user.name}: ${taskName}${detail ? ` - ${detail}` : ''}`
              )
            },
          })
          const lines = result.messages.join('\n')
          console.log(`[App] 用户 ${user.name} 的 Blabla 任务结果:\n${lines}`)
          if (result.success) successCount++
          else failCount++
          const userOverviewText = getBlaOverviewText(result.overview)
          const exchangeSummaryText =
            result.exchange?.attempted && result.exchange?.lastRedeemMessage
              ? `；${result.exchange.lastRedeemMessage}`
              : ''
          blaSummaryLines.push(`${user.name}: ${userOverviewText}${exchangeSummaryText}`)
          const executedAt = new Date().toLocaleString()
          await userStore.updateUser(user.id, {
            blaLastRun: executedAt,
            blaLastResult: result.success ? 'success' : 'fail',
            blaLastMessages: result.messages,
            blaTaskOverview: result.overview || null,
            ...(result.exchange?.attempted
              ? {
                  blaMonthlyExchangeRecord: result.exchange.record || {},
                  blaLastRedeemAt: result.exchange.lastRedeemAt || new Date().toISOString(),
                  blaLastRedeemMessage: result.exchange.lastRedeemMessage || '',
                }
              : {}),
            ...(result.success ? { blaLastRunDateKey: today } : {}),
          })
          blaProgressMessage.updateProgress(
            ((index + 1) / pendingBlaUsers.length) * 100,
            `${user.name}: ${userOverviewText}`
          )
        }
        const totalMsg = `BlaBla 每日任务完成：成功 ${successCount}，失败 ${failCount}`
        showCustomMessage(totalMsg, failCount > 0 ? 'warning' : 'success')
        notifyBlaRunCompletion({
          successCount,
          failCount,
          totalCount: pendingBlaUsers.length,
          lines: blaSummaryLines,
        })
        if (failCount > 0) {
          blaProgressMessage.error(totalMsg, false)
          setTimeout(() => blaProgressMessage?.hide(), 3000)
        } else {
          blaProgressMessage.complete(totalMsg)
        }
        console.log(`[App] ${totalMsg}`)
      } else {
        console.log('[App] 没有开启 Blabla 任务的用户')
      }
    } else if (blaUsers.length > 0) {
      console.log('[App] 今日 BlaBla 任务均已执行，跳过')
    } else {
      console.log('[App] 没有开启 Blabla 任务的用户')
    }
  } catch (error) {
    console.error('[App] Blabla 每日任务执行失败:', error)
    blaProgressMessage?.error(`BlaBla 每日任务执行失败: ${error.message || '未知错误'}`)
    notifyBlaRunCompletion({
      successCount: 0,
      failCount: 1,
      totalCount: 1,
      lines: [`执行失败: ${error.message || '未知错误'}`],
    })
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
    currentColorIndex.value = (currentColorIndex.value + 1) % rainbowColors.length
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
    z-index: 2500; /* 进一步提高z-index，确保在下拉菜单层级范围内 */
    padding: 0;
    isolation: isolate; /* 创建新的层叠上下文，防止层级冲突 */

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
            // padding: 2px 10px;
            // border-radius: 999px;
            // transition: color 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;

            // 文字描边效果提高辨识度
            -webkit-text-stroke: 1px rgba(0, 0, 0, 0.8);
            text-shadow:
              1px 1px 0px rgba(0, 0, 0, 0.8),
              -1px 1px 0px rgba(0, 0, 0, 0.8),
              1px -1px 0px rgba(0, 0, 0, 0.8),
              -1px -1px 0px rgba(0, 0, 0, 0.8),
              2px 2px 2px rgba(0, 0, 0, 0.3);

            // 在暗色模式下调整颜色
            html.dark & {
              color: #fff4a3;
              -webkit-text-stroke: 1px rgba(255, 255, 255, 0.7);
              text-shadow:
                1px 1px 3px rgba(0, 0, 0, 0.5),
                0 0 8px rgba(255, 224, 102, 0.35);
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
        position: relative; /* 确保导航容器有正确的定位上下文 */
        z-index: 50; /* 提高导航容器的层级 */

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
          isolation: isolate; /* 为每个导航项创建独立的层叠上下文 */

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
              background-color: var(--nav-active-color, var(--el-menu-active-color));
              border-radius: 50%;
              box-shadow:
                0 0 12px var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 25px var(--nav-glow-color, var(--el-menu-active-color));
              animation: glow 2s ease-in-out infinite alternate;
              z-index: 5; /* 提高层级，但保持在合理范围内 */
              will-change: transform, opacity; /* 优化动画性能 */
              contain: layout style paint; /* 使用CSS containment优化渲染 */
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
              box-shadow:
                0 0 10px var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 20px var(--nav-glow-color, var(--el-menu-active-color));
              animation: shine 3s ease-in-out infinite;
              z-index: 3; /* 提高层级 */
              will-change: background, opacity; /* 优化动画性能 */
              contain: layout style paint; /* 使用CSS containment优化渲染 */
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
              background-color: var(--nav-active-color, var(--el-menu-active-color));
              border-radius: 50%;
              box-shadow:
                0 0 8px var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 15px var(--nav-glow-color, var(--el-menu-active-color));
              animation: smallGlow 2s ease-in-out infinite alternate;
              z-index: 5; /* 提高层级 */
              will-change: transform, opacity; /* 优化动画性能 */
              contain: layout style paint; /* 使用CSS containment优化渲染 */
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
              box-shadow:
                0 0 5px var(--nav-glow-color, var(--el-menu-active-color)),
                0 0 10px var(--nav-glow-color, var(--el-menu-active-color));
              animation: smallShine 3s ease-in-out infinite;
              z-index: 3; /* 提高层级 */
              will-change: background, opacity; /* 优化动画性能 */
              contain: layout style paint; /* 使用CSS containment优化渲染 */
            }

            &.active {
              font-weight: 500;

              &::before {
                width: 6px;
                height: 6px;
                box-shadow:
                  0 0 12px var(--nav-glow-color, var(--el-menu-active-color)),
                  0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
                  0 0 25px var(--nav-glow-color, var(--el-menu-active-color));
                animation: glow 2s ease-in-out infinite alternate;
                z-index: 5; /* 确保层级一致 */
              }

              &::after {
                height: 2px;
                box-shadow:
                  0 0 10px var(--nav-glow-color, var(--el-menu-active-color)),
                  0 0 20px var(--nav-glow-color, var(--el-menu-active-color));
                animation: shine 3s ease-in-out infinite;
                z-index: 3; /* 确保层级一致 */
              }
            }
          }
        }
      }

      @keyframes glow {
        from {
          opacity: 0.6;
          transform: translateX(-50%) scale(0.8);
          box-shadow:
            0 0 12px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 25px var(--nav-glow-color, var(--el-menu-active-color));
        }
        to {
          opacity: 1;
          transform: translateX(-50%) scale(1.2);
          box-shadow:
            0 0 15px var(--nav-glow-color, var(--el-menu-active-color)),
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
          box-shadow: 0 0 10px var(--nav-glow-color, var(--el-menu-active-color));
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
          box-shadow:
            0 0 20px var(--nav-glow-color, var(--el-menu-active-color)),
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
          box-shadow: 0 0 10px var(--nav-glow-color, var(--el-menu-active-color));
        }
      }

      @keyframes smallGlow {
        from {
          opacity: 0.4;
          transform: translateX(-50%) scale(0.8);
          box-shadow:
            0 0 8px var(--nav-glow-color, var(--el-menu-active-color)),
            0 0 15px var(--nav-glow-color, var(--el-menu-active-color));
        }
        to {
          opacity: 0.8;
          transform: translateX(-50%) scale(1.1);
          box-shadow:
            0 0 10px var(--nav-glow-color, var(--el-menu-active-color)),
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
          box-shadow:
            0 0 8px var(--nav-glow-color, var(--el-menu-active-color)),
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
              box-shadow:
                0 0 8px var(--el-menu-active-color),
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
      will-change: transform, background-color;

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
      will-change: transform;
    }

    &:hover .github-icon,
    &:hover .notion-icon {
      transform: scale(1.1);
    }
  }

  .sponsor-link {
    .el-tag {
      transition: all 0.2s ease-out;
    }
    &:hover .el-tag {
      transform: translateY(-1px) scale(1.05);
      filter: brightness(1.2);
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
    will-change: transform, background-color;

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
  transition:
    box-shadow 0.2s,
    transform 0.2s;
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
    transform: translate(-6px, 2px) rotate(8deg) scale(var(--shake-intensity, 1));
  }
  40% {
    transform: translate(6px, -2px) rotate(-8deg) scale(var(--shake-intensity, 1));
  }
  60% {
    transform: translate(-4px, 4px) rotate(8deg) scale(var(--shake-intensity, 1));
  }
  80% {
    transform: translate(4px, -4px) rotate(-8deg) scale(var(--shake-intensity, 1));
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
