# 环境变量配置说明

## 快速配置测试环境

项目现在支持通过环境变量配置API地址，实现了**统一的配置入口**，方便在不同环境间切换。

## ✅ 统一配置

所有API请求（包括主要API和BlablaLink认证API）都使用同一个环境变量 `VITE_API_BASE_URL`，彻底避免了多处硬编码的问题。

### 配置步骤

1. **创建环境变量文件**:
   - `.env.local` - 本地开发专用


2. **添加配置内容**:
```bash
# API服务器地址
VITE_API_BASE_URL=https://nikke-cdk-test.hayasa.org
```

### 环境变量列表

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_BASE_URL` | API服务器基础地址 | `https://nikke-cdk.hayasa.org` |

### 示例配置

**测试环境** (`.env.local`):
```bash
VITE_API_BASE_URL=https://nikke-cdk-test.hayasa.org
```

### 涉及的API模块

✅ **主要API** (`src/utils/api.js`)：CDK兑换、历史记录等
✅ **BlablaLink认证API** (`src/utils/blablalink-auth.js`)：用户认证、续签等

### 使用说明

1. 修改代码后，先在测试环境验证
2. 确认无误后，部署Worker到生产环境
3. 修改环境变量为生产地址
4. 发布前端代码

### 优势

- 🎯 **统一入口**：只需配置一个环境变量
- 🔧 **便于调试**：clone项目后只需一个配置文件
- 🚀 **环境切换**：开发/测试/生产环境一键切换
- 📦 **Git友好**：环境变量文件不会意外提交

### 注意事项

- 环境变量文件不应提交到Git
- 变量名必须以 `VITE_` 开头
- 修改环境变量后需要重启开发服务器 