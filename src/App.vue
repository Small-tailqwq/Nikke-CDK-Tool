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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNavStore } from './stores/nav'
import { useDoroStore } from './stores/doro'
import FloatingDoro from './components/FloatingDoro.vue'
import DoroSummonAnimation from './components/DoroSummonAnimation.vue'

const router = useRouter()
const route = useRoute()
const navStore = useNavStore()
const doroStore = useDoroStore()

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
