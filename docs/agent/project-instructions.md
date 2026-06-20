# Project Instructions

## 用途

存放项目专属的实现细节与约束，帮助 agent 快速做出正确修改。有意不重复全局 `AGENTS.md` 中的通用工作流和安全规则。

## 技术栈

- 前端: Vue 3 SPA，Composition API，Pinia，Vue Router，Element Plus，SCSS
- 路由模式: `createWebHashHistory(import.meta.env.BASE_URL)`
- Vite base 路径: `/Nikke-CDK-Tool/`
- 语言: JavaScript 与 TypeScript 共存，`tsconfig.json` 允许 JS
- 类型检查: 未配置 `vue-tsc`，CI 依赖 lint 和 build 而非专门的 TS 检查

## 项目布局

- `src/`: Vue 3 SPA — views、components、stores、utils
- `public/cdk-list.source.json`: CDK 数据唯一手动源
- `public/cdk-list.json`: 生成输出，禁止手动编辑
- `public/announcement-images/`: 原始公告图及生成的 WebP/缩略图
- `cloudflare-worker/`: 手动部署的 Worker 代码
- `scripts/`: 仅构建脚本（`prebuild.mjs`、`validate-cdk.mjs`），禁止放逆向脚本
- `tools/`: 独立浏览器工具（`cdk-manager.html`），禁止放探测/调试工具
- `_research/`: 逆向工程产物，遵循下方安全规则

## 验证规则

- 代码改动: `npm run lint`
- CDK 数据改动: `npm run validate`
- UI、路由、Worker 集成或资源管线改动: `npm run lint` 然后 `npm run build`
- `npm run build` 始终先执行 `npm run prebuild`

## 数据源

- `public/cdk-list.source.json` 是 CDK 数据的唯一手动源
- `public/cdk-list.json` 由脚本生成，禁止手动编辑
- `scripts/validate-cdk.mjs` 负责校验源 JSON 结构和允许值

## 公告图片

- 原始素材存放于 `public/announcement-images/`
- 文件名必须匹配对应的 `cdk.code` 或 `groupId`
- 保持原始图片为标准格式（`png`、`jpg`、`jpeg`）
- `scripts/prebuild.mjs` 负责更新图片路径、转 WebP 并生成缩略图
- 生成的缩略图位于 `public/announcement-images/thumbs/`

## 前端约束

- 保持 `src/main.js` 中的 Element Plus zh-CN 本地化接线
- `src/main.js` 将 touch 监听器的默认行为设为 `passive: true`；不要随意移除，它会抑制滚动阻塞警告并影响运行时行为
- `src/main.js` 还会在空闲时预加载重路由和通用对话框；除非任务明确涉及路由加载行为，否则保留此逻辑
- `index.html` 包含 `window.global = window`；未验证兼容性影响前不要移除
- `/admin` 仅限开发环境，由 `src/router/index.js` 守卫

## Worker 边界

- 前端 API 调用默认指向 `https://nikke-cdk.hayasa.org`，可由 `VITE_API_BASE_URL` 覆盖
- Cloudflare Worker 代码位于 `cloudflare-worker/`，手工部署，不走 CI
- Worker 按路由族拆分职责:
  - `/global/*`: 国际服 API
  - `/cn/*`: 国服 API
  - `/api/auth/*`: 认证 token 端点
- `TOKEN_KV` 是 Worker 认证/token 流程的必要条件
- 涉及 BlaBla 相关请求时，通过 Worker 代理而非浏览器端直接调用上游

## 部署注意事项

- GitHub Actions 从 `masrer` 分支部署到 `gh-pages`
- 静态托管依赖 Vite base 路径配置和 SPA 回退行为
- `vite.config.js` 中故意将构建分块围绕 `vue`、`element-plus` 和 `axios` 拆分

## 常用入口

- `src/utils/api.js`: 前端到 Worker 的 API 边界
- `src/router/index.js`: 路由列表和环境守卫
- `src/main.js`: 应用启动、本地化设置、passive touch 补丁、路由预加载
- `scripts/prebuild.mjs`: 资源生成和 CDK 预处理
- `scripts/validate-cdk.mjs`: CDK 源数据校验
- `tools/cdk-manager.html`: 独立的 CDK 数据可视化管理工具
- `_research/`: 逆向工程产物（见下方研究产物安全规则）
- `cloudflare-worker/README.md`: Worker 变更的操作说明

## 研究产物安全规则

所有逆向工程、登录分析、探针脚本和抓取产物必须放在 `_research/` 下。该目录不在 `public/` 和 `src/` 中，永远不会被打包或发布。

### 目录结构

```
_research/
  scripts/     # 分析脚本（.mjs、.py 等）
  artifacts/   # 抓取输出数据（JSON、日志等）
  tools/       # 浏览器调试/探测工具（Tampermonkey 脚本、验证码调试页等）
```

### 安全规则

1. **禁止真实凭据**: 不得在脚本或源码中提交真实邮箱、密码、token、cookie 或会话数据。测试数据使用明确标注的占位符（如 `user@example.com`、`PASSWORD_PLACEHOLDER`）。
2. **禁止日志泄露**: 可能输出认证材料的 `console.log`/`print()` 语句必须在提交前删除，或用 `--dry-run`/调试开关保护。
3. **抓取产物隔离**: 包含真实内容的抓取数据放入 `_research/artifacts/`，并加入 `.gitignore`，尽量不要提交。
4. **应用隔离**: 不得从 `_research/` 导入 `src/` 或 `public/` 的任何代码，不得在构建脚本或部署流程中引用。
