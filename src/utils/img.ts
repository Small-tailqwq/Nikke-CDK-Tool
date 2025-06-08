/**
 * 图片加载失败时自动使用代理
 * @param src 原始图片URL
 * @param proxyBase 代理服务器基础URL
 * @returns Promise<string> 最终可用的图片URL
 */
export function safeImg(src: string, proxyBase = 'https://images.weserv.nl/?url=') {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);              // 能加载 → 原图
    img.onerror = () => resolve(proxyBase + encodeURIComponent(src)); // 失败 → 代理
    img.src = src;
  });
} 