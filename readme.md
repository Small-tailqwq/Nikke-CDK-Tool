# NIKKE CDK兑换工具

一个基于 Vue3 + Element Plus 的 NIKKE CDK 批量兑换工具，支持多账号管理、批量兑换、历史记录、CDK公告等功能。

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
- 批量CDK兑换
- 兑换历史追踪
- CDK公告展示
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
- Cookie由于跨域问题，会被发送至cloud flare Worker进行中转，1是为了实现本地、自建时能够通过web调用官方CDK的激活链接，2是让大陆也能直接（存疑）兑换链接。

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

---

> 本项目并非不包含趣味彩蛋，不欢迎不来探索！


