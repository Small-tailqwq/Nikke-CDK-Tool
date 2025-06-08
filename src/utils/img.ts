// 图片 URL 缓存
const IMAGE_CACHE_KEY = 'nikke_cdk_image_url_cache'
const IMAGE_CACHE_VERSION = '1'

// 从缓存加载图片 URL
const loadImageUrlCache = () => {
  try {
    const cache = localStorage.getItem(IMAGE_CACHE_KEY)
    if (cache) {
      const { version, urls } = JSON.parse(cache)
      if (version === IMAGE_CACHE_VERSION) {
        console.log('📸 从缓存加载图片URL:', Object.keys(urls).length, '个URL')
        return urls
      }
    }
  } catch (e) {
    console.error('❌ 读取图片URL缓存失败:', e)
  }
  console.log('📸 无缓存或缓存版本不匹配')
  return {}
}

// 保存图片 URL 到缓存
const saveImageUrlCache = (urls: Record<string, string>) => {
  try {
    const cache = {
      version: IMAGE_CACHE_VERSION,
      urls
    }
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache))
    console.log('💾 保存图片URL到缓存:', Object.keys(urls).length, '个URL')
  } catch (e) {
    console.error('❌ 保存图片URL缓存失败:', e)
  }
}

// 图片 URL 缓存
const imageUrlCache = loadImageUrlCache()

/**
 * 图片加载失败时自动使用代理
 * @param src 原始图片URL
 * @param proxyBase 代理服务器基础URL
 * @returns Promise<string> 最终可用的图片URL
 */
export function safeImg(src: string, proxyBase = 'https://images.weserv.nl/?url=') {
  return new Promise<string>((resolve) => {
    // 检查缓存
    if (imageUrlCache[src]) {
      console.log('🎯 缓存命中:', src)
      resolve(imageUrlCache[src])
      return
    }

    console.log('🔄 尝试加载图片:', src)
    const img = new Image()
    img.onload = () => {
      console.log('✅ 图片加载成功:', src)
      // 保存到缓存
      imageUrlCache[src] = src
      saveImageUrlCache(imageUrlCache)
      resolve(src)
    }
    img.onerror = () => {
      const proxyUrl = proxyBase + encodeURIComponent(src)
      console.log('⚠️ 图片加载失败，使用代理:', proxyUrl)
      // 保存到缓存
      imageUrlCache[src] = proxyUrl
      saveImageUrlCache(imageUrlCache)
      resolve(proxyUrl)
    }
    img.src = src
  })
} 