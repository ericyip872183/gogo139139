<template>
  <div class="exams-page">
    <el-card>
      <template #header>
        <div class="header">
          <div class="left">
            <el-input v-model="query.keyword" placeholder="搜索考试" clearable style="width:200px" @keyup.enter="load" />
            <el-select v-model="query.status" clearable placeholder="状态" style="width:120px">
              <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="load">搜索</el-button>
          </div>
          <el-button type="primary" :icon="Plus" @click="openCreate">发布考试</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list">
        <el-table-column label="考试标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="关联试卷" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.paper?.title ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="155">
          <template #default="{ row }">{{ row.startAt ? formatDate(row.startAt) : '不限' }}</template>
        </el-table-column>
        <el-table-column label="结束时间" width="155">
          <template #default="{ row }">{{ row.endAt ? formatDate(row.endAt) : '不限' }}</template>
        </el-table-column>
        <el-table-column label="参与人数" width="90">
          <template #default="{ row }">{{ row._count?.participants ?? 0 }} 人</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openManage(row)">管理</el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              link type="success" size="small"
              @click="handlePublish(row)"
            >发布</el-button>
            <el-button
              v-if="row.status !== 'ENDED' && row.status !== 'CANCELLED'"
              link type="warning" size="small"
              @click="handleCancel(row)"
            >取消</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page" v-model:page-size="query.pageSize"
        :total="total" :page-sizes="[10, 20]"
        layout="total, sizes, prev, pager, next"
        class="pagination" @change="load"
      />
    </el-card>

    <!-- 新建/编辑考试弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑考试' : '发布新考试'" width="640px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="考试标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="关联试卷" prop="paperId">
          <el-select v-model="form.paperId" style="width:100%" filterable :disabled="!!editId">
            <el-option v-for="p in paperOptions" :key="p.id" :label="p.title" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker v-model="form.startAt" type="datetime" style="width:100%" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker v-model="form.endAt" type="datetime" style="width:100%" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="考试时长">
              <el-input-number v-model="form.duration" :min="1" style="width:100%" placeholder="留空使用试卷时长" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大切屏次">
              <el-input-number v-model="form.maxSwitch" :min="0" :max="99" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 指定考生 -->
        <el-form-item label="指定组织">
          <el-select v-model="form.organizationIds" multiple style="width:100%" filterable>
            <el-option v-for="o in orgList" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
          <div style="color:#909399;font-size:12px;margin-top:4px">选择组织后，该组织所有用户自动加入</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 考试管理抽屉（参与人员） -->
    <el-drawer v-model="manageDrawerVisible" :title="currentExam?.title" size="600px">
      <div class="drawer-header">
        <el-button type="primary" size="small" :icon="Plus" @click="addParticipantVisible = true">添加考生</el-button>
        <span style="color:#909399;font-size:13px">共 {{ participants.length }} 人</span>
      </div>
      <el-table :data="participants" style="margin-top:12px">
        <el-table-column label="姓名" min-width="100">
          <template #default="{ row }">{{ row.user?.realName }}</template>
        </el-table-column>
        <el-table-column label="用户名" min-width="120">
          <template #default="{ row }">{{ row.user?.username }}</template>
        </el-table-column>
        <el-table-column label="学号" min-width="120">
          <template #default="{ row }">{{ row.user?.studentNo ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.hasSubmitted ? 'success' : ''" size="small">
              {{ row.hasSubmitted ? '已交卷' : '待考' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleRemoveParticipant(row.user?.id)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 添加考生对话框 -->
      <el-dialog v-model="addParticipantVisible" title="添加考生" width="480px" append-to-body>
        <el-form label-width="80px">
          <el-form-item label="选择组织">
            <el-select v-model="addOrgIds" multiple style="width:100%" filterable>
              <el-option v-for="o in orgList" :key="o.id" :label="o.name" :value="o.id" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addParticipantVisible = false">取消</el-button>
          <el-button type="primary" :loading="addingParticipant" @click="handleAddParticipants">确定</el-button>
        </template>
      </el-dialog>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { examsApi, papersApi, type Exam } from '@/api/exams'
import { organizationsApi } from '@/api/organizations'

const route = useRoute()

const loading = ref(false)
const list = ref<Exam[]>([])
const total = ref(0)
const query = reactive({ keyword: '', status: '' as any, page: 1, pageSize: 10 })

const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '进行中', value: 'ONGOING' },
  { label: '已结束', value: 'ENDED' },
  { label: '已取消', value: 'CANCELLED' },
]
const statusLabel = (s: string) => ({ DRAFT: '草稿', PUBLISHED: '已发布', ONGOING: '进行中', ENDED: '已结束', CANCELLED: '已取消' }[s] ?? s)
const statusTagType = (s: string) => ({ DRAFT: 'info', PUBLISHED: 'primary', ONGOING: 'success', ENDED: '', CANCELLED: 'danger' }[s] as any ?? '')
const formatDate = (s: string) => s ? new Date(s).toLocaleString('zh-CN') : ''

async function load() {
  loading.value = true
  try {
    const res = await examsApi.list(query) as any
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function handlePublish(row: Exam) {
  await ElMessageBox.confirm(`确定发布考试「${row.title}」吗？发布后学生可见。`, '确认发布', { type: 'warning' })
  await examsApi.publish(row.id)
  ElMessage.success('发布成功')
  load()
}

async function handleCancel(row: Exam) {
  await ElMessageBox.confirm(`确定取消考试「${row.title}」吗？`, '确认取消', { type: 'warning' })
  await examsApi.cancel(row.id)
  ElMessage.success('已取消')
  load()
}

// ─── 表单 ──────────────────────────────────────────────
const dialogVisible = ref(false)
const editId = ref<string | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const paperOptions = ref<{ id: string; title: string }[]>([])
const orgList = ref<{ id: string; name: string }[]>([])

const form = reactive({
  title: '', paperId: '', startAt: '', endAt: '',
  duration: null as any, maxSwitch: 3, organizationIds: [] as string[],
})
const rules: FormRules = {
  title: [{ required: true, message: '请输入考试标题', trigger: 'blur' }],
  paperId: [{ required: true, message: '请选择试卷', trigger: 'change' }],
}

async function loadOptions() {
  const [papers, orgs] = await Promise.all([
    papersApi.list({ pageSize: 100 }) as any,
    organizationsApi.getList() as any,
  ])
  paperOptions.value = papers.list
  orgList.value = orgs
}

function openCreate() {
  editId.value = null
  Object.assign(form, { title: '', paperId: '', startAt: '', endAt: '', duration: null, maxSwitch: 3, organizationIds: [] })
  dialogVisible.value = true
}

function openEdit(row: Exam) {
  editId.value = row.id
  Object.assign(form, {
    title: row.title, paperId: row.paperId,
    startAt: row.startAt ?? '', endAt: row.endAt ?? '',
    duration: row.duration ?? null, maxSwitch: row.maxSwitch, organizationIds: [],
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = {
      ...form,
      duration: form.duration || undefined,
      startAt: form.startAt || undefined,
      endAt: form.endAt || undefined,
    }
    if (editId.value) {
      const { paperId, organizationIds, ...updatePayload } = payload
      await examsApi.update(editId.value, updatePayload)
      ElMessage.success('更新成功')
    } else {
      await examsApi.create(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

function resetForm() { formRef.value?.resetFields() }

// ─── 考试管理（参与人员）──────────────────────────────
const manageDrawerVisible = ref(false)
const currentExam = ref<Exam | null>(null)
const participants = ref<any[]>([])
const addParticipantVisible = ref(false)
const addOrgIds = ref<string[]>([])
const addingParticipant = ref(false)

async function openManage(row: Exam) {
  currentExam.value = row
  manageDrawerVisible.value = true
  participants.value = (await examsApi.getParticipants(row.id)) as any
}

async function handleRemoveParticipant(userId: string) {
  await examsApi.removeParticipant(currentExam.value!.id, userId)
  participants.value = (await examsApi.getParticipants(currentExam.value!.id)) as any
  ElMessage.success('已移除')
}

async function handleAddParticipants() {
  addingParticipant.value = true
  try {
    await examsApi.addParticipants(currentExam.value!.id, { organizationIds: addOrgIds.value })
    participants.value = (await examsApi.getParticipants(currentExam.value!.id)) as any
    addParticipantVisible.value = false
    addOrgIds.value = []
    ElMessage.success('添加成功')
  } finally {
    addingParticipant.value = false
  }
}

onMounted(async () => {
  load()
  await loadOptions()
  // 从试卷管理页跳转过来时，自动打开创建弹窗并预填试卷
  const presetPaperId = route.query.paperId as string
  if (presetPaperId) {
    openCreate()
    form.paperId = presetPaperId
  }
})
</script>

<style scoped>
.exams-page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.left { display: flex; gap: 8px; }
.pagination { margin-top: 12px; justify-content: flex-end; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; }
</style>
