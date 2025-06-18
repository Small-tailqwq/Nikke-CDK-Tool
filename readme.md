# Nikke CDK Tool

一个用于管理《胜利女神：NIKKE》CDK 的现代化工具网站，支持国际服、国服、港澳台服多服务器CDK兑换。

## ✨ 功能特性

### 🎯 核心功能
- **CDK 公告展示** - 支持单个CDK和CDK组合的智能展示
- **多服务器兑换** - 国际服、国服、港澳台服 CDK 兑换支持
- **用户管理** - 支持多账号管理，自动角色信息获取
- **兑换历史** - 完整的兑换记录追踪，本地与云端同步

### 🔧 高级特性
- **批量操作** - 支持CDK组合的批量选择和兑换
- **主题系统** - 明暗主题切换，系统自适应
- **响应式设计** - 完美适配桌面端和移动端
- **离线支持** - 核心功能支持离线使用
- **安全保护** - Cookie 本地存储，用户隐私保护

## 🏗️ 技术栈

### 前端框架
- **Vue 3** - 响应式前端框架
- **Vite** - 现代化构建工具
- **Element Plus** - 企业级UI组件库
- **Pinia** - 下一代状态管理库
- **Vue Router** - 官方路由管理器
- **SCSS** - CSS预处理器

### 后端服务
- **Cloudflare Workers** - 边缘计算API代理
- **GitHub Pages** - 静态网站托管
- **GitHub Actions** - CI/CD自动化部署

### 开发工具
- **TypeScript** - 类型安全的JavaScript
- **ESLint** - 代码质量检查
- **Sharp** - 高性能图像处理
- **Axios** - HTTP客户端库

## 📁 项目目录结构

```text
Nikke-CDK-Tool/
├── 📁 src/                          # 前端源代码
│   ├── 📁 components/               # Vue 组件
│   │   ├── BlablaAuthStatus.vue     # 认证状态组件
│   │   ├── CDKGroupCard.vue         # CDK组合卡片
│   │   ├── DoroSummonAnimation.vue  # 多萝召唤动画
│   │   ├── FloatingDoro.vue         # 浮动多萝组件
│   │   ├── TextDestructionEffect.vue # 文字毁灭特效
│   │   └── UserDialog.vue           # 用户管理对话框
│   │
│   ├── 📁 views/                    # 页面组件
│   │   ├── About.vue                # 关于页面
│   │   ├── CdkAnnouncement.vue      # CDK公告页面
│   │   ├── CdkExchange.vue          # CDK兑换页面
│   │   ├── ExchangeHistory.vue      # 兑换历史页面
│   │   └── UserManagement.vue       # 用户管理页面
│   │
│   ├── 📁 stores/                   # 状态管理
│   │   ├── exchange.js              # CDK兑换状态
│   │   ├── nav.ts                   # 导航状态
│   │   ├── theme.js                 # 主题状态
│   │   └── user.js                  # 用户状态
│   │
│   ├── 📁 utils/                    # 工具函数
│   │   ├── api.js                   # API接口封装
│   │   ├── blablalink-auth.js       # 认证相关工具
│   │   ├── browser-cookie.js        # 浏览器Cookie工具
│   │   ├── cookie.js                # Cookie管理
│   │   ├── cookie-test.js           # Cookie测试工具
│   │   ├── customMessage.ts         # 自定义消息组件
│   │   ├── fetchCdk.ts              # CDK数据获取
│   │   ├── serverUtils.js           # 服务器工具函数
│   │   └── storage.js               # 本地存储管理
│   │
│   ├── 📁 assets/                   # 静态资源
│   │   ├── doro_icon.png            # 多萝图标
│   │   └── theme.scss               # 主题样式
│   │
│   ├── 📁 router/                   # 路由配置
│   │   └── index.js                 # 路由定义
│   │
│   ├── App.vue                      # 根组件
│   └── main.js                      # 应用入口
│
├── 📁 public/                       # 静态资源目录
│   ├── cdk-list.source.json         # 【重要】CDK数据源文件
│   ├── cdk-list.json                # (自动生成) 构建后的CDK列表
│   └── announcement-images/         # CDK公告图片
│
├── 📁 tools/                        # 开发工具 (不会部署)
│   └── cdk-manager.html             # CDK数据管理工具
│
├── 📁 cloudflare-worker/            # Worker代码 (不会部署)
│   ├── Nikke-CDK-Combined.js        # 统一Worker
│   ├── Nikke-CDK.js                 # CDK兑换代理
│   ├── Nikke-CDK-list.js            # CDK列表加速
│   └── README.md                    # Worker文档
│
├── 📁 scripts/                      # 构建脚本 (不会部署)
│   └── prebuild.mjs                 # 预构建处理脚本
│
├── 📁 .github/                      # GitHub配置 (不会部署)
│   └── workflows/
│       └── deploy.yml               # 自动部署配置
│
├── index.html                       # HTML模板
├── package.json                     # 项目配置
├── vite.config.js                   # Vite配置
├── LICENSE                          # MIT许可证
└── README.md                        # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn
- 现代浏览器 (Chrome 80+, Firefox 75+, Safari 13+)

### 安装依赖
```bash
npm install
```

### 开发服务器
```bash
npm run dev
```
访问 http://localhost:5173

### 构建生产版本
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## 🛠️ 开发工具

### CDK 数据管理工具

位于 `tools/cdk-manager.html` 的可视化CDK数据管理工具：

**🔥 功能亮点：**
- 📂 **现代文件API** - 支持直接读写文件，无需手动下载上传
- ➕ **智能添加** - 支持普通CDK和CDK组合的快速添加
- ✏️ **可视化编辑** - 表单化编辑，降低出错率
- 🗑️ **安全删除** - 确认式删除，防止误操作
- 💾 **实时保存** - 修改即写入，告别文件替换
- 🔄 **智能降级** - 自动适配不同浏览器能力

**使用流程：**
1. 浏览器打开 `tools/cdk-manager.html`
2. 加载 `public/cdk-list.source.json` 文件
3. 可视化管理CDK数据
4. 一键保存到原文件

**浏览器兼容性：**
- ✅ **Chrome 86+, Edge 86+** - 完整的直接文件读写
- 🔄 **其他浏览器** - 自动降级到传统导出模式

## 📝 CDK 数据贡献

### 重要提示
**请修改 `public/cdk-list.source.json` 文件来贡献新CDK**  
`public/cdk-list.json` 是构建时自动生成的，请勿直接修改。

### 数据格式

**单个CDK：**
```json
{
  "code": "NIKKE2025NEW",
  "name": "2025新年礼包",
  "reward": "高级招募券×5, 珠宝×300",
  "servers": ["global", "tw"],
  "status": "可用",
  "note": "新年活动CDK",
  "author": "贡献者名称",
  "created": "2025-01-01"
}
```

**CDK组合：**
```json
{
  "type": "group",
  "groupId": "NIKKE_ANNIVERSARY_2025",
  "groupName": "2025周年庆典",
  "note": "周年庆典系列CDK合集",
  "cdks": [
    {
      "code": "NIKKE2025A",
      "name": "周年礼包A",
      "reward": "高级招募券×3",
      "servers": ["global"],
      "status": "可用",
      "note": "周年庆第一弹",
      "author": "贡献者",
      "created": "2025-01-01"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | String | ✅ | CDK兑换码 |
| `name` | String | ✅ | CDK显示名称 |
| `reward` | String | ✅ | 奖励内容描述 |
| `servers` | Array | ✅ | 适用服务器：`global`(国际服), `cn`(国服), `tw`(港澳台服) |
| `status` | String | ✅ | 状态：`可用`, `已过期` |
| `note` | String | ❌ | 备注说明 |
| `author` | String | ❌ | 贡献者名称 |
| `created` | String | ✅ | 创建日期 (YYYY-MM-DD) |

### 投稿方式
1. 通过 [说明网站](https://chalk-quotation-b2d.notion.site/Nikke-CDK-Tools-20f563f728f180e6ad58e9205a7fa271) 进行查看当前待审核CDK、提交新 CDK
2. **Pull Request** - 直接修改文件提交PR
3. **Issue反馈** - 使用Issue模板提交CDK信息

## 🔧 部署说明

### GitHub Pages 自动部署
- 推送到 `masrer` 分支自动触发部署
- 构建产物发布到 `gh-pages` 分支
- CDK数据更新会自动重新构建
- 支持 SPA 路由的 404 回退

### Cloudflare Workers
项目使用 Cloudflare Workers 提供以下服务：
- CDK兑换API代理 (绕过CORS限制)
- CDK列表数据加速
- 图片资源加速

Worker 配置详见 `cloudflare-worker/README.md`

## 🔐 安全说明

### Cookie 安全
- Cookie 仅存储在用户本地浏览器
- 不上传到任何第三方服务器
- 通过 Cloudflare Worker 安全代理到官方API
- 用户可随时清除本地存储的Cookie
- 用户可自行根据开源的 Worker 模板构建属于自己的 API 地址

### 隐私保护
- 不收集用户个人信息
- 不追踪用户行为
- 开源代码，完全透明
- 遵循最小权限原则

## 🤝 贡献指南

### 贡献类型
- 🐛 **Bug修复** - 提交Issue或直接PR
- ✨ **新功能** - 先讨论，后实现
- 📝 **CDK数据** - 遵循数据格式提交
- 📚 **文档改进** - 完善说明文档
- 🎨 **UI优化** - 改进用户体验


### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 Vue 3 Composition API 最佳实践
- 组件命名使用 PascalCase
- 样式使用 SCSS，支持深色模式

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## ⚠️ 免责声明

本工具仅供学习交流使用，使用本工具产生的任何问题与开发者无关。请遵守游戏相关规定，合理使用CDK资源。

## 🔗 相关链接

- [在线体验](https://github.com/Small-tailqwq/Nikke-CDK-Tool/deployments) - GitHub Pages
- [项目仓库](https://github.com/Small-tailqwq/Nikke-CDK-Tool) - GitHub
- [问题反馈](https://github.com/Small-tailqwq/Nikke-CDK-Tool/issues) - Issues
- [CDK投稿](https://chalk-quotation-b2d.notion.site/210563f728f1801ea74ec231b2359e79) - Notion 问卷
- [官方网页](https://chalk-quotation-b2d.notion.site/Nikke-CDK-Tools-20f563f728f180e6ad58e9205a7fa271) - 网页情况、意见反馈、使用教程

---

❤️

