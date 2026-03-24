<template>
  <div class="admin-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 机构管理 -->
      <el-tab-pane label="机构管理" name="tenants">
        <div class="tab-header">
          <el-input v-model="tenantQuery" placeholder="搜索机构名称/编码" clearable style="width:220px" @keyup.enter="loadTenants" />
          <el-button type="primary" :icon="Search" @click="loadTenants">搜索</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateTenant">新增机构</el-button>
        </div>

        <el-table v-loading="tenantsLoading" :data="tenants" border stripe>
          <el-table-column label="机构名称" prop="name" min-width="160" />
          <el-table-column label="编码" prop="code" width="130" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? '正常' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="授权到期" width="130">
            <template #default="{ row }">
              {{ row.expiredAt ? formatDate(row.expiredAt) : '永久' }}
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="140">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openMemberManagement(row)">查看成员</el-button>
              <el-button link type="primary" size="small" @click="openOrgTree(row)">查看架构</el-button>
              <el-button link type="primary" size="small" @click="openModuleGrant(row)">模块授权</el-button>
              <el-button link type="success" size="small" @click="openCreateAdmin(row)">创建管理员</el-button>
              <el-button link type="primary" size="small" @click="openEditTenant(row)">编辑</el-button>
              <el-button
                link size="small"
                :type="row.isActive ? 'warning' : 'success'"
                @click="toggleTenant(row)"
              >{{ row.isActive ? '禁用' : '启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 模块管理 -->
      <el-tab-pane label="模块定义" name="modules">
        <div class="module-grid" v-loading="modulesLoading">
          <el-card
            v-for="m in modules"
            :key="m.id"
            class="module-def-card"
            shadow="hover"
          >
            <div class="mcard-header">
              <span class="mcard-name">{{ m.name }}</span>
              <div class="mcard-tags">
                <el-tag v-if="m.phase" :type="m.phase === '二期' ? 'warning' : 'danger'" size="small">{{ m.phase }}</el-tag>
                <el-tag :type="m.isActive ? 'success' : 'info'" size="small">{{ m.isActive ? '已上架' : '未上架' }}</el-tag>
              </div>
            </div>
            <div class="mcard-code">{{ m.code }}</div>
            <div class="mcard-desc">{{ m.description }}</div>
          </el-card>
        </div>
        <el-alert type="info" :closable="false" style="margin-top:16px" title="专业模块由系统预置，不支持手动新增。如需开通新模块，请联系平台方。" show-icon />
      </el-tab-pane>

      <!-- 机构成员 -->
      <el-tab-pane label="机构成员" name="tenant-members">
        <div class="member-header">
          <el-select v-model="selectedTenantId" placeholder="选择机构" @change="loadTenantUsers" style="width: 240px">
            <el-option
              v-for="t in tenants"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
          <el-input v-model="userQuery" placeholder="搜索姓名/用户名/手机" clearable style="width: 200px" @keyup.enter="loadTenantUsers" />
          <el-button type="primary" :icon="Search" @click="loadTenantUsers">搜索</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateUser" :disabled="!selectedTenantId">新增成员</el-button>
          <el-button type="danger" :icon="Delete" @click="batchDelete" :disabled="selectedUserIds.length === 0">批量删除</el-button>
        </div>

        <el-table
          v-loading="usersLoading"
          :data="users"
          border
          stripe
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="40" />
          <el-table-column label="用户名" prop="username" width="120" />
          <el-table-column label="姓名" prop="realName" width="100" />
          <el-table-column label="角色" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="getRoleTagType(row.role)">{{ getRoleLabel(row.role) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="手机/邮箱" min-width="180">
            <template #default="{ row }">
              <div v-if="row.phone">{{ row.phone }}</div>
              <div v-if="row.email" style="color:#909399;font-size:12px">{{ row.email }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '正常' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="140">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEditUser(row)">编辑</el-button>
              <el-button link type="warning" size="small" @click="openResetPassword(row)">重置密码</el-button>
              <el-button link type="danger" size="small" @click="deleteUser(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="userPage"
            v-model:page-size="userPageSize"
            :total="userTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadTenantUsers"
            @size-change="loadTenantUsers"
          />
        </div>
      </el-tab-pane>

      <!-- 全库用户 -->
      <el-tab-pane label="全库用户" name="all-users">
        <div class="member-header">
          <el-input v-model="allUserQuery.keyword" placeholder="搜索姓名/用户名/手机/邮箱" clearable style="width: 220px" @keyup.enter="loadAllUsers" />
          <el-select v-model="allUserQuery.tenantId" placeholder="所属机构" clearable style="width: 160px" @change="loadAllUsers">
            <el-option
              v-for="t in tenants"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
          <el-select v-model="allUserQuery.role" placeholder="角色" clearable style="width: 140px" @change="loadAllUsers">
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="机构管理员" value="TENANT_ADMIN" />
            <el-option label="学校管理员" value="SCHOOL" />
            <el-option label="班级管理员" value="CLASS" />
            <el-option label="教师" value="TEACHER" />
            <el-option label="学生" value="STUDENT" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="loadAllUsers">搜索</el-button>
        </div>

        <el-table v-loading="allUsersLoading" :data="allUsers" border stripe>
          <el-table-column label="用户名" prop="username" width="120" />
          <el-table-column label="姓名" prop="realName" width="100" />
          <el-table-column label="角色" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="getRoleTagType(row.role)">{{ getRoleLabel(row.role) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="所属机构" width="140">
            <template #default="{ row }">{{ row.tenant?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="手机/邮箱" min-width="180">
            <template #default="{ row }">
              <div v-if="row.phone">{{ row.phone }}</div>
              <div v-if="row.email" style="color:#909399;font-size:12px">{{ row.email }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '正常' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEditUser(row, true)">编辑</el-button>
              <el-button link type="warning" size="small" @click="openResetPassword(row, true)">重置密码</el-button>
              <el-button link type="danger" size="small" @click="deleteUser(row, true)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="allUserPage"
            v-model:page-size="allUserPageSize"
            :total="allUserTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadAllUsers"
            @size-change="loadAllUsers"
          />
        </div>
      </el-tab-pane>

      <!-- 平台统计 -->
      <el-tab-pane label="平台概览" name="stats">
        <div v-loading="statsLoading" class="stats-grid">
          <el-card v-for="s in statCards" :key="s.label" class="stat-card">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新建/编辑机构 -->
    <el-dialog v-model="tenantFormVisible" :title="editTenant ? '编辑机构' : '新增机构'" width="480px">
      <el-form :model="tenantForm" label-width="90px">
        <el-form-item label="机构名称" required>
          <el-input v-model="tenantForm.name" />
        </el-form-item>
        <el-form-item label="机构编码" required>
          <el-input v-model="tenantForm.code" :disabled="!!editTenant" placeholder="唯一标识，创建后不可修改" />
        </el-form-item>
        <el-form-item label="机构Logo">
          <div class="logo-uploader">
            <el-upload
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="handleLogoChange"
            >
              <img v-if="tenantForm.logo" :src="tenantForm.logo" class="logo-preview" />
              <div v-else class="logo-placeholder">
                <el-icon size="28"><Plus /></el-icon>
                <span>上传Logo</span>
              </div>
            </el-upload>
            <el-button v-if="tenantForm.logo" link type="danger" size="small" @click="tenantForm.logo = ''">移除</el-button>
          </div>
          <div style="color:#909399;font-size:12px;margin-top:4px">支持 JPG/PNG，建议正方形，200×200px 以内</div>
        </el-form-item>
        <el-form-item label="授权到期">
          <el-date-picker v-model="tenantForm.expiredAt" type="date" placeholder="留空为永久" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tenantFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTenant">保存</el-button>
      </template>
    </el-dialog>

    <!-- 创建机构管理员 -->
    <el-dialog v-model="adminFormVisible" :title="`创建管理员 — ${adminTenant?.name}`" width="420px">
      <el-form :model="adminForm" label-width="90px">
        <el-form-item label="用户名" required>
          <el-input v-model="adminForm.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="真实姓名" required>
          <el-input v-model="adminForm.realName" placeholder="姓名" />
        </el-form-item>
        <el-form-item label="初始密码" required>
          <el-input v-model="adminForm.password" type="password" show-password placeholder="至少6位" />
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" style="margin-top:8px">
        创建后角色为「教师管理员」，可管理本机构所有数据。密码请交由对方自行修改。
      </el-alert>
      <template #footer>
        <el-button @click="adminFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveAdmin">创建</el-button>
      </template>
    </el-dialog>

    <!-- 新增模块 -->
    <el-dialog v-model="moduleFormVisible" title="新增模块" width="440px">
      <el-form :model="moduleForm" label-width="90px">
        <el-form-item label="模块代码" required>
          <el-input v-model="moduleForm.code" placeholder="如 constitution / acupuncture" />
        </el-form-item>
        <el-form-item label="模块名称" required>
          <el-input v-model="moduleForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="moduleForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moduleFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveModule">保存</el-button>
      </template>
    </el-dialog>

    <!-- 模块授权抽屉 -->
    <el-drawer v-model="grantVisible" :title="`模块授权 — ${grantTenant?.name}`" size="520px">
      <div class="grant-body">
        <div class="grant-modules">
          <div v-for="m in modules" :key="m.id" class="grant-item">
            <div class="grant-info">
              <span class="grant-name">{{ m.name }}</span>
              <span class="grant-code">{{ m.code }}</span>
            </div>
            <div class="grant-action">
              <template v-if="isGranted(m.id)">
                <span class="granted-date">
                  到期：{{ getGrantExpiry(m.id) }}
                </span>
                <el-button size="small" type="danger" plain @click="revokeModule(m.id)">撤销</el-button>
              </template>
              <template v-else>
                <el-date-picker
                  v-model="grantExpiry[m.id]"
                  type="date"
                  placeholder="到期日（留空永久）"
                  size="small"
                  style="width:160px"
                />
                <el-button size="small" type="primary" @click="grantModule(m.id)">授权</el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 新增/编辑成员 -->
    <el-dialog v-model="userFormVisible" :title="editUser ? '编辑成员' : '新增成员'" width="480px">
      <el-form :model="userForm" label-width="90px">
        <el-form-item label="用户名" required>
          <el-input v-model="userForm.username" :disabled="!!editUser" placeholder="同机构内唯一" />
        </el-form-item>
        <el-form-item label="真实姓名" required>
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="机构管理员" value="TENANT_ADMIN" />
            <el-option label="学校管理员" value="SCHOOL" />
            <el-option label="班级管理员" value="CLASS" />
            <el-option label="教师" value="TEACHER" />
            <el-option label="学生" value="STUDENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item v-if="!editUser" label="初始密码" required>
          <el-input v-model="userForm.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="resetPasswordVisible" title="重置密码" width="400px">
      <el-form :model="resetPasswordForm" label-width="80px">
        <el-form-item label="新密码" required>
          <el-input v-model="resetPasswordForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <el-alert type="warning" :closable="false" style="margin-top:8px" show-icon>
        密码重置后请通知用户及时修改
      </el-alert>
      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="confirmResetPassword">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看组织架构 -->
    <el-drawer v-model="orgTreeVisible" title="组织架构" size="400px">
      <el-tree
        v-if="orgTree.length > 0"
        :data="orgTree"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        default-expand-all
      />
      <el-empty v-else description="暂无组织架构数据" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const activeTab = ref('tenants')

// ── 机构 ──
const tenantsLoading = ref(false)
const tenants = ref<any[]>([])
const tenantTotal = ref(0)
const tenantQuery = ref('')
const tenantFormVisible = ref(false)
const editTenant = ref<any>(null)
const saving = ref(false)
const tenantForm = reactive({ name: '', code: '', logo: '', expiredAt: null as any })

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const data = (await adminApi.listTenants({ keyword: tenantQuery.value })) as any
    tenants.value = data.list ?? data
    tenantTotal.value = data.total ?? tenants.value.length
  } finally {
    tenantsLoading.value = false
  }
}

function openCreateTenant() {
  editTenant.value = null
  Object.assign(tenantForm, { name: '', code: '', logo: '', expiredAt: null })
  tenantFormVisible.value = true
}

function handleLogoChange(file: any) {
  const raw: File = file.raw
  if (!raw.type.startsWith('image/')) { ElMessage.error('请选择图片文件'); return }
  if (raw.size > 2 * 1024 * 1024) { ElMessage.error('图片不能超过 2MB'); return }
  const reader = new FileReader()
  reader.onload = (e) => { tenantForm.logo = e.target?.result as string }
  reader.readAsDataURL(raw)
}

function openEditTenant(row: any) {
  editTenant.value = row
  Object.assign(tenantForm, { name: row.name, code: row.code, logo: row.logo ?? '', expiredAt: row.expiredAt ? new Date(row.expiredAt) : null })
  tenantFormVisible.value = true
}

async function saveTenant() {
  if (!tenantForm.name || !tenantForm.code) { ElMessage.warning('名称和编码必填'); return }
  saving.value = true
  try {
    if (editTenant.value) {
      await adminApi.updateTenant(editTenant.value.id, tenantForm)
    } else {
      await adminApi.createTenant(tenantForm)
    }
    ElMessage.success('保存成功')
    tenantFormVisible.value = false
    loadTenants()
  } finally {
    saving.value = false
  }
}

async function toggleTenant(row: any) {
  const action = row.isActive ? '禁用' : '启用'
  await ElMessageBox.confirm(`确定${action}「${row.name}」?`, '确认', { type: 'warning' })
  await adminApi.toggleTenant(row.id, !row.isActive)
  ElMessage.success(`${action}成功`)
  loadTenants()
}

// ── 模块 ──
const modulesLoading = ref(false)
const modules = ref<any[]>([])
const moduleFormVisible = ref(false)
const moduleForm = reactive({ code: '', name: '', description: '' })

async function loadModules() {
  modulesLoading.value = true
  try {
    modules.value = (await adminApi.listModules()) as any[]
  } finally {
    modulesLoading.value = false
  }
}

function openCreateModule() {
  Object.assign(moduleForm, { code: '', name: '', description: '' })
  moduleFormVisible.value = true
}

async function saveModule() {
  if (!moduleForm.code || !moduleForm.name) { ElMessage.warning('代码和名称必填'); return }
  saving.value = true
  try {
    await adminApi.createModule(moduleForm)
    ElMessage.success('创建成功')
    moduleFormVisible.value = false
    loadModules()
  } finally {
    saving.value = false
  }
}

// ── 模块授权 ──
const grantVisible = ref(false)
const grantTenant = ref<any>(null)
const grantedModules = ref<any[]>([])
const grantExpiry = reactive<Record<string, any>>({})

function isGranted(moduleId: string) {
  return grantedModules.value.some(g => g.moduleId === moduleId)
}

function getGrantExpiry(moduleId: string) {
  const g = grantedModules.value.find(g => g.moduleId === moduleId)
  return g?.expiredAt ? formatDate(g.expiredAt) : '永久'
}

async function openModuleGrant(tenant: any) {
  grantTenant.value = tenant
  grantVisible.value = true
  grantedModules.value = (await adminApi.listTenantModules(tenant.id)) as any[]
}

async function grantModule(moduleId: string) {
  await adminApi.grantModule(grantTenant.value.id, {
    moduleId,
    expiredAt: grantExpiry[moduleId] || null,
  })
  ElMessage.success('授权成功')
  grantedModules.value = (await adminApi.listTenantModules(grantTenant.value.id)) as any[]
}

async function revokeModule(moduleId: string) {
  await ElMessageBox.confirm('确定撤销该模块授权?', '确认', { type: 'warning' })
  await adminApi.revokeModule(grantTenant.value.id, moduleId)
  ElMessage.success('已撤销')
  grantedModules.value = (await adminApi.listTenantModules(grantTenant.value.id)) as any[]
}

// ── 创建机构管理员 ──
const adminFormVisible = ref(false)
const adminTenant = ref<any>(null)
const adminForm = reactive({ username: '', realName: '', password: '' })

function openCreateAdmin(tenant: any) {
  adminTenant.value = tenant
  Object.assign(adminForm, { username: '', realName: '', password: '' })
  adminFormVisible.value = true
}

async function saveAdmin() {
  if (!adminForm.username || !adminForm.realName || !adminForm.password) {
    ElMessage.warning('用户名、姓名、密码均为必填')
    return
  }
  if (adminForm.password.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }
  saving.value = true
  try {
    await adminApi.createTenantAdmin(adminTenant.value.id, adminForm)
    ElMessage.success(`管理员「${adminForm.realName}」创建成功`)
    adminFormVisible.value = false
  } finally {
    saving.value = false
  }
}

// ── 统计 ──
const statsLoading = ref(false)
const stats = ref<any>({})
const statCards = computed(() => [
  { label: '机构总数', value: stats.value.tenantCount ?? '—' },
  { label: '用户总数', value: stats.value.userCount ?? '—' },
  { label: '题目总数', value: stats.value.questionCount ?? '—' },
  { label: '考试总数', value: stats.value.examCount ?? '—' },
  { label: '成绩记录', value: stats.value.scoreCount ?? '—' },
  { label: '评分记录', value: stats.value.recordCount ?? '—' },
])

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await adminApi.getStats()
  } finally {
    statsLoading.value = false
  }
}

watch(activeTab, tab => {
  if (tab === 'stats') loadStats()
  if (tab === 'tenant-members' && tenants.value.length > 0) {
    if (!selectedTenantId.value) selectedTenantId.value = tenants.value[0]?.id
    loadTenantUsers()
  }
  if (tab === 'all-users') loadAllUsers()
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadTenants()
  loadModules()
})

// ── 机构成员 ─────────────────────────────────────────────

const usersLoading = ref(false)
const users = ref<any[]>([])
const userTotal = ref(0)
const selectedTenantId = ref('')
const userQuery = ref('')
const userPage = ref(1)
const userPageSize = ref(20)
const selectedUserIds = ref<string[]>([])
const userFormVisible = ref(false)
const editUser = ref<any>(null)
const userForm = reactive({
  username: '', realName: '', role: 'TEACHER', phone: '', email: '', password: '', studentNo: '',
})

async function loadTenantUsers() {
  usersLoading.value = true
  try {
    const data = await adminApi.listTenantUsers(selectedTenantId.value, {
      page: userPage.value, pageSize: userPageSize.value, keyword: userQuery.value,
    }) as any
    users.value = data.list || []
    userTotal.value = data.total || 0
  } finally {
    usersLoading.value = false
  }
}

function handleSelectionChange(selection: any[]) {
  selectedUserIds.value = selection.map(item => item.id)
}

function openCreateUser() {
  if (!selectedTenantId.value) { ElMessage.warning('请先选择机构'); return }
  editUser.value = null
  Object.assign(userForm, { username: '', realName: '', role: 'TEACHER', phone: '', email: '', password: '', studentNo: '' })
  userFormVisible.value = true
}

function openEditUser(row: any, isAllUsers: boolean = false) {
  editUser.value = { ...row, isAllUsers }
  Object.assign(userForm, {
    username: row.username, realName: row.realName, role: row.role,
    phone: row.phone, email: row.email, studentNo: row.studentNo,
  })
  userFormVisible.value = true
}

async function saveUser() {
  if (!userForm.username || !userForm.realName) { ElMessage.warning('用户名和姓名为必填项'); return }
  if (!editUser.value && !userForm.password) { ElMessage.warning('初始密码为必填项'); return }
  if (userForm.password && userForm.password.length < 6) { ElMessage.warning('密码至少 6 位'); return }
  saving.value = true
  try {
    if (editUser.value) {
      if (editUser.value.isAllUsers) await adminApi.updateUser(editUser.value.id, userForm)
      else await adminApi.updateTenantUser(selectedTenantId.value, editUser.value.id, userForm)
      ElMessage.success('保存成功')
    } else {
      await adminApi.createTenantUser(selectedTenantId.value, userForm)
      ElMessage.success('新增成功')
    }
    userFormVisible.value = false
    if (editUser.value?.isAllUsers) loadAllUsers()
    else loadTenantUsers()
  } finally {
    saving.value = false
  }
}

async function deleteUser(row: any, isAllUsers: boolean = false) {
  await ElMessageBox.confirm(`确定删除用户「${row.realName}」？`, '确认', { type: 'warning' })
  if (isAllUsers) {
    await adminApi.deleteUser(row.id)
    loadAllUsers()
  } else {
    await adminApi.deleteTenantUser(selectedTenantId.value, row.id)
    loadTenantUsers()
  }
  ElMessage.success('删除成功')
}

async function batchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedUserIds.value.length} 个用户？`, '确认', { type: 'warning' })
  await adminApi.batchDeleteTenantUsers(selectedTenantId.value, selectedUserIds.value)
  ElMessage.success('批量删除成功')
  loadTenantUsers()
}

// ── 重置密码 ─────────────────────────────────────────────

const resetPasswordVisible = ref(false)
const resetPasswordTarget = ref<any>(null)
const resetPasswordForm = reactive({ newPassword: '' })

function openResetPassword(row: any, isAllUsers: boolean = false) {
  resetPasswordTarget.value = { ...row, isAllUsers }
  resetPasswordForm.newPassword = ''
  resetPasswordVisible.value = true
}

async function confirmResetPassword() {
  if (resetPasswordForm.newPassword.length < 6) { ElMessage.warning('密码至少 6 位'); return }
  saving.value = true
  try {
    const target = resetPasswordTarget.value
    if (target.isAllUsers) await adminApi.resetTenantUserPassword(target.tenantId, target.id, resetPasswordForm.newPassword)
    else await adminApi.resetTenantUserPassword(selectedTenantId.value, resetPasswordTarget.value.id, resetPasswordForm.newPassword)
    ElMessage.success('密码已重置')
    resetPasswordVisible.value = false
  } finally {
    saving.value = false
  }
}

// ── 全库用户 ─────────────────────────────────────────────

const allUsersLoading = ref(false)
const allUsers = ref<any[]>([])
const allUserTotal = ref(0)
const allUserPage = ref(1)
const allUserPageSize = ref(20)
const allUserQuery = reactive({ keyword: '', tenantId: '', role: '' })

async function loadAllUsers() {
  allUsersLoading.value = true
  try {
    const data = await adminApi.listAllUsers({
      page: allUserPage.value, pageSize: allUserPageSize.value,
      keyword: allUserQuery.keyword, tenantId: allUserQuery.tenantId, role: allUserQuery.role,
    }) as any
    allUsers.value = data.list || []
    allUserTotal.value = data.total || 0
  } finally {
    allUsersLoading.value = false
  }
}

// ── 组织架构 ─────────────────────────────────────────────

const orgTreeVisible = ref(false)
const orgTree = ref<any[]>([])

async function openOrgTree(row: any) {
  orgTreeVisible.value = true
  orgTree.value = []
  try {
    const data = await adminApi.getTenantOrganizations(row.id) as any
    orgTree.value = data || []
  } catch {
    ElMessage.error('加载组织架构失败')
  }
}

function openMemberManagement(row: any) {
  selectedTenantId.value = row.id
  activeTab.value = 'tenant-members'
  loadTenantUsers()
}

// ── 工具函数 ─────────────────────────────────────────────

const roleLabelMap: Record<string, string> = {
  SUPER_ADMIN: '超级管理员', TENANT_ADMIN: '机构管理员', SCHOOL: '学校管理员',
  CLASS: '班级管理员', TEACHER: '教师', STUDENT: '学生',
}
const roleTagMap: Record<string, string> = {
  SUPER_ADMIN: 'danger', TENANT_ADMIN: 'primary', SCHOOL: 'success',
  CLASS: 'warning', TEACHER: '', STUDENT: 'info',
}
function getRoleLabel(role: string) { return roleLabelMap[role] || role }
function getRoleTagType(role: string) { return roleTagMap[role] || '' }
</script>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  background: #fff;
  border-radius: 4px;
}
.admin-page :deep(.el-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  overflow: hidden;
}
.admin-page :deep(.el-tabs--border-card) {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
}
.admin-page :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.admin-page :deep(.el-tabs__header) {
  flex-shrink: 0;
}
.tab-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding: 8px 0; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding: 8px 0; }
.stat-card { text-align: center; }
.stat-value { font-size: 32px; font-weight: 700; color: #409eff; }
.stat-label { font-size: 14px; color: #909399; margin-top: 4px; }
.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.module-def-card { cursor: default; }
.mcard-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.mcard-name { font-size: 15px; font-weight: 600; color: #303133; }
.mcard-tags { display: flex; gap: 4px; }
.mcard-code { font-size: 11px; color: #909399; font-family: monospace; margin-bottom: 8px; }
.mcard-desc { font-size: 13px; color: #606266; line-height: 1.6; }
.grant-body { padding: 0 4px; }
.grant-modules { display: flex; flex-direction: column; gap: 12px; }
.grant-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border: 1px solid #e4e7ed; border-radius: 6px;
}
.grant-info { display: flex; flex-direction: column; gap: 2px; }
.grant-name { font-size: 14px; font-weight: 500; }
.grant-code { font-size: 12px; color: #909399; }
.grant-action { display: flex; align-items: center; gap: 8px; }
.granted-date { font-size: 12px; color: #67c23a; }
.logo-uploader { display: flex; align-items: center; gap: 12px; }
.logo-preview { width: 80px; height: 80px; object-fit: contain; border: 1px solid #e4e7ed; border-radius: 6px; display: block; }
.logo-placeholder {
  width: 80px; height: 80px; border: 1px dashed #d9d9d9; border-radius: 6px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; cursor: pointer; color: #909399; font-size: 12px;
}
.logo-placeholder:hover { border-color: #409eff; color: #409eff; }
</style>
