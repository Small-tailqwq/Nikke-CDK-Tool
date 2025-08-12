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
