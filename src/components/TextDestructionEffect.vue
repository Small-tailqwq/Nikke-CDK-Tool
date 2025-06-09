<template>
  <div v-if="isActive" class="text-destruction-container">
    <div
      v-for="text in fallingTexts"
      :key="text.id"
      class="falling-text"
      :style="text.style"
    >
      {{ text.content }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useDoroStore } from '../stores/doro'

const doroStore = useDoroStore()
const isActive = ref(false)
const fallingTexts = ref([])

// 监听过场动画开始
watch(
  () => doroStore.isTransitioning,
  (transitioning) => {
    if (transitioning) {
      startTextDestruction()
    }
  }
)

function startTextDestruction() {
  isActive.value = true
  collectAndDestroyTexts()
}

function collectAndDestroyTexts() {
  const texts = []
  const nodesToRemove = [] // 收集需要移除的文本节点
  let id = 0

  // 递归扫描所有文本节点
  function scanTextNodes(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent.trim()
      if (text && text.length > 0) {
        // 获取文本的位置
        const range = document.createRange()
        range.selectNodeContents(element)
        const rect = range.getBoundingClientRect()

        if (rect.width > 0 && rect.height > 0) {
          // 记录需要移除的文本节点和其原始内容
          nodesToRemove.push({
            node: element,
            originalText: element.textContent,
            parent: element.parentNode,
          })

          // 按字符分割文本（支持中英文）
          const chars = Array.from(text)
          chars.forEach((char, index) => {
            if (char.trim()) {
              texts.push({
                id: id++,
                content: char,
                startX: rect.left + (rect.width / chars.length) * index,
                startY: rect.top,
                delay: Math.random() * 2000, // 0-2秒的随机延迟
                duration: 1000 + Math.random() * 1000, // 1-2秒的掉落时间
                rotation: (Math.random() - 0.5) * 720, // 随机旋转
              })
            }
          })
        }
      }
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      // 跳过script、style等标签
      if (!['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
        for (let child of element.childNodes) {
          scanTextNodes(child)
        }
      }
    }
  }

  // 扫描body下的所有文本，但排除我们自己的组件
  const bodyChildren = document.body.children
  for (let element of bodyChildren) {
    // 跳过我们自己的组件和Doro相关元素
    if (
      !element.classList.contains('text-destruction-container') &&
      !element.classList.contains('floating-doro') &&
      !element.classList.contains('fragments-container')
    ) {
      scanTextNodes(element)
    }
  }

  // 创建掉落动画
  fallingTexts.value = texts.map((text) => ({
    ...text,
    style: {
      position: 'fixed',
      left: `${text.startX}px`,
      top: `${text.startY}px`,
      zIndex: 9999,
      pointerEvents: 'none',
      userSelect: 'none',
      fontSize: '16px',
      fontWeight: 'normal',
      color: '#333',
      transform: 'translateY(0) rotate(0deg)',
      opacity: 1,
      transition: `transform ${
        text.duration
      }ms cubic-bezier(0.55, 0.085, 0.68, 0.53) ${text.delay}ms, 
                   opacity ${text.duration * 0.8}ms ease-out ${
        text.delay + text.duration * 0.2
      }ms`,
    },
  }))

  // 统一移除原始文本节点以避免双重显示
  nodesToRemove.forEach(({ node }) => {
    if (node.parentNode) {
      node.textContent = '' // 清空文本内容而不是完全移除节点
    }
  })

  // 触发掉落动画
  nextTick(() => {
    setTimeout(() => {
      fallingTexts.value.forEach((text) => {
        text.style.transform = `translateY(${
          window.innerHeight + 100
        }px) rotate(${text.rotation}deg)`
        text.style.opacity = 0
      })
    }, 50)

    // 清理并恢复原始文本
    setTimeout(() => {
      // 恢复原始文本节点
      nodesToRemove.forEach(({ node, originalText }) => {
        if (node.parentNode) {
          node.textContent = originalText
        }
      })

      isActive.value = false
      fallingTexts.value = []
    }, 4000)
  })
}
</script>

<style scoped>
.text-destruction-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

.falling-text {
  position: fixed;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  font-family: inherit;
}
</style>
