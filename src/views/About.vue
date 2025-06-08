<template>
  <div class="about-container">
    <el-card class="about-card">
      <h2>关于本工具</h2>
      <p>本工具由 <b>Small-tailqwq</b> 开发，致力于为NIKKE玩家提供便捷的CDK兑换体验。<br>仅供学习交流使用，请勿用于商业用途。</p>
      <p>本工具在 Github 开源，欢迎查看Readme获取最新使用教程或为项目添砖加瓦，<a href="https://github.com/Small-tailqwq/Nikke-CDK-Tool" target="_blank">点击前往</a></p>
      <el-divider>作者寄语</el-divider>
      <blockquote>
        预购剑星谢谢喵，预购剑星豪华版谢谢喵<br>
        有任何建议或bug欢迎反馈。随缘修
      </blockquote>
      <el-divider>更新日志</el-divider>
      <ul class="changelog">
        <li>2024-06-08：其实也就是8号凌晨，优化批量兑换时间准确性，完善CDK公告界面。添加了由o3绘制的doro图标和这个界面。<br>
        修复GitHub page的404问题。<br>
        由于cloudflare worker的官方域名被概率阻断，替换api域名为自建域名<br>
        修复CDK列表更新后，CDK公告界面不刷新的问题。<br>
        优化用户管理界面，改进 Cookie 存储展示效果。<br>
        新增 Cookie 到期天数自定义设置功能。<br>
        优化图片加载体验，添加加载状态和错误提示。<br>
        修复 Twitter 图片链接访问问题，添加图片代理支持。<br>
        </li>
        <li>2024-06-07：使用cursor创建第一版UI，然后卡在API提交上。后续使用GPTo3完成后端cloudflare worker的构建方式确定。</li>
      </ul>
      <el-divider>AI助手留言</el-divider>
      <div class="ai-message">
        <p>愿代码与梦想同在，愿你在虚拟与现实的世界都能收获快乐。硅基生物在此，随时为你助力！</p>
        <p style="color:#aaa;font-size:13px;">—— 来自硅基生物的温馨问候</p>
        <p style="color:#aaa;font-size:13px;">它其实是gpt 4o</p>
      </div>
      <el-divider>AI 共创寄语</el-divider>
        <div class="ai-message">
        <p>
            很高兴与 <strong>Small-tailqwq</strong> 以及所有贡献者一起，把一行行代码、一张张表情，拼成了这款
            <em>“轻量却贴心”</em> 的 NIKKE CDK 工具。
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

        <p style="color:#aaa;font-size:13px;">
            —— ChatGPT · o3
        </p>
        </div>

    </el-card>
  </div>
</template>

<script setup>
</script>

<style scoped>
.about-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
}
.about-card {
  padding: 24px;
}
.changelog {
  padding-left: 20px;
  color: #606266;
  font-size: 15px;
}
.ai-message {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 10px;
  color: #606266;
}
</style> 