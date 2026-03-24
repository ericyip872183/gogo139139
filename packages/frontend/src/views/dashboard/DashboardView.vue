<template>
  <div class="dashboard">
    <!-- 欢迎语 -->
    <div class="welcome">
      <h2>你好，{{ user?.realName }}</h2>
      <p>{{ roleLabel }} · {{ isSuperAdmin ? '平台运营中心' : user?.tenantName }}</p>
    </div>

    <!-- ============ 超级管理员首页 ============ -->
    <template v-if="isSuperAdmin">
      <!-- 核心指标卡片 -->
      <div class="stat-cards-grid">
        <el-card class="stat-card clickable" shadow="hover" @click="goTo('/admin')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409eff22">
              <el-icon :size="24"><OfficeBuilding /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ stats?.overview?.tenantCount ?? '—' }}</div>
              <div class="stat-label">机构总数</div>
              <div class="stat-trend" v-if="stats?.overview?.tenantCount">点击查看详情</div>
            </div>
          </div>
        </el-card>
        <el-card class="stat-card clickable" shadow="hover" @click="goTo('/admin')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67c23a22">
              <el-icon :size="24"><Tickets /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ stats?.overview?.moduleInstanceCount ?? '—' }}</div>
              <div class="stat-label">模块授权份数</div>
              <div class="stat-trend" v-if="stats?.overview?.moduleInstanceCount">点击查看详情</div>
            </div>
          </div>
        </el-card>
        <el-card class="stat-card clickable" shadow="hover" @click="goTo('/admin')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e6a23c22">
              <el-icon :size="24"><User /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ stats?.overview?.userCount ?? '—' }}</div>
              <div class="stat-label">平台用户数</div>
              <div class="stat-trend" v-if="stats?.overview?.userCount">点击查看详情</div>
            </div>
          </div>
        </el-card>
        <el-card class="stat-card clickable" shadow="hover" @click="goTo('/admin')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #f56c6c22">
              <el-icon :size="24"><Warning /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ stats?.expiringTenants?.length ?? 0 }}</div>
              <div class="stat-label">到期预警</div>
              <div class="stat-trend" v-if="stats?.expiringTenants?.length">
                <span style="color: #f56c6c">{{ stats.expiringTenants.length }} 家机构即将到期</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 专业模块展示 -->
      <div class="modules-section">
        <div class="section-header">
          <h3>专业模块</h3>
          <span class="section-desc">平台已上线 {{ modules.length }} 个专业教学模块</span>
        </div>
        <el-row :gutter="20">
          <el-col :span="8" v-for="mod in modules" :key="mod.code">
            <el-card class="module-card" shadow="hover">
              <div class="module-header">
                <span class="module-icon">{{ mod.icon }}</span>
                <div class="module-info">
                  <div class="module-name">{{ mod.name }}</div>
                  <div class="module-type">{{ mod.type }}</div>
                </div>
              </div>
              <p class="module-desc">{{ mod.description }}</p>
              <div class="module-stats">
                <span>已授权 <strong>{{ mod.authorizedCount ?? 0 }}</strong> 家</span>
                <span class="module-phase" v-if="mod.phase">{{ mod.phase }}</span>
              </div>
              <div class="module-actions">
                <el-button link type="primary" @click="showModuleDetail(mod)">介绍</el-button>
                <el-button type="primary" size="small" @click="goToModule(mod.code)">进入模块</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </template>

    <!-- ============ 机构管理员首页 ============ -->
    <template v-else-if="isTenantAdmin">
      <el-row :gutter="20" class="stat-cards">
        <el-col :span="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #409eff22">
                <el-icon :size="24"><User /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ orgStats?.userCount ?? '—' }}</div>
                <div class="stat-label">本机构用户数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #67c23a22">
                <el-icon :size="24"><Finished /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ orgStats?.moduleCount ?? 0 }}</div>
                <div class="stat-label">已购模块数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card" shadow="hover" @click="goTo('/exams')">
            <div class="stat-content">
              <div class="stat-icon" style="background: #e6a23c22">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ orgStats?.examCount ?? 0 }}</div>
                <div class="stat-label">本月考试数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 可用模块展示 -->
      <div class="modules-section">
        <div class="section-header">
          <h3>可用专业模块</h3>
          <span class="section-desc">本机构已购买 {{ purchasedModules.length }} 个模块</span>
        </div>
        <el-row :gutter="20">
          <el-col :span="8" v-for="mod in purchasedModules" :key="mod.code">
            <el-card class="module-card" shadow="hover">
              <div class="module-header">
                <span class="module-icon">{{ mod.icon }}</span>
                <div class="module-info">
                  <div class="module-name">{{ mod.name }}</div>
                  <div class="module-type">{{ mod.type }}</div>
                </div>
              </div>
              <p class="module-desc">{{ mod.description }}</p>
              <div class="module-stats">
                <span class="module-phase" v-if="mod.phase">{{ mod.phase }}</span>
                <span v-if="mod.expiredAt">到期：{{ formatDate(mod.expiredAt) }}</span>
              </div>
              <div class="module-actions">
                <el-button link type="primary" @click="showModuleDetail(mod)">介绍</el-button>
                <el-button type="primary" size="small" @click="goToModule(mod.code)">进入模块</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8" v-if="purchasedModules.length === 0">
            <el-empty description="暂无可用模块，请联系平台管理员购买" />
          </el-col>
        </el-row>
      </div>
    </template>

    <!-- ============ 教师首页 ============ -->
    <template v-else-if="isTeacher">
      <el-row :gutter="20" class="stat-cards">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #409eff22">
                <el-icon :size="24"><OfficeBuilding /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ teacherStats?.classCount ?? 0 }}</div>
                <div class="stat-label">我的班级</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #67c23a22">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ teacherStats?.examCount ?? 0 }}</div>
                <div class="stat-label">负责考试</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover" @click="goTo('/scores')">
            <div class="stat-content">
              <div class="stat-icon" style="background: #e6a23c22">
                <el-icon :size="24"><Tickets /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ teacherStats?.pendingGrading ?? 0 }}</div>
                <div class="stat-label">待批阅</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #f56c6c22">
                <el-icon :size="24"><User /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ teacherStats?.studentCount ?? 0 }}</div>
                <div class="stat-label">我的学生</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 快捷操作 -->
      <el-card class="quick-actions">
        <template #header><span>快捷操作</span></template>
        <div class="action-buttons">
          <el-button type="primary" @click="goTo('/questions')">快速出题</el-button>
          <el-button type="primary" @click="goTo('/papers')">组卷</el-button>
          <el-button type="primary" @click="goTo('/exams')">发布考试</el-button>
          <el-button type="primary" @click="goTo('/scores')">成绩录入</el-button>
          <el-button type="primary" @click="goTo('/score-tables')">评分打分</el-button>
        </div>
      </el-card>

      <!-- 可用模块展示 -->
      <div class="modules-section">
        <div class="section-header">
          <h3>可用教学模块</h3>
        </div>
        <el-row :gutter="20">
          <el-col :span="8" v-for="mod in purchasedModules" :key="mod.code">
            <el-card class="module-card" shadow="hover">
              <div class="module-header">
                <span class="module-icon">{{ mod.icon }}</span>
                <div class="module-info">
                  <div class="module-name">{{ mod.name }}</div>
                </div>
              </div>
              <div class="module-actions">
                <el-button link type="primary" @click="showModuleDetail(mod)">介绍</el-button>
                <el-button type="primary" size="small" @click="goToModule(mod.code)">进入模块</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </template>

    <!-- ============ 学生首页 ============ -->
    <template v-else-if="isStudent">
      <el-row :gutter="20" class="stat-cards">
        <el-col :span="6">
          <el-card class="stat-card clickable" shadow="hover" @click="goTo('/my-exams')">
            <div class="stat-content">
              <div class="stat-icon" style="background: #f56c6c22">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ pendingExams.length }}</div>
                <div class="stat-label">待考考试</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card clickable" shadow="hover" @click="goTo('/my-exams?tab=done')">
            <div class="stat-content">
              <div class="stat-icon" style="background: #67c23a22">
                <el-icon :size="24"><Finished /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ completedExams }}</div>
                <div class="stat-label">已通过</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card clickable" shadow="hover" @click="goTo('/scores')">
            <div class="stat-content">
              <div class="stat-icon" style="background: #e6a23c22">
                <el-icon :size="24"><DataAnalysis /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ avgScore }}</div>
                <div class="stat-label">平均成绩</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #409eff22">
                <el-icon :size="24"><User /></el-icon>
              </div>
              <div>
                <div class="stat-value">{{ classRank ?? '—' }}</div>
                <div class="stat-label">班级排名</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 待考考试 -->
      <el-card v-if="pendingExams.length > 0" class="pending-card">
        <template #header>
          <div class="pending-header">
            <span>待考考试</span>
            <el-button link type="primary" @click="goTo('/my-exams')">查看全部</el-button>
          </div>
        </template>
        <div class="pending-list">
          <div v-for="exam in pendingExams.slice(0, 3)" :key="exam.id" class="pending-item">
            <div class="pending-info">
              <span class="pending-title">{{ exam.title }}</span>
              <span class="pending-meta">{{ exam.paper?.title }} · {{ exam.duration }}分钟</span>
            </div>
            <div class="pending-right">
              <span v-if="exam.endAt" class="pending-countdown">距截止 {{ countdown(exam.endAt) }}</span>
              <el-button type="primary" size="small" @click="goTo(`/exam/${exam.id}`)">进入考试</el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 可用学习模块 -->
      <div class="modules-section">
        <div class="section-header">
          <h3>可用学习模块</h3>
        </div>
        <el-row :gutter="20">
          <el-col :span="8" v-for="mod in purchasedModules" :key="mod.code">
            <el-card class="module-card" shadow="hover">
              <div class="module-header">
                <span class="module-icon">{{ mod.icon }}</span>
                <div class="module-info">
                  <div class="module-name">{{ mod.name }}</div>
                </div>
              </div>
              <div class="module-progress" v-if="mod.progress">
                <el-progress :percentage="mod.progress" :stroke-width="6" />
                <span class="progress-text">上次学习：{{ mod.lastStudy }}</span>
              </div>
              <div class="module-actions">
                <el-button link type="primary" @click="showModuleDetail(mod)">介绍</el-button>
                <el-button type="primary" size="small" @click="goToModule(mod.code)">继续学习</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </template>

    <!-- 模块详情弹窗 -->
    <el-dialog v-model="moduleDetailVisible" :title="selectedModule?.name" width="600px">
      <div v-if="selectedModule" class="module-detail">
        <div class="detail-icon">{{ selectedModule.icon }}</div>
        <h4>{{ selectedModule.name }}</h4>
        <el-tag v-if="selectedModule.type" size="small">{{ selectedModule.type }}</el-tag>
        <el-tag v-if="selectedModule.phase" size="small" type="warning">{{ selectedModule.phase }}</el-tag>
        <p class="detail-desc">{{ selectedModule.description }}</p>
        <div class="detail-features" v-if="selectedModule.features">
          <strong>核心功能：</strong>
          <ul>
            <li v-for="(f, i) in selectedModule.features" :key="i">{{ f }}</li>
          </ul>
        </div>
        <div class="detail-info">
          <span>适用：{{ selectedModule.audience || '教师/学生' }}</span>
          <span v-if="selectedModule.authorizedCount">已授权：{{ selectedModule.authorizedCount }}家</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="moduleDetailVisible = false">关闭</el-button>
        <el-button type="primary" @click="goToModule(selectedModule?.code || '')">进入模块</el-button>
        <el-button v-if="!selectedModule?.authorized" type="warning" @click="contactAdmin">联系管理员</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Document, User, Finished, DataAnalysis, OfficeBuilding, Tickets, Warning,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { examsApi } from '@/api/exams'
import { adminApi } from '@/api/admin'

const router = useRouter()
const auth = useAuthStore()
const user = computed(() => auth.user)

const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
const isTenantAdmin = computed(() => user.value?.role === 'TENANT_ADMIN')
const isTeacher = computed(() => ['TEACHER', 'CLASS_ADMIN'].includes(user.value?.role || ''))
const isStudent = computed(() => user.value?.role === 'STUDENT')

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    SUPER_ADMIN: '超级管理员',
    TENANT_ADMIN: '机构管理员',
    TEACHER: '教师',
    CLASS_ADMIN: '班级管理员',
    STUDENT: '学生',
  }
  return map[user.value?.role ?? 'STUDENT']
})

// 跳转函数
function goTo(path: string) {
  router.push(path)
}

function goToModule(code: string) {
  router.push(`/module/${code}`)
}

// ========== 专业模块定义 ==========
const modules = [
  {
    code: 'TCM_CONSTITUTION',
    name: '体质辨识教学',
    icon: '🧬',
    type: '纯软件',
    phase: '二期',
    description: '以中医体质辨识理论为核心，融合问卷辨识、模拟实操、专项考核，实现教学实训考核一体化。',
    features: ['11 套标准化问卷', '九种体质辨识', '60+ 证型辨识', '雷达图可视化'],
    audience: '教师/学生',
    authorizedCount: 45,
  },
  {
    code: 'EAR_ACUPOINT',
    name: '耳穴教学',
    icon: '🦻',
    type: '3D 虚拟仿真',
    phase: '二期',
    description: '以中医耳穴埋籽技术教学为核心，融合 3D 虚拟仿真、临床案例训练、OSCE 标准化考核。',
    features: ['3D 耳廓模型', '临床案例训练', 'OSCE 考核', '四诊合参'],
    audience: '教师/学生',
    authorizedCount: 32,
  },
  {
    code: 'MERIDIAN_COLLECT',
    name: '经络采集分析',
    icon: '📡',
    type: '硬件 + 软件',
    phase: '三期',
    description: '采集人体手部反射区十二经络生理电信号并智能分析，生成多维度诊断报告。',
    features: ['十二经络采集', '智能分析', '诊断报告', '教学病例库'],
    audience: '教师/学生',
    authorizedCount: 18,
  },
  {
    code: 'FOUR_DIAGNOSIS',
    name: '中医四诊采集分析',
    icon: '🩺',
    type: '硬件 + 软件',
    phase: '三期',
    description: '以中医望闻问切四诊为核心，融合硬件采集、智能分析、病例示教、理论考核。',
    features: ['舌诊 3D 解剖', '面诊分析', '脉诊采集', '四诊合参'],
    audience: '教师/学生',
    authorizedCount: 25,
  },
  {
    code: 'ACUPUNCTURE',
    name: '针刺手法采集',
    icon: '📍',
    type: '硬件+VR',
    phase: '三期',
    description: '融合智能传感针具硬件实操采集、3D 虚拟教学、VR 模拟考核三大能力。',
    features: ['25 种针刺手法', '3D 针灸教学', 'VR 模拟考核', '700+ 疾病测试'],
    audience: '教师/学生',
    authorizedCount: 12,
  },
  {
    code: 'GUASHA',
    name: '刮痧手法采集',
    icon: '🔪',
    type: '硬件+VR',
    phase: '三期',
    description: '融合高精度力反馈机械臂、VR 沉浸式操作、AI 智能评估，支持竞赛级考核。',
    features: ['力反馈机械臂', 'VR 沉浸操作', 'AI 自动评分', '金砖大赛模式'],
    audience: '教师/学生',
    authorizedCount: 8,
  },
  {
    code: 'TUINA',
    name: '推拿手法采集',
    icon: '💆',
    type: '硬件 + 软件',
    phase: '三期',
    description: '融合柔性传感器硬件采集、3D 虚拟仿真、智能化教学管理。',
    features: ['柔性传感器', '800+ 穴位', '多端同步', '远程管控'],
    audience: '教师/学生',
    authorizedCount: 20,
  },
  {
    code: 'MERIDIAN_ANATOMY',
    name: '人体经络腧穴解剖',
    icon: '🏃',
    type: '硬件+3D',
    phase: '三期',
    description: '融合穴位触控笔硬件、3D 虚拟仿真、实操练习、案例考核。',
    features: ['触控笔交互', '3D 解剖模型', '虚拟针刺', '针灸处方'],
    audience: '教师/学生',
    authorizedCount: 15,
  },
]

// 数据状态
const stats = ref<any>(null)
const orgStats = ref<any>(null)
const teacherStats = ref<any>(null)
const examList = ref<any[]>([])
const moduleDetailVisible = ref(false)
const selectedModule = ref<any>(null)

const purchasedModules = computed(() => {
  const userMods = auth.modules || []
  return userMods.map((m: any) => {
    const mod = modules.find(x => x.code === m.code)
    return { ...mod, ...m }
  })
})

// 超管数据
const superAdminCards = computed(() => [
  { label: '机构总数', value: stats.value?.overview?.tenantCount ?? '—' },
  { label: '模块授权份数', value: stats.value?.overview?.moduleInstanceCount ?? '—' },
  { label: '平台用户数', value: stats.value?.overview?.userCount ?? '—' },
  { label: '到期预警', value: stats.value?.expiringTenants?.length ?? 0 },
])

// 学生数据
const pendingExams = computed(() =>
  examList.value.filter(e => !e.hasSubmitted && (e.status === 'PUBLISHED' || e.status === 'ONGOING'))
)
const completedExams = computed(() => examList.value.filter(e => e.hasSubmitted).length)
const avgScore = computed(() => {
  const completed = examList.value.filter(e => e.hasSubmitted && e.score)
  if (!completed.length) return '—'
  const avg = completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length
  return avg.toFixed(1)
})
const classRank = ref('12')

// 计时器
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 模块详情
function showModuleDetail(mod: any) {
  selectedModule.value = mod
  moduleDetailVisible.value = true
}

function contactAdmin() {
  router.push('/profile')
}

onMounted(async () => {
  if (isSuperAdmin.value) {
    try { stats.value = (await adminApi.getDashboardStats()) as any } catch {}
  } else if (isTenantAdmin.value) {
    orgStats.value = { userCount: 245, moduleCount: 5, examCount: 23 }
  } else if (isTeacher.value) {
    teacherStats.value = { classCount: 5, examCount: 12, pendingGrading: 35, studentCount: 245 }
  } else if (isStudent.value) {
    try { examList.value = (await examsApi.my()) as any[] } catch {}
  }
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<style scoped>
.dashboard { }
.welcome { margin-bottom: 24px; }
.welcome h2 { font-size: 22px; margin: 0 0 4px; }
.welcome p { color: #909399; margin: 0; }

/* Grid 布局 - 替代 el-row/el-col */
.stat-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card { border-radius: 8px; height: 100%; display: flex; flex-direction: column; }
.stat-card.clickable { cursor: pointer; transition: transform 0.15s; }
.stat-card.clickable:hover { transform: translateY(-2px); }
.stat-content { display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-value { font-size: 28px; font-weight: 600; color: #303133; }
.stat-label { font-size: 13px; color: #909399; margin-top: 2px; }
.stat-trend { font-size: 12px; color: #409eff; margin-top: 4px; }

/* 专业模块区域 */
.modules-section { margin-top: 24px; margin-bottom: 24px; }
.section-header { margin-bottom: 16px; }
.section-header h3 { font-size: 18px; margin: 0 0 4px; }
.section-desc { font-size: 13px; color: #909399; }

.modules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  grid-auto-rows: 1fr;
}

.module-card { height: 100%; display: flex; flex-direction: column; }
.module-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.module-icon { font-size: 32px; }
.module-info { flex: 1; }
.module-name { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 2px; }
.module-type { font-size: 12px; color: #909399; }
.module-desc { font-size: 13px; color: #606266; line-height: 1.6; margin-bottom: 12px; min-height: 42px; }
.module-stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: #909399; flex-wrap: wrap; gap: 4px; }
.module-phase { background: #fdf6ec; color: #e6a23c; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.module-actions { display: flex; gap: 8px; }

/* 快捷操作 */
.quick-actions { margin-bottom: 20px; }
.action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }

/* 待考考试 */
.pending-card { margin-bottom: 20px; }
.pending-header { display: flex; align-items: center; justify-content: space-between; }
.pending-list { display: flex; flex-direction: column; gap: 12px; }
.pending-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f5f7fa; border-radius: 8px; }
.pending-info { display: flex; flex-direction: column; gap: 4px; }
.pending-title { font-size: 14px; font-weight: 600; color: #303133; }
.pending-meta { font-size: 12px; color: #909399; }
.pending-right { display: flex; align-items: center; gap: 12px; }
.pending-countdown { font-size: 13px; color: #f56c6c; font-weight: 500; }

/* 模块详情弹窗 */
.module-detail { text-align: center; }
.detail-icon { font-size: 48px; margin-bottom: 12px; }
.module-detail h4 { font-size: 18px; margin: 0 0 8px; }
.module-detail .el-tag { margin-right: 8px; }
.detail-desc { font-size: 14px; color: #606266; line-height: 1.6; margin: 16px 0; }
.detail-features { text-align: left; background: #f5f7fa; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
.detail-features ul { margin: 8px 0 0 16px; padding: 0; }
.detail-features li { font-size: 13px; color: #606266; line-height: 1.8; }
.detail-info { display: flex; justify-content: space-between; font-size: 13px; color: #909399; }

/* 学习进度 */
.module-progress { margin-bottom: 12px; }
.progress-text { font-size: 12px; color: #909399; margin-top: 4px; display: block; }
</style>
