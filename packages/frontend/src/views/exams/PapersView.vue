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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="warning" size="small" @click="openPreview(row)">预览试卷</el-button>
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

    <!-- 试卷预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="`${previewPaper?.title || '试卷预览'} - 学生模式`"
      width="1000px"
      @close="resetPreview"
    >
      <!-- 试卷信息 -->
      <div class="preview-header">
        <div class="preview-info">
          <span class="info-label">考试时长：</span>
          <el-tag type="info">{{ previewPaper?.duration }} 分钟</el-tag>
          <span style="margin: 0 16px" />
          <span class="info-label">总分：</span>
          <el-tag type="warning">{{ previewTotalScore }} 分</el-tag>
          <span style="margin: 0 16px" />
          <span class="info-label">题目数量：</span>
          <el-tag type="success">{{ previewPaperQuestions.length }} 题</el-tag>
        </div>
      </div>

      <!-- 答题区域 -->
      <div class="preview-body">
        <div
          v-for="(pq, index) in previewPaperQuestions"
          :key="pq.id"
          :class="['preview-question', `type-${pq.question.type}`]"
        >
          <!-- 题目头部 -->
          <div class="question-header">
            <span class="question-index">{{ index + 1 }}.</span>
            <el-tag size="small" :type="getTypeTag(pq.question.type)">
              {{ getTypeLabel(pq.question.type) }}
            </el-tag>
            <span class="question-score">{{ pq.score }} 分</span>
          </div>

          <!-- 题目内容 -->
          <div class="question-content" v-html="pq.question.content" />

          <!-- 媒体附件 -->
          <div v-if="pq.question.mediaItems?.length" class="question-media">
            <!-- 多个附件时显示切换标签 -->
            <div v-if="pq.question.mediaItems.length > 1" class="media-tabs">
              <el-tag
                v-for="(media, idx) in pq.question.mediaItems"
                :key="media.id"
                :type="(currentMediaIndex[pq.id] ?? 0) === idx ? 'primary' : 'info'"
                effect="plain"
                size="small"
                style="cursor: pointer; margin-right: 8px"
                @click="currentMediaIndex[pq.id] = idx"
              >
                {{ getMediaIcon(media.type) }} 附件 {{ idx + 1 }}
              </el-tag>
            </div>

            <!-- 媒体内容显示 -->
            <div class="media-content">
              <!-- 图片 -->
              <div v-if="getCurrentMedia(pq.id)?.type === 'image'" class="media-image">
                <el-image
                  :src="getCurrentMedia(pq.id)?.url"
                  fit="contain"
                  style="width: 100%"
                  @load="(e) => onMediaLoad(pq.id, getCurrentMedia(pq.id), e)"
                  @error="onMediaError(pq.id, getCurrentMedia(pq.id))"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon :size="48" color="#f56c6c"><Picture /></el-icon>
                      <div>图片加载失败</div>
                      <div class="error-url">{{ getCurrentMedia(pq.id)?.url }}</div>
                    </div>
                  </template>
                </el-image>
              </div>
              <!-- 视频 -->
              <div v-else-if="getCurrentMedia(pq.id)?.type === 'video'" class="media-video">
                <video :src="getCurrentMedia(pq.id)?.url" controls style="width: 100%"
                  @loadstart="onMediaLoadStart(pq.id)"
                  @loadeddata="(e) => onMediaLoaded(pq.id, e)"
                  @error="onMediaError(pq.id, getCurrentMedia(pq.id))" />
              </div>
              <!-- 音频 -->
              <div v-else-if="getCurrentMedia(pq.id)?.type === 'audio'" class="media-audio">
                <audio :src="getCurrentMedia(pq.id)?.url" controls style="width: 100%"
                  @loadstart="onMediaLoadStart(pq.id)"
                  @loadeddata="onMediaLoaded(pq.id)"
                  @error="onMediaError(pq.id, getCurrentMedia(pq.id))" />
              </div>
              <!-- 其他文件 -->
              <div v-else class="media-file">
                <el-icon :size="48" color="#909399"><Document /></el-icon>
                <div class="media-file-name">{{ getCurrentMedia(pq.id)?.caption || getCurrentMedia(pq.id)?.url.split('/').pop() }}</div>
                <el-button type="primary" size="small" @click="downloadMedia(getCurrentMedia(pq.id)?.url)">下载</el-button>
              </div>
            </div>

            <!-- 单个附件时显示文件名 -->
            <div v-if="pq.question.mediaItems.length === 1 && getCurrentMedia(pq.id)?.caption" class="media-caption">
              {{ getCurrentMedia(pq.id)?.caption }}
            </div>
          </div>

          <!-- 选项区域 -->
          <div class="question-options" v-if="pq.question.options?.length">
            <div
              v-for="opt in pq.question.options"
              :key="opt.id"
              :class="['option-item', {
                'is-selected': isOptionSelected(pq.id, opt.id),
                'is-correct': showAnswer && checkAnswer(pq.id, opt.id),
                'is-wrong': showAnswer && isSelectedButWrong(pq.id, opt.id)
              }]"
              @click="selectOption(pq.id, opt.id)"
            >
              <span class="option-label">{{ opt.label }}.</span>
              <span class="option-content" v-html="opt.content" />
              <!-- 答案验证标识 -->
              <el-icon v-if="showAnswer && checkAnswer(pq.id, opt.id)" class="correct-icon"><Circle-Check-Filled /></el-icon>
              <el-icon v-if="showAnswer && isSelectedButWrong(pq.id, opt.id)" class="wrong-icon"><Circle-Close-Filled /></el-icon>
            </div>
          </div>

          <!-- 填空题答案输入 -->
          <div v-if="pq.question.type === 'FILL'" class="question-fill">
            <el-input
              v-model="userAnswers[pq.id]"
              placeholder="请输入答案"
              clearable
              style="width: 100%"
            />
          </div>

          <!-- 单题验证结果 -->
          <div v-if="showAnswer" :class="['question-result', getResultClass(pq.id)]">
            <el-icon><component :is="getResultIcon(pq.id)" /></el-icon>
            <span>{{ getResultText(pq.id, pq.question.type) }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <template #footer>
        <div class="preview-footer">
          <el-button @click="previewVisible = false">关闭</el-button>
          <el-button type="primary" @click="toggleAnswer">
            {{ showAnswer ? '隐藏答案' : '显示答案/交卷' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Delete, Check, CircleCheckFilled, CircleCloseFilled, Document, VideoPlay, VideoCamera, Headset, Picture } from '@element-plus/icons-vue'
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
  try {
    await ElMessageBox.confirm(`确定删除试卷「${row.title}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    await papersApi.remove(row.id)
    ElMessage.success('删除成功')
    load()
  } catch (e: any) {
    // 如果是"被引用"错误，显示考试列表
    if (e.response?.data?.exams) {
      const examList = e.response.data.exams

      // 构建提示内容
      let content = `<div style="line-height:1.8;max-height:400px;overflow-y:auto">`
      content += `<p style="color:#f56c6c;margin-bottom:12px">该试卷被以下 ${examList.length} 个考试引用，无法删除：</p>`
      content += `<ul style="padding-left:20px;margin:0">`
      for (const exam of examList) {
        const statusColor = { DRAFT: '#909399', PUBLISHED: '#409EFF', ENDED: '#67C23A', CANCELLED: '#F56C6C' }[exam.status] || '#909399'
        content += `<li style="margin:10px 0;padding:8px;background:#f5f7fa;border-radius:4px">`
        content += `<div style="margin-bottom:6px"><b>${exam.title}</b></div>`
        content += `<div style="font-size:13px;color:#606266">`
        content += `<span style="display:inline-block;padding:2px 8px;background:${statusColor}20;color:${statusColor};border-radius:3px;margin-right:8px">${exam.status}</span>`
        content += `<span>考生：${exam.participantCount}人</span>`
        if (exam.submittedCount > 0) {
          content += `<span style="margin-left:8px;color:#f56c6c">已交卷：${exam.submittedCount}人</span>`
        }
        content += `</div>`
        content += `</li>`
      }
      content += `</ul>`
      content += `<p style="margin-top:16px;padding:10px;background:#ecf5ff;border-radius:4px;color:#409EFF;font-size:13px">`
      content += `💡 提示：请先删除或修改上述考试后，再删除该试卷`
      content += `</p>`
      content += `</div>`

      ElMessageBox.alert(content, '无法删除试卷', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了',
        showClose: true,
      })
    }
  }
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

// ─── 试卷预览 ──────────────────────────────────────────
const previewVisible = ref(false)
const previewPaper = ref<Paper | null>(null)
const previewPaperQuestions = ref<any[]>([])
const showAnswer = ref(false)
const userAnswers = ref<Record<string, any>>({})
const currentMediaIndex = ref<Record<string, number>>({}) // 每道题当前显示的媒体索引

const previewTotalScore = computed(() => previewPaperQuestions.value.reduce((s, pq) => s + (pq.score ?? 0), 0))

// 获取当前选中的媒体
const currentMedia = computed(() => {
  // 需要一个上下文来获取当前题目，这里改为函数方式
  return null
})

function getCurrentMedia(pqId: string) {
  const pq = previewPaperQuestions.value.find(p => p.id === pqId)
  if (!pq?.question?.mediaItems?.length) return null
  const idx = currentMediaIndex.value[pqId] ?? 0
  const media = pq.question.mediaItems[idx]
  console.log('[getCurrentMedia] pqId:', pqId, 'idx:', idx, 'media:', media)
  return media
}

// 媒体加载事件处理
function onMediaLoad(pqId: string, media: any, event: Event) {
  const target = event.target as HTMLImageElement
  console.log('[媒体加载 - 图片] 加载成功:', pqId)
  console.log('[媒体加载 - 图片] 原始尺寸:', media?.url)
  console.log('[媒体加载 - 图片] 渲染尺寸:', {
    width: target?.naturalWidth,
    height: target?.naturalHeight,
    clientWidth: target?.clientWidth,
    clientHeight: target?.clientHeight,
    offsetWidth: target?.offsetWidth,
    offsetHeight: target?.offsetHeight
  })

  // 查找父容器尺寸
  const parent = target?.closest('.question-media')
  if (parent) {
    console.log('[媒体加载 - 图片] 父容器尺寸:', {
      width: parent.clientWidth,
      height: parent.clientHeight
    })
  }
}

function onMediaLoadStart(pqId: string) {
  console.log('[媒体加载] 开始加载:', pqId)
}

function onMediaLoaded(pqId: string, event?: Event) {
  const target = event?.target as HTMLVideoElement | HTMLAudioElement
  console.log('[媒体加载] 加载完成:', pqId)
  if (target) {
    console.log('[媒体加载] 尺寸:', {
      width: target.videoWidth || 'N/A',
      height: target.videoHeight || 'N/A',
      clientWidth: target.clientWidth,
      clientHeight: target.clientHeight
    })
  }
}

function onMediaError(pqId: string, media: any) {
  console.error('[媒体加载] 加载失败:', pqId, media?.url)
}

// 打开预览
async function openPreview(row: Paper) {
  previewPaper.value = row
  showAnswer.value = false
  userAnswers.value = {}
  currentMediaIndex.value = {} // 重置媒体索引
  previewVisible.value = true

  try {
    // 获取试卷详情（包含题目）
    console.log('[试卷预览] 开始获取试卷详情，ID:', row.id)
    const detail = await papersApi.get(row.id) as any
    console.log('[试卷预览] 获取成功，完整响应:', detail)
    console.log('[试卷预览] 题目数量:', detail.paperQuestions?.length)

    // 检查每道题的媒体资源
    detail.paperQuestions?.forEach((pq: any, idx: number) => {
      console.log(`[试卷预览] 题目 ${idx + 1}:`, {
        id: pq.id,
        content: pq.question?.content?.substring(0, 50) + '...',
        mediaItems: pq.question?.mediaItems,
        mediaCount: pq.question?.mediaItems?.length
      })
    })

    previewPaperQuestions.value = detail.paperQuestions || []
  } catch (e: any) {
    console.error('[试卷预览] 获取失败:', e)
    ElMessage.error('获取试卷失败：' + e.message)
  }
}

// 重置预览
function resetPreview() {
  previewPaper.value = null
  previewPaperQuestions.value = []
  showAnswer.value = false
  userAnswers.value = {}
  currentMediaIndex.value = {}
}

// 获取媒体图标文字
function getMediaIcon(type: string) {
  if (type === 'image') return '🖼️'
  if (type === 'video') return '🎬'
  if (type === 'audio') return '🎧'
  return '📄'
}

// 下载媒体文件
function downloadMedia(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = url.split('/').pop() || 'file'
  a.click()
}

// 切换答案显示
function toggleAnswer() {
  showAnswer.value = !showAnswer.value
}

// 题型标签
function getTypeTag(t: string) {
  return { SINGLE: '', MULTIPLE: 'warning', JUDGE: 'success', FILL: 'info' }[t] as any || ''
}

// 题型文字
function getTypeLabel(t: string) {
  return { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', FILL: '填空' }[t] || t
}

// 是否已选
function isOptionSelected(paperQuestionId: string, optionId: string) {
  const ans = userAnswers.value[paperQuestionId]
  if (!ans) return false
  return Array.isArray(ans) ? ans.includes(optionId) : ans === optionId
}

// 选择选项
function selectOption(paperQuestionId: string, optionId: string) {
  const pq = previewPaperQuestions.value.find(p => p.id === paperQuestionId)
  if (!pq) return

  const isMultiple = pq.question.type === 'MULTIPLE'
  const current = userAnswers.value[paperQuestionId]

  if (isMultiple) {
    const arr = Array.isArray(current) ? current : []
    const idx = arr.indexOf(optionId)
    if (idx >= 0) {
      arr.splice(idx, 1)
    } else {
      arr.push(optionId)
    }
    userAnswers.value[paperQuestionId] = arr
  } else {
    userAnswers.value[paperQuestionId] = optionId
  }
}

// 检查答案是否正确
function checkAnswer(paperQuestionId: string, optionId: string) {
  const pq = previewPaperQuestions.value.find(p => p.id === paperQuestionId)
  if (!pq) return false
  const correctOptions = pq.question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.id) || []
  return correctOptions.includes(optionId)
}

// 检查是否选错了（用户选了但不是正确答案）
function isSelectedButWrong(paperQuestionId: string, optionId: string) {
  return isOptionSelected(paperQuestionId, optionId) && !checkAnswer(paperQuestionId, optionId)
}

// 获取单题结果样式
function getResultClass(paperQuestionId: string) {
  return userAnswers.value[paperQuestionId] ? 'result-correct' : 'result-wrong'
}

// 获取单题结果图标
function getResultIcon(paperQuestionId: string) {
  return userAnswers.value[paperQuestionId] ? CircleCheckFilled : CircleCloseFilled
}

// 获取单题结果文字
function getResultText(paperQuestionId: string, type: string) {
  const pq = previewPaperQuestions.value.find(p => p.id === paperQuestionId)
  if (!pq) return ''

  const userAns = userAnswers.value[paperQuestionId]
  if (!userAns) return '未作答'

  // 填空题
  if (type === 'FILL') {
    const correctAns = pq.question.options?.[0]?.content || ''
    if (typeof userAns === 'string' && userAns.trim() === correctAns) {
      return `正确！你的答案：${userAns}`
    }
    return `错误！正确答案：${correctAns}，你的答案：${userAns}`
  }

  // 客观题
  const correctOptions = pq.question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.label) || []
  const userLabels = (Array.isArray(userAns) ? userAns : [userAns]).map((id: string) => {
    const opt = pq.question.options?.find((o: any) => o.id === id)
    return opt?.label || ''
  })

  const isCorrect = JSON.stringify(correctOptions.sort()) === JSON.stringify(userLabels.sort())
  if (isCorrect) {
    return `正确！${type === 'MULTIPLE' ? '多选' : '单选'}答案：${correctOptions.join('')}`
  }
  return `错误！正确答案：${correctOptions.join('')}，你的答案：${userLabels.join('')}`
}

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

/* 试卷预览样式 */
.preview-header { margin-bottom: 16px; }
.preview-info {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
}
.info-label {
  color: #606266;
  font-weight: 500;
}
.preview-body {
  max-height: 600px;
  overflow-y: auto;
  padding: 8px;
}
.preview-question {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}
.preview-question:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.question-index {
  font-weight: bold;
  color: #303133;
  font-size: 16px;
}
.question-score {
  margin-left: auto;
  color: #67c23a;
  font-weight: 500;
}
.question-content {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  margin-bottom: 12px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}
.question-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.option-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}
.option-item.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.option-item.is-correct {
  border-color: #67c23a;
  background: #f0f9eb;
}
.option-item.is-wrong {
  border-color: #f56c6c;
  background: #fef0f0;
}
.option-label {
  font-weight: bold;
  color: #303133;
  min-width: 24px;
}
.option-content {
  flex: 1;
  font-size: 14px;
  color: #606266;
}
.correct-icon {
  color: #67c23a;
  font-size: 20px;
}
.wrong-icon {
  color: #f56c6c;
  font-size: 20px;
}
.question-fill {
  margin-top: 12px;
}
.question-result {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.result-correct {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}
.result-wrong {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}
.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 媒体附件样式 */
.question-media {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}
.media-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.media-tabs .el-tag {
  cursor: pointer;
  padding: 4px 10px;
}
.media-content {
  width: 100%;
}
.media-image {
  width: 100%;
}
.media-image .el-image {
  width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
}
.media-image .image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #f56c6c;
  font-size: 13px;
}
.image-error .error-url {
  margin-top: 8px;
  font-size: 11px;
  color: #909399;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.media-video {
  width: 100%;
}
.media-video video {
  width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
}
.media-audio {
  width: 100%;
  display: flex;
  justify-content: center;
}
.media-audio audio {
  width: 100%;
  max-width: 400px;
  border-radius: 4px;
}
.media-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  width: 100%;
  max-width: 400px;
}
.media-file-name {
  flex: 1;
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.media-caption {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
</style>
