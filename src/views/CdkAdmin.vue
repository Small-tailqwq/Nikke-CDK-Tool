<template>
  <div class="cdk-admin">
    <el-alert
      :title="bannerTitle"
      :type="dirty ? 'warning' : 'info'"
      :closable="false"
      show-icon
      class="admin-banner"
    >
      <template #default>
        <p>{{ loadModeHint }}</p>
      </template>
    </el-alert>

    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="onFileInputChange"
    />

    <!-- 工具栏 -->
    <div class="admin-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" :loading="loading" @click="reload">
          <el-icon><Refresh /></el-icon>
          {{ cdkData ? '重新加载' : '加载数据' }}
        </el-button>
        <el-button
          type="success"
          :loading="saving"
          :disabled="!cdkData || !dirty || validation.errors.length > 0"
          @click="save"
        >
          <el-icon><Upload /></el-icon>
          {{ saveButtonText }}
        </el-button>
        <el-button :disabled="!cdkData" @click="exportJSON">
          <el-icon><Download /></el-icon>
          导出 JSON
        </el-button>
        <el-button @click="loadFromFilePicker">
          <el-icon><FolderOpened /></el-icon>
          打开本地文件
        </el-button>
        <el-button :disabled="!cdkData" text type="danger" @click="clearData">清空数据</el-button>
      </div>
      <div class="toolbar-right">
        <el-input
          ref="searchRef"
          v-model="searchKeyword"
          placeholder="搜索名称 / 代码 / 奖励 / 备注 / 组合 ID"
          clearable
          class="search-input"
          @keydown.esc.stop.prevent="onSearchEscape"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 状态栏 -->
    <div v-if="cdkData" class="admin-statusbar">
      <el-tag type="info" effect="plain" size="small">{{ fileSource }}</el-tag>
      <el-tag :type="dirty ? 'warning' : 'success'" effect="plain" size="small">
        {{ dirty ? '有未保存的修改' : '已与文件同步' }}
      </el-tag>
      <el-tag type="info" effect="plain" size="small">
        {{ totalCount }} 条目 · {{ cdkCount }} 普通 · {{ groupCount }} 组合 ·
        {{ validation.codeCount }} 个 code
      </el-tag>
      <el-tag v-if="lastSavedAt" type="info" effect="plain" size="small">
        最近保存 {{ lastSavedAt }}
      </el-tag>
    </div>

    <!-- 校验结果 -->
    <div
      v-if="cdkData && (validation.errors.length || validation.warnings.length)"
      class="admin-problems"
    >
      <el-alert
        :type="validation.errors.length ? 'error' : 'warning'"
        :closable="false"
        show-icon
        :title="problemSummary"
      >
        <template #default>
          <div class="problem-list">
            <div
              v-for="(p, i) in visibleProblems"
              :key="i"
              class="problem-item"
              :class="p.level"
              @click="focusProblem(p)"
            >
              <span class="problem-badge">{{ p.level === 'error' ? '错误' : '警告' }}</span>
              <code>{{ p.path }}</code>
              <span>{{ p.message }}</span>
            </div>
            <el-button
              v-if="allProblems.length > visibleProblems.length"
              link
              type="primary"
              size="small"
              @click="showAllProblems = true"
            >
              显示全部 {{ allProblems.length }} 条
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>
    <el-alert
      v-else-if="cdkData"
      type="success"
      :closable="false"
      show-icon
      title="数据校验通过，可直接执行 npm run validate / build"
      class="admin-problems"
    />

    <!-- 新增 + 过滤 -->
    <div v-if="cdkData" class="admin-actions">
      <el-button type="primary" @click="openCdkDialog(-1, -1)">
        <el-icon><Plus /></el-icon> 新增普通 CDK
      </el-button>
      <el-button type="warning" @click="openGroupDialog(-1)">
        <el-icon><Plus /></el-icon> 新增 CDK 组合
      </el-button>

      <el-divider direction="vertical" />

      <el-select v-model="filterType" size="default" class="filter-select">
        <el-option label="全部类型" value="all" />
        <el-option label="仅普通 CDK" value="normal" />
        <el-option label="仅组合" value="group" />
      </el-select>
      <el-select v-model="filterStatus" size="default" class="filter-select">
        <el-option label="全部状态" value="all" />
        <el-option label="可用" value="可用" />
        <el-option label="已过期" value="已过期" />
      </el-select>
      <el-select v-model="filterServer" size="default" class="filter-select">
        <el-option label="全部服务器" value="all" />
        <el-option v-for="s in VALID_SERVERS" :key="s" :label="SERVER_LABELS[s]" :value="s" />
      </el-select>

      <el-button text @click="setAllCollapsed(false)">全部展开</el-button>
      <el-button text @click="setAllCollapsed(true)">全部收起</el-button>

      <span class="actions-spacer"></span>
      <el-text type="info" size="small">显示 {{ entries.length }} / {{ totalCount }} 条目</el-text>
    </div>

    <div v-if="!cdkData" class="empty-state">
      <el-empty description="尚未加载数据，点击「加载数据」或「打开本地文件」" />
    </div>

    <div v-else class="cdk-list">
      <template v-for="entry in entries" :key="entry.key">
        <!-- 普通 CDK -->
        <article
          v-if="!entry.isGroup"
          :id="`entry-${entry.index}`"
          class="cdk-card"
          :class="{
            flash: flashIndex === entry.index,
            'is-expired': entry.item.status === '已过期',
          }"
        >
          <header class="card-head">
            <div class="card-title-row">
              <el-tag type="primary" effect="dark" size="small">普通 CDK</el-tag>
              <span class="card-title">{{ entry.item.name || '(未命名)' }}</span>
              <code class="card-code" title="点击复制" @click="copyText(entry.item.code)">
                {{ entry.item.code || '(无代码)' }}
              </code>
              <el-tag :type="statusTagType(entry.item.status)" effect="plain" size="small">
                {{ entry.item.status || '未设置' }}
              </el-tag>
              <el-tag
                v-for="s in entry.item.servers || []"
                :key="s"
                type="info"
                effect="plain"
                size="small"
              >
                {{ SERVER_LABELS[s] || s }}
              </el-tag>
            </div>
            <div class="card-actions">
              <el-button size="small" text type="primary" @click="openCdkDialog(entry.index, -1)">
                <el-icon><Edit /></el-icon> 编辑
              </el-button>
              <el-button size="small" text type="danger" @click="deleteEntry(entry.index)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </div>
          </header>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item info-wide">
                <span class="info-label">奖励</span>
                <div class="info-value reward-chips">
                  <el-tag
                    v-for="(r, ri) in splitReward(entry.item.reward)"
                    :key="ri"
                    size="small"
                    effect="light"
                  >
                    {{ r }}
                  </el-tag>
                  <span v-if="!entry.item.reward" class="muted">—</span>
                </div>
              </div>
              <div class="info-item">
                <span class="info-label">贡献者</span>
                <div class="info-value">{{ entry.item.author || '匿名' }}</div>
              </div>
              <div class="info-item">
                <span class="info-label">创建日期</span>
                <div class="info-value">{{ entry.item.created || '—' }}</div>
              </div>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-if="entry.item.note"
              class="card-note"
              v-html="formatNoteContent(entry.item.note)"
            ></div>
          </div>
        </article>

        <!-- CDK 组合 -->
        <article
          v-else
          :id="`entry-${entry.index}`"
          class="cdk-card is-group"
          :class="{ flash: flashIndex === entry.index }"
        >
          <header class="card-head">
            <div class="card-title-row">
              <el-button
                circle
                size="small"
                :title="entry.collapsed ? '展开组合' : '收起组合'"
                @click="toggleCollapse(entry.collapseKey)"
              >
                <el-icon v-if="entry.collapsed"><ArrowRight /></el-icon>
                <el-icon v-else><ArrowDown /></el-icon>
              </el-button>
              <el-tag type="success" effect="dark" size="small">CDK 组合</el-tag>
              <span class="card-title">{{ entry.item.groupName || '(未命名组合)' }}</span>
              <code class="card-code" title="点击复制" @click="copyText(entry.item.groupId)">
                {{ entry.item.groupId || '(无 ID)' }}
              </code>
              <el-tag type="info" effect="plain" size="small">
                {{ entry.subTotal }} 个子 CDK · {{ entry.availableCount }} 可用
              </el-tag>
            </div>
            <div class="card-actions">
              <el-button size="small" text type="success" @click="openCdkDialog(entry.index, -1)">
                <el-icon><Plus /></el-icon> 添加 CDK
              </el-button>
              <el-button size="small" text type="primary" @click="openGroupDialog(entry.index)">
                <el-icon><Edit /></el-icon> 编辑组合
              </el-button>
              <el-button size="small" text type="danger" @click="deleteEntry(entry.index)">
                <el-icon><Delete /></el-icon> 删除组合
              </el-button>
            </div>
          </header>

          <div v-show="!entry.collapsed" class="card-body">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-if="entry.item.note"
              class="card-note"
              v-html="formatNoteContent(entry.item.note)"
            ></div>

            <div v-if="entry.subs.length" class="sub-grid">
              <div
                v-for="sub in entry.subs"
                :key="sub.subIndex"
                class="sub-card"
                :class="{ 'is-expired': sub.item.status === '已过期' }"
              >
                <div class="sub-head">
                  <div class="sub-title-row">
                    <span class="sub-title">{{ sub.item.name || '(未命名)' }}</span>
                    <el-tag :type="statusTagType(sub.item.status)" effect="plain" size="small">
                      {{ sub.item.status || '未设置' }}
                    </el-tag>
                  </div>
                  <div class="card-actions">
                    <el-button
                      size="small"
                      text
                      type="primary"
                      @click="openCdkDialog(entry.index, sub.subIndex)"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button
                      size="small"
                      text
                      type="danger"
                      @click="deleteSub(entry.index, sub.subIndex)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                <code class="card-code" title="点击复制" @click="copyText(sub.item.code)">
                  {{ sub.item.code || '(无代码)' }}
                </code>
                <div class="reward-chips">
                  <el-tag
                    v-for="(r, ri) in splitReward(sub.item.reward)"
                    :key="ri"
                    size="small"
                    effect="light"
                  >
                    {{ r }}
                  </el-tag>
                  <span v-if="!sub.item.reward" class="muted">无奖励内容</span>
                </div>
                <div class="sub-meta">
                  <el-tag
                    v-for="s in sub.item.servers || []"
                    :key="s"
                    type="info"
                    effect="plain"
                    size="small"
                  >
                    {{ SERVER_LABELS[s] || s }}
                  </el-tag>
                  <span class="muted">{{ sub.item.created || '无日期' }}</span>
                  <span class="muted">{{ sub.item.author || '匿名' }}</span>
                </div>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div
                  v-if="sub.item.note"
                  class="card-note"
                  v-html="formatNoteContent(sub.item.note)"
                ></div>
              </div>
            </div>
            <div v-else class="muted sub-empty">
              {{
                entry.subTotal
                  ? '组合内的子 CDK 未匹配到当前筛选条件。'
                  : '组合内还没有子 CDK，点击「添加 CDK」。'
              }}
            </div>

            <div v-if="entry.hiddenSubCount > 0" class="filter-hint">
              已隐藏 {{ entry.hiddenSubCount }} 个不匹配筛选条件的子 CDK。
            </div>
          </div>
        </article>
      </template>

      <el-empty v-if="entries.length === 0" description="没有匹配的条目，试试调整搜索或筛选条件" />
    </div>

    <!-- CDK 表单（普通 CDK 与组合子 CDK 共用） -->
    <el-dialog
      v-model="cdkDialog.visible"
      :title="cdkDialogTitle"
      width="640px"
      :close-on-click-modal="false"
      :before-close="handleCdkDialogClose"
    >
      <el-form
        ref="cdkFormRef"
        :model="cdkForm"
        :rules="cdkRules"
        label-width="88px"
        @submit.prevent
      >
        <el-form-item label="CDK 代码" prop="code">
          <el-input v-model.trim="cdkForm.code" placeholder="如 NIKKEXXXXXX" spellcheck="false" />
          <div v-if="codeConflict" class="field-error">该代码已被 {{ codeConflict }} 使用</div>
        </el-form-item>
        <el-form-item label="CDK 名称" prop="name">
          <el-input v-model="cdkForm.name" placeholder="如 周年庆活动奖励" />
        </el-form-item>
        <el-form-item label="奖励内容" prop="reward">
          <RewardInput v-model="cdkForm.reward" :pool="rewardPool" />
        </el-form-item>
        <el-form-item label="服务器" prop="servers">
          <el-checkbox-group v-model="cdkForm.servers">
            <el-checkbox v-for="s in VALID_SERVERS" :key="s" :value="s">{{
              SERVER_LABELS[s]
            }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="cdkForm.available"
            active-text="可用"
            inactive-text="已过期"
            inline-prompt
          />
        </el-form-item>
        <el-form-item label="创建日期" prop="created">
          <el-date-picker
            v-model="cdkForm.created"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="贡献者">
          <el-input v-model="cdkForm.author" placeholder="留空则视为匿名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="cdkForm.note"
            type="textarea"
            :rows="3"
            placeholder="支持换行与 Markdown 链接：[文本](URL)"
          />
        </el-form-item>
        <el-form-item v-if="groupOptions.length" label="归属">
          <el-select v-model="cdkForm.targetGroup" style="width: 100%">
            <el-option label="独立的普通 CDK" :value="-1" />
            <el-option
              v-for="g in groupOptions"
              :key="g.index"
              :label="`组合：${g.label}`"
              :value="g.index"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-draft-hint">{{ cdkFormDirty ? '草稿已自动保存' : '' }}</span>
        <el-button @click="handleCdkDialogClose">取消</el-button>
        <el-button type="primary" @click="submitCdk">保存</el-button>
      </template>
    </el-dialog>

    <!-- 组合表单 -->
    <el-dialog
      v-model="groupDialog.visible"
      :title="groupDialog.index >= 0 ? '编辑 CDK 组合' : '新增 CDK 组合'"
      width="560px"
      :close-on-click-modal="false"
      :before-close="handleGroupDialogClose"
    >
      <el-form
        ref="groupFormRef"
        :model="groupForm"
        :rules="groupRules"
        label-width="88px"
        @submit.prevent
      >
        <el-form-item label="组合 ID" prop="groupId">
          <el-input
            v-model.trim="groupForm.groupId"
            placeholder="如 NIKKE_2026_ANNIV"
            spellcheck="false"
          />
        </el-form-item>
        <el-form-item label="组合名称" prop="groupName">
          <el-input v-model="groupForm.groupName" placeholder="如 2026 周年庆" />
        </el-form-item>
        <el-form-item label="组合描述">
          <el-input
            v-model="groupForm.note"
            type="textarea"
            :rows="3"
            placeholder="支持 Markdown 链接"
          />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="groupDialog.index < 0"
        type="info"
        :closable="false"
        title="保存后，在组合卡片上点击「添加 CDK」录入子 CDK（组合必须至少包含一个子 CDK 才能通过校验）"
      />

      <template #footer>
        <span class="dialog-draft-hint">{{ groupFormDirty ? '草稿已自动保存' : '' }}</span>
        <el-button @click="handleGroupDialogClose">取消</el-button>
        <el-button type="primary" @click="submitGroup">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
// 图标必须显式导入：ElementPlusResolver 只解析 <el-icon-xxx> 写法，
// 直接写 <Refresh /> 不会被自动注册（旧版本这里的图标其实一直是空白的）
import {
  ArrowDown,
  ArrowRight,
  Delete,
  Download,
  Edit,
  FolderOpened,
  Plus,
  Refresh,
  Search,
  Upload,
} from '@element-plus/icons-vue'
import RewardInput from '@/components/admin/RewardInput.vue'
import { formatNoteContent } from '@/utils/noteUtils'
import {
  validateCdkSource,
  collectCodeLocations,
  SERVER_LABELS,
  VALID_SERVERS,
} from '@/utils/cdkValidation.mjs'

const SOURCE_API = `${import.meta.env.BASE_URL}__cdk-admin/source`.replace(/([^:])\/{2,}/g, '$1/')
const STATIC_SOURCE = `${import.meta.env.BASE_URL}cdk-list.source.json`.replace(
  /([^:])\/{2,}/g,
  '$1/'
)
const DRAFT_CDK_KEY = 'cdkAdmin.draft.cdk'
const DRAFT_GROUP_KEY = 'cdkAdmin.draft.group'

/* ---------------- 数据与加载状态 ---------------- */

const cdkData = ref(null)
const sourceMtime = ref(0)
const sourceCsrfToken = ref('')
const loadMode = ref('none') // none | api | static | file | file-ro
const fileSource = ref('')
const lastSavedAt = ref('')
const loading = ref(false)
const saving = ref(false)
const savedSnapshot = ref('')
const fileInputRef = ref(null)
const searchRef = ref(null)
let fileHandle = null
let fileLastModified = 0

/** 快照不含 lastUpdate：该字段只在写文件时更新，不应算作用户改动 */
function snapshotOf(data) {
  if (!data) return ''
  return JSON.stringify({ version: data.version, cdks: data.cdks })
}

const dirty = computed(() => !!cdkData.value && snapshotOf(cdkData.value) !== savedSnapshot.value)

const canWriteSource = computed(() => loadMode.value === 'api')
const saveButtonText = computed(() => {
  if (canWriteSource.value) return '保存到源文件'
  if (fileHandle) return '写回所选文件'
  return '导出 JSON'
})

const bannerTitle = computed(
  () => `⚙️ CDK 管理后台 — 仅开发环境可用${dirty.value ? '（有未保存的修改）' : ''}`
)

const loadModeHint = computed(() => {
  switch (loadMode.value) {
    case 'api':
      return '已连接 Dev Server 写入接口，「保存到源文件」会直接写入 public/cdk-list.source.json（自动备份到 node_modules/.cache）。快捷键 Ctrl+S。'
    case 'static':
      return 'Dev Server 写入接口不可用（请确认以 npm run dev 启动），当前为只读加载，修改后请用「导出 JSON」或「打开本地文件」后写回。'
    case 'file':
      return '已通过文件系统访问 API 打开本地文件，可直接写回该文件。'
    case 'file-ro':
      return '当前浏览器不支持直接写文件，修改后请使用「导出 JSON」并覆盖 public/cdk-list.source.json。'
    default:
      return '点击「加载数据」从 Dev Server 读取 public/cdk-list.source.json。'
  }
})

/* ---------------- 统计与校验 ---------------- */

const totalCount = computed(() => cdkData.value?.cdks?.length || 0)
const cdkCount = computed(
  () => (cdkData.value?.cdks || []).filter((c) => c?.type !== 'group').length
)
const groupCount = computed(
  () => (cdkData.value?.cdks || []).filter((c) => c?.type === 'group').length
)

const validation = computed(() =>
  cdkData.value
    ? validateCdkSource(cdkData.value)
    : { errors: [], warnings: [], codeCount: 0, groupCount: 0 }
)

const allProblems = computed(() => [...validation.value.errors, ...validation.value.warnings])
const showAllProblems = ref(false)
const visibleProblems = computed(() =>
  showAllProblems.value ? allProblems.value : allProblems.value.slice(0, 8)
)
const problemSummary = computed(
  () =>
    `${validation.value.errors.length} 个错误 · ${validation.value.warnings.length} 个警告（点击条目可定位）`
)

const codeLocations = computed(() => collectCodeLocations(cdkData.value))

/* ---------------- 奖励联想池 ---------------- */

const rewardPool = computed(() => {
  const map = new Map()

  const feed = (reward) => {
    if (!reward || typeof reward !== 'string') return
    reward.split(/[,，]/).forEach((seg) => {
      const s = seg.trim()
      if (!s) return
      const idx = s.lastIndexOf('×')
      const name = (idx > 0 ? s.slice(0, idx) : s).trim()
      const qty = idx > 0 ? s.slice(idx + 1).trim() : ''
      if (!name) return
      let entry = map.get(name)
      if (!entry) {
        entry = { name, count: 0, qty: new Map() }
        map.set(name, entry)
      }
      entry.count++
      if (qty) entry.qty.set(qty, (entry.qty.get(qty) || 0) + 1)
    })
  }

  ;(cdkData.value?.cdks || []).forEach((item) => {
    if (item?.type === 'group') {
      ;(item.cdks || []).forEach((sub) => feed(sub?.reward))
    } else {
      feed(item?.reward)
    }
  })

  return Array.from(map.values())
    .map((e) => ({
      name: e.name,
      count: e.count,
      quantities: Array.from(e.qty.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || Number(a.value) - Number(b.value)),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

/* ---------------- 搜索与筛选 ---------------- */

const searchKeyword = ref('')
const filterType = ref('all')
const filterStatus = ref('all')
const filterServer = ref('all')
const collapsed = reactive({})
const flashIndex = ref(-1)

const attrFilterActive = computed(
  () => filterStatus.value !== 'all' || filterServer.value !== 'all'
)

function groupKeyOf(item, index) {
  return item?.groupId ? `g:${item.groupId}` : `i:${index}`
}

function textHit(value, kw) {
  return String(value ?? '')
    .toLowerCase()
    .includes(kw)
}

function matchCdk(cdk, kw) {
  if (!cdk) return false
  if (!kw) return true
  return [cdk.code, cdk.name, cdk.reward, cdk.note, cdk.author, cdk.created, cdk.status]
    .concat(Array.isArray(cdk.servers) ? cdk.servers.join(',') : '')
    .some((f) => textHit(f, kw))
}

function passAttrFilter(cdk) {
  if (!cdk) return false
  if (filterStatus.value !== 'all' && (cdk.status || '') !== filterStatus.value) return false
  if (filterServer.value !== 'all' && !(cdk.servers || []).includes(filterServer.value))
    return false
  return true
}

/**
 * 关键点：每个条目都带上它在 cdkData.cdks 里的真实下标，
 * 编辑/删除一律使用该下标，避免筛选后按渲染顺序索引导致改错数据。
 */
const entries = computed(() => {
  const items = cdkData.value?.cdks
  if (!Array.isArray(items)) return []
  const kw = searchKeyword.value.trim().toLowerCase()
  const out = []

  items.forEach((item, index) => {
    const isGroup = item?.type === 'group'
    if (filterType.value === 'normal' && isGroup) return
    if (filterType.value === 'group' && !isGroup) return

    if (!isGroup) {
      if (!passAttrFilter(item)) return
      if (!matchCdk(item, kw)) return
      out.push({ key: `n-${index}-${item?.code || ''}`, index, isGroup: false, item })
      return
    }

    const subs = Array.isArray(item.cdks) ? item.cdks : []
    const attrPassed = subs
      .map((sub, subIndex) => ({ item: sub, subIndex }))
      .filter((s) => passAttrFilter(s.item))

    const metaHit = !kw || [item.groupId, item.groupName, item.note].some((f) => textHit(f, kw))
    const kwPassed = kw && !metaHit ? attrPassed.filter((s) => matchCdk(s.item, kw)) : attrPassed

    // 空组合仍需展示（否则用户无从修复「组合至少需要一个子 CDK」的校验错误）
    if (subs.length > 0 && kwPassed.length === 0 && !(metaHit && !attrFilterActive.value)) return
    if (subs.length === 0 && (kw || attrFilterActive.value) && !metaHit) return

    const key = groupKeyOf(item, index)
    out.push({
      key: `g-${index}-${item.groupId || ''}`,
      collapseKey: key,
      index,
      isGroup: true,
      item,
      subs: kwPassed,
      subTotal: subs.length,
      availableCount: subs.filter((s) => s?.status === '可用').length,
      hiddenSubCount: subs.length - kwPassed.length,
      // 搜索命中子项时强制展开，否则结果会「藏」在折叠的组合里
      collapsed: kw && kwPassed.length ? false : !!collapsed[key],
    })
  })

  return out
})

const groupOptions = computed(() =>
  (cdkData.value?.cdks || [])
    .map((item, index) => ({ item, index }))
    .filter((x) => x.item?.type === 'group')
    .map((x) => ({ index: x.index, label: x.item.groupName || x.item.groupId || `#${x.index}` }))
)

function toggleCollapse(key) {
  collapsed[key] = !collapsed[key]
}

function setAllCollapsed(value) {
  ;(cdkData.value?.cdks || []).forEach((item, index) => {
    if (item?.type === 'group') collapsed[groupKeyOf(item, index)] = value
  })
}

function onSearchEscape() {
  if (searchKeyword.value) searchKeyword.value = ''
  else searchRef.value?.blur()
}

function focusProblem(problem) {
  if (problem.index < 0) return
  // 条目可能被当前筛选隐藏，先清掉筛选再滚动
  searchKeyword.value = ''
  filterType.value = 'all'
  filterStatus.value = 'all'
  filterServer.value = 'all'
  const item = cdkData.value?.cdks?.[problem.index]
  if (item?.type === 'group') collapsed[groupKeyOf(item, problem.index)] = false

  nextTick(() => {
    document
      .getElementById(`entry-${problem.index}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    flashIndex.value = problem.index
    setTimeout(() => {
      if (flashIndex.value === problem.index) flashIndex.value = -1
    }, 1800)
  })
}

/* ---------------- 展示辅助 ---------------- */

function splitReward(reward) {
  if (!reward) return []
  return reward
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function statusTagType(status) {
  if (status === '可用') return 'success'
  if (status === '已过期') return 'danger'
  return 'warning'
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`已复制 ${text}`)
  } catch {
    ElMessage.warning('复制失败，请手动选择文本')
  }
}

/* ---------------- 加载 ---------------- */

function applyLoaded(data, mode, source, mtime = 0) {
  if (!data || typeof data !== 'object') throw new Error('文件内容不是对象')
  if (!Array.isArray(data.cdks)) throw new Error('缺少 cdks 数组')
  cdkData.value = data
  loadMode.value = mode
  fileSource.value = source
  sourceMtime.value = mtime
  savedSnapshot.value = snapshotOf(data)
  showAllProblems.value = false
  Object.keys(collapsed).forEach((k) => delete collapsed[k])
}

async function loadFromApi() {
  const resp = await fetch(SOURCE_API, { headers: { Accept: 'application/json' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const payload = await resp.json()
  if (!payload?.ok) throw new Error(payload?.error || '接口返回失败')
  if (!payload.csrfToken) throw new Error('写入接口未返回 CSRF 令牌')
  sourceCsrfToken.value = payload.csrfToken
  applyLoaded(payload.data, 'api', `${payload.file}（可写）`, payload.mtime)
}

async function loadFromStatic() {
  const resp = await fetch(STATIC_SOURCE)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  applyLoaded(await resp.json(), 'static', 'cdk-list.source.json（只读）')
}

async function reload() {
  if (dirty.value) {
    const ok = await confirmDiscard('重新加载会丢弃当前未保存的修改，确定继续吗？')
    if (!ok) return
  }
  loading.value = true
  fileHandle = null
  fileLastModified = 0
  sourceCsrfToken.value = ''
  try {
    await loadFromApi()
    ElMessage.success('已从源文件加载')
  } catch {
    try {
      await loadFromStatic()
      ElMessage.warning('写入接口不可用，已按只读模式加载')
    } catch (e2) {
      ElMessage.error('加载失败：' + e2.message)
    }
  } finally {
    loading.value = false
  }
}

function loadFromFilePicker() {
  if ('showOpenFilePicker' in window) loadViaFSAPI()
  else fileInputRef.value?.click()
}

async function loadViaFSAPI() {
  if (dirty.value && !(await confirmDiscard('打开新文件会丢弃当前未保存的修改，确定继续吗？')))
    return
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      excludeAcceptAllOption: true,
      multiple: false,
    })
    const file = await handle.getFile()
    applyLoaded(JSON.parse(await file.text()), 'file', `${file.name}（可写回）`)
    fileHandle = handle
    fileLastModified = file.lastModified
    ElMessage.success('文件加载成功')
  } catch (e) {
    if (e.name !== 'AbortError') ElMessage.error('加载失败：' + e.message)
  }
}

function onFileInputChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      applyLoaded(JSON.parse(ev.target.result), 'file-ro', `${file.name}（只读）`)
      fileHandle = null
      fileLastModified = 0
      ElMessage.success('文件加载成功')
    } catch (err) {
      ElMessage.error('JSON 解析失败：' + err.message)
    }
  }
  reader.readAsText(file)
}

/* ---------------- 保存 ---------------- */

function stampAndSerialize() {
  cdkData.value.lastUpdate = new Date().toISOString()
  return JSON.stringify(cdkData.value, null, 2)
}

async function save() {
  if (!cdkData.value) return
  if (validation.value.errors.length) {
    ElMessage.error(`当前存在 ${validation.value.errors.length} 个校验错误，请修正后再保存`)
    return
  }

  saving.value = true
  try {
    if (canWriteSource.value) await saveToSource()
    else if (fileHandle) await saveToHandle()
    else exportJSON()
  } finally {
    saving.value = false
  }
}

async function postSource(mtime = sourceMtime.value) {
  cdkData.value.lastUpdate = new Date().toISOString()
  const resp = await fetch(SOURCE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CDK-Admin-CSRF': sourceCsrfToken.value,
    },
    body: JSON.stringify({ data: cdkData.value, mtime }),
  })
  return { resp, payload: await resp.json().catch(() => ({})) }
}

async function saveToSource() {
  let { resp, payload } = await postSource()

  if (resp.status === 409) {
    try {
      await ElMessageBox.confirm(
        '源文件在编辑期间被其他程序修改过。覆盖将丢弃磁盘上的改动。',
        '文件冲突',
        { type: 'warning', confirmButtonText: '覆盖保存', cancelButtonText: '取消' }
      )
    } catch {
      ElMessage.info('已取消保存，可点击「重新加载」拉取最新内容')
      return
    }
    ;({ resp, payload } = await postSource(payload.mtime))
  }

  if (!resp.ok || !payload?.ok) {
    ElMessage.error('保存失败：' + (payload?.error || `HTTP ${resp.status}`))
    return
  }

  sourceMtime.value = payload.mtime
  savedSnapshot.value = snapshotOf(cdkData.value)
  lastSavedAt.value = new Date().toLocaleTimeString()
  ElMessage.success('已写入 public/cdk-list.source.json')
}

async function saveToHandle() {
  try {
    const opts = { mode: 'readwrite' }
    if ((await fileHandle.queryPermission(opts)) !== 'granted') {
      if ((await fileHandle.requestPermission(opts)) !== 'granted') {
        ElMessage.warning('未获得写入权限，请改用「导出 JSON」')
        return
      }
    }
    const currentFile = await fileHandle.getFile()
    if (fileLastModified && currentFile.lastModified !== fileLastModified) {
      try {
        await ElMessageBox.confirm(
          '所选文件在编辑期间被其他程序修改过。继续会覆盖磁盘上的改动。',
          '文件冲突',
          { type: 'warning', confirmButtonText: '覆盖保存', cancelButtonText: '取消' }
        )
      } catch {
        ElMessage.info('已取消保存，请重新打开文件以载入最新内容')
        return
      }
    }
    const writable = await fileHandle.createWritable()
    await writable.write(stampAndSerialize() + '\n')
    await writable.close()
    fileLastModified = (await fileHandle.getFile()).lastModified
    savedSnapshot.value = snapshotOf(cdkData.value)
    lastSavedAt.value = new Date().toLocaleTimeString()
    ElMessage.success('已写回所选文件')
  } catch (e) {
    ElMessage.error('保存失败：' + e.message + '，可改用「导出 JSON」')
  }
}

function exportJSON() {
  if (!cdkData.value) return
  const blob = new Blob([stampAndSerialize() + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cdk-list.source.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  savedSnapshot.value = snapshotOf(cdkData.value)
  lastSavedAt.value = new Date().toLocaleTimeString()
  ElMessage.success('导出完成，请覆盖 public/cdk-list.source.json')
}

async function clearData() {
  if (!(await confirmDiscard('确定清空当前编辑器中的所有条目吗？（不会立即影响磁盘文件）'))) return
  cdkData.value = {
    version: cdkData.value?.version ?? 2.5,
    lastUpdate: new Date().toISOString(),
    cdks: [],
  }
  Object.keys(collapsed).forEach((k) => delete collapsed[k])
  ElMessage.success('已清空，保存后才会写入文件')
}

async function confirmDiscard(message) {
  try {
    await ElMessageBox.confirm(message, '请确认', {
      type: 'warning',
      confirmButtonText: '继续',
      cancelButtonText: '取消',
    })
    return true
  } catch {
    return false
  }
}

/* ---------------- CDK 表单 ---------------- */

const today = () => new Date().toISOString().slice(0, 10)

const emptyCdkForm = () => ({
  code: '',
  name: '',
  reward: '',
  servers: ['global'],
  available: true,
  note: '',
  author: '',
  created: today(),
  targetGroup: -1,
})

const cdkDialog = reactive({ visible: false, groupIndex: -1, cdkIndex: -1 })
const cdkForm = ref(emptyCdkForm())
const cdkFormRef = ref(null)
let cdkFormSnapshot = ''
let cdkOriginalCode = null

const cdkDialogTitle = computed(() => {
  if (cdkDialog.groupIndex >= 0) {
    const name = cdkData.value?.cdks?.[cdkDialog.groupIndex]?.groupName || '组合'
    return cdkDialog.cdkIndex >= 0 ? `编辑「${name}」中的 CDK` : `向「${name}」添加 CDK`
  }
  return cdkDialog.cdkIndex >= 0 ? '编辑普通 CDK' : '新增普通 CDK'
})

const cdkFormDirty = computed(
  () => cdkDialog.visible && JSON.stringify(cdkForm.value) !== cdkFormSnapshot
)

/** 当前正在编辑的位置，用于把自身排除出重复检测 */
const editingLocation = computed(() =>
  cdkDialog.groupIndex >= 0
    ? { index: cdkDialog.groupIndex, subIndex: cdkDialog.cdkIndex }
    : { index: cdkDialog.cdkIndex, subIndex: -1 }
)

/** 全局重复检测：覆盖普通 CDK 与所有组合子 CDK，与 validate-cdk 判定一致 */
const codeConflict = computed(() => {
  const code = cdkForm.value.code?.trim()
  if (!code || !cdkDialog.visible) return ''
  const self = editingLocation.value
  const hit = (codeLocations.value.get(code) || []).find(
    (loc) => !(loc.index === self.index && loc.subIndex === self.subIndex)
  )
  if (!hit) return ''
  const owner = cdkData.value.cdks[hit.index]
  return hit.subIndex >= 0
    ? `组合「${owner?.groupName || owner?.groupId}」`
    : `条目 #${hit.index + 1}`
})

const cdkRules = {
  code: [
    { required: true, message: '请输入 CDK 代码', trigger: 'blur' },
    {
      validator: (_r, value, cb) => (codeConflict.value ? cb(new Error('CDK 代码重复')) : cb()),
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请输入 CDK 名称', trigger: 'blur' }],
  reward: [{ required: true, message: '请输入奖励内容', trigger: 'change' }],
  servers: [
    { type: 'array', required: true, min: 1, message: '至少选择一个服务器', trigger: 'change' },
  ],
  created: [
    { required: true, message: '请选择创建日期', trigger: 'change' },
    { pattern: /^\d{4}-\d{2}-\d{2}$/, message: '日期格式应为 YYYY-MM-DD', trigger: 'change' },
  ],
}

const groupRules = {
  groupId: [{ required: true, message: '请输入组合 ID', trigger: 'blur' }],
  groupName: [{ required: true, message: '请输入组合名称', trigger: 'blur' }],
}

function openCdkDialog(index, subIndex) {
  const item = index >= 0 ? cdkData.value.cdks[index] : null
  const isGroupContext = item?.type === 'group'

  cdkDialog.groupIndex = isGroupContext ? index : -1
  cdkDialog.cdkIndex = isGroupContext ? subIndex : index

  const source = isGroupContext ? (subIndex >= 0 ? item.cdks?.[subIndex] : null) : item
  cdkOriginalCode = typeof source?.code === 'string' ? source.code : null

  cdkForm.value = source
    ? {
        code: source.code || '',
        name: source.name || '',
        reward: source.reward || '',
        servers: [...(source.servers || ['global'])],
        available: source.status !== '已过期',
        note: source.note || '',
        author: source.author || '',
        created: source.created || today(),
        targetGroup: cdkDialog.groupIndex,
      }
    : { ...emptyCdkForm(), targetGroup: cdkDialog.groupIndex }

  cdkFormSnapshot = JSON.stringify(cdkForm.value)
  cdkDialog.visible = true
  nextTick(() => cdkFormRef.value?.clearValidate())
}

async function submitCdk() {
  try {
    await cdkFormRef.value.validate()
  } catch {
    return
  }
  if (codeConflict.value) {
    ElMessage.error(`CDK 代码已被${codeConflict.value}使用`)
    return
  }

  const f = cdkForm.value
  const payload = {
    code: f.code.trim(),
    name: f.name.trim(),
    reward: f.reward.trim().replace(/[,，]\s*$/, ''),
    servers: [...f.servers],
    status: f.available ? '可用' : '已过期',
    note: f.note || '',
    author: f.author || '',
    created: f.created || today(),
  }

  const list = cdkData.value.cdks
  const fromGroup = cdkDialog.groupIndex
  const toGroup = Number(f.targetGroup)
  const moved = fromGroup !== toGroup
  // 用对象引用而不是下标：从顶层移除条目会让后面所有组合的下标前移
  const targetGroup = toGroup >= 0 ? list[toGroup] : null
  if (toGroup >= 0 && targetGroup?.type !== 'group') {
    ElMessage.error('目标组合已不存在，请重新选择')
    return
  }

  if (moved && cdkDialog.cdkIndex >= 0) {
    if (fromGroup >= 0) list[fromGroup].cdks.splice(cdkDialog.cdkIndex, 1)
    else list.splice(cdkDialog.cdkIndex, 1)
  }

  if (targetGroup) {
    if (!Array.isArray(targetGroup.cdks)) targetGroup.cdks = []
    if (!moved && cdkDialog.cdkIndex >= 0) targetGroup.cdks[cdkDialog.cdkIndex] = payload
    else targetGroup.cdks.push(payload)
    collapsed[groupKeyOf(targetGroup, list.indexOf(targetGroup))] = false
  } else if (!moved && cdkDialog.cdkIndex >= 0) {
    list[cdkDialog.cdkIndex] = payload
  } else {
    list.push(payload)
  }

  clearDraft(DRAFT_CDK_KEY)
  clearTimeout(draftTimer)
  cdkDialog.visible = false
  cdkFormSnapshot = JSON.stringify(cdkForm.value)
  ElMessage.success(moved ? '已保存并移动归属' : '已保存到编辑器，记得点「保存」写入文件')
}

async function handleCdkDialogClose() {
  if (cdkFormDirty.value && !(await confirmDiscard('表单有未保存的修改，确定关闭吗？'))) return
  clearDraft(DRAFT_CDK_KEY)
  clearTimeout(draftTimer)
  cdkDialog.visible = false
}

/* ---------------- 组合表单 ---------------- */

const emptyGroupForm = () => ({ groupId: '', groupName: '', note: '' })
const groupDialog = reactive({ visible: false, index: -1 })
const groupForm = ref(emptyGroupForm())
const groupFormRef = ref(null)
let groupFormSnapshot = ''
let groupOriginalId = null

const groupFormDirty = computed(
  () => groupDialog.visible && JSON.stringify(groupForm.value) !== groupFormSnapshot
)

function openGroupDialog(index) {
  groupDialog.index = index
  const item = index >= 0 ? cdkData.value.cdks[index] : null
  groupOriginalId = item?.type === 'group' && typeof item.groupId === 'string' ? item.groupId : null
  groupForm.value = item
    ? { groupId: item.groupId || '', groupName: item.groupName || '', note: item.note || '' }
    : emptyGroupForm()
  groupFormSnapshot = JSON.stringify(groupForm.value)
  groupDialog.visible = true
  nextTick(() => groupFormRef.value?.clearValidate())
}

async function submitGroup() {
  try {
    await groupFormRef.value.validate()
  } catch {
    return
  }

  const f = groupForm.value
  const duplicated = cdkData.value.cdks.some(
    (c, i) => c?.type === 'group' && c.groupId === f.groupId && i !== groupDialog.index
  )
  if (duplicated) {
    ElMessage.error('组合 ID 重复')
    return
  }

  if (groupDialog.index >= 0) {
    const target = cdkData.value.cdks[groupDialog.index]
    // 就地更新，保留子 CDK 数组引用与折叠状态
    target.groupId = f.groupId
    target.groupName = f.groupName
    target.note = f.note || ''
  } else {
    cdkData.value.cdks.push({
      type: 'group',
      groupId: f.groupId,
      groupName: f.groupName,
      note: f.note || '',
      cdks: [],
    })
  }

  clearDraft(DRAFT_GROUP_KEY)
  clearTimeout(groupDraftTimer)
  groupDialog.visible = false
  groupFormSnapshot = JSON.stringify(groupForm.value)
  ElMessage.success('组合已保存到编辑器')
}

async function handleGroupDialogClose() {
  if (groupFormDirty.value && !(await confirmDiscard('表单有未保存的修改，确定关闭吗？'))) return
  clearDraft(DRAFT_GROUP_KEY)
  clearTimeout(groupDraftTimer)
  groupDialog.visible = false
}

/* ---------------- 删除 ---------------- */

async function deleteEntry(index) {
  const item = cdkData.value.cdks[index]
  const label =
    item?.type === 'group'
      ? `组合「${item.groupName || item.groupId}」及其 ${item.cdks?.length || 0} 个子 CDK`
      : `CDK「${item?.name || item?.code}」`
  if (!(await confirmDiscard(`确定删除 ${label} 吗？`))) return
  if (item?.type === 'group') delete collapsed[groupKeyOf(item, index)]
  cdkData.value.cdks.splice(index, 1)
  ElMessage.success('已删除')
}

async function deleteSub(index, subIndex) {
  const sub = cdkData.value.cdks[index]?.cdks?.[subIndex]
  if (!(await confirmDiscard(`确定删除子 CDK「${sub?.name || sub?.code}」吗？`))) return
  cdkData.value.cdks[index].cdks.splice(subIndex, 1)
  ElMessage.success('已删除')
}

/* ---------------- 草稿 ---------------- */

function readDraft(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeDraft(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...payload, updatedAt: Date.now() }))
  } catch {
    /* 存储写满时忽略即可，草稿不是关键路径 */
  }
}

function clearDraft(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* 同上 */
  }
}

let draftTimer = null
watch(
  [cdkForm, () => cdkDialog.visible],
  () => {
    clearTimeout(draftTimer)
    if (!cdkDialog.visible || !cdkFormDirty.value) return
    draftTimer = setTimeout(
      () =>
        writeDraft(DRAFT_CDK_KEY, {
          form: cdkForm.value,
          identityCode: cdkOriginalCode,
          targetGroupId:
            cdkForm.value.targetGroup >= 0
              ? cdkData.value?.cdks?.[cdkForm.value.targetGroup]?.groupId || null
              : null,
        }),
      400
    )
  },
  { deep: true }
)

let groupDraftTimer = null
watch(
  [groupForm, () => groupDialog.visible],
  () => {
    clearTimeout(groupDraftTimer)
    if (!groupDialog.visible || !groupFormDirty.value) return
    groupDraftTimer = setTimeout(
      () =>
        writeDraft(DRAFT_GROUP_KEY, {
          form: groupForm.value,
          identityGroupId: groupOriginalId,
        }),
      400
    )
  },
  { deep: true }
)

async function offerDraftRestore() {
  const cdkDraft = readDraft(DRAFT_CDK_KEY)
  const groupDraft = readDraft(DRAFT_GROUP_KEY)
  const latest = [
    cdkDraft && { kind: 'cdk', draft: cdkDraft },
    groupDraft && { kind: 'group', draft: groupDraft },
  ]
    .filter(Boolean)
    .sort((a, b) => (b.draft.updatedAt || 0) - (a.draft.updatedAt || 0))[0]

  if (!latest) return

  const when = new Date(latest.draft.updatedAt || Date.now()).toLocaleString()
  try {
    await ElMessageBox.confirm(
      `检测到 ${when} 未保存的${latest.kind === 'cdk' ? ' CDK ' : '组合'}表单草稿，是否恢复？`,
      '恢复草稿',
      { type: 'info', confirmButtonText: '恢复', cancelButtonText: '丢弃' }
    )
  } catch {
    clearDraft(DRAFT_CDK_KEY)
    clearDraft(DRAFT_GROUP_KEY)
    return
  }

  if (latest.kind === 'cdk') {
    const { form, identityCode, targetGroupId } = latest.draft
    const list = cdkData.value?.cdks || []
    let location = { groupIndex: -1, cdkIndex: -1 }
    if (typeof identityCode === 'string' && identityCode) {
      list.some((item, index) => {
        if (item?.type === 'group') {
          const subIndex = item.cdks?.findIndex((sub) => sub?.code === identityCode) ?? -1
          if (subIndex >= 0) {
            location = { groupIndex: index, cdkIndex: subIndex }
            return true
          }
          return false
        }
        if (item?.code === identityCode) {
          location = { groupIndex: -1, cdkIndex: index }
          return true
        }
        return false
      })
    }
    const targetGroupIndex = targetGroupId
      ? list.findIndex((item) => item?.type === 'group' && item.groupId === targetGroupId)
      : -1
    cdkDialog.groupIndex = location.groupIndex
    cdkDialog.cdkIndex = location.cdkIndex
    cdkOriginalCode = location.cdkIndex >= 0 ? identityCode : null
    cdkForm.value = { ...emptyCdkForm(), ...form, targetGroup: targetGroupIndex }
    cdkFormSnapshot = ''
    cdkDialog.visible = true
  } else {
    const { form, identityGroupId } = latest.draft
    groupDialog.index =
      typeof identityGroupId === 'string'
        ? (cdkData.value?.cdks || []).findIndex(
            (item) => item?.type === 'group' && item.groupId === identityGroupId
          )
        : -1
    groupOriginalId = groupDialog.index >= 0 ? identityGroupId : null
    groupForm.value = { ...emptyGroupForm(), ...form }
    groupFormSnapshot = ''
    groupDialog.visible = true
  }
}

/* ---------------- 离开保护 / 快捷键 ---------------- */

function onBeforeUnload(e) {
  if (dirty.value || cdkFormDirty.value || groupFormDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (dirty.value && !saving.value) save()
  }
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  return await confirmDiscard('离开该页面会丢弃未保存的修改，确定离开吗？')
})

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeydown)
  loading.value = true
  try {
    await loadFromApi()
  } catch {
    await loadFromStatic().catch((e) => ElMessage.error('加载失败：' + e.message))
  } finally {
    loading.value = false
  }
  if (cdkData.value) await offerDraftRestore()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(draftTimer)
  clearTimeout(groupDraftTimer)
})
</script>

<style lang="scss" scoped>
.cdk-admin {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 0 60px;
}

.admin-banner {
  margin-bottom: 14px;

  p {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.6;
  }
}

.admin-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.admin-statusbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.admin-problems {
  margin-bottom: 16px;
}

.problem-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.problem-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  code {
    font-family: monospace;
    opacity: 0.8;
  }
}

.problem-badge {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  background: var(--el-color-warning);

  .problem-item.error & {
    background: var(--el-color-danger);
  }
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.filter-select {
  width: 130px;
}

.actions-spacer {
  flex: 1;
}

.empty-state {
  padding: 60px 0;
}

.cdk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cdk-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-bg-color-overlay);
  transition:
    box-shadow 0.2s,
    border-color 0.4s,
    background-color 0.4s;

  &:hover {
    box-shadow: var(--el-box-shadow-light);
  }

  &.is-group {
    border-left: 3px solid var(--el-color-success);
  }

  &.is-expired {
    opacity: 0.72;
  }

  &.flash {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.card-code {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12.5px;
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  user-select: all;

  &:hover {
    color: var(--el-color-primary);
  }
}

.card-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.card-body {
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px 16px;
}

.info-wide {
  grid-column: 1 / -1;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info-label {
  font-size: 11px;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.info-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.reward-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.card-note {
  background: var(--el-fill-color-lighter);
  border-left: 3px solid var(--el-color-primary-light-5);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  word-break: break-word;
}

.sub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.sub-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);

  &.is-expired {
    opacity: 0.7;
  }
}

.sub-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.sub-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.sub-title {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--el-text-color-primary);
}

.sub-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
}

.sub-empty {
  padding: 8px 0;
}

.muted {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.filter-hint {
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  padding: 6px 10px;
}

.field-error {
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 1.6;
}

.dialog-draft-hint {
  float: left;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 32px;
}

@media screen and (max-width: 768px) {
  .admin-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-right,
  .search-input {
    width: 100%;
  }

  .filter-select {
    flex: 1 1 100px;
    width: auto;
  }

  .card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .sub-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
