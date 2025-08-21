# Nikke CDK Tool

一个用于管理《胜利女神：NIKKE》CDK 的现代化工具网站，支持国际服、国服、港澳台服多服务器CDK兑换。

![许可证](https://img.shields.io/badge/许可证-MIT-blue)

## ✨ 功能特性

### 🎯 核心功能

- **CDK 公告展示** - 支持单个CDK和CDK组合的智能展示，附有 CDK 活动期间图片和奖励信息
- **多服务器兑换** - 全面支持国际服、国服、港澳台服 CDK 兑换
- **用户管理** - 支持多账号管理，自动角色信息获取和服务器类型检测
- **兑换历史** - 完整的兑换记录追踪，支持本地与云端同步
- **智能筛选** - 根据账号兑换记录智能筛选未兑换的 CDK

### 🔧 高级特性

- **批量操作** - 支持 CDK 组合的批量选择和兑换
- **主题系统** - 三态主题切换（明亮/暗色/自动），系统自适应
- **响应式设计** - 完美适配桌面端和移动端，优化触摸体验
- **瀑布流布局** - 伪瀑布流排版，优化CDK卡片展示效果
- **动画效果** - 丰富的过渡动画和交互反馈
- **安全保护** - Cookie 本地存储，用户隐私保护

### 🎨 特色功能

- **doro 彩蛋** - 隐藏的 doro 动画彩蛋和特效
- **CDN 加速** - 国内 CDN 加速，提升加载体验
- **图片优化** - 自动 WebP 格式转换，缩略图生成
- **广告拦截友好** - 低侵入性广告设计，支持拦截器

## 🏗️ 技术栈

### 前端框架

- **Vue 3** - 响应式前端框架 (Composition API)
- **Vite** - 现代化构建工具
- **Element Plus** - 企业级UI组件库
- **Pinia** - 下一代状态管理库
- **Vue Router** - 官方路由管理器
- **SCSS** - CSS预处理器

### 后端服务

- **Cloudflare Workers** - 边缘计算API代理
- **GitHub Pages** - 静态网站托管
- **GitHub Actions** - CI/CD自动化部署
- **阿里云 DCDN** - 国内CDN加速

### 开发工具

- **TypeScript** - 类型安全的JavaScript
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Sharp** - 高性能图像处理
- **Axios** - HTTP客户端库

## 📁 项目目录结构

```text
Nikke-CDK-Tool/
├── 📁 src/                          # 前端源代码
│   ├── 📁 components/               # Vue 组件
│   │   ├── CDKGroupCard.vue         # CDK组合卡片
│   │   ├── AdCard.vue               # 广告卡片
│   │   ├── DoroSummonAnimation.vue  # 多萝召唤动画
│   │   ├── FloatingDoro.vue         # 浮动多萝组件
│   │   ├── CookieWarningAlert.vue   # Cookie警告提示
│   │   ├── TextDestructionEffect.vue # 文字毁灭特效
│   │   ├── MasonryLayout.vue        # 瀑布流布局
│   │   └── UserDialog.vue           # 用户管理对话框
│   │
│   ├── 📁 views/                    # 页面组件
│   │   ├── About.vue                # 关于页面
│   │   ├── CdkAnnouncement.vue      # CDK公告页面
│   │   ├── CdkExchange.vue          # CDK兑换页面
│   │   ├── ExchangeHistory.vue      # 兑换历史页面
│   │   ├── UserManagement.vue       # 用户管理页面
│   │   └── RainbowDoro.vue          # 彩虹多萝彩蛋页面
│   │
│   ├── 📁 stores/                   # 状态管理
│   │   ├── exchange.js              # CDK兑换状态
│   │   ├── nav.ts                   # 导航状态
│   │   ├── theme.js                 # 主题状态
│   │   ├── user.js                  # 用户状态
│   │   └── doro.js                  # 多萝彩蛋状态
│   │
│   ├── 📁 utils/                    # 工具函数
│   │   ├── api.js                   # API接口封装
│   │   ├── customMessage.ts         # 自定义消息组件
│   │   ├── fetchCdk.ts              # CDK数据获取
│   │   ├── serverUtils.js           # 服务器工具函数
│   │   ├── storage.js               # 本地存储管理
│   │   ├── dateUtils.js             # 日期工具函数
│   │   ├── imageUtils.ts            # 图片工具函数
│   │   ├── adBlockDetector.ts       # 广告拦截检测
│   │   └── logger.js                # 日志工具
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
│   ├── doro_icon.webp               # 多萝图标WebP版本
│   └── announcement-images/         # CDK公告图片
│       ├── *.webp                   # 公告图片
│       └── thumbs/                  # 缩略图目录
│           ├── *_thumb.webp         # 320x180 缩略图
│           └── *_thumb@2x.webp      # 640x360 高清缩略图
│
├── 📁 tools/                        # 开发工具 (不会部署)
│   └── cdk-manager.html             # CDK数据管理工具
│
├── 📁 cloudflare-worker/            # Worker代码 (不会部署)
│   ├── Nikke-CDK-Combined.js        # 统一Worker
│   ├── Nikke-CDK-Combined_Dev.js    # 开发版Worker
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
├── ENV_CONFIG.md                    # 环境变量配置说明
├── CLAUDE.md                        # Claude Code 开发指南
├── index.html                       # HTML模板
├── package.json                     # 项目配置
├── vite.config.js                   # Vite配置
├── tsconfig.json                    # TypeScript配置
├── LICENSE                          # MIT许可证
└── README.md                        # 项目说明
```

## 🚀 快速开始

### 环境要求

- **Node.js 16+** (推荐 18+)
- **npm** 或 **yarn**
- **现代浏览器** (Chrome 80+, Firefox 75+, Safari 13+)

### 克隆项目

```bash
git clone https://github.com/Small-tailqwq/Nikke-CDK-Tool.git
cd Nikke-CDK-Tool
```

### 安装依赖

```bash
npm install
```

### 开发环境配置

创建 `.env.local` 文件（可选）：

```bash
# API服务器地址（默认为生产地址）
VITE_API_BASE_URL=https://nikke-cdk.hayasa.org
```

### 启动开发服务器

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

## 🛠️ 开发命令

### 核心命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果
- `npm run prebuild` - 处理CDK数据和优化图片

### 代码质量

- `npm run lint` - 运行ESLint检查
- `npm run format` - 使用Prettier格式化代码

### 图片处理

- `npm run thumbnails` - 生成缩略图
- `npm run update-images` - 更新图片路径

## 🛠️ CDK 数据管理工具

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
  "author": "贡献者名称",
  "created": "2025-01-01",
  "cdks": [
    {
      "code": "NIKKE2025A",
      "name": "周年礼包A",
      "reward": "高级招募券×3",
      "servers": ["global"],
      "status": "可用",
      "note": "周年庆第一弹"
    }
  ]
}
```

### 字段说明

| 字段      | 类型   | 必填 | 说明                                                     |
| --------- | ------ | ---- | -------------------------------------------------------- |
| `code`    | String | ✅   | CDK兑换码                                                |
| `name`    | String | ✅   | CDK显示名称                                              |
| `reward`  | String | ✅   | 奖励内容描述                                             |
| `servers` | Array  | ✅   | 适用服务器：`global`(国际服), `cn`(国服), `tw`(港澳台服) |
| `status`  | String | ✅   | 状态：`可用`, `已过期`                                   |
| `note`    | String | ❌   | 备注说明                                                 |
| `author`  | String | ❌   | 贡献者名称                                               |
| `created` | String | ✅   | 创建日期 (YYYY-MM-DD)                                    |

### 投稿方式

1. **推荐** - 通过 [官方网站](https://chalk-quotation-b2d.notion.site/Nikke-CDK-Tools-20f563f728f180e6ad58e9205a7fa271) 提交新CDK
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
- 国服验证码处理

Worker 配置详见 `cloudflare-worker/README.md`

### CDN 加速

- 使用阿里云 DCDN 为国内用户提供加速
- 静态资源自动压缩 (gzip + brotli)
- WebP 图片格式优化

## 🔐 安全说明

### Cookie 安全

- Cookie 仅存储在用户本地浏览器
- 不上传到任何第三方服务器（除了Cloudflare）
- 通过 Cloudflare Worker 安全代理到官方API
- 用户可随时清除本地存储的Cookie
- 支持 Cookie 自动续期功能（并不支持，AI乱说的）

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

### 开发环境设置

1. Fork 项目到个人仓库
2. 克隆项目到本地
3. 创建功能分支：`git checkout -b feature/新功能名称`
4. 提交更改：`git commit -m "描述更改内容"`
5. 推送分支：`git push origin feature/新功能名称`
6. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## ⚠️ 免责声明

本工具仅供学习交流使用，使用本工具产生的任何问题与开发者无关。请遵守游戏相关规定，合理使用CDK资源。

## 🔗 相关链接

- [🌐 在线体验](https://small-tailqwq.github.io/Nikke-CDK-Tool/) - GitHub Pages
- [📦 项目仓库](https://github.com/Small-tailqwq/Nikke-CDK-Tool) - GitHub
- [🐛 问题反馈](https://github.com/Small-tailqwq/Nikke-CDK-Tool/issues) - Issues
- [📝 CDK投稿](https://chalk-quotation-b2d.notion.site/210563f728f1801ea74ec231b2359e79) - Notion 问卷
- [📖 使用手册](https://chalk-quotation-b2d.notion.site/Nikke-CDK-Tools-20f563f728f180e6ad58e9205a7fa271) - 详细教程和意见反馈

## 💖 致谢

感谢所有为项目贡献代码、CDK数据和建议的朋友们！

特别感谢：

- **@哥谭下小雪** - 提供国服CDK兑换参数调试支持
- **@奈何明月不独照我** - 提出CDK获取时间需求
- **DoroHelper 开发团队** - 提供宝贵的功能建议
- **硅基生物们** (GPT-4o, ChatGPT o3, Cursor, GitHub Copilot, Claude Code) - AI开发助手

---

**❤️ 如果这个项目对你有帮助，请给一个 Star ⭐**
