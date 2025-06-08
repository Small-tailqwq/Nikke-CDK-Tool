<template>
  <div class="cdk-announcement">
    <el-row :gutter="20" class="mb-4">
      <el-col :span="24">
        <el-card class="filter-card">
          <div class="filter-header">
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

            <!-- 批量操作按钮 -->
            <div v-if="selectedCdks.length > 0" class="batch-actions">
              <el-button 
                type="success" 
                size="small"
                @click="handleBatchExchange"
              >
                批量兑换 ({{ selectedCdks.length }})
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col v-for="cdk in filteredCdks" :key="cdk.code" :xs="24" :sm="12" :md="8" :lg="6" class="mb-4">
        <el-card 
          class="cdk-card"
          :class="{ 'available': cdk.status === '可用', 'unavailable': cdk.status !== '可用' }"
          body-style="padding: 0; display: flex; flex-direction: column;"
        >
          <!-- 复选框 -->
          <div class="cdk-checkbox-wrapper">
            <el-checkbox
              v-model="selectedCdks"
              :label="cdk.code"
              :disabled="cdk.status!=='可用'"
              class="cdk-checkbox"
              :show-label="false"
            />
          </div>

          <!-- Header / 图片 -->
          <div class="cdk-image" :class="{ 'has-image': !!cdk.image }">
            <template v-if="cdk.image">
              <img
                v-if="imageLoadStates[cdk.code] === 'success'"
                :src="imageUrls[cdk.code] || cdk.image"
                :alt="cdk.name || '未命名CDK'"
                @error="handleImageError(cdk.code)"
                @load="handleImageLoad(cdk.code)"
              />
              <div v-else-if="imageLoadStates[cdk.code] === 'loading'" class="image-loading">
                <el-icon class="loading-icon"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
              <div v-else class="image-error">
                <el-icon><Picture /></el-icon>
                <span>图片加载失败</span>
              </div>
            </template>
            <div v-else class="image-placeholder">
              <el-icon><Picture /></el-icon>
              <span>暂无图片</span>
            </div>

            <!-- 状态条 -->
            <div
              class="cdk-status"
              :class="cdk.status==='可用' ? 'status-available' : 'status-unavailable'"
            >
              {{ cdk.status }}
            </div>
          </div>

          <!-- Body -->
          <div class="cdk-content">
            <h3>{{ cdk.name || '未命名CDK' }}</h3>

            <el-tag 
              class="code-tag" 
              size="large" 
              :class="{ copied: copiedCode === cdk.code }"
              @mousedown="copyCdk(cdk.code, $event)"
            >
              {{ cdk.code }}
              <el-icon><Document /></el-icon>
            </el-tag>

            <div v-if="cdk.reward" class="cdk-reward">
              <h4>奖励内容：</h4>
              <p>{{ cdk.reward }}</p>
            </div>

            <div class="cdk-servers">
              <el-tag 
                v-for="server in cdk.servers" 
                :key="server"
                size="small"
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
          </div>

          <!-- Footer -->
          <div v-if="cdk.author" class="cdk-footer">
            提供者：{{ cdk.author }}
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
import { Document, InfoFilled, Loading, Picture } from '@element-plus/icons-vue'
import { fetchCdkList } from '../utils/fetchCdk'
import { safeImg } from '../utils/img'
import type { CDK } from '../utils/fetchCdk'
import { useRouter } from 'vue-router'

const router = useRouter()

// CDK列表数据
const cdkList = ref<CDK[]>([])
const filterForm = ref({
  server: '',
  status: ''
})

// 选中的CDK列表
const selectedCdks = ref<string[]>([])

// 复制状态管理
const copiedCode = ref<string | null>(null)

// 图片加载状态
const imageLoadStates = ref<Record<string, 'loading' | 'success' | 'error'>>({})

// 存储处理后的图片URL
const imageUrls = ref<Record<string, string>>({})

// 处理单个CDK的图片URL
const processCdkImage = async (cdk: CDK) => {
  if (!cdk.image) {
    imageLoadStates.value[cdk.code] = 'error'
    return
  }
  
  imageLoadStates.value[cdk.code] = 'loading'
  try {
    const safeUrl = await safeImg(cdk.image)
    imageUrls.value[cdk.code] = safeUrl
    imageLoadStates.value[cdk.code] = 'success'
  } catch (e) {
    console.error('处理图片URL失败:', e)
    imageLoadStates.value[cdk.code] = 'error'
  }
}

// 加载CDK列表
const loadCdkList = async (manual = false) => {
  try {
    const { cdks } = await fetchCdkList()
    cdkList.value = cdks
    // 处理所有CDK的图片URL
    await Promise.all(cdks.map(processCdkImage))
    manual && ElMessage.success('CDK列表已更新')
  } catch (e) {
    ElMessage.error('加载CDK列表失败，请稍后重试')
    console.error(e)
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
const copyCdk = async (code: string, e: MouseEvent) => {
  // 阻止默认事件，避免可能的组件内部处理
  e.preventDefault()
  e.stopPropagation()
  
  try {
    // ① 写剪贴板
    await navigator.clipboard.writeText(code)
    
    // ② 设置"点击位置"变量供 CSS 用
    const target = e.target as HTMLElement
    // 确保获取到正确的元素
    const tagElement = target.closest('.code-tag')
    if (!tagElement) return
    
    const rect = tagElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    tagElement.style.setProperty('--x', `${x}px`)
    tagElement.style.setProperty('--y', `${y}px`)
    
    // ③ 打开动画
    copiedCode.value = code
    ElMessage.success('CDK已复制到剪贴板')
    
    // ④ 1s 后（0.5s 等待 + 0.5s 卷帘动画）移除状态
    setTimeout(() => {
      copiedCode.value = null
    }, 1000)
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

// 批量兑换处理
const handleBatchExchange = () => {
  if (selectedCdks.value.length === 0) return
  
  // 将选中的CDK通过路由参数传递到兑换页面
  const cdkString = selectedCdks.value.join('\n')
  router.push({
    path: '/cdk',
    query: { cdks: cdkString }
  })
  
  // 清空选择
  selectedCdks.value = []
}

// 处理图片加载错误
const handleImageError = (code: string) => {
  imageLoadStates.value[code] = 'error'
}

// 处理图片加载成功
const handleImageLoad = (code: string) => {
  imageLoadStates.value[code] = 'success'
}

// 页面加载时获取CDK列表（首次加载不显示提示）
onMounted(() => {
  console.log('CDK公告组件已挂载')
  loadCdkList(false)
})
</script>

<style lang="scss" scoped>
/* =============== 通用 =============== */
.cdk-announcement{ padding:20px; }
.filter-card{ margin-bottom:20px; }
.mb-4{ margin-bottom:16px; }

/* =============== 卡片 =============== */
.cdk-card{
  position:relative;
  overflow:hidden;
  /* ★ 1. 只保留底部圆角，解决顶部空缺 */
  border-radius:0 0 8px 8px;
  border:none;height:100%;
  animation:fadeInUp .3s ease-out;
  transition:transform .25s;
  &:hover{ transform:translateY(-4px); }
  &.available  { border-top:4px solid #67c23a; }
  &.unavailable{ border-top:4px solid #f56c6c; }
}

/* =============== 混入 =============== */
@mixin abs-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* =============== 图片头部 =============== */
.cdk-image {
  width: 100%;
  height: 120px;
  position: relative;
  border-radius: 0 0 8px 8px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  
  &.has-image { 
    background: none; 
  }
  
  img { 
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .3s;
    
    &:hover { 
      transform: scale(1.05); 
    } 
  }

  .image-placeholder,
  .image-loading,
  .image-error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #909399;
    font-size: 14px;
    font-weight: 500;

    .el-icon {
      font-size: 24px;
      opacity: 0.8;
    }
  }

  .image-loading {
    .loading-icon {
      animation: rotate 1s linear infinite;
    }
  }

  .image-error {
    color: #f56c6c;
  }
}

/* =============== 状态条 =============== */
.cdk-status{
  position:absolute;top:10px;right:10px;
  padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;color:#fff;
  height:20px;display:inline-flex;align-items:center;
  &.status-available  { background:#67c23a; }
  &.status-unavailable{ background:#f56c6c; }
}

/* =============== 复选框 =============== */
.cdk-checkbox-wrapper{
  position:absolute;top:8px;left:8px;z-index:20;
  width:24px;height:24px;border-radius:6px;
  background:#fff;
  border:1px solid rgba(0,0,0,.15);
  box-shadow:0 1px 3px rgba(0,0,0,.2);
  display:flex;align-items:center;justify-content:center;
  transition:background .2s,border-color .2s,box-shadow .2s;
  &:hover{ box-shadow:0 2px 6px rgba(0,0,0,.25); }
}
.cdk-checkbox{
  pointer-events:auto;
  margin:0;  /* 移除默认外边距 */
  :deep(.el-checkbox__input){
    width:100%;height:100%;display:flex;align-items:center;justify-content:center;
    .el-checkbox__inner{
      width:14px;height:14px;border-radius:3px;
      &::after{ width:3px;height:7px;left:4px;top:1px; }
    }
  }
  /* 移除标签相关样式 */
  :deep(.el-checkbox__label){
    display:none;
  }
}

/* =============== 正文区域 =============== */
.cdk-content{
  flex:1;padding:16px;display:flex;flex-direction:column;gap:12px;
  h3{margin:0;font-size:18px;font-weight:600;}
}
.cdk-reward{ h4{margin:0;color:#606266;font-size:14px;}
             p{margin:4px 0 0;color:#606266;font-size:14px;} }
.cdk-servers,.cdk-note{display:flex;flex-wrap:wrap;gap:6px;}
.cdk-note{font-size:12px;color:#909399;align-items:center;}

/* =============== 复制按钮动画 =============== */
.code-tag{
  position:relative;overflow:hidden;width:100%;
  display:flex;justify-content:center;align-items:center;gap:8px;
  font-family:monospace;font-size:16px;cursor:pointer;
  transition:all .3s;
  &::before{
    content:'';position:absolute;left:var(--x,50%);top:var(--y,50%);
    width:20px;height:20px;background:#67c23a;border-radius:50%;
    transform:translate(-50%,-50%) scale(0);
    pointer-events:none;z-index:1;
    opacity:0;  /* 初始状态完全透明 */
    visibility:hidden;  /* 完全隐藏 */
  }
  &::after{
    content:'';position:absolute;inset:0;background:var(--el-tag-bg-color,#f0f9eb);
    transform:translateY(-100%);pointer-events:none;z-index:2;
  }
  &.copied{
    color:#fff;background:#67c23a;border-color:#67c23a;
    &::before{
      opacity:1;  /* 显示涟漪效果 */
      visibility:visible;  /* 显示 */
      animation:rippleFill .4s ease-out forwards;
    }
    &::after {animation:curtainReset .5s ease-out .5s forwards;}
  }
}
@keyframes rippleFill{ to{ transform:translate(-50%,-50%) scale(22);} }
@keyframes curtainReset{ to{ transform:translateY(0);} }

/* =============== Footer =============== */
.cdk-footer{padding:0 16px 12px;font-size:12px;color:#909399;text-align:right;}

/* =============== 动画 & 暗黑适配 =============== */
@keyframes fadeInUp{ from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
@media (prefers-color-scheme:dark){
  .cdk-card{ background:var(--el-bg-color-overlay); }
  .cdk-image:not(.has-image){ background:linear-gradient(135deg,#2c2c2c 0%,#1d1e1f 100%); }
  .code-tag::after{ background:var(--el-tag-bg-color,#1d1e1f); }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 