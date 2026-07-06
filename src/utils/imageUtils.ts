/**
 * 图片处理工具函数
 * 统一处理CDK卡片中的图片URL和响应式图片
 */

/**
 * 将原始图片路径转换为缩略图路径
 */
function getThumbPath(localPath: string): string {
  if (!localPath) return ''
  
  // 如果已经是缩略图路径，直接返回
  if (localPath.includes('thumbs/')) {
    return localPath
  }
  
  // 如果是announcement-images下的图片，转换为缩略图路径
  if (localPath.startsWith('announcement-images/')) {
    const filename = localPath.replace('announcement-images/', '')
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '') // 移除扩展名
    return `announcement-images/thumbs/${nameWithoutExt}_thumb.webp`
  }
  
  return localPath
}

/**
 * 拼接完整的图片 URL
 */
export function getImageUrl(localPath: string): string {
  if (!localPath) return ''
  
  // 转换为缩略图路径
  const thumbPath = getThumbPath(localPath)
  
  return `${import.meta.env.BASE_URL}${
    thumbPath.startsWith('/') ? thumbPath.substring(1) : thumbPath
  }`
}

/**
 * 生成响应式图片srcset
 */
export function getImageSrcset(localPath: string): string {
  if (!localPath) return ''
  
  // 转换为缩略图路径
  const thumbPath = getThumbPath(localPath)
  
  // 如果是缩略图路径，生成1x和2x版本
  if (thumbPath.includes('thumbs/') && thumbPath.includes('_thumb.webp')) {
    const basePath = thumbPath.replace('_thumb.webp', '')
    const thumb1x = `${basePath}_thumb.webp`
    const thumb2x = `${basePath}_thumb@2x.webp`
    
    return `${getImageUrl(thumb1x)} 1x, ${getImageUrl(thumb2x)} 2x`
  }
  
  // 否则只返回单一路径
  return getImageUrl(thumbPath)
}

/**
 * 将缩略图路径反推为原始图片路径
 */
function getOriginalPath(localPath: string): string {
  if (!localPath) return ''

  // 如果是 thumbs 路径，反推原图
  if (localPath.includes('thumbs/')) {
    const filename = localPath.split('thumbs/').pop() || ''
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').replace(/_thumb(@2x)?$/, '')
    return `announcement-images/${nameWithoutExt}.webp`
  }

  return localPath
}

/**
 * 获取原始（全尺寸）图片 URL，用于大图预览
 */
export function getOriginalImageUrl(localPath: string): string {
  if (!localPath) return ''

  const originalPath = getOriginalPath(localPath)
  return `${import.meta.env.BASE_URL}${
    originalPath.startsWith('/') ? originalPath.substring(1) : originalPath
  }`
}

/**
 * 将图片路径转换为中等尺寸图片路径（大图查看器优化）
 */
function getMediumPath(localPath: string): string {
  if (!localPath) return ''

  // 如果已经是中等尺寸路径，直接返回
  if (localPath.includes('medium/')) {
    return localPath
  }

  // 从任何路径提取基础文件名
  let filename = localPath
  // 移除目录前缀（如 announcement-images/ 或 announcement-images/thumbs/）
  const parts = filename.split('/')
  const fileWithExt = parts[parts.length - 1]
  const nameWithoutExt = fileWithExt.replace(/\.[^/.]+$/, '').replace(/_thumb(@2x)?$/, '')

  return `announcement-images/medium/${nameWithoutExt}_medium.webp`
}

/**
 * 获取中等尺寸图片 URL，用于大图查看器
 */
export function getMediumImageUrl(localPath: string): string {
  if (!localPath) return ''

  const mediumPath = getMediumPath(localPath)
  return `${import.meta.env.BASE_URL}${
    mediumPath.startsWith('/') ? mediumPath.substring(1) : mediumPath
  }`
}

/**
 * 生成中等尺寸图片的 srcset
 */
export function getMediumImageSrcset(localPath: string): string {
  if (!localPath) return ''

  const mediumPath = getMediumPath(localPath)
  if (mediumPath.includes('medium/') && mediumPath.includes('_medium.webp')) {
    const basePath = mediumPath.replace('_medium.webp', '')
    const m1x = `${basePath}_medium.webp`
    const m2x = `${basePath}_medium@2x.webp`
    return `${getMediumImageUrl(m1x)} 1x, ${getMediumImageUrl(m2x)} 2x`
  }

  return getMediumImageUrl(mediumPath)
}

/**
 * 组合图片属性，用于统一的图片显示
 */
export function getImageProps(imagePath: string, altText: string = '图片') {
  return {
    src: getImageUrl(imagePath),
    srcset: getImageSrcset(imagePath),
    alt: altText,
    loading: 'lazy' as const
  }
}
