<template>
  <div class="ai-settings-page">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>豆包大模型配置</span>
          <el-tag type="success" v-if="config?.isEnabled">已启用</el-tag>
          <el-tag type="info" v-else>未启用</el-tag>
        </div>
      </template>

      <el-form :model="configForm" label-width="120px">
        <el-form-item label="API Key" required>
          <el-input v-model="configForm.apiKey" placeholder="请输入火山引擎 API Key" />
        </el-form-item>
        <el-form-item label="API Secret">
          <el-input v-model="configForm.apiSecret" type="password" placeholder="可选" />
        </el-form-item>
        <el-form-item label="API 端点" required>
          <el-input v-model="configForm.endpoint" placeholder="https://ark.cn-beijing.volces.com/api/v3/chat/completions" />
        </el-form-item>
        <el-form-item label="使用模型">
          <el-select v-model="configForm.model" style="width: 100%">
            <el-option label="Doubao Lite (4K)" value="doubao-lite-4k" />
            <el-option label="Doubao Pro (4K)" value="doubao-pro-4k" />
            <el-option label="Doubao Lite (32K)" value="doubao-lite-32k" />
            <el-option label="Doubao Pro (32K)" value="doubao-pro-32k" />
          </el-select>
        </el-form-item>
        <el-form-item label="最大 Token">
          <el-input-number v-model="configForm.maxTokens" :min="500" :max="8000" :step="500" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="configForm.isEnabled" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSaveConfig">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span>使用统计（最近 30 天）</span>
          <el-button link @click="loadStats">刷新</el-button>
        </div>
      </template>

      <el-row :gutter="16" v-loading="statsLoading">
        <el-col :span="8">
          <el-statistic title="总消耗金额（元）" :value="stats.totalCost" precision="2" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="总 Token 消耗" :value="stats.totalTokens" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="总调用次数" :value="stats.totalCalls" />
        </el-col>
      </el-row>

      <el-divider />

      <el-table :data="statsByModule" border>
        <el-table-column label="模块" prop="module" width="150" />
        <el-table-column label="调用次数" prop="count" width="100" align="center" />
        <el-table-column label="Token 消耗" prop="tokens" align="center" />
        <el-table-column label="金额（元）" prop="cost" align="center" />
      </el-table>
    </el-card>

    <el-card class="recharge-card">
      <template #header>
        <span>AI 充值</span>
      </template>

      <el-form :model="rechargeForm" label-width="120px" inline>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeForm.amount" :min="10" :max="10000" :step="10" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleRecharge">立即充值</el-button>
        </el-form-item>
      </el-form>

      <el-alert type="info" :closable="false" style="margin-top: 12px">
        <p>参考汇率：1 元 ≈ 250,000 tokens（豆包 Lite 模型）</p>
        <p>实际汇率以火山引擎官方为准</p>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiApi } from '@/api/ai'

const configForm = reactive({
  apiKey: '',
  apiSecret: '',
  endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  model: 'doubao-lite-4k',
  maxTokens: 2000,
  isEnabled: true,
})

const saving = ref(false)
const statsLoading = ref(false)
const stats = ref({ totalCost: 0, totalTokens: 0, totalCalls: 0 })
const statsByModule = ref<any[]>([])
const rechargeForm = reactive({ amount: 100 })

async function loadConfig() {
  try {
    const config = await aiApi.getConfig() as any
    if (config) {
      Object.assign(configForm, config)
    }
  } catch {}
}

async function loadStats() {
  statsLoading.value = true
  try {
    const data = await aiApi.getUsage(30) as any
    const usage = data.usage || []
    stats.value = {
      totalCost: usage.reduce((sum: number, u: any) => sum + (u._sum?.cost || 0), 0),
      totalTokens: usage.reduce((sum: number, u: any) => sum + (u._sum?.tokensUsed || 0), 0),
      totalCalls: usage.reduce((sum: number, u: any) => sum + (u._count || 0), 0),
    }
    statsByModule.value = usage.map((u: any) => ({
      module: u.module === 'mock_patient' ? '模拟病人' : u.module === 'ocr' ? 'OCR 识别' : u.module,
      count: u._count || 0,
      tokens: u._sum?.tokensUsed || 0,
      cost: u._sum?.cost || 0,
    }))
  } finally {
    statsLoading.value = false
  }
}

async function handleSaveConfig() {
  saving.value = true
  try {
    await aiApi.saveConfig(configForm)
    ElMessage.success('配置保存成功')
    loadConfig()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleRecharge() {
  try {
    const order = await aiApi.createRecharge(rechargeForm.amount) as any
    ElMessage.success(`订单创建成功：${order.orderNo}，请前往支付`)
    // TODO: 跳转支付链接
  } catch (e: any) {
    ElMessage.error(e.message || '充值失败')
  }
}

onMounted(() => {
  loadConfig()
  loadStats()
})
</script>

<style scoped>
.ai-settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
