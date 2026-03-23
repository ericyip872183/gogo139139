<!-- ProfileView.vue - 个人中心页面 -->
<!-- 所有角色共用，包含基本信息、修改密码、登录历史、角色专属数据 -->
<template>
  <div class="profile">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人中心</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="profile-tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <div class="basic-info">
            <div class="avatar-section">
              <el-avatar :size="100" :src="userInfo?.avatar">
                <span>{{ userInfo?.realName?.charAt(0) || '用' }}</span>
              </el-avatar>
              <el-button link type="primary" style="margin-top: 12px">
                更换头像
              </el-button>
            </div>
            <el-form :model="userInfo" label-width="100px" class="info-form">
              <el-row :gutter="40">
                <el-col :span="12">
                  <el-form-item label="用户名">
                    <el-input v-model="userInfo.username" disabled />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="真实姓名">
                    <el-input v-model="userInfo.realName" @change="handleUpdate" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="手机号">
                    <el-input v-model="userInfo.phone" placeholder="请输入手机号" @change="handleUpdate" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="邮箱">
                    <el-input v-model="userInfo.email" placeholder="请输入邮箱" @change="handleUpdate" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="所属机构">
                    <el-input v-model="userInfo.tenantName" disabled />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="角色">
                    <el-tag :type="roleTagType">{{ roleLabel }}</el-tag>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 修改密码 -->
        <el-tab-pane label="修改密码" name="password">
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="100px"
            class="password-form"
            style="max-width: 500px"
          >
            <el-form-item label="原密码" prop="oldPassword">
              <el-input
                v-model="passwordForm.oldPassword"
                type="password"
                placeholder="请输入当前密码"
                show-password
                @keyup.enter="handleChangePassword"
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码"
                show-password
                @keyup.enter="handleChangePassword"
              />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                show-password
                @keyup.enter="handleChangePassword"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleChangePassword">
                确认修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 账户安全 -->
        <el-tab-pane label="账户安全" name="security">
          <div class="security-info">
            <div class="security-item">
              <div class="security-label">
                <el-icon><Monitor /></el-icon>
                <span>最近登录时间</span>
              </div>
              <div class="security-value">
                {{ lastLoginTime }}
              </div>
            </div>
            <div class="security-item">
              <div class="security-label">
                <el-icon><Location /></el-icon>
                <span>最近登录地点</span>
              </div>
              <div class="security-value">
                {{ lastLoginLocation || '未知' }}
              </div>
            </div>
            <el-alert
              title="安全提示"
              type="info"
              :closable="false"
              style="margin-top: 20px"
            >
              <p>1. 请定期修改密码，建议使用 8 位以上包含字母和数字的组合</p>
              <p>2. 不要将密码告知他人</p>
              <p>3. 如发现异常登录，请立即联系管理员</p>
            </el-alert>
          </div>
        </el-tab-pane>

        <!-- 角色专属数据 -->
        <el-tab-pane label="我的数据" name="data">
          <template v-if="isStudent">
            <el-descriptions title="学习数据" :column="2" border>
              <el-descriptions-item label="已完成考试">
                {{ studentStats.completedExams }} 次
              </el-descriptions-item>
              <el-descriptions-item label="平均正确率">
                {{ studentStats.avgAccuracy }}%
              </el-descriptions-item>
              <el-descriptions-item label="总得分">
                {{ studentStats.totalScore }} 分
              </el-descriptions-item>
              <el-descriptions-item label="班级排名">
                第 {{ studentStats.rank }} 名
              </el-descriptions-item>
            </el-descriptions>
          </template>
          <template v-else-if="isTeacher">
            <el-descriptions title="教学数据" :column="2" border>
              <el-descriptions-item label="管理学生数">
                {{ teacherStats.studentCount }} 人
              </el-descriptions-item>
              <el-descriptions-item label="已发布考试">
                {{ teacherStats.examCount }} 次
              </el-descriptions-item>
              <el-descriptions-item label="已阅卷">
                {{ teacherStats.gradedCount }} 份
              </el-descriptions-item>
              <el-descriptions-item label="平均分">
                {{ teacherStats.avgScore }} 分
              </el-descriptions-item>
            </el-descriptions>
          </template>
          <template v-else>
            <el-empty description="暂无数据展示" />
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// ProfileView.vue - 个人中心页面
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Monitor, Location } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { usersApi } from '@/api/users'

const auth = useAuthStore()
const user = computed(() => auth.user)

const activeTab = ref('basic')

// 用户信息
const userInfo = ref({
  id: '',
  username: '',
  realName: '',
  phone: '',
  email: '',
  avatar: '',
  tenantName: '',
  role: '',
})

// 修改密码表单
const passwordFormRef = ref<FormInstance>()
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 角色相关
const roleLabel = computed(() => {
  const map: Record<string, string> = {
    SUPER_ADMIN: '超级管理员',
    TENANT_ADMIN: '机构管理员',
    TEACHER: '教师',
    STUDENT: '学生',
  }
  return map[user.value?.role ?? ''] || '未知'
})

const roleTagType = computed(() => {
  const map: Record<string, any> = {
    SUPER_ADMIN: 'danger',
    TENANT_ADMIN: 'warning',
    TEACHER: 'success',
    STUDENT: 'primary',
  }
  return map[user.value?.role ?? ''] || 'info'
})

const isStudent = computed(() => user.value?.role === 'STUDENT')
const isTeacher = computed(() => user.value?.role === 'TEACHER')

// 登录信息（模拟数据，实际应从后端获取）
const lastLoginTime = ref(new Date().toLocaleString('zh-CN'))
const lastLoginLocation = ref('北京')

// 学生数据
const studentStats = ref({
  completedExams: 0,
  avgAccuracy: 0,
  totalScore: 0,
  rank: 0,
})

// 教师数据
const teacherStats = ref({
  studentCount: 0,
  examCount: 0,
  gradedCount: 0,
  avgScore: 0,
})

// 获取用户信息
async function fetchUserInfo() {
  try {
    const data = (await usersApi.getMe()) as any
    userInfo.value = {
      id: data.id,
      username: data.username,
      realName: data.realName,
      phone: data.phone || '',
      email: data.email || '',
      avatar: data.avatar || '',
      tenantName: data.tenant?.name || '',
      role: data.role,
    }
  } catch {
    ElMessage.error('获取用户信息失败')
  }
}

// 更新用户信息
async function handleUpdate() {
  // TODO: 调用更新接口
}

// 修改密码
async function handleChangePassword() {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      await usersApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      ElMessage.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      passwordFormRef.value?.resetFields()
    } catch (e: any) {
      ElMessage.error(e.response?.data?.message || '修改密码失败')
    }
  })
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.profile { padding: 20px; }
.profile-card { border-radius: 8px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.profile-tabs { margin-top: 16px; }

.basic-info { display: flex; gap: 40px; }
.avatar-section { display: flex; flex-direction: column; align-items: center; }
.info-form { flex: 1; }

.password-form { margin-top: 20px; }

.security-info { display: flex; flex-direction: column; gap: 16px; }
.security-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; background: #f5f7fa; border-radius: 8px;
}
.security-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #606266; }
.security-value { font-size: 14px; color: #303133; font-weight: 500; }

:deep(.el-tabs__header) { margin-bottom: 24px; }
:deep(.el-descriptions__label) { width: 120px; }
</style>
