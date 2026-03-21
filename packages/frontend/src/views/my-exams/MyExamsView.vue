<template>
  <div class="my-exams-page">
    <el-card>
      <template #header>
        <span class="title">我的考试</span>
      </template>

      <div v-loading="loading">
        <el-tabs v-model="activeTab">
          <!-- 待考 Tab -->
          <el-tab-pane :label="`待考（${pendingList.length}）`" name="pending">
            <div v-if="pendingList.length === 0" class="empty">
              <el-empty description="暂无待考任务" />
            </div>
            <div class="exam-cards">
              <div v-for="exam in pendingList" :key="exam.id" class="exam-card">
                <div class="card-top">
                  <span class="exam-title">{{ exam.title }}</span>
                  <el-tag :type="statusTagType(exam.status)" size="small">{{ statusLabel(exam.status) }}</el-tag>
                </div>
                <div class="card-meta">
                  <span><el-icon><Document /></el-icon> {{ exam.paper?.title }}</span>
                  <span><el-icon><Timer /></el-icon> {{ exam.duration }} 分钟</span>
                  <span><el-icon><QuestionFilled /></el-icon> 共 {{ exam.paper?.totalScore }} 分</span>
                </div>
                <div class="card-time">
                  <span v-if="exam.startAt">开始：{{ formatDate(exam.startAt) }}</span>
                  <span v-if="exam.endAt">截止：{{ formatDate(exam.endAt) }}</span>
                </div>
                <!-- 截止倒计时 -->
                <div v-if="exam.endAt" class="countdown" :class="{ urgent: urgentCountdown(exam.endAt) }">
                  <el-icon><AlarmClock /></el-icon>
                  距截止：{{ countdown(exam.endAt) }}
                </div>
                <div v-else-if="exam.startAt && isFuture(exam.startAt)" class="countdown countdown--future">
                  <el-icon><AlarmClock /></el-icon>
                  距开始：{{ countdown(exam.startAt) }}
                </div>
                <div class="card-footer">
                  <el-button
                    type="primary" size="small"
                    @click="enterExam(exam.id)"
                  >进入考试</el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 已考 Tab -->
          <el-tab-pane :label="`已考（${doneList.length}）`" name="done">
            <div v-if="doneList.length === 0" class="empty">
              <el-empty description="暂无考试记录" />
            </div>
            <div class="exam-cards">
              <div v-for="exam in doneList" :key="exam.id" class="exam-card exam-card--done">
                <div class="card-top">
                  <span class="exam-title">{{ exam.title }}</span>
                  <el-tag v-if="exam.hasSubmitted" type="success" size="small">已交卷</el-tag>
                  <el-tag v-else type="info" size="small">已结束</el-tag>
                </div>
                <div class="card-meta">
                  <span><el-icon><Document /></el-icon> {{ exam.paper?.title }}</span>
                  <span><el-icon><QuestionFilled /></el-icon> 共 {{ exam.paper?.totalScore }} 分</span>
                </div>
                <div class="card-time">
                  <span v-if="exam.submittedAt">交卷：{{ formatDate(exam.submittedAt) }}</span>
                  <span v-else-if="exam.endAt">截止：{{ formatDate(exam.endAt) }}</span>
                </div>
                <div class="card-footer">
                  <el-button
                    v-if="exam.hasSubmitted"
                    link type="primary" size="small"
                    @click="viewScore(exam.id)"
                  >查看成绩</el-button>
                  <span v-else class="tip">未作答</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Timer, QuestionFilled, AlarmClock } from '@element-plus/icons-vue'
import { examsApi } from '@/api/exams'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const list = ref<any[]>([])
const activeTab = ref<'pending' | 'done'>(route.query.tab === 'done' ? 'done' : 'pending')

// 实时时钟（用于倒计时）
const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null

// 待考：未交卷 且 已发布/进行中（不含草稿）
const pendingList = computed(() =>
  list.value.filter(e => !e.hasSubmitted && (e.status === 'PUBLISHED' || e.status === 'ONGOING'))
)

// 已考：已交卷 或 考试已结束/已取消
const doneList = computed(() =>
  list.value.filter(e => e.hasSubmitted || e.status === 'ENDED' || e.status === 'CANCELLED')
)

function countdown(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - now.value
  if (diff <= 0) return '已截止'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) return `${h} 时 ${m} 分 ${s} 秒`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
}

function urgentCountdown(endAt: string): boolean {
  const diff = new Date(endAt).getTime() - now.value
  return diff > 0 && diff < 30 * 60 * 1000  // 30分钟内变红
}

const statusLabel = (s: string) =>
  ({ DRAFT: '未开放', PUBLISHED: '可参加', ONGOING: '进行中', ENDED: '已结束', CANCELLED: '已取消' }[s] ?? s)

const statusTagType = (s: string): any =>
  ({ DRAFT: 'info', PUBLISHED: 'success', ONGOING: 'warning', ENDED: '', CANCELLED: 'danger' }[s] ?? '')

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

async function load() {
  loading.value = true
  try {
    list.value = (await examsApi.my()) as any[]
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function enterExam(id: string) {
  router.push(`/exam/${id}`)
}

function viewScore(examId: string) {
  router.push(`/scores?examId=${examId}`)
}

onMounted(() => {
  load()
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped>
.my-exams-page { padding: 0; }
.title { font-size: 16px; font-weight: 600; }
.exam-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 16px; }
.exam-card {
  border: 1px solid #e4e7ed; border-radius: 8px; padding: 16px 20px;
  transition: box-shadow 0.2s;
}
.exam-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.exam-card--done { opacity: 0.85; }
.card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.exam-title { font-size: 15px; font-weight: 600; flex: 1; line-height: 1.4; }
.card-meta { display: flex; gap: 16px; font-size: 13px; color: #909399; margin-bottom: 8px; }
.card-meta span { display: flex; align-items: center; gap: 4px; }
.card-time { font-size: 12px; color: #c0c4cc; margin-bottom: 8px; display: flex; gap: 16px; }
.countdown {
  display: flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 500; color: #409eff;
  background: #ecf5ff; border-radius: 4px; padding: 4px 10px;
  margin-bottom: 12px; width: fit-content;
}
.countdown--future { color: #909399; background: #f4f4f5; }
.countdown.urgent { color: #f56c6c; background: #fef0f0; }
.card-footer { display: flex; align-items: center; gap: 8px; }
.tip { font-size: 13px; color: #c0c4cc; }
.empty { padding: 40px 0; }
</style>
