<template>
  <div class="questions-page">
    <!-- 左侧分类树 -->
    <el-card class="category-panel">
      <template #header>
        <div class="panel-header">
          <span>题目分类</span>
          <el-button link type="primary" :icon="Plus" @click="openCreateCategory(null)" />
        </div>
      </template>
      <el-tree
        ref="treeRef"
        v-loading="catLoading"
        :data="categoryTree"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        highlight-current
        default-expand-all
        @node-click="handleCategoryClick"
      >
        <template #default="{ data }">
          <div class="cat-node">
            <span>{{ data.name }}</span>
            <span class="cat-actions">
              <el-button link :icon="Plus" size="small" @click.stop="openCreateCategory(data.id)" />
              <el-button link :icon="Edit" size="small" @click.stop="openEditCategory(data)" />
              <el-button link :icon="Delete" size="small" @click.stop="handleRemoveCategory(data)" />
            </span>
          </div>
        </template>
      </el-tree>
    </el-card>

    <!-- 右侧题目列表 -->
    <el-card class="question-panel">
      <template #header>
        <div class="panel-header">
          <div class="left">
            <el-input
              v-model="query.keyword"
              placeholder="搜索题目内容"
              clearable
              style="width:200px"
              @keyup.enter="handleSearch"
            />
            <el-select v-model="query.type" placeholder="题型" clearable style="width:110px">
              <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
            <el-select v-model="query.difficulty" placeholder="难度" clearable style="width:100px">
              <el-option v-for="d in diffOptions" :key="d.value" :label="d.label" :value="d.value" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
          <div class="right">
            <el-button type="primary" :icon="Plus" @click="openCreate">新增题目</el-button>
            <el-button :icon="Upload" @click="importDialogVisible = true">批量导入</el-button>
            <el-button :icon="Download" @click="handleExport">导出 Excel</el-button>
            <el-button
              type="danger"
              :disabled="selectedIds.length === 0"
              @click="handleBatchRemove"
            >
              批量删除 ({{ selectedIds.length }})
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="questionList"
        @selection-change="(rows: any[]) => (selectedIds = rows.map(r => r.id))"
        row-key="id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="题目内容" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-html="row.content" class="question-content" />
          </template>
        </el-table-column>
        <el-table-column label="题型" width="90">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="难度" width="80">
          <template #default="{ row }">
            <el-tag :type="diffTagType(row.difficulty)" size="small">{{ diffLabel(row.difficulty) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分值" prop="score" width="70" />
        <el-table-column label="分类" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.category?.name ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleRemove(row)">删除</el-button>
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
        @change="loadQuestions"
      />
    </el-card>

    <!-- 分类编辑弹窗 -->
    <el-dialog v-model="catDialogVisible" :title="catEditId ? '编辑分类' : '新增分类'" width="380px">
      <el-form ref="catFormRef" :model="catForm" :rules="catRules" label-width="70px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="catForm.name" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCatSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 题目新增/编辑弹窗 -->
    <el-dialog
      v-model="questionDialogVisible"
      :title="editId ? '编辑题目' : '新增题目'"
      width="720px"
      @close="resetQuestionForm"
    >
      <el-form ref="qFormRef" :model="qForm" :rules="qRules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="题型" prop="type">
              <el-select v-model="qForm.type" style="width:100%" :disabled="!!editId">
                <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="难度">
              <el-select v-model="qForm.difficulty" style="width:100%">
                <el-option v-for="d in diffOptions" :key="d.value" :label="d.label" :value="d.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分值">
              <el-input-number v-model="qForm.score" :min="0.5" :step="0.5" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="分类">
          <el-select v-model="qForm.categoryId" clearable style="width:100%">
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="题目内容" prop="content">
          <el-input v-model="qForm.content" type="textarea" :rows="3" placeholder="支持 HTML 内容" />
        </el-form-item>

        <!-- 选项区域（单选/多选/判断） -->
        <template v-if="qForm.type !== 'FILL'">
          <el-form-item label="选项">
            <div class="options-editor">
              <div class="options-hint">
                <el-icon><Select /></el-icon>
                <span v-if="qForm.type === 'MULTIPLE'">勾选左侧复选框标记<b>正确答案</b>（可多选）</span>
                <span v-else>点击左侧单选按钮标记<b>正确答案</b></span>
              </div>
              <div
                v-for="(opt, idx) in qForm.options"
                :key="idx"
                class="option-row"
                :class="{ 'is-correct': opt.isCorrect }"
              >
                <el-checkbox
                  v-if="qForm.type === 'MULTIPLE'"
                  v-model="opt.isCorrect"
                  class="option-correct"
                />
                <el-radio
                  v-else
                  :model-value="singleCorrectIdx"
                  :value="idx"
                  @change="setSingleCorrect(idx)"
                  class="option-correct"
                />
                <el-tag class="option-label" size="small" :type="opt.isCorrect ? 'success' : 'info'">{{ opt.label }}</el-tag>
                <el-input v-model="opt.content" placeholder="选项内容" class="option-input" />
                <el-button
                  v-if="qForm.type !== 'JUDGE'"
                  link
                  :icon="Delete"
                  type="danger"
                  @click="removeOption(idx)"
                />
              </div>
              <el-button
                v-if="qForm.type !== 'JUDGE'"
                link
                :icon="Plus"
                type="primary"
                @click="addOption"
              >
                添加选项
              </el-button>
            </div>
          </el-form-item>
        </template>

        <!-- 填空题答案 -->
        <template v-if="qForm.type === 'FILL'">
          <el-form-item label="标准答案" required>
            <el-input v-model="fillAnswer" placeholder="输入标准答案（用于自动阅卷对比）" />
          </el-form-item>
        </template>

        <el-form-item label="解析">
          <el-input v-model="qForm.explanation" type="textarea" :rows="2" placeholder="可选，题目解析说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="questionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleQuestionSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入题目" width="560px">
      <div class="import-tips">
        <p>支持 Excel (.xlsx) 或 JSON (.json) 格式导入</p>
        <p class="tip-note">Excel 表头：题型 | 题目内容 | 难度 | 分值 | 分类 | 答案 | 解析 | 选项 A | 选项 B | 选项 C | 选项 D</p>
      </div>
      <div class="import-actions">
        <el-upload accept=".json,.xlsx" :auto-upload="false" :show-file-list="false" :on-change="handleImportFile">
          <el-button type="primary" :icon="Upload">选择文件</el-button>
        </el-upload>
        <el-button link type="primary" @click="downloadTemplate">下载 Excel 模板</el-button>
      </div>
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
          :type="importResult.failed === 0 ? 'success' : 'warning'"
          show-icon :closable="false"
        />
        <ul v-if="importResult.errors.length" class="error-list">
          <li v-for="(e, i) in importResult.errors" :key="i">{{ e }}</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit, Delete, Search, Upload, Select } from '@element-plus/icons-vue'
import { questionsApi, type Question, type QuestionCategory } from '@/api/questions'

// ─── 分类 ─────────────────────────────────────────────
const catLoading = ref(false)
const categoryTree = ref<QuestionCategory[]>([])
const categoryList = ref<{ id: string; name: string; parentId: string | null }[]>([])
const selectedCategoryId = ref<string>('')

async function loadCategories() {
  catLoading.value = true
  try {
    const [tree, list] = await Promise.all([
      questionsApi.getCategoryTree() as any,
      questionsApi.getCategoryList() as any,
    ])
    categoryTree.value = tree
    categoryList.value = list
  } finally {
    catLoading.value = false
  }
}

function handleCategoryClick(data: QuestionCategory) {
  selectedCategoryId.value = data.id
  query.categoryId = data.id
  query.page = 1
  loadQuestions()
}

// 分类 CRUD
const catDialogVisible = ref(false)
const catEditId = ref<string | null>(null)
const catParentId = ref<string | null>(null)
const submitting = ref(false)
const catFormRef = ref<FormInstance>()
const catForm = reactive({ name: '', sortOrder: 0 })
const catRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

function openCreateCategory(parentId: string | null) {
  catEditId.value = null
  catParentId.value = parentId
  catForm.name = ''
  catForm.sortOrder = 0
  catDialogVisible.value = true
}

function openEditCategory(data: any) {
  catEditId.value = data.id
  catForm.name = data.name
  catForm.sortOrder = data.sortOrder
  catDialogVisible.value = true
}

async function handleCatSubmit() {
  await catFormRef.value?.validate()
  submitting.value = true
  try {
    if (catEditId.value) {
      await questionsApi.updateCategory(catEditId.value, catForm)
      ElMessage.success('更新成功')
    } else {
      await questionsApi.createCategory({ ...catForm, parentId: catParentId.value ?? undefined })
      ElMessage.success('创建成功')
    }
    catDialogVisible.value = false
    await loadCategories()
  } finally {
    submitting.value = false
  }
}

async function handleRemoveCategory(data: any) {
  await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '提示', { type: 'warning' })
  await questionsApi.removeCategory(data.id)
  ElMessage.success('删除成功')
  await loadCategories()
}

// ─── 题目 ─────────────────────────────────────────────
const loading = ref(false)
const questionList = ref<Question[]>([])
const total = ref(0)
const selectedIds = ref<string[]>([])
const query = reactive({
  keyword: '',
  categoryId: '',
  type: '' as any,
  difficulty: '' as any,
  page: 1,
  pageSize: 20,
})

const typeOptions = [
  { label: '单选题', value: 'SINGLE' },
  { label: '多选题', value: 'MULTIPLE' },
  { label: '判断题', value: 'JUDGE' },
  { label: '填空题', value: 'FILL' },
]
const diffOptions = [
  { label: '易', value: 'EASY' },
  { label: '中', value: 'MEDIUM' },
  { label: '难', value: 'HARD' },
]
const typeMap: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', FILL: '填空' }
const diffMap: Record<string, string> = { EASY: '易', MEDIUM: '中', HARD: '难' }
const typeTagMap: Record<string, string> = { SINGLE: '', MULTIPLE: 'warning', JUDGE: 'success', FILL: 'info' }
const diffTagMap: Record<string, string> = { EASY: 'success', MEDIUM: '', HARD: 'danger' }
const typeLabel = (t: string) => typeMap[t] ?? t
const diffLabel = (d: string) => diffMap[d] ?? d
const typeTagType = (t: string) => typeTagMap[t] as any ?? ''
const diffTagType = (d: string) => diffTagMap[d] as any ?? ''

async function loadQuestions() {
  loading.value = true
  try {
    const res = await questionsApi.list(query) as any
    questionList.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadQuestions()
}

function handleReset() {
  query.keyword = ''
  query.type = '' as any
  query.difficulty = '' as any
  query.categoryId = selectedCategoryId.value
  query.page = 1
  loadQuestions()
}

async function handleRemove(row: Question) {
  await ElMessageBox.confirm('确定删除该题目吗？', '提示', { type: 'warning' })
  await questionsApi.remove(row.id)
  ElMessage.success('删除成功')
  await loadQuestions()
}

async function handleBatchRemove() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 道题目吗？`, '提示', { type: 'warning' })
  await questionsApi.batchRemove(selectedIds.value)
  ElMessage.success('删除成功')
  await loadQuestions()
}

// ─── 题目表单 ──────────────────────────────────────────
const questionDialogVisible = ref(false)
const editId = ref<string | null>(null)
const qFormRef = ref<FormInstance>()
const fillAnswer = ref('')

const qForm = reactive<{
  type: string; difficulty: string; score: number
  categoryId: string; content: string; explanation: string
  options: { label: string; content: string; isCorrect: boolean }[]
}>({
  type: 'SINGLE', difficulty: 'MEDIUM', score: 1,
  categoryId: '', content: '', explanation: '',
  options: [
    { label: 'A', content: '', isCorrect: false },
    { label: 'B', content: '', isCorrect: false },
    { label: 'C', content: '', isCorrect: false },
    { label: 'D', content: '', isCorrect: false },
  ],
})

const qRules: FormRules = {
  type: [{ required: true }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
}

const singleCorrectIdx = computed(() =>
  qForm.options.findIndex((o) => o.isCorrect),
)

function setSingleCorrect(idx: number) {
  qForm.options.forEach((o, i) => { o.isCorrect = i === idx })
}

const optionLabels = 'ABCDEFGHIJ'.split('')
function addOption() {
  const label = optionLabels[qForm.options.length] ?? String(qForm.options.length + 1)
  qForm.options.push({ label, content: '', isCorrect: false })
}

function removeOption(idx: number) {
  qForm.options.splice(idx, 1)
  qForm.options.forEach((o, i) => { o.label = optionLabels[i] ?? String(i + 1) })
}

watch(() => qForm.type, (t) => {
  if (t === 'JUDGE') {
    qForm.options = [
      { label: 'A', content: '正确', isCorrect: false },
      { label: 'B', content: '错误', isCorrect: false },
    ]
  } else if (t === 'FILL') {
    qForm.options = []
  } else if (qForm.options.length < 2) {
    qForm.options = [
      { label: 'A', content: '', isCorrect: false },
      { label: 'B', content: '', isCorrect: false },
      { label: 'C', content: '', isCorrect: false },
      { label: 'D', content: '', isCorrect: false },
    ]
  }
})

function openCreate() {
  editId.value = null
  Object.assign(qForm, {
    type: 'SINGLE', difficulty: 'MEDIUM', score: 1,
    categoryId: selectedCategoryId.value, content: '', explanation: '',
    options: [
      { label: 'A', content: '', isCorrect: false },
      { label: 'B', content: '', isCorrect: false },
      { label: 'C', content: '', isCorrect: false },
      { label: 'D', content: '', isCorrect: false },
    ],
  })
  fillAnswer.value = ''
  questionDialogVisible.value = true
}

function openEdit(row: Question) {
  editId.value = row.id
  Object.assign(qForm, {
    type: row.type,
    difficulty: row.difficulty,
    score: row.score,
    categoryId: row.categoryId ?? '',
    content: row.content,
    explanation: row.explanation ?? '',
    options: row.type === 'FILL' ? [] : row.options.map(o => ({ ...o })),
  })
  if (row.type === 'FILL') {
    fillAnswer.value = row.options[0]?.content ?? ''
  }
  questionDialogVisible.value = true
}

function resetQuestionForm() {
  qFormRef.value?.resetFields()
}

async function handleQuestionSubmit() {
  await qFormRef.value?.validate()
  submitting.value = true
  try {
    const payload: any = { ...qForm }
    if (qForm.type === 'FILL') {
      payload.options = fillAnswer.value
        ? [{ label: '1', content: fillAnswer.value, isCorrect: true, sortOrder: 0 }]
        : []
    }
    if (editId.value) {
      await questionsApi.update(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await questionsApi.create(payload)
      ElMessage.success('创建成功')
    }
    questionDialogVisible.value = false
    await loadQuestions()
  } finally {
    submitting.value = false
  }
}

// ─── 批量导入 ──────────────────────────────────────────
const importDialogVisible = ref(false)
const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

async function handleImportFile(file: any) {
  importResult.value = null
  const rawFile = file.raw as File
  const ext = rawFile.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx') {
    const formData = new FormData()
    formData.append('file', rawFile)
    if (selectedCategoryId.value) {
      formData.append('categoryId', selectedCategoryId.value)
    }
    try {
      const res = await questionsApi.importExcel(formData) as any
      importResult.value = res
      await loadQuestions()
    } catch (e: any) {
      ElMessage.error(e.message || 'Excel 导入失败')
    }
  } else if (ext === 'json') {
    const text = await rawFile.text()
    let rows: any[]
    try {
      rows = JSON.parse(text)
      if (!Array.isArray(rows)) throw new Error()
    } catch {
      ElMessage.error('JSON 格式错误')
      return
    }
    importResult.value = null
    const res = await questionsApi.batchImport(rows) as any
    importResult.value = res
    await loadQuestions()
  } else {
    ElMessage.error('仅支持 .xlsx 或 .json 格式')
  }
}

async function handleExport() {
  const params: any = { page: 1, pageSize: 10000 }
  if (query.keyword) params.keyword = query.keyword
  if (query.type) params.type = query.type
  if (query.difficulty) params.difficulty = query.difficulty
  if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value

  const res = await questionsApi.exportExcel(params) as any
  const url = window.URL.createObjectURL(new Blob([res]))
  const a = document.createElement('a')
  a.href = url
  a.download = `题目导出-${new Date().getTime()}.xlsx`
  a.click()
  window.URL.revokeObjectURL(url)
}

function downloadTemplate() {
  const header = '题型，题目内容，难度，分值，分类，答案，解析，选项 A，选项 B，选项 C，选项 D\n'
  const row1 = '单选题，以下哪项属于八纲辨证？，中，2，中医诊断学，A，八纲包括阴阳表里寒热虚实，阴阳表里，气血津液，五行生克，脏腑经络\n'
  const row2 = '判断题，舌红苔黄为热证表现，易，1，中医诊断学，正确，,,,,\n'
  const blob = new Blob(['\uFEFF' + header + row1 + row2], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '题目导入模板.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

onMounted(() => {
  loadCategories()
  loadQuestions()
})
</script>

<style scoped>
.questions-page {
  display: flex;
  gap: 16px;
  padding: 16px;
  height: calc(100vh - 80px);
}
.category-panel {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
}
.question-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cat-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.cat-actions {
  display: none;
  gap: 2px;
}
.cat-node:hover .cat-actions {
  display: flex;
}
.left, .right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
.question-content {
  font-size: 13px;
}
.options-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.options-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}
.options-hint b {
  color: #67c23a;
}
.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}
.option-row.is-correct {
  background: #f0f9eb;
}
.option-correct {
  flex-shrink: 0;
}
.option-label {
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}
.option-input {
  flex: 1;
}
.import-example {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 240px;
}
.import-result { margin-top: 12px; }
.error-list {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 12px;
  color: #e6a23c;
  max-height: 100px;
  overflow-y: auto;
}
</style>
