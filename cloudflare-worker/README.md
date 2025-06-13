# 🌍🇨🇳 NIKKE CDK工具 - 统一Cloudflare Worker部署指南

这是一个合并版本的Cloudflare Worker，同时支持**国际服**和**国服**的CDK兑换功能，使用单一域名统一管理。

## 📋 功能特性

### 🌍 国际服支持
- **CDK兑换**: `/global/exchange` 或 `/api/global/exchange` (简化路径)
- **兑换历史**: `/global/history` 或 `/api/global/history` (简化路径)
- **向后兼容**: `/api/game/proxy/Game/RecordCdkRedemption` 等原有复杂路径
- **功能**: 代理国际服CDK兑换和历史查询
- **参数**: `{ cdkey, cookie }` 或 `{ cookie }`

### 🇨🇳 国服支持
- **验证码获取**: `/cn/captcha?aid=xxx`
- **CDK兑换**: `/cn/cdk/exchange`
- **日志记录**: `/cn/log` 
- **健康检查**: `/cn/health`

### 🔄 通用功能
- **根路径**: `/` - 服务状态和API文档
- **健康检查**: `/health` - 通用健康检查
- **CORS支持**: 完整的跨域请求支持

## 🚀 部署步骤

### 1. 创建Cloudflare Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名（如 `hayasa.org`）
3. 进入 **Workers & Pages** 标签
4. 点击 **Create Application** → **Create Worker**
5. 给Worker命名（如 `nikke-cdk-combined`）

### 2. 部署Worker代码

1. 复制 `Nikke-CDK-Combined.js` 中的完整代码
2. 粘贴到Cloudflare Worker编辑器中
3. 点击 **Save and Deploy**

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
  "cookie": "你的Cookie"
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
  baseURL: 'https://nikke-cdk.hayasa.org',  // 推荐：无/api后缀，使用简洁路径
  timeout: 10000,
  withCredentials: true
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

### 1. CORS错误
确保Worker代码中的CORS配置包含了所有必要的头部：
```javascript
'Access-Control-Allow-Headers': 'Content-Type, Cookie, x-auth-key, x-channel-type, x-language, x-common-params'
```

### 2. 路径不匹配
检查前端API调用路径是否正确：
- 国际服：`/global/exchange`, `/global/history` (推荐简化路径)
- 国服：`/cn/captcha`, `/cn/cdk/exchange`

### 3. 验证码问题
如果验证码获取失败，检查：
- aid参数是否正确传递
- 网络是否能访问腾讯验证码服务

## 📊 监控和日志

Worker提供了多个健康检查端点：

```bash
# 查看服务整体状态
curl https://nikke-cdk.hayasa.org/

# 检查国服功能
curl https://nikke-cdk.hayasa.org/cn/health

# 通用健康检查
curl https://nikke-cdk.hayasa.org/health
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
baseURL: 'https://nikke-cdk.hayasa.org/api'         // 国际服
baseURL: 'https://nikke-cdk-cn.hayasa.org'          // 国服

// 新配置 (统一)
baseURL: 'https://nikke-cdk.hayasa.org'             // 统一域名
```

## 📝 注意事项

1. **向后兼容**：合并Worker完全兼容现有API路径
2. **性能优化**：共享代码逻辑，减少冷启动时间
3. **成本节约**：减少Worker数量，降低Cloudflare费用
4. **监控简化**：单一入口，便于监控和日志分析

---

🎉 **恭喜！** 你现在拥有了一个统一管理国际服和国服CDK兑换的强大Worker！