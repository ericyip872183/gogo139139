<template>
  <div class="exam-room" v-if="examData">
    <!-- 离线提示条 -->
    <el-alert
      v-if="!isOnline"
      title="网络已断开"
      description="您的答案将保存在本地，网络恢复后自动同步。请放心继续答题。"
      type="warning"
      :closable="false"
      show-icon
      style="position:sticky;top:0;z-index:101"
    />
    <!-- 待同步提示 -->
    <el-alert
      v-else-if="Object.keys(pendingAnswers).length > 0"
      title="正在同步答案…"
      :description="`还有 ${Object.keys(pendingAnswers).length} 道题待同步`"
      type="info"
      :closable="false"
      show-icon
      style="position:sticky;top:0;z-index:101"
    />

    <!-- 顶部固定栏 -->
    <div class="exam-header">
      <div class="exam-title">{{ examData.title }}</div>
      <div class="exam-info">
        <span>共 {{ examData.questions.length }} 题</span>
        <span>总分 {{ examData.totalScore }} 分</span>
        <span class="switch-warn" v-if="switchCount > 0">
          切屏 {{ switchCount }}/{{ examData.maxSwitch }} 次
        </span>
      </div>
      <div class="exam-timer" :class="{ warning: timeLeft < 300 }">
        <el-icon><Timer /></el-icon>
        {{ formatTime(timeLeft) }}
      </div>
      <el-button type="primary" @click="confirmSubmit">交卷</el-button>
    </div>

    <div class="exam-body">
      <!-- 左侧题目导航 -->
      <div class="question-nav">
        <div class="nav-title">答题进度 ({{ answeredCount }}/{{ examData.questions.length }})</div>
        <div class="nav-grid">
          <div
            v-for="(q, idx) in examData.questions"
            :key="q.id"
            class="nav-item"
            :class="{
              current: currentIdx === idx,
              answered: answers[q.id] !== undefined && answers[q.id] !== ''
            }"
            @click="scrollTo(idx)"
          >
            {{ idx + 1 }}
          </div>
        </div>
      </div>

      <!-- 右侧题目列表 -->
      <div class="question-list" ref="listRef">
        <div
          v-for="(q, idx) in examData.questions"
          :key="q.id"
          :ref="el => questionRefs[idx] = el as HTMLElement"
          class="question-card"
        >
          <div class="q-header">
            <span class="q-num">{{ idx + 1 }}</span>
            <el-tag size="small" :type="typeTagType(q.type)">{{ typeLabel(q.type) }}</el-tag>
            <span class="q-score">{{ q.paperScore }} 分</span>
          </div>
          <div class="q-content" v-html="q.content" />

          <!-- 单选题 -->
          <el-radio-group
            v-if="q.type === 'SINGLE'"
            v-model="answers[q.id]"
            class="q-options"
            @change="onAnswerChange(q.id)"
          >
            <el-radio v-for="opt in q.options" :key="opt.id" :value="opt.label" class="q-option">
              <span class="opt-label">{{ opt.label }}.</span> {{ opt.content }}
            </el-radio>
          </el-radio-group>

          <!-- 多选题 -->
          <el-checkbox-group
            v-else-if="q.type === 'MULTIPLE'"
            v-model="multiAnswers[q.id]"
            class="q-options"
            @change="onMultiChange(q.id)"
          >
            <el-checkbox v-for="opt in q.options" :key="opt.id" :value="opt.label" class="q-option">
              <span class="opt-label">{{ opt.label }}.</span> {{ opt.content }}
            </el-checkbox>
          </el-checkbox-group>

          <!-- 判断题 -->
          <el-radio-group
            v-else-if="q.type === 'JUDGE'"
            v-model="answers[q.id]"
            class="q-options"
            @change="onAnswerChange(q.id)"
          >
            <el-radio value="A" class="q-option">✓ 正确</el-radio>
            <el-radio value="B" class="q-option">✗ 错误</el-radio>
          </el-radio-group>

          <!-- 填空题 -->
          <el-input
            v-else-if="q.type === 'FILL'"
            v-model="answers[q.id]"
            placeholder="请输入答案"
            class="fill-input"
            @blur="onAnswerChange(q.id)"
          />
        </div>
      </div>
    </div>

    <!-- 强制交卷对话框 -->
    <el-dialog v-model="forceSubmitVisible" title="系统提示" :close-on-click-modal="false" :show-close="false" width="380px">
      <p>{{ forceSubmitMsg }}</p>
      <template #footer>
        <el-button type="primary" @click="doSubmit">立即交卷</el-button>
      </template>
    </el-dialog>
  </div>

  <div v-else-if="loading" class="loading-wrap">
    <el-loading />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer } from '@element-plus/icons-vue'
import { examRoomApi } from '@/api/exam-room'

const route = useRoute()
const router = useRouter()
const examId = route.params.id as string

const loading = ref(true)
const examData = ref<any>(null)
const answers = reactive<Record<string, string>>({})
const multiAnswers = reactive<Record<string, string[]>>({})
const switchCount = ref(0)
const currentIdx = ref(0)
const questionRefs = reactive<HTMLElement[]>([])
const listRef = ref<HTMLElement>()
const forceSubmitVisible = ref(false)
const forceSubmitMsg = ref('')

// 计时器
const timeLeft = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let examEndTime: number | null = null

// 断网续答相关
const isOnline = ref(true)
const pendingAnswers = reactive<Record<string, string>>({})  // 待同步的答案
let syncTimer: ReturnType<typeof setInterval> | null = null

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// 超时自动交卷
function checkExamTimeout() {
  if (!examEndTime) return
  const now = Date.now()
  if (now >= examEndTime) {
    // 时间到，自动交卷
    ElMessage.warning('考试时间已到，系统自动交卷')
    doSubmit()
  }
}

const answeredCount = computed(() =>
  examData.value?.questions.filter((q: any) => {
    if (q.type === 'MULTIPLE') return (multiAnswers[q.id]?.length ?? 0) > 0
    return answers[q.id] !== undefined && answers[q.id] !== ''
  }).length ?? 0
)

// 答题变更 - 实时保存（断网时本地缓存）
async function onAnswerChange(questionId: string) {
  const answer = answers[questionId]
  // 先保存到本地
  saveAnswerToLocal(questionId, answer)

  if (isOnline.value) {
    // 在线时尝试同步
    try {
      await examRoomApi.saveAnswer(examId, { questionId, answer })
      // 同步成功后清除本地缓存
      delete pendingAnswers[questionId]
    } catch {
      // 网络故障，标记为待同步
      pendingAnswers[questionId] = answer
      isOnline.value = false
    }
  } else {
    // 离线时加入待同步队列
    pendingAnswers[questionId] = answer
  }
}

async function onMultiChange(questionId: string) {
  answers[questionId] = JSON.stringify(multiAnswers[questionId] ?? [])
  onAnswerChange(questionId)
}

// 本地缓存答案
function saveAnswerToLocal(questionId: string, answer: string) {
  const cacheKey = `exam_${examId}_answers`
  let cached: Record<string, string> = {}
  try {
    const raw = localStorage.getItem(cacheKey)
    if (raw) cached = JSON.parse(raw)
  } catch {}
  cached[questionId] = answer
  localStorage.setItem(cacheKey, JSON.stringify(cached))
}

// 从本地缓存恢复答案
function loadAnswersFromLocal() {
  const cacheKey = `exam_${examId}_answers`
  try {
    const raw = localStorage.getItem(cacheKey)
    if (raw) {
      return JSON.parse(raw) as Record<string, string>
    }
  } catch {}
  return {}
}

// 清除本地缓存
function clearLocalCache() {
  const cacheKey = `exam_${examId}_answers`
  localStorage.removeItem(cacheKey)
}

function scrollTo(idx: number) {
  currentIdx.value = idx
  questionRefs[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 防切屏
async function handleVisibilityChange() {
  if (document.hidden && examData.value) {
    const result = await examRoomApi.recordSwitch(examId) as any
    switchCount.value = result.switchCount
    if (result.forceSubmit) {
      forceSubmitMsg.value = `切屏次数已达上限（${examData.value.maxSwitch} 次），系统自动交卷。`
      forceSubmitVisible.value = true
    } else {
      ElMessage.warning(`检测到切屏！已切屏 ${result.switchCount}/${examData.value.maxSwitch} 次`)
    }
  }
}

async function confirmSubmit() {
  await ElMessageBox.confirm(
    `已答 ${answeredCount.value}/${examData.value.questions.length} 题，确定交卷吗？`,
    '确认交卷', { type: 'warning' }
  )
  doSubmit()
}

async function doSubmit() {
  if (timer) { clearInterval(timer); timer = null }
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null }
  forceSubmitVisible.value = false

  // 交卷前尝试同步所有待答案
  if (Object.keys(pendingAnswers).length > 0) {
    await syncPendingAnswers()
  }

  // 清除本地缓存
  clearLocalCache()

  try {
    await examRoomApi.submit(examId)
    ElMessage.success('交卷成功，正在跳转成绩页…')
    setTimeout(() => router.push('/scores'), 1500)
  } catch (e: any) {
    ElMessage.error('交卷失败，请重试')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await examRoomApi.enter(examId) as any
    examData.value = data
    switchCount.value = data.switchCount ?? 0

    // 恢复已保存答案（从后端）
    data.questions.forEach((q: any) => {
      if (q.savedAnswer) {
        if (q.type === 'MULTIPLE') {
          try { multiAnswers[q.id] = JSON.parse(q.savedAnswer) } catch { multiAnswers[q.id] = [] }
          answers[q.id] = q.savedAnswer
        } else {
          answers[q.id] = q.savedAnswer
        }
      }
    })

    // 恢复本地缓存的答案（断网续答）
    const localAnswers = loadAnswersFromLocal()
    Object.keys(localAnswers).forEach(qid => {
      if (!answers[qid]) {
        answers[qid] = localAnswers[qid]
        if (data.questions.find((qq: any) => qq.id === qid)?.type === 'MULTIPLE') {
          try { multiAnswers[qid] = JSON.parse(localAnswers[qid]) } catch {}
        }
      }
      // 加入待同步队列
      if (!answers[qid] || localAnswers[qid] !== answers[qid]) {
        pendingAnswers[qid] = localAnswers[qid]
      }
    })

    // 启动倒计时：取 duration 和 endAt 剩余时间中的较小值
    let remaining = data.duration * 60
    if (data.endAt) {
      const toEnd = Math.floor((new Date(data.endAt).getTime() - Date.now()) / 1000)
      if (toEnd > 0 && toEnd < remaining) remaining = toEnd
    }
    timeLeft.value = remaining
    examEndTime = data.endAt ? new Date(data.endAt).getTime() : null

    if (timeLeft.value <= 0) {
      // 已经超时，直接交卷
      ElMessage.warning('考试已超时，正在自动交卷…')
      doSubmit()
    } else {
      timer = setInterval(() => {
        timeLeft.value--
        if (timeLeft.value <= 0) {
          if (timer) clearInterval(timer)
          ElMessage.warning('考试时间已到，系统自动交卷')
          doSubmit()
        }
      }, 1000)
    }

    // 网络状态监听
    const updateOnlineStatus = () => {
      const wasOffline = !isOnline.value
      isOnline.value = navigator.onLine
      if (wasOffline && isOnline.value) {
        ElMessage.success('网络已恢复，正在同步答案…')
        syncPendingAnswers()
      } else if (!isOnline.value) {
        ElMessage.warning('网络已断开，答案将保存在本地')
      }
    }
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // 定时同步待答案（每 5 秒）
    syncTimer = setInterval(() => {
      if (isOnline.value && Object.keys(pendingAnswers).length > 0) {
        syncPendingAnswers()
      }
    }, 5000)

    // 注册切屏监听
    document.addEventListener('visibilitychange', handleVisibilityChange)
  } catch (e: any) {
    ElMessage.error(e.message || '进入考试失败')
    router.back()
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (syncTimer) clearInterval(syncTimer)
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 同步待答案
async function syncPendingAnswers() {
  const toSync = { ...pendingAnswers }
  for (const questionId of Object.keys(toSync)) {
    try {
      await examRoomApi.saveAnswer(examId, { questionId, answer: toSync[questionId] })
      delete pendingAnswers[questionId]
      // 清除本地缓存
      const cacheKey = `exam_${examId}_answers`
      let cached: Record<string, string> = {}
      try { cached = JSON.parse(localStorage.getItem(cacheKey) || '{}') } catch {}
      delete cached[questionId]
      localStorage.setItem(cacheKey, JSON.stringify(cached))
    } catch (e: any) {
      // 同步失败，保留在待同步队列
      console.warn('同步答案失败:', questionId, e)
    }
  }
  if (Object.keys(pendingAnswers).length === 0) {
    isOnline.value = true
  }
}

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}
const typeTagType = (t: string) => ({ SINGLE: '', MULTIPLE: 'warning', JUDGE: 'success', FILL: 'info' }[t] as any ?? '')
</script>

<style scoped>
.exam-room { display: flex; flex-direction: column; height: 100vh; background: #f5f7fa; }
.exam-header {
  display: flex; align-items: center; gap: 20px;
  padding: 0 24px; height: 56px;
  background: #fff; border-bottom: 1px solid #e4e7ed;
  position: sticky; top: 0; z-index: 100;
}
.exam-title { font-size: 16px; font-weight: 600; flex: 1; }
.exam-info { display: flex; gap: 16px; color: #606266; font-size: 14px; }
.switch-warn { color: #e6a23c; font-weight: 500; }
.exam-timer {
  font-size: 20px; font-weight: 600; color: #303133;
  display: flex; align-items: center; gap: 4px; min-width: 80px;
}
.exam-timer.warning { color: #f56c6c; }
.exam-body { display: flex; flex: 1; overflow: hidden; padding: 16px; gap: 16px; }
.question-nav {
  width: 180px; flex-shrink: 0;
  background: #fff; border-radius: 8px; padding: 16px;
  height: fit-content; position: sticky; top: 72px;
}
.nav-title { font-size: 13px; color: #909399; margin-bottom: 12px; }
.nav-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.nav-item {
  width: 28px; height: 28px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; cursor: pointer; background: #f5f7fa; color: #606266;
}
.nav-item.answered { background: #67c23a; color: #fff; }
.nav-item.current { background: #409eff; color: #fff; }
.question-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.question-card {
  background: #fff; border-radius: 8px; padding: 20px 24px;
  border: 2px solid transparent; transition: border-color 0.2s;
}
.q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.q-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: #409eff; color: #fff; font-size: 13px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.q-score { margin-left: auto; color: #909399; font-size: 13px; }
.q-content { font-size: 15px; line-height: 1.7; margin-bottom: 16px; }
.q-options { display: flex; flex-direction: column; gap: 10px; }
.q-option { margin: 0; font-size: 14px; }
.opt-label { font-weight: 600; }
.fill-input { margin-top: 4px; }
.loading-wrap { display: flex; justify-content: center; align-items: center; height: 100vh; }
</style>
