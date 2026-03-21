<template>
  <div class="dashboard">
    <div class="welcome">
      <h2>你好，{{ user?.realName }}</h2>
      <p>{{ roleLabel }} · {{ user?.tenantName }}</p>
    </div>

    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <el-card
          class="stat-card"
          :class="{ clickable: !!card.route }"
          shadow="hover"
          @click="card.route && $router.push(card.route)"
        >
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: card.color }">
              <el-icon :size="24"><component :is="card.icon" /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-label">{{ card.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 学生：待考考试列表 -->
    <el-card v-if="isStudent && pendingExams.length > 0" class="pending-card">
      <template #header>
        <div class="pending-header">
          <span>待考考试</span>
          <el-button link type="primary" @click="$router.push('/my-exams')">查看全部</el-button>
        </div>
      </template>
      <div class="pending-list">
        <div v-for="exam in pendingExams.slice(0, 3)" :key="exam.id" class="pending-item">
          <div class="pending-info">
            <span class="pending-title">{{ exam.title }}</span>
            <span class="pending-meta">{{ exam.paper?.title }} · {{ exam.duration }} 分钟</span>
          </div>
          <div class="pending-right">
            <span v-if="exam.endAt" class="pending-countdown">
              距截止 {{ countdown(exam.endAt) }}
            </span>
            <el-button type="primary" size="small" @click="$router.push(`/exam/${exam.id}`)">
              进入考试
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-card v-else class="notice-card">
      <template #header><span>系统公告</span></template>
      <el-empty description="暂无公告" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Document, User, Finished, DataAnalysis } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { examsApi } from '@/api/exams'

const auth = useAuthStore()
const user = computed(() => auth.user)

const isStudent = computed(() => user.value?.role === 'STUDENT')

const roleLabel = computed(() => {
  const map: Record<string, string> = { SUPER_ADMIN: '超级管理员', TEACHER: '教师', STUDENT: '学生' }
  return map[user.value?.role ?? 'STUDENT']
})

// 学生考试数据
const examList = ref<any[]>([])
const pendingExams = computed(() =>
  examList.value.filter(e => !e.hasSubmitted && (e.status === 'PUBLISHED' || e.status === 'ONGOING'))
)
const doneCount = computed(() => examList.value.filter(e => e.hasSubmitted).length)

const statCards = computed(() => [
  { label: '待考考试',   value: isStudent.value ? pendingExams.value.length : '—', icon: Document,     color: '#409eff22', route: isStudent.value ? '/my-exams' : null },
  { label: '已完成考试', value: isStudent.value ? doneCount.value : '—',           icon: Finished,     color: '#67c23a22', route: isStudent.value ? '/my-exams?tab=done' : null },
  { label: '学习资料',   value: '—',                                                icon: DataAnalysis, color: '#e6a23c22', route: null },
  { label: '我的成绩',   value: isStudent.value ? doneCount.value : '—',           icon: User,         color: '#f56c6c22', route: isStudent.value ? '/scores' : null },
])

// 实时倒计时
const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null

function countdown(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - now.value
  if (diff <= 0) return '已截止'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) return `${h}时${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

onMounted(async () => {
  if (isStudent.value) {
    try {
      examList.value = (await examsApi.my()) as any[]
    } catch { /* 静默失败，不影响首页展示 */ }
  }
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped>
.dashboard { padding: 20px; }
.welcome { margin-bottom: 24px; }
.welcome h2 { font-size: 22px; margin: 0 0 4px; }
.welcome p { color: #909399; margin: 0; }
.stat-cards { margin-bottom: 24px; }
.stat-card { border-radius: 8px; }
.stat-card.clickable { cursor: pointer; transition: transform 0.15s; }
.stat-card.clickable:hover { transform: translateY(-2px); }
.stat-content { display: flex; align-items: center; gap: 16px; }
.stat-icon {
  width: 56px; height: 56px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.stat-value { font-size: 28px; font-weight: 600; color: #303133; }
.stat-label { font-size: 13px; color: #909399; margin-top: 2px; }

.pending-card { margin-bottom: 20px; }
.pending-header { display: flex; align-items: center; justify-content: space-between; }
.pending-list { display: flex; flex-direction: column; gap: 12px; }
.pending-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #f5f7fa; border-radius: 8px;
}
.pending-info { display: flex; flex-direction: column; gap: 4px; }
.pending-title { font-size: 14px; font-weight: 600; color: #303133; }
.pending-meta { font-size: 12px; color: #909399; }
.pending-right { display: flex; align-items: center; gap: 12px; }
.pending-countdown { font-size: 13px; color: #409eff; font-weight: 500; }
</style>
