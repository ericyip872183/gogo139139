<template>
  <div class="ai-platform-view">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 服务商管理 -->
      <el-tab-pane label="服务商配置" name="providers">
        <ProviderManagement />
      </el-tab-pane>

      <!-- 模型管理 -->
      <el-tab-pane label="模型管理" name="models">
        <ModelManagement />
      </el-tab-pane>

      <!-- 机构模型配置 -->
      <el-tab-pane label="机构模型配置" name="tenant-models">
        <TenantModelConfig />
      </el-tab-pane>

      <!-- 配额管理 -->
      <el-tab-pane label="配额管理" name="quotas">
        <QuotaManagement />
      </el-tab-pane>

      <!-- 使用统计 -->
      <el-tab-pane label="使用统计" name="stats">
        <UsageStatistics />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProviderManagement from './components/ProviderManagement.vue'
import ModelManagement from './components/ModelManagement.vue'
import TenantModelConfig from './components/TenantModelConfig.vue'
import QuotaManagement from './components/QuotaManagement.vue'
import UsageStatistics from './components/UsageStatistics.vue'

const activeTab = ref('providers')
</script>

<style scoped>
.ai-platform-view {
  padding: 20px;
}
</style>
