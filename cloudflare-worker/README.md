# Nikke CDK Cloudflare Workers

本项目包含 Cloudflare Worker，用于优化 NIKKE CDK 工具的使用体验：

**CDK 兑换代理** (`Nikke-CDK.js`)
- 处理 CORS 跨域问题
- 转发 CDK 兑换请求到游戏服务器
- 统一错误处理和响应格式

> **⚠️ 弃用说明**  
> ~~CDK 公告加速~~ (`Nikke-CDK-list.js`) - 已弃用  
> CDK 公告 JSON 现已通过其他途径实现加速访问，无需再使用 Cloudflare Worker 缓存机制。

---

## 目录
1. [功能概览](#功能概览)
2. [快速部署](#快速部署)
3. [接口说明](#接口说明)
4. [开发说明](#开发说明)

---

## 功能概览

### CDK 兑换代理 (`/api/exchange`)

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/exchange` | `POST` | 兑换 CDK<br>• 需要 `cdkey` 和 `cookie`<br>• 自动处理 CORS 和请求头 |
| 任意路径 | `OPTIONS` | CORS 预检请求 |

### ~~CDK 公告加速~~ (已弃用)

| 路径 | 方法 | 说明 |
|------|------|------|
| ~~`/api/`~~ | ~~`GET`~~ | ~~获取最新 `cdk-list.json`~~ **已弃用** |
| ~~`/api/refresh`~~ | ~~`POST`~~ | ~~手动刷新缓存~~ **已弃用** |

> CDK 公告 JSON 文件现已通过其他方式实现加速访问，相关缓存功能已停用。

---

## 快速部署

### 1. 准备工作

1. Fork/克隆本仓库
2. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. 登录 Cloudflare：`wrangler login`

### 2. 部署 CDK 兑换代理

1. 部署 Worker
   ```bash
   wrangler deploy --name nikke-cdk-proxy
   ```

2. 配置自定义域名（可选）
   - 在 Cloudflare Dashboard 中绑定域名
   - 更新前端 API 地址

### ~~3. 部署 CDK 公告加速~~ (已弃用)

~~原 CDK 公告加速功能已弃用，无需部署相关组件：~~
- ~~KV Namespace 创建~~
- ~~REFRESH_KEY 环境变量设置~~
- ~~GitHub Actions 缓存刷新集成~~

---

## 接口说明

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

### ~~CDK 公告加速~~ (已弃用)

~~以下接口已停用：~~

#### ~~GET `/api/`~~
- ~~返回：`cdk-list.json` 内容~~
- ~~缓存：Edge 1天，KV 1小时~~

#### ~~POST `/api/refresh`~~
- ~~请求头：`X-Auth-Key: <REFRESH_KEY>`~~
- ~~返回：`OK` 或错误信息~~

> **替代方案**：CDK 公告数据现已通过其他加速服务提供，无需手动缓存管理。

---

## 开发说明

### 当前功能

主要功能现在集中在 CDK 兑换代理，核心代码在 `Nikke-CDK.js`：

```js
// CORS 处理
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

// 兑换请求处理
async function handleExchange(request) {
  const { cdkey, cookie } = await request.json()
  // 转发到游戏服务器...
}
```

### 自定义配置

1. 限制 CORS
   - 将 `'*'` 改为域名白名单
   - 在 `corsHeaders` 中配置

2. 添加新功能
   - 在 `fetch` 函数中添加路由
   - 实现对应的处理函数

### ~~缓存策略调整~~ (已弃用)

~~以下缓存相关配置已不再使用：~~
- ~~Edge 缓存时间配置~~
- ~~KV 缓存时间配置~~
- ~~GitHub Actions 集成~~

---

Enjoy ！