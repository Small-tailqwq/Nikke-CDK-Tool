/**
 * CDK广告注入器
 * 单文件实现，避免污染主要代码
 * 
 * 功能特性：
 * - 用户无筛选时显示广告，有筛选时隐藏广告（减少侵入性）
 * - 可手动关闭广告，关闭状态持久化
 * - 支持广告屏蔽器识别和屏蔽
 */

// 广告配置
const AD_CONFIG = {
  // 广告基本信息
  id: 'github_sponsor_ad',
  name: '试试Doro helper',
  description: '全网最好的pc端收菜助手\n（作者自己说的）',
  image: 'announcement-images/DoroHelper.webp',
  status: '广告',

  // 跳转链接
  githubUrl: 'https://github.com/1204244136/DoroHelper',

  // 广告标识（用于广告屏蔽插件识别）
  adBlockerClass: 'ad-banner advertisement google-ad adsense-ad',

  // 本地存储键名
  storageKey: 'nikke_cdk_ad_closed',

  // 广告显示控制
  showAd: true,
  closeable: false
}

/**
 * 检查广告是否被用户关闭
 */
function isAdClosed() {
  try {
    return localStorage.getItem(AD_CONFIG.storageKey) === 'true'
  } catch (e) {
    return false
  }
}

/**
 * 设置广告为已关闭状态
 */
function closeAd() {
  try {
    localStorage.setItem(AD_CONFIG.storageKey, 'true')
    // 触发自定义事件通知组件更新
    window.dispatchEvent(new CustomEvent('adClosed', { detail: { adId: AD_CONFIG.id } }))
  } catch (e) {
    console.warn('无法保存广告关闭状态')
  }
}

/**
 * 创建广告数据对象
 */
function createAdData() {
  // 处理描述文本：支持数组格式和字符串格式
  let noteText = ''
  if (Array.isArray(AD_CONFIG.description)) {
    // 数组格式：每个元素为一行
    noteText = AD_CONFIG.description.join('<br/>')
  } else if (typeof AD_CONFIG.description === 'string') {
    // 字符串格式：将换行符转换为 <br/> 标签
    noteText = AD_CONFIG.description.replace(/\n/g, '<br/>')
  }

  return {
    // 标识这是一个广告
    type: 'ad',
    adId: AD_CONFIG.id,

    // 模拟CDK组合结构
    groupId: AD_CONFIG.id,
    groupName: AD_CONFIG.name,
    // 处理后的描述文本，支持HTML换行
    note: noteText,
    image: AD_CONFIG.image,
    status: AD_CONFIG.status,

    // 广告特有属性
    isAd: true,
    githubUrl: AD_CONFIG.githubUrl,
    closeable: AD_CONFIG.closeable,
    adBlockerClass: AD_CONFIG.adBlockerClass,

    // 空的CDK数组（符合组合结构）
    cdks: [],

    // 添加一些元数据
    meta: {
      created: new Date().toISOString(),
      type: 'sponsor'
    }
  }
}

/**
 * 注入广告到CDK列表
 * @param {Array} cdkList - 原始CDK列表
 * @returns {Array} - 注入广告后的CDK列表
 */
function injectAd(cdkList) {
  // 如果广告被关闭，直接返回原列表
  if (isAdClosed()) {
    return cdkList
  }

  // 如果配置禁用广告，直接返回原列表
  if (!AD_CONFIG.showAd) {
    return cdkList
  }

  // 创建广告数据
  const adData = createAdData()

  // 将广告插入到列表第一位
  return [adData, ...cdkList]
}

/**
 * 处理广告点击事件
 */
function handleAdClick() {
  // 在新标签页打开GitHub链接
  window.open(AD_CONFIG.githubUrl, '_blank', 'noopener,noreferrer')

  // 可以在这里添加统计代码
  console.log('广告被点击:', AD_CONFIG.githubUrl)
}

/**
 * 处理广告关闭事件
 */
function handleAdClose(event) {
  // 阻止事件冒泡，避免触发卡片点击
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }

  closeAd()
  console.log('广告已关闭')
}

/**
 * 检查是否为广告数据
 * @param {Object} item - 数据项
 * @returns {boolean} - 是否为广告
 */
function isAdData(item) {
  return item && (item.type === 'ad' || item.isAd === true)
}

/**
 * 获取广告状态样式类
 */
function getAdStatusClass() {
  return 'status-ad'
}

/**
 * 初始化广告注入器
 * 设置全局事件监听等
 */
function initAdInjector() {
  // 监听广告关闭事件
  window.addEventListener('adClosed', (event) => {
    console.log('收到广告关闭事件:', event.detail)
  })

  // 检测广告屏蔽器
  const testAd = document.createElement('div')
  testAd.className = 'advertisement'
  testAd.style.position = 'absolute'
  testAd.style.left = '-9999px'
  testAd.style.width = '1px'
  testAd.style.height = '1px'
  document.body.appendChild(testAd)

  setTimeout(() => {
    if (testAd.offsetHeight === 0) {
      console.log('检测到广告屏蔽器')
      // 广告被屏蔽，可以在这里处理相关逻辑
    }
    document.body.removeChild(testAd)
  }, 100)
}

// 导出API
export {
  injectAd,
  handleAdClick,
  handleAdClose,
  isAdData,
  getAdStatusClass,
  isAdClosed,
  closeAd,
  initAdInjector,
  AD_CONFIG
}

// 自动初始化
if (typeof window !== 'undefined') {
  initAdInjector()
}