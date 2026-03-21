<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>若容虚拟数据平台</h1>
        <p>中医/医学在线考试学习系统</p>
      </div>

      <el-tabs v-model="activeTab" class="login-tabs">
        <!-- Tab 1：账号密码登录 -->
        <el-tab-pane label="账号密码登录" name="password">
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" size="large" @keyup.enter="handlePwdLogin">
            <el-form-item prop="username">
              <el-input
                v-model="pwdForm.username"
                placeholder="用户名 / 学号"
                :prefix-icon="User"
                clearable
                @blur="lookupByUsername"
                @clear="pwdTenants = []; pwdForm.tenantCode = ''"
              />
            </el-form-item>

            <!-- 机构名称自动显示区 -->
            <div v-if="pwdLookingUp" class="tenant-hint tenant-hint--loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在识别机构…</span>
            </div>
            <div v-else-if="pwdTenants.length === 1" class="tenant-hint tenant-hint--found">
              <el-icon><OfficeBuilding /></el-icon>
              <span>{{ pwdTenants[0].name }}</span>
              <span class="tenant-code">{{ pwdTenants[0].code }}</span>
            </div>
            <div v-else-if="pwdTenants.length > 1" class="tenant-hint tenant-hint--multi">
              <div class="tenant-multi-label">该账号关联多个机构，请选择：</div>
              <el-radio-group v-model="pwdForm.tenantCode" class="tenant-radio-group">
                <el-radio v-for="t in pwdTenants" :key="t.code" :value="t.code">
                  {{ t.name }}（{{ t.code }}）
                </el-radio>
              </el-radio-group>
            </div>

            <el-form-item prop="password">
              <el-input v-model="pwdForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password />
            </el-form-item>
            <div class="forgot-link">
              <el-link type="primary" @click="openForgot">忘记密码？</el-link>
            </div>
            <el-button type="primary" class="login-btn" :loading="loading" @click="handlePwdLogin">
              登 录
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- Tab 2：验证码登录 -->
        <el-tab-pane label="验证码登录" name="code">
          <el-form ref="codeFormRef" :model="codeForm" :rules="codeRules" size="large" @keyup.enter="handleCodeLogin">
            <el-form-item prop="contact">
              <el-input
                v-model="codeForm.contact"
                placeholder="手机号 或 邮箱"
                :prefix-icon="Message"
                clearable
                @blur="lookupByContact"
                @clear="codeTenants = []; codeForm.tenantCode = ''"
              />
            </el-form-item>

            <!-- 机构名称自动显示区 -->
            <div v-if="codeLookingUp" class="tenant-hint tenant-hint--loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在识别机构…</span>
            </div>
            <div v-else-if="codeTenants.length === 1" class="tenant-hint tenant-hint--found">
              <el-icon><OfficeBuilding /></el-icon>
              <span>{{ codeTenants[0].name }}</span>
              <span class="tenant-code">{{ codeTenants[0].code }}</span>
            </div>
            <div v-else-if="codeTenants.length > 1" class="tenant-hint tenant-hint--multi">
              <div class="tenant-multi-label">该账号关联多个机构，请选择：</div>
              <el-radio-group v-model="codeForm.tenantCode" class="tenant-radio-group">
                <el-radio v-for="t in codeTenants" :key="t.code" :value="t.code">
                  {{ t.name }}（{{ t.code }}）
                </el-radio>
              </el-radio-group>
            </div>

            <el-form-item prop="code">
              <div class="code-row">
                <el-input v-model="codeForm.code" placeholder="验证码" :prefix-icon="Key" />
                <el-button
                  :disabled="countdown > 0 || sendingCode || !codeForm.tenantCode"
                  :loading="sendingCode"
                  style="width:128px;flex-shrink:0"
                  @click="handleSendCode('login')"
                >
                  {{ countdown > 0 ? `${countdown}s 后重试` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>
            <el-button type="primary" class="login-btn" :loading="loading" @click="handleCodeLogin">
              登 录
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 忘记密码弹窗 -->
    <el-dialog v-model="forgotVisible" title="找回密码" width="420px" @close="resetForgot">
      <el-steps :active="forgotStep" simple class="forgot-steps">
        <el-step title="输入联系方式" />
        <el-step title="验证身份" />
        <el-step title="设置新密码" />
      </el-steps>

      <!-- Step 0：输入联系方式 -->
      <el-form v-if="forgotStep === 0" size="large" style="margin-top:24px">
        <el-form-item>
          <el-input
            v-model="forgotForm.contact"
            placeholder="手机号 或 邮箱"
            :prefix-icon="Message"
            clearable
            @blur="lookupForForgot"
            @clear="forgotTenants = []; forgotForm.tenantCode = ''"
          />
        </el-form-item>
        <div v-if="forgotLookingUp" class="tenant-hint tenant-hint--loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在识别机构…</span>
        </div>
        <div v-else-if="forgotTenants.length === 1" class="tenant-hint tenant-hint--found">
          <el-icon><OfficeBuilding /></el-icon>
          <span>{{ forgotTenants[0].name }}</span>
          <span class="tenant-code">{{ forgotTenants[0].code }}</span>
        </div>
        <div v-else-if="forgotTenants.length > 1" class="tenant-hint tenant-hint--multi">
          <div class="tenant-multi-label">该账号关联多个机构，请选择：</div>
          <el-radio-group v-model="forgotForm.tenantCode" class="tenant-radio-group">
            <el-radio v-for="t in forgotTenants" :key="t.code" :value="t.code">
              {{ t.name }}（{{ t.code }}）
            </el-radio>
          </el-radio-group>
        </div>
        <el-button
          type="primary" style="width:100%;margin-top:8px"
          :loading="sendingCode"
          :disabled="!forgotForm.tenantCode"
          @click="handleSendCode('reset')"
        >
          发送验证码
        </el-button>
      </el-form>

      <!-- Step 1：输入验证码 -->
      <el-form v-if="forgotStep === 1" size="large" style="margin-top:24px">
        <el-form-item>
          <div class="code-row">
            <el-input v-model="forgotForm.code" placeholder="6位验证码" :prefix-icon="Key" />
            <el-button
              :disabled="countdown > 0 || sendingCode"
              style="width:128px;flex-shrink:0"
              @click="handleSendCode('reset')"
            >
              {{ countdown > 0 ? `${countdown}s` : '重新发送' }}
            </el-button>
          </div>
        </el-form-item>
        <el-button type="primary" style="width:100%" @click="forgotStep = 2">下一步</el-button>
      </el-form>

      <!-- Step 2：设置新密码 -->
      <el-form v-if="forgotStep === 2" ref="forgotForm2Ref" :model="forgotForm" size="large" style="margin-top:24px">
        <el-form-item>
          <el-input v-model="forgotForm.newPassword" type="password" placeholder="新密码（至少6位）" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-input v-model="forgotForm.confirmPassword" type="password" placeholder="再次输入新密码" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" style="width:100%" :loading="loading" @click="handleResetPassword">
          确认重置密码
        </el-button>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, OfficeBuilding, Message, Key, Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import request from '@/api/request'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const sendingCode = ref(false)
const activeTab = ref<'password' | 'code'>('password')
const countdown = ref(0)

interface TenantOption { name: string; code: string }

// ── 账号密码 Tab ──────────────────────────────────────
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ username: '', password: '', tenantCode: '' })
const pwdTenants = ref<TenantOption[]>([])
const pwdLookingUp = ref(false)

const pwdRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function lookupByUsername() {
  const val = pwdForm.username.trim()
  if (!val) return
  pwdLookingUp.value = true
  pwdTenants.value = []
  pwdForm.tenantCode = ''
  try {
    const list = await request.get<TenantOption[]>('/auth/lookup-by-username', { params: { username: val } }) as TenantOption[]
    pwdTenants.value = list
    if (list.length === 1) pwdForm.tenantCode = list[0].code
    if (list.length === 0) ElMessage.warning('未找到该用户名，请确认后重试')
  } finally {
    pwdLookingUp.value = false
  }
}

async function handlePwdLogin() {
  if (!pwdForm.tenantCode) {
    ElMessage.warning('请先输入用户名以识别所在机构')
    return
  }
  if (!await pwdFormRef.value?.validate().catch(() => false)) return
  loading.value = true
  try {
    await auth.login(pwdForm)
    router.push('/')
  } finally {
    loading.value = false
  }
}

// ── 验证码 Tab ────────────────────────────────────────
const codeFormRef = ref<FormInstance>()
const codeForm = reactive({ contact: '', code: '', tenantCode: '' })
const codeTenants = ref<TenantOption[]>([])
const codeLookingUp = ref(false)

const codeRules: FormRules = {
  contact: [{ required: true, message: '请输入手机号或邮箱', trigger: 'blur' }],
  code:    [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

async function lookupByContact() {
  const val = codeForm.contact.trim()
  if (!val) return
  codeLookingUp.value = true
  codeTenants.value = []
  codeForm.tenantCode = ''
  try {
    const list = await request.get<TenantOption[]>('/auth/lookup-by-contact', { params: { contact: val } }) as TenantOption[]
    codeTenants.value = list
    if (list.length === 1) codeForm.tenantCode = list[0].code
    if (list.length === 0) ElMessage.warning('未找到该手机/邮箱对应的账号')
  } finally {
    codeLookingUp.value = false
  }
}

async function handleSendCode(purpose: 'login' | 'reset') {
  const tenantCode = purpose === 'login' ? codeForm.tenantCode : forgotForm.tenantCode
  const contact    = purpose === 'login' ? codeForm.contact    : forgotForm.contact
  if (!tenantCode) { ElMessage.warning('请先输入手机/邮箱以识别所在机构'); return }
  if (!contact)    { ElMessage.warning('请先输入手机号或邮箱'); return }
  sendingCode.value = true
  try {
    await request.post('/auth/send-code', { tenantCode, contact, purpose })
    ElMessage.success('验证码已发送')
    if (purpose === 'reset') forgotStep.value = 1
    startCountdown()
  } finally {
    sendingCode.value = false
  }
}

function startCountdown() {
  countdown.value = 60
  const t = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(t)
  }, 1000)
}

async function handleCodeLogin() {
  if (!codeForm.tenantCode) { ElMessage.warning('请先输入手机/邮箱以识别所在机构'); return }
  if (!await codeFormRef.value?.validate().catch(() => false)) return
  loading.value = true
  try {
    const res = await request.post<any>('/auth/login-by-code', codeForm) as any
    auth.setAuth(res.token, res.user)
    router.push('/')
  } finally {
    loading.value = false
  }
}

// ── 忘记密码 ──────────────────────────────────────────
const forgotVisible = ref(false)
const forgotStep = ref(0)
const forgotForm = reactive({ tenantCode: '', contact: '', code: '', newPassword: '', confirmPassword: '' })
const forgotTenants = ref<TenantOption[]>([])
const forgotLookingUp = ref(false)

function openForgot() {
  Object.assign(forgotForm, { tenantCode: '', contact: '', code: '', newPassword: '', confirmPassword: '' })
  forgotTenants.value = []
  forgotStep.value = 0
  forgotVisible.value = true
}

function resetForgot() {
  forgotStep.value = 0
}

async function lookupForForgot() {
  const val = forgotForm.contact.trim()
  if (!val) return
  forgotLookingUp.value = true
  forgotTenants.value = []
  forgotForm.tenantCode = ''
  try {
    const list = await request.get<TenantOption[]>('/auth/lookup-by-contact', { params: { contact: val } }) as TenantOption[]
    forgotTenants.value = list
    if (list.length === 1) forgotForm.tenantCode = list[0].code
    if (list.length === 0) ElMessage.warning('未找到该手机/邮箱对应的账号')
  } finally {
    forgotLookingUp.value = false
  }
}

async function handleResetPassword() {
  if (!forgotForm.newPassword || forgotForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少6位'); return
  }
  if (forgotForm.newPassword !== forgotForm.confirmPassword) {
    ElMessage.warning('两次密码不一致'); return
  }
  loading.value = true
  try {
    await request.post('/auth/reset-password', {
      tenantCode:  forgotForm.tenantCode,
      contact:     forgotForm.contact,
      code:        forgotForm.code,
      newPassword: forgotForm.newPassword,
    })
    ElMessage.success('密码重置成功，请用新密码登录')
    forgotVisible.value = false
    activeTab.value = 'password'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 440px;
  padding: 40px 40px 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.login-header { text-align: center; margin-bottom: 24px; }
.login-header h1 { font-size: 26px; color: #303133; margin: 0 0 8px; }
.login-header p  { color: #909399; font-size: 14px; margin: 0; }
.login-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; }
.login-btn { width: 100%; margin-top: 4px; }
.forgot-link { text-align: right; margin: -8px 0 12px; font-size: 13px; }
.code-row { display: flex; gap: 8px; width: 100%; }
.code-row .el-input { flex: 1; }
.forgot-steps { margin-bottom: 8px; }

.tenant-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -8px 0 14px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 13px;
}
.tenant-hint--loading {
  background: #f4f4f5;
  color: #909399;
}
.tenant-hint--found {
  background: #f0f9eb;
  border: 1px solid #b3e19d;
  color: #529b2e;
}
.tenant-hint--found .tenant-code {
  margin-left: 2px;
  color: #85ce61;
  font-size: 12px;
}
.tenant-hint--multi {
  background: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 6px;
  padding: 10px 12px;
  margin: -8px 0 14px;
}
.tenant-multi-label {
  font-size: 13px;
  color: #e6a23c;
  margin-bottom: 8px;
}
.tenant-radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
