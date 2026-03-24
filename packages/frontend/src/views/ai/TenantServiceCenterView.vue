<template>
  <div class="tenant-service-center">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 我的服务 -->
      <el-tab-pane label="我的服务" name="services">
        <MyServices />
      </el-tab-pane>

      <!-- 使用统计 -->
      <el-tab-pane label="使用统计" name="stats">
        <TenantStats />
      </el-tab-pane>

      <!-- 充值记录 -->
      <el-tab-pane label="充值管理" name="recharge">
        <RechargeManagement />
      </el-tab-pane>

      <!-- 预警记录 -->
      <el-tab-pane label="预警记录" name="alerts">
        <TenantAlerts />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MyServices from './components/MyServices.vue'
import TenantStats from './components/TenantStats.vue'
import RechargeManagement from './components/RechargeManagement.vue'
import TenantAlerts from './components/TenantAlerts.vue'

const activeTab = ref('services')
</script>

<style scoped>
.tenant-service-center {
  padding: 20px;
}
</style>
