/// <reference types="vite/client" />

// -------------------------------------
// 动态计算「同源」地址
// -------------------------------------
// 使用绝对路径，避免受路由影响
const LOCAL_PREFIX = '/Nikke-CDK-Tool/';

const sources: string[] = [
  `${LOCAL_PREFIX}public/cdk-list.json`,                                    // GitHub Pages 同源
  'https://cdn.jsdelivr.net/gh/Small-tailqwq/Nikke-CDK-Tool@masrer/public/cdk-list.json',
  'https://nikke-cdk-list.hayasa.org/api/',                                 // Cloudflare Worker
];

// -------------------------------------
// 主函数
// -------------------------------------
export async function fetchCdkList(): Promise<{ cdks: CDK[] }> {
  // 给每条请求 3 秒超时，互不影响
  const tryFetch = (url: string) =>
    new Promise<Response>((resolve, reject) => {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 3000);

      fetch(url, {
        signal: ctrl.signal,
        cache: 'no-cache',
        headers: { Accept: 'application/json' },
      })
        .then((r) => {
          clearTimeout(tm);
          r.ok ? resolve(r) : reject(new Error(`HTTP ${r.status}`));
        })
        .catch((e) => {
          clearTimeout(tm);
          reject(e);
        });
    });

  // 顺序尝试
  for (const url of sources) {
    try {
      console.debug(`[CDK] fetch → ${url}`);
      const res = await tryFetch(url);
      const json = await res.json();

      if (!json || !Array.isArray(json.cdks))
        throw new Error('数据结构不对');

      return json; // ✅ 成功返回
    } catch (e) {
      console.warn(`[CDK] 源失败: ${url}`, e);
      // 继续下一个
    }
  }
  throw new Error('所有 CDK 源都无法访问');
}

// -------------------------------------
// 类型
// -------------------------------------
export interface CDK {
  code: string;
  name?: string;
  status: '可用' | '已过期';
  servers: Array<'global' | 'tw' | 'cn'>;
  reward?: string;
  note?: string;
  author?: string;
  image?: string;
}
