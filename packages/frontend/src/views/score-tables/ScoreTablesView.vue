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
          <el-button :icon="Upload" @click="importDialogVisible = true">批量导入</el-button>
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openJudge(row)">打分</el-button>
            <el-button link type="primary" size="small" @click="openRecords(row)">记录</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="success" size="small" @click="handleConvertToQuestions(row)">转考题</el-button>
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
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>打分记录</span>
          <el-button type="primary" size="small" :icon="Download" @click="handleExportRecords(currentTableId)">导出 Excel</el-button>
        </div>
      </template>
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

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入评分表" width="560px">
      <div class="import-tips">
        <p>支持 Excel (.xlsx) 格式导入</p>
        <p class="tip-note">Excel 表头：名称 | 类型 | 满分 | 评分项 1 | 分值 1 | 评分项 2 | 分值 2 | ...</p>
        <p class="tip-note">类型：加分制 或 减分制</p>
      </div>
      <div class="import-actions">
        <el-upload accept=".xlsx" :auto-upload="false" :show-file-list="false" :on-change="handleImportFile">
          <el-button type="primary" :icon="Upload">选择 Excel 文件</el-button>
        </el-upload>
        <el-button link type="primary" @click="downloadTemplate">下载 Excel 模板</el-button>
      </div>
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="`导入完成：成功 ${importResult.success} 个，失败 ${importResult.failed} 个`"
          :type="importResult.failed === 0 ? 'success' : 'warning'"
          show-icon :closable="false"
        />
        <ul v-if="importResult.errors.length" class="error-list">
          <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Delete, Download, Upload } from '@element-plus/icons-vue'
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
const currentTableId = ref('')

// 批量导入
const importDialogVisible = ref(false)
const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

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
  currentTableId.value = row.id
  recordsVisible.value = true
  recordsLoading.value = true
  try {
    records.value = (await scoreTablesApi.getRecords(row.id)) as any[]
  } finally {
    recordsLoading.value = false
  }
}

async function handleExportRecords(tableId: string) {
  try {
    const res = await scoreTablesApi.exportRecords(tableId) as any
    const url = window.URL.createObjectURL(new Blob([res]))
    const a = document.createElement('a')
    a.href = url
    a.download = `评分记录-${new Date().getTime()}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e: any) {
    ElMessage.error(e.message || '导出失败')
  }
}

async function handleConvertToQuestions(row: any) {
  await ElMessageBox.confirm(`确定将评分表「${row.name}」转换为考题吗？\n将为每个评分项生成一道判断题。`, '确认转换', { type: 'warning' })
  converting.value = true
  try {
    const result = await scoreTablesApi.convertToQuestions(row.id) as any
    ElMessage.success(`转换完成：成功 ${result.success} 题，失败 ${result.failed} 题`)
    if (result.questions?.length) {
      // 跳转到题库页
      setTimeout(() => router.push('/questions'), 1500)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '转换失败')
  } finally {
    converting.value = false
  }
}

const converting = ref(false)

async function handleImportFile(file: any) {
  importResult.value = null
  const rawFile = file.raw as File
  const ext = rawFile.name.split('.').pop()?.toLowerCase()

  if (ext !== 'xlsx') {
    ElMessage.error('仅支持 .xlsx 格式')
    return
  }

  const formData = new FormData()
  formData.append('file', rawFile)

  try {
    const res = await scoreTablesApi.importExcel(formData) as any
    importResult.value = res
    if (res.success > 0) {
      load()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '导入失败')
  }
}

function downloadTemplate() {
  const header = '名称，类型，满分，评分项 1，分值 1，评分项 2，分值 2\n'
  const row1 = '技能操作评分表，加分制，100，操作规范，30，熟练程度，20，团队协作，10\n'
  const row2 = '课堂表现评分表，减分制，100，迟到，5，玩手机，10，睡觉，15\n'
  const blob = new Blob(['\uFEFF' + header + row1 + row2], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '评分表导入模板.csv'
  a.click()
  window.URL.revokeObjectURL(url)
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
