<template>
  <div class="users-page">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="姓名/用户名/学号/手机"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="组织">
          <el-select v-model="query.organizationId" placeholder="全部" clearable style="width: 160px">
            <el-option
              v-for="org in orgList"
              :key="org.id"
              :label="'　'.repeat(org.level - 1) + org.name"
              :value="org.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.role" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="r in roleOptions" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="openCreate">新增用户</el-button>
            <el-button :icon="Upload" @click="importDialogVisible = true">批量导入</el-button>
            <el-button
              type="danger"
              :disabled="selectedIds.length === 0"
              @click="handleBatchRemove"
            >
              批量禁用 ({{ selectedIds.length }})
            </el-button>
          </div>
          <span class="total">共 {{ total }} 条</span>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="userList"
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="姓名" prop="realName" min-width="100" />
        <el-table-column label="用户名" prop="username" min-width="120" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="学号" prop="studentNo" min-width="120" show-overflow-tooltip />
        <el-table-column label="手机" prop="phone" min-width="120" />
        <el-table-column label="所属组织" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.userOrgs.map((o: any) => o.organization.name).join('、') || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="openResetPwd(row)">重置密码</el-button>
            <el-button link type="danger" size="small" @click="handleRemove(row)">
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="pagination"
        @change="loadUsers"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formDialogVisible" :title="editId ? '编辑用户' : '新增用户'" width="520px" @close="resetUserForm">
      <el-form ref="formRef" :model="userForm" :rules="userRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="!!editId" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item v-if="!editId" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="至少6位" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option v-for="r in roleOptions" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="学号">
          <el-input v-model="userForm.studentNo" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="所属组织">
          <el-select v-model="userForm.organizationId" clearable style="width: 100%">
            <el-option
              v-for="org in orgList"
              :key="org.id"
              :label="'　'.repeat(org.level - 1) + org.name"
              :value="org.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleUserSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="380px">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
        <el-form-item label="新密码" prop="password">
          <el-input v-model="pwdForm.password" type="password" show-password placeholder="至少6位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleResetPwd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入用户" width="480px">
      <div class="import-tips">
        <p>请上传 JSON 文件，格式如下：</p>
        <pre class="import-example">[
  {
    "username": "zhangsan",
    "realName": "张三",
    "password": "123456",
    "role": "STUDENT",
    "studentNo": "2024001",
    "phone": "13800000001",
    "organizationName": "针灸专业"
  }
]</pre>
        <p class="tip-note">若不填 password，默认为 123456</p>
      </div>
      <el-upload
        accept=".json"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleImportFile"
      >
        <el-button type="primary" :icon="Upload">选择 JSON 文件</el-button>
      </el-upload>
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
          :type="importResult.failed === 0 ? 'success' : 'warning'"
          show-icon
          :closable="false"
        />
        <ul v-if="importResult.errors.length" class="error-list">
          <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Upload } from '@element-plus/icons-vue'
import { usersApi, type User } from '@/api/users'
import { organizationsApi } from '@/api/organizations'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// ── 搜索/列表 ─────────────────────────────────────────────
const loading = ref(false)
const userList = ref<User[]>([])
const total = ref(0)
const selectedIds = ref<string[]>([])
const query = reactive({ keyword: '', organizationId: '', role: '' as any, page: 1, pageSize: 20 })

const orgList = ref<{ id: string; name: string; level: number }[]>([])

// 角色层级（数字越大权限越高）
const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 6, TENANT_ADMIN: 5, SCHOOL: 4, CLASS: 3, TEACHER: 2, STUDENT: 1,
}
// 所有角色定义
const ALL_ROLES = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '机构管理员', value: 'TENANT_ADMIN' },
  { label: '学校管理员', value: 'SCHOOL' },
  { label: '班级管理员', value: 'CLASS' },
  { label: '教师', value: 'TEACHER' },
  { label: '学生', value: 'STUDENT' },
]
// 当前用户只能看到/分配低于自己层级的角色
const roleOptions = computed(() => {
  const myLevel = ROLE_LEVEL[auth.user?.role ?? 'STUDENT'] ?? 1
  return ALL_ROLES.filter(r => ROLE_LEVEL[r.value] < myLevel)
})
const roleMap: Record<string, string> = {
  SUPER_ADMIN: '超级管理员', TENANT_ADMIN: '机构管理员', SCHOOL: '学校管理员',
  CLASS: '班级管理员', TEACHER: '教师', STUDENT: '学生',
}
const roleTagMap: Record<string, string> = {
  SUPER_ADMIN: 'danger', TENANT_ADMIN: 'warning', SCHOOL: 'warning',
  CLASS: 'info', TEACHER: 'success', STUDENT: '',
}
const roleLabel = (role: string) => roleMap[role] ?? role
const roleTagType = (role: string) => roleTagMap[role] as any ?? ''

async function loadUsers() {
  loading.value = true
  try {
    const res = await usersApi.list(query) as any
    userList.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadOrgs() {
  orgList.value = (await organizationsApi.getList()) as any
}

function handleSearch() {
  query.page = 1
  loadUsers()
}

function handleReset() {
  query.keyword = ''
  query.organizationId = ''
  query.role = '' as any
  query.page = 1
  loadUsers()
}

function handleSelectionChange(rows: User[]) {
  selectedIds.value = rows.map((r) => r.id)
}

async function handleBatchRemove() {
  await ElMessageBox.confirm(`确定禁用选中的 ${selectedIds.value.length} 个用户吗？`, '提示', { type: 'warning' })
  await usersApi.batchRemove(selectedIds.value)
  ElMessage.success('操作成功')
  await loadUsers()
}

async function handleRemove(row: User) {
  const action = row.isActive ? '禁用' : '启用'
  await ElMessageBox.confirm(`确定${action}用户「${row.realName}」吗？`, '提示', { type: 'warning' })
  await usersApi.update(row.id, { isActive: !row.isActive })
  ElMessage.success(`${action}成功`)
  await loadUsers()
}

// ── 新增/编辑 ─────────────────────────────────────────────
const formDialogVisible = ref(false)
const editId = ref<string | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const userForm = reactive({
  username: '', password: '', realName: '', role: 'STUDENT' as any,
  studentNo: '', phone: '', email: '', organizationId: '',
})
const userRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

function openCreate() {
  editId.value = null
  Object.assign(userForm, { username: '', password: '', realName: '', role: 'STUDENT', studentNo: '', phone: '', email: '', organizationId: '' })
  formDialogVisible.value = true
}

function openEdit(row: User) {
  editId.value = row.id
  Object.assign(userForm, {
    username: row.username,
    password: '',
    realName: row.realName,
    role: row.role,
    studentNo: row.studentNo ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    organizationId: row.userOrgs[0]?.organization.id ?? '',
  })
  formDialogVisible.value = true
}

async function handleUserSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editId.value) {
      const { password, username, ...rest } = userForm
      await usersApi.update(editId.value, rest)
      ElMessage.success('更新成功')
    } else {
      await usersApi.create(userForm)
      ElMessage.success('创建成功')
    }
    formDialogVisible.value = false
    await loadUsers()
  } finally {
    submitting.value = false
  }
}

function resetUserForm() {
  formRef.value?.resetFields()
}

// ── 重置密码 ──────────────────────────────────────────────
const resetPwdVisible = ref(false)
const resetPwdUserId = ref('')
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ password: '' })
const pwdRules: FormRules = {
  password: [{ required: true, min: 6, message: '密码至少6位', trigger: 'blur' }],
}

function openResetPwd(row: User) {
  resetPwdUserId.value = row.id
  pwdForm.password = ''
  resetPwdVisible.value = true
}

async function handleResetPwd() {
  await pwdFormRef.value?.validate()
  submitting.value = true
  try {
    await usersApi.resetPassword(resetPwdUserId.value, pwdForm.password)
    ElMessage.success('密码重置成功')
    resetPwdVisible.value = false
  } finally {
    submitting.value = false
  }
}

// ── 批量导入 ──────────────────────────────────────────────
const importDialogVisible = ref(false)
const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

async function handleImportFile(file: any) {
  const text = await file.raw.text()
  let rows: any[]
  try {
    rows = JSON.parse(text)
    if (!Array.isArray(rows)) throw new Error()
  } catch {
    ElMessage.error('JSON 格式错误')
    return
  }
  importResult.value = null
  const res = await usersApi.batchImport(rows) as any
  importResult.value = res
  await loadUsers()
}

onMounted(() => {
  loadUsers()
  loadOrgs()
})
</script>

<style scoped>
.users-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.left {
  display: flex;
  gap: 8px;
}
.total {
  color: #909399;
  font-size: 14px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
.import-tips {
  margin-bottom: 16px;
}
.import-example {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
}
.tip-note {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}
.import-result {
  margin-top: 16px;
}
.error-list {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 13px;
  color: #e6a23c;
  max-height: 120px;
  overflow-y: auto;
}
</style>
