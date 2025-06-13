// 通用的自定义消息工具函数
export const showCustomMessage = (message: string = 'CDK已复制到剪贴板', type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
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
  // 移除已存在的消息（避免重复）
  const existingMessages = document.querySelectorAll('.custom-copy-message')
  existingMessages.forEach((msg) => msg.remove())

  // 创建自定义消息元素
  const messageEl = document.createElement('div')
  messageEl.className = 'custom-copy-message'
  messageEl.innerHTML = `
    <div style="
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
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
        font-weight: bold;
      ">${icon}</span>
      <span>${message}</span>
    </div>
  `

  // 设置消息容器样式（包含移动端适配）
  const isMobile = window.innerWidth <= 768
  Object.assign(messageEl.style, {
    position: 'fixed',
    top: isMobile ? '16px' : '20px',
    right: isMobile ? '16px' : '20px',
    left: isMobile ? '16px' : 'auto',
    zIndex: '2147483647', // 使用最大z-index值
    opacity: '0',
    transform: isMobile ? 'translateY(-100%)' : 'translateX(100%)',
    transition: 'all 0.3s ease',
    pointerEvents: 'none',
  })

  // 添加到body
  document.body.appendChild(messageEl)

  // 立即显示
  requestAnimationFrame(() => {
    messageEl.style.opacity = '1'
    messageEl.style.transform = isMobile ? 'translateY(0)' : 'translateX(0)'
  })

  // 3秒后自动移除
  setTimeout(() => {
    messageEl.style.opacity = '0'
    messageEl.style.transform = isMobile
      ? 'translateY(-100%)'
      : 'translateX(100%)'
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl)
      }
    }, 300)
  }, 3000)
} 