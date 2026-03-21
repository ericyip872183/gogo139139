<template>
  <div class="score-tables-page">
    <el-card>
      <template #header>
        <div class="header">
          <div class="left">
            <el-input v-model="query.keyword" placeholder="搜索评分表" clearable style="width:200px" @keyup.enter="load" />
            <el-button type="primary" :icon="Search" @click="load">搜索</el-button>
          </div>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建评分表</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column label="评分表名称" prop="name" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'ADD' ? 'success' : 'warning'" size="small">
              {{ row.type === 'ADD' ? '加分制' : '减分制' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="满分" prop="totalScore" width="80" align="center" />
        <el-table-column label="评分项数" width="90" align="center">
          <template #default="{ row }">{{ row.items?.length ?? 0 }} 项</template>
        </el-table-column>
        <el-table-column label="创建时间" width="155">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openJudge(row)">打分</el-button>
            <el-button link type="primary" size="small" @click="openRecords(row)">记录</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @change="load"
        />
      </div>
    </el-card>

    <!-- 新建/编辑评分表对话框 -->
    <el-dialog
      v-model="formVisible"
      :title="editRow ? '编辑评分表' : '新建评分表'"
      width="640px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="名称" required>
              <el-input v-model="form.name" placeholder="评分表名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="类型">
              <el-radio-group v-model="form.type">
                <el-radio value="ADD">加分制</el-radio>
                <el-radio value="MINUS">减分制</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="满分">
          <el-input-number v-model="form.totalScore" :min="0" :max="1000" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <el-divider>评分项</el-divider>
        <div class="items-list">
          <div v-for="(item, idx) in form.items" :key="idx" class="item-row">
            <el-input v-model="item.name" placeholder="评分项名称" style="flex:1" />
            <el-input-number v-model="item.score" :min="-100" :max="100" style="width:110px" />
            <el-button :icon="Delete" circle size="small" type="danger" plain @click="removeItem(idx)" />
          </div>
          <el-button :icon="Plus" type="primary" plain size="small" @click="addItem">添加评分项</el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 打分记录抽屉 -->
    <el-drawer v-model="recordsVisible" title="打分记录" size="600px">
      <el-table v-loading="recordsLoading" :data="records" border>
        <el-table-column label="被评人" min-width="100">
          <template #default="{ row }">{{ row.target?.realName }}</template>
        </el-table-column>
        <el-table-column label="学号" width="120">
          <template #default="{ row }">{{ row.target?.studentNo ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="得分" prop="totalScore" width="80" align="center" />
        <el-table-column label="考官" width="100">
          <template #default="{ row }">{{ row.judge?.realName }}</template>
        </el-table-column>
        <el-table-column label="时间" min-width="140">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Delete } from '@element-plus/icons-vue'
import { scoreTablesApi } from '@/api/score-tables'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const query = reactive({ keyword: '', page: 1, pageSize: 20 })

const formVisible = ref(false)
const editRow = ref<any>(null)
const form = reactive<any>({
  name: '', type: 'ADD', totalScore: 100, description: '', items: [],
})

const recordsVisible = ref(false)
const recordsLoading = ref(false)
const records = ref<any[]>([])

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

async function load() {
  loading.value = true
  try {
    const data = (await scoreTablesApi.list(query)) as any
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editRow.value = null
  resetForm()
  formVisible.value = true
}

function openEdit(row: any) {
  editRow.value = row
  Object.assign(form, {
    name: row.name,
    type: row.type,
    totalScore: row.totalScore,
    description: row.description ?? '',
    items: row.items.map((i: any) => ({ name: i.name, score: i.score, sortOrder: i.sortOrder })),
  })
  formVisible.value = true
}

function resetForm() {
  Object.assign(form, { name: '', type: 'ADD', totalScore: 100, description: '', items: [] })
}

function addItem() {
  form.items.push({ name: '', score: 0, sortOrder: form.items.length })
}

function removeItem(idx: number) {
  form.items.splice(idx, 1)
}

async function handleSave() {
  if (!form.name.trim()) { ElMessage.warning('请输入名称'); return }
  saving.value = true
  try {
    if (editRow.value) {
      await scoreTablesApi.update(editRow.value.id, form)
    } else {
      await scoreTablesApi.create(form)
    }
    ElMessage.success('保存成功')
    formVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.name}」?`, '确认', { type: 'warning' })
  await scoreTablesApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

function openJudge(row: any) {
  router.push(`/score-tables/${row.id}/judge`)
}

async function openRecords(row: any) {
  recordsVisible.value = true
  recordsLoading.value = true
  try {
    records.value = (await scoreTablesApi.getRecords(row.id)) as any[]
  } finally {
    recordsLoading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.score-tables-page {}
.header { display: flex; align-items: center; justify-content: space-between; }
.left { display: flex; align-items: center; gap: 8px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.items-list { display: flex; flex-direction: column; gap: 8px; }
.item-row { display: flex; align-items: center; gap: 8px; }
</style>
