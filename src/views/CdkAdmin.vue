<template>
  <div class="cdk-admin">
    <el-alert
      :title="`⚙️ CDK 管理后台 — 仅供开发环境使用 (加载方式: ${loadMode})`"
      type="warning"
      :closable="false"
      show-icon
      class="admin-banner"
    >
      <template #default>
        <p>
          {{ loadModeHint }}
        </p>
      </template>
    </el-alert>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="onFileInputChange"
    />

    <div class="admin-toolbar">
      <div class="toolbar-left">
        <el-button
          :type="loadMode === 'dev-server' ? 'success' : 'primary'"
          :loading="loading"
          @click="loadFromDevServer"
        >
          <el-icon><Refresh /></el-icon>
          {{ cdkData ? '重新加载' : '从 Dev Server 加载' }}
        </el-button>
        <el-button @click="loadFromFilePicker">
          <el-icon><FolderOpened /></el-icon>
          从本地文件加载
        </el-button>
        <el-button
          type="success"
          :disabled="!cdkData || loadMode === 'dev-server'"
          @click="saveFile"
        >
          <el-icon><Upload /></el-icon>
          保存到本地文件
        </el-button>
        <el-button
          type="info"
          :disabled="!cdkData"
          @click="exportJSON"
        >
          <el-icon><Download /></el-icon>
          导出 JSON
        </el-button>
        <el-tag v-if="fileSource" type="info" effect="plain" size="large">
          {{ fileSource }}
        </el-tag>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索名称/CDK代码/奖励…"
          clearable
          style="width: 260px"
          @input="onSearchChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <div class="admin-actions">
      <el-button type="primary" @click="openAddDialog(false)">+ 新增普通 CDK</el-button>
      <el-button type="warning" @click="openAddDialog(true)">+ 新增 CDK 组合</el-button>
      <el-text v-if="cdkData" type="info">
        共 {{ totalCount }} 个条目（{{ cdkCount }} 普通 CDK + {{ groupCount }} 组合）
      </el-text>
    </div>

    <div v-if="!cdkData" class="empty-state">
      <el-empty description="请先加载 cdk-list.source.json 文件" />
    </div>

    <div v-else class="cdk-list">
      <div
        v-for="(item, index) in filteredCdks"
        :key="getItemKey(item, index)"
        class="cdk-list-item"
      >
        <div class="cdk-item-header">
          <el-tag v-if="item.type === 'group'" type="success" effect="dark">组合</el-tag>
          <el-tag v-else type="" effect="dark">CDK</el-tag>
          <span class="cdk-item-title">
            {{ item.type === 'group' ? item.groupName : item.name }}
          </span>
          <span v-if="item.type !== 'group'" class="cdk-item-code">
            {{ item.code }}
          </span>
          <el-tag
            :type="(item.type === 'group' ? item.cdks?.[0]?.status : item.status) === '可用' ? 'success' : 'danger'"
            effect="plain"
            size="small"
          >
            {{ (item.type === 'group' ? item.cdks?.[0]?.status : item.status) || '未设置' }}
          </el-tag>
          <span class="cdk-item-spacer"></span>
          <el-button size="small" text type="primary" @click="editItem(index)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" text type="danger" @click="deleteItem(index)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
        <div v-if="item.type === 'group' && item.cdks" class="cdk-item-subs">
          <el-tag
            v-for="(sub, si) in item.cdks"
            :key="si"
            :type="sub.status === '可用' ? 'success' : 'danger'"
            effect="plain"
            size="small"
          >
            {{ sub.code }}
          </el-tag>
          <span v-if="item.cdks.length === 0" class="empty-hint">暂无子 CDK</span>
        </div>
        <div v-if="item.type !== 'group'" class="cdk-item-meta">
          <span>奖励: {{ item.reward }}</span>
          <span>服务器: {{ item.servers?.join(', ') }}</span>
          <span>创建: {{ item.created }}</span>
          <span v-if="item.author">贡献: {{ item.author }}</span>
        </div>
      </div>

      <el-empty v-if="filteredCdks.length === 0" description="未找到匹配的 CDK" />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      destroy-on-close
      @closed="onDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        label-position="right"
      >
        <template v-if="formData._type === 'group'">
          <el-form-item label="组合 ID" prop="groupId">
            <el-input v-model="formData.groupId" placeholder="如 NIKKE_2026_01" />
          </el-form-item>
          <el-form-item label="组合名称" prop="groupName">
            <el-input v-model="formData.groupName" placeholder="如 2026周年庆" />
          </el-form-item>
          <el-form-item label="组合描述">
            <el-input
              v-model="formData.note"
              type="textarea"
              :rows="2"
              placeholder="组合的说明文字"
            />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="CDK 代码" prop="code">
            <el-input v-model="formData.code" placeholder="如 NIKKEXXXXXX" />
          </el-form-item>
          <el-form-item label="CDK 名称" prop="name">
            <el-input v-model="formData.name" placeholder="如 活动奖励" />
          </el-form-item>
          <el-form-item label="奖励内容" prop="reward">
            <el-autocomplete
              v-model="formData.reward"
              :fetch-suggestions="fetchRewardSuggestions"
              placeholder="如 珠宝×300, 招募券×5"
              clearable
              style="width: 100%"
              @select="onRewardSelect"
            />
          </el-form-item>
          <el-form-item label="服务器" prop="servers">
            <el-checkbox-group v-model="formData.servers">
              <el-checkbox label="global">国际服</el-checkbox>
              <el-checkbox label="cn">国服</el-checkbox>
              <el-checkbox label="tw">港澳台服</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="状态">
            <el-switch
              v-model="formData._available"
              active-text="可用"
              inactive-text="已过期"
            />
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="formData.note"
              type="textarea"
              :rows="3"
              placeholder="备注信息，支持 Markdown 链接: [文本](URL)"
            />
          </el-form-item>
          <el-form-item label="贡献者">
            <el-input v-model="formData.author" placeholder="留空则匿名" />
          </el-form-item>
          <el-form-item label="创建日期" prop="created">
            <el-date-picker
              v-model="formData.created"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </template>
      </el-form>

      <template v-if="formData._type === 'group' && formData._cdks">
        <el-divider>组合内的 CDK</el-divider>
        <div class="group-cdk-list">
          <div
            v-for="(sub, si) in formData._cdks"
            :key="si"
            class="group-cdk-row"
          >
            <div class="group-cdk-fields">
              <el-input
                v-model="sub.code"
                placeholder="CDK 代码"
                style="width: 180px"
                size="small"
              />
              <el-input
                v-model="sub.name"
                placeholder="名称"
                style="width: 140px"
                size="small"
              />
              <el-input
                v-model="sub.reward"
                placeholder="奖励"
                style="width: 180px"
                size="small"
              />
              <el-select
                v-model="sub.servers"
                multiple
                placeholder="服务器"
                style="width: 140px"
                size="small"
              >
                <el-option label="国际服" value="global" />
                <el-option label="国服" value="cn" />
                <el-option label="港澳台" value="tw" />
              </el-select>
              <el-switch
                v-model="sub._available"
                active-text="可用"
                size="small"
              />
              <el-button size="small" type="danger" @click="removeGroupCdk(si)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-input
              v-model="sub.note"
              placeholder="备注（支持 Markdown 链接）"
              size="small"
              class="group-cdk-note"
            />
            <div class="group-cdk-meta">
              <el-input
                v-model="sub.author"
                placeholder="贡献者"
                size="small"
                style="width: 160px"
              />
              <el-date-picker
                v-model="sub.created"
                type="date"
                placeholder="创建日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                size="small"
                style="width: 160px"
              />
            </div>
          </div>
        </div>
        <el-button size="small" type="primary" plain @click="addGroupCdk" style="margin-top: 8px">
          + 添加子 CDK
        </el-button>
      </template>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit } from '@element-plus/icons-vue'

let fileHandle = null
const cdkData = ref(null)
const searchKeyword = ref('')
const fileSource = ref('')
const loadMode = ref('未加载')
const loading = ref(false)
const fileInputRef = ref(null)

const loadModeHint = computed(() => {
  if (loadMode.value === 'dev-server') return '自动从 Vite Dev Server 加载 (无需手动选文件)，修改后点"导出 JSON"保存。'
  if (loadMode.value === 'file-picker') return '已通过本地文件加载，可用 FSA 直接写回（Chromium 专属）或导出 JSON。'
  return '点击"从 Dev Server 加载"自动读取 public/cdk-list.source.json，或"从本地文件加载"手动选择。'
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref(null)
const editingIndex = ref(-1)
const editingGroupIndex = ref(-1)

const defaultCdk = () => ({
  _type: 'normal',
  code: '',
  name: '',
  reward: '',
  servers: ['global'],
  _available: true,
  note: '',
  author: '',
  created: new Date().toISOString().slice(0, 10)
})

const defaultGroup = () => ({
  _type: 'group',
  groupId: '',
  groupName: '',
  note: '',
  _cdks: []
})

const formData = ref(defaultCdk())

const formRules = {
  code: [{ required: true, message: '请输入 CDK 代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入 CDK 名称', trigger: 'blur' }],
  reward: [{ required: true, message: '请输入奖励内容', trigger: 'blur' }],
  servers: [{ type: 'array', required: true, min: 1, message: '至少选择一个服务器', trigger: 'change' }],
  created: [{ required: true, message: '请选择创建日期', trigger: 'change' }],
  groupId: [{ required: true, message: '请输入组合 ID', trigger: 'blur' }],
  groupName: [{ required: true, message: '请输入组合名称', trigger: 'blur' }]
}

const totalCount = computed(() => cdkData.value?.cdks?.length || 0)

const cdkCount = computed(() => {
  if (!cdkData.value?.cdks) return 0
  return cdkData.value.cdks.filter(c => c.type !== 'group').length
})

const groupCount = computed(() => {
  if (!cdkData.value?.cdks) return 0
  return cdkData.value.cdks.filter(c => c.type === 'group').length
})

const filteredCdks = computed(() => {
  if (!cdkData.value?.cdks) return []
  const kw = searchKeyword.value.toLowerCase().trim()
  if (!kw) return cdkData.value.cdks

  return cdkData.value.cdks.filter((item) => {
    if (item.type === 'group') {
      if (item.groupId?.toLowerCase().includes(kw)) return true
      if (item.groupName?.toLowerCase().includes(kw)) return true
      if (item.note?.toLowerCase().includes(kw)) return true
      if (item.cdks) {
        return item.cdks.some((sub) => matchesSubCdk(sub, kw))
      }
      return false
    }
    return matchesSingleCdk(item, kw)
  })
})

function matchesSingleCdk(cdk, kw) {
  return [cdk.code, cdk.name, cdk.reward, cdk.note, cdk.author, cdk.created, cdk.status]
    .some((f) => f?.toLowerCase().includes(kw))
}

function matchesSubCdk(sub, kw) {
  return [sub.code, sub.name, sub.reward, sub.note]
    .some((f) => f?.toLowerCase().includes(kw))
}

function getItemKey(item, index) {
  return item.type === 'group' ? `group-${item.groupId}-${index}` : `cdk-${item.code}-${index}`
}

function onSearchChange() {
  // debounce handled by computed
}

async function loadFromDevServer() {
  loading.value = true
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}cdk-list.source.json`.replace('//', '/'))
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    cdkData.value = json
    loadMode.value = 'dev-server'
    fileHandle = null
    fileSource.value = '已加载: cdk-list.source.json (Dev Server)'
    ElMessage.success('已从 Dev Server 加载数据')
    updateLastUpdate()
  } catch (e) {
    ElMessage.error('从 Dev Server 加载失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function loadFromFilePicker() {
  const supportsFSA = 'showOpenFilePicker' in window
  if (supportsFSA) {
    loadViaFSAPI()
  } else {
    // fallback to traditional file input
    fileInputRef.value?.click()
  }
}

async function loadViaFSAPI() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      excludeAcceptAllOption: true,
      multiple: false
    })
    fileHandle = handle
    const file = await handle.getFile()
    const text = await file.text()
    cdkData.value = JSON.parse(text)
    loadMode.value = 'file-picker'
    fileSource.value = `已加载: ${file.name}`
    ElMessage.success('文件加载成功')
    updateLastUpdate()
  } catch (e) {
    if (e.name !== 'AbortError') {
      ElMessage.error('加载失败: ' + e.message)
    }
  }
}

function onFileInputChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      cdkData.value = JSON.parse(ev.target.result)
      loadMode.value = 'file-picker'
      fileHandle = null
      fileSource.value = `已加载: ${file.name} (只读模式)`
      ElMessage.success('文件加载成功')
      updateLastUpdate()
    } catch (err) {
      ElMessage.error('JSON 解析失败: ' + err.message)
    }
  }
  reader.readAsText(file)
  // reset so the same file can be re-selected
  e.target.value = ''
}

async function saveFile() {
  if (!fileHandle) {
    ElMessage.warning('仅支持通过 File System Access API 直接写回。请点"导出 JSON"保存。')
    return
  }

  try {
    cdkData.value.lastUpdate = new Date().toISOString()
    // verify permission first
    const opts = { mode: 'readwrite' }
    if ((await fileHandle.queryPermission(opts)) !== 'granted') {
      await fileHandle.requestPermission(opts)
    }
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(cdkData.value, null, 2))
    await writable.close()
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败: ' + e.message + '，请尝试导出 JSON')
  }
}

function exportJSON() {
  if (!cdkData.value) return
  cdkData.value.lastUpdate = new Date().toISOString()
  const blob = new Blob([JSON.stringify(cdkData.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cdk-list.source.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('导出完成。请将下载的文件覆盖 public/cdk-list.source.json')
}

function updateLastUpdate() {
  if (cdkData.value) {
    cdkData.value.lastUpdate = new Date().toISOString()
  }
}

function buildRewardPool() {
  const map = new Map()
  if (!cdkData.value?.cdks) return

  cdkData.value.cdks.forEach((item) => {
    if (item.type === 'group' && item.cdks) {
      item.cdks.forEach((sub) => extractRewardItems(sub.reward, map))
    } else {
      extractRewardItems(item.reward, map)
    }
  })
  return Array.from(map.entries())
    .map(([name, count]) => ({ value: name, count }))
    .sort((a, b) => b.count - a.count)
}

function extractRewardItems(rewardStr, map) {
  if (!rewardStr) return
  rewardStr.split(',').forEach((seg) => {
    const s = seg.trim()
    if (!s) return
    const idx = s.lastIndexOf('×')
    const name = idx > 0 ? s.substring(0, idx).trim() : s
    map.set(name, (map.get(name) || 0) + 1)
  })
}

let rewardPool = []

function fetchRewardSuggestions(queryString, cb) {
  if (rewardPool.length === 0) {
    rewardPool = buildRewardPool() || []
  }
  const kw = (queryString || '').toLowerCase()
  const results = kw
    ? rewardPool.filter((r) => r.value.toLowerCase().includes(kw)).slice(0, 10)
    : rewardPool.slice(0, 5)
  cb(results)
}

function onRewardSelect(item) {
  if (formData.value.reward) {
    const prefix = formData.value.reward.lastIndexOf(',')
    if (prefix >= 0) {
      formData.value.reward = formData.value.reward.substring(0, prefix + 1) + item.value + '×'
    } else {
      formData.value.reward = item.value + '×'
    }
  }
}

function openAddDialog(isGroup) {
  rewardPool = buildRewardPool() || []
  editingIndex.value = -1
  editingGroupIndex.value = -1

  if (isGroup) {
    dialogTitle.value = '添加 CDK 组合'
    formData.value = defaultGroup()
  } else {
    dialogTitle.value = '添加普通 CDK'
    formData.value = defaultCdk()
  }
  dialogVisible.value = true
}

function editItem(index) {
  const item = cdkData.value.cdks[index]
  rewardPool = buildRewardPool() || []

  if (item.type === 'group') {
    dialogTitle.value = '编辑 CDK 组合'
    editingGroupIndex.value = index
    editingIndex.value = -1
    formData.value = {
      _type: 'group',
      groupId: item.groupId || '',
      groupName: item.groupName || '',
      note: item.note || '',
      _cdks: (item.cdks || []).map((sub) => ({
        ...sub,
        _available: sub.status !== '已过期'
      }))
    }
  } else {
    dialogTitle.value = '编辑普通 CDK'
    editingIndex.value = index
    editingGroupIndex.value = -1
    formData.value = {
      _type: 'normal',
      code: item.code || '',
      name: item.name || '',
      reward: item.reward || '',
      servers: [...(item.servers || ['global'])],
      _available: item.status !== '已过期',
      note: item.note || '',
      author: item.author || '',
      created: item.created || new Date().toISOString().slice(0, 10)
    }
  }
  dialogVisible.value = true
}

function deleteItem(index) {
  ElMessageBox.confirm('确定要删除此项吗？此操作不可恢复。', '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    cdkData.value.cdks.splice(index, 1)
    updateLastUpdate()
    ElMessage.success('已删除')
  }).catch(() => {})
}

function addGroupCdk() {
  if (!formData.value._cdks) formData.value._cdks = []
  formData.value._cdks.push({
    code: '',
    name: '',
    reward: '',
    servers: ['global'],
    _available: true,
    note: '',
    author: '',
    created: new Date().toISOString().slice(0, 10)
  })
}

function removeGroupCdk(index) {
  ElMessageBox.confirm('确定要删除此子 CDK 吗？此操作将在保存后生效。', '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    formData.value._cdks.splice(index, 1)
    ElMessage.success('已删除，保存后生效')
  }).catch(() => {})
}

async function submitForm() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const fd = formData.value
  let savedItem

  if (fd._type === 'group') {
    if (fd.groupId && cdkData.value.cdks.some(
      (c, i) => c.type === 'group' && c.groupId === fd.groupId && i !== editingGroupIndex.value
    )) {
      ElMessage.error('组合 ID 重复')
      return
    }

    savedItem = {
      type: 'group',
      groupId: fd.groupId,
      groupName: fd.groupName,
      note: fd.note || '',
      cdks: (fd._cdks || []).map((sub) => ({
        code: sub.code,
        name: sub.name,
        reward: sub.reward,
        servers: sub.servers || ['global'],
        status: sub._available ? '可用' : '已过期',
        note: sub.note || '',
        author: sub.author || '',
        created: sub.created || new Date().toISOString().slice(0, 10)
      }))
    }
  } else {
    if (fd.code && cdkData.value.cdks.some(
      (c, i) => c.type !== 'group' && c.code === fd.code && i !== editingIndex.value
    )) {
      ElMessage.error('CDK 代码重复')
      return
    }

    savedItem = {
      code: fd.code,
      name: fd.name,
      reward: fd.reward,
      servers: fd.servers || ['global'],
      status: fd._available ? '可用' : '已过期',
      note: fd.note || '',
      author: fd.author || '',
      created: fd.created || new Date().toISOString().slice(0, 10)
    }
  }

  if (editingGroupIndex.value >= 0) {
    cdkData.value.cdks[editingGroupIndex.value] = savedItem
  } else if (editingIndex.value >= 0) {
    cdkData.value.cdks[editingIndex.value] = savedItem
  } else {
    cdkData.value.cdks.push(savedItem)
  }

  updateLastUpdate()
  dialogVisible.value = false
  rewardPool = buildRewardPool() || []
  ElMessage.success('保存成功')
}

function onDialogClosed() {
  editingIndex.value = -1
  editingGroupIndex.value = -1
}

onMounted(() => {
  loadFromDevServer()
})
</script>

<style lang="scss" scoped>
.cdk-admin {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 0 40px;
}

.admin-banner {
  margin-bottom: 16px;

  p {
    margin: 4px 0 0;
    font-size: 13px;
  }
}

.admin-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.empty-state {
  padding: 60px 0;
}

.cdk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cdk-list-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 14px 18px;
  background: var(--el-fill-color-blank);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: var(--el-box-shadow-light);
  }
}

.cdk-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.cdk-item-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.cdk-item-code {
  font-family: monospace;
  font-size: 13px;
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--el-text-color-regular);
}

.cdk-item-spacer {
  flex: 1;
}

.cdk-item-subs {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.cdk-item-meta {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.empty-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.group-cdk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-cdk-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
}

.group-cdk-fields {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.group-cdk-note {
  width: 100%;
}

.group-cdk-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

@media screen and (max-width: 768px) {
  .admin-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-right {
    width: 100%;

    .el-input {
      width: 100% !important;
    }
  }

  .cdk-item-header {
    gap: 6px;
  }

  .cdk-item-meta {
    flex-direction: column;
    gap: 4px;
  }

  .group-cdk-row {
    .group-cdk-fields {
      flex-direction: column;
      align-items: stretch;

      .el-input,
      .el-select {
        width: 100% !important;
      }
    }

    .group-cdk-meta {
      flex-direction: column;
      align-items: stretch;

      .el-input,
      .el-date-editor {
        width: 100% !important;
      }
    }
  }
}
</style>
