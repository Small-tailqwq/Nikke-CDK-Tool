# NIKKE CDK兑换工具

一个 **全部由AI编写的** 基于 Vue3 + Element Plus 的 NIKKE CDK 批量兑换工具，支持多账号管理、批量兑换、历史记录、CDK公告等功能。

> 不支持国服(不是别的原因，单纯突然想起来国服应该不用balalink的接口兑换CDK)

## 项目目录结构

```text
src/
├── App.vue
├── main.js
├── index.js -- 用于cloudflare worker构建
├── router/
│   └── index.js
├── views/
│   ├── About.vue
│   ├── CdkAnnouncement.vue
│   ├── CdkExchange.vue
│   ├── ExchangeHistory.vue
│   ├── RainbowDoro.vue
│   └── UserManagement.vue
├── components/
│   └── UserDialog.vue
├── stores/
│   ├── exchange.js
│   └── user.js
└── utils/
    ├── api.js -- 用于对接cloudflare worker
    ├── cookie.js
    └── storage.js

```

## 功能特点

- 多账号管理
  - 支持多账号兑换
  - 支持cookie快速导入
- 批量CDK兑换
  - 支持多CDK兑换
- 兑换历史追踪
 - 只记录本工具尝试兑换的cdk
 - 精确到兑换时间、cdk、结果、用户
- CDK公告展示
  - 支持一键复制
  - 不定期维护
  - 支持用户通过GitHub分享新 CDK
  - 支持用户更换CDK列表源
- 本地存储，数据（~~并非~~）不上传
    - 提供完整cloudflare worker模板，支持自己构建代理接口

## 使用说明

1. 添加用户：输入用户名、选择服务器、粘贴 Cookie 信息，保存即可。
2. 兑换CDK：选择用户，输入/粘贴CDK（支持多行），点击兑换。
3. 查看历史：在“兑换历史”页面查看所有兑换记录。
4. CDK公告：在“CDK公告”页面查看最新CDK及奖励信息。

## Cookie获取与安全

- 请从官方CDK兑换页面 [blablalink](https://www.blablalink.com/cdk) 获取 Cookie (按 `F12`)，按提示粘贴。
- Cookie 仅保存在本地浏览器，不上传服务器。
- Cookie理论有效期一年，但是难说。
- Cookie由于跨域问题，会被发送至cloud flare Worker进行中转，理由如下
  - 为了实现本地、自建时能够通过web调用官方CDK的激活链接  
  - 让大陆指挥官也能直接（存疑）兑换链接。


### 获取cookie的详细步骤

- 打开兑换界面后，打开浏览器调试工具（`F12`)，点击`网络`（`Network`）
- 随便输入一个CDK点击兑换
- 找到`GetPlayerBasicInfo`或者其他状态`200`的请求日志，左键一下
- 切换到 `Cookie` 界面，双击任意一行，按 `CTRL` + `A` 全选，再按 `CTRL` + `C` 复制

> 不出意外，你会得到如下的内容：
```text
game_adult_status	1	.blablalink.com	/	2025-07-07T12:14:35.184Z	18	✓	✓				Medium
game_channelid	6	.blablalink.com	/	2025-07-07T12:14:35.184Z	15	✓	✓				Medium
game_gameid	29080	.blablalink.com	/	2025-07-07T12:14:35.184Z	16	✓	✓				Medium
game_login_game	0	.blablalink.com	/	2025-07-07T12:14:35.184Z	16	✓	✓				Medium
game_openid	13161285947484504729	.blablalink.com	/	2025-07-07T12:14:35.184Z	31	✓	✓				Medium
game_token	******************************	.blablalink.com	/	2025-07-07T12:14:35.184Z	50	✓	✓				Medium
game_uid	********************	.blablalink.com	/	2025-07-07T12:14:35.184Z	24	✓	✓				Medium
game_user_name	"********************"	.blablalink.com	/	2025-07-07T12:14:35.184Z	29	✓	✓				Medium
```
把这个直接粘贴到添加用户界面就ok了。

或者：
> 复制小技巧  
在 Chrome/Edge 的 Network ▶ Headers ▶ Request Headers ▶ Cookie 区域
右键 → “Copy value” 就能一次得到完整的这一行，省得手打。  
by: o3

## CDK公告数据贡献

CDK公告数据存放在 `public/cdk-list.json`，任何人都可以通过 Pull Request 或 Issue 投稿新CDK。

### 投稿方式

1. **Fork 本仓库**
2. 编辑 `public/cdk-list.json`，在 `cdks` 数组中添加你的CDK对象，格式如下：

```json
{
  "code": "NIKKE2026NEW",
  "name": "2026新年礼包",
  "reward": "高级招募券×5, 橘子×2, 纯牛奶x2",
  "image": "",
  "servers": ["cn"],
  "status": "可用",
  "note": "新年活动CDK",
  "author": "doro"
}
```

> 这只是一个示例，目前本项目暂不支持国服兑换和兑换纯牛奶等功能，等待后续更新。
  


3. 提交 Pull Request，等待合并。

**如果不会用PR，也可以在 Issue 区留言，格式同上。**

### 字段说明

- `code`：CDK码（必填）
- `name`：CDK名称或活动（建议填写）
- `reward`：奖励内容（建议填写）
- `image`：相关图片URL（可选）
- `servers`：适用服务器（如 `global`, `cn`, `tw`，数组）
- `status`：可用/已过期（过期状态为更新CDK时使用，你没必要将过期CDK进行汇报）
- `note`：备注（可选）
- `author`：贡献者昵称

---

> 默认公告数据由 GitHub 仓库的 `cdk-list.json` 提供，欢迎大家共同维护和完善！

## 部署与开发

1. 安装依赖
   ```bash
   npm install
   ```
2. 启动开发
   ```bash
   npm run dev
   ```
3. 构建生产
   ```bash
   npm run build
   ```

## 免责声明

本工具仅供学习交流使用，使用本工具产生的任何问题与开发者无关。请遵守游戏相关规定。

本项目你能看到的 99%的代码均由各种LLM交叉编写而成，可谓是AI拼好饭，不好吃随便骂。如果遇到问题，可提交 Issue，本人会尽力用 AI 修复。


---

> 本项目并非不包含趣味彩蛋，不欢迎不来探索！


> AI 真是方便啊  
—— 我

