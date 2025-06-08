<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑用户' : '添加用户'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent
    >
      <el-form-item label="用户名" prop="name">
        <el-input v-model="form.name" placeholder="请输入用户名" />
      </el-form-item>

      <el-form-item label="服务器" prop="server">
        <el-select v-model="form.server" placeholder="请选择服务器">
          <el-option
            v-for="server in serverOptions"
            :key="server.value"
            :label="server.label"
            :value="server.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="UID" v-if="isEdit">
        <el-input v-model="form.uid" disabled />
      </el-form-item>

      <el-form-item label="Cookie信息" prop="cookie">
        <template v-if="isEdit && !showCookie">
          <el-card 
            class="cookie-mask" 
            shadow="never" 
            @click="showCookie = true"
          >
            <div class="cookie-mask-content">
              <div class="cookie-mask-icon">
                <el-icon><Lock /></el-icon>
              </div>
              <div class="cookie-mask-text">
                <span class="cookie-mask-title">Cookie 已加密存储</span>
                <span class="cookie-mask-desc">点击查看 Cookie 详情</span>
              </div>
            </div>
          </el-card>
          <div class="cookie-info-footer">
            <div class="cookie-expire-info">
              <el-tag 
                :type="getCookieStatusType(form.cookieExpireDays)"
                size="small"
                class="cookie-days"
              >
                Cookie剩余 {{ form.cookieExpireDays }} 天
              </el-tag>
            </div>
            <div class="cookie-expire-setting">
              <el-input-number
                v-model="form.cookieExpireDays"
                :min="1"
                :max="3650"
                size="small"
                class="expire-days-input"
              />
              <span class="expire-days-label">天</span>
              <el-tooltip
                content="设置 Cookie 的剩余有效期天数，用于计算到期时间"
                placement="top"
              >
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </template>
        <template v-else-if="isEdit && showCookie">
          <div class="cookie-content">
            <div class="cookie-content-header">
              <span class="cookie-content-title">Cookie 详情</span>
              <el-button 
                type="primary" 
                link 
                @click="showCookie = false"
                class="cookie-hide-btn"
              >
                <el-icon><ArrowLeft /></el-icon>
                返回
              </el-button>
            </div>
            <el-input
              v-model="form.cookie"
              type="textarea"
              :rows="10"
              :placeholder="cookiePlaceholder"
            />
            <div class="cookie-info-footer">
              <div class="cookie-expire-info">
                <el-tag 
                  :type="getCookieStatusType(form.cookieExpireDays)"
                  size="small"
                  class="cookie-days"
                >
                  Cookie剩余 {{ form.cookieExpireDays }} 天
                </el-tag>
              </div>
              <div class="cookie-expire-setting">
                <el-input-number
                  v-model="form.cookieExpireDays"
                  :min="1"
                  :max="3650"
                  size="small"
                  class="expire-days-input"
                />
                <span class="expire-days-label">天</span>
                <el-tooltip
                  content="设置 Cookie 的剩余有效期天数，用于计算到期时间"
                  placement="top"
                >
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>
        </template>
        <el-input
          v-else
          v-model="form.cookie"
          type="textarea"
          :rows="10"
          :placeholder="cookiePlaceholder"
        />
        <div class="form-tip">
          <p>提示：请从浏览器开发者工具中复制完整的Cookie信息，包含以下字段：</p>
          <ul>
            <li>game_token</li>
            <li>game_gameid</li>
            <li>game_openid</li>
            <li>game_uid</li>
            <li>game_channelid</li>
            <li>game_user_name</li>
          </ul>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="saving">
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, defineProps, defineEmits, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, InfoFilled, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  userId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['update:visible'])

const userStore = useUserStore()
const formRef = ref(null)
const saving = ref(false)
const dialogVisible = ref(false)
const showCookie = ref(false)

// 服务器选项
const serverOptions = [
  { label: '全球服', value: 'global' },
  { label: '日服', value: 'jp' },
  { label: '韩服', value: 'kr' }
]

// 表单数据
const form = reactive({
  name: '',
  server: 'global',
  cookie: '',
  cookieExpireDays: 365,
  uid: ''
})

// 临时存储编辑模式的数据
const editFormData = ref(null)

// Cookie输入框提示文本
const cookiePlaceholder = `请粘贴完整的Cookie信息，支持以下两种格式：

1. 从Application面板复制的格式：
game_token  abc123  .domain.com  /  2024-01-01
game_uid    123456  .domain.com  /  2024-01-01

2. 标准Cookie格式：
game_token=abc123; game_uid=123456`

// 获取Cookie状态对应的标签类型
const getCookieStatusType = (days) => {
  if (days > 180) return 'success'
  if (days > 30) return 'warning'
  return 'danger'
}

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  server: [
    { required: true, message: '请选择服务器', trigger: 'change' }
  ],
  cookie: [
    { required: true, message: '请输入Cookie信息', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入Cookie信息'))
          return
        }

        // 处理从Application面板复制的Cookie格式
        let cookieStr = value

        if (value.includes('\t')) {
          // 如果包含制表符，说明是从Application面板复制的格式
          const cookieLines = value.split('\n')
          const cookiePairs = []

          cookieLines.forEach(line => {
            const parts = line.split('\t')
            if (parts.length < 5) return // 需要至少5列来获取过期时间

            // 第一列是名称，第二列是值
            cookiePairs.push(`${parts[0]}=${parts[1]}`)
          })

          cookieStr = cookiePairs.filter(Boolean).join('; ')
        }

        // 验证必需的Cookie字段
        const requiredFields = [
          'game_token',
          'game_gameid',
          'game_openid',
          'game_uid',
          'game_channelid',
          'game_user_name'
        ]

        const missingFields = requiredFields.filter(field => !cookieStr.includes(field))
        if (missingFields.length > 0) {
          callback(new Error(`缺少必需的Cookie字段: ${missingFields.join(', ')}`))
          return
        }

        // 更新表单中的Cookie值为处理后的格式
        form.cookie = cookieStr
        callback()
      },
      trigger: 'blur'
    }
  ]
}

// 监听visible属性变化
watch(() => props.visible, (val) => {
  dialogVisible.value = val
  showCookie.value = false // 重置Cookie显示状态
  
  if (val) {
    if (props.isEdit && props.userId) {
      // 编辑模式：获取用户数据
      const userData = userStore.getUserById(props.userId)
      if (userData) {
        // 保存编辑前的数据，用于取消时恢复
        editFormData.value = { ...userData }
        // 设置表单数据
        Object.assign(form, {
          name: userData.name,
          server: userData.server,
          cookie: userData.cookie,
          cookieExpireDays: userData.cookieExpireDays || 365,
          uid: userData.uid
        })
      }
    } else {
      // 添加模式：重置表单
      resetForm()
      editFormData.value = null
    }
  } else {
    // 对话框关闭时，如果是编辑模式且没有保存，恢复原始数据
    if (props.isEdit && editFormData.value) {
      const userData = userStore.getUserById(props.userId)
      if (userData) {
        // 恢复用户列表中的实际数据
        Object.assign(userData, editFormData.value)
      }
    }
    // 清理临时数据
    editFormData.value = null
  }
})

// 监听对话框可见性变化
watch(() => dialogVisible.value, (val) => {
  emit('update:visible', val)
})

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  // 完全重置所有字段到初始值
  Object.assign(form, {
    name: '',
    server: 'global',
    cookie: '',
    cookieExpireDays: 365,
    uid: ''
  })
}

// 处理关闭
const handleClose = () => {
  dialogVisible.value = false
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    // 解析Cookie中的用户信息
    const uid = form.cookie.match(/game_uid=([^;]+)/)?.[1] || ''
    const userName = form.cookie.match(/game_user_name=([^;]+)/)?.[1] || form.name

    const userData = {
      name: form.name,
      server: form.server,
      serverName: serverOptions.find(s => s.value === form.server)?.label,
      uid,
      userName,
      cookie: form.cookie,
      cookieExpireDays: Number(form.cookieExpireDays)
    }

    if (props.isEdit && props.userId) {
      // 编辑模式：保留原有用户的 id 和创建时间
      const existingUser = userStore.getUserById(props.userId)
      if (existingUser) {
        userData.id = existingUser.id
        userData.createTime = existingUser.createTime
      }
      await userStore.updateUser(props.userId, userData)
      // 更新成功后清理临时数据
      editFormData.value = null
    } else {
      // 添加模式：创建新用户
      userData.createTime = new Date().toLocaleString()
      await userStore.addUser(userData)
    }

    ElMessage.success(props.isEdit ? '更新成功' : '添加成功')
    handleClose()
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss">
// 全局样式，确保在生产环境中也能正确应用
.el-dialog {
  .cookie-mask {
    height: 120px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: linear-gradient(135deg, var(--el-fill-color-light) 0%, var(--el-fill-color-lighter) 100%);
    margin-bottom: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    
    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);

      .cookie-mask-icon {
        transform: scale(1.1);
        background-color: var(--el-color-primary-light-8);
        
        .el-icon {
          color: var(--el-color-primary);
        }
      }

      .cookie-mask-text {
        .cookie-mask-title {
          color: var(--el-color-primary);
        }
      }
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .cookie-mask-content {
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 16px;
      position: relative;
      z-index: 1;
    }

    .cookie-mask-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--el-color-primary-light-9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      .el-icon {
        font-size: 24px;
        color: var(--el-color-primary-light-3);
        transition: color 0.3s ease;
      }
    }

    .cookie-mask-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      flex-grow: 1;

      .cookie-mask-title {
        font-size: 15px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        transition: color 0.3s ease;
      }

      .cookie-mask-desc {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .cookie-info-footer {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .cookie-expire-info {
      .cookie-days {
        font-size: 13px;
        padding: 0 8px;
        height: 24px;
        line-height: 24px;
      }
    }

    .cookie-expire-setting {
      display: flex;
      align-items: center;
      gap: 8px;

      .expire-days-input {
        width: 100px;
      }

      .expire-days-label {
        color: var(--el-text-color-regular);
        font-size: 13px;
      }

      .info-icon {
        color: var(--el-text-color-secondary);
        font-size: 14px;
        cursor: help;
      }
    }
  }

  .cookie-content {
    .cookie-content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .cookie-content-title {
        font-size: 15px;
        font-weight: 500;
        color: var(--el-text-color-primary);
      }

      .cookie-hide-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;

        .el-icon {
          font-size: 14px;
        }
      }
    }
  }

  .form-tip {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    p {
      margin: 0 0 8px 0;
      font-weight: 500;
    }

    ul {
      margin: 0;
      padding-left: 20px;
      
      li {
        line-height: 1.8;
        color: var(--el-text-color-regular);
      }
    }
  }
}
</style> 