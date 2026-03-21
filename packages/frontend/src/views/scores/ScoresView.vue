<template>
  <div class="scores-page">
    <!-- 教师端：选择考试查看成绩 -->
    <template v-if="isTeacher">
      <el-card class="filter-card">
        <div class="filter-row">
          <el-select
            v-model="selectedExamId"
            filterable
            placeholder="选择考试"
            style="width:300px"
            @change="loadExamScores"
          >
            <el-option v-for="e in examList" :key="e.id" :label="e.title" :value="e.id" />
          </el-select>
          <template v-if="examScores">
            <el-statistic title="参考人数" :value="examScores.list.length" />
            <el-statistic title="平均分" :value="stats?.avg ?? 0" :precision="1" />
            <el-statistic title="最高分" :value="stats?.max ?? 0" />
            <el-statistic title="及格率" :value="stats?.passRate ?? 0" suffix="%" />
          </template>
        </div>
      </el-card>

      <el-card v-if="examScores" class="table-card">
        <template #header>
          <div class="header">
            <span>{{ examScores.exam.title }} — 成绩列表（满分 {{ examScores.exam.totalScore }} 分）</span>
          </div>
        </template>
        <el-table :data="examScores.list" border stripe>
          <el-table-column label="排名" prop="rank" width="70" align="center" />
          <el-table-column label="姓名" prop="realName" width="100" />
          <el-table-column label="学号" prop="studentNo" width="130" />
          <el-table-column label="得分" width="90" align="center">
            <template #default="{ row }">
              <span :class="row.totalScore >= examScores.exam.totalScore * 0.6 ? 'pass' : 'fail'">
                {{ row.totalScore }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="正确率" width="90" align="center">
            <template #default="{ row }">{{ row.correctRate }}%</template>
          </el-table-column>
          <el-table-column label="交卷时间" min-width="150">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDetail(row.userId, row.realName)">
                答题明细
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 学生端：我的成绩 -->
    <template v-else>
      <el-card>
        <template #header><span class="title">我的成绩</span></template>
        <el-table v-loading="loading" :data="myScores" stripe>
          <el-table-column label="考试名称" prop="examTitle" min-width="200" show-overflow-tooltip />
          <el-table-column label="得分" width="90" align="center">
            <template #default="{ row }">
              <span :class="row.totalScore >= row.maxScore * 0.6 ? 'pass' : 'fail'">
                {{ row.totalScore }} / {{ row.maxScore }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="正确率" width="90" align="center">
            <template #default="{ row }">{{ row.correctRate }}%</template>
          </el-table-column>
          <el-table-column label="排名" prop="rank" width="80" align="center">
            <template #default="{ row }">{{ row.rank ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="考试时间" width="155">
            <template #default="{ row }">{{ row.examDate ? formatDate(row.examDate) : '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openMyDetail(row)">答题明细</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 答题明细抽屉 -->
    <el-drawer v-model="detailVisible" :title="`答题明细 — ${detailUser}`" size="680px">
      <div v-loading="detailLoading" class="detail-list">
        <div v-for="(a, idx) in detailList" :key="a.questionId" class="detail-item">
          <div class="d-header">
            <span class="d-num">{{ idx + 1 }}</span>
            <el-tag :type="a.isCorrect ? 'success' : 'danger'" size="small">
              {{ a.isCorrect ? '正确' : '错误' }}
            </el-tag>
            <span class="d-score">{{ a.score }} 分</span>
          </div>
          <div class="d-content" v-html="a.content" />
          <div class="d-answers">
            <span class="label">我的答案：</span>
            <span :class="a.isCorrect ? 'ans-right' : 'ans-wrong'">{{ formatAnswer(a.myAnswer) }}</span>
          </div>
          <div v-if="a.explanation" class="d-explanation">
            <span class="label">解析：</span>{{ a.explanation }}
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { scoresApi } from '@/api/scores'
import { examsApi } from '@/api/exams'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const isTeacher = computed(() => auth.user?.role === 'TEACHER' || auth.user?.role === 'SUPER_ADMIN')

const loading = ref(false)
const examList = ref<any[]>([])
const selectedExamId = ref('')
const examScores = ref<any>(null)
const stats = ref<any>(null)
const myScores = ref<any[]>([])

// 答题明细
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailList = ref<any[]>([])
const detailUser = ref('')
const detailExamId = ref('')
const detailUserId = ref('')

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function formatAnswer(a: string) {
  if (!a) return '未作答'
  try {
    const parsed = JSON.parse(a)
    if (Array.isArray(parsed)) return parsed.join('、')
  } catch { /* not json */ }
  return a
}

async function loadExamScores() {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const [scores, st] = await Promise.all([
      scoresApi.getByExam(selectedExamId.value),
      scoresApi.getExamStats(selectedExamId.value),
    ])
    examScores.value = scores
    stats.value = st
  } catch {
    ElMessage.error('加载成绩失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(userId: string, name: string) {
  detailUser.value = name
  detailUserId.value = userId
  detailExamId.value = selectedExamId.value
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailList.value = (await scoresApi.getAnswerDetail(selectedExamId.value, userId)) as any[]
  } finally {
    detailLoading.value = false
  }
}

async function openMyDetail(row: any) {
  detailUser.value = '我的答案'
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailList.value = (await scoresApi.getMyDetail(row.examId, auth.user!.id)) as any[]
  } finally {
    detailLoading.value = false
  }
}

onMounted(async () => {
  if (isTeacher.value) {
    const data = (await examsApi.list({ pageSize: 200 })) as any
    examList.value = data.list ?? []
    // 从路由参数自动选中
    const qExamId = route.query.examId as string
    if (qExamId) { selectedExamId.value = qExamId; await loadExamScores() }
  } else {
    loading.value = true
    try {
      myScores.value = (await scoresApi.getMy()) as any[]
    } finally {
      loading.value = false
    }
    // 学生从路由参数直接查看明细
    const qExamId = route.query.examId as string
    if (qExamId) {
      const score = myScores.value.find(s => s.examId === qExamId)
      if (score) openMyDetail(score)
    }
  }
})
</script>

<style scoped>
.scores-page { display: flex; flex-direction: column; gap: 16px; }
.filter-card { }
.filter-row { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.header { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 16px; font-weight: 600; }
.pass { color: #67c23a; font-weight: 600; }
.fail { color: #f56c6c; font-weight: 600; }
.detail-list { display: flex; flex-direction: column; gap: 20px; padding: 0 4px; }
.detail-item { border: 1px solid #e4e7ed; border-radius: 6px; padding: 16px; }
.d-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.d-num {
  width: 24px; height: 24px; border-radius: 50%; background: #409eff; color: #fff;
  font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.d-score { margin-left: auto; color: #909399; font-size: 13px; }
.d-content { font-size: 14px; line-height: 1.6; margin-bottom: 10px; }
.d-answers { font-size: 13px; margin-bottom: 6px; }
.label { color: #909399; }
.ans-right { color: #67c23a; font-weight: 600; }
.ans-wrong { color: #f56c6c; font-weight: 600; }
.d-explanation { font-size: 13px; color: #606266; background: #f5f7fa; padding: 8px 10px; border-radius: 4px; }
</style>
