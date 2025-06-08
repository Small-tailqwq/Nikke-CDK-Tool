<template>
  <div class="cdk-announcement">
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <el-card class="filter-card">
          <el-form :inline="true" :model="filterForm" class="filter-form">
            <el-form-item label="服务器">
              <el-select 
                v-model="filterForm.server" 
                placeholder="选择服务器" 
                clearable
                size="small"
                style="width: 120px;"
              >
                <el-option label="国际服" value="global" />
                <el-option label="港澳台服" value="tw" />
                <el-option label="国服" value="cn" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select 
                v-model="filterForm.status" 
                placeholder="选择状态" 
                clearable
                size="small"
                style="width: 100px;"
              >
                <el-option label="可用" value="可用" />
                <el-option label="已过期" value="已过期" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="small" @click="loadCdkList(true)">刷新列表</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col v-for="cdk in filteredCdks" :key="cdk.code" :xs="24" :sm="12" :md="8" :lg="6" class="mb-4">
        <el-card 
          :class="['cdk-card', cdk.status === '可用' ? 'available' : 'unavailable']"
          :body-style="{ padding: '0px' }"
        >
          <div v-if="cdk.image" class="cdk-image" :style="{ backgroundImage: `url(${cdk.image})` }">
            <div class="cdk-status" :class="cdk.status === '可用' ? 'status-available' : 'status-unavailable'">
              {{ cdk.status }}
            </div>
          </div>
          <div class="cdk-content">
            <h3 class="cdk-name">{{ cdk.name || '未命名CDK' }}</h3>
            <div class="cdk-code">
              <el-tag size="large" class="code-tag" @click="copyCdk(cdk.code)">
                {{ cdk.code }}
                <el-icon class="copy-icon"><Document /></el-icon>
              </el-tag>
            </div>
            <div v-if="cdk.reward" class="cdk-reward">
              <h4>奖励内容：</h4>
              <p>{{ cdk.reward }}</p>
            </div>
            <div class="cdk-servers">
              <el-tag 
                v-for="server in cdk.servers" 
                :key="server"
                size="small"
                class="server-tag"
              >
                {{ getServerName(server) }}
              </el-tag>
            </div>
            <div v-if="cdk.note" class="cdk-note">
              <el-tooltip :content="cdk.note" placement="top">
                <el-icon><InfoFilled /></el-icon>
                <span>备注</span>
              </el-tooltip>
            </div>
            <div class="cdk-author" v-if="cdk.author">
              <small>提供者: {{ cdk.author }}</small>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="filteredCdks.length === 0" description="暂无CDK" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, InfoFilled } from '@element-plus/icons-vue'
import { fetchCdkList } from '../utils/fetchCdk'
import type { CDK } from '../utils/fetchCdk'

// CDK列表数据
const cdkList = ref<CDK[]>([])
const filterForm = ref({
  server: '',
  status: ''
})

// 加载CDK列表
const loadCdkList = async (isManualRefresh = false) => {
  try {
    const data = await fetchCdkList()
    cdkList.value = data.cdks
    // 只在手动刷新时显示提示
    if (isManualRefresh) {
      ElMessage.success('CDK列表已更新')
    }
  } catch (error) {
    console.error('加载CDK列表失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '加载CDK列表失败，请稍后重试')
  }
}

// 过滤CDK列表
const filteredCdks = computed(() => {
  let result = [...cdkList.value]
  
  // 优先显示可用的CDK
  result.sort((a, b) => {
    if (a.status === '可用' && b.status !== '可用') return -1
    if (a.status !== '可用' && b.status === '可用') return 1
    return 0
  })

  // 应用过滤器
  if (filterForm.value.server) {
    result = result.filter(cdk => cdk.servers.includes(filterForm.value.server))
  }
  if (filterForm.value.status) {
    result = result.filter(cdk => cdk.status === filterForm.value.status)
  }

  return result
})

// 复制CDK
const copyCdk = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('CDK已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 获取服务器名称
const getServerName = (server) => {
  const serverNames = {
    global: '国际服',
    tw: '港澳台服',
    cn: '国服'
  }
  return serverNames[server] || server
}

// 页面加载时获取CDK列表（首次加载不显示提示）
onMounted(() => {
  console.log('CDK公告组件已挂载')
  loadCdkList(false)
})
</script>

<style scoped>
.cdk-announcement {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
}

.filter-form :deep(.el-form-item__label) {
  font-size: 13px;
  padding-right: 4px;
}

.cdk-card {
  height: 100%;
  transition: transform 0.3s;
  border: none;
  overflow: hidden;
}

.cdk-card:hover {
  transform: translateY(-5px);
}

.cdk-card.available {
  border-top: 4px solid #67c23a;
}

.cdk-card.unavailable {
  border-top: 4px solid #f56c6c;
}

.cdk-image {
  height: 160px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.cdk-status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-available {
  background-color: #67c23a;
  color: white;
}

.status-unavailable {
  background-color: #f56c6c;
  color: white;
}

.cdk-content {
  padding: 15px;
}

.cdk-name {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: bold;
}

.cdk-code {
  margin: 15px 0;
}

.code-tag {
  width: 100%;
  text-align: center;
  font-family: monospace;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.copy-icon {
  margin-left: 4px;
}

.cdk-reward {
  margin: 15px 0;
  font-size: 14px;
}

.cdk-reward h4 {
  margin: 0 0 5px;
  color: #606266;
}

.cdk-servers {
  margin: 15px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.server-tag {
  margin-right: 5px;
}

.cdk-note {
  margin: 10px 0;
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cdk-author {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
  text-align: right;
}

.mb-4 {
  margin-bottom: 16px;
}
</style> 