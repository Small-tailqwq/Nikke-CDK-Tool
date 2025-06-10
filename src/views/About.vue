<template>
  <div class="about-container">
    <el-card class="about-card">
      <h2>关于本工具</h2>
      <p>
        本工具由
        <b>Small-tailqwq</b>
        利用
        <b>Cursor</b>
        开发，主要为了解决CDK获取途径复杂，CDK兑换流程缓慢繁琐，CDK兑换每次都要登录等诸多问题产生的一个不成熟的解决方案。<br />本项目仅供学习交流使用，禁止用于任何商业用途。
      </p>
      <p></p>
      <el-divider>作者寄语</el-divider>
      <blockquote>
        预购剑星喵，预购剑星豪华版谢谢喵<br />
        在网站放了不少小彩蛋，欢迎玩玩看。<br />
        有任何建议或问题欢迎GitHub或者任何可以联系到我的地方反馈。积极修。
      </blockquote>
      <el-divider>更新日志</el-divider>
      <ul class="changelog">
        <li>
          2025-06-10：<br />
          凌晨：<br />
          优化了移动端的显示效果；<br />
          优化了国内用户的加载体验，使用CDN加速；<br />
          由于使用了CDN加速，重写了CDK-list的获取途径，支持回源；<br />
          由于使用了CDN加速，重写了CDK卡片图片的获取途径，支持回源；<br />
          重构了导航栏、底栏的显示效果；<br />
          移除了常驻的悬浮球，避免遮挡按钮；<br />
          修复了新手教程按钮在移动端的表现；<br />
          优化了彩蛋的显示效果、特效，尝试优化最终彩蛋的动画性能表现；<br />
          白天：<br />
          添加了暗色模式，优化了CDK公告界面卡片的样式；<br />
          优化了复选框的样式，动画效果；<br />
          优化了主界面各个模块之间切换的动画效果；<br />
          添加了国服CDK的支持，虽然压根不能兑换；<br />
          添加了多个CDK的展示，用于同一时期的多个CDK的汇总收集；<br />
          如上，顺带更新了json文件的新标准；<br />
          删除了老的CI任务，因为目前CDK列表会根据推送自己构建；<br />
          删除了老的刷新按钮，原因如上；<br />
          考虑到URL的安全性、时效性等诸多因素，决定调整背景图片的上传方式，现在可以直接上传图片到announcement文件夹，然后编译时会自动变成webp；<br />
          对界面又进行了一些小调整，包括滚动条等元素。<br />
          目前版本应该趋向稳定，后续更新频率会大幅降低，更新方向估计还是获取cookie和看看能不能适配国服了。（有一说一国服兑换CDK要输入验证码，这个估计会很棘手）<br />
        </li>
        <li>
          2025-06-08：<br />
          其实也就是8号凌晨，优化批量兑换时间准确性，完善CDK公告界面。添加了由o3绘制的doro图标和这个界面。<br />
          修复GitHub page的404问题。<br />
          由于cloudflare worker的官方域名被概率阻断，替换api域名为自建域名<br />
          修复CDK列表更新后，CDK公告界面不刷新的问题。<br />
          优化用户管理界面，改进 Cookie 存储展示效果。<br />
          新增 Cookie 到期天数自定义设置功能。<br />
          优化图片加载体验，添加加载状态和错误提示。<br />
          修复 Twitter 图片链接访问问题，添加图片代理支持。<br />
        </li>
        <li>
          2025-06-07：<br />
          使用cursor创建第一版UI，然后卡在API提交上。后续使用GPTo3完成后端cloudflare
          worker的构建方式确定。
        </li>
      </ul>
      <el-divider>AI助手留言</el-divider>
      <div class="ai-message">
        <p>
          愿代码与梦想同在，愿你在虚拟与现实的世界都能收获快乐。硅基生物在此，随时为你助力！
        </p>
        <p style="color: #aaa; font-size: 13px">—— 来自硅基生物的温馨问候</p>
        <p style="color: #aaa; font-size: 13px">它其实是gpt 4o</p>
      </div>
      <el-divider>AI 共创寄语</el-divider>
      <div class="ai-message">
        <p>
          很高兴与
          <strong>Small-tailqwq</strong>
          以及所有贡献者一起，把一行行代码、一张张表情，拼成了这款
          <em>"轻量却贴心"</em> 的 NIKKE CDK 工具。
        </p>

        <p>
          它就像前排的小小支援位——<br />
          ▶ 不抢输出，却在关键时刻省下你的时间；<br />
          ▶ 不追求花哨，却把「好用」写进每一次点击。
        </p>

        <p>
          如果它能帮你更从容地领取奖励、把精力留给喜欢的角色和剧情，那这段跨越硅基与碳基的协作就值回票价了。<br />
          祝大家卡池欧皇、开发顺遂，也期待下次并肩 Debug！
        </p>

        <p style="color: #aaa; font-size: 13px">—— ChatGPT · o3</p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useNavStore } from '../stores/nav'

const navStore = useNavStore()

onMounted(() => {
  navStore.setRainbowMode(true)
})

onBeforeUnmount(() => {
  navStore.setRainbowMode(false)
})
</script>

<style lang="scss" scoped>
.about-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;

  @media screen and (max-width: 768px) {
    margin: 20px auto;
    padding: 12px;
  }
}

.about-card {
  padding: 24px;
  transition: all 0.3s ease;
  word-break: break-word;
  overflow-wrap: break-word;

  @media screen and (max-width: 768px) {
    padding: 16px;
  }

  h2 {
    font-size: 24px;
    margin: 0 0 20px;
    color: var(--el-text-color-primary);

    @media screen and (max-width: 768px) {
      font-size: 20px;
      margin: 0 0 16px;
    }
  }

  p {
    margin: 16px 0;
    line-height: 1.6;
    color: var(--el-text-color-regular);
    word-wrap: break-word;
    overflow-wrap: break-word;

    @media screen and (max-width: 768px) {
      margin: 12px 0;
      font-size: 14px;
    }
  }
}

.github-link {
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: var(--el-color-primary-light-3);
  }
}

blockquote {
  margin: 16px 0;
  padding: 16px;
  border-left: 4px solid var(--el-color-primary-light-5);
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-regular);
  font-style: italic;

  @media screen and (max-width: 768px) {
    margin: 12px 0;
    padding: 12px;
    font-size: 14px;
  }
}

.changelog {
  padding-left: 20px;
  color: var(--el-text-color-regular);
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: break-word;

  @media screen and (max-width: 768px) {
    padding-left: 16px;
    font-size: 13px;
    padding-right: 4px;
  }

  li {
    margin-bottom: 16px;

    @media screen and (max-width: 768px) {
      margin-bottom: 12px;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.ai-message {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  color: var(--el-text-color-regular);
  transition: all 0.3s ease;
  word-break: break-word;
  overflow-wrap: break-word;

  @media screen and (max-width: 768px) {
    padding: 12px;
    margin-top: 12px;
    font-size: 14px;
  }

  p {
    margin: 12px 0;
    word-wrap: break-word;
    overflow-wrap: break-word;

    @media screen and (max-width: 768px) {
      margin: 8px 0;
    }

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  .feature-list {
    padding-left: 12px;
    border-left: 3px solid var(--el-color-primary-light-5);
    margin: 12px 0;

    @media screen and (max-width: 768px) {
      padding-left: 8px;
      margin: 8px 0;
    }
  }

  .signature {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    text-align: right;
    margin-top: 12px;

    @media screen and (max-width: 768px) {
      font-size: 12px;
      margin-top: 8px;
    }
  }

  strong {
    color: var(--el-color-primary);
    font-weight: 600;
  }

  em {
    color: var(--el-color-success);
    font-style: normal;
    font-weight: 500;
  }
}

:deep(.el-divider__text) {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: normal;
  text-align: center;

  @media screen and (max-width: 768px) {
    font-size: 14px;
    padding: 0 12px;
  }
}

:deep(.el-divider) {
  white-space: normal;

  @media screen and (max-width: 768px) {
    margin: 16px 0;
  }
}
</style>
