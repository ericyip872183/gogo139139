<template>
  <div class="my-services">
    <el-card v-loading="loading">
      <template #header>
        <span>本机构可用服务</span>
      </template>

      <el-alert
        v-if="!services || services.length === 0"
        title="暂无可用服务"
        type="info"
        :closable="false"
        show-icon
      >
        <p>请联系平台管理员为您分配 AI 服务配额</p>
      </el-alert>

      <el-row v-else :gutter="20">
        <el-col v-for="service in services" :key="service.provider.id" :span="12">
          <el-card shadow="hover" class="service-card">
            <template #header>
              <div class="service-header">
                <span class="provider-name">{{ service.provider.name }}</span>
                <el-tag :type="service.provider.isEnabled ? 'success' : 'danger'" size="small">
                  {{ service.provider.isEnabled ? '已开通' : '已禁用' }}
                </el-tag>
              </div>
            </template>

            <div class="service-body">
              <div class="quota-info">
                <div class="quota-item">
                  <span class="label">总配额</span>
                  <span class="value">{{ formatNumber(getQuota(service.provider.id)?.totalQuota) }}</span>
                </div>
                <div class="quota-item">
                  <span class="label">已使用</span>
                  <span class="value">{{ formatNumber(getQuota(service.provider.id)?.usedQuota) }}</span>
                </div>
                <div class="quota-item">
                  <span class="label">剩余额度</span>
                  <span class="value" :class="{ warning: isLowQuota(service.provider.id) }">
                    {{ formatNumber(getRemaining(service.provider.id)) }}
                  </span>
                </div>
              </div>

              <el-progress
                :percentage="getUsagePercent(service.provider.id)"
                :status="isLowQuota(service.provider.id) ? 'exception' : undefined"
              />

              <div class="models-list">
                <div class="models-title">可用模型</div>
                <el-tag
                  v-for="model in service.models"
                  :key="model.id"
                  size="small"
                  style="margin: 4px"
                  :type="model.isDefault ? 'success' : ''"
                >
                  {{ model.name }}
                  <span v-if="model.isDefault" style="margin-left: 4px; font-size: 10px">（默认）</span>
                </el-tag>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiAdminApi } from '@/api/ai-admin'

const services = ref<any[]>([])
const quotas = ref<any[]>([])
const loading = ref(false)

const getQuota = (providerId: string) => {
  return quotas.value.find(q => q.providerId === providerId)
}

const getRemaining = (providerId: string) => {
  const quota = getQuota(providerId)
  if (!quota) return 0
  return quota.totalQuota - quota.usedQuota
}

const isLowQuota = (providerId: string) => {
  const quota = getQuota(providerId)
  if (!quota) return false
  const remainingPercent = ((quota.totalQuota - quota.usedQuota) / quota.totalQuota) * 100
  return remainingPercent < (quota.alertThreshold || 20)
}

const getUsagePercent = (providerId: string) => {
  const quota = getQuota(providerId)
  if (!quota || !quota.totalQuota) return 0
  return Math.round((quota.usedQuota / quota.totalQuota) * 100)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('zh-CN').format(num || 0)
}

const loadServices = async () => {
  loading.value = true
  try {
    const res = await aiAdminApi.getTenantServices()
    services.value = res.services || []
    quotas.value = res.quotas || []
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadServices()
})
</script>

<style scoped>
.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.provider-name {
  font-size: 16px;
  font-weight: bold;
}
.service-body {
  padding-top: 10px;
}
.quota-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.quota-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.quota-item .label {
  font-size: 12px;
  color: #999;
}
.quota-item .value {
  font-size: 16px;
  font-weight: bold;
}
.quota-item .value.warning {
  color: #f56c6c;
}
.models-list {
  margin-top: 15px;
}
.models-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}
</style>
