<template>
  <div class="dashboard">
    <div class="welcome">
      <h2>你好，{{ user?.realName }}</h2>
      <p>{{ roleLabel }} · {{ isSuperAdmin ? '若容科技平台' : user?.tenantName }}</p>
    </div>

    <!-- 超级管理员首页 -->
    <template v-if="isSuperAdmin">
      <!-- 核心指标卡片 -->
      <el-row :gutter="20" class="stat-cards">
        <el-col :span="6" v-for="card in superAdminCards" :key="card.label">
          <el-card class="stat-card" shadow="hover">
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

      <el-row :gutter="20">
        <!-- 模块销售排行 -->
        <el-col :span="12">
          <el-card class="panel-card">
            <template #header>
              <div class="panel-header">
                <span>模块销售排行</span>
                <el-button link type="primary" @click="$router.push('/admin')">管理模块</el-button>
              </div>
            </template>
            <div v-if="dashboardStats?.moduleSales?.length" class="module-sales-list">
              <div
                v-for="(item, index) in dashboardStats.moduleSales.slice(0, 6)"
                :key="item.moduleId"
                class="module-sales-item"
              >
                <div class="rank-badge" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
                <div class="module-name">{{ item.moduleName }}</div>
                <div class="sold-count">
                  <el-tag size="small" type="success">{{ item.soldCount }} 家机构</el-tag>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无模块授权数据" :image-size="60" />
          </el-card>
        </el-col>

        <!-- 用户角色分布 -->
        <el-col :span="12">
          <el-card class="panel-card">
            <template #header><span>平台用户分布</span></template>
            <div class="role-distribution">
              <div v-for="item in roleDistribution" :key="item.role" class="role-item">
                <div class="role-info">
                  <el-tag :type="item.tagType" size="small">{{ item.label }}</el-tag>
                  <span class="role-count">{{ item.count }} 人</span>
                </div>
                <el-progress
                  :percentage="item.percentage"
                  :color="item.color"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 即将到期预警 -->
        <el-col :span="12">
          <el-card class="panel-card">
            <template #header>
              <div class="panel-header">
                <span>
                  到期预警
                  <el-badge
                    v-if="dashboardStats?.expiringTenants?.length"
                    :value="dashboardStats.expiringTenants.length"
                    type="danger"
                  />
                </span>
                <span class="panel-sub">7 天内到期</span>
              </div>
            </template>
            <div v-if="dashboardStats?.expiringTenants?.length" class="expiring-list">
              <div
                v-for="item in dashboardStats.expiringTenants"
                :key="`${item.tenantName}-${item.moduleName}`"
                class="expiring-item"
              >
                <div class="expiring-info">
                  <span class="expiring-tenant">{{ item.tenantName }}</span>
                  <span class="expiring-module">{{ item.moduleName }}</span>
                </div>
                <el-tag type="danger" size="small">
                  {{ formatExpiry(item.expiredAt) }}
                </el-tag>
              </div>
            </div>
            <el-empty v-else description="暂无即将到期授权" :image-size="60" />
          </el-card>
        </el-col>

        <!-- 最近动态 -->
        <el-col :span="12">
          <el-card class="panel-card">
            <template #header><span>最近动态</span></template>
            <el-timeline class="activity-timeline">
              <el-timeline-item
                v-for="(item, index) in recentActivities"
                :key="index"
                :timestamp="item.time"
                :type="item.type"
                size="normal"
              >
                {{ item.text }}
              </el-timeline-item>
              <el-timeline-item v-if="!recentActivities.length" timestamp="">
                <el-empty description="暂无最近动态" :image-size="40" />
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 普通用户首页（教师/学生） -->
    <template v-else>
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
    </template>
  </div>
</template>

<script setup lang="ts">
// DashboardView.vue - 首页（超级管理员显示平台业务数据，其他角色显示个人数据）
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Document, User, Finished, DataAnalysis, OfficeBuilding, Tickets, Warning } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { examsApi } from '@/api/exams'
import { adminApi } from '@/api/admin'

const auth = useAuthStore()
const user = computed(() => auth.user)

const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
const isStudent = computed(() => user.value?.role === 'STUDENT')

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    SUPER_ADMIN: '超级管理员',
    TEACHER: '教师',
    STUDENT: '学生',
  }
  return map[user.value?.role ?? 'STUDENT']
})

// ── 超级管理员数据 ──────────────────────────────────

const dashboardStats = ref<any>(null)

const superAdminCards = computed(() => {
  const s = dashboardStats.value?.overview
  return [
    { label: '机构总数',     value: s?.tenantCount ?? '—',         icon: OfficeBuilding, color: '#409eff22' },
    { label: '模块授权份数', value: s?.moduleInstanceCount ?? '—', icon: Tickets,        color: '#67c23a22' },
    { label: '平台用户数',   value: s?.userCount ?? '—',           icon: User,           color: '#e6a23c22' },
    { label: '到期预警',     value: dashboardStats.value?.expiringTenants?.length ?? '—', icon: Warning, color: '#f56c6c22' },
  ]
})

const roleDistribution = computed(() => {
  const byRole = dashboardStats.value?.userByRole ?? {}
  const total = (Object.values(byRole) as number[]).reduce((a, b) => a + b, 0) || 1
  const items = [
    { role: 'TEACHER', label: '教师', tagType: 'warning' as const, color: '#e6a23c' },
    { role: 'STUDENT', label: '学生', tagType: 'success' as const, color: '#67c23a' },
    { role: 'SUPER_ADMIN', label: '超管', tagType: 'danger' as const, color: '#f56c6c' },
  ]
  return items.map(item => ({
    ...item,
    count: byRole[item.role] ?? 0,
    percentage: Math.round(((byRole[item.role] ?? 0) / total) * 100),
  }))
})

const recentActivities = computed(() => {
  const activities: { text: string; time: string; type: 'primary' | 'success' | 'warning' }[] = []
  const grants = dashboardStats.value?.recentGrants ?? []
  const tenants = dashboardStats.value?.recentTenants ?? []
  for (const g of grants.slice(0, 5)) {
    activities.push({ text: `${g.tenantName} 获得 ${g.moduleName} 授权`, time: formatTime(g.createdAt), type: 'success' })
  }
  for (const t of tenants.slice(0, 5)) {
    activities.push({ text: `新机构 ${t.name} 注册`, time: formatTime(t.createdAt), type: 'primary' })
  }
  return activities.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8)
})

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatExpiry(dateStr: string): string {
  if (!dateStr) return '永久'
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return days <= 0 ? '已到期' : `${days} 天后到期`
}

// ── 普通用户数据 ────────────────────────────────────

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
  if (isSuperAdmin.value) {
    try { dashboardStats.value = (await adminApi.getDashboardStats()) as any } catch { /* 静默失败 */ }
  } else if (isStudent.value) {
    try { examList.value = (await examsApi.my()) as any[] } catch { /* 静默失败 */ }
  }
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => { if (clockTimer) clearInterval(clockTimer) })
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
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-value { font-size: 28px; font-weight: 600; color: #303133; }
.stat-label { font-size: 13px; color: #909399; margin-top: 2px; }

.panel-card { border-radius: 8px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-sub { font-size: 12px; color: #909399; }

.module-sales-list { display: flex; flex-direction: column; gap: 10px; }
.module-sales-item { display: flex; align-items: center; gap: 10px; }
.rank-badge { width: 22px; height: 22px; border-radius: 50%; background: #dcdfe6; color: #606266; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rank-badge.rank-1 { background: #f5a623; color: #fff; }
.rank-badge.rank-2 { background: #b0b0b0; color: #fff; }
.rank-badge.rank-3 { background: #cd7f32; color: #fff; }
.module-name { flex: 1; font-size: 14px; color: #303133; }
.sold-count { flex-shrink: 0; }

.role-distribution { display: flex; flex-direction: column; gap: 14px; }
.role-item { display: flex; flex-direction: column; gap: 6px; }
.role-info { display: flex; align-items: center; justify-content: space-between; }
.role-count { font-size: 13px; color: #606266; }

.expiring-list { display: flex; flex-direction: column; gap: 10px; }
.expiring-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fff5f5; border-radius: 6px; }
.expiring-info { display: flex; flex-direction: column; gap: 2px; }
.expiring-tenant { font-size: 14px; font-weight: 500; color: #303133; }
.expiring-module { font-size: 12px; color: #909399; }

.activity-timeline { padding: 0; }

.pending-card { margin-bottom: 20px; }
.pending-header { display: flex; align-items: center; justify-content: space-between; }
.pending-list { display: flex; flex-direction: column; gap: 12px; }
.pending-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f5f7fa; border-radius: 8px; }
.pending-info { display: flex; flex-direction: column; gap: 4px; }
.pending-title { font-size: 14px; font-weight: 600; color: #303133; }
.pending-meta { font-size: 12px; color: #909399; }
.pending-right { display: flex; align-items: center; gap: 12px; }
.pending-countdown { font-size: 13px; color: #409eff; font-weight: 500; }
</style>
