<template>
  <div class="tenant-stats">
    <el-form :inline="true" class="filter-form">
      <el-form-item label="统计周期">
        <el-select v-model="days" placeholder="选择统计周期" @change="loadStats">
          <el-option label="最近 7 天" :value="7" />
          <el-option label="最近 15 天" :value="15" />
          <el-option label="最近 30 天" :value="30" />
          <el-option label="最近 60 天" :value="60" />
          <el-option label="最近 90 天" :value="90" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>本机构使用总览（最近 {{ days }} 天）</span>
          </template>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总调用次数" :value="stats.usage?._count || 0" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="总 Token 消耗" :value="totalTokens" :precision="0" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="总成本（元）" :value="totalCost" :precision="2" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="充值金额（元）" :value="totalRecharge" :precision="2" />
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>按服务商统计</span>
          </template>
          <div ref="chartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>详细使用数据</span>
          </template>
          <el-table :data="usageData" stripe>
            <el-table-column prop="providerId" label="服务商 ID" width="180" />
            <el-table-column prop="module" label="模块" width="150" />
            <el-table-column label="调用次数" width="100">
              <template #default="{ row }">
                {{ row._count }}
              </template>
            </el-table-column>
            <el-table-column label="Token 消耗" width="120">
              <template #default="{ row }">
                {{ formatNumber(row._sum.tokensUsed) }}
              </template>
            </el-table-column>
            <el-table-column label="成本（元）" width="100">
              <template #default="{ row }">
                ¥{{ row._sum.cost?.toFixed(2) || '0.00' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { aiAdminApi } from '@/api/ai-admin'

const days = ref(30)
const stats = ref<any>(null)
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const usageData = computed(() => {
  return stats.value?.usage || []
})

const totalTokens = computed(() => {
  return usageData.value.reduce((sum, item) => sum + (item._sum.tokensUsed || 0), 0)
})

const totalCost = computed(() => {
  return usageData.value.reduce((sum, item) => sum + (item._sum.cost || 0), 0)
})

const totalRecharge = computed(() => {
  return stats.value?.recharge?._sum?.amount || 0
})

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('zh-CN').format(num || 0)
}

const loadStats = async () => {
  try {
    stats.value = await aiAdminApi.getTenantUsageStats(days.value)
    nextTick(() => {
      renderChart()
    })
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  }
}

const renderChart = () => {
  if (!chartRef.value || !stats.value?.usage) return

  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  // 按服务商聚合数据
  const providerMap = new Map<string, { tokens: number; cost: number; count: number }>()

  stats.value.usage.forEach((item: any) => {
    const p = providerMap.get(item.providerId) || { tokens: 0, cost: 0, count: 0 }
    p.tokens += item._sum.tokensUsed || 0
    p.cost += item._sum.cost || 0
    p.count += item._count || 0
    providerMap.set(item.providerId, p)
  })

  const option: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Token 消耗', '成本（元）', '调用次数'] },
    xAxis: {
      type: 'category',
      data: Array.from(providerMap.keys()),
    },
    yAxis: [{ type: 'value', name: 'Token' }, { type: 'value', name: '成本/次数' }],
    series: [
      {
        name: 'Token 消耗',
        type: 'bar',
        data: Array.from(providerMap.values()).map(v => v.tokens),
      },
      {
        name: '成本（元）',
        type: 'line',
        yAxisIndex: 1,
        data: Array.from(providerMap.values()).map(v => v.cost),
      },
      {
        name: '调用次数',
        type: 'line',
        yAxisIndex: 1,
        data: Array.from(providerMap.values()).map(v => v.count),
      },
    ],
  }
  chart.setOption(option)
}

onMounted(() => {
  loadStats()
  window.addEventListener('resize', () => {
    chart?.resize()
  })
})
</script>

<style scoped>
.filter-form {
  margin-bottom: 20px;
}
</style>
