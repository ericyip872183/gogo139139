<template>
  <div class="model-test">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型测试</span>
          <el-button type="primary" @click="checkAllModels">批量检测所有模型</el-button>
        </div>
      </template>

      <!-- 选择模型 -->
      <el-form :inline="true" class="test-form">
        <el-form-item label="服务商">
          <el-select v-model="selectedProviderId" placeholder="请选择服务商" style="width: 200px" @change="handleProviderChange">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="selectedModelId" placeholder="请选择模型" style="width: 200px" @change="handleModelChange">
            <el-option
              v-for="m in filteredModels"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            >
              <span>{{ m.name }}</span>
              <span v-if="m.lastStatus === 'online'" style="margin-left: 8px; color: #67c23a;">●</span>
              <span v-else-if="m.lastStatus === 'offline'" style="margin-left: 8px; color: #f56c6c;">●</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="测试模式">
          <el-select v-model="testMode" placeholder="请选择模式" style="width: 150px">
            <el-option label="普通对话" value="chat" />
            <el-option label="模拟病人" value="mock_patient" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- System Prompt 提示 -->
      <el-alert
        v-if="testMode === 'mock_patient'"
        title="模拟病人模式"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #default>
          你是一名标准化病人（SP），主诉：反复胃脘部隐痛 3 个月，伴随神疲乏力、食欲不振。请以患者口吻回答。
        </template>
      </el-alert>

      <!-- 输入框 -->
      <el-input
        v-model="testMessage"
        type="textarea"
        :rows="3"
        placeholder="请输入测试问题，例如：你好，我最近胃痛，帮我分析一下可能是什么原因？"
        style="margin-bottom: 16px"
      />

      <div style="text-align: right; margin-bottom: 20px;">
        <el-button
          type="primary"
          :loading="testing"
          :disabled="!selectedModelId"
          @click="handleTest"
        >
          发送测试
        </el-button>
      </div>

      <!-- 回答显示区 -->
      <el-card v-if="testResult" class="result-card" :class="{ 'result-success': testResult.success, 'result-error': !testResult.success }">
        <template #header>
          <div class="result-header">
            <span>{{ testResult.success ? '✅ AI 回答' : '❌ 测试失败' }}</span>
            <el-tag v-if="testResult.success" type="success">
              ⏱ {{ testResult.duration }}ms
            </el-tag>
          </div>
        </template>

        <div v-if="testResult.success" class="result-content">
          {{ testResult.content }}
        </div>
        <div v-else class="result-error-msg">
          {{ testResult.error }}
        </div>

        <div v-if="testResult.success" class="result-meta">
          <span>💬 Token: {{ testResult.tokens }}</span>
          <span>💰 成本：¥{{ (testResult.cost || 0).toFixed(6) }}</span>
        </div>
      </el-card>

      <!-- 测试历史 -->
      <div v-if="testHistory.length > 0" class="test-history">
        <h3>最近测试记录</h3>
        <el-table :data="testHistory" stripe size="small">
          <el-table-column prop="time" label="时间" width="100" />
          <el-table-column prop="modelName" label="模型" width="150" />
          <el-table-column label="结果" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="80">
            <template #default="{ row }">
              {{ row.duration }}ms
            </template>
          </el-table-column>
          <el-table-column label="Token" width="80">
            <template #default="{ row }">
              {{ row.tokens || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="成本" width="80">
            <template #default="{ row }">
              ¥{{ (row.cost || 0).toFixed(6) }}
            </template>
          </el-table-column>
          <el-table-column prop="error" label="错误信息" min-width="200" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { aiAdminApi, type AiModel, type AiProvider, type ModelTestResult } from '@/api/ai-admin'

interface TestHistoryItem {
  time: string
  modelName: string
  success: boolean
  duration: number
  tokens?: number
  cost?: number
  error?: string
}

const providers = ref<AiProvider[]>([])
const allModels = ref<AiModel[]>([])
const selectedProviderId = ref<string>('')
const selectedModelId = ref<string>('')
const testMode = ref<'chat' | 'mock_patient'>('chat')
const testMessage = ref<string>('')
const testing = ref(false)
const testResult = ref<ModelTestResult | null>(null)
const testHistory = ref<TestHistoryItem[]>([])

const filteredModels = computed(() => {
  if (!selectedProviderId.value) return allModels.value
  return allModels.value.filter(m => m.providerId === selectedProviderId.value)
})

const loadProviders = async () => {
  providers.value = await aiAdminApi.getProviders()
  if (providers.value.length > 0) {
    selectedProviderId.value = providers.value[0].id
    loadModels()
  }
}

const loadModels = async () => {
  try {
    allModels.value = await aiAdminApi.getModels()
  } catch (e: any) {
    ElMessage.error(e.message || '加载模型失败')
  }
}

const handleProviderChange = () => {
  selectedModelId.value = ''
  if (selectedProviderId.value) {
    const models = filteredModels.value
    if (models.length > 0) {
      selectedModelId.value = models[0].id
    }
  }
}

const handleModelChange = () => {
  // 选择模型后，可以自动填充一些测试问题
  if (testMode.value === 'mock_patient') {
    testMessage.value = '你好，我最近胃痛，帮我分析一下可能是什么原因？'
  } else {
    testMessage.value = '你好，请介绍一下你自己'
  }
}

const handleTest = async () => {
  if (!selectedModelId.value) {
    ElMessage.warning('请选择模型')
    return
  }
  if (!testMessage.value.trim()) {
    ElMessage.warning('请输入测试问题')
    return
  }

  testing.value = true
  try {
    const model = allModels.value.find(m => m.id === selectedModelId.value)
    const result = await aiAdminApi.testModel(selectedModelId.value, {
      providerId: model?.providerId || '',
      message: testMessage.value,
      mode: testMode.value,
    })

    testResult.value = result

    // 添加到历史记录
    testHistory.value.unshift({
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      modelName: model?.name || 'Unknown',
      success: result.success,
      duration: result.duration || 0,
      tokens: result.tokens,
      cost: result.cost,
      error: result.error,
    })

    // 保留最近 10 条记录
    if (testHistory.value.length > 10) {
      testHistory.value = testHistory.value.slice(0, 10)
    }

    if (result.success) {
      ElMessage.success('测试成功')
    } else {
      ElMessage.error(`测试失败：${result.error}`)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '测试失败')
    testResult.value = {
      success: false,
      error: e.message,
      duration: 0,
    }
  } finally {
    testing.value = false
  }
}

// 批量检测所有模型
const checkAllModels = async () => {
  const loading = ElMessage.loading('正在检测所有模型状态，请稍候...', { duration: 0 })
  try {
    await aiAdminApi.checkAllModels()
    await loadModels()
    ElMessage.success('模型状态检测完成')
  } catch (e: any) {
    ElMessage.error(e.message || '检测失败')
  } finally {
    loading.close()
  }
}

onMounted(() => {
  loadProviders()
  loadModels()
})
</script>

<style scoped>
.model-test {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-form {
  margin-bottom: 16px;
}

.result-card {
  margin-top: 20px;
  border-left: 4px solid #67c23a;
}

.result-card.result-error {
  border-left-color: #f56c6c;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #303133;
  font-size: 14px;
}

.result-error-msg {
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.6;
}

.result-meta {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #909399;
}

.test-history {
  margin-top: 24px;
}

.test-history h3 {
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
}
</style>
