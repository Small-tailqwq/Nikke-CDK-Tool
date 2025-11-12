# 🌍🇨🇳 NIKKE CDK工具 - 统一Cloudflare Worker部署指南

这是一个合并版本的Cloudflare Worker，同时支持**国际服**和**国服**的CDK兑换功能，使用单一域名统一管理。

## 📋 功能特性

### 🌍 国际服支持

- **CDK兑换**: `/global/exchange` 或 `/api/global/exchange` (简化路径)
- **兑换历史**: `/global/history` 或 `/api/global/history` (简化路径)
- **角色信息获取**: `/global/player-info` - 获取用户游戏角色信息
- **服务器区域列表**: `/global/region-list` - 获取服务器区域列表
- ~~**Cookie续期**: `/global/cookie-renewal` - 自动续期Cookie~~
- **登录状态检查**: `/global/check-login` - 检查登录状态

### 🇨🇳 国服支持

- **验证码获取**: `/cn/captcha?aid=xxx`
- **CDK兑换**: `/cn/cdk/exchange`
- **日志记录**: `/cn/log`
- **健康检查**: `/cn/health`

### 🔐 安全认证系统

- **官方代理登录**: `/login?sid=xxx` - 完整的登录助手页面
- **安全令牌认证**: `/api/auth/token-data` - 使用KV存储和三重加密的安全令牌
- **Cookie检查**: `/sess/{sid}/check-cookie` - 检测登录Cookie状态

### 🧪 诊断和调试工具

- **Cookie诊断页面**: `/debug/cookies` - 检测Cookie状态，支持一键发送到生产环境
- **会话Cookie诊断**: `/sess/{sid}/debug/cookies` - 指定会话的Cookie诊断
- **会话镜像反代**: `/sess/{sid}/x/{target}/{path}` - 完整的会话隔离反向代理系统

### 🔄 通用功能

- **根路径**: `/` - 服务状态和API文档
- **健康检查**: `/health` - 通用健康检查
- **CORS支持**: 完整的跨域请求支持（包括本地开发环境）
- **Service Worker**: `/sw.js` - 代理上游Service Worker

## 🚀 部署步骤

### 1. 创建Cloudflare Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名（如 `hayasa.org`）
3. 进入 **Workers & Pages** 标签
4. 点击 **Create Application** → **Create Worker**
5. 给Worker命名（如 `nikke-cdk-combined`）

### 2. 配置KV命名空间（必需）

Worker需要KV命名空间来存储安全令牌。在部署前需要先创建：

1. 在Cloudflare Dashboard中，进入 **Workers & Pages**
2. 点击 **KV** 标签
3. 点击 **Create namespace**
4. 输入名称：`TOKEN_KV`
5. 记录下命名空间的ID

### 3. 部署Worker代码

1. 复制 `Nikke-CDK-Combined.js` 中的完整代码
2. 粘贴到Cloudflare Worker编辑器中
3. 在Worker设置中，添加环境变量绑定：
   - **Variable name**: `TOKEN_KV`
   - **KV namespace**: 选择刚才创建的KV命名空间
4. 点击 **Save and Deploy**

### 3. 配置自定义域名

1. 在Worker设置中，找到 **Triggers** 标签
2. 点击 **Add Custom Domain**
3. 输入子域名：`nikke-cdk.hayasa.org`
4. 点击 **Add Custom Domain**

### 4. 验证部署

访问以下URL验证部署是否成功：

```bash
# 服务状态检查
curl https://nikke-cdk.hayasa.org/

# 国服健康检查
curl https://nikke-cdk.hayasa.org/cn/health

# 通用健康检查
curl https://nikke-cdk.hayasa.org/health
```

## 🔗 API接口文档

### 国际服CDK兑换

```http
POST https://nikke-cdk.hayasa.org/global/exchange
Content-Type: application/json

{
  "cdkey": "你的CDK",
  "cookie": "你的Cookie"
}
```

### 国际服兑换历史

```http
POST https://nikke-cdk.hayasa.org/global/history
Content-Type: application/json

{
  "cookie": "你的Cookie",
  "page_num": 1,  // 可选，页码
  "page_size": 20  // 可选，每页数量
}
```

### 国际服角色信息获取

```http
POST https://nikke-cdk.hayasa.org/global/player-info
Content-Type: application/json

{
  "cookie": "你的Cookie",
  "payload": {
    // 游戏特定的请求参数
  }
}
```

### 国际服服务器区域列表

```http
POST https://nikke-cdk.hayasa.org/global/region-list
Content-Type: application/json

{
  "cookie": "你的Cookie",
  "game_id": "29080"
}
```

### Cookie续期

```http
POST https://nikke-cdk.hayasa.org/global/cookie-renewal
Content-Type: application/json

{
  "cookie": "旧Cookie字符串",
  "requestBody": {
    // 登录请求体
  }
}
```

### 安全令牌认证

```http
POST https://nikke-cdk.hayasa.org/api/auth/token-data
Content-Type: application/json

{
  "token": "安全令牌"
}
```

### 国服验证码获取

```http
GET https://nikke-cdk.hayasa.org/cn/captcha?aid=210001040.123456789
```

### 国服CDK兑换

```http
POST https://nikke-cdk.hayasa.org/cn/cdk/exchange
Content-Type: application/json

{
  "sPassword": "你的CDK",
  "sCode": "验证码",
  "role_id": "角色ID",
  "area_id": "区服ID",
  // ... 其他游戏参数
}
```

## 🔧 前端配置

确保你的前端应用中的 `src/utils/api.js` 文件配置正确：

```javascript
const api = axios.create({
  baseURL: 'https://nikke-cdk.hayasa.org', // 推荐：无/api后缀，使用简洁路径
  timeout: 10000,
  withCredentials: true,
})

// 或者保持兼容（但不推荐）：
// baseURL: 'https://nikke-cdk.hayasa.org/api'  // 兼容模式，会自动添加/api前缀
```

## ⚡ 优势对比

### 使用合并Worker前

- 需要两个独立的Worker
- 需要两个不同的域名或子域名
- 分别管理和维护
- 增加部署复杂度

### 使用合并Worker后

- ✅ 单一Worker统一管理
- ✅ 单一域名简化配置
- ✅ 共享CORS和错误处理逻辑
- ✅ 减少运维成本
- ✅ 统一的健康检查和监控

## 🛠️ 故障排除

### 1. KV命名空间配置错误

如果遇到令牌认证失败，检查：

- KV命名空间 `TOKEN_KV` 是否已创建
- Worker环境变量绑定是否正确
- KV命名空间ID是否与绑定一致

### 2. CORS错误

确保Worker代码中的CORS配置包含了所有必要的头部：

```javascript
'Access-Control-Allow-Headers': 'Content-Type, Cookie, X-Forwarded-Cookie, x-auth-key, x-channel-type, x-language, x-common-params'
```

### 3. 路径不匹配

检查前端API调用路径是否正确：

- 国际服：`/global/exchange`, `/global/history`, `/global/player-info`, `/global/region-list`
- 国服：`/cn/captcha`, `/cn/cdk/exchange`
- 安全认证：`/api/auth/token-data`
- 登录助手：`/login?sid=xxx`

### 4. 验证码问题

如果验证码获取失败，检查：

- aid参数是否正确传递
- 网络是否能访问腾讯验证码服务

### 5. 会话镜像代理问题

如果会话镜像代理失败，检查：

- SID格式是否正确（6-40位字母数字）
- 目标服务是否在 `SESSION_TARGETS` 映射中
- 路径是否包含重复的前缀

## 📊 监控和日志

Worker提供了多个健康检查端点：

```bash
# 查看服务整体状态（包含所有API文档）
curl https://nikke-cdk.hayasa.org/

# 检查国服功能
curl https://nikke-cdk.hayasa.org/cn/health

# 通用健康检查
curl https://nikke-cdk.hayasa.org/health

# 诊断工具 - 检查Cookie状态
curl https://nikke-cdk.hayasa.org/debug/cookies

# 会话Cookie诊断
curl https://nikke-cdk.hayasa.org/sess/test-sid-12345/debug/cookies
```

## 🔄 迁移指南

### 从分离的Workers迁移

1. **备份现有配置**：记录当前Worker的配置
2. **部署合并Worker**：按照上述步骤部署新Worker
3. **更新DNS配置**：将域名指向新Worker
4. **测试功能**：验证国际服和国服功能都正常
5. **删除旧Workers**：确认新Worker稳定后删除旧的

### 前端代码更新

如果你的前端使用了不同的baseURL，需要统一更新为：

```javascript
// 旧配置
baseURL: 'https://nikke-cdk.hayasa.org/api' // 国际服
baseURL: 'https://nikke-cdk-cn.hayasa.org' // 国服

// 新配置 (统一)
baseURL: 'https://nikke-cdk.hayasa.org' // 统一域名
```

## 📝 注意事项

1. **KV命名空间必需**：安全令牌系统需要配置 `TOKEN_KV` KV命名空间
2. **向后兼容**：合并Worker完全兼容现有API路径
3. **安全特性**：
   - 使用三重加密（SID + Token + Salt）保护Cookie数据
   - 令牌有效期5分钟，一次性使用
   - 会话隔离的Cookie路径
4. **性能优化**：共享代码逻辑，减少冷启动时间
5. **成本节约**：减少Worker数量，降低Cloudflare费用
6. **监控简化**：单一入口，便于监控和日志分析
7. **会话镜像**：支持完整的会话隔离反向代理，用于官方登录流程

---

🎉 **恭喜！** 你现在拥有了一个统一管理国际服和国服CDK兑换的强大Worker！
