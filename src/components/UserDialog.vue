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
        <div class="cookie-header" v-if="isEdit">
          <el-tag 
            :type="getCookieStatusType(form.cookieExpireDays)"
            size="small"
          >
            Cookie剩余 {{ form.cookieExpireDays }} 天
          </el-tag>
          <el-button 
            type="primary" 
            link 
            @click="showCookie = !showCookie"
          >
            {{ showCookie ? '隐藏' : '显示' }} Cookie
          </el-button>
        </div>
        <template v-if="isEdit && !showCookie">
          <div class="cookie-mask">
            <el-icon><Lock /></el-icon>
            <span>Cookie已加密存储</span>
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
import { ref, reactive, defineProps, defineEmits, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
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
        let cookieExpireDays = 365 // 默认365天

        if (value.includes('\t')) {
          // 如果包含制表符，说明是从Application面板复制的格式
          const cookieLines = value.split('\n')
          const cookiePairs = []
          let expiresDate = null

          cookieLines.forEach(line => {
            const parts = line.split('\t')
            if (parts.length < 5) return // 需要至少5列来获取过期时间

            // 第一列是名称，第二列是值
            cookiePairs.push(`${parts[0]}=${parts[1]}`)

            // 第五列是过期时间
            if (parts[4] && parts[4].includes('202')) { // 确保是日期格式
              try {
                const date = new Date(parts[4])
                if (!isNaN(date) && (!expiresDate || date < expiresDate)) {
                  expiresDate = date
                }
              } catch (e) {
                console.error('解析过期时间失败:', e)
              }
            }
          })

          cookieStr = cookiePairs.filter(Boolean).join('; ')

          // 计算剩余天数
          if (expiresDate) {
            const now = new Date()
            const diffTime = expiresDate - now
            cookieExpireDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
          }
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
        form.cookieExpireDays = cookieExpireDays
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
  if (val && props.isEdit && props.userId) {
    // 编辑模式：获取用户数据
    const userData = userStore.getUserById(props.userId)
    if (userData) {
      Object.assign(form, {
        name: userData.name,
        server: userData.server,
        cookie: userData.cookie,
        cookieExpireDays: userData.cookieExpireDays,
        uid: userData.uid
      })
    }
  } else {
    // 添加模式：重置表单
    resetForm()
  }
})

// 监听对话框可见性变化
watch(() => dialogVisible.value, (val) => {
  emit('update:visible', val)
})

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  form.server = 'global'
}

// 处理关闭
const handleClose = () => {
  dialogVisible.value = false
  resetForm()
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
      cookie: form.cookie, // 实际使用时需要加密
      cookieExpireDays: form.cookieExpireDays // 添加Cookie有效期
    }

    if (props.isEdit && props.userId) {
      await userStore.updateUser(props.userId, userData)
    } else {
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

<style lang="scss" scoped>
.cookie-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cookie-mask {
  height: 100px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-lighter);
  
  .el-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;

  p {
    margin: 0 0 4px 0;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      line-height: 1.8;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 