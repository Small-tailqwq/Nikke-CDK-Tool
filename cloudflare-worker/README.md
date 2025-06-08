# Nikke CDK Cloudflare Workers

本项目包含两个 Cloudflare Worker，用于优化 NIKKE CDK 工具的使用体验：

1. **CDK 公告加速** (`Nikke-CDK-list.js`)
   - 让 CDK 公告 JSON 在中国大陆也能正常打开
   - 自动刷新 + GitHub Actions 触发刷新
   - 多级缓存：GitHub Raw → Edge Cache → KV → 浏览器

2. **CDK 兑换代理** (`Nikke-CDK.js`)
   - 处理 CORS 跨域问题
   - 转发 CDK 兑换请求到游戏服务器
   - 统一错误处理和响应格式

---

## 目录
1. [功能概览](#功能概览)
2. [快速部署](#快速部署)
   1. [准备工作](#1-准备工作)
   2. [部署 CDK 公告加速](#2-部署-cdk-公告加速)
   3. [部署 CDK 兑换代理](#3-部署-cdk-兑换代理)
3. [接口说明](#接口说明)
4. [开发说明](#开发说明)

---

## 功能概览

### CDK 公告加速 (`/api/`)

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/` | `GET` | 获取最新 `cdk-list.json`<br>• 优先从 KV 读取（≈50-150ms）<br>• 后台异步更新 KV（1h 过期） |
| `/api/refresh` | `POST` | 手动刷新缓存<br>• 需要 `X-Auth-Key` 请求头<br>• 用于 GitHub Actions 触发刷新 |

### CDK 兑换代理 (`/api/exchange`)

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/exchange` | `POST` | 兑换 CDK<br>• 需要 `cdkey` 和 `cookie`<br>• 自动处理 CORS 和请求头 |
| 任意路径 | `OPTIONS` | CORS 预检请求 |

---

## 快速部署

### 1. 准备工作

1. Fork/克隆本仓库
2. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. 登录 Cloudflare：`wrangler login`

### 2. 部署 CDK 公告加速

1. 创建 KV Namespace
   ```bash
   # 创建命名空间
   wrangler kv:namespace create "CDK_JSON"
   # 获取 ID 后，在 wrangler.toml 中配置
   ```

2. 设置环境变量
   ```bash
   # 生成刷新密钥
   openssl rand -hex 16
   # 在 Cloudflare Dashboard 或 wrangler.toml 中设置 REFRESH_KEY
   ```

3. 部署 Worker
   ```bash
   wrangler deploy --name nikke-cdk-list
   ```

### 3. 部署 CDK 兑换代理

1. 部署 Worker
   ```bash
   wrangler deploy --name nikke-cdk-proxy
   ```

2. 配置自定义域名（可选）
   - 在 Cloudflare Dashboard 中绑定域名
   - 更新前端 API 地址

---

## 接口说明

### CDK 公告加速

#### GET `/api/`
- 返回：`cdk-list.json` 内容
- 缓存：Edge 1天，KV 1小时
- 示例：
  ```js
  fetch('https://your-worker.workers.dev/api/')
    .then(r => r.json())
    .then(console.log)
  ```

#### POST `/api/refresh`
- 请求头：`X-Auth-Key: <REFRESH_KEY>`
- 返回：`OK` 或错误信息
- 用途：GitHub Actions 发布后刷新缓存

### CDK 兑换代理

#### POST `/api/exchange`
- 请求体：
  ```json
  {
    "cdkey": "YOUR-CDK",
    "cookie": "YOUR-COOKIE"
  }
  ```
- 返回：游戏服务器原始响应
- 错误码：
  - 400：缺少参数
  - 403：CORS 错误
  - 500：服务器错误

---

## 开发说明

### 缓存策略调整

```js
// Edge 缓存时间（秒）
fetch(url, { cf: { cacheTtl: 86400 } })  // 1天

// KV 缓存时间（秒）
await kv.put('key', value, { expirationTtl: 3600 })  // 1小时
```

### 自定义配置

1. 更换上游源
   - 修改 `GITHUB_RAW` 常量
   - 更新 `FIXED_HEADERS` 配置

2. 限制 CORS
   - 将 `'*'` 改为域名白名单
   - 在 `corsHeaders` 中配置

3. 添加新功能
   - 在 `fetch` 函数中添加路由
   - 实现对应的处理函数

### GitHub Actions 集成

```yaml
- name: 刷新缓存
  if: steps.cdk_changed.outputs.changed == 'true'
  run: |
    curl -sSf -X POST \
      -H "X-Auth-Key: ${{ secrets.WORKER_REFRESH }}" \
      https://your-worker.workers.dev/api/refresh
```

---

Enjoy ！