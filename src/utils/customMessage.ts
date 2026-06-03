// ========== 通知容器管理 ==========
const CONTAINER_ID = 'custom-notification-container'

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    const isMobile = window.innerWidth <= 768
    Object.assign(container.style, {
      position: 'fixed',
      top: isMobile ? '16px' : '20px',
      right: isMobile ? '16px' : '20px',
      left: isMobile ? '16px' : 'auto',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    })
    document.body.appendChild(container)
  }
  return container
}

function injectAnimationStyles() {
  if (document.querySelector('#custom-notification-styles')) return
  const style = document.createElement('style')
  style.id = 'custom-notification-styles'
  style.textContent = `
    @keyframes notif-slide-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes notif-slide-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
    @media (max-width: 768px) {
      @keyframes notif-slide-in {
        from {
          opacity: 0;
          transform: translateY(-100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes notif-slide-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-100%);
        }
      }
    }
    .custom-notification-item {
      pointer-events: auto;
      animation: notif-slide-in 0.3s ease forwards;
    }
    .custom-notification-item.custom-notification-auto-dismiss {
      pointer-events: none;
    }
    .custom-notification-item.notif-removing {
      animation: notif-slide-out 0.3s ease forwards;
    }
  `
  document.head.appendChild(style)
}

function appendToContainer(el: HTMLElement) {
  injectAnimationStyles()
  const container = getOrCreateContainer()
  container.appendChild(el)
}

function removeFromContainer(el: HTMLElement) {
  el.classList.add('notif-removing')
  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }, 300)
}

// ========== 通用的自定义消息工具函数 ==========
export const showCustomMessage = (message: string = 'CDK已复制到剪贴板', type: 'success' | 'error' | 'info' | 'warning' = 'success', duration: number = 3000) => {
  // 根据类型设置颜色和图标
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'success':
        return { bgColor: '#67c23a', icon: '✓' }
      case 'error':
        return { bgColor: '#f56c6c', icon: '✕' }
      case 'warning':
        return { bgColor: '#e6a23c', icon: '⚠' }
      case 'info':
        return { bgColor: '#409eff', icon: 'i' }
      default:
        return { bgColor: '#67c23a', icon: '✓' }
    }
  }

  const { bgColor, icon } = getTypeConfig(type)
  const persistent = duration <= 0

  // 创建自定义消息元素
  const messageEl = document.createElement('div')
  messageEl.className = `custom-notification-item custom-copy-message${persistent ? '' : ' custom-notification-auto-dismiss'}`
  messageEl.innerHTML = `
    <div style="
      background: ${bgColor};
      color: white;
      padding: ${persistent ? '12px 12px 12px 20px' : '12px 20px'};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <span style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        flex-shrink: 0;
        font-weight: bold;
      ">${icon}</span>
      <span style="flex:1">${message}</span>
      ${persistent ? '<span class="custom-message-close" style="cursor:pointer;flex-shrink:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:4px;opacity:0.8;font-size:16px;line-height:1;user-select:none;">✕</span>' : ''}
    </div>
  `

  // 添加到共享容器
  appendToContainer(messageEl)

  const hideMessage = () => {
    removeFromContainer(messageEl)
  }

  // 点击 X 关闭
  if (persistent) {
    const closeBtn = messageEl.querySelector('.custom-message-close') as HTMLElement
    if (closeBtn) {
      closeBtn.addEventListener('click', hideMessage)
    }
  }

  // 自动移除（persistent 模式下跳过）
  if (!persistent) {
    setTimeout(hideMessage, duration)
  }
}

// 进度提示工具函数
export class ProgressMessage {
  private messageEl: HTMLElement | null = null
  private progressBarEl: HTMLElement | null = null
  private progressTextEl: HTMLElement | null = null
  private isDestroyed = false

  constructor(initialMessage: string = '正在处理...') {
    this.create(initialMessage)
  }

  private create(message: string) {
    injectAnimationStyles()

    const isMobile = window.innerWidth <= 768

    // 创建进度消息元素
    this.messageEl = document.createElement('div')
    this.messageEl.className = 'custom-notification-item custom-progress-message custom-notification-auto-dismiss'

    this.messageEl.innerHTML = `
      <div style="
        background: #409eff;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: ${isMobile ? 'auto' : '280px'};
        max-width: ${isMobile ? 'none' : '400px'};
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        ">
          <div class="progress-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span class="progress-text">${message}</span>
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.2);
          height: 4px;
          border-radius: 2px;
          overflow: hidden;
        ">
          <div class="progress-bar" style="
            height: 100%;
            background: white;
            width: 0%;
            border-radius: 2px;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
    `

    // 添加旋转动画样式
    if (!document.querySelector('#progress-spinner-style')) {
      const style = document.createElement('style')
      style.id = 'progress-spinner-style'
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }

    // 获取进度条和文本元素的引用
    this.progressBarEl = this.messageEl.querySelector('.progress-bar')
    this.progressTextEl = this.messageEl.querySelector('.progress-text')

    // 添加到共享容器
    appendToContainer(this.messageEl)
  }

  // 更新进度和消息
  updateProgress(percentage: number, message?: string) {
    if (this.isDestroyed || !this.progressBarEl) return

    // 确保百分比在0-100之间
    const safePercentage = Math.max(0, Math.min(100, percentage))
    
    // 更新进度条
    this.progressBarEl.style.width = `${safePercentage}%`

    // 更新消息文本
    if (message && this.progressTextEl) {
      this.progressTextEl.textContent = message
    }
  }

  // 完成并显示成功消息
  complete(message: string = '操作完成', autoHide: boolean = true) {
    if (this.isDestroyed || !this.messageEl) return

    // 更新进度条到100%
    if (this.progressBarEl) {
      this.progressBarEl.style.width = '100%'
    }

    // 更新消息和样式为成功状态
    if (this.progressTextEl) {
      this.progressTextEl.textContent = message
    }

    // 移除旋转动画，替换为成功图标
    const spinnerEl = this.messageEl.querySelector('.progress-spinner') as HTMLElement
    if (spinnerEl) {
      spinnerEl.style.animation = 'none'
      spinnerEl.style.border = 'none'
      spinnerEl.style.background = 'rgba(255, 255, 255, 0.2)'
      spinnerEl.style.borderRadius = '50%'
      spinnerEl.style.display = 'flex'
      spinnerEl.style.alignItems = 'center'
      spinnerEl.style.justifyContent = 'center'
      spinnerEl.style.fontSize = '12px'
      spinnerEl.style.fontWeight = 'bold'
      spinnerEl.textContent = '✓'
    }

    // 改变背景色为成功绿色
    const contentEl = this.messageEl.querySelector('div') as HTMLElement
    if (contentEl) {
      contentEl.style.background = '#67c23a'
    }

    if (autoHide) {
      // 2秒后自动隐藏
      setTimeout(() => {
        this.hide()
      }, 2000)
    }
  }

  // 失败并显示错误消息
  error(message: string = '操作失败', autoHide: boolean = true) {
    if (this.isDestroyed || !this.messageEl) return

    // 更新消息文本
    if (this.progressTextEl) {
      this.progressTextEl.textContent = message
    }

    // 移除旋转动画，替换为错误图标
    const spinnerEl = this.messageEl.querySelector('.progress-spinner') as HTMLElement
    if (spinnerEl) {
      spinnerEl.style.animation = 'none'
      spinnerEl.style.border = 'none'
      spinnerEl.style.background = 'rgba(255, 255, 255, 0.2)'
      spinnerEl.style.borderRadius = '50%'
      spinnerEl.style.display = 'flex'
      spinnerEl.style.alignItems = 'center'
      spinnerEl.style.justifyContent = 'center'
      spinnerEl.style.fontSize = '12px'
      spinnerEl.style.fontWeight = 'bold'
      spinnerEl.textContent = '✕'
    }

    // 改变背景色为错误红色
    const contentEl = this.messageEl.querySelector('div') as HTMLElement
    if (contentEl) {
      contentEl.style.background = '#f56c6c'
    }

    // 隐藏进度条
    if (this.progressBarEl) {
      const progressContainer = this.progressBarEl.parentElement
      if (progressContainer) {
        progressContainer.style.display = 'none'
      }
    }

    if (autoHide) {
      // 3秒后自动隐藏
      setTimeout(() => {
        this.hide()
      }, 3000)
    }
  }

  // 手动隐藏
  hide() {
    if (this.isDestroyed || !this.messageEl) return

    removeFromContainer(this.messageEl)

    setTimeout(() => {
      this.destroy()
    }, 300)
  }

  // 销毁实例
  destroy() {
    if (this.isDestroyed) return
    
    this.isDestroyed = true
    
    if (this.messageEl && this.messageEl.parentNode) {
      this.messageEl.parentNode.removeChild(this.messageEl)
    }
    
    this.messageEl = null
    this.progressBarEl = null
    this.progressTextEl = null
  }
} 