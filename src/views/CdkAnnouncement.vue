<template>
  <div class="cdk-announcement">
    <!-- NIKKE 情报过滤面板 -->
    <div class="filter-panel">
      <div class="filter-panel-inner">
        <div class="filter-fields">
          <div class="filter-item">
            <span class="filter-label">服务器</span>
            <el-select
              v-model="filterForm.server"
              placeholder="选择服务器"
              clearable
              size="small"
              style="width: 110px"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option label="国际服" :value="'global'" />
              <el-option label="港澳台服" :value="'tw'" />
              <el-option label="国服" :value="'cn'" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="filter-label">状态</span>
            <el-select
              v-model="filterForm.status"
              placeholder="选择状态"
              clearable
              size="small"
              style="width: 100px"
              @change="handleStatusChange"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option label="可用" value="可用" />
              <el-option label="部分可用" value="部分可用" />
              <el-option label="已过期" value="已过期" />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="filter-label">角色</span>
            <el-select
              v-model="filterForm.character"
              placeholder="选择角色"
              clearable
              size="small"
              style="width: 130px"
              @change="handleCharacterChange"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option
                v-for="user in userStore.users"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </div>
          <div class="filter-item">
            <span class="filter-label">排序</span>
            <el-select
              v-model="filterForm.sortOrder"
              placeholder="排序"
              size="small"
              style="width: 95px"
              @visible-change="handleDropdownVisibleChange"
            >
              <el-option label="最新" value="desc" />
              <el-option label="最早" value="asc" />
            </el-select>
          </div>
        </div>
        <div class="filter-actions">
          <button
            v-if="selectedCdks.length > 0"
            class="nikke-btn nikke-btn-primary"
            @click="handleBatchExchange"
          >
            <span class="btn-dot"></span>
            批量兑换
            <span class="btn-count">{{ selectedCdks.length }}</span>
          </button>
          <button class="nikke-btn nikke-btn-ghost" @click="openSubmitCdk">
            提交 CDK
          </button>
        </div>
      </div>
    </div>

    <!-- 真正的瀑布流容器 -->
    <MasonryLayout :items="filteredCdks" :column-width="220" :gap="20" :get-item-key="getCdkKey">
      <template #default="{ item: cdk, index }">
        <!-- 广告卡片 -->
        <AdCard
          v-if="isAdData(cdk)"
          :ad-data="{
            groupName: (cdk as any).groupName,
            note: (cdk as any).note,
            image: (cdk as any).image,
            status: (cdk as any).status,
            githubUrl: (cdk as any).githubUrl,
            closeable: (cdk as any).closeable,
            adBlockerClass: (cdk as any).adBlockerClass,
          }"
          @ad-closed="handleAdClosed"
        />

        <!-- CDK组合卡片 -->
        <CDKGroupCard
          v-else-if="isCDKGroup(cdk)"
          :group="cdk"
          v-model:selectedCdks="selectedCdks"
          :exchange-status="getCdkExchangeStatus(cdk)"
          :selected-user-exchange-history="selectedUserExchangeHistory"
        />

        <!-- 单个CDK卡片 — NIKKE 玻璃卡 -->
        <div
          v-else
          class="single-card-wrapper"
          @pointerenter="onCardPointerEnter"
          @pointermove="onCardPointerMove"
          @pointerleave="onCardPointerLeave"
        >
        <div
          class="nikke-card"
          :class="{
            available: cdk.status === '可用',
            unavailable: cdk.status !== '可用',
          }"
        >
          <!-- 复选框 -->
          <div class="cdk-checkbox-wrapper">
            <el-checkbox
              :model-value="selectedCdks.includes(cdk.code)"
              :disabled="cdk.status !== '可用'"
              class="cdk-checkbox"
              :show-label="false"
              @change="handleCdkSelection(cdk.code, $event)"
            />
          </div>

          <!-- Header / 图片 -->
          <div class="cdk-image" :class="{ 'has-image': !!cdk.image }">
            <img
              v-if="cdk.image"
              :src="getImageUrl(cdk.image)"
              :srcset="getImageSrcset(cdk.image)"
              :alt="cdk.name || '未命名CDK'"
              loading="lazy"
            />
            <div v-else class="image-placeholder">
              <el-icon><Picture /></el-icon>
              <span>暂无图片</span>
            </div>

            <div
              v-if="!(filterForm.character && getCdkExchangeStatus(cdk) === '已兑换')"
              class="cdk-status"
              :class="cdk.status === '可用' ? 'status-available' : 'status-unavailable'"
            >
              {{ cdk.status }}
            </div>

            <div
              v-if="getCdkExchangeStatus(cdk)"
              class="exchange-status"
              :class="{
                'exchange-not-redeemed': getCdkExchangeStatus(cdk) === '未兑换',
                'exchange-redeemed': getCdkExchangeStatus(cdk) === '已兑换',
                'exchange-exhausted': getCdkExchangeStatus(cdk) === '已失效',
              }"
            >
              {{ getCdkExchangeStatus(cdk) }}
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
              <span class="code-text" :style="'--char-count:'+cdk.code.length">{{ cdk.code }}</span>
              <el-icon class="copy-icon"><Document /></el-icon>
            </el-tag>

            <div v-if="cdk.reward" class="cdk-reward">
              <h4>奖励内容：</h4>
              <p>{{ cdk.reward }}</p>
            </div>

            <div class="cdk-servers">
              <el-tag v-for="server in cdk.servers" :key="server" size="small">
                {{ getServerName(server) }}
              </el-tag>
            </div>

            <div v-if="cdk.note" class="cdk-note">
              <el-tooltip
                placement="top"
                :show-after="500"
                :teleported="true"
                popper-class="cdk-note-tooltip"
                :append-to-body="true"
                raw-content
              >
                <template #content>
                  <div class="note-content" v-html="formatNoteContent(cdk.note)"></div>
                </template>
                <div class="note-trigger">
                  <el-icon><InfoFilled /></el-icon>
                  <span>备注</span>
                </div>
              </el-tooltip>
            </div>

            <div v-if="cdk.created" class="cdk-created">收录时间：{{ cdk.created }}</div>

            <div v-if="cdk.author" class="cdk-author">提供者：{{ cdk.author }}</div>
          </div>
        </div>
      </div>
      </template>
    </MasonryLayout>

    <el-empty v-if="filteredCdks.length === 0" description="暂无CDK" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Document, InfoFilled, Picture } from '@element-plus/icons-vue'
import { getImageUrl, getImageSrcset } from '@/utils/imageUtils'
import {
  fetchCdkList,
  isCDKGroup,
  isSingleCDK,
  getGroupCodes,
  getGroupStatus,
  getGroupServers,
} from '../utils/fetchCdk'
import type { CDK, SingleCDK, CDKGroup } from '../utils/fetchCdk'
import { useRouter } from 'vue-router'
import CDKGroupCard from '../components/CDKGroupCard.vue'
import MasonryLayout from '../components/MasonryLayout.vue'
import AdCard from '../components/AdCard.vue'
import { showCustomMessage } from '../utils/customMessage'
import { useUserStore } from '../stores/user'
import { useExchangeStore } from '../stores/exchange'
import { formatNoteContent } from '../utils/noteUtils'
import type { CheckboxValueType } from 'element-plus'
import { useCardTilt } from '@/composables/useCardTilt'
// 导入广告注入器
import { injectAd, isAdData } from '../utils/adInjector.js'

type ServerType = 'global' | 'tw' | 'cn'
type FilterForm = {
  server: ServerType | '' // 使用空字符串作为未选择状态，避免传递 null 给 el-select
  status: string
  sortOrder: 'desc' | 'asc'
  character: string | '' // 使用空字符串作为未选择状态
}

const router = useRouter()
const userStore = useUserStore()
const exchangeStore = useExchangeStore()
const { onPointerEnter: onCardPointerEnter, onPointerMove: onCardPointerMove, onPointerLeave: onCardPointerLeave } = useCardTilt()

// CDK列表数据
const cdkList = ref<CDK[]>([])
const filterForm = ref<FilterForm>({
  // 使用空字符串表示未选择，避免与类型不符的 null 引起 TS 报错
  server: '',
  status: '',
  sortOrder: 'desc',
  character: '',
})

// 选中的CDK列表
const selectedCdks = ref<string[]>([])

// 复制状态管理
const copiedCode = ref<string | null>(null)

// 选中角色的兑换记录
const selectedUserExchangeHistory = computed(() => {
  if (!filterForm.value.character) return []
  return exchangeStore.history.filter((record: any) => record.userId === filterForm.value.character)
})

// 获取CDK的兑换状态（仅在选中角色时启用）
const getCdkExchangeStatus = (cdk: CDK): '未兑换' | '部分兑换' | '已兑换' | '已失效' | null => {
  if (!filterForm.value.character) return null

  if (isCDKGroup(cdk)) {
    // CDK组合的兑换状态
    const groupCodes = getGroupCodes(cdk)
    // 使用Set去重，避免同一个CDK多次兑换导致重复计算
    const exhaustedCodes = new Set<string>()
    const exchangedCodes = new Set(
      selectedUserExchangeHistory.value
        .filter((record: any) => groupCodes.includes(record.cdk))
        .filter((record: any) => {
          // 只计入真正成功或已在服务器兑换过的记录
          if (record.success) return true
          // 任何云端历史（source===云端）即视为已兑换（官方历史列表只出现已兑换）
          if (record.source === '云端') return true
          if (record.code === 1302016) return true // 服务器返回已兑换过
          if (typeof record.message === 'string' && record.message.includes('已兑换过')) return true
          return false
        })
        .map((record: any) => record.cdk)
    )

    // 统计失效（次数耗尽/无效）
    selectedUserExchangeHistory.value
      .filter((record: any) => groupCodes.includes(record.cdk))
      .forEach((record: any) => {
        const msg = record.message || ''
        if (record.code === 1302017 || msg.includes('使用次数已耗尽') || msg.includes('无效')) {
          exhaustedCodes.add(record.cdk)
        }
      })

    if (exchangedCodes.size === 0) {
      // 若全部都被判定为失效（或存在失效且无成功），返回已失效
      if (exhaustedCodes.size > 0 && exhaustedCodes.size === groupCodes.length) return '已失效'
      if (exhaustedCodes.size === groupCodes.length) return '已失效'
      return exhaustedCodes.size > 0 ? '部分兑换' : '未兑换'
    } else if (exchangedCodes.size === groupCodes.length) {
      return '已兑换'
    } else {
      // 如果剩余未兑换部分全部失效，也可视为已失效（但仍提示部分）
      if (exhaustedCodes.size + exchangedCodes.size === groupCodes.length) return '部分兑换'
      return '部分兑换'
    }
  } else {
    // 单个CDK的兑换状态
    let isExchanged = false
    let isExhausted = false
    selectedUserExchangeHistory.value.forEach((record: any) => {
      if (record.cdk !== cdk.code) return
      if (
        record.success === true ||
        record.source === '云端' ||
        record.code === 1302016 ||
        (typeof record.message === 'string' && record.message.includes('已兑换过'))
      ) {
        isExchanged = true
      }
      const msg = record.message || ''
      if (record.code === 1302017 || msg.includes('使用次数已耗尽') || msg.includes('无效')) {
        isExhausted = true
      }
    })
    if (isExchanged) return '已兑换'
    if (isExhausted) return '已失效'
    return '未兑换'
  }
}

// 获取CDK的唯一标识
const getCdkKey = (cdk: CDK): string => {
  if (isCDKGroup(cdk)) {
    return cdk.groupId
  }
  return cdk.code
}

// 获取服务器名称
const getServerName = (server: string): string => {
  const serverNames: Record<ServerType, string> = {
    global: '国际服',
    tw: '港澳台服',
    cn: '国服',
  }
  return serverNames[server as ServerType] || server
}

// 加载CDK列表
const loadCdkList = async () => {
  try {
    const data = await fetchCdkList()
    // 过滤掉状态不是 '可用' 或 '已过期' 或 '部分可用' 的CDK
    let filteredCdks = data.cdks.filter((cdk) => {
      if (isCDKGroup(cdk)) {
        const status = getGroupStatus(cdk)
        return status === '可用' || status === '已过期' || status === '部分可用'
      } else {
        return cdk.status === '可用' || cdk.status === '已过期'
      }
    })

    // 注入广告到CDK列表第一位
    cdkList.value = injectAd(filteredCdks)
  } catch (error) {
    showCustomMessage('获取CDK列表失败', 'error')
    console.error(error)
  }
}

// 获取CDK的状态（统一处理单个CDK和组合CDK）
const getCdkStatus = (cdk: CDK): '可用' | '已过期' | '部分可用' => {
  if (isCDKGroup(cdk)) {
    return getGroupStatus(cdk)
  } else {
    return cdk.status
  }
}

// 获取CDK的服务器列表（统一处理单个CDK和组合CDK）
const getCdkServers = (cdk: CDK): Array<'global' | 'tw' | 'cn'> => {
  if (isCDKGroup(cdk)) {
    return getGroupServers(cdk)
  } else {
    return cdk.servers
  }
}

// 获取选中角色的服务器类型
const getSelectedUserServer = (): ServerType | null => {
  if (!filterForm.value.character) return null
  const user = userStore.users.find((u) => u.id === filterForm.value.character)
  return user ? (user.server as ServerType) : null
}

// 检测用户是否进行了手动筛选
const hasUserFilter = computed(() => {
  return !!(
    filterForm.value.server || // 选择了服务器
    filterForm.value.status || // 选择了状态
    filterForm.value.character // 选择了角色
  )
})

// 过滤CDK列表
const filteredCdks = computed(() => {
  let result = [...cdkList.value]

  // 首先分离广告和普通CDK
  const adItems = result.filter((item) => isAdData(item))
  const normalCdks = result.filter((item) => !isAdData(item))

  // 如果用户进行了筛选，则不显示广告
  const shouldShowAd = !hasUserFilter.value

  // 如果选中了角色，先按服务器过滤普通CDK
  if (filterForm.value.character) {
    const userServer = getSelectedUserServer()
    if (userServer) {
      normalCdks.splice(
        0,
        normalCdks.length,
        ...normalCdks.filter((cdk) => {
          const cdkServers = getCdkServers(cdk)
          return cdkServers.includes(userServer)
        })
      )
    }
  }

  // 排序逻辑：优先考虑可用性，然后考虑兑换状态（仅对普通CDK排序）
  normalCdks.sort((a, b) => {
    // 首先按可用性排序：可用 > 部分可用 > 已过期
    const statusA = getCdkStatus(a)
    const statusB = getCdkStatus(b)
    const getPriority = (status: string) => {
      if (status === '可用') return 3
      if (status === '部分可用') return 2
      if (status === '已过期') return 1
      return 0
    }

    const statusDiff = getPriority(statusB) - getPriority(statusA)
    if (statusDiff !== 0) return statusDiff

    // 如果选中了角色，在相同可用性下按兑换状态排序：未兑换 > 部分兑换 > 已失效 > 已兑换
    if (filterForm.value.character) {
      const exchangeStatusA = getCdkExchangeStatus(a)
      const exchangeStatusB = getCdkExchangeStatus(b)

      const getExchangePriority = (status: string | null) => {
        if (status === '未兑换') return 4
        if (status === '部分兑换') return 3
        if (status === '已失效') return 2
        if (status === '已兑换') return 1
        return 0
      }

      const exchangeDiff =
        getExchangePriority(exchangeStatusB) - getExchangePriority(exchangeStatusA)
      if (exchangeDiff !== 0) return exchangeDiff
    }

    // 最后按创建时间排序
    const getCreated = (cdk: any) => {
      if (isCDKGroup(cdk)) {
        return cdk.cdks.reduce(
          (max: string, sub: any) => (sub.created && sub.created > max ? sub.created : max),
          ''
        )
      } else {
        return cdk.created || ''
      }
    }

    const createdA = getCreated(a)
    const createdB = getCreated(b)
    if (createdA && createdB) {
      if (filterForm.value.sortOrder === 'desc') {
        return createdB.localeCompare(createdA)
      } else {
        return createdA.localeCompare(createdB)
      }
    }
    return 0
  })

  // 应用过滤器到普通CDK
  if (filterForm.value.server) {
    normalCdks.splice(
      0,
      normalCdks.length,
      ...normalCdks.filter((cdk) =>
        getCdkServers(cdk).includes(filterForm.value.server as ServerType)
      )
    )
  }

  if (filterForm.value.status) {
    normalCdks.splice(
      0,
      normalCdks.length,
      ...normalCdks.filter((cdk) => getCdkStatus(cdk) === filterForm.value.status)
    )
  }

  // 根据筛选状态决定是否显示广告
  // 只有在用户没有进行任何筛选时才显示广告
  if (shouldShowAd) {
    return [...adItems, ...normalCdks]
  } else {
    return normalCdks
  }
})

// 添加复制工具函数
const fallbackCopyTextToClipboard = (code: string, e: MouseEvent) => {
  const textArea = document.createElement('textarea')
  textArea.value = code
  // 确保在视口外
  textArea.style.cssText = 'position:fixed;pointer-events:none;opacity:0;'
  document.body.appendChild(textArea)

  try {
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      // iOS设备
      const range = document.createRange()
      range.selectNodeContents(textArea)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
      textArea.setSelectionRange(0, 999999)
    } else {
      // 其他设备
      textArea.select()
    }

    document.execCommand('copy')
    handleCopySuccess(code, e)
  } catch (err) {
    console.error('复制失败:', err)
    showCustomMessage('复制失败，请手动复制', 'error')
  }

  document.body.removeChild(textArea)
}

// 处理复制成功的动画效果
const handleCopySuccess = (code: string, e: MouseEvent) => {
  const target = e.target as HTMLElement
  const tagElement = target.closest('.code-tag') as HTMLElement
  if (!tagElement) return

  const rect = tagElement.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  tagElement.style.setProperty('--x', `${x}px`)
  tagElement.style.setProperty('--y', `${y}px`)

  copiedCode.value = code

  // 使用统一的右上角自定义消息
  showCustomMessage()

  setTimeout(() => {
    copiedCode.value = null
  }, 1500)
}

// 复制CDK
const copyCdk = async (code: string, e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 优先使用现代 Clipboard API
      await navigator.clipboard.writeText(code)
      handleCopySuccess(code, e)
    } else {
      // 回退到传统方法
      fallbackCopyTextToClipboard(code, e)
    }
  } catch (err) {
    console.error('Clipboard API失败，使用回退方法:', err)
    fallbackCopyTextToClipboard(code, e)
  }
}

// 处理单个CDK的选择/取消选择
const handleCdkSelection = (cdkCode: string, checked: CheckboxValueType) => {
  const isChecked = checked === true // 仅当为布尔 true 时视为选中，其它(string/number)不误判
  if (isChecked) {
    // 选中：如果不在数组中，则添加
    if (!selectedCdks.value.includes(cdkCode)) {
      selectedCdks.value.push(cdkCode)
    }
  } else {
    // 取消选中：从数组中移除
    const index = selectedCdks.value.indexOf(cdkCode)
    if (index > -1) {
      selectedCdks.value.splice(index, 1)
    }
  }
}

// 批量兑换处理
const handleBatchExchange = () => {
  if (selectedCdks.value.length === 0) return

  // 将选中的CDK通过路由参数传递到兑换页面
  const cdkString = selectedCdks.value.join('\n')

  // 添加当前选中角色的ID到路由查询参数
  const query: Record<string, string> = { cdks: cdkString }

  if (filterForm.value.character) {
    // 确保是有效的用户ID并以字符串形式传递
    const userId = String(filterForm.value.character)
    const user = userStore.getUserById(userId)
    if (user) {
      console.log('传递用户ID到兑换页面:', userId, user.name)
      query.userId = userId
    }
  }

  router.push({
    path: '/cdk',
    query: query,
  })

  // 清空选择
  selectedCdks.value = []
}

// 新增：提交CDK入口按钮方法
const openSubmitCdk = () => {
  window.open(
    'https://chalk-quotation-b2d.notion.site/210563f728f1801ea74ec231b2359e79?pvs=105',
    '_blank'
  )
}

// 广告关闭处理
const handleAdClosed = () => {
  // 重新加载CDK列表以移除广告
  loadCdkList()
}

// 自动勾选未兑换的CDK（独立函数避免重复代码）
const autoSelectUnredeemedCdks = () => {
  selectedCdks.value = [] // 先清空选中状态
  filteredCdks.value.forEach((cdk) => {
    const status = getCdkStatus(cdk)
    const exchangeStatus = getCdkExchangeStatus(cdk)

    if (isSingleCDK(cdk) && status === '可用' && exchangeStatus === '未兑换') {
      selectedCdks.value.push(cdk.code)
    } else if (
      isCDKGroup(cdk) &&
      (exchangeStatus === '未兑换' || exchangeStatus === '部分兑换') &&
      (status === '可用' || status === '部分可用')
    ) {
      const groupCodes = getGroupCodes(cdk)
      const redeemed = new Set(
        selectedUserExchangeHistory.value
          .filter((record: any) => groupCodes.includes(record.cdk))
          .map((record: any) => record.cdk)
      )
      cdk.cdks.forEach((subCdk: SingleCDK) => {
        if (subCdk.status === '可用' && !redeemed.has(subCdk.code)) {
          selectedCdks.value.push(subCdk.code)
        }
      })
    }
  })

  if (selectedCdks.value.length > 0) {
    showCustomMessage(
      `已自动勾选${selectedCdks.value.length}个未兑换CDK，可直接点击批量兑换`,
      'success'
    )
  }
}

// 处理下拉菜单展开/收起，避免与导航菜单动画冲突
const handleDropdownVisibleChange = (visible: boolean) => {
  // 当下拉菜单打开时，给body添加类名暂停导航菜单动画
  if (visible) {
    document.body.classList.add('dropdown-open')
  } else {
    document.body.classList.remove('dropdown-open')
  }
}

// 处理状态选择变化
const handleStatusChange = (status: string) => {
  // 选择状态时，清空角色筛选
  if (status) {
    filterForm.value.character = ''
    selectedCdks.value = [] // 清空选择的CDK
  }
}

// 处理角色选择变化
const handleCharacterChange = async (userId: string | null) => {
  // 选择角色时，清空状态筛选
  if (userId) {
    filterForm.value.status = ''
  }

  if (!userId) {
    // 清空选择的CDK
    selectedCdks.value = []
    return
  }

  const user = userStore.users.find((u) => u.id === userId)
  if (!user) return

  // 检查是否为国服账号且无兑换历史
  if (user.server === 'cn') {
    const userHistory = exchangeStore.history.filter((record: any) => record.userId === userId)

    if (userHistory.length === 0) {
      showCustomMessage('国服账号此功能基本不可用，因为无法获取云端兑换历史，请慎用。', 'warning')
    }

    // 国服账号不自动勾选CDK
    return
  }

  // 新增：每天每账号只自动同步一次
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const syncKey = `cdk_auto_sync_${userId}`
  const lastSyncDate = localStorage.getItem(syncKey)
  if (lastSyncDate === today) {
    // 今日已自动同步过，跳过同步直接自动勾选
    autoSelectUnredeemedCdks()
    return
  }

  // 未同步过，执行自动同步
  try {
    exchangeStore.loading = true
    const result = await exchangeStore.syncUserHistory(user, {
      page: 1,
      pageSize: 20,
    })
    if (result.success) {
      showCustomMessage('已同步该角色最近20条兑换记录', 'success')
      // 自动刷新历史
      await exchangeStore.fetchHistory()
      // 记录本次同步日期
      localStorage.setItem(syncKey, today)
    } else {
      showCustomMessage(result.message || '同步兑换历史失败', 'error')
    }
  } catch (error: any) {
    showCustomMessage('同步兑换历史失败: ' + (error.message || '未知错误'), 'error')
  } finally {
    exchangeStore.loading = false
  }

  // 同步完成后自动勾选未兑换的CDK
  autoSelectUnredeemedCdks()
}

// 页面加载时获取CDK列表
onMounted(() => {
  console.log('CDK公告组件已挂载')

  loadCdkList()
  // 加载用户数据和兑换历史
  userStore.fetchUsers()
  exchangeStore.fetchHistory()

  // 监听广告关闭事件
  window.addEventListener('adClosed', handleAdClosed)
})

// 组件卸载时保存缓存
onBeforeUnmount(() => {
  // 这里不需要保存缓存，因为缓存是静态的，不会改变

  // 移除广告关闭事件监听
  window.removeEventListener('adClosed', handleAdClosed)
  
  // 清理下拉菜单状态类名
  document.body.classList.remove('dropdown-open')
})
</script>

<style lang="scss" scoped>
.cdk-announcement {
  padding: 20px;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);

  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: var(--scrollbar-track); border-radius: 6px; }
  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb); border-radius: 6px;
    &:hover { background: var(--scrollbar-thumb-hover); }
  }

  @media screen and (max-width: 768px) {
    padding: 12px;
    &::-webkit-scrollbar { width: 4px; height: 4px; }
  }
}

/* =============== NIKKE 情报过滤面板 =============== */
.filter-panel {
  margin-bottom: 16px;
  border-radius: var(--cdk-card-radius, 12px);
  background: var(--cdk-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--cdk-glass-border);

  @media screen and (max-width: 768px) { margin-bottom: 12px; }
}

.filter-panel-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  gap: 12px;

  @media screen and (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.filter-fields {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media screen and (max-width: 900px) {
    justify-content: flex-end;
  }
}

/* =============== NIKKE 风格按钮 =============== */
.nikke-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-family: inherit;

  &:hover { transform: translateY(-1px); }
  &:active { transform: translateY(0); }
}

.nikke-btn-primary {
  background: #00d4ff;
  color: #05060a;

  &:hover {
    background: #33ddff;
    box-shadow: 0 0 16px rgba(0, 212, 255, 0.3);
  }
}

.nikke-btn-ghost {
  background: transparent;
  color: var(--el-text-color-regular);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:hover {
    border-color: rgba(0, 212, 255, 0.25);
    color: #00d4ff;
  }
}

.btn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.btn-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--cdk-font-mono);
}

/* =============== NIKKE 玻璃卡片 =============== */
.single-card-wrapper {
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  --img-brightness: 1;
  --shadow-x: 0px;
  --shadow-y: 0px;
  --shadow-blur: 0px;
  perspective: 800px;
}

.nikke-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--cdk-card-radius, 12px);
  border: 1px solid var(--cdk-glass-border);
  transition:
    transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    border-color 0.28s ease,
    background 0.28s ease,
    box-shadow 0.28s ease;
  background: var(--cdk-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  will-change: transform;
  transform:
    rotateX(var(--tilt-x))
    rotateY(var(--tilt-y))
    translateY(0px)
    scale(1);
  box-shadow: 0 18px 28px rgba(5, 8, 15, 0.18);

  &.available {
    border-color: var(--cdk-border-available);
  }

  &.unavailable {
    opacity: 0.8; /* 调整过期卡片的不透明度，避免亮色模式下过于暗淡 */
    border-color: var(--cdk-border-unavailable);
  }
}

@media (hover: hover) and (pointer: fine) {
  .single-card-wrapper:hover .nikke-card {
    transform:
      rotateX(var(--tilt-x))
      rotateY(var(--tilt-y))
      translateY(-8px)
      scale(1.028);
    border-color: var(--cdk-border-hover);
    background: var(--cdk-glass-hover-bg);
    box-shadow:
      var(--shadow-x) var(--shadow-y) var(--shadow-blur) rgba(5, 8, 15, 0.32),
      var(--cdk-state-shadow, 0 0 0 rgba(0,0,0,0));
  }

  .single-card-wrapper:hover .nikke-card.available {
    border-color: var(--cdk-border-available-hover);
    --cdk-state-shadow: var(--cdk-glow-cyan);
  }

  .single-card-wrapper:hover .nikke-card.unavailable {
    border-color: var(--cdk-border-unavailable-hover);
    --cdk-state-shadow: var(--cdk-glow-red);
  }

  .single-card-wrapper:hover .cdk-image img {
    transform: scale(1.045);
    filter: brightness(var(--img-brightness));
  }
}

/* =============== 复选框 =============== */
.cdk-checkbox-wrapper {
  --checkbox-size: 1.4em;

  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: 4px;
  background: rgba(5, 6, 10, 0.7);
  border: 1.5px solid var(--cdk-border-hover);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.15);
  }
}

.cdk-checkbox {
  pointer-events: auto;
  margin: 0;
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: inherit;

  &.is-checked::after {
    content: '✓';
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    bottom: 1px;
    background: #00d4ff;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #05060a;
    font-size: 0.7em;
    font-weight: 800;
    line-height: 1;
    z-index: 2;
  }

  :deep(.el-checkbox__input) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    z-index: 1;
    background: transparent !important;

    .el-checkbox__inner {
      width: 0 !important;
      height: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      opacity: 0 !important;
      &::after { content: none !important; }
    }

    .el-checkbox__label { display: none; }
  }
}

/* =============== 图片 =============== */
.cdk-image {
  width: 100%;
  height: 130px;
  position: relative;
  overflow: hidden;
  background: var(--el-fill-color);

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(transparent, rgba(5, 6, 10, 0.7));
    pointer-events: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transform: scale(1);
    transform-origin: center center;
    filter: brightness(1);
    transition: transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), filter 0.24s ease;
    will-change: transform, filter;
  }

  .image-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 13px;
    z-index: 1;
    .el-icon { font-size: 22px; }
  }

  @media screen and (max-width: 768px) { height: 110px; }
}

/* =============== 状态徽章 =============== */
.cdk-status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--cdk-font-mono);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #fff;
  z-index: 2;
  backdrop-filter: blur(4px);

  &.status-available { background: rgba(0, 212, 255, 0.85); }
  &.status-unavailable { background: rgba(255, 51, 85, 0.85); }
}

.exchange-status {
  position: absolute;
  top: 34px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--cdk-font-mono);
  color: #fff;
  z-index: 2;
  backdrop-filter: blur(4px);

  &.exchange-not-redeemed { background: rgba(0, 212, 255, 0.7); }
  &.exchange-redeemed { background: rgba(108, 110, 114, 0.7); }
  &.exchange-exhausted { background: rgba(240, 160, 48, 0.5); }
}

/* =============== 内容区 =============== */
.cdk-content {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.cdk-reward {
  h4 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }
  p {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.4;
  }
}

.cdk-servers,
.cdk-note {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cdk-note {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  align-items: center;
}

/* =============== 复制标签 =============== */
.code-tag {
  position: relative;
  overflow: hidden;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-family: var(--cdk-font-mono);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  .code-text {
    position: relative;
    z-index: 1;
    transition: color 0.35s, clip-path 0.35s;
  }

  .copy-icon {
    position: relative;
    z-index: 1;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #00d4ff;
    transform: scaleX(0);
    transform-origin: left;
    pointer-events: none;
    z-index: 0;
    transition: transform 0.35s ease-out;
  }

  &.copied {
    border-color: #00d4ff;

    &::before {
      transform: scaleX(1);
    }

    .code-text {
      color: #05060a;
      animation: typeReveal 0.35s steps(var(--char-count, 6)) 0.35s both;
      transition: none;
    }
  }
}

@keyframes typeReveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }

/* =============== 元信息 =============== */
.cdk-author {
  margin-top: 8px;
  padding-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  text-align: right;
  border-top: 1px solid var(--cdk-glass-border);
}

.cdk-created {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* =============== Note 样式 =============== */
:deep(.cdk-note-tooltip) {
  z-index: 9999 !important;
  max-width: 400px !important;
  background: var(--cdk-overlay-bg) !important;
  border: 1px solid var(--cdk-glass-border) !important;
  border-radius: 8px !important;
  box-shadow: var(--el-box-shadow-dark) !important;
  padding: 10px !important;

  .note-content {
    line-height: 1.5 !important;
    font-size: 13px !important;
    color: var(--el-text-color-regular) !important;
    a { color: var(--el-color-primary) !important; }
  }
}

.note-trigger {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: color 0.3s ease;
  color: var(--el-text-color-secondary);
  &:hover { color: #00d4ff; }
}
</style>
