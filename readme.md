# Nikke CDK Tool

一个用于管理《胜利女神：NIKKE》CDK 的工具网站。

## 项目目录结构

```text
.
├── public/                    # 静态资源目录
│   ├── cdk-list.source.json  # 【请修改我】CDK 列表数据源
│   ├── cdk-list.json         # (自动生成) 供浏览器使用的CDK列表
│   └── announcement-images/  # (自动生成) 缓存的公告图片
│
├── src/                       # 前端源代码
│   ├── assets/               # 资源文件
│   │   └── doro_icon.png    # 多萝图标
│   │
│   ├── components/           # 组件
│   │   └── UserDialog.vue   # 用户管理对话框
│   │
│   ├── stores/              # Pinia 状态管理
│   │   ├── exchange.js      # CDK 兑换状态
│   │   └── user.js          # 用户状态
│   │
│   ├── utils/               # 工具函数
│   │   ├── api.js           # Cloudflare Worker API 接口
│   │   ├── cookie.js        # Cookie 管理
│   │   ├── fetchCdk.ts      # CDK 列表获取
│   │   └── storage.js       # 本地存储
│   │
│   ├── views/               # 页面组件
│   │   ├── About.vue        # 关于页面
│   │   ├── CdkAnnouncement.vue  # CDK 公告
│   │   ├── CdkExchange.vue      # CDK 兑换
│   │   ├── ExchangeHistory.vue  # 兑换历史
│   │   └── UserManagement.vue   # 用户管理
│   │
│   ├── App.vue              # 根组件
│   ├── main.js              # 入口文件
│   └── router/              # 路由配置
│       └── index.js
│
├── cloudflare-worker/        # Cloudflare Worker 相关
│   ├── Nikke-CDK.js             # CDK兑换接口代理
│   ├── Nikke-CDK-list.js    # CDK 列表加速
│   └── README.md            # Worker 说明文档
│
├── .github/                  # GitHub 配置
│   └── workflows/           # GitHub Actions
│       └── deploy.yml       # 部署工作流
│
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── vite.config.js           # Vite 配置
└── README.md                # 项目说明
```

## 技术栈

- 前端框架：Vue 3 + Vite
- UI 组件库：Element Plus
- 状态管理：Pinia
- 路由：Vue Router
- 部署：GitHub Pages + Cloudflare Workers

## 功能特性

- CDK 公告展示
- CDK 兑换功能
- 兑换历史记录
- 用户管理
- 多源 CDK 列表获取（本地、jsDelivr、Cloudflare Worker）

## 开发说明

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 构建生产版本：
```bash
npm run build
```

## 部署说明

项目使用 GitHub Actions 自动部署到 GitHub Pages，同时通过 Cloudflare Workers 提供 CDK 列表和兑换 API。

### GitHub Pages 部署

- 主分支的更改会自动触发部署
- 部署配置在 `.github/workflows/deploy.yml`
- 构建产物会部署到 `gh-pages` 分支

### Cloudflare Workers

- Worker 代码位于 `cloudflare-worker` 目录
- 包含 CDK 列表和兑换两个 Worker
- 详细配置说明见 `cloudflare-worker/README.md`

## 贡献指南

1. Fork 本仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 使用说明

### Cookie 获取与安全

- 请从官方 CDK 兑换页面 [blablalink](https://www.blablalink.com/cdk) 获取 Cookie
- Cookie 仅保存在本地浏览器，不上传服务器
- Cookie 理论有效期一年，但可能因游戏更新而失效
- Cookie 由于跨域问题，会被发送至 Cloudflare Worker 进行中转

#### 获取 Cookie 的详细步骤

1. 打开兑换界面后，打开浏览器调试工具（`F12`），点击 `网络`（`Network`）
2. 随便输入一个 CDK 点击兑换
3. 找到 `GetPlayerBasicInfo` 或其他状态 `200` 的请求日志
4. 切换到 `Cookie` 界面，双击任意一行，按 `Ctrl + A` 全选，再按 `Ctrl + C` 复制

或者使用更快捷的方式：
- 在 Chrome/Edge 的 Network ▶ Headers ▶ Request Headers ▶ Cookie 区域
- 右键 → "Copy value" 就能一次得到完整的 Cookie 值

### CDK 公告数据贡献

**重要提示：** 请修改位于 `public/cdk-list.source.json` 的源文件来贡献新的CDK。`public/cdk-list.json` 是在项目构建时自动生成的，请勿直接修改该文件。

任何人都可以通过 Pull Request 或 Issue 投稿新 CDK 到 `public/cdk-list.source.json`。

#### 投稿格式

```json
{
  "code": "NIKKE2026NEW",
  "name": "2026新年礼包",
  "reward": "高级招募券×5, 橘子×2",
  "image": "",
  "servers": ["global", "tw"],
  "status": "可用",
  "note": "新年活动CDK",
  "author": "doro"
}
```

#### 字段说明

- `code`：CDK 码（必填）
- `name`：CDK 名称或活动（建议填写）
- `reward`：奖励内容（建议填写）
- `image`：相关图片 URL（可选）
- `servers`：适用服务器（如 `global`, `tw`，数组）
- `status`：可用/已过期
- `note`：备注（可选）
- `author`：贡献者昵称

### 基本使用流程

1. 添加用户：输入用户名、选择服务器、粘贴 Cookie 信息，保存即可
2. 兑换 CDK：选择用户，输入/粘贴 CDK（支持多行），点击兑换
3. 查看历史：在"兑换历史"页面查看所有兑换记录
4. CDK 公告：在"CDK 公告"页面查看最新 CDK 及奖励信息

## 免责声明

本工具仅供学习交流使用，使用本工具产生的任何问题与开发者无关。请遵守游戏相关规定。

