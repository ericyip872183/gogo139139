<template>
  <div class="judge-page" v-if="tableData">
    <div class="judge-header">
      <div class="judge-title">{{ tableData.name }}</div>
      <div class="judge-meta">
        <el-tag :type="tableData.type === 'ADD' ? 'success' : 'warning'" size="small">
          {{ tableData.type === 'ADD' ? '加分制' : '减分制' }}
        </el-tag>
        <span>满分 {{ tableData.totalScore }} 分</span>
      </div>
    </div>

    <div class="judge-body">
      <!-- 被评人选择 -->
      <el-card class="target-card">
        <template #header><span>选择被评人</span></template>
        <el-select
          v-model="targetId"
          filterable
          placeholder="搜索姓名/学号"
          style="width:100%"
          @change="resetScores"
        >
          <el-option
            v-for="u in userList"
            :key="u.id"
            :label="`${u.realName}${u.studentNo ? ' (' + u.studentNo + ')' : ''}`"
            :value="u.id"
          />
        </el-select>
      </el-card>

      <!-- 评分项 -->
      <el-card class="items-card">
        <template #header>
          <div class="items-header">
            <span>评分项</span>
            <div class="total-score" :class="{ warning: totalScore < tableData.totalScore * 0.6 }">
              当前得分：<strong>{{ totalScore }}</strong> / {{ tableData.totalScore }}
            </div>
          </div>
        </template>

        <div class="score-items">
          <div v-for="item in tableData.items" :key="item.id" class="score-item">
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-full">{{ item.score > 0 ? '+' : '' }}{{ item.score }} 分</span>
            </div>
            <div class="item-control">
              <el-button
                v-if="tableData.type === 'ADD'"
                size="small"
                :type="itemScores[item.id] > 0 ? 'success' : 'default'"
                @click="toggleItem(item)"
              >
                {{ itemScores[item.id] > 0 ? '已得分' : '给分' }}
              </el-button>
              <el-input-number
                v-else
                v-model="itemScores[item.id]"
                :min="item.score"
                :max="0"
                :step="Math.abs(item.score)"
                size="small"
                style="width:130px"
                @change="calcTotal"
              />
            </div>
          </div>
        </div>

        <el-input
          v-model="note"
          type="textarea"
          :rows="2"
          placeholder="备注（可选）"
          style="margin-top:16px"
        />
      </el-card>
    </div>

    <div class="judge-footer">
      <el-button @click="resetScores">重置</el-button>
      <el-button type="primary" size="large" :loading="submitting" :disabled="!targetId" @click="handleSubmit">
        提交打分
      </el-button>
    </div>
  </div>

  <div v-else-if="loading" class="loading-wrap">
    <el-loading />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { scoreTablesApi } from '@/api/score-tables'
import { usersApi } from '@/api/users'

const route = useRoute()
const router = useRouter()
const tableId = route.params.id as string

const loading = ref(true)
const submitting = ref(false)
const tableData = ref<any>(null)
const userList = ref<any[]>([])
const targetId = ref('')
const note = ref('')
const itemScores = reactive<Record<string, number>>({})

const totalScore = computed(() => {
  if (!tableData.value) return 0
  if (tableData.value.type === 'ADD') {
    return Object.values(itemScores).reduce((s: any, v: any) => s + v, 0)
  } else {
    return tableData.value.totalScore + Object.values(itemScores).reduce((s: any, v: any) => s + v, 0)
  }
})

function resetScores() {
  if (!tableData.value) return
  tableData.value.items.forEach((item: any) => {
    itemScores[item.id] = tableData.value.type === 'ADD' ? 0 : 0
  })
  note.value = ''
}

function toggleItem(item: any) {
  itemScores[item.id] = itemScores[item.id] > 0 ? 0 : item.score
}

function calcTotal() { /* totalScore is computed */ }

async function handleSubmit() {
  if (!targetId.value) { ElMessage.warning('请选择被评人'); return }
  submitting.value = true
  try {
    await scoreTablesApi.createRecord({
      tableId,
      targetId: targetId.value,
      totalScore: totalScore.value,
      itemScores: { ...itemScores },
      note: note.value,
    })
    ElMessage.success('打分成功')
    targetId.value = ''
    resetScores()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const [table, users] = await Promise.all([
      scoreTablesApi.get(tableId),
      usersApi.list({ pageSize: 500, role: 'STUDENT' }),
    ])
    tableData.value = table
    userList.value = (users as any).list ?? []
    resetScores()
  } catch {
    ElMessage.error('加载失败')
    router.back()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.judge-page {
  display: flex; flex-direction: column; height: 100vh; background: #f5f7fa;
  overflow: hidden;
}
.judge-header {
  display: flex; align-items: center; gap: 16px;
  padding: 0 24px; height: 56px;
  background: #fff; border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.judge-title { font-size: 16px; font-weight: 600; }
.judge-meta { display: flex; align-items: center; gap: 12px; color: #606266; font-size: 14px; }
.judge-body {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 16px;
}
.target-card {}
.items-card {}
.items-header { display: flex; align-items: center; justify-content: space-between; }
.total-score { font-size: 15px; color: #606266; }
.total-score.warning strong { color: #e6a23c; }
.total-score strong { color: #67c23a; font-size: 20px; }
.score-items { display: flex; flex-direction: column; gap: 12px; }
.score-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: #f5f7fa; border-radius: 6px;
}
.item-info { display: flex; align-items: center; gap: 12px; }
.item-name { font-size: 14px; }
.item-full { color: #909399; font-size: 13px; }
.judge-footer {
  flex-shrink: 0; padding: 12px 24px;
  background: #fff; border-top: 1px solid #e4e7ed;
  display: flex; justify-content: flex-end; gap: 12px;
}
.loading-wrap { display: flex; justify-content: center; align-items: center; height: 100vh; }
</style>
