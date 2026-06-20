# AGENTS.md - Nikke-CDK-Tool

项目专属规则。通用工作流、安全、git 规则见全局 `AGENTS.md`。

详细实现参考见 `docs/agent/project-instructions.md`。

## 快速命令

```bash
npm install
npm run dev        # Vite: http://localhost:5173
npm run lint       # ESLint (src/**/*.js,ts,vue)
npm run validate   # 校验 public/cdk-list.source.json
npm run build      # prebuild → vite build
npm run thumbnails # 重新生成公告缩略图
npm run update-images
```

## 验证

- 代码改动: `npm run lint`
- CDK 数据改动: `npm run lint && npm run validate`
- UI/路由/部署敏感改动: `npm run lint && npm run build`
- 无测试运行器，无 `vue-tsc`

## 关键约束

- 只编辑 `public/cdk-list.source.json`，不手动编辑 `public/cdk-list.json`
- 公告图片文件名需匹配 `cdk.code` 或 `groupId`
- 生产分支为 `masrer`，不要改名或"修正"
- `vite.config.js` base: `/Nikke-CDK-Tool/`，路由使用 hash history

## 研究产物规则

所有逆向工程、登录分析、探针脚本和抓取产物 **只能** 放在 `_research/` 下。禁止放入 `scripts/`、`tools/`、`public/`、`src/` 或仓库根目录。禁止提交真实凭据。详细安全规则见 `docs/agent/project-instructions.md`。

## Git 约定

- 提交信息统一使用中文
- 使用 conventional commit 前缀: `feat:` `fix:` `chore:` `refactor:` `ci:` `docs:` 等

## 任务路由

- 实现细节、目录结构、技术栈 → `docs/agent/project-instructions.md`
- Worker 行为、登录、代理、API 路由 → `cloudflare-worker/README.md`
