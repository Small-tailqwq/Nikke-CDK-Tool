/**
 * 广告拦截检测工具
 * 用于检测广告是否被广告拦截器屏蔽
 */

export class AdBlockDetector {
  private element: HTMLElement | null = null
  private isBlocked = false
  private observer: IntersectionObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private checkInterval: number | null = null
  private callbacks: Array<(isBlocked: boolean) => void> = []

  constructor(element: HTMLElement) {
    this.element = element
    this.setupDetection()
  }

  /**
   * 添加检测回调
   */
  onBlockedChange(callback: (isBlocked: boolean) => void) {
    this.callbacks.push(callback)
  }

  /**
   * 设置检测机制
   */
  private setupDetection() {
    if (!this.element) return

    // 立即检测
    setTimeout(() => this.checkBlocked(), 100)

    // 设置多重检测机制
    this.setupIntersectionObserver()
    this.setupMutationObserver()
    this.setupPeriodicCheck()
    this.setupEventListeners()
  }

  /**
   * 检测元素是否被屏蔽
   */
  private checkBlocked(): boolean {
    if (!this.element) return false

    const wasBlocked = this.isBlocked

    // 多种检测方式
    const checks = [
      this.checkVisibility(),
      this.checkDimensions(),
      this.checkComputedStyle(),
      this.checkOffsetParent(),
      this.checkClassList(),
      this.checkInnerContent()
    ]

    // 如果任何一种检测方式返回 true，则认为被屏蔽
    this.isBlocked = checks.some(check => check)

    // 如果状态发生变化，通知回调
    if (wasBlocked !== this.isBlocked) {
      this.notifyCallbacks()
    }

    return this.isBlocked
  }

  /**
   * 检查可见性
   */
  private checkVisibility(): boolean {
    if (!this.element) return false

    const style = window.getComputedStyle(this.element)
    return (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) === 0
    )
  }

  /**
   * 检查元素尺寸
   */
  private checkDimensions(): boolean {
    if (!this.element) return false

    const rect = this.element.getBoundingClientRect()
    return rect.height === 0 || rect.width === 0
  }

  /**
   * 检查计算样式
   */
  private checkComputedStyle(): boolean {
    if (!this.element) return false

    const style = window.getComputedStyle(this.element)
    return (
      style.position === 'absolute' &&
      style.left === '-9999px'
    ) || (
        style.clip === 'rect(0px, 0px, 0px, 0px)' ||
        style.clipPath === 'inset(50%)'
      )
  }

  /**
   * 检查 offsetParent
   */
  private checkOffsetParent(): boolean {
    if (!this.element) return false

    return this.element.offsetParent === null &&
      window.getComputedStyle(this.element).position !== 'fixed'
  }

  /**
   * 检查类名是否被修改（某些广告拦截器会添加隐藏类）
   */
  private checkClassList(): boolean {
    if (!this.element) return false

    const hiddenClasses = [
      'adsbygoogle-noablate',
      'adblock-hide',
      'ad-blocked',
      'ublock-hide'
    ]

    return hiddenClasses.some(className =>
      this.element!.classList.contains(className)
    )
  }

  /**
   * 检查内部内容是否被清空
   */
  private checkInnerContent(): boolean {
    if (!this.element) return false

    // 检查是否内容被清空但元素仍然存在
    const hasVisibleContent = (
      this.element.children.length > 0 ||
      this.element.textContent?.trim()
    )

    const rect = this.element.getBoundingClientRect()
    const hasSize = rect.height > 0 && rect.width > 0

    return hasSize && !hasVisibleContent
  }

  /**
   * 设置 Intersection Observer
   */
  private setupIntersectionObserver() {
    if (!this.element || !window.IntersectionObserver) return

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === this.element) {
          // 如果元素在视口中但交集比例为0，可能被屏蔽
          if (entry.intersectionRatio === 0 && entry.boundingClientRect.height === 0) {
            this.checkBlocked()
          }
        }
      })
    }, {
      threshold: [0, 0.1, 1],
      rootMargin: '50px'
    })

    this.observer.observe(this.element)
  }

  /**
   * 设置 Mutation Observer 监听DOM变化
   */
  private setupMutationObserver() {
    if (!this.element || !window.MutationObserver) return

    this.mutationObserver = new MutationObserver(() => {
      this.checkBlocked()
    })

    this.mutationObserver.observe(this.element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true,
      subtree: true
    })
  }

  /**
   * 设置定期检查
   */
  private setupPeriodicCheck() {
    this.checkInterval = window.setInterval(() => {
      this.checkBlocked()
    }, 2000) // 每2秒检查一次
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners() {
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      setTimeout(() => this.checkBlocked(), 100)
    })

    // 监听页面滚动
    window.addEventListener('scroll', () => {
      setTimeout(() => this.checkBlocked(), 50)
    }, { passive: true })
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.isBlocked)
      } catch (error) {
        console.error('AdBlockDetector callback error:', error)
      }
    })
  }

  /**
   * 手动触发检测
   */
  public check(): boolean {
    return this.checkBlocked()
  }

  /**
   * 获取当前状态
   */
  public getIsBlocked(): boolean {
    return this.isBlocked
  }

  /**
   * 销毁检测器
   */
  public destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.callbacks = []
    this.element = null
  }
}

/**
 * 创建广告拦截检测器的工厂函数
 */
export function createAdBlockDetector(element: HTMLElement): AdBlockDetector {
  return new AdBlockDetector(element)
}

/**
 * 简单的广告拦截检测函数
 */
export function detectAdBlock(element: HTMLElement): Promise<boolean> {
  return new Promise((resolve) => {
    const detector = new AdBlockDetector(element)

    detector.onBlockedChange((isBlocked) => {
      resolve(isBlocked)
      detector.destroy()
    })

    // 如果2秒内没有检测到变化，返回当前状态
    setTimeout(() => {
      resolve(detector.getIsBlocked())
      detector.destroy()
    }, 2000)
  })
}
