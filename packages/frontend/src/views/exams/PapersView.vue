<template>
  <div class="papers-page">
    <el-card>
      <template #header>
        <div class="header">
          <div class="left">
            <el-input v-model="keyword" placeholder="搜索试卷" clearable style="width:220px" @keyup.enter="load" />
            <el-button type="primary" :icon="Search" @click="load">搜索</el-button>
          </div>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建试卷</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list">
        <el-table-column label="试卷标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="题目数" width="90">
          <template #default="{ row }">{{ row._count?.paperQuestions ?? 0 }} 题</template>
        </el-table-column>
        <el-table-column label="总分" prop="totalScore" width="80" />
        <el-table-column label="时长" width="90">
          <template #default="{ row }">{{ row.duration }} 分钟</template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row.id)">编辑</el-button>
            <el-button link type="success" size="small" @click="$router.push(`/exams?paperId=${row.id}`)">发布考试</el-button>
            <el-button link type="danger" size="small" @click="handleRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page" v-model:page-size="pageSize"
        :total="total" :page-sizes="[10, 20]"
        layout="total, sizes, prev, pager, next"
        class="pagination" @change="load"
      />
    </el-card>

    <!-- 新建/编辑试卷弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑试卷' : '新建试卷'" width="900px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="试卷标题" prop="title">
              <el-input v-model="form.title" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="考试时长">
              <el-input-number v-model="form.duration" :min="1" style="width:100%" />
              <span style="margin-left:6px;color:#909399">分钟</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 题目选择区 -->
        <el-form-item label="选题">
          <div class="question-picker">
            <!-- 左：题库搜索 -->
            <div class="picker-left">
              <div class="picker-toolbar">
                <el-input v-model="pickerKeyword" placeholder="搜索题目" clearable size="small" style="width:180px" @input="searchQuestions" />
                <el-select v-model="pickerType" clearable placeholder="题型" size="small" style="width:90px" @change="searchQuestions">
                  <el-option label="单选" value="SINGLE" />
                  <el-option label="多选" value="MULTIPLE" />
                  <el-option label="判断" value="JUDGE" />
                  <el-option label="填空" value="FILL" />
                </el-select>
              </div>
              <div class="picker-list" v-loading="pickerLoading">
                <div
                  v-for="q in pickerList"
                  :key="q.id"
                  class="picker-item"
                  :class="{ selected: selectedQIds.has(q.id) }"
                  @click="toggleQuestion(q)"
                >
                  <el-tag size="small" :type="typeTagType(q.type)" style="flex-shrink:0">{{ typeLabel(q.type) }}</el-tag>
                  <span class="picker-content" v-html="q.content" />
                  <el-icon v-if="selectedQIds.has(q.id)" color="#67C23A"><Check /></el-icon>
                </div>
              </div>
            </div>
            <!-- 右：已选题目 -->
            <div class="picker-right">
              <div class="picker-right-header">
                已选 {{ form.questions.length }} 题 &nbsp;
                总分 <b>{{ calcTotal }}</b> 分
              </div>
              <div class="selected-list">
                <div v-for="(sq, idx) in form.questions" :key="sq.questionId" class="selected-item">
                  <span class="seq">{{ idx + 1 }}.</span>
                  <span class="selected-content" v-html="getQuestionContent(sq.questionId)" />
                  <el-input-number
                    v-model="sq.score" :min="0.5" :step="0.5" size="small"
                    style="width:80px;flex-shrink:0"
                  />
                  <span style="color:#909399;font-size:12px">分</span>
                  <el-button link :icon="Delete" type="danger" @click="removeSelected(idx)" />
                </div>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存试卷</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Delete, Check } from '@element-plus/icons-vue'
import { papersApi, type Paper } from '@/api/exams'
import { questionsApi, type Question } from '@/api/questions'

const router = useRouter()

const loading = ref(false)
const list = ref<Paper[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')

async function load() {
  loading.value = true
  try {
    const res = await papersApi.list({ keyword: keyword.value, page: page.value, pageSize: pageSize.value }) as any
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function handleRemove(row: Paper) {
  await ElMessageBox.confirm(`确定删除试卷「${row.title}」吗？`, '提示', { type: 'warning' })
  await papersApi.remove(row.id)
  ElMessage.success('删除成功')
  load()
}

const formatDate = (s: string) => s ? new Date(s).toLocaleString('zh-CN') : ''

// ─── 试卷表单 ──────────────────────────────────────────
const dialogVisible = ref(false)
const editId = ref<string | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  title: '',
  duration: 60,
  questions: [] as { questionId: string; score: number }[],
})
const rules: FormRules = {
  title: [{ required: true, message: '请输入试卷标题', trigger: 'blur' }],
}

const calcTotal = computed(() => form.questions.reduce((s, q) => s + (q.score ?? 0), 0))
const selectedQIds = computed(() => new Set(form.questions.map(q => q.questionId)))

function getQuestionContent(id: string) {
  return pickerAll.value.find(q => q.id === id)?.content ?? id
}

// 题库搜索
const pickerLoading = ref(false)
const pickerList = ref<Question[]>([])
const pickerAll = ref<Question[]>([])
const pickerKeyword = ref('')
const pickerType = ref('')

async function searchQuestions() {
  pickerLoading.value = true
  try {
    const res = await questionsApi.list({
      keyword: pickerKeyword.value,
      type: pickerType.value as any || undefined,
      pageSize: 50,
    }) as any
    pickerList.value = res.list
    // 合并到全量缓存（用于显示已选题目内容）
    res.list.forEach((q: Question) => {
      if (!pickerAll.value.find(p => p.id === q.id)) pickerAll.value.push(q)
    })
  } finally {
    pickerLoading.value = false
  }
}

function toggleQuestion(q: Question) {
  const idx = form.questions.findIndex(s => s.questionId === q.id)
  if (idx >= 0) {
    form.questions.splice(idx, 1)
  } else {
    form.questions.push({ questionId: q.id, score: q.score ?? 1 })
  }
}

function removeSelected(idx: number) {
  form.questions.splice(idx, 1)
}

const typeTagType = (t: string) => ({ SINGLE: '', MULTIPLE: 'warning', JUDGE: 'success', FILL: 'info' }[t] as any ?? '')
const typeLabel = (t: string) => ({ SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', FILL: '填空' }[t] ?? t)

async function openCreate() {
  editId.value = null
  form.title = ''
  form.duration = 60
  form.questions = []
  dialogVisible.value = true
  await searchQuestions()
}

async function openEdit(id: string) {
  editId.value = id
  const paper = await papersApi.get(id) as any
  form.title = paper.title
  form.duration = paper.duration
  form.questions = paper.paperQuestions.map((pq: any) => ({
    questionId: pq.questionId,
    score: pq.score ?? pq.question?.score ?? 1,
  }))
  // 缓存题目内容
  paper.paperQuestions.forEach((pq: any) => {
    if (pq.question && !pickerAll.value.find(p => p.id === pq.questionId)) {
      pickerAll.value.push(pq.question)
    }
  })
  dialogVisible.value = true
  await searchQuestions()
}

async function handleSubmit() {
  await formRef.value?.validate()
  if (!form.questions.length) { ElMessage.warning('请至少选择一道题目'); return }
  submitting.value = true
  try {
    if (editId.value) {
      await papersApi.update(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await papersApi.create(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    load()
  } finally {
    submitting.value = false
  }
}

function resetForm() { formRef.value?.resetFields() }

onMounted(load)
</script>

<style scoped>
.papers-page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.left { display: flex; gap: 8px; }
.pagination { margin-top: 12px; justify-content: flex-end; }
.question-picker {
  display: flex;
  gap: 12px;
  width: 100%;
  height: 400px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}
.picker-left {
  width: 50%;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}
.picker-toolbar {
  padding: 8px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.picker-list { flex: 1; overflow-y: auto; padding: 4px; }
.picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.picker-item:hover { background: #f5f7fa; }
.picker-item.selected { background: #ecf5ff; }
.picker-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-right { flex: 1; display: flex; flex-direction: column; }
.picker-right-header {
  padding: 8px 12px;
  font-size: 13px;
  color: #606266;
  border-bottom: 1px solid #f0f0f0;
}
.selected-list { flex: 1; overflow-y: auto; padding: 4px; }
.selected-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
}
.seq { color: #909399; flex-shrink: 0; }
.selected-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
